
import React, { useState } from 'react';
import { Pin, PinOff, Trash2, Download, Edit3 } from 'lucide-react';
import { Note, NoteColor, NOTE_COLORS } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface GridNoteCardProps {
  note: Note;
  index: number;
  onUpdate: (note: Partial<Note>) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onColorChange: (color: NoteColor) => void;
}

const COLOR_BG_MAP: Record<NoteColor, string> = {
  violet: 'var(--note-violet)',
  rose:   'var(--note-rose)',
  sky:    'var(--note-sky)',
  sage:   'var(--note-sage)',
  amber:  'var(--note-amber)',
};

const COLOR_BORDER_MAP: Record<NoteColor, string> = {
  violet: 'hsl(258 60% 82%)',
  rose:   'hsl(320 60% 85%)',
  sky:    'hsl(204 70% 82%)',
  sage:   'hsl(142 60% 80%)',
  amber:  'hsl(45 80% 80%)',
};

const GridNoteCard: React.FC<GridNoteCardProps> = ({
  note,
  index,
  onUpdate,
  onDelete,
  onTogglePin,
  onColorChange,
}) => {
  const [editing, setEditing] = useState(false);

  const wordCount = note.content.trim().split(/\s+/).filter(Boolean).length;

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${note.title}\n${'─'.repeat(40)}\n${note.content}\n\nTags: ${note.tags.join(', ') || 'none'}\nCreated: ${new Date(note.createdAt).toLocaleString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="note-grid-card group stagger-item"
      style={{
        animationDelay: `${index * 40}ms`,
        background: COLOR_BG_MAP[note.color],
        borderColor: COLOR_BORDER_MAP[note.color],
      }}
    >
      {/* Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              className="font-display font-semibold text-sm bg-transparent border-none outline-none w-full text-gray-800 dark:text-gray-100"
              value={note.title}
              onChange={e => onUpdate({ title: e.target.value })}
              onBlur={() => setEditing(false)}
            />
          ) : (
            <h3
              className="font-display font-semibold text-sm text-gray-800 dark:text-gray-100 truncate cursor-text"
              onClick={() => setEditing(true)}
            >
              {note.title || <span className="text-gray-400 font-normal italic">Untitled</span>}
            </h3>
          )}
        </div>

        {/* Quick actions — appear on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setEditing(true); }}
            className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-black/30 text-gray-500 transition-all"
            aria-label="Edit note"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onTogglePin(); }}
            className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-black/30 text-gray-500 transition-all"
            aria-label={note.isPinned ? 'Unpin' : 'Pin'}
          >
            {note.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            onClick={handleExport}
            className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-black/30 text-gray-500 transition-all"
            aria-label="Export note"
          >
            <Download size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-500 hover:text-red-600 transition-all"
            aria-label="Delete note"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Content preview */}
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4 flex-1 font-body whitespace-pre-line">
        {note.content || <span className="italic text-gray-400">Empty note</span>}
      </p>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {note.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-black/30 text-gray-500 dark:text-gray-400"
            >
              #{tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="text-xs text-gray-400">+{note.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5 dark:border-white/10">
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        </span>
        <div className="flex items-center gap-1.5">
          {note.isPinned && <Pin size={10} className="text-gray-400" />}
          <span className="text-xs text-gray-400 font-mono">{wordCount}w</span>
        </div>
      </div>

      {/* Color swatches */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
        {NOTE_COLORS.map(c => (
          <button
            key={c.name}
            onClick={e => { e.stopPropagation(); onColorChange(c.name); }}
            className="w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125"
            style={{
              background: c.value,
              borderColor: note.color === c.name ? 'hsl(var(--primary))' : 'transparent',
            }}
            aria-label={c.label}
          />
        ))}
      </div>
    </div>
  );
};

export default GridNoteCard;
