import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import type { MainQuizCategory, SubQuizCategory, QuizDocument, MCQQuestion } from '../../types';
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/solid';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { generateQuizQuestionsFromTopic, generateQuizDetailsFromTopic } from '../../services/geminiService';
import Modal from '../../components/Modal';

// This is a new page component for creating/editing quizzes.
// The QuizCreationForm and related components have been moved here from AdminQuizManagementPage.tsx

interface ManagedQuestion extends Omit<MCQQuestion, 'id'> {
  id: string; // Ensure ID is a string for local state management
}

const ToggleSwitch: React.FC<{ label: string, enabled: boolean, setEnabled: (enabled: boolean) => void }> = ({ label, enabled, setEnabled }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
        >
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
        </button>
    </div>
);

const AdminQuizEditorPage: React.FC = () => {
    const navigate = useNavigate();
    const { quizId } = useParams<{ quizId: string }>();
    const [searchParams] = useSearchParams();
    const mainCategoryKey = searchParams.get('mainCategoryKey');
    const subCategoryKey = searchParams.get('subCategoryKey');
    const isEditMode = !!quizId;

    const formRef = useRef<HTMLFormElement>(null);

    // State for quiz data
    const [quizToEdit, setQuizToEdit] = useState<QuizDocument | null>(null);
    const [categoryInfo, setCategoryInfo] = useState<{ main: MainQuizCategory | null, sub: SubQuizCategory | null }>({ main: null, sub: null });
    const [isLoading, setIsLoading] = useState(true);

    // Form fields state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<ManagedQuestion[]>([]);
    
    // Settings state
    const [displayQuestions, setDisplayQuestions] = useState(10);
    const [randomizeQuestions, setRandomizeQuestions] = useState(true);
    const [randomizeOptions, setRandomizeOptions] = useState(true);
    const [showResults, setShowResults] = useState(true);
    const [allowAttempts, setAllowAttempts] = useState(true);
    const [showExplanation, setShowExplanation] = useState(false);

    // Question input state
    const [bulkText, setBulkText] = useState('');
    const [manualQuestion, setManualQuestion] = useState('');
    const [manualOptions, setManualOptions] = useState(['', '', '', '']);
    const [manualCorrectOption, setManualCorrectOption] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    // AI State
    const [aiTopic, setAiTopic] = useState('');
    const [aiQuestionCount, setAiQuestionCount] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<ManagedQuestion[]>([]);
    const [aiError, setAiError] = useState('');


    useEffect(() => {
        const fetchQuizData = async () => {
            setIsLoading(true);
            try {
                if (isEditMode && quizId) {
                    const quizDocRef = doc(db, 'quizzes', quizId);
                    const quizDocSnap = await getDoc(quizDocRef);
                    if (quizDocSnap.exists()) {
                        const quizData = { id: quizDocSnap.id, ...quizDocSnap.data() } as QuizDocument;
                        setQuizToEdit(quizData);
                        setTitle(quizData.title);
                        setDescription(quizData.description);
                        setQuestions(quizData.questions.map((q, index) => ({ id: `q-${index}-${Date.now()}`, ...q })));
                        
                        // Settings
                        setDisplayQuestions(quizData.settings.displayQuestions || 10);
                        setRandomizeQuestions(quizData.settings.randomizeQuestions);
                        setRandomizeOptions(quizData.settings.randomizeOptions);
                        setShowResults(quizData.settings.showResultsImmediately);
                        setAllowAttempts(quizData.settings.allowMultipleAttempts);
                        setShowExplanation(quizData.settings.showExplanation);
                    } else {
                        console.error("Quiz not found");
                        navigate('/admin/quizzes');
                    }
                } else if (mainCategoryKey && subCategoryKey) {
                    const q = query(collection(db, 'quizCategories'), where('key', '==', mainCategoryKey));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const mainCat = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as MainQuizCategory;
                        const subCat = mainCat.subCategories.find(sc => sc.key === subCategoryKey) || null;
                        if (subCat) {
                            setCategoryInfo({ main: mainCat, sub: subCat });
                        } else {
                             console.error("Sub category not found");
                             navigate('/admin/quizzes');
                        }
                    } else {
                        console.error("Main category not found");
                        navigate('/admin/quizzes');
                    }
                }
            } catch (error) {
                console.error("Failed to load quiz data:", error);
                navigate('/admin/quizzes');
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuizData();
    }, [quizId, isEditMode, mainCategoryKey, subCategoryKey, navigate]);

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
        };

        setQuestions(prev => [...prev, newQuestion]);

        // Reset form
        setManualQuestion('');
        setManualOptions(['', '', '', '']);
        setManualCorrectOption(null);
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...manualOptions];
        newOptions[index] = value;
        setManualOptions(newOptions);
    };
    
    const handleDeleteQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
        alert("Question removed from the list. Remember to save your changes to make the deletion permanent.");
    };

    const handleParseBulkQuestions = () => {
        if (!bulkText.trim()) return;

        const newQuestions: ManagedQuestion[] = [];
        const questionBlocks = bulkText.trim().split(/\n\n+/);

        for (const block of questionBlocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 2) continue;

            const question = lines[0].trim();
            const optionsRaw = lines.slice(1);
            const options: string[] = [];
            let correctOptionIndex = -1;

            for (let i = 0; i < optionsRaw.length; i++) {
                let optionLine = optionsRaw[i].trim();
                if (optionLine.startsWith('*')) {
                    correctOptionIndex = i;
                    optionLine = optionLine.substring(1).trim();
                }
                const optionText = optionLine.replace(/^[A-Da-d][.)]\s*|^\d+[.)]\s*/, '').trim();
                options.push(optionText);
            }

            if (question && options.length > 1 && correctOptionIndex !== -1) {
                newQuestions.push({
                    id: `bulk-${Date.now()}-${Math.random()}`,
                    question,
                    options,
                    correctOptionIndex,
                });
            }
        }

        if (newQuestions.length > 0) {
            setQuestions(prev => [...prev, ...newQuestions]);
            setBulkText('');
            alert(`${newQuestions.length} questions added successfully!`);
        } else {
            alert('Could not parse any questions. Please check the format.');
        }
    };

    const handleGenerateAiContent = async () => {
        if (!aiTopic.trim()) {
            alert('Please provide a topic for the AI.');
            return;
        }
        setIsGenerating(true);
        setGeneratedQuestions([]);
        setAiError('');
        try {
            // Step 1: Generate Title and Description
            const subCategoryNameForPrompt = isEditMode ? quizToEdit!.subCategoryName : categoryInfo.sub!.name;
            const details = await generateQuizDetailsFromTopic(aiTopic, subCategoryNameForPrompt);
            setTitle(details.title);
            setDescription(details.description);

            // Step 2: Generate Questions
            const results = await generateQuizQuestionsFromTopic(aiTopic, aiQuestionCount);
            setGeneratedQuestions(results.map(q => ({ id: `ai-${Date.now()}-${Math.random()}`, ...q })));
        } catch (error: any) {
            setAiError(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddGeneratedQuestion = (questionToAdd: ManagedQuestion) => {
        setQuestions(prev => [...prev, questionToAdd]);
        setGeneratedQuestions(prev => prev.filter(q => q.id !== questionToAdd.id));
    };

    const handleAddAllGeneratedQuestions = () => {
        setQuestions(prev => [...prev, ...generatedQuestions]);
        setGeneratedQuestions([]);
    };

    const handleSaveOrUpdateQuiz = async (status: 'published' | 'draft') => {
        if (!formRef.current?.checkValidity()) {
            formRef.current?.reportValidity();
            return;
        }
        if (!title.trim()) {
            alert("Quiz title cannot be empty.");
            return;
        }
        if (questions.length === 0) {
            alert('Please add at least one question before saving.');
            return;
        }
        if (displayQuestions > questions.length) {
            alert(`"Number of Questions to Display" (${displayQuestions}) cannot be more than the total questions available (${questions.length}).`);
            return;
        }

        setIsSubmitting(true);
        const timeLimit = (formRef.current?.elements.namedItem('timeLimit') as HTMLInputElement)?.value;
        const passingScore = (formRef.current?.elements.namedItem('passingScore') as HTMLInputElement)?.value;
        
        const quizPayload = {
            title: title.trim(),
            description: description.trim(),
            mainCategoryKey: isEditMode ? quizToEdit!.mainCategoryKey : categoryInfo.main!.key,
            subCategoryKey: isEditMode ? quizToEdit!.subCategoryKey : categoryInfo.sub!.key,
            subCategoryName: isEditMode ? quizToEdit!.subCategoryName : categoryInfo.sub!.name,
            questions: questions.map(({ id, ...rest }) => rest),
            settings: {
                timeLimitMinutes: Number(timeLimit),
                passingScore: Number(passingScore),
                displayQuestions: Number(displayQuestions),
                randomizeQuestions,
                randomizeOptions,
                showResultsImmediately: showResults,
                allowMultipleAttempts: allowAttempts,
                showExplanation,
            },
            status,
            updatedAt: serverTimestamp(),
        };

        try {
            if (isEditMode && quizId) {
                const quizRef = doc(db, 'quizzes', quizId);
                await updateDoc(quizRef, quizPayload);
                alert(`Quiz "${quizPayload.title}" has been successfully updated.`);
            } else {
                const finalPayload = { ...quizPayload, createdAt: serverTimestamp() };
                await addDoc(collection(db, 'quizzes'), finalPayload);
                alert(`Quiz "${quizPayload.title}" has been successfully saved to the database.`);
            }
            navigate('/admin/quizzes');
        } catch (error) {
            console.error("Error saving quiz:", error);
            alert('Failed to save quiz. Please check the console and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const executeDelete = async () => {
        if (!quizId || !quizToEdit) return;

        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "quizzes", quizId));
            alert('Quiz deleted successfully.');
            navigate('/admin/quizzes');
        } catch (error) {
            console.error("Error deleting quiz:", error);
            alert(`Failed to delete quiz: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
        } finally {
            setIsDeleting(false);
            setIsConfirmingDelete(false);
        }
    };

    if (isLoading) {
        return <div className="p-6">Loading quiz editor...</div>;
    }

    const subCategoryName = isEditMode ? quizToEdit?.subCategoryName : categoryInfo.sub?.name;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-fade-in">
             {isConfirmingDelete && (
                <Modal
                    isOpen={isConfirmingDelete}
                    onClose={() => setIsConfirmingDelete(false)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to permanently delete the quiz "{quizToEdit?.title}"? This action cannot be undone.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setIsConfirmingDelete(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md" disabled={isDeleting}>Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md" disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </Modal>
            )}
             <div className="flex items-center mb-6 border-b dark:border-gray-700 pb-4">
                <button onClick={() => navigate('/admin/quizzes')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{isEditMode ? 'Edit Quiz' : 'Create New Quiz'}</h2>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">{subCategoryName}</p>
                </div>
            </div>

            <form ref={formRef} className="space-y-8" noValidate>
                 <section>
                    <h3 className="font-semibold mb-4 text-lg">1. Quiz Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quiz Title</label>
                            <input type="text" name="quizTitle" required placeholder={`e.g., ${subCategoryName} - Set 1`} className="mt-1 w-full form-input" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                            <div className="mt-1 w-full form-input bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{subCategoryName}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                            <textarea rows={3} name="description" placeholder="A short description about this quiz..." className="mt-1 w-full form-input" value={description} onChange={e => setDescription(e.target.value)}></textarea>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="font-semibold mb-4 text-lg">2. Add Questions</h3>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-4 border border-purple-200 dark:border-purple-700">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-purple-800 dark:text-purple-200">
                            <SparklesIcon className="h-5 w-5" />
                            Generate with AI
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Enter a topic, and AI will create the title, description, and questions for you.</p>
                        <textarea
                            value={aiTopic}
                            onChange={e => setAiTopic(e.target.value)}
                            placeholder="e.g., 'Constitutional Development of Nepal', 'Fluid Mechanics Basics', 'The Civil Service Act, 2049'"
                            className="w-full form-input font-mono text-sm"
                            rows={4}
                            disabled={isGenerating}
                        />
                        <div className="mt-2 flex flex-wrap items-end gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Questions Required</label>
                                <input
                                    type="number"
                                    value={aiQuestionCount}
                                    onChange={e => setAiQuestionCount(Math.max(1, Number(e.target.value)))}
                                    className="form-input mt-1 w-32"
                                    min="1"
                                    max="50"
                                    disabled={isGenerating}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerateAiContent}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 disabled:bg-purple-400 disabled:cursor-wait"
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    "Generate Quiz Content"
                                )}
                            </button>
                        </div>
                        {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
                    </div>
                    {generatedQuestions.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Review Generated Questions ({generatedQuestions.length})</h4>
                                <button
                                    type="button"
                                    onClick={handleAddAllGeneratedQuestions}
                                    className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
                                >
                                    Add All
                                </button>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {generatedQuestions.map((q) => (
                                    <div key={q.id} className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <p className="font-medium text-gray-800 dark:text-gray-200 flex-1 pr-2">{q.question}</p>
                                            <button
                                                type="button"
                                                onClick={() => handleAddGeneratedQuestion(q)}
                                                className="px-3 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 flex-shrink-0"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <ul className="mt-2 pl-5 text-sm">
                                            {q.options.map((opt, i) => (
                                                <li key={i} className={`list-disc ${i === q.correctOptionIndex ? 'font-bold text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>{opt}</li>
                                            ))}
                                        </ul>
                                        {q.explanation && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">Explanation: {q.explanation}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg mb-4">
                        <h4 className="font-medium mb-2">Add Manually</h4>
                        <div className="space-y-3">
                            <textarea value={manualQuestion} onChange={e => setManualQuestion(e.target.value)} placeholder="Enter question text here" className="w-full form-input" rows={2}></textarea>
                             {manualOptions.map((opt, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <input 
                                        type="radio" 
                                        name="manualCorrectOption" 
                                        className="form-radio"
                                        checked={manualCorrectOption === index}
                                        onChange={() => setManualCorrectOption(index)}
                                    />
                                    <input 
                                        type="text" 
                                        value={opt} 
                                        onChange={e => handleOptionChange(index, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        className="w-full form-input"
                                    />
                                </div>
                            ))}
                            <button type="button" onClick={handleAddManualQuestion} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2">
                                <PlusCircleIcon className="h-5 w-5" /> Add this Question
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Add in Bulk</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Paste questions below. Mark the correct answer with an asterisk (*).</p>
                        <textarea 
                            value={bulkText}
                            onChange={e => setBulkText(e.target.value)}
                            rows={8} 
                            placeholder={"What is the capital of Nepal?\nA. Pokhara\n*B. Kathmandu\nC. Butwal\nD. Biratnagar"} 
                            className="w-full form-input font-mono text-sm"
                        ></textarea>
                        <button type="button" onClick={handleParseBulkQuestions} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Parse & Add Questions</button>
                    </div>
                </section>
                
                <section>
                    <h3 className="font-semibold mb-4 text-lg">3. Review Questions ({questions.length} total)</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                        {questions.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No questions added yet. Add questions manually or in bulk above.</p>
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
                            </div>
                        ))
                        )}
                    </div>
                </section>

                 <section>
                    <h3 className="font-semibold mb-4 text-lg">4. Quiz Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Limit (minutes)</label>
                            <input type="number" name="timeLimit" defaultValue={isEditMode ? quizToEdit?.settings.timeLimitMinutes : 60} className="mt-1 w-full form-input" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Passing Score (%)</label>
                            <input type="number" name="passingScore" defaultValue={isEditMode ? quizToEdit?.settings.passingScore : 50} className="mt-1 w-full form-input" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Questions to Display</label>
                            <input 
                                type="number" 
                                name="displayQuestions" 
                                value={displayQuestions} 
                                onChange={e => setDisplayQuestions(Number(e.target.value))} 
                                min="1" 
                                max={questions.length > 0 ? questions.length : undefined}
                                className="mt-1 w-full form-input"
                            />
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total available: {questions.length}</p>
                        </div>

                        <div className="space-y-3 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-6">
                            <ToggleSwitch label="Randomize Questions Order" enabled={randomizeQuestions} setEnabled={setRandomizeQuestions} />
                            <ToggleSwitch label="Randomize Options Order" enabled={randomizeOptions} setEnabled={setRandomizeOptions} />
                            <label className="flex items-center">
                                <input type="checkbox" name="showResults" className="form-checkbox" checked={showResults} onChange={e => setShowResults(e.target.checked)} />
                                <span className="ml-2 text-sm">Show results immediately</span>
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" name="allowAttempts" className="form-checkbox" checked={allowAttempts} onChange={e => setAllowAttempts(e.target.checked)} />
                                <span className="ml-2 text-sm">Allow multiple attempts</span>
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" name="showExplanation" className="form-checkbox" checked={showExplanation} onChange={e => setShowExplanation(e.target.checked)} />
                                <span className="ml-2 text-sm">Show explanation after answer</span>
                            </label>
                        </div>
                    </div>
                </section>
                
                <div className="flex justify-end gap-4 pt-6 border-t dark:border-gray-700">
                    <button type="button" onClick={() => handleSaveOrUpdateQuiz('draft')} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-wait">
                        {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save as Draft'}
                    </button>
                    <button type="button" onClick={() => handleSaveOrUpdateQuiz('published')} disabled={isSubmitting} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-wait">
                        {isSubmitting ? 'Publishing...' : isEditMode ? 'Update & Publish' : 'Publish Quiz'}
                    </button>
                </div>
            </form>

            {isEditMode && (
                <div className="mt-12 pt-6 border-t border-red-300 dark:border-red-700/50">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Deleting a quiz is a permanent action and cannot be undone.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)}
                        disabled={isDeleting}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-400"
                    >
                        <TrashIcon className="h-5 w-5" />
                        {isDeleting ? 'Deleting...' : 'Delete this Quiz'}
                    </button>
                </div>
            )}

            <style>{`
                .form-input {
                    display: block;
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    color: #111827;
                    background-color: #fff;
                    border: 1px solid #D1D5DB;
                    border-radius: 0.375rem;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                }
                .dark .form-input {
                    background-color: #374151;
                    border-color: #4B5563;
                    color: #F9FAFB;
                }
                .form-input:focus {
                    outline: 2px solid transparent;
                    outline-offset: 2px;
                    --tw-ring-color: #8B5CF6;
                    border-color: #8B5CF6;
                }
                 .form-checkbox, .form-radio {
                    border-radius: 0.25rem;
                    border-color: #D1D5DB;
                    color: #8B5CF6;
                }
                .dark .form-checkbox, .dark .form-radio {
                    background-color: #4B5563;
                    border-color: #6B7280;
                }
                .form-checkbox:focus, .form-radio:focus {
                     --tw-ring-color: #8B5CF6;
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AdminQuizEditorPage;