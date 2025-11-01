import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { PracticeSet, MCQQuestion } from '../../types';
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { generateQuizQuestionsFromTopic, generateQuizDetailsFromTopic } from '../../services/geminiService';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';

interface ManagedQuestion extends Omit<MCQQuestion, 'id'> {
  id: string; 
}

const AdminPracticeSetEditorPage: React.FC = () => {
    const navigate = useNavigate();
    const { setId } = useParams<{ setId: string }>();
    const [searchParams] = useSearchParams();
    const courseKey = searchParams.get('courseKey');
    const isEditMode = !!setId;
    const { showToast } = useToast();

    // State
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<ManagedQuestion[]>([]);
    const [practiceSetToEdit, setPracticeSetToEdit] = useState<PracticeSet | null>(null);

    // AI State
    const [aiTopic, setAiTopic] = useState('');
    const [aiQuestionCount, setAiQuestionCount] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<ManagedQuestion[]>([]);
    const [aiError, setAiError] = useState('');

    // Manual Add State
    const [manualQuestion, setManualQuestion] = useState('');
    const [manualOptions, setManualOptions] = useState(['', '', '', '']);
    const [manualCorrectOption, setManualCorrectOption] = useState<number | null>(null);
    const [manualExplanation, setManualExplanation] = useState('');

    // Bulk Add State
    const [bulkText, setBulkText] = useState('');

    // Settings State
    const [displayQuestions, setDisplayQuestions] = useState(20);

    // Deletion Modal
    const [confirmDelete, setConfirmDelete] = useState<PracticeSet | null>(null);

    useEffect(() => {
        const fetchSetData = async () => {
            if (isEditMode && setId) {
                try {
                    const docRef = doc(db, 'practiceSets', setId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = { id: docSnap.id, ...docSnap.data() } as PracticeSet;
                        setPracticeSetToEdit(data);
                        setTitle(data.title);
                        setDescription(data.description);
                        setQuestions(data.questions.map((q, i) => ({ ...q, id: `q-${i}-${Date.now()}` })));
                        setDisplayQuestions(data.settings?.displayQuestions || data.questions.length);
                    } else {
                        showToast("Practice set not found.", "error");
                        navigate(-1);
                    }
                } catch (error) {
                    showToast("Failed to load set.", "error");
                    navigate(-1);
                }
            } else if (!courseKey && !isEditMode) {
                 showToast("Course key is missing.", "error");
                 navigate('/admin/questions-practice');
            }
            setIsLoading(false);
        };
        fetchSetData();
    }, [setId, isEditMode, courseKey, navigate, showToast]);

    const handleGenerateAiContent = async () => {
        if (!aiTopic.trim()) { showToast('Please provide a topic for the AI.', 'info'); return; }
        setIsGenerating(true);
        setGeneratedQuestions([]);
        setAiError('');
        try {
            const currentCourseKey = isEditMode ? practiceSetToEdit?.courseKey : courseKey;
            const details = await generateQuizDetailsFromTopic(aiTopic, `Practice Set for ${currentCourseKey}`);
            setTitle(details.title);
            setDescription(details.description);

            const results = await generateQuizQuestionsFromTopic(aiTopic, aiQuestionCount);
            setGeneratedQuestions(results.map(q => ({ id: `ai-${Date.now()}-${Math.random()}`, ...q })));
            showToast('AI content generated successfully! Review the questions below.', 'success');

        } catch (error) {
            setAiError((error as Error).message);
            showToast((error as Error).message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleAddManualQuestion = () => {
        if (!manualQuestion.trim() || manualOptions.some(opt => !opt.trim()) || manualCorrectOption === null) {
            alert('Please fill in the question, all four options, and select the correct answer.');
            return;
        }
        const newQuestion: ManagedQuestion = {
            id: `manual-${Date.now()}`,
            question: manualQuestion.trim(),
            options: manualOptions.map(opt => opt.trim()),
            correctOptionIndex: manualCorrectOption,
            explanation: manualExplanation.trim() || undefined,
        };
        setQuestions(prev => [...prev, newQuestion]);
        setManualQuestion('');
        setManualOptions(['', '', '', '']);
        setManualCorrectOption(null);
        setManualExplanation('');
    };

    const handleManualOptionChange = (index: number, value: string) => {
        const newOptions = [...manualOptions];
        newOptions[index] = value;
        setManualOptions(newOptions);
    };

    const handleParseBulkQuestions = () => {
        if (!bulkText.trim()) return;
        const newQuestions: ManagedQuestion[] = [];
        const questionBlocks = bulkText.trim().split(/\n\n+/);
        for (const block of questionBlocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 2) continue;
            const question = lines[0].replace(/^\d+[.)]\s*/, '').trim();
            const optionsRaw = lines.slice(1);
            const options: string[] = [];
            let correctOptionIndex = -1;
            for (let i = 0; i < optionsRaw.length; i++) {
                let optionLine = optionsRaw[i].trim();
                if (optionLine.startsWith('*')) {
                    correctOptionIndex = i;
                    optionLine = optionLine.substring(1).trim();
                }
                options.push(optionLine.replace(/^[A-Da-d][.)]\s*/, '').trim());
            }
            if (question && options.length === 4 && correctOptionIndex !== -1) {
                newQuestions.push({ id: `bulk-${Date.now()}-${Math.random()}`, question, options, correctOptionIndex });
            }
        }
        if (newQuestions.length > 0) {
            setQuestions(prev => [...prev, ...newQuestions]);
            setBulkText('');
            showToast(`${newQuestions.length} questions added successfully!`, 'success');
        } else {
            showToast('Could not parse any questions. Please check the format.', 'error');
        }
    };
    
    const handleDeleteQuestion = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id));
    const handleAddGeneratedQuestion = (q: ManagedQuestion) => {
        setQuestions(prev => [...prev, q]);
        setGeneratedQuestions(prev => prev.filter(item => item.id !== q.id));
    };
    const handleAddAllGenerated = () => {
        setQuestions(prev => [...prev, ...generatedQuestions]);
        setGeneratedQuestions([]);
    };
    
    const handleSave = async (status: 'published' | 'draft') => {
        if (!title.trim() || questions.length === 0) {
            return showToast('Title and at least one question are required.', 'error');
        }
        if (displayQuestions > questions.length) {
            return showToast(`"Number of Questions to Display" (${displayQuestions}) cannot be more than the total questions available (${questions.length}).`, 'error');
        }

        setIsSubmitting(true);
        const payload = {
            title: title.trim(),
            description: description.trim(),
            courseKey: isEditMode ? practiceSetToEdit?.courseKey : courseKey,
            questions: questions.map(({ id, ...rest }) => rest),
            status,
            settings: { displayQuestions: Number(displayQuestions) },
            updatedAt: serverTimestamp(),
        };
        try {
            if (isEditMode && setId) {
                await updateDoc(doc(db, 'practiceSets', setId), payload);
                showToast("Set updated successfully.");
            } else {
                await addDoc(collection(db, 'practiceSets'), { ...payload, createdAt: serverTimestamp() });
                showToast("Set created successfully.");
            }
            navigate(`/admin/questions-practice/${payload.courseKey}`);
        } catch (error) {
            showToast("Failed to save set.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeDelete = async () => {
        if (!confirmDelete || !isEditMode) return;
        try {
            await deleteDoc(doc(db, "practiceSets", confirmDelete.id));
            showToast('Set deleted successfully.');
            navigate(`/admin/questions-practice/${confirmDelete.courseKey}`);
        } catch (error) {
            showToast('Failed to delete set.', 'error');
        } finally {
            setConfirmDelete(null);
        }
    };

    if (isLoading) return <div className="p-6">Loading editor...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
             {confirmDelete && <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete the set "{confirmDelete.title}"? This action cannot be undone.</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                </div>
            </Modal>}
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate(-1)} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeftIcon className="h-5 w-5"/></button>
                <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Practice Set' : 'Create Practice Set'}</h1>
            </header>
            
            <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                <section>
                    <h3 className="font-semibold mb-2 text-lg">1. Set Details</h3>
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Set Title" className="w-full form-input" required/>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Set Description" rows={2} className="w-full form-input" />
                    </div>
                </section>

                <section>
                    <h3 className="font-semibold mb-2 text-lg">2. Add Questions</h3>
                    <div className="space-y-4">
                        {/* AI Generation */}
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <h4 className="font-medium mb-2 flex items-center gap-2 text-purple-800 dark:text-purple-200"><SparklesIcon className="h-5 w-5"/> Generate with AI</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <textarea value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Enter a topic..." rows={2} className="w-full form-input md:col-span-2"/>
                                <div>
                                    <label className="block text-sm font-medium"># of Questions</label>
                                    <input type="number" value={aiQuestionCount} onChange={e => setAiQuestionCount(Number(e.target.value))} min="1" max="50" className="w-full form-input mt-1"/>
                                </div>
                            </div>
                            <button type="button" onClick={handleGenerateAiContent} disabled={isGenerating} className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400">
                                {isGenerating ? 'Generating...' : 'Generate Content'}
                            </button>
                            {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
                        </div>

                        {/* AI Review */}
                        {generatedQuestions.length > 0 && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium">Review AI Questions ({generatedQuestions.length})</h4>
                                    <button type="button" onClick={handleAddAllGenerated} className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600">Add All</button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {generatedQuestions.map(q => (<div key={q.id} className="bg-white dark:bg-gray-800 p-2 rounded-md flex justify-between items-start"><p className="text-sm flex-1 pr-2">{q.question}</p><button type="button" onClick={() => handleAddGeneratedQuestion(q)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Add</button></div>))}
                                </div>
                            </div>
                        )}
                        
                        {/* Manual Add */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <h4 className="font-medium mb-2">Add Manually</h4>
                            <div className="space-y-2">
                                <textarea value={manualQuestion} onChange={e => setManualQuestion(e.target.value)} placeholder="Question text" rows={2} className="w-full form-input"/>
                                {manualOptions.map((opt, i) => (<div key={i} className="flex items-center gap-2"><input type="radio" name="manualCorrect" checked={manualCorrectOption === i} onChange={() => setManualCorrectOption(i)} className="form-radio"/><input type="text" value={opt} onChange={e => handleManualOptionChange(i, e.target.value)} placeholder={`Option ${i+1}`} className="w-full form-input"/></div>))}
                                <textarea value={manualExplanation} onChange={e => setManualExplanation(e.target.value)} placeholder="Explanation (optional)" rows={1} className="w-full form-input"/>
                                <button type="button" onClick={handleAddManualQuestion} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"><PlusCircleIcon className="h-5 w-5 inline mr-1"/> Add Question</button>
                            </div>
                        </div>

                        {/* Bulk Add */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <h4 className="font-medium mb-2">Add in Bulk</h4>
                            <p className="text-xs text-gray-500 mb-2">Paste questions below. Each question on a new line, followed by 4 options on new lines. Mark the correct answer with an asterisk (*).</p>
                            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={5} placeholder={"1. Question text\nA. Option 1\n*B. Correct Option\nC. Option 3\nD. Option 4"} className="w-full form-input font-mono text-sm"/>
                            <button type="button" onClick={handleParseBulkQuestions} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Parse & Add</button>
                        </div>
                    </div>
                </section>
                
                <section>
                    <h3 className="font-semibold mb-2 text-lg">3. Set Settings</h3>
                     <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <label className="block text-sm font-medium">Number of Questions to Display</label>
                        <input type="number" value={displayQuestions} onChange={e => setDisplayQuestions(Number(e.target.value))} min="1" max={questions.length > 0 ? questions.length : undefined} className="w-full form-input mt-1"/>
                        <p className="text-xs text-gray-500 mt-1">Total questions available: {questions.length}. Leave blank or set to 0 to show all.</p>
                    </div>
                </section>

                <section>
                    <h3 className="font-semibold mb-2 text-lg">4. Review Questions ({questions.length} total)</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                        {questions.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No questions added yet.</p>
                        ) : (
                        questions.map((q, index) => (
                            <div key={q.id} className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                                <div className="flex justify-between items-start">
                                    <p className="font-medium text-gray-800 dark:text-gray-200 flex-1 pr-2">{index + 1}. {q.question}</p>
                                    <button type="button" onClick={() => handleDeleteQuestion(q.id)} className="text-gray-400 hover:text-red-500">
                                        <TrashIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                                <ul className="mt-2 pl-5 text-sm">
                                    {q.options.map((opt, i) => (
                                        <li key={i} className={`list-disc ${i === q.correctOptionIndex ? 'font-bold text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>{opt}</li>
                                    ))}
                                </ul>
                                {q.explanation && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t dark:border-gray-700">
                                        <strong className="font-semibold">Explanation:</strong> {q.explanation}
                                    </p>
                                )}
                            </div>
                        ))
                        )}
                    </div>
                </section>
                
                <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                     {isEditMode && practiceSetToEdit && <button type="button" onClick={() => setConfirmDelete(practiceSetToEdit)} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete Set</button>}
                     {!isEditMode && <div />}
                    <div className="flex gap-4">
                        <button type="button" onClick={() => handleSave('draft')} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Save as Draft</button>
                        <button type="button" onClick={() => handleSave('published')} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-md">Publish</button>
                    </div>
                </div>
            </form>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}.form-radio{color:#8B5CF6}`}</style>
        </div>
    );
};

export default AdminPracticeSetEditorPage;