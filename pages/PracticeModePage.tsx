import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { PracticeSet, MCQQuestion } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, LightBulbIcon } from '@heroicons/react/24/solid';

type PracticeState = 'loading' | 'in_progress' | 'finished';

const PracticeModePage: React.FC = () => {
    const { courseKey, setId } = useParams<{ courseKey: string; setId: string }>();
    const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
    const [questions, setQuestions] = useState<MCQQuestion[]>([]);
    const [state, setState] = useState<PracticeState>('loading');
    
    const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);

    useEffect(() => {
        if (!setId) return;
        const fetchSet = async () => {
            setState('loading');
            try {
                const docRef = doc(db, 'practiceSets', setId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as PracticeSet;
                    setPracticeSet(data);
                    
                    // Shuffle the questions for a new random order each time
                    const shuffledQuestions = [...data.questions].sort(() => Math.random() - 0.5);

                    let questionsToDisplay = shuffledQuestions;
                    if (data.settings?.displayQuestions && data.settings.displayQuestions > 0 && data.settings.displayQuestions < shuffledQuestions.length) {
                        questionsToDisplay = shuffledQuestions.slice(0, data.settings.displayQuestions);
                    }
                    const loadedQuestions = questionsToDisplay.map((q, i) => ({ ...q, id: `q-${i}` }));

                    setQuestions(loadedQuestions);
                    setUserAnswers(new Array(loadedQuestions.length).fill(null));
                    setState('in_progress');
                } else {
                    console.error("Practice set not found");
                }
            } catch (error) {
                console.error("Error fetching set:", error);
            }
        };
        fetchSet();
    }, [setId]);
    
    const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
        const newAnswers = [...userAnswers];
        newAnswers[questionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const handleSubmit = () => {
        setState('finished');
        window.scrollTo(0, 0); // Scroll to top to see results
    };

    const handlePracticeAgain = () => {
        // Re-shuffle and reset answers for a new attempt
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
        setUserAnswers(new Array(questions.length).fill(null));
        setState('in_progress');
        window.scrollTo(0, 0);
    };

    const score = useMemo(() => {
        return userAnswers.reduce((correct, answer, index) => {
            if (answer !== null && questions[index] && answer === questions[index].correctOptionIndex) {
                return correct + 1;
            }
            return correct;
        }, 0);
    }, [userAnswers, questions]);

    const allQuestionsAnswered = useMemo(() => userAnswers.every(answer => answer !== null), [userAnswers]);

    if (state === 'loading' || !practiceSet) {
        return <div className="p-6 text-center">Loading Practice...</div>;
    }

    return (
        <div className="max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <Link to={`/questions-practice/${courseKey}`} className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-6 w-6" />
                </Link>
                <div className="flex-1 overflow-hidden">
                    <h1 className="text-xl font-bold truncate text-gray-800 dark:text-gray-100">{practiceSet.title}</h1>
                </div>
            </header>

            <main className="p-4">
                {state === 'in_progress' && (
                    <div className="space-y-6">
                        {questions.map((q, index) => (
                            <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                                <p className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">{index + 1}. {q.question}</p>
                                <fieldset className="space-y-3">
                                    <legend className="sr-only">Options for question {index + 1}</legend>
                                    {q.options.map((option, optIndex) => (
                                        <label key={optIndex} className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-colors ${userAnswers[index] === optIndex ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500' : 'bg-transparent border-gray-200 dark:border-gray-600 hover:border-blue-400'}`}>
                                            <input
                                                type="radio"
                                                name={`question-${q.id}`}
                                                checked={userAnswers[index] === optIndex}
                                                onChange={() => handleAnswerSelect(index, optIndex)}
                                                className="h-5 w-5 mr-3 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-500"
                                            />
                                            <span className="text-gray-700 dark:text-gray-200">{option}</span>
                                        </label>
                                    ))}
                                </fieldset>
                            </div>
                        ))}
                        <button 
                            onClick={handleSubmit} 
                            disabled={!allQuestionsAnswered}
                            className="w-full mt-8 px-6 py-4 bg-purple-600 text-white rounded-lg font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Submit Answers
                        </button>
                    </div>
                )}

                {state === 'finished' && (
                     <div className="space-y-6">
                        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                            <p className="text-lg">You Scored</p>
                            <p className="text-5xl font-bold my-2 text-purple-600 dark:text-purple-400">{score} / {questions.length}</p>
                            <p className="font-semibold">{questions.length > 0 ? ((score / questions.length) * 100).toFixed(0) : 0}%</p>
                            <button onClick={handlePracticeAgain} className="mt-6 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg">
                                Practice Again
                            </button>
                        </div>
                        <h2 className="text-xl font-bold text-center">Review Answers</h2>
                        {questions.map((q, index) => {
                            const userAnswer = userAnswers[index];
                            const isCorrect = userAnswer === q.correctOptionIndex;
                            return (
                                <div key={q.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                                    <p className="font-semibold mb-3 text-gray-800 dark:text-gray-200">{index + 1}. {q.question}</p>
                                    <div className="space-y-2">
                                        {q.options.map((option, optIndex) => (
                                            <div key={optIndex} className={`p-3 rounded-md border-2 text-sm flex items-center gap-2 ${optIndex === q.correctOptionIndex ? 'bg-green-100 dark:bg-green-900/50 border-green-500' : (optIndex === userAnswer ? 'bg-red-100 dark:bg-red-900/50 border-red-500' : 'border-gray-200 dark:border-gray-600')}`}>
                                                {optIndex === q.correctOptionIndex && <CheckCircleIcon className="h-5 w-5 text-green-600"/>}
                                                {optIndex === userAnswer && !isCorrect && <XCircleIcon className="h-5 w-5 text-red-600"/>}
                                                <span>{option}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {q.explanation && <p className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md text-sm"><LightBulbIcon className="h-4 w-4 inline mr-1"/> {q.explanation}</p>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PracticeModePage;
