import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import type { AppContent } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';

const AdminShareAppSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [shareUrl, setShareUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const docRef = useCallback(() => doc(db, 'settings', 'general'), []);

    useEffect(() => {
        const fetchUrl = async () => {
            setLoading(true);
            const docSnap = await getDoc(docRef());
            if (docSnap.exists()) {
                const data = docSnap.data();
                setShareUrl(data.shareUrl || '');
            }
            setLoading(false);
        };
        fetchUrl();
    }, [docRef]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(docRef(), { shareUrl }, { merge: true });
            showToast("Share App URL saved successfully!");
        } catch (error) {
            showToast("Failed to save URL.", "error");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <p className="p-6">Loading settings...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate('/admin/profile-details')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold">Edit Share App Settings</h1>
            </header>

            <div>
                <label htmlFor="share-url" className="block text-sm font-medium">Share URL</label>
                <p className="text-xs text-gray-500 mb-2">This is the link that will be shared when a user clicks the "Share App" button.</p>
                <input
                    id="share-url"
                    type="url"
                    value={shareUrl}
                    onChange={e => setShareUrl(e.target.value)}
                    placeholder="https://yourapp.com"
                    className="w-full form-input mt-1"
                />
            </div>
            
            <div className="flex justify-end pt-6 border-t dark:border-gray-600 mt-6">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center disabled:bg-purple-400">
                    {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {isSaving ? 'Saving...' : 'Save URL'}
                </button>
            </div>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminShareAppSettingsPage;