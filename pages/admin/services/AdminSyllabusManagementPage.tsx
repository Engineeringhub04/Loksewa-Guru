import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { SyllabusEntry } from '../../../types';
import { PlusCircleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import Modal from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';

const SyllabusFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<SyllabusEntry, 'id' | 'createdAt'>) => void;
    entryToEdit: SyllabusEntry | null;
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, entryToEdit, isSaving }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [source, setSource] = useState('');
    const [fileUrl, setFileUrl] = useState('');

    useEffect(() => {
        if (entryToEdit) {
            setTitle(entryToEdit.title);
            setDate(entryToEdit.date);
            setSource(entryToEdit.source);
            setFileUrl(entryToEdit.fileUrl);
        } else {
            setTitle('');
            setDate(new Date().toISOString().split('T')[0]);
            setSource('');
            setFileUrl('');
        }
    }, [entryToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ title, date, source, fileUrl });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={entryToEdit ? 'Edit Syllabus' : 'Add New Syllabus'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="w-full form-input mt-1" required disabled={isSaving} />
                </div>
                <div>
                    <label className="text-sm font-medium">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full form-input mt-1" required disabled={isSaving} />
                </div>
                <div>
                    <label className="text-sm font-medium">Source</label>
                    <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g., Public Service Commission" className="w-full form-input mt-1" required disabled={isSaving} />
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

const AdminSyllabusManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [syllabuses, setSyllabuses] = useState<SyllabusEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<SyllabusEntry | null>(null);
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<SyllabusEntry | null>(null);

    const fetchSyllabuses = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "syllabuses"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined
                } as SyllabusEntry
            });
            setSyllabuses(list);
        } catch (error) {
            console.error("Error fetching syllabuses:", error);
            showToast("Failed to load syllabuses.", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchSyllabuses();
    }, [fetchSyllabuses]);

    const handleSave = async (data: Omit<SyllabusEntry, 'id' | 'createdAt'>) => {
        setIsSaving(true);
        try {
            if (entryToEdit) {
                // Update existing
                const docRef = doc(db, "syllabuses", entryToEdit.id);
                await updateDoc(docRef, data);
                showToast("Syllabus updated successfully.");
            } else {
                // Add new
                await addDoc(collection(db, "syllabuses"), {
                    ...data,
                    createdAt: serverTimestamp()
                });
                showToast("Syllabus added successfully.");
            }
            fetchSyllabuses();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving syllabus:", error);
            showToast("Failed to save syllabus.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, "syllabuses", confirmDelete.id));
            showToast("Syllabus deleted successfully.");
            fetchSyllabuses();
        } catch (error) {
            console.error("Error deleting syllabus:", error);
            showToast("Failed to delete syllabus.", "error");
        } finally {
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return <div className="p-6">Loading syllabus content...</div>;
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
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Syllabus</h1>
                <button onClick={() => { setEntryToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg">
                    <PlusCircleIcon className="h-5 w-5" /> Add New Syllabus
                </button>
            </header>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Title</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Source</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {syllabuses.map(entry => (
                            <tr key={entry.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">{entry.title}</th>
                                <td className="px-6 py-4">{entry.date}</td>
                                <td className="px-6 py-4">{entry.source}</td>
                                <td className="px-6 py-4 flex items-center gap-4">
                                    <button onClick={() => { setEntryToEdit(entry); setIsModalOpen(true); }} className="text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => setConfirmDelete(entry)} className="text-red-600"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SyllabusFormModal
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

export default AdminSyllabusManagementPage;