import { apiClient, apiGet, apiPost, TENANT_STORAGE_KEY } from '../client';

export type AuthUserRole = 'OWNER' | 'TECH' | 'VIEWER';

export interface AuthUser {
  id: string;
  name: string;
  role: AuthUserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface LoginRequest {
  userId: string;
  pin: string;
}

export interface TenantScopedUser extends AuthUser {
  tenant: string;
}

export function fetchAuthUsersForTenant(tenant: string) {
  return apiClient<AuthUser[]>('/api/auth/users', {
    method: 'GET',
    headers: { 'x-tenant': tenant },
  }).then((users) => users.map((u) => ({ ...u, tenant })));
}

export function login(request: LoginRequest, tenant: string) {
  return apiClient<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { 'x-tenant': tenant },
  }).then((response) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TENANT_STORAGE_KEY, tenant);
    }
    return response;
  });
}

export function fetchCurrentUser() {
  return apiGet<{ user: AuthUser }>('/api/auth/me');
}
