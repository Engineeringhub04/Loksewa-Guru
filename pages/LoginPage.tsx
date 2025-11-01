import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EnvelopeIcon, LockClosedIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { EyeIcon, EyeOffIcon } from '../constants';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const fromPath = location.state?.from?.pathname;
    // Don't redirect back to login/signup pages. Default to profile.
    const navigateTo = (fromPath && !['/login', '/signup', '/forgot-password', '/welcome'].includes(fromPath)) 
        ? fromPath 
        : '/profile';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const { isAdminLogin } = await login(email, password);
            if (isAdminLogin) {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate(navigateTo, { replace: true });
            }
        } catch (err: any) {
             switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Invalid email or password.');
                    break;
                default:
                    setError('Failed to login. Please try again.');
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
                        <Link to="/signup" className="py-2 text-gray-500 dark:text-gray-400">Sign Up</Link>
                        <Link to="/login" className="py-2 font-bold text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white">Sign In</Link>
                    </div>

                    {/* Content */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Welcome Back!</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
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
                        
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center">
                                <input type="checkbox" className="h-4 w-4 rounded text-slate-600 focus:ring-slate-500 border-gray-300 dark:border-gray-600" />
                                <span className="ml-2 text-gray-600 dark:text-gray-300">Remember Password</span>
                            </label>
                            <Link to="/forgot-password" className="font-medium text-red-500 hover:text-red-400">Forgot Password?</Link>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-slate-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;