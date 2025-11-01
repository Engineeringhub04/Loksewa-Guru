import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ChevronDownIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/solid';
import type { LocalNote } from '../types';
import KeepBottomNav from '../components/KeepBottomNav';


// --- Main Page Component ---

const KeepNotesPage: React.FC = () => {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('loksewa-local-notes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Failed to load notes from localStorage', error);
    }
  }, []);

  const handleOpenEditor = (note: LocalNote | null = null) => {
    if (note) {
      navigate(`/keep-notes/edit/${note.id}`);
    } else {
      navigate('/keep-notes/new');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black pb-20 text-white">
      <main className="flex-1 p-4 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white">All notes</h1>
            <ChevronDownIcon className="h-6 w-6 text-white" />
          </div>
          <button className="p-2 text-white">
            <Squares2X2Icon className="h-6 w-6" />
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search notes"
            className="w-full bg-gray-800 border-gray-700 rounded-full py-3 pl-11 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-gray-400">
              Your notes will appear here
            </h3>
            <p className="text-gray-500">Tap the '+' button to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => handleOpenEditor(note)}
                className="w-full text-left bg-gray-800 p-4 rounded-xl space-y-1 transition-colors hover:bg-gray-700"
              >
                <h3 className="font-bold text-white truncate">{note.title}</h3>
                <p className="text-sm text-gray-400">
                  {new Date(note.lastModified).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                  })}{' '}
                  |{' '}
                  {note.content.substring(0, 35).trim()}
                  {note.content.length > 35 ? '...' : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => handleOpenEditor(null)}
        className="fixed bottom-20 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-transform hover:scale-110 z-20"
        aria-label="Add new note"
      >
        <PlusIcon className="h-8 w-8" />
      </button>

      <KeepBottomNav activeTab="notes" />
    </div>
  );
};

export default KeepNotesPage;