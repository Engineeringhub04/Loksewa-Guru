import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { AppContent, DynamicPageLayout, DynamicPageComponent, UpcomingFeatureData, AdditionalFeatureData } from '../../types';
import { ICON_KEYS, ICONS_MAP, UPCOMING_FEATURES, ADDITIONAL_FEATURES } from '../../constants';
import { generatePageLayoutFromPrompt } from '../../services/geminiService';
import { ArrowLeftIcon, SparklesIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';

// Helper to convert file to base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove the data URI prefix
    };
    reader.onerror = error => reject(error);
});

// Component to display the live preview in a phone frame
const PagePreview: React.FC<{ 
    layout: DynamicPageLayout | null,
    renderComponent: (item: DynamicPageComponent, index: number) => React.ReactNode 
}> = ({ layout, renderComponent }) => {
    return (
        <div className="w-full p-4">
            <h3 className="text-lg font-semibold mb-4 text-center">Live Preview</h3>
            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-gray-800 rounded-b-lg"></div>
                <div className="w-full h-full bg-white dark:bg-gray-900 overflow-y-auto p-4 rounded-[1.5rem]">
                    {layout && layout.items && layout.items.length > 0 ? (
                        layout.items.map(renderComponent)
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <p>No layout to preview.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const AdminFeatureEditorPage: React.FC = () => {
    const { featureType, featureKey } = useParams<{ featureType: 'upcoming' | 'additional', featureKey: string }>();
    const navigate = useNavigate();

    const [featureData, setFeatureData] = useState<Partial<UpcomingFeatureData & AdditionalFeatureData>>({});
    const [pageLayout, setPageLayout] = useState<DynamicPageLayout | null>(null);
    const [layoutString, setLayoutString] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showToast } = useToast();
    
    const [redesignPrompt, setRedesignPrompt] = useState('');
    const [isRedesigning, setIsRedesigning] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // State for interactive preview
    const [formState, setFormState] = useState<Record<string, string>>({});

    const fetchFeatureData = useCallback(async () => {
        if (!featureKey || !featureType) {
            navigate('/admin/content');
            return;
        }
        setIsLoading(true);
        try {
            // Start with fallback content from constants.
            const allUpcomingFeatures = new Map(UPCOMING_FEATURES.map(f => [f.key, { ...f, enabled: true } as UpcomingFeatureData]));
            const allAdditionalFeatures = new Map(ADDITIONAL_FEATURES.map(f => [f.key, { ...f, enabled: true } as AdditionalFeatureData]));
    
            const contentDocRef = doc(db, 'content', 'main');
            const contentSnap = await getDoc(contentDocRef);
            
            // If a DB document exists, merge its data.
            if (contentSnap.exists()) {
                const content = contentSnap.data() as AppContent;
                if (content.upcomingFeatures) {
                    content.upcomingFeatures.forEach(dbFeature => {
                        allUpcomingFeatures.set(dbFeature.key, dbFeature);
                    });
                }
                if (content.additionalFeatures) {
                    content.additionalFeatures.forEach(dbFeature => {
                        allAdditionalFeatures.set(dbFeature.key, dbFeature);
                    });
                }
            }
    
            const featuresMap = featureType === 'upcoming' ? allUpcomingFeatures : allAdditionalFeatures;
            const foundFeature = featuresMap.get(featureKey);
    
            if (!foundFeature) {
                throw new Error("Feature not found in constants or database");
            }
    
            setFeatureData(foundFeature);
    
            if (featureType === 'additional') {
                const pageDocRef = doc(db, 'dynamicPages', featureKey);
                const pageSnap = await getDoc(pageDocRef);
                if (pageSnap.exists()) {
                    const layoutData = pageSnap.data() as DynamicPageLayout;
                    // Create a deep-plain-object copy to remove Firestore-specific properties/methods
                    const cleanLayout: DynamicPageLayout = {
                        items: (layoutData.items || []).map((item: DynamicPageComponent) => ({
                            type: item.type,
                            props: {
                                content: item.props.content,
                                placeholder: item.props.placeholder,
                                size: item.props.size,
                                bindToState: item.props.bindToState,
                                onClickAction: item.props.onClickAction,
                                actionPayload: item.props.actionPayload,
                            }
                        }))
                    };
                    setPageLayout(cleanLayout);
                    setLayoutString(JSON.stringify(cleanLayout, null, 2));
                } else {
                    const defaultLayout: DynamicPageLayout = {
                        items: [
                            { type: 'heading', props: { content: foundFeature.name || "New Feature Title" } },
                            { type: 'paragraph', props: { content: "This is a default page layout. You can edit it using the JSON editor or generate a new one with AI." } }
                        ]
                    };
                    setPageLayout(defaultLayout);
                    setLayoutString(JSON.stringify(defaultLayout, null, 2));
                }
            }
        } catch (error) {
            console.error("Error fetching feature data:", error);
            navigate('/admin/content');
        } finally {
            setIsLoading(false);
        }
    }, [featureType, featureKey, navigate]);

    useEffect(() => {
        fetchFeatureData();
    }, [fetchFeatureData]);
    
    const handleLayoutStringChange = (str: string) => {
        setLayoutString(str);
        try {
            const parsed = JSON.parse(str);
            setPageLayout(parsed);
        } catch (e) {
            // Ignore parse errors while typing
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            const base64 = await toBase64(file);
            setImageBase64(base64);
        }
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const contentDocRef = doc(db, 'content', 'main');
            const contentSnap = await getDoc(contentDocRef);
            const content = contentSnap.data() as AppContent;

            if (featureType === 'upcoming') {
                content.upcomingFeatures = content.upcomingFeatures.map(f => f.key === featureKey ? (featureData as UpcomingFeatureData) : f);
            } else {
                content.additionalFeatures = content.additionalFeatures.map(f => f.key === featureKey ? (featureData as AdditionalFeatureData) : f);
                
                 if (pageLayout && featureKey) {
                    const pageDocRef = doc(db, 'dynamicPages', featureKey);
                    await setDoc(pageDocRef, pageLayout);
                }
            }
            await setDoc(contentDocRef, content);
            showToast("Feature saved successfully!");
            navigate('/admin/content');

        } catch (error) {
            console.error("Error saving feature:", error);
            showToast("Failed to save feature. See console for details.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteFeature = async () => {
        if (!featureKey || !featureType) return;
        
        const confirmMessage = `Are you sure you want to permanently delete the feature "${featureData.name}"? This will also remove its associated page layout if it exists. This action cannot be undone.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setIsDeleting(true);
        try {
            const contentDocRef = doc(db, 'content', 'main');
            const contentSnap = await getDoc(contentDocRef);
            if (!contentSnap.exists()) throw new Error("Content document not found");
            const content = contentSnap.data() as AppContent;

            let updatedContent = { ...content };

            if (featureType === 'upcoming') {
                updatedContent.upcomingFeatures = content.upcomingFeatures.filter(f => f.key !== featureKey);
            } else {
                updatedContent.additionalFeatures = content.additionalFeatures.filter(f => f.key !== featureKey);
                // Delete the associated dynamic page
                const pageDocRef = doc(db, 'dynamicPages', featureKey);
                await deleteDoc(pageDocRef);
            }
            
            await updateDoc(contentDocRef, updatedContent);

            showToast('Feature deleted successfully!');
            navigate('/admin/content');

        } catch (error) {
            console.error("Error deleting feature:", error);
            showToast(`Failed to delete feature: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRedesignWithAI = async () => {
        if (!redesignPrompt.trim()) {
            showToast("Please enter a redesign prompt.", 'info');
            return;
        }
        setIsRedesigning(true);
        try {
            const newLayout = await generatePageLayoutFromPrompt(redesignPrompt, imageBase64);
            setPageLayout(newLayout);
            setLayoutString(JSON.stringify(newLayout, null, 2));
            showToast("Redesign successful! Review the new layout and save changes.");
        } catch (error) {
            console.error("Error redesigning with AI:", error);
            showToast("AI redesign failed. Please try a different prompt.", 'error');
        } finally {
            setIsRedesigning(false);
        }
    };

    // --- Handlers for Interactive Preview ---
    const handleInputChange = (key: string, value: string) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    const handleAction = (action?: string, payload?: string) => {
        if (!action) return;
        if (action === 'alert') {
            let message = payload || 'Button clicked!';
            message = message.replace(/\{(\w+)\}/g, (_, key) => formState[key] || `[${key}]`);
            alert(`[PREVIEW] ${message}`);
        } else if (action === 'reset') {
            setFormState({});
            alert("[PREVIEW] Form reset!");
        }
    };

    // --- Renderer for Interactive Preview ---
    const renderPreviewComponent = (item: DynamicPageComponent, index: number) => {
        const { type, props } = item;
        const stateKey = props?.bindToState;

        switch (type) {
            case 'heading':
                return <h1 key={index} className="text-2xl font-bold text-gray-800 dark:text-gray-100">{props?.content}</h1>;
            case 'paragraph':
                return <p key={index} className="text-gray-600 dark:text-gray-300 my-2 text-sm">{props?.content}</p>;
            case 'input':
                return (
                    <div key={index} className="my-3 w-full">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{props?.content}</label>
                        <input 
                            type="text" 
                            placeholder={props?.placeholder || ''} 
                            value={stateKey ? formState[stateKey] || '' : undefined}
                            onChange={stateKey ? (e) => handleInputChange(stateKey, e.target.value) : undefined}
                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" 
                        />
                    </div>
                );
            case 'button':
                return <button 
                            key={index}
                            onClick={() => handleAction(props?.onClickAction, props?.actionPayload)}
                            className="w-full my-3 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg text-sm"
                        >
                            {props?.content}
                        </button>;
            case 'spacer':
                const sizeClass = props?.size === 'large' ? 'h-8' : props?.size === 'small' ? 'h-2' : 'h-4';
                return <div key={index} className={sizeClass}></div>;
            default:
                if (!type || !props) {
                    return <div key={index} className="p-1 my-1 bg-red-100 text-red-700 text-xs rounded">Invalid</div>;
                }
                return null;
        }
    };


    if (isLoading) return <p>Loading editor...</p>;

    const IconComponent = ICONS_MAP[featureData.iconKey || 'SparklesIcon'];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-fade-in">
             <header className="flex items-center mb-6 border-b dark:border-gray-700 pb-4">
                 <button onClick={() => navigate('/admin/content')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Feature</h1>
                    <p className="text-purple-600 dark:text-purple-400 font-semibold">{featureData.name}</p>
                </div>
            </header>

            <div className="space-y-8">
                {/* Basic Details Section */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Feature Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input value={featureData.name || ''} onChange={e => setFeatureData({...featureData, name: e.target.value})} className="w-full form-input mt-1" />
                        </div>
                        {featureType === 'additional' && (
                             <div>
                                <label className="block text-sm font-medium">Path</label>
                                <input value={featureData.path || ''} onChange={e => setFeatureData({...featureData, path: e.target.value})} className="w-full form-input mt-1" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium">Icon</label>
                            <div className="flex items-center gap-3 mt-1">
                                {IconComponent && <IconComponent className="h-8 w-8 text-gray-700 dark:text-gray-200" />}
                                <select value={featureData.iconKey} onChange={e => setFeatureData({...featureData, iconKey: e.target.value})} className="flex-1 form-input">
                                    {ICON_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Status</label>
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`text-sm font-semibold ${featureData.enabled ? 'text-green-600' : 'text-red-500'}`}>
                                    {featureData.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <button onClick={() => setFeatureData({...featureData, enabled: !featureData.enabled})} className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                                    Toggle
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
                
                {featureType === 'additional' && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-purple-500" />
                        Edit & Redesign Page with AI
                    </h2>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                        <div className="flex flex-col md:flex-row gap-4">
                             <div className="flex-1">
                                <label className="block text-sm font-medium">Redesign Prompt</label>
                                 <textarea 
                                    value={redesignPrompt}
                                    onChange={e => setRedesignPrompt(e.target.value)}
                                    rows={4} 
                                    placeholder="e.g., 'Create a login form with email, password, and a submit button.'" 
                                    className="w-full form-input mt-1 font-mono text-sm"
                                    disabled={isRedesigning}
                                ></textarea>
                            </div>
                             <div className="w-full md:w-48">
                                <label className="block text-sm font-medium mb-1">Visual Reference (Optional)</label>
                                <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} className="hidden" />
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-32 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-md" />
                                    ) : (
                                        <>
                                            <PhotoIcon className="h-8 w-8" />
                                            <span className="text-xs mt-1">Upload Image</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                         <button onClick={handleRedesignWithAI} disabled={isRedesigning} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400">
                             {isRedesigning ? 'Generating...' : 'Generate New Layout'}
                         </button>

                         <div className="mt-6 flex flex-col items-center gap-6">
                            <div className="w-full lg:w-4/5 xl:w-2/3">
                                <label className="block text-sm font-medium">Page Layout (JSON)</label>
                                 <textarea 
                                    value={layoutString}
                                    onChange={e => handleLayoutStringChange(e.target.value)}
                                    rows={18} 
                                    className="w-full form-input mt-1 font-mono text-xs"
                                ></textarea>
                            </div>
                            <PagePreview layout={pageLayout} renderComponent={renderPreviewComponent} />
                         </div>
                    </div>
                </section>
                )}

                 <div className="flex justify-end pt-6 border-t dark:border-gray-700">
                    <button onClick={handleSaveChanges} disabled={isSaving} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400">
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>

                <div className="mt-12 pt-6 border-t border-red-300 dark:border-red-700/50">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Deleting this feature is permanent. If it's an "Additional Feature", its custom page layout will also be deleted.
                    </p>
                    <button
                        type="button"
                        onClick={handleDeleteFeature}
                        disabled={isDeleting}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-400"
                    >
                        <TrashIcon className="h-5 w-5" />
                        {isDeleting ? 'Deleting...' : 'Delete this Feature'}
                    </button>
                </div>
            </div>
             <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;font-size:0.875rem;line-height:1.25rem;color:#111827;background-color:#fff;border:1px solid #D1D5DB;border-radius:0.375rem;box-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05)}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}.form-input:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-color:#8B5CF6;border-color:#8B5CF6}.animate-fade-in{animation:fade-in .5s ease-out forwards}@keyframes fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    );
};

export default AdminFeatureEditorPage;