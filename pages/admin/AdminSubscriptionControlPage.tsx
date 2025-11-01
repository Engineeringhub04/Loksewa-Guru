
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useData } from '../../contexts/DataContext';
import { ICONS_MAP, UPCOMING_FEATURES, ADDITIONAL_FEATURES } from '../../constants';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';
import type { ServiceDocument, AdditionalFeatureData, UpcomingFeatureData } from '../../types';
import _ from 'lodash';

type AllFeatures = ServiceDocument | AdditionalFeatureData | UpcomingFeatureData;

const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: () => void; }> = ({ enabled, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        className={`${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0`}
        aria-checked={enabled}
        role="switch"
    >
        <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
    </button>
);


const AdminSubscriptionControlPage: React.FC = () => {
    const { services, appContent, subscriptionLocks: initialLocks } = useData();
    const { showToast } = useToast();

    const [locks, setLocks] = useState<{ [key: string]: { subscription?: boolean; login?: boolean } }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const docRef = useMemo(() => doc(db, 'settings', 'subscriptionLocks'), []);

    useEffect(() => {
        const fetchLocks = async () => {
            setIsLoading(true);
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const rawLocks = docSnap.data() || {};
                    const processedLocks: { [key: string]: { subscription?: boolean; login?: boolean } } = {};
                    for (const key in rawLocks) {
                        const value = rawLocks[key];
                        if (typeof value === 'boolean') {
                            processedLocks[key] = { subscription: value, login: false };
                        } else if (typeof value === 'object' && value !== null) {
                            processedLocks[key] = {
                                subscription: value.subscription === true,
                                login: value.login === true,
                            };
                        }
                    }
                    setLocks(processedLocks);
                }
            } catch (error) {
                showToast("Failed to load existing lock settings.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLocks();
    }, [docRef, showToast]);
    
    const combinedFeatures = useMemo(() => {
        const upcomingMap = new Map<string, UpcomingFeatureData>();
        UPCOMING_FEATURES.forEach(f => upcomingMap.set(f.key, { ...f, enabled: true }));
        if (appContent?.upcomingFeatures) {
            appContent.upcomingFeatures.forEach(f => upcomingMap.set(f.key, f));
        }

        const additionalMap = new Map<string, AdditionalFeatureData>();
        ADDITIONAL_FEATURES.forEach(f => additionalMap.set(f.key, { ...f, enabled: true }));
        if (appContent?.additionalFeatures) {
            appContent.additionalFeatures.forEach(f => additionalMap.set(f.key, f));
        }
        
        return {
            services,
            additionalFeatures: Array.from(additionalMap.values()),
            upcomingFeatures: Array.from(upcomingMap.values())
        };
    }, [services, appContent]);

    const handleToggle = (key: string, type: 'subscription' | 'login') => {
        setLocks(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [type]: !prev[key]?.[type]
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(docRef, locks);
            showToast("Access controls saved successfully!");
        } catch (error) {
            showToast("Failed to save settings.", "error");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderFeatureList = (title: string, features: AllFeatures[]) => (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">{title}</h3>
            <div className="space-y-2">
                {features.map(item => {
                    const key = (item as ServiceDocument).key || (item as AdditionalFeatureData).key;
                    if (!key) return null;
                    const Icon = ICONS_MAP[item.iconKey];
                    const isLoginLocked = locks[key]?.login === true;
                    const isSubLocked = locks[key]?.subscription === true;
                    return (
                        <div key={key} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                            <div className="flex items-center gap-3">
                                {Icon && <Icon className={`h-5 w-5 ${(item as ServiceDocument).color || 'text-gray-500'}`} />}
                                <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-gray-500">Login</label>
                                    <ToggleSwitch enabled={isLoginLocked} onToggle={() => handleToggle(key, 'login')} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-purple-500">Sub</label>
                                    <ToggleSwitch enabled={isSubLocked} onToggle={() => handleToggle(key, 'subscription')} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (isLoading) return <div className="p-6">Loading settings...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <header className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <LockClosedIcon className="h-6 w-6" /> Feature Access Control
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Toggle which features require login and/or a premium subscription.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderFeatureList("Our Services", combinedFeatures.services)}
                {renderFeatureList("Additional Features", combinedFeatures.additionalFeatures)}
                {renderFeatureList("Upcoming Features", combinedFeatures.upcomingFeatures)}
            </div>
        </div>
    );
};

export default AdminSubscriptionControlPage;
