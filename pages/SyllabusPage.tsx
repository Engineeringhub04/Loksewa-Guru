

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import type { SyllabusEntry } from '../types';
import { BookIcon } from '../constants';
import PullToRefresh from '../components/PullToRefresh';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
);

const SyllabusPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SyllabusEntry[]>([]);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchSyllabusData = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "syllabuses"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const syllabusList = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt ? (docData.createdAt as Timestamp).toDate() : undefined,
                } as SyllabusEntry
            });
            setData(syllabusList);
        } catch (error) {
            console.error("Error fetching syllabus data:", error);
            // Optionally set an error state to show in the UI
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSyllabusData();
    }, [fetchSyllabusData]);

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    
    return (
        <PullToRefresh onRefresh={fetchSyllabusData} className="max-w-4xl mx-auto bg-white dark:bg-gray-900 h-screen p-4 pb-24 overflow-y-auto">
            <header className="mb-6 text-center">
                <Link to="/" className="text-purple-600 dark:text-purple-400 hover:underline mb-4 inline-block">&larr; Back to Home</Link>
                <div className="flex justify-center items-center gap-3">
                    <BookIcon className="h-10 w-10 text-purple-500" />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Syllabus</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Find all the latest official Loksewa syllabuses here.</p>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                    <h2 className="font-semibold">Available Syllabuses</h2>
                    <div className="flex items-center gap-2">
                        <label htmlFor="items-per-page" className="text-sm">Show:</label>
                        <select
                            id="items-per-page"
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1); // Reset to first page
                            }}
                            className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                </div>
                
                {loading ? <LoadingSpinner /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-purple-100 dark:bg-purple-900/20 dark:text-gray-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">S.N.</th>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Title</th>
                                <th scope="col" className="px-6 py-3">Source</th>
                                <th scope="col" className="px-6 py-3">View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, index) => (
                                <tr key={item.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4">{startIndex + index + 1}</td>
                                    <td className="px-6 py-4">{item.date}</td>
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.title}</th>
                                    <td className="px-6 py-4">{item.source}</td>
                                    <td className="px-6 py-4">
                                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">View</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                <div className="p-4 flex flex-col sm:flex-row justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400 mb-2 sm:mb-0">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, data.length)} of {data.length} entries
                    </span>
                    <nav className="flex items-center space-x-1">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50">Previous</button>
                        {[...Array(totalPages).keys()].slice(0, 5).map(num => (
                             <button key={num + 1} onClick={() => handlePageChange(num + 1)} className={`px-3 py-1 rounded-md ${currentPage === num + 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{num + 1}</button>
                        ))}
                        {totalPages > 5 && <span className="px-2">...</span>}
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50">Next</button>
                    </nav>
                </div>
            </div>
        </PullToRefresh>
    );
};

export default SyllabusPage;