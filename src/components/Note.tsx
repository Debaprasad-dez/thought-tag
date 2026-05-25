
import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Pin, PinOff, Trash2, Palette, X, Plus, Download, Copy, GripHorizontal } from 'lucide-react';
import { Note as NoteType, NoteColor, NOTE_COLORS, AnchorSide } from '../types';

interface NoteProps {
  note: NoteType;
  scale: number;
  onUpdate: (note: Partial<NoteType>) => void;
  onDelete: () => void;
  onMove: (pos: { x: number; y: number }) => void;
  onDragStart: () => void;
  onColorChange: (color: NoteColor) => void;
  onTogglePin: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onDuplicate: () => void;
  onAnchorPointerDown: (noteId: string, side: AnchorSide, e: React.PointerEvent) => void;
  onAnchorPointerUp: (noteId: string, side: AnchorSide, e: React.PointerEvent) => void;
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

const Note = forwardRef<HTMLDivElement, NoteProps>(({
  note,
  scale,
  onUpdate,
  onDelete,
  onMove,
  onDragStart,
  onColorChange,
  onTogglePin,
  onAddTag,
  onRemoveTag,
  onDuplicate,
  onAnchorPointerDown,
  onAnchorPointerUp,
}, ref) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (note.isNew && titleRef.current) titleRef.current.focus();
  }, [note.isNew]);

  useEffect(() => {
    if (showTagInput && tagInputRef.current) tagInputRef.current.focus();
  }, [showTagInput]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [note.content]);

  const handleHandlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onDragStart();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: note.position.x,
      originY: note.position.y,
    };
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleHandlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = (e.clientX - dragState.current.startX) / scale;
    const dy = (e.clientY - dragState.current.startY) / scale;
    onMove({
      x: dragState.current.originX + dx,
      y: dragState.current.originY + dy,
    });
  };

  const handleHandlePointerUp = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    dragState.current = null;
    setIsDragging(false);
    document.body.style.userSelect = '';
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const wordCount = note.content.trim().split(/\s+/).filter(Boolean).length;

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      onAddTag(tagInput.trim().toLowerCase().replace(/\s+/g, '-'));
      setTagInput('');
      setShowTagInput(false);
    }
    if (e.key === 'Escape') { setTagInput(''); setShowTagInput(false); }
  };

  const handleExport = () => {
    const text = `${note.title}\n${'─'.repeat(40)}\n${note.content}\n\nTags: ${note.tags.join(', ') || 'none'}\nCreated: ${new Date(note.createdAt).toLocaleString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const anchorBase = "absolute w-3 h-3 rounded-full bg-white dark:bg-gray-800 border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair hover:scale-125 z-10";
  const anchorHandlers = (side: AnchorSide) => ({
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); onAnchorPointerDown(note.id, side, e); },
    onPointerUp:   (e: React.PointerEvent) => { e.stopPropagation(); onAnchorPointerUp(note.id, side, e); },
    style: { touchAction: 'none' as const },
  });

  return (
    <div
      ref={ref}
      data-note-id={note.id}
      className={`note-card group${note.isNew ? ' animate-scale-in' : ''}`}
      style={{
        position: 'absolute',
        left: `${note.position.x}px`,
        top: `${note.position.y}px`,
        zIndex: isDragging ? 999 : (note.zIndex ?? (note.isPinned ? 10 : 1)),
        width: 'min(256px, calc(100vw - 48px))',
        minHeight: 180,
        background: COLOR_BG_MAP[note.color],
        borderColor: COLOR_BORDER_MAP[note.color],
        display: 'flex',
        flexDirection: 'column',
        padding: '0 14px 10px',
        boxShadow: isDragging
          ? '0 16px 40px -8px rgba(0,0,0,0.25), 0 0 0 1px hsl(var(--primary)/0.3)'
          : undefined,
        transform: isDragging ? 'scale(1.02) rotate(-0.5deg)' : undefined,
        transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.1s',
      }}
    >
      {/* Anchor handles — Figma-style connection points */}
      <div {...anchorHandlers('top')}    className={anchorBase} style={{ ...anchorHandlers('top').style,    top: -6,    left: '50%', transform: 'translateX(-50%)' }} aria-label="Connect from top" />
      <div {...anchorHandlers('right')}  className={anchorBase} style={{ ...anchorHandlers('right').style,  right: -6,  top: '50%',  transform: 'translateY(-50%)' }} aria-label="Connect from right" />
      <div {...anchorHandlers('bottom')} className={anchorBase} style={{ ...anchorHandlers('bottom').style, bottom: -6, left: '50%', transform: 'translateX(-50%)' }} aria-label="Connect from bottom" />
      <div {...anchorHandlers('left')}   className={anchorBase} style={{ ...anchorHandlers('left').style,   left: -6,   top: '50%',  transform: 'translateY(-50%)' }} aria-label="Connect from left" />

      {/* Header: grip on left, actions on right — single row, no overlap */}
      <div className="flex items-center -mx-3.5 px-2 h-8 border-b border-black/5 dark:border-white/10 rounded-t-xl shrink-0">
        <div
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
          className="flex items-center justify-center w-7 h-full cursor-grab active:cursor-grabbing text-black/30 dark:text-white/30 hover:text-black/55 dark:hover:text-white/55 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-tl-xl shrink-0"
          style={{ touchAction: 'none' }}
          title="Drag to move"
        >
          <GripHorizontal size={14} />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5">
          <button onClick={onTogglePin} className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-all" aria-label={note.isPinned ? 'Unpin' : 'Pin'}>
            {note.isPinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
          <button onClick={() => setShowColorPicker(v => !v)} className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-all" aria-label="Change color">
            <Palette size={11} />
          </button>
          <button onClick={onDuplicate} className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-all" aria-label="Duplicate">
            <Copy size={11} />
          </button>
          <button onClick={handleExport} className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-all" aria-label="Export">
            <Download size={11} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 text-black/40 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 transition-all" aria-label="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {showColorPicker && (
        <div className="absolute top-9 right-2 z-20 flex gap-1.5 p-2 rounded-xl bg-white dark:bg-gray-900 shadow-lg border border-border animate-pop-in">
          {NOTE_COLORS.map(c => (
            <button key={c.name} onClick={() => { onColorChange(c.name); setShowColorPicker(false); }}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c.value, borderColor: note.color === c.name ? 'hsl(var(--primary))' : 'transparent' }}
              aria-label={c.label} />
          ))}
        </div>
      )}

      <input
        ref={titleRef}
        className="font-display font-semibold text-sm bg-transparent border-none outline-none w-full mt-2 mb-1 text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
        placeholder="Title"
        value={note.title}
        onChange={e => onUpdate({ title: e.target.value })}
      />

      <textarea
        ref={contentRef}
        className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 leading-relaxed min-h-[80px] w-full font-body overflow-hidden"
        style={{ fieldSizing: 'content' } as React.CSSProperties}
        placeholder="Write your thought here…"
        value={note.content}
        onChange={e => onUpdate({ content: e.target.value })}
      />

      <div className="flex flex-wrap gap-1 mt-2">
        {note.tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/50 dark:bg-black/30 text-gray-600 dark:text-gray-300 group/tag">
            #{tag}
            <button onClick={() => onRemoveTag(tag)} className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-500" aria-label={`Remove ${tag}`}>
              <X size={9} />
            </button>
          </span>
        ))}
        {showTagInput ? (
          <input
            ref={tagInputRef}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => { setTagInput(''); setShowTagInput(false); }}
            placeholder="tag name"
            className="text-xs px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/40 border border-dashed border-gray-400 outline-none w-20 text-gray-600 dark:text-gray-300"
          />
        ) : (
          <button onClick={() => setShowTagInput(true)} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-black/30 transition-all opacity-0 group-hover:opacity-100" aria-label="Add tag">
            <Plus size={9} /> tag
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/10">
        <span className="text-xs text-gray-400 font-mono">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        {note.isPinned && <span className="text-xs text-gray-400 flex items-center gap-1"><Pin size={10} /> pinned</span>}
      </div>
    </div>
  );
});

Note.displayName = 'Note';

export default Note;
