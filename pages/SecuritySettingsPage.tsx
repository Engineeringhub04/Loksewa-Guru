import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, KeyIcon, ComputerDesktopIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import Modal from '../components/Modal';
import { EyeIcon, EyeOffIcon } from '../constants';


const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);

        const auth = getAuth();
        const user = auth.currentUser;

        if (!user || !user.email) {
            setError('Could not find user. Please log in again.');
            setIsLoading(false);
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            setSuccess('Password updated successfully! You have been signed out from all other devices.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setError('The current password you entered is incorrect.');
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Change Password & Sign Out">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 mb-4">
                    For your security, changing your password will sign you out from all other active sessions on other devices.
                </p>
                <div className="relative">
                    <label className="text-sm font-medium">Current Password</label>
                    <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full form-input mt-1" required />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-8 text-gray-400">
                        {showCurrent ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                    </button>
                </div>
                <div className="relative">
                    <label className="text-sm font-medium">New Password</label>
                    <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full form-input mt-1" required />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-8 text-gray-400">
                        {showNew ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                    </button>
                </div>
                 <div>
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full form-input mt-1" required />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-green-500 text-sm">{success}</p>}
                <div className="flex justify-end pt-2 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" disabled={isLoading} className="px-4 py-2 bg-purple-600 text-white rounded-md disabled:bg-purple-400">{isLoading ? 'Saving...' : 'Save Password'}</button>
                </div>
            </form>
        </Modal>
    );
};

const ActiveSessionsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSignOutOther: () => void;
}> = ({ isOpen, onClose, onSignOutOther }) => {
    
    const parseUserAgent = (ua: string) => {
        let browser = 'Unknown Browser';
        let os = 'Unknown OS';

        if (/windows/i.test(ua)) os = 'Windows';
        else if (/macintosh|mac os x/i.test(ua)) os = 'Mac OS';
        else if (/android/i.test(ua)) os = 'Android';
        else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
        else if (/linux/i.test(ua)) os = 'Linux';

        if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
        else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
        else if (/firefox/i.test(ua)) browser = 'Firefox';
        else if (/edge/i.test(ua)) browser = 'Edge';
        
        return `${browser} on ${os}`;
    };
    
    const currentDevice = parseUserAgent(navigator.userAgent);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Active Sessions">
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    For security reasons, we can only display details for your current session.
                </p>
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">Current Device</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{currentDevice}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Active now</p>
                </div>
                <div className="pt-4 border-t dark:border-gray-600">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">Sign out from other devices?</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        The most secure way to sign out from everywhere else is to change your password. This will invalidate all other login sessions.
                    </p>
                    <button 
                        onClick={onSignOutOther} 
                        className="w-full mt-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                    >
                        Sign Out From All Other Devices
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const SecurityOption: React.FC<{ icon: React.ElementType; title: string; description: string; onClick: () => void; }> = ({ icon: Icon, title, description, onClick }) => (
    <button onClick={onClick} className="w-full text-left flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <Icon className="h-8 w-8 text-purple-500 flex-shrink-0" />
        <div className="ml-4 flex-1">
            <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto flex-shrink-0" />
    </button>
);


const SecuritySettingsPage: React.FC = () => {
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);

    const handleOpenSignOutFlow = () => {
        setIsSessionsModalOpen(false);
        setIsPasswordModalOpen(true);
    };

    return (
        <>
            <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900 pb-24">
                <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                    <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Profile">
                        <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                    </Link>
                    <div className="flex-1 text-center">
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Security Settings</h1>
                    </div>
                    <div className="w-10"></div>
                </header>

                <main className="flex-1 p-4">
                    <div className="space-y-4">
                        <SecurityOption 
                            icon={KeyIcon}
                            title="Change Password"
                            description="Choose a strong password and don't reuse it for other accounts."
                            onClick={() => setIsPasswordModalOpen(true)}
                        />
                        <SecurityOption 
                            icon={ComputerDesktopIcon}
                            title="Active Login Devices"
                            description="View your current session and sign out from other devices."
                            onClick={() => setIsSessionsModalOpen(true)}
                        />
                    </div>
                </main>
            </div>
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
            <ActiveSessionsModal
                isOpen={isSessionsModalOpen}
                onClose={() => setIsSessionsModalOpen(false)}
                onSignOutOther={handleOpenSignOutFlow}
            />
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </>
    );
};

export default SecuritySettingsPage;