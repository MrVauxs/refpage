import { asc, eq } from 'drizzle-orm';
import { ALLOWED_EMAILS } from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { allowedEmail } from '#lib/server/db/schema.ts';

/**
 * The allowlist has two sources: `ALLOWED_EMAILS` holds the root entries, which
 * only a redeploy can change, and {@link extraAllowedEmails} holds entries the
 * admin adds from `/admin/people`.
 *
 * An entry is either a whole address (`me@example.com`) or a domain written
 * with a leading `@` (`@example.com`). Matching is case-insensitive. When both
 * sources are empty the allowlist is off and anyone may sign up.
 *
 * The split also decides who administers the site: a root entry is an admin, a
 * database entry is an ordinary account. See `#lib/server/admin.ts`.
 */
export function rootAllowedEmails(): string[] {
	return ALLOWED_EMAILS.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

/** Trimmed and lowercased — the form every comparison here works on. */
export function normalizeEntry(entry: string): string {
	return entry.trim().toLowerCase();
}

/**
 * Why an entry cannot be added, or `null` when it can. Deliberately loose: the
 * point is to catch a typo, not to police what an address may look like.
 */
export function entryProblem(entry: string): string | null {
	const value = normalizeEntry(entry);

	if (!value) return 'Type an email address or a domain.';
	if (/\s|,/.test(value)) return 'One address at a time, with no spaces or commas.';

	const at = value.lastIndexOf('@');

	if (at === -1) return 'Missing @ — write me@example.com, or @example.com for a whole domain.';
	if (!value.slice(at + 1).includes('.')) return 'That domain has no dot in it.';
	if (value.endsWith('@') || value.endsWith('.')) return 'That address is cut off.';

	return null;
}

export type AllowedEmailRow = {
	id: string;
	entry: string;
	note: string | null;
	createdAt: Date;
};

export function listAllowedEmails(): Promise<AllowedEmailRow[]> {
	return db.select().from(allowedEmail).orderBy(asc(allowedEmail.entry));
}

export async function extraAllowedEmails(): Promise<string[]> {
	const rows = await db.select({ entry: allowedEmail.entry }).from(allowedEmail);

	return rows.map((row) => row.entry);
}

/** `false` when the entry is already on either list — the caller says so. */
export async function addAllowedEmail(input: { entry: string; note?: string }): Promise<boolean> {
	const entry = normalizeEntry(input.entry);
	const note = input.note?.trim() || null;

	const known = [...rootAllowedEmails().map(normalizeEntry), ...(await extraAllowedEmails())];
	if (known.includes(entry)) return false;

	await db.insert(allowedEmail).values({ entry, note });

	return true;
}

export async function removeAllowedEmail(id: string): Promise<void> {
	await db.delete(allowedEmail).where(eq(allowedEmail.id, id));
}

export async function isAllowedEmail(email: string): Promise<boolean> {
	const allowed = [...rootAllowedEmails(), ...(await extraAllowedEmails())].map(normalizeEntry);

	if (!allowed.length) return true;

	const address = normalizeEntry(email);
	const at = address.lastIndexOf('@');

	return allowed.includes(address) || (at !== -1 && allowed.includes(address.slice(at)));
}

/**
 * Only a root entry administers the site — an address added from inside the app
 * gets an account, not the keys to it. With no root entries at all the
 * allowlist is off entirely, and every signed-in account is an admin; that is
 * the unconfigured local-development case.
 */
export function isAdminEmail(email: string): boolean {
	const root = rootAllowedEmails().map(normalizeEntry);

	if (!root.length) return true;

	const address = normalizeEntry(email);
	const at = address.lastIndexOf('@');

	return root.includes(address) || (at !== -1 && root.includes(address.slice(at)));
}
