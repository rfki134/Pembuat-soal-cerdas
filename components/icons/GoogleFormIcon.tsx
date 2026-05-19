import React from 'react';

const GoogleFormIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18 4V2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2H12V8H18V4M12 14H8V12H12V14M12 18H8V16H12V18M16 18H14V16H16V18M16 14H14V12H16V14Z" />
    </svg>
);

export default GoogleFormIcon;