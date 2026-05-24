
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Moon, Sun, Search, LayoutGrid, Layout, SlidersHorizontal, Tag, X, Sparkles, ArrowLeft, Tags, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortOption, ViewMode } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  noteCount: number;
  tagCount: number;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onOpenAISummary: () => void;
  workflowName: string | null;
  onBackToWorkflows: () => void;
  onToggleChat: () => void;
  chatOpen: boolean;
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  modified: 'Recently modified',
  alpha: 'Alphabetical',
};

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  noteCount,
  tagCount,
  onToggleSidebar,
  sidebarOpen,
  onOpenAISummary,
  workflowName,
  onBackToWorkflows,
  onToggleChat,
  chatOpen,
}) => {
  const inWorkflow = workflowName !== null;
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 glass border-b px-4 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center gap-3">
        {/* Brand — clicking returns to workflow list */}
        <button
          onClick={onBackToWorkflows}
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="Back to workflows"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Tag className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold text-lg text-foreground hidden sm:block tracking-tight">
            ThoughtTag
          </span>
        </button>

        {inWorkflow && (
          <>
            <button
              onClick={onBackToWorkflows}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              aria-label="Back to workflows"
              title="Back to workflows"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Workflows</span>
            </button>
            <span className="text-muted-foreground/40 shrink-0">/</span>
            <span className="font-display font-semibold text-sm text-foreground truncate max-w-[200px]" title={workflowName ?? undefined}>
              {workflowName}
            </span>

            {/* Meta */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground ml-2">
              <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{noteCount} notes</span>
              <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{tagCount} tags</span>
            </div>
          </>
        )}

        {/* Search — only inside a workflow */}
        {inWorkflow && (
          <div className="relative flex-1 max-w-md ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search notes and tags…"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="search-input"
              aria-label="Search notes"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {!inWorkflow && <div className="flex-1" />}

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {inWorkflow && (
            <>
              <button
                onClick={onToggleChat}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium shadow-sm hover:shadow-md active:scale-95 transition-all ${
                  chatOpen
                    ? 'bg-accent text-accent-foreground border border-primary/30'
                    : 'bg-gradient-to-r from-primary to-primary/80 text-white hover:from-primary/90 hover:to-primary/70'
                }`}
                aria-label="Toggle AI chat"
                title="Toggle AI chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                AI chat
              </button>
              <button
                onClick={onToggleChat}
                className="sm:hidden p-2 rounded-lg bg-primary text-white"
                aria-label="Toggle AI chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenAISummary}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Curate plan as markdown"
                title="Curate polished plan as markdown"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Plan
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9 rounded-lg" aria-label="Sort notes">
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
                    <DropdownMenuItem
                      key={opt}
                      onClick={() => onSortChange(opt)}
                      className={sortBy === opt ? 'text-primary font-medium' : ''}
                    >
                      {SORT_LABELS[opt]}
                      {sortBy === opt && <span className="ml-auto text-primary">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex rounded-lg border p-0.5 gap-0.5">
                <button
                  onClick={() => onViewModeChange('canvas')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'canvas' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="Canvas view"
                >
                  <Layout className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className={`w-9 h-9 rounded-lg ${sidebarOpen ? 'bg-accent text-accent-foreground' : ''}`}
                aria-label="Toggle tag sidebar"
                title="Toggle tag sidebar"
              >
                <Tags className="w-4 h-4" />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
