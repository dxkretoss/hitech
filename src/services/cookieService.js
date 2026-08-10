import Cookies from 'js-cookie';

const TOKEN_COOKIE_NAME = 'hitech_auth_token';

/**
 * Cookie Service to securely manage authentication tokens
 */
export const setAuthCookie = (token, days = 7) => {
  if (!token) return;
  Cookies.set(TOKEN_COOKIE_NAME, token, {
    expires: days,
    sameSite: 'Lax',
    secure: window.location.protocol === 'https:'
  });
};

export const getAuthCookie = () => {
  return Cookies.get(TOKEN_COOKIE_NAME) || null;
};

export const removeAuthCookie = () => {
  Cookies.remove(TOKEN_COOKIE_NAME);
};
