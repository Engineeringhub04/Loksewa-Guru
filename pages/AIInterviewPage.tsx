

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleGenAI, Modality, LiveServerMessage, Blob as GenaiBlob } from "@google/genai";
import { BrainIcon, LOKSEWA_COURSES } from '../constants';
import { MicrophoneIcon, SpeakerXMarkIcon, ArrowLeftIcon, CheckIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid';
import Footer from '../components/Footer';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import PullToRefresh from '../components/PullToRefresh';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

// --- Audio Utility Functions ---
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
// --- End Audio Utility Functions ---

type InterviewState = 'idle' | 'connecting' | 'in_progress' | 'processing_feedback' | 'finished';
type SpeakerStatus = 'idle' | 'listening' | 'speaking' | 'thinking';

interface Transcript {
    speaker: 'user' | 'ai';
    text: string;
}

const voices = [
    { id: 'Zephyr', name: 'Zephyr (Male)' },
    { id: 'Kore', name: 'Kore (Female)' },
    { id: 'Puck', name: 'Puck (Male)' },
    { id: 'Charon', name: 'Charon (Male)' },
    { id: 'Fenrir', name: 'Fenrir (Male)' },
];

const AIInterviewPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, isLoggedIn, isAdmin } = useAuth();
    const { aiInterviewLogoUrl, subscriptionLocks } = useData();
    const [interviewState, setInterviewState] = useState<InterviewState>('idle');
    const [speakerStatus, setSpeakerStatus] = useState<SpeakerStatus>('idle');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [finalFeedback, setFinalFeedback] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('Zephyr');
    const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
    const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
    // New state for custom voice change confirmation
    const [isConfirmVoiceChangeOpen, setIsConfirmVoiceChangeOpen] = useState(false);
    const [voiceToChange, setVoiceToChange] = useState<string | null>(null);

    // State for dynamic settings
    const [courses, setCourses] = useState<string[]>([]);
    const [systemPromptTemplate, setSystemPromptTemplate] = useState('');

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

    const fetchSettings = useCallback(async () => {
        try {
            const docRef = doc(db, "settings", "ai_interview");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCourses(data.courses || LOKSEWA_COURSES);
                setSystemPromptTemplate(data.systemPromptTemplate || '');
            } else {
                setCourses(LOKSEWA_COURSES);
            }
        } catch (error) {
            console.error("Error fetching AI settings:", error);
            setCourses(LOKSEWA_COURSES);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);
        fetchSettings();
        return () => clearTimeout(timer);
    }, [fetchSettings]);

    const cleanup = useCallback(async () => {
        // Stop all audio playback immediately
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        // Stop microphone track
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        // Disconnect audio nodes
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current?.disconnect();
        mediaStreamSourceRef.current = null;
    
        // Close Gemini session
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session?.close();
            } catch (e) { console.error("Error closing session:", e); }
            sessionPromiseRef.current = null;
        }
    
        // Close audio contexts
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close().catch(console.error);
        }
        
        // Null out refs
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;

        // Reset UI status
        setSpeakerStatus('idle');
    }, []);

    const handleServerMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            setSpeakerStatus('speaking');
        }
        if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            setSpeakerStatus('listening');
        }
        if (message.serverContent?.turnComplete) {
             const userText = currentInputTranscriptionRef.current.trim();
             const aiText = currentOutputTranscriptionRef.current.trim();
             
             if (userText || aiText) {
                setTranscripts(prev => [...prev, 
                    { speaker: 'user', text: userText },
                    { speaker: 'ai', text: aiText }
                ].filter(t => t.text));
             }
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
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
                if (audioSourcesRef.current.size === 0) {
                     setSpeakerStatus('listening');
                }
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
        }

        if(message.serverContent?.interrupted){
             for (const source of audioSourcesRef.current.values()) {
                source.stop();
                audioSourcesRef.current.delete(source);
            }
            nextStartTimeRef.current = 0;
        }
    }, []);

    const startInterview = useCallback(async (voiceName: string) => {
        if (!selectedCourse || !systemPromptTemplate) {
            setError('Please select a course and ensure settings are loaded.');
            setInterviewState('idle');
            return;
        }
        setError('');
        isMutedRef.current = false;
        setIsMuted(false);
        setInterviewState('connecting');
        setSpeakerStatus('thinking');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const systemInstruction = systemPromptTemplate.replace(/\$\{selectedCourse\}/g, selectedCourse);
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!inputAudioContextRef.current || !streamRef.current) {
                            console.warn("Aborting onopen because resources were cleaned up.");
                            return;
                        }
                        setInterviewState('in_progress');
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ text: "Please begin the interview." });
                        });

                        const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            if (isMutedRef.current) return;
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: (message: LiveServerMessage) => handleServerMessage(message),
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError('An error occurred during the interview. Please try again.');
                        cleanup();
                        setInterviewState('idle');
                    },
                    onclose: () => console.log('Session closed'),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                    systemInstruction: systemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
        } catch (err) {
            console.error('Failed to start interview:', err);
            setError('Could not access microphone or start AI session. Please check permissions and try again.');
            setInterviewState('idle');
            setSpeakerStatus('idle');
        }
    }, [selectedCourse, systemPromptTemplate, handleServerMessage, cleanup]);
    
    const handleStartInterviewClick = () => {
        // Two-step access check
        const { login: loginRequired, subscription: subscriptionRequired } = subscriptionLocks['ai-interview'] || {};
        
        if (loginRequired && !isLoggedIn) {
            window.dispatchEvent(new CustomEvent('open-login-modal'));
            return;
        }

        const isSubscribed = user?.subscriptionStatus === 'active';
        if (subscriptionRequired && !isSubscribed && !isAdmin) {
            window.dispatchEvent(new CustomEvent('open-subscription-modal'));
            return;
        }

        if (!selectedCourse) {
            setError('Please select a course to begin.');
            return;
        }
        if (!systemPromptTemplate) {
            setError('The AI Interview settings are not configured. Please contact support.');
            return;
        }
        startInterview(selectedVoice);
    };

    const toggleMute = () => {
        const newMutedState = !isMutedRef.current;
        isMutedRef.current = newMutedState;
        setIsMuted(newMutedState);
    };

    const handleConfirmVoiceChange = async () => {
        if (!voiceToChange) return;
        await cleanup();
        setTranscripts([]);
        setSelectedVoice(voiceToChange);
        startInterview(voiceToChange);
        setIsConfirmVoiceChangeOpen(false);
        setIsVoiceSelectorOpen(false);
        setVoiceToChange(null);
    };

    const handleChangeVoice = useCallback((newVoice: string) => {
        if (newVoice === selectedVoice) {
            setIsVoiceSelectorOpen(false);
            return;
        }
        setVoiceToChange(newVoice);
        setIsConfirmVoiceChangeOpen(true);
    }, [selectedVoice]);
    
    const endInterview = useCallback(async () => {
        if (interviewState !== 'in_progress' && interviewState !== 'connecting') return;
        setInterviewState('processing_feedback');
        setSpeakerStatus('thinking');
        await cleanup();

        const completeTranscript = [...transcripts];
        if (currentInputTranscriptionRef.current.trim()) {
            completeTranscript.push({ speaker: 'user', text: currentInputTranscriptionRef.current.trim() });
        }
        if (currentOutputTranscriptionRef.current.trim()) {
             completeTranscript.push({ speaker: 'ai', text: currentOutputTranscriptionRef.current.trim() });
        }
        const fullTranscript = completeTranscript
            .filter(t => t.text)
            .map(t => `${t.speaker === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`)
            .join('\n');

        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Based on the following Loksewa interview transcript for a ${selectedCourse} position, please provide constructive feedback for the candidate in English. Analyze their answers for correctness, relevance, tone, and clarity. Structure the feedback into three distinct sections: **Strengths**, **Areas for Improvement**, and **Suggestions for Better Answers**. **Use bullet points for each item within these sections.** Provide specific examples where possible.\n\nTranscript:\n${fullTranscript}`,
            });
            setFinalFeedback(response.text);
        } catch(err) {
            console.error("Error getting feedback", err);
            setFinalFeedback("Could not generate feedback due to an error.");
        }
        setInterviewState('finished');
        setSpeakerStatus('idle');
    }, [transcripts, interviewState, selectedCourse, cleanup]);

    const handleBackClick = () => {
        if (['in_progress', 'connecting'].includes(interviewState)) {
            setIsConfirmExitOpen(true);
        } else {
            navigate('/');
        }
    };

    const handleConfirmEnd = () => {
        setIsConfirmExitOpen(false);
        endInterview();
    };

    const handlePracticeAgain = () => {
        cleanup();
        setInterviewState('idle');
        setFinalFeedback('');
        setTranscripts([]);
        setSelectedCourse('');
        setError('');
    }
    
    useEffect(() => {
        return () => { cleanup(); }
    }, [cleanup]);

    const renderContent = () => {
        switch (interviewState) {
            case 'idle':
                return (
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI-Powered Interview Simulation</h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                                Hone your skills with realistic, voice-based interview questions for your chosen Loksewa course. Get instant feedback to improve your performance.
                            </p>
                        </div>
                        <div className="p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                            <BrainIcon className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Ready to Practice?</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">Select your course to begin.</p>
                            <div className="mb-6">
                                <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Course</label>
                                <select 
                                    id="course-select" 
                                    value={selectedCourse} 
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                >
                                    <option value="" disabled>-- Select a Course --</option>
                                    {courses.map(course => <option key={course} value={course}>{course}</option>)}
                                </select>
                            </div>
                            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                            <button 
                                onClick={handleStartInterviewClick} 
                                disabled={!selectedCourse}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-all hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                            >
                                <MicrophoneIcon className="h-6 w-6" /> Start Interview
                            </button>
                        </div>
                    </>
                );

            case 'connecting':
            case 'in_progress':
            case 'processing_feedback':
                 const statusMap = {
                    listening: 'Listening...',
                    speaking: 'AI is speaking...',
                    thinking: interviewState === 'processing_feedback' ? 'Processing Feedback...' : 'Connecting...',
                    idle: 'Idle'
                };
                return (
                    <div className="flex flex-col flex-1 w-full max-w-sm relative">
                        <div className="absolute top-0 left-0 z-20">
                            <div className="relative">
                                <button onClick={() => setIsVoiceSelectorOpen(prev => !prev)} className="px-3 py-2 bg-black/30 text-white text-sm rounded-full flex items-center gap-2">
                                    Change Voice
                                </button>
                                {isVoiceSelectorOpen && (
                                    <div className="absolute top-full mt-2 w-48 bg-gray-800 text-white rounded-lg shadow-lg animate-fade-in-scale">
                                        {voices.map(voice => (
                                            <button key={voice.id} onClick={() => handleChangeVoice(voice.id)} className="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center">
                                                <span>{voice.name}</span>
                                                {selectedVoice === voice.id && <CheckIcon className="h-5 w-5 text-green-400" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center">
                             <div className={`relative h-40 w-40 flex items-center justify-center`}>
                                {speakerStatus === 'listening' && !isMuted &&
                                    <div className="absolute inset-0 rounded-full animate-glow-purple"></div>
                                }
                                {speakerStatus === 'speaking' &&
                                    <>
                                        <div className="absolute inset-0 rounded-full animate-glow-blue"></div>
                                        <div className="absolute inset-0 rounded-full p-1 animate-border-spin" style={{ background: 'conic-gradient(from 0deg, rgba(59, 130, 246, 0), rgba(59, 130, 246, 1), rgba(59, 130, 246, 0) 50%)' }}></div>
                                    </>
                                }
                                <div className="relative h-32 w-32 rounded-full bg-purple-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center shadow-inner">
                                {aiInterviewLogoUrl && aiInterviewLogoUrl.trim() !== '' ? (
                                    <img src={aiInterviewLogoUrl} alt="AI Interview" className="w-full h-full object-cover" />
                                ) : (
                                    <BrainIcon className={`h-16 w-16 text-purple-600 dark:text-purple-400 ${speakerStatus === 'thinking' ? 'animate-pulse' : ''}`}/>
                                )}
                                </div>
                             </div>
                            <p className="mt-6 text-lg font-medium text-gray-700 dark:text-gray-300 h-6">{isMuted ? 'Muted' : statusMap[speakerStatus]}</p>
                        </div>
                        <div className="h-48 overflow-y-auto bg-gray-100 dark:bg-gray-800 rounded-lg p-2 mb-4">
                            {transcripts.map((t, i) => (
                               <div key={i} className="mb-2 last:mb-0">
                                 {t.speaker === 'user' && <p className="text-sm text-blue-600 dark:text-blue-400"><strong>You:</strong> {t.text}</p>}
                                 {t.speaker === 'ai' && <p className="text-sm text-purple-700 dark:text-purple-300"><strong>AI:</strong> {t.text}</p>}
                               </div>
                            ))}
                        </div>
                        <div className="w-full flex justify-center items-center">
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
            
            case 'finished':
                return (
                     <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full flex-1 overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4 text-center">Interview Feedback</h2>
                        <div className="mt-6 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{finalFeedback}</div>
                         <button onClick={handlePracticeAgain} className="mt-8 w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700">
                           Practice Again
                        </button>
                    </div>
                );
        }
    };
    
    if (loading) {
        return (
            <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 items-center justify-center">
                <div className="relative flex justify-center items-center">
                    <div className="absolute w-24 h-24 rounded-full border-2 border-purple-300 dark:border-purple-600 animate-spin"></div>
                    <BrainIcon className="h-16 w-16 text-purple-500" />
                </div>
                <p className="text-lg font-semibold mt-6 text-gray-700 dark:text-gray-300">Preparing Interview Room...</p>
            </div>
        );
    }
    
    return (
        <PullToRefresh 
            onRefresh={fetchSettings} 
            disabled={interviewState !== 'idle'}
            className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 overflow-y-auto pb-24"
        >
            <Modal
                isOpen={isConfirmExitOpen}
                onClose={() => setIsConfirmExitOpen(false)}
                title="End Interview?"
            >
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-300">
                        Are you sure you want to end the current interview session?
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Your final feedback will be generated based on the conversation so far.
                    </p>
                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            onClick={() => setIsConfirmExitOpen(false)}
                            className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmEnd}
                            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg"
                        >
                            End Interview
                        </button>
                    </div>
                </div>
            </Modal>
            
            <ConfirmationModal
                isOpen={isConfirmVoiceChangeOpen}
                onClose={() => setIsConfirmVoiceChangeOpen(false)}
                onConfirm={handleConfirmVoiceChange}
                title="Change Voice?"
                message="Changing the voice will restart the current interview session and clear the transcript. Continue?"
                confirmText="Restart"
                cancelText="Cancel"
            />

            <header className="sticky top-0 p-4 flex items-center justify-between border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <button onClick={handleBackClick} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </button>
                 <div className="flex items-center gap-2">
                     <BrainIcon className="h-6 w-6 text-purple-500" />
                     <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">AI Interview</h1>
                 </div>
                 <div className="w-10 h-6"></div>
            </header>
            <main className={`flex-1 ${interviewState !== 'idle' ? 'flex flex-col items-center justify-center' : ''} p-4`}>
                {renderContent()}
            </main>
            {interviewState === 'idle' && <Footer />}
        </PullToRefresh>
    );
};

export default AIInterviewPage;