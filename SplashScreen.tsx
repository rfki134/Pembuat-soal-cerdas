import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 800);
        }, 3200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 overflow-hidden"
                >
                    {/* Dynamic Ambient Background */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <motion.div 
                            animate={{ 
                                opacity: [0.1, 0.15, 0.1]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/4 -left-1/4 w-[80%] h-[80%] rounded-full bg-purple-600/20 blur-[100px]"
                        />
                        <motion.div 
                            animate={{ 
                                opacity: [0.1, 0.15, 0.1]
                            }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-1/4 -right-1/4 w-[80%] h-[80%] rounded-full bg-cyan-600/20 blur-[100px]"
                        />
                    </div>

                    {/* Content Central */}
                    <div className="relative z-10 flex flex-col items-center">
                        {/* Logo Mark */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ 
                                duration: 0.8,
                                ease: [0.16, 1, 0.3, 1],
                                delay: 0.2 
                            }}
                            className="relative mb-10"
                        >
                            <div className="w-28 h-28 bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                    className="text-5xl text-white font-black italic tracking-tighter"
                                >
                                    aj
                                </motion.div>
                                {/* Single Orbiting ring for efficiency */}
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-[-15px] border border-white/10 rounded-full"
                                />
                                {/* Simplified pulsing glow */}
                                <motion.div 
                                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-cyan-400 rounded-[2.5rem] blur-xl -z-10"
                                />
                            </div>
                        </motion.div>

                        {/* Wordmark */}
                        <div className="flex items-center space-x-1 py-4 px-2">
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                                className="text-5xl sm:text-6xl font-black text-white tracking-tighter"
                            >
                                Ajarin
                            </motion.span>
                            <motion.span
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.9, ease: "backOut" }}
                                className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent flex py-2"
                            >
                                .ai
                            </motion.span>
                        </div>

                        {/* Subtitle / Loader */}
                        <div className="mt-8">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8, delay: 1.2 }}
                                className="flex flex-col items-center"
                            >
                                <p className="text-slate-400 text-[10px] font-bold tracking-[0.4em] uppercase mb-4 opacity-80">
                                    Intelligent Teaching Assistant
                                </p>
                                <div className="w-40 h-[2px] bg-white/10 rounded-full relative overflow-hidden">
                                    <motion.div
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        style={{ originX: 0 }}
                                        transition={{ duration: 2, delay: 1.2, ease: "easeInOut" }}
                                        className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500"
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Subtle Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                        style={{ 
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                            backgroundSize: '30px 30px'
                        }} 
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashScreen;
