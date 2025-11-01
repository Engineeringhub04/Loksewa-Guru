
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, onSnapshot, doc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import type { PromoCode } from '../../types';
import { TrashIcon, PencilIcon, PlusIcon, TicketIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';

const CountdownTimer: React.FC<{ expiryDate: Date }> = ({ expiryDate }) => {
    const calculateTimeLeft = useCallback(() => {
        const difference = +new Date(expiryDate) - +new Date();
        if (difference <= 0) return null;

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
    }, [expiryDate]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timerId = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timerId);
    }, [calculateTimeLeft]);

    if (!timeLeft) {
        return <span className="text-xs font-semibold text-red-500">Expired</span>;
    }

    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
    if (timeLeft.hours > 0) parts.push(`${timeLeft.hours}h`);
    if (timeLeft.minutes > 0) parts.push(`${timeLeft.minutes}m`);

    if (parts.length > 0) {
        return <span className="text-xs font-semibold text-green-600 dark:text-green-400">{parts.join(' ')} left</span>;
    }

    if (timeLeft.seconds > 0) {
        return <span className="text-xs font-semibold text-orange-500">{timeLeft.seconds}s left</span>;
    }
    
    return <span className="text-xs font-semibold text-red-500">Expired</span>;
};


const AdminPromoCodePage: React.FC = () => {
    const [codes, setCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState<PromoCode | null>(null);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, 'promoCodes', confirmDelete.id));
            showToast('Promo code deleted successfully.');
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setConfirmDelete(null);
        }
    };

    useEffect(() => {
        const q = query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const codesList = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    id: d.id,
                    expiresAt: (data.expiresAt as Timestamp).toDate(),
                    createdAt: (data.createdAt as Timestamp).toDate(),
                } as PromoCode;
            });
            setCodes(codesList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="p-6">Loading promo codes...</div>
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
            <header className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><TicketIcon className="h-6 w-6"/> Promo Codes</h1>
                <button onClick={() => navigate('/admin/promo-codes/new')} className="flex items-center gap-2 px-3 py-2 md:px-4 text-sm md:text-base bg-purple-600 text-white rounded-lg"><PlusIcon className="h-5 w-5"/> Create Code</button>
            </header>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3">Code</th>
                            <th className="px-6 py-3">Discount</th>
                            <th className="px-6 py-3">Usage</th>
                            <th className="px-6 py-3">Time Remaining</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {codes.map(code => {
                            const isExpired = code.expiresAt < new Date();
                            const statusText = code.status === 'disabled' ? 'Disabled' : isExpired ? 'Expired' : 'Active';
                            const statusColor = code.status === 'disabled' ? 'bg-gray-500' : isExpired ? 'bg-red-500' : 'bg-green-500';
                            return (
                                <tr key={code.id} className="border-b dark:border-gray-700">
                                    <td className="px-6 py-4 font-mono font-bold">{code.id}</td>
                                    <td className="px-6 py-4">{code.discountPercentage}%</td>
                                    <td className="px-6 py-4">{code.usageCount}{code.maxUsage ? ` / ${code.maxUsage}` : ''}</td>
                                    <td className="px-6 py-4">
                                        <CountdownTimer expiryDate={code.expiresAt} />
                                    </td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs text-white rounded-full ${statusColor}`}>{statusText}</span></td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => navigate(`/admin/promo-codes/edit/${code.id}`)}><PencilIcon className="h-5 w-5 text-blue-500"/></button>
                                        <button onClick={() => setConfirmDelete(code)}><TrashIcon className="h-5 w-5 text-red-500"/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
                {codes.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No promo codes found.</p>
                ) : (
                    codes.map(code => {
                        const isExpired = code.expiresAt < new Date();
                        const statusText = code.status === 'disabled' ? 'Disabled' : isExpired ? 'Expired' : 'Active';
                        const statusColor = code.status === 'disabled' ? 'bg-gray-500' : isExpired ? 'bg-red-500' : 'bg-green-500';
                        return (
                            <div key={code.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-mono font-bold text-lg text-gray-800 dark:text-gray-100">{code.id}</p>
                                        <span className={`px-2 py-0.5 text-xs text-white rounded-full ${statusColor}`}>{statusText}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => navigate(`/admin/promo-codes/edit/${code.id}`)} className="p-2 -m-2"><PencilIcon className="h-5 w-5 text-blue-500"/></button>
                                        <button onClick={() => setConfirmDelete(code)} className="p-2 -m-2"><TrashIcon className="h-5 w-5 text-red-500"/></button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t dark:border-gray-600 grid grid-cols-3 gap-2 text-center text-sm">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Discount</p>
                                        <p className="font-semibold text-gray-700 dark:text-gray-200">{code.discountPercentage}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Usage</p>
                                        <p className="font-semibold text-gray-700 dark:text-gray-200">{code.usageCount}{code.maxUsage ? `/${code.maxUsage}` : ''}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Time Left</p>
                                        <div className="font-semibold text-gray-700 dark:text-gray-200">
                                            <CountdownTimer expiryDate={code.expiresAt} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
            
            {confirmDelete && <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Deletion">
                 <p>Are you sure you want to delete the code "{confirmDelete.id}"? This cannot be undone.</p>
                 <div className="flex justify-end gap-4 mt-6">
                     <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                     <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                 </div>
            </Modal>}
        </div>
    );
};

export default AdminPromoCodePage;
