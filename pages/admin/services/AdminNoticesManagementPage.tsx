import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { collection, getDocs, query, where, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Notice } from '../../../types';
import { PlusCircleIcon, TrashIcon, PencilIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import Modal from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';

type OnSaveNotice = (
    data: Omit<Notice, 'id' | 'createdAt' | 'imageUrl' | 'fileUrl'> & { fileUrl?: string },
    fileToUpload?: File | null,
    previewImageToUpload?: File | null
) => void;

const NoticeFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: OnSaveNotice;
    entryToEdit: Notice | null;
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, entryToEdit, isSaving }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [type, setType] = useState<Notice['type']>('our');
    const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('url');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
    const [previewImagePreview, setPreviewImagePreview] = useState<string>('');
    
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [previewType, setPreviewType] = useState<'none' | 'image' | 'iframe' | 'unsupported'>('none');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewImageInputRef = useRef<HTMLInputElement>(null);

    // Effect to populate form when editing
    useEffect(() => {
        if (entryToEdit) {
            setTitle(entryToEdit.title);
            setDate(entryToEdit.date);
            setFileUrl(entryToEdit.fileUrl);
            setType(entryToEdit.type);
            setUploadMethod('url'); 
            setSelectedFile(null);
            setPreviewImageFile(null);
            setPreviewImagePreview(entryToEdit.imageUrl || '');
        } else {
            setTitle('');
            setDate(new Date().toISOString().split('T')[0]);
            setFileUrl('');
            setType('our');
            setUploadMethod('url');
            setSelectedFile(null);
            setPreviewImageFile(null);
            setPreviewImagePreview('');
        }
    }, [entryToEdit, isOpen]);

    // Effect to manage the main file preview
    useEffect(() => {
        let objectUrl: string | null = null;
        setPreviewUrl('');
        setPreviewType('none');

        if (uploadMethod === 'upload' && selectedFile) {
            const fileType = selectedFile.type;
            if (fileType.startsWith('image/')) {
                objectUrl = URL.createObjectURL(selectedFile);
                setPreviewUrl(objectUrl);
                setPreviewType('image');
            } else if (fileType === 'application/pdf') {
                objectUrl = URL.createObjectURL(selectedFile);
                setPreviewUrl(objectUrl);
                setPreviewType('iframe');
            } else {
                setPreviewType('unsupported');
            }
        } else if (uploadMethod === 'url' && fileUrl) {
            const lowerUrl = fileUrl.toLowerCase();
            if (lowerUrl.match(/\.(jpeg|jpg|gif|png)$/)) {
                setPreviewUrl(fileUrl);
                setPreviewType('image');
            } else if (fileUrl) {
                let finalPreviewUrl = '';
                const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
                const match = fileUrl.match(driveRegex);

                if (match && match[1]) {
                    const fileId = match[1];
                    // Use the specific /preview URL for embedding Google Drive files
                    finalPreviewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                } else {
                    // Use Google Docs viewer as a fallback for other document links (like PDFs)
                    const encodedUrl = encodeURIComponent(fileUrl);
                    finalPreviewUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
                }
                setPreviewUrl(finalPreviewUrl);
                setPreviewType('iframe');
            }
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [fileUrl, selectedFile, uploadMethod]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setFileUrl(''); 
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileUrl(e.target.value);
        if (selectedFile) {
            setSelectedFile(null); 
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handlePreviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreviewImageFile(file);
            setPreviewImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (uploadMethod === 'upload') {
            onSave({ title, date, type }, selectedFile, previewImageFile);
        } else {
            onSave({ title, date, type, fileUrl }, null, previewImageFile);
        }
    };

    const tabClass = (isActive: boolean) => 
        `w-1/2 py-2 text-sm font-semibold rounded-md transition-colors duration-300 ${isActive ? 'bg-purple-600 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={entryToEdit ? 'Edit Notice' : 'Add New Notice'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Common fields */}
                <div>
                    <label className="text-sm font-medium">Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="w-full form-input mt-1" required disabled={isSaving}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full form-input mt-1" required disabled={isSaving}/>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Notice Type</label>
                        <select value={type} onChange={e => setType(e.target.value as Notice['type'])} className="w-full form-input mt-1" required disabled={isSaving}>
                            <option value="our">Our Notice</option>
                            <option value="psc">PSC/Vacancy</option>
                        </select>
                    </div>
                </div>

                {/* Main Notice File */}
                <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
                    <button type="button" onClick={() => setUploadMethod('url')} className={tabClass(uploadMethod === 'url')} disabled={isSaving}>Use URL</button>
                    <button type="button" onClick={() => setUploadMethod('upload')} className={tabClass(uploadMethod === 'upload')} disabled={isSaving}>Upload File</button>
                </div>

                {uploadMethod === 'url' ? (
                    <div>
                        <label className="text-sm font-medium">Notice File URL (PDF, Doc, Image, Drive Link)</label>
                        <input type="url" value={fileUrl} onChange={handleUrlChange} placeholder="https://example.com/file.pdf" className="w-full form-input mt-1" required={uploadMethod === 'url'} disabled={isSaving}/>
                    </div>
                ) : (
                    <div>
                        <label className="text-sm font-medium">Notice File (PDF, Doc, Image, etc.)</label>
                        <input 
                            type="file" 
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                            onChange={handleFileChange} 
                            ref={fileInputRef}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mt-1" 
                            required={uploadMethod === 'upload'} 
                            disabled={isSaving}
                        />
                    </div>
                )}
                {previewType !== 'none' && (
                     <div>
                        <label className="text-sm font-medium">Notice File Preview</label>
                        {previewType === 'image' && <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-48 object-contain mt-2 border dark:border-gray-600 rounded-md" />}
                        {previewType === 'iframe' && <iframe src={previewUrl} className="w-full h-48 mt-2 border dark:border-gray-600 rounded-md" title="File Preview" frameBorder="0"></iframe>}
                        {previewType === 'unsupported' && <div className="w-full mt-2 border-2 border-dashed dark:border-gray-600 rounded-md flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 p-4 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">Live preview not available for this file type.</p></div>}
                    </div>
                )}

                 {/* Homepage Preview Image */}
                 <div className="pt-4 border-t dark:border-gray-600">
                    <label className="text-sm font-medium">Homepage Preview Image (Optional)</label>
                    <p className="text-xs text-gray-500 mb-2">Upload a specific image to show on the homepage. If not provided, the app will try to use the main notice file as a preview.</p>
                     <input 
                        type="file" 
                        accept="image/*"
                        onChange={handlePreviewImageChange}
                        ref={previewImageInputRef}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" 
                        disabled={isSaving}
                    />
                    {previewImagePreview && (
                        <div className="mt-2">
                            <img src={previewImagePreview} alt="Homepage Preview" className="h-24 w-auto rounded-md border dark:border-gray-600 shadow-sm"/>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-end pt-4 border-t dark:border-gray-600 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center disabled:bg-purple-400" disabled={isSaving}>
                        {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSaving ? (uploadMethod === 'upload' ? 'Uploading...' : 'Saving...') : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const AdminNoticesManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<Notice | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();
    const [confirmDelete, setConfirmDelete] = useState<Notice | null>(null);

    const fetchNotices = useCallback(async (type: 'our' | 'psc') => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "notices"),
                where("type", "==", type)
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

            noticeList.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

            return noticeList;
        } catch (error) {
            console.error(`Error fetching ${type} notices:`, error);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);


    const [ourNotices, setOurNotices] = useState<Notice[]>([]);
    const [pscNotices, setPscNotices] = useState<Notice[]>([]);

    const refreshAllNotices = useCallback(async () => {
        setLoading(true);
        const [our, psc] = await Promise.all([
            fetchNotices('our'),
            fetchNotices('psc')
        ]);
        setOurNotices(our);
        setPscNotices(psc);
        setLoading(false);
    }, [fetchNotices]);

    useEffect(() => {
        refreshAllNotices();
    }, [refreshAllNotices]);

    const handleSave = async (
        data: Omit<Notice, 'id' | 'createdAt' | 'imageUrl' | 'fileUrl'> & { fileUrl?: string },
        fileToUpload?: File | null,
        previewImageToUpload?: File | null
    ) => {
        setIsSaving(true);
        let finalFileUrl = data.fileUrl || entryToEdit?.fileUrl || '';
        let finalImageUrl = entryToEdit?.imageUrl || ''; 

        try {
            // Handle main file upload
            if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('upload_preset', 'filereceive');

                const response = await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || 'Cloudinary upload for main file failed.');
                }
                const uploadData = await response.json();
                finalFileUrl = uploadData.secure_url;
            }

            // Handle homepage preview image upload
            if (previewImageToUpload) {
                const formData = new FormData();
                formData.append('file', previewImageToUpload);
                formData.append('upload_preset', 'filereceive');

                const response = await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || 'Cloudinary upload for preview image failed.');
                }
                const uploadData = await response.json();
                finalImageUrl = uploadData.secure_url;
            }

            if (!finalFileUrl) {
                throw new Error("A file URL or an uploaded file is required for the notice.");
            }
            
            const saveData: Omit<Notice, 'id' | 'createdAt'> = {
                ...data,
                fileUrl: finalFileUrl,
                imageUrl: finalImageUrl || undefined,
            };

            if (entryToEdit) {
                const docRef = doc(db, "notices", entryToEdit.id);
                await updateDoc(docRef, saveData);
                showToast("Notice updated successfully.");
            } else {
                await addDoc(collection(db, "notices"), {
                    ...saveData,
                    createdAt: serverTimestamp()
                });
                showToast("Notice added successfully.");
            }
            refreshAllNotices();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving notice:", error);
            showToast(`Failed to save notice: ${(error as Error).message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, "notices", confirmDelete.id));
            showToast("Notice deleted successfully.");
            refreshAllNotices();
        } catch (error) {
            console.error("Error deleting notice:", error);
            showToast("Failed to delete notice.", "error");
        } finally {
            setConfirmDelete(null);
        }
    };
    
    const renderTable = (data: Notice[]) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(entry => (
                        <tr key={entry.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                            <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">{entry.title}</th>
                            <td className="px-6 py-4">{entry.date}</td>
                            <td className="px-6 py-4 flex items-center gap-4">
                                <button onClick={() => { setEntryToEdit(entry); setIsModalOpen(true); }} className="text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                                <button onClick={() => setConfirmDelete(entry)} className="text-red-600"><TrashIcon className="h-5 w-5" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to delete "{confirmDelete.title}"?</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}
            <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Notices</h1>
                <button onClick={() => { setEntryToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg">
                    <PlusCircleIcon className="h-5 w-5" /> Add New Notice
                </button>
            </header>

            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-semibold mb-4">Our Notices</h2>
                    {loading ? <p>Loading...</p> : renderTable(ourNotices)}
                </div>
                <div>
                    <h2 className="text-xl font-semibold mb-4">PSC/Vacancy Notices</h2>
                     {loading ? <p>Loading...</p> : renderTable(pscNotices)}
                </div>
            </div>

            <NoticeFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                entryToEdit={entryToEdit}
                isSaving={isSaving}
            />
             <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminNoticesManagementPage;