
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Note, NoteColor, SortOption, NoteConnection, AnchorSide, Workflow, ChatMessage } from '../types';
import { useToast } from '@/components/ui/use-toast';

const DEMO_NOTES: Note[] = [
  {
    id: 'demo-1',
    title: 'Design principles',
    content: 'Simplicity is the ultimate sophistication. Every pixel should have a purpose. White space is not empty — it is breathing room.\n\nFocus on the user, and the rest follows.',
    color: 'violet',
    tags: ['design', 'inspiration'],
    isPinned: true,
    position: { x: 60, y: 80 },
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Book recommendations',
    content: '• The Design of Everyday Things — Don Norman\n• A Pattern Language — Christopher Alexander\n• Thinking, Fast and Slow — Kahneman\n• Shape Up — Ryan Singer',
    color: 'sage',
    tags: ['books', 'reading'],
    isPinned: false,
    position: { x: 340, y: 80 },
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Q2 goals',
    content: 'Ship the new dashboard\nRefactor auth layer\nWrite 3 blog posts\nLearn Rust basics\n\n↳ Review progress every Friday',
    color: 'sky',
    tags: ['goals', 'work'],
    isPinned: false,
    position: { x: 620, y: 80 },
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-4',
    title: 'Shower thoughts',
    content: 'What if loading states told you exactly what was happening instead of just spinning? "Fetching 847 records..." feels better than a spinner.',
    color: 'rose',
    tags: ['ideas'],
    isPinned: false,
    position: { x: 60, y: 340 },
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-5',
    title: 'CSS tricks to remember',
    content: 'container-type: inline-size\nfield-sizing: content\n:has() selector\nanchor positioning API\n\nAll game-changers for layout.',
    color: 'amber',
    tags: ['dev', 'css'],
    isPinned: false,
    position: { x: 340, y: 340 },
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

const STORAGE_KEY = 'thoughttag-workflows';
const ACTIVE_KEY = 'thoughttag-active-workflow';
const LEGACY_NOTES_KEY = 'thoughttag-notes';
const LEGACY_CONN_KEY = 'thoughttag-connections';

const makeWorkflow = (name: string, notes: Note[] = [], connections: NoteConnection[] = [], messages: ChatMessage[] = []): Workflow => {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name, notes, connections, messages, createdAt: now, updatedAt: now };
};

const loadInitial = (): { workflows: Workflow[]; activeId: string | null } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const wfs: Workflow[] = (JSON.parse(raw) as Workflow[]).map(w => ({ ...w, messages: w.messages ?? [] }));
      const aid = localStorage.getItem(ACTIVE_KEY);
      return { workflows: wfs, activeId: aid && wfs.some(w => w.id === aid) ? aid : null };
    }
  } catch { /* ignore */ }

  // Migrate legacy single-canvas storage
  try {
    const legacyNotes = localStorage.getItem(LEGACY_NOTES_KEY);
    const legacyConns = localStorage.getItem(LEGACY_CONN_KEY);
    if (legacyNotes) {
      const notes: Note[] = JSON.parse(legacyNotes);
      const conns: NoteConnection[] = legacyConns ? JSON.parse(legacyConns) : [];
      const wf = makeWorkflow('My canvas', notes, conns);
      return { workflows: [wf], activeId: null };
    }
  } catch { /* ignore */ }

  // First-time: seed a demo workflow
  const demo = makeWorkflow('Demo canvas', DEMO_NOTES, []);
  return { workflows: [demo], activeId: null };
};

export const useNotes = () => {
  const initial = useMemo(loadInitial, []);
  const [workflows, setWorkflows] = useState<Workflow[]>(initial.workflows);
  const [activeId, setActiveId] = useState<string | null>(initial.activeId);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  }, [workflows]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeId]);

  const activeWorkflow = workflows.find(w => w.id === activeId) ?? null;
  const notes = activeWorkflow?.notes ?? [];
  const connections = activeWorkflow?.connections ?? [];

  const touchWorkflow = (wf: Workflow): Workflow => ({ ...wf, updatedAt: new Date().toISOString() });

  const updateActiveWorkflow = useCallback((mut: (wf: Workflow) => Workflow) => {
    setWorkflows(prev => prev.map(w => w.id === activeId ? touchWorkflow(mut(w)) : w));
  }, [activeId]);

  // ---------- Workflow CRUD ----------
  const createWorkflow = (name?: string): string => {
    const wf = makeWorkflow(name?.trim() || `Workflow ${workflows.length + 1}`);
    setWorkflows(prev => [...prev, wf]);
    return wf.id;
  };

  const renameWorkflow = (id: string, name: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? touchWorkflow({ ...w, name: name.trim() || w.name }) : w));
  };

  const deleteWorkflow = (id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id));
    if (activeId === id) setActiveId(null);
    toast({ title: 'Workflow deleted' });
  };

  const openWorkflow = (id: string) => setActiveId(id);
  const closeWorkflow = () => setActiveId(null);

  // ---------- Note CRUD (scoped to active workflow) ----------
  const addNote = (): string => {
    if (!activeId) return '';
    const id = crypto.randomUUID();
    updateActiveWorkflow(wf => {
      const maxZ = wf.notes.reduce((m, n) => Math.max(m, n.zIndex ?? 1), 1);
      const newNote: Note = {
        id,
        title: '',
        content: '',
        color: 'violet',
        position: {
          x: Math.max(40, window.innerWidth / 2 - 150 + (wf.notes.length % 6) * 20),
          y: Math.max(40, 100 + (wf.notes.length % 4) * 20),
        },
        tags: [],
        isNew: true,
        isPinned: false,
        zIndex: maxZ + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ...wf, notes: [...wf.notes, newNote] };
    });
    return id;
  };

  const updateNote = (updatedNote: Partial<Note> & { id: string }) => {
    updateActiveWorkflow(wf => ({
      ...wf,
      notes: wf.notes.map(n => n.id === updatedNote.id
        ? { ...n, ...updatedNote, isNew: false, updatedAt: new Date().toISOString() }
        : n),
    }));
  };

  const deleteNote = (id: string) => {
    updateActiveWorkflow(wf => ({
      ...wf,
      notes: wf.notes.filter(n => n.id !== id),
      connections: wf.connections.filter(c => c.from !== id && c.to !== id),
    }));
    toast({ title: 'Note deleted' });
  };

  const updateNotePosition = (id: string, position: { x: number; y: number }) => {
    updateActiveWorkflow(wf => ({
      ...wf,
      notes: wf.notes.map(n => n.id === id ? { ...n, position } : n),
    }));
  };

  const bringToFront = (id: string) => {
    updateActiveWorkflow(wf => {
      const maxZ = wf.notes.reduce((m, n) => Math.max(m, n.zIndex ?? 1), 1);
      return { ...wf, notes: wf.notes.map(n => n.id === id ? { ...n, zIndex: maxZ + 1 } : n) };
    });
  };

  const duplicateNote = (id: string) => {
    updateActiveWorkflow(wf => {
      const src = wf.notes.find(n => n.id === id);
      if (!src) return wf;
      const maxZ = wf.notes.reduce((m, n) => Math.max(m, n.zIndex ?? 1), 1);
      const copy: Note = {
        ...src,
        id: crypto.randomUUID(),
        title: src.title ? `${src.title} (copy)` : '',
        isPinned: false,
        isNew: false,
        zIndex: maxZ + 1,
        position: { x: src.position.x + 28, y: src.position.y + 28 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ...wf, notes: [...wf.notes, copy] };
    });
    toast({ title: 'Note duplicated' });
  };

  const updateNoteColor = (id: string, color: NoteColor) => {
    updateActiveWorkflow(wf => ({
      ...wf,
      notes: wf.notes.map(n => n.id === id ? { ...n, color, updatedAt: new Date().toISOString() } : n),
    }));
  };

  const toggleNotePinned = (id: string) => {
    updateActiveWorkflow(wf => ({
      ...wf,
      notes: wf.notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n),
    }));
  };

  const addTagToNote = (id: string, tag: string) => {
    updateActiveWorkflow(wf => ({
      ...wf,
      notes: wf.notes.map(n => n.id === id && !n.tags.includes(tag)
        ? { ...n, tags: [...n.tags, tag], updatedAt: new Date().toISOString() }
        : n),
    }));
  };

  const removeTagFromNote = (id: string, tag: string) => {
    updateActiveWorkflow(wf => ({
      ...wf,
      notes: wf.notes.map(n => n.id === id
        ? { ...n, tags: n.tags.filter(t => t !== tag), updatedAt: new Date().toISOString() }
        : n),
    }));
  };

  // ---------- Connection CRUD ----------
  const addConnection = (from: string, to: string, fromSide: AnchorSide, toSide: AnchorSide) => {
    if (from === to) return;
    updateActiveWorkflow(wf => {
      if (wf.connections.some(c => (c.from === from && c.to === to) || (c.from === to && c.to === from))) return wf;
      return { ...wf, connections: [...wf.connections, { id: crypto.randomUUID(), from, to, fromSide, toSide }] };
    });
  };

  const removeConnection = (id: string) => {
    updateActiveWorkflow(wf => ({ ...wf, connections: wf.connections.filter(c => c.id !== id) }));
  };

  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [notes]);

  const resetToDemo = () => {
    updateActiveWorkflow(wf => ({ ...wf, notes: DEMO_NOTES, connections: [] }));
    toast({ title: 'Reset to demo data' });
  };

  const replaceAll = (nextNotes: Note[], nextConnections: NoteConnection[]) => {
    updateActiveWorkflow(wf => ({ ...wf, notes: nextNotes, connections: nextConnections }));
  };

  const messages = activeWorkflow?.messages ?? [];

  const appendMessage = (role: 'user' | 'assistant', content: string): ChatMessage => {
    const msg: ChatMessage = { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
    updateActiveWorkflow(wf => ({ ...wf, messages: [...wf.messages, msg] }));
    return msg;
  };

  const clearChat = () => {
    updateActiveWorkflow(wf => ({ ...wf, messages: [] }));
  };

  return {
    workflows,
    activeId,
    activeWorkflow,
    createWorkflow,
    renameWorkflow,
    deleteWorkflow,
    openWorkflow,
    closeWorkflow,
    notes,
    connections,
    addConnection,
    removeConnection,
    addNote,
    updateNote,
    deleteNote,
    updateNotePosition,
    updateNoteColor,
    toggleNotePinned,
    addTagToNote,
    removeTagFromNote,
    bringToFront,
    duplicateNote,
    allTags,
    resetToDemo,
    replaceAll,
    messages,
    appendMessage,
    clearChat,
  };
};

export const sortNotes = (notes: Note[], sort: SortOption): Note[] => {
  return [...notes].sort((a, b) => {
    switch (sort) {
      case 'newest':   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'modified': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'alpha':    return a.title.localeCompare(b.title);
      default:         return 0;
    }
  });
};

export const filterNotes = (notes: Note[], query: string, activeTag: string | null): Note[] => {
  return notes.filter(note => {
    const matchesTag = !activeTag || note.tags.includes(activeTag);
    if (!matchesTag) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      note.tags.some(t => t.toLowerCase().includes(q))
    );
  });
};
