import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { AuthUser } from '../../types';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Modal from '../../components/Modal';
import { LOKSEWA_COURSES } from '../../constants';
import { useToast } from '../../contexts/ToastContext';

interface UserData extends AuthUser {
    createdAt: Date;
}

const UserEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: UserData;
    onSave: (uid: string, data: Partial<AuthUser>) => Promise<void>;
}> = ({ isOpen, onClose, user, onSave }) => {
    const [formData, setFormData] = useState({
        fullName: user.fullName || '',
        course: user.course || '',
        gender: user.gender || 'prefer_not_to_say',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData({
            fullName: user.fullName || '',
            course: user.course || '',
            gender: user.gender || 'prefer_not_to_say',
        });
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(user.uid, formData);
        setIsSaving(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${user.fullName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full form-input mt-1" />
                </div>
                <div>
                    <label className="text-sm font-medium">Course</label>
                    <select name="course" value={formData.course} onChange={handleChange} className="w-full form-input mt-1">
                        {LOKSEWA_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full form-input mt-1">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                </div>
                <div className="flex justify-end pt-4 border-t dark:border-gray-600 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-purple-600 text-white rounded-md">{isSaving ? 'Saving...' : 'Save'}</button>
                </div>
                 <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
            </form>
        </Modal>
    );
};

const UserCard: React.FC<{ user: UserData; onDelete: (uid: string, name?: string) => void; onEdit: (user: UserData) => void; }> = ({ user, onDelete, onEdit }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
        <div className="flex items-center gap-4">
            <img 
                src={user.photoUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user.fullName || user.email}`} 
                alt="avatar" 
                className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 object-cover"
            />
            <div>
                <p className="font-bold text-gray-800 dark:text-gray-100">{user.fullName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full inline-block">{user.course || 'Not specified'}</p>
                    {(() => {
                        const status = user.subscriptionStatus;
                        if (status === 'active') {
                            return (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                    {user.planName || 'Active'}
                                </span>
                            );
                        } else if (status === 'pending') {
                            return (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 capitalize">
                                    {status}
                                </span>
                            );
                        } else if (status === 'failed') {
                            return (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 capitalize">
                                    {status}
                                </span>
                            );
                        } else { // 'none', 'expired', or undefined
                             return (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                    Unactive
                                </span>
                            );
                        }
                    })()}
                </div>
            </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
            <p className="text-xs text-gray-400">Joined: {user.createdAt?.toLocaleDateString()}</p>
            <div className="flex gap-2 mt-1">
                <button onClick={() => onEdit(user)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" aria-label="Edit user"><PencilIcon className="h-5 w-5"/></button>
                <button onClick={() => onDelete(user.uid, user.fullName)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors" aria-label="Delete user"><TrashIcon className="h-5 w-5"/></button>
            </div>
        </div>
    </div>
);


const AdminUsersPage: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<UserData | null>(null);
    const { showToast } = useToast();
    
    const [confirmDelete, setConfirmDelete] = useState<{ uid: string, fullName?: string } | null>(null);


    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const userList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    uid: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    subscriptionExpiry: data.subscriptionExpiry ? (data.subscriptionExpiry as Timestamp).toDate() : null,
                } as UserData
            });
            setUsers(userList);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError("Failed to load user data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
  
    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const executeDelete = async () => {
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, 'users', confirmDelete.uid));
            setUsers(prevUsers => prevUsers.filter(user => user.uid !== confirmDelete.uid));
            showToast('User data record deleted successfully.');
        } catch (err) {
            console.error("Error deleting user:", err);
            showToast(`Failed to delete user data: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`, 'error');
        } finally {
            setConfirmDelete(null);
        }
    };

    const handleEditUser = (user: UserData) => {
        setUserToEdit(user);
        setIsEditModalOpen(true);
    };
    
    const handleSaveUser = async (uid: string, data: Partial<AuthUser>) => {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, data);
            showToast("User updated successfully!");
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            showToast("Failed to update user details.", 'error');
        }
    };

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

    return (
        <div>
            {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>Are you sure you want to delete the user "{confirmDelete.fullName || 'N/A'}"?</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">Note: This only removes their data record. Their login account must be deleted manually from the Firebase Authentication console.</p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">User Management</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">View, edit, or remove users from the system.</p>
            </div>

            <div className="relative mb-6">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                 </div>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>
            
            {loading ? (
                <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-4">Loading users...</p>
                </div>
            ) : error ? (
                <div className="text-center p-8 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg">{error}</div>
            ) : (
                <>
                    <div className="space-y-4">
                        {paginatedUsers.length > 0 ? (
                            paginatedUsers.map(user => <UserCard key={user.uid} user={user} onDelete={(uid, fullName) => setConfirmDelete({ uid, fullName })} onEdit={handleEditUser} />)
                        ) : (
                            <p className="text-center py-8 text-gray-500">No users found.</p>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-6 flex justify-between items-center text-sm">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
                            >
                                <ChevronLeftIcon className="h-4 w-4"/> Previous
                            </button>
                            <span>Page {currentPage} of {totalPages}</span>
                             <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
                            >
                                Next <ChevronRightIcon className="h-4 w-4"/>
                            </button>
                        </div>
                    )}
                </>
            )}
            {isEditModalOpen && userToEdit && (
                <UserEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    user={userToEdit}
                    onSave={handleSaveUser}
                />
            )}
        </div>
    );
};

export default AdminUsersPage;