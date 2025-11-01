import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

const DisclaimerPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900 pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Profile">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                </Link>
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Disclaimer</h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md prose prose-sm dark:prose-invert max-w-none">
                    <h2>General Information</h2>
                    <p>
                        The information provided by Loksewa Guru ("we," "us," or "our") on our mobile application is for general informational purposes only. All information on the app is provided in good faith, however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the app.
                    </p>
                    
                    <h2>Not an Official PSC Source</h2>
                    <p>
                        Loksewa Guru is an independent platform created to aid in the preparation for Public Service Commission (PSC) exams. We are not affiliated with, endorsed by, or in any way officially connected with the Public Service Commission of Nepal or any of its subsidiaries or its affiliates. The official PSC website should be consulted for official announcements, syllabuses, and results.
                    </p>
                    
                    <h2>External Links Disclaimer</h2>
                    <p>
                        The app may contain links to other websites or content belonging to or originating from third parties. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default DisclaimerPage;
