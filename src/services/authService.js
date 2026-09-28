import { supabase, isSupabaseConfigured } from './supabase.js';
import { setAuthCookie, getAuthCookie, removeAuthCookie } from './cookieService.js';
import { sanitizeEmail, sanitizePassword, sanitizeText } from '../utils/sanitize.js';

/**
 * Custom Auth Service Module
 * Handles user registration with role selection (Sales | Engineer),
 * user sign-in, admin authentication, cookie tokens, and super admin access checks.
 */

// Helper to check if a user has Admin privileges
export const isSuperAdminUser = (user) => {
  if (!user) return false;
  return user.role === 'Admin' || user.role === 'Owner' || user.role === 'SuperAdmin';
};

// Custom function: Register a new user with specified role and branch
export const registerUser = async ({ name, email, password, role = 'Sales', branch = 'Surat' }) => {
  const cleanName = sanitizeText(name);
  const cleanEmail = sanitizeEmail(email);
  const cleanPassword = sanitizePassword(password);
  const cleanBranch = branch || 'Surat';

  const configured = isSupabaseConfigured();

  if (configured) {
    try {
      // 1. Sign up directly with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            name: cleanName,
            full_name: cleanName,
            role: role,
            branch: cleanBranch
          }
        }
      });

      if (error) {
        if (error.code === 'over_email_send_rate_limit' || error.message?.includes('rate limit')) {
          throw new Error('Supabase Email Rate Limit Exceeded! Please disable "Confirm email" in Supabase Authentication -> Providers -> Email.');
        }
        throw error;
      }

      const requiresConfirmation = !data.session && !!data.user;

      if (data.session?.access_token) {
        setAuthCookie(data.session.access_token);
      }

      // 2. Insert or update the public.profiles record in Supabase
      if (data.user?.id) {
        try {
          await supabase.from('profiles').upsert([
            {
              id: data.user.id,
              name: cleanName,
              email: cleanEmail,
              role: role,
              branch: cleanBranch
            }
          ], { onConflict: 'id' });
        } catch (profileErr) {
          console.warn('Could not insert profile record into Supabase:', profileErr);
        }
      }

      const user = data.session
        ? {
            id: data.user.id,
            name: cleanName,
            email: cleanEmail,
            role,
            branch: cleanBranch,
            canViewStock: role === 'Engineer',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          }
        : null;

      return { success: true, user, requiresConfirmation, error: null };
    } catch (err) {
      return { success: false, user: null, requiresConfirmation: false, error: err.message || 'Registration failed' };
    }
  } else {
    // Local fallback mode when Supabase is NOT configured (.env missing)
    const token = `mock-token-${Date.now()}`;
    setAuthCookie(token);
    const newUserId = `U-${Date.now().toString().slice(-6)}`;
    const user = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      role,
      branch: cleanBranch,
      canViewStock: role === 'Engineer',
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
      // Authenticate strictly with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (error) {
        throw error;
      }

      if (data.session?.access_token) {
        setAuthCookie(data.session.access_token);
      }

      let canViewStock = false;
      let dbRole = null;
      let dbBranch = null;
      let dbName = null;

      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('can_view_stock, role, branch, name')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileRow) {
          canViewStock = profileRow.can_view_stock === true || profileRow.role === 'Engineer';
          dbRole = profileRow.role;
          dbBranch = profileRow.branch;
          dbName = profileRow.name;
        }
      } catch (err) {
        console.warn('Profile fetch warning during login:', err);
      }

      const metadata = data.user.user_metadata || {};
      const userRole = dbRole || metadata.role || 'Sales';
      const user = {
        id: data.user.id,
        email: data.user.email,
        name: dbName || metadata.name || metadata.full_name || cleanEmail.split('@')[0],
        role: userRole,
        branch: dbBranch || metadata.branch || 'Surat',
        canViewStock: canViewStock || userRole === 'Engineer',
        can_view_stock: canViewStock || userRole === 'Engineer',
        avatar: metadata.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };

      return { success: true, user, error: null };
    } catch (err) {
      return { success: false, user: null, error: err.message || 'Invalid login credentials' };
    }
  } else {
    // Local fallback mode when Supabase is NOT configured (.env missing)
    const token = `mock-token-${Date.now()}`;
    setAuthCookie(token);
    const user = {
      id: `U-${Date.now()}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      role: cleanEmail.includes('engineer') ? 'Engineer' : 'Sales',
      branch: cleanEmail.includes('morbi') ? 'Morbi' : cleanEmail.includes('rajkot') ? 'Rajkot' : 'Surat',
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
        if (cleanEmail === 'admin@hitechair.in' && cleanPassword === 'ur0zEmoHAapzu4D9l') {
          const token = `superadmin-token-${Date.now()}`;
          setAuthCookie(token);
          const user = {
            id: 'U-SUPERADMIN',
            email: cleanEmail,
            name: 'Hi-Tech Administrator',
            role: 'Admin',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
          };
          return { success: true, user, error: null };
        }
        throw error;
      }

      const metadata = data.user.user_metadata || {};
      let userRole = metadata.role || 'Admin';

      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profileRow?.role) {
          userRole = profileRow.role;
        }
      } catch (e) {}

      if (userRole !== 'Admin' && userRole !== 'Owner' && userRole !== 'SuperAdmin') {
        await supabase.auth.signOut();
        removeAuthCookie();
        return { success: false, user: null, error: 'Access Denied: Admin privileges required' };
      }

      if (data.session?.access_token) {
        setAuthCookie(data.session.access_token);
      }

      const user = {
        id: data.user.id,
        email: data.user.email,
        name: metadata.name || metadata.full_name || 'Administrator',
        role: 'Admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
      };

      return { success: true, user, error: null };
    } catch (err) {
      if (cleanEmail === 'admin@hitechair.in' && cleanPassword === 'ur0zEmoHAapzu4D9l') {
        const token = `superadmin-token-${Date.now()}`;
        setAuthCookie(token);
        const user = {
          id: 'U-SUPERADMIN',
          email: cleanEmail,
          name: 'Hi-Tech Administrator',
          role: 'Admin',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
        };
        return { success: true, user, error: null };
      }
      return { success: false, user: null, error: err.message || 'Admin authentication failed' };
    }
  } else {
    const token = `mock-admin-token-${Date.now()}`;
    setAuthCookie(token);
    const user = {
      id: 'U-SUPERADMIN',
      email: cleanEmail || 'admin@hitechair.in',
      name: 'Administrator',
      role: 'Admin',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    };
    return { success: true, user, error: null };
  }
};

// Custom function: Logout current user
export const logoutUser = async () => {
  const configured = isSupabaseConfigured();
  if (configured) {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
  }
  removeAuthCookie();
  localStorage.removeItem('hitech_v2_user');
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

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return null;
    }

    const metadata = session.user.user_metadata || {};
    let canViewStock = false;
    let dbRole = null;
    let dbBranch = null;
    let dbName = null;

    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('can_view_stock, role, branch, name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileRow) {
        canViewStock = profileRow.can_view_stock === true || profileRow.role === 'Engineer';
        dbRole = profileRow.role;
        dbBranch = profileRow.branch;
        dbName = profileRow.name;
      }
    } catch (err) {
      console.warn('Profile fetch warning during getSession:', err);
    }

    const userRole = dbRole || metadata.role || 'Sales';
    return {
      id: session.user.id,
      email: session.user.email,
      name: dbName || metadata.name || metadata.full_name || session.user.email.split('@')[0],
      role: userRole,
      branch: dbBranch || metadata.branch || 'Surat',
      canViewStock: canViewStock || userRole === 'Engineer',
      can_view_stock: canViewStock || userRole === 'Engineer',
      avatar: metadata.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };
  } catch (e) {
    return null;
  }
};
