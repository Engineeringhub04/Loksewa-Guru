import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Note } from '../../../types';
import { PlusCircleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import Modal from '../../../components/Modal';
import { NOTE_CATEGORIES } from '../../../constants';
import { useToast } from '../../../contexts/ToastContext';

type NoteCategoryKey = keyof typeof NOTE_CATEGORIES;

const NoteFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Note, 'id' | 'createdAt'>) => void;
    entryToEdit: Note | null;
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, entryToEdit, isSaving }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [category, setCategory] = useState<Note['category']>('gk');

    useEffect(() => {
        if (entryToEdit) {
            setTitle(entryToEdit.title);
            setDate(entryToEdit.date);
            setFileUrl(entryToEdit.fileUrl);
            setCategory(entryToEdit.category);
        } else {
            setTitle('');
            setDate(new Date().toISOString().split('T')[0]);
            setFileUrl('');
            setCategory('gk');
        }
    }, [entryToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ title, date, fileUrl, category });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={entryToEdit ? 'Edit Note' : 'Add New Note'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="w-full form-input mt-1" required disabled={isSaving} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full form-input mt-1" required disabled={isSaving} />
                    </div>
                     <div>
                        <label className="text-sm font-medium">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value as Note['category'])} className="w-full form-input mt-1" required disabled={isSaving}>
                            {(Object.keys(NOTE_CATEGORIES) as NoteCategoryKey[]).filter(k => k !== 'all').map(key => (
                                <option key={key} value={key}>{NOTE_CATEGORIES[key]}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium">File URL</label>
                    <input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://example.com/file.pdf" className="w-full form-input mt-1" required disabled={isSaving} />
                </div>
                <div className="flex justify-end pt-4 border-t dark:border-gray-600 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center disabled:bg-purple-400" disabled={isSaving}>
                        {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const AdminNotesManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<Note | null>(null);
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Note | null>(null);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined
                } as Note
            });
            setNotes(list);
        } catch (error) {
            console.error("Error fetching notes:", error);
            showToast("Failed to load notes.", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleSave = async (data: Omit<Note, 'id' | 'createdAt'>) => {
        setIsSaving(true);
        try {
            if (entryToEdit) {
                const docRef = doc(db, "notes", entryToEdit.id);
                await updateDoc(docRef, data);
                showToast("Note updated successfully.");
            } else {
                await addDoc(collection(db, "notes"), {
                    ...data,
                    createdAt: serverTimestamp()
                });
                showToast("Note added successfully.");
            }
            fetchNotes();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving note:", error);
            showToast("Failed to save note.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const executeDelete = async () => {
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "notes", confirmDelete.id));
            showToast("Note deleted successfully.");
            fetchNotes();
        } catch (error) {
            console.error("Error deleting note:", error);
            showToast("Failed to delete note.", "error");
        } finally {
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return <div className="p-6">Loading notes...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to delete "{confirmDelete.title}"?</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}
            <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Notes</h1>
                <button onClick={() => { setEntryToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg">
                    <PlusCircleIcon className="h-5 w-5" /> Add New Note
                </button>
            </header>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Title</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {notes.map(entry => (
                            <tr key={entry.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">{entry.title}</th>
                                <td className="px-6 py-4 capitalize">{entry.category}</td>
                                <td className="px-6 py-4">{entry.date}</td>
                                <td className="px-6 py-4 flex items-center gap-4">
                                    <button onClick={() => { setEntryToEdit(entry); setIsModalOpen(true); }} className="text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => setConfirmDelete(entry)} className="text-red-600"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <NoteFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                entryToEdit={entryToEdit}
                isSaving={isSaving}
            />
             <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminNotesManagementPage;