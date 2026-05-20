
import React from 'react';
import Note from './Note';
import GridNoteCard from './GridNoteCard';
import FloatingActionButton from './FloatingActionButton';
import TagSidebar from './TagSidebar';
import { Note as NoteType, NoteColor, ViewMode, SortOption } from '../types';
import { sortNotes, filterNotes } from '../hooks/useNotes';
import { useNotesContext } from '../context/NotesContext';
import { PenLine } from 'lucide-react';

interface NoteCanvasProps {
  searchQuery: string;
  viewMode: ViewMode;
  sortBy: SortOption;
  sidebarOpen: boolean;
  activeTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

const NoteCanvas: React.FC<NoteCanvasProps> = ({
  searchQuery,
  viewMode,
  sortBy,
  sidebarOpen,
  activeTag,
  onTagSelect,
}) => {
  const {
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
  } = useNotesContext();

  const filteredNotes = filterNotes(notes, searchQuery, activeTag);
  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  const sortedUnpinned = sortNotes(unpinnedNotes, sortBy);
  const sortedPinned = sortNotes(pinnedNotes, sortBy);
  const displayNotes = [...sortedPinned, ...sortedUnpinned];

  const isEmpty = filteredNotes.length === 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Tag sidebar */}
      {sidebarOpen && (
        <TagSidebar
          tags={allTags}
          activeTag={activeTag}
          onSelectTag={onTagSelect}
          totalNotes={notes.length}
          onReset={resetToDemo}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        {isEmpty ? (
          <div className="empty-state h-full min-h-[60vh]">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
              <PenLine className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              {searchQuery || activeTag ? 'No notes match' : 'Start your first thought'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
              {searchQuery || activeTag
                ? 'Try a different search query or select a different tag.'
                : 'Click the + button to create a note. Drag it anywhere. Tag it. Pin it.'}
            </p>
            {!searchQuery && !activeTag && (
              <button
                onClick={addNote}
                className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-medium transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
              >
                Create your first note
              </button>
            )}
          </div>
        ) : viewMode === 'canvas' ? (
          /* Canvas view */
          <div
            className="relative w-full"
            style={{ minHeight: 'calc(100vh - 64px)', minWidth: '100%' }}
          >
            {displayNotes.map(note => (
              <Note
                key={note.id}
                note={note}
                onUpdate={(updated) => updateNote({ id: note.id, ...updated })}
                onDelete={() => deleteNote(note.id)}
                onMove={(pos) => updateNotePosition(note.id, pos)}
                onDragStart={() => bringToFront(note.id)}
                onColorChange={(color: NoteColor) => updateNoteColor(note.id, color)}
                onTogglePin={() => toggleNotePinned(note.id)}
                onAddTag={(tag) => addTagToNote(note.id, tag)}
                onRemoveTag={(tag) => removeTagFromNote(note.id, tag)}
                onDuplicate={() => duplicateNote(note.id)}
              />
            ))}
          </div>
        ) : (
          /* Grid view */
          <div className="p-6">
            {/* Pinned section */}
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

            {/* All notes section */}
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

      <FloatingActionButton onClick={addNote} />
    </div>
  );
};

export default NoteCanvas;
