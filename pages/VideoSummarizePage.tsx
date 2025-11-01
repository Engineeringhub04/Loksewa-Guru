
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { VideoIcon } from '../constants';
import { summarizeVideoWithAI } from '../services/geminiService';

const VideoSummarizePage: React.FC = () => {
    const [videoUrl, setVideoUrl] = useState('');
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoUrl) {
            setError('Please enter a video URL.');
            return;
        }
        setError('');
        setIsLoading(true);
        setSummary('');

        try {
            // Note: This uses a mocked service. In a real app, you'd handle file uploads
            // or send the URL to a backend for processing.
            const prompt = `Please summarize this video: ${videoUrl}`;
            const mockFile = new File([""], "mock.mp4", { type: "video/mp4" });
            const result = await summarizeVideoWithAI(mockFile, prompt);
            setSummary(result);
        } catch (err) {
            console.error(err);
            setError('Failed to generate summary. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 pb-24">
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </Link>
                 <div className="flex-1 text-center">
                     <div className="flex items-center justify-center gap-2">
                        <VideoIcon className="h-6 w-6 text-red-500" />
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Video Summarizer</h1>
                    </div>
                 </div>
                 <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Summarize any Video</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Paste a video link below to get a quick summary powered by AI.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl">
                    <div className="mb-4">
                        <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Video URL
                        </label>
                        <input
                            type="url"
                            id="video-url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                        />
                    </div>
                    {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-600 transition-all disabled:bg-gray-400"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Summarizing...
                            </>
                        ) : (
                           <>
                                <SparklesIcon className="h-5 w-5" />
                                Generate Summary
                           </>
                        )}
                    </button>
                </form>

                {summary && (
                    <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl animate-fade-in">
                        <h3 className="text-lg font-bold mb-4">Summary:</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                            {summary}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VideoSummarizePage;
