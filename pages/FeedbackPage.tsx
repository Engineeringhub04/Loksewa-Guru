import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { AdminNotification } from '../types';

const ratings = [
    { value: 1, label: 'Terrible', emoji: '😡' },
    { value: 2, label: 'Bad', emoji: '😞' },
    { value: 3, label: 'Okay', emoji: '😐' },
    { value: 4, label: 'Good', emoji: '😊' },
    { value: 5, label: 'Amazing', emoji: '🤩' },
];

const FeedbackPage: React.FC = () => {
    const [rating, setRating] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [contactAllowed, setContactAllowed] = useState(false);
    const [joinResearch, setJoinResearch] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (rating === null) {
            setError('Please select a rating to submit your feedback.');
            return;
        }

        setIsSubmitting(true);
        try {
            const feedbackPayload: any = {
                rating,
                message,
                contactAllowed,
                joinResearch,
                createdAt: serverTimestamp(),
                status: 'new',
            };
            if (user) {
                feedbackPayload.userId = user.uid;
                feedbackPayload.userEmail = user.email;
                feedbackPayload.userName = user.fullName;
            }
            const feedbackDocRef = await addDoc(collection(db, 'feedback'), feedbackPayload);

            const adminNotification: Omit<AdminNotification, 'id'> = {
                type: 'feedback',
                title: 'New Feedback Received',
                message: `${user?.fullName || 'An anonymous user'} submitted ${rating}-star feedback.`,
                read: false,
                createdAt: serverTimestamp() as any,
                link: '/admin/feedback',
                relatedId: feedbackDocRef.id,
            };
            await addDoc(collection(db, 'adminNotifications'), adminNotification);

            setIsSubmitted(true);
        } catch (error) {
            console.error("Error submitting feedback:", error);
            alert("Sorry, there was an error submitting your feedback. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900 pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Profile">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                </Link>
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Send Feedback</h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-4 flex items-center justify-center">
                <div className="w-full bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl animate-fade-in-scale">
                    {isSubmitted ? (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-green-600">Thank You!</h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-300">Your feedback has been received. We appreciate you taking the time to help us improve.</p>
                            <button onClick={() => { setIsSubmitted(false); setRating(null); setMessage(''); }} className="mt-6 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg">
                                Send More Feedback
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="text-left">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Give feedback</h2>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">What do you think of your experience with Loksewa Guru?</p>
                            </div>
                            
                            <div className="flex justify-around items-end text-center pt-2">
                                {ratings.map(r => (
                                    <button
                                        type="button"
                                        key={r.value}
                                        onClick={() => setRating(r.value)}
                                        className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all w-16 transform hover:scale-110 ${rating === r.value ? 'bg-pink-100 dark:bg-pink-900/50 ring-2 ring-pink-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        aria-label={`Rate as ${r.label}`}
                                    >
                                        <span className="text-3xl" role="img" aria-label={r.label}>{r.emoji}</span>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{r.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">What are the main reasons for your rating?</label>
                                <textarea
                                    id="feedback-message"
                                    rows={3}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Tell us what you liked or what could be improved..."
                                />
                            </div>
                            
                            <div className="space-y-2 text-sm">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={contactAllowed} onChange={e => setContactAllowed(e.target.checked)} className="h-4 w-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900" />
                                    <span className="ml-2 text-gray-600 dark:text-gray-300">I may be contacted about this feedback. <Link to="/privacy-policy" className="text-pink-600 hover:underline">Privacy Policy</Link></span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" checked={joinResearch} onChange={e => setJoinResearch(e.target.checked)} className="h-4 w-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900" />
                                    <span className="ml-2 text-gray-600 dark:text-gray-300">I'd like to help improve by joining the Research Group.</span>
                                </label>
                            </div>
                            
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            
                            <div className="flex justify-end gap-4 pt-2">
                                <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-colors disabled:bg-pink-300"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
};

export default FeedbackPage;