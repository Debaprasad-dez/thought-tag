import React, { useState, useEffect, useRef } from 'react';
import { Palette, Trash2, Pin, PinOff } from 'lucide-react';
import { Note as NoteType, NoteColor } from '../types';
import ColorPicker from './ColorPicker';

interface NoteProps {
  note: NoteType;
  onUpdate: (note: Partial<NoteType>) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrag: (e: React.DragEvent) => void;
  onColorChange: (color: NoteColor) => void;
  onTogglePin: () => void;
}

const Note: React.FC<NoteProps> = ({
  note,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrag,
  onColorChange,
  onTogglePin,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (note.isNew && titleRef.current) {
      titleRef.current.focus();
    }
  }, [note.isNew]);

  const colorClasses = {
    yellow: 'bg-note-yellow',
    mint: 'bg-note-mint',
    lavender: 'bg-note-lavender',
    sky: 'bg-note-sky',
  };

  const borderClasses = {
    yellow: 'border-yellow-300',
    mint: 'border-green-300',
    lavender: 'border-purple-300',
    sky: 'border-blue-300',
  };

  return (
    <div
      ref={noteRef}
      className={`note border ${colorClasses[note.color]} ${borderClasses[note.color]} dark:bg-note-dark dark:text-white animate-scale-up w-64 min-h-[160px] p-4 flex flex-col`}
      style={{
        position: 'absolute',
        left: `${note.position.x}px`,
        top: `${note.position.y}px`,
        zIndex: note.isPinned ? 10 : 1,
      }}
      draggable={!note.isPinned}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrag={onDrag}
    >
      <div className="note-controls">
        <button
          onClick={onTogglePin}
          className="p-1 rounded-full bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700"
          aria-label={note.isPinned ? "Unpin note" : "Pin note"}
        >
          {note.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-1 rounded-full bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700"
          aria-label="Change note color"
        >
          <Palette size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded-full bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700"
          aria-label="Delete note"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {showColorPicker && (
        <div className="absolute top-10 right-2 z-10">
          <ColorPicker
            selectedColor={note.color}
            onColorChange={(color) => {
              onColorChange(color);
              setShowColorPicker(false);
            }}
          />
        </div>
      )}

      <input
        ref={titleRef}
        className={`font-bold text-lg bg-transparent border-none outline-none ${note.isPinned ? 'cursor-default' : 'cursor-move'} w-full mb-2`}
        placeholder="Title"
        value={note.title}
        onChange={(e) => onUpdate({ ...note, title: e.target.value })}
      />

      <textarea
        className="flex-1 bg-transparent border-none outline-none resize-none min-h-[80px] w-full"
        placeholder="Write your note here..."
        value={note.content}
        onChange={(e) => onUpdate({ ...note, content: e.target.value })}
      />
    </div>
  );
};

export default Note;
