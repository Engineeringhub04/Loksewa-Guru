import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { PhotoIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';

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


interface ImageSettings {
    esewaLogoUrl: string;
    khaltiLogoUrl: string;
    esewaQrUrl: string;
    khaltiQrUrl: string;
    appLogoUrl: string;
}

const AdminImageManagementPage: React.FC = () => {
    const [logos, setLogos] = useState<ImageSettings>({ esewaLogoUrl: '', khaltiLogoUrl: '', esewaQrUrl: '', khaltiQrUrl: '', appLogoUrl: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const docRef = useCallback(() => doc(db, 'settings', 'paymentLogos'), []);

    useEffect(() => {
        const fetchLogos = async () => {
            setLoading(true);
            try {
                const docSnap = await getDoc(docRef());
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setLogos({
                        esewaLogoUrl: data.esewaLogoUrl || '',
                        khaltiLogoUrl: data.khaltiLogoUrl || '',
                        esewaQrUrl: data.esewaQrUrl || '',
                        khaltiQrUrl: data.khaltiQrUrl || '',
                        appLogoUrl: data.appLogoUrl || '',
                    });
                } else {
                    // Set default sample values if document doesn't exist
                    setLogos({ 
                        esewaLogoUrl: 'https://i.imgur.com/1n5Y21m.png', 
                        khaltiLogoUrl: 'https://i.imgur.com/ODt3aI0.png',
                        esewaQrUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg',
                        khaltiQrUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg',
                        appLogoUrl: 'https://i.imgur.com/J5QX03J.png',
                    });
                }
            } catch (error) {
                console.error("Error fetching payment logos:", error);
                showToast("Failed to load logo settings.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchLogos();
    }, [docRef, showToast]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const batch = writeBatch(db);

            // 1. Update the main image settings doc (this one)
            const imageSettingsRef = doc(db, 'settings', 'paymentLogos');
            batch.set(imageSettingsRef, logos);

            // 2. Update the splash screen's logoUrl
            const splashScreenRef = doc(db, 'settings', 'splashScreen');
            batch.set(splashScreenRef, { logoUrl: logos.appLogoUrl }, { merge: true });

            // 3. Update the welcome page's logoUrl
            const welcomePageRef = doc(db, 'settings', 'welcomePage');
            batch.set(welcomePageRef, { logoUrl: logos.appLogoUrl }, { merge: true });

            await batch.commit();
            showToast("Image settings saved and synced successfully!");
        } catch (error) {
            console.error("Error saving image settings:", error);
            showToast("Failed to save images.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLogos(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <p className="p-6">Loading image settings...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-8">
            <header className="flex items-center pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <PhotoIcon className="h-6 w-6" />
                    Images Management
                </h1>
            </header>

            <div className="space-y-6">
                {/* App Logo */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">App Logo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-1">
                            <ProgressiveImage 
                                src={logos.appLogoUrl || 'https://via.placeholder.com/150'} 
                                alt="App Logo Preview" 
                                className="w-24 h-24 object-contain rounded-md bg-white p-2 mx-auto"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Logo Image URL</label>
                            <input 
                                name="appLogoUrl"
                                value={logos.appLogoUrl} 
                                onChange={handleInputChange} 
                                className="w-full form-input mt-1"
                                placeholder="https://example.com/app_logo.png"
                            />
                        </div>
                    </div>
                </div>

                {/* eSewa Logo */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">eSewa Logo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-1">
                            <ProgressiveImage 
                                src={logos.esewaLogoUrl || 'https://via.placeholder.com/200x70?text=eSewa+Logo'} 
                                alt="eSewa Logo Preview" 
                                className="w-full h-24 object-contain rounded-md bg-white p-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Image URL</label>
                            <input 
                                name="esewaLogoUrl"
                                value={logos.esewaLogoUrl} 
                                onChange={handleInputChange} 
                                className="w-full form-input mt-1"
                                placeholder="https://example.com/esewa_logo.png"
                            />
                        </div>
                    </div>
                </div>

                {/* Khalti Logo */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Khalti Logo</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-1">
                            <ProgressiveImage 
                                src={logos.khaltiLogoUrl || 'https://via.placeholder.com/350x90?text=Khalti+Logo'} 
                                alt="Khalti Logo Preview" 
                                className="w-full h-24 object-contain rounded-md bg-black p-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Image URL</label>
                            <input 
                                name="khaltiLogoUrl"
                                value={logos.khaltiLogoUrl} 
                                onChange={handleInputChange} 
                                className="w-full form-input mt-1"
                                placeholder="https://example.com/khalti_logo.png"
                            />
                        </div>
                    </div>
                </div>

                 {/* eSewa QR Code */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">eSewa QR Code</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-1">
                            <ProgressiveImage 
                                src={logos.esewaQrUrl || 'https://via.placeholder.com/150'} 
                                alt="eSewa QR Preview" 
                                className="w-40 h-40 object-contain rounded-md bg-white p-2 mx-auto"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">QR Code Image URL</label>
                            <input 
                                name="esewaQrUrl"
                                value={logos.esewaQrUrl} 
                                onChange={handleInputChange} 
                                className="w-full form-input mt-1"
                                placeholder="https://example.com/esewa_qr.png"
                            />
                        </div>
                    </div>
                </div>

                 {/* Khalti QR Code */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Khalti QR Code</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-1">
                            <ProgressiveImage 
                                src={logos.khaltiQrUrl || 'https://via.placeholder.com/150'} 
                                alt="Khalti QR Preview" 
                                className="w-40 h-40 object-contain rounded-md bg-white p-2 mx-auto"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">QR Code Image URL</label>
                            <input 
                                name="khaltiQrUrl"
                                value={logos.khaltiQrUrl} 
                                onChange={handleInputChange} 
                                className="w-full form-input mt-1"
                                placeholder="https://example.com/khalti_qr.png"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t dark:border-gray-700">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminImageManagementPage;