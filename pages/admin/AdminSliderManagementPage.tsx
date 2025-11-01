import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { SliderImage } from '../../types';
import { DEFAULT_SLIDER_IMAGES } from '../../constants';
import { PlusIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/solid';
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


const AdminSliderManagementPage: React.FC = () => {
    const [images, setImages] = useState<SliderImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const docRef = useCallback(() => doc(db, 'settings', 'sliderImages'), []);

    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true);
            try {
                const docSnap = await getDoc(docRef());
                if (docSnap.exists() && docSnap.data().images) {
                    setImages(docSnap.data().images);
                } else {
                    setImages(DEFAULT_SLIDER_IMAGES);
                }
            } catch (error) {
                console.error("Error fetching slider images:", error);
                setImages(DEFAULT_SLIDER_IMAGES);
            } finally {
                setLoading(false);
            }
        };
        fetchImages();
    }, [docRef]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(docRef(), { images });
            showToast("Slider images saved successfully!");
        } catch (error) {
            console.error("Error saving slider images:", error);
            showToast("Failed to save images.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageChange = (index: number, field: keyof SliderImage, value: string) => {
        const newImages = [...images];
        newImages[index] = { ...newImages[index], [field]: value };
        setImages(newImages);
    };

    const handleAddImage = () => {
        setImages([...images, { imageUrl: '', altText: 'New Image', linkUrl: '#' }]);
    };
    
    const handleRemoveImage = (index: number) => {
        if (window.confirm('Are you sure you want to remove this image?')) {
            const newImages = images.filter((_, i) => i !== index);
            setImages(newImages);
        }
    };

    if (loading) return <p className="p-6">Loading slider image settings...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-8">
            <header className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <PhotoIcon className="h-6 w-6"/>
                    Manage Homepage Slider Images
                </h1>
            </header>
            
            <div className="space-y-6">
                {images.map((image, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 relative">
                        <button 
                            onClick={() => handleRemoveImage(index)} 
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 bg-white/50 dark:bg-gray-800/50 rounded-full"
                            aria-label="Remove image"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="md:col-span-1">
                                <ProgressiveImage src={image.imageUrl || 'https://via.placeholder.com/150'} alt={image.altText} className="w-full h-24 object-cover rounded-md bg-gray-200" />
                            </div>
                            <div className="md:col-span-3 space-y-3">
                                <div>
                                    <label className="text-sm font-medium">Image URL</label>
                                    <input value={image.imageUrl} onChange={e => handleImageChange(index, 'imageUrl', e.target.value)} className="w-full form-input mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Alt Text</label>
                                    <input value={image.altText} onChange={e => handleImageChange(index, 'altText', e.target.value)} className="w-full form-input mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Link URL (optional)</label>
                                    <input value={image.linkUrl} onChange={e => handleImageChange(index, 'linkUrl', e.target.value)} className="w-full form-input mt-1" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleAddImage} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-400 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <PlusIcon className="h-5 w-5" /> Add New Image
            </button>
            
            <div className="flex justify-end pt-6 border-t dark:border-gray-700">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
             <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminSliderManagementPage;