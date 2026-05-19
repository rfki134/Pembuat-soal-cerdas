
import React from 'react';

const PdfIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
        {/* Background Red Box */}
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#E11D21" />
        {/* Text 'PDF' in White */}
        <path d="M7.5 8H5V16H7V13H8.5C9.6 13 10.5 12.1 10.5 11V10C10.5 8.9 9.6 8 8.5 8H7.5ZM7 11V10H8.5V11H7Z" fill="white" />
        <path d="M13.5 8H11V16H13.5C15.16 16 16.5 14.66 16.5 13V11C16.5 9.34 15.16 8 13.5 8ZM14.5 13C14.5 13.55 14.05 14 13.5 14H13V10H13.5C14.05 10 14.5 10.45 14.5 11V13Z" fill="white" />
        <path d="M17 8H20.5V10H19V11.5H20.5V13.5H19V16H17V8Z" fill="white" />
    </svg>
);

export default PdfIcon;
