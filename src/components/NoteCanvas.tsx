import React, { useState, useRef } from 'react';
import Note from './Note';
import FloatingActionButton from './FloatingActionButton';
import { Note as NoteType, NoteColor } from '../types';
import { useNotes } from '../hooks/useNotes';
import { MessageSquare } from 'lucide-react';

const NoteCanvas: React.FC = () => {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    updateNotePosition,
    updateNoteColor,
    toggleNotePinned,
  } = useNotes();
  
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, noteId: string, noteX: number, noteY: number) => {
    setDraggedNoteId(noteId);
    
    if (e.clientX && e.clientY) {
      dragOffsetRef.current = {
        x: e.clientX - noteX,
        y: e.clientY - noteY,
      };
    }
    
    const dragImg = new Image();
    dragImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(dragImg, 0, 0);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!draggedNoteId || !e.clientX || !e.clientY) return;
    
    if (e.clientX === 0 && e.clientY === 0) return;
    
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    
    updateNotePosition(draggedNoteId, { x: newX, y: newY });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (!draggedNoteId) return;
    
    if (e.clientX !== 0 && e.clientY !== 0) {
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;
      updateNotePosition(draggedNoteId, { x: newX, y: newY });
    }
    
    setDraggedNoteId(null);
  };

  const handleCreateNote = () => {
    addNote();
  };

  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-[calc(100vh-64px)] overflow-auto bg-gray-100 dark:bg-dark-bg flex flex-col"
    >
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-16 h-16 text-primary opacity-50" />
          <h2 className="text-xl font-semibold">Welcome to Your Notes</h2>
          <p className="text-md max-w-md">
            You don't have any notes yet. Click the "+" button to create your first note and start organizing your thoughts!
          </p>
        </div>
      ) : (
        notes.map(note => (
          <Note
            key={note.id}
            note={note}
            onUpdate={(updatedNote) => updateNote({ id: note.id, ...updatedNote })}
            onDelete={() => deleteNote(note.id)}
            onDragStart={(e) => handleDragStart(e, note.id, note.position.x, note.position.y)}
            onDragEnd={handleDragEnd}
            onDrag={handleDrag}
            onColorChange={(color: NoteColor) => updateNoteColor(note.id, color)}
            onTogglePin={() => toggleNotePinned(note.id)}
          />
        ))
      )}

      <FloatingActionButton onClick={handleCreateNote} />
    </div>
  );
};

export default NoteCanvas;
