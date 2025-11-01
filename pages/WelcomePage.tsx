import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

const SparkleIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4.00001L28.5 19.5L44 24L28.5 28.5L24 44L19.5 28.5L4 24L19.5 19.5L24 4.00001Z" />
    </svg>
);

const localSliderContent = [
    { 
        imageUrl: '/w-slider-1.png',
        description: 'Practice with thousands of MCQs and quizzes tailored for your exam preparation.'
    },
    { 
        imageUrl: '/w-slider-2.png',
        description: 'Access comprehensive notes and study materials for all subjects, anytime, anywhere.'
    }
];

const WelcomePage: React.FC = () => {
    const navigate = useNavigate();
    const { welcomeData } = useData();
    const { grantGuestAccess } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<number | null>(null);

    const finalSliderContent = welcomeData.sliderImages && welcomeData.sliderImages.length > 0
        ? welcomeData.sliderImages
        : localSliderContent;

    const handleSkip = () => {
        grantGuestAccess();
        navigate('/');
    };

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const goToNext = useCallback(() => {
        if (finalSliderContent.length === 0) return;
        const isLastSlide = currentIndex === finalSliderContent.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    }, [currentIndex, finalSliderContent.length]);

    useEffect(() => {
        resetTimeout();
        if (finalSliderContent.length > 1) {
            timeoutRef.current = window.setTimeout(goToNext, 4000);
        }
        return () => resetTimeout();
    }, [currentIndex, goToNext, resetTimeout, finalSliderContent.length]);

    return (
        <div className="h-screen w-full max-w-md mx-auto flex flex-col overflow-hidden bg-white dark:bg-gray-900">
             {/* Top part */}
            <div className="flex-1 flex flex-col items-center p-6 relative bg-transparent rounded-b-[2.5rem]">
                <header className="w-full flex justify-between items-center animate-fade-in-up pt-6">
                    <div className="flex items-center gap-3">
                        <img src={welcomeData.logoUrl} alt="App Logo" className="w-8 h-8" />
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{welcomeData.appName}</h1>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="bg-slate-500/10 dark:bg-slate-900/20 backdrop-blur-sm text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors z-10 border border-slate-400/30 dark:border-violet-500/50 animate-glowing-border"
                    >
                        Skip / Guest User
                    </button>
                </header>
                
                <main className="flex-1 flex flex-col justify-center items-center w-full relative">
                    {/* Image Slider */}
                     <div className="relative w-full h-[65%]">
                        {finalSliderContent.map((image, index) => (
                            <img 
                                key={index}
                                src={image.imageUrl}
                                alt={`Slide ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-in-out"
                                style={{ opacity: currentIndex === index ? 1 : 0 }}
                            />
                        ))}
                    </div>

                    <SparkleIcon className="absolute top-1/4 right-4 w-8 h-8 animate-twinkle text-violet-400/70 drop-shadow-[0_0_5px_rgba(196,181,253,0.5)]" />
                    <SparkleIcon className="absolute top-1/2 left-2 w-6 h-6 animate-twinkle text-violet-400/60 drop-shadow-[0_0_5px_rgba(196,181,253,0.5)]" style={{ animationDelay: '1s' }} />
                    
                    {/* Dots */}
                    <div className="flex gap-2 mt-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        {finalSliderContent.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${currentIndex === index ? 'w-6 bg-slate-800 dark:bg-white' : 'w-2 bg-slate-800/50 dark:bg-white/50'}`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </main>
            </div>
            
            {/* Bottom dark part */}
            <div className="bg-gradient-to-t from-slate-900 to-indigo-950 backdrop-blur-lg border-t border-indigo-800 text-white p-8 pt-10 rounded-t-[2.5rem] relative z-10 text-center animate-fade-in-up -mt-8" style={{ animationDelay: '600ms' }}>
                <div className="relative h-20 flex items-center justify-center">
                    {finalSliderContent.map((item, index) => (
                        <div key={index} className="absolute inset-0 transition-opacity duration-500 flex items-center justify-center" style={{ opacity: currentIndex === index ? 1 : 0 }}>
                            <h2 className="text-2xl font-bold leading-tight px-4">{item.description}</h2>
                        </div>
                    ))}
                </div>

                <div className="mt-8 space-y-4">
                    <button
                        onClick={() => navigate('/signup')}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold py-4 rounded-xl transition-all duration-300 animate-glowing-border"
                    >
                        Get Started
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-slate-700 text-white font-semibold py-4 rounded-xl hover:bg-slate-600 transition-colors"
                    >
                        I already have an account
                    </button>
                </div>

                <p className="text-xs text-gray-400 mt-6">
                    By continuing you agree to our Terms of Services and Privacy Policy
                </p>
            </div>
        </div>
    );
};

export default WelcomePage;