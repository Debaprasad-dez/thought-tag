
import React from 'react';
import { NOTE_COLORS, NoteColor } from '../types';

interface ColorPickerProps {
  selectedColor: NoteColor;
  onColorChange: (color: NoteColor) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorChange }) => {
  return (
    <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 p-1 rounded shadow-md">
      {NOTE_COLORS.map((color) => (
        <button
          key={color.name}
          className={`color-dot ${selectedColor === color.name ? 'ring-2 ring-offset-2 ring-gray-500' : ''}`}
          style={{ backgroundColor: color.value }}
          onClick={() => onColorChange(color.name)}
          aria-label={`Select ${color.name} color`}
        />
      ))}
    </div>
  );
};

export default ColorPicker;
