
import React, { ReactNode } from 'react';

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'bottom' }) => {
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div className="relative flex items-center group">
            {children}
            <div className={`absolute ${positionClasses[position]} z-50 hidden group-hover:flex flex-col items-center`}>
                <div className="relative z-50 px-3 py-2 text-xs font-semibold leading-none text-white whitespace-nowrap bg-slate-900 rounded shadow-lg border border-slate-700">
                    {content}
                    {/* Tiny arrow based on position */}
                    {position === 'bottom' && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-t border-l border-slate-700 transform rotate-45"></div>
                    )}
                    {position === 'top' && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-b border-r border-slate-700 transform rotate-45"></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tooltip;
