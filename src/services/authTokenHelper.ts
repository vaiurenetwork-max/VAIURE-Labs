/**
 * Firebase ID Token & Authenticated Header Helper
 * Ensures every client API request carries a verified Firebase Bearer token
 * scoped strictly to the signed-in user.
 */

import {
  getFirebaseIdToken as getReadyFirebaseIdToken,
  getAuthHeaders as getBaseAuthHeaders,
} from '../lib/authHeaders';

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  return getReadyFirebaseIdToken(forceRefresh);
}

export async function getAuthHeaders(
  includeJsonContentType = true
): Promise<Record<string, string>> {
  return getBaseAuthHeaders({}, includeJsonContentType);
}
