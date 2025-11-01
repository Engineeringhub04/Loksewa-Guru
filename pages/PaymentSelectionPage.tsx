import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon, QrCodeIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { db } from '../services/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import type { SubscriptionPlan, PaymentProof, AdminNotification, PromoCode } from '../types';
import PullToRefresh from '../components/PullToRefresh';
import { useToast } from '../contexts/ToastContext';
import { SUBSCRIPTION_PLANS } from '../constants';

// IMPORTANT: Replace this with the URL you copied from your Google Apps Script deployment.
const KHALTI_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwiW9pyxI4xB9BC-bSg8pQW89GqfApIV-211SheCIP6kRAPX-pbLwKzTcG8nmOhHw8Z/exec';

interface PaymentLogos {
    esewaLogoUrl: string;
    khaltiLogoUrl: string;
    esewaQrUrl: string;
    khaltiQrUrl: string;
}

// --- eSewa Helper Functions ---
async function generateESewaSignature(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const key = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, messageData);
    
    const signatureBytes = new Uint8Array(signatureBuffer);
    let binary = '';
    for (let i = 0; i < signatureBytes.byteLength; i++) {
        binary += String.fromCharCode(signatureBytes[i]);
    }
    return window.btoa(binary);
}

// --- Status Screens ---
const VerifyingScreen: React.FC<{ message?: string }> = ({ message = "Processing..." }) => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400"></div>
        <p className="text-white text-lg font-semibold mt-6">{message}</p>
        <p className="text-gray-300">Please do not close this window.</p>
    </div>
);

const SuccessRedirect: React.FC = () => {
    const [countdown, setCountdown] = useState(5);
    useEffect(() => {
        const timer = setInterval(() => setCountdown(prev => (prev > 1 ? prev - 1 : 0)), 1000);
        const redirectTimer = setTimeout(() => { window.location.href = 'https://kbr.com.np'; }, 5000);
        return () => { clearInterval(timer); clearTimeout(redirectTimer); };
    }, []);

    return (
        <div className="flex flex-col h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-center p-4">
            <CheckCircleIcon className="h-24 w-24 text-green-500 mb-4 animate-fade-in-scale" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Subscription Successful!</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Your plan has been activated.</p>
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Redirecting in...</p>
                <p className="text-5xl font-bold text-purple-600 dark:text-purple-400 mt-2">{countdown}</p>
            </div>
        </div>
    );
};

const FailureScreen: React.FC<{ onTryAgain: () => void }> = ({ onTryAgain }) => (
     <div className="flex flex-col h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-center p-4">
        <XCircleIcon className="h-24 w-24 text-red-500 mb-4 animate-fade-in-scale" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Payment Failed</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Your payment could not be processed. Please try again.</p>
        <button onClick={onTryAgain} className="mt-8 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg">
            Try Again
        </button>
    </div>
);

// --- Main Component ---
const PaymentSelectionPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { paymentGatewaySettings } = useData();

    const [plan, setPlan] = useState<SubscriptionPlan | null>(() => {
        if (location.state?.plan) return location.state.plan;
        try { const stored = sessionStorage.getItem('pendingPaymentPlan'); if (stored) return JSON.parse(stored); } catch (e) { console.error(e); }
        return null;
    });

    const [logos, setLogos] = useState<PaymentLogos>({ esewaLogoUrl: '', khaltiLogoUrl: '', esewaQrUrl: '', khaltiQrUrl: '' });
    const [loading, setLoading] = useState(true);
    const [whatsappUrl, setWhatsappUrl] = useState('');
    
    const [showManualPayment, setShowManualPayment] = useState(false);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const manualPaymentRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const timeoutRef = useRef<number | null>(null);

    const [esewaFormData, setEsewaFormData] = useState<Record<string, string> | null>(null);
    const [paymentResult, setPaymentResult] = useState<'success' | 'failure' | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    
    // New state for promo code
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);
    const [promoCodeMessage, setPromoCodeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isVerifyingPromoCode, setIsVerifyingPromoCode] = useState(false);
    const [originalPrice, setOriginalPrice] = useState<number | null>(null);
    const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);

    // Effect to parse original price from plan
    useEffect(() => {
        if (plan) {
            const price = parseFloat(plan.price.replace(/[^0-9.]/g, ''));
            if (!isNaN(price)) {
                setOriginalPrice(price);
            }
        }
    }, [plan]);

    const completeGatewayPayment = useCallback(async (paymentMethod: PaymentProof['paymentMethod']) => {
        setIsVerifying(true);
        showToast(`Verifying ${paymentMethod} payment...`, 'info');
        try {
            const storedPlanString = sessionStorage.getItem('pendingPaymentPlan');
            if (paymentMethod === 'eSewa') sessionStorage.removeItem('pendingPaymentPlan');
            if (!storedPlanString || !user) throw new Error("Payment session is invalid. Please start over.");
            
            const completedPlan: SubscriptionPlan = JSON.parse(storedPlanString);
            const batch = writeBatch(db);
            const planDetails = SUBSCRIPTION_PLANS.find(p => p.name === completedPlan.name);
            const expiryDate = new Date();
            planDetails?.price.includes('/yr') ? expiryDate.setFullYear(expiryDate.getFullYear() + 1) : expiryDate.setMonth(expiryDate.getMonth() + 1);

            const userRef = doc(db, "users", user.uid);
            batch.update(userRef, { subscriptionStatus: 'active', subscriptionExpiry: Timestamp.fromDate(expiryDate), planName: completedPlan.name });

            const proofRef = doc(collection(db, 'paymentProofs'));
            const proofPayload: Omit<PaymentProof, 'id'> = {
                userId: user.uid, userEmail: user.email, userName: user.fullName || '', planName: completedPlan.name, paymentMethod,
                screenshotUrl: 'verified_via_gateway', submittedAt: serverTimestamp() as any, status: 'approved' };
            batch.set(proofRef, proofPayload);

            const adminNotification: Omit<AdminNotification, 'id'> = {
                type: 'subscription', title: `New Subscription (${paymentMethod})`,
                message: `${user.fullName || user.email} subscribed to the ${completedPlan.name} plan.`,
                read: false, createdAt: serverTimestamp() as any, link: `/admin/payment-proofs/${proofRef.id}`, relatedId: proofRef.id };
            const adminNotifRef = doc(collection(db, 'adminNotifications'));
            batch.set(adminNotifRef, adminNotification);
            
            await batch.commit();
            setPaymentResult('success');
        } catch (error) {
            console.error(error); showToast((error as Error).message, 'error'); setPaymentResult('failure');
        } finally { setIsVerifying(false); }
    }, [user, showToast]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [logosSnap, contentSnap] = await Promise.all([getDoc(doc(db, 'settings', 'paymentLogos')), getDoc(doc(db, 'content', 'main'))]);
            if (logosSnap.exists()) setLogos(logosSnap.data() as PaymentLogos);
            if (contentSnap.exists()) setWhatsappUrl(contentSnap.data().socialLinks?.whatsapp || '#');
        } catch (error) { console.error(error); showToast("Could not load payment details.", "error"); }
        finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { if (!plan) { navigate('/subscription', { replace: true }); return; } fetchInitialData(); }, [plan, navigate, fetchInitialData]);

    useEffect(() => {
        const hashParams = new URLSearchParams(location.search);
        const esewaQStatus = hashParams.get('q');
        if (esewaQStatus === 'su') {
            const dataParam = hashParams.get('data');
            try { if (dataParam && JSON.parse(atob(dataParam)).status === 'COMPLETE') completeGatewayPayment('eSewa'); else setPaymentResult('failure'); } catch (e) { setPaymentResult('failure'); }
            setSearchParams({}, { replace: true });
        } else if (esewaQStatus === 'fu') { setPaymentResult('failure'); setSearchParams({}, { replace: true }); }
    }, [location, setSearchParams, completeGatewayPayment]);

    useEffect(() => {
        if (showManualPayment) {
            const timer = setTimeout(() => {
                manualPaymentRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showManualPayment]);

    const prepareEsewaData = useCallback(async () => {
        if (!plan || !user || originalPrice === null) return;
        setEsewaFormData(null);
        try {
            sessionStorage.setItem('pendingPaymentPlan', JSON.stringify(plan));
            const amount = discountedPrice ?? originalPrice;
            if (isNaN(amount)) throw new Error("Invalid plan price.");
            const transactionUuid = `${user.uid}-${Date.now()}`;
            const successUrl = `${window.location.origin}${window.location.pathname}#/subscription?q=su`;
            const failureUrl = `${window.location.origin}${window.location.pathname}#/subscription?q=fu`;
            await setDoc(doc(db, "transactions", transactionUuid), { userId: user.uid, planName: plan.name, amount, status: 'initiated', createdAt: serverTimestamp(), paymentGateway: 'eSewa' });
            const format = (n: number) => n.toFixed(2);
            const msg = `total_amount=${format(amount)},transaction_uuid=${transactionUuid},product_code=EPAYTEST`;
            const signature = await generateESewaSignature(msg, "8gBm/:&EnhH.1/q");
            setEsewaFormData({ "amount": format(amount), "tax_amount": format(0), "total_amount": format(amount), transaction_uuid: transactionUuid, "product_code": "EPAYTEST", "product_service_charge": format(0), "product_delivery_charge": format(0), success_url: successUrl, failure_url: failureUrl, signed_field_names: "total_amount,transaction_uuid,product_code", signature });
        } catch (error) { showToast(`Could not prepare eSewa payment: ${(error as Error).message}`, "error"); }
    }, [plan, user, showToast, originalPrice, discountedPrice]);

    useEffect(() => {
        prepareEsewaData();
        document.addEventListener('visibilitychange', prepareEsewaData);
        return () => document.removeEventListener('visibilitychange', prepareEsewaData);
    }, [prepareEsewaData]);
    
    const handleKhaltiPayment = async () => {
        if (KHALTI_WEB_APP_URL.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT')) {
            return showToast("Khalti payment is not configured by the administrator.", "error");
        }
        if (!plan || !user || originalPrice === null) return showToast('Plan or user information is missing.', 'error');
        
        setIsVerifying(true);
        showToast('Initializing Khalti payment...', 'info');
    
        try {
            const amountInNPR = discountedPrice ?? originalPrice;
            if (isNaN(amountInNPR)) throw new Error('Invalid plan price.');
            
            sessionStorage.setItem('pendingPaymentPlan', JSON.stringify(plan));
            
            const body = {
                amount: (amountInNPR * 100).toString(),
                productName: `${plan.name} Subscription`,
                userId: user.uid,
                userName: user.fullName || 'N/A',
                userEmail: user.email || 'N/A',
            };
    
            const response = await fetch(KHALTI_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain', },
                body: JSON.stringify(body),
            });
    
            if (!response.ok) {
                let errorDetails = `Status code: ${response.status}`;
                try {
                    const errorText = await response.text();
                     if (errorText) {
                        let parsedError = errorText;
                        try {
                            const errorJson = JSON.parse(errorText);
                            parsedError = errorJson.error_key || errorJson.detail || (typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error));
                        } catch (e) {
                            // Not a JSON error, use the raw text
                        }
                        errorDetails += `: ${parsedError.substring(0, 300)}`;
                    }
                } catch (e) { /* Failed to get text from the response body */ }
                throw new Error(`Failed to initiate Khalti payment. ${errorDetails}`);
            }
    
            const resultText = await response.text();
            if (resultText && resultText.startsWith('https://khalti.com')) {
                window.location.href = resultText;
            } else {
                try {
                    const resultJson = JSON.parse(resultText);
                    if (resultJson.payment_url) {
                        window.location.href = resultJson.payment_url;
                        return;
                    }
                } catch(e) { /* Not a URL or JSON */ }
                throw new Error(`Invalid response from payment server. Details: ${JSON.stringify({error: resultText.substring(0, 200)})}`);
            }
        } catch (error) {
            console.error("Khalti initialization failed:", error);
            showToast(`Khalti Error: ${(error as Error).message}`, 'error');
            setPaymentResult('failure');
            setIsVerifying(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !plan) return;
        const file = (formRef.current?.elements.namedItem('screenshot') as HTMLInputElement)?.files?.[0];
        if (!file) { setErrorMessage("Please select a screenshot file."); setUploadState('error'); return; }
        setUploadState('uploading'); setErrorMessage('');
        timeoutRef.current = window.setTimeout(() => { if (uploadState === 'uploading') { setErrorMessage("Upload timed out."); setUploadState('error'); }}, 60000);
        try {
            const formData = new FormData();
            formData.append('file', file); formData.append('upload_preset', 'filereceive');
            const response = await fetch('https://api.cloudinary.com/v1_1/dtuc0i86e/auto/upload', { method: 'POST', body: formData });
            if (!response.ok) throw new Error((await response.json()).error.message || 'Cloudinary upload failed.');
            const data = await response.json();
            const proofPayload: Omit<PaymentProof, 'id'> = { userId: user.uid, userEmail: user.email, userName: user.fullName || '', planName: plan.name, paymentMethod: 'eSewa', screenshotUrl: data.secure_url, submittedAt: serverTimestamp() as any, status: 'pending' };
            if (appliedPromoCode) {
                proofPayload.appliedPromoCode = appliedPromoCode.id;
            }
            if (data.delete_token) proofPayload.deleteToken = data.delete_token;
            const proofDocRef = await addDoc(collection(db, 'paymentProofs'), proofPayload);
            const adminNotification: Omit<AdminNotification, 'id'> = { type: 'subscription', title: 'New Subscription Proof', message: `${user.fullName || user.email} submitted proof for the ${plan.name} plan.`, read: false, createdAt: serverTimestamp() as any, link: `/admin/payment-proofs/${proofDocRef.id}`, relatedId: proofDocRef.id };
            await addDoc(collection(db, 'adminNotifications'), adminNotification);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setUploadState('success');
        } catch (error: any) {
             if (timeoutRef.current) clearTimeout(timeoutRef.current);
            console.error(error); setErrorMessage(`Upload failed: ${error.message}`); setUploadState('error');
        }
    };

    const handleApplyPromoCode = async () => {
        if (!promoCodeInput.trim() || !plan || originalPrice === null) return;
    
        setIsVerifyingPromoCode(true);
        setPromoCodeMessage(null);
    
        try {
            const codeRef = doc(db, 'promoCodes', promoCodeInput.trim());
            const codeSnap = await getDoc(codeRef);
    
            if (!codeSnap.exists()) {
                throw new Error('Invalid or expired promo code.');
            }
    
            const codeData = { id: codeSnap.id, ...codeSnap.data() } as PromoCode;
            
            const expiresAtDate = (codeData.expiresAt as any).toDate ? (codeData.expiresAt as any).toDate() : new Date(codeData.expiresAt);
    
            // Validations
            if (codeData.status !== 'active') throw new Error('This promo code is currently disabled.');
            if (expiresAtDate < new Date()) throw new Error('This promo code has expired.');
            if (codeData.maxUsage && codeData.usageCount >= codeData.maxUsage) throw new Error('This promo code has reached its usage limit.');
            if (!codeData.applicablePlans.includes(plan.name as 'Pro' | 'Premium')) throw new Error(`This code is not valid for the "${plan.name}" plan.`);
    
            // Apply discount
            const newPrice = originalPrice * (1 - codeData.discountPercentage / 100);
            setDiscountedPrice(newPrice);
            setAppliedPromoCode(codeData);
            setPromoCodeMessage({ text: `${codeData.discountPercentage}% discount applied!`, type: 'success' });
    
        } catch (error) {
            setPromoCodeMessage({ text: (error as Error).message, type: 'error' });
            setPromoCodeInput('');
        } finally {
            setIsVerifyingPromoCode(false);
        }
    };

    const handleRemovePromoCode = () => {
        setAppliedPromoCode(null);
        setDiscountedPrice(null);
        setPromoCodeMessage(null);
        setPromoCodeInput('');
    };

    const handleQrMethodClick = () => {
        setShowManualPayment(true);
    };
    
    if (!plan && !isVerifying && !paymentResult) return null;
    if (isVerifying) return <VerifyingScreen />;
    if (paymentResult === 'success') return <SuccessRedirect />;
    if (paymentResult === 'failure') return <FailureScreen onTryAgain={() => { setPaymentResult(null); setSearchParams({}, { replace: true }); navigate('/payment-selection', { state: { plan }}); }} />;
    
    return (
        <PullToRefresh onRefresh={fetchInitialData} className="h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto pb-24">
             <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Go Back"><ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" /></button>
                 <div className="flex-1 text-center"><h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Complete Your Payment</h1></div><div className="w-10"></div>
            </header>
            <main className="p-6 max-w-md mx-auto">
                 {plan && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-lg font-bold">Purchasing: {plan.name}</h2>
                        <div className="flex items-baseline gap-2">
                            {appliedPromoCode && originalPrice && (
                                <p className="text-xl font-normal text-gray-500 line-through">
                                    NPR {originalPrice.toFixed(2)}
                                </p>
                            )}
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {discountedPrice !== null ? `NPR ${discountedPrice.toFixed(2)}` : plan.price}
                            </p>
                        </div>
                    </div>
                 )}

                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                    <h3 className="text-lg font-semibold mb-3">Have a Promo Code?</h3>
                    {appliedPromoCode ? (
                        <div className="space-y-3">
                        <div className="flex justify-between items-center bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                            <p className="font-semibold text-green-800 dark:text-green-200 flex items-center">
                            <CheckCircleIcon className="h-5 w-5 inline mr-2" />
                            Code "{appliedPromoCode.id}" applied!
                            </p>
                            <button onClick={handleRemovePromoCode} className="text-sm font-semibold text-red-600 hover:underline">Remove</button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">You got a {appliedPromoCode.discountPercentage}% discount.</p>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                        <input
                            type="text"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                            placeholder="ENTER CODE"
                            className="w-full form-input font-mono"
                            disabled={isVerifyingPromoCode}
                        />
                        <button
                            onClick={handleApplyPromoCode}
                            disabled={isVerifyingPromoCode || !promoCodeInput}
                            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg disabled:bg-gray-400"
                        >
                            {isVerifyingPromoCode ? '...' : 'Apply'}
                        </button>
                        </div>
                    )}
                    {promoCodeMessage && (
                        <p className={`text-sm mt-2 ${promoCodeMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                        {promoCodeMessage.text}
                        </p>
                    )}
                 </div>
                
                {uploadState === 'success' ? (
                     <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl animate-fade-in-scale"><CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" /><h3 className="text-xl font-medium text-green-700 dark:text-green-300 mt-4">Submission Successful!</h3><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Your proof is submitted for review. Your subscription will be active shortly.</p><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg">Contact on WhatsApp for faster approval</a><button onClick={() => navigate('/profile')} className="mt-6 w-full px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg">Go to Profile</button></div>
                ) : ( <>
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-3 text-center">Choose A Payment Option</h3>
                        <div className="space-y-4">
                            {/* 1. QR Method */}
                            <button onClick={handleQrMethodClick} className="w-full flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent hover:border-purple-500 transition-colors">
                                <QrCodeIcon className="h-10 w-10 text-purple-500 flex-shrink-0" />
                                <div className="ml-4 text-left flex-1">
                                    <h4 className="font-bold text-gray-800 dark:text-white">QR Method</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Pay Manually & Upload Proof</p>
                                </div>
                                <ChevronDownIcon className="h-6 w-6 text-gray-400"/>
                            </button>

                            {/* 2. eSewa Block */}
                            <div className={`flex items-center p-4 rounded-lg shadow-md transition-colors ${paymentGatewaySettings.esewa.showComingSoon ? 'bg-gray-200 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`}>
                                <img src={logos.esewaLogoUrl} alt="eSewa" className={`h-10 w-10 object-contain rounded-full bg-white p-1 ${paymentGatewaySettings.esewa.showComingSoon ? 'opacity-50' : ''}`} />
                                <div className="ml-4 text-left flex-1">
                                    <h4 className={`font-bold ${paymentGatewaySettings.esewa.showComingSoon ? 'text-gray-500' : 'text-gray-800 dark:text-white'}`}>eSewa (Direct)</h4>
                                    {paymentGatewaySettings.esewa.showComingSoon ? (
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{paymentGatewaySettings.esewa.comingSoonText}</p>
                                    ) : esewaFormData ? (
                                        <form method="POST" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" target="_blank" className="mt-2">
                                            {Object.entries(esewaFormData).map(([k, v]) => (<input key={k} type="hidden" name={k} value={v} />))}
                                            <button type="submit" className="px-4 py-1 text-sm bg-green-600 text-white font-semibold rounded-full hover:bg-green-700">Pay Now</button>
                                        </form>
                                    ) : (
                                        <p className="text-sm text-gray-500">Preparing...</p>
                                    )}
                                </div>
                            </div>

                            {/* 3. Khalti Block */}
                            <div className={`flex items-center p-4 rounded-lg shadow-md transition-colors ${paymentGatewaySettings.khalti.showComingSoon ? 'bg-gray-200 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`}>
                                <img src={logos.khaltiLogoUrl} alt="Khalti" className={`h-10 w-10 object-contain rounded-full bg-white p-1 ${paymentGatewaySettings.khalti.showComingSoon ? 'opacity-50' : ''}`} />
                                <div className="ml-4 text-left flex-1">
                                     <h4 className={`font-bold ${paymentGatewaySettings.khalti.showComingSoon ? 'text-gray-500' : 'text-gray-800 dark:text-white'}`}>Khalti (Direct)</h4>
                                    {paymentGatewaySettings.khalti.showComingSoon ? (
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{paymentGatewaySettings.khalti.comingSoonText}</p>
                                    ) : (
                                        <button onClick={handleKhaltiPayment} className="mt-2 px-4 py-1 text-sm bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700">Pay Now</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {showManualPayment && (
                        <div ref={manualPaymentRef} className="pt-8 animate-fade-in">
                            <h3 className="text-lg font-semibold mb-3 text-center">Pay Manually & Upload Proof</h3>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
                                <h4 className="font-semibold mb-4">Scan to Pay</h4>
                                <div className="flex justify-around items-center gap-4">
                                    {logos.esewaQrUrl && <div><img src={logos.esewaQrUrl} alt="eSewa QR" className="w-32 h-32 mx-auto rounded-lg bg-white p-1"/><p className="text-xs mt-2">eSewa</p></div>}
                                    {logos.khaltiQrUrl && <div><img src={logos.khaltiQrUrl} alt="Khalti QR" className="w-32 h-32 mx-auto rounded-lg bg-white p-1"/><p className="text-xs mt-2">Khalti</p></div>}
                                </div>
                                <p className="mt-4 text-sm text-gray-500">After payment, upload a screenshot below.</p>
                            </div>
                            <form ref={formRef} onSubmit={handleUpload} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
                                <h4 className="font-semibold text-lg mb-4">Upload Screenshot</h4>
                                <div>
                                    <label htmlFor="screenshot" className="text-sm">Screenshot File</label>
                                    <input type="file" name="screenshot" id="screenshot" accept="image/*" required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                                </div>
                                {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
                                <button type="submit" disabled={uploadState === 'uploading'} className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white font-semibold rounded-lg disabled:bg-purple-400">
                                    {uploadState === 'uploading' ? 'Uploading...' : 'Submit Proof'}
                                    <ArrowUpTrayIcon className="h-5 w-5" />
                                </button>
                            </form>
                            <div className="mt-6 text-center text-sm p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p>For faster approval, contact us on WhatsApp.</p>
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-bold text-green-600 dark:text-green-400 hover:underline">Contact on WhatsApp</a>
                            </div>
                        </div>
                    )}
                </>)}
            </main>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </PullToRefresh>
    );
};

export default PaymentSelectionPage;