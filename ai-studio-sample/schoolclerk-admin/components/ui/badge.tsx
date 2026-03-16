
import React from 'react';
import { cn } from './utils';

export const Badge = ({ className, variant = 'default', children }: { className?: string, variant?: 'default' | 'success' | 'warning' | 'neutral', children?: React.ReactNode }) => {
    const variants = {
        default: 'bg-primary/10 text-primary hover:bg-primary/20',
        success: 'bg-green-100 text-green-700 hover:bg-green-200',
        warning: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
        neutral: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    };
    return (
        <div className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent uppercase tracking-wider", variants[variant], className)}>
            {children}
        </div>
    );
};
