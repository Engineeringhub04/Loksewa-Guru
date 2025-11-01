import React from 'react';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/solid';

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  createdAt: number | any; // Can be number for guests or Firestore Timestamp for users
}

interface AIChatSideBarProps {
    isOpen: boolean;
    onClose: () => void;
    isLoggedIn: boolean;
    onNewChat: () => void;
    chats: ChatSession[];
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
    onDeleteChat: (id: string) => void;
}

const AIChatSideBar: React.FC<AIChatSideBarProps> = ({
    isOpen,
    onClose,
    isLoggedIn,
    onNewChat,
    chats,
    activeChatId,
    onSelectChat,
    onDeleteChat
}) => {
    // Sort by createdAt, handling number, Firestore Timestamp, and JS Date objects
    const sortedChats = [...chats].sort((a, b) => {
        const getTime = (createdAtValue: any): number => {
            // Handle null during Firestore pending writes - treat as newest
            if (createdAtValue === null) {
                return Date.now();
            }
            // Handle number (from guest mode's Date.now())
            if (typeof createdAtValue === 'number') {
                return createdAtValue;
            }
            // Handle Firestore Timestamp
            if (createdAtValue && typeof createdAtValue.toMillis === 'function') {
                return createdAtValue.toMillis();
            }
            // Handle JavaScript Date object
            if (createdAtValue && typeof createdAtValue.getTime === 'function') {
                return createdAtValue.getTime();
            }
            return 0; // Fallback for other unexpected types
        };

        const timeA = getTime(a.createdAt);
        const timeB = getTime(b.createdAt);

        return timeB - timeA;
    });

    return (
        <div className={`fixed inset-0 z-[60] ${isOpen ? '' : 'pointer-events-none'}`} role="dialog" aria-modal="true">
            <div 
                className={`absolute inset-0 bg-black transition-opacity duration-300 ${isOpen ? 'bg-opacity-50' : 'bg-opacity-0'}`} 
                onClick={onClose}
                aria-hidden="true"
            ></div>
            <div 
                className={`relative w-80 max-w-[90vw] h-full bg-white dark:bg-gray-800 shadow-xl flex flex-col transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-4 border-b dark:border-gray-700">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input type="text" placeholder="Search chats..." className="w-full bg-gray-100 dark:bg-gray-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    </div>
                </div>

                {!isLoggedIn && (
                    <div className="p-4 border-b dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            You are in guest mode. Chats are not saved. Please log in to save your conversations.
                        </p>
                    </div>
                )}
                
                <div className="p-4">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <PlusIcon className="h-5 w-5" /> New Chat
                    </button>
                </div>
                
                <nav className="flex-1 overflow-y-auto px-2">
                    <p className="px-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Recent</p>
                    <ul>
                        {sortedChats.map(chat => (
                            <li key={chat.id}>
                                <button
                                    onClick={() => onSelectChat(chat.id)}
                                    className={`w-full text-left flex items-center justify-between p-2 rounded-lg group ${activeChatId === chat.id ? 'bg-purple-100 dark:bg-purple-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    <span className="text-sm font-medium truncate flex-1 pr-2">{chat.title}</span>
                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                            aria-label="Delete chat"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
};

export default AIChatSideBar;