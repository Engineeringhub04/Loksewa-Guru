import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { GoogleGenAI, Modality, LiveServerMessage, Blob as GenaiBlob } from "@google/genai";
import { db } from '../services/firebase';
import { collection, query, onSnapshot, addDoc, setDoc, deleteDoc, orderBy, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { 
    PlusIcon, 
    MicrophoneIcon, 
    SparklesIcon, 
    UserCircleIcon, 
    CameraIcon, 
    PhotoIcon, 
    Bars3Icon,
    XMarkIcon,
    CheckIcon,
    DocumentIcon,
    CpuChipIcon,
    PaintBrushIcon,
    XCircleIcon,
    StopCircleIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ClipboardDocumentIcon,
    ArrowPathIcon,
    PencilIcon,
    ExclamationCircleIcon,
    PaperAirplaneIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/solid';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AIChatSideBar from '../components/AIChatSideBar';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToast } from '../contexts/ToastContext';
import type { ChatMessage, ChatSession, ChatPart } from '../types';


// --- AUDIO UTILITY FUNCTIONS ---
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): GenaiBlob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}


// --- HELPER FUNCTIONS ---
const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

const createNewChat = (isFirestore: boolean): Omit<ChatSession, 'createdAt'> & { createdAt: number | any } => {
    const newId = `chat_${Date.now()}`;
    return {
        id: newId,
        title: "New Chat",
        messages: [{ 
            id: `model_${Date.now()}`,
            role: 'model', 
            parts: [{ text: 'Namaste! I am Loksewa AI Guru. How can I help you today?' }] 
        }],
        createdAt: isFirestore ? serverTimestamp() : Date.now(),
    };
};

const availableModels = [
    { id: 'gemini-2.5-flash', name: '1.0 normal', description: 'Fast and efficient for general queries.', pro: false },
    { id: 'gemini-2.5-pro', name: '1.0 pro', description: 'Advanced reasoning for complex topics.', pro: true },
    { id: 'gemini-flash-latest', name: '1.0 flash', description: 'Our latest and fastest model.', pro: true },
];

const voices = [
    { id: 'Zephyr', name: 'Zephyr (Male)' },
    { id: 'Kore', name: 'Kore (Female)' },
    { id: 'Puck', name: 'Puck (Male)' },
    { id: 'Charon', name: 'Charon (Male)' },
    { id: 'Fenrir', name: 'Fenrir (Male)' },
];

// --- ACTION POPUP COMPONENT ---
interface ActionItem {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

interface ActionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  items: ActionItem[];
}

const ActionPopup: React.FC<ActionPopupProps> = ({ isOpen, onClose, items }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 w-full max-w-md mx-auto rounded-t-2xl p-4 animate-slide-in-up" onClick={e => e.stopPropagation()}>
        <div className="grid grid-cols-4 gap-4 text-center">
          {items.map((item, index) => (
            <button key={index} onClick={item.onClick} className="flex flex-col items-center gap-2 text-gray-300 hover:text-white">
              <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center">
                <item.icon className="h-7 w-7" />
              </div>
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


// --- VOICE CHAT MODAL COMPONENT ---
const VoiceChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    speakerStatus: 'idle' | 'listening' | 'speaking' | 'thinking';
    liveUserTranscript: string;
    liveModelTranscript: string;
    isMuted: boolean;
    toggleMute: () => void;
    selectedVoice: string;
    handleChangeVoice: (voice: string) => void;
    voiceChatLogoUrl: string;
}> = ({ isOpen, onClose, speakerStatus, liveUserTranscript, liveModelTranscript, isMuted, toggleMute, selectedVoice, handleChangeVoice, voiceChatLogoUrl }) => {
    const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
    const [confirmState, setConfirmState] = useState<{isOpen: boolean, voiceId: string | null}>({isOpen: false, voiceId: null});

    if (!isOpen) return null;

    const statusMap = {
        listening: 'Listening...',
        speaking: 'AI is speaking...',
        thinking: 'Connecting...',
        idle: 'Idle'
    };

    const handleVoiceSelection = (voiceId: string) => {
        if (voiceId === selectedVoice) {
            setIsVoiceSelectorOpen(false);
            return;
        }
        setConfirmState({ isOpen: true, voiceId: voiceId });
    };

    const handleConfirmVoiceChange = () => {
        if (confirmState.voiceId) {
            handleChangeVoice(confirmState.voiceId);
        }
        setConfirmState({ isOpen: false, voiceId: null });
        setIsVoiceSelectorOpen(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-gray-900/90 backdrop-blur-sm animate-fade-in">
            <ConfirmationModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({isOpen: false, voiceId: null})}
                onConfirm={handleConfirmVoiceChange}
                title="Change Voice?"
                message="Changing the voice will restart the current voice session and save your progress. Continue?"
                confirmText="Restart"
                cancelText="Cancel"
            />
            {/* Top Controls */}
            <div className="w-full flex justify-between items-center">
                <div className="relative">
                    <button onClick={() => setIsVoiceSelectorOpen(p => !p)} className="px-4 py-2 bg-black/40 text-white text-sm rounded-full flex items-center gap-2 backdrop-blur-sm">
                        Change Voice
                    </button>
                    {isVoiceSelectorOpen && (
                         <div className="absolute top-full mt-2 w-48 bg-gray-800 text-white rounded-lg shadow-lg animate-fade-in-scale">
                             {voices.map(voice => (
                                 <button key={voice.id} onClick={() => handleVoiceSelection(voice.id)} className="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center">
                                     <span>{voice.name}</span>
                                     {selectedVoice === voice.id && <CheckIcon className="h-5 w-5 text-green-400" />}
                                 </button>
                             ))}
                         </div>
                    )}
                </div>
                 <button onClick={onClose} className="p-2 text-white/70 hover:text-white">
                    <XMarkIcon className="h-8 w-8" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex flex-col items-center justify-center gap-6 text-white text-center">
                <div className={`relative h-48 w-48 flex items-center justify-center`}>
                    {speakerStatus === 'listening' && !isMuted &&
                        <div className="absolute inset-0 rounded-full animate-glow-purple"></div>
                    }
                    {speakerStatus === 'speaking' &&
                        <>
                            <div className="absolute inset-0 rounded-full animate-glow-blue"></div>
                            <div className="absolute inset-0 rounded-full p-1 animate-border-spin" style={{ background: 'conic-gradient(from 0deg, rgba(59, 130, 246, 0), rgba(59, 130, 246, 1), rgba(59, 130, 246, 0) 50%)' }}></div>
                        </>
                    }
                    <div className="relative h-40 w-40 rounded-full bg-purple-500/10 overflow-hidden flex items-center justify-center shadow-inner">
                        {voiceChatLogoUrl && voiceChatLogoUrl.trim() !== '' ? (
                            <img src={voiceChatLogoUrl} alt="AI Chat" className="w-full h-full object-cover" />
                        ) : (
                            <SparklesIcon className={`h-24 w-24 text-purple-400 transition-transform duration-500 ${speakerStatus === 'thinking' ? 'animate-pulse' : ''}`}/>
                        )}
                    </div>
                </div>
                <p className="text-xl font-medium">{isMuted ? 'Muted' : statusMap[speakerStatus]}</p>
                
                <div className="h-24 text-lg text-gray-300">
                    <p className="transition-opacity duration-300" style={{ opacity: liveUserTranscript ? 1 : 0 }}>
                        <span className="font-semibold text-blue-400">You: </span>{liveUserTranscript}
                    </p>
                    <p className="transition-opacity duration-300" style={{ opacity: liveModelTranscript ? 1 : 0 }}>
                        <span className="font-semibold text-purple-400">AI: </span>{liveModelTranscript}
                    </p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="w-full flex justify-center items-center px-4 mb-8">
                <button
                    onClick={toggleMute}
                    className="flex flex-col items-center justify-center gap-2 text-white transition-transform transform hover:scale-105"
                >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${isMuted ? 'bg-gray-600' : 'bg-purple-600'}`}>
                        {isMuted ? <SpeakerXMarkIcon className="h-10 w-10"/> : <SpeakerWaveIcon className="h-10 w-10"/>}
                    </div>
                    <span className="text-sm font-semibold mt-1">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
            </div>
        </div>
    );
};

// --- FEEDBACK MODAL COMPONENTS ---

const LikeFeedbackModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (message: string) => void }> = ({ isOpen, onClose, onSubmit }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = () => {
        onSubmit(message);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 w-full max-w-md mx-auto rounded-t-2xl p-4 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-white mb-2">Provide additional feedback</h3>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="What did you like about this response?"
                    className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                />
                <button onClick={handleSubmit} className="w-full mt-3 bg-purple-600 text-white font-semibold py-2 rounded-lg">
                    Submit
                </button>
            </div>
        </div>
    );
};

const DislikeFeedbackModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (data: { reasons: string[]; message: string }) => void }> = ({ isOpen, onClose, onSubmit }) => {
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const reasons = ["Harmful AI", "Doesn't Follow Instructions", "Not True", "Slow Response", "Other"];

    const toggleReason = (reason: string) => {
        setSelectedReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]);
    };

    const handleSubmit = () => {
        onSubmit({ reasons: selectedReasons, message });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 w-full max-w-md mx-auto rounded-t-2xl p-4 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-white mb-1">Help us improve our AI Response for you</h3>
                <p className="text-sm text-gray-400 mb-4">How do you like to describe your experience with the AI Response today?</p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {reasons.map(reason => (
                        <button key={reason} onClick={() => toggleReason(reason)} className={`px-3 py-1.5 text-sm rounded-full border ${selectedReasons.includes(reason) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}>
                            {reason}
                        </button>
                    ))}
                </div>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Provide Additional Feedback (optional)"
                    className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                />
                <button onClick={handleSubmit} className="w-full mt-3 bg-purple-600 text-white font-semibold py-2 rounded-lg">
                    Submit Feedback
                </button>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---
const AIChatPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoggedIn } = useAuth();
    const { appLogoUrl, aiChatLogoUrl, voiceChatLogoUrl, aiResponseLogoUrl } = useData();
    const { showToast } = useToast();

    // UI State
    const [isSideBarOpen, setIsSideBarOpen] = useState(false);
    const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [activePopup, setActivePopup] = useState<'plus' | null>(null);
    const [specialMode, setSpecialMode] = useState<'deep-research' | 'create-image' | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [feedbackModalState, setFeedbackModalState] = useState<{ isOpen: boolean; type: 'liked' | 'disliked' | null; message: ChatMessage | null }>({ isOpen: false, type: null, message: null });
    const [thinkingTime, setThinkingTime] = useState(0);
    const [showThinkingDetails, setShowThinkingDetails] = useState(false);

    // Data State
    const [allChats, setAllChats] = useState<ChatSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [imageToSend, setImageToSend] = useState<{ mimeType: string; data: string; preview: string; } | null>(null);
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

    // Voice & TTS State
    const [voiceChatState, setVoiceChatState] = useState<'idle' | 'connecting' | 'in_progress' | 'ending'>('idle');
    const [speakerStatus, setSpeakerStatus] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('Zephyr');
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

    // AI & Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatCollectionRef = useMemo(() => isLoggedIn && user ? collection(db, `users/${user.uid}/chats`) : null, [isLoggedIn, user]);
    const feedbackSubmittedRef = useRef(false);
    const isCancelledRef = useRef(false);
    const thinkingTimerRef = useRef<number | null>(null);

    // Voice Refs
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const isMutedRef = useRef(false);

    // --- EFFECTS ---

    // Effect to handle receiving an image for editing from the ImageViewerPage
    useEffect(() => {
        if (location.state?.imageToEdit) {
            const { imageToEdit } = location.state;
            setImageToSend(imageToEdit);
            setSpecialMode('create-image');
            // Clear the state to prevent re-triggering on navigation
            navigate(location.pathname, { replace: true, state: {} });
            // Focus textarea
            textareaRef.current?.focus();
            showToast('Image loaded for editing. Describe your changes.', 'info');
        }
    }, [location.state, navigate, showToast]);

    // Main effect to load chat history based on login state
    useEffect(() => {
        if (!isLoggedIn) {
            // Guest mode: Chat state is temporary and not persisted.
            // It will be lost on refresh, matching user request.
            const guestChat = createNewChat(false);
            setAllChats([guestChat as ChatSession]);
            setActiveChatId(guestChat.id);
            return;
        }
    
        if (chatCollectionRef) {
            const q = query(chatCollectionRef, orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (snapshot.empty) {
                    const newChatData = createNewChat(true);
                    const { id, ...chatData } = newChatData;
                    addDoc(chatCollectionRef, chatData);
                } else {
                    const chatsFromDb = snapshot.docs.map(doc => {
                        const data = doc.data();
                        const createdAtValue = data.createdAt;
                        const createdAtNumber = (createdAtValue && typeof createdAtValue.toDate === 'function')
                            ? (createdAtValue as Timestamp).toDate().getTime()
                            : Date.now();

                        return {
                            id: doc.id,
                            title: data.title,
                            messages: data.messages,
                            createdAt: createdAtNumber,
                        } as ChatSession;
                    });
                    
                    setAllChats(chatsFromDb);
                    
                    const currentActiveChatExists = chatsFromDb.some(c => c.id === activeChatId);
                    if (!activeChatId || !currentActiveChatExists) {
                        setActiveChatId(chatsFromDb[0].id);
                    }
                }
            });
            return () => unsubscribe();
        }
    }, [isLoggedIn, chatCollectionRef]);
    
    const activeChat = useMemo(() => allChats.find(c => c.id === activeChatId), [allChats, activeChatId]);
    const activeChatMessages = useMemo(() => activeChat?.messages || [], [activeChat]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChatMessages, loadingChatId, liveUserTranscript, liveModelTranscript]);


    // --- HANDLERS ---
    
    const handleNewChat = async () => {
        const newChat = createNewChat(isLoggedIn);
        if (isLoggedIn && chatCollectionRef) {
            const { id, ...chatData } = newChat;
            const docRef = await addDoc(chatCollectionRef, chatData);
            setActiveChatId(docRef.id);
        } else {
            setAllChats(prev => [newChat as ChatSession, ...prev.filter(c => c.messages.length > 1)]);
            setActiveChatId(newChat.id);
        }
        setIsSideBarOpen(false);
    };

    const handleSelectChat = (chatId: string) => {
        setActiveChatId(chatId);
        setIsSideBarOpen(false);
    };

    const handleDeleteChat = async (chatId: string) => {
        if (!window.confirm("Are you sure you want to delete this chat?")) return;

        if (isLoggedIn && chatCollectionRef) {
            await deleteDoc(doc(chatCollectionRef, chatId));
        } else {
             setAllChats(prev => {
                const newChats = prev.filter(c => c.id !== chatId);
                if (chatId === activeChatId) {
                    setActiveChatId(newChats[0]?.id || null);
                     if (newChats.length === 0) {
                        const newChat = createNewChat(false);
                        setActiveChatId(newChat.id);
                        return [newChat as ChatSession];
                    }
                }
                return newChats;
            });
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        
        const base64Data = await blobToBase64(file);
        setImageToSend({
            mimeType: file.type,
            data: base64Data,
            preview: URL.createObjectURL(file),
        });
    };

    const handleStopGeneration = () => {
        isCancelledRef.current = true;
    };

    const handleSendMessage = useCallback(async (
        messageIndexToRetry?: number
    ) => {
        isCancelledRef.current = false;
        const chatIdForRequest = activeChatId;
        if (loadingChatId || !chatIdForRequest) return;
    
        const currentChat = allChats.find(c => c.id === chatIdForRequest);
        if (!currentChat) return;
    
        let userMessage: ChatMessage;
        let messageHistoryForUpdate: ChatMessage[];
        let isEditing = !!editingMessage;
        let originalInput = input;
    
        if (messageIndexToRetry !== undefined) {
            if (messageIndexToRetry < 0 || messageIndexToRetry >= currentChat.messages.length) return;
            const messageToRetry = currentChat.messages[messageIndexToRetry];
            if (messageToRetry.role !== 'user') return;
            userMessage = { ...messageToRetry, error: null };
            messageHistoryForUpdate = [...currentChat.messages.slice(0, messageIndexToRetry), userMessage];
            originalInput = userMessage.parts.find(p => p.text)?.text || '';
        } else {
            if (!input.trim() && !imageToSend) return;
            const userParts: ChatPart[] = [];
            if (imageToSend) userParts.push({ inlineData: { mimeType: imageToSend.mimeType, data: imageToSend.data } });
            
            const finalInput = input.trim();
            if (finalInput) userParts.push({ text: finalInput });
            originalInput = finalInput;
    
            if (isEditing) {
                userMessage = { ...editingMessage!, parts: userParts, error: null };
                const originalIndex = currentChat.messages.findIndex(m => m.id === editingMessage.id);
                messageHistoryForUpdate = [...currentChat.messages.slice(0, originalIndex), userMessage];
            } else {
                userMessage = { id: `user_${Date.now()}`, role: 'user', parts: userParts };
                messageHistoryForUpdate = [...currentChat.messages, userMessage];
            }
        }
        
        if (!navigator.onLine) {
            const offlineUserMessage = { ...userMessage, error: 'network' as const };
            const finalMessages = isEditing ? messageHistoryForUpdate.slice(0, -1).concat(offlineUserMessage) : [...currentChat.messages, offlineUserMessage];
            setAllChats(prev => prev.map(c => c.id === chatIdForRequest ? { ...c, messages: finalMessages } : c));
            setInput(''); setImageToSend(null); setEditingMessage(null); return;
        }
    
        const modelPlaceholder: ChatMessage = { id: `model_${Date.now()}`, role: 'model', parts: [] };
        const isFirstUserMessage = currentChat.messages.filter(m => m.role === 'user').length === 0 && !isEditing;
        const newTitle = isFirstUserMessage ? (userMessage.parts.find(p => p.text)?.text || 'New Chat').substring(0, 30) : currentChat.title;
    
        setAllChats(prev => prev.map(c => c.id === chatIdForRequest ? { ...c, title: newTitle, messages: [...messageHistoryForUpdate, modelPlaceholder] } : c));
        setLoadingChatId(chatIdForRequest);
        if (specialMode === 'deep-research') {
            setLoadingMessage("Loksewa Guru Ai is Thinking...");
            setThinkingTime(0);
            if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
            thinkingTimerRef.current = window.setInterval(() => {
                setThinkingTime(prev => prev + 1);
            }, 1000);
        }
        setInput('');
        setImageToSend(null);
        setEditingMessage(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const isImageModeActive = specialMode === 'create-image';
            const lastMessage = currentChat.messages[currentChat.messages.length - 1];
            const lastMessageIsImage = lastMessage?.role === 'model' && lastMessage.parts.some(p => p.inlineData?.mimeType.startsWith('image/'));
            
            const imageKeywords = ['image', 'photo', 'picture', 'drawing', 'painting', 'logo', 'icon', 'graphic', 'art', 'draw', 'paint', 'create', 'generate', 'make', 'design', 'render', 'edit', 'add', 'change', 'remove', 'put', 'wear', 'turn into', 'in the style of', 'look like', 'hat', 'sunglasses', 'background', 'color'];
            const isImagePrompt = imageKeywords.some(keyword => originalInput.toLowerCase().includes(keyword));
            const isExplicitNewImageRequest = originalInput.toLowerCase().includes('new image') || originalInput.toLowerCase().includes('start over');
            const isImplicitEdit = lastMessageIsImage && !isExplicitNewImageRequest;
    
            const isImageCall = !!imageToSend || (isImageModeActive && (isImagePrompt || isImplicitEdit));
            const isTextPromptInImageMode = isImageModeActive && !isImageCall;

            const contentsForApi = messageHistoryForUpdate.map(msg => ({ role: msg.role, parts: msg.parts }));

            if (specialMode === 'deep-research') {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: contentsForApi as any,
                    config: { tools: [{ googleSearch: {} }] },
                });

                let fullText = response.text;
                const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (groundingChunks && groundingChunks.length > 0) {
                    const sources = groundingChunks
                        .map((chunk: any) => chunk.web)
                        .filter((web: any) => web && web.uri)
                        .map((web: any) => `[${web.title || web.uri}](${web.uri})`);
                    
                    if (sources.length > 0) {
                        const uniqueSources = [...new Set(sources)];
                        fullText += `\n\n**Sources:**\n* ${uniqueSources.join('\n* ')}`;
                    }
                }
                const finalModelMessage: ChatMessage = { ...modelPlaceholder, parts: [{ text: fullText }] };
                const finalMessages = [...messageHistoryForUpdate, finalModelMessage];

                setAllChats(prev => prev.map(c => c.id === chatIdForRequest ? { ...c, messages: finalMessages } : c));
                if (isLoggedIn && chatCollectionRef) {
                    await updateDoc(doc(chatCollectionRef, chatIdForRequest), { title: newTitle, messages: finalMessages });
                }

            } else if (isImageCall) {
                setLoadingMessage("Generating an image, please wait...");
    
                const partsForApi: ChatPart[] = [...userMessage.parts];
                if (lastMessageIsImage && !imageToSend && !isExplicitNewImageRequest) {
                    const lastImagePart = lastMessage.parts.find(p => p.inlineData);
                    if (lastImagePart) partsForApi.unshift(lastImagePart);
                }
    
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: partsForApi },
                    config: { responseModalities: [Modality.IMAGE] },
                });
    
                const modelParts: ChatPart[] = response.candidates?.[0]?.content?.parts.map(part => part) || [];
                if (modelParts.length === 0) throw new Error("AI did not return an image.");
    
                const finalModelMessage: ChatMessage = { ...modelPlaceholder, parts: modelParts };
                const finalMessages = [...messageHistoryForUpdate, finalModelMessage];
    
                setAllChats(prev => prev.map(c => c.id === chatIdForRequest ? { ...c, messages: finalMessages } : c));
                if (isLoggedIn && chatCollectionRef) {
                    await updateDoc(doc(chatCollectionRef, chatIdForRequest), { title: newTitle, messages: finalMessages });
                }
    
            } else { // Text generation (normal or in image mode)
                const systemInstruction = isTextPromptInImageMode
                    ? "You are Loksewa AI Guru. IMPORTANT: The user is in 'Image Mode' but has asked a text question. Provide a very brief, concise answer (max 2-3 sentences). After your answer, on a new line, include this exact text without any modification: <highlight>For more detailed answers, please turn off 'Create Image' mode.</highlight>"
                    : "You are Loksewa AI Guru, an expert assistant for Nepali students preparing for Loksewa (civil service) exams. Answer all questions concisely and accurately. Communicate primarily in English, but you can use Nepali if the user asks.";

                const stream = await ai.models.generateContentStream({
                    model: selectedModel,
                    contents: contentsForApi as any,
                    config: { systemInstruction }
                });
    
                let fullText = '';
                for await (const chunk of stream) {
                    if (isCancelledRef.current) break;
                    fullText += chunk.text;
                    setAllChats(prev => prev.map(c => {
                        if (c.id === chatIdForRequest) {
                            const updatedMessages = [...c.messages];
                            const lastMsg = updatedMessages[updatedMessages.length - 1];
                            if (lastMsg?.role === 'model') {
                                lastMsg.parts = [{ text: fullText }];
                            }
                            return { ...c, messages: updatedMessages };
                        }
                        return c;
                    }));
                }
    
                if (isCancelledRef.current) fullText += "\n\n[Response generation stopped]";
    
                if (isLoggedIn && chatCollectionRef && chatIdForRequest) {
                    const finalModelMessage: ChatMessage = { ...modelPlaceholder, parts: [{ text: fullText }] };
                    const finalMessages = [...messageHistoryForUpdate, finalModelMessage];
                    await updateDoc(doc(chatCollectionRef, chatIdForRequest), { title: newTitle, messages: finalMessages });
                }
            }
    
        } catch (error) {
            const errorMsg: ChatMessage = { ...modelPlaceholder, parts: [{ text: `Sorry, I ran into an issue: ${(error as Error).message}` }], error: 'api' };
            const errorMessages = [...messageHistoryForUpdate, errorMsg];
            setAllChats(prev => prev.map(c => c.id === chatIdForRequest ? { ...c, messages: errorMessages } : c));
            if (isLoggedIn && chatCollectionRef) {
                updateDoc(doc(chatCollectionRef, chatIdForRequest), { messages: errorMessages });
            }
        } finally {
            setLoadingChatId(null);
            setLoadingMessage(null);
            if (thinkingTimerRef.current) {
                clearInterval(thinkingTimerRef.current);
                thinkingTimerRef.current = null;
            }
            setThinkingTime(0);
            setShowThinkingDetails(false);
        }
    }, [activeChatId, allChats, input, imageToSend, specialMode, selectedModel, isLoggedIn, chatCollectionRef, editingMessage, loadingChatId]);
    
    
    const handleModelSelect = (modelId: string) => {
        setSelectedModel(modelId);
        setIsModelSelectorOpen(false);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${e.target.scrollHeight}px`;
        }
    };

    const handleSetSpecialMode = (mode: 'deep-research' | 'create-image') => {
        setSpecialMode(prev => prev === mode ? null : mode);
        setActivePopup(null);
    };

    const handleCopy = (message: ChatMessage) => {
        const textToCopy = message.parts.map(p => p.text || '').join('\n');
        navigator.clipboard.writeText(textToCopy);
        showToast('Copied to clipboard!', 'info');
    };
    
    const submitAiFeedback = async (feedbackData: { aiRating: 'liked' | 'disliked'; dislikeReasons?: string[]; message?: string; }) => {
        if (!feedbackModalState.message || !activeChat) return;
        const { message: responseMessage } = feedbackModalState;
        const messageIndex = activeChat.messages.findIndex(m => m.id === responseMessage.id);
        const promptMessage = messageIndex > 0 ? activeChat.messages[messageIndex - 1] : null;
    
        if (promptMessage && promptMessage.role !== 'user') {
            console.error("Context error: message before model response is not from user.");
        }
    
        const feedbackPayload: any = {
            type: 'ai_chat',
            aiRating: feedbackData.aiRating,
            dislikeReasons: feedbackData.dislikeReasons || [],
            message: feedbackData.message || '',
            context: {
                prompt: promptMessage,
                response: responseMessage,
            },
            createdAt: serverTimestamp(),
            status: 'new',
            ...(user && { userId: user.uid, userEmail: user.email, userName: user.fullName }),
        };
    
        await addDoc(collection(db, 'feedback'), feedbackPayload);
    
        setAllChats(prev => prev.map(chat => {
            if (chat.id === activeChatId) {
                const newMessages = chat.messages.map(msg =>
                    msg.id === responseMessage.id ? { ...msg, feedback: feedbackData.aiRating } : msg
                );
                if (isLoggedIn && chatCollectionRef && activeChatId) {
                    updateDoc(doc(chatCollectionRef, activeChatId), { messages: newMessages });
                }
                return { ...chat, messages: newMessages };
            }
            return chat;
        }));
    };
    
    const handleFeedback = (message: ChatMessage, feedback: 'liked' | 'disliked') => {
        feedbackSubmittedRef.current = false;
        setFeedbackModalState({ isOpen: true, type: feedback, message });
    };

    const handleCloseFeedbackModal = () => {
        if (!feedbackSubmittedRef.current && feedbackModalState.type) {
            const defaultMessage = feedbackModalState.type === 'liked' ? 'The AI response was great!' : 'The AI response was not good enough.';
            submitAiFeedback({ aiRating: feedbackModalState.type, message: defaultMessage });
            showToast('Default feedback submitted.', 'info');
        }
        setFeedbackModalState({ isOpen: false, type: null, message: null });
    };

    const handleSpeak = (message: ChatMessage) => {
        if (speakingMessageId === message.id) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }

        window.speechSynthesis.cancel();
        const textToSpeak = message.parts.map(p => p.text || '').join(' ');
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setSpeakingMessageId(null);
        setSpeakingMessageId(message.id);
        window.speechSynthesis.speak(utterance);
    };

    const handleRegenerate = (messageIndex: number) => {
        if (!activeChat || messageIndex === 0) {
            showToast("Cannot regenerate the first message.", "info");
            return;
        }
        const userMessageIndexToRetry = messageIndex - 1;
        handleSendMessage(userMessageIndexToRetry);
    };

    const handleEdit = (message: ChatMessage) => {
        setEditingMessage(message);
        setInput(message.parts.find(p => p.text)?.text || '');
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };
    
    // --- VOICE CHAT FUNCTIONS ---

    const cleanup = useCallback(async () => {
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current?.disconnect();
        mediaStreamSourceRef.current = null;
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session?.close();
            } catch (e) { console.error("Error closing session:", e); }
            sessionPromiseRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') await inputAudioContextRef.current.close().catch(console.error);
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') await outputAudioContextRef.current.close().catch(console.error);
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        setSpeakerStatus('idle');
    }, []);

    const handleServerMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            setLiveModelTranscript(currentOutputTranscriptionRef.current);
            setSpeakerStatus('speaking');
        }
        if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            setLiveUserTranscript(currentInputTranscriptionRef.current);
            setSpeakerStatus('listening');
        }
        if (message.serverContent?.turnComplete) {
            const userText = currentInputTranscriptionRef.current.trim();
            const modelText = currentOutputTranscriptionRef.current.trim();
            setLiveUserTranscript('');
            setLiveModelTranscript('');
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';

            if (!userText && !modelText) {
                setSpeakerStatus('listening');
                return;
            }
            const newMessages: ChatMessage[] = [];
            if (userText) newMessages.push({ id: `user_voice_${Date.now()}`, role: 'user', parts: [{ text: userText }] });
            if (modelText) newMessages.push({ id: `model_voice_${Date.now()}`, role: 'model', parts: [{ text: modelText }] });
            
            setAllChats(prev => prev.map(c => {
                if (c.id === activeChatId) {
                    const updatedChat = { ...c, messages: [...c.messages, ...newMessages] };
                    if (isLoggedIn && chatCollectionRef && activeChatId) {
                        updateDoc(doc(chatCollectionRef, activeChatId), { messages: updatedChat.messages });
                    }
                    return updatedChat;
                }
                return c;
            }));
            setSpeakerStatus('listening');
        }
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            setSpeakerStatus('speaking');
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);
            source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) setSpeakerStatus('listening');
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
        }
        if (message.serverContent?.interrupted) {
            for (const source of audioSourcesRef.current.values()) {
                source.stop();
                audioSourcesRef.current.delete(source);
            }
            nextStartTimeRef.current = 0;
        }
    }, [activeChatId, isLoggedIn, chatCollectionRef]);

    const startVoiceChat = async (voiceNameToUse: string) => {
        await cleanup();
        setVoiceChatState('connecting');
        setSpeakerStatus('thinking');
        isMutedRef.current = false;
        setIsMuted(false);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setVoiceChatState('in_progress');
                        setSpeakerStatus('listening');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        scriptProcessor.onaudioprocess = (e) => {
                            if (isMutedRef.current) return;
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: (message: LiveServerMessage) => handleServerMessage(message),
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        cleanup();
                        setVoiceChatState('idle');
                    },
                    onclose: () => console.log('Session closed'),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceNameToUse } } },
                    systemInstruction: "You are Loksewa AI Guru. Keep your responses concise.",
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
        } catch (err) {
            console.error('Failed to start voice chat:', err);
            setVoiceChatState('idle');
            setSpeakerStatus('idle');
        }
    };
    
    const toggleMute = () => {
        const newMutedState = !isMutedRef.current;
        isMutedRef.current = newMutedState;
        setIsMuted(newMutedState);
    };

    const handleChangeVoice = async (newVoice: string) => {
        if (newVoice === selectedVoice) {
            return;
        }
        setSelectedVoice(newVoice);
        await startVoiceChat(newVoice);
    };


    const endVoiceChat = useCallback(() => {
        setVoiceChatState('ending');
        cleanup();
        setVoiceChatState('idle');
        setLiveUserTranscript('');
        setLiveModelTranscript('');
    }, [cleanup]);

    useEffect(() => {
        return () => {
            cleanup();
            window.speechSynthesis.cancel();
        }
    }, [cleanup]);
    
    const plusMenuItems: ActionItem[] = [
        { icon: CameraIcon, label: 'Camera', onClick: () => { cameraInputRef.current?.click(); setActivePopup(null); }},
        { icon: PhotoIcon, label: 'Gallery', onClick: () => { fileInputRef.current?.click(); setActivePopup(null); }},
        { icon: DocumentIcon, label: 'Document', onClick: () => { alert('Document upload is not yet implemented.'); setActivePopup(null); }},
    ];

    // --- RENDER ---
    const avatarUrl = user?.photoUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.fullName || 'User'}`;
    
    const MessagePart: React.FC<{ part: ChatPart; msg: ChatMessage; allMessages: ChatMessage[] }> = ({ part, msg, allMessages }) => {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
            const handleImageClick = () => {
                const messageIndex = allMessages.findIndex(m => m.id === msg.id);
                const userPromptMessage = messageIndex > 0 ? allMessages[messageIndex - 1] : null;
                const promptText = userPromptMessage?.parts.find(p => p.text)?.text || 'Generated-Image';
    
                navigate('/image-viewer', { 
                    state: { 
                        imageData: part.inlineData,
                        prompt: promptText 
                    } 
                });
            };
    
            return (
                <div>
                    <button onClick={handleImageClick} className="w-full block">
                        <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="Generated content" className="rounded-lg max-w-full h-auto" />
                    </button>
                    <p className="text-xs text-gray-400 mt-1 italic">Here is your image. Click to view.</p>
                </div>
            );
        }
        
        if (!part.text) return null;
        
        const markdownToHtml = (text: string): string => {
            const lines = text.split('\n');
            let html = '';
            let inList = false;
    
            for (const line of lines) {
                let processedLine = line
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>');
                
                if (processedLine.trim().startsWith('* ')) {
                    if (!inList) {
                        html += '<ul>';
                        inList = true;
                    }
                    html += `<li>${processedLine.trim().substring(2)}</li>`;
                } else {
                    if (inList) {
                        html += '</ul>';
                        inList = false;
                    }
                    if (processedLine.trim()) {
                        html += `<p>${processedLine}</p>`;
                    }
                }
            }
            if (inList) {
                html += '</ul>';
            }
            return html;
        };

        if (part.text.includes('<highlight>')) {
            const parts = part.text.split(/<highlight>(.*?)<\/highlight>/s);
            return (
                <div>
                    {parts.map((segment, index) => {
                        if (index % 2 === 1) { // This is the highlighted segment
                            return (
                                <div key={index} className="my-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 text-sm">
                                    <p>{segment}</p>
                                </div>
                            );
                        } else if (segment) { // This is regular text, parse it for markdown
                            return <div key={index} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-2" dangerouslySetInnerHTML={{ __html: markdownToHtml(segment) }} />;
                        }
                        return null;
                    })}
                </div>
            );
        }
    
        return <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-2" dangerouslySetInnerHTML={{ __html: markdownToHtml(part.text) }} />;
    };

    const ModelSelector: React.FC = () => {
        const isSubscribed = user?.subscriptionStatus === 'active';
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end animate-fade-in" onClick={() => setIsModelSelectorOpen(false)}>
                <div className="bg-white dark:bg-gray-800 w-full max-w-md mx-auto rounded-t-2xl p-4 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                    <div className="text-center mb-4"><h3 className="text-lg font-bold">Loksewa Guru Ai Models</h3></div>
                    <div className="space-y-3">
                        {availableModels.map(model => {
                            const isSelected = selectedModel === model.id;
                            const requiresUpgrade = model.pro && !isSubscribed;
                            return (
                                <div key={model.id} className={`p-3 rounded-lg border-2 ${isSelected ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-400'}`}>{isSelected && <CheckIcon className="w-4 h-4 text-white" />}</div>
                                            <div><p className="font-semibold">{`Loksewa Guru Ai (${model.name})`}</p><p className="text-xs text-gray-500 dark:text-gray-400">{model.description}</p></div>
                                        </div>
                                        {requiresUpgrade ? (
                                            <button onClick={() => navigate('/subscription')} className="px-3 py-1 text-sm font-semibold bg-yellow-500 text-white rounded-full hover:bg-yellow-600">Upgrade</button>
                                        ) : (
                                            <button onClick={() => handleModelSelect(model.id)} disabled={isSelected} className="px-3 py-1 text-sm font-semibold text-purple-600 disabled:opacity-50">{isSelected ? 'Active' : 'Select'}</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const ActionButton: React.FC<{ Icon: React.ElementType; onClick: () => void; isActive?: boolean; activeClass?: string; label: string }> = ({ Icon, onClick, isActive, activeClass = 'text-blue-400', label }) => (
        <button onClick={onClick} className={`p-1.5 text-gray-400 hover:text-white ${isActive ? activeClass : ''}`} aria-label={label}>
            <Icon className="h-5 w-5" />
        </button>
    );

    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-white dark:bg-gray-900">
          <AIChatSideBar isOpen={isSideBarOpen} onClose={() => setIsSideBarOpen(false)} isLoggedIn={isLoggedIn} onNewChat={handleNewChat} chats={allChats} activeChatId={activeChatId} onSelectChat={handleSelectChat} onDeleteChat={handleDeleteChat} />
          {isModelSelectorOpen && <ModelSelector />}
          <ActionPopup isOpen={activePopup === 'plus'} onClose={() => setActivePopup(null)} items={plusMenuItems} />
          
          <LikeFeedbackModal 
            isOpen={feedbackModalState.isOpen && feedbackModalState.type === 'liked'}
            onClose={handleCloseFeedbackModal}
            onSubmit={(message) => {
                feedbackSubmittedRef.current = true;
                submitAiFeedback({ aiRating: 'liked', message });
                handleCloseFeedbackModal();
                showToast("Feedback submitted!", 'success');
            }}
          />
        <DislikeFeedbackModal
            isOpen={feedbackModalState.isOpen && feedbackModalState.type === 'disliked'}
            onClose={handleCloseFeedbackModal}
            onSubmit={({ reasons, message }) => {
                feedbackSubmittedRef.current = true;
                submitAiFeedback({ aiRating: 'disliked', dislikeReasons: reasons, message });
                handleCloseFeedbackModal();
                showToast("Feedback submitted!", 'success');
            }}
        />

          <VoiceChatModal
                isOpen={voiceChatState !== 'idle'}
                onClose={endVoiceChat}
                speakerStatus={speakerStatus}
                liveUserTranscript={liveUserTranscript}
                liveModelTranscript={liveModelTranscript}
                isMuted={isMuted}
                toggleMute={toggleMute}
                selectedVoice={selectedVoice}
                handleChangeVoice={handleChangeVoice}
                voiceChatLogoUrl={voiceChatLogoUrl}
            />

          <header className="flex items-center justify-between p-2 border-b dark:border-gray-700 flex-shrink-0">
              <button onClick={() => setIsSideBarOpen(true)} className="p-2"><Bars3Icon className="h-6 w-6"/></button>
              <div className="flex items-center gap-2"><img src={appLogoUrl} alt="Logo" className="w-7 h-7" /><h1 className="text-lg font-bold">Loksewa Guru Ai</h1></div>
              <Link to={isLoggedIn ? "/profile" : "/login"} className="p-1">{isLoggedIn ? <img src={avatarUrl} alt="Profile" className="w-8 h-8 rounded-full" /> : <UserCircleIcon className="h-8 w-8 text-gray-400"/>}</Link>
          </header>

          <div className="relative flex-1 overflow-hidden">
                {aiChatLogoUrl && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><img src={aiChatLogoUrl} alt="Background Logo" className="w-48 h-48 object-contain opacity-10 dark:opacity-20"/></div>)}
                <main className="relative z-10 h-full overflow-y-auto p-4 space-y-4 select-text">
                    {activeChatMessages.map((msg, index) => {
                         const isStreamingPlaceholder = 
                            loadingChatId === activeChatId &&
                            msg.role === 'model' && 
                            index === activeChatMessages.length - 1 &&
                            msg.parts.length === 0;

                        if (isStreamingPlaceholder) {
                            const isThinking = loadingMessage && loadingMessage.includes("Thinking");
                            return (
                                <div key={msg.id} className="flex justify-start gap-3">
                                    {aiResponseLogoUrl ? (
                                        <img src={aiResponseLogoUrl} alt="AI Avatar" className="h-6 w-6 rounded-full flex-shrink-0 mt-1 object-cover" />
                                    ) : (
                                        <SparklesIcon className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
                                    )}
                                    {isThinking ? (
                                        <div className="w-full max-w-xs md:max-w-md lg:max-w-lg text-gray-800 dark:text-gray-200">
                                            <button 
                                                onClick={() => setShowThinkingDetails(prev => !prev)}
                                                className="w-full flex items-center justify-between p-3 bg-gray-200 dark:bg-gray-700 rounded-t-lg"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <SparklesIcon className="h-5 w-5 text-purple-500" />
                                                    <span className="font-semibold text-sm">Thought for {thinkingTime} seconds</span>
                                                </div>
                                                <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${showThinkingDetails ? 'rotate-180' : ''}`} />
                                            </button>
                                            {showThinkingDetails && (
                                                <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-b-lg border-t border-gray-300 dark:border-gray-600 animate-fade-in">
                                                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                                                        <ul>
                                                            <li>Analyzing the user's query about Loksewa preparation. This seems to be a specific request that requires a structured and accurate answer.</li>
                                                            <li>Breaking down the query into key components to understand the core intent.</li>
                                                            <li>Formulating a step-by-step plan to construct the response. I'll start with a direct answer, then provide supporting details and context relevant to Nepal's civil service exams.</li>
                                                            <li>Ensuring the language is clear, informative, and maintains a helpful tone suitable for a student.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-w-xs px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                                            {loadingMessage ? (
                                                <p className="text-sm italic text-gray-800 dark:text-gray-200">{loadingMessage}</p>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        
                        return (
                        <div key={msg.id} className={`flex flex-col items-start ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`flex gap-3 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && (
                                    aiResponseLogoUrl ? (
                                        <img src={aiResponseLogoUrl} alt="AI Avatar" className="h-6 w-6 rounded-full flex-shrink-0 mt-1 object-cover" />
                                    ) : (
                                        <SparklesIcon className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
                                    )
                                )}
                                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                                    <div className={`${msg.role === 'user' ? 'px-4 py-2 rounded-2xl bg-blue-600 text-white rounded-br-none' : 'px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                        {msg.parts.map((part, i) => <MessagePart key={i} part={part} msg={msg} allMessages={activeChatMessages} />)}
                                    </div>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 mt-1.5 px-2 ${msg.error ? 'opacity-100' : ''}`}>
                                {msg.error && (
                                    <div className="flex items-center gap-2 text-red-500">
                                        <ExclamationCircleIcon className="h-5 w-5" />
                                        <span className="text-xs">{msg.error === 'network' ? 'Network error' : 'Failed to get response'}</span>
                                        <ActionButton 
                                            Icon={ArrowPathIcon} 
                                            onClick={() => {
                                                const retryIndex = msg.role === 'model' ? index - 1 : index;
                                                if (retryIndex < 0) return;
                                                handleSendMessage(retryIndex);
                                            }}
                                            label="Retry" 
                                        />
                                    </div>
                                )}
                                {!msg.error && msg.role === 'user' && (
                                    <div className="flex items-center">
                                        <ActionButton Icon={ClipboardDocumentIcon} onClick={() => handleCopy(msg)} label="Copy" />
                                        <ActionButton Icon={PencilIcon} onClick={() => handleEdit(msg)} label="Edit" />
                                    </div>
                                )}
                                {!msg.error && msg.role === 'model' && (
                                    <div className="flex items-center">
                                        <ActionButton Icon={ClipboardDocumentIcon} onClick={() => handleCopy(msg)} label="Copy" />
                                        <ActionButton Icon={HandThumbUpIcon} onClick={() => handleFeedback(msg, 'liked')} isActive={msg.feedback === 'liked'} activeClass="text-green-400" label="Like" />
                                        <ActionButton Icon={HandThumbDownIcon} onClick={() => handleFeedback(msg, 'disliked')} isActive={msg.feedback === 'disliked'} activeClass="text-red-400" label="Dislike" />
                                        <ActionButton Icon={speakingMessageId === msg.id ? SpeakerXMarkIcon : SpeakerWaveIcon} onClick={() => handleSpeak(msg)} isActive={speakingMessageId === msg.id} label="Speak" />
                                        <ActionButton Icon={ArrowPathIcon} onClick={() => handleRegenerate(index)} label="Regenerate" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                    <div ref={messagesEndRef} />
                </main>
          </div>

          <footer className="p-2 border-t dark:border-gray-700 flex-shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className={`bg-gray-800 rounded-2xl p-3 flex flex-col gap-2 transition-all ${editingMessage ? 'ring-2 ring-purple-500' : ''}`}>
                  {imageToSend && <div className="relative self-start"><img src={imageToSend.preview} className="h-20 w-auto rounded-md" alt="Preview"/><button type="button" onClick={() => setImageToSend(null)} className="absolute -top-2 -right-2 p-1 bg-black/50 text-white rounded-full"><XMarkIcon className="h-4 w-4"/></button></div>}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(undefined); } }}
                    placeholder={
                        specialMode === 'create-image' ? 'Describe the image you want to create...'
                        : specialMode === 'deep-research' ? 'Enter a topic for deep research...'
                        : 'Ask Loksewa Guru Ai...'
                    }
                    className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none max-h-40"
                    rows={1}
                    disabled={!!loadingChatId}
                />
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setActivePopup('plus')} className="p-2 text-gray-400 rounded-full hover:bg-gray-700"><PlusIcon className="h-6 w-6"/></button>
                          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" />
                          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                          
                          <button
                            type="button"
                            onClick={() => handleSetSpecialMode('deep-research')}
                            title="Deep Search"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${specialMode === 'deep-research' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                          >
                              <CpuChipIcon className="h-5 w-5" />
                              <span>Deep Search</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetSpecialMode('create-image')}
                            title="Create Image"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${specialMode === 'create-image' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                          >
                            <PaintBrushIcon className="h-5 w-5" />
                            <span>Create Image</span>
                          </button>
                      </div>
                      <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setIsModelSelectorOpen(true)} className="px-3 py-1.5 text-sm font-semibold rounded-full bg-gray-700 text-white hover:bg-gray-600">{availableModels.find(m => m.id === selectedModel)?.name || 'Select Model'}</button>
                          <button type="button" onClick={() => startVoiceChat(selectedVoice)} disabled={!!loadingChatId} className="p-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"><MicrophoneIcon className="h-6 w-6"/></button>
                          {loadingChatId === activeChatId ? (
                            <button type="button" onClick={handleStopGeneration} className="p-2 rounded-full bg-red-600 text-white hover:bg-red-500" aria-label="Stop generation">
                                <StopCircleIcon className="h-6 w-6 animate-spin" />
                            </button>
                          ) : (
                            <button type="submit" disabled={(!input.trim() && !imageToSend) || !!loadingChatId} className="p-2 rounded-full bg-gray-600 text-white hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-400" aria-label="Send message">
                                <PaperAirplaneIcon className="h-6 w-6"/>
                            </button>
                          )}
                      </div>
                  </div>
              </form>
          </footer>
          <style>{`
            .prose strong { color: white; }
            .prose ul { padding-left: 1.25rem; }
            .prose li { margin: 0; }
            .prose p { margin: 0.25rem 0; }
            .prose a { color: #60a5fa; }
            .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
      </div>
    );
};

export default AIChatPage;