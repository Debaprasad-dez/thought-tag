
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Note from './Note';
import GridNoteCard from './GridNoteCard';
import FloatingActionButton from './FloatingActionButton';
import TagSidebar from './TagSidebar';
import { Note as NoteType, NoteColor, ViewMode, SortOption, AnchorSide, NoteConnection } from '../types';
import { sortNotes, filterNotes } from '../hooks/useNotes';
import { useNotesContext } from '../context/NotesContext';
import { PenLine, ZoomIn, ZoomOut, Maximize2, Sparkles, MessageSquare } from 'lucide-react';
import ChatPanel from './ChatPanel';

interface NoteCanvasProps {
  searchQuery: string;
  viewMode: ViewMode;
  sortBy: SortOption;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  activeTag: string | null;
  onTagSelect: (tag: string | null) => void;
  chatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;
}

const NOTE_WIDTH = 256;
const NOTE_DEFAULT_HEIGHT = 220;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

const anchorOffset = (side: AnchorSide, w: number, h: number) => {
  switch (side) {
    case 'top':    return { x: w / 2, y: 0 };
    case 'right':  return { x: w,     y: h / 2 };
    case 'bottom': return { x: w / 2, y: h };
    case 'left':   return { x: 0,     y: h / 2 };
  }
};

const tangentForSide = (side: AnchorSide, len: number) => {
  switch (side) {
    case 'top':    return { x: 0,    y: -len };
    case 'right':  return { x: len,  y: 0 };
    case 'bottom': return { x: 0,    y: len };
    case 'left':   return { x: -len, y: 0 };
  }
};

const NoteCanvas: React.FC<NoteCanvasProps> = ({
  searchQuery,
  viewMode,
  sortBy,
  sidebarOpen,
  onSidebarOpenChange,
  activeTag,
  onTagSelect,
  chatOpen,
  onChatOpenChange,
}) => {
  const {
    notes,
    connections,
    addConnection,
    removeConnection,
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
  } = useNotesContext();

  const filteredNotes = filterNotes(notes, searchQuery, activeTag);
  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  const sortedUnpinned = sortNotes(unpinnedNotes, sortBy);
  const sortedPinned = sortNotes(pinnedNotes, sortBy);
  const displayNotes = [...sortedPinned, ...sortedUnpinned];

  const isEmpty = filteredNotes.length === 0;

  // Zoom/pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [, forceTick] = useState(0); // re-render to refresh measured rects after layout

  // Measure tick — after notes move/resize, redraw lines
  useEffect(() => {
    const id = requestAnimationFrame(() => forceTick(t => t + 1));
    return () => cancelAnimationFrame(id);
  }, [notes, connections, scale, pan]);

  // Link-drag state
  const [pendingLink, setPendingLink] = useState<{
    fromId: string;
    fromSide: AnchorSide;
    cursor: { x: number; y: number };
  } | null>(null);
  const pendingLinkRef = useRef(pendingLink);
  pendingLinkRef.current = pendingLink;

  // Convert client coords to world (canvas) coords
  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: clientX, y: clientY };
    const rect = vp.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top  - pan.y) / scale,
    };
  }, [scale, pan]);

  // Wheel: shift+wheel or ctrl+wheel (pinch) = zoom; otherwise pan
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || viewMode !== 'canvas') return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        // Pinch-zoom (trackpad pinch fires as ctrl+wheel)
        e.preventDefault();
        const rect = vp.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const delta = -e.deltaY * 0.01;
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * Math.exp(delta)));
        const worldX = (cx - pan.x) / scale;
        const worldY = (cy - pan.y) / scale;
        setScale(nextScale);
        setPan({ x: cx - worldX * nextScale, y: cy - worldY * nextScale });
      } else if (e.shiftKey) {
        // Shift+wheel zoom around cursor
        e.preventDefault();
        const rect = vp.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const delta = -(e.deltaY || e.deltaX) * 0.0015;
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * Math.exp(delta)));
        const worldX = (cx - pan.x) / scale;
        const worldY = (cy - pan.y) / scale;
        setScale(nextScale);
        setPan({ x: cx - worldX * nextScale, y: cy - worldY * nextScale });
      } else {
        // Plain wheel / two-finger trackpad scroll → pan canvas
        e.preventDefault();
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [scale, pan, viewMode]);

  // Middle-mouse / space-drag pan on empty canvas
  const panState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 1) return; // middle-click only
    e.preventDefault();
    panState.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handleViewportPointerMove = (e: React.PointerEvent) => {
    // Update link preview cursor
    if (pendingLinkRef.current) {
      setPendingLink(p => p ? { ...p, cursor: clientToWorld(e.clientX, e.clientY) } : null);
    }
    if (!panState.current) return;
    setPan({
      x: panState.current.originX + (e.clientX - panState.current.startX),
      y: panState.current.originY + (e.clientY - panState.current.startY),
    });
  };
  const handleViewportPointerUp = (e: React.PointerEvent) => {
    if (panState.current) {
      panState.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
    // Drop pending link onto empty canvas — cancel
    if (pendingLinkRef.current) {
      setPendingLink(null);
    }
  };

  // Anchor handlers — start/end a connection
  const handleAnchorDown = (noteId: string, side: AnchorSide, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setPendingLink({ fromId: noteId, fromSide: side, cursor: clientToWorld(e.clientX, e.clientY) });
  };
  const handleAnchorUp = (noteId: string, side: AnchorSide, e: React.PointerEvent) => {
    const p = pendingLinkRef.current;
    if (!p) return;
    if (p.fromId !== noteId) {
      addConnection(p.fromId, noteId, p.fromSide, side);
    }
    setPendingLink(null);
  };

  // Compute note rect in world coords from refs (fallback to position + defaults)
  const getNoteRect = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return null;
    const el = noteRefs.current.get(id);
    const w = el?.offsetWidth  ?? NOTE_WIDTH;
    const h = el?.offsetHeight ?? NOTE_DEFAULT_HEIGHT;
    return { x: note.position.x, y: note.position.y, w, h };
  };

  const renderConnectionPath = (from: { x: number; y: number }, to: { x: number; y: number }, fromSide: AnchorSide, toSide: AnchorSide) => {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const handleLen = Math.max(40, Math.min(160, dist * 0.4));
    const t1 = tangentForSide(fromSide, handleLen);
    const t2 = tangentForSide(toSide, handleLen);
    const c1 = { x: from.x + t1.x, y: from.y + t1.y };
    const c2 = { x: to.x   + t2.x, y: to.y   + t2.y };
    return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
  };

  const renderConnections = () => {
    return connections.map(conn => {
      const a = getNoteRect(conn.from);
      const b = getNoteRect(conn.to);
      if (!a || !b) return null;
      const aOff = anchorOffset(conn.fromSide, a.w, a.h);
      const bOff = anchorOffset(conn.toSide,   b.w, b.h);
      const from = { x: a.x + aOff.x, y: a.y + aOff.y };
      const to   = { x: b.x + bOff.x, y: b.y + bOff.y };
      const d = renderConnectionPath(from, to, conn.fromSide, conn.toSide);
      return (
        <g key={conn.id} className="connection-group">
          <path d={d} stroke="transparent" strokeWidth={14} fill="none" style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onClick={() => removeConnection(conn.id)} />
          <path d={d} stroke="hsl(var(--primary))" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
        </g>
      );
    });
  };

  const renderPendingLink = () => {
    if (!pendingLink) return null;
    const a = getNoteRect(pendingLink.fromId);
    if (!a) return null;
    const aOff = anchorOffset(pendingLink.fromSide, a.w, a.h);
    const from = { x: a.x + aOff.x, y: a.y + aOff.y };
    const to = pendingLink.cursor;
    // Approximate "toSide" toward cursor for a pleasing curve
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const toSide: AnchorSide = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'left' : 'right')
      : (dy > 0 ? 'top'  : 'bottom');
    const d = renderConnectionPath(from, to, pendingLink.fromSide, toSide);
    return (
      <path d={d} stroke="hsl(var(--primary))" strokeWidth={2} fill="none" strokeDasharray="6 4" strokeLinecap="round" opacity={0.8} />
    );
  };

  const setNoteRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) noteRefs.current.set(id, el);
    else    noteRefs.current.delete(id);
  };

  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };
  const zoomIn  = () => setScale(s => Math.min(MAX_SCALE, s * 1.2));
  const zoomOut = () => setScale(s => Math.max(MIN_SCALE, s / 1.2));

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        ref={viewportRef}
        className={`flex-1 relative ${viewMode === 'canvas' ? 'overflow-hidden' : 'overflow-auto'}`}
        onPointerDown={viewMode === 'canvas' ? handleViewportPointerDown : undefined}
        onPointerMove={viewMode === 'canvas' ? handleViewportPointerMove : undefined}
        onPointerUp={viewMode === 'canvas' ? handleViewportPointerUp : undefined}
      >
        {isEmpty ? (
          <div className="empty-state h-full min-h-[60vh]">
            {searchQuery || activeTag ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
                  <PenLine className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">No notes match</h2>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
                  Try a different search query or select a different tag.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                  What do you want to plan?
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
                  Tell the AI in the side chat what you're trying to think through. It'll lay out notes and connections on this canvas — then keep chatting to refine, or drag notes around manually.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={() => onChatOpenChange(true)}
                    className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-medium transition-all hover:bg-primary/90 hover:shadow-md active:scale-95 inline-flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Start with AI chat
                  </button>
                  <button
                    onClick={addNote}
                    className="px-4 py-2 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    Or add a note manually
                  </button>
                </div>
              </>
            )}
          </div>
        ) : viewMode === 'canvas' ? (
          <>
            <div
              ref={worldRef}
              className="absolute top-0 left-0 origin-top-left"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                width: 1,
                height: 1,
              }}
            >
              {/* SVG connection layer — overflow-visible so lines outside the 1x1 anchor render */}
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                style={{ overflow: 'visible', width: 1, height: 1 }}
              >
                <g style={{ pointerEvents: 'auto' }}>
                  {renderConnections()}
                </g>
                {renderPendingLink()}
              </svg>

              {displayNotes.map(note => (
                <Note
                  key={note.id}
                  ref={setNoteRef(note.id)}
                  note={note}
                  scale={scale}
                  onUpdate={(updated) => updateNote({ id: note.id, ...updated })}
                  onDelete={() => deleteNote(note.id)}
                  onMove={(pos) => updateNotePosition(note.id, pos)}
                  onDragStart={() => bringToFront(note.id)}
                  onColorChange={(color: NoteColor) => updateNoteColor(note.id, color)}
                  onTogglePin={() => toggleNotePinned(note.id)}
                  onAddTag={(tag) => addTagToNote(note.id, tag)}
                  onRemoveTag={(tag) => removeTagFromNote(note.id, tag)}
                  onDuplicate={() => duplicateNote(note.id)}
                  onAnchorPointerDown={handleAnchorDown}
                  onAnchorPointerUp={handleAnchorUp}
                />
              ))}
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 flex items-center gap-1 bg-background/90 backdrop-blur border border-border rounded-lg shadow-sm px-1 py-1 z-30">
              <button onClick={zoomOut} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" aria-label="Zoom out"><ZoomOut size={14} /></button>
              <button onClick={resetView} className="px-2 text-xs font-mono text-muted-foreground hover:text-foreground min-w-[44px]" aria-label="Reset zoom">{Math.round(scale * 100)}%</button>
              <button onClick={zoomIn} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" aria-label="Zoom in"><ZoomIn size={14} /></button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={resetView} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" aria-label="Fit view"><Maximize2 size={14} /></button>
            </div>
          </>
        ) : (
          <div className="p-6">
            {sortedPinned.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  📌 Pinned
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedPinned.map((note, i) => (
                    <GridNoteCard
                      key={note.id}
                      note={note}
                      index={i}
                      onUpdate={(updated) => updateNote({ id: note.id, ...updated })}
                      onDelete={() => deleteNote(note.id)}
                      onTogglePin={() => toggleNotePinned(note.id)}
                      onColorChange={(color) => updateNoteColor(note.id, color)}
                    />
                  ))}
                </div>
              </div>
            )}

            {sortedUnpinned.length > 0 && (
              <div>
                {sortedPinned.length > 0 && (
                  <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    All notes
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedUnpinned.map((note, i) => (
                    <GridNoteCard
                      key={note.id}
                      note={note}
                      index={i + sortedPinned.length}
                      onUpdate={(updated) => updateNote({ id: note.id, ...updated })}
                      onDelete={() => deleteNote(note.id)}
                      onTogglePin={() => toggleNotePinned(note.id)}
                      onColorChange={(color) => updateNoteColor(note.id, color)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ChatPanel open={chatOpen} onClose={() => onChatOpenChange(false)} />

      {sidebarOpen && (
        <TagSidebar
          tags={allTags}
          activeTag={activeTag}
          onSelectTag={onTagSelect}
          totalNotes={notes.length}
          onReset={resetToDemo}
          onClose={() => onSidebarOpenChange(false)}
        />
      )}

      <div className={chatOpen ? 'hidden md:contents' : 'contents'}>
        <FloatingActionButton onClick={addNote} />
      </div>
    </div>
  );
};

export default NoteCanvas;
