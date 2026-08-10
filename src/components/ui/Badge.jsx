import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    primary: 'bg-indigo-50 text-[#3B318A] border-indigo-100 font-bold',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    info: 'bg-sky-50 text-sky-700 border-sky-200 font-bold'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
};
