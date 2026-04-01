import { AuthUser } from '../models/auth-user';

function hasUsableToken(storage: Storage): boolean {
  const accessToken = storage.getItem('accessToken');
  const expiresAtRaw = storage.getItem('expiresAt');
  const expiresAt = Number(expiresAtRaw);

  if (!accessToken || !accessToken.trim()) {
    return false;
  }

  if (!expiresAtRaw || Number.isNaN(expiresAt)) {
    return true;
  }

  return Date.now() < expiresAt;
}

export function getActiveAuthStorage(): Storage | null {
  if (hasUsableToken(sessionStorage)) {
    return sessionStorage;
  }

  if (hasUsableToken(localStorage)) {
    return localStorage;
  }

  return null;
}

export function clearStoredAuth(): void {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem('accessToken');
    storage.removeItem('tokenType');
    storage.removeItem('expiresAt');
    storage.removeItem('user');
    storage.removeItem('selectedSchoolId');
    storage.removeItem('selectedSchoolName');
  }
}

export function getStoredAccessToken(): string | null {
  const storage = getActiveAuthStorage();
  if (!storage) {
    return null;
  }

  const accessToken = storage.getItem('accessToken');
  return accessToken && accessToken.trim() ? accessToken : null;
}

export function getStoredTokenType(): string | null {
  const storage = getActiveAuthStorage();
  if (!storage) {
    return null;
  }

  const tokenType = storage.getItem('tokenType');
  return tokenType && tokenType.trim() ? tokenType.trim() : null;
}

export function getAuthorizationHeader(): string | null {
  const accessToken = getStoredAccessToken();
  if (!accessToken) {
    return null;
  }

  const tokenType = getStoredTokenType() ?? 'Bearer';
  return `${tokenType} ${accessToken}`;
}

export function getStoredUser(): AuthUser | null {
  const storage = getActiveAuthStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem('user');
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function hasRole(role: string): boolean {
  const user = getStoredUser();
  if (!user) {
    return false;
  }

  const normalizedRole = normalizeRole(role);
  if (normalizeRole(user.role) === normalizedRole) {
    return true;
  }

  return (user.roles ?? [])
    .map(item => normalizeRole(item))
    .includes(normalizedRole);
}

export function hasValidAccessToken(): boolean {
  const storage = getActiveAuthStorage();
  const accessToken = getStoredAccessToken();
  if (!storage || !accessToken) {
    return false;
  }

  const expiresAtRaw = storage.getItem('expiresAt');
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAtRaw || Number.isNaN(expiresAt)) {
    return false;
  }

  return Date.now() < expiresAt;
}

function normalizeRole(role?: string): string {
  return (role ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}
