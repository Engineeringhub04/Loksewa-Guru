import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import type { UpcomingFeatureData } from '../types';
import { ICONS_MAP } from '../constants';

interface FeatureSliderProps {
    features: UpcomingFeatureData[];
}

const FeatureSlider: React.FC<FeatureSliderProps> = ({ features }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    
    const itemsPerSlide = 3;
    
    // Group features into slides
    const slides = features.reduce((acc, feature, index) => {
        const slideIndex = Math.floor(index / itemsPerSlide);
        if (!acc[slideIndex]) {
            acc[slideIndex] = [];
        }
        acc[slideIndex].push(feature);
        return acc;
    }, [] as UpcomingFeatureData[][]);
    
    const totalSlides = slides.length;

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const goToPrevious = useCallback(() => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? totalSlides - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    }, [currentIndex, totalSlides]);

    const goToNext = useCallback(() => {
        const newIndex = (currentIndex + 1) % totalSlides;
        setCurrentIndex(newIndex);
    }, [currentIndex, totalSlides]);

    useEffect(() => {
        resetTimeout();
        if (totalSlides > 1) {
            timeoutRef.current = setTimeout(() => {
                goToNext();
            }, 5000); // Auto-slide every 5 seconds
        }
        return () => {
            resetTimeout();
        };
    }, [currentIndex, totalSlides, goToNext, resetTimeout]);

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

    if (!features || features.length === 0) {
        return null;
    }

    return (
        <div className="relative group py-4 -mx-4 h-36">
            <div 
                className="overflow-hidden h-full"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    className="flex transition-transform ease-in-out duration-500 h-full"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {slides.map((slide, slideIndex) => (
                        <div key={slideIndex} className="w-full flex-shrink-0 flex justify-center items-start">
                            {slide.map((feature) => {
                                const Icon = ICONS_MAP[feature.iconKey];
                                return (
                                    <div key={feature.key} className="flex-shrink-0 flex flex-col items-center px-4" style={{ width: `calc(100% / ${itemsPerSlide})` }}>
                                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                            {Icon ? <Icon className="h-8 w-8 text-white" /> : null}
                                        </div>
                                        <p className="mt-2 text-xs text-center font-medium h-8 flex items-center justify-center">{feature.name}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {totalSlides > 1 && (
                <>
                    {/* Manual Navigation Buttons */}
                    <button
                        onClick={goToPrevious}
                        className="absolute top-1/2 left-0 -translate-y-1/2 p-1 bg-black/20 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 -mt-4"
                        aria-label="Previous features"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute top-1/2 right-0 -translate-y-1/2 p-1 bg-black/20 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 -mt-4"
                        aria-label="Next features"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>

                    {/* Dots for navigation */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
                        {Array.from({ length: totalSlides }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-2 w-2 rounded-full transition-all ${currentIndex === index ? 'w-4 bg-purple-600 dark:bg-purple-400' : 'bg-gray-300 dark:bg-gray-600'}`}
                                aria-label={`Go to slide ${index + 1}`}
                            ></button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default FeatureSlider;