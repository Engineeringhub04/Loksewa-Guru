import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

interface SplashScreenData {
    logoUrl: string;
    appName: string;
    developerName: string;
    version: string;
    videoUrl?: string;
    splashType: 'video' | 'image';
    backgroundImageUrl?: string;
    durationSeconds: number;
    useCustom: boolean;
}

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

const AdminSplashScreenPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<SplashScreenData>({ logoUrl: '', appName: '', developerName: '', version: '', videoUrl: '', splashType: 'video', backgroundImageUrl: '', durationSeconds: 3.5, useCustom: false });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();
    
    // State for logo image
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // State for video
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    
    // State for background image
    const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
    const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);


    const docRef = useCallback(() => doc(db, 'settings', 'splashScreen'), []);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const docSnap = await getDoc(docRef());
                if (docSnap.exists()) {
                    const data = docSnap.data() as Partial<SplashScreenData>;
                    const mergedData: SplashScreenData = {
                        logoUrl: data.logoUrl || '',
                        appName: data.appName || '',
                        developerName: data.developerName || '',
                        version: data.version || '',
                        videoUrl: data.videoUrl || '',
                        splashType: data.splashType || 'video',
                        backgroundImageUrl: data.backgroundImageUrl || '',
                        durationSeconds: data.durationSeconds || 3.5,
                        useCustom: data.useCustom !== undefined ? data.useCustom : true,
                    };
                    setSettings(mergedData);
                    setLogoPreview(data.logoUrl || null);
                    setVideoPreview(data.videoUrl || null);
                    setBackgroundImagePreview(data.backgroundImageUrl || null);
                } else {
                    const defaultSettings: SplashScreenData = { 
                        logoUrl: 'https://i.imgur.com/J5QX03J.png', 
                        appName: 'Loksewa Guru',
                        developerName: 'Kishan Raut',
                        version: 'v1.0.0',
                        videoUrl: '',
                        splashType: 'video',
                        backgroundImageUrl: '',
                        durationSeconds: 3.5,
                        useCustom: false,
                    };
                    setSettings(defaultSettings);
                    setLogoPreview(defaultSettings.logoUrl);
                }
            } catch (error) {
                console.error("Error fetching splash screen settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [docRef]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));
        }
    };

    const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBackgroundImageFile(file);
            setBackgroundImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveVideo = async () => {
        if (!window.confirm("Are you sure you want to remove the custom video and revert to the default?")) return;
        
        setIsSaving(true);
        try {
            await updateDoc(docRef(), { videoUrl: '' });
            setSettings(prev => ({...prev, videoUrl: ''}));
            setVideoPreview(null);
            setVideoFile(null);
            showToast("Custom video removed. The app will now use the default video.", "info");
        } catch (error) {
            console.error("Error removing video URL:", error);
            showToast("Failed to remove the custom video.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        let finalLogoUrl = settings.logoUrl;
        let finalVideoUrl = settings.videoUrl || '';
        let finalBackgroundImageUrl = settings.backgroundImageUrl || '';
    
        try {
            const uploadFile = async (file: File) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'filereceive');
    
                const response = await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload', {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) throw new Error(`Cloudinary upload failed for ${file.name}.`);
                const uploadData = await response.json();
                return uploadData.secure_url;
            };
    
            if (logoFile) finalLogoUrl = await uploadFile(logoFile);
            if (videoFile) finalVideoUrl = await uploadFile(videoFile);
            if (backgroundImageFile) finalBackgroundImageUrl = await uploadFile(backgroundImageFile);
    
            const dataToSave = { ...settings, logoUrl: finalLogoUrl, videoUrl: finalVideoUrl, backgroundImageUrl: finalBackgroundImageUrl };
    
            const batch = writeBatch(db);
    
            // 1. Update the splash screen doc
            const splashScreenRef = doc(db, 'settings', 'splashScreen');
            batch.set(splashScreenRef, dataToSave);
    
            // 2. Sync the logo to the main image settings doc
            const imageSettingsRef = doc(db, 'settings', 'paymentLogos');
            batch.set(imageSettingsRef, { appLogoUrl: finalLogoUrl }, { merge: true });
    
            // 3. Sync the logo to the welcome page's doc
            const welcomePageRef = doc(db, 'settings', 'welcomePage');
            batch.set(welcomePageRef, { logoUrl: finalLogoUrl }, { merge: true });
    
            await batch.commit();
    
            setSettings(dataToSave);
            showToast("Splash screen settings saved and synced successfully!");
    
        } catch (error) {
            console.error("Error saving settings:", error);
            showToast(`Failed to save settings: ${(error as Error).message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setSettings(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    if (loading) return <p className="p-6">Loading settings...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <PhotoIcon className="h-6 w-6" />
                    Splash Screen Settings
                </h1>
            </header>

            <div className="space-y-8">
                 <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Master Control</h3>
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Use Custom Splash Screen</span>
                        <ToggleSwitch
                            enabled={settings.useCustom}
                            setEnabled={(enabled) => setSettings(prev => ({ ...prev, useCustom: enabled }))}
                        />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Turn this off to show the default built-in splash screen. Turn it on to use the custom settings below.
                    </p>
                </div>

                <fieldset disabled={!settings.useCustom} className="space-y-8 disabled:opacity-50 transition-opacity">
                    {/* Background Type Toggle */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Background Type</h3>
                        <div className="flex items-center gap-4">
                            <span className={`font-semibold transition-colors ${settings.splashType === 'image' ? 'text-purple-600 dark:text-purple-300' : 'text-gray-400 dark:text-gray-500'}`}>Image & Text</span>
                            <ToggleSwitch
                                enabled={settings.splashType === 'video'}
                                setEnabled={(enabled) => setSettings(prev => ({ ...prev, splashType: enabled ? 'video' : 'image' }))}
                            />
                            <span className={`font-semibold transition-colors ${settings.splashType === 'video' ? 'text-purple-600 dark:text-purple-300' : 'text-gray-400 dark:text-gray-500'}`}>Video Only</span>
                        </div>
                    </div>

                    {settings.splashType === 'video' ? (
                        // --- VIDEO SETTINGS ---
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 animate-fade-in space-y-4">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Splash Screen Video</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div className="md:col-span-1">
                                    {videoPreview ? (
                                        <video 
                                            key={videoPreview}
                                            src={videoPreview} 
                                            loop 
                                            autoPlay 
                                            muted 
                                            playsInline
                                            className="w-full h-32 object-cover rounded-md bg-black" 
                                        />
                                    ) : (
                                        <div className="w-full h-32 bg-gray-200 dark:bg-gray-800 rounded-md flex flex-col items-center justify-center text-center p-2">
                                            <PhotoIcon className="h-8 w-8 text-gray-400" />
                                            <p className="text-xs text-gray-500 mt-1">No custom video. Default will be used.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <div>
                                        <label className="text-sm font-medium">Upload Custom Video</label>
                                        <input type="file" accept="video/mp4,video/webm" onChange={handleVideoChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mt-1" />
                                    </div>
                                    {settings.videoUrl && (
                                        <button onClick={handleRemoveVideo} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-semibold">
                                            <TrashIcon className="h-4 w-4" /> Remove Custom Video
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Show Duration (seconds)</label>
                                <input 
                                    type="number" 
                                    name="durationSeconds" 
                                    value={settings.durationSeconds} 
                                    onChange={handleInputChange} 
                                    className="w-full form-input mt-1" 
                                    step="0.1"
                                    min="1"
                                />
                            </div>
                        </div>
                    ) : (
                        // --- IMAGE & TEXT SETTINGS ---
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">App Name</label>
                                    <input name="appName" value={settings.appName} onChange={handleInputChange} className="w-full form-input mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Developer Name</label>
                                    <input name="developerName" value={settings.developerName} onChange={handleInputChange} className="w-full form-input mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Version</label>
                                    <input name="version" value={settings.version} onChange={handleInputChange} className="w-full form-input mt-1" placeholder="e.g., v1.0.1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Show Duration (seconds)</label>
                                    <input 
                                        type="number" 
                                        name="durationSeconds" 
                                        value={settings.durationSeconds} 
                                        onChange={handleInputChange} 
                                        className="w-full form-input mt-1" 
                                        step="0.1"
                                        min="1"
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                                <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">App Logo</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="md:col-span-1">
                                        <img src={logoPreview || 'https://via.placeholder.com/150'} alt="Logo Preview" className="w-24 h-24 object-contain rounded-md bg-white p-2 mx-auto" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium">Upload New Logo</label>
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mt-1" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                                <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Splash Screen Background Image</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="md:col-span-1">
                                        <img src={backgroundImagePreview || 'https://via.placeholder.com/300x200'} alt="Background Preview" className="w-full h-32 object-cover rounded-md bg-gray-200" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium">Upload New Background Image</label>
                                        <input type="file" accept="image/*" onChange={handleBackgroundImageChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </fieldset>
            </div>

            <div className="flex justify-end pt-6 border-t dark:border-gray-600 mt-8">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}.animate-fade-in{animation:fade-in .3s ease-out forwards}@keyframes fade-in{from{opacity:0}to{opacity:1}}`}</style>
        </div>
    );
};

export default AdminSplashScreenPage;