import React from 'react';
import DocumentIcon from './icons/DocumentIcon';
import { useTranslation } from '../LanguageContext';

interface FloatingActionButtonProps {
  count: number;
  onClick: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ count, onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex items-center justify-center w-16 h-16 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
      aria-label={t('quiz_generator.fab_aria_label', { count })}
    >
      <DocumentIcon className="w-8 h-8" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 text-xs font-bold bg-pink-500 rounded-full border-2 border-slate-900">
          {count}
        </span>
      )}
    </button>
  );
};

export default FloatingActionButton;
