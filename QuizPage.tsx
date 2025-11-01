
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OLD_QUIZ_CATEGORIES, QuizIcon } from '../constants';
import type { QuizCategory } from '../types';
import { ArrowLeftIcon, ChevronRightIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const OldQuizCategoryCard: React.FC<{ category: QuizCategory }> = ({ category }) => {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { subscriptionLocks } = useData();

    const handleClick = () => {
        const isSubscribed = user?.subscriptionStatus === 'active';
        // The "MCQ Test" service governs all these old quiz categories.
        const isLocked = subscriptionLocks['mcq-test'] === true;

        if (isLocked && !isSubscribed && !isAdmin) {
            window.dispatchEvent(new CustomEvent('open-subscription-modal'));
        } else {
            navigate(`${category.path}?category=${category.key}`);
        }
    };

    return (
        <button 
            onClick={handleClick}
            className="w-full text-left flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
        >
            <div className={`p-3 rounded-lg ${category.color}`}>
                {React.cloneElement(category.icon as React.ReactElement, { className: "h-8 w-8 text-white" })}
            </div>
            <div className="ml-4 flex-1">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{category.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
            </div>
            <ChevronRightIcon className="h-6 w-6 text-gray-400" />
        </button>
    );
};

const PracticeCategoryCard: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { subscriptionLocks } = useData();

    const handleClick = () => {
        const isSubscribed = user?.subscriptionStatus === 'active';
        const isLocked = subscriptionLocks['questions-practice'] === true;

        if (isLocked && !isSubscribed && !isAdmin) {
            window.dispatchEvent(new CustomEvent('open-subscription-modal'));
        } else {
            navigate('/questions-practice');
        }
    };
    
    return (
        <button 
            onClick={handleClick}
            className="w-full text-left flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
        >
            <div className={`p-3 rounded-lg bg-indigo-500`}>
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4 flex-1">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">Questions Practice</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Practice by course and set, without a timer.</p>
            </div>
            <ChevronRightIcon className="h-6 w-6 text-gray-400" />
        </button>
    );
};

const QuizPage: React.FC = () => {
    return (
        <div className="max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </Link>
                 <div className="flex-1 text-center">
                     <div className="flex items-center justify-center gap-2">
                        <QuizIcon className="h-6 w-6 text-green-500" />
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Classic Quizzes</h1>
                    </div>
                 </div>
                 <div className="w-10"></div>
            </header>
            
            <main className="p-4">
                 <div className="text-center mb-6 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h2 className="font-semibold text-green-800 dark:text-green-200">Practice by Subject</h2>
                    <p className="text-sm text-green-700 dark:text-green-300">Choose from our classic list of quiz categories to start practicing.</p>
                </div>
                <div className="space-y-4">
                    <PracticeCategoryCard />
                    {OLD_QUIZ_CATEGORIES.map(category => (
                        <OldQuizCategoryCard key={category.name} category={category} />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default QuizPage;
