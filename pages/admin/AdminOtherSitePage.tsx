import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../services/firebase';
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    deleteDoc,
    addDoc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import type { OtherSiteData } from '../../types';
import { generateSiteInfoFromUrl } from '../../services/geminiService';
import { GlobeAltIcon, SparklesIcon, PhotoIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';

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

// Form Modal Component
const SiteEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<OtherSiteData, 'id' | 'createdAt'>, file?: File | null) => void;
    siteToEdit: OtherSiteData | null;
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, siteToEdit, isSaving }) => {
    const [data, setData] = useState<Partial<OtherSiteData>>({ heading: '', description: '', link: '', imageUrl: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        if (siteToEdit) {
            setData(siteToEdit);
        } else {
            setData({ heading: '', description: '', link: '', imageUrl: '' });
        }
        setImageFile(null); // Reset file on open
    }, [siteToEdit, isOpen]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setData(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateWithAI = async () => {
        if (!data.link || !data.link.trim() || !data.link.startsWith('http')) {
            showToast("Please enter a valid link (starting with http or https) first to generate content.", 'info');
            return;
        }
        setIsGenerating(true);
        try {
            const { heading, description } = await generateSiteInfoFromUrl(data.link);
            setData(prev => ({ ...prev, heading, description }));
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(data as Omit<OtherSiteData, 'id' | 'createdAt'>, imageFile);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={siteToEdit ? 'Edit Site' : 'Add New Site'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form fields from original page */}
                 <div>
                    <label htmlFor="link" className="block text-sm font-medium">Link URL</label>
                    <input type="url" name="link" id="link" value={data.link} onChange={handleInputChange} className="w-full form-input mt-1" placeholder="https://example.com" />
                </div>

                <div className="relative">
                    <label htmlFor="heading" className="block text-sm font-medium">Title / Heading</label>
                    <input type="text" name="heading" id="heading" value={data.heading} onChange={handleInputChange} className="w-full form-input mt-1" placeholder="Title for the section" />
                    <button type="button" onClick={handleGenerateWithAI} disabled={isGenerating || !data.link} title="Generate with AI from Link" className="absolute top-7 right-2 p-1.5 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-600 dark:text-purple-300 hover:bg-purple-200 disabled:opacity-50">
                        <SparklesIcon className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                 <div className="relative">
                    <label htmlFor="description" className="block text-sm font-medium">Description</label>
                    <textarea name="description" id="description" value={data.description} onChange={handleInputChange} className="w-full form-input mt-1" rows={3} placeholder="A short description" />
                </div>

                <div>
                    <label className="block text-sm font-medium">Photo</label>
                    <div className="mt-2 flex items-center gap-4">
                        {data.imageUrl ? (
                             <ProgressiveImage src={data.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-full bg-gray-100 p-1 border" />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <PhotoIcon className="h-10 w-10 text-gray-400" />
                            </div>
                        )}
                        <input 
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t dark:border-gray-600 gap-2">
                     <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md" disabled={isSaving}>Cancel</button>
                     <button type="submit" className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400 flex items-center justify-center" disabled={isSaving}>
                        {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSaving ? (imageFile ? 'Uploading...' : 'Saving...') : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Main Page Component
const AdminOtherSitePage: React.FC = () => {
    const [sites, setSites] = useState<OtherSiteData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [siteToEdit, setSiteToEdit] = useState<OtherSiteData | null>(null);
    const { showToast } = useToast();
    
    const [confirmDelete, setConfirmDelete] = useState<OtherSiteData | null>(null);


    const collectionRef = useMemo(() => collection(db, 'otherSites'), []);

    const fetchSites = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collectionRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OtherSiteData));
            setSites(list);
        } catch (error) {
            console.error("Error fetching sites:", error);
            showToast("Failed to load site data.", "error");
        } finally {
            setLoading(false);
        }
    }, [collectionRef, showToast]);

    useEffect(() => {
        fetchSites();
    }, [fetchSites]);

    const handleAddNew = () => {
        setSiteToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (site: OtherSiteData) => {
        setSiteToEdit(site);
        setIsModalOpen(true);
    };

    const handleSave = async (data: Omit<OtherSiteData, 'id' | 'createdAt'>, imageFile?: File | null) => {
        setIsSaving(true);
        let finalImageUrl = data.imageUrl || '';

        try {
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('upload_preset', 'filereceive');
                const response = await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload', { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Cloudinary upload failed.');
                const uploadData = await response.json();
                finalImageUrl = uploadData.secure_url;
            }

            const dataToSave = { ...data, imageUrl: finalImageUrl };

            if (siteToEdit && siteToEdit.id) {
                // Update
                const docRef = doc(db, 'otherSites', siteToEdit.id);
                await updateDoc(docRef, dataToSave);
            } else {
                // Add new
                await addDoc(collectionRef, { ...dataToSave, createdAt: serverTimestamp() });
            }

            showToast("Site saved successfully!");
            setIsModalOpen(false);
            fetchSites();
        } catch (error) {
            console.error("Error saving site:", error);
            showToast(`Failed to save: ${(error as Error).message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const executeDelete = async () => {
        if (!confirmDelete || !confirmDelete.id) return;
        try {
            await deleteDoc(doc(db, "otherSites", confirmDelete.id));
            showToast("Site deleted successfully.");
            fetchSites();
        } catch (error) {
            console.error("Error deleting site:", error);
            showToast("Failed to delete site.", "error");
        } finally {
            setConfirmDelete(null);
        }
    };


    if (loading) return <p className="p-6">Loading settings...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to delete "{confirmDelete.heading}"?</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}

            <header className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <GlobeAltIcon className="h-6 w-6"/>
                    Manage "Our Other Sites"
                </h1>
                <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">
                    <PlusIcon className="h-5 w-5" /> Add New Site
                </button>
            </header>
            
            <div className="space-y-4">
                {sites.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No sites have been added yet.</p>
                ) : (
                    sites.map(site => (
                        <div key={site.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <ProgressiveImage src={site.imageUrl || 'https://via.placeholder.com/64'} alt={site.heading} className="w-16 h-16 object-cover rounded-full flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white">{site.heading}</h3>
                                    <a href={site.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">{site.link}</a>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(site)} className="p-2 text-blue-600 hover:text-blue-800" title="Edit"><PencilIcon className="h-5 w-5"/></button>
                                <button onClick={() => setConfirmDelete(site)} className="p-2 text-red-600 hover:text-red-800" title="Delete"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <SiteEditorModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                siteToEdit={siteToEdit}
                isSaving={isSaving}
            />

             <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminOtherSitePage;