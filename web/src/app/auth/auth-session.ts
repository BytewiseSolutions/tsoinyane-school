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
