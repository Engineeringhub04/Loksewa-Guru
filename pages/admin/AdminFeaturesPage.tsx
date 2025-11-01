
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { PromoCode } from '../../types';
import { ArrowLeftIcon, TicketIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';

const AdminPromoCodeEditorPage: React.FC = () => {
    const { codeId: paramCodeId } = useParams<{ codeId: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const isEditMode = !!paramCodeId;

    const [loading, setLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [codeId, setCodeId] = useState('');
    const [prefixKeyword, setPrefixKeyword] = useState('');
    const [discount, setDiscount] = useState(10);
    const [expiry, setExpiry] = useState('');
    const [expiryTime, setExpiryTime] = useState('23:59');
    const [plans, setPlans] = useState<('Pro' | 'Premium')[]>(['Pro', 'Premium']);
    const [maxUsage, setMaxUsage] = useState<number | undefined>(undefined);
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'active' | 'disabled'>('active');

    useEffect(() => {
        const fetchCodeData = async () => {
            if (isEditMode && paramCodeId) {
                try {
                    const docRef = doc(db, 'promoCodes', paramCodeId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const code = { id: docSnap.id, ...docSnap.data() } as PromoCode;
                        setCodeId(code.id);
                        setDiscount(code.discountPercentage);
                        const expiresAtDate = (code.expiresAt as any).toDate ? (code.expiresAt as any).toDate() : new Date(code.expiresAt);
                        setExpiry(expiresAtDate.toISOString().split('T')[0]);
                        
                        const hours = String(expiresAtDate.getHours()).padStart(2, '0');
                        const minutes = String(expiresAtDate.getMinutes()).padStart(2, '0');
                        setExpiryTime(`${hours}:${minutes}`);

                        setPlans(code.applicablePlans);
                        setMaxUsage(code.maxUsage);
                        setDescription(code.description || '');
                        setStatus(code.status);
                    } else {
                        showToast('Promo code not found.', 'error');
                        navigate('/admin/promo-codes');
                    }
                } catch (error) {
                    showToast('Failed to load promo code.', 'error');
                    navigate('/admin/promo-codes');
                }
            } else {
                // Set defaults for new code
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 30);
                setExpiry(tomorrow.toISOString().split('T')[0]);
            }
            setLoading(false);
        };

        fetchCodeData();
    }, [isEditMode, paramCodeId, navigate, showToast]);
    
    const handleGenerateCode = () => {
        const sanitizedKeyword = prefixKeyword.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const prefix = sanitizedKeyword || 'LG';
        const generatedCode = `${prefix}${discount}`;
        setCodeId(generatedCode);
    };

    const handlePlanToggle = (plan: 'Pro' | 'Premium') => {
        setPlans(prev => prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codeId.trim()) {
            showToast('Promo code cannot be empty.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const codeRef = doc(db, 'promoCodes', codeId.trim());
            const payload: Omit<PromoCode, 'createdAt' | 'usageCount' | 'expiresAt'> & { expiresAt: Timestamp } = {
                id: codeId.trim(),
                discountPercentage: discount,
                expiresAt: Timestamp.fromDate(new Date(`${expiry}T${expiryTime}`)),
                applicablePlans: plans,
                status,
                description,
                ...(maxUsage && { maxUsage }),
            };

            if (isEditMode) {
                await setDoc(codeRef, payload, { merge: true });
            } else {
                await setDoc(codeRef, { ...payload, createdAt: serverTimestamp(), usageCount: 0 });
            }

            showToast('Promo code saved successfully!');
            navigate('/admin/promo-codes');
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6">Loading promo code editor...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <header className="flex items-center mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={() => navigate('/admin/promo-codes')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <TicketIcon className="h-6 w-6"/>
                    {isEditMode ? 'Edit Promo Code' : 'Create New Promo Code'}
                </h1>
            </header>
            <form onSubmit={handleSave} className="space-y-4 max-w-2xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Keyword for Code (optional)</label>
                        <input
                            value={prefixKeyword}
                            onChange={e => setPrefixKeyword(e.target.value)}
                            className="w-full form-input mt-1"
                            placeholder="e.g., TIHAR, DASHAIN"
                            disabled={isEditMode}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Promo Code</label>
                        <div className="flex gap-2 mt-1">
                            <input value={codeId} onChange={e => setCodeId(e.target.value.toUpperCase())} className="w-full form-input font-mono" required disabled={isEditMode} />
                            {!isEditMode && <button type="button" onClick={handleGenerateCode} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">Generate</button>}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Discount (%)</label>
                        <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-full form-input mt-1" min="1" max="100" required />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Expiry Date & Time</label>
                        <div className="flex gap-2 mt-1">
                            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="w-2/3 form-input" required />
                            <input type="time" value={expiryTime} onChange={e => setExpiryTime(e.target.value)} className="w-1/3 form-input" required />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium">Applicable Plans</label>
                    <div className="flex gap-4 mt-2">
                        <label className="flex items-center"><input type="checkbox" checked={plans.includes('Pro')} onChange={() => handlePlanToggle('Pro')} className="form-checkbox"/> <span className="ml-2">Pro</span></label>
                        <label className="flex items-center"><input type="checkbox" checked={plans.includes('Premium')} onChange={() => handlePlanToggle('Premium')} className="form-checkbox"/> <span className="ml-2">Premium</span></label>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Max Usage (optional)</label>
                        <input type="number" value={maxUsage || ''} onChange={e => setMaxUsage(e.target.value ? Number(e.target.value) : undefined)} placeholder="Unlimited" className="w-full form-input mt-1" min="1" />
                    </div>
                     <div>
                        <label className="text-sm font-medium">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full form-input mt-1">
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full form-input mt-1" />
                </div>
                <div className="flex justify-end pt-4 border-t dark:border-gray-600 gap-2">
                    <button type="button" onClick={() => navigate('/admin/promo-codes')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-purple-600 text-white rounded-md">{isSaving ? 'Saving...' : 'Save Code'}</button>
                </div>
            </form>
            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}.form-checkbox{color:#8B5CF6;border-radius:0.25rem;border-color:#D1D5DB}.dark .form-checkbox{background-color:#4B5563;border-color:#6B7280}`}</style>
        </div>
    );
};

export default AdminPromoCodeEditorPage;
