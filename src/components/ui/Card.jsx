import React from 'react';

export const Card = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs transition-all ${className}`}
    >
      {children}
    </div>
  );
};
