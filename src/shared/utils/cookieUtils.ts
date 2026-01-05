// Utilities for handling auth token in cookies

// Eliminada getAuthTokenFromCookie y referencias a deleteAuthTokenCookie

// Funciones genéricas de cookies para compatibilidad
export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

// Verifica si existen cookies de sesión emitidas por el backend
export const hasSessionCookies = (): boolean => {
  try {
    return !!(
      getCookie('access_token_cookie') ||
      getCookie('csrf_access_token') ||
      getCookie('csrf_refresh_token') ||
      getCookie('refresh_token_cookie')
    );
  } catch {
    return false;
  }
};

export const setCookie = (name: string, value: string, days?: number): void => {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${name}=${value}${expires}; path=/`;
};

export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};
