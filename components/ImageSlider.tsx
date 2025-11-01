import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import type { SliderImage } from '../types';

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


interface ImageSliderProps {
    images: SliderImage[];
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<number | null>(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const goToPrevious = useCallback(() => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    }, [currentIndex, images]);

    const goToNext = useCallback(() => {
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    }, [currentIndex, images]);

    useEffect(() => {
        resetTimeout();
        if (images.length > 1) {
            timeoutRef.current = window.setTimeout(() => {
                goToNext();
            }, 5000);
        }
        return () => {
            resetTimeout();
        };
    }, [currentIndex, images.length, goToNext, resetTimeout]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current - touchEndX.current > 75) {
            // Swiped left
            goToNext();
        }

        if (touchStartX.current - touchEndX.current < -75) {
            // Swiped right
            goToPrevious();
        }
    };


    if (!images || images.length === 0) {
        return null;
    }

    return (
        <div className="h-48 w-full relative group p-4">
            <div 
                className="w-full h-full rounded-2xl overflow-hidden relative shadow-lg"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div 
                    className="flex transition-transform ease-in-out duration-500 h-full"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {images.map((image, index) => (
                        <a key={index} href={image.linkUrl || '#'} className="w-full h-full flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                            <ProgressiveImage src={image.imageUrl} alt={image.altText} className="w-full h-full object-cover"/>
                        </a>
                    ))}
                </div>
            </div>

            {images.length > 1 && (
                <>
                    <button 
                        onClick={goToPrevious}
                        className="absolute top-1/2 left-6 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        aria-label="Previous image"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={goToNext}
                        className="absolute top-1/2 right-6 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        aria-label="Next image"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                </>
            )}

            {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, index) => (
                        <button 
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-2 w-2 rounded-full transition-all ${currentIndex === index ? 'w-4 bg-white' : 'bg-white/50'}`}
                            aria-label={`Go to slide ${index + 1}`}
                        ></button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageSlider;