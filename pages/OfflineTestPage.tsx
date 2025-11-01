import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy as f_orderBy, Timestamp } from 'firebase/firestore';
import { QUIZ_SETTINGS, OfflineIcon } from '../constants';
import type { MCQQuestion, OfflineTest } from '../types';
import { 
    ArrowLeftIcon, 
    ClockIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    SparklesIcon, 
    ArrowUturnLeftIcon, 
    ArrowRightIcon,
    ListBulletIcon,
    AcademicCapIcon,
    ChevronRightIcon,
    LightBulbIcon
} from '@heroicons/react/24/solid';
import PullToRefresh from '../components/PullToRefresh';

type QuizState = 'selecting' | 'loading' | 'ready' | 'in_progress' | 'finished' | 'review';

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};


const LoadingScreen: React.FC<{message?: string}> = ({ message = "Preparing Quiz..."}) => (
    <div className="flex flex-col flex-1 items-center justify-center text-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{message}</h2>
    </div>
);

const QuizScreen: React.FC<{ question: MCQQuestion, questionNumber: number, totalQuestions: number, selectedAnswer: number | null, onAnswerSelect: (index: number) => void, onNext: () => void, onSubmit: () => void }> = ({ question, questionNumber, totalQuestions, selectedAnswer, onAnswerSelect, onNext, onSubmit }) => {
    const [timeLeft, setTimeLeft] = useState(QUIZ_SETTINGS.TIME_LIMIT_SECONDS);

    useEffect(() => {
        setTimeLeft(QUIZ_SETTINGS.TIME_LIMIT_SECONDS);
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
        if (questionNumber < totalQuestions) onNext();
        else onSubmit();
    };
    
    const timerPercentage = (timeLeft / QUIZ_SETTINGS.TIME_LIMIT_SECONDS) * 100;

    return (
    <div className="flex flex-col flex-1 p-4 animate-fade-in">
        <div className="mb-6"><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}></div></div><p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Question {questionNumber} of {totalQuestions}</p></div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex-1 flex flex-col"><p className="text-xl font-bold mb-4">{question.question}</p>
            <div className="my-4">
                <div className="flex items-center justify-between text-sm mb-2"><span className="text-gray-500 dark:text-gray-400">Time Remaining</span><span className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}`}>{timeLeft}s</span></div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className={`h-2.5 rounded-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-600'}`} style={{ width: `${timerPercentage}%` }}></div></div>
                {timeLeft <= 5 && <button onClick={onNext} className="mt-4 block mx-auto px-4 py-1 bg-yellow-500 text-white text-sm font-semibold rounded-full">Skip Question</button>}
            </div>
            <fieldset className="space-y-4 mt-auto">
                {question.options.map((option, index) => (
                    <label key={index} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer ${selectedAnswer === index ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500' : 'bg-transparent border-gray-200 dark:border-gray-600 hover:border-blue-400'}`}>
                        <input type="radio" checked={selectedAnswer === index} onChange={() => onAnswerSelect(index)} className="h-5 w-5 mr-4 text-blue-600"/><span>{option}</span>
                    </label>
                ))}
            </fieldset>
        </div>
        <button onClick={handleNextClick} disabled={selectedAnswer === null} className="w-full mt-6 py-4 bg-blue-600 text-white font-bold rounded-xl text-lg disabled:bg-gray-400">{questionNumber < totalQuestions ? 'Next Question' : 'Submit'}</button>
    </div>
    );
};

const ResultStat: React.FC<{ icon: React.ElementType, value: string | number, label: string, color: string }> = ({ icon: Icon, value, label, color }) => (
    <div className={`p-3 rounded-xl flex items-center gap-3 bg-${color}-100 dark:bg-${color}-900/50`}><Icon className={`h-8 w-8 text-${color}-600 dark:text-${color}-300`} /><div><p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-200`}>{value}</p><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p></div></div>
);

const ResultScreen: React.FC<{ score: number, totalQuestions: number, scorePercentage: number, isPassed: boolean, passingScore: number, onReview: () => void, onTryAgain: () => void, onChooseAnother: () => void }> = ({ score, totalQuestions, scorePercentage, isPassed, passingScore, onReview, onTryAgain, onChooseAnother }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full text-center animate-fade-in-scale">
        <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
        <div className={`flex items-center justify-center gap-2 font-semibold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>{isPassed ? <CheckCircleIcon className="h-6 w-6"/> : <XCircleIcon className="h-6 w-6"/>}<p>{isPassed ? 'Congratulations! You passed.' : 'Better luck next time.'}</p></div>
        <p className="text-5xl font-bold my-6">{scorePercentage.toFixed(0)}%</p>
        <div className="grid grid-cols-2 gap-4 text-left"><ResultStat icon={ListBulletIcon} value={totalQuestions} label="Total" color="blue" /><ResultStat icon={CheckCircleIcon} value={score} label="Correct" color="green" /><ResultStat icon={XCircleIcon} value={totalQuestions - score} label="Incorrect" color="red" /><ResultStat icon={AcademicCapIcon} value={`${passingScore}%`} label="To Pass" color="yellow" /></div>
        <div className="grid grid-cols-2 gap-4 mt-8"><button onClick={onTryAgain} className="py-3 bg-gray-200 dark:bg-gray-600 rounded-lg font-semibold flex items-center justify-center gap-2"><ArrowUturnLeftIcon className="h-5 w-5"/> Try Again</button><button onClick={onReview} className="py-3 bg-purple-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2"><SparklesIcon className="h-5 w-5"/> Review</button><button onClick={onChooseAnother} className="col-span-2 py-3 bg-blue-600 text-white rounded-lg font-semibold">Choose Another Quiz</button></div>
    </div>
);

const ReviewScreen: React.FC<{ questions: MCQQuestion[], userAnswers: (number | null)[] }> = ({ questions, userAnswers }) => (
    <div className="animate-fade-in space-y-4">
        {questions.map((q, index) => {
            const userAnswer = userAnswers[index]; const isCorrect = userAnswer === q.correctOptionIndex;
            return <div key={q.id || index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"><p className="font-semibold mb-3">{index + 1}. {q.question}</p><div className="space-y-2">{q.options.map((option, optIndex) => <div key={optIndex} className={`p-3 rounded-md border-2 text-sm ${optIndex === q.correctOptionIndex ? 'bg-green-100 dark:bg-green-900/50 border-green-500' : (optIndex === userAnswer ? 'bg-red-100 dark:bg-red-900/50 border-red-500' : 'border-gray-200 dark:border-gray-600')}`}>{option}</div>)}</div>{q.explanation && <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md text-sm"><LightBulbIcon className="h-4 w-4 inline mr-1"/> {q.explanation}</div>}</div>
        })}
    </div>
);


const OfflineTestPage: React.FC = () => {
    const [quizState, setQuizState] = useState<QuizState>('loading');
    const [availableQuizzes, setAvailableQuizzes] = useState<OfflineTest[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<OfflineTest | null>(null);
    const [questions, setQuestions] = useState<MCQQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);

    const fetchQuizzes = useCallback(async () => {
        setQuizState('loading');
        try {
            const q = query(collection(db, 'offlineTests'), where('status', '==', 'published'));
            const querySnapshot = await getDocs(q);
            const quizList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
                } as OfflineTest;
            });
            quizList.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
            setAvailableQuizzes(quizList);
        } catch (err) { console.error("Error fetching offline tests:", err); }
        finally { setQuizState('selecting'); }
    }, []);

    useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

    const handleQuizSelect = (quiz: OfflineTest) => { setSelectedQuiz(quiz); setQuizState('ready'); };

    const startQuiz = () => {
        if (!selectedQuiz) return;
        const baseQuestions = selectedQuiz.questions || [];
        const numQuestions = selectedQuiz.settings.displayQuestions || baseQuestions.length;
        let questionsToPlay = [...baseQuestions];
        if (selectedQuiz.settings.randomizeQuestions) questionsToPlay.sort(() => 0.5 - Math.random());
        const finalQuestions = questionsToPlay.slice(0, numQuestions);
        setQuestions(finalQuestions.map((q, i) => ({ ...q, id: `q-${i}` })));
        setUserAnswers(new Array(finalQuestions.length).fill(null));
        setCurrentQuestionIndex(0);
        setQuizState('in_progress');
    };

    const handleAnswerSelect = (optionIndex: number) => { const newAnswers = [...userAnswers]; newAnswers[currentQuestionIndex] = optionIndex; setUserAnswers(newAnswers); };
    
    const handleSubmit = useCallback(() => {
        setQuizState('finished');
    }, []);

    const handleNextQuestion = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    }, [currentQuestionIndex, questions.length, handleSubmit]);

    const score = useMemo(() => userAnswers.reduce((acc, answer, index) => (answer === questions[index]?.correctOptionIndex ? acc + 1 : acc), 0), [userAnswers, questions]);
    const scorePercentage = useMemo(() => (questions.length > 0 ? (score / questions.length) * 100 : 0), [score, questions.length]);
    const passingScore = selectedQuiz?.settings.passingScore || QUIZ_SETTINGS.PASSING_SCORE_PERCENTAGE;
    const isPassed = useMemo(() => scorePercentage >= passingScore, [scorePercentage, passingScore]);
    const handleTryAgain = () => { if (selectedQuiz) handleQuizSelect(selectedQuiz); };
    const handleReset = () => { setQuizState('selecting'); setSelectedQuiz(null); setQuestions([]); };
    
    const renderContent = () => {
        switch (quizState) {
            case 'loading': return <LoadingScreen message="Loading Offline Quizzes..." />;
            case 'selecting': return (
                <div className="p-4 animate-fade-in-scale flex-1">
                    <h2 className="text-xl font-bold text-center mb-6">Available Offline Tests</h2>
                    {availableQuizzes.length > 0 ? (
                        <div className="space-y-4">{availableQuizzes.map(quiz => (
                            <button key={quiz.id} onClick={() => handleQuizSelect(quiz)} className="w-full text-left p-4 rounded-xl shadow-md flex items-center bg-white dark:bg-gray-800 hover:-translate-y-1 hover:shadow-lg">
                                <div className="p-3 rounded-lg bg-gray-500"><OfflineIcon className="h-8 w-8 text-white" /></div>
                                <div className="ml-4 flex-1"><h4 className="font-bold">{quiz.title}</h4><p className="text-xs text-gray-500">{quiz.questions?.length || 0} Questions</p></div>
                                <ChevronRightIcon className="h-6 w-6 text-gray-400" />
                            </button>
                        ))}</div>
                    ) : <div className="text-center py-10"><OfflineIcon className="h-16 w-16 mx-auto text-gray-400" /><p className="mt-4 text-gray-500">No offline tests available.</p></div>}
                </div>
            );
            case 'ready': return (
                <div className="p-4 flex flex-col flex-1"><div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mt-4 text-center">
                    <h2 className="text-2xl font-bold mb-6">{selectedQuiz?.title}</h2>
                    <ul className="space-y-3 text-gray-600 dark:text-gray-300 text-left"><li className="flex items-start"><ListBulletIcon className="h-6 w-6 text-purple-500 mr-3"/><span>Total questions: {selectedQuiz?.questions?.length || 0}</span></li><li className="flex items-start"><CheckCircleIcon className="h-6 w-6 text-green-500 mr-3"/><span>Passing score: {selectedQuiz?.settings.passingScore}%</span></li></ul>
                </div><div className="mt-auto pb-4"><button onClick={startQuiz} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-lg">Start Quiz</button></div></div>
            );
            case 'in_progress': return <QuizScreen question={questions[currentQuestionIndex]} questionNumber={currentQuestionIndex + 1} totalQuestions={questions.length} selectedAnswer={userAnswers[currentQuestionIndex]} onAnswerSelect={handleAnswerSelect} onNext={handleNextQuestion} onSubmit={handleSubmit} />;
            case 'finished': return <div className="p-4 flex-1 flex items-center"><ResultScreen score={score} totalQuestions={questions.length} scorePercentage={scorePercentage} isPassed={isPassed} passingScore={passingScore} onReview={() => setQuizState('review')} onTryAgain={handleTryAgain} onChooseAnother={handleReset} /></div>;
            case 'review': return <div className="p-4 overflow-y-auto"><ReviewScreen questions={questions} userAnswers={userAnswers} /><button onClick={() => setQuizState('finished')} className="mt-6 w-full py-3 bg-purple-600 text-white rounded-lg">Back to Results</button></div>;
            default: return null;
        }
    };
    
    return (
        <PullToRefresh onRefresh={fetchQuizzes} className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 overflow-y-auto pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home"><ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" /></Link>
                <div className="flex-1 text-center"><div className="flex items-center justify-center gap-2"><OfflineIcon className="h-6 w-6 text-gray-500" /><h1 className="text-xl font-bold">Offline Tests</h1></div></div><div className="w-10"></div>
            </header>
            <main className="flex-1 flex flex-col">{renderContent()}</main>
        </PullToRefresh>
    );
};

export default OfflineTestPage;