
import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext'; // Import DataProvider and hook
import { ToastProvider, useToast } from './contexts/ToastContext';
import { requestNotificationPermissionAndSaveToken, setupForegroundMessageHandler } from './services/fcmService'; // Import FCM services

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import HomePage from './pages/HomePage';
import SyllabusPage from './pages/SyllabusPage';
import QuizPage from './pages/QuizPage';
import NotesPage from './pages/NotesPage';
import IQPage from './pages/IQPage';
import GKPage from './pages/GKPage';
import MCQTestPage from './pages/MCQTestPage';
import NoticesPage from './pages/NoticesPage';
import AIInterviewPage from './pages/AIInterviewPage';
import OfflineTestPage from './pages/OfflineTestPage';
import ProfilePage from './pages/ProfilePage';
import AdminQuizManagementPage from './pages/admin/AdminQuizManagementPage';
import AdminQuizEditorPage from './pages/admin/AdminQuizEditorPage';
import AdminCategoryManagementPage from './pages/admin/AdminCategoryManagementPage'; // New Category Page
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminContentPage from './pages/admin/AdminContentPage'; // New Content Page
import AdminFeatureEditorPage from './pages/admin/AdminFeatureEditorPage'; // New Editor Page
import AdminLayout from './pages/admin/AdminLayout';
import BottomNavBar from './components/BottomNavBar';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SplashScreen from './pages/SplashScreen';
import WelcomePage from './pages/WelcomePage'; // Import the new WelcomePage
import AIChatPage from './pages/AIChatPage'; // Import the new AI Chat Page
import ConfirmationModal from './components/ConfirmationModal';

// Page for dynamically rendered features
import DynamicFeaturePage from './pages/DynamicFeaturePage';
import SubscriptionPage from './pages/SubscriptionPage';
import KeepNotesPage from './pages/KeepNotesPage';
import NoteEditorPage from './pages/NoteEditorPage'; // New Note Editor Page
import TodosPage from './pages/TodosPage'; // New Todos Page
import UnitConverterPage from './pages/UnitConverterPage';
import EngineeringCalculatorPage from './pages/EngineeringCalculatorPage';
import VideoSummarizePage from './pages/VideoSummarizePage';
import AdminSyllabusManagementPage from './pages/admin/services/AdminSyllabusManagementPage';
import AdminNotesManagementPage from './pages/admin/services/AdminNotesManagementPage';
import AdminNoticesManagementPage from './pages/admin/services/AdminNoticesManagementPage';
import AdminOfflineTestsManagementPage from './pages/admin/services/AdminOfflineTestsManagementPage';
import AdminIQManagementPage from './pages/admin/services/AdminIQManagementPage';
import AdminGKManagementPage from './pages/admin/services/AdminGKManagementPage';
import AdminAIInterviewManagementPage from './pages/admin/services/AdminAIInterviewManagementPage';
import AdminSliderManagementPage from './pages/admin/AdminSliderManagementPage';
import AdminImageManagementPage from './pages/admin/AdminImageManagementPage';
import AdminFileReceivePage from './pages/admin/AdminFileReceivePage';
import AdminServicesPage from './pages/admin/AdminServicesPage';
import PaymentSelectionPage from './pages/PaymentSelectionPage';
import PaymentProofPage from './pages/PaymentProofPage';
import AdminPaymentProofPage from './pages/admin/AdminPaymentProofPage';
import AdminPaymentProofDetailPage from './pages/admin/AdminPaymentProofDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminHomeNoticeControlPage from './pages/admin/AdminHomeNoticeControlPage';
import AdminOtherSitePage from './pages/admin/AdminOtherSitePage';
import AdminTeamPage from './pages/admin/AdminTeamPage';
import AdminHomeNoticePage from './pages/admin/AdminHomeNoticePage';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage'; // New Feedback Page
import AdminSplashScreenPage from './pages/admin/AdminSplashScreenPage'; // New Splash Screen Admin Page
import AdminWelcomePage from './pages/admin/AdminWelcomePage'; // New Welcome Page Admin Page
import AdminFeatureLayoutPage from './pages/admin/AdminFeatureLayoutPage'; // New Feature Layout Page
import AdminAppNotificationsPage from './pages/admin/AdminAppNotificationsPage'; // New Notification Publish Page
import AdminAIModalFloatingPage from './pages/admin/AdminAIModalFloatingPage'; // New AI Modal Page
import AdminPromoCodePage from './pages/admin/AdminPromoCodePage'; // New Promo Code Page
import AdminPromoCodeEditorPage from './pages/admin/AdminFeaturesPage'; // Repurposed for Promo Code Editor
import AdminSubscriptionControlPage from './pages/admin/AdminSubscriptionControlPage'; // New Subscription Control Page

// Newly Added Pages
import AccountSettingsPage from './pages/AccountSettingsPage';
import SecuritySettingsPage from './pages/SecuritySettingsPage';
import ContactUsPage from './pages/ContactUsPage';
import AboutUsPage from './pages/AboutUsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DisclaimerPage from './pages/DisclaimerPage';
import RateOurAppPage from './pages/RateOurAppPage';
import ShareOurAppPage from './pages/ShareOurAppPage';
import FeedbackPage from './pages/FeedbackPage';
import ImageViewerPage from './pages/ImageViewerPage'; // New Image Viewer Page

// Admin Site & Pages Management
import AdminProfileDetailsPage from './pages/admin/AdminProfileDetailsPage';
import AdminContactUsSettingsPage from './pages/admin/site-settings/AdminContactUsSettingsPage';
import AdminAboutUsSettingsPage from './pages/admin/site-settings/AdminAboutUsSettingsPage';
import AdminPrivacySettingsPage from './pages/admin/site-settings/AdminPrivacySettingsPage';
import AdminShareAppSettingsPage from './pages/admin/site-settings/AdminShareAppSettingsPage';
import AdminRateAppSettingsPage from './pages/admin/site-settings/AdminRateAppSettingsPage';
import HomeNoticeModal from './components/HomeNoticeModal'; // Import HomeNoticeModal
import FloatingAIButton from './components/FloatingAIButton';
import SubscriptionModal from './components/SubscriptionModal'; // New Subscription Modal
import LoginModal from './components/LoginModal'; // New Login Modal

// Admin AI Chat History Pages
import AdminUserChatsListPage from './pages/admin/AdminUserChatsListPage';
import AdminUserChatDetailPage from './pages/admin/AdminUserChatDetailPage';
import AdminPaymentGatewayPage from './pages/admin/AdminPaymentGatewayPage';

// "Questions Practice" Feature Pages
import PracticeCoursesPage from './pages/PracticeCoursesPage';
import PracticeSetsPage from './pages/PracticeSetsPage';
import PracticeModePage from './pages/PracticeModePage';
import AdminPracticeManagementPage from './pages/admin/AdminPracticeManagementPage';
import AdminPracticeCourseEditorPage from './pages/admin/AdminPracticeCourseEditorPage';
import AdminPracticeSetsPage from './pages/admin/AdminPracticeSetsPage';
import AdminPracticeSetEditorPage from './pages/admin/AdminPracticeSetEditorPage';


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isLoggedIn } = useAuth();
    const location = useLocation();

    if (!isLoggedIn) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
};

// New preloader for the initial data loading phase
const InitialPreloader: React.FC = () => {
  return (
    <div
      className="fixed inset-0 z-[99] flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <svg
        className="w-24 h-24 orbit-loader"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Loading content"
      >
        {[...Array(8)].map((_, i) => (
          <g key={i} transform={`rotate(${i * 45} 50 50)`}>
            <circle cx="20" cy="50" r="5" />
          </g>
        ))}
      </svg>
      <p className="mt-4 text-gray-600 dark:text-gray-300">Getting things ready...</p>
    </div>
  );
};

const IndexRouteElement = () => {
    const { isLoggedIn, guestAccessGranted } = useAuth();
    
    // If user is logged in or has explicitly chosen to be a guest, show the home page.
    // Otherwise, show the welcome page to prompt a decision (login, signup, or guest).
    return (isLoggedIn || guestAccessGranted) ? <HomePage /> : <WelcomePage />;
};

// New Layout component to wrap user-facing pages and apply transitions
const UserLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate(); // Added for programmatic navigation
    const { isLoggedIn, guestAccessGranted } = useAuth();
    const swipeableWrapperRef = useRef<HTMLDivElement>(null);

    // Refs for swipe gesture logic
    const touchStartX = useRef(0);
    const isSwipeInProgress = useRef(false);

    useEffect(() => {
        const wrapper = swipeableWrapperRef.current;
        // Disable swipe-back on the main homepage
        if (!wrapper || location.pathname === '/') return;

        const handleTouchStart = (e: TouchEvent) => {
            // Only start tracking if the touch is near the left edge of the screen
            if (e.targetTouches[0].clientX < 30) {
                touchStartX.current = e.targetTouches[0].clientX;
                isSwipeInProgress.current = true;
            } else {
                isSwipeInProgress.current = false;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!isSwipeInProgress.current) return;
            isSwipeInProgress.current = false;
            
            const touchEndX = e.changedTouches[0].clientX;
            const deltaX = touchEndX - touchStartX.current;

            // If the user swiped right by more than 100 pixels
            if (deltaX > 100) {
                wrapper.classList.add('animate-page-slide-out');

                const onAnimationEnd = () => {
                    wrapper.removeEventListener('animationend', onAnimationEnd);
                    // Navigate back only after the animation completes
                    navigate(-1);
                };
                
                wrapper.addEventListener('animationend', onAnimationEnd);
            }
        };
        
        // Attach event listeners for the swipe gesture
        wrapper.addEventListener('touchstart', handleTouchStart);
        wrapper.addEventListener('touchend', handleTouchEnd);
        
        // Cleanup function to remove listeners when the component/page changes
        return () => {
            wrapper.removeEventListener('touchstart', handleTouchStart);
            wrapper.removeEventListener('touchend', handleTouchEnd);
        };
    }, [location.pathname, navigate]); // Rerun this effect on every page navigation

    const onWelcomePage = location.pathname === '/' && !isLoggedIn && !guestAccessGranted;

    const showBottomNav = !location.pathname.startsWith('/admin') &&
                          !['/login', '/signup', '/forgot-password', '/notifications', '/welcome', '/ai-chat', '/image-viewer'].includes(location.pathname) &&
                          !location.pathname.startsWith('/keep-notes') &&
                          !location.pathname.startsWith('/keep-todos') &&
                          !onWelcomePage;

    return (
        <>
            <div ref={swipeableWrapperRef} key={location.pathname} className="animate-page-zoom-in">
                <Outlet />
            </div>
            {showBottomNav && (
                <div className="bottom-ui-container">
                    <BottomNavBar />
                    <FloatingAIButton />
                </div>
            )}
        </>
    );
};


const AppRoutes: React.FC = () => {
    const { isAdmin } = useAuth();

    return (
        <Routes>
            {/* Main App Routes nested under a parent '/' to make the index route more explicit */}
            <Route path="/" element={<UserLayout />}>
                <Route index element={<IndexRouteElement />} />
                <Route path="welcome" element={<WelcomePage />} />
                <Route path="syllabus" element={<SyllabusPage />} />
                <Route path="quiz" element={<QuizPage />} />
                <Route path="notes" element={<NotesPage />} />
                <Route path="iq-questions" element={<IQPage />} />
                <Route path="gk-questions" element={<GKPage />} />
                <Route path="mcq-test" element={<MCQTestPage />} />
                <Route path="notices" element={<NoticesPage />} />
                <Route path="ai-interview" element={<AIInterviewPage />} />
                <Route path="offline-test" element={<OfflineTestPage />} />
                <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="signup" element={<SignupPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="ai-chat" element={<AIChatPage />} />
                <Route path="image-viewer" element={<ImageViewerPage />} />

                {/* Static & Dynamic Feature Routes */}
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="payment-selection" element={<ProtectedRoute><PaymentSelectionPage /></ProtectedRoute>} />
                <Route path="keep-notes" element={<KeepNotesPage />} />
                <Route path="keep-notes/new" element={<NoteEditorPage />} />
                <Route path="keep-notes/edit/:noteId" element={<NoteEditorPage />} />
                <Route path="keep-todos" element={<TodosPage />} />
                <Route path="unit-converter" element={<UnitConverterPage />} />
                <Route path="eng-calculator" element={<EngineeringCalculatorPage />} />
                <Route path="video-summarize" element={<VideoSummarizePage />} />
                <Route path="feature/:featureKey" element={<DynamicFeaturePage />} />

                {/* New "Questions Practice" Routes */}
                <Route path="questions-practice" element={<PracticeCoursesPage />} />
                <Route path="questions-practice/:courseKey" element={<PracticeSetsPage />} />
                <Route path="questions-practice/:courseKey/:setId" element={<PracticeModePage />} />

                {/* New Profile-related Routes */}
                <Route path="account-settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
                <Route path="security-settings" element={<ProtectedRoute><SecuritySettingsPage /></ProtectedRoute>} />
                <Route path="contact-us" element={<ContactUsPage />} />
                <Route path="about-us" element={<AboutUsPage />} />
                <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="disclaimer" element={<DisclaimerPage />} />
                <Route path="rate-our-app" element={<RateOurAppPage />} />
                <Route path="share-our-app" element={<ShareOurAppPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={isAdmin ? <AdminLayout /> : <Navigate to="/login" />}>
                <Route index element={<Navigate to="dashboard" />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="quizzes" element={<AdminQuizManagementPage />} />
                <Route path="quizzes/categories" element={<AdminCategoryManagementPage />} />
                <Route path="quizzes/new" element={<AdminQuizEditorPage />} />
                <Route path="quizzes/edit/:quizId" element={<AdminQuizEditorPage />} />
                <Route path="questions-practice" element={<AdminPracticeManagementPage />} />
                <Route path="questions-practice/courses/new" element={<AdminPracticeCourseEditorPage />} />
                <Route path="questions-practice/courses/edit/:courseKey" element={<AdminPracticeCourseEditorPage />} />
                <Route path="questions-practice/:courseKey" element={<AdminPracticeSetsPage />} />
                <Route path="practice-sets/new" element={<AdminPracticeSetEditorPage />} />
                <Route path="practice-sets/edit/:setId" element={<AdminPracticeSetEditorPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="feedback" element={<AdminFeedbackPage />} />
                <Route path="content" element={<AdminContentPage />} />
                <Route path="feature-layout" element={<AdminFeatureLayoutPage />} />
                <Route path="services" element={<AdminServicesPage />} />
                <Route path="slider" element={<AdminSliderManagementPage />} />
                <Route path="home-notice-control" element={<AdminHomeNoticeControlPage />} />
                <Route path="home-notices" element={<AdminHomeNoticePage />} />
                <Route path="app-notifications" element={<AdminAppNotificationsPage />} />
                <Route path="other-site" element={<AdminOtherSitePage />} />
                <Route path="images" element={<AdminImageManagementPage />} />
                <Route path="file-receive" element={<AdminFileReceivePage />} />
                <Route path="payment-proofs" element={<AdminPaymentProofPage />} />
                <Route path="payment-proofs/:proofId" element={<AdminPaymentProofDetailPage />} />
                <Route path="payment-gateways" element={<AdminPaymentGatewayPage />} />
                <Route path="promo-codes" element={<AdminPromoCodePage />} />
                <Route path="promo-codes/new" element={<AdminPromoCodeEditorPage />} />
                <Route path="promo-codes/edit/:codeId" element={<AdminPromoCodeEditorPage />} />
                <Route path="team" element={<AdminTeamPage />} />
                <Route path="splash-screen" element={<AdminSplashScreenPage />} />
                <Route path="welcome-page" element={<AdminWelcomePage />} />
                <Route path="ai-modal-floating" element={<AdminAIModalFloatingPage />} />
                <Route path="subscription-control" element={<AdminSubscriptionControlPage />} />
                <Route path="user-chats" element={<AdminUserChatsListPage />} />
                <Route path="user-chats/:userId" element={<AdminUserChatDetailPage />} />
                <Route path="features/edit/:featureType/:featureKey" element={<AdminFeatureEditorPage />} />
                {/* New Site & Pages Management */}
                <Route path="profile-details" element={<AdminProfileDetailsPage />} />
                <Route path="profile-details/contact-us" element={<AdminContactUsSettingsPage />} />
                <Route path="profile-details/about-us" element={<AdminAboutUsSettingsPage />} />
                <Route path="profile-details/privacy-policy" element={<AdminPrivacySettingsPage />} />
                <Route path="profile-details/share-app" element={<AdminShareAppSettingsPage />} />
                <Route path="profile-details/rate-app" element={<AdminRateAppSettingsPage />} />
                {/* Standalone Service Management Routes */}
                <Route path="syllabus" element={<AdminSyllabusManagementPage />} />
                <Route path="notes" element={<AdminNotesManagementPage />} />
                <Route path="notices" element={<AdminNoticesManagementPage />} />
                <Route path="offline-tests" element={<AdminOfflineTestsManagementPage />} />
                <Route path="iq-quizzes" element={<AdminIQManagementPage />} />
                <Route path="gk-quizzes" element={<AdminGKManagementPage />} />
                <Route path="ai-interview" element={<AdminAIInterviewManagementPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Wildcard route remains at the end */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

const AppWrapper: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

    // This effect handles redirects from external sources like payment gateways
    // by watching for changes in the URL within the router's context.
    useEffect(() => {
        // useLocation() from react-router-dom correctly parses the URL after the '#'
        const searchParams = new URLSearchParams(location.search);

        const qStatus = searchParams.get('q');
        const esewaStatus = searchParams.get('esewa_status');

        // Handle the new hash-based eSewa callback: /#/subscription?q=su
        if (location.pathname === '/subscription' && (qStatus === 'su' || qStatus === 'fu')) {
            const data = searchParams.get('data');
            // Redirect internally to the payment page to show success/failure
            navigate(`/payment-selection?q=${qStatus}&data=${data || ''}`, { replace: true });
            return;
        }

        // Handle the old eSewa callback for backward compatibility: /#/?esewa_status=success
        if (esewaStatus) {
            const data = searchParams.get('data');
            const newQStatus = esewaStatus === 'success' ? 'su' : 'fu';
            // Redirect internally, cleaning the URL and using the new 'q' param format
            navigate(`/payment-selection?q=${newQStatus}&data=${data || ''}`, { replace: true });
            return;
        }
    }, [location, navigate]);


    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (location.pathname === '/' && !isExitConfirmOpen) {
                // The URL has already changed due to the back button. We push it back on
                // to keep the user on the page and then show our modal.
                window.history.pushState(null, '', window.location.href);
                setIsExitConfirmOpen(true);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [location.pathname, isExitConfirmOpen]);

    const handleConfirmExit = () => {
        setIsExitConfirmOpen(false);
        // Go back two steps in history: one for the state we pushed to show the modal,
        // and one for the user's original back button press.
        window.history.go(-2);
    };

    const handleCancelExit = () => {
        setIsExitConfirmOpen(false);
    };


    return (
        <>
            <ConfirmationModal
                isOpen={isExitConfirmOpen}
                onClose={handleCancelExit}
                onConfirm={handleConfirmExit}
                title="Exit Application?"
                message="Are you sure you want to exit Loksewa Guru?"
                confirmText="Exit"
                cancelText="Cancel"
            />
            <AppRoutes />
        </>
    );
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
            request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveVideoToDB = async (blob: Blob) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, VIDEO_KEY);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
};


const AppContent: React.FC = () => {
    const { user, isLoggedIn, guestAccessGranted, loading: authLoading, isAdmin } = useAuth();
    const { loading: dataLoading, homeNotices, welcomeData } = useData();
    const [isSplashDone, setIsSplashDone] = useState(false);
    const [isHomeNoticeModalOpen, setIsHomeNoticeModalOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    // Effect to control text selection based on admin status
    useEffect(() => {
        if (isAdmin) {
            document.body.classList.add('admin-session');
        } else {
            document.body.classList.remove('admin-session');
        }
        // Cleanup on component unmount
        return () => {
            document.body.classList.remove('admin-session');
        };
    }, [isAdmin]);

    // Effect to initialize Push Notifications
    useEffect(() => {
        // We run this once when the app loads.
        // It's safe to call multiple times; the browser and our service will handle duplicates.
        requestNotificationPermissionAndSaveToken(user?.uid || null);
        
        // Set up the listener for when the app is in the foreground
        const unsubscribe = setupForegroundMessageHandler(showToast);
        
        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, [user, showToast]); // Rerun if the user logs in/out to update the token with userId

    // Effect to handle global subscription modal trigger
    useEffect(() => {
        const openModal = () => setIsSubModalOpen(true);
        window.addEventListener('open-subscription-modal', openModal);
        return () => window.removeEventListener('open-subscription-modal', openModal);
    }, []);

    // Effect to handle global login modal trigger
    useEffect(() => {
        const openModal = () => setIsLoginModalOpen(true);
        window.addEventListener('open-login-modal', openModal);
        return () => window.removeEventListener('open-login-modal', openModal);
    }, []);

    const handleUpgrade = () => {
        setIsSubModalOpen(false);
        navigate('/subscription');
    };

    const handleLoginRedirect = () => {
        setIsLoginModalOpen(false);
        navigate('/login', { state: { from: location } });
    };
    
    // --- New Splash Screen Logic ---
    useEffect(() => {
        const checkAndDownloadSplash = async () => {
            if (navigator.onLine === false) {
                 console.log("Offline, skipping splash video check.");
                 return;
            }
            try {
                const splashDataCache = localStorage.getItem('loksewa-splash-screen-data');
                if (!splashDataCache) return;

                const remoteData = JSON.parse(splashDataCache);
                const remoteUrl = remoteData?.useCustom ? remoteData.videoUrl : null;
                
                if (!remoteUrl || remoteData.splashType !== 'video') {
                     console.log("No custom remote video URL configured.");
                     return;
                }
                
                const lastDownloadedUrl = localStorage.getItem('loksewa-splash-last-downloaded');
                
                if (remoteUrl !== lastDownloadedUrl) {
                    console.log('New splash video detected. Downloading in background...');
                    const response = await fetch(remoteUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch video: ${response.statusText}`);
                    }
                    const videoBlob = await response.blob();
                    await saveVideoToDB(videoBlob);
                    localStorage.setItem('loksewa-splash-last-downloaded', remoteUrl);
                    console.log('New splash video downloaded and cached for next launch.');
                } else {
                    console.log("Local splash video is up-to-date.");
                }
            } catch (error) {
                console.error("Error during splash video background download:", error);
            }
        };

        checkAndDownloadSplash();
    }, []);


    useEffect(() => {
        // Initialize theme. This runs only once.
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Preload WelcomePage slider images while splash screen/preloader is visible
    useEffect(() => {
        if (welcomeData && welcomeData.sliderImages && welcomeData.sliderImages.length > 0) {
            welcomeData.sliderImages.forEach(slide => {
                if (slide.imageUrl) {
                    const img = new Image();
                    img.src = slide.imageUrl;
                }
            });
        }
    }, [welcomeData]);

    // Show home notice modal only after all data is loaded and notices exist
    useEffect(() => {
        if (!dataLoading && homeNotices.length > 0 && (isLoggedIn || guestAccessGranted)) {
            const timer = setTimeout(() => setIsHomeNoticeModalOpen(true), 500);
            return () => clearTimeout(timer);
        }
    }, [dataLoading, homeNotices, isLoggedIn, guestAccessGranted]);

    // Show splash screen until it signals it's done AND auth is resolved
    if (!isSplashDone || authLoading) {
        return <SplashScreen onFinished={() => setIsSplashDone(true)} />;
    }
    
    // Show preloader if any data is loading. This ensures all context data is ready
    // before rendering any part of the main app, fixing the nav bar flicker on WelcomePage.
    if (dataLoading) {
        return <InitialPreloader />;
    }

    // Once everything is loaded, show the main app and the notice modal if applicable
    return (
        <>
            <HomeNoticeModal 
                isOpen={isHomeNoticeModalOpen}
                onClose={() => setIsHomeNoticeModalOpen(false)}
                notices={homeNotices}
            />
            <SubscriptionModal
                isOpen={isSubModalOpen}
                onClose={() => setIsSubModalOpen(false)}
                onUpgrade={handleUpgrade}
            />
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLogin={handleLoginRedirect}
            />
            <AppWrapper />
        </>
    );
}

const App: React.FC = () => {
    return (
        <AuthProvider>
            <DataProvider>
                <HashRouter>
                    <ToastProvider>
                        <AppContent />
                    </ToastProvider>
                </HashRouter>
            </DataProvider>
        </AuthProvider>
    );
};

export default App;