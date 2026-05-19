import React from 'react';
import SparklesIcon from './components/icons/SparklesIcon';
import BookIcon from './components/icons/BookIcon';
import { useTranslation } from './LanguageContext';
import { motion } from 'motion/react';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const FeatureCard: React.FC<{ 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    onClick: () => void; 
    actionText: string; 
    color: 'cyan' | 'purple' | 'emerald' | 'amber' | 'red' | 'blue';
    badge?: string;
}> = ({ title, description, icon, onClick, actionText, color, badge }) => {
    const colorStyles = {
        purple: {
            border: 'hover:border-purple-500/50 border-white/10',
            bg: 'bg-purple-500/10',
            text: 'text-purple-400',
            shadow: 'hover:shadow-purple-500/10',
            accent: 'bg-purple-500/20'
        },
        cyan: {
            border: 'hover:border-cyan-500/50 border-white/10',
            bg: 'bg-cyan-500/10',
            text: 'text-cyan-400',
            shadow: 'hover:shadow-cyan-500/10',
            accent: 'bg-cyan-500/20'
        },
        emerald: {
            border: 'hover:border-emerald-500/50 border-white/10',
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            shadow: 'hover:shadow-emerald-500/10',
            accent: 'bg-emerald-500/20'
        },
        amber: {
            border: 'hover:border-amber-500/50 border-white/10',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            shadow: 'hover:shadow-amber-500/10',
            accent: 'bg-amber-500/20'
        },
        red: {
            border: 'hover:border-red-500/50 border-white/10',
            bg: 'bg-red-500/10',
            text: 'text-red-400',
            shadow: 'hover:shadow-red-500/10',
            accent: 'bg-red-500/20'
        },
        blue: {
            border: 'hover:border-blue-500/50 border-white/10',
            bg: 'bg-blue-500/10',
            text: 'text-blue-400',
            shadow: 'hover:shadow-blue-500/10',
            accent: 'bg-blue-500/20'
        },
    };

    const style = colorStyles[color];

    return (
        <motion.button
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`group relative overflow-hidden backdrop-blur-md ${style.bg} ${style.border} border rounded-2xl p-8 text-left transition-all duration-300 shadow-2xl ${style.shadow}`}
        >
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                <div className="absolute inset-0 animate-shimmer" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div className={`${style.accent} w-14 h-14 rounded-xl flex items-center justify-center ring-1 ring-white/20 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                    </div>
                    {badge && (
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-white/10 border border-white/20 ${style.text}`}>
                            {badge}
                        </span>
                    )}
                </div>
                
                <h2 className="text-2xl font-bold font-display text-white mb-3 tracking-tight">
                    {title}
                </h2>
                
                <p className="text-slate-300/80 text-base leading-relaxed mb-8 flex-grow">
                    {description}
                </p>
                
                <div className={`mt-auto inline-flex items-center gap-2 ${style.text} font-bold text-sm tracking-widest uppercase`}>
                    <span>{actionText}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 transition-transform group-hover:translate-x-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
                    </svg>
                </div>
            </div>
            
            {/* Bottom highlight */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${style.text}`} />
        </motion.button>
    );
};

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen bg-[#050505] text-slate-100 overflow-x-hidden selection:bg-purple-500/30">
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/20 blur-[120px] animate-pulse-slow active" style={{ animationDelay: '-4s' }} />
        
        {/* Animated Light Beams */}
        <div className="absolute top-0 left-1/4 w-1 h-screen bg-gradient-to-b from-purple-500/20 to-transparent blur-xl rotate-[30deg] animate-beam" />
        <div className="absolute top-0 right-1/4 w-1 h-screen bg-gradient-to-b from-cyan-500/20 to-transparent blur-xl rotate-[-30deg] animate-beam" style={{ animationDelay: '-5s' }} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,rgba(40,40,60,0.1)_0%,transparent_70%)]" />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10 flex flex-col items-center min-h-screen p-6 sm:p-12 lg:p-20"
      >
        <header className="mb-20 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-[0.2em] uppercase text-purple-400 mb-8"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Guru Masa Depan</span>
          </motion.div>

          <motion.h1 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black font-display tracking-tight text-white mb-8"
          >
            Ajarin<span className="text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-cyan-500">.ai</span>
          </motion.h1>

          <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-slate-400 max-w-2xl mx-auto text-xl sm:text-2xl font-medium leading-relaxed"
          >
            {t('home.description')}
          </motion.p>
        </header>
        
        <motion.main 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-32"
        >
          <FeatureCard 
              title={t('home.quiz_generator_title')}
              description={t('home.quiz_generator_desc')}
              icon={<SparklesIcon className="w-8 h-8 text-purple-400" />}
              onClick={() => onNavigate('quizGenerator')}
              actionText={t('home.open_tool')}
              color="purple"
          />
          <FeatureCard 
              title={t('home.lesson_plan_title')}
              description={t('home.lesson_plan_desc')}
              icon={<BookIcon className="w-8 h-8 text-cyan-400" />}
              onClick={() => onNavigate('lessonPlanGenerator')}
              actionText={t('home.start_planner')}
              color="cyan"
              badge="BETA"
          />
        </motion.main>

        <footer className="mt-auto pt-10 border-t border-white/5 w-full text-center">
            <p className="text-slate-500 text-sm tracking-widest uppercase font-bold">
                &copy; 2026 Ajarin.ai &bull; Indonesia
            </p>
        </footer>
      </motion.div>
    </div>
  );
};

export default HomePage;