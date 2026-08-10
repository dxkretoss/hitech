import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'} flex flex-col min-w-0`}>
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
