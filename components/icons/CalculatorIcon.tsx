import React from 'react';

const CalculatorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M7,2H17A2,2 0 0,1 19,4V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V4A2,2 0 0,1 7,2M7,6V8H17V6H7M7,10V12H11V10H7M7,14V16H11V14H7M13,10H17V16H13V10M7,18V20H17V18H7Z" />
    </svg>
);

export default CalculatorIcon;