import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import type { TextPageContent } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';

const AdminPrivacySettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const docRef = useCallback(() => doc(db, 'pageContent', 'privacy-terms'), []);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            const docSnap = await getDoc(docRef());
            if (docSnap.exists()) {
                setContent((docSnap.data() as TextPageContent).content);
            }
            setLoading(false);
        };
        fetchContent();
    }, [docRef]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(docRef(), { content });
            showToast("Privacy & Terms content saved successfully!");
        } catch (error) {
            showToast("Failed to save content.", "error");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <p className="p-6">Loading content...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate('/admin/profile-details')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold">Edit Privacy Policy & Terms</h1>
            </header>

            <div>
                <label htmlFor="privacy-content" className="block text-sm font-medium">Page Content (HTML supported)</label>
                 <p className="text-xs text-gray-500 mb-2">Use HTML tags like `&lt;h2&gt;`, `&lt;p&gt;`, `&lt;ul&gt;`, `&lt;li&gt;`, `&lt;hr&gt;` for formatting.</p>
                <textarea
                    id="privacy-content"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={20}
                    className="w-full form-input mt-1 font-mono text-sm"
                />
            </div>
            
            <div className="flex justify-end pt-6 border-t dark:border-gray-600 mt-6">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center disabled:bg-purple-400">
                    {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {isSaving ? 'Saving...' : 'Save Content'}
                </button>
            </div>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminPrivacySettingsPage;