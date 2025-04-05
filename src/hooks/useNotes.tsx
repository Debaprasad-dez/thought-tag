
import { useState, useEffect } from 'react';
import { Note, NoteColor } from '../types';
import { useToast } from '@/components/ui/use-toast';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const { toast } = useToast();

  // Load notes from localStorage on initial render
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Failed to parse saved notes:', error);
        toast({
          title: 'Error',
          description: 'Failed to load saved notes',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      color: 'yellow',
      position: {
        // Place new note in center of viewport or with slight offset from existing notes
        x: window.innerWidth / 2 - 150 + (notes.length * 15),
        y: window.innerHeight / 2 - 100 + (notes.length * 15),
      },
      isNew: true,
      isPinned: false,
    };

    setNotes(prev => [...prev, newNote]);
    return newNote.id;
  };

  const updateNote = (updatedNote: Partial<Note> & { id: string }) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === updatedNote.id ? { ...note, ...updatedNote, isNew: false } : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    toast({
      title: 'Note deleted',
      description: 'Your note has been deleted',
    });
  };

  const updateNotePosition = (id: string, position: { x: number; y: number }) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === id ? { ...note, position } : note
      )
    );
  };

  const updateNoteColor = (id: string, color: NoteColor) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === id ? { ...note, color } : note
      )
    );
  };

  const toggleNotePinned = (id: string) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === id ? { ...note, isPinned: !note.isPinned } : note
      )
    );
  };

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    updateNotePosition,
    updateNoteColor,
    toggleNotePinned,
  };
};
