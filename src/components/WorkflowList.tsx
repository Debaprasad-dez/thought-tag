import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Workflow as WorkflowIcon, ArrowRight, Link2 } from 'lucide-react';
import { useNotesContext } from '../context/NotesContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const WorkflowList: React.FC = () => {
  const { workflows, createWorkflow, renameWorkflow, deleteWorkflow, openWorkflow } = useNotesContext();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const submitNew = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = createWorkflow(newName || undefined);
    setNewName('');
    openWorkflow(id);
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditName(current);
  };

  const commitEdit = () => {
    if (editingId) renameWorkflow(editingId, editName);
    setEditingId(null);
    setEditName('');
  };

  const targetWf = confirmDelete ? workflows.find(w => w.id === confirmDelete) : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mb-1">Your workflows</h1>
          <p className="text-sm text-muted-foreground">Each workflow is its own canvas of notes and connections. Open one to start thinking.</p>
        </div>

        {/* New workflow form */}
        <form onSubmit={submitNew} className="mb-8 flex items-center gap-2 p-3 rounded-xl border border-dashed border-border bg-card/50">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Name your new workflow…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 inline-flex items-center gap-1.5"
          >
            Create <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Workflow cards */}
        {workflows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <WorkflowIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">No workflows yet. Create your first above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map(wf => (
              <div
                key={wf.id}
                className="group relative rounded-xl border border-border bg-card p-5 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
                onClick={() => editingId !== wf.id && openWorkflow(wf.id)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0">
                    <WorkflowIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === wf.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditingId(null); setEditName(''); } }}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-display font-semibold outline-none focus:border-primary"
                      />
                    ) : (
                      <h3 className="font-display font-semibold text-foreground truncate">{wf.name}</h3>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Updated {new Date(wf.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-mono font-medium text-foreground">{wf.notes.length}</span> notes
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    <span className="font-mono font-medium text-foreground">{wf.connections.length}</span>
                  </span>
                </div>

                {/* Hover actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(wf.id, wf.name); }}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                    aria-label="Rename"
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(wf.id); }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              {targetWf
                ? `"${targetWf.name}" and its ${targetWf.notes.length} notes and ${targetWf.connections.length} connections will be permanently removed.`
                : 'This workflow will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDelete) deleteWorkflow(confirmDelete); setConfirmDelete(null); }}
            >
              Delete workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkflowList;
