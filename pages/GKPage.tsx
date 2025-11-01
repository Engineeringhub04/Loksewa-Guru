

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobeIcon } from '../constants';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const GKPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin } = useAuth();
  const { subscriptionLocks } = useData();

  const handleStartQuiz = () => {
      const { login: loginRequired, subscription: subscriptionRequired } = subscriptionLocks['gk-questions'] || {};

      if (loginRequired && !isLoggedIn) {
          window.dispatchEvent(new CustomEvent('open-login-modal'));
          return;
      }
      
      const isSubscribed = user?.subscriptionStatus === 'active';
      if (subscriptionRequired && !isSubscribed && !isAdmin) {
          window.dispatchEvent(new CustomEvent('open-subscription-modal'));
      } else {
          navigate('/mcq-test?category=gk');
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
                    <GlobeIcon className="h-6 w-6 text-red-500" />
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">GK Questions</h1>
                </div>
             </div>
             <div className="w-10"></div>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg animate-fade-in-scale">
                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center bg-red-100 dark:bg-gray-700 mb-6">
                    <GlobeIcon className="h-16 w-16 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">Expand Your General Knowledge</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                   Stay updated with national and international affairs. Our GK quizzes cover history, geography, politics, and current events relevant to Loksewa exams.
                </p>
                <button 
                    onClick={handleStartQuiz}
                    className="inline-block w-full bg-red-500 text-white font-bold py-4 px-6 rounded-lg hover:bg-red-600 transition-all text-lg shadow-md hover:shadow-lg"
                >
                    Start GK Quiz
                </button>
            </div>
        </main>
        
        <Footer />
    </div>
  );
};

export default GKPage;