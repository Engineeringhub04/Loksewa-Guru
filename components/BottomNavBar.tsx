import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
    HomeIcon, 
    DocumentTextIcon,
    BookOpenIcon,
    CpuChipIcon,
    UserIcon,
} from '@heroicons/react/24/outline';

const navItems = [
    { path: '/', icon: HomeIcon, name: 'Home', key: 'home' },
    { path: '/mcq-test', icon: DocumentTextIcon, name: 'MCQ', key: 'mcq-test' },
    { path: '/syllabus', icon: BookOpenIcon, name: 'Syllabus', key: 'syllabus' },
    { path: '/ai-interview', icon: CpuChipIcon, name: 'AI Interview', key: 'ai-interview' },
    { path: '/profile', icon: UserIcon, name: 'Profile', key: 'profile' },
];

const BottomNavBar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isLoggedIn, isAdmin } = useAuth();
    const { subscriptionLocks } = useData();

    const handleNavigation = (key: string, path: string) => {
        // If the button is the Profile/Login button, just navigate to the correct destination.
        if (key === 'profile') {
            const destination = isLoggedIn ? '/profile' : '/login';
            navigate(destination, { state: { from: location } });
            return;
        }

        // For all other buttons
        const { login: loginRequired, subscription: subscriptionRequired } = subscriptionLocks[key] || {};

        if (loginRequired && !isLoggedIn) {
            window.dispatchEvent(new CustomEvent('open-login-modal'));
            return;
        }

        const isSubscribed = user?.subscriptionStatus === 'active';
        if (subscriptionRequired && !isSubscribed && !isAdmin) {
            window.dispatchEvent(new CustomEvent('open-subscription-modal'));
            return;
        }
        
        navigate(path);
    };


    return (
        <div className="fixed bottom-0 left-4 right-4 z-50">
            <div
                className="max-w-md mx-auto bg-black rounded-t-2xl shadow-lg flex justify-around items-center px-2 pt-2"
                style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
            >
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const displayName = item.name === 'Profile' ? (isLoggedIn ? 'Profile' : 'Login') : item.name;
                    
                    return (
                        <button
                            key={item.name}
                            onClick={() => handleNavigation(item.key, item.path)}
                            className="flex-1 flex justify-center items-center"
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <div className={`flex flex-col items-center justify-center text-center w-16 h-16 rounded-full transition-all duration-300 ease-in-out ${
                                isActive ? 'bg-white text-black' : 'text-white'
                            }`}>
                                <item.icon className="h-6 w-6" />
                                <span className="text-xs font-semibold leading-tight min-h-8 flex items-center justify-center">
                                    {displayName}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNavBar;