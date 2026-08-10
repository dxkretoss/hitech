import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Menu, Search } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

export const Header = ({ onOpenSidebar }) => {
  const { currentUser, role } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === '/admin/dashboard') return 'Admin Panel';
    const path = location.pathname.replace('/', '');
    if (!path || path === 'dashboard') return 'Dashboard';
    return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400 w-56 focus-within:border-[#3B318A] focus-within:bg-white transition-all ml-2">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search CRM..."
            className="bg-transparent border-none outline-none text-xs text-gray-900 placeholder:text-gray-400 w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="primary">{role} Workspace</Badge>
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <img src={currentUser?.avatar} alt={currentUser?.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-gray-900 leading-tight">{currentUser?.name}</p>
            <p className="text-[10px] text-gray-500">{currentUser?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
