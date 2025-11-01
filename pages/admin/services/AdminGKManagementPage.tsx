import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { collection, getDocs, query, where, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { QuizDocument } from '../../../types';
import { TrashIcon, PencilIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../../contexts/ToastContext';

const AdminGKManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<QuizDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    const MAIN_CAT_KEY = 'general'; // Assumption: GK quizzes belong to a 'general' main category
    const SUB_CAT_KEY = 'gk';

    const fetchQuizzes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = query(
                collection(db, 'quizzes'),
                where('subCategoryKey', '==', SUB_CAT_KEY)
            );
            const querySnapshot = await getDocs(q);
            const quizList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
                } as QuizDocument;
            });

            // Sort client-side to avoid needing a composite index
            quizList.sort((a, b) => {
                const dateA = a.createdAt?.getTime() || 0;
                const dateB = b.createdAt?.getTime() || 0;
                return dateB - dateA;
            });

            setQuizzes(quizList);
        } catch (err) {
            console.error("Error fetching GK quizzes:", err);
            setError("Failed to load quiz history. This may require a database index to be created.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

    const handleDeleteQuiz = async (id: string, title: string) => {
        if (!window.confirm(`Are you sure you want to delete the quiz "${title}"?`)) return;
        try {
            await deleteDoc(doc(db, "quizzes", id));
            showToast(`Quiz "${title}" deleted.`);
            setQuizzes(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            console.error("Error deleting quiz: ", error);
            showToast("An error occurred while deleting the quiz.", 'error');
        }
    };

    const handleEditQuiz = (quizId: string) => {
        navigate(`/admin/quizzes/edit/${quizId}`);
    };

    const handleCreateNew = () => {
        navigate(`/admin/quizzes/new?mainCategoryKey=${MAIN_CAT_KEY}&subCategoryKey=${SUB_CAT_KEY}`);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage GK Quizzes</h1>
                <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    <PlusCircleIcon className="h-5 w-5" /> Add New GK Quiz
                </button>
            </header>

            {loading && <div className="text-center py-4">Loading quizzes...</div>}
            {error && <p className="text-red-500 text-center py-4">{error}</p>}
            
            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">Title</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Date Created</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quizzes.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No GK quizzes found.</td></tr>
                            ) : (
                                quizzes.map(quiz => (
                                    <tr key={quiz.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                        <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">{quiz.title}</th>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${quiz.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                                {quiz.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{quiz.createdAt ? (quiz.createdAt as Date).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4 flex items-center gap-4">
                                            <button onClick={() => handleEditQuiz(quiz.id)} className="text-blue-600 hover:text-blue-800" aria-label="Edit Quiz"><PencilIcon className="h-5 w-5" /></button>
                                            <button onClick={() => handleDeleteQuiz(quiz.id, quiz.title)} className="text-red-600 hover:text-red-800" aria-label="Delete Quiz"><TrashIcon className="h-5 w-5" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminGKManagementPage;