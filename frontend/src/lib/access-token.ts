/**
 * The access token, held in a module variable — in memory, never persisted.
 *
 * This exists so `lib/api.ts` can attach the token without importing the auth
 * store (which imports `api`, so a direct import would be circular), and without
 * reading localStorage. The request interceptor used to parse the persisted
 * zustand blob out of `localStorage`, which coupled it to storage internals and
 * stopped working the moment tokens left storage — as they now have.
 *
 * Nothing here survives a reload. That is the point: a cold load has no token
 * and restores the session from the httpOnly refresh cookie instead.
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
