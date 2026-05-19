import React from 'react';

const TranslateIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.87,15.07L10.33,12.54L10.36,12.5L12.5,10.36L15.07,12.87M12.5,10.36L10.36,12.5L10.33,12.54L12.87,15.07L15.07,12.87L12.5,10.36M11,2L2,11L11,20V16H13V20L22,11L13,2V6H11V2M10,11A1,1 0 0,0 9,12A1,1 0 0,0 10,13A1,1 0 0,0 11,12A1,1 0 0,0 10,11M14,11A1,1 0 0,0 13,12A1,1 0 0,0 14,13A1,1 0 0,0 15,12A1,1 0 0,0 14,11Z" />
    </svg>
);

export default TranslateIcon;