
export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  position: {
    x: number;
    y: number;
  };
  tags: string[];
  isNew?: boolean;
  isPinned: boolean;
  zIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export type NoteColor = 'violet' | 'rose' | 'sky' | 'sage' | 'amber';

export interface ColorOption {
  name: NoteColor;
  value: string;
  label: string;
}

export const NOTE_COLORS: ColorOption[] = [
  { name: 'violet', value: 'var(--note-violet)', label: 'Violet' },
  { name: 'rose',   value: 'var(--note-rose)',   label: 'Rose' },
  { name: 'sky',    value: 'var(--note-sky)',     label: 'Sky' },
  { name: 'sage',   value: 'var(--note-sage)',    label: 'Sage' },
  { name: 'amber',  value: 'var(--note-amber)',   label: 'Amber' },
];

export type SortOption = 'newest' | 'oldest' | 'modified' | 'alpha';
export type ViewMode = 'canvas' | 'grid';
