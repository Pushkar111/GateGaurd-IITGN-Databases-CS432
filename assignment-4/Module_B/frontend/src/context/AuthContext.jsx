// src/context/AuthContext.jsx
// Application-wide auth state - token, user, login, logout, hasRole
// Wrapped around the entire app in main.jsx

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '@/api/auth.api';
import { STORAGE_ACCESS_KEY, STORAGE_REFRESH_KEY } from '@/api/axios';

const STORAGE_USER_KEY = 'gateguard_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null);
  const [token,           setToken]           = useState(() => localStorage.getItem(STORAGE_ACCESS_KEY));
  const [refreshToken,    setRefreshToken]    = useState(() => localStorage.getItem(STORAGE_REFRESH_KEY));
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);

  // Bootstrap: on mount, validate existing token
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_ACCESS_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((res) => {
        const userData = res.data?.user || res.data;
        setUser(userData);
        setMustChangePassword(
          !!(userData?.mustChangePassword || userData?.mustchangepassword || userData?.MustChangePassword)
        );
        setToken(storedToken);
        setIsAuthenticated(true);
      })
      .catch(() => {
        // token invalid / expired - clear everything
        localStorage.removeItem(STORAGE_ACCESS_KEY);
        localStorage.removeItem(STORAGE_REFRESH_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        setUser(null);
        setMustChangePassword(false);
        setToken(null);
        setRefreshToken(null);
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Login
  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password });
    
    // Check if the API request resulted in a lockout exception first.
    // Assuming API throws if 423
    
    const { accessToken, refreshToken: newRefresh, user: userData } = res.data;

    localStorage.setItem(STORAGE_ACCESS_KEY,  accessToken);
    localStorage.setItem(STORAGE_REFRESH_KEY, newRefresh);
    localStorage.setItem(STORAGE_USER_KEY,    JSON.stringify(userData));

    setToken(accessToken);
    setRefreshToken(newRefresh);
    setUser(userData);
    setMustChangePassword(
      !!(userData?.mustChangePassword || userData?.mustchangepassword || userData?.MustChangePassword)
    );
    setIsAuthenticated(true);
    return userData;
  }, []);

  // Logout
  const logout = useCallback(async () => {
    const currentRefresh = localStorage.getItem(STORAGE_REFRESH_KEY);

    // Optimistic logout: clear client auth state first for immediate route transition.
    localStorage.removeItem(STORAGE_ACCESS_KEY);
    localStorage.removeItem(STORAGE_REFRESH_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setUser(null);
    setMustChangePassword(false);
    setToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);

    // Best-effort backend invalidation without blocking UI navigation.
    if (currentRefresh) {
      authApi.logout({ refreshToken: currentRefresh }).catch(() => {
        // ignore logout errors on backend
      });
    }
  }, []);

  const markPasswordUpdated = useCallback(() => {
    setMustChangePassword(false);
    setUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        mustChangePassword: false,
        mustchangepassword: false,
        MustChangePassword: false,
      };
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Role check - supports multiple allowed roles
  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    const currentRole = (user.Role || user.role || user.RoleName || user.rolename || '').toLowerCase();
    return roles.some((r) => String(r).toLowerCase() === currentRole);
  }, [user]);

  const value = {
    user,
    token,
    refreshToken,
    mustChangePassword,
    isAuthenticated,
    isLoading,
    login,
    logout,
    markPasswordUpdated,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
