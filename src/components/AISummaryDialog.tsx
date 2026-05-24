import React, { useEffect, useState } from 'react';
import { Sparkles, Copy, Download, Loader2, RefreshCw, AlertTriangle, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNotesContext } from '../context/NotesContext';
import { summariseNotes, regenerateCanvas } from '../lib/aiSummary';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderInline = (s: string) => {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-foreground/90 text-[0.85em] font-mono">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  return out;
};

const renderMarkdown = (md: string): string => {
  const lines = md.split(/\r?\n/);
  const html: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inCode = false;
  let codeBuf: string[] = [];

  const closeList = () => { if (inList) { html.push(`</${inList}>`); inList = null; } };

  for (const raw of lines) {
    const line = raw;
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(`<pre class="my-3 p-3 rounded-lg bg-muted overflow-x-auto"><code class="text-xs font-mono">${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        inCode = false; codeBuf = [];
      } else {
        closeList(); inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (/^###\s+/.test(line)) { closeList(); html.push(`<h3 class="font-display text-base font-semibold mt-5 mb-2 text-foreground">${renderInline(line.replace(/^###\s+/, ''))}</h3>`); continue; }
    if (/^##\s+/.test(line))  { closeList(); html.push(`<h2 class="font-display text-lg font-semibold mt-6 mb-2 text-foreground border-b border-border pb-1">${renderInline(line.replace(/^##\s+/, ''))}</h2>`); continue; }
    if (/^#\s+/.test(line))   { closeList(); html.push(`<h1 class="font-display text-xl font-bold mt-6 mb-3 text-foreground">${renderInline(line.replace(/^#\s+/, ''))}</h1>`); continue; }

    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch) {
      if (inList !== 'ul') { closeList(); html.push('<ul class="list-disc pl-6 my-2 space-y-1 text-sm leading-relaxed text-foreground/90">'); inList = 'ul'; }
      html.push(`<li>${renderInline(ulMatch[1])}</li>`);
      continue;
    }
    if (olMatch) {
      if (inList !== 'ol') { closeList(); html.push('<ol class="list-decimal pl-6 my-2 space-y-1 text-sm leading-relaxed text-foreground/90">'); inList = 'ol'; }
      html.push(`<li>${renderInline(olMatch[1])}</li>`);
      continue;
    }

    if (line.trim() === '') { closeList(); continue; }
    closeList();
    if (/^---+$/.test(line.trim())) { html.push('<hr class="my-4 border-border" />'); continue; }
    html.push(`<p class="my-2 text-sm leading-relaxed text-foreground/90">${renderInline(line)}</p>`);
  }
  closeList();
  if (inCode) html.push(`<pre class="my-3 p-3 rounded-lg bg-muted overflow-x-auto"><code class="text-xs font-mono">${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
  return html.join('\n');
};

const AISummaryDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { notes, connections, replaceAll } = useNotesContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = async () => {
    setLoading(true); setError(null); setMarkdown('');
    try {
      const { markdown } = await summariseNotes({ notes, connections });
      setMarkdown(markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !markdown && !loading) run();
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' as never });
    }
  };

  const doRegenerate = async () => {
    setRegenLoading(true);
    try {
      const { notes: newNotes, connections: newConns } = await regenerateCanvas({ notes, connections });
      replaceAll(newNotes, newConns);
      toast({ title: `Canvas regenerated — ${newNotes.length} notes, ${newConns.length} connections` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Regenerate failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' as never });
    } finally {
      setRegenLoading(false);
      setConfirmOpen(false);
    }
  };

  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughttag-plan-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-primary" />
            AI-curated plan
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {notes.length} notes • {connections.length} connections
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-3 text-primary" />
              <p className="text-sm">Synthesising your canvas…</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Following the connections you've drawn</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Couldn't generate the plan</p>
              <p className="text-xs text-muted-foreground max-w-md mb-4">{error}</p>
              <button onClick={run} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          )}

          {markdown && !loading && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
            />
          )}
        </div>

        {markdown && !loading && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-border">
            <button onClick={run} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate plan
            </button>
            <button onClick={copy} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <button onClick={download} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download .md
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={regenLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm hover:shadow-md disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {regenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              Replace canvas with AI flow
            </button>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all {notes.length} existing notes and {connections.length} connections, and replace them with the AI's structured flow. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={regenLoading}
              onClick={(e) => { e.preventDefault(); doRegenerate(); }}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {regenLoading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Generating…</>) : 'Replace canvas'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default AISummaryDialog;
