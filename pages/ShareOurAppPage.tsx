import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ShareIcon } from '@heroicons/react/24/solid';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ShareOurAppPage: React.FC = () => {
    const [shareUrl, setShareUrl] = useState(window.location.origin); // Fallback to current URL

    useEffect(() => {
        const fetchShareUrl = async () => {
            const docRef = doc(db, 'settings', 'general');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.shareUrl) {
                    setShareUrl(data.shareUrl);
                }
            }
        };
        fetchShareUrl();
    }, []);

    const handleShare = async () => {
        const shareData = {
            title: 'Loksewa Guru',
            text: 'Check out Loksewa Guru, the best app for Loksewa preparation!',
            url: shareUrl,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for browsers that don't support the Web Share API
                await navigator.clipboard.writeText(shareUrl);
                alert(`Share feature not supported. Link copied to clipboard:\n${shareUrl}`);
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                console.log('Share canceled by user.');
            } else {
                console.error('Error sharing:', err);
            }
        }
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900 pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Profile">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                </Link>
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Share Our App</h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
                    <ShareIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Spread the Word!</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300 mb-6">
                        Help your friends prepare for their exams by sharing Loksewa Guru.
                    </p>
                    <button 
                        onClick={handleShare}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all"
                    >
                        <ShareIcon className="h-5 w-5" />
                        Share Now
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ShareOurAppPage;