
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ICONS_MAP } from '../../constants';
import type { PracticeCourse } from '../../types';
import { PlusCircleIcon, TrashIcon, PencilIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';

const AdminPracticeManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<PracticeCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [confirmDelete, setConfirmDelete] = useState<PracticeCourse | null>(null);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "practiceCourses"), orderBy("order", "asc"));
            const snapshot = await getDocs(q);
            setCourses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PracticeCourse)));
        } catch (error) {
            console.error("Error fetching courses:", error);
            showToast(`Failed to load courses: ${(error as Error).message}`, "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, "practiceCourses", confirmDelete.id));
            showToast("Course deleted successfully.");
            fetchCourses();
        } catch (error) {
            showToast("Failed to delete course.", "error");
            console.error("Error deleting course:", error);
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            {confirmDelete && <ConfirmationModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={executeDelete}
                title="Confirm Deletion"
                message={<>Are you sure you want to delete the course "{confirmDelete.name}"?<br/><br/><span className="font-semibold text-yellow-600 dark:text-yellow-400">This will NOT delete its associated question sets, which may become orphaned.</span></>}
                confirmText="Delete"
            />}
            <header className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <ClipboardDocumentCheckIcon className="h-6 w-6"/>
                        Manage Practice Courses
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Add, edit, or remove courses for the "Questions Practice" feature.</p>
                </div>
                <button onClick={() => navigate('/admin/questions-practice/courses/new')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">
                    <PlusCircleIcon className="h-5 w-5"/> Add Course
                </button>
            </header>
            
            <div className="space-y-3">
                {loading ? <p>Loading...</p> : courses.map(course => {
                    const Icon = ICONS_MAP[course.iconKey];
                    return (
                        <div key={course.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                {Icon && <Icon className="h-6 w-6 text-indigo-500" />}
                                <div>
                                    <p className="font-semibold">{course.name}</p>
                                    <p className="text-xs text-gray-500">Order: {course.order}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => navigate(`/admin/questions-practice/${course.key}`)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">Manage Sets</button>
                                <button onClick={() => navigate(`/admin/questions-practice/courses/edit/${course.key}`)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit Course"><PencilIcon className="h-5 w-5"/></button>
                                <button onClick={() => setConfirmDelete(course)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete Course"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    )
                })}
                 {courses.length === 0 && !loading && <p className="text-center py-8 text-gray-500">No courses created yet.</p>}
            </div>
            
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminPracticeManagementPage;
