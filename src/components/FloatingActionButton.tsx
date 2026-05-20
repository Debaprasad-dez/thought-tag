
import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fab"
      aria-label="Create new note"
    >
      <Plus className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
};

export default FloatingActionButton;
