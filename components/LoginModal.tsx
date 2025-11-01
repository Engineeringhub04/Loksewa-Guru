import React from 'react';
import { ArrowRightOnRectangleIcon } from '../constants';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
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
                    <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/50 dark:to-indigo-900/50 mb-6">
                        <ArrowRightOnRectangleIcon className="w-12 h-12 text-blue-600 dark:text-blue-300" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white" id="login-modal-title">
                        Login Required
                    </h3>
                    
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                        This feature is available for our registered users. Please log in or create an account to continue.
                    </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 space-y-3">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-3 text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        onClick={onLogin}
                    >
                        Login / Sign Up
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

export default LoginModal;
