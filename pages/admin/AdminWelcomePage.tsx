import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { SparklesIcon, PhotoIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';
import { generateWelcomeSliderDescription } from '../../services/geminiService';

// Helper to generate Cloudinary URLs
const generateCloudinaryUrl = (src: string, transformations: string): string => {
    if (!src || !src.includes('/upload/')) {
        return src || ''; // Not a standard Cloudinary URL, return as is or empty string
    }
    const parts = src.split('/upload/');
    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ src, alt, className, ...props }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isHighResLoaded, setIsHighResLoaded] = useState(false);

    useEffect(() => {
        setIsHighResLoaded(false);
        setImageSrc(null);

        if (!src) {
            return;
        }

        let isMounted = true;

        const placeholderSrc = generateCloudinaryUrl(src, 'q_auto:low,e_blur:2000,w_20');
        const highResSrc = generateCloudinaryUrl(src, 'q_auto,f_auto');
        
        // Load high-res image
        const highResImg = new Image();
        highResImg.src = highResSrc;
        highResImg.onload = () => {
            if (isMounted) {
                setImageSrc(highResSrc);
                setIsHighResLoaded(true);
            }
        };
        // If high-res is already cached, show it immediately and skip placeholder.
        if (highResImg.complete) {
            if (isMounted) {
                setImageSrc(highResSrc);
                setIsHighResLoaded(true);
                return; // Exit early
            }
        }
        
        // Load placeholder image only if high-res isn't cached
        const placeholderImg = new Image();
        placeholderImg.src = placeholderSrc;
        placeholderImg.onload = () => {
            // Check if component is still mounted and high-res hasn't loaded yet.
            if (isMounted && !highResImg.complete) {
                setImageSrc(placeholderSrc);
            }
        };

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (!imageSrc) {
        return <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`} role="img" aria-label={alt} />;
    }

    return (
        <img
            {...props}
            src={imageSrc}
            alt={alt}
            className={`${className} transition-all duration-500 ease-in-out ${isHighResLoaded ? 'blur-0 scale-100' : 'blur-md scale-105'}`}
        />
    );
};


interface WelcomePageData {
    appName: string;
    logoUrl: string;
    sliderImages: { imageUrl: string; description: string; }[];
}

const AdminWelcomePage: React.FC = () => {
    const [settings, setSettings] = useState<WelcomePageData>({ appName: '', logoUrl: '', sliderImages: [] });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();
    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);


    const docRef = useCallback(() => doc(db, 'settings', 'welcomePage'), []);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const docSnap = await getDoc(docRef());
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as WelcomePageData);
                }
            } catch (error) {
                console.error("Error fetching welcome page settings:", error);
                showToast("Failed to load settings.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [docRef, showToast]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Filter out any empty image entries before saving
            const finalSettings = {
                ...settings,
                sliderImages: settings.sliderImages.filter(img => img.imageUrl.trim() !== '')
            };
            
            const batch = writeBatch(db);
    
            // 1. Update the welcome page doc
            const welcomePageRef = doc(db, 'settings', 'welcomePage');
            batch.set(welcomePageRef, finalSettings);
    
            // 2. Sync the logo to the main image settings doc
            const imageSettingsRef = doc(db, 'settings', 'paymentLogos');
            batch.set(imageSettingsRef, { appLogoUrl: finalSettings.logoUrl }, { merge: true });
    
            // 3. Sync the logo to the splash screen's doc
            const splashScreenRef = doc(db, 'settings', 'splashScreen');
            batch.set(splashScreenRef, { logoUrl: finalSettings.logoUrl }, { merge: true });
    
            await batch.commit();

            setSettings(finalSettings); // Update state to reflect filtered list
            showToast("Welcome Page settings saved and synced successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            showToast("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSliderImageChange = (index: number, field: 'imageUrl' | 'description', value: string) => {
        const newImages = [...settings.sliderImages];
        // Ensure the object exists before trying to assign to its property
        if (!newImages[index]) {
            newImages[index] = { imageUrl: '', description: '' };
        }
        newImages[index] = { ...newImages[index], [field]: value };
        setSettings(prev => ({ ...prev, sliderImages: newImages }));
    };

    const handleGenerateDescription = async (index: number) => {
        const imageUrl = settings.sliderImages[index]?.imageUrl;
        if (!imageUrl || !imageUrl.trim()) {
            showToast("Please provide an image URL first.", 'info');
            return;
        }

        setGeneratingIndex(index);
        try {
            const description = await generateWelcomeSliderDescription(imageUrl);
            handleSliderImageChange(index, 'description', description);
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setGeneratingIndex(null);
        }
    };


    const handleAddSliderImage = () => {
        setSettings(prev => ({
            ...prev,
            sliderImages: [...prev.sliderImages, { imageUrl: '', description: '' }]
        }));
    };

    const handleRemoveSliderImage = (index: number) => {
        const newImages = settings.sliderImages.filter((_, i) => i !== index);
        setSettings(prev => ({ ...prev, sliderImages: newImages }));
    };

    if (loading) return <p className="p-6">Loading welcome page settings...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-8">
            <header className="flex items-center pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <SparklesIcon className="h-6 w-6" />
                    Manage Welcome Page
                </h1>
            </header>

            <section className="space-y-4">
                <div>
                    <label htmlFor="appName" className="block text-sm font-medium">App Name</label>
                    <input type="text" id="appName" name="appName" value={settings.appName} onChange={handleInputChange} className="w-full form-input mt-1" />
                </div>
                <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium">App Logo URL</label>
                    <div className="flex items-center gap-4 mt-1">
                        <ProgressiveImage src={settings.logoUrl || 'https://via.placeholder.com/64'} alt="Logo Preview" className="w-16 h-16 object-contain rounded-md bg-gray-100 dark:bg-gray-700 p-1" />
                        <input type="url" id="logoUrl" name="logoUrl" value={settings.logoUrl} onChange={handleInputChange} className="w-full form-input" />
                    </div>
                </div>
            </section>
            
            <section>
                <h2 className="text-lg font-semibold mb-4">Slider Images</h2>
                <div className="space-y-4">
                    {settings.sliderImages.map((image, index) => (
                        <div key={index} className="flex flex-col md:flex-row items-start gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 relative">
                             <ProgressiveImage src={image.imageUrl || 'https://via.placeholder.com/150'} alt={`Slider ${index}`} className="w-full md:w-32 h-32 object-contain rounded-md bg-white dark:bg-gray-800" />
                             <div className="flex-1 space-y-2">
                                <div>
                                    <label className="text-xs font-medium">Image URL (Transparent PNG recommended)</label>
                                    <input
                                        type="url"
                                        value={image.imageUrl}
                                        onChange={(e) => handleSliderImageChange(index, 'imageUrl', e.target.value)}
                                        className="w-full form-input mt-1"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="text-xs font-medium">Description Text</label>
                                     <textarea
                                        value={image.description}
                                        onChange={(e) => handleSliderImageChange(index, 'description', e.target.value)}
                                        className="w-full form-input mt-1 pr-10"
                                        rows={2}
                                        placeholder="Short feature description..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateDescription(index)}
                                        disabled={generatingIndex === index}
                                        title="Generate with AI from Image"
                                        className="absolute top-7 right-2 p-1.5 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-600 dark:text-purple-300 hover:bg-purple-200 disabled:opacity-50"
                                    >
                                        <SparklesIcon className={`h-5 w-5 ${generatingIndex === index ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                             </div>
                            <button onClick={() => handleRemoveSliderImage(index)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-800 rounded-full" aria-label="Remove Image">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
                 <button onClick={handleAddSliderImage} className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-400 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <PlusIcon className="h-5 w-5" /> Add New Image
                </button>
            </section>

            <div className="flex justify-end pt-6 border-t dark:border-gray-600">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400 flex items-center justify-center">
                    {isSaving && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminWelcomePage;