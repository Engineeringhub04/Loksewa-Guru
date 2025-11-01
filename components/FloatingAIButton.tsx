import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SparklesIcon } from '@heroicons/react/24/solid';

const FloatingAIButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/ai-chat')}
      className="fixed bottom-24 right-4 z-40 w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full shadow-lg flex items-center justify-center text-white transform transition-transform hover:scale-110 animate-pulse-ai"
      aria-label="Open AI Assistant"
    >
      <SparklesIcon className="h-8 w-8" />
    </button>
  );
};

export default FloatingAIButton;