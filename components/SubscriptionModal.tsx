import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

// Using a generic SVG for a premium icon to avoid adding new assets
const DiamondIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.0001 2L22.0001 8.5L12.0001 22L2.00006 8.5L12.0001 2Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12.0001 22L15.7501 8.5H8.25006L12.0001 22Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2.00006 8.5H22.0001" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
);


interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onUpgrade }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-scale text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8">
                    <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-200 dark:from-purple-900/50 dark:to-blue-900/50 mb-6">
                        <DiamondIcon className="w-12 h-12 text-purple-600 dark:text-purple-300" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white" id="subscription-modal-title">
                        Upgrade to Premium
                    </h3>
                    
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                        This feature is available for our premium members. Upgrade your plan to get instant access to this and many more exclusive features.
                    </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 space-y-3">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-3 text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 animate-glowing-button"
                        onClick={onUpgrade}
                    >
                        Upgrade Now
                    </button>
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                        onClick={onClose}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
