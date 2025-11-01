import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BanknotesIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

interface GatewaySettings {
    showComingSoon: boolean;
    comingSoonText: string;
}

const ToggleSwitch: React.FC<{ enabled: boolean; setEnabled: (enabled: boolean) => void }> = ({ enabled, setEnabled }) => (
    <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        className={`${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
        aria-checked={enabled}
        role="switch"
    >
        <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
    </button>
);

const AdminPaymentGatewayPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState({
        esewa: { showComingSoon: false, comingSoonText: 'Coming Soon' },
        khalti: { showComingSoon: false, comingSoonText: 'Coming Soon' },
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const docRef = useCallback(() => doc(db, 'settings', 'paymentGateways'), []);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const docSnap = await getDoc(docRef());
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSettings(prev => ({
                    esewa: data.esewa || prev.esewa,
                    khalti: data.khalti || prev.khalti,
                }));
            }
            setLoading(false);
        };
        fetchSettings();
    }, [docRef]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(docRef(), settings);
            showToast("Payment gateway settings saved successfully!");
        } catch (error) {
            showToast("Failed to save settings.", "error");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSettingChange = (gateway: 'esewa' | 'khalti', field: keyof GatewaySettings, value: string | boolean) => {
        setSettings(prev => ({
            ...prev,
            [gateway]: {
                ...prev[gateway],
                [field]: value
            }
        }));
    };

    if (loading) return <p className="p-6">Loading settings...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate('/admin')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BanknotesIcon className="h-6 w-6" />
                    Coming Soon Set (Payment Gateways)
                </h1>
            </header>

            <div className="space-y-8">
                {/* eSewa Settings */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">eSewa Gateway</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="font-medium text-gray-700 dark:text-gray-300">Show "Coming Soon"</label>
                            <ToggleSwitch
                                enabled={settings.esewa.showComingSoon}
                                setEnabled={(enabled) => handleSettingChange('esewa', 'showComingSoon', enabled)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Display Text</label>
                            <input
                                type="text"
                                value={settings.esewa.comingSoonText}
                                onChange={e => handleSettingChange('esewa', 'comingSoonText', e.target.value)}
                                className="w-full form-input mt-1"
                                placeholder="e.g., Coming Soon, Under Maintenance"
                            />
                        </div>
                    </div>
                </div>

                {/* Khalti Settings */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Khalti Gateway</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="font-medium text-gray-700 dark:text-gray-300">Show "Coming Soon"</label>
                            <ToggleSwitch
                                enabled={settings.khalti.showComingSoon}
                                setEnabled={(enabled) => handleSettingChange('khalti', 'showComingSoon', enabled)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Display Text</label>
                            <input
                                type="text"
                                value={settings.khalti.comingSoonText}
                                onChange={e => handleSettingChange('khalti', 'comingSoonText', e.target.value)}
                                className="w-full form-input mt-1"
                                placeholder="e.g., Coming Soon, Under Maintenance"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t dark:border-gray-600 mt-8">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center disabled:bg-purple-400">
                    {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminPaymentGatewayPage;
