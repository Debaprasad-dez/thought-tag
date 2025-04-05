
export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  position: {
    x: number;
    y: number;
  };
  isNew?: boolean;
  isPinned: boolean;
}

export type NoteColor = 'yellow' | 'mint' | 'lavender' | 'sky';

export interface ColorOption {
  name: NoteColor;
  value: string;
}

export const NOTE_COLORS: ColorOption[] = [
  { name: 'yellow', value: '#FFF9C4' },
  { name: 'mint', value: '#C8E6C9' },
  { name: 'lavender', value: '#E1BEE7' },
  { name: 'sky', value: '#BBDEFB' },
];
