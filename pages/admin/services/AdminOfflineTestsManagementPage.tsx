import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query, orderBy, deleteDoc, Timestamp } from 'firebase/firestore';
import type { OfflineTest, MCQQuestion } from '../../../types';
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { generateQuizQuestionsFromTopic, generateQuizDetailsFromTopic } from '../../../services/geminiService';
import { useToast } from '../../../contexts/ToastContext';
import Modal from '../../../components/Modal';

interface ManagedQuestion extends Omit<MCQQuestion, 'id'> {
  id: string; 
}

const AdminOfflineTestsManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [tests, setTests] = useState<OfflineTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Editor State
    const [editingTest, setEditingTest] = useState<OfflineTest | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<ManagedQuestion[]>([]);
    const [aiTopic, setAiTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState('');

    const [confirmDelete, setConfirmDelete] = useState<{ id: string, title: string } | null>(null);

    const fetchTests = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'offlineTests'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const testList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
                } as OfflineTest;
            });
            setTests(testList);
        } catch (error) {
            console.error("Error fetching offline tests:", error);
            showToast("Failed to load offline tests.", "error");
        }
        setIsLoading(false);
    }, [showToast]);

    useEffect(() => {
        if (view === 'list') {
            fetchTests();
        }
    }, [view, fetchTests]);

    const resetForm = () => {
        setEditingTest(null);
        setTitle('');
        setDescription('');
        setQuestions([]);
        setAiTopic('');
        setAiError('');
    };

    const handleAddNew = () => {
        resetForm();
        setView('editor');
    };

    const handleEdit = (test: OfflineTest) => {
        setEditingTest(test);
        setTitle(test.title);
        setDescription(test.description);
        setQuestions(test.questions.map((q, i) => ({ ...q, id: `q-${i}` })));
        setView('editor');
    };
    
    const handleGenerateAiContent = async () => {
        if (!aiTopic.trim()) return showToast('Please enter a topic.', 'info');
        setIsGenerating(true);
        setAiError('');
        try {
            const details = await generateQuizDetailsFromTopic(aiTopic, 'Offline Test');
            const generatedQuestions = await generateQuizQuestionsFromTopic(aiTopic, 15);
            setTitle(details.title);
            setDescription(details.description);
            setQuestions(generatedQuestions.map(q => ({ ...q, id: `ai-${Date.now()}-${Math.random()}` })));
            showToast('AI content generated successfully!', 'success');
        } catch (error) {
            setAiError((error as Error).message);
            showToast('Failed to generate content with AI.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleDeleteQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const handleSave = async (status: 'published' | 'draft') => {
        if (!title.trim() || questions.length === 0) {
            return showToast('Title and at least one question are required.', 'error');
        }
        setIsSubmitting(true);
        const payload = {
            title,
            description,
            status,
            questions: questions.map(({ id, ...rest }) => rest),
            settings: { // Default settings, can be expanded later
                timeLimitMinutes: 20,
                passingScore: 50,
                randomizeQuestions: true,
                randomizeOptions: true,
                showResultsImmediately: true,
                allowMultipleAttempts: true,
                showExplanation: true,
            },
            updatedAt: serverTimestamp(),
        };

        try {
            if (editingTest) {
                await updateDoc(doc(db, 'offlineTests', editingTest.id), payload);
                showToast('Offline test updated successfully.');
            } else {
                await addDoc(collection(db, 'offlineTests'), { ...payload, createdAt: serverTimestamp() });
                showToast('Offline test created successfully.');
            }
            setView('list');
        } catch (error) {
            console.error('Error saving offline test:', error);
            showToast('Failed to save offline test.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, 'offlineTests', confirmDelete.id));
            showToast('Offline test deleted.');
            setTests(prev => prev.filter(t => t.id !== confirmDelete.id));
        } catch (error) {
            console.error('Error deleting offline test:', error);
            showToast('Failed to delete offline test.', 'error');
        } finally {
            setConfirmDelete(null);
        }
    };
    
    if (isLoading) return <div className="p-6">Loading...</div>;

    if (view === 'editor') {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-fade-in">
                <header className="flex items-center mb-6 border-b dark:border-gray-700 pb-4">
                    <button onClick={() => setView('list')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-bold">{editingTest ? 'Edit Offline Test' : 'Create Offline Test'}</h1>
                </header>
                
                <div className="space-y-6">
                    {/* Details */}
                    <div className="space-y-4">
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz Title" className="w-full form-input" />
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Quiz Description" className="w-full form-input" rows={2}></textarea>
                    </div>

                    {/* AI Generation */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <h3 className="font-semibold mb-2 flex items-center gap-2 text-purple-800 dark:text-purple-200"><SparklesIcon className="h-5 w-5"/> Generate with AI</h3>
                        <textarea value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Enter a topic..." className="w-full form-input" rows={2}/>
                        <button onClick={handleGenerateAiContent} disabled={isGenerating} className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed">
                            {isGenerating ? 'Generating...' : 'Generate Content'}
                        </button>
                        {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
                    </div>

                    {/* Questions List */}
                    <div>
                        <h3 className="font-semibold mb-2">{questions.length} Questions</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {questions.map((q, i) => (
                                <div key={q.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md flex justify-between items-start">
                                    <p className="text-sm flex-1">{i + 1}. {q.question}</p>
                                    <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-4 border-t dark:border-gray-700">
                        <button onClick={() => handleSave('draft')} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Save as Draft</button>
                        <button onClick={() => handleSave('published')} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-md">Publish</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {confirmDelete && (
                <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Deletion">
                    <p>Are you sure you want to delete "{confirmDelete.title}"?</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}
            <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Offline Tests</h1>
                <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg">
                    <PlusCircleIcon className="h-5 w-5" /> Add New Test
                </button>
            </header>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Title</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3"># Questions</th>
                            <th className="px-6 py-3">Last Updated</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tests.map(test => (
                            <tr key={test.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">{test.title}</th>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${test.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                        {test.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{test.questions.length}</td>
                                <td className="px-6 py-4">{test.updatedAt ? (test.updatedAt as Date).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4 flex items-center gap-4">
                                    <button onClick={() => handleEdit(test)} className="text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => setConfirmDelete({ id: test.id, title: test.title })} className="text-red-600"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminOfflineTestsManagementPage;