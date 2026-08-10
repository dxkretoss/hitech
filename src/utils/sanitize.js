/**
 * Utility functions for input sanitization and trimming
 */

export const sanitizeEmail = (email = '') => {
  return email.trim().toLowerCase();
};

export const sanitizePassword = (password = '') => {
  return password.trim();
};

export const sanitizeText = (text = '') => {
  return text.trim();
};
