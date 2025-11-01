import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, ArrowLeftIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, CalendarDaysIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Notice } from '../types';
import PullToRefresh from '../components/PullToRefresh';

const NoticeCard: React.FC<{ notice: Notice, color: string }> = ({ notice, color }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Check if the main fileUrl is a direct image link
    const isDirectImage = notice.fileUrl && notice.fileUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/);

    let documentPreviewUrl = '';
    // If it's not a direct image, try to generate a document preview URL
    if (notice.fileUrl && !isDirectImage) {
        const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
        const match = notice.fileUrl.match(driveRegex);
        if (match && match[1]) {
            const fileId = match[1];
            // Use the specific /preview URL for embedding Google Drive files
            documentPreviewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        } else {
            // Use Google Docs viewer as a fallback for other document links (like PDFs)
            documentPreviewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(notice.fileUrl)}&embedded=true`;
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden animate-fade-in-scale">
            <div className={`w-full h-1.5 ${color}`}></div>
            <div 
                className="p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
                role="button"
                aria-expanded={isExpanded}
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)}
            >
                <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">{notice.title}</h3>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <CalendarDaysIcon className="h-4 w-4 mr-1.5" />
                            <span>Published on: {notice.date}</span>
                        </div>
                    </div>
                    <ChevronDownIcon 
                        className={`h-6 w-6 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                </div>
            </div>
            {/* Collapsible Content */}
            <div 
                className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="p-4 pt-0 border-t dark:border-gray-700 space-y-4">
                        {(isDirectImage || documentPreviewUrl) && (
                            <div>
                                <p className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Preview:</p>
                                {isDirectImage ? (
                                    <img 
                                        src={notice.fileUrl} 
                                        alt="Notice Preview" 
                                        className="w-full h-auto max-h-96 object-contain rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                    />
                                ) : (
                                    <iframe
                                        src={documentPreviewUrl}
                                        className="w-full h-96 mt-2 border dark:border-gray-600 rounded-md"
                                        title="File Preview"
                                        frameBorder="0"
                                    ></iframe>
                                )}
                            </div>
                        )}
                        <a 
                            href={notice.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            onClick={(e) => e.stopPropagation()} 
                        >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                            Click here to download
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};


const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
);


const NoticesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'our' | 'psc'>('our');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [notices, setNotices] = useState<Notice[]>([]);

    const fetchNotices = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "notices"),
                where("type", "==", activeTab)
            );
            const querySnapshot = await getDocs(q);
            const noticeList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                } as Notice
            });

            noticeList.sort((a, b) => {
                const timeA = a.createdAt?.getTime() || 0;
                const timeB = b.createdAt?.getTime() || 0;
                return timeB - timeA;
            });

            setNotices(noticeList);
        } catch (error) {
            console.error(`Error fetching ${activeTab} notices:`, error);
            setNotices([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);


    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const filteredNotices = useMemo(() => {
        if (!searchTerm) {
            return notices;
        }
        return notices.filter(notice => 
            notice.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, notices]);

    const tabColor = activeTab === 'our' ? 'bg-purple-500' : 'bg-blue-500';

    return (
        <PullToRefresh onRefresh={fetchNotices} className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </Link>
                 <div className="flex-1 text-center">
                     <div className="flex items-center justify-center gap-2">
                        <BellIcon className="h-6 w-6 text-purple-500" />
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Notices</h1>
                    </div>
                 </div>
                 <div className="w-10"></div>
            </header>

            <main className="flex-1 p-4 pb-24">
                {/* Search Bar */}
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search notices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 mb-4">
                    <button 
                        onClick={() => setActiveTab('our')}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors duration-300 ${activeTab === 'our' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Our Notices
                    </button>
                    <button 
                        onClick={() => setActiveTab('psc')}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors duration-300 ${activeTab === 'psc' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        PSC/Vacancy
                    </button>
                </div>
                
                {/* Notice List */}
                {loading ? <LoadingSpinner /> : (
                    <div className="space-y-4">
                        {filteredNotices.length > 0 ? (
                            filteredNotices.map(notice => (
                                <NoticeCard key={notice.id} notice={notice} color={tabColor} />
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500">No notices found.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </PullToRefresh>
    );
};

export default NoticesPage;