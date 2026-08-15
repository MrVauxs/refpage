import { ALLOWED_EMAILS } from '$app/env/private';

/**
 * The allowlist has two sources: `ALLOWED_EMAILS` holds the root entries, which
 * only a redeploy can change, and {@link extraAllowedEmails} holds entries that
 * are managed from inside the app. The second one is still a stub — once there
 * is a UI for it, it becomes a database read and this is the only place that
 * has to change.
 *
 * An entry is either a whole address (`me@example.com`) or a domain written
 * with a leading `@` (`@example.com`). Matching is case-insensitive. When both
 * sources are empty the allowlist is off and anyone may sign up.
 */
export function rootAllowedEmails(): string[] {
	return ALLOWED_EMAILS.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

/** Async on purpose: this becomes a database read once the UI exists. */
export function extraAllowedEmails(): Promise<string[]> {
	return Promise.resolve([]);
}

export async function isAllowedEmail(email: string): Promise<boolean> {
	const allowed = [...rootAllowedEmails(), ...(await extraAllowedEmails())].map((entry) =>
		entry.trim().toLowerCase()
	);

	if (!allowed.length) return true;

	const address = email.trim().toLowerCase();
	const at = address.lastIndexOf('@');

	return allowed.includes(address) || (at !== -1 && allowed.includes(address.slice(at)));
}
