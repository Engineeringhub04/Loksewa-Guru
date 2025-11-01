
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { CalculatorIcon } from '../constants';

const EngineeringCalculatorPage: React.FC = () => {
    const [display, setDisplay] = useState('0');
    const [expression, setExpression] = useState('');

    const handleButtonClick = (value: string) => {
        if (value === 'C') {
            setDisplay('0');
            setExpression('');
        } else if (value === 'DEL') {
            if (expression.length > 0) {
                setExpression(expression.slice(0, -1));
            }
        } else if (value === '=') {
            try {
                // Using a safer evaluation method
                const result = new Function('return ' + expression.replace(/%/g, '/100'))();
                setDisplay(String(result));
                setExpression(String(result));
            } catch (error) {
                setDisplay('Error');
                setExpression('');
            }
        } else {
            setExpression(prev => prev + value);
        }
    };
    
    useEffect(() => {
        setDisplay(expression || '0');
    }, [expression]);

    const buttons = [
        'C', 'DEL', '%', '/',
        '7', '8', '9', '*',
        '4', '5', '6', '-',
        '1', '2', '3', '+',
        '00', '0', '.', '=',
    ];

    const buttonClass = (btn: string) => {
        if (['/', '*', '-', '+', '='].includes(btn)) {
            return 'bg-purple-500 hover:bg-purple-600 text-white';
        }
        if (['C', 'DEL', '%'].includes(btn)) {
            return 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500';
        }
        return 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600';
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 pb-24">
             <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </Link>
                 <div className="flex-1 text-center">
                     <div className="flex items-center justify-center gap-2">
                        <CalculatorIcon className="h-6 w-6 text-purple-500" />
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Engineering Calculator</h1>
                    </div>
                 </div>
                 <div className="w-10"></div>
            </header>

            <main className="flex-1 p-4 flex flex-col justify-center">
                <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl">
                    {/* Display */}
                    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg mb-4 text-right">
                        <p className="text-gray-500 text-sm break-all">{expression || ' '}</p>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white break-all">{display}</p>
                    </div>

                    {/* Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                        {buttons.map(btn => (
                            <button
                                key={btn}
                                onClick={() => handleButtonClick(btn)}
                                className={`p-4 rounded-lg text-xl font-semibold transition-colors duration-200 ${buttonClass(btn)}`}
                            >
                                {btn}
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EngineeringCalculatorPage;
