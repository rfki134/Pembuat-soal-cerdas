import React from 'react';

const BrainIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12,2A9,9 0 0,0 3,11V12H4.41A5,5 0 0,1 8,10.41V8A2,2 0 0,1 10,6H11V3.25A1.25,1.25 0 0,1 12.25,2A1.25,1.25 0 0,1 13.5,3.25V6H14A2,2 0 0,1 16,8V10.41A5,5 0 0,1 19.59,12H21V11A9,9 0 0,0 12,2M8,12V14A2,2 0 0,0 10,16H11V18.75A1.25,1.25 0 0,0 12.25,20A1.25,1.25 0 0,0 13.5,18.75V16H14A2,2 0 0,0 16,14V12A5,5 0 0,1 12,17A5,5 0 0,1 8,12Z" />
    </svg>
);

export default BrainIcon;
