import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import type { LocalTodo } from '../types';
import KeepBottomNav from '../components/KeepBottomNav';
import Modal from '../components/Modal';

const ALARM_SOUND_URL = 'https://www.soundjay.com/buttons/beep-07a.mp3';

const TodosPage: React.FC = () => {
    const [todos, setTodos] = useState<LocalTodo[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state for new todo
    const [newTitle, setNewTitle] = useState('');
    const [newTime, setNewTime] = useState('');

    const [ringingTodo, setRingingTodo] = useState<LocalTodo | null>(null);

    const triggeredAlarms = useRef(new Set<string>());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Load todos from localStorage on mount
    useEffect(() => {
        try {
            const savedTodos = localStorage.getItem('loksewa-local-todos');
            if (savedTodos) {
                setTodos(JSON.parse(savedTodos));
            }
        } catch (error) {
            console.error('Failed to load todos from localStorage', error);
        }
        // Preload the audio
        audioRef.current = new Audio(ALARM_SOUND_URL);
    }, []);

    // Effect for checking alarms every second
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            // Find the first due and untriggered todo
            const dueTodo = todos.find(todo => 
                todo.time === currentTime && 
                !todo.completed &&
                !triggeredAlarms.current.has(todo.id)
            );

            if (dueTodo) {
                setRingingTodo(dueTodo);
                triggeredAlarms.current.add(dueTodo.id);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [todos]);

    // Effect to control audio playback based on ringingTodo state
    useEffect(() => {
        if (ringingTodo && audioRef.current) {
            audioRef.current.loop = true;
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // This error is expected if pause() is called before play() completes,
                    // for instance when an alarm is dismissed very quickly.
                    // We only log errors that are not the expected 'AbortError'.
                    if (error.name !== 'AbortError') {
                        console.error("Audio play failed:", error);
                    }
                });
            }
        } else if (!ringingTodo && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [ringingTodo]);


    const saveTodosToStorage = (updatedTodos: LocalTodo[]) => {
        try {
            localStorage.setItem('loksewa-local-todos', JSON.stringify(updatedTodos));
        } catch (error) {
            console.error('Failed to save todos to localStorage', error);
        }
    };

    const handleSaveTodo = () => {
        if (!newTitle.trim() || !newTime) {
            alert('Please enter a title and select a time for your to-do.');
            return;
        }

        const newTodo: LocalTodo = {
            id: Date.now().toString(),
            title: newTitle.trim(),
            time: newTime,
            completed: false,
        };

        const updatedTodos = [newTodo, ...todos];
        setTodos(updatedTodos);
        saveTodosToStorage(updatedTodos);
        setIsModalOpen(false);
        setNewTitle('');
        setNewTime('');
    };
    
    const handleToggleComplete = (id: string) => {
        const updatedTodos = todos.map(todo => {
            if (todo.id === id) {
                // If a task is being marked as incomplete, allow its alarm to trigger again
                if (todo.completed) {
                    triggeredAlarms.current.delete(id);
                }
                return { ...todo, completed: !todo.completed };
            }
            return todo;
        });
        setTodos(updatedTodos);
        saveTodosToStorage(updatedTodos);
    };

    const handleDeleteTodo = (id: string) => {
        if (!window.confirm('Are you sure you want to delete this to-do?')) return;
        const updatedTodos = todos.filter(todo => todo.id !== id);
        setTodos(updatedTodos);
        saveTodosToStorage(updatedTodos);
    };

    const handleDismissAlarm = () => {
        if (ringingTodo) {
            // Mark the todo as complete
            handleToggleComplete(ringingTodo.id);
            // Clear the ringing todo to hide the popup and stop the sound
            setRingingTodo(null);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black pb-20 text-white">
            <main className="flex-1 p-4 w-full max-w-md mx-auto">
                <h1 className="text-3xl font-bold text-white mb-6">All to-dos</h1>

                {todos.length === 0 ? (
                    <div className="text-center py-20">
                        <h3 className="text-lg font-semibold text-gray-400">Your to-do list is empty</h3>
                        <p className="text-gray-500">Tap the '+' button to add a task.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todos.map(todo => (
                            <div key={todo.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${todo.completed ? 'bg-gray-800/50' : 'bg-gray-800'}`}>
                                <input
                                    type="checkbox"
                                    checked={todo.completed}
                                    onChange={() => handleToggleComplete(todo.id)}
                                    className="h-6 w-6 rounded-full text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-600"
                                />
                                <div className="flex-1">
                                    <p className={`font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-white'}`}>{todo.title}</p>
                                    <p className="text-xs text-gray-400">{todo.time}</p>
                                </div>
                                <button onClick={() => handleDeleteTodo(todo.id)} className="p-2 text-gray-500 hover:text-red-500">
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-20 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-transform hover:scale-110 z-20"
                aria-label="Add new to-do"
            >
                <PlusIcon className="h-8 w-8" />
            </button>

            <KeepBottomNav activeTab="todos" />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New To-do">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To-do Name</label>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="e.g., Study Chapter 5"
                            className="w-full form-input mt-1"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Set Alarm Time</label>
                        <input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="w-full form-input mt-1"
                        />
                    </div>
                    <div className="flex justify-end pt-4 border-t dark:border-gray-700 gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={handleSaveTodo} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save To-do</button>
                    </div>
                </div>
            </Modal>
            
            {ringingTodo && (
                <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-slide-in-up">
                    <div className="max-w-md mx-auto bg-blue-500 text-white rounded-lg shadow-2xl p-4 flex justify-between items-center">
                        <div>
                            <p className="font-bold">Reminder!</p>
                            <p>{ringingTodo.title}</p>
                        </div>
                        <button
                            onClick={handleDismissAlarm}
                            className="px-4 py-2 bg-white text-blue-500 font-bold rounded-lg hover:bg-blue-100"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

             <style>{`.form-input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid #D1D5DB;border-radius:0.375rem;}.dark .form-input{background-color:#374151;border-color:#4B5563;color:#F9FAFB}`}</style>
        </div>
    );
};

export default TodosPage;