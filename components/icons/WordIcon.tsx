
import React from 'react';

const WordIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Background with the signature Microsoft Word blue gradient feel */}
      <rect x="3" y="3" width="18" height="18" rx="1" fill="#2B579A" />
      
      {/* The white side stripe/fold */}
      <path d="M3 3H7V21H3V3Z" fill="white" fillOpacity="0.2" />
      
      {/* The 'W' - specifically centered and correctly proportioned */}
      <path 
        d="M7.5 8L10 16.5L12 9.5L14 16.5L16.5 8" 
        stroke="white" 
        strokeWidth="1.8" 
        strokeLinecap="butt" 
        strokeLinejoin="round" 
      />
      
      {/* Subtle bottom shadow/border */}
      <path d="M3 20.5H21V21H3V20.5Z" fill="#1B3F7A" />
    </svg>
  );
};

export default WordIcon;
