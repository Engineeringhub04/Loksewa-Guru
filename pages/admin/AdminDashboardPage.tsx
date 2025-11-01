import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import type { AppContent } from '../../types';
import { UsersIcon, PuzzlePieceIcon, DocumentTextIcon, BanknotesIcon, LightBulbIcon, ExclamationTriangleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    link: string;
    linkText: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, link, linkText }) => {
    // Tailwind's JIT compiler needs full class names, so we use a map.
    const colorClasses: { [key: string]: { bg: string, hoverBg: string } } = {
        'purple': { bg: 'bg-purple-500', hoverBg: 'hover:bg-purple-600' },
        'blue': { bg: 'bg-blue-500', hoverBg: 'hover:bg-blue-600' },
        'green': { bg: 'bg-green-500', hoverBg: 'hover:bg-green-600' },
        'yellow': { bg: 'bg-yellow-500', hoverBg: 'hover:bg-yellow-600' },
        'indigo': { bg: 'bg-indigo-500', hoverBg: 'hover:bg-indigo-600' },
        'red': { bg: 'bg-red-500', hoverBg: 'hover:bg-red-600' },
        'teal': { bg: 'bg-teal-500', hoverBg: 'hover:bg-teal-600' },
    };
    
    const colors = colorClasses[color];


    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col justify-between`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${colors.bg} text-white`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
             <Link to={link} className={`mt-4 text-sm font-semibold text-white text-center py-2 rounded-md ${colors.bg} ${colors.hoverBg} transition-colors`}>
                {linkText}
            </Link>
        </div>
    );
};

const AdminDashboardPage: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalQuizzes: 0,
        totalServices: 0,
        pendingApprovals: 0,
        contentFeatures: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const usersQuery = query(collection(db, 'users'));
                const quizzesQuery = query(collection(db, 'quizzes'));
                const servicesQuery = query(collection(db, 'services'));
                const pendingQuery = query(collection(db, 'paymentProofs'), where('status', '==', 'pending'));
                const contentDocRef = doc(db, 'content', 'main');

                const [userSnap, quizSnap, serviceSnap, pendingSnap, contentSnap] = await Promise.all([
                    getDocs(usersQuery),
                    getDocs(quizzesQuery),
                    getDocs(servicesQuery),
                    getDocs(pendingQuery),
                    getDoc(contentDocRef),
                ]);

                let contentFeaturesCount = 0;
                if (contentSnap.exists()) {
                    const contentData = contentSnap.data() as AppContent;
                    contentFeaturesCount = (contentData.upcomingFeatures?.length || 0) + (contentData.additionalFeatures?.length || 0);
                }

                setStats({
                    totalUsers: userSnap.size,
                    totalQuizzes: quizSnap.size,
                    totalServices: serviceSnap.size,
                    pendingApprovals: pendingSnap.size,
                    contentFeatures: contentFeaturesCount,
                });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const dashboardCards = [
        { title: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: UsersIcon, color: 'purple', link: '/admin/users', linkText: 'View All Users' },
        { title: 'Total Quizzes', value: stats.totalQuizzes.toLocaleString(), icon: PuzzlePieceIcon, color: 'blue', link: '/admin/quizzes', linkText: 'Manage Quizzes' },
        { title: 'Total Services', value: stats.totalServices.toLocaleString(), icon: Squares2X2Icon, color: 'teal', link: '/admin/services', linkText: 'Manage Services' },
        { title: 'Revenue', value: 'NPR 25,000', icon: BanknotesIcon, color: 'yellow', link: '/admin/payment-proofs', linkText: 'View Reports' },
        { title: 'Content & Features', value: stats.contentFeatures.toLocaleString(), icon: LightBulbIcon, color: 'indigo', link: '/admin/content', linkText: 'Manage Content' },
        { title: 'Pending Approvals', value: stats.pendingApprovals.toLocaleString(), icon: ExclamationTriangleIcon, color: 'red', link: '/admin/payment-proofs', linkText: 'Review Now' },
    ];
    
    if (loading) {
        return (
            <div>
                 <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Admin Dashboard Overview</h1>
                    <p className="text-gray-500 dark:text-gray-400">Fetching live data...</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-[156px]">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Admin Dashboard Overview</h1>
                <p className="text-gray-500 dark:text-gray-400">Welcome back, Admin!</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardCards.map(stat => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>
        </div>
    );
};

export default AdminDashboardPage;