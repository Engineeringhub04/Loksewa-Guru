import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import type { HomeNotice } from '../../types';
import { HomeIcon, TrashIcon, PhotoIcon, PencilIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import Modal from '../../components/Modal';

// Helper to generate Cloudinary URLs
const generateCloudinaryUrl = (src: string, transformations: string): string => {
    if (!src || !src.includes('/upload/')) {
        return src || ''; // Not a standard Cloudinary URL, return as is or empty string
    }
    const parts = src.split('/upload/');
    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ src, alt, className, ...props }) => {
    const placeholderSrc = generateCloudinaryUrl(src, 'q_auto:low,e_blur:2000,w_20');
    const [imageSrc, setImageSrc] = useState(placeholderSrc);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const highResSrc = generateCloudinaryUrl(src, 'q_auto,f_auto');
        const img = new Image();
        img.src = highResSrc;
        img.onload = () => {
            setImageSrc(highResSrc);
            setIsLoaded(true);
        };
    }, [src]);

    // When src prop changes, reset to placeholder
    useEffect(() => {
         setImageSrc(placeholderSrc);
         setIsLoaded(false);
    }, [placeholderSrc]);

    return (
        <img
            {...props}
            src={imageSrc}
            alt={alt}
            className={`${className} transition-all duration-500 ease-in-out ${isLoaded ? 'blur-0 scale-100' : 'blur-md scale-105'}`}
        />
    );
};

// --- SUB-COMPONENTS ---

const Countdown: React.FC<{ expiry?: Date }> = ({ expiry }) => {
    const calculateTimeLeft = useCallback(() => {
        if (!expiry) return null;
        const difference = +expiry - +new Date();
        if (difference <= 0) return null;
        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
    }, [expiry]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (!expiry) {
            setTimeLeft(null);
            return;
        }
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft, expiry]);

    if (!expiry) return <span className="text-xs font-semibold text-gray-500">No Expiry Set</span>;

    if (!timeLeft) return <span className="text-xs font-semibold text-red-500">Expired</span>;

    return (
        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
            {`${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s left`}
        </span>
    );
};

const RepublishModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onRepublish: (newExpiry: Timestamp) => void;
    isSaving: boolean;
}> = ({ isOpen, onClose, onRepublish, isSaving }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('23:59');

    const handleRepublish = () => {
        if (!date || !time) {
            alert("Please select a valid date and time.");
            return;
        }
        const newExpiry = Timestamp.fromDate(new Date(`${date}T${time}`));
        onRepublish(newExpiry);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Republish Notice">
            <div className="space-y-4">
                <p className="text-sm">Set a new expiry date and time to make this notice public again on the homepage.</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">New Expiry Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full form-input mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">New Expiry Time</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full form-input mt-1" />
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t dark:border-gray-600 gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md" disabled={isSaving}>Cancel</button>
                    <button onClick={handleRepublish} disabled={isSaving} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center disabled:bg-purple-400">
                        {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSaving ? 'Saving...' : 'Republish'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


// --- MAIN COMPONENT ---
const AdminHomeNoticePage: React.FC = () => {
    const [notices, setNotices] = useState<HomeNotice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [editingNotice, setEditingNotice] = useState<HomeNotice | null>(null);
    const [isRepublishModalOpen, setIsRepublishModalOpen] = useState(false);
    const [republishTarget, setRepublishTarget] = useState<HomeNotice | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<HomeNotice | null>(null);

    // Form state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [expiryTime, setExpiryTime] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload';
    const UPLOAD_PRESET = 'filereceive';

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'homeNotices'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const noticesList = snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data, 
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                    expiresAt: data.expiresAt ? (data.expiresAt as Timestamp).toDate() : undefined,
                } as HomeNotice
            });
            setNotices(noticesList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching home notices:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        if (editingNotice) {
            setLinkUrl(editingNotice.linkUrl);
            if (editingNotice.expiresAt) {
                const expiry = editingNotice.expiresAt as unknown as Date;
                setExpiryDate(expiry.toISOString().split('T')[0]);
                setExpiryTime(expiry.toTimeString().substring(0, 5));
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setExpiryDate(tomorrow.toISOString().split('T')[0]);
                setExpiryTime('23:59');
            }
            setImagePreview(editingNotice.imageUrl);
            setImageFile(null);
        } else {
             // Reset form for new entry
            setLinkUrl('');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setExpiryDate(tomorrow.toISOString().split('T')[0]);
            setExpiryTime('23:59');
            setImageFile(null);
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [editingNotice]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageFile && !editingNotice) {
            alert('Please select an image file for a new notice.');
            return;
        }
        if (!expiryDate || !expiryTime) {
            alert('Please set an expiry date and time.');
            return;
        }
        
        setIsSaving(true);
        try {
            let imageUrl = editingNotice?.imageUrl || '';
            let deleteToken = editingNotice?.deleteToken;
            
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('upload_preset', UPLOAD_PRESET);

                const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Cloudinary upload failed.');
                const uploadData = await response.json();
                imageUrl = uploadData.secure_url;
                deleteToken = uploadData.delete_token;
            }

            const expiresAt = Timestamp.fromDate(new Date(`${expiryDate}T${expiryTime}`));

            const noticeData: any = {
                imageUrl,
                linkUrl: linkUrl || '#',
                expiresAt,
            };

            if (deleteToken) {
                noticeData.deleteToken = deleteToken;
            }

            if (editingNotice) {
                // Update
                await updateDoc(doc(db, 'homeNotices', editingNotice.id), noticeData);
                alert('Home notice updated successfully!');
            } else {
                // Create
                noticeData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'homeNotices'), noticeData);
                alert('Home notice added successfully!');
            }

            setEditingNotice(null); // This will trigger useEffect to reset the form
        } catch (error) {
            console.error('Error saving notice:', error);
            alert(`Failed to save notice: ${(error as Error).message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.deleteToken) {
                const formData = new FormData();
                formData.append('token', confirmDelete.deleteToken);
                await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/delete_by_token', { method: 'POST', body: formData });
            }
            await deleteDoc(doc(db, 'homeNotices', confirmDelete.id));
            alert('Notice deleted successfully.');
        } catch (error) {
            console.error('Error deleting notice:', error);
            alert('Failed to delete notice.');
        } finally {
            setConfirmDelete(null);
        }
    };
    
    const handleRepublish = async (newExpiry: Timestamp) => {
        if (!republishTarget) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'homeNotices', republishTarget.id), { expiresAt: newExpiry });
            alert('Notice has been republished successfully!');
            setIsRepublishModalOpen(false);
        } catch (error) {
            console.error('Error republishing:', error);
            alert('Failed to republish notice.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-8">
             {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to delete this notice?</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}

            <header className="flex items-center pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <HomeIcon className="h-6 w-6" />
                    Important Home Notice
                </h1>
            </header>

            <form onSubmit={handleSave} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">{editingNotice ? `Editing: ${notices.find(n => n.id === editingNotice.id)?.id.substring(0,8)}...` : 'Add New Notice'}</h2>
                    {editingNotice && <button type="button" onClick={() => setEditingNotice(null)} className="text-sm text-red-500 hover:underline">Cancel Edit</button>}
                </div>
                <div>
                    <label className="block text-sm font-medium">Notice Image</label>
                    <div className="mt-2 flex items-center gap-4">
                        {imagePreview ? <ProgressiveImage src={imagePreview} alt="Preview" className="w-48 h-auto object-contain rounded-md bg-gray-100 p-1 border" /> : <div className="w-48 h-32 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><PhotoIcon className="h-12 w-12 text-gray-400" /></div>}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} required={!editingNotice} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">Link URL (Optional)</label>
                    <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com/more-info" className="w-full form-input mt-1" />
                </div>
                 <div>
                    <label className="block text-sm font-medium">Set Expiry Date & Time</label>
                    <div className="flex gap-4 mt-1">
                        <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full form-input" required />
                        <input type="time" value={expiryTime} onChange={e => setExpiryTime(e.target.value)} className="w-full form-input" required />
                    </div>
                </div>
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400 flex items-center justify-center">
                    {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {isSaving ? 'Saving...' : (editingNotice ? 'Update Notice' : 'Save & Publish')}
                </button>
            </form>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Current & Past Notices</h2>
                {loading ? <p>Loading...</p> : notices.map(notice => (
                    <div key={notice.id} className="p-3 border rounded-lg flex items-center justify-between gap-4">
                        <ProgressiveImage src={notice.imageUrl} alt="Notice" className="w-24 h-24 object-contain rounded-md bg-gray-50 dark:bg-gray-900" />
                        <div className="flex-1">
                            <p className="text-xs text-gray-400 truncate">ID: {notice.id}</p>
                            <a href={notice.linkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate block">{notice.linkUrl}</a>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-sm font-medium">Status:</span>
                                <Countdown expiry={notice.expiresAt as unknown as Date} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setEditingNotice(notice)} className="p-2 text-blue-600 hover:text-blue-800" title="Edit"><PencilIcon className="h-5 w-5"/></button>
                            <button onClick={() => { setRepublishTarget(notice); setIsRepublishModalOpen(true); }} className="p-2 text-green-600 hover:text-green-800" title="Republish"><ArrowPathIcon className="h-5 w-5"/></button>
                            <button onClick={() => setConfirmDelete(notice)} className="p-2 text-red-600 hover:text-red-800" title="Delete"><TrashIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                ))}
            </div>
            
            <RepublishModal isOpen={isRepublishModalOpen} onClose={() => setIsRepublishModalOpen(false)} onRepublish={handleRepublish} isSaving={isSaving} />

            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminHomeNoticePage;