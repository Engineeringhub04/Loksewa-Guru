import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

interface AuthHeaderProps {
    title: string;
    backPath?: string;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ title, backPath = '/' }) => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 w-full max-w-md p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900 z-10">
            <button 
                onClick={() => navigate(backPath)} 
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Go back"
            >
                <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 absolute left-1/2 -translate-x-1/2">
                {title}
            </h1>
            <div className="w-10"></div> {/* Spacer to balance the header */}
        </header>
    );
};

export default AuthHeader;