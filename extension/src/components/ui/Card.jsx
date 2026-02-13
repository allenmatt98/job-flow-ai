import React from 'react';

const variants = {
  default: 'bg-slate-900 border border-slate-800',
  elevated: 'bg-slate-900 border border-slate-800 shadow-lg',
  interactive: 'bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer',
};

const paddings = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) {
  return (
    <div
      className={`rounded-xl ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
