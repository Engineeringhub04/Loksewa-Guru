import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc, orderBy, Timestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Notification, AdminNotification, PublishedNotification } from '../types';
import { 
    ArrowLeftIcon, 
    BellIcon as BellIconSolid, 
    UserPlusIcon, 
    CreditCardIcon, 
    DocumentArrowDownIcon, 
    XMarkIcon, 
    InformationCircleIcon,
    ChatBubbleLeftRightIcon,
    MegaphoneIcon
} from '@heroicons/react/24/solid';
import { BellIcon as BellIconOutline } from '@heroicons/react/24/outline';
import PullToRefresh from '../components/PullToRefresh';
import { useToast } from '../contexts/ToastContext';

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
        if (!src) return;
        let isMounted = true;
        const placeholderSrc = generateCloudinaryUrl(src, 'q_auto:low,e_blur:2000,w_20');
        const highResSrc = generateCloudinaryUrl(src, 'q_auto,f_auto');
        
        const highResImg = new Image();
        highResImg.src = highResSrc;
        highResImg.onload = () => { if (isMounted) { setImageSrc(highResSrc); setIsHighResLoaded(true); } };
        if (highResImg.complete) { if (isMounted) { setImageSrc(highResSrc); setIsHighResLoaded(true); return; } }
        
        const placeholderImg = new Image();
        placeholderImg.src = placeholderSrc;
        placeholderImg.onload = () => { if (isMounted && !highResImg.complete) { setImageSrc(placeholderSrc); } };

        return () => { isMounted = false; };
    }, [src]);

    if (!imageSrc) return <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`} role="img" aria-label={alt} />;

    return <img {...props} src={imageSrc} alt={alt} className={`${className} transition-all duration-500 ease-in-out ${isHighResLoaded ? 'blur-0 scale-100' : 'blur-md scale-105'}`} />;
};

type DisplayNotification = {
    id: string;
    title: string;
    message: string;
    createdAt: Date;
    author?: string;
    link?: string;
    imageUrl?: string;
    type: AdminNotification['type'] | 'user' | 'app';
    isRead: boolean;
};

type AdminNotificationFilter = 'All' | 'Published' | 'New User' | 'Subscription' | 'File Receive' | 'Feedback';
const adminFilterMap: { [key in AdminNotificationFilter]: AdminNotification['type'] | 'All' | 'app' } = {
    'All': 'All', 'Published': 'app', 'New User': 'newUser', 'Subscription': 'subscription', 'File Receive': 'fileReceive', 'Feedback': 'feedback',
};
const adminFilters: AdminNotificationFilter[] = ['All', 'Published', 'New User', 'Subscription', 'File Receive', 'Feedback'];

const iconMap: { [key: string]: React.ElementType } = {
    newUser: UserPlusIcon, subscription: CreditCardIcon, fileReceive: DocumentArrowDownIcon, feedback: ChatBubbleLeftRightIcon,
    user: BellIconSolid, app: MegaphoneIcon,
};

const ImageViewer: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
        <div className="relative p-4" onClick={(e) => e.stopPropagation()}>
            <ProgressiveImage src={imageUrl} alt="Full screen notification view" className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl animate-fade-in-scale" />
            <button onClick={onClose} className="absolute -top-2 -right-2 p-2 bg-white dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-200 shadow-lg hover:scale-110 transition-transform" aria-label="Close image view">
                <XMarkIcon className="h-6 w-6" />
            </button>
        </div>
    </div>
);

const NOTIF_READ_STATUS_KEY = 'loksewa-read-notifications';

const NotificationsPage: React.FC = () => {
    const { user, isLoggedIn, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
    const [userNotifications, setUserNotifications] = useState<Notification[]>([]);
    const [appNotifications, setAppNotifications] = useState<PublishedNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [adminFilter, setAdminFilter] = useState<AdminNotificationFilter>('All');
    const [userFilter, setUserFilter] = useState<'All' | 'Our App' | 'User'>('All');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
    const { showToast } = useToast();

    useEffect(() => {
        try {
            const saved = localStorage.getItem(NOTIF_READ_STATUS_KEY);
            if (saved) {
                setReadNotifIds(new Set(JSON.parse(saved)));
            }
        } catch (e) { console.error('Could not load read notification status', e); }
    }, []);

    useEffect(() => {
        setLoading(true);
        const unsubscribers: (() => void)[] = [];

        if (isAdmin) {
            const adminQuery = query(collection(db, 'adminNotifications'), orderBy('createdAt', 'desc'));
            unsubscribers.push(onSnapshot(adminQuery, (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp).toDate() } as AdminNotification));
                setAdminNotifications(list); 
                setLoading(false);
            }, (error) => { 
                console.error("Admin notifications error:", error); 
                setLoading(false); 
            }));

            const appNotifQuery = query(collection(db, 'publishedNotifications'), orderBy('createdAt', 'desc'));
            unsubscribers.push(onSnapshot(appNotifQuery, (snapshot) => {
                const list = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                        publishedAt: data.publishedAt ? (data.publishedAt as Timestamp).toDate() : new Date(),
                    } as PublishedNotification
                });
                setAppNotifications(list);
            }, (error) => console.error("App notifications (for admin) error:", error)));

        } else {
            const appNotifQuery = query(collection(db, 'publishedNotifications'), where('status', '==', 'published'));
            unsubscribers.push(onSnapshot(appNotifQuery, (snapshot) => {
                const list = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        publishedAt: (data.publishedAt as Timestamp).toDate(),
                        createdAt: (data.createdAt as Timestamp).toDate(),
                    } as PublishedNotification
                });
                list.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
                setAppNotifications(list);
            }, (error) => console.error("App notifications error:", error)));

            if (isLoggedIn && user?.uid) {
                const userNotifQuery = query(collection(db, 'notifications'), where('userId', '==', user.uid));
                unsubscribers.push(onSnapshot(userNotifQuery, (snapshot) => {
                    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp).toDate() } as Notification));
                    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                    setUserNotifications(list); setLoading(false);
                    const unread = snapshot.docs.filter(d => !d.data().read);
                    if (unread.length > 0) { const batch = writeBatch(db); unread.forEach(d => batch.update(d.ref, { read: true })); batch.commit().catch(console.error); }
                }, (error) => { console.error("User notifications error:", error); setLoading(false); }));
            } else {
                setUserNotifications([]); setLoading(false);
            }
        }
        return () => unsubscribers.forEach(unsub => unsub());
    }, [user, isLoggedIn, isAdmin]);

    const markAsRead = async (notif: DisplayNotification) => {
        if (isAdmin) {
            if (notif.type !== 'app' && !notif.isRead) {
                try {
                    const notifRef = doc(db, 'adminNotifications', notif.id);
                    await updateDoc(notifRef, { read: true });
                } catch (error) {
                    console.error("Failed to mark notification as read:", error);
                    showToast("Could not mark notification as read.", "error");
                }
            }
        } else {
            if (notif.type === 'app' && !notif.isRead) {
                 setReadNotifIds(prev => {
                    const newSet = new Set(prev);
                    newSet.add(notif.id);
                    try {
                        localStorage.setItem(NOTIF_READ_STATUS_KEY, JSON.stringify(Array.from(newSet)));
                    } catch (e) { console.error('Could not save read status', e); }
                    return newSet;
                });
            }
        }
    };
    
    const handleMarkAllAsRead = async () => {
        const unreadAdminNotifications = adminNotifications.filter(n => !n.read);
        if (unreadAdminNotifications.length === 0) {
            showToast("All notifications are already marked as read.", "info");
            return;
        }

        try {
            const batch = writeBatch(db);
            unreadAdminNotifications.forEach(notif => {
                const docRef = doc(db, 'adminNotifications', notif.id);
                batch.update(docRef, { read: true });
            });
            await batch.commit();
            showToast("All notifications have been marked as read.", "success");
        } catch (error) {
            console.error("Error marking all as read:", error);
            showToast("Failed to mark all notifications as read.", "error");
        }
    };


    const filteredNotifications = useMemo((): DisplayNotification[] => {
        if (isAdmin) {
            const displayAdminNotifications: DisplayNotification[] = adminNotifications.map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                createdAt: n.createdAt,
                author: 'System',
                link: n.link,
                type: n.type,
                isRead: n.read,
            }));

            const displayAppNotifications: DisplayNotification[] = appNotifications.map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                author: n.author,
                createdAt: n.createdAt,
                imageUrl: n.imageUrl,
                type: 'app',
                isRead: true, // For admin, these are "read" as they are the sender
            }));

            let combinedList: DisplayNotification[] = [];
            const filterType = adminFilterMap[adminFilter];

            if (filterType === 'All') {
                 combinedList = [...displayAdminNotifications, ...displayAppNotifications];
            } else if (filterType === 'app') {
                 combinedList = [...displayAppNotifications];
            } else {
                combinedList = displayAdminNotifications.filter(n => n.type === filterType);
            }
            
            return combinedList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        // --- USER LOGIC ---
        const displayAppNotifications: DisplayNotification[] = appNotifications.map(n => ({
            id: n.id, title: n.title, message: n.message, author: n.author,
            createdAt: n.publishedAt, imageUrl: n.imageUrl, type: 'app',
            isRead: readNotifIds.has(n.id)
        }));

        if (!isLoggedIn) return displayAppNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const displayUserNotifications: DisplayNotification[] = userNotifications.map(n => ({ ...n, type: 'user', isRead: n.read }));

        switch (userFilter) {
            case 'Our App': return displayAppNotifications;
            case 'User': return displayUserNotifications;
            case 'All': default: 
                return [...displayUserNotifications, ...displayAppNotifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
    }, [isAdmin, adminNotifications, userNotifications, appNotifications, isLoggedIn, adminFilter, userFilter, readNotifIds]);

    const handleRefresh = async () => await new Promise(resolve => setTimeout(resolve, 1000));

    const renderNotificationCard = (notif: DisplayNotification) => {
        const Icon = iconMap[notif.type] || BellIconSolid;
        const cardContent = (
            <div className={`relative p-4 rounded-lg shadow-sm animate-fade-in-scale flex items-start gap-4 transition-colors duration-300 ${notif.isRead ? 'bg-white dark:bg-gray-800' : 'bg-purple-50 dark:bg-purple-900/20'}`}>
                {!notif.isRead && <div className="absolute top-4 left-2 h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>}
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center ml-2">
                    <Icon className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100">{notif.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{notif.message}</p>
                    {notif.imageUrl && (
                        <div className="mt-3 block cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingImage(notif.imageUrl!); }}>
                            <ProgressiveImage src={notif.imageUrl} alt="Notification attachment" className="rounded-lg w-full max-h-48 object-cover" />
                        </div>
                    )}
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-400 dark:text-gray-500">
                        <span>By {notif.author || 'System'}</span>
                        <span>{notif.createdAt.toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        );

        if (notif.link) {
            return notif.link.startsWith('http')
                ? <a key={notif.id} href={notif.link} target="_blank" rel="noopener noreferrer" onClick={() => markAsRead(notif)}>{cardContent}</a>
                : <Link key={notif.id} to={notif.link!} onClick={() => markAsRead(notif)}>{cardContent}</Link>
        }
        
        return <div key={notif.id} onClick={() => markAsRead(notif)} className="cursor-pointer">{cardContent}</div>;
    };

    return (
        <PullToRefresh onRefresh={handleRefresh} className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home"><ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" /></Link>
                <div className="flex-1 text-center"><div className="flex items-center justify-center gap-2"><BellIconSolid className="h-6 w-6 text-purple-500" /><h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Notifications</h1></div></div>
                <div className="w-10"></div>
            </header>
            <main className="flex-1 p-4 pb-24">
                {isAdmin ? (
                    <div className="mb-4">
                        <div className="flex space-x-2 overflow-x-auto pb-4 -mx-4 px-4">{(adminFilters).map(key => (<button key={key} onClick={() => setAdminFilter(key)} className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors duration-200 ${adminFilter === key ? 'bg-purple-600 text-white shadow' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{key}</button>))}</div>
                        <div className="flex justify-end -mt-3">
                            <button onClick={handleMarkAllAsRead} className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                                Mark all as read
                            </button>
                        </div>
                    </div>
                ) : isLoggedIn ? (
                    <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 mb-4">{(['All', 'Our App', 'User'] as const).map(tab => (<button key={tab} onClick={() => setUserFilter(tab)} className={`w-1/3 py-2 text-sm font-semibold rounded-md transition-colors duration-300 ${userFilter === tab ? 'bg-purple-600 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}>{tab}</button>))}</div>
                ) : (
                    <div className="text-center mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg"><h2 className="font-semibold text-blue-800 dark:text-blue-200">App Announcements</h2><p className="text-sm text-blue-700 dark:text-blue-300">Showing official notices from Loksewa Guru. <Link to="/login" className="font-bold underline">Login</Link> to see personal notifications.</p></div>
                )}

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading notifications...</div>
                ) : filteredNotifications.length > 0 ? (
                    <div className="space-y-4">{filteredNotifications.map(renderNotificationCard)}</div>
                ) : (
                    <div className="text-center py-20"><BellIconOutline className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600" /><h3 className="mt-4 text-lg font-semibold">No Notifications Yet</h3><p className="text-gray-500">You're all caught up!</p></div>
                )}
            </main>
            {viewingImage && <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
        </PullToRefresh>
    );
};

export default NotificationsPage;
