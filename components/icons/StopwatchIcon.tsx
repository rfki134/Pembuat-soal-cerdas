import React from 'react';

const StopwatchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M11 12H13V7H11V12M14.19 1.35L15.61 2.76L14.54 3.83L13.13 2.42L14.19 1.35M8.46 2.42L9.87 3.83L8.8 4.9L7.39 3.47L8.46 2.42Z" />
    </svg>
);

export default StopwatchIcon;
