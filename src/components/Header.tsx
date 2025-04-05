
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex justify-between items-center p-4 border-b">
      <div className="flex items-center gap-2">
        <StickyNote className="h-6 w-6" />
        <h1 className="text-xl font-bold">ThoughtTag</h1>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full w-9 h-9"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </header>
  );
};

export default Header;
