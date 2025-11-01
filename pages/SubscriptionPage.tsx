import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, StarIcon } from '@heroicons/react/24/solid';
import { SUBSCRIPTION_PLANS } from '../constants';
import type { SubscriptionPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';

const SubscriptionPlanCard: React.FC<{ 
    plan: SubscriptionPlan; 
    onChoosePlan: (plan: SubscriptionPlan) => void; 
    isCurrentPlan: boolean; 
    isPremiumUser: boolean;
}> = ({ plan, onChoosePlan, isCurrentPlan, isPremiumUser }) => {
    const isBasicPlanAndPremiumUser = plan.name === 'Basic' && isPremiumUser;

    const getButtonText = () => {
        if (isCurrentPlan) return 'Your Current Plan';
        if (isBasicPlanAndPremiumUser) return 'Cannot select on Premium';
        return 'Choose Plan';
    };

    return (
        <div className={`relative border-2 rounded-xl p-6 transform transition-transform duration-300 ${isCurrentPlan ? 'scale-105 shadow-xl' : 'hover:scale-105 hover:shadow-xl'} ${plan.popular ? 'border-purple-500 bg-purple-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
            {plan.popular && !isCurrentPlan && <div className="absolute top-0 right-4 -mt-3 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">POPULAR</div>}
            {plan.bestValue && !isCurrentPlan && <div className="absolute top-0 right-4 -mt-3 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>}
            {isCurrentPlan && <div className="absolute top-0 right-4 -mt-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">CURRENT PLAN</div>}
            
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{plan.name}</h3>
            <p className="text-3xl font-extrabold my-4 text-gray-900 dark:text-gray-100">{plan.price}</p>
            
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300 mb-6">
                {plan.features.map(f => (
                    <li key={f} className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        {f}
                    </li>
                ))}
            </ul>

            <button 
                onClick={() => onChoosePlan(plan)} 
                className={`w-full py-3 font-semibold rounded-lg transition-colors ${
                    isCurrentPlan 
                        ? 'bg-green-600 text-white cursor-default'
                        : isBasicPlanAndPremiumUser
                        ? 'bg-gray-400 dark:bg-gray-500 text-gray-800 dark:text-gray-300 cursor-not-allowed'
                        : plan.popular 
                            ? 'bg-purple-600 text-white hover:bg-purple-700' 
                            : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
                disabled={isCurrentPlan || isBasicPlanAndPremiumUser}
            >
                {getButtonText()}
            </button>
        </div>
    );
};


const SubscriptionPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Get user from auth context

    const currentUserPlanName = user?.subscriptionStatus === 'active' ? user.planName : 'Basic';
    const hasPremiumPlan = user?.subscriptionStatus === 'active';

    const handleChoosePlan = (plan: SubscriptionPlan) => {
        if (plan.name === 'Basic') {
            // This case should not be hit if user is premium, as button will be disabled.
            // This handles the case for non-premium users choosing the free plan.
            if (hasPremiumPlan) {
                alert("You cannot downgrade to the free plan while a premium subscription is active.");
            } else {
                alert("Your free account has been successfully activated!");
                navigate('/profile');
            }
        } else {
            // For Pro or Premium, navigate to payment selection
            navigate('/payment-selection', { state: { plan } });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
             <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Profile">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </Link>
                 <div className="flex-1 text-center">
                     <div className="flex items-center justify-center gap-2">
                        <StarIcon className="h-6 w-6 text-yellow-500" />
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Premium Subscription</h1>
                    </div>
                 </div>
                 <div className="w-10"></div>
            </header>

            <main className="p-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Unlock Your Full Potential</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                        Choose a plan to get access to all our premium features, including an ad-free experience, unlimited AI interviews, and exclusive study content.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {SUBSCRIPTION_PLANS.map(plan => (
                        <SubscriptionPlanCard 
                            key={plan.name} 
                            plan={plan} 
                            onChoosePlan={handleChoosePlan}
                            isCurrentPlan={plan.name === currentUserPlanName}
                            isPremiumUser={hasPremiumPlan}
                        />
                    ))}
                </div>

                 <div className="text-center mt-8 text-sm text-gray-500">
                    <p>Payments are processed securely. You can cancel your subscription at any time.</p>
                </div>
            </main>
        </div>
    );
};

export default SubscriptionPage;