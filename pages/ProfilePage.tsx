import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    ChevronRightIcon, 
    ArrowRightOnRectangleIcon, 
    UserIcon as UserSolidIcon,
    StarIcon,
    ChartBarIcon,
    PencilIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    XCircleIcon,
} from '@heroicons/react/24/solid';
import {
    ShieldCheckIcon,
    PhoneIcon,
    InformationCircleIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    HandThumbUpIcon,
    ShareIcon,
    ChatBubbleLeftRightIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { db, auth } from '../services/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

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


const ProfileMenuItem: React.FC<{ icon: React.ElementType, title: string, path: string }> = ({ icon: Icon, title, path }) => (
    <Link to={path} className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <Icon className="h-6 w-6 text-purple-500" />
        <span className="ml-4 font-medium text-gray-700 dark:text-gray-200 flex-1 truncate">{title}</span>
        <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto flex-shrink-0" />
    </Link>
);

const PerformanceStat: React.FC<{ icon: React.ElementType, value: string, label: string, color: string }> = ({ icon: Icon, value, label, color }) => (
    <div className={`p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg`}>
        <Icon className={`h-6 w-6 mx-auto ${color}`} />
        <p className="text-lg font-bold mt-2 text-gray-800 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
);

const UserPerformanceCard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        quizzesTaken: 0,
        avgScore: 0,
        correctAnswers: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const fetchPerformance = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'quizResults'), where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);
                
                let totalQuizzes = 0;
                let totalScorePercentage = 0;
                let totalCorrectAnswers = 0;

                querySnapshot.forEach(doc => {
                    const result = doc.data();
                    totalQuizzes++;
                    totalScorePercentage += result.scorePercentage || 0;
                    totalCorrectAnswers += result.score || 0;
                });

                const avgScore = totalQuizzes > 0 ? totalScorePercentage / totalQuizzes : 0;

                setStats({
                    quizzesTaken: totalQuizzes,
                    avgScore: Math.round(avgScore),
                    correctAnswers: totalCorrectAnswers,
                });
            } catch (error) {
                console.error("Error fetching performance stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPerformance();
    }, [user]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md h-[148px] flex items-center justify-center">
                <p className="text-gray-500">Loading performance...</p>
            </div>
        );
    }
    
    if (stats.quizzesTaken === 0 && !loading) {
        return (
             <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md h-[148px] flex flex-col items-center justify-center text-center">
                <h2 className="flex items-center justify-center text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
                    <ChartBarIcon className="h-6 w-6 mr-2 text-purple-500" />
                    My Performance
                </h2>
                <p className="text-sm text-gray-500">Take a quiz to see your stats here!</p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h2 className="flex items-center justify-center text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                <ChartBarIcon className="h-6 w-6 mr-2 text-purple-500" />
                My Performance
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
                <PerformanceStat icon={ClipboardDocumentCheckIcon} value={String(stats.quizzesTaken)} label="Quizzes Taken" color="text-blue-500" />
                <PerformanceStat icon={StarIcon} value={`${stats.avgScore}%`} label="Average Score" color="text-yellow-500" />
                <PerformanceStat icon={CheckCircleIcon} value={String(stats.correctAnswers)} label="Correct Answers" color="text-green-500" />
            </div>
        </div>
    );
};


const SubscriptionCard: React.FC = () => {
    const { user } = useAuth();

    const getStartDate = () => {
        if (!user || !user.subscriptionExpiry) return null;

        const expiryDate = user.subscriptionExpiry instanceof Date ? user.subscriptionExpiry : user.subscriptionExpiry.toDate();
        const startDate = new Date(expiryDate);
        if (user.planName === 'Premium') { // Yearly plan
            startDate.setFullYear(startDate.getFullYear() - 1);
        } else { // Monthly plan (default for 'Pro')
            startDate.setMonth(startDate.getMonth() - 1);
        }
        return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const isSubscribed = user?.subscriptionStatus === 'active' && user.planName !== 'Basic' && user.planName !== undefined;

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="text-center">
                {isSubscribed && user.subscriptionExpiry ? (
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-white">
                            My Plan: <span className="text-purple-600 dark:text-purple-400">{user.planName}</span>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Start: {getStartDate()} - End: {(user.subscriptionExpiry instanceof Date ? user.subscriptionExpiry : user.subscriptionExpiry.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-300">
                            My Plan: <span className="font-bold">{user?.planName || 'Basic'}</span>
                        </p>
                        <Link to="/subscription" className="text-sm text-purple-600 dark:text-purple-400 hover:underline mt-1 inline-block">
                            Upgrade to unlock premium features!
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};


const ProfilePage: React.FC = () => {
  const { user, logout, isAdmin, updateUserContext } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
        await logout();
        navigate('/');
    } catch (error) {
        console.error("Failed to logout:", error);
    }
  };
  
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadError(null);
    setUploadSuccess(null);

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setUploadError("File is too large. Please select an image under 2MB.");
        setTimeout(() => setUploadError(null), 5000);
        return;
    }

    setIsUploading(true);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'filereceive'); 
        formData.append('public_id', user.uid); 
        formData.append('folder', 'profile_pictures'); 

        const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload';

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Cloudinary upload failed.');
        }

        const data = await response.json();
        const downloadURL = data.secure_url;
        const cacheBustedURL = `${downloadURL}?t=${new Date().getTime()}`;

        // Optimistically update the global context. This is the new single source of truth.
        updateUserContext({ photoUrl: cacheBustedURL });

        // Update database and authentication profile in the background with the clean URL
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { photoUrl: downloadURL });
        
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
        }
        
        setUploadSuccess("Profile photo updated successfully!");
        setTimeout(() => setUploadSuccess(null), 3000);

    } catch (error) {
        console.error("Error updating profile picture:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setUploadError(`Upload failed: ${errorMessage}`);
        // No need to revert local state, as we now rely on the global context which will eventually sync
        setTimeout(() => setUploadError(null), 5000);
    } finally {
        setIsUploading(false);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };


  const handleEditClick = () => {
    fileInputRef.current?.click();
  };

  const defaultAvatar = `https://api.dicebear.com/8.x/initials/svg?seed=${user?.fullName || 'User'}`;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-100 dark:bg-gray-900">
        <header className="bg-purple-600 dark:bg-purple-800 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-10">
            <div className="flex items-center space-x-4">
                <div className="relative flex-shrink-0">
                    <ProgressiveImage 
                        key={user?.photoUrl} // The key prop forces React to re-render the img tag when the URL string changes
                        src={user?.photoUrl || defaultAvatar}
                        alt="User Avatar"
                        className="w-20 h-20 rounded-full border-4 border-purple-400 object-cover bg-purple-200"
                    />
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageChange} 
                        className="hidden" 
                        accept="image/*"
                        disabled={isUploading}
                    />
                    <button 
                        onClick={handleEditClick}
                        disabled={isUploading}
                        className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 p-1.5 rounded-full shadow-md hover:bg-gray-200 transition disabled:opacity-50"
                        aria-label="Edit profile picture"
                    >
                        {isUploading ? <ArrowPathIcon className="h-4 w-4 text-purple-600 animate-spin" /> : <PencilIcon className="h-4 w-4 text-purple-600 dark:text-purple-300" />}
                    </button>
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{user?.fullName || 'Welcome, User'}</h1>
                    <p className="text-sm text-purple-200">{user?.email}</p>
                    {isAdmin ? (
                         <span className="mt-2 inline-block bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded-full">Administrator</span>
                    ) : (
                        <span className="mt-2 inline-block bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-xs font-semibold px-2 py-1 rounded-full">{user?.planName || 'Basic'} Plan</span>
                    )}
                </div>
            </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto pb-24">
            {uploadError && (
                <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg flex items-center gap-2 animate-fade-in-scale">
                    <XCircleIcon className="h-5 w-5"/>
                    <span className="text-sm">{uploadError}</span>
                </div>
            )}
            {uploadSuccess && (
                <div className="mb-3 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 text-green-700 dark:text-green-200 rounded-lg flex items-center gap-2 animate-fade-in-scale">
                    <CheckCircleIcon className="h-5 w-5"/>
                    <span className="text-sm">{uploadSuccess}</span>
                </div>
            )}
            <div className="space-y-3">
                <UserPerformanceCard />
                <SubscriptionCard />
                 {isAdmin && (
                    <Link to="/admin" className="flex items-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg">
                        <ChartBarIcon className="h-6 w-6" />
                        <span className="ml-4 font-bold">Go to Admin Panel</span>
                        <ChevronRightIcon className="h-5 w-5 ml-auto" />
                    </Link>
                 )}
                 <ProfileMenuItem icon={UserSolidIcon} title="Account Settings" path="/account-settings" />
                 <ProfileMenuItem icon={ShieldCheckIcon} title="Security Settings" path="/security-settings" />
                 <ProfileMenuItem icon={StarIcon} title="My Subscription" path="/subscription" />

                <div className="pt-2">
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                
                 <ProfileMenuItem icon={PhoneIcon} title="Contact Us" path="/contact-us" />
                 <ProfileMenuItem icon={InformationCircleIcon} title="About Us" path="/about-us" />
                 <ProfileMenuItem icon={DocumentTextIcon} title="Privacy Policy and Terms and conditions" path="/privacy-policy" />
                 <ProfileMenuItem icon={ExclamationTriangleIcon} title="Disclaimer" path="/disclaimer" />
                 <ProfileMenuItem icon={HandThumbUpIcon} title="Rate Our App" path="/rate-our-app" />
                 <ProfileMenuItem icon={ShareIcon} title="Share Our App" path="/share-our-app" />
                 <ProfileMenuItem icon={ChatBubbleLeftRightIcon} title="Feedback" path="/feedback" />

                <div className="pt-2">
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <ArrowRightOnRectangleIcon className="h-6 w-6 text-red-500" />
                    <span className="ml-4 font-medium text-red-500">Logout</span>
                </button>
            </div>
        </main>

    </div>
  );
};

export default ProfilePage;