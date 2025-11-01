import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, writeBatch, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { AuthUser, PaymentProof, SubscriptionPlan, AdminNotification } from '../../types';
import { SUBSCRIPTION_PLANS } from '../../constants';
import { generatePaymentNotificationMessage, generateSubscriptionNotificationMessage, generateCustomNotificationMessage } from '../../services/geminiService';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon, CalendarDaysIcon, PlusIcon, SparklesIcon, PaperAirplaneIcon, DocumentArrowDownIcon, UserCircleIcon, BanknotesIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';

// Helper to generate Cloudinary URLs
const generateCloudinaryUrl = (src: string, transformations: string): string => {
    if (!src || !src.includes('/upload/')) {
        return src || ''; // Not a standard Cloudinary URL, return as is or empty string
    }
    const parts = src.split('/upload/');
    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ src, alt, className, ...props }) => {
    const placeholderSrc = generateCloudinaryUrl(src, 'q_auto:low,e_blur:2000,w_20');
    const [imageSrc, setImageSrc] = useState(placeholderSrc);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const highResSrc = generateCloudinaryUrl(src, 'q_auto,f_auto');
        const img = new Image();
        img.src = highResSrc;
        img.onload = () => {
            setImageSrc(highResSrc);
            setIsLoaded(true);
        };
    }, [src]);

    // When src prop changes, reset to placeholder
    useEffect(() => {
         setImageSrc(placeholderSrc);
         setIsLoaded(false);
    }, [placeholderSrc]);

    return (
        <img
            {...props}
            src={imageSrc}
            alt={alt}
            className={`${className} transition-all duration-500 ease-in-out ${isLoaded ? 'blur-0 scale-100' : 'blur-md scale-105'}`}
        />
    );
};

const CountdownTimer: React.FC<{ expiryDate: Date | null }> = ({ expiryDate }) => {
    const calculateTimeLeft = useCallback(() => {
        if (!expiryDate || expiryDate.getTime() < Date.now()) return null;

        const difference = +expiryDate - +new Date();
        let timeLeft: { [key: string]: number } = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    }, [expiryDate]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (!expiryDate || expiryDate.getTime() < Date.now()) {
            setTimeLeft(null);
            return;
        }

        const timerId = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            if (newTimeLeft && Object.keys(newTimeLeft).length > 0) {
                setTimeLeft(newTimeLeft);
            } else {
                setTimeLeft(null); // Time has run out
                clearInterval(timerId);
            }
        }, 1000);

        return () => clearInterval(timerId);
    }, [expiryDate, calculateTimeLeft]);

    if (!timeLeft || Object.keys(timeLeft).length === 0) {
        return <span className="text-red-500 font-bold">Expired</span>;
    }

    return (
        <div className="flex space-x-2 text-center">
            {Object.keys(timeLeft).map(interval => (
                <div key={interval} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md min-w-[50px]">
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{String(timeLeft[interval]).padStart(2, '0')}</div>
                    <div className="text-xs capitalize text-gray-500">{interval}</div>
                </div>
            ))}
        </div>
    );
};


const AdminPaymentProofDetailPage: React.FC = () => {
    const { proofId } = useParams<{ proofId: string }>();
    const navigate = useNavigate();

    const [proof, setProof] = useState<PaymentProof | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [daysToAdd, setDaysToAdd] = useState(30);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [customTopic, setCustomTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const { showToast } = useToast();
    
    const [notificationImageFile, setNotificationImageFile] = useState<File | null>(null);
    const [notificationImagePreview, setNotificationImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentUserSubStatus, setCurrentUserSubStatus] = useState<AuthUser['subscriptionStatus']>('none');


    const fetchData = useCallback(async () => {
        if (!proofId) {
            navigate('/admin/payment-proofs');
            return;
        }
        setLoading(true);
        try {
            const proofDocRef = doc(db, 'paymentProofs', proofId);
            const proofSnap = await getDoc(proofDocRef);

            if (!proofSnap.exists()) {
                throw new Error("Payment proof not found.");
            }
            const proofData = proofSnap.data();
            const finalProof = {
                id: proofSnap.id,
                ...proofData,
                submittedAt: proofData.submittedAt ? (proofData.submittedAt as Timestamp).toDate() : new Date(),
            } as PaymentProof;
            setProof(finalProof);

            const userDocRef = doc(db, 'users', finalProof.userId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                setUser({
                    uid: userSnap.id,
                    ...userData,
                    subscriptionExpiry: userData.subscriptionExpiry ? (userData.subscriptionExpiry as Timestamp).toDate() : null,
                } as AuthUser);
            }
        } catch (error) {
            console.error("Error fetching details:", error);
            showToast((error as Error).message, 'error');
            navigate('/admin/payment-proofs');
        } finally {
            setLoading(false);
        }
    }, [proofId, navigate, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (user) {
            setCurrentUserSubStatus(user.subscriptionStatus === 'expired' ? 'none' : user.subscriptionStatus || 'none');
        }
    }, [user]);

    const handleStatusUpdate = async (newStatus: 'approved' | 'rejected') => {
        if (!proof) return;
        setIsSaving(true);
        try {
            const proofRef = doc(db, "paymentProofs", proof.id);
            const batch = writeBatch(db);
            
            if (newStatus === 'approved') {
                const planDetails = SUBSCRIPTION_PLANS.find(p => p.name === proof.planName);
                let expiryDate = new Date();
                if (planDetails?.price.includes('/yr')) {
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                } else {
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                }
                const userRef = doc(db, "users", proof.userId);
                
                batch.update(proofRef, { status: newStatus });
                batch.update(userRef, {
                    subscriptionStatus: 'active',
                    subscriptionExpiry: expiryDate,
                    planName: proof.planName,
                });

            } else { // 'rejected'
                 batch.update(proofRef, { status: newStatus });
            }

            // Create a notification for the admin
            const adminNotification: Omit<AdminNotification, 'id'> = {
                type: 'subscription',
                title: `Subscription ${newStatus}`,
                message: `Subscription for ${proof.userName || 'a user'} (${proof.planName}) was ${newStatus}.`,
                read: false,
                createdAt: serverTimestamp() as any,
                link: `/admin/payment-proofs/${proof.id}`,
                relatedId: proof.id,
            };
            const adminNotifRef = doc(collection(db, 'adminNotifications'));
            batch.set(adminNotifRef, adminNotification);

            await batch.commit();

            showToast(`Proof status updated to "${newStatus}". You can now send a notification from the section below if needed.`, 'info');
            await fetchData();
        } catch (error) {
            console.error("Error updating status:", error);
            showToast("Failed to update status.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddTime = async () => {
        if (!user?.subscriptionExpiry || daysToAdd <= 0) return;
        setIsSaving(true);
        try {
            const currentExpiry = user.subscriptionExpiry;
            const newExpiry = new Date(currentExpiry.getTime());
            newExpiry.setDate(newExpiry.getDate() + daysToAdd);

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { subscriptionExpiry: newExpiry });

            showToast(`${daysToAdd} days added to the subscription.`);
            await fetchData(); // Refresh data to show new expiry
        } catch (error) {
            console.error("Error adding time:", error);
            showToast("Failed to add time.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubscriptionStatusSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const userRef = doc(db, "users", user.uid);
            
            const updates: { subscriptionStatus: AuthUser['subscriptionStatus'] } = {
                subscriptionStatus: currentUserSubStatus
            };

            await updateDoc(userRef, updates);
            showToast("User subscription status updated successfully.");
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Error updating subscription status:", error);
            showToast("Failed to update status.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleGenerateMessage = async (type: 'remaining' | 'finished' | 'approved' | 'rejected' | 'custom') => {
        if (!proof) return;
        if (type === 'custom' && !customTopic.trim()) {
            showToast('Please enter a topic to generate a message.', 'info');
            return;
        }

        setIsGenerating(true);
        setNotificationMessage(''); // Clear previous message
        try {
            let msg = '';
            if (type === 'custom') {
                 msg = await generateCustomNotificationMessage(customTopic, proof.userName || 'User');
            } else {
                 msg = (type === 'approved' || type === 'rejected')
                    ? await generatePaymentNotificationMessage(type, proof.userName || 'User', proof.planName)
                    : await generateSubscriptionNotificationMessage(type, proof.userName || 'User');
            }
            setNotificationMessage(msg);
        } catch (error) {
            showToast("Failed to generate message.", 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNotificationImageFile(file);
            setNotificationImagePreview(URL.createObjectURL(file));
        }
    };

    const clearImage = () => {
        setNotificationImageFile(null);
        setNotificationImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendNotification = async () => {
        if (!proof || !notificationMessage.trim()) return;
        setIsSaving(true);
        let imageUrl: string | undefined = undefined;
    
        try {
            // Step 1: Upload image if it exists
            if (notificationImageFile) {
                const formData = new FormData();
                formData.append('file', notificationImageFile);
                formData.append('upload_preset', 'filereceive'); // Using a general purpose upload preset
    
                const response = await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload', {
                    method: 'POST',
                    body: formData,
                });
    
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || 'Cloudinary upload failed.');
                }
                const data = await response.json();
                imageUrl = data.secure_url;
            }
    
            // Step 2: Add notification to Firestore
            const notificationPayload: any = {
                userId: proof.userId,
                title: 'A message from Admin',
                message: notificationMessage,
                read: false,
                createdAt: serverTimestamp(),
            };
            if (imageUrl) {
                notificationPayload.imageUrl = imageUrl;
            }

            await addDoc(collection(db, 'notifications'), notificationPayload);
            
            showToast("Notification sent successfully!");
            // Reset state
            setNotificationMessage('');
            setCustomTopic('');
            clearImage();
    
        } catch (error) {
            console.error("Error sending notification:", error);
            showToast(`Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getDynamicStatus = (): { text: string; className: string } => {
        if (!proof) return { text: 'Loading', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };

        if (proof.status === 'pending') {
            return { text: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' };
        }
        if (proof.status === 'rejected') {
            return { text: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
        }
        
        // If proof.status is 'approved', then we look at the user's live subscription status.
        if (proof.status === 'approved' && user) {
            switch (user.subscriptionStatus) {
                case 'active':
                    return { text: 'Success', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
                case 'pending':
                    return { text: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' };
                case 'failed':
                    return { text: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
                case 'expired':
                case 'none':
                default:
                    return { text: 'Unactive', className: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
            }
        }

        // Fallback for when proof is approved but user data isn't loaded yet.
        return { text: 'Success', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    };

    if (loading) {
        return <div className="p-6">Loading proof details...</div>;
    }

    if (!proof) {
        return <div className="p-6 text-red-500">Could not load payment proof data.</div>;
    }
    
    const canManageSubscription = proof.status === 'approved' && user;
    const dynamicStatus = getDynamicStatus();

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             <header className="flex items-center">
                 <button onClick={() => navigate('/admin/payment-proofs')} className="p-2 mr-4 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Back">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Payment Proof Details</h1>
            </header>

            {/* User & Payment Details */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><UserCircleIcon className="h-6 w-6"/> User & Payment Details</h2>
                <div className="space-y-1 text-sm grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                    <p><strong>Name:</strong> {proof.userName}</p>
                    <p><strong>Plan:</strong> {proof.planName}</p>
                    <p><strong>Email:</strong> {proof.userEmail}</p>
                    <p><strong>Method:</strong> {proof.paymentMethod}</p>
                    <p><strong>User ID:</strong> <code className="text-xs">{proof.userId}</code></p>
                    <p><strong>Submitted:</strong> {proof.submittedAt?.toLocaleString() ?? 'N/A'}</p>
                </div>
            </div>
            
            {/* Screenshot */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Uploaded Screenshot</h2>
                <a href={proof.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <ProgressiveImage src={proof.screenshotUrl} alt="Payment Screenshot" className="w-full rounded-md border dark:border-gray-700"/>
                </a>
            </div>

            {/* Status Management */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <h2 className="text-xl font-semibold mb-4">Verification Status</h2>
                 <div className="flex items-center gap-4 mb-4">
                    <span className="font-semibold">Current Status:</span>
                    <span className={`px-3 py-1 text-sm font-bold rounded-full capitalize ${dynamicStatus.className}`}>
                        {dynamicStatus.text}
                    </span>
                 </div>
                 {proof.status === 'pending' && (
                     <div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">This payment is pending review. Approve to activate the user's subscription or reject if the proof is invalid.</p>
                        <div className="flex gap-4">
                            <button onClick={() => handleStatusUpdate('approved')} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-400">
                                <CheckCircleIcon className="h-5 w-5" /> Approve
                            </button>
                            <button onClick={() => handleStatusUpdate('rejected')} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-400">
                                <XCircleIcon className="h-5 w-5" /> Reject
                            </button>
                        </div>
                    </div>
                 )}
            </div>

            {/* Subscription Details */}
            {canManageSubscription && (
                <>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ClockIcon className="h-6 w-6 text-purple-500" /> Subscription Status</h2>
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-gray-500 mb-2">Time Remaining</p>
                            <CountdownTimer expiryDate={user.subscriptionExpiry ? user.subscriptionExpiry : null} />
                        </div>
                        <div className="flex justify-between text-sm pt-4 border-t dark:border-gray-700">
                            <p><strong>Start Date:</strong> {proof.submittedAt.toLocaleDateString()}</p>
                            <p><strong>End Date:</strong> {user.subscriptionExpiry?.toLocaleDateString()}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Add More Time</label>
                            <div className="flex gap-2 mt-1">
                                <input type="number" value={daysToAdd} onChange={e => setDaysToAdd(Number(e.target.value))} className="w-full form-input" />
                                <button onClick={handleAddTime} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex-shrink-0">
                                    <PlusIcon className="h-5 w-5 mr-1 inline"/> Add Days
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Edit Subscription</h2>
                    <div className="flex items-center gap-4">
                        <select
                            value={currentUserSubStatus}
                            onChange={(e) => setCurrentUserSubStatus(e.target.value as AuthUser['subscriptionStatus'])}
                            className="w-full form-input"
                            aria-label="Subscription Status"
                        >
                            <option value="active">Success</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="none">Unactive</option>
                        </select>
                        <button
                            onClick={handleSubscriptionStatusSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex-shrink-0"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Changing this status will directly affect the user's subscription access. 'Success' means the subscription is active.
                    </p>
                </div>
                </>
            )}

             {/* Notification Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><PaperAirplaneIcon className="h-6 w-6 text-blue-500"/> Send Manual Notification</h2>
                
                <div className="space-y-4">
                     <div>
                        <label className="text-sm font-medium">Custom Topic</label>
                        <div className="flex gap-2 mt-1">
                             <input 
                                type="text"
                                value={customTopic}
                                onChange={e => setCustomTopic(e.target.value)}
                                placeholder="e.g., New feature available!"
                                className="w-full form-input"
                            />
                            <button onClick={() => handleGenerateMessage('custom')} disabled={isGenerating || !customTopic.trim()} className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white text-sm font-semibold rounded-md hover:bg-purple-700 disabled:bg-purple-400">
                                <SparklesIcon className="h-4 w-4"/> Generate
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Quick Actions</label>
                        <div className="flex gap-2 flex-wrap justify-start mt-2">
                            <button onClick={() => handleGenerateMessage('approved')} disabled={isGenerating} className="text-xs text-green-600 font-semibold disabled:text-gray-400 p-1 hover:bg-green-50 rounded">Generate Success Msg</button>
                            <button onClick={() => handleGenerateMessage('rejected')} disabled={isGenerating} className="text-xs text-red-600 font-semibold disabled:text-gray-400 p-1 hover:bg-red-50 rounded">Generate Failed Msg</button>
                            <button onClick={() => handleGenerateMessage('remaining')} disabled={isGenerating} className="text-xs text-purple-600 font-semibold disabled:text-gray-400 p-1 hover:bg-purple-50 rounded">Generate Expiring Msg</button>
                            <button onClick={() => handleGenerateMessage('finished')} disabled={isGenerating} className="text-xs text-purple-600 font-semibold disabled:text-gray-400 p-1 hover:bg-purple-50 rounded">Generate Expired Msg</button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Notification Message</label>
                        <textarea value={notificationMessage} onChange={e => setNotificationMessage(e.target.value)} rows={6} className="w-full form-input mt-1" />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Attach Image (Optional)</label>
                        <div className="mt-1 flex items-center gap-4">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageSelect}
                                className="text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                ref={fileInputRef}
                            />
                            {notificationImagePreview && (
                                <div className="relative">
                                    <img src={notificationImagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-md border dark:border-gray-600" />
                                    <button 
                                        onClick={clearImage} 
                                        className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full"
                                        aria-label="Remove image"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={handleSendNotification} disabled={isSaving || !notificationMessage.trim()} className="w-full mt-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                        {isSaving ? (notificationImageFile ? 'Uploading & Sending...' : 'Sending...') : 'Send Custom Notification'}
                    </button>
                </div>
            </div>

            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminPaymentProofDetailPage;