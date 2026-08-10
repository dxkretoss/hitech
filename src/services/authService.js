import { supabase, isSupabaseConfigured } from './supabase.js';
import { setAuthCookie, getAuthCookie, removeAuthCookie } from './cookieService.js';
import { sanitizeEmail, sanitizePassword, sanitizeText } from '../utils/sanitize.js';

/**
 * Custom Auth Service Module
 * Handles user registration with role selection (Sales | Engineer),
 * user sign-in, admin authentication, cookie tokens, and super admin access checks.
 */

// Helper to check if a user has Super Admin privileges
export const isSuperAdminUser = (user) => {
  if (!user) return false;
  return user.role === 'Owner' || user.role === 'SuperAdmin';
};

// Custom function: Register a new user with specified role
export const registerUser = async ({ name, email, password, role = 'Sales' }) => {
  const cleanName = sanitizeText(name);
  const cleanEmail = sanitizeEmail(email);
  const cleanPassword = sanitizePassword(password);

  const configured = isSupabaseConfigured();

  if (configured) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            name: cleanName,
            full_name: cleanName,
            role: role // 'Sales' or 'Engineer'
          }
        }
      });

      if (error) {
        if (error.code === 'over_email_send_rate_limit' || error.message?.includes('rate limit')) {
          throw new Error('Supabase Email Rate Limit Exceeded! Turn OFF "Confirm email" in Supabase Dashboard -> Authentication -> Providers -> Email for instant signups.');
        }
        throw error;
      }

      const requiresConfirmation = !data.session && !!data.user;

      if (data.session?.access_token) {
        setAuthCookie(data.session.access_token);
      }

      const user = data.session ? {
        id: data.user.id,
        name: cleanName,
        email: cleanEmail,
        role,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      } : null;

      return { success: true, user, requiresConfirmation, error: null };
    } catch (err) {
      return { success: false, user: null, requiresConfirmation: false, error: err.message || 'Registration failed' };
    }
  } else {
    // Custom Local Mode Fallback
    const token = `mock-token-${Date.now()}`;
    setAuthCookie(token);
    const user = {
      id: `U-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };
    return { success: true, user, requiresConfirmation: false, error: null };
  }
};

// Custom function: Authenticate user login
export const loginUser = async ({ email, password }) => {
  const cleanEmail = sanitizeEmail(email);
  const cleanPassword = sanitizePassword(password);

  const configured = isSupabaseConfigured();

  if (configured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (error) throw error;

      if (data.session?.access_token) {
        setAuthCookie(data.session.access_token);
      }

      const metadata = data.user.user_metadata || {};
      const user = {
        id: data.user.id,
        email: data.user.email,
        name: metadata.name || metadata.full_name || cleanEmail.split('@')[0],
        role: metadata.role || 'Sales',
        avatar: metadata.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };

      return { success: true, user, error: null };
    } catch (err) {
      return { success: false, user: null, error: err.message || 'Invalid credentials' };
    }
  } else {
    // Custom Local Mode Fallback
    const token = `mock-token-${Date.now()}`;
    setAuthCookie(token);
    const user = {
      id: `U-${Date.now()}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      role: 'Sales',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };
    return { success: true, user, error: null };
  }
};

// Custom function: Authenticate Admin / Super Admin login
export const loginAdmin = async ({ email, password }) => {
  const cleanEmail = sanitizeEmail(email);
  const cleanPassword = sanitizePassword(password);

  const configured = isSupabaseConfigured();

  if (configured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (error) {
        // Fallback for seed SuperAdmin credentials if Supabase Cloud SMTP rate-limits new signups
        if (cleanEmail === 'admin@hitechair.in' && cleanPassword === 'ur0zEmoHAapzu4D9l') {
          const token = `superadmin-token-${Date.now()}`;
          setAuthCookie(token);
          const user = {
            id: 'U-SUPERADMIN',
            email: cleanEmail,
            name: 'Hi-Tech Super Administrator',
            role: 'Owner',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
          };
          return { success: true, user, error: null };
        }
        throw error;
      }

      const metadata = data.user.user_metadata || {};
      const role = metadata.role || 'Owner';

      // Check if user is SuperAdmin / Owner
      if (role !== 'Owner' && role !== 'SuperAdmin') {
        await supabase.auth.signOut();
        removeAuthCookie();
        return { success: false, user: null, error: 'Access Denied: Super Admin privileges required' };
      }

      if (data.session?.access_token) {
        setAuthCookie(data.session.access_token);
      }

      const user = {
        id: data.user.id,
        email: data.user.email,
        name: metadata.name || metadata.full_name || 'Super Admin',
        role: 'Owner',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
      };

      return { success: true, user, error: null };
    } catch (err) {
      // Fallback for seed SuperAdmin credentials
      if (cleanEmail === 'admin@hitechair.in' && cleanPassword === 'ur0zEmoHAapzu4D9l') {
        const token = `superadmin-token-${Date.now()}`;
        setAuthCookie(token);
        const user = {
          id: 'U-SUPERADMIN',
          email: cleanEmail,
          name: 'Hi-Tech Super Administrator',
          role: 'Owner',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
        };
        return { success: true, user, error: null };
      }
      return { success: false, user: null, error: err.message || 'Admin authentication failed' };
    }
  } else {
    // Custom Local Mode Fallback for Super Admin
    const token = `mock-admin-token-${Date.now()}`;
    setAuthCookie(token);
    const user = {
      id: 'U-SUPERADMIN',
      email: cleanEmail || 'admin@hitechair.in',
      name: 'Super Administrator',
      role: 'Owner',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    };
    return { success: true, user, error: null };
  }
};

// Custom function: Logout current user
export const logoutUser = async () => {
  const configured = isSupabaseConfigured();
  if (configured) {
    await supabase.auth.signOut();
  }
  removeAuthCookie();
  return { success: true };
};

// Custom function: Fetch current session user
export const getCurrentSessionUser = async () => {
  const token = getAuthCookie();
  if (!token) return null;

  const configured = isSupabaseConfigured();
  if (!configured) {
    const saved = localStorage.getItem('hitech_v2_user');
    return saved ? JSON.parse(saved) : null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    const saved = localStorage.getItem('hitech_v2_user');
    return saved ? JSON.parse(saved) : null;
  }

  const metadata = session.user.user_metadata || {};
  return {
    id: session.user.id,
    email: session.user.email,
    name: metadata.name || metadata.full_name || session.user.email.split('@')[0],
    role: metadata.role || 'Sales',
    avatar: metadata.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  };
};
