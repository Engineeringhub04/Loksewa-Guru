

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, MagnifyingGlassIcon, CalendarDaysIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { NOTE_CATEGORIES, NotesIcon } from '../constants';
import type { Note } from '../types';
import PullToRefresh from '../components/PullToRefresh';

const NoteCard: React.FC<{ note: Note }> = ({ note }) => {
    const categoryColors: { [key: string]: string } = {
        gk: 'border-blue-500',
        admin: 'border-green-500',
        law: 'border-purple-500',
        engineering: 'border-yellow-500',
    };
    const borderColor = categoryColors[note.category] || 'border-gray-500';

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-center justify-between gap-4 animate-fade-in-scale">
            <div className={`w-1.5 h-full rounded-l-lg ${borderColor.replace('border-', 'bg-')}`}></div>
            <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{note.title}</h3>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <CalendarDaysIcon className="h-4 w-4 mr-1.5" />
                    <span>Published: {note.date}</span>
                </div>
            </div>
             <a 
                href={note.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-shrink-0 p-3 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label={`Download note: ${note.title}`}
            >
                <DocumentArrowDownIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </a>
        </div>
    );
};

const NotesPage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const notesList = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt ? (docData.createdAt as Timestamp).toDate() : undefined,
                } as Note
            });
            setAllNotes(notesList);
        } catch (error) {
            console.error("Error fetching notes:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const filteredNotes = useMemo(() => {
        return allNotes.filter(note => {
            const matchesCategory = activeCategory === 'all' || note.category === activeCategory;
            const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [activeCategory, searchTerm, allNotes]);

    return (
        <PullToRefresh onRefresh={fetchNotes} className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </Link>
                 <div className="flex-1 text-center">
                     <div className="flex items-center justify-center gap-2">
                        <NotesIcon className="h-6 w-6 text-yellow-500" />
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Study Notes</h1>
                    </div>
                 </div>
                 <div className="w-10"></div>
            </header>

            <main className="flex-1 p-4 pb-24">
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                </div>

                <div className="flex space-x-2 overflow-x-auto pb-4 -mx-4 px-4 mb-4">
                    {Object.entries(NOTE_CATEGORIES).map(([key, name]) => (
                        <button
                            key={key}
                            onClick={() => setActiveCategory(key)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors duration-200 ${
                                activeCategory === key 
                                ? 'bg-yellow-500 text-white shadow' 
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
                
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading notes...</div>
                ) : (
                    <div className="space-y-4">
                        {filteredNotes.length > 0 ? (
                            filteredNotes.map(note => <NoteCard key={note.id} note={note} />)
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500">No notes found for this category.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

        </PullToRefresh>
    );
};

export default NotesPage;