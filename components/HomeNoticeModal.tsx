import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/solid';
import type { HomeNotice } from '../types';

interface HomeNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    notices: HomeNotice[];
}

const HomeNoticeModal: React.FC<HomeNoticeModalProps> = ({ isOpen, onClose, notices }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<number | null>(null);

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const goToNext = useCallback(() => {
        const isLast = currentIndex === notices.length - 1;
        setCurrentIndex(isLast ? 0 : currentIndex + 1);
    }, [currentIndex, notices.length]);

    useEffect(() => {
        if (isOpen && notices.length > 1) {
            resetTimeout();
            timeoutRef.current = window.setTimeout(goToNext, 4000);
        }
        return () => resetTimeout();
    }, [isOpen, notices.length, goToNext, resetTimeout, currentIndex]);

    const goToPrevious = () => {
        const isFirst = currentIndex === 0;
        setCurrentIndex(isFirst ? notices.length - 1 : currentIndex + 1);
    };

    if (!isOpen || notices.length === 0) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Important Notice</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 relative min-h-[50vh]">
                    <div className="w-full h-full overflow-hidden">
                        <div
                            className="flex transition-transform ease-in-out duration-500 h-full"
                            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                        >
                            {notices.map((notice) => (
                                <div key={notice.id} className="w-full h-full flex-shrink-0 p-4 flex items-center justify-center">
                                    <a href={notice.linkUrl && notice.linkUrl !== '#' ? notice.linkUrl : undefined} target="_blank" rel="noopener noreferrer" className={notice.linkUrl && notice.linkUrl !== '#' ? 'cursor-pointer' : 'cursor-default'}>
                                        <img
                                            src={notice.imageUrl}
                                            alt="Notice"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>

                    {notices.length > 1 && (
                        <>
                            <button onClick={goToPrevious} className="absolute top-1/2 left-2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white"><ChevronLeftIcon className="h-5 w-5" /></button>
                            <button onClick={goToNext} className="absolute top-1/2 right-2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white"><ChevronRightIcon className="h-5 w-5" /></button>
                        </>
                    )}
                </div>

                {notices.length > 1 && (
                    <div className="flex justify-center gap-2 p-4">
                        {notices.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-2 w-2 rounded-full transition-all ${currentIndex === index ? 'w-4 bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                aria-label={`Go to notice ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeNoticeModal;