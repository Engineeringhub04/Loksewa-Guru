import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy as f_orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { QUIZ_SETTINGS, ICONS_MAP, ExamIcon, MCQ_CATEGORIES as FALLBACK_CATEGORIES } from '../constants';
import type { MCQQuestion, MainQuizCategory, SubQuizCategory, MCQCategoryStructure, QuizDocument } from '../types';
import { 
    ArrowLeftIcon, 
    ClockIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    SparklesIcon, 
    ArrowUturnLeftIcon, 
    LightBulbIcon, 
    ForwardIcon, 
    ExclamationTriangleIcon, 
    ArrowRightIcon,
    ListBulletIcon,
    AcademicCapIcon,
    ChevronRightIcon
} from '@heroicons/react/24/solid';
import Footer from '../components/Footer';
import PullToRefresh from '../components/PullToRefresh';


type QuizState = 'selecting' | 'loading' | 'quiz_list' | 'ready' | 'in_progress' | 'finished' | 'review';

// Helper to format time
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Helper to create a JSON-safe, clean version of a category for deep comparison
const cleanCategoryForComparison = (cat: MainQuizCategory | null): any => {
    if (!cat) return null;
    return {
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
    };
};

// Main Component
const MCQTestPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const mainCategoryKey = searchParams.get('mainCategory');
    const categoryKey = searchParams.get('category');
    const [allCategories, setAllCategories] = useState<MCQCategoryStructure>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    const [quizState, setQuizState] = useState<QuizState>(() => categoryKey ? 'loading' : 'selecting');
    const [availableQuizzes, setAvailableQuizzes] = useState<QuizDocument[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizDocument | null>(null);
    const [questions, setQuestions] = useState<MCQQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
    const [showExplanation, setShowExplanation] = useState<string | number | null>(null);

    const fetchCategories = useCallback(async () => {
        setLoadingCategories(true);
        const q = query(collection(db, "quizCategories"), f_orderBy("title"));
        try {
            const querySnapshot = await getDocs(q);
             if (querySnapshot.empty) {
                console.warn("No quiz categories found in Firestore, using fallback data.");
                setAllCategories(FALLBACK_CATEGORIES.map(c => ({...c, id: c.key})));
            } else {
                const fetchedCategories = querySnapshot.docs.map(doc =>
                    cleanCategoryForComparison({ id: doc.id, ...doc.data() } as MainQuizCategory)
                );
                setAllCategories(fetchedCategories);
            }
        } catch (error) {
            console.error("Error fetching categories: ", error);
            setAllCategories(FALLBACK_CATEGORIES.map(c => ({...c, id: c.key})));
        } finally {
            setLoadingCategories(false);
        }
    }, []);

    const fetchQuizzes = useCallback(async (key: string) => {
        try {
            const q = query(
                collection(db, 'quizzes'),
                where('subCategoryKey', '==', key),
                where('status', '==', 'published')
            );
            const querySnapshot = await getDocs(q);
            const quizList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Manually construct the object to ensure it's a POJO and prevent circular references from Firestore SDK objects.
                const quizDoc: QuizDocument = {
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
                    settings: data.settings
                };
                return quizDoc;
            });
            
            setAvailableQuizzes(quizList);
            setQuizState('quiz_list');
        } catch (err) {
            console.error("Error fetching quizzes:", err);
            setAvailableQuizzes([]);
            setQuizState('quiz_list');
        }
    }, []);

     useEffect(() => {
        setLoadingCategories(true);
        const q = query(collection(db, "quizCategories"), f_orderBy("title"));

        // Use onSnapshot for real-time updates for categories
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (querySnapshot.empty) {
                setAllCategories(FALLBACK_CATEGORIES.map(c => ({...c, id: c.key})));
            } else {
                const fetchedCategories = querySnapshot.docs.map(doc =>
                    cleanCategoryForComparison({ id: doc.id, ...doc.data() } as MainQuizCategory)
                );
                setAllCategories(fetchedCategories);
            }
            setLoadingCategories(false);
        }, (error) => {
            console.error("Error fetching categories with snapshot, using fallback: ", error);
            setAllCategories(FALLBACK_CATEGORIES.map(c => ({...c, id: c.key})));
            setLoadingCategories(false);
        });
        
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        if (quizState === 'loading' && categoryKey) {
            fetchQuizzes(categoryKey);
        }
    }, [quizState, categoryKey, fetchQuizzes]);


    const quizDetails = useMemo(() => {
        if (!categoryKey) return { name: 'Loksewa Quiz', description: 'Select a category to begin.' };

        for (const mainCat of allCategories) {
            const subCategories = mainCat.subCategories || [];
            const found = subCategories.find(c => c.key === categoryKey);
            if (found) return { ...found, description: `Quizzes for ${found.name}` };
        }
        
        return { name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1), description: 'Loksewa MCQ Test' };
    }, [categoryKey, allCategories]);

    const handleCategorySelect = (selectedCategoryKey: string) => {
        setSearchParams({ category: selectedCategoryKey });
        setQuizState('loading');
    };
    
    const handleQuizSelect = (quiz: QuizDocument) => {
        setSelectedQuiz(quiz);
        setQuizState('ready');
    };
    
    const startQuiz = () => {
        if (!selectedQuiz) return;

        const numQuestions = selectedQuiz.settings.displayQuestions || selectedQuiz.questions.length;
    
        let questionsToPlay = selectedQuiz.questions;
        if (selectedQuiz.settings.randomizeQuestions) {
            questionsToPlay = [...questionsToPlay].sort(() => 0.5 - Math.random());
        }
    
        const finalQuestions = questionsToPlay.slice(0, numQuestions);
    
        setQuestions(finalQuestions.map((q, i) => ({ ...q, id: `quiz-q-${i}` })));
        setUserAnswers(new Array(finalQuestions.length).fill(null));
        setCurrentQuestionIndex(0);
        setShowExplanation(null);
        setQuizState('in_progress');
    };

    const score = useMemo(() => {
        return userAnswers.reduce((acc, answer, index) => {
            if (answer !== null && questions[index] && answer === questions[index].correctOptionIndex) {
                return acc + 1;
            }
            return acc;
        }, 0);
    }, [userAnswers, questions]);

    const scorePercentage = useMemo(() => (questions.length > 0 ? (score / questions.length) * 100 : 0), [score, questions.length]);

    useEffect(() => {
        if (quizState === 'finished') {
            const saveResult = async () => {
                if (user && !isAdmin && selectedQuiz && questions.length > 0) {
                    try {
                        await addDoc(collection(db, 'quizResults'), {
                            userId: user.uid,
                            quizId: selectedQuiz.id,
                            quizTitle: selectedQuiz.title,
                            score: score,
                            totalQuestions: questions.length,
                            scorePercentage: scorePercentage,
                            completedAt: serverTimestamp(),
                        });
                    } catch (error) {
                        console.error("Failed to save quiz result:", error);
                    }
                }
            };
            saveResult();
        }
    }, [quizState, user, isAdmin, selectedQuiz, questions, score, scorePercentage]);

    const handleSubmit = useCallback(() => {
        setQuizState('finished');
    }, []);
    
    const handleNextQuestion = useCallback(() => {
        setShowExplanation(null);
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    }, [currentQuestionIndex, questions.length, handleSubmit]);

    const handleAnswerSelect = (optionIndex: number) => {
        if (quizState !== 'in_progress') return;
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };
    
    const handleTryAgain = () => {
        if (selectedQuiz) {
            handleQuizSelect(selectedQuiz); // Restart the same quiz
        } else if (categoryKey) {
            setQuizState('loading');
        } else {
            setQuizState('selecting');
        }
    };

    const handleReset = () => {
        setSearchParams({});
        navigate('/mcq-test', { replace: true });
        setQuizState('selecting');
        setQuestions([]);
        setAvailableQuizzes([]);
        setSelectedQuiz(null);
    };

    const handleRefresh = useCallback(async () => {
        if (quizState === 'selecting') {
            await fetchCategories();
        } else if (quizState === 'quiz_list' && categoryKey) {
            await fetchQuizzes(categoryKey);
        }
    }, [quizState, fetchCategories, fetchQuizzes, categoryKey]);

    const passingScore = selectedQuiz?.settings.passingScore || QUIZ_SETTINGS.PASSING_SCORE_PERCENTAGE;
    const isPassed = useMemo(() => scorePercentage >= passingScore, [scorePercentage, passingScore]);
    
    const renderHeader = () => {
        const getHeaderProps = () => {
            switch (quizState) {
                case 'selecting': return { title: 'MCQ Test Portal', backAction: null, useLink: true };
                case 'loading': return { title: 'Finding Quizzes...', backAction: handleReset, useLink: false };
                case 'quiz_list': return { title: quizDetails.name, backAction: handleReset, useLink: false };
                case 'ready': return { title: 'Quiz Rules', backAction: () => setQuizState('quiz_list'), useLink: false };
                case 'in_progress':
                    return {
                        title: selectedQuiz?.title || quizDetails.name,
                        backAction: () => {
                            if (window.confirm('Are you sure you want to exit the quiz? Your current progress will be submitted and the quiz will end.')) {
                                handleSubmit();
                            }
                        },
                        useLink: false
                    };
                case 'finished': return { title: 'Quiz Results', backAction: handleReset, useLink: false };
                case 'review': return { title: 'Review Answers', backAction: () => setQuizState('finished'), useLink: false };
                default: return { title: 'MCQ Test', backAction: null, useLink: true };
            }
        };

        const { title, backAction, useLink } = getHeaderProps();
        
        const BackButton = () => {
            if (useLink) {
                return (
                    <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                        <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                    </Link>
                );
            }
            if (backAction) {
                return (
                    <button onClick={backAction} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back">
                        <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                    </button>
                );
            }
            return <div className="w-10"></div>; // Spacer
        };

        return (
            <header className="sticky top-0 p-4 flex items-center justify-between border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <BackButton />
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 truncate">{title}</h1>
                </div>
                <div className="w-10 flex justify-center">
                    <ExamIcon className="h-6 w-6 text-purple-500" />
                </div>
            </header>
        );
    };

    return (
        <PullToRefresh 
            onRefresh={handleRefresh} 
            disabled={!['selecting', 'quiz_list'].includes(quizState)}
            className="max-w-md mx-auto bg-gray-100 dark:bg-gray-900 h-screen flex flex-col overflow-y-auto pb-24"
        >
            {renderHeader()}
            <main className="flex-1 flex flex-col">
                {quizState === 'selecting' && <CategorySelectionScreen onSelectCategory={handleCategorySelect} categories={allCategories} loading={loadingCategories} preselectedMainCategoryKey={mainCategoryKey} />}
                {quizState === 'loading' && <LoadingScreen message="Finding quizzes..."/>}
                {quizState === 'quiz_list' && <QuizListScreen quizzes={availableQuizzes} onSelectQuiz={handleQuizSelect} />}
                {quizState === 'ready' && <StartScreen onStart={startQuiz} details={quizDetails} quiz={selectedQuiz} />}
                {quizState === 'in_progress' && questions.length > 0 && (
                    <QuizScreen
                        question={questions[currentQuestionIndex]}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={questions.length}
                        selectedAnswer={userAnswers[currentQuestionIndex]}
                        onAnswerSelect={handleAnswerSelect}
                        onNext={handleNextQuestion}
                        onSubmit={handleSubmit}
                    />
                )}
                {quizState === 'finished' && (
                    <div className="p-4 flex-1 flex items-center">
                        <ResultScreen
                            score={score}
                            totalQuestions={questions.length}
                            scorePercentage={scorePercentage}
                            isPassed={isPassed}
                            passingScore={passingScore}
                            onReview={() => setQuizState('review')}
                            onTryAgain={handleTryAgain}
                            onChooseAnother={handleReset}
                        />
                    </div>
                )}
                {quizState === 'review' && (
                     <div className="p-4 overflow-y-auto">
                        <ReviewScreen
                            questions={questions}
                            userAnswers={userAnswers}
                            onBackToResults={() => setQuizState('finished')}
                            showExplanation={showExplanation}
                            setShowExplanation={setShowExplanation}
                        />
                    </div>
                )}
            </main>
            {quizState === 'selecting' && <Footer />}
        </PullToRefresh>
    );
};

const CategorySelectionScreen: React.FC<{
    onSelectCategory: (key: string) => void, 
    categories: MCQCategoryStructure, 
    loading: boolean,
    preselectedMainCategoryKey?: string | null
}> = ({ onSelectCategory, categories, loading, preselectedMainCategoryKey }) => {
    const navigate = useNavigate();

    const selectedMainCategory = useMemo(() => {
        if (preselectedMainCategoryKey && categories.length > 0) {
            return categories.find(c => c.key === preselectedMainCategoryKey) || null;
        }
        return null;
    }, [preselectedMainCategoryKey, categories]);

    const handleMainCategoryClick = (category: MainQuizCategory) => {
        navigate(`/mcq-test?mainCategory=${category.key}`, { replace: true });
    };
    
    const handleBack = () => {
        // Navigate to the base MCQ page to clear URL params and show the main list.
        navigate('/mcq-test', { replace: true });
    };

    if (loading) {
        return <LoadingScreen message="Loading categories..." />;
    }

    return (
        <div className="p-4 animate-fade-in-scale flex-1 flex flex-col">
             <header className="py-4 text-center">
                <ExamIcon className="h-16 w-16 mx-auto text-purple-500 mb-2"/>
                <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                    {selectedMainCategory ? `Select a subject under ${selectedMainCategory.title}` : 'Choose your field of study to begin a tailored quiz.'}
                </p>
            </header>
            
            <div className="mt-6 flex-1">
                {!selectedMainCategory ? (
                    <div className="space-y-4">
                        {categories.map(cat => {
                            const fromColor = cat.color.replace('bg-', 'from-');
                            const toColor = `to-${cat.color.split('-')[1]}-700`;
                             const Icon = ICONS_MAP[cat.iconKey] || ExamIcon;
                            return (
                             <button 
                                 key={cat.id} 
                                 onClick={() => handleMainCategoryClick(cat)}
                                 className={`w-full text-left p-6 rounded-2xl flex items-center justify-between text-white shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${fromColor} ${toColor} bg-gradient-to-br`}
                             >
                                <div className="flex items-center">
                                    <Icon className="h-12 w-12 text-white" />
                                    <span className="text-2xl font-bold ml-4">{cat.title}</span>
                                </div>
                                <ChevronRightIcon className="h-8 w-8" />
                             </button>
                            )
                        })}
                    </div>
                ) : (
                     <div className="animate-fade-in">
                         <button onClick={handleBack} className="mb-4 flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">
                             <ArrowLeftIcon className="h-4 w-4 mr-2" /> Back to Main Categories
                         </button>
                        <div className="space-y-3">
                            {(selectedMainCategory.subCategories || []).map(subCat => {
                                const Icon = ICONS_MAP[subCat.iconKey] || ExamIcon;
                                return (
                                 <button
                                    key={subCat.key}
                                    onClick={() => onSelectCategory(subCat.key)}
                                    className="w-full p-4 rounded-xl shadow-md flex items-center bg-white dark:bg-gray-800 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className={`p-3 rounded-lg ${subCat.color}`}>
                                       <Icon className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="ml-4 text-left flex-1">
                                        <h4 className="font-bold text-gray-800 dark:text-white">{subCat.name}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{subCat.description}</p>
                                    </div>
                                    <ChevronRightIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const LoadingScreen: React.FC<{message?: string}> = ({ message = "Preparing Your Quiz..."}) => (
    <div className="flex flex-col flex-1 items-center justify-center text-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{message}</h2>
        <p className="text-gray-500">Please wait a moment!</p>
    </div>
);

const QuizListScreen: React.FC<{ quizzes: QuizDocument[], onSelectQuiz: (quiz: QuizDocument) => void }> = ({ quizzes, onSelectQuiz }) => (
    <div className="p-4 animate-fade-in-scale flex-1">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">Available Quizzes</h2>
        {quizzes.length > 0 ? (
            <div className="space-y-4">
                {quizzes.map(quiz => {
                    const questionCount = quiz.settings?.displayQuestions || quiz.questions.length;
                    return (
                        <button
                            key={quiz.id}
                            onClick={() => onSelectQuiz(quiz)}
                            className="w-full text-left p-4 rounded-xl shadow-md flex items-center bg-white dark:bg-gray-800 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                        >
                            <div className="p-3 rounded-lg bg-purple-500">
                                <ListBulletIcon className="h-8 w-8 text-white" />
                            </div>
                            <div className="ml-4 flex-1">
                                <h4 className="font-bold text-gray-800 dark:text-white">{quiz.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{questionCount} Questions</p>
                            </div>
                            <ChevronRightIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        </button>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-10">
                <ExamIcon className="h-16 w-16 mx-auto text-gray-400" />
                <p className="mt-4 text-gray-500">No published quizzes found for this category yet.</p>
                <p className="text-sm text-gray-400">Please check back later.</p>
            </div>
        )}
    </div>
);


const StartScreen: React.FC<{ onStart: () => void, details: any, quiz: QuizDocument | null }> = ({ onStart, details, quiz }) => {
    const totalAvailableQuestions = quiz?.questions.length || 0;
    const questionsToShow = quiz?.settings.displayQuestions || totalAvailableQuestions;

    return (
        <div className="flex flex-col flex-1 animate-fade-in-scale p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mt-4 text-center">
                <h2 className="text-2xl font-bold text-center mb-2 text-gray-800 dark:text-gray-100">{quiz?.title || 'Quiz Instructions'}</h2>
                <p className="text-center text-sm text-purple-600 dark:text-purple-400 mb-6">{details.name}</p>
                <ul className="space-y-4 text-gray-600 dark:text-gray-300 text-left">
                    <li className="flex items-start">
                        <ListBulletIcon className="h-6 w-6 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>This quiz has a total of <span className="font-bold">{questionsToShow} questions</span>.</span>
                    </li>
                    <li className="flex items-start">
                        <ClockIcon className="h-6 w-6 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>Each question has a <span className="font-bold">20 second</span> timer.</span>
                    </li>
                     <li className="flex items-start">
                        <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>You need <span className="font-bold">{quiz?.settings.passingScore || QUIZ_SETTINGS.PASSING_SCORE_PERCENTAGE}%</span> to pass the test.</span>
                    </li>
                    <li className="flex items-start">
                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>Do not refresh the page while taking the quiz.</span>
                    </li>
                </ul>
            </div>
            
            <div className="text-center mt-auto pb-4">
                 <button 
                    onClick={onStart} 
                    disabled={totalAvailableQuestions === 0}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-blue-700 transition-all text-lg shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
                 >
                    Start Quiz Now <ArrowRightIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};

const QuizScreen: React.FC<{ question: MCQQuestion, questionNumber: number, totalQuestions: number, selectedAnswer: number | null, onAnswerSelect: (index: number) => void, onNext: () => void, onSubmit: () => void }> = ({ question, questionNumber, totalQuestions, selectedAnswer, onAnswerSelect, onNext, onSubmit }) => {
    const [timeLeft, setTimeLeft] = useState(20);

    useEffect(() => {
        setTimeLeft(20);

        const timerId = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timerId);
                    onNext();
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [question, onNext]);


    const handleNextClick = () => {
        if (questionNumber < totalQuestions) {
            onNext();
        } else {
            onSubmit();
        }
    };
    
    // Strip any leading "1. " or "A) " from the question text to fix numbering issues
    const formattedQuestion = question.question.replace(/^\d+[.)]\s*/, '');
    const timerPercentage = (timeLeft / 20) * 100;

    return (
    <div className="flex flex-col flex-1 p-4 animate-fade-in">
        <div className="mb-6">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                <p>Question {questionNumber} of {totalQuestions}</p>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex-1 flex flex-col">
            <p className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">{questionNumber}. {formattedQuestion}</p>
            
            <div className="my-4">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Time Remaining</span>
                    <span className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-200'}`}>
                        {timeLeft}s
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                        className={`h-2.5 rounded-full transition-all duration-300 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-600'}`}
                        style={{ width: `${timerPercentage}%` }}
                    ></div>
                </div>
                {timeLeft <= 5 && (
                    <button onClick={onNext} className="mt-4 block mx-auto px-4 py-1 bg-yellow-500 text-white text-sm font-semibold rounded-full hover:bg-yellow-600 transition-colors">
                        Skip Question
                    </button>
                )}
            </div>

            <fieldset className="space-y-4 mt-auto">
                <legend className="sr-only">Options for {question.question}</legend>
                {question.options.map((option, index) => (
                    <div key={index}>
                        <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${selectedAnswer === index ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500' : 'bg-transparent border-gray-200 dark:border-gray-600 hover:border-blue-400'}`}>
                            <input
                                type="radio"
                                name={`quiz-option-${question.id}`}
                                value={index}
                                checked={selectedAnswer === index}
                                onChange={() => onAnswerSelect(index)}
                                className="h-5 w-5 mr-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-500"
                            />
                            <span className="text-gray-700 dark:text-gray-200">{option}</span>
                        </label>
                    </div>
                ))}
            </fieldset>
        </div>

        <div className="mt-6 pb-2">
            <button 
                onClick={handleNextClick}
                disabled={selectedAnswer === null}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-blue-700 transition-all text-lg shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {questionNumber < totalQuestions ? 'Next Question' : 'Submit Answers'}
                <ArrowRightIcon className="h-6 w-6" />
            </button>
        </div>
    </div>
    );
};

const ResultStat: React.FC<{ icon: React.ElementType, value: string | number, label: string, color: string }> = ({ icon: Icon, value, label, color }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-300' },
        green: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300' },
        red: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-300' },
        yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-300' },
    };
    const C = color as keyof typeof colorClasses;
    
    return (
        <div className={`p-4 rounded-xl flex items-center gap-4 ${colorClasses[C].bg}`}>
            <div className={`p-2 rounded-full`}>
                 <Icon className={`h-8 w-8 ${colorClasses[C].text}`} />
            </div>
            <div>
                <p className={`text-2xl font-bold ${colorClasses[C].text}`}>{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
        </div>
    );
};

const ResultScreen: React.FC<{ score: number, totalQuestions: number, scorePercentage: number, isPassed: boolean, passingScore: number, onReview: () => void, onTryAgain: () => void, onChooseAnother: () => void }> = ({ score, totalQuestions, scorePercentage, isPassed, passingScore, onReview, onTryAgain, onChooseAnother }) => {
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full text-center animate-fade-in-scale">
            <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
            {isPassed ? (
                <div className="text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                    <CheckCircleIcon className="h-6 w-6" />
                    <p className="font-semibold">Congratulations! You passed.</p>
                </div>
            ) : (
                <div className="text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
                    <XCircleIcon className="h-6 w-6" />
                    <p className="font-semibold">Better luck next time. You failed.</p>
                </div>
            )}
            
            <div className="my-8">
                <div className={`relative w-32 h-32 mx-auto flex items-center justify-center rounded-full ${isPassed ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                    <span className={`text-4xl font-bold ${isPassed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{scorePercentage.toFixed(0)}%</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
                <ResultStat icon={ListBulletIcon} value={totalQuestions} label="Total Questions" color="blue" />
                <ResultStat icon={CheckCircleIcon} value={score} label="Correct" color="green" />
                <ResultStat icon={XCircleIcon} value={totalQuestions - score} label="Incorrect" color="red" />
                <ResultStat icon={AcademicCapIcon} value={`${passingScore}%`} label="Passing Score" color="yellow" />
            </div>
            
             <div className="grid grid-cols-2 gap-4 mt-8">
                <button onClick={onTryAgain} className="flex items-center justify-center gap-2 py-3 bg-gray-200 dark:bg-gray-600 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500">
                    <ArrowUturnLeftIcon className="h-5 w-5" /> Try Again
                </button>
                <button onClick={onReview} className="flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
                   <SparklesIcon className="h-5 w-5" /> Review
                </button>
                 <button onClick={onChooseAnother} className="col-span-2 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                   <ListBulletIcon className="h-5 w-5" /> Choose Another Quiz
                </button>
            </div>
        </div>
    );
};

const ReviewScreen: React.FC<{ questions: MCQQuestion[], userAnswers: (number | null)[], onBackToResults: () => void, showExplanation: string|number|null, setShowExplanation: (id: string|number|null)=>void }> = ({ questions, userAnswers, onBackToResults, showExplanation, setShowExplanation }) => (
     <div className="animate-fade-in">
        <div className="space-y-4">
            {questions.map((q, index) => {
                const userAnswer = userAnswers[index];
                const isCorrect = userAnswer === q.correctOptionIndex;
                const questionId = q.id || index;
                const formattedQuestion = q.question.replace(/^\d+[.)]\s*/, '');
                return (
                    <div key={questionId} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <p className="font-semibold mb-3 text-gray-800 dark:text-gray-200">{index + 1}. {formattedQuestion}</p>
                        <div className="space-y-2">
                            {q.options.map((option, optIndex) => {
                                let optionClass = "border-gray-200 dark:border-gray-600";
                                if (optIndex === q.correctOptionIndex) {
                                    optionClass = "bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200";
                                } else if (optIndex === userAnswer && !isCorrect) {
                                     optionClass = "bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200";
                                }
                                return (
                                    <div key={optIndex} className={`p-3 rounded-md border-2 text-sm ${optionClass}`}>
                                        {option}
                                        {optIndex === q.correctOptionIndex && " (Correct)"}
                                        {optIndex === userAnswer && !isCorrect && " (Your Answer)"}
                                    </div>
                                )
                            })}
                        </div>
                        {q.explanation && (
                            <div className="mt-3">
                                <button onClick={() => setShowExplanation(showExplanation === questionId ? null : questionId)} className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1 font-semibold">
                                    <LightBulbIcon className="h-4 w-4" /> {showExplanation === questionId ? 'Hide' : 'Show'} Explanation
                                </button>
                                {showExplanation === questionId && (
                                    <p className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md text-sm animate-fade-in">
                                        {q.explanation}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
         <button onClick={onBackToResults} className="mt-6 w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
            Back to Results
        </button>
    </div>
);


export default MCQTestPage;