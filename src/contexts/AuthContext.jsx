import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  registerUser,
  loginUser,
  loginAdmin,
  logoutUser,
  getCurrentSessionUser
} from '../services/authService.js';
import { supabase, isSupabaseConfigured } from '../services/supabase.js';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hitech_v2_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  // Load session using custom function & subscribe to changes
  useEffect(() => {
    const initSession = async () => {
      if (configured) {
        const user = await getCurrentSessionUser();
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('hitech_v2_user', JSON.stringify(user));
        }
      }
      setLoading(false);
    };

    initSession();

    if (configured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const user = await getCurrentSessionUser();
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('hitech_v2_user', JSON.stringify(user));
          }
        } else if (_event === 'SIGNED_OUT') {
          setCurrentUser(null);
          localStorage.removeItem('hitech_v2_user');
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [configured]);

  // Custom Signup Handler
  const signup = async ({ name, email, password, role = 'Sales', branch = 'Surat' }) => {
    const res = await registerUser({ name, email, password, role, branch });
    if (res.success) {
      if (res.requiresConfirmation) {
        toast.info('Verification email sent! Please check your inbox.');
        return { user: null, requiresConfirmation: true, error: null };
      } else if (res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('hitech_v2_user', JSON.stringify(res.user));
        toast.success(`Account created as ${role} (${branch} Branch)!`);
        return { user: res.user, requiresConfirmation: false, error: null };
      }
    } else {
      toast.error(res.error || 'Registration failed');
      return { user: null, requiresConfirmation: false, error: res.error };
    }
  };

  // Custom Login Handler
  const login = async ({ email, password }) => {
    const res = await loginUser({ email, password });
    if (res.success && res.user) {
      setCurrentUser(res.user);
      localStorage.setItem('hitech_v2_user', JSON.stringify(res.user));
      toast.success(`Welcome back, ${res.user.name}!`);
      return { user: res.user, error: null };
    } else {
      toast.error(res.error || 'Invalid credentials');
      return { user: null, error: res.error };
    }
  };

  // Custom Admin Login Handler
  const adminLogin = async ({ email, password }) => {
    const res = await loginAdmin({ email, password });
    if (res.success && res.user) {
      setCurrentUser(res.user);
      localStorage.setItem('hitech_v2_user', JSON.stringify(res.user));
      toast.success('Admin authentication successful!');
      return { user: res.user, error: null };
    } else {
      toast.error(res.error || 'Admin login failed');
      return { user: null, error: res.error };
    }
  };

  // Switch role dynamically
  const switchRole = (roleName) => {
    if (!currentUser) return;
    const updated = { ...currentUser, role: roleName };
    setCurrentUser(updated);
    localStorage.setItem('hitech_v2_user', JSON.stringify(updated));
    toast.success(`Role switched to: ${roleName}`);
  };

  // Switch branch dynamically (for testing / admin)
  const switchBranch = (branchName) => {
    if (!currentUser) return;
    const updated = { ...currentUser, branch: branchName };
    setCurrentUser(updated);
    localStorage.setItem('hitech_v2_user', JSON.stringify(updated));
    toast.success(`Branch switched to: ${branchName}`);
  };

  // Custom Logout Handler
  const logout = async () => {
    await logoutUser();
    setCurrentUser(null);
    localStorage.removeItem('hitech_v2_user');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || 'Sales',
        branch: currentUser?.branch || 'Surat',
        loading,
        isConfigured: configured,
        signup,
        login,
        adminLogin,
        switchRole,
        switchBranch,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
