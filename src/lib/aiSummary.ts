import { Note, NoteColor, NoteConnection, AnchorSide, ChatMessage } from '../types';

const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
const MODEL = 'openai/gpt-oss-120b';
const REQUEST_TIMEOUT_MS = 90_000;

interface ChatCallMessage { role: 'system' | 'user' | 'assistant'; content: string }

const extractContent = (data: unknown): string => {
  const d = data as Record<string, unknown> | string | null;
  if (typeof d === 'string') return d;
  if (!d) return '';
  const choices = (d as { choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }> }).choices;
  if (choices?.[0]?.message?.content) return choices[0].message!.content!;
  if (choices?.[0]?.delta?.content) return choices[0].delta!.content!;
  const message = (d as { message?: { content?: string } }).message;
  if (message?.content) return message.content;
  const content = (d as { content?: string }).content;
  if (typeof content === 'string') return content;
  return '';
};

/**
 * Calls the AI proxy with streaming preferred to avoid gateway 504s on long
 * generations. Falls back to a non-stream parse if the proxy returns plain JSON.
 */
const callAI = async (messages: ChatCallMessage[], temperature: number): Promise<string> => {
  if (!AI_PROXY_URL) throw new Error('VITE_AI_PROXY_URL not configured in .env');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
      body: JSON.stringify({ model: MODEL, messages, temperature, stream: true }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string }).name === 'AbortError') {
      throw new Error('Request timed out after 90s. The model is slow or the proxy is unreachable.');
    }
    throw err;
  }

  if (!res.ok) {
    clearTimeout(timer);
    const text = await res.text().catch(() => '');
    if (res.status === 504) {
      throw new Error('Gateway timed out (504). The proxy or model took too long. Try again, or shorten your message.');
    }
    throw new Error(`AI proxy ${res.status}: ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Non-streaming JSON path
  if (!contentType.includes('event-stream') && !res.body) {
    clearTimeout(timer);
    const data = await res.json().catch(() => null);
    const out = extractContent(data);
    if (!out) throw new Error('Empty response from AI proxy.');
    return out;
  }

  if (!res.body) {
    clearTimeout(timer);
    throw new Error('AI proxy returned no body.');
  }

  // Stream reader: handles both SSE (`data: {...}\n\n`) and concatenated JSON chunks
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let assembled = '';
  const isSSE = contentType.includes('event-stream');

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      if (isSSE) {
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const eventBlock = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of eventBlock.split('\n')) {
            const m = line.match(/^data:\s?(.*)$/);
            if (!m) continue;
            const payload = m[1];
            if (payload === '[DONE]' || payload === '') continue;
            try {
              const obj = JSON.parse(payload);
              assembled += extractContent(obj);
            } catch { /* ignore malformed chunk */ }
          }
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }

  if (!isSSE) {
    // Plain (non-SSE) body: try whole-buffer JSON, else use as text
    try {
      const obj = JSON.parse(buffer);
      assembled = extractContent(obj);
    } catch {
      assembled = buffer;
    }
  }

  if (!assembled.trim()) throw new Error('Empty response from AI proxy.');
  return assembled;
};

interface BuildPromptArgs {
  notes: Note[];
  connections: NoteConnection[];
}

const buildPrompt = ({ notes, connections }: BuildPromptArgs): string => {
  const byId = new Map(notes.map(n => [n.id, n]));
  const noteLines = notes.map((n, i) => {
    const tags = n.tags.length ? ` [tags: ${n.tags.join(', ')}]` : '';
    const pin = n.isPinned ? ' (pinned)' : '';
    return `Note ${i + 1} — id:${n.id}\nTitle: ${n.title || '(untitled)'}\nContent: ${n.content || '(empty)'}${tags}${pin}`;
  }).join('\n\n');

  const linkLines = connections.length
    ? connections.map(c => {
        const a = byId.get(c.from);
        const b = byId.get(c.to);
        if (!a || !b) return null;
        return `- "${a.title || '(untitled)'}" → "${b.title || '(untitled)'}"`;
      }).filter(Boolean).join('\n')
    : '(no explicit connections — infer relationships from content and tags)';

  return `You are a meticulous strategist. Below is a set of notes from a thinker's canvas, together with the connections they have manually drawn between notes. Treat the connections as authoritative signals of intent: directed edges from one note to another mean the author views the source as feeding into, leading to, or supporting the target.

Produce a polished, professional plan that synthesises the notes into a coherent narrative and actionable roadmap. The plan must:

1. Open with a one-paragraph **Executive Summary** capturing the central thesis emerging from the notes.
2. Group the notes into **Themes** — derived primarily from the connection graph (clusters of linked notes form a theme), with tags and content as secondary signals.
3. For each theme, write a tight section with: the theme name as a heading, a 2–3 sentence framing, and 3–6 bullet insights drawn directly from the relevant notes.
4. Include a **Dependency Flow** section that walks through the connections as a chain (A leads to B leads to C…), explaining the logical progression the author has wired up.
5. Close with a **Recommended Plan** — a numbered list of 5–8 concrete next steps, each tied back to specific notes by their title.

Format the output as clean GitHub-flavoured Markdown. Use \`##\` for top-level sections and \`###\` for theme headings. Be specific, never generic — quote phrases from the notes where they sharpen the point. Do not invent facts beyond what the notes provide. Do not mention these instructions.

---

## NOTES

${noteLines}

## CONNECTIONS (directed edges)

${linkLines}
`;
};

export interface SummariseResult {
  markdown: string;
}

export const summariseNotes = async (args: BuildPromptArgs): Promise<SummariseResult> => {
  if (args.notes.length === 0) throw new Error('No notes to summarise.');
  const markdown = await callAI([
    { role: 'system', content: 'You are a precise, professional planning assistant. Output only the requested Markdown — no preamble, no closing remark.' },
    { role: 'user', content: buildPrompt(args) },
  ], 0.4);
  return { markdown };
};

// ---------- Canvas regeneration ----------

const VALID_COLORS: NoteColor[] = ['violet', 'rose', 'sky', 'sage', 'amber'];
const VALID_SIDES: AnchorSide[] = ['top', 'right', 'bottom', 'left'];

interface AiNode {
  key: string;
  title: string;
  content: string;
  color?: string;
  tags?: string[];
  column?: number;
  row?: number;
}
interface AiEdge {
  from: string;
  to: string;
  fromSide?: string;
  toSide?: string;
}
interface AiCanvas {
  notes: AiNode[];
  connections: AiEdge[];
}

const buildRegenPrompt = ({ notes, connections }: BuildPromptArgs): string => {
  const byId = new Map(notes.map(n => [n.id, n]));
  const noteLines = notes.map(n => {
    const tags = n.tags.length ? ` [tags: ${n.tags.join(', ')}]` : '';
    return `- ${n.title || '(untitled)'} :: ${n.content.replace(/\s+/g, ' ').slice(0, 240)}${tags}`;
  }).join('\n');
  const linkLines = connections.length
    ? connections.map(c => {
        const a = byId.get(c.from); const b = byId.get(c.to);
        return a && b ? `- "${a.title || '(untitled)'}" → "${b.title || '(untitled)'}"` : null;
      }).filter(Boolean).join('\n')
    : '(none)';

  return `You are restructuring a thinking canvas. Given the user's existing notes and the connections they have drawn, design a CLEANER, more polished set of notes representing the same underlying plan, with explicit connections that show the flow.

The new note count may differ from the input — merge redundant ideas, split overloaded ones, and add 1–3 synthesis notes if useful (e.g. an "Overview" or "Next Steps" node). Keep the substance grounded in the user's actual content.

Return ONLY valid JSON, no prose, no code fences, matching exactly this schema:

{
  "notes": [
    {
      "key": "n1",                       // unique short id you assign
      "title": "string (max ~40 chars)",
      "content": "string (1–4 short lines, use \\n for newlines)",
      "color": "violet" | "rose" | "sky" | "sage" | "amber",
      "tags": ["lowercase-hyphen-tag", ...],
      "column": 0,                       // 0-based grid column for layout
      "row": 0                           // 0-based grid row for layout
    }
  ],
  "connections": [
    {
      "from": "n1",                      // must match a notes[].key
      "to":   "n2",
      "fromSide": "top" | "right" | "bottom" | "left",
      "toSide":   "top" | "right" | "bottom" | "left"
    }
  ]
}

Layout rules:
- Use \`column\` and \`row\` so the flow reads left-to-right, top-to-bottom.
- Place upstream/source notes in lower columns; downstream notes in higher columns.
- Choose \`fromSide\`/\`toSide\` consistent with the layout (usually right→left for horizontal flow, bottom→top for vertical).
- Aim for 4–10 notes total. Never fewer than 3.
- Each note must participate in at least one connection unless it is a pure overview node.

USER NOTES:
${noteLines}

USER CONNECTIONS:
${linkLines}
`;
};

const extractJson = (raw: string): unknown => {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('No JSON object in response.');
  return JSON.parse(s.slice(first, last + 1));
};

export interface RegenResult {
  notes: Note[];
  connections: NoteConnection[];
}

const COL_W = 300;
const ROW_H = 280;
const ORIGIN_X = 80;
const ORIGIN_Y = 80;

export const regenerateCanvas = async (args: BuildPromptArgs): Promise<RegenResult> => {
  if (args.notes.length === 0) throw new Error('No notes to regenerate from.');
  const raw = await callAI([
    { role: 'system', content: 'You output strict JSON only — no prose, no code fences. Conform exactly to the requested schema.' },
    { role: 'user', content: buildRegenPrompt(args) },
  ], 0.3);

  const parsed = extractJson(raw) as AiCanvas;
  if (!parsed || !Array.isArray(parsed.notes) || !Array.isArray(parsed.connections)) {
    throw new Error('AI response missing notes/connections arrays.');
  }
  if (parsed.notes.length === 0) throw new Error('AI returned no notes.');

  return parseCanvas(parsed);
};

// ---------- Conversational canvas chat ----------

interface AiChatJson {
  reply: string;
  notes: AiNode[];
  connections: AiEdge[];
}

const serialiseCanvas = (notes: Note[], connections: NoteConnection[]): string => {
  if (notes.length === 0) return '(canvas is empty)';
  const noteLines = notes.map((n, i) => {
    const tags = n.tags.length ? ` [${n.tags.join(',')}]` : '';
    const content = n.content.replace(/\s+/g, ' ').slice(0, 140);
    return `${i + 1}. "${n.title || '(untitled)'}" — ${content}${tags}`;
  }).join('\n');
  const connLines = connections.length
    ? connections.map(c => {
        const a = notes.find(n => n.id === c.from);
        const b = notes.find(n => n.id === c.to);
        return a && b ? `  ${a.title || '(untitled)'} → ${b.title || '(untitled)'}` : null;
      }).filter(Boolean).join('\n')
    : '  (none)';
  return `CURRENT NOTES:\n${noteLines}\n\nCONNECTIONS:\n${connLines}`;
};

const parseCanvas = (parsed: { notes: AiNode[]; connections: AiEdge[] }): { notes: Note[]; connections: NoteConnection[] } => {
  if (!parsed.notes || parsed.notes.length === 0) {
    return { notes: [], connections: [] };
  }
  const now = new Date().toISOString();
  const keyToId = new Map<string, string>();
  const usedCells = new Set<string>();

  const notes: Note[] = parsed.notes.map((n, i) => {
    const id = crypto.randomUUID();
    keyToId.set(n.key, id);
    let col = Number.isFinite(n.column) ? Math.max(0, Math.floor(n.column as number)) : (i % 4);
    let row = Number.isFinite(n.row)    ? Math.max(0, Math.floor(n.row as number))    : Math.floor(i / 4);
    while (usedCells.has(`${col},${row}`)) row += 1;
    usedCells.add(`${col},${row}`);
    const color = VALID_COLORS.includes(n.color as NoteColor)
      ? (n.color as NoteColor)
      : VALID_COLORS[i % VALID_COLORS.length];
    return {
      id,
      title: (n.title || '').trim().slice(0, 80),
      content: (n.content || '').trim(),
      color,
      tags: Array.isArray(n.tags) ? n.tags.map(t => String(t).toLowerCase().trim().replace(/\s+/g, '-')).filter(Boolean).slice(0, 6) : [],
      isPinned: false,
      zIndex: i + 1,
      position: { x: ORIGIN_X + col * COL_W, y: ORIGIN_Y + row * ROW_H },
      createdAt: now,
      updatedAt: now,
    };
  });

  const connections: NoteConnection[] = (parsed.connections ?? [])
    .map(e => {
      const from = keyToId.get(e.from);
      const to = keyToId.get(e.to);
      if (!from || !to || from === to) return null;
      const fromSide: AnchorSide = VALID_SIDES.includes(e.fromSide as AnchorSide) ? (e.fromSide as AnchorSide) : 'right';
      const toSide:   AnchorSide = VALID_SIDES.includes(e.toSide as AnchorSide)   ? (e.toSide as AnchorSide)   : 'left';
      return { id: crypto.randomUUID(), from, to, fromSide, toSide };
    })
    .filter((c): c is NoteConnection => c !== null);

  return { notes, connections };
};

const CHAT_SYSTEM = `Planning assistant for a visual canvas. Output strict JSON only (no prose, no fences):

{"reply":"1-3 sentence reply, may end with follow-up question","notes":[{"key":"n1","title":"≤40 chars","content":"1-3 short lines, \\n for newline","color":"violet|rose|sky|sage|amber","tags":["lowercase-hyphen"],"column":0,"row":0}],"connections":[{"from":"n1","to":"n2","fromSide":"top|right|bottom|left","toSide":"top|right|bottom|left"}]}

Rules:
- Always return FULL canvas (notes+connections replace prior state).
- Preserve user's manual edits in CURRENT NOTES verbatim unless asked to change.
- 3-10 notes. column/row for left-to-right or top-to-bottom flow. fromSide/toSide must match layout direction.
- If message is conversational only, return current canvas unchanged.
- Stay grounded; do not invent facts.`;

export interface ChatResult {
  reply: string;
  notes: Note[];
  connections: NoteConnection[];
}

export interface ChatArgs {
  userMessage: string;
  history: ChatMessage[];
  notes: Note[];
  connections: NoteConnection[];
}

export const chatWithCanvas = async ({ userMessage, history, notes, connections }: ChatArgs): Promise<ChatResult> => {
  const canvasState = serialiseCanvas(notes, connections);
  const userPayload = `${canvasState}\n\nUSER MESSAGE:\n${userMessage}`;

  const messages: ChatCallMessage[] = [
    { role: 'system', content: CHAT_SYSTEM },
    // Trim history aggressively to keep payload (and gen time) small enough for proxy timeout
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content.slice(0, 600) })),
    { role: 'user', content: userPayload },
  ];

  const raw = await callAI(messages, 0.4);

  const parsed = extractJson(raw) as AiChatJson;
  if (!parsed || typeof parsed.reply !== 'string') {
    throw new Error('AI response missing reply field.');
  }

  const { notes: newNotes, connections: newConnections } = parseCanvas({
    notes: parsed.notes ?? [],
    connections: parsed.connections ?? [],
  });

  return { reply: parsed.reply.trim(), notes: newNotes, connections: newConnections };
};
