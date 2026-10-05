import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 !m-0 top-0 left-0 right-0 bottom-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className={`w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden ${maxWidth} max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain scrollbar-thin flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

