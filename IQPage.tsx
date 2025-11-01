import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainIcon } from '../constants';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const IQPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscriptionLocks } = useData();

  const handleStartQuiz = () => {
    const isSubscribed = user?.subscriptionStatus === 'active';
    // Assuming the key for IQ questions is 'iq-questions' as in constants.ts
    const isLocked = subscriptionLocks['iq-questions'] === true;

    if (isLocked && !isSubscribed) {
      window.dispatchEvent(new CustomEvent('open-subscription-modal'));
    } else {
      navigate('/mcq-test?category=iq');
    }
  };


  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 pb-24">
        <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
             <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
             </button>
             <div className="flex-1 text-center">
                 <div className="flex items-center justify-center gap-2">
                    <BrainIcon className="h-6 w-6 text-purple-500" />
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">IQ Questions</h1>
                </div>
             </div>
             <div className="w-10"></div>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg animate-fade-in-scale">
                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center bg-purple-100 dark:bg-gray-700 mb-6">
                    <BrainIcon className="h-16 w-16 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">Test Your Intelligence Quotient</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Sharpen your logical, analytical, and problem-solving skills with our curated set of IQ questions. These tests are designed to help you prepare for the challenges in Loksewa exams.
                </p>
                <button 
                    onClick={handleStartQuiz}
                    className="inline-block w-full bg-purple-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-purple-700 transition-all text-lg shadow-md hover:shadow-lg"
                >
                    Start IQ Quiz
                </button>
            </div>
        </main>
        
        <Footer />
    </div>
  );
};

export default IQPage;