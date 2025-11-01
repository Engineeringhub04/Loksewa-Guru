import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ICONS_MAP, ICON_KEYS, TAILWIND_TEXT_COLORS } from '../../constants';
import type { ServiceDocument } from '../../types';
import { PlusCircleIcon, TrashIcon, PencilIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/solid';
import Modal from '../../components/Modal';
import { Link } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

const ServiceFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<ServiceDocument, 'id'>) => void;
    serviceToEdit: ServiceDocument | null;
}> = ({ isOpen, onClose, onSave, serviceToEdit }) => {
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [path, setPath] = useState('');
    const [iconKey, setIconKey] = useState(ICON_KEYS[0]);
    const [color, setColor] = useState(TAILWIND_TEXT_COLORS[0]);
    const [order, setOrder] = useState(10);
    
    useEffect(() => {
        if (serviceToEdit) {
            setName(serviceToEdit.name);
            setKey(serviceToEdit.key);
            setPath(serviceToEdit.path);
            setIconKey(serviceToEdit.iconKey);
            setColor(serviceToEdit.color);
            setOrder(serviceToEdit.order);
        } else {
            setName('');
            setKey('');
            setPath('/');
            setIconKey(ICON_KEYS[0]);
            setColor(TAILWIND_TEXT_COLORS[0]);
            setOrder(99);
        }
    }, [serviceToEdit, isOpen]);

    useEffect(() => {
        if (!serviceToEdit && name) {
            setKey(name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        }
    }, [name, serviceToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, key, path, iconKey, color, order });
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={serviceToEdit ? 'Edit Service' : 'Add New Service'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Service Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Syllabus" className="w-full form-input mt-1" required />
                </div>
                 <div>
                    <label className="text-sm font-medium">Unique Key</label>
                    <input value={key} onChange={e => setKey(e.target.value)} placeholder="auto-generated-from-name" className="w-full form-input mt-1" required disabled={!!serviceToEdit} />
                    {!serviceToEdit && <p className="text-xs text-gray-500 mt-1">This is a unique ID. It will be auto-generated from the name and cannot be changed later.</p>}
                </div>
                 <div>
                    <label className="text-sm font-medium">Path</label>
                    <input value={path} onChange={e => setPath(e.target.value)} placeholder="/syllabus" className="w-full form-input mt-1" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Icon</label>
                        <select value={iconKey} onChange={e => setIconKey(e.target.value)} className="w-full form-input mt-1">
                            {ICON_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Order</label>
                        <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-full form-input mt-1" required />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium">Color</label>
                    <select value={color} onChange={e => setColor(e.target.value)} className="w-full form-input mt-1">
                        {TAILWIND_TEXT_COLORS.map(c => <option key={c} value={c} className={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex justify-end pt-4 border-t dark:border-gray-600 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Save Service</button>
                </div>
            </form>
        </Modal>
    );
};


const AdminServicesPage: React.FC = () => {
    const [services, setServices] = useState<ServiceDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<ServiceDocument | null>(null);
    const { showToast } = useToast();

    const servicePathMap: { [key: string]: string } = {
        'syllabus': 'syllabus',
        'notes': 'notes',
        'notices': 'notices',
        'offline-test': 'offline-tests',
        'iq-questions': 'iq-quizzes',
        'gk-questions': 'gk-quizzes',
        'ai-interview': 'ai-interview',
    };

    const fetchServices = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "services"), orderBy("order"));
            const querySnapshot = await getDocs(q);
            const fetchedServices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceDocument));
            setServices(fetchedServices);
        } catch (error) {
            console.error("Error fetching services:", error);
            showToast("Failed to load services.", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);
    
    const handleAddNew = () => {
        setServiceToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (service: ServiceDocument) => {
        setServiceToEdit(service);
        setIsModalOpen(true);
    };

    const handleDelete = async (service: ServiceDocument) => {
        if (!window.confirm(`Are you sure you want to delete the service "${service.name}"? This cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, "services", service.id));
            showToast("Service deleted successfully.");
            fetchServices();
        } catch (error) {
            console.error("Error deleting service:", error);
            showToast("Failed to delete service.", "error");
        }
    };
    
    const handleSave = async (data: Omit<ServiceDocument, 'id'>) => {
        try {
            const docId = serviceToEdit ? serviceToEdit.id : data.key;
            await setDoc(doc(db, "services", docId), data);
            showToast(`Service "${data.name}" saved successfully.`);
            fetchServices();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving service:", error);
            showToast("Failed to save service.", "error");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-fade-in">
             <header className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Homepage Services</h1>
                <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">
                    <PlusCircleIcon className="h-5 w-5" /> Add New Service
                </button>
            </header>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Order</th>
                            <th className="px-6 py-3">Icon</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Path</th>
                            <th className="px-6 py-3">Manage</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(service => {
                            const Icon = ICONS_MAP[service.iconKey];
                            const managePath = servicePathMap[service.key];
                            return (
                                <tr key={service.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                    <td className="px-6 py-4 text-center">{service.order}</td>
                                    <td className="px-6 py-4">
                                        {Icon && <Icon className={`h-6 w-6 ${service.color}`} />}
                                    </td>
                                    <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">{service.name}</th>
                                    <td className="px-6 py-4">{service.path}</td>
                                    <td className="px-6 py-4">
                                        {managePath && (
                                            <Link 
                                                to={`/admin/${managePath}`}
                                                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-semibold"
                                            >
                                                <ClipboardDocumentListIcon className="h-4 w-4" /> Content
                                            </Link>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 flex items-center gap-4">
                                        <button onClick={() => handleEdit(service)} className="text-blue-600 hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleDelete(service)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <ServiceFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                serviceToEdit={serviceToEdit}
            />

            <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;font-size:0.875rem;line-height:1.25rem;color:#111827;background-color:#fff;border:1px solid #D1D5DB;border-radius:0.375rem;box-shadow:0 1px 2px 0 rgba(0,0,0,.05)}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}.form-input:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-color:#8B5CF6;border-color:#8B5CF6}.animate-fade-in{animation:fade-in .5s ease-out forwards}@keyframes fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    );
};

export default AdminServicesPage;