import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, getDocs, doc, getDoc, orderBy, Timestamp } from 'firebase/firestore';
import type { AuthUser } from '../../types';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/solid';

// Replicating types from AIChatPage
interface ChatPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}
interface ChatMessage {
    role: 'user' | 'model';
    parts: ChatPart[];
}
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

const AdminUserChatDetailPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    
    const [user, setUser] = useState<AuthUser | null>(null);
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            navigate('/admin/user-chats');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch user details
                const userDocRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setUser({
                        uid: userSnap.id,
                        ...data,
                        subscriptionExpiry: data.subscriptionExpiry ? (data.subscriptionExpiry as Timestamp).toDate() : null
                    } as AuthUser);
                } else {
                    throw new Error("User not found");
                }

                // Fetch user's chats
                const chatsQuery = query(collection(db, `users/${userId}/chats`), orderBy('createdAt', 'desc'));
                const chatsSnap = await getDocs(chatsQuery);
                const chatsList = chatsSnap.docs.map(d => {
                    const data = d.data();
                    const createdAtValue = data.createdAt;
                    let createdAtDate: Date;

                    if (createdAtValue && typeof createdAtValue.toDate === 'function') {
                        // It's a Firestore Timestamp
                        createdAtDate = (createdAtValue as Timestamp).toDate();
                    } else if (typeof createdAtValue === 'number') {
                        // It's a number (milliseconds from epoch)
                        createdAtDate = new Date(createdAtValue);
                    } else if (createdAtValue instanceof Date) {
                        // It's already a Date object
                        createdAtDate = createdAtValue;
                    } else {
                        // Fallback for null, undefined, or other types
                        createdAtDate = new Date();
                    }

                    return {
                        id: d.id,
                        ...data,
                        createdAt: createdAtDate
                    } as ChatSession;
                });

                setChats(chatsList);
                
                // Select the first chat by default if available
                if (chatsList.length > 0) {
                    setSelectedChat(chatsList[0]);
                }

            } catch (error) {
                console.error("Error fetching chat details:", error);
                navigate('/admin/user-chats');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, navigate]);

    if (loading) {
        return <div className="p-6">Loading chat history...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-[calc(100vh-120px)] flex flex-col">
            <header className="flex items-center mb-4 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate('/admin/user-chats')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Chat History for {user?.fullName}</h1>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Chat List */}
                <aside className="w-1/3 border-r dark:border-gray-700 pr-4 overflow-y-auto">
                    <h2 className="font-semibold mb-2">Conversations</h2>
                    <div className="space-y-2">
                        {chats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`w-full text-left p-2 rounded-md transition-colors ${selectedChat?.id === chat.id ? 'bg-purple-100 dark:bg-purple-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <p className="font-medium text-sm truncate">{chat.title}</p>
                                <p className="text-xs text-gray-500">{chat.createdAt.toLocaleString()}</p>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Message View */}
                <main className="w-2/3 overflow-y-auto pr-2">
                    {selectedChat ? (
                        <div className="space-y-4">
                            {selectedChat.messages.map((msg, index) => (
                                <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%]`}>
                                        <div className={`px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                            {msg.parts.map((part, i) => (
                                                <div key={i}>
                                                    {part.text && <p className="whitespace-pre-wrap">{part.text}</p>}
                                                    {part.inlineData && <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="User upload" className="rounded-lg max-w-full h-auto mt-2" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                           {chats.length > 0 ? <p>Select a conversation to view.</p> : <p>This user has no saved conversations.</p>}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminUserChatDetailPage;