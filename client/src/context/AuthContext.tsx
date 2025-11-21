import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  AuthUser,
  fetchAuthUsers,
  fetchCurrentUser,
  login as loginRequest,
  LoginRequest,
} from '../api/services/auth';
import { AUTH_TOKEN_STORAGE_KEY } from '../api/client';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  availableUsers: AuthUser[];
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_USER_STORAGE_KEY = 'gf_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AuthUser[]>([]);
  const [isReady, setIsReady] = useState(false);

  const loadUsers = useCallback(async () => {
    const users = await fetchAuthUsers();
    setAvailableUsers(users);
  }, []);

  useEffect(() => {
    loadUsers().catch((error) => {
      console.error('Failed to load auth users', error);
    });
  }, [loadUsers]);

  useEffect(() => {
    const storedToken =
      typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null;
    const storedUser =
      typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_STORAGE_KEY) : null;

    async function bootstrap() {
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          const current = await fetchCurrentUser();
          setUser(current.user);
          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(current.user));
        } catch (error) {
          console.warn('Clearing invalid auth session', error);
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_STORAGE_KEY);
          setUser(null);
          setToken(null);
        }
      }
      setIsReady(true);
    }

    bootstrap();
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await loginRequest(data);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setUser(null);
    setToken(null);
  };

  const value: AuthContextValue = {
    user,
    token,
    isReady,
    availableUsers,
    login,
    logout,
    refreshUsers: loadUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
