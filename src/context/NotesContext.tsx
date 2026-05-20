
import React, { createContext, useContext } from 'react';
import { useNotes } from '../hooks/useNotes';
import { Note, NoteColor } from '../types';

interface NotesContextType {
  notes: Note[];
  allTags: { tag: string; count: number }[];
  addNote: () => string;
  updateNote: (note: Partial<Note> & { id: string }) => void;
  deleteNote: (id: string) => void;
  updateNotePosition: (id: string, position: { x: number; y: number }) => void;
  updateNoteColor: (id: string, color: NoteColor) => void;
  toggleNotePinned: (id: string) => void;
  addTagToNote: (id: string, tag: string) => void;
  removeTagFromNote: (id: string, tag: string) => void;
  resetToDemo: () => void;
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
