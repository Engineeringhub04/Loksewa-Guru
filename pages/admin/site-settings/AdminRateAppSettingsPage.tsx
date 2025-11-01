import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, HandThumbUpIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

const AdminRateAppSettingsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate('/admin/profile-details')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <HandThumbUpIcon className="h-6 w-6" />
                    Rate Our App Page
                </h1>
            </header>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-4">
                <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                    <h2 className="font-semibold text-blue-800 dark:text-blue-200">Static Content</h2>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        The "Rate Our App" page is a static informational page. It contains instructions for users on how to rate the app in their respective app stores (Google Play Store or Apple App Store).
                        <br /><br />
                        There are no configurable settings for this page.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminRateAppSettingsPage;
