import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

/**
 * DataPrivacyShield Component
 * Protects sensitive Leads and Customer data:
 * - Anti-Screenshot detection & clipboard clearing
 * - Intercepts Print (Ctrl+P), Save (Ctrl+S), Inspect (F12/Ctrl+Shift+I), Copy (Ctrl+C)
 * - Disables Right-Click context menu
 * - Blurs content when window loses focus (e.g. Snipping Tool / external screen capture)
 * - Hides content completely during browser print attempts (@media print)
 */
export const DataPrivacyShield = ({
  children,
  currentUser,
  role = 'Sales',
  title = 'Confidential Sales Data',
  enableBlurOnInactive = true,
  className = ''
}) => {
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [screenshotAttempted, setScreenshotAttempted] = useState(false);

  useEffect(() => {
    // 1. Right-Click context menu blocker
    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.warning('Data Privacy Protected: Right-click actions are disabled.');
    };

    // 2. Keyboard shortcut interceptors
    const handleKeyDown = (e) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        setScreenshotAttempted(true);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('PROTECTED CONTENT: Hi-Tech Air Power Sales Confidentiality Protocol Active.');
          }
        } catch (err) {
          // Ignore clipboard permissions error
        }
        toast.error('Screenshot Action Blocked: Customer and lead data is strictly confidential.');
        setTimeout(() => setScreenshotAttempted(false), 2000);
      }

      // Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        toast.error('Printing Prohibited: Client records cannot be printed.');
      }

      // Ctrl+S / Cmd+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toast.error('Saving Page Prohibited: Offline saving is disabled for customer privacy.');
      }

      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C / F12 (DevTools)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        toast.warning('Source inspection is locked on protected customer records.');
      }

      // Ctrl+C / Cmd+C (Copy) on sensitive views for Sales
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const selection = window.getSelection()?.toString();
        if (selection && selection.length > 0) {
          e.preventDefault();
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText('');
            }
          } catch (err) {}
          toast.warning('Copying client contact details is disabled for data privacy.');
        }
      }
    };

    // 3. Window blur / Snipping Tool detection
    const handleWindowBlur = () => {
      if (enableBlurOnInactive) {
        setIsWindowBlurred(true);
      }
    };

    const handleWindowFocus = () => {
      setIsWindowBlurred(false);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [enableBlurOnInactive]);

  return (
    <div className={`relative select-none ${className}`}>
      {/* Screenshot Flash Blocker */}
      {screenshotAttempted && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-6 text-white text-center backdrop-blur-md transition-all">
          <div className="max-w-md space-y-4">
            <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <EyeOff className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-red-400">Screenshot Action Blocked</h3>
            <p className="text-sm text-gray-300">
              Capturing or recording customer contact and lead details is strictly monitored and prevented to comply with Hi-Tech Air Power data privacy policies.
            </p>
          </div>
        </div>
      )}

      {/* Window Focus Lost / Snipping Tool Blocker */}
      {isWindowBlurred && (
        <div
          onClick={() => setIsWindowBlurred(false)}
          className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center text-white cursor-pointer transition-all duration-300"
        >
          <div className="w-14 h-14 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-2xl flex items-center justify-center mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-white">Confidential Data Shield Active</h4>
          <p className="text-xs text-indigo-200 mt-1 max-w-sm">
            Screen obscured while window is out of focus to protect proprietary client records from external screen grabbers.
          </p>
          <button className="mt-4 px-4 py-1.5 text-xs font-bold bg-white text-[#3B318A] rounded-xl hover:bg-indigo-50 shadow-md">
            Click to Return & View
          </button>
        </div>
      )}

      {/* Protected Content Area */}
      <div className={`transition-all duration-200 ${isWindowBlurred ? 'filter blur-sm pointer-events-none' : ''}`}>
        {children}
      </div>

      {/* Print Media Blocker (@media print) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          body::after {
            content: "CONFIDENTIAL CLIENT RECORD - PRINTING AND EXPORTING PROHIBITED (HI-TECH AIR POWER)";
            visibility: visible !important;
            display: block !important;
            font-size: 24pt !important;
            font-weight: bold !important;
            color: #b91c1c !important;
            text-align: center !important;
            margin-top: 100px !important;
          }
        }
      `}</style>
    </div>
  );
};
