import { createAuthSessionStore, isStoredAuthSession } from '@super-pro/shared-web';
export type { StoredAuthSession } from '@super-pro/shared-types';

export const LOGIN_TEMPLATE_AUTH_STORAGE_KEY = 'login-template.auth';

const authSessionStore = createAuthSessionStore({
  storageKey: LOGIN_TEMPLATE_AUTH_STORAGE_KEY,
});

export { isStoredAuthSession };

export const readReusableAuthSession = authSessionStore.readReusableAuthSession;
export const getReusableAuthToken = authSessionStore.getReusableAuthToken;
export const hasReusableAuthToken = authSessionStore.hasReusableAuthToken;
export const clearReusableAuthSession = authSessionStore.clearReusableAuthSession;
