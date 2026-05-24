
import React, { createContext, useContext } from 'react';
import { useNotes } from '../hooks/useNotes';
import { Note, NoteColor, NoteConnection, AnchorSide, Workflow, ChatMessage } from '../types';

interface NotesContextType {
  workflows: Workflow[];
  activeId: string | null;
  activeWorkflow: Workflow | null;
  createWorkflow: (name?: string) => string;
  renameWorkflow: (id: string, name: string) => void;
  deleteWorkflow: (id: string) => void;
  openWorkflow: (id: string) => void;
  closeWorkflow: () => void;

  notes: Note[];
  connections: NoteConnection[];
  addConnection: (from: string, to: string, fromSide: AnchorSide, toSide: AnchorSide) => void;
  removeConnection: (id: string) => void;
  allTags: { tag: string; count: number }[];
  addNote: () => string;
  updateNote: (note: Partial<Note> & { id: string }) => void;
  deleteNote: (id: string) => void;
  updateNotePosition: (id: string, position: { x: number; y: number }) => void;
  updateNoteColor: (id: string, color: NoteColor) => void;
  toggleNotePinned: (id: string) => void;
  addTagToNote: (id: string, tag: string) => void;
  removeTagFromNote: (id: string, tag: string) => void;
  bringToFront: (id: string) => void;
  duplicateNote: (id: string) => void;
  resetToDemo: () => void;
  replaceAll: (notes: Note[], connections: NoteConnection[]) => void;
  messages: ChatMessage[];
  appendMessage: (role: 'user' | 'assistant', content: string) => ChatMessage;
  clearChat: () => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const notesState = useNotes();
  return <NotesContext.Provider value={notesState}>{children}</NotesContext.Provider>;
};

export const useNotesContext = (): NotesContextType => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotesContext must be used within NotesProvider');
  return ctx;
};
