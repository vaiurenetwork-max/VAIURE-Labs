/**
 * VAIURE Client Authentication Header Helper
 * Always retrieves the current Firebase ID token for verified server-side authorization.
 * Never relies on spoofable x-user-id / x-user-email headers.
 */

import { auth } from './firebase';

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  try {
    if (typeof (auth as any).authStateReady === 'function') {
      await Promise.race([
        (auth as any).authStateReady(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export async function getAuthHeaders(
  extraHeaders: Record<string, string> = {},
  includeContentType = true
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeContentType && !extraHeaders['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  Object.assign(headers, extraHeaders);

  const token = await getFirebaseIdToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const authHeaders = await getAuthHeaders(
    (init.headers as Record<string, string>) || {},
    !isFormData
  );
  return fetch(input, {
    ...init,
    headers: authHeaders,
  });
}
