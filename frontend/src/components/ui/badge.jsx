// src/components/ui/badge.jsx

import React from 'react';

// Define the Badge component structure
// It accepts 'children' (the text inside the badge) and 'className' for styling
const Badge = ({ children, className = '' }) => {
    // We'll use the className passed from the parent (e.g., bg-yellow-100) 
    // along with base styling for the component
    const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

    return (
        <span className={`${baseClasses} ${className}`}>
            {children}
        </span>
    );
};

// Use a default export, which requires using curly braces around the import
// in PhlebotomyWorklistPage.jsx (if you changed it in the previous step, change it back)
export default Badge;