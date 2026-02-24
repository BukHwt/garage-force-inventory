import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  AuthUser,
  fetchAuthUsersForTenant,
  fetchCurrentUser,
  login as loginRequest,
  LoginRequest,
  TenantScopedUser,
} from '../api/services/auth';
import { AUTH_TOKEN_STORAGE_KEY, TENANT_STORAGE_KEY } from '../api/client';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  tenant: string;
  isReady: boolean;
  availableUsers: TenantScopedUser[];
  login: (data: LoginRequest, tenant: string) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_USER_STORAGE_KEY = 'gf_auth_user';
const DEFAULT_TENANT = 'main';
const HOME_TENANT_BY_NAME: Record<string, string> = {
  Adam: 'adam',
};
const TENANT_PRIORITY = ['main', 'adam'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tenant, setTenant] = useState<string>(DEFAULT_TENANT);
  const [availableUsers, setAvailableUsers] = useState<TenantScopedUser[]>([]);
  const [isReady, setIsReady] = useState(false);

  const loadUsers = useCallback(async () => {
    const tenantsToLoad = ['main', 'adam'];
    const results = await Promise.allSettled(
      tenantsToLoad.map((t) => fetchAuthUsersForTenant(t)),
    );

    const merged: TenantScopedUser[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        merged.push(...result.value);
      } else {
        console.warn('Failed to load users for a tenant', result.reason);
      }
    }

    // Deduplicate by name: prefer explicit home mapping, otherwise prefer main over others.
    const byName = new Map<string, TenantScopedUser>();
    for (const user of merged) {
      const preferredTenant = HOME_TENANT_BY_NAME[user.name];
      if (preferredTenant) {
        if (user.tenant === preferredTenant) {
          byName.set(user.name, user);
        }
        continue;
      }

      const existing = byName.get(user.name);
      if (!existing) {
        byName.set(user.name, user);
        continue;
      }

      const existingPriority = TENANT_PRIORITY.indexOf(existing.tenant);
      const currentPriority = TENANT_PRIORITY.indexOf(user.tenant);
      if (currentPriority !== -1 && (existingPriority === -1 || currentPriority < existingPriority)) {
        byName.set(user.name, user);
      }
    }

    const deduped = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
    setAvailableUsers(deduped);
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
    const storedTenant =
      typeof window !== 'undefined' ? localStorage.getItem(TENANT_STORAGE_KEY) : null;

    async function bootstrap() {
      if (storedTenant) {
        setTenant(storedTenant);
      }
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          if (typeof window !== 'undefined') {
            localStorage.setItem(TENANT_STORAGE_KEY, storedTenant ?? DEFAULT_TENANT);
          }
          const current = await fetchCurrentUser();
          setUser(current.user);
          localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(current.user));
        } catch (error) {
          console.warn('Clearing invalid auth session', error);
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_STORAGE_KEY);
          localStorage.removeItem(TENANT_STORAGE_KEY);
          setUser(null);
          setToken(null);
          setTenant(DEFAULT_TENANT);
        }
      }
      setIsReady(true);
    }

    bootstrap();
  }, []);

  const login = async (data: LoginRequest, targetTenant: string) => {
    const response = await loginRequest(data, targetTenant);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(response.user));
    localStorage.setItem(TENANT_STORAGE_KEY, targetTenant);
    setToken(response.token);
    setUser(response.user);
    setTenant(targetTenant);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem(TENANT_STORAGE_KEY);
    setUser(null);
    setToken(null);
    setTenant(DEFAULT_TENANT);
  };

  const value: AuthContextValue = {
    user,
    token,
    tenant,
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
