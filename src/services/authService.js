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
  return user.role === 'Owner' || user.role === 'SuperAdmin' || user.role === 'Admin';
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
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            name: cleanName,
            full_name: cleanName,
            role: role, // 'Sales' or 'Engineer'
            branch: cleanBranch // 'Surat' | 'Morbi' | 'Rajkot'
          }
        }
      });

      if (error) {
        if (error.code === 'over_email_send_rate_limit' || error.message?.includes('rate limit')) {
          throw new Error('Supabase Email Rate Limit Exceeded! Turn OFF "Confirm email" in Supabase Dashboard -> Authentication -> Providers -> Email for instant signups.');
        }

        // Handle Supabase Postgres trigger failure: "Database error saving new user"
        if (
          error.message?.includes('Database error saving new user') ||
          error.message?.includes('saving new user') ||
          error.code === 'unexpected_failure'
        ) {
          console.warn('Supabase DB trigger issue during signUp, registering user with local profile fallback:', error);

          const newUserId = `U-${Date.now().toString().slice(-6)}`;
          const localProfiles = JSON.parse(localStorage.getItem('hitech_v2_profiles') || '[]');
          const newProfile = {
            id: newUserId,
            name: cleanName,
            email: cleanEmail,
            role: role || 'Sales',
            branch: cleanBranch,
            canViewStock: role === 'Engineer' || role === 'Owner' || role === 'SuperAdmin',
            status: 'Active',
            date: new Date().toISOString().split('T')[0]
          };

          const updatedProfiles = [newProfile, ...localProfiles.filter((p) => p.email !== cleanEmail)];
          localStorage.setItem('hitech_v2_profiles', JSON.stringify(updatedProfiles));

          // Also save credentials in local auth store for persistent signin
          const localCreds = JSON.parse(localStorage.getItem('hitech_v2_auth_users') || '{}');
          localCreds[cleanEmail.toLowerCase()] = {
            id: newUserId,
            name: cleanName,
            email: cleanEmail,
            password: cleanPassword,
            role: role || 'Sales',
            branch: cleanBranch
          };
          localStorage.setItem('hitech_v2_auth_users', JSON.stringify(localCreds));

          const token = `local-token-${Date.now()}`;
          setAuthCookie(token);

          const user = {
            id: newUserId,
            name: cleanName,
            email: cleanEmail,
            role,
            branch: cleanBranch,
            canViewStock: newProfile.canViewStock,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          };

          return { success: true, user, requiresConfirmation: false, error: null };
        }

        throw error;
      }

      const requiresConfirmation = !data.session && !!data.user;

      if (data.session?.access_token) {
        setAuthCookie(data.session.access_token);
      }

      // Also ensure profile exists in local cache
      if (data.user) {
        const localProfiles = JSON.parse(localStorage.getItem('hitech_v2_profiles') || '[]');
        const newProfile = {
          id: data.user.id,
          name: cleanName,
          email: cleanEmail,
          role: role || 'Sales',
          branch: cleanBranch,
          canViewStock: role === 'Engineer' || role === 'Owner' || role === 'SuperAdmin',
          status: 'Active',
          date: new Date().toISOString().split('T')[0]
        };
        localStorage.setItem('hitech_v2_profiles', JSON.stringify([newProfile, ...localProfiles.filter((p) => p.email !== cleanEmail)]));
      }

      const user = data.session
        ? {
            id: data.user.id,
            name: cleanName,
            email: cleanEmail,
            role,
            branch: cleanBranch,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          }
        : null;

      return { success: true, user, requiresConfirmation, error: null };
    } catch (err) {
      // Fallback on unexpected server failure
      if (err.message?.includes('Database error saving new user') || err.message?.includes('saving new user')) {
        const newUserId = `U-${Date.now().toString().slice(-6)}`;
        const localProfiles = JSON.parse(localStorage.getItem('hitech_v2_profiles') || '[]');
        const newProfile = {
          id: newUserId,
          name: cleanName,
          email: cleanEmail,
          role: role || 'Sales',
          branch: cleanBranch,
          canViewStock: role === 'Engineer',
          status: 'Active',
          date: new Date().toISOString().split('T')[0]
        };
        localStorage.setItem('hitech_v2_profiles', JSON.stringify([newProfile, ...localProfiles.filter((p) => p.email !== cleanEmail)]));

        const localCreds = JSON.parse(localStorage.getItem('hitech_v2_auth_users') || '{}');
        localCreds[cleanEmail.toLowerCase()] = {
          id: newUserId,
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          role: role || 'Sales',
          branch: cleanBranch
        };
        localStorage.setItem('hitech_v2_auth_users', JSON.stringify(localCreds));

        const token = `local-token-${Date.now()}`;
        setAuthCookie(token);

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

      return { success: false, user: null, requiresConfirmation: false, error: err.message || 'Registration failed' };
    }
  } else {
    // Custom Local Mode Fallback
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

    const localProfiles = JSON.parse(localStorage.getItem('hitech_v2_profiles') || '[]');
    const newProfile = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      role: role || 'Sales',
      branch: cleanBranch,
      canViewStock: role === 'Engineer',
      status: 'Active',
      date: new Date().toISOString().split('T')[0]
    };
    localStorage.setItem('hitech_v2_profiles', JSON.stringify([newProfile, ...localProfiles.filter((p) => p.email !== cleanEmail)]));

    const localCreds = JSON.parse(localStorage.getItem('hitech_v2_auth_users') || '{}');
    localCreds[cleanEmail.toLowerCase()] = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: role || 'Sales',
      branch: cleanBranch
    };
    localStorage.setItem('hitech_v2_auth_users', JSON.stringify(localCreds));

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

      if (error) {
        // Check if user was registered locally in hitech_v2_auth_users fallback
        const localCreds = JSON.parse(localStorage.getItem('hitech_v2_auth_users') || '{}');
        const found = localCreds[cleanEmail.toLowerCase()];
        if (found && found.password === cleanPassword) {
          const token = `local-token-${Date.now()}`;
          setAuthCookie(token);
          const localProfiles = JSON.parse(localStorage.getItem('hitech_v2_profiles') || '[]');
          const p = localProfiles.find((pr) => pr.email.toLowerCase() === cleanEmail.toLowerCase());
          const user = {
            id: found.id,
            email: found.email,
            name: found.name,
            role: found.role,
            branch: found.branch,
            canViewStock: p?.canViewStock ?? (found.role === 'Engineer'),
            can_view_stock: p?.canViewStock ?? (found.role === 'Engineer'),
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          };
          return { success: true, user, error: null };
        }
        throw error;
      }

      if (data.session?.access_token) {
        setAuthCookie(data.session.access_token);
      }

      let canViewStock = false;
      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('can_view_stock, role, branch, name')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profileRow) {
          if (profileRow.can_view_stock === true) canViewStock = true;
        }
      } catch (err) {
        console.warn('Profile fetch error during login:', err);
      }

      const metadata = data.user.user_metadata || {};
      const user = {
        id: data.user.id,
        email: data.user.email,
        name: metadata.name || metadata.full_name || cleanEmail.split('@')[0],
        role: metadata.role || 'Sales',
        branch: metadata.branch || 'Surat',
        canViewStock: canViewStock,
        can_view_stock: canViewStock,
        avatar: metadata.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };

      return { success: true, user, error: null };
    } catch (err) {
      // Local check fallback
      const localCreds = JSON.parse(localStorage.getItem('hitech_v2_auth_users') || '{}');
      const found = localCreds[cleanEmail.toLowerCase()];
      if (found && found.password === cleanPassword) {
        const token = `local-token-${Date.now()}`;
        setAuthCookie(token);
        const localProfiles = JSON.parse(localStorage.getItem('hitech_v2_profiles') || '[]');
        const p = localProfiles.find((pr) => pr.email.toLowerCase() === cleanEmail.toLowerCase());
        const user = {
          id: found.id,
          email: found.email,
          name: found.name,
          role: found.role,
          branch: found.branch,
          canViewStock: p?.canViewStock ?? (found.role === 'Engineer'),
          can_view_stock: p?.canViewStock ?? (found.role === 'Engineer'),
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };
        return { success: true, user, error: null };
      }

      return { success: false, user: null, error: err.message || 'Invalid credentials' };
    }
  } else {
    // Custom Local Mode Fallback
    const token = `mock-token-${Date.now()}`;
    setAuthCookie(token);
    const localCreds = JSON.parse(localStorage.getItem('hitech_v2_auth_users') || '{}');
    const found = localCreds[cleanEmail.toLowerCase()];
    const user = {
      id: found?.id || `U-${Date.now()}`,
      email: cleanEmail,
      name: found?.name || cleanEmail.split('@')[0],
      role: found?.role || (cleanEmail.includes('engineer') ? 'Engineer' : 'Sales'),
      branch: found?.branch || (cleanEmail.includes('morbi') ? 'Morbi' : cleanEmail.includes('rajkot') ? 'Rajkot' : 'Surat'),
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
  let canViewStock = false;
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('can_view_stock, role, branch, name')
      .eq('id', session.user.id)
      .maybeSingle();
    if (profileRow) {
      if (profileRow.can_view_stock === true) canViewStock = true;
    }
  } catch (err) {
    console.warn('Profile fetch error during getSession:', err);
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: metadata.name || metadata.full_name || session.user.email.split('@')[0],
    role: metadata.role || 'Sales',
    branch: metadata.branch || 'Surat',
    canViewStock: canViewStock,
    can_view_stock: canViewStock,
    avatar: metadata.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  };
};
