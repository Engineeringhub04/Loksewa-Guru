import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { PracticeSet } from '../../types';
import { PlusCircleIcon, ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';

const AdminPracticeSetsPage: React.FC = () => {
    const { courseKey } = useParams<{ courseKey: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [sets, setSets] = useState<PracticeSet[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSets = useCallback(async () => {
        if (!courseKey) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "practiceSets"), 
                where("courseKey", "==", courseKey)
                // orderBy("createdAt", "desc") clause removed to prevent index error
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: (doc.data().createdAt as Timestamp).toDate(),
                updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
            } as PracticeSet));
            
            // Sort the sets by creation date on the client-side
            list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            setSets(list);
        } catch (error) {
            showToast("Failed to load question sets.", "error");
            console.error(error);
        }
        setLoading(false);
    }, [courseKey, showToast]);

    useEffect(() => {
        fetchSets();
    }, [fetchSets]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate('/admin/questions-practice')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold">Manage Sets for <span className="text-purple-600">{courseKey}</span></h1>
                    <button onClick={() => navigate(`/admin/practice-sets/new?courseKey=${courseKey}`)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg self-start sm:self-center">
                        <PlusCircleIcon className="h-5 w-5"/> Create New Set
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-8">Loading sets...</div>
            ) : sets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No sets found for this course.</div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3">Title</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3"># Questions</th>
                                    <th className="px-6 py-3">Last Updated</th>
                                    <th className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sets.map(set => (
                                    <tr key={set.id} className="border-b dark:border-gray-700">
                                        <td className="px-6 py-4 font-semibold">{set.title}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${set.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                                {set.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{set.questions.length}</td>
                                        <td className="px-6 py-4">{set.updatedAt.toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => navigate(`/admin/practice-sets/edit/${set.id}`)} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                                                <PencilIcon className="h-4 w-4" /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-4">
                        {sets.map(set => (
                            <div key={set.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2 flex-1 pr-2">{set.title}</h3>
                                    <button onClick={() => navigate(`/admin/practice-sets/edit/${set.id}`)} className="p-2 -m-2 text-blue-500"><PencilIcon className="h-5 w-5"/></button>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${set.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                        {set.status}
                                    </span>
                                    <span className="text-gray-500">{set.questions.length} questions</span>
                                    <span className="text-gray-500">{set.updatedAt.toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminPracticeSetsPage;
