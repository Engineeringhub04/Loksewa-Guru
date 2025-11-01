import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TrashIcon,
  CheckIcon,
  PhotoIcon,
  PlusIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/solid';
import type { LocalNote } from '../types';

// --- ICONS ---
const BoldIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.02c2.1 0 3.71-1.63 3.71-3.66 0-1.57-.86-2.93-2.13-3.55zM9 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H9v-3zm3.5 9H9v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"></path></svg>;
const ItalicIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"></path></svg>;
const UnderlineIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"></path></svg>;
const TextStyleIcon = () => <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"></path></svg>; // Placeholder, better icon needed
const CheckListIcon = () => <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path></svg>;


const COLORS = ['#000000', '#FFFFFF', '#F28B82', '#FBBC04', '#FFF475', '#CCFF90', '#A7FFEB', '#CBF0F8', '#AECBFA', '#D7AEFB', '#FDCFE8', '#E6C9A8', '#E8EAED'];

const NoteEditorPage: React.FC = () => {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const isEditing = !!noteId;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [noteStyle, setNoteStyle] = useState<LocalNote['style']>({});
    const editorRef = useRef<HTMLDivElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);

    const [activePanel, setActivePanel] = useState<'style' | 'theme' | null>(null);
    const [activeStyles, setActiveStyles] = useState({ bold: false, italic: false, underline: false, color: '#FFFFFF' });
    
    // --- Data Loading ---
    useEffect(() => {
        if (isEditing) {
            try {
                const savedNotes: LocalNote[] = JSON.parse(localStorage.getItem('loksewa-local-notes') || '[]');
                const noteToEdit = savedNotes.find(note => note.id === noteId);
                if (noteToEdit) {
                    setTitle(noteToEdit.title);
                    setContent(noteToEdit.content);
                    setNoteStyle(noteToEdit.style || { backgroundColor: '#000000' });
                } else {
                    navigate('/keep-notes');
                }
            } catch (error) {
                navigate('/keep-notes');
            }
        } else {
            setNoteStyle({ backgroundColor: '#000000' });
        }
    }, [isEditing, noteId, navigate]);

    useEffect(() => {
        if (editorRef.current && content) {
            editorRef.current.innerHTML = content;
        }
    }, [content]);

    // --- Styling Logic ---
    const updateActiveStyles = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !editorRef.current?.contains(selection.anchorNode)) return;

        const isBold = document.queryCommandState('bold');
        const isItalic = document.queryCommandState('italic');
        const isUnderline = document.queryCommandState('underline');
        const colorValue = document.queryCommandValue('foreColor');

        const rgbToHex = (rgb: string) => {
            const result = /rgb\((\d+), (\d+), (\d+)\)/.exec(rgb);
            if (!result) return '#ffffff';
            return "#" +
              ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
              ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
              ("0" + parseInt(result[3], 10).toString(16)).slice(-2);
        };
        const hexColor = rgbToHex(colorValue);
        
        setActiveStyles({ bold: isBold, italic: isItalic, underline: isUnderline, color: hexColor });
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', updateActiveStyles);
        return () => document.removeEventListener('selectionchange', updateActiveStyles);
    }, [updateActiveStyles]);

    const handleStyleCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        updateActiveStyles();
    };

    const handleChecklist = () => {
        document.execCommand('insertUnorderedList');
        // Add a specific class to the new list for styling
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            let parent = selection.getRangeAt(0).commonAncestorContainer;
            if (parent.nodeType !== 1) parent = parent.parentNode!;
            while (parent && parent.nodeName !== 'UL' && parent.nodeName !== 'BODY') {
                parent = parent.parentNode!;
            }
            if (parent && parent.nodeName === 'UL') {
                (parent as HTMLElement).classList.add('checklist');
            }
        }
        editorRef.current?.focus();
    };

    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.nodeName === 'LI' && (target.parentElement?.classList.contains('checklist'))) {
            target.classList.toggle('checked');
        }
    };

    // --- Data Saving/Deleting ---
    const handleSave = () => {
        const currentContent = editorRef.current?.innerHTML || '';
        if (!title.trim() && !(editorRef.current?.textContent || '').trim()) {
            navigate('/keep-notes');
            return;
        }

        try {
            const savedNotes: LocalNote[] = JSON.parse(localStorage.getItem('loksewa-local-notes') || '[]');
            if (isEditing) {
                const updatedNotes = savedNotes.map(note => note.id === noteId ? { ...note, title, content: currentContent, lastModified: Date.now(), style: noteStyle } : note);
                localStorage.setItem('loksewa-local-notes', JSON.stringify(updatedNotes));
            } else {
                const newNote: LocalNote = { id: Date.now().toString(), title: title.trim() || 'Untitled Note', content: currentContent, lastModified: Date.now(), style: noteStyle };
                localStorage.setItem('loksewa-local-notes', JSON.stringify([newNote, ...savedNotes]));
            }
            navigate('/keep-notes');
        } catch (error) {
            alert('Could not save your note.');
        }
    };

    const handleDelete = () => {
        if (!isEditing || !window.confirm('Are you sure you want to delete this note?')) return;
        try {
            const savedNotes: LocalNote[] = JSON.parse(localStorage.getItem('loksewa-local-notes') || '[]');
            const updatedNotes = savedNotes.filter(note => note.id !== noteId);
            localStorage.setItem('loksewa-local-notes', JSON.stringify(updatedNotes));
            navigate('/keep-notes');
        } catch (error) {
            alert('Could not delete your note.');
        }
    };

    // --- Background/Theme Logic ---
    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNoteStyle(prev => ({ ...prev, backgroundImage: `url(${reader.result})`, backgroundSize: 'cover' }));
            };
            reader.readAsDataURL(file);
        }
    };

    const containerStyle: React.CSSProperties = {
        backgroundColor: noteStyle?.backgroundColor || '#000000',
        backgroundImage: noteStyle?.backgroundImage || 'none',
        backgroundSize: (noteStyle?.backgroundSize as any) || 'auto',
        backgroundPosition: 'center',
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white max-w-md mx-auto animate-slide-in-up" style={containerStyle}>
            <header className="flex items-center justify-between p-4 flex-shrink-0 bg-black/30 backdrop-blur-sm">
                <button onClick={() => navigate('/keep-notes')} className="p-2" aria-label="Back to notes">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-4">
                    {isEditing && <button onClick={handleDelete} className="p-2"><TrashIcon className="h-6 w-6 text-red-500" /></button>}
                    <button onClick={handleSave} className="p-2"><CheckIcon className="h-6 w-6 text-blue-400" /></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full bg-transparent text-2xl font-bold focus:outline-none mb-4"
                />
                <div
                    ref={editorRef}
                    contentEditable
                    onClick={handleEditorClick}
                    onKeyUp={updateActiveStyles}
                    onMouseUp={updateActiveStyles}
                    className="w-full flex-1 bg-transparent text-lg focus:outline-none resize-none editor-content"
                    suppressContentEditableWarning={true}
                />
            </main>

            {/* --- PANELS --- */}
            <div className="sticky bottom-16 w-full z-20">
                {activePanel === 'style' && (
                    <div className="p-2 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg mx-4 animate-fade-in-scale">
                         <div className="flex items-center gap-2">
                            <button onClick={() => handleStyleCommand('bold')} className={`p-2 rounded ${activeStyles.bold ? 'bg-blue-500' : 'hover:bg-gray-600'}`}><BoldIcon /></button>
                            <button onClick={() => handleStyleCommand('italic')} className={`p-2 rounded ${activeStyles.italic ? 'bg-blue-500' : 'hover:bg-gray-600'}`}><ItalicIcon /></button>
                            <button onClick={() => handleStyleCommand('underline')} className={`p-2 rounded ${activeStyles.underline ? 'bg-blue-500' : 'hover:bg-gray-600'}`}><UnderlineIcon /></button>
                            <div className="h-6 w-px bg-gray-500 mx-1"></div>
                            {COLORS.slice(1,7).map(color => (
                                <button key={color} onClick={() => handleStyleCommand('foreColor', color)} className={`w-6 h-6 rounded-full border-2 ${activeStyles.color.toLowerCase() === color.toLowerCase() ? 'border-blue-400' : 'border-transparent'}`} style={{ backgroundColor: color }}></button>
                            ))}
                        </div>
                    </div>
                )}
                {activePanel === 'theme' && (
                    <div className="p-2 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg mx-4 animate-fade-in-scale">
                        <div className="flex items-center gap-2">
                             <button onClick={() => backgroundInputRef.current?.click()} className="p-2 hover:bg-gray-600 rounded-full"><PhotoIcon /></button>
                             <input type="file" accept="image/*" ref={backgroundInputRef} onChange={handleBackgroundUpload} className="hidden" />
                             <div className="h-6 w-px bg-gray-500 mx-1"></div>
                             {COLORS.map(color => (
                                <button key={color} onClick={() => setNoteStyle(prev => ({ ...prev, backgroundImage: 'none', backgroundColor: color }))} className={`w-6 h-6 rounded-full border-2 ${noteStyle.backgroundColor?.toLowerCase() === color.toLowerCase() ? 'border-blue-400' : 'border-gray-500'}`} style={{ backgroundColor: color }}></button>
                             ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- BOTTOM TOOLBAR --- */}
            <footer className="sticky bottom-0 flex items-center justify-around p-2 bg-black/50 backdrop-blur-sm border-t border-gray-700">
                <button onClick={() => setActivePanel(p => p === 'style' ? null : 'style')} className="p-2" aria-label="Text Formatting">
                    <TextStyleIcon />
                </button>
                <button onClick={handleChecklist} className="p-2" aria-label="Add Checklist">
                    <CheckListIcon />
                </button>
                <button onClick={() => setActivePanel(p => p === 'theme' ? null : 'theme')} className="p-2" aria-label="Change Theme">
                    <PaintBrushIcon className="h-6 w-6" />
                </button>
            </footer>
             <style>{`
                .editor-content ul.checklist { list-style: none; padding-left: 0; }
                .editor-content ul.checklist > li { display: flex; align-items: flex-start; margin-left: 0; padding-left: 0; }
                .editor-content ul.checklist > li::before { content: '☐'; font-size: 1.2em; margin-right: 0.75em; cursor: pointer; }
                .editor-content ul.checklist > li.checked { text-decoration: line-through; color: #9ca3af; }
                .editor-content ul.checklist > li.checked::before { content: '☑'; }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
                @keyframes fade-in-scale {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default NoteEditorPage;