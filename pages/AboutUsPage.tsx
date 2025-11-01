import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { TextPageContent } from '../types';

const AboutUsPage: React.FC = () => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            const docRef = doc(db, 'pageContent', 'about-us');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as TextPageContent;
                setContent(data.content);
            } else {
                // Fallback content
                setContent(`
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Our Mission</h2>
                    <p>Welcome to Loksewa Guru, your ultimate companion for acing the Nepal Public Service Commission (Loksewa) exams. Our mission is to provide a comprehensive, accessible, and effective learning platform for every aspirant aiming for a career in public service.</p>
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-6 mb-4">What We Offer</h2>
                    <ul class="list-disc list-inside space-y-2">
                        <li>Up-to-date syllabus and study materials.</li>
                        <li>Extensive collection of quizzes and mock tests.</li>
                        <li>AI-powered interview practice to build your confidence.</li>
                        <li>Latest notices and updates from the PSC.</li>
                    </ul>
                `);
            }
            setLoading(false);
        };
        fetchContent();
    }, []);

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900 pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Profile">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                </Link>
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">About Us</h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    {loading ? (
                        <p>Loading content...</p>
                    ) : (
                         <div
                            className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default AboutUsPage;
