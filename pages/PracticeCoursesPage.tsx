import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { PracticeCourse } from '../types';
import { ICONS_MAP } from '../constants';
import { ArrowLeftIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';
import PullToRefresh from '../components/PullToRefresh';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
);

const PracticeCoursesPage: React.FC = () => {
    const [courses, setCourses] = useState<PracticeCourse[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "practiceCourses"), orderBy("order", "asc"));
            const querySnapshot = await getDocs(q);
            const coursesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PracticeCourse));
            setCourses(coursesList);
        } catch (error) {
            console.error("Error fetching practice courses:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    return (
        <PullToRefresh onRefresh={fetchCourses} className="max-w-md mx-auto bg-gray-50 dark:bg-gray-900 h-screen p-4 pb-24 overflow-y-auto">
            <header className="mb-6 flex items-center">
                <Link to="/quiz" className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-6 w-6" />
                </Link>
                <div className="flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="h-8 w-8 text-indigo-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Questions Practice</h1>
                </div>
            </header>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Select a course to start practicing question sets without any time limit.</p>

            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-2 gap-4">
                    {courses.map(course => {
                        const Icon = ICONS_MAP[course.iconKey] || ClipboardDocumentCheckIcon;
                        return (
                            <Link 
                                key={course.id} 
                                to={`/questions-practice/${course.key}`}
                                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
                                <Icon className="h-12 w-12 text-indigo-500" />
                                <span className="mt-3 text-sm font-semibold text-center text-gray-800 dark:text-gray-200">{course.name}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
            {courses.length === 0 && !loading && (
                <div className="text-center py-10 text-gray-500">
                    <p>No practice courses are available at the moment.</p>
                </div>
            )}
        </PullToRefresh>
    );
};

export default PracticeCoursesPage;