import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { MegaphoneIcon, PlusIcon, TrashIcon, PencilIcon, SparklesIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';
import { generateAppNotificationFromTopic } from '../../services/geminiService';
import type { PublishedNotification } from '../../types';
import Modal from '../../components/Modal';

// This function simulates calling a backend endpoint (e.g., a Vercel serverless function)
// which would then use the Firebase Admin SDK to send the push notification.
const sendPushNotification = async (title: string, message: string) => {
    // In a real app, this would be the URL of your backend function
    const backendEndpoint = 'https://your-backend-service.com/api/send-push';

    console.log('Simulating call to backend to send push notification.');
    console.log('Title:', title);
    console.log('Message:', message);
    
    // This fetch call is a placeholder. You would need to implement the backend
    // logic at the specified endpoint.
    /*
    try {
        const response = await fetch(backendEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, message }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send push notification.');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
    */

    // For demonstration, we'll just resolve successfully after a short delay.
    return new Promise(resolve => setTimeout(() => {
        resolve({ success: true, message: "Push notification dispatched (simulation)." });
    }, 1000));
};


const ToggleSwitch: React.FC<{ enabled: boolean, setEnabled: (enabled: boolean) => void, disabled?: boolean }> = ({ enabled, setEnabled, disabled }) => (
    <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        disabled={disabled}
        className={`${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 flex-shrink-0`}
        aria-checked={enabled}
        role="switch"
    >
        <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
    </button>
);

const AdminAppNotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<PublishedNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<PublishedNotification | null>(null);
    const { showToast } = useToast();

    // Form state
    const [editingNotification, setEditingNotification] = useState<PublishedNotification | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [author, setAuthor] = useState('Loksewa Guru Team');
    const [publishedAt, setPublishedAt] = useState(new Date().toISOString().split('T')[0]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [sendAsPush, setSendAsPush] = useState(true); // New state for push notification
    const fileInputRef = useRef<HTMLInputElement>(null);

    // AI State
    const [aiTopic, setAiTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "publishedNotifications"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    publishedAt: data.publishedAt ? (data.publishedAt as Timestamp).toDate() : new Date(),
                } as PublishedNotification
            });
            setNotifications(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setEditingNotification(null);
        setTitle('');
        setMessage('');
        setAuthor('Loksewa Guru Team');
        setPublishedAt(new Date().toISOString().split('T')[0]);
        setImageFile(null);
        setImagePreview(null);
        setSendAsPush(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEdit = (notification: PublishedNotification) => {
        setEditingNotification(notification);
        setTitle(notification.title);
        setMessage(notification.message);
        setAuthor(notification.author);
        setPublishedAt(notification.publishedAt.toISOString().split('T')[0]);
        setImagePreview(notification.imageUrl || null);
        setImageFile(null);
        setSendAsPush(true); // Default to on for edits
        window.scrollTo(0, 0);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGenerateWithAI = async () => {
        if (!aiTopic.trim()) return showToast('Please enter a topic for the AI.', 'info');
        setIsGenerating(true);
        try {
            const { title: aiTitle, message: aiMessage } = await generateAppNotificationFromTopic(aiTopic);
            setTitle(aiTitle);
            setMessage(aiMessage);
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (status: 'published' | 'draft') => {
        if (!title.trim() || !message.trim() || !author.trim()) {
            return showToast('Title, message, and author are required.', 'error');
        }
        setIsSaving(true);
        let finalImageUrl: string | null = editingNotification?.imageUrl || null;

        try {
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('upload_preset', 'filereceive');
    
                const response = await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload', {
                    method: 'POST',
                    body: formData,
                });
    
                if (!response.ok) throw new Error('Cloudinary upload failed.');
                const data = await response.json();
                finalImageUrl = data.secure_url;
            } else if (!imagePreview) {
                finalImageUrl = null;
            }

            const payload: any = {
                title, message, author, status,
                publishedAt: Timestamp.fromDate(new Date(publishedAt)),
            };
            
            if (finalImageUrl !== undefined) payload.imageUrl = finalImageUrl;

            if (editingNotification) {
                await updateDoc(doc(db, 'publishedNotifications', editingNotification.id), payload);
                showToast('In-App notification updated successfully.');
            } else {
                await addDoc(collection(db, 'publishedNotifications'), { ...payload, createdAt: serverTimestamp() });
                showToast('In-App notification created successfully.');
            }

            // --- PUSH NOTIFICATION LOGIC ---
            if (sendAsPush && status === 'published') {
                try {
                    await sendPushNotification(title, message);
                    showToast('Push notification has been dispatched to all users.', 'success');
                } catch (pushError) {
                    showToast(`In-App notification saved, but failed to send push notification: ${(pushError as Error).message}`, 'error');
                }
            }

            resetForm();
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (notification: PublishedNotification) => {
        const newStatus = notification.status === 'published' ? 'draft' : 'published';
        try {
            await updateDoc(doc(db, 'publishedNotifications', notification.id), { status: newStatus });
            showToast(`Notification status changed to ${newStatus}.`);
        } catch (error) {
            showToast('Failed to update status.', 'error');
        }
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, 'publishedNotifications', confirmDelete.id));
            showToast('Notification deleted.');
        } catch (error) {
            showToast('Failed to delete notification.', 'error');
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-8">
            {confirmDelete && <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete this notification?</p>
                <div className="flex justify-end gap-4 mt-6"><button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button><button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button></div>
            </Modal>}

            <header className="flex items-center pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><MegaphoneIcon className="h-6 w-6"/> App Notification Publisher</h1>
            </header>

            <section className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 space-y-4">
                <div className="flex justify-between items-center"><h2 className="text-lg font-semibold">{editingNotification ? 'Edit Notification' : 'Create New Notification'}</h2>{editingNotification && <button onClick={resetForm} className="text-sm text-red-500 hover:underline">Cancel Edit</button>}</div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><h3 className="font-semibold mb-2 flex items-center gap-2 text-purple-800 dark:text-purple-200"><SparklesIcon className="h-5 w-5"/> Generate with AI</h3><div className="flex gap-2"><input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Enter a topic for the notification..." className="w-full form-input"/><button onClick={handleGenerateWithAI} disabled={isGenerating} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400">{isGenerating ? '...' : 'Generate'}</button></div></div>
                <div><label className="text-sm font-medium">Title</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full form-input mt-1" required/></div>
                <div><label className="text-sm font-medium">Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} className="w-full form-input mt-1" required/></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium">Author</label><input value={author} onChange={e => setAuthor(e.target.value)} className="w-full form-input mt-1" required/></div>
                    <div><label className="text-sm font-medium">Publish Date</label><input type="date" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} className="w-full form-input mt-1" required/></div>
                </div>
                <div><label className="text-sm font-medium">Image (Optional)</label><div className="mt-1 flex items-center gap-4"><input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>{imagePreview && <div className="relative"><img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-md"/><button onClick={clearImage} className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full"><XMarkIcon className="h-4 w-4"/></button></div>}</div></div>
                
                <div className="pt-4 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-3">
                        <ToggleSwitch enabled={sendAsPush} setEnabled={setSendAsPush} />
                        <label className="font-medium text-gray-700 dark:text-gray-300">Send as Push Notification</label>
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={() => handleSave('draft')} disabled={isSaving} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center disabled:opacity-70 min-w-[120px]">{isSaving ? 'Saving...' : 'Save as Draft'}</button>
                        <button type="button" onClick={() => handleSave('published')} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center justify-center disabled:opacity-70 min-w-[120px]">{isSaving ? 'Publishing...' : 'Publish'}</button>
                    </div>
                </div>
            </section>

            <section><h2 className="text-lg font-semibold mb-4">Published History</h2><div className="space-y-3">{loading ? <p>Loading...</p> : notifications.map(n => (<div key={n.id} className="p-3 border rounded-lg flex items-center justify-between gap-4"><div className="flex items-center gap-3 flex-1 min-w-0"><ToggleSwitch enabled={n.status === 'published'} setEnabled={() => handleToggleStatus(n)}/><div className="overflow-hidden"><p className="font-semibold truncate">{n.title}</p><p className="text-xs text-gray-500 truncate">By {n.author} on {n.publishedAt.toLocaleDateString()}</p></div></div><div className="flex gap-2 flex-shrink-0"><button onClick={() => handleEdit(n)} className="p-2 text-blue-600 hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button><button onClick={() => setConfirmDelete(n)} className="p-2 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button></div></div>))}</div></section>
            
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminAppNotificationsPage;