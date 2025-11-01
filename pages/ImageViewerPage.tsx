import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon, PencilIcon } from '@heroicons/react/24/solid';

const ImageViewerPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Extract data passed from AIChatPage
    const { imageData, prompt } = location.state || {};
    const { mimeType, data: base64Data } = imageData || {};

    if (!base64Data) {
        // Handle case where no image data is provided, navigate back
        React.useEffect(() => {
            navigate(-1);
        }, [navigate]);
        return null;
    }

    const imageUrl = `data:${mimeType};base64,${base64Data}`;

    const handleDownload = () => {
        // Create filename from the first word of the prompt
        const firstWord = prompt?.split(' ')[0] || 'Image';
        const filename = `${firstWord.replace(/[^a-zA-Z0-9]/g, '')}-Loksewa_Guru_Ai.png`;

        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEdit = () => {
        // Navigate back to chat and pass the image data for editing
        navigate('/ai-chat', { 
            state: { 
                imageToEdit: { 
                    data: base64Data, 
                    mimeType: mimeType,
                    preview: imageUrl 
                } 
            } 
        });
    };

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-black text-white">
            <header className="flex items-center justify-between p-2 bg-black/50 backdrop-blur-sm z-10">
                <button onClick={() => navigate(-1)} className="p-2">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <span className="text-lg font-semibold">Image Preview</span>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <img src={imageUrl} alt={prompt || 'Generated Image'} className="max-w-full max-h-full object-contain" />
            </main>

            <footer className="flex items-center justify-around p-4 bg-black/50 backdrop-blur-sm z-10 border-t border-gray-700">
                <button onClick={handleDownload} className="flex flex-col items-center gap-1 text-gray-300 hover:text-white">
                    <ArrowDownTrayIcon className="h-7 w-7" />
                    <span className="text-xs font-semibold">Save</span>
                </button>
                <button onClick={handleEdit} className="flex flex-col items-center gap-1 text-gray-300 hover:text-white">
                    <PencilIcon className="h-7 w-7" />
                    <span className="text-xs font-semibold">Edit</span>
                </button>
            </footer>
        </div>
    );
};

export default ImageViewerPage;