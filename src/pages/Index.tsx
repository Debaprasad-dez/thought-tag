
import React from 'react';
import Header from '../components/Header';
import NoteCanvas from '../components/NoteCanvas';
import { ThemeProvider } from '../context/ThemeContext';

const Index: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <NoteCanvas />
      </div>
    </ThemeProvider>
  );
};

export default Index;
