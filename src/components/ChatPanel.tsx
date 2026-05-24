import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Trash2, X, MessageSquare } from 'lucide-react';
import { useNotesContext } from '../context/NotesContext';
import { chatWithCanvas } from '../lib/aiSummary';
import { useToast } from '@/components/ui/use-toast';

const STARTER_PROMPTS = [
  'Plan a product launch in 6 weeks',
  'Map my Q3 personal goals',
  'Outline a research paper on climate adaptation',
  'Design an onboarding flow for a SaaS app',
];

const renderInline = (s: string) => {
  const esc = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[0.85em] font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const ChatPanel: React.FC<Props> = ({ open, onClose }) => {
  const { messages, notes, connections, appendMessage, replaceAll, clearChat } = useNotesContext();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async (text?: string) => {
    const userMessage = (text ?? input).trim();
    if (!userMessage || loading) return;
    setInput('');
    setLoading(true);
    appendMessage('user', userMessage);
    try {
      const result = await chatWithCanvas({
        userMessage,
        history: messages,
        notes,
        connections,
      });
      replaceAll(result.notes, result.connections);
      appendMessage('assistant', result.reply);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendMessage('assistant', `⚠️ Couldn't update the canvas. ${msg}`);
      toast({ title: 'Chat failed', description: msg, variant: 'destructive' as never });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const empty = messages.length === 0;

  if (!open) return null;

  return (
    <aside className="w-[360px] shrink-0 flex flex-col border-l border-border bg-background/95 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="font-display text-sm font-semibold">AI planner</span>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <button
              onClick={() => { if (confirm('Clear chat history? Notes will be preserved.')) clearChat(); }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {empty ? (
          <div className="flex flex-col items-center justify-center text-center px-2 py-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-1.5">What do you want to plan?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Describe your goal. The AI will sketch notes and connections on the canvas. Keep chatting to refine.
            </p>
            <div className="w-full space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Try one</p>
              {STARTER_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={loading}
                  className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-colors text-foreground/80 hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
                dangerouslySetInnerHTML={{ __html: renderInline(m.content) }}
              />
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 shrink-0">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={empty ? 'Tell me what to plan…' : 'Refine the canvas…'}
            disabled={loading}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="absolute right-2 bottom-2 p-1.5 rounded-md bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90"
            aria-label="Send"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-1.5 px-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </aside>
  );
};

export default ChatPanel;
