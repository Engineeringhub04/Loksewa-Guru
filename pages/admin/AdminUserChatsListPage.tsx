import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import type { AuthUser } from '../../types';
import { ChatBubbleLeftRightIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const AdminUserChatsListPage: React.FC = () => {
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'users'), orderBy('fullName'));
                const querySnapshot = await getDocs(q);
                const userList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { 
                        uid: doc.id, 
                        ...data,
                        subscriptionExpiry: data.subscriptionExpiry ? (data.subscriptionExpiry as Timestamp).toDate() : null,
                    } as AuthUser
                });
                setUsers(userList);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    if (loading) {
        return <div className="p-6">Loading users...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 text-purple-500" />
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">User AI Chat History</h1>
            </header>
            <div className="space-y-3">
                {users.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No users found.</p>
                ) : (
                    users.map(user => (
                        <Link
                            key={user.uid}
                            to={`/admin/user-chats/${user.uid}`}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <img
                                    src={user.photoUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user.fullName || 'User'}`}
                                    alt="avatar"
                                    className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 object-cover"
                                />
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{user.fullName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                </div>
                            </div>
                            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminUserChatsListPage;