import React, { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateEmail } from 'firebase/auth';

import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { EyeIcon, EyeOffIcon } from '../../constants';
import { useToast } from '../../contexts/ToastContext';

const ToggleSwitch: React.FC<{ label: string, enabled: boolean, setEnabled: (enabled: boolean) => void, description?: string }> = ({ label, enabled, setEnabled, description }) => (
    <div>
        <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                aria-checked={enabled}
                role="switch"
            >
                <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>
        </div>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
    </div>
);


const AdminSettingsPage: React.FC = () => {
    const [settings, setSettings] = useState({
        appName: 'Loksewa Guru',
        appTagline: 'Your comprehensive guide to Loksewa preparation.',
        maintenanceMode: false,
    });
    
    const [emailSettings, setEmailSettings] = useState({
        receivedFilesEmail: '',
    });
    
    const [credentials, setCredentials] = useState({
        email: auth.currentUser?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            const generalSettingsDocRef = doc(db, 'settings', 'general');
            const emailSettingsDocRef = doc(db, 'settings', 'email');
            
            const [generalSnap, emailSnap] = await Promise.all([
                getDoc(generalSettingsDocRef),
                getDoc(emailSettingsDocRef)
            ]);

            if (generalSnap.exists()) {
                setSettings(generalSnap.data() as any);
            }
            if (emailSnap.exists()) {
                setEmailSettings(emailSnap.data() as any);
            }
            
            setIsLoading(false);
        };
        fetchSettings();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };
    
     const handleCredentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
    };

    const handleEmailSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEmailSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const currentUser = auth.currentUser;
        if (!currentUser) {
            showToast("Error: Not authenticated. Please log in again.", "error");
            setIsSaving(false);
            return;
        }

        try {
            // -- Handle Credentials Change --
            if (credentials.currentPassword && (credentials.newPassword || credentials.email !== currentUser.email)) {
                const credential = EmailAuthProvider.credential(currentUser.email!, credentials.currentPassword);
                await reauthenticateWithCredential(currentUser, credential);
                
                if (credentials.newPassword) {
                    if (credentials.newPassword !== credentials.confirmNewPassword) {
                        throw new Error("New passwords do not match.");
                    }
                    await updatePassword(currentUser, credentials.newPassword);
                }

                if (credentials.email !== currentUser.email) {
                    await updateEmail(currentUser, credentials.email);
                }
            }

            // -- Save General & Email Settings to Firestore --
            await Promise.all([
                setDoc(doc(db, 'settings', 'general'), settings),
                setDoc(doc(db, 'settings', 'email'), emailSettings)
            ]);
            
            showToast("Settings saved successfully!");
            setCredentials(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));

        } catch (error: any) {
            console.error("Error saving settings:", error);
            showToast(`Failed to save settings: ${error.message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <p>Loading settings...</p>;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">System Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage global configuration for the application.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* General Settings */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-3">General</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">App Name</label>
                            <input type="text" name="appName" id="appName" value={settings.appName} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" />
                        </div>
                         <div>
                            <label htmlFor="appTagline" className="block text-sm font-medium text-gray-700 dark:text-gray-300">App Tagline</label>
                            <textarea name="appTagline" id="appTagline" value={settings.appTagline} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" />
                        </div>
                    </div>
                </div>

                 {/* Notification Settings */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-3">Notification Settings</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="receivedFilesEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email for Receiving Files</label>
                            <input type="email" name="receivedFilesEmail" id="receivedFilesEmail" value={emailSettings.receivedFilesEmail} onChange={handleEmailSettingsChange} placeholder="admin-notifications@example.com" className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" />
                            <p className="text-xs text-gray-500 mt-1">This email will be used as the recipient for the 'Send to Email' feature on the File Receive page.</p>
                        </div>
                    </div>
                </div>

                {/* Admin Credentials */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-3">Admin Credentials</h2>
                    <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium">Admin Email</label>
                            <input type="email" name="email" value={credentials.email} onChange={handleCredentialChange} className="mt-1 w-full p-2 border rounded-lg dark:bg-gray-700" />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium">Current Password</label>
                            <input type={showCurrentPassword ? 'text' : 'password'} name="currentPassword" value={credentials.currentPassword} onChange={handleCredentialChange} className="mt-1 w-full p-2 border rounded-lg dark:bg-gray-700" placeholder="Required to change email/password" />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                {showCurrentPassword ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
                            </button>
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium">New Password</label>
                            <input type={showNewPassword ? 'text' : 'password'} name="newPassword" value={credentials.newPassword} onChange={handleCredentialChange} className="mt-1 w-full p-2 border rounded-lg dark:bg-gray-700" placeholder="Leave blank to keep current" />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                 {showNewPassword ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
                            </button>
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Confirm New Password</label>
                            <input type={showNewPassword ? 'text' : 'password'} name="confirmNewPassword" value={credentials.confirmNewPassword} onChange={handleCredentialChange} className="mt-1 w-full p-2 border rounded-lg dark:bg-gray-700" />
                        </div>
                    </div>
                </div>

                {/* Maintenance Settings */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-3">Maintenance</h2>
                    <ToggleSwitch
                        label="Maintenance Mode"
                        enabled={settings.maintenanceMode}
                        setEnabled={(value) => setSettings(prev => ({ ...prev, maintenanceMode: value }))}
                        description="When enabled, users will see a maintenance page and won't be able to access the app."
                    />
                </div>

                 {/* API & Security */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-3">API & Security</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gemini API Key</label>
                         <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                             <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0"/>
                             <span>The API key is securely managed through environment variables and is not editable here.</span>
                         </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t dark:border-gray-700">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md disabled:bg-purple-400"
                    >
                        {isSaving ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminSettingsPage;