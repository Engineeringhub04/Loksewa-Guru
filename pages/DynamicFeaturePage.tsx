import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { DynamicPageLayout, DynamicPageComponent } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import PullToRefresh from '../components/PullToRefresh';

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col flex-1 items-center justify-center text-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading Feature...</h2>
    </div>
);

const NotFound: React.FC = () => (
    <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-2">Feature Not Found</h2>
        <p className="text-gray-500">The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="mt-6 inline-block px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg">
            Back to Home
        </Link>
    </div>
);

const DynamicFeaturePage: React.FC = () => {
    const { featureKey } = useParams<{ featureKey: string }>();
    const [pageData, setPageData] = useState<{ layout: DynamicPageLayout, title: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [formState, setFormState] = useState<Record<string, string>>({});

    const fetchPageData = useCallback(async () => {
        if (!featureKey) {
            setError(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(false);
        setFormState({}); // Reset state on new page load
        try {
            // Fetch layout from dynamicPages collection
            const layoutDocRef = doc(db, 'dynamicPages', featureKey);
            const layoutDocSnap = await getDoc(layoutDocRef);

            if (!layoutDocSnap.exists()) {
                throw new Error("Layout not found");
            }
            const layout = layoutDocSnap.data() as DynamicPageLayout;

            // Fetch title from content collection
            const contentDocRef = doc(db, 'content', 'main');
            const contentDocSnap = await getDoc(contentDocRef);
            let title = featureKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Fallback title
            if (contentDocSnap.exists()) {
                const contentData = contentDocSnap.data();
                const feature = contentData.additionalFeatures?.find((f: any) => f.key === featureKey);
                if (feature) {
                    title = feature.name;
                }
            }
            
            setPageData({ layout, title });

        } catch (err) {
            console.error("Error fetching dynamic page:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [featureKey]);


    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleInputChange = (key: string, value: string) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    const handleAction = (action?: string, payload?: string) => {
        if (!action) return;

        if (action === 'alert') {
            let message = payload || 'Button clicked!';
            // Substitute state variables like {userName}
            message = message.replace(/\{(\w+)\}/g, (_, key) => formState[key] || `[${key}]`);
            alert(message);
        } else if (action === 'reset') {
            setFormState({});
        }
    };

    const renderComponent = (item: DynamicPageComponent, index: number) => {
        const { type, props } = item;
        const stateKey = props?.bindToState;

        switch (type) {
            case 'heading':
                return <h1 key={index} className="text-3xl font-bold text-gray-800 dark:text-gray-100">{props?.content}</h1>;
            case 'paragraph':
                return <p key={index} className="text-gray-600 dark:text-gray-300 my-4">{props?.content}</p>;
            case 'input':
                return (
                    <div key={index} className="my-4 w-full">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{props?.content}</label>
                        <input 
                            type="text" 
                            placeholder={props?.placeholder || ''} 
                            value={stateKey ? formState[stateKey] || '' : undefined}
                            onChange={stateKey ? (e) => handleInputChange(stateKey, e.target.value) : undefined}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" 
                        />
                    </div>
                );
            case 'button':
                return <button 
                            key={index} 
                            onClick={() => handleAction(props?.onClickAction, props?.actionPayload)}
                            className="w-full my-4 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            {props?.content}
                        </button>;
            case 'spacer':
                 const sizeClass = props?.size === 'large' ? 'h-12' : props?.size === 'small' ? 'h-4' : 'h-8';
                 return <div key={index} className={sizeClass}></div>;
            default:
                if (!type || !props) {
                    return <div key={index} className="p-2 my-2 bg-red-100 text-red-700 text-xs rounded">Invalid component data</div>;
                }
                return null;
        }
    };
    
    return (
        <PullToRefresh 
            onRefresh={fetchPageData}
            className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 overflow-y-auto pb-24"
        >
            <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </Link>
                 <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{pageData?.title || 'Feature'}</h1>
                 </div>
                 <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6">
                {loading && <LoadingSpinner />}
                {error && !loading && <NotFound />}
                {pageData && !loading && !error && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        {pageData.layout.items.map(renderComponent)}
                    </div>
                )}
            </main>
        </PullToRefresh>
    );
};

export default DynamicFeaturePage;
