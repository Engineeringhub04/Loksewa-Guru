
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, doc, getDoc, writeBatch, onSnapshot, where, Timestamp, setDoc } from 'firebase/firestore';
import type { ServiceDocument, SliderImage, AppContent, TeamMember, Notice, OtherSiteData, HomeNotice, SyllabusEntry, OfflineTest, QuizDocument, Note, UpcomingFeatureData, AdditionalFeatureData } from '../types';
import { DEFAULT_SERVICES, DEFAULT_SLIDER_IMAGES, OUR_TEAM, UPCOMING_FEATURES, ADDITIONAL_FEATURES } from '../constants';

interface WelcomePageData {
    appName: string;
    logoUrl: string;
    sliderImages: { imageUrl: string; description: string; }[];
}

interface DataContextType {
    loading: boolean;
    services: ServiceDocument[];
    sliderImages: SliderImage[];
    appContent: AppContent | null;
    teamMembers: TeamMember[];
    pinnedOurNotice: Notice | null;
    pinnedPscNotice: Notice | null;
    otherSiteData: OtherSiteData[];
    homeNotices: HomeNotice[];
    appLogoUrl: string;
    aiChatLogoUrl: string;
    aiInterviewLogoUrl: string;
    voiceChatLogoUrl: string;
    aiResponseLogoUrl: string;
    welcomeData: WelcomePageData;
    allNotes: Note[];
    allSyllabuses: SyllabusEntry[];
    allOfflineTests: OfflineTest[];
    allQuizzes: QuizDocument[];
    allNotices: Notice[];
    paymentGatewaySettings: {
        esewa: { showComingSoon: boolean; comingSoonText: string };
        khalti: { showComingSoon: boolean; comingSoonText: string };
    };
    subscriptionLocks: { [key: string]: { subscription?: boolean; login?: boolean } };
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_WELCOME_DATA: WelcomePageData = {
    appName: 'Loksewa Guru',
    logoUrl: 'https://i.imgur.com/J5QX03J.png',
    sliderImages: [
        { 
            imageUrl: '/w-slider-1.png',
            description: 'Practice with thousands of MCQs and quizzes tailored for your exam preparation.'
        },
        { 
            imageUrl: '/w-slider-2.png',
            description: 'Access comprehensive notes and study materials for all subjects, anytime, anywhere.'
        }
    ]
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<ServiceDocument[]>([]);
    const [sliderImages, setSliderImages] = useState<SliderImage[]>([]);
    const [appContent, setAppContent] = useState<AppContent | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [pinnedOurNotice, setPinnedOurNotice] = useState<Notice | null>(null);
    const [pinnedPscNotice, setPinnedPscNotice] = useState<Notice | null>(null);
    const [otherSiteData, setOtherSiteData] = useState<OtherSiteData[]>([]);
    const [homeNotices, setHomeNotices] = useState<HomeNotice[]>([]);
    const [appLogoUrl, setAppLogoUrl] = useState('');
    const [aiChatLogoUrl, setAiChatLogoUrl] = useState('');
    const [aiInterviewLogoUrl, setAiInterviewLogoUrl] = useState('');
    const [voiceChatLogoUrl, setVoiceChatLogoUrl] = useState('');
    const [aiResponseLogoUrl, setAiResponseLogoUrl] = useState('');
    const [welcomeData, setWelcomeData] = useState<WelcomePageData>(DEFAULT_WELCOME_DATA);
    const [paymentGatewaySettings, setPaymentGatewaySettings] = useState({
        esewa: { showComingSoon: false, comingSoonText: 'Coming Soon' },
        khalti: { showComingSoon: false, comingSoonText: 'Coming Soon' },
    });
    const [subscriptionLocks, setSubscriptionLocks] = useState<{ [key: string]: { subscription?: boolean; login?: boolean } }>({});

    // New states for global search
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [allSyllabuses, setAllSyllabuses] = useState<SyllabusEntry[]>([]);
    const [allOfflineTests, setAllOfflineTests] = useState<OfflineTest[]>([]);
    const [allQuizzes, setAllQuizzes] = useState<QuizDocument[]>([]);
    const [allNotices, setAllNotices] = useState<Notice[]>([]);


    const fetchInitialData = useCallback(async () => {
        // Don't set loading true here if we want PullToRefresh to be silent
        
        const contentDocRef = doc(db, 'content', 'main');
        const servicesCollectionRef = collection(db, 'services');
        const servicesQuery = query(servicesCollectionRef, orderBy('order'));
        const sliderDocRef = doc(db, 'settings', 'sliderImages');
        const imagesDocRef = doc(db, 'settings', 'paymentLogos');
        const pinnedNoticesDocRef = doc(db, 'settings', 'pinnedNotices');
        const teamQuery = query(collection(db, "teamMembers"), orderBy("order", "asc"));
        const welcomePageDocRef = doc(db, 'settings', 'welcomePage');
        const aiModalDocRef = doc(db, 'settings', 'aiModal');
        const aiInterviewDocRef = doc(db, 'settings', 'ai_interview');
        const paymentGatewaySettingsDocRef = doc(db, 'settings', 'paymentGateways');
        const subscriptionLocksDocRef = doc(db, 'settings', 'subscriptionLocks');
        const homeNoticesQuery = query(
            collection(db, 'homeNotices'), 
            where('expiresAt', '>', Timestamp.now()),
            orderBy('expiresAt', 'desc')
        );

        // Queries for global search data
        const notesQuery = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
        const syllabusesQuery = query(collection(db, 'syllabuses'), orderBy('createdAt', 'desc'));
        const offlineTestsQuery = query(collection(db, 'offlineTests'), orderBy('createdAt', 'desc'));
        const quizzesQuery = query(collection(db, 'quizzes'), where('status', '==', 'published'));
        const noticesQuery = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));

        try {
            const [
                contentSnap, 
                servicesSnap, 
                sliderSnap, 
                imagesSnap, 
                pinnedNoticesSnap, 
                teamSnap,
                homeNoticesSnap,
                welcomePageSnap,
                aiModalSnap,
                aiInterviewSnap,
                paymentGatewaySettingsSnap,
                subscriptionLocksSnap,
                notesSnap,
                syllabusesSnap,
                offlineTestsSnap,
                quizzesSnap,
                noticesSnap,
            ] = await Promise.all([
                getDoc(contentDocRef),
                getDocs(servicesQuery),
                getDoc(sliderDocRef),
                getDoc(imagesDocRef),
                getDoc(pinnedNoticesDocRef),
                getDocs(teamQuery),
                getDocs(homeNoticesQuery),
                getDoc(welcomePageDocRef),
                getDoc(aiModalDocRef),
                getDoc(aiInterviewDocRef),
                getDoc(paymentGatewaySettingsDocRef),
                getDoc(subscriptionLocksDocRef),
                getDocs(notesQuery),
                getDocs(syllabusesQuery),
                getDocs(offlineTestsQuery),
                getDocs(quizzesQuery),
                getDocs(noticesQuery),
            ]);
            
            // Subscription Locks
            if (subscriptionLocksSnap.exists()) {
                const rawLocks = subscriptionLocksSnap.data() || {};
                const processedLocks: { [key: string]: { subscription?: boolean; login?: boolean } } = {};
                for (const key in rawLocks) {
                    const value = rawLocks[key];
                    if (typeof value === 'boolean') {
                        // Handle old format for backward compatibility
                        processedLocks[key] = { subscription: value, login: false };
                    } else if (typeof value === 'object' && value !== null) {
                        // Handle new format
                        processedLocks[key] = {
                            subscription: value.subscription === true,
                            login: value.login === true,
                        };
                    }
                }
                setSubscriptionLocks(processedLocks);
            }

            // Payment Gateway Settings
            if (paymentGatewaySettingsSnap.exists()) {
                const data = paymentGatewaySettingsSnap.data();
                setPaymentGatewaySettings({
                    esewa: data.esewa || { showComingSoon: false, comingSoonText: 'Coming Soon' },
                    khalti: data.khalti || { showComingSoon: false, comingSoonText: 'Coming Soon' },
                });
            }

            // AI Logos
            if (aiModalSnap.exists()) {
                const data = aiModalSnap.data();
                setAiChatLogoUrl(data.logoUrl || '');
                setVoiceChatLogoUrl(data.voiceChatLogoUrl || '');
                setAiResponseLogoUrl(data.aiResponseLogoUrl || '');
            }
            if (aiInterviewSnap.exists()) {
                setAiInterviewLogoUrl(aiInterviewSnap.data().logoUrl || '');
            }

            // Welcome Page Data
            if (welcomePageSnap.exists()) {
                const data = welcomePageSnap.data() as WelcomePageData;
                // Ensure sliderImages is an array even if Firestore has null/undefined
                if (!Array.isArray(data.sliderImages)) {
                    data.sliderImages = DEFAULT_WELCOME_DATA.sliderImages;
                }
                setWelcomeData(data);
            } else {
                await setDoc(welcomePageDocRef, DEFAULT_WELCOME_DATA);
                setWelcomeData(DEFAULT_WELCOME_DATA);
            }

            // Team Members
            if (teamSnap.empty) {
                const batch = writeBatch(db);
                OUR_TEAM.forEach(member => {
                    const docRef = doc(db, "teamMembers", member.id);
                    batch.set(docRef, member);
                });
                await batch.commit();
                setTeamMembers(OUR_TEAM);
            } else {
                setTeamMembers(teamSnap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        order: data.order,
                        name: data.name,
                        position: data.position,
                        description: data.description,
                        photoUrl: data.photoUrl,
                        deleteToken: data.deleteToken,
                        social: data.social,
                        portfolioUrl: data.portfolioUrl,
                    } as TeamMember
                }));
            }

            // Pinned Notices
            if (pinnedNoticesSnap.exists()) {
                const pinnedIds = pinnedNoticesSnap.data();
                if (pinnedIds.ourNoticeId) {
                    const noticeSnap = await getDoc(doc(db, 'notices', pinnedIds.ourNoticeId));
                    if (noticeSnap.exists()) {
                        const data = noticeSnap.data();
                        setPinnedOurNotice({
                            id: noticeSnap.id,
                            title: data.title,
                            date: data.date,
                            fileUrl: data.fileUrl,
                            type: data.type,
                            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                            imageUrl: data.imageUrl
                        } as Notice);
                    }
                }
                 if (pinnedIds.pscNoticeId) {
                    const noticeSnap = await getDoc(doc(db, 'notices', pinnedIds.pscNoticeId));
                    if (noticeSnap.exists()) {
                        const data = noticeSnap.data();
                        setPinnedPscNotice({
                            id: noticeSnap.id,
                            title: data.title,
                            date: data.date,
                            fileUrl: data.fileUrl,
                            type: data.type,
                            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                            imageUrl: data.imageUrl
                        } as Notice);
                    }
                }
            }

            // Content
            const defaultSocialLinks = { facebook: '#', instagram: '#', youtube: '#', twitter: '#', linkedin: '#', whatsapp: '#' };
            const defaultOtherSite = { heading: '', description: '', link: '#' };
            
            const dbContent = contentSnap.exists()
                ? (contentSnap.data() as AppContent)
                : {
                    upcomingFeatures: [],
                    additionalFeatures: [],
                    socialLinks: defaultSocialLinks,
                    otherSite: defaultOtherSite
                };

            // Combine upcoming features: Start with constants, then merge ALL settings from DB.
            const upcomingMap = new Map<string, UpcomingFeatureData>();
            UPCOMING_FEATURES.forEach(f => upcomingMap.set(f.key, { ...f, enabled: true })); // Defaults
            if (dbContent.upcomingFeatures) {
                dbContent.upcomingFeatures.forEach(dbFeature => {
                    upcomingMap.set(dbFeature.key, dbFeature); // Apply DB customizations
                });
            }
            const finalUpcomingFeatures = Array.from(upcomingMap.values());
            
            // Combine additional features: Start with constants, then merge ALL settings from DB.
            const additionalMap = new Map<string, AdditionalFeatureData>();
            ADDITIONAL_FEATURES.forEach(f => additionalMap.set(f.key, { ...f, enabled: true })); // Defaults
            if (dbContent.additionalFeatures) {
                dbContent.additionalFeatures.forEach(dbFeature => {
                    additionalMap.set(dbFeature.key, dbFeature); // Apply DB customizations
                });
            }
            const finalAdditionalFeatures = Array.from(additionalMap.values());

            const finalContent: AppContent = {
                upcomingFeatures: finalUpcomingFeatures,
                additionalFeatures: finalAdditionalFeatures,
                socialLinks: { ...defaultSocialLinks, ...dbContent.socialLinks },
                otherSite: { ...defaultOtherSite, ...dbContent.otherSite },
            };
            setAppContent(finalContent);
            
            // Services
            if (servicesSnap.empty) {
                const batch = writeBatch(db);
                DEFAULT_SERVICES.forEach(service => {
                    const docRef = doc(db, "services", service.key);
                    const { key, ...serviceData } = service;
                    batch.set(docRef, serviceData);
                });
                await batch.commit();
                const seededSnapshot = await getDocs(servicesQuery);
                setServices(seededSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceDocument)));
            } else {
                setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceDocument)));
            }
           
            // Slider Images
            if (sliderSnap.exists() && sliderSnap.data().images) {
                setSliderImages(sliderSnap.data().images);
            } else {
                await setDoc(sliderDocRef, { images: DEFAULT_SLIDER_IMAGES });
                setSliderImages(DEFAULT_SLIDER_IMAGES);
            }
          
            // App Logo
            if (imagesSnap.exists()) {
                const data = imagesSnap.data();
                setAppLogoUrl(data.appLogoUrl || '');
            }

            // Home Notices
            setHomeNotices(homeNoticesSnap.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id,
                    imageUrl: data.imageUrl,
                    linkUrl: data.linkUrl,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    expiresAt: data.expiresAt ? (data.expiresAt as Timestamp).toDate() : new Date(),
                    deleteToken: data.deleteToken,
                } as HomeNotice;
            }));

            // Global Search Data
            setAllNotes(notesSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    date: data.date,
                    fileUrl: data.fileUrl,
                    category: data.category,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                } as Note;
            }));
            setAllSyllabuses(syllabusesSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: data.date,
                    title: data.title,
                    source: data.source,
                    fileUrl: data.fileUrl,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                } as SyllabusEntry;
            }));
            setAllOfflineTests(offlineTestsSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    status: data.status,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
                    questions: data.questions,
                    settings: data.settings,
                } as OfflineTest;
            }));
            setAllQuizzes(quizzesSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    mainCategoryKey: data.mainCategoryKey,
                    subCategoryKey: data.subCategoryKey,
                    subCategoryName: data.subCategoryName,
                    status: data.status,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
                    questions: data.questions,
                    settings: data.settings,
                } as QuizDocument;
            }));
            setAllNotices(noticesSnap.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id,
                    title: data.title,
                    date: data.date,
                    fileUrl: data.fileUrl,
                    type: data.type,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
                    imageUrl: data.imageUrl,
                } as Notice;
            }));

        } catch (error) {
            console.error("Failed to fetch initial data:", error);
            // Set fallbacks on error
            setAppContent({ upcomingFeatures: [], additionalFeatures: [], socialLinks: { facebook: '#', instagram: '#', youtube: '#', twitter: '#', linkedin: '#', whatsapp: '#' }, otherSite: { heading: '', description: '', link: '#' }});
            setServices(DEFAULT_SERVICES.map(s => ({...s, id: s.key})));
            setSliderImages(DEFAULT_SLIDER_IMAGES);
            setTeamMembers(OUR_TEAM);
            setWelcomeData(DEFAULT_WELCOME_DATA);
        }
    }, []);
    
    // This effect runs only once on mount to fetch all initial data
    useEffect(() => {
        const load = async () => {
            await fetchInitialData();
            setLoading(false);
        };
        load();
        
        // Listeners for real-time updates
        const otherSitesQuery = query(collection(db, "otherSites"), orderBy("createdAt", "desc"));
        const unsubscribeOtherSite = onSnapshot(otherSitesQuery, (snapshot) => {
            setOtherSiteData(snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id,
                    heading: data.heading,
                    description: data.description,
                    link: data.link,
                    imageUrl: data.imageUrl,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined
                } as OtherSiteData
            }));
        }, (err) => console.error("Listener for other site failed: ", err));
        
        return () => {
            unsubscribeOtherSite();
        };
    }, [fetchInitialData]);
    
    const value = {
        loading,
        services,
        sliderImages,
        appContent,
        teamMembers,
        pinnedOurNotice,
        pinnedPscNotice,
        otherSiteData,
        homeNotices,
        appLogoUrl,
        aiChatLogoUrl,
        aiInterviewLogoUrl,
        voiceChatLogoUrl,
        aiResponseLogoUrl,
        welcomeData,
        allNotes,
        allSyllabuses,
        allOfflineTests,
        allQuizzes,
        allNotices,
        paymentGatewaySettings,
        subscriptionLocks,
        refreshData: fetchInitialData
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
