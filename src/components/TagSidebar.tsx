
import React from 'react';
import { Tag, Hash, RotateCcw } from 'lucide-react';

interface TagSidebarProps {
  tags: { tag: string; count: number }[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  totalNotes: number;
  onReset: () => void;
}

const TagSidebar: React.FC<TagSidebarProps> = ({
  tags,
  activeTag,
  onSelectTag,
  totalNotes,
  onReset,
}) => {
  return (
    <aside className="w-52 shrink-0 flex flex-col gap-1 py-4 px-2 border-r bg-background/60">
      <div className="px-2 mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Tags</p>
      </div>

      {/* All notes */}
      <button
        className={`sidebar-tag ${!activeTag ? 'active' : ''}`}
        onClick={() => onSelectTag(null)}
      >
        <span className="flex items-center gap-2">
          <Tag size={13} />
          All notes
        </span>
        <span className="text-xs font-mono text-muted-foreground">{totalNotes}</span>
      </button>

      {tags.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground italic mt-2">No tags yet</p>
      ) : (
        tags.map(({ tag, count }) => (
          <button
            key={tag}
            className={`sidebar-tag ${activeTag === tag ? 'active' : ''}`}
            onClick={() => onSelectTag(activeTag === tag ? null : tag)}
          >
            <span className="flex items-center gap-2 truncate">
              <Hash size={12} className="shrink-0" />
              <span className="truncate">{tag}</span>
            </span>
            <span className="text-xs font-mono text-muted-foreground shrink-0">{count}</span>
          </button>
        ))
      )}

      <div className="mt-auto pt-4 border-t px-1">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted w-full transition-all"
        >
          <RotateCcw size={12} />
          Reset to demo
        </button>
      </div>
    </aside>
  );
};

export default TagSidebar;
