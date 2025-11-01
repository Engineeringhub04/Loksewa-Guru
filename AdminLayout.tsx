
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
    ChartBarIcon, 
    UsersIcon, 
    PuzzlePieceIcon, 
    Cog6ToothIcon, 
    ArrowLeftOnRectangleIcon, 
    Bars3Icon, 
    XMarkIcon, 
    ClipboardDocumentListIcon,
    PhotoIcon,
    DocumentArrowDownIcon,
    Squares2X2Icon,
    BanknotesIcon,
    HomeIcon,
    ChatBubbleLeftRightIcon,
    Cog8ToothIcon,
    SparklesIcon,
    ArrowsUpDownIcon,
    MegaphoneIcon,
    LockClosedIcon,
} from '@heroicons/react/24/solid';
import {
    BookOpenIcon,
    PencilSquareIcon,
    NewspaperIcon,
    CloudArrowDownIcon,
    CpuChipIcon,
    GlobeAltIcon,
    UserGroupIcon,
    TicketIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

const AdminLayout: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { to: 'dashboard', icon: ChartBarIcon, name: 'Dashboard' },
        { to: 'quizzes', icon: PuzzlePieceIcon, name: 'Quizzes' },
        { to: 'questions-practice', icon: ClipboardDocumentCheckIcon, name: 'Questions Practice' },
        { to: 'users', icon: UsersIcon, name: 'Users' },
        { to: 'feedback', icon: ChatBubbleLeftRightIcon, name: 'User Feedback' },
        { to: 'content', icon: ClipboardDocumentListIcon, name: 'Content & Features' },
        { to: 'feature-layout', icon: ArrowsUpDownIcon, name: 'Feature Layout' },
        { to: 'services', icon: Squares2X2Icon, name: 'Services' },
        { to: 'slider', icon: PhotoIcon, name: 'Slider Images' },
        { to: 'home-notice-control', icon: NewspaperIcon, name: 'Home Notice Control' },
        { to: 'home-notices', icon: HomeIcon, name: 'Important Home Notice' },
        { to: 'app-notifications', icon: MegaphoneIcon, name: 'Notification Publish' },
        { to: 'other-site', icon: GlobeAltIcon, name: 'Our Other Site' },
        { to: 'images', icon: PhotoIcon, name: 'Images Management' },
        { to: 'file-receive', icon: DocumentArrowDownIcon, name: 'File Receive' },
        { to: 'payment-proofs', icon: BanknotesIcon, name: 'Payment Proofs' },
        { to: 'payment-gateways', icon: BanknotesIcon, name: 'Coming Soon Set' },
        { to: 'promo-codes', icon: TicketIcon, name: 'Promo/Coupon Codes' },
        { to: 'team', icon: UserGroupIcon, name: 'Our Team' },
        { to: 'subscription-control', icon: LockClosedIcon, name: 'Subscription Control' },
        { to: 'profile-details', icon: Cog8ToothIcon, name: 'Site & Pages' },
        { to: 'splash-screen', icon: PhotoIcon, name: 'Splash Screen' },
        { to: 'welcome-page', icon: SparklesIcon, name: 'Welcome Page' },
        { to: 'ai-modal-floating', icon: SparklesIcon, name: 'AI Modal Floating' },
        { to: 'user-chats', icon: ChatBubbleLeftRightIcon, name: 'User AI Chats' },
        { to: 'syllabus', icon: BookOpenIcon, name: 'Syllabus' },
        { to: 'notes', icon: PencilSquareIcon, name: 'Notes' },
        { to: 'notices', icon: NewspaperIcon, name: 'Notices' },
        { to: 'offline-tests', icon: CloudArrowDownIcon, name: 'Offline Tests' },
        { to: 'iq-quizzes', icon: CpuChipIcon, name: 'IQ Quizzes' },
        { to: 'gk-quizzes', icon: GlobeAltIcon, name: 'GK Quizzes' },
        { to: 'ai-interview', icon: UserGroupIcon, name: 'AI Interview' },
        { to: 'settings', icon: Cog6ToothIcon, name: 'Settings' },
    ];
    
    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-gray-800 text-white">
            <div className="p-4 border-b border-gray-700">
                <h1 className="text-2xl font-bold">Loksewa Guru Admin</h1>
            </div>
            <nav className="flex-1 p-2 overflow-y-auto">
                {navItems.map(item => (
                    <NavLink
                        key={item.name}
                        to={item.to}
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center px-4 py-2 my-1 rounded-md transition-colors duration-200 ${
                                isActive ? 'bg-purple-600' : 'hover:bg-gray-700'
                            }`
                        }
                    >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 rounded-md hover:bg-red-500 transition-colors"
                >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <div className={`fixed inset-0 z-40 transform transition-transform duration-300 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="w-64 h-full">
                    <SidebarContent />
                </div>
            </div>
            {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}


            <div className="flex-1 flex flex-col">
                <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-md">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-gray-600 dark:text-gray-300" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                    </button>
                        <Link
                            to="/"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            <HomeIcon className="h-5 w-5" />
                            <span>Go To App Section</span>
                        </Link>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-2">Welcome, Admin</span>
                        <img src="https://api.dicebear.com/8.x/initials/svg?seed=Admin" alt="Admin" className="w-8 h-8 rounded-full" />
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
                    <div key={location.pathname} className="animate-page-zoom-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
