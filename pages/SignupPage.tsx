import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EnvelopeIcon, LockClosedIcon, UserIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
// FIX: Changed import from non-existent 'AcademicCapIconComponent' to the correct 'AcademicCapIcon'.
import { EyeIcon, EyeOffIcon, LOKSEWA_COURSES, AcademicCapIcon } from '../constants';

const SignupPage: React.FC = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [course, setCourse] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { signup } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!course) {
            setError('Please select a course.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);
        try {
            await signup(email, password, fullName, course);
            navigate('/profile', { replace: true });
        } catch (err: any) {
            switch (err.code) {
                case 'auth/reserved-email':
                    setError(err.message);
                    break;
                case 'auth/email-already-in-use':
                    setError('This email is already registered.');
                    break;
                default:
                    setError(err.message || 'Failed to sign up. Please try again.');
                    break;
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
             {/* Blue Header Background */}
            <div className="absolute top-0 left-0 w-full h-1/3 bg-slate-800 rounded-b-[4rem]">
                 <div className="absolute top-6 left-6 z-20">
                    <Link to="/" className="text-white p-2">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </Link>
                </div>
            </div>

            <div className="relative flex flex-col justify-center items-center min-h-screen px-4 pt-20 pb-4">
                <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 z-10 animate-fade-in-scale">
                    {/* Tabs */}
                     <div className="flex justify-center space-x-8 mb-6 border-b dark:border-slate-700">
                        <Link to="/signup" className="py-2 font-bold text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white">Sign Up</Link>
                        <Link to="/login" className="py-2 text-gray-500 dark:text-gray-400">Sign In</Link>
                    </div>

                    {/* Content */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Create An Account</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    placeholder="Full Name"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    placeholder="Email"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    {/* FIX: Changed component name from 'AcademicCapIconComponent' to 'AcademicCapIcon'. */}
                                    <AcademicCapIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    required
                                    value={course}
                                    onChange={(e) => setCourse(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-500 appearance-none"
                                >
                                    <option value="" disabled>Select a course</option>
                                    {LOKSEWA_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    placeholder="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    placeholder="Confirm Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-slate-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;