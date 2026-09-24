import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, HelpCircle, X, Loader2 } from 'lucide-react';
import { Button } from './Button.jsx';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone. Please confirm if you wish to proceed.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  icon: CustomIcon
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  if (!isOpen) return null;

  const isLoading = loading || internalLoading;

  const handleConfirmClick = async (e) => {
    e?.preventDefault();
    if (isLoading) return;
    try {
      setInternalLoading(true);
      await onConfirm?.();
    } catch (err) {
      console.error('Confirmation action error:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 text-red-600 border-red-200',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-500/20 disabled:bg-red-400 disabled:opacity-60 disabled:cursor-not-allowed',
          Icon: CustomIcon || Trash2
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-500/20 disabled:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed',
          Icon: CustomIcon || AlertTriangle
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-indigo-100 text-[#3B318A] border-indigo-200',
          confirmBtn: 'bg-[#3B318A] hover:bg-[#2F2770] text-white font-bold shadow-md shadow-indigo-500/20 disabled:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed',
          Icon: CustomIcon || HelpCircle
        };
    }
  };

  const config = getVariantStyles();
  const IconComponent = config.Icon;

  return createPortal(
    <div className="fixed inset-0 !m-0 top-0 left-0 right-0 bottom-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        {/* Header bar with close button */}
        <div className="flex items-center justify-end px-4 pt-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="px-6 pb-6 pt-1 text-center space-y-4">
          <div className={`w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center shadow-inner ${config.iconBg}`}>
            {isLoading ? (
              <Loader2 className="w-7 h-7 animate-spin text-current" />
            ) : (
              <IconComponent className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">{title}</h3>
            {typeof description === 'string' ? (
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">{description}</p>
            ) : (
              <div className="text-xs text-gray-500 leading-relaxed">{description}</div>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl border-gray-300 font-semibold text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {cancelText}
            </Button>

            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${config.confirmBtn}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
