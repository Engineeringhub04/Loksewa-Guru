import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface SplashScreenData {
    logoUrl: string;
    appName: string;
    developerName: string;
    version: string;
    videoUrl?: string;
    splashType?: 'video' | 'image';
    backgroundImageUrl?: string;
    durationSeconds: number;
    useCustom: boolean;
}

interface SplashScreenProps {
    onFinished: () => void;
}

const STORAGE_KEY = 'loksewa-splash-screen-data';

const defaults: SplashScreenData = {
    logoUrl: 'https://i.imgur.com/J5QX03J.png',
    appName: 'Loksewa Guru',
    developerName: 'Kishan Raut',
    version: 'v1.0.0',
    splashType: 'image',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1332&auto=format&fit=crop',
    durationSeconds: 3.5,
    useCustom: false,
};

// --- IndexedDB Helper Functions ---
const DB_NAME = 'LoksewaDB';
const DB_VERSION = 1;
const STORE_NAME = 'splashStore';
const VIDEO_KEY = 'splashVideo';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getVideoFromDB = async (): Promise<Blob | null> => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(VIDEO_KEY);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result as Blob | null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Could not get video from IndexedDB", error);
        return null;
    }
};

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
    const [finalSettings, setFinalSettings] = useState<SplashScreenData | null>(null);
    const [videoSrc, setVideoSrc] = useState<string>('');
    const [videoLoadError, setVideoLoadError] = useState(false);
    const objectUrlToRevoke = useRef<string | null>(null);

    // Effect 1: Fetch and determine settings
    useEffect(() => {
        const determineSettings = async () => {
            let settingsToUse: SplashScreenData;
            let remoteOrCachedData: Partial<SplashScreenData> = {};

            try {
                // Try to get fresh data if online
                if (navigator.onLine) {
                    const docRef = doc(db, 'settings', 'splashScreen');
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const freshData = docSnap.data();
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(freshData));
                        remoteOrCachedData = freshData;
                    } else {
                        // If no remote doc, try cache
                        remoteOrCachedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                    }
                } else {
                    // Offline, use cache
                    remoteOrCachedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                }
            } catch (error) {
                console.warn("Could not get remote settings, falling back to cache. Error:", error);
                try {
                    remoteOrCachedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                } catch {
                    // If cache is also broken, remoteOrCachedData remains {}
                }
            }

            // If useCustom is explicitly true, merge remote settings over defaults.
            // Otherwise, strictly use the default settings, ignoring all other custom values.
            if (remoteOrCachedData.useCustom === true) {
                settingsToUse = { ...defaults, ...remoteOrCachedData };
            } else {
                settingsToUse = defaults;
            }

            setFinalSettings(settingsToUse);
        };

        determineSettings();
    }, []);


    // Effect 2: Set the video source based on final settings.
    useEffect(() => {
        const resolveVideoSource = async () => {
            if (!finalSettings || finalSettings.splashType !== 'video' || !finalSettings.useCustom) {
                return;
            };

            // Cleanup previous blob URL
            if (objectUrlToRevoke.current) {
                URL.revokeObjectURL(objectUrlToRevoke.current);
                objectUrlToRevoke.current = null;
            }

            const remoteUrl = finalSettings.videoUrl;
            if (!remoteUrl) {
                setVideoLoadError(true); // No custom URL provided, trigger error to show image
                return;
            }

            const lastDownloadedUrl = localStorage.getItem('loksewa-splash-last-downloaded');
            const cachedVideoBlob = await getVideoFromDB();

            if (cachedVideoBlob && remoteUrl === lastDownloadedUrl) {
                const blobUrl = URL.createObjectURL(cachedVideoBlob);
                objectUrlToRevoke.current = blobUrl;
                setVideoSrc(blobUrl);
            } else if (navigator.onLine) {
                setVideoSrc(remoteUrl);
            } else {
                // Offline with no valid cache, can't play custom video
                setVideoLoadError(true);
            }
        };

        if (finalSettings) {
            resolveVideoSource();
        }

        return () => {
            if (objectUrlToRevoke.current) {
                URL.revokeObjectURL(objectUrlToRevoke.current);
                objectUrlToRevoke.current = null;
            }
        };
    }, [finalSettings]);
    
    // Effect 3: Handle the timer and call onFinished.
    useEffect(() => {
        if (!finalSettings) return;
        const duration = (finalSettings.durationSeconds > 0 ? finalSettings.durationSeconds : 3.5) * 1000;
        const timer = setTimeout(onFinished, duration);
        return () => clearTimeout(timer);
    }, [finalSettings, onFinished]);

    // --- RENDER LOGIC ---

    if (!finalSettings) {
        return <div className="fixed inset-0 z-[100] h-screen w-screen bg-gray-900" />;
    }
    
    const isCustom = finalSettings.useCustom;
    const showVideo = isCustom && finalSettings.splashType === 'video' && !videoLoadError;

    // Case 1: Custom Video Splash
    if (showVideo) {
         return (
            <div className="fixed inset-0 z-[100] h-screen w-screen overflow-hidden bg-gray-900 animate-fade-in">
                <video 
                    key={videoSrc}
                    autoPlay 
                    muted 
                    playsInline 
                    className="absolute top-1/2 left-1/2 w-full h-full min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2 z-0"
                    onError={() => {
                        console.error(`Splash video at '${videoSrc}' failed to load.`);
                        setVideoLoadError(true);
                    }}
                >
                    <source src={videoSrc} type="video/mp4" />
                </video>
            </div>
        );
    }
    
    // Case 2: Default Splash (Master Control OFF)
    if (!isCustom) {
        return (
            <div className="fixed inset-0 z-[100] h-screen w-screen flex items-center justify-center bg-gray-900 animate-fade-in">
                <img 
                    src="/images/img-1.png"
                    alt="Loksewa Guru"
                    className="max-w-full max-h-full object-contain"
                />
            </div>
        );
    }

    // Case 3: Custom Image Splash (Master Control ON, but type is 'image')
    const imageSrc = finalSettings.backgroundImageUrl || defaults.backgroundImageUrl;

    return (
        <div className="fixed inset-0 z-[100] h-screen w-screen overflow-hidden bg-gray-900 animate-fade-in">
            <img src={imageSrc} alt="Splash screen background" className="absolute top-1/2 left-1/2 w-full h-full min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2 z-0" />
            <div className="absolute inset-0 bg-black/50 z-10"></div>
            <div className="relative z-20 flex flex-col h-full items-center justify-center text-white">
                <div className="flex-1 flex flex-col justify-center items-center gap-4 animate-fade-in-scale" style={{ animationDelay: '300ms' }}>
                    <img src={finalSettings.logoUrl} alt="App Logo" className="w-24 h-24 mb-4 drop-shadow-lg" />
                    <h1 className="text-4xl font-bold tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{finalSettings.appName}</h1>
                </div>
                <div className="pb-10 text-center text-slate-200" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    <p className="text-base font-semibold">{finalSettings.version}</p>
                    <p className="text-sm">Developed by {finalSettings.developerName}</p>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
