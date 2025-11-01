import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ICON_KEYS } from '../../constants';
import type { PracticeCourse } from '../../types';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../../components/ConfirmationModal';

const AdminPracticeCourseEditorPage: React.FC = () => {
    const { courseKey: paramKey } = useParams<{ courseKey: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isEditMode = !!paramKey;

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<PracticeCourse | null>(null);

    // Form fields
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [iconKey, setIconKey] = useState(ICON_KEYS[0]);
    const [order, setOrder] = useState(99);

    useEffect(() => {
        const fetchCourseData = async () => {
            if (isEditMode && paramKey) {
                try {
                    const docRef = doc(db, 'practiceCourses', paramKey);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const course = { id: docSnap.id, ...docSnap.data() } as PracticeCourse;
                        setName(course.name);
                        setKey(course.key);
                        setIconKey(course.iconKey);
                        setOrder(course.order);
                    } else {
                        showToast('Course not found.', 'error');
                        navigate('/admin/questions-practice');
                    }
                } catch (error) {
                    showToast('Failed to load course.', 'error');
                    navigate('/admin/questions-practice');
                }
            }
            setIsLoading(false);
        };
        fetchCourseData();
    }, [isEditMode, paramKey, navigate, showToast]);

    useEffect(() => {
        if (!isEditMode) {
            setKey(name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        }
    }, [name, isEditMode]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key || !name) {
            showToast("Course Name and Key are required.", "error");
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave: Omit<PracticeCourse, 'id'> = { key, name, iconKey, order };
            if (isEditMode) {
                await updateDoc(doc(db, "practiceCourses", paramKey!), dataToSave);
            } else {
                await setDoc(doc(db, "practiceCourses", key), dataToSave);
            }
            showToast("Course saved successfully.");
            navigate('/admin/questions-practice');
        } catch (error) {
            console.error("Error saving course:", error);
            showToast(`Failed to save course: ${(error as Error).message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, "practiceCourses", confirmDelete.id));
            showToast("Course deleted successfully.");
            navigate('/admin/questions-practice');
        } catch (error) {
            showToast("Failed to delete course.", "error");
            console.error("Error deleting course:", error);
        } finally {
            setConfirmDelete(null);
        }
    };
    
    if (isLoading) {
        return <div className="p-6">Loading course editor...</div>
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            {confirmDelete && <ConfirmationModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={executeDelete}
                title="Confirm Deletion"
                message={<>Are you sure you want to delete "{confirmDelete.name}"?<br/><br/><span className="font-semibold text-yellow-600 dark:text-yellow-400">This will NOT delete its associated question sets.</span></>}
                confirmText="Delete"
            />}

            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate('/admin/questions-practice')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Course' : 'Add New Course'}</h1>
            </header>

            <form onSubmit={handleSave} className="space-y-4 max-w-2xl mx-auto">
                <div>
                    <label className="text-sm font-medium">Course Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., General Knowledge" className="w-full form-input mt-1" required />
                </div>
                <div>
                    <label className="text-sm font-medium">Unique Key</label>
                    <input value={key} onChange={e => setKey(e.target.value)} placeholder="auto-generated-from-name" className="w-full form-input mt-1" required disabled={isEditMode} />
                    {!isEditMode && <p className="text-xs text-gray-500 mt-1">This is a unique ID. It will be auto-generated from the name and cannot be changed later.</p>}
                </div>
                <div>
                    <label className="text-sm font-medium">Icon</label>
                    <select value={iconKey} onChange={e => setIconKey(e.target.value)} className="w-full form-input mt-1">
                        {ICON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium">Display Order</label>
                    <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} placeholder="e.g., 1, 2, 3..." className="w-full form-input mt-1" required />
                </div>

                <div className="flex justify-end pt-4 border-t dark:border-gray-600">
                    <button type="submit" className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Course'}
                    </button>
                </div>
            </form>

             {isEditMode && paramKey && (
                <div className="mt-12 pt-6 border-t border-red-300 dark:border-red-700/50 max-w-2xl mx-auto">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Deleting a course is permanent.</p>
                    <button
                        type="button"
                        onClick={() => setConfirmDelete({ id: paramKey, key: paramKey, name, iconKey, order })}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
                    >
                        <TrashIcon className="h-5 w-5" />
                        Delete this Course
                    </button>
                </div>
            )}
             <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminPracticeCourseEditorPage;