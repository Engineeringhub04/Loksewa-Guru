import React, { useState, useEffect } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/solid';
import type { Notification } from '../types';

interface ToastNotificationProps {
    notification: Notification;
    onClose: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ notification, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        // Wait for animation to finish before calling the parent onClose
        setTimeout(() => {
            onClose();
        }, 300);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, []);

    return (
        <div 
            className={`fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-4 z-[70] overflow-hidden ${isClosing ? 'animate-fade-out-up' : 'animate-fade-in-down'}`}
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <BellIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{notification.title}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{notification.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={handleClose} className="p-1 rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            {notification.imageUrl && (
                 <img src={notification.imageUrl} alt="Notification content" className="mt-3 w-full max-h-32 object-cover rounded-lg"/>
            )}
             {/* Progress Bar */}
             <div className="absolute bottom-0 left-0 h-1 bg-purple-500/50 dark:bg-purple-400/50 animate-fill-up"></div>
        </div>
    );
};

export default ToastNotification;
