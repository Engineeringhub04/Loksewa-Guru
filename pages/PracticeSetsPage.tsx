import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { PracticeSet, PracticeCourse } from '../types';
import { ICONS_MAP } from '../constants';
import { ArrowLeftIcon, ChevronRightIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';
import PullToRefresh from '../components/PullToRefresh';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
);

const PracticeSetsPage: React.FC = () => {
    const { courseKey } = useParams<{ courseKey: string }>();
    const [sets, setSets] = useState<PracticeSet[]>([]);
    const [course, setCourse] = useState<PracticeCourse | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!courseKey) return;
        setLoading(true);
        try {
            const courseDocRef = doc(db, "practiceCourses", courseKey);
            const setsQuery = query(
                collection(db, "practiceSets"), 
                where("courseKey", "==", courseKey),
                where("status", "==", "published")
                // orderBy("createdAt", "desc") removed to prevent index error
            );

            const [courseSnap, setsSnap] = await Promise.all([
                getDoc(courseDocRef),
                getDocs(setsQuery)
            ]);
            
            if (courseSnap.exists()) {
                setCourse({ id: courseSnap.id, ...courseSnap.data() } as PracticeCourse);
            }

            const setsList = setsSnap.docs.map(doc => {
                const data = doc.data();
                // Ensure Timestamps are converted to JS Date objects
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
                    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
                } as PracticeSet;
            });
            
            // Sort client-side
            setsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            setSets(setsList);

        } catch (error) {
            console.error("Error fetching practice sets:", error);
        } finally {
            setLoading(false);
        }
    }, [courseKey]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const Icon = course ? ICONS_MAP[course.iconKey] : ClipboardDocumentCheckIcon;

    return (
        <PullToRefresh onRefresh={fetchData} className="max-w-md mx-auto bg-gray-50 dark:bg-gray-900 h-screen p-4 pb-24 overflow-y-auto">
            <header className="mb-6 flex items-center">
                <Link to="/questions-practice" className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-6 w-6" />
                </Link>
                {course && (
                    <div className="flex items-center gap-2">
                        <Icon className="h-8 w-8 text-indigo-500" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{course.name}</h1>
                    </div>
                )}
            </header>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Select a set to begin your practice session.</p>

            {loading ? <LoadingSpinner /> : (
                <div className="space-y-3">
                    {sets.map(set => (
                        <Link 
                            key={set.id} 
                            to={`/questions-practice/${courseKey}/${set.id}`}
                            className="w-full text-left flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
                        >
                            <div className="ml-4 flex-1">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100">{set.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{set.questions.length} Questions</p>
                            </div>
                            <ChevronRightIcon className="h-6 w-6 text-gray-400" />
                        </Link>
                    ))}
                </div>
            )}
             {sets.length === 0 && !loading && (
                <div className="text-center py-10 text-gray-500">
                    <p>No practice sets are available for this course yet.</p>
                </div>
            )}
        </PullToRefresh>
    );
};

export default PracticeSetsPage;
