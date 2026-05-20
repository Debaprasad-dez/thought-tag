
import { useState, useEffect, useMemo } from 'react';
import { Note, NoteColor, SortOption } from '../types';
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

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('thoughttag-notes');
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch {
        setNotes(DEMO_NOTES);
      }
    } else {
      setNotes(DEMO_NOTES);
    }
  }, []);

  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('thoughttag-notes', JSON.stringify(notes));
    }
  }, [notes]);

  const addNote = () => {
    const maxZ = notes.reduce((m, n) => Math.max(m, n.zIndex ?? 1), 1);
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      color: 'violet',
      position: {
        x: Math.max(40, window.innerWidth / 2 - 150 + (notes.length % 6) * 20),
        y: Math.max(40, 100 + (notes.length % 4) * 20),
      },
      tags: [],
      isNew: true,
      isPinned: false,
      zIndex: maxZ + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [...prev, newNote]);
    return newNote.id;
  };

  const updateNote = (updatedNote: Partial<Note> & { id: string }) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === updatedNote.id
          ? { ...note, ...updatedNote, isNew: false, updatedAt: new Date().toISOString() }
          : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    toast({ title: 'Note deleted' });
  };

  const updateNotePosition = (id: string, position: { x: number; y: number }) => {
    setNotes(prev =>
      prev.map(note => note.id === id ? { ...note, position } : note)
    );
  };

  const bringToFront = (id: string) => {
    setNotes(prev => {
      const maxZ = prev.reduce((m, n) => Math.max(m, n.zIndex ?? 1), 1);
      return prev.map(note => note.id === id ? { ...note, zIndex: maxZ + 1 } : note);
    });
  };

  const duplicateNote = (id: string) => {
    setNotes(prev => {
      const src = prev.find(n => n.id === id);
      if (!src) return prev;
      const maxZ = prev.reduce((m, n) => Math.max(m, n.zIndex ?? 1), 1);
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
      return [...prev, copy];
    });
    toast({ title: 'Note duplicated' });
  };

  const updateNoteColor = (id: string, color: NoteColor) => {
    setNotes(prev =>
      prev.map(note => note.id === id ? { ...note, color, updatedAt: new Date().toISOString() } : note)
    );
  };

  const toggleNotePinned = (id: string) => {
    setNotes(prev =>
      prev.map(note => note.id === id ? { ...note, isPinned: !note.isPinned } : note)
    );
  };

  const addTagToNote = (id: string, tag: string) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id && !note.tags.includes(tag)
          ? { ...note, tags: [...note.tags, tag], updatedAt: new Date().toISOString() }
          : note
      )
    );
  };

  const removeTagFromNote = (id: string, tag: string) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id
          ? { ...note, tags: note.tags.filter(t => t !== tag), updatedAt: new Date().toISOString() }
          : note
      )
    );
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
    setNotes(DEMO_NOTES);
    localStorage.setItem('thoughttag-notes', JSON.stringify(DEMO_NOTES));
    toast({ title: 'Reset to demo data' });
  };

  return {
    notes,
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
