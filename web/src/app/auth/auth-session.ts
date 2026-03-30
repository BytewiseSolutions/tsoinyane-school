export function getActiveAuthStorage(): Storage | null {
  if (localStorage.getItem('accessToken')) {
    return localStorage;
  }

  if (sessionStorage.getItem('accessToken')) {
    return sessionStorage;
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
