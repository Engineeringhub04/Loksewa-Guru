import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { PaymentProof, AuthUser } from '../../types';
import { BanknotesIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const AdminPaymentProofPage: React.FC = () => {
    const [proofs, setProofs] = useState<PaymentProof[]>([]);
    const [users, setUsers] = useState<Map<string, AuthUser>>(new Map());
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        let proofsLoaded = false;
        let usersLoaded = false;

        const checkLoadingDone = () => {
            if (proofsLoaded && usersLoaded) {
                setLoading(false);
            }
        };

        // Listener for payment proofs
        const proofsQuery = query(collection(db, "paymentProofs"), orderBy("submittedAt", "desc"));
        const unsubscribeProofs = onSnapshot(proofsQuery, (querySnapshot) => {
            const list = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    submittedAt: data.submittedAt ? (data.submittedAt as Timestamp).toDate() : new Date(),
                } as PaymentProof;
            });
            setProofs(list);
            proofsLoaded = true;
            checkLoadingDone();
        }, (error) => {
            console.error("Error fetching payment proofs:", error);
            alert("Failed to load payment proofs.");
            proofsLoaded = true;
            checkLoadingDone();
        });

        // Listener for users
        const usersQuery = query(collection(db, "users"));
        const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
            const userMap = new Map<string, AuthUser>();
            querySnapshot.forEach(doc => {
                const data = doc.data();
                userMap.set(doc.id, {
                    uid: doc.id,
                    ...data,
                    subscriptionExpiry: data.subscriptionExpiry ? (data.subscriptionExpiry as Timestamp).toDate() : null,
                } as AuthUser);
            });
            setUsers(userMap);
            usersLoaded = true;
            checkLoadingDone();
        }, (error) => {
            console.error("Error fetching users:", error);
            // Don't alert, page can function partially
            usersLoaded = true;
            checkLoadingDone();
        });

        return () => {
            unsubscribeProofs();
            unsubscribeUsers();
        };
    }, []);

    const handleSeeMore = (proofId: string) => {
        navigate(`/admin/payment-proofs/${proofId}`);
    };
    
    // Get dynamic status based on both proof and user data
    const getDynamicStatus = (proof: PaymentProof): { text: string; className: string } => {
        if (proof.status === 'pending') {
            return { text: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' };
        }
        if (proof.status === 'rejected') {
            return { text: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
        }
        
        if (proof.status === 'approved') {
            const user = users.get(proof.userId);
            if (user) {
                switch (user.subscriptionStatus) {
                    case 'active':
                        return { text: 'Success', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
                    case 'failed':
                        return { text: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
                    case 'expired':
                    case 'none':
                    default:
                        return { text: 'Unactive', className: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
                }
            }
        }

        // Fallback for approved proof when user data might not be loaded yet
        return { text: 'Success', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    };
    
    if (loading) {
        return <div className="p-6">Loading payment proofs...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <BanknotesIcon className="h-6 w-6"/>
                    Payment Proofs
                </h1>
            </header>

            {proofs.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">No payment proofs have been submitted by users yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">S.N.</th>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Subscription Type</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proofs.map((proof, index) => {
                                const dynamicStatus = getDynamicStatus(proof);
                                return (
                                <tr key={proof.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4">{index + 1}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        {proof.userName || 'N/A'}
                                        <p className="text-xs font-normal text-gray-500">{proof.userEmail}</p>
                                    </td>
                                    <td className="px-6 py-4">{proof.planName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${dynamicStatus.className}`}>
                                            {dynamicStatus.text}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleSeeMore(proof.id)} className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
                                            See More <ChevronRightIcon className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminPaymentProofPage;