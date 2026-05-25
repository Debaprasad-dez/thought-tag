
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import NoteCanvas from '../components/NoteCanvas';
import AISummaryDialog from '../components/AISummaryDialog';
import WorkflowList from '../components/WorkflowList';
import { ThemeProvider } from '../context/ThemeContext';
import { NotesProvider, useNotesContext } from '../context/NotesContext';
import { ViewMode, SortOption } from '../types';

const IndexInner: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { activeWorkflow, notes, allTags, closeWorkflow } = useNotesContext();

  const inWorkflow = activeWorkflow !== null;

  // Auto-open chat when entering a workflow that has no notes yet
  useEffect(() => {
    if (activeWorkflow && activeWorkflow.notes.length === 0) {
      setChatOpen(true);
    }
  }, [activeWorkflow?.id]);

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
        onOpenAISummary={() => setAiOpen(true)}
        workflowName={activeWorkflow?.name ?? null}
        onBackToWorkflows={() => { closeWorkflow(); setActiveTag(null); setSearchQuery(''); setChatOpen(false); }}
        onToggleChat={() => setChatOpen(v => !v)}
        chatOpen={chatOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        {inWorkflow ? (
          <NoteCanvas
            searchQuery={searchQuery}
            viewMode={viewMode}
            sortBy={sortBy}
            sidebarOpen={sidebarOpen}
            onSidebarOpenChange={setSidebarOpen}
            activeTag={activeTag}
            onTagSelect={setActiveTag}
            chatOpen={chatOpen}
            onChatOpenChange={setChatOpen}
          />
        ) : (
          <WorkflowList />
        )}
      </div>
      {inWorkflow && <AISummaryDialog open={aiOpen} onOpenChange={setAiOpen} />}
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
