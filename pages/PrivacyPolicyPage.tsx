import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { TextPageContent } from '../types';


const PrivacyPolicyPage: React.FC = () => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            const docRef = doc(db, 'pageContent', 'privacy-terms');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as TextPageContent;
                setContent(data.content);
            } else {
                // Fallback content
                setContent(`
                    <h2>Privacy Policy</h2>
                    <p>Last updated: July 28, 2024</p>
                    <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
                    <hr class="my-6"/>
                    <h2>Terms and Conditions</h2>
                    <p>By downloading or using the app, these terms will automatically apply to you. You should make sure therefore that you read them carefully before using the app.</p>
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
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Privacy & Terms</h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    {loading ? (
                        <p>Loading content...</p>
                    ) : (
                         <div
                            className="prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicyPage;
