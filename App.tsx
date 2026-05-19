import React, { useState } from 'react';
import HomePage from './HomePage';
import QuizGenerator from './QuizGenerator';
import LessonPlanGenerator from './LessonPlanGenerator';
import { LanguageProvider } from './LanguageContext';
import SplashScreen from './SplashScreen';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState('home');
    const [showSplash, setShowSplash] = useState(true);

    const handleNavigate = (page: string) => {
        setCurrentPage(page);
        window.scrollTo(0, 0);
    };

    const handleBackToHome = () => {
        handleNavigate('home');
    }

    const renderPage = () => {
        if (showSplash) {
            return <SplashScreen onComplete={() => setShowSplash(false)} />;
        }

        switch (currentPage) {
            case 'quizGenerator':
                return <QuizGenerator onNavigateBack={handleBackToHome} />;
            case 'lessonPlanGenerator':
                return <LessonPlanGenerator onNavigateBack={handleBackToHome} />;
            case 'home':
            default:
                return <HomePage onNavigate={handleNavigate} />;
        }
    };

    return (
        <LanguageProvider>
            <div className="bg-slate-900 text-white min-h-screen">
                {renderPage()}
            </div>
        </LanguageProvider>
    );
};

export default App;