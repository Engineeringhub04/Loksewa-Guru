

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext'; // Import useData hook
import { sendEmail } from '../services/resendService';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, Timestamp, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
// FIX: Changed import to use exported functions from utils/nepali-date.ts
import { convertEnglishDateToNepali, localizeNumber } from '../utils/nepali-date'; // Import the new converter

import { MagnifyingGlassIcon, Bars3Icon, ArrowRightOnRectangleIcon, Cog6ToothIcon, UserIcon as UserIconSolid, SunIcon, MoonIcon, XMarkIcon, CheckCircleIcon, XCircleIcon, DocumentArrowDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { BellIcon as BellIconOutline, ChevronUpIcon, ChevronDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

import type { Notice, TeamMember, UpcomingFeatureData, AdditionalFeatureData, ServiceDocument, SliderImage, SubmittedFile, Notification, AuthUser, OtherSiteData, AdminNotification, Note, SyllabusEntry, QuizDocument, OfflineTest } from '../types';
import { 
    ICONS_MAP,
    ADDITIONAL_FEATURES,
    FacebookIcon,
    InstagramIcon,
    TwitterIcon,
    UPCOMING_FEATURES
} from '../constants';
import Modal from '../components/Modal';
import ImageSlider from '../components/ImageSlider';
import FeatureSlider from '../components/FeatureSlider';
import Footer from '../components/Footer';
import ToastNotification from '../components/ToastNotification';
import PullToRefresh from '../components/PullToRefresh';

// FIX: Added ProgressiveImage, its helper, and useAnimateOnScroll to resolve "Cannot find name" errors.

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


// Custom hook to detect when an element is in view and apply animation classes only once per session
const useAnimateOnScroll = (key: string, threshold = 0.1) => {
    const sessionKey = `animation_shown_${key}`;
    const hasBeenShown = sessionStorage.getItem(sessionKey) === 'true';

    const [isVisible, setIsVisible] = useState(hasBeenShown);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (hasBeenShown) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    sessionStorage.setItem(sessionKey, 'true');
                    if (entry.target) {
                        observer.unobserve(entry.target);
                    }
                }
            },
            { threshold }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [threshold, hasBeenShown, sessionKey]);

    const animationClasses = `transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-8 blur-sm'
    }`;

    return [ref, animationClasses] as const;
};


// --- NEPALI DATE & TIME UTILITIES ---
const useNepaliDateTime = () => {
    const [now, setNow] = useState(new Date());
    const [showAdDate, setShowAdDate] = useState(false);

    useEffect(() => {
        const timerId = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/\s/g, '');
    
    const currentNepaliTime = localizeNumber(currentTime);

    const dateResult = convertEnglishDateToNepali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    const [englishFullDate, nepaliFullDate] = Array.isArray(dateResult) ? dateResult : ['', ''];

    const currentNepaliDate = localizeNumber(nepaliFullDate);
    
    const currentEnglishDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    return { currentTime, currentNepaliTime, currentNepaliDate, currentEnglishDate, showAdDate, setShowAdDate };
};



// --- SEARCH OVERLAY COMPONENT ---
interface SearchResult {
    id: string;
    title: string;
    type: string;
    path: string;
    iconKey: string;
}

const SearchOverlay: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    query: string;
    results: SearchResult[];
    isHeaderShrunk: boolean;
}> = ({ isOpen, onClose, query, results, isHeaderShrunk }) => {
    const navigate = useNavigate();

    const handleResultClick = (path: string) => {
        navigate(path);
        onClose();
    };

    const ResultItem: React.FC<{ item: SearchResult; onClick: () => void }> = ({ item, onClick }) => {
        const Icon = ICONS_MAP[item.iconKey] || DocumentTextIcon;
        return (
            <button onClick={onClick} className="w-full text-left flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors">
                <Icon className="h-6 w-6 text-gray-300 flex-shrink-0" />
                <div className="overflow-hidden">
                    <p className="font-semibold text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.type}</p>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-500 ml-auto flex-shrink-0" />
            </button>
        );
    };

    if (!isOpen) return null;

    // Dynamically adjust the top position based on the header's state
    const topPositionClass = isHeaderShrunk ? 'top-16' : 'top-40';

    return (
        <div className={`fixed ${topPositionClass} left-0 right-0 z-[65] px-4 animate-fade-in`}>
            <div 
                className="w-full max-w-md mx-auto bg-gray-800 border border-gray-600 rounded-2xl shadow-lg flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-2 overflow-y-auto max-h-[60vh]">
                    {query.trim().length > 0 ? (
                        results.length > 0 ? (
                            <div className="space-y-1">
                                {results.map(item => <ResultItem key={item.id} item={item} onClick={() => handleResultClick(item.path)} />)}
                            </div>
                        ) : (
                            <div className="text-center p-8 text-gray-400">
                                <p>No results found for "{query}"</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center p-8 text-gray-400">
                            <p>Start typing to search...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
// --- END OF SEARCH OVERLAY COMPONENT ---

interface HeaderProps {
    onMenuClick: () => void;
    onThemeToggle: () => void;
    isVisible: boolean;
    isMenuOpen: boolean;
    user: AuthUser | null;
    isLoggedIn: boolean;
    unreadCount: number;
    isDarkMode: boolean;
    isShrunk: boolean;
    onSearchFocus: () => void;
    onSearchBlur: () => void;
    query: string;
    onQueryChange: (q: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onMenuClick, 
    onThemeToggle,
    isVisible, 
    isMenuOpen, 
    user,
    isLoggedIn,
    unreadCount,
    isDarkMode,
    isShrunk,
    onSearchFocus,
    onSearchBlur,
    query,
    onQueryChange,
}) => {
    const navigate = useNavigate();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const firstName = user?.fullName?.split(' ')[0] || 'User';
    
    const avatarUrl = user?.photoUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.fullName || 'User'}&backgroundColor=00897b,00acc1,039be5,1e88e5,3949ab,43a047,5e35b1,6d4c41,7cb342,8e24aa,c0ca33,d81b60,e53935,f4511e,fb8c00,fdd835`;
    const genericAvatarUrl = `https://api.dicebear.com/8.x/initials/svg?seed=Welcome&backgroundColor=cccccc`;

  return (
    <div className={`sticky top-0 z-[61] px-4 bg-blue-600 text-white shadow-lg transition-all duration-300 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'} ${isShrunk ? 'rounded-b-xl py-2' : 'rounded-b-3xl py-4'}`}>
        <div className={`flex justify-between items-center transition-all duration-300`}>
            {/* Left Side */}
            <div className="flex items-center gap-3">
                <button onClick={onMenuClick} className="p-1 text-white" aria-label="Toggle menu" aria-expanded={isMenuOpen}>
                    <Bars3Icon className="h-8 w-8" />
                </button>
                <img src={isLoggedIn ? avatarUrl : genericAvatarUrl} alt="User Avatar" className={`transition-all duration-300 rounded-full object-cover bg-gray-200 ${isShrunk ? 'w-10 h-10' : 'w-14 h-14'}`} />
                
                {/* Greeting Text Block - FIXED */}
                <div className={`transition-all duration-300 ease-out overflow-hidden whitespace-nowrap ${isShrunk ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
                    {isLoggedIn ? (
                        <>
                            <p className="text-xl font-bold">{getGreeting()}</p>
                            <p className="text-xl font-light text-blue-200 leading-tight">{firstName}</p>
                        </>
                    ) : (
                        <>
                            <p className="font-bold text-lg leading-tight">Welcome!</p>
                            <p className="text-xs font-light text-blue-200">Pls login to continue</p>
                        </>
                    )}
                </div>
            </div>

            {/* Shrunk Search Box - always in DOM */}
            <div className={`flex-1 relative transition-all duration-300 ease-out ${isShrunk ? 'max-w-full opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'}`}>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-white/20 placeholder-blue-200 text-white rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                        onFocus={onSearchFocus}
                        onBlur={onSearchBlur}
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        tabIndex={isShrunk ? 0 : -1}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-blue-100" />
                    </div>
                </div>
            </div>
            
            {/* Right Side */}
            <div className="flex items-center gap-2">
                <button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Toggle theme">
                    {isDarkMode ? <SunIcon className="h-6 w-6 text-yellow-300" /> : <MoonIcon className="h-6 w-6" />}
                </button>
                 <button onClick={() => navigate('/notifications')} className={`p-2 relative rounded-full hover:bg-white/20 transition-colors ${unreadCount > 0 ? 'animate-blinking-red' : ''}`} aria-label="Notifications">
                    <BellIconOutline className="h-6 w-6" />
                     {unreadCount > 0 && (
                        <span className="absolute -top-0 -right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-blue-600">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>
        </div>
      
      {/* Original Search Box - always in DOM, animated with max-height */}
      <div className={`relative transition-all duration-300 ease-out overflow-hidden ${isShrunk ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100 mt-4'}`}>
        <input
          type="text"
          placeholder="Search for services, notes, quizzes..."
          className="w-full bg-white/20 placeholder-blue-200 text-white rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-white/50"
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          tabIndex={isShrunk ? -1 : 0}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-blue-100" />
        </div>
      </div>
    </div>
  );
};

const SideMenu: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    services: ServiceDocument[];
    unreadCount: number;
    appLogoUrl: string;
}> = ({ isOpen, onClose, services, unreadCount, appLogoUrl }) => {
    const [isRendered, setIsRendered] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    
    const { user, isLoggedIn, logout, isAdmin } = useAuth();
    const { subscriptionLocks } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const { currentTime, currentNepaliTime, currentNepaliDate, currentEnglishDate, showAdDate, setShowAdDate } = useNepaliDateTime();


    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
        } else {
            setIsTransitioning(false); // Start the closing animation
        }
    }, [isOpen]);

    useEffect(() => {
        if (isRendered && isOpen) {
            const timerId = setTimeout(() => {
                setIsTransitioning(true);
            }, 10);
            return () => clearTimeout(timerId);
        }
    }, [isRendered, isOpen]);

    const handleTransitionEnd = (event: React.TransitionEvent) => {
        if (event.target === event.currentTarget && !isOpen) {
            setIsRendered(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        onClose(); // Close side menu
        navigate('/'); // Navigate to home
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isRendered) return null;

    const firstGroupServices = services.slice(0, 7);
    const secondGroupServices = services.slice(7);

    const avatarUrl = user?.photoUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.fullName || 'User'}&backgroundColor=00897b,00acc1,039be5,1e88e5,3949ab,43a047,5e35b1,6d4c41,7cb342,8e24aa,c0ca33,d81b60,e53935,f4511e,fb8c00,fdd835`;

    const MenuItem: React.FC<{service: ServiceDocument}> = ({ service }) => {
        const Icon = ICONS_MAP[service.iconKey];
        const isActive = location.pathname === service.path;

        const handleClick = () => {
            onClose(); // Close sidebar first
            const isSubscribed = user?.subscriptionStatus === 'active';
            const isLocked = subscriptionLocks[service.key] === true;

            if (isLocked && !isSubscribed && !isAdmin) {
                // Use a timeout to ensure the sidebar has started closing before the modal opens
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('open-subscription-modal'));
                }, 300);
            } else {
                navigate(service.path);
            }
        };

        return (
             <li className="px-2">
                <button
                    onClick={handleClick}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${isActive ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold' : ''}`}
                >
                    {Icon ? <Icon className="h-6 w-6" /> : <div className="h-6 w-6" />}
                    <span className="ml-4 flex-1 text-left">{service.name}</span>
                    {service.badgeText && (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${service.badgeColor}`}>
                            {service.badgeText}
                        </span>
                    )}
                </button>
            </li>
        );
    };

    return (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
            {/* Overlay */}
            <div 
                className={`absolute inset-0 bg-black transition-opacity duration-[600ms] ${isTransitioning ? 'bg-opacity-50' : 'bg-opacity-0'}`} 
                onClick={onClose}
                aria-hidden="true"
            ></div>
            
            {/* Menu Content */}
            <div 
                className={`relative w-80 max-w-[90vw] h-full bg-white dark:bg-gray-800 shadow-xl flex flex-col transform transition-transform duration-[600ms] ease-out ${isTransitioning ? 'translate-x-0' : '-translate-x-full'}`}
                onTransitionEnd={handleTransitionEnd}
            >
                 <div className="p-4 flex flex-col items-center bg-gradient-to-br from-purple-600 to-blue-700 flex-shrink-0 text-center">
                    <div className="flex items-center gap-3 mb-4">
                         {appLogoUrl ? <img src={appLogoUrl} alt="App Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50" /> : <div className="w-12 h-12 rounded-full bg-gray-200"></div>}
                        <span className="font-bold text-xl text-white">Loksewa Guru</span>
                    </div>
                    <div className="font-mono text-sm font-bold text-purple-200">
                        Time NPT:- {showAdDate ? currentTime : currentNepaliTime}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                        <span className="text-gray-100">
                            {showAdDate ? currentEnglishDate : currentNepaliDate}
                        </span>
                        <button onClick={() => setShowAdDate(!showAdDate)} className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-full">
                            {showAdDate ? 'BS' : 'AD'}
                        </button>
                    </div>
                </div>


                <div className="flex-1 overflow-y-auto py-2">
                    <nav><ul>{firstGroupServices.map(service => <MenuItem key={service.id} service={service} />)}</ul></nav>
                    
                    <hr className="my-2 mx-4 border-gray-200 dark:border-gray-700" />
                    
                    <nav><ul>{secondGroupServices.map(service => <MenuItem key={service.id} service={service} />)}</ul></nav>
                </div>

                <div className="p-2 border-t dark:border-gray-700 flex-shrink-0">
                    <div className="relative" ref={profileMenuRef}>
                         {isProfileMenuOpen && isLoggedIn && (
                            <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-gray-700 rounded-lg shadow-2xl border dark:border-gray-600 animate-fade-in-scale origin-bottom z-10">
                                <div className="p-3 border-b dark:border-gray-600">
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{user?.fullName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                                </div>
                                <div className="p-1">
                                    <button onClick={onClose} className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-700 dark:text-gray-200">
                                        <ChevronUpIcon className="h-4 w-4"/> Toggle sidebar
                                    </button>
                                    <Link to="/profile" onClick={() => { setIsProfileMenuOpen(false); onClose(); }} className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-700 dark:text-gray-200">
                                        <Cog6ToothIcon className="h-4 w-4"/> Account settings
                                    </Link>
                                     <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-red-500">
                                        <ArrowRightOnRectangleIcon className="h-4 w-4"/> Log out
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => isLoggedIn ? setIsProfileMenuOpen(p => !p) : navigate('/login')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <div className="flex items-center gap-3">
                                {isLoggedIn ? (
                                    <img src={avatarUrl} alt="User Avatar" className="w-9 h-9 rounded-full object-cover bg-gray-300" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center"><UserIconSolid className="h-5 w-5 text-gray-600" /></div>
                                )}
                                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{isLoggedIn ? (user?.fullName || 'Profile') : 'Login / Signup'}</span>
                            </div>
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); navigate('/notifications'); onClose(); }} className="p-1.5" aria-label="Notifications">
                                    <BellIconOutline className="h-6 w-6 text-gray-500 dark:text-gray-400"/>
                                </button>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
                                      {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ServiceButton: React.FC<{ service: ServiceDocument; index: number }> = ({ service, index }) => {
    const Icon = ICONS_MAP[service.iconKey];
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { subscriptionLocks } = useData();

    const handleClick = () => {
        const isSubscribed = user?.subscriptionStatus === 'active';
        const isLocked = subscriptionLocks[service.key] === true;

        if (isLocked && !isSubscribed && !isAdmin) {
            window.dispatchEvent(new CustomEvent('open-subscription-modal'));
        } else {
            navigate(service.path);
        }
    };

    return (
        <button onClick={handleClick} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300" style={{ transitionDelay: `${index * 50}ms` }}>
            {Icon ? <Icon className={`h-10 w-10 ${service.color}`} /> : <div className="h-10 w-10" />}
            <span className="mt-2 text-sm font-medium text-center">{service.name}</span>
        </button>
    );
};

const ServicesSection: React.FC<{ services: ServiceDocument[] }> = ({ services }) => {
    const [ref, animationClasses] = useAnimateOnScroll('services');
    return (
        <div ref={ref} className={`p-4 ${animationClasses}`}>
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">OUR SERVICES</h2>
            <div className="grid grid-cols-3 gap-4">
                {services.map((service, index) => <ServiceButton key={service.id} service={service} index={index} />)}
            </div>
        </div>
    );
};

const PinnedNoticeCard: React.FC<{title: string, notice: Notice | null, ctaText: string, path: string}> = ({ title, notice, ctaText, path }) => {
    if (!notice) {
        return (
             <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md w-full text-center text-gray-400">
                No {title.toLowerCase()} pinned.
            </div>
        );
    }

    const isImageUrl = notice.imageUrl || (notice.fileUrl && notice.fileUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/));
    
    let documentPreviewUrl = '';
    if (notice.fileUrl && !isImageUrl) {
        const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
        const match = notice.fileUrl.match(driveRegex);
        if (match && match[1]) {
            const fileId = match[1];
            documentPreviewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        } else {
            documentPreviewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(notice.fileUrl)}&embedded=true`;
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md w-full">
            <div className="flex justify-between items-start">
                <h3 className="font-bold mb-3 text-gray-700 dark:text-gray-300">{title}</h3>
            </div>

            <div className="flex gap-4">
                {/* PREVIEW SECTION: Shows image or embedded document */}
                <div className={`w-2/5 flex-shrink-0 h-40 rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden ${isImageUrl || !documentPreviewUrl ? 'flex items-center justify-center' : ''}`}>
                    {isImageUrl ? (
                        <ProgressiveImage
                            src={notice.imageUrl || notice.fileUrl}
                            alt="Notice Preview"
                            className="w-full h-full object-contain"
                        />
                    ) : documentPreviewUrl ? (
                        <iframe
                            src={documentPreviewUrl}
                            className="w-full border-0"
                            style={{ height: 'calc(100% + 56px)', marginTop: '-56px' }}
                            title="File Preview"
                            sandbox="allow-scripts allow-same-origin"
                        ></iframe>
                    ) : (
                        <ProgressiveImage
                            src={'https://images.unsplash.com/photo-1583522288333-3a52331558b3?w=150&h=200&fit=crop'}
                            alt="Default Notice Preview"
                            className="w-full h-full object-contain"
                        />
                    )}
                </div>

                {/* INFO SECTION */}
                <div className="w-3/5 flex flex-col justify-between min-w-0">
                    <div>
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Date</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">{notice.date}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Title</h4>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-3">
                                {notice.title}
                            </p>
                        </div>
                    </div>
                    <Link to={path} className="text-right mt-2 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline">{ctaText}</Link>
                </div>
            </div>
        </div>
    );
};


const NoticesSection: React.FC<{ pinnedOurNotice: Notice | null, pinnedPscNotice: Notice | null }> = ({ pinnedOurNotice, pinnedPscNotice }) => {
    const [ref, animationClasses] = useAnimateOnScroll('notices');
    return (
        <div ref={ref} className={`p-4 bg-gray-100 dark:bg-gray-900/50 ${animationClasses}`}>
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">Pinned Notices</h2>
            <div className="flex flex-col md:flex-row gap-4">
                <PinnedNoticeCard title="Our Notice" notice={pinnedOurNotice} ctaText="View More Notice" path="/notices" />
                <PinnedNoticeCard title="PSC/Vacancy Notice" notice={pinnedPscNotice} ctaText="View More Notice" path="/notices" />
            </div>
        </div>
    );
};

const UpcomingFeaturesSection: React.FC<{ features: UpcomingFeatureData[] }> = ({ features }) => {
    const [ref, animationClasses] = useAnimateOnScroll('upcoming_features');
    const enabledFeatures = features.filter(f => f.enabled);

    if (enabledFeatures.length === 0) return null;
    
    return (
        <div ref={ref} className={`p-4 ${animationClasses}`}>
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">Our Upcoming Features</h2>
            <FeatureSlider features={enabledFeatures} />
        </div>
    );
};

const AdditionalFeaturesSection: React.FC<{ features: AdditionalFeatureData[] }> = ({ features }) => {
    const [ref, animationClasses] = useAnimateOnScroll('additional_features');
    const enabledFeatures = features.filter(f => f.enabled);

    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { subscriptionLocks } = useData();
    const staticFeatureKeys = useMemo(() => new Set(ADDITIONAL_FEATURES.map(f => f.key)), []);

    if (enabledFeatures.length === 0) return null;

    const handleClick = (feature: AdditionalFeatureData) => {
        const isSubscribed = user?.subscriptionStatus === 'active';
        const isLocked = subscriptionLocks[feature.key] === true;

        if (isLocked && !isSubscribed && !isAdmin) {
            window.dispatchEvent(new CustomEvent('open-subscription-modal'));
        } else {
            const isStaticFeature = staticFeatureKeys.has(feature.key);
            const path = isStaticFeature ? feature.path : `/feature/${feature.key}`;
            navigate(path);
        }
    };

    return (
        <div ref={ref} className={`p-4 bg-gray-100 dark:bg-gray-900/50 ${animationClasses}`}>
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">Our Additional Features</h2>
            <div className="grid grid-cols-3 gap-4">
                {enabledFeatures.map((feature, index) => {
                    const Icon = ICONS_MAP[feature.iconKey];
                    
                    return (
                        <button onClick={() => handleClick(feature)} key={feature.key} className="flex flex-col items-center justify-start p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-center transition-all duration-300 hover:shadow-md" style={{ transitionDelay: `${index * 75}ms` }}>
                            {Icon ? <Icon className="h-8 w-8 text-blue-500" /> : null}
                            <span className="mt-1 text-xs font-medium leading-tight">{feature.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const PublishNotesSection: React.FC = () => {
    const { isLoggedIn, user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [scrollRef, animationClasses] = useAnimateOnScroll('publish_notes');
    const formRef = useRef<HTMLFormElement>(null);
    const timeoutRef = useRef<number | null>(null);

    const CLOUDINARY_CLOUD_NAME = 'dtuc0i86e';
    const CLOUDINARY_UPLOAD_PRESET = 'filereceive';
    const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isLoggedIn || !user) {
            alert("You must be logged in to upload a file.");
            return;
        }

        setErrorMessage('');
        
        const formEl = formRef.current!;
        const file = (formEl.elements.namedItem('file') as HTMLInputElement).files?.[0];

        if (!file || file.size === 0) {
            setErrorMessage("Please select a file to upload.");
            setUploadState('error');
            return;
        }

        setUploadState('uploading');
        
        timeoutRef.current = window.setTimeout(() => {
            if (uploadState === 'uploading') {
                setErrorMessage("The upload timed out. Please check your internet connection and try again.");
                setUploadState('error');
            }
        }, 60000); // 60-second timeout

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Cloudinary upload failed.');
            }

            const data = await response.json();
            const downloadUrl = data.secure_url;
            const deleteToken = data.delete_token;

            const submissionPayload: Omit<SubmittedFile, 'id' | 'submittedAt'> & { deleteToken?: string } = {
                fileName: (formEl.elements.namedItem('fileName') as HTMLInputElement).value,
                ownerName: user.fullName || user.email || 'Anonymous',
                userId: user.uid,
                userEmail: user.email,
                category: (formEl.elements.namedItem('category') as HTMLSelectElement).value as SubmittedFile['category'],
                message: (formEl.elements.namedItem('message') as HTMLTextAreaElement).value,
                downloadUrl: downloadUrl,
                originalFileName: file.name,
            };

            if (deleteToken) {
                submissionPayload.deleteToken = deleteToken;
            }

            const docRef = await addDoc(collection(db, 'submittedFiles'), {
                ...submissionPayload,
                submittedAt: serverTimestamp(),
            });

            const adminNotification: Omit<AdminNotification, 'id'> = {
                type: 'fileReceive',
                title: 'New File Submitted',
                message: `${submissionPayload.ownerName} submitted "${submissionPayload.fileName}" in the ${submissionPayload.category} category.`,
                read: false,
                createdAt: serverTimestamp() as any,
                link: '/admin/file-receive',
                relatedId: docRef.id
            };
            await addDoc(collection(db, 'adminNotifications'), adminNotification);

            try {
                sendEmail({
                    to: 'mrchettry04@gmail.com',
                    subject: `New File Submission: ${submissionPayload.fileName}`,
                    html: `<h2>New File Submission</h2><p>${submissionPayload.ownerName} (${submissionPayload.userEmail}) submitted a file.</p><p><a href="${downloadUrl}">Download File</a></p>`,
                }).catch(emailError => {
                    console.warn("Automatic email notification failed to send:", emailError);
                });
            } catch (emailError) {
                console.warn("Could not send notification email:", emailError);
            }

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setUploadState('success');

        } catch (error: any) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            console.error("Upload or save failed:", error);
            setErrorMessage(`An error occurred during upload: ${error.message || 'Please try again.'}`);
            setUploadState('error');
        }
    };
    
    const handleCloseModal = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsModalOpen(false);
        setTimeout(() => {
            setUploadState('idle');
            setErrorMessage('');
            timeoutRef.current = null;
            formRef.current?.reset();
        }, 300);
    };
    
    const handleTryAgain = () => {
        setUploadState('idle');
        setErrorMessage('');
    };

    return (
        <>
            <div ref={scrollRef} className={`p-4 ${animationClasses}`}>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center">
                    <h2 className="text-xl font-bold mb-2 text-gray-700 dark:text-gray-300">Publish Your Notes</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Share Loksewa related files (notes, MCQ, etc.). We will review and publish them with credit to your name.
                    </p>
                    {isLoggedIn ? (
                        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition-colors shadow-lg">Upload Notes</button>
                    ) : (
                        <Link to="/login" className="inline-block px-6 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition-colors shadow-lg">Login to Upload Notes</Link>
                    )}
                </div>
            </div>
            {isLoggedIn && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={ uploadState === 'success' ? "Upload Successful" : uploadState === 'error' ? "Upload Failed" : "Upload Your Notes" }>
                    {(() => {
                        switch (uploadState) {
                            case 'success':
                                return (
                                    <div className="text-center p-4 animate-fade-in-scale">
                                        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
                                        <h3 className="text-lg font-medium text-green-700 dark:text-green-300 mt-4">Thank you!</h3>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Your notes have been submitted for review.</p>
                                        <button onClick={handleCloseModal} className="mt-6 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">Close</button>
                                    </div>
                                );
                            case 'error':
                                return (
                                    <div className="text-center p-4 animate-fade-in-scale">
                                        <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
                                        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mt-4">An Error Occurred</h3>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{errorMessage}</p>
                                        <button onClick={handleTryAgain} className="mt-6 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">Try Again</button>
                                    </div>
                                );
                            default:
                                return (
                                    <form ref={formRef} onSubmit={handleUpload} className="space-y-4">
                                        <input type="text" name="fileName" required placeholder="File Name" className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                                        <input type="text" name="ownerName" value={user?.fullName || user?.email || ''} readOnly className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                                        <select name="category" required className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"><option>Notes</option><option>MCQ</option><option>Other</option></select>
                                        <textarea name="message" rows={3} placeholder="Message (optional)" className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                                        <input type="file" name="file" required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                                        <button type="submit" disabled={uploadState === 'uploading'} className="w-full px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400">{uploadState === 'uploading' ? 'Uploading...' : 'Submit'}</button>
                                    </form>
                                );
                        }
                    })()}
                </Modal>
            )}
        </>
    );
};

const TeamMemberCard: React.FC<{ member: TeamMember }> = ({ member }) => (
    <div className="bg-[#0f172a] border border-blue-900/50 p-6 rounded-3xl text-center w-full shadow-lg flex flex-col items-center">
        <ProgressiveImage 
            src={member.photoUrl} 
            alt={member.name} 
            className="w-28 h-28 rounded-full mx-auto mb-4 border-4 border-slate-700 object-cover" 
        />
        <h3 className="font-bold text-2xl text-white mb-1">{member.name}</h3>
        <p className="text-lg font-medium text-blue-400 mb-3">{member.position}</p>
        <p className="text-sm text-gray-300 mb-6 px-4 flex-grow min-h-[4rem]">{member.description}</p>

        <div className="flex justify-center space-x-4 mb-8">
            {member.social.facebook && member.social.facebook !== '#' && (
                <a href={member.social.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800/50 ring-1 ring-slate-700 hover:bg-slate-700/50 transition-all duration-300 transform hover:scale-110">
                    <FacebookIcon className="h-6 w-6 text-blue-500" />
                </a>
            )}
            {member.social.instagram && member.social.instagram !== '#' && (
                <a href={member.social.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800/50 ring-1 ring-pink-500 hover:bg-slate-700/50 transition-all duration-300 transform hover:scale-110">
                    <InstagramIcon className="h-6 w-6 text-pink-500" />
                </a>
            )}
            {member.social.twitter && member.social.twitter !== '#' && (
                <a href={member.social.twitter} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800/50 ring-1 ring-slate-700 hover:bg-slate-700/50 transition-all duration-300 transform hover:scale-110">
                    <TwitterIcon className="h-6 w-6 text-sky-500" />
                </a>
            )}
        </div>
        
        {member.portfolioUrl && member.portfolioUrl !== '#' && (
            <a href={member.portfolioUrl} target="_blank" rel="noopener noreferrer" className="w-full mt-auto px-6 py-3 bg-slate-800 border border-slate-700 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors shadow-md">
                View My Portfolio
            </a>
        )}
    </div>
);

const TeamSection: React.FC<{ members: TeamMember[] }> = ({ members }) => {
    const [ref, animationClasses] = useAnimateOnScroll('team');
    return (
        <div ref={ref} className={`py-12 px-4 bg-[#0a1430] text-white ${animationClasses}`}>
            <h2 className="text-3xl font-bold mb-8 text-center">Our Team</h2>
            <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
                {members.map(member => <TeamMemberCard key={member.id} member={member} />)}
            </div>
        </div>
    );
};


const SubscriptionSection: React.FC = () => {
    const [ref, animationClasses] = useAnimateOnScroll('subscription');

    return (
        <div ref={ref} className={`p-4 ${animationClasses}`}>
             <div className="bg-gradient-to-r from-teal-400 to-blue-500 p-6 rounded-2xl shadow-lg text-white text-center">
                <h2 className="text-2xl font-bold mb-2">Unlock Our Premium Features</h2>
                <p className="text-sm mb-4">Get access to all premium features including ad-free experience, full AI services, and exclusive content.</p>
                <Link to="/subscription" className="inline-block px-8 py-3 bg-white text-blue-500 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-md">Subscribe</Link>
            </div>
        </div>
    )
};

const OtherSiteCard: React.FC<{ site: OtherSiteData }> = ({ site }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
        <div className="flex items-center gap-6">
            <ProgressiveImage 
                src={site.imageUrl || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=300&auto=format=fit=crop'} 
                alt={site.heading} 
                className="w-24 h-24 rounded-full object-cover flex-shrink-0 border-4 border-white dark:border-gray-700 shadow-lg"
            />
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{site.heading}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{site.description}</p>
                {site.link && site.link !== '#' && (
                    <a href={site.link} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-700 transition-colors shadow">
                        Visit Site
                    </a>
                )}
            </div>
        </div>
    </div>
);

const OtherSiteSection: React.FC<{ data: OtherSiteData[] }> = ({ data }) => {
    const [ref, animationClasses] = useAnimateOnScroll('other_site');

    return (
        <div ref={ref} className={`p-4 ${animationClasses}`}>
            <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">Our Other Sites</h2>
            {data.length > 0 ? (
                <div className="space-y-4">
                    {data.map(site => <OtherSiteCard key={site.id} site={site} />)}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md text-center text-gray-500">
                    No other sites available at the moment.
                </div>
            )}
        </div>
    );
};


const HomePage: React.FC = () => {
  const { user, isLoggedIn, isAdmin } = useAuth();
  const {
    services,
    sliderImages,
    appContent,
    teamMembers,
    pinnedOurNotice,
    pinnedPscNotice,
    otherSiteData,
    appLogoUrl,
    refreshData,
    allNotes,
    allSyllabuses,
    allQuizzes,
    allOfflineTests,
  } = useData();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(() => sessionStorage.getItem('animation_shown_header') === 'true');
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);
  const seenToastIds = useRef(new Set<string>());

  const allSearchableItems = useMemo((): SearchResult[] => {
        const mappedServices = services.map(item => ({ id: item.id, title: item.name, type: 'Service', path: item.path, iconKey: item.iconKey }));
        const mappedNotes = allNotes.map(item => ({ id: item.id, title: item.title, type: 'Note', path: '/notes', iconKey: 'NotesIcon' }));
        const mappedSyllabuses = allSyllabuses.map(item => ({ id: item.id, title: item.title, type: 'Syllabus', path: '/syllabus', iconKey: 'BookIcon' }));
        const mappedQuizzes = allQuizzes.map(item => ({ id: item.id, title: item.title, type: `Quiz (${item.subCategoryName})`, path: `/mcq-test?mainCategory=${item.mainCategoryKey}&category=${item.subCategoryKey}`, iconKey: 'QuizIcon' }));
        const mappedOfflineTests = allOfflineTests.map(item => ({ id: item.id, title: item.title, type: 'Offline Test', path: '/offline-test', iconKey: 'OfflineIcon' }));

        return [...mappedServices, ...mappedNotes, ...mappedSyllabuses, ...mappedQuizzes, ...mappedOfflineTests];
    }, [services, allNotes, allSyllabuses, allQuizzes, allOfflineTests]);

    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            setIsSearchOpen(true);
            const lowerCaseQuery = searchQuery.toLowerCase();
            const filtered = allSearchableItems.filter(item =>
                item.title.toLowerCase().includes(lowerCaseQuery) ||
                item.type.toLowerCase().includes(lowerCaseQuery)
            );
            setSearchResults(filtered.slice(0, 15));
        } else {
            setIsSearchOpen(false);
            setSearchResults([]);
        }
    }, [searchQuery, allSearchableItems]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop } = e.currentTarget;
      setIsHeaderShrunk(scrollTop > 50);
  };

  useEffect(() => {
    if (isHeaderVisible) return;
    const timer = setTimeout(() => {
        setIsHeaderVisible(true);
        sessionStorage.setItem('animation_shown_header', 'true');
    }, 100);
    return () => clearTimeout(timer);
  }, [isHeaderVisible]);

  useEffect(() => {
    if (!isLoggedIn || !user?.uid) {
        setUnreadCount(0);
        return;
    }

    const collectionName = isAdmin ? 'adminNotifications' : 'notifications';
    let q;

    if (isAdmin) {
        q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    } else {
        // This query requires a composite index. To avoid this, we query only by userId
        // and then sort the results on the client.
        q = query(collection(db, collectionName), where('userId', '==', user.uid));
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const unread = querySnapshot.docs.filter(d => !d.data().read).length;
        setUnreadCount(unread);
        
        if (!isAdmin) {
            let isFirstLoad = seenToastIds.current.size === 0;
            const fetchedNotifications: Notification[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, createdAt: (data.createdAt as Timestamp).toDate() } as Notification;
            });
            
            // Sort client-side
            fetchedNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            fetchedNotifications.forEach((data) => {
                if (!seenToastIds.current.has(data.id)) {
                    const isRecent = (new Date().getTime() - data.createdAt.getTime()) < 10000;
                    if (!isFirstLoad && isRecent) {
                        setToastNotification(data);
                    }
                    seenToastIds.current.add(data.id);
                }
            });
        }
    }, (error) => console.error("Error fetching notifications:", error));
    
    return () => unsubscribe();
}, [user, isAdmin, isLoggedIn]);


  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isNowDark = document.documentElement.classList.contains('dark');
    localStorage.theme = isNowDark ? 'dark' : 'light';
    setIsDarkMode(isNowDark);
  };

  const upcomingFeatures = useMemo(() => {
    if (!appContent) return UPCOMING_FEATURES.map(f => ({ ...f, enabled: true }));
    const masterMap = new Map<string, UpcomingFeatureData>();
    UPCOMING_FEATURES.forEach(f => masterMap.set(f.key, { ...f, enabled: true }));
    if(appContent.upcomingFeatures) {
        appContent.upcomingFeatures.forEach(f => masterMap.set(f.key, f));
    }
    return Array.from(masterMap.values());
  }, [appContent]);

  const additionalFeatures = useMemo(() => {
    if (!appContent) return ADDITIONAL_FEATURES.map(f => ({ ...f, enabled: true }));
    const masterMap = new Map<string, AdditionalFeatureData>();
    ADDITIONAL_FEATURES.forEach(f => masterMap.set(f.key, { ...f, enabled: true }));
    if(appContent.additionalFeatures) {
        appContent.additionalFeatures.forEach(f => masterMap.set(f.key, f));
    }
    return Array.from(masterMap.values());
  }, [appContent]);

    const handleSearchClose = useCallback(() => {
        setSearchQuery('');
        setIsSearchOpen(false);
    }, []);

    const handleSearchBlur = useCallback(() => {
        // Use a timeout to allow clicks on search results to register before closing.
        setTimeout(() => {
            // Check a DOM element to see if the search input is still focused.
            // This is more reliable than checking a state variable that might be stale in a timeout.
            if (document.activeElement !== document.querySelector('input[placeholder="Search..."]') && document.activeElement !== document.querySelector('input[placeholder="Search for services, notes, quizzes..."]')) {
                 if (searchQuery.trim().length === 0) {
                    setIsSearchOpen(false);
                }
            }
        }, 200);
    }, [searchQuery]);

  return (
    <>
      <PullToRefresh 
          onRefresh={refreshData} 
          onScroll={handleScroll}
          className="max-w-md mx-auto bg-white dark:bg-gray-900 h-screen overflow-y-auto overflow-x-hidden pb-24"
      >
        {toastNotification && (
            <ToastNotification 
              notification={toastNotification}
              onClose={() => setToastNotification(null)}
            />
        )}
        <Header 
          isVisible={isHeaderVisible}
          onMenuClick={() => setIsMenuOpen(prev => !prev)}
          isMenuOpen={isMenuOpen}
          onThemeToggle={toggleTheme}
          user={user}
          isLoggedIn={isLoggedIn}
          unreadCount={unreadCount}
          isDarkMode={isDarkMode}
          isShrunk={isHeaderShrunk}
          onSearchFocus={() => setIsSearchOpen(true)}
          onSearchBlur={handleSearchBlur}
          query={searchQuery}
          onQueryChange={setSearchQuery}
        />
        <SideMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)} 
          services={services}
          unreadCount={unreadCount}
          appLogoUrl={appLogoUrl}
        />
        
        <div className="transition-all duration-300">
          <ImageSlider images={sliderImages} />

          <main>
            <ServicesSection services={services} />
            <NoticesSection pinnedOurNotice={pinnedOurNotice} pinnedPscNotice={pinnedPscNotice} />
            <UpcomingFeaturesSection features={upcomingFeatures} />
            <AdditionalFeaturesSection features={additionalFeatures} />
            <PublishNotesSection />
            <SubscriptionSection />
            <TeamSection members={teamMembers} />
            <OtherSiteSection data={otherSiteData} />
          </main>

          <Footer socialLinks={appContent?.socialLinks} />
        </div>
        
      </PullToRefresh>
      
      {isSearchOpen && (
          <div
              className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm animate-fade-in"
              onClick={handleSearchClose}
              aria-hidden="true"
          />
      )}
      <SearchOverlay 
        isOpen={isSearchOpen} 
        onClose={handleSearchClose} 
        query={searchQuery} 
        results={searchResults} 
        isHeaderShrunk={isHeaderShrunk}
      />
    </>
  );
};

export default HomePage;
