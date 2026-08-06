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

/**
 * True once we know there is no session: after logout, or after a refresh
 * attempt has failed.
 *
 * Without it the client cannot tell "no token yet, ask the cookie" from "no
 * token because the user just signed out", so every request after logout tried
 * to refresh and produced a burst of 401s. The refresh cookie is httpOnly, so
 * asking the server is otherwise the only way to find out.
 */
let sessionEnded = false;

export function isSessionEnded(): boolean {
  return sessionEnded;
}

/** Call when a session is known to be gone: logout, or a failed refresh. */
export function markSessionEnded(): void {
  sessionEnded = true;
}

/** Call when a session is established: login, register, successful refresh. */
export function markSessionActive(): void {
  sessionEnded = false;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
