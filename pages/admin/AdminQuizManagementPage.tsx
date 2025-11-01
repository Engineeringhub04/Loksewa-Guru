import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { ICONS_MAP, MCQ_CATEGORIES as FALLBACK_CATEGORIES } from '../../constants';
import type { MainQuizCategory, SubQuizCategory, MCQCategoryStructure, QuizDocument } from '../../types';
import { ArrowLeftIcon, ChevronRightIcon, TrashIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';

interface QuizHistoryProps {
    quizzes: QuizDocument[];
    loading: boolean;
    error: string | null;
    onEdit: (quiz: QuizDocument) => void;
    onDelete: (id: string, title: string) => void;
}

const QuizHistory: React.FC<QuizHistoryProps> = ({ quizzes, loading, error, onEdit, onDelete }) => {
    if (loading) {
        return <div className="text-center p-4">Loading quiz history...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-500">{error}</div>;
    }

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Published Quizzes History</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">Title</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quizzes.map(quiz => (
                                <tr key={quiz.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{quiz.title}</th>
                                    <td className="px-6 py-4">{quiz.subCategoryName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${quiz.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                            {quiz.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{quiz.createdAt ? quiz.createdAt.toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4 flex items-center gap-2">
                                        <button onClick={() => onEdit(quiz)} className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300" aria-label="Edit Quiz"><PencilIcon className="h-4 w-4"/></button>
                                        <button onClick={() => onDelete(quiz.id, quiz.title)} className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400" aria-label="Delete Quiz"><TrashIcon className="h-4 w-4"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {quizzes.length === 0 && <p className="text-center text-gray-500 p-6">No quizzes have been created yet.</p>}
            </div>
        </div>
    );
};

// Helper to create a plain object from Firestore data to avoid circular reference errors.
const cleanCategoryForComparison = (cat: MainQuizCategory): MainQuizCategory => ({
    id: cat.id,
    title: cat.title,
    iconKey: cat.iconKey,
    color: cat.color,
    key: cat.key,
    subCategories: (cat.subCategories || []).map(sub => ({
        key: sub.key,
        name: sub.name,
        iconKey: sub.iconKey,
        description: sub.description,
        color: sub.color,
    }))
});


const AdminQuizManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedMain, setSelectedMain] = useState<MainQuizCategory | null>(null);

    const [quizzes, setQuizzes] = useState<QuizDocument[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(true);
    const [quizError, setQuizError] = useState<string | null>(null);

    const [categories, setCategories] = useState<MCQCategoryStructure>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const { showToast } = useToast();
    
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, title: string } | null>(null);


    const fetchCategories = useCallback(async () => {
        setLoadingCategories(true);
        try {
            const q = query(collection(db, "quizCategories"), orderBy("title"));
            const querySnapshot = await getDocs(q);
             if (querySnapshot.empty) {
                console.log("No categories found, seeding from fallback...");
                const batch = writeBatch(db);
                FALLBACK_CATEGORIES.forEach(cat => {
                    const docRef = doc(db, "quizCategories", cat.key);
                    batch.set(docRef, cat);
                });
                await batch.commit();
                fetchCategories();
            } else {
                const fetchedCategories = querySnapshot.docs.map(doc => cleanCategoryForComparison({ id: doc.id, ...doc.data() } as MainQuizCategory));
                setCategories(fetchedCategories);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            setCategories([]);
        } finally {
            setLoadingCategories(false);
        }
    }, []);

    const fetchQuizzes = useCallback(async () => {
        setLoadingQuizzes(true);
        try {
            const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const quizList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    mainCategoryKey: data.mainCategoryKey,
                    subCategoryKey: data.subCategoryKey,
                    subCategoryName: data.subCategoryName,
                    status: data.status,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
                    questions: data.questions,
                    settings: data.settings,
                } as QuizDocument;
            });
            setQuizzes(quizList);
        } catch (err) {
            console.error("Error fetching quizzes:", err);
            setQuizError("Failed to load quiz history.");
        } finally {
            setLoadingQuizzes(false);
        }
    }, []);

    useEffect(() => {
        fetchQuizzes();
        fetchCategories();
    }, [fetchQuizzes, fetchCategories]);

    const executeDelete = async () => {
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "quizzes", confirmDelete.id));
            showToast(`Quiz "${confirmDelete.title}" was deleted successfully.`);
            setQuizzes(prev => prev.filter(q => q.id !== confirmDelete.id));
        } catch (error) {
            console.error("Error deleting quiz: ", error);
            showToast(`An error occurred while deleting the quiz: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            setConfirmDelete(null);
        }
    };
    
    const handleEditQuiz = (quiz: QuizDocument) => {
        navigate(`/admin/quizzes/edit/${quiz.id}`);
    };

    const handleSubCategorySelect = (mainCat: MainQuizCategory, subCat: SubQuizCategory) => {
        navigate(`/admin/quizzes/new?mainCategoryKey=${mainCat.key}&subCategoryKey=${subCat.key}`);
    };

    if (selectedMain) {
        return (
            <div className="animate-fade-in">
                <div className="flex items-center mb-6">
                    <button onClick={() => setSelectedMain(null)} className="p-2 mr-4 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Back to main categories">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{selectedMain.title}</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(selectedMain.subCategories || []).map(subCat => {
                        const Icon = ICONS_MAP[subCat.iconKey];
                        return (
                            <button 
                                key={subCat.key} 
                                onClick={() => handleSubCategorySelect(selectedMain, subCat)}
                                className="w-full text-left p-4 rounded-lg shadow-md flex items-center bg-white dark:bg-gray-800 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className={`p-3 rounded-lg ${subCat.color}`}>
                                {Icon ? <Icon className="h-8 w-8 text-white" /> : null}
                                </div>
                                <div className="ml-4 flex-1">
                                    <h4 className="font-bold text-gray-800 dark:text-white">{subCat.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{subCat.description}</p>
                                </div>
                                <ChevronRightIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                            </button>
                        )
                    })}
                </div>
            </div>
        );
    }
    
    return (
        <div className="animate-fade-in">
             {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to delete the quiz "{confirmDelete.title}"? This action cannot be undone.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Quiz Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Select a section to create a new quiz or manage existing ones.</p>
                </div>
                <button 
                    onClick={() => navigate('/admin/quizzes/categories')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <PlusIcon className="h-5 w-5" /> Manage Sections
                </button>
            </div>
            
            {loadingCategories ? <p>Loading sections...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {categories.map(cat => {
                    const Icon = ICONS_MAP[cat.iconKey];
                    const fromColor = cat.color.replace('bg-', 'from-');
                    const toColor = `to-${cat.color.split('-')[1]}-700`;
                    return (
                     <button 
                        key={cat.key} 
                        onClick={() => setSelectedMain(cat)} 
                        className={`w-full text-left p-6 rounded-xl flex flex-col justify-between text-white shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${fromColor} ${toColor} bg-gradient-to-br`}
                    >
                        <div className="flex items-center">
                           {Icon ? <Icon className="h-10 w-10 text-white" /> : null}
                        </div>
                        <div>
                             <h3 className="text-xl font-bold mt-4">{cat.title}</h3>
                             <p className="text-sm opacity-80">{(cat.subCategories || []).length} sub-categories</p>
                        </div>
                     </button>
                    )
                 })}
            </div>
            )}

            <QuizHistory 
                quizzes={quizzes}
                loading={loadingQuizzes}
                error={quizError}
                onEdit={handleEditQuiz}
                onDelete={(id, title) => setConfirmDelete({ id, title })}
            />
        </div>
    );
};

export default AdminQuizManagementPage;