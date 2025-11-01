import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, writeBatch, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useData } from '../../contexts/DataContext';
import { ICONS_MAP, TAILWIND_TEXT_COLORS, UPCOMING_FEATURES, ADDITIONAL_FEATURES } from '../../constants';
import { ArrowsUpDownIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../contexts/ToastContext';
import type { ServiceDocument, AdditionalFeatureData, UpcomingFeatureData } from '../../types';
import Modal from '../../components/Modal';
import _ from 'lodash';

type Layouts = {
    services: ServiceDocument[];
    additionalFeatures: AdditionalFeatureData[];
    upcomingFeatures: UpcomingFeatureData[];
};
type ListName = keyof Layouts;

// Re-defining ToggleSwitch locally to make the component self-contained
const ToggleSwitch: React.FC<{ enabled: boolean, setEnabled: (enabled: boolean) => void }> = ({ enabled, setEnabled }) => (
    <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        className={`${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0`}
        aria-checked={enabled}
        role="switch"
    >
        <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
    </button>
);


const AdminFeatureLayoutPage: React.FC = () => {
    const { services: initialServices, appContent: initialAppContent, refreshData } = useData();
    const { showToast } = useToast();
    
    const [layouts, setLayouts] = useState<Layouts | null>(null);
    const [initialLayouts, setInitialLayouts] = useState<Layouts | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [draggedItem, setDraggedItem] = useState<{ item: any; sourceList: ListName } | null>(null);
    const [dragOverList, setDragOverList] = useState<ListName | null>(null);
    const [dragOverItemKey, setDragOverItemKey] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ item: any; sourceList: ListName; targetList: ListName } | null>(null);
    const [replaceTarget, setReplaceTarget] = useState<string>('');
    
    // Initialize state from context, merging with constants to show all features
    useEffect(() => {
        if (initialServices.length > 0 && initialAppContent) {
            const upcomingMap = new Map<string, UpcomingFeatureData>();
            const additionalMap = new Map<string, AdditionalFeatureData>();

            UPCOMING_FEATURES.forEach(f => upcomingMap.set(f.key, { ...f, enabled: true }));
            ADDITIONAL_FEATURES.forEach(f => additionalMap.set(f.key, { ...f, enabled: true }));

            initialAppContent.upcomingFeatures.forEach(f => upcomingMap.set(f.key, f));
            initialAppContent.additionalFeatures.forEach(f => additionalMap.set(f.key, f));

            const allUpcoming = Array.from(upcomingMap.values());
            const allAdditional = Array.from(additionalMap.values());

            const correctedServices = initialServices.map(service => ({
                ...service,
                key: service.key || service.id
            }));

            const initialData = {
                services: _.cloneDeep(correctedServices),
                additionalFeatures: _.cloneDeep(allAdditional),
                upcomingFeatures: _.cloneDeep(allUpcoming),
            };

            setLayouts(initialData);
            setInitialLayouts(initialData);
            setIsLoading(false);
        }
    }, [initialServices, initialAppContent]);

    // Track changes
    useEffect(() => {
        if (layouts && initialLayouts) {
            setIsDirty(!_.isEqual(layouts, initialLayouts));
        }
    }, [layouts, initialLayouts]);

    const handleToggle = (listName: ListName, itemKey: string, isEnabled: boolean) => {
        setLayouts(prev => {
            if (!prev) return null;
            const listToUpdate = prev[listName] as Array<any>;
            const newList = listToUpdate.map(item =>
                item.key === itemKey ? { ...item, enabled: isEnabled } : item
            );
            return { ...prev, [listName]: newList };
        });
    };

    const handleDelete = async (listName: ListName, itemKey: string) => {
        if (!layouts) return;
        const itemToDelete = layouts[listName].find((item: any) => item.key === itemKey);
        if (!itemToDelete) return;
    
        if (window.confirm(`Are you sure you want to permanently delete "${itemToDelete.name}"? This action cannot be undone.`)) {
            setIsSaving(true);
            try {
                if (listName === 'services') {
                    // If it's a service, delete the document from the 'services' collection
                    await deleteDoc(doc(db, "services", itemKey));
                } else {
                    // If it's an additional or upcoming feature, remove it from the array in the 'content/main' document
                    const contentRef = doc(db, 'content', 'main');
                    const contentSnap = await getDoc(contentRef);
                    if (contentSnap.exists()) {
                        const currentContent = contentSnap.data();
                        const updatedArray = (currentContent[listName] || []).filter((item: any) => item.key !== itemKey);
                        await updateDoc(contentRef, { [listName]: updatedArray });
                    } else {
                        throw new Error("Main content document not found. Cannot delete feature.");
                    }
                }
    
                // If DB operation is successful, update local state
                const updateLayouts = (prev: Layouts | null): Layouts | null => {
                    if (!prev) return null;
                    const newList = (prev[listName] as Array<any>).filter(item => item.key !== itemKey);
                    return { ...prev, [listName]: newList };
                };
                
                setLayouts(updateLayouts);
                setInitialLayouts(updateLayouts); // Sync the base state to reflect deletion
    
                showToast(`"${itemToDelete.name}" was permanently deleted.`, 'success');
    
            } catch (error) {
                console.error("Error deleting item:", error);
                showToast(`Failed to delete item: ${(error as Error).message}`, 'error');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, item: any, sourceList: ListName) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedItem({ item, sourceList });
        setTimeout(() => {
            (e.target as HTMLElement).style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
        setDraggedItem(null);
        setDragOverList(null);
        setDragOverItemKey(null);
    };

    const handleDragOverContainer = (e: React.DragEvent, targetList: ListName) => {
        e.preventDefault();
        setDragOverList(targetList);
        if (draggedItem && draggedItem.sourceList !== targetList) {
            setDragOverItemKey(null);
        }
    };
    
    const handleDragEnterItem = (e: React.DragEvent, itemKey: string, currentList: ListName) => {
        e.preventDefault();
        if (draggedItem?.sourceList === currentList) {
            setDragOverItemKey(itemKey);
        } else {
             setDragOverItemKey(null); // Clear item key if moving between lists
        }
    };

    const convertItem = (item: any, targetList: ListName): any => {
        const itemKey = item.key || item.id;
        const isEnabled = item.enabled !== undefined ? item.enabled : true;
    
        switch(targetList) {
            case 'services':
                return {
                    id: itemKey,
                    key: itemKey,
                    name: item.name,
                    iconKey: item.iconKey,
                    path: item.path || `/${itemKey}`,
                    color: item.color || TAILWIND_TEXT_COLORS[Math.floor(Math.random() * TAILWIND_TEXT_COLORS.length)],
                    order: 99,
                };
            case 'additionalFeatures':
                return {
                    key: itemKey,
                    name: item.name,
                    iconKey: item.iconKey,
                    path: item.path || `/${itemKey}`,
                    enabled: isEnabled,
                };
            case 'upcomingFeatures':
                return {
                    key: itemKey,
                    name: item.name,
                    iconKey: item.iconKey,
                    enabled: isEnabled,
                };
            default:
                return item;
        }
    };
    
    const handleDrop = (e: React.DragEvent, targetList: ListName) => {
        e.preventDefault();
        setDragOverList(null);
        setDragOverItemKey(null);
        if (!draggedItem || !layouts) return;
    
        const { item, sourceList } = draggedItem;
    
        // Case 1: Reordering within the same list
        if (sourceList === targetList) {
            if (!dragOverItemKey || dragOverItemKey === item.key) return;
    
            const list = [...layouts[sourceList]];
            const dragIndex = list.findIndex(i => i.key === item.key);
            const dropIndex = list.findIndex(i => i.key === dragOverItemKey);
    
            if (dragIndex === -1 || dropIndex === -1) return;
    
            const [removedItem] = list.splice(dragIndex, 1);
            list.splice(dropIndex, 0, removedItem);
    
            setLayouts(prev => prev ? { ...prev, [sourceList]: list } : null);
        }
        // Case 2: Moving to a different list
        else {
            if (targetList === 'services') {
                setModalData({ item, sourceList, targetList });
                setIsModalOpen(true);
                return;
            }
    
            const sourceArray = layouts[sourceList].filter(i => i.key !== item.key);
            const targetArray = [...layouts[targetList]];
            const convertedItem = convertItem(item, targetList);
            targetArray.push(convertedItem);
            
            setLayouts(prev => prev ? {
                ...prev,
                [sourceList]: sourceArray,
                [targetList]: targetArray
            } : null);
        }
    };

    const handleModalAction = (action: 'add' | 'replace') => {
        if (!modalData) return;
    
        const { item: itemToMove, sourceList, targetList } = modalData;
    
        setLayouts(currentLayouts => {
            if (!currentLayouts) return null;
    
            const newSourceArray = [...currentLayouts[sourceList]];
            const newTargetArray = [...currentLayouts[targetList]];
    
            const itemIndex = newSourceArray.findIndex(i => i.key === itemToMove.key);
            if (itemIndex === -1) return currentLayouts;
            
            const [originalItem] = newSourceArray.splice(itemIndex, 1);
            const newItemForTargetList = convertItem(originalItem, targetList);
    
            if (action === 'add') {
                newTargetArray.push(newItemForTargetList);
            } else if (action === 'replace') {
                if (!replaceTarget) {
                    showToast('Please select a service to replace.', 'info');
                    return currentLayouts;
                }
                
                const replacedItemIndex = newTargetArray.findIndex(i => i.key === replaceTarget);
                if (replacedItemIndex === -1) {
                    showToast('Item to replace not found.', 'error');
                    return currentLayouts;
                }
                
                const [itemToMoveBack] = newTargetArray.splice(replacedItemIndex, 1, newItemForTargetList);
                
                if (itemToMoveBack) {
                    const convertedItemForSourceList = convertItem(itemToMoveBack, sourceList);
                    newSourceArray.push(convertedItemForSourceList);
                }
            }
            
            return {
                ...currentLayouts,
                [sourceList]: newSourceArray,
                [targetList]: newTargetArray,
            };
        });
    
        setIsModalOpen(false);
        setModalData(null);
        setReplaceTarget('');
    };
    
    const handleSaveChanges = async () => {
        if (!layouts || !isDirty) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
    
            const contentDocRef = doc(db, 'content', 'main');
            batch.update(contentDocRef, {
                additionalFeatures: layouts.additionalFeatures,
                upcomingFeatures: layouts.upcomingFeatures,
            });
    
            const finalServiceKeys = new Set(layouts.services.map(s => s.key));
            initialLayouts!.services.forEach(initialService => {
                if (!finalServiceKeys.has(initialService.key)) {
                    const serviceDocRef = doc(db, 'services', initialService.id);
                    batch.delete(serviceDocRef);
                }
            });
    
            layouts.services.forEach((service, index) => {
                const serviceDocRef = doc(db, 'services', service.key);
                const { id, enabled, ...serviceData } = service;
                const finalServiceData = { ...serviceData, order: index + 1 };
                batch.set(serviceDocRef, finalServiceData);
            });
            
            await batch.commit();
            
            setInitialLayouts(_.cloneDeep(layouts)); // Update initial state to match saved state
            setIsDirty(false);
            showToast('Homepage layout updated successfully!');
    
        } catch (error) {
            console.error('Error saving layout changes:', error);
            showToast(`Failed to save layout: ${(error as Error).message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !layouts) return <div>Loading layout editor...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <header className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowsUpDownIcon className="h-6 w-6"/> Feature Layout</h1>
                    <p className="text-sm text-gray-500">Drag and drop features to rearrange the homepage. Use the toggles to show or hide them.</p>
                </div>
                <button
                    onClick={handleSaveChanges}
                    disabled={!isDirty || isSaving}
                    className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(Object.keys(layouts) as ListName[]).map(listName => (
                    <div
                        key={listName}
                        onDragOver={(e) => handleDragOverContainer(e, listName)}
                        onDrop={(e) => handleDrop(e, listName)}
                        onDragLeave={() => setDragOverList(null)}
                        className={`p-4 bg-gray-100 dark:bg-gray-900 rounded-lg min-h-[300px] border-2 transition-colors ${dragOverList === listName && dragOverItemKey === null ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-dashed border-gray-300 dark:border-gray-700'}`}
                    >
                        <h2 className="font-bold text-lg mb-4 text-center">{_.startCase(listName)}</h2>
                        <div className="space-y-2">
                            {layouts[listName].map((item: any) => {
                                const Icon = ICONS_MAP[item.iconKey];
                                const isBeingDragged = draggedItem?.item.key === item.key;
                                const showPlaceholder = dragOverList === listName && dragOverItemKey === item.key && draggedItem?.item.key !== item.key;
                                return (
                                    <React.Fragment key={item.key}>
                                        {showPlaceholder && (
                                            <div className="h-1 my-1 bg-purple-400 dark:bg-purple-600 rounded-full transition-all" />
                                        )}
                                        <div
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item, listName)}
                                            onDragEnd={handleDragEnd}
                                            onDragEnter={(e) => handleDragEnterItem(e, item.key, listName)}
                                            className={`p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm flex items-center justify-between gap-3 cursor-grab transition-opacity ${isBeingDragged ? 'opacity-50' : 'opacity-100'}`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {Icon && <Icon className={`h-5 w-5 flex-shrink-0 ${item.color || 'text-gray-500'}`} />}
                                                <span className="text-sm font-medium truncate">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {listName !== 'services' && (
                                                    <ToggleSwitch 
                                                        enabled={item.enabled}
                                                        setEnabled={(isEnabled) => handleToggle(listName, item.key, isEnabled)}
                                                    />
                                                )}
                                                <button
                                                    onClick={() => handleDelete(listName, item.key)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                    title={`Delete ${item.name}`}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && modalData && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add "${modalData.item.name}" to Services`}>
                    <div className="space-y-6">
                        <p>How would you like to add this feature to the "Our Services" section?</p>
                        <button onClick={() => handleModalAction('add')} className="w-full px-4 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600">
                            Add as a New Service
                        </button>
                        <div className="border-t dark:border-gray-600 pt-4">
                            <label className="block text-sm font-medium mb-2">Or, Replace an Existing Service:</label>
                            <div className="flex gap-2">
                                <select value={replaceTarget} onChange={e => setReplaceTarget(e.target.value)} className="w-full form-input">
                                    <option value="" disabled>Select a service to replace...</option>
                                    {layouts.services.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                                </select>
                                <button onClick={() => handleModalAction('replace')} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 flex-shrink-0 flex items-center gap-1">
                                    <ArrowPathIcon className="h-4 w-4"/> Replace
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default AdminFeatureLayoutPage;