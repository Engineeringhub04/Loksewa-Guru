import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Feedback, ChatMessage } from '../../types';
import { ChatBubbleLeftRightIcon, TrashIcon, EyeIcon, EnvelopeIcon, StarIcon, HandThumbUpIcon, HandThumbDownIcon, UserCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import Modal from '../../components/Modal';

const GeneralFeedbackCard: React.FC<{ feedback: Feedback; onMarkAsRead: (id: string) => void; onDelete: (feedback: Feedback) => void }> = ({ feedback, onMarkAsRead, onDelete }) => (
    <div className={`p-4 rounded-lg border-l-4 ${feedback.status === 'new' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'}`}>
        <div className="flex justify-between items-start">
            <div className="flex-1">
                {typeof feedback.rating === 'number' && (
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <StarIcon key={i} className={`h-5 w-5 ${i < feedback.rating! ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                            ))}
                        </div>
                        <span className="text-sm font-bold ml-1 text-gray-700 dark:text-gray-300">({feedback.rating}/5)</span>
                    </div>
                )}
                <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{feedback.message || <span className="italic text-gray-500">No additional message provided.</span>}</p>
                
                {(feedback.contactAllowed || feedback.joinResearch) && (
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 space-y-1">
                        {feedback.contactAllowed && <p className="flex items-center gap-1.5"><span className="text-green-500">✓</span> User agreed to be contacted.</p>}
                        {feedback.joinResearch && <p className="flex items-center gap-1.5"><span className="text-green-500">✓</span> User is interested in the Research Group.</p>}
                    </div>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t dark:border-gray-600 space-y-1">
                    <p><strong>From:</strong> {feedback.userName || 'Anonymous'} ({feedback.userEmail || 'No email'})</p>
                    <p><strong>Received:</strong> {feedback.createdAt?.toLocaleString()}</p>
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                {feedback.status === 'new' && <button onClick={() => onMarkAsRead(feedback.id)} title="Mark as Read" className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"><EyeIcon className="h-5 w-5" /></button>}
                {feedback.userEmail && <a href={`mailto:${feedback.userEmail}`} title="Reply via Email" className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><EnvelopeIcon className="h-5 w-5" /></a>}
                <button onClick={() => onDelete(feedback)} title="Delete" className="p-2 text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"><TrashIcon className="h-5 w-5" /></button>
            </div>
        </div>
    </div>
);

const AiChatFeedbackCard: React.FC<{ feedback: Feedback; onMarkAsRead: (id: string) => void; onDelete: (feedback: Feedback) => void }> = ({ feedback, onMarkAsRead, onDelete }) => {
    const isLiked = feedback.aiRating === 'liked';
    return (
        <div className={`p-4 rounded-lg border-l-4 ${feedback.status === 'new' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        {isLiked ? <HandThumbUpIcon className="h-6 w-6 text-green-500" /> : <HandThumbDownIcon className="h-6 w-6 text-red-500" />}
                        <span className={`font-bold text-lg ${isLiked ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                            Response {feedback.aiRating}
                        </span>
                    </div>

                    {feedback.message && <p className="text-gray-800 dark:text-gray-100 italic bg-gray-100 dark:bg-gray-800 p-2 rounded-md">"{feedback.message}"</p>}
                    
                    {feedback.dislikeReasons && feedback.dislikeReasons.length > 0 && (
                        <div className="mt-3">
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Reasons:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {feedback.dislikeReasons.map(reason => <span key={reason} className="text-xs bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 px-2 py-1 rounded-full">{reason}</span>)}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t dark:border-gray-600">
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Conversation Context</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-2">
                                <UserCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1"><strong className="text-blue-600 dark:text-blue-400">User:</strong> {feedback.context?.prompt?.parts.map(p => p.text).join('') || 'N/A'}</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <SparklesIcon className="h-5 w-5 text-purple-500 mt-0.5" />
                                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1"><strong className="text-purple-600 dark:text-purple-400">AI:</strong> {feedback.context?.response.parts.map(p => p.text).join('')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t dark:border-gray-600 space-y-1">
                        <p><strong>From:</strong> {feedback.userName || 'Anonymous'} ({feedback.userEmail || 'No email'})</p>
                        <p><strong>Received:</strong> {feedback.createdAt?.toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                    {feedback.status === 'new' && <button onClick={() => onMarkAsRead(feedback.id)} title="Mark as Read" className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"><EyeIcon className="h-5 w-5" /></button>}
                    {feedback.userEmail && <a href={`mailto:${feedback.userEmail}`} title="Reply via Email" className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><EnvelopeIcon className="h-5 w-5" /></a>}
                    <button onClick={() => onDelete(feedback)} title="Delete" className="p-2 text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"><TrashIcon className="h-5 w-5" /></button>
                </div>
            </div>
        </div>
    );
};


const AdminFeedbackPage: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState<Feedback | null>(null);

    useEffect(() => {
        const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const list = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date()
                } as Feedback;
            });
            setFeedbacks(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching feedback:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleMarkAsRead = async (id: string) => {
        const feedbackRef = doc(db, "feedback", id);
        await updateDoc(feedbackRef, { status: 'read' });
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, "feedback", confirmDelete.id));
        } catch (error) {
            console.error("Error deleting feedback:", error);
            alert("Failed to delete feedback.");
        } finally {
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to delete this feedback? This action cannot be undone.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}

            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 text-purple-500" />
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">User Feedback</h1>
            </header>
            <div className="space-y-4">
                {feedbacks.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No feedback has been submitted yet.</p>
                    </div>
                ) : (
                    feedbacks.map(item =>
                        item.type === 'ai_chat' ? (
                            <AiChatFeedbackCard key={item.id} feedback={item} onMarkAsRead={handleMarkAsRead} onDelete={setConfirmDelete} />
                        ) : (
                            <GeneralFeedbackCard key={item.id} feedback={item} onMarkAsRead={handleMarkAsRead} onDelete={setConfirmDelete} />
                        )
                    )
                )}
            </div>
        </div>
    );
};
export default AdminFeedbackPage;