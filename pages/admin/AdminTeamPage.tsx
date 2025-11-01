import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { TeamMember } from '../../types';
import Modal from '../../components/Modal';
import { UserGroupIcon, PlusIcon, TrashIcon, PencilIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { generateTeamMemberDescription } from '../../services/geminiService';
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
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isHighResLoaded, setIsHighResLoaded] = useState(false);

    useEffect(() => {
        setIsHighResLoaded(false);
        setImageSrc(null);

        if (!src) {
            return;
        }

        let isMounted = true;

        const placeholderSrc = generateCloudinaryUrl(src, 'q_auto:low,e_blur:2000,w_20');
        const highResSrc = generateCloudinaryUrl(src, 'q_auto,f_auto');
        
        // Load high-res image
        const highResImg = new Image();
        highResImg.src = highResSrc;
        highResImg.onload = () => {
            if (isMounted) {
                setImageSrc(highResSrc);
                setIsHighResLoaded(true);
            }
        };
        // If high-res is already cached, show it immediately and skip placeholder.
        if (highResImg.complete) {
            if (isMounted) {
                setImageSrc(highResSrc);
                setIsHighResLoaded(true);
                return; // Exit early
            }
        }
        
        // Load placeholder image only if high-res isn't cached
        const placeholderImg = new Image();
        placeholderImg.src = placeholderSrc;
        placeholderImg.onload = () => {
            // Check if component is still mounted and high-res hasn't loaded yet.
            if (isMounted && !highResImg.complete) {
                setImageSrc(placeholderSrc);
            }
        };

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (!imageSrc) {
        return <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`} role="img" aria-label={alt} />;
    }

    return (
        <img
            {...props}
            src={imageSrc}
            alt={alt}
            className={`${className} transition-all duration-500 ease-in-out ${isHighResLoaded ? 'blur-0 scale-100' : 'blur-md scale-105'}`}
        />
    );
};


// The form for adding/editing a team member
const TeamMemberFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Omit<TeamMember, 'id'>>, file?: File) => void;
    memberToEdit: TeamMember | null;
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, memberToEdit, isSaving }) => {
    // State for form fields
    const [name, setName] = useState('');
    const [position, setPosition] = useState('');
    const [description, setDescription] = useState('');
    const [order, setOrder] = useState(99);
    const [facebook, setFacebook] = useState('');
    const [instagram, setInstagram] = useState('');
    const [twitter, setTwitter] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (memberToEdit) {
            setName(memberToEdit.name);
            setPosition(memberToEdit.position);
            setDescription(memberToEdit.description);
            setOrder(memberToEdit.order);
            setFacebook(memberToEdit.social.facebook);
            setInstagram(memberToEdit.social.instagram);
            setTwitter(memberToEdit.social.twitter || '#');
            setPortfolioUrl(memberToEdit.portfolioUrl || '#');
            setPhotoPreview(memberToEdit.photoUrl);
            setPhotoFile(null);
        } else {
            // Reset for new member
            setName('');
            setPosition('');
            setDescription('');
            setOrder(99);
            setFacebook('#');
            setInstagram('#');
            setTwitter('#');
            setPortfolioUrl('#');
            setPhotoPreview(null);
            setPhotoFile(null);
        }
    }, [memberToEdit, isOpen]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const memberData: Partial<Omit<TeamMember, 'id'>> = {
            name,
            position,
            description,
            order,
            social: { facebook, instagram, twitter },
            portfolioUrl
        };
        onSave(memberData, photoFile || undefined);
    };

    const handleGenerateDescription = async () => {
        if (!name.trim() || !position.trim()) {
            showToast("Please provide the member's name and position before generating a description.", 'info');
            return;
        }
        setIsGenerating(true);
        try {
            const generatedDesc = await generateTeamMemberDescription(name, position);
            setDescription(generatedDesc);
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={memberToEdit ? 'Edit Team Member' : 'Add New Team Member'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full form-input mt-1" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Position</label>
                        <input value={position} onChange={e => setPosition(e.target.value)} className="w-full form-input mt-1" required />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Display Order</label>
                        <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-full form-input mt-1" required />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium">Description</label>
                    <div className="relative mt-1">
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full form-input pr-10" />
                         <button 
                            type="button" 
                            onClick={handleGenerateDescription}
                            disabled={isGenerating}
                            title="Generate with AI"
                            className="absolute top-2 right-2 p-1.5 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-600 dark:text-purple-300 hover:bg-purple-200 disabled:opacity-50"
                        >
                            <SparklesIcon className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
                 <div>
                    <label className="text-sm font-medium">Profile Photo</label>
                    <div className="mt-2 flex items-center gap-4">
                        {photoPreview ? (
                            <ProgressiveImage src={photoPreview} alt="Preview" className="w-24 h-24 object-cover rounded-full bg-gray-100 p-1 border" />
                        ) : (
                             <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <UserGroupIcon className="h-10 w-10 text-gray-400" />
                            </div>
                        )}
                         <input 
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium">Social Links</label>
                    <div className="flex flex-col md:flex-row gap-4 mt-1">
                        <input value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="Facebook URL" className="w-full form-input" />
                        <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Instagram URL" className="w-full form-input" />
                        <input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="Twitter URL" className="w-full form-input" />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium">Portfolio URL</label>
                    <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://your-portfolio.com" className="w-full form-input mt-1" />
                </div>
                <div className="flex justify-end pt-4 border-t dark:border-gray-600 gap-2">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400 flex items-center justify-center">
                        {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSaving ? 'Saving...' : 'Save Member'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


// Main page
const AdminTeamPage: React.FC = () => {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);
    const { showToast } = useToast();
    
    // Fetch data using onSnapshot for real-time updates
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "teamMembers"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
            setTeamMembers(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching team members:", error);
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, []);

    const handleSave = async (data: Partial<Omit<TeamMember, 'id'>>, photoFile?: File) => {
        setIsSaving(true);
        let photoUrl = memberToEdit?.photoUrl || '';
        let deleteToken: string | undefined = memberToEdit?.deleteToken;

        try {
            // Step 1: Handle photo upload if a new file is provided
            if (photoFile) {
                // (Optional but good practice) Delete old photo from Cloudinary if editing and old token exists
                if (memberToEdit?.deleteToken) {
                     fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/delete_by_token', {
                        method: 'POST',
                        body: new URLSearchParams({ token: memberToEdit.deleteToken })
                    }).catch(err => console.error("Failed to delete old image:", err));
                }

                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('upload_preset', 'filereceive');
                const response = await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload', { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Cloudinary upload failed.');
                const uploadData = await response.json();
                photoUrl = uploadData.secure_url;
                deleteToken = uploadData.delete_token;
            }

            const finalData: any = { ...data, photoUrl };
            
            if (deleteToken) {
                finalData.deleteToken = deleteToken;
            }
            
            if (memberToEdit) {
                // Update
                const docRef = doc(db, "teamMembers", memberToEdit.id);
                await updateDoc(docRef, finalData);
            } else {
                // Add new
                await addDoc(collection(db, "teamMembers"), { ...finalData, createdAt: serverTimestamp() });
            }
            showToast("Team member saved successfully!");
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving team member:", error);
            showToast(`Failed to save: ${(error as Error).message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const executeDelete = async () => {
        if (!confirmDelete) return;
        
        try {
            if (confirmDelete.deleteToken) {
                await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/delete_by_token', {
                    method: 'POST',
                    body: new URLSearchParams({ token: confirmDelete.deleteToken })
                });
            }
            await deleteDoc(doc(db, "teamMembers", confirmDelete.id));
            showToast("Team member deleted.");
        } catch (error) {
            console.error("Error deleting team member:", error);
            showToast("Failed to delete member.", 'error');
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to delete {confirmDelete.name}?</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}

            <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                 <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <UserGroupIcon className="h-6 w-6"/>
                    Manage Our Team
                </h1>
                <button onClick={() => { setMemberToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">
                    <PlusIcon className="h-5 w-5" /> Add New Member
                </button>
            </header>

            {loading ? <p>Loading team members...</p> : (
                 <div className="space-y-4">
                    {teamMembers.length > 0 ? teamMembers.map(member => (
                        <div key={member.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <ProgressiveImage src={member.photoUrl} alt={member.name} className="w-16 h-16 object-cover rounded-full flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white">{member.name} <span className="text-xs text-gray-400">(Order: {member.order})</span></h3>
                                    <p className="text-sm text-purple-600 dark:text-purple-400">{member.position}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setMemberToEdit(member); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:text-blue-800" title="Edit"><PencilIcon className="h-5 w-5"/></button>
                                <button onClick={() => setConfirmDelete(member)} className="p-2 text-red-600 hover:text-red-800" title="Delete"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-500 py-8">No team members added yet.</p>}
                 </div>
            )}
            
            <TeamMemberFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                memberToEdit={memberToEdit}
                isSaving={isSaving}
            />
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminTeamPage;