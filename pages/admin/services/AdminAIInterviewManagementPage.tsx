import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { LOKSEWA_COURSES } from '../../../constants';
import { useToast } from '../../../contexts/ToastContext';

interface AIInterviewSettings {
    courses: string[];
    systemPromptTemplate: string;
    logoUrl?: string;
}

const DEFAULT_PROMPT = `You are a friendly but professional AI Interviewer from the Loksewa Guru App. Your task is to conduct a preparatory interview in Nepali, providing immediate feedback after each answer.
1. Start the conversation *immediately* with the exact Nepali phrase: "नमस्ते, म लोकसेवा गुरु एपबाट बोल्दै छु।"
2. After the greeting, do not wait for a response. Immediately continue with this explanation: "हामी लोकसेवा तयारीको लागि एउटा नमुना अन्तर्वार्ता सुरु गर्न लागेका छौं। सुरुमा, म तपाईंको केही व्यक्तिगत विवरण लिनेछु र त्यसपछि हामी तपाईंले रोज्नुभएको विषयमा केन्द्रित हुनेछौं।"
3. After this introduction, immediately ask for the candidate's full name.
4. After they provide their name, ask for their service group or classification they are applying for.
5. Then, ask for their age and permanent address.
6. Once you have this information, transition smoothly into the main interview by saying something like "धन्यवाद। अब हामी \${selectedCourse} पदको लागि अन्तर्वार्ता सुरु गरौं।"
7. Proceed to ask relevant, role-specific questions for the \${selectedCourse} position. Ask ONE question at a time.
8. After the user provides an answer, your response MUST follow this structure:
    a. First, provide brief, constructive feedback on their answer in Nepali. For example, "त्यो राम्रो उत्तर थियो" or "तपाईंले अझै स्पष्ट पार्न सक्नुहुन्छ".
    b. Second, suggest how they could have answered better in Nepali. (e.g., "यसलाई यसरी भन्नुभयो भने अझ प्रभावकारी हुन्छ..."). This part is crucial.
    c. Third, smoothly transition to and ask the NEXT question.
9. Keep your questions and feedback clear, concise, and conduct the entire interview in Nepali.
10. When the conversation naturally concludes or the user suggests ending it (e.g., "interview sakau"), your response must be: First, say "Huss tw Dhanyabd yatti samma malai time dinu vayeko ma, aba ma hajur lai kehi sujab didai chhu." Then, without pausing, provide a brief verbal summary of their performance with suggestions for improvement, all in Nepali. Do not end the session. Wait for the user to press the 'End Interview' button.`;


const AdminAIInterviewManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<AIInterviewSettings>({ courses: [], systemPromptTemplate: '', logoUrl: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newCourse, setNewCourse] = useState('');
    const { showToast } = useToast();

    const settingsDocRef = useCallback(() => doc(db, "settings", "ai_interview"), []);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const docSnap = await getDoc(settingsDocRef());
            if (docSnap.exists()) {
                const data = docSnap.data() as AIInterviewSettings;
                setSettings({
                    courses: data.courses || LOKSEWA_COURSES,
                    systemPromptTemplate: data.systemPromptTemplate || DEFAULT_PROMPT,
                    logoUrl: data.logoUrl || ''
                });
            } else {
                // Default values if not found in DB
                setSettings({
                    courses: LOKSEWA_COURSES,
                    systemPromptTemplate: DEFAULT_PROMPT,
                    logoUrl: ''
                });
            }
            setLoading(false);
        };
        fetchSettings();
    }, [settingsDocRef]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(settingsDocRef(), settings);
            showToast("AI Interview settings saved successfully.");
        } catch (error) {
            console.error("Error saving settings:", error);
            showToast("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCourse = () => {
        if (newCourse && !settings.courses.includes(newCourse)) {
            setSettings(prev => ({ ...prev, courses: [...prev.courses, newCourse.trim()] }));
            setNewCourse('');
        }
    };
    
    const handleDeleteCourse = (courseToDelete: string) => {
        setSettings(prev => ({
            ...prev,
            courses: prev.courses.filter(c => c !== courseToDelete)
        }));
    };
    
    if (loading) return <p className="p-6">Loading AI Interview settings...</p>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-8">
            <header className="flex items-center pb-4 border-b dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage AI Interview</h1>
            </header>

            <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Display Logo</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">This logo will appear in the center of the circle during the interview.</p>
                <div className="flex items-center gap-4">
                    {settings.logoUrl && <img src={settings.logoUrl} alt="Logo Preview" className="w-16 h-16 rounded-full object-cover bg-gray-200" />}
                    <input
                        value={settings.logoUrl || ''}
                        onChange={e => setSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="Enter logo image URL"
                        className="w-full form-input"
                    />
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Interview Courses</h2>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {settings.courses.map(course => (
                            <div key={course} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                                <span className="text-gray-800 dark:text-gray-200">{course}</span>
                                <button onClick={() => handleDeleteCourse(course)} className="text-red-500 hover:text-red-700" aria-label={`Delete ${course}`}>
                                    <TrashIcon className="h-5 w-5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t dark:border-gray-600">
                        <input 
                            value={newCourse} 
                            onChange={e => setNewCourse(e.target.value)} 
                            placeholder="Add new course name" 
                            className="w-full form-input" 
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCourse(); } }}
                        />
                        <button onClick={handleAddCourse} className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex-shrink-0" aria-label="Add course">
                            <PlusIcon className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">System Prompt Template</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Use <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded-sm">{"${selectedCourse}"}</code> as a placeholder for the course name. The AI will replace it dynamically.</p>
                <textarea 
                    value={settings.systemPromptTemplate} 
                    onChange={e => setSettings(prev => ({ ...prev, systemPromptTemplate: e.target.value }))}
                    rows={15}
                    className="w-full form-input font-mono text-sm"
                />
            </section>

            <div className="flex justify-end pt-6 border-t dark:border-gray-700">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400">
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminAIInterviewManagementPage;