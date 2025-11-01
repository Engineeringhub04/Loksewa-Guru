
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { ConverterIcon } from '../constants';

type ConversionType = 'Length' | 'Weight';

const CONVERSION_UNITS = {
    Length: {
        'Meter (m)': 1,
        'Kilometer (km)': 1000,
        'Centimeter (cm)': 0.01,
        'Foot (ft)': 0.3048,
        'Inch (in)': 0.0254,
    },
    Weight: {
        'Kilogram (kg)': 1,
        'Gram (g)': 0.001,
        'Pound (lb)': 0.453592,
        'Ounce (oz)': 0.0283495,
    },
};

const UnitConverterPage: React.FC = () => {
    const [conversionType, setConversionType] = useState<ConversionType>('Length');
    const [fromUnit, setFromUnit] = useState<string>('Meter (m)');
    const [toUnit, setToUnit] = useState<string>('Foot (ft)');
    const [fromValue, setFromValue] = useState<string>('1');
    const [toValue, setToValue] = useState<string>('');

    const units = CONVERSION_UNITS[conversionType];

    useEffect(() => {
        // Reset units when conversion type changes
        const unitKeys = Object.keys(units);
        setFromUnit(unitKeys[0]);
        setToUnit(unitKeys[1] || unitKeys[0]);
    }, [conversionType, units]);

    useEffect(() => {
        const convert = () => {
            const from = parseFloat(fromValue);
            if (isNaN(from)) {
                setToValue('');
                return;
            }
            
            const fromRate = units[fromUnit as keyof typeof units];
            const toRate = units[toUnit as keyof typeof units];
            
            const valueInBase = from * fromRate;
            const result = valueInBase / toRate;

            setToValue(result.toFixed(4));
        };
        convert();
    }, [fromValue, fromUnit, toUnit, units]);

    const handleSwap = () => {
        setFromUnit(toUnit);
        setToUnit(fromUnit);
        setFromValue(toValue);
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-gray-50 dark:bg-gray-900 pb-24">
             <header className="sticky top-0 p-4 flex items-center border-b dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 z-10">
                 <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Home">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                 </Link>
                 <div className="flex-1 text-center">
                     <div className="flex items-center justify-center gap-2">
                        <ConverterIcon className="h-6 w-6 text-green-500" />
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Unit Converter</h1>
                    </div>
                 </div>
                 <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6 flex flex-col items-center justify-center">
                <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conversion Type</label>
                        <select
                            value={conversionType}
                            onChange={(e) => setConversionType(e.target.value as ConversionType)}
                            className="mt-1 block w-full p-2 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                        >
                            <option>Length</option>
                            <option>Weight</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        {/* From Unit */}
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
                             <div className="flex gap-2 mt-1">
                                <input
                                    type="number"
                                    value={fromValue}
                                    onChange={(e) => setFromValue(e.target.value)}
                                    className="w-2/3 p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                                />
                                <select 
                                    value={fromUnit} 
                                    onChange={e => setFromUnit(e.target.value)}
                                    className="w-1/3 p-2 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                >
                                    {Object.keys(units).map(unit => <option key={unit}>{unit}</option>)}
                                </select>
                             </div>
                        </div>

                        <div className="flex justify-center">
                            <button onClick={handleSwap} className="p-2 rounded-full bg-purple-500 text-white hover:bg-purple-600">
                                <ArrowPathIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* To Unit */}
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
                             <div className="flex gap-2 mt-1">
                                <input
                                    type="number"
                                    value={toValue}
                                    readOnly
                                    className="w-2/3 p-2 border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                />
                                <select 
                                    value={toUnit} 
                                    onChange={e => setToUnit(e.target.value)}
                                    className="w-1/3 p-2 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md"
                                >
                                    {Object.keys(units).map(unit => <option key={unit}>{unit}</option>)}
                                </select>
                             </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UnitConverterPage;
