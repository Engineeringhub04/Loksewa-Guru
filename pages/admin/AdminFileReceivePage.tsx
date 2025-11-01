import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, getDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { SubmittedFile } from '../../types';
import { TrashIcon, DocumentArrowDownIcon, EnvelopeIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';

const AdminFileReceivePage: React.FC = () => {
    const [files, setFiles] = useState<SubmittedFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [recipientEmail, setRecipientEmail] = useState('');

    const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
    const [fileToNotify, setFileToNotify] = useState<SubmittedFile | null>(null);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { showToast } = useToast();
    
    const [confirmDelete, setConfirmDelete] = useState<SubmittedFile | null>(null);


    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch the recipient email first
            const emailDocRef = doc(db, 'settings', 'email');
            const emailDocSnap = await getDoc(emailDocRef);
            if (emailDocSnap.exists()) {
                setRecipientEmail(emailDocSnap.data().receivedFilesEmail || '');
            }

            // Fetch the submitted files
            const q = query(collection(db, "submittedFiles"), orderBy("submittedAt", "desc"));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    submittedAt: data.submittedAt ? (data.submittedAt as Timestamp).toDate() : new Date(),
                } as SubmittedFile;
            });
            setFiles(list);
        } catch (error) {
            console.error("Error fetching submitted files:", error);
            showToast("Failed to load submitted files.", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);
    
    const createDownloadUrl = (file: SubmittedFile): string => {
        const parts = file.downloadUrl.split('/upload/');
        if (parts.length !== 2) {
            // Return original URL if it doesn't match the expected Cloudinary structure
            return file.downloadUrl;
        }
        
        const baseUrl = parts[0];
        const assetPath = parts[1];
        
        // Extract filename without extension from the original file name
        // Cloudinary automatically appends the correct extension from the stored resource.
        const filenameWithoutExt = file.originalFileName.substring(0, file.originalFileName.lastIndexOf('.')) || file.originalFileName;

        // Construct the new URL with the attachment flag and custom filename
        const transformedUrl = `${baseUrl}/upload/fl_attachment:${encodeURIComponent(filenameWithoutExt)}/${assetPath}`;

        return transformedUrl;
    };


    const executeDelete = async () => {
        if (!confirmDelete) return;
        const fileToDelete = confirmDelete;
        
        try {
            if (fileToDelete.deleteToken) {
                const CLOUDINARY_CLOUD_NAME = 'dtuc0i86e';
                const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/delete_by_token`;
                
                const formData = new FormData();
                formData.append('token', fileToDelete.deleteToken);
    
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData,
                });
    
                const result = await response.json();
                if (result.result !== 'ok') {
                    console.error("Cloudinary deletion failed:", result);
                    throw new Error('Failed to delete file from cloud storage. The record was not deleted.');
                }
            } else {
                showToast("This file was uploaded without a cloud deletion token. The app record will be deleted, but you must remove the file from your Cloudinary account manually.", "info");
            }
            // If cloud deletion is successful (or not possible), delete from firestore
            await deleteDoc(doc(db, "submittedFiles", fileToDelete.id));
            setFiles(prevFiles => prevFiles.filter(f => f.id !== fileToDelete.id));
            showToast("File submission deleted successfully.");
        } catch (error: any) {
            console.error("Error during deletion process:", error);
            showToast(`Deletion failed: ${error.message}.`, "error");
        } finally {
            setConfirmDelete(null);
        }
    };
    
    const handleSendEmail = (file: SubmittedFile) => {
        if (!recipientEmail) {
            showToast("Please set the 'Email for Receiving Files' in the Admin Settings page first.", "info");
            return;
        }
        
        const subject = `File Review: ${file.fileName}`;
        const body = `A file has been submitted through the Loksewa Guru app and is ready for review.\n\n` +
                     `File Title: ${file.fileName}\n` +
                     `Submitted By: ${file.ownerName}\n` +
                     `Category: ${file.category}\n` +
                     `Message: ${file.message || 'N/A'}\n\n` +
                     `You can download the file here:\n${file.downloadUrl}\n\n` +
                     `Original Filename: ${file.originalFileName}`;
                     
        window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleNotifyUser = (file: SubmittedFile) => {
        if (!file.userId) {
            showToast("This user's ID is not available, so an in-app notification cannot be sent.", "info");
            return;
        }
    
        const defaultMessage = `Dear ${file.ownerName},\n\nThank you for sharing your file "${file.fileName}" with us.\n\nWe are pleased to inform you that your file has been reviewed and is now published on the Loksewa Guru app.\n\nWe appreciate your contribution to our community.\n\nBest regards,\nThe Loksewa Guru Team`;
        
        setNotificationMessage(defaultMessage);
        setFileToNotify(file);
        setIsNotifyModalOpen(true);
    };

    const handleSendInAppNotification = async () => {
        if (!fileToNotify || !fileToNotify.userId) {
            showToast("Cannot send notification: User ID is missing.", "error");
            return;
        }
        if (!notificationMessage.trim()) {
            showToast("Cannot send an empty message.", "error");
            return;
        }
        setIsSending(true);
        try {
            await addDoc(collection(db, 'notifications'), {
                userId: fileToNotify.userId,
                title: `Your submission "${fileToNotify.fileName}" has been published!`,
                message: notificationMessage,
                read: false,
                createdAt: serverTimestamp(),
                link: '/notes' 
            });
            showToast("In-app notification sent successfully!");
            setIsNotifyModalOpen(false);
            setFileToNotify(null);
        } catch (error) {
            console.error("Error sending notification:", error);
            showToast("Failed to send notification.", "error");
        } finally {
            setIsSending(false);
        }
    };

    if (loading) {
        return <div className="p-6">Loading received files...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
             {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to permanently delete the submission "{confirmDelete.fileName}"?</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">Note: This will also attempt to delete the file from cloud storage. This action cannot be undone.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}

            <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Received Files</h1>
            </header>

            {files.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">No files have been submitted by users yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">Submitted On</th>
                                <th className="px-6 py-3">File Title</th>
                                <th className="px-6 py-3">Owner</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map(file => (
                                <tr key={file.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                        {file.submittedAt ? new Date(file.submittedAt).toLocaleString() : 'N/A'}
                                    </td>
                                    <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        {file.fileName}
                                        <p className="text-xs font-normal text-gray-500">{file.message}</p>
                                    </th>
                                    <td className="px-6 py-4">{file.ownerName}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                            {file.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center gap-2">
                                        <a href={createDownloadUrl(file)} target="_blank" rel="noopener noreferrer" title="Download File" className="p-2 text-green-600 hover:text-green-800">
                                            <DocumentArrowDownIcon className="h-5 w-5" />
                                        </a>
                                        <button 
                                            onClick={() => handleNotifyUser(file)} 
                                            title={file.userId ? `Notify ${file.ownerName}` : "User ID not available"} 
                                            className="p-2 text-purple-600 hover:text-purple-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            disabled={!file.userId}
                                        >
                                            <PaperAirplaneIcon className="h-5 w-5" />
                                        </button>
                                         <button onClick={() => handleSendEmail(file)} title="Forward to Admin Email" className="p-2 text-blue-600 hover:text-blue-800">
                                            <EnvelopeIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => setConfirmDelete(file)} title="Delete Submission" className="p-2 text-red-600 hover:text-red-800">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isNotifyModalOpen} onClose={() => setIsNotifyModalOpen(false)} title={`Notify ${fileToNotify?.ownerName}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notification Message</label>
                        <textarea
                            rows={8}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            value={notificationMessage}
                            onChange={(e) => setNotificationMessage(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsNotifyModalOpen(false)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSendInAppNotification}
                            disabled={isSending}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400"
                        >
                            {isSending ? 'Sending...' : 'Send Notification'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminFileReceivePage;