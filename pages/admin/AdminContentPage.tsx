import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { ICONS_MAP, ICON_KEYS, UPCOMING_FEATURES, ADDITIONAL_FEATURES } from '../../constants';
import type { AppContent, UpcomingFeatureData, AdditionalFeatureData, SocialLinks } from '../../types';
import Modal from '../../components/Modal';
import { PencilIcon, TrashIcon, PlusIcon, RocketLaunchIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { suggestIconForCategory, generateFeatureFromPrompt } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';


// --- SHARED COMPONENTS ---
const ToggleSwitch: React.FC<{ enabled: boolean, setEnabled: (enabled: boolean) => void }> = ({ enabled, setEnabled }) => (
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

interface FeatureFormData {
    name: string;
    iconKey: string;
    path: string;
}

const FeatureModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: FeatureFormData) => void;
    feature: (UpcomingFeatureData | AdditionalFeatureData) | null;
    modalType: 'upcoming' | 'additional';
}> = ({ isOpen, onClose, onSave, feature, modalType }) => {
    const [formData, setFormData] = useState<FeatureFormData>({ name: '', iconKey: ICON_KEYS[0], path: '' });
    const [isSuggestingIcon, setIsSuggestingIcon] = useState(false);

    useEffect(() => {
        if (feature) {
            setFormData({
                name: feature.name,
                iconKey: feature.iconKey,
                path: (feature as AdditionalFeatureData).path || '',
            });
        } else {
            setFormData({ name: '', iconKey: ICON_KEYS[0], path: '' });
        }
    }, [feature, isOpen]);

    // Debounce effect for AI icon suggestion
    useEffect(() => {
        if (feature && formData.name === feature.name) return; // Don't run on initial load
        if (formData.name.trim().length < 3) return; // Don't trigger for short titles

        const handler = setTimeout(async () => {
            setIsSuggestingIcon(true);
            try {
                const suggestedKey = await suggestIconForCategory(formData.name);
                setFormData(prev => ({ ...prev, iconKey: suggestedKey }));
            } catch (error) {
                console.error("Failed to get AI icon suggestion", error);
            } finally {
                setIsSuggestingIcon(false);
            }
        }, 800);

        return () => clearTimeout(handler);
    }, [formData.name, feature]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={feature ? 'Edit Feature' : 'Add New Feature'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Feature Name</label>
                    <input name="name" value={formData.name} onChange={handleChange} className="w-full form-input mt-1" required />
                </div>
                <div>
                    <label className="block text-sm font-medium flex items-center gap-2">
                        Icon
                        {isSuggestingIcon && <span className="text-xs text-purple-500">(AI is suggesting...)</span>}
                    </label>
                    <select name="iconKey" value={formData.iconKey} onChange={handleChange} className="w-full form-input mt-1">
                        {ICON_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                    </select>
                </div>
                {modalType === 'additional' && (
                    <div>
                        <label className="block text-sm font-medium">Path (e.g., /my-page)</label>
                        <input name="path" value={formData.path} onChange={handleChange} placeholder="/example-path" className="w-full form-input mt-1" required />
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-600">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Save</button>
                </div>
            </form>
        </Modal>
    );
};

const PromoteFeatureModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onPromote: (path: string) => void;
    feature: UpcomingFeatureData | null;
}> = ({ isOpen, onClose, onPromote, feature }) => {
    const [path, setPath] = useState('');

    useEffect(() => {
        if (!isOpen) setPath('');
    }, [isOpen]);

    if (!feature) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!path.trim() || !path.startsWith('/')) {
            alert("Please enter a valid path starting with '/'.");
            return;
        }
        onPromote(path);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Promote "${feature.name}"`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p>This will move the feature to "Additional Features". Please provide a navigation path for it.</p>
                <div>
                    <label className="block text-sm font-medium">Path</label>
                    <input
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="/new-cool-feature"
                        className="w-full form-input mt-1"
                        required
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-600">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Promote</button>
                </div>
            </form>
        </Modal>
    );
};


// --- MAIN PAGE COMPONENT ---
const AdminContentPage: React.FC = () => {
    const navigate = useNavigate();
    const [content, setContent] = useState<AppContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<any | null>(null);
    const [modalType, setModalType] = useState<'upcoming' | 'additional'>('upcoming');

    const [promoteModalState, setPromoteModalState] = useState<{ isOpen: boolean; feature: UpcomingFeatureData | null }>({ isOpen: false, feature: null });
    
    // AI State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiModalStep, setAiModalStep] = useState<'prompt' | 'generating' | 'review'>('prompt');
    const [aiFeatureType, setAiFeatureType] = useState<'additional' | 'upcoming'>('additional');
    const [generatedFeature, setGeneratedFeature] = useState<FeatureFormData | null>(null);
    const [aiError, setAiError] = useState('');

    const contentDocRef = useMemo(() => doc(db, 'content', 'main'), []);

    // Create sets of core feature keys for easy lookup
    const upcomingFeatureKeysFromConst = useMemo(() => new Set(UPCOMING_FEATURES.map(f => f.key)), []);
    const additionalFeatureKeysFromConst = useMemo(() => new Set(ADDITIONAL_FEATURES.map(f => f.key)), []);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        const defaultSocialLinks = { facebook: '#', instagram: '#', youtube: '#', twitter: '#', linkedin: '#', whatsapp: '#' };
        const defaultOtherSite = { heading: '', description: '', link: '#' };

        try {
            const docSnap = await getDoc(contentDocRef);
            const dbContent: AppContent = docSnap.exists()
                ? (docSnap.data() as AppContent)
                : {
                    upcomingFeatures: [],
                    additionalFeatures: [],
                    socialLinks: defaultSocialLinks,
                    otherSite: defaultOtherSite
                };
            
            // Ensure all social links are present
            dbContent.socialLinks = { ...defaultSocialLinks, ...dbContent.socialLinks };
            dbContent.otherSite = { ...defaultOtherSite, ...dbContent.otherSite };

            // Combine upcoming features: Start with constants, then merge DB data.
            const upcomingMap = new Map(UPCOMING_FEATURES.map(f => [f.key, { ...f, enabled: true } as UpcomingFeatureData]));
            if (dbContent.upcomingFeatures) {
                dbContent.upcomingFeatures.forEach(dbFeature => {
                    upcomingMap.set(dbFeature.key, dbFeature);
                });
            }

            // Combine additional features: Start with constants, then merge DB data.
            const additionalMap = new Map(ADDITIONAL_FEATURES.map(f => [f.key, { ...f, enabled: true } as AdditionalFeatureData]));
            if (dbContent.additionalFeatures) {
                dbContent.additionalFeatures.forEach(dbFeature => {
                    additionalMap.set(dbFeature.key, dbFeature);
                });
            }

            const finalContent: AppContent = {
                upcomingFeatures: Array.from(upcomingMap.values()),
                additionalFeatures: Array.from(additionalMap.values()),
                socialLinks: dbContent.socialLinks,
                otherSite: dbContent.otherSite,
            };

            setContent(finalContent);

        } catch (error) {
            console.error("Error fetching and merging content:", error);
            // Fallback to constants if there's a major error
            setContent({
                upcomingFeatures: UPCOMING_FEATURES.map(f => ({ ...f, enabled: true })),
                additionalFeatures: ADDITIONAL_FEATURES.map(f => ({ ...f, enabled: true })),
                socialLinks: defaultSocialLinks,
                otherSite: defaultOtherSite,
            });
        } finally {
            setIsLoading(false);
        }
    }, [contentDocRef]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleOpenManualModal = (type: 'upcoming' | 'additional', feature: any | null = null) => {
        setModalType(type);
        setEditingFeature(feature);
        setIsManualModalOpen(true);
    };
    
    const handleSaveFeature = (data: FeatureFormData) => {
        if (!content) return;
    
        const key = editingFeature 
            ? editingFeature.key 
            : data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
        if (modalType === 'upcoming') {
            const newFeature: UpcomingFeatureData = {
                name: data.name,
                key: key,
                iconKey: data.iconKey,
                enabled: editingFeature ? editingFeature.enabled : true,
            };
            const updatedFeatures = editingFeature
                ? content.upcomingFeatures.map(f => f.key === editingFeature.key ? { ...f, ...newFeature } : f)
                : [...content.upcomingFeatures, newFeature];
            setContent({ ...content, upcomingFeatures: updatedFeatures });
        } else {
            const newFeature: AdditionalFeatureData = {
                name: data.name,
                key: key,
                iconKey: data.iconKey,
                path: data.path,
                enabled: editingFeature ? editingFeature.enabled : true,
            };
            const updatedFeatures = editingFeature
                ? content.additionalFeatures.map(f => f.key === editingFeature.key ? { ...f, ...newFeature } : f)
                : [...content.additionalFeatures, newFeature];
            setContent({ ...content, additionalFeatures: updatedFeatures });
        }
    
        setIsManualModalOpen(false);
        setEditingFeature(null);
    };
    
    const handleDelete = async (type: 'upcoming' | 'additional', key: string) => {
        if (!content) return;
        
        const featureList = type === 'upcoming' ? content.upcomingFeatures : content.additionalFeatures;
        const featureName = featureList?.find(f => f.key === key)?.name || 'this feature';
    
        if (!window.confirm(`Are you sure you want to permanently delete "${featureName}"? This action cannot be undone.`)) {
            return;
        }
    
        try {
            const docSnap = await getDoc(contentDocRef);
            if (!docSnap.exists()) {
                throw new Error("Content document not found in the database.");
            }
            
            const currentDbContent = docSnap.data() as AppContent;
            
            if (type === 'upcoming') {
                const updatedDbFeatures = (currentDbContent.upcomingFeatures || []).filter(f => f.key !== key);
                await updateDoc(contentDocRef, { upcomingFeatures: updatedDbFeatures });
            } else {
                const updatedDbFeatures = (currentDbContent.additionalFeatures || []).filter(f => f.key !== key);
                await updateDoc(contentDocRef, { additionalFeatures: updatedDbFeatures });
            }
            
            showToast(`Feature "${featureName}" deleted successfully.`);
            // Re-fetch content from the database to ensure UI is perfectly in sync
            await fetchContent(); 
    
        } catch (error) {
            console.error("Error deleting feature:", error);
            showToast(`Failed to delete the feature: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, "error");
        }
    };

    const handleOpenPromoteModal = (feature: UpcomingFeatureData) => {
        setPromoteModalState({ isOpen: true, feature });
    };

    const handlePromoteFeature = (path: string) => {
        if (!content || !promoteModalState.feature) return;
        const featureToPromote = promoteModalState.feature;
        const newAdditionalFeature: AdditionalFeatureData = {
            ...featureToPromote,
            path,
        };
        setContent(prev => prev ? {
            ...prev,
            upcomingFeatures: prev.upcomingFeatures.filter(f => f.key !== featureToPromote.key),
            additionalFeatures: [...prev.additionalFeatures, newAdditionalFeature],
        } : null);
        setPromoteModalState({ isOpen: false, feature: null });
    };
    
    const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!content) return;
        setContent({ ...content, socialLinks: { ...content.socialLinks, [e.target.name]: e.target.value } });
    };

    const handleOtherSiteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!content) return;
        setContent({ ...content, otherSite: { ...content.otherSite, [e.target.name]: e.target.value } });
    };

    const handleSaveChanges = async () => {
        if (!content) return;
        setIsSaving(true);
        try {
            const dbContentToSave = {
                upcomingFeatures: content.upcomingFeatures.filter(f => !upcomingFeatureKeysFromConst.has(f.key)),
                additionalFeatures: content.additionalFeatures.filter(f => !additionalFeatureKeysFromConst.has(f.key)),
                socialLinks: content.socialLinks,
            };
            await setDoc(contentDocRef, dbContentToSave);
            showToast("All content changes have been saved!");
        } catch (error) {
            console.error("Error saving content:", error);
            showToast("Failed to save changes. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // --- AI Handlers ---
    const handleOpenAiModal = () => {
        if (!aiPrompt.trim()) {
            showToast("Please enter a prompt for the AI.", "info");
            return;
        }
        setAiModalStep('prompt');
        setGeneratedFeature(null);
        setAiError('');
        setIsAiModalOpen(true);
    };

    const handleGenerateFeature = async () => {
        setAiModalStep('generating');
        setAiError('');
        try {
            const result = await generateFeatureFromPrompt(aiPrompt, aiFeatureType);
            setGeneratedFeature({
                name: result.name,
                iconKey: result.iconKey,
                path: result.path || ''
            });
            setAiModalStep('review');
        } catch (error: any) {
            setAiError(error.message || 'An unexpected error occurred.');
            setAiModalStep('prompt');
        }
    };

    const handleAddGeneratedFeature = () => {
        if (!content || !generatedFeature) return;
    
        const key = generatedFeature.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
        if (aiFeatureType === 'upcoming') {
            if (content.upcomingFeatures.some(f => f.key === key)) {
                showToast(`An upcoming feature with key "${key}" already exists.`, "error"); return;
            }
            const newFeature: UpcomingFeatureData = {
                name: generatedFeature.name,
                key: key,
                iconKey: generatedFeature.iconKey,
                enabled: true,
            };
            setContent({ ...content, upcomingFeatures: [...content.upcomingFeatures, newFeature] });
        } else {
             if (content.additionalFeatures.some(f => f.key === key)) {
                showToast(`An additional feature with key "${key}" already exists.`, "error"); return;
            }
            const newFeature: AdditionalFeatureData = {
                name: generatedFeature.name,
                key: key,
                iconKey: generatedFeature.iconKey,
                path: generatedFeature.path,
                enabled: true,
            };
            setContent({ ...content, additionalFeatures: [...content.additionalFeatures, newFeature] });
        }
    
        setIsAiModalOpen(false);
        setAiPrompt('');
    };


    if (isLoading) return <p>Loading content...</p>;
    if (!content) return <p>Could not load content data.</p>;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Content Management</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage dynamic content across the application.</p>
            </div>
            
            {/* AI Feature Creator */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8 border-2 border-dashed border-purple-400">
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <SparklesIcon className="h-6 w-6 text-purple-500" />
                    Create Features with AI
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Describe a feature you want, and let AI generate its name, icon, and path.</p>
                <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., 'A tool to convert Nepali date to English date' or 'A simple notepad'"
                    className="w-full form-input mb-4"
                    rows={3}
                />
                <button
                    onClick={handleOpenAiModal}
                    className="w-full bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Generate with AI
                </button>
            </section>

            {/* Upcoming Features Section */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                    <h2 className="text-xl font-semibold">Upcoming Features</h2>
                    <button onClick={() => handleOpenManualModal('upcoming')} className="flex items-center gap-1 text-sm text-white bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded-md">
                        <PlusIcon className="h-4 w-4" /> Add New
                    </button>
                </div>
                <div className="space-y-3">
                    {content.upcomingFeatures.map(feature => {
                        const isCoreFeature = upcomingFeatureKeysFromConst.has(feature.key);
                        return (
                         <div key={feature.key} className="flex justify-between items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <span className="font-medium">{feature.name}</span>
                            <div className="flex items-center gap-4">
                               <ToggleSwitch enabled={feature.enabled} setEnabled={(val) => setContent({...content, upcomingFeatures: content.upcomingFeatures.map(f => f.key === feature.key ? {...f, enabled: val} : f)})} />
                               <button onClick={() => handleOpenPromoteModal(feature)} className="text-gray-400 hover:text-green-500" title="Promote to Additional Feature"><RocketLaunchIcon className="h-5 w-5"/></button>
                               <button onClick={() => navigate(`/admin/features/edit/upcoming/${feature.key}`)} className="text-gray-400 hover:text-blue-500" title="Edit Feature"><PencilIcon className="h-4 w-4"/></button>
                               {!isCoreFeature && (
                                   <button onClick={() => handleDelete('upcoming', feature.key)} className="text-gray-400 hover:text-red-500" title="Delete Feature"><TrashIcon className="h-4 w-4"/></button>
                               )}
                            </div>
                        </div>
                    )})}
                </div>
            </section>

            {/* Additional Features Section */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                 <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                    <h2 className="text-xl font-semibold">Additional Features</h2>
                    <button onClick={() => handleOpenManualModal('additional')} className="flex items-center gap-1 text-sm text-white bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded-md">
                        <PlusIcon className="h-4 w-4" /> Add New
                    </button>
                </div>
                <div className="space-y-3">
                     {content.additionalFeatures.map(feature => {
                        const isCoreFeature = additionalFeatureKeysFromConst.has(feature.key);
                        return (
                         <div key={feature.key} className="flex justify-between items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div>
                                <p className="font-medium">{feature.name}</p>
                                <p className="text-xs text-gray-400">{feature.path}</p>
                            </div>
                            <div className="flex items-center gap-4">
                               <ToggleSwitch enabled={feature.enabled} setEnabled={(val) => setContent({...content, additionalFeatures: content.additionalFeatures.map(f => f.key === feature.key ? {...f, enabled: val} : f)})} />
                               <button onClick={() => navigate(`/admin/features/edit/additional/${feature.key}`)} className="text-gray-400 hover:text-blue-500" title="Edit Feature"><PencilIcon className="h-4 w-4"/></button>
                               {!isCoreFeature && (
                                   <button onClick={() => handleDelete('additional', feature.key)} className="text-gray-400 hover:text-red-500" title="Delete Feature"><TrashIcon className="h-4 w-4"/></button>
                               )}
                            </div>
                        </div>
                    )})}
                </div>
            </section>

            {/* Social Media Links Section */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-3">Social Media Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(content.socialLinks).map(key => (
                         <div key={key}>
                            <label className="capitalize text-sm font-medium">{key} URL</label>
                            <input name={key} value={content.socialLinks[key as keyof SocialLinks]} onChange={handleSocialChange} className="w-full form-input mt-1" />
                        </div>
                    ))}
                </div>
            </section>

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t dark:border-gray-700 flex justify-end">
                 <button 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md disabled:bg-purple-400"
                >
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>
            
            <FeatureModal 
                isOpen={isManualModalOpen} 
                onClose={() => setIsManualModalOpen(false)} 
                onSave={handleSaveFeature} 
                feature={editingFeature}
                modalType={modalType}
            />

            <PromoteFeatureModal
                isOpen={promoteModalState.isOpen}
                onClose={() => setPromoteModalState({ isOpen: false, feature: null })}
                onPromote={handlePromoteFeature}
                feature={promoteModalState.feature}
            />
            
            <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="Generate Feature with AI">
                {aiModalStep === 'prompt' && (
                    <div className="space-y-4">
                        <p className="text-sm"><strong>Prompt:</strong> "{aiPrompt}"</p>
                        <div>
                            <label className="block text-sm font-medium mb-2">Feature Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input type="radio" name="aiFeatureType" value="additional" checked={aiFeatureType === 'additional'} onChange={() => setAiFeatureType('additional')} className="form-radio" />
                                    <span className="ml-2">Additional Feature</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" name="aiFeatureType" value="upcoming" checked={aiFeatureType === 'upcoming'} onChange={() => setAiFeatureType('upcoming')} className="form-radio" />
                                    <span className="ml-2">Upcoming Feature</span>
                                </label>
                            </div>
                        </div>
                        {aiError && <p className="text-red-500 text-sm">{aiError}</p>}
                        <div className="flex justify-end pt-4 border-t dark:border-gray-600">
                            <button onClick={handleGenerateFeature} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                                Generate
                            </button>
                        </div>
                    </div>
                )}
                {aiModalStep === 'generating' && (
                    <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="mt-4">Generating feature... Please wait.</p>
                    </div>
                )}
                {aiModalStep === 'review' && generatedFeature && (
                     <div className="space-y-4">
                         <h3 className="font-semibold">AI Generated Feature (Editable)</h3>
                         <div>
                            <label className="block text-sm font-medium">Feature Name</label>
                            <input value={generatedFeature.name} onChange={(e) => setGeneratedFeature({...generatedFeature, name: e.target.value})} className="w-full form-input mt-1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Icon</label>
                            <select value={generatedFeature.iconKey} onChange={(e) => setGeneratedFeature({...generatedFeature, iconKey: e.target.value})} className="w-full form-input mt-1">
                                {ICON_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                            </select>
                        </div>
                        {aiFeatureType === 'additional' && (
                            <div>
                                <label className="block text-sm font-medium">Path</label>
                                <input value={generatedFeature.path} onChange={(e) => setGeneratedFeature({...generatedFeature, path: e.target.value})} className="w-full form-input mt-1" />
                            </div>
                        )}
                         <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-600">
                            <button type="button" onClick={() => setAiModalStep('prompt')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Try Again</button>
                            <button type="button" onClick={handleAddGeneratedFeature} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Add Feature to List</button>
                        </div>
                     </div>
                )}
            </Modal>


             <style>{`
                .form-input {
                    display: block; width: 100%; padding: 0.5rem 0.75rem; font-size: 0.875rem; line-height: 1.25rem;
                    color: #111827; background-color: #fff; border: 1px solid #D1D5DB; border-radius: 0.375rem;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                }
                .dark .form-input { background-color: #374151; border-color: #4B5563; color: #F9FAFB; }
                .form-input:focus { outline: 2px solid transparent; outline-offset: 2px; --tw-ring-color: #8B5CF6; border-color: #8B5CF6; }
                .form-radio { border-radius: 9999px; border-color: #D1D5DB; color: #8B5CF6; }
                .dark .form-radio { background-color: #4B5563; border-color: #6B7280; }
                .form-radio:focus { --tw-ring-color: #8B5CF6; }
            `}</style>
        </div>
    );
};

export default AdminContentPage;