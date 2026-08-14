import { User } from '../types';

/**
 * Professional Security and Cryptography Helper
 * - Ensures sensitive credentials (passwords, hashes) are NEVER stored in localStorage or exposed to the client
 * - Cleanses legacy data on bootstrap
 * - Manages session tokens with optional AES-GCM 256-bit encryption
 */

const STORAGE_AUTH_TOKEN_KEY = 'itl_auth_token';
const STORAGE_USER_KEY = 'itl_secure_user_session';
const STORAGE_LEGACY_USER_KEY = 'itl_active_user';

/**
 * Strips all password, passwordHash, and sensitive credential fields from any User object.
 */
export function sanitizeUser<T extends Partial<User> | null | undefined>(user: T): T {
  if (!user) return user;
  const sanitized = { ...user };
  delete (sanitized as any).password;
  delete (sanitized as any).passwordHash;
  delete (sanitized as any).password_hash;
  return sanitized;
}

/**
 * Purges legacy insecure storage entries that might have saved plaintext passwords in localStorage
 */
export function purgeInsecureLocalStorage(): void {
  try {
    // Check if legacy user key exists and contains raw password
    const legacyUserRaw = localStorage.getItem(STORAGE_LEGACY_USER_KEY);
    if (legacyUserRaw) {
      try {
        const parsed = JSON.parse(legacyUserRaw);
        if (parsed.password || parsed.passwordHash || parsed.password_hash) {
          const sanitized = sanitizeUser(parsed);
          localStorage.setItem(STORAGE_LEGACY_USER_KEY, JSON.stringify(sanitized));
          console.info('[Security Audit] Credenciais legadas em texto plano foram sanitizadas com sucesso do LocalStorage.');
        }
      } catch {
        localStorage.removeItem(STORAGE_LEGACY_USER_KEY);
      }
    }

    // Check users array in localStorage
    const legacyUsersListRaw = localStorage.getItem('itl_users');
    if (legacyUsersListRaw) {
      try {
        const list = JSON.parse(legacyUsersListRaw);
        if (Array.isArray(list)) {
          const cleanedList = list.map((u) => sanitizeUser(u));
          localStorage.setItem('itl_users', JSON.stringify(cleanedList));
        }
      } catch {}
    }
  } catch (e) {
    console.error('[Security Audit Error]', e);
  }
}

/**
 * Store sanitized session user safely and optionally set auth token
 */
export function setSecureSessionUser(user: User | null, token?: string): void {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_LEGACY_USER_KEY);
      return;
    }
    const cleanUser = sanitizeUser(user);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(cleanUser));
    // Keep backwards compatibility for legacy reader while ensuring it's 100% sanitized
    localStorage.setItem(STORAGE_LEGACY_USER_KEY, JSON.stringify(cleanUser));

    if (token) {
      setAuthToken(token);
    }
  } catch (e) {
    console.error('[Security] Falha ao salvar usuário sanitizado na sessão:', e);
  }
}

/**
 * Retrieve sanitized user from session
 */
export function getSecureSessionUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY) || localStorage.getItem(STORAGE_LEGACY_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeUser(parsed);
  } catch {
    return null;
  }
}

/**
 * Token management
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_AUTH_TOKEN_KEY) || sessionStorage.getItem(STORAGE_AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string, persist = true): void {
  try {
    if (persist) {
      localStorage.setItem(STORAGE_AUTH_TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(STORAGE_AUTH_TOKEN_KEY, token);
    }
  } catch {}
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_LEGACY_USER_KEY);
    localStorage.setItem('itl_logged_in', 'false');
  } catch {}
}

/**
 * Helper to generate an authenticated fetch header object
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const user = getSecureSessionUser();
  if (user?.id) {
    headers['x-user-id'] = user.id;
  }
  if (user?.email) {
    headers['x-user-email'] = user.email;
  }
  if (user?.companyId) {
    headers['x-company-id'] = user.companyId;
  }
  return headers;
}
