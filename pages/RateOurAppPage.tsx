import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, StarIcon } from '@heroicons/react/24/solid';

const RateOurAppPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900 pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Profile">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                </Link>
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Rate Our App</h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
                    <StarIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Enjoying Loksewa Guru?</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Your feedback helps us improve. If you love our app, please take a moment to leave a review on the app store.
                    </p>
                    <div className="mt-6">
                        <p className="font-semibold">How to rate:</p>
                        <ol className="text-left list-decimal list-inside mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <li>Open the App Store or Google Play Store.</li>
                            <li>Search for "Loksewa Guru".</li>
                            <li>Tap on our app from the search results.</li>
                            <li>Leave a rating and write a review.</li>
                        </ol>
                    </div>
                    <p className="mt-6 text-lg font-semibold text-purple-600 dark:text-purple-400">Thank you for your support!</p>
                </div>
            </main>
        </div>
    );
};

export default RateOurAppPage;
