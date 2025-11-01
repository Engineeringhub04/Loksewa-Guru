import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';
import { Link } from 'react-router-dom';

const AdminAIModalFloatingPage: React.FC = () => {
    const [logos, setLogos] = useState({ logoUrl: '', voiceChatLogoUrl: '', aiResponseLogoUrl: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const docRef = useCallback(() => doc(db, 'settings', 'aiModal'), []);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const docSnap = await getDoc(docRef());
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setLogos({
                        logoUrl: data.logoUrl || '',
                        voiceChatLogoUrl: data.voiceChatLogoUrl || '',
                        aiResponseLogoUrl: data.aiResponseLogoUrl || '',
                    });
                }
            } catch (error) {
                console.error("Error fetching AI modal settings:", error);
                showToast("Failed to load settings.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [docRef, showToast]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(docRef(), logos);
            showToast("AI Chat Logo URLs saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            showToast("Failed to save URL.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6">Loading settings...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <SparklesIcon className="h-6 w-6" />
                    AI Modal Floating Settings
                </h1>
            </header>

            <div className="space-y-6">
                 <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium">AI Text Chat Background Logo URL</label>
                    <p className="text-xs text-gray-500 mb-2">This logo appears in the background of the AI chat window. Use a transparent PNG for best results.</p>
                    <input
                        id="logoUrl"
                        type="url"
                        value={logos.logoUrl}
                        onChange={e => setLogos(prev => ({...prev, logoUrl: e.target.value}))}
                        placeholder="https://example.com/logo.png"
                        className="w-full form-input mt-1"
                    />
                     {logos.logoUrl && (
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <h3 className="text-sm font-medium mb-2">Preview:</h3>
                            <img src={logos.logoUrl} alt="Logo Preview" className="max-h-24 opacity-20" />
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="aiResponseLogoUrl" className="block text-sm font-medium">AI Response Logo</label>
                    <p className="text-xs text-gray-500 mb-2">This logo appears next to the AI's messages in the chat window.</p>
                    <input
                        id="aiResponseLogoUrl"
                        type="url"
                        value={logos.aiResponseLogoUrl}
                        onChange={e => setLogos(prev => ({...prev, aiResponseLogoUrl: e.target.value}))}
                        placeholder="https://example.com/ai-avatar.png"
                        className="w-full form-input mt-1"
                    />
                    {logos.aiResponseLogoUrl && (
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <h3 className="text-sm font-medium mb-2">Preview:</h3>
                            <img src={logos.aiResponseLogoUrl} alt="AI Response Logo Preview" className="w-10 h-10 rounded-full" />
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="voiceChatLogoUrl" className="block text-sm font-medium">AI Voice Chat Logo URL</label>
                    <p className="text-xs text-gray-500 mb-2">This logo appears in the center of the circle during a voice chat session.</p>
                    <input
                        id="voiceChatLogoUrl"
                        type="url"
                        value={logos.voiceChatLogoUrl}
                        onChange={e => setLogos(prev => ({...prev, voiceChatLogoUrl: e.target.value}))}
                        placeholder="https://example.com/voice-logo.png"
                        className="w-full form-input mt-1"
                    />
                    {logos.voiceChatLogoUrl && (
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <h3 className="text-sm font-medium mb-2">Preview:</h3>
                            <div className="relative h-40 w-40 rounded-full bg-purple-500/10 flex items-center justify-center">
                                <img src={logos.voiceChatLogoUrl} alt="Voice Logo Preview" className="w-full h-full object-cover rounded-full" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t dark:border-gray-600">
                    <Link
                        to="/admin/user-chats"
                        className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        User Chat details
                    </Link>
                </div>
            </div>
            
            <div className="flex justify-end pt-6 border-t dark:border-gray-600 mt-6">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center disabled:bg-purple-400">
                    {isSaving ? 'Saving...' : 'Save URLs'}
                </button>
            </div>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminAIModalFloatingPage;