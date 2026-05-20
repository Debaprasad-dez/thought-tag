
import React, { useState } from 'react';
import Header from '../components/Header';
import NoteCanvas from '../components/NoteCanvas';
import { ThemeProvider } from '../context/ThemeContext';
import { NotesProvider, useNotesContext } from '../context/NotesContext';
import { ViewMode, SortOption } from '../types';

const IndexInner: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const { notes, allTags } = useNotesContext();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortChange={setSortBy}
        noteCount={notes.length}
        tagCount={allTags.length}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <NoteCanvas
          searchQuery={searchQuery}
          viewMode={viewMode}
          sortBy={sortBy}
          sidebarOpen={sidebarOpen}
          activeTag={activeTag}
          onTagSelect={setActiveTag}
        />
      </div>
    </div>
  );
};

const Index: React.FC = () => (
  <ThemeProvider>
    <NotesProvider>
      <IndexInner />
    </NotesProvider>
  </ThemeProvider>
);

export default Index;
