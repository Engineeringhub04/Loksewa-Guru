import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/solid';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { ContactPageContent } from '../types';
import { InstagramIcon, TwitterIcon, FacebookIcon } from '../constants';

const ContactUsPage: React.FC = () => {
    const [content, setContent] = useState<ContactPageContent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            const docRef = doc(db, 'pageContent', 'contact');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setContent(docSnap.data() as ContactPageContent);
            } else {
                // Fallback content if not in DB
                setContent({
                    email: 'help@acmeco.com',
                    phone: '+1 (555) 123-4567',
                    address: 'Kathmandu, Nepal',
                    facebook: 'https://facebook.com/acmeco',
                    instagram: 'https://instagram.com/acmeco',
                    twitter: 'https://twitter.com/acmeco',
                    youtube: '#',
                    linkedin: '#',
                    whatsapp: '#'
                });
            }
            setLoading(false);
        };
        fetchContent();
    }, []);

    const getSocialHandle = (url: string | undefined) => {
        if (!url || url === '#') return '@acmeco';
        try {
            const urlObj = new URL(url);
            const handle = urlObj.pathname.split('/').filter(Boolean).pop();
            return handle ? `@${handle}` : '@acmeco';
        } catch (e) {
            return '@acmeco';
        }
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900 pb-24">
            <header className="sticky top-0 p-4 flex items-center bg-gray-100 dark:bg-gray-900 z-10">
                <Link to="/profile" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Back to Profile">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                </Link>
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Contact Us</h1>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-4">
                 <p className="text-center text-gray-500 dark:text-gray-400 mb-8 px-4">
                    You can get in touch with us through below platforms. Our Team will reach out to you as soon as it would be possible.
                </p>

                {loading ? (
                    <p className="text-center">Loading contact info...</p>
                ) : content && (
                    <div className="space-y-6">
                        {/* Customer Support Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in-scale">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6">Customer Support</h3>
                            <div className="space-y-6">
                                <div className="flex items-center">
                                    <PhoneIcon className="h-6 w-6 text-gray-400"/>
                                    <div className="ml-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Contact Number</p>
                                        <a href={`tel:${content.phone}`} className="font-semibold text-lg text-gray-800 dark:text-gray-100">{content.phone}</a>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <EnvelopeIcon className="h-6 w-6 text-gray-400"/>
                                    <div className="ml-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                                        <a href={`mailto:${content.email}`} className="font-semibold text-lg text-gray-800 dark:text-gray-100">{content.email}</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Social Media Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in-scale" style={{animationDelay: '100ms'}}>
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6">Social Media</h3>
                            <div className="space-y-5">
                                <a href={content.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center group">
                                     <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600">
                                        <InstagramIcon className="h-6 w-6 text-white"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">Instagram</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:underline">{getSocialHandle(content.instagram)}</p>
                                    </div>
                                </a>
                                <a href={content.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center group">
                                     <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1DA1F2]">
                                        <TwitterIcon className="h-5 w-5 text-white"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">Twitter</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:underline">{getSocialHandle(content.twitter)}</p>
                                    </div>
                                </a>
                                <a href={content.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center group">
                                     <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1877F2]">
                                        <FacebookIcon className="h-6 w-6 text-white"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">Facebook</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:underline">{getSocialHandle(content.facebook)}</p>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ContactUsPage;