import React from 'react';
import { Link } from 'react-router-dom';

interface KeepBottomNavProps {
    activeTab: 'notes' | 'todos';
}

// --- Icon Components ---
const NotesIconActive: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#8ab4f8" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
      <path d="M5.75 3C4.7835 3 4 3.7835 4 4.75V19.25C4 20.2165 4.7835 21 5.75 21H18.25C19.2165 21 20 20.2165 20 19.25V4.75C20 3.7835 19.2165 3 18.25 3H5.75ZM8 8H16V9.5H8V8ZM8 11.75H16V13.25H8V11.75ZM8 15.5H13V17H8V15.5Z"/>
  </svg>
);
const NotesIconInactive: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#5f6368" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
      <path d="M5.75 3C4.7835 3 4 3.7835 4 4.75V19.25C4 20.2165 4.7835 21 5.75 21H18.25C19.2165 21 20 20.2165 20 19.25V4.75C20 3.7835 19.2165 3 18.25 3H5.75ZM8 8H16V9.5H8V8ZM8 11.75H16V13.25H8V11.75ZM8 15.5H13V17H8V15.5Z"/>
  </svg>
);
const TodosIconActive: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#8ab4f8" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5L6 12.5L7.41 11.09L10 13.67L16.59 7.08L18 8.5L10 16.5Z"/>
  </svg>
);
const TodosIconInactive: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#5f6368" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5L6 12.5L7.41 11.09L10 13.67L16.59 7.08L18 8.5L10 16.5Z"/>
  </svg>
);

const KeepBottomNav: React.FC<KeepBottomNavProps> = ({ activeTab }) => {
    const isNotesActive = activeTab === 'notes';
    const isTodosActive = activeTab === 'todos';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-black">
            <div className="max-w-md mx-auto flex justify-around items-center h-16">
                <Link to="/keep-notes" className={`flex flex-col items-center justify-center font-semibold w-1/2 h-full ${isNotesActive ? 'text-blue-400' : 'text-gray-500'}`}>
                    {isNotesActive ? <NotesIconActive /> : <NotesIconInactive />}
                    <span className="text-xs mt-1">Notes</span>
                </Link>
                <Link to="/keep-todos" className={`flex flex-col items-center justify-center font-semibold w-1/2 h-full ${isTodosActive ? 'text-blue-400' : 'text-gray-500'}`}>
                    {isTodosActive ? <TodosIconActive /> : <TodosIconInactive />}
                    <span className="text-xs mt-1">To-dos</span>
                </Link>
            </div>
        </div>
    );
};

export default KeepBottomNav;