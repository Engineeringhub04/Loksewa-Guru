import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import AuthHeader from '../components/AuthHeader';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you would call an API to send the reset link.
        // For this mock, we just show the confirmation.
        setIsSubmitted(true);
    };

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900">
            <AuthHeader title="Reset Password" backPath="/login" />
            <main className="flex-1 flex flex-col items-center justify-center w-full px-4">
                <div className="w-full max-w-md">
                    {!isSubmitted ? (
                        <>
                            <div className="text-center mb-8 animate-fade-in-scale">
                                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Forgot Your Password?</h1>
                                <p className="mt-2 text-gray-500 dark:text-gray-400">
                                    No problem. Enter your email and we'll send you a reset link.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-full animate-fade-in">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                        <div className="relative mt-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="you@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            type="submit"
                                            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors duration-300"
                                        >
                                            Send Reset Link
                                        </button>
                                    </div>
                                </form>

                                <p className="text-center text-sm text-gray-500 mt-8">
                                    Remember your password? <Link to="/login" className="font-medium text-purple-600 hover:text-purple-500">Back to Login</Link>
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-full text-center animate-fade-in-scale">
                             <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Check Your Email</h1>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">
                                If an account exists for <span className="font-semibold text-gray-700 dark:text-gray-200">{email}</span>, you will receive an email with instructions to reset your password.
                            </p>
                            <Link to="/login" className="mt-8 inline-block w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors duration-300">
                                Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ForgotPasswordPage;