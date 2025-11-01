import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface AdminToastNotificationProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const typeStyles = {
    success: {
        icon: CheckCircleIcon,
        bgColor: 'bg-green-50 dark:bg-green-900/30',
        textColor: 'text-green-800 dark:text-green-200',
        iconColor: 'text-green-500',
        progressColor: 'bg-green-500/50'
    },
    error: {
        icon: XCircleIcon,
        bgColor: 'bg-red-50 dark:bg-red-900/30',
        textColor: 'text-red-800 dark:text-red-200',
        iconColor: 'text-red-500',
        progressColor: 'bg-red-500/50'
    },
    info: {
        icon: InformationCircleIcon,
        bgColor: 'bg-blue-50 dark:bg-blue-900/30',
        textColor: 'text-blue-800 dark:text-blue-200',
        iconColor: 'text-blue-500',
        progressColor: 'bg-blue-500/50'
    },
};

const AdminToastNotification: React.FC<AdminToastNotificationProps> = ({ message, type, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);
    const styles = typeStyles[type];
    const Icon = styles.icon;

    const DURATION = 5000; // 5 seconds

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Wait for fade-out animation
    };

    useEffect(() => {
        const timer = setTimeout(handleClose, DURATION);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
         <div 
            className={`fixed top-20 right-6 w-full max-w-sm z-[100] overflow-hidden rounded-lg shadow-2xl ${styles.bgColor} ${isClosing ? 'animate-fade-out-up' : 'animate-fade-in-down'}`}
            role="alert"
            aria-live="assertive"
        >
            <div className="p-4 flex items-start">
                <div className="flex-shrink-0">
                    <Icon className={`h-6 w-6 ${styles.iconColor}`} aria-hidden="true" />
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className={`text-sm font-medium ${styles.textColor}`}>{message}</p>
                </div>
                 <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={handleClose} className="p-1 rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-black/10 dark:bg-white/10 w-full">
                <div className={`${styles.progressColor} h-full animate-fill-up`}></div>
            </div>
        </div>
    );
};

export default AdminToastNotification;