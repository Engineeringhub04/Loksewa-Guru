import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import type { Notice } from '../../types';
import { NewspaperIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';

const AdminHomeNoticeControlPage: React.FC = () => {
    const [allNotices, setAllNotices] = useState<Notice[]>([]);
    const [pinnedNotices, setPinnedNotices] = useState<{ ourNoticeId?: string; pscNoticeId?: string }>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const fetchNotices = useCallback(async () => {
        setLoading(true);
        try {
            const noticesQuery = query(collection(db, "notices"), orderBy("createdAt", "desc"));
            const pinnedNoticesRef = doc(db, "settings", "pinnedNotices");

            const [noticesSnapshot, pinnedNoticesSnap] = await Promise.all([
                getDocs(noticesQuery),
                getDoc(pinnedNoticesRef)
            ]);

            const noticesList = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice));
            setAllNotices(noticesList);

            if (pinnedNoticesSnap.exists()) {
                setPinnedNotices(pinnedNoticesSnap.data());
            }

        } catch (error) {
            console.error("Error fetching notices:", error);
            showToast("Failed to load notices data.", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const handlePinNotice = async (notice: Notice) => {
        setIsSaving(true);
        const fieldToUpdate = notice.type === 'our' ? 'ourNoticeId' : 'pscNoticeId';
        try {
            await setDoc(doc(db, "settings", "pinnedNotices"), {
                [fieldToUpdate]: notice.id
            }, { merge: true });

            setPinnedNotices(prev => ({ ...prev, [fieldToUpdate]: notice.id }));
            showToast(`"${notice.title}" has been pinned to the homepage.`);
        } catch (error) {
            console.error("Error pinning notice:", error);
            showToast("Failed to pin notice.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const renderNoticeList = (type: 'our' | 'psc') => {
        const noticesOfType = allNotices.filter(n => n.type === type);
        const pinnedId = type === 'our' ? pinnedNotices.ourNoticeId : pinnedNotices.pscNoticeId;
        const pinnedNotice = noticesOfType.find(n => n.id === pinnedId);

        return (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">{type === 'our' ? 'Our Notices' : 'PSC/Vacancy Notices'}</h3>
                {pinnedNotice ? (
                    <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/50 rounded-md border border-green-300 dark:border-green-700">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-200">Currently Pinned:</p>
                        <p className="text-sm text-green-700 dark:text-green-300">{pinnedNotice.title}</p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 mb-4">No notice pinned for this category.</p>
                )}
                
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {noticesOfType.map(notice => (
                        <div key={notice.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                            <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 pr-2">{notice.title}</span>
                            <button
                                onClick={() => handlePinNotice(notice)}
                                disabled={isSaving || pinnedId === notice.id}
                                className="px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 enabled:bg-purple-600 enabled:text-white enabled:hover:bg-purple-700"
                            >
                                {pinnedId === notice.id ? 'Pinned' : 'Pin to Home'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="p-6">Loading notices...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <NewspaperIcon className="h-6 w-6"/>
                    Home Page Notice Control
                </h1>
            </header>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select one notice from each category to display on the homepage's notice section.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderNoticeList('our')}
                {renderNoticeList('psc')}
            </div>
        </div>
    );
};

export default AdminHomeNoticeControlPage;