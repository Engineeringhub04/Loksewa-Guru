
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (isOpen) {
            // Initialize chat session when modal opens for the first time
            if (!chat) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const chatSession = ai.chats.create({
                        model: 'gemini-2.5-flash',
                        config: {
                            systemInstruction: "You are Loksewa AI Guru, an expert assistant for Nepali students preparing for Loksewa (civil service) exams. Answer all questions concisely and accurately, focusing on topics relevant to the exams. Communicate primarily in English, but you can use Nepali if the user asks.",
                        },
                    });
                    setChat(chatSession);
                    setMessages([{ role: 'model', text: 'Namaste! I am Loksewa AI Guru. How can I help you with your exam preparation today?' }]);
                } catch (error) {
                    console.error("Failed to initialize AI Chat:", error);
                    setMessages([{ role: 'model', text: 'Sorry, I am unable to connect to the AI service right now. Please check your API Key configuration.' }]);
                }
            }
        }
    }, [isOpen, chat]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chat) return;

        const userMessage: ChatMessage = { role: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const resultStream = await chat.sendMessageStream({ message: userMessage.text });
            
            let currentText = '';
            setMessages(prev => [...prev, { role: 'model', text: '' }]); // Add a placeholder for the model's response

            for await (const chunk of resultStream) {
                currentText += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = currentText;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, { role: 'model', text: 'I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md mx-auto h-[90%] rounded-t-2xl flex flex-col animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-purple-500" />
                        <h2 className="text-lg font-bold">Loksewa AI Guru</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => {
                        const isStreamingPlaceholder = isLoading && msg.role === 'model' && index === messages.length - 1 && !msg.text;
                        
                        if (isStreamingPlaceholder) {
                             return (
                                <div key={index} className="flex justify-start">
                                    <div className="max-w-xs px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        
                        return (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </main>

                <footer className="p-4 border-t dark:border-gray-700">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask me anything about Loksewa..."
                            className="flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="p-3 bg-purple-600 text-white rounded-full disabled:bg-gray-400">
                            <PaperAirplaneIcon className="h-6 w-6" />
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default AIChatModal;
