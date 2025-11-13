import { apiGet, apiPost } from '../client';

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

export function fetchAuthUsers() {
  return apiGet<AuthUser[]>('/api/auth/users');
}

export function login(request: LoginRequest) {
  return apiPost<LoginResponse>('/api/auth/login', request);
}

export function fetchCurrentUser() {
  return apiGet<{ user: AuthUser }>('/api/auth/me');
}
