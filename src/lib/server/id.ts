/**
 * Shared ID and token generation.
 *
 * newId()        — UUIDv7 as 32-char hex string. Used for all primary keys.
 * newSecureToken() — 64-char hex token (2 × UUIDv7). Used for session and reset tokens.
 *
 * Drizzle mysql binary() columns expect hex strings, not Buffers.
 * All primary keys in this project follow this convention.
 */
import { uuidv7 } from 'uuidv7';

export function newId(): string {
	return uuidv7().replace(/-/g, '');
}

/** Generate a 64-character hex token suitable for session/reset cookies. */
export function newSecureToken(): string {
	return uuidv7().replace(/-/g, '') + uuidv7().replace(/-/g, '');
}
