import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Menu, User, LogOut, ChevronDown, ShieldCheck, Building2 } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

export const Header = ({ onOpenSidebar }) => {
  const { currentUser, role, branch, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userBranch = currentUser?.branch || branch || 'Surat';

  const getPageTitle = () => {
    if (location.pathname === '/admin/dashboard') return 'Admin Panel';
    const path = location.pathname.replace('/', '');
    if (!path || path === 'dashboard') return 'Dashboard';
    return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const handleNavigateProfile = () => {
    setDropdownOpen(false);
    navigate('/profile');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button onClick={onOpenSidebar} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Breadcrumb Page Title */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-400">Hi-Tech CRM</span>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900">{getPageTitle()}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="primary" className="flex items-center gap-1">
          <Building2 className="w-3 h-3 text-indigo-300" />
          {userBranch} Branch • {role}
        </Badge>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 text-left focus:outline-none cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 ring-2 ring-indigo-50"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#3B318A] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {(currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-gray-900 leading-tight">
                {currentUser?.name || 'User Account'}
              </p>
              <p className="text-[10px] text-gray-500 max-w-[140px] truncate">{currentUser?.email || ''}</p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-[#3B318A]' : ''
                }`}
            />
          </button>

          {/* Dropdown Menu Popup */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User summary in dropdown */}
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-900 leading-snug">{currentUser?.name || 'User Account'}</p>
                <p className="text-[11px] text-gray-500 truncate">{currentUser?.email}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    <Building2 className="w-3 h-3 text-[#3B318A]" />
                    {userBranch} Branch
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {role}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="py-1">
                <button
                  onClick={handleNavigateProfile}
                  className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-indigo-50/70 hover:text-[#3B318A] flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  My Profile
                </button>
              </div>

              {/* Logout Option */}
              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
