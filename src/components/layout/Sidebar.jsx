import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import logoPng from '../../assets/logo.png';
import {
  LayoutDashboard,
  Briefcase,
  Sparkles,
  Users,
  Wrench,
  Boxes,
  Bell,
  User,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';

export const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isOwner = role === 'Owner' || role === 'SuperAdmin' || role === 'Admin';
  const dashboardPath = isOwner ? '/admin/dashboard' : '/dashboard';

  const navItems = [
    { label: 'Dashboard', path: dashboardPath, icon: LayoutDashboard },
    { label: 'Leads', path: '/leads', icon: Briefcase, allowedRoles: ['Sales', 'Owner', 'SuperAdmin', 'Admin'] },
    { label: 'Future Opportunities', path: '/future-opportunities', icon: Sparkles, ownerOnly: true },
    { label: 'Customers', path: '/customers', icon: Users, ownerOnly: true },
    { label: 'Services', path: '/services', icon: Wrench, allowedRoles: ['Engineer', 'Owner', 'SuperAdmin', 'Admin'] },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Profile', path: '/profile', icon: User }
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
    return true;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col justify-between select-none',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Desktop Floating Toggle Button on Sidebar Border Line */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 shadow-md text-gray-500 hover:text-[#3B318A] hover:bg-indigo-50 hover:border-indigo-200 transition-all absolute -right-3 top-5 z-20 cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Company Header Branding */}
        <div className="shrink-0 h-16 flex items-center justify-between px-3.5 border-b border-gray-200 relative">
          <div className="flex items-center justify-center flex-1 overflow-hidden py-1">
            {collapsed ? (
              <div className="w-8 h-8 rounded-xl bg-[#3B318A] text-white flex items-center justify-center font-black text-xs shadow-xs tracking-wider shrink-0">
                HT
              </div>
            ) : (
              <img src={logoPng} alt="Hi-Tech Air Technology" className="h-7 w-auto max-w-[155px] object-contain mx-auto" />
            )}
          </div>

          {/* Mobile Close Button */}
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          className={clsx(
            'flex-1 min-h-0 p-2.5 space-y-1.5',
            collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden scrollbar-thin'
          )}
        >
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            
            // Check active match
            const isDashboardItem = item.label === 'Dashboard';
            const isCurrentActive = isDashboardItem
              ? (location.pathname === '/dashboard' || location.pathname === '/admin/dashboard')
              : location.pathname === item.path;

            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={clsx(
                  'flex items-center rounded-xl text-xs font-medium transition-all group relative',
                  collapsed ? 'justify-center w-10 h-10 mx-auto' : 'justify-between px-3.5 py-2.5 w-full',
                  isCurrentActive
                    ? 'bg-[#3B318A] text-white shadow-sm font-semibold'
                    : 'text-gray-600 hover:bg-indigo-50/60 hover:text-[#3B318A]'
                )}
              >
                <div className={clsx('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
                  <Icon className={clsx(collapsed ? 'w-5 h-5' : 'w-4 h-4', isCurrentActive ? 'text-white' : 'text-gray-400 group-hover:text-[#3B318A]')} />
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && item.ownerOnly && (
                  <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-bold uppercase', isCurrentActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800')}>
                    Admin
                  </span>
                )}

                {/* Floating Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    {item.label}
                    {item.ownerOnly && <span className="ml-1.5 text-[10px] text-amber-300 font-bold">(Admin)</span>}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Clean Logout Button */}
        <div
          className={clsx(
            'shrink-0 p-3 border-t border-gray-200 bg-gray-50/70 relative',
            collapsed ? 'overflow-visible' : 'overflow-hidden'
          )}
        >
          {!collapsed ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-red-600 hover:bg-red-100/70 rounded-xl transition-colors font-bold border border-red-200 bg-red-50/50 shadow-2xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="relative group">
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-xl text-red-600 hover:bg-red-100 bg-red-50 flex items-center justify-center transition-colors border border-red-200 shadow-xs cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  Sign Out
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
