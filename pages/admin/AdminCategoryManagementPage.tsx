import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ICONS_MAP, ICON_KEYS, TAILWIND_COLORS } from '../../constants';
import type { MainQuizCategory, SubQuizCategory, MCQCategoryStructure } from '../../types';
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import { SparklesIcon } from '@heroicons/react/24/outline';
import Modal from '../../components/Modal';
import { suggestIconForCategory } from '../../services/geminiService';


// --- MODAL FOR EDITING MAIN CATEGORY ---
const MainCategoryForm: React.FC<{
    categoryToEdit: MainQuizCategory;
    onSave: (id: string, data: { title: string; iconKey: string; color: string; }) => void;
    onCancel: () => void;
    onDelete: (id: string, title: string) => void;
}> = ({ categoryToEdit, onSave, onCancel, onDelete }) => {
    const [title, setTitle] = useState(categoryToEdit.title);
    const [iconKey, setIconKey] = useState(categoryToEdit.iconKey);
    const [color, setColor] = useState(categoryToEdit.color);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(categoryToEdit.id, { title, iconKey, color });
    };

    return (
        <Modal isOpen={true} onClose={onCancel} title={`Edit Section: ${categoryToEdit.title}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Section Title" className="w-full form-input mt-1" required />
                </div>
                <div>
                    <label className="text-sm font-medium">Icon</label>
                    <select value={iconKey} onChange={e => setIconKey(e.target.value)} className="w-full form-input mt-1">
                        {ICON_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="grid grid-cols-8 gap-2 mt-1 bg-gray-100 dark:bg-gray-900/50 p-2 rounded-lg">
                        {TAILWIND_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''}`}></button>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t dark:border-gray-600">
                    <button type="button" onClick={() => onDelete(categoryToEdit.id, categoryToEdit.title)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 flex items-center gap-2">
                       <TrashIcon className="h-4 w-4" /> Delete
                    </button>
                    <div className="flex gap-2">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Save Changes</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};


// --- MODAL FOR EDITING/CREATING SUB-CATEGORY ---
const SubCategoryForm: React.FC<{
    mainCategory: MainQuizCategory;
    subCategoryToEdit?: SubQuizCategory | null;
    onSave: (mainCat: MainQuizCategory, subCatData: SubQuizCategory, existingKey?: string) => void;
    onCancel: () => void;
    onDelete: (mainCat: MainQuizCategory, subCat: SubQuizCategory) => void;
}> = ({ mainCategory, subCategoryToEdit, onSave, onCancel, onDelete }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconKey, setIconKey] = useState(ICON_KEYS[0]);
    const [color, setColor] = useState(TAILWIND_COLORS[0]);

    useEffect(() => {
        if (subCategoryToEdit) {
            setName(subCategoryToEdit.name);
            setDescription(subCategoryToEdit.description);
            setIconKey(subCategoryToEdit.iconKey);
            setColor(subCategoryToEdit.color);
        } else {
            setName('');
            setDescription('');
            setIconKey(ICON_KEYS[0]);
            setColor(TAILWIND_COLORS[Math.floor(Math.random() * TAILWIND_COLORS.length)]); // Start with a random color
        }
    }, [subCategoryToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const key = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (!name || !key) {
            alert("Name is required.");
            return;
        }
        const subCategoryData: SubQuizCategory = { key, name, description, iconKey, color };
        onSave(mainCategory, subCategoryData, subCategoryToEdit?.key);
    };
    
    return (
        <Modal isOpen={true} onClose={onCancel} title={subCategoryToEdit ? `Edit ${subCategoryToEdit.name}` : `Add Sub-section to ${mainCategory.title}`}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Sub-section Name" className="w-full form-input mt-1" required />
                </div>
                <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description" className="w-full form-input mt-1" rows={3}></textarea>
                </div>
                <div>
                    <label className="text-sm font-medium">Icon</label>
                    <select value={iconKey} onChange={e => setIconKey(e.target.value)} className="w-full form-input mt-1">
                        {ICON_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="grid grid-cols-8 gap-2 mt-1 bg-gray-100 dark:bg-gray-900/50 p-2 rounded-lg">
                        {TAILWIND_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''}`}></button>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t dark:border-gray-600">
                    {subCategoryToEdit && (
                        <button type="button" onClick={() => onDelete(mainCategory, subCategoryToEdit)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 flex items-center gap-2">
                           <TrashIcon className="h-4 w-4" /> Delete
                        </button>
                    )}
                    {!subCategoryToEdit && <div></div>}
                    <div className="flex gap-2">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Save</button>
                    </div>
                </div>
            </form>
        </Modal>
    )
};

// --- FORM FOR CREATING NEW MAIN CATEGORY ---
const CategoryCreationForm: React.FC<{ onSaveMain: (data: Omit<MainQuizCategory, 'id' | 'subCategories'>) => void }> = ({ onSaveMain }) => {
    const [title, setTitle] = useState('');
    const [iconKey, setIconKey] = useState(ICON_KEYS[0]);
    const [color, setColor] = useState(TAILWIND_COLORS[10]);
    const [isSuggestingIcon, setIsSuggestingIcon] = useState(false);

    // Debounce effect for AI call
    useEffect(() => {
        if (title.trim().length < 3) {
            return; // Don't trigger for very short titles
        }

        const handler = setTimeout(async () => {
            setIsSuggestingIcon(true);
            try {
                const suggestedKey = await suggestIconForCategory(title);
                setIconKey(suggestedKey);
            } catch (error) {
                console.error("Failed to get AI icon suggestion", error);
            } finally {
                setIsSuggestingIcon(false);
            }
        }, 800); // 800ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [title]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const key = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (!title || !key) { alert("Title is required."); return; }
        onSaveMain({ title, key, iconKey, color });
        setTitle('');
        setIconKey(ICON_KEYS[0]); // Reset icon
    };
    
    const IconComponent = ICONS_MAP[iconKey];

    return (
        <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg mt-8 bg-gray-50 dark:bg-gray-800/30">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-purple-500" />
                Create New Main Section (with AI)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Start typing a title and our AI will suggest an appropriate icon. You can change it manually at any time.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="text-sm font-medium">Section Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Medical Entrance, Banking, Law" className="w-full form-input mt-1" required />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium flex items-center gap-2">
                            Icon
                            {isSuggestingIcon && <span className="text-xs text-purple-500">(AI is thinking...)</span>}
                        </label>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="relative w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg">
                                {isSuggestingIcon ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                                ) : (
                                    IconComponent && <IconComponent className="h-7 w-7 text-gray-700 dark:text-gray-200" />
                                )}
                            </div>
                            <select value={iconKey} onChange={e => setIconKey(e.target.value)} className="flex-1 form-input">
                                {ICON_KEYS.map(key => <option key={key} value={key}>{key.replace('Icon', '').replace('Component', '')}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Color</label>
                        <div className="grid grid-cols-8 gap-2 mt-2 bg-gray-100 dark:bg-gray-900/50 p-2 rounded-lg">
                            {TAILWIND_COLORS.map(c => (<button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${c} ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''}`}></button>))}
                        </div>
                    </div>
                </div>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-transform hover:scale-105">
                    <PlusCircleIcon className="h-5 w-5"/> Add Section
                </button>
            </form>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---
const AdminCategoryManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<MCQCategoryStructure>([]);
    const [loading, setLoading] = useState(true);
    
    // State for Modals
    const [subCategoryModalState, setSubCategoryModalState] = useState<{ isOpen: boolean; mainCategory: MainQuizCategory | null; subCategoryToEdit: SubQuizCategory | null; }>({ isOpen: false, mainCategory: null, subCategoryToEdit: null });
    const [mainCategoryModalState, setMainCategoryModalState] = useState<{ isOpen: boolean; categoryToEdit: MainQuizCategory | null; }>({ isOpen: false, categoryToEdit: null });

    // New state for confirmation modal
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'main' | 'sub'; data: any; mainCategory?: MainQuizCategory } | null>(null);

    // --- Data Fetching ---
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "quizCategories"), orderBy("title"));
            const querySnapshot = await getDocs(q);
            const fetchedCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MainQuizCategory));
            setCategories(fetchedCategories);
        } catch (error) {
            console.error("Error fetching categories:", error);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // --- Modal Controls ---
    const openSubCategoryModal = (mainCategory: MainQuizCategory, subCategoryToEdit: SubQuizCategory | null = null) => setSubCategoryModalState({ isOpen: true, mainCategory, subCategoryToEdit });
    const closeSubCategoryModal = () => setSubCategoryModalState({ isOpen: false, mainCategory: null, subCategoryToEdit: null });
    const openMainCategoryModal = (category: MainQuizCategory) => setMainCategoryModalState({ isOpen: true, categoryToEdit: category });
    const closeMainCategoryModal = () => setMainCategoryModalState({ isOpen: false, categoryToEdit: null });

    // --- Firestore Handlers ---
    const handleCreateMainCategory = async (categoryData: Omit<MainQuizCategory, 'id'|'subCategories'>) => {
        const id = categoryData.key;
        if (!id) { alert("Category key is required."); return; }
        try {
            await setDoc(doc(db, 'quizCategories', id), { ...categoryData, subCategories: [] });
            alert("Main section created successfully!");
            await fetchCategories();
        } catch (error) { console.error("Error saving main category:", error); alert("Failed to save main category."); }
    };
    
    const handleUpdateMainCategory = async (id: string, data: { title: string; iconKey: string; color: string; }) => {
        try {
            await updateDoc(doc(db, 'quizCategories', id), data);
            alert("Main section updated successfully!");
            await fetchCategories();
            closeMainCategoryModal();
        } catch (error) { console.error("Error updating main category:", error); alert("Failed to update main category."); }
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;

        const { type, data, mainCategory } = confirmDelete;
        try {
            if (type === 'main') {
                await deleteDoc(doc(db, 'quizCategories', data.id));
                alert(`Section "${data.title}" deleted successfully.`);
                closeMainCategoryModal();
            } else if (type === 'sub' && mainCategory) {
                const newSubCategories = (mainCategory.subCategories || []).filter(sc => sc.key !== data.key);
                await updateDoc(doc(db, 'quizCategories', mainCategory.id), { subCategories: newSubCategories });
                alert(`Sub-section "${data.name}" deleted successfully.`);
                closeSubCategoryModal();
            }
            await fetchCategories();
        } catch (error) {
            console.error(`Error deleting ${type} category:`, error);
            alert(`Failed to delete ${type} category.`);
        } finally {
            setConfirmDelete(null);
        }
    };


    const handleSaveSubCategory = async (mainCategory: MainQuizCategory, subCategoryData: SubQuizCategory, existingKey?: string) => {
        const currentSubCategories = mainCategory.subCategories || [];
        if (subCategoryData.key !== existingKey && currentSubCategories.some(sc => sc.key === subCategoryData.key)) {
            alert(`Error: A sub-section with the key "${subCategoryData.key}" already exists...`); return;
        }
        const newSubCategories = existingKey ? currentSubCategories.map(sc => sc.key === existingKey ? subCategoryData : sc) : [...currentSubCategories, subCategoryData];
        try {
            await updateDoc(doc(db, 'quizCategories', mainCategory.id), { subCategories: newSubCategories });
            alert("Sub-section saved successfully!");
            await fetchCategories();
            closeSubCategoryModal();
        } catch (error) { console.error("Error saving sub category:", error); alert("Failed to save sub category."); }
    };
    
    // --- Render Logic ---
    if (loading) {
        return (
            <div className="flex justify-center items-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-fade-in">
            {confirmDelete && (
                <Modal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    title="Confirm Deletion"
                >
                    <p>
                        Are you sure you want to delete the {confirmDelete.type === 'main' ? 'entire section' : 'sub-section'} "{confirmDelete.data.title || confirmDelete.data.name}"?
                        {confirmDelete.type === 'main' && ' All its sub-sections will also be removed.'} This cannot be undone.
                    </p>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                    </div>
                </Modal>
            )}

            <header className="flex items-center mb-6 border-b dark:border-gray-700 pb-4">
                 <button onClick={() => navigate('/admin/quizzes')} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to Quizzes">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Quiz Sections</h1>
            </header>
            
            <main className="space-y-6">
               {categories.map(mainCat => {
                    const Icon = ICONS_MAP[mainCat.iconKey] || PencilIcon;
                   return (
                   <div key={mainCat.id} className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                       <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50">
                           <div className="flex items-center gap-3">
                               <span className={`w-3 h-6 rounded ${mainCat.color}`}></span>
                               <Icon className="h-6 w-6 text-gray-600 dark:text-gray-300"/>
                               <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{mainCat.title}</h3>
                           </div>
                           <div className="flex gap-3">
                                <button onClick={() => openMainCategoryModal(mainCat)} className="text-gray-400 hover:text-blue-500" aria-label={`Edit ${mainCat.title}`}><PencilIcon className="h-5 w-5" /></button>
                            </div>
                       </div>
                       <div className="p-4 space-y-2">
                           {(mainCat.subCategories || []).length > 0 ? (mainCat.subCategories || []).map(subCat => (
                               <div key={subCat.key} className="flex justify-between items-center text-sm p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                   <span className="text-gray-700 dark:text-gray-300">{subCat.name}</span>
                                   <div className="flex gap-3">
                                      <button onClick={() => openSubCategoryModal(mainCat, subCat)} className="text-gray-400 hover:text-blue-500" aria-label={`Edit ${subCat.name}`}><PencilIcon className="h-4 w-4" /></button>
                                   </div>
                               </div>
                           )) : <p className="text-sm text-gray-500 dark:text-gray-400 px-2">No sub-sections yet.</p>}
                            <button onClick={() => openSubCategoryModal(mainCat)} className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:underline p-2 mt-2">
                                <PlusCircleIcon className="h-5 w-5" /> Add Sub-section
                            </button>
                       </div>
                   </div>
               )})}
            </main>
            
            <CategoryCreationForm onSaveMain={handleCreateMainCategory} />
            
            {mainCategoryModalState.isOpen && mainCategoryModalState.categoryToEdit && (
                <MainCategoryForm
                    categoryToEdit={mainCategoryModalState.categoryToEdit}
                    onSave={handleUpdateMainCategory}
                    onCancel={closeMainCategoryModal}
                    onDelete={(id, title) => setConfirmDelete({ type: 'main', data: { id, title } })}
                />
            )}
            
            {subCategoryModalState.isOpen && subCategoryModalState.mainCategory && (
                <SubCategoryForm
                    mainCategory={subCategoryModalState.mainCategory}
                    subCategoryToEdit={subCategoryModalState.subCategoryToEdit}
                    onSave={handleSaveSubCategory}
                    onCancel={closeSubCategoryModal}
                    onDelete={(mainCat, subCat) => setConfirmDelete({ type: 'sub', data: subCat, mainCategory: mainCat })}
                />
            )}

            <style>{`
                .form-input {
                    display: block;
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    color: #111827;
                    background-color: #fff;
                    border: 1px solid #D1D5DB;
                    border-radius: 0.375rem;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                }
                .dark .form-input {
                    background-color: #374151;
                    border-color: #4B5563;
                    color: #F9FAFB;
                }
                .form-input:focus {
                    outline: 2px solid transparent;
                    outline-offset: 2px;
                    --tw-ring-color: #8B5CF6;
                    border-color: #8B5CF6;
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AdminCategoryManagementPage;