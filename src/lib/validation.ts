// ---------------------------------------------------------------------------
// Shared validation helpers — used by auth and API endpoints
// ---------------------------------------------------------------------------

const USERNAME_RE = /^[a-z0-9_-]+$/;

// Very permissive RFC-5322-inspired check — rejects obvious garbage
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidUsername(username: string): boolean {
	return USERNAME_RE.test(username);
}

export function isValidEmail(email: string): boolean {
	return EMAIL_RE.test(email) && email.length <= 254;
}
