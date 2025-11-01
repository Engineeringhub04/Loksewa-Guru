import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/solid';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { LOKSEWA_COURSES } from '../constants';
import Modal from '../components/Modal';

const InfoRow: React.FC<{ label: string; value: string | undefined; onEdit?: () => void }> = ({ label, value, onEdit }) => (
    <div className="flex items-center justify-between py-4 border-b dark:border-gray-700">
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{value || 'Not set'}</p>
        </div>
        {onEdit && (
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-purple-600" aria-label={`Edit ${label}`}>
                <PencilIcon className="h-5 w-5" />
            </button>
        )}
    </div>
);

const EditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: string) => void;
    fieldLabel: string;
    initialValue: string;
    fieldType?: 'text' | 'select';
    options?: string[];
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, fieldLabel, initialValue, fieldType = 'text', options = [], isSaving }) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
        }
    }, [isOpen, initialValue]);

    const handleSave = () => {
        onSave(value);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${fieldLabel}`}>
            <div className="space-y-4">
                {fieldType === 'text' ? (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                        disabled={isSaving}
                    />
                ) : (
                    <select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                        disabled={isSaving}
                    >
                        {options.map(option => (
                            <option key={option} value={option} className="capitalize">{option.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                )}
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md" disabled={isSaving}>Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded-md flex items-center justify-center disabled:bg-purple-400" disabled={isSaving}>
                        {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const AccountSettingsPage: React.FC = () => {
    const { user, loading, updateUserContext } = useAuth();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<{ label: string, key: string, type?: 'text' | 'select', options?: string[] } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleEdit = (label: string, key: string, type: 'text' | 'select' = 'text', options?: string[]) => {
        setEditingField({ label, key, type, options });
        setIsModalOpen(true);
    };

    const handleSave = async (newValue: string) => {
        if (!user || !editingField) return;

        setIsSaving(true);
        const userRef = doc(db, 'users', user.uid);
        try {
            await setDoc(userRef, {
                [editingField.key]: newValue
            }, { merge: true });

            // Update the user object in the AuthContext to reflect changes immediately
            updateUserContext({ [editingField.key]: newValue });
            
            alert(`${editingField.label} updated successfully!`);
            setIsModalOpen(false);
            setEditingField(null);
        } catch (error) {
            console.error("Error updating user data:", error);
            alert(`Failed to update ${editingField.label}.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditEmail = () => alert('Changing email requires re-authentication and is not supported from this screen. Please contact support.');

    if (loading) {
        return <div className="p-6 text-center">Loading account details...</div>;
    }

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <>
            <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900 pb-24">
                <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                    <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Profile">
                        <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                    </Link>
                    <div className="flex-1 text-center">
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Account Settings</h1>
                    </div>
                    <div className="w-10"></div>
                </header>

                <main className="flex-1 p-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Personal Information</h2>
                        <InfoRow label="Full Name" value={user?.fullName} onEdit={() => handleEdit('Full Name', 'fullName')} />
                        <InfoRow label="Email Address" value={user?.email || undefined} onEdit={handleEditEmail} />
                        <InfoRow label="Course" value={user?.course} onEdit={() => handleEdit('Course', 'course', 'select', LOKSEWA_COURSES)} />
                        <InfoRow label="Gender" value={user?.gender} onEdit={() => handleEdit('Gender', 'gender', 'select', ['male', 'female', 'other', 'prefer_not_to_say'])} />
                    </div>
                </main>
            </div>
            {editingField && (
                 <EditModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    fieldLabel={editingField.label}
                    initialValue={(user as any)[editingField.key] || ''}
                    fieldType={editingField.type}
                    options={editingField.options}
                    isSaving={isSaving}
                />
            )}
        </>
    );
};

export default AccountSettingsPage;