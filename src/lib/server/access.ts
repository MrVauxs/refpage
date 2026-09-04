import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { BETTER_AUTH_SECRET } from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { accessKey, accessKeyCharacter, character } from '#lib/server/db/schema.ts';

const COOKIE = 'refpage_access';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type Guest = { keyId: string; label: string };

function hmac(value: string): Buffer {
	if (!BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set');
	return createHmac('sha256', BETTER_AUTH_SECRET).update(value).digest();
}

export function accessLookup(password: string): string {
	return hmac(`access-key-lookup:${password}`).toString('hex');
}

/** Both derivations a new key needs. */
export async function deriveAccessKeySecrets(password: string) {
	return { lookup: accessLookup(password), hash: await hashPassword(password) };
}

function sign(payload: string): string {
	return hmac(`access-cookie:${payload}`).toString('base64url');
}

function verifySignature(payload: string, signature: string): boolean {
	const expected = Buffer.from(sign(payload));
	const actual = Buffer.from(signature);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function startGuestSession(cookies: Cookies, keyId: string): void {
	const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
	const payload = `${keyId}.${expiresAt}`;

	cookies.set(COOKIE, `${payload}.${sign(payload)}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: MAX_AGE_SECONDS
	});
}

export function endGuestSession(cookies: Cookies): void {
	cookies.delete(COOKIE, { path: '/' });
}

/**
 * Reads the guest cookie and confirms the key behind it is still live.
 */
export async function resolveGuest(cookies: Cookies): Promise<Guest | undefined> {
	const raw = cookies.get(COOKIE);
	if (!raw) return undefined;

	const [keyId, expiresAt, signature] = raw.split('.');
	if (!keyId || !expiresAt || !signature) return undefined;
	if (!verifySignature(`${keyId}.${expiresAt}`, signature)) return undefined;
	if (!(Number(expiresAt) > Date.now())) return undefined;

	const [row] = await db
		.select({ id: accessKey.id, label: accessKey.label })
		.from(accessKey)
		.where(and(eq(accessKey.id, keyId), isNull(accessKey.revokedAt)))
		.limit(1);

	return row ? { keyId: row.id, label: row.label } : undefined;
}

/** Resolves a typed password to its key, or `undefined` if nothing matches. */
export async function findAccessKeyByPassword(password: string) {
	const [row] = await db
		.select({ id: accessKey.id, hash: accessKey.hash })
		.from(accessKey)
		.where(and(eq(accessKey.lookup, accessLookup(password)), isNull(accessKey.revokedAt)))
		.limit(1);

	if (!row) return undefined;
	if (!(await verifyPassword({ hash: row.hash, password }))) return undefined;

	await db.update(accessKey).set({ lastUsedAt: new Date() }).where(eq(accessKey.id, row.id));

	return row;
}

/** The characters a share password unlocks, in display order. */
export function charactersForKey(keyId: string) {
	return db
		.select({
			id: character.id,
			slug: character.slug,
			name: character.name,
			summary: character.summary
		})
		.from(accessKeyCharacter)
		.innerJoin(character, eq(character.id, accessKeyCharacter.characterId))
		.where(eq(accessKeyCharacter.accessKeyId, keyId))
		.orderBy(character.name);
}

export async function characterForKey(keyId: string, slug: string) {
	const [row] = await db
		.select({
			id: character.id,
			slug: character.slug,
			name: character.name,
			summary: character.summary
		})
		.from(accessKeyCharacter)
		.innerJoin(character, eq(character.id, accessKeyCharacter.characterId))
		.where(and(eq(accessKeyCharacter.accessKeyId, keyId), eq(character.slug, slug)))
		.limit(1);
	return row;
}

const failures = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 10;

function recentFailures(address: string, now: number): number[] {
	return (failures.get(address) ?? []).filter((at) => now - at < WINDOW_MS);
}

export function accessAttemptsExhausted(event: RequestEvent): boolean {
	return recentFailures(event.getClientAddress(), Date.now()).length >= MAX_FAILURES;
}

export function recordFailedAccessAttempt(event: RequestEvent): void {
	const address = event.getClientAddress();
	const now = Date.now();

	failures.set(address, [...recentFailures(address, now), now]);

	// keep the map from growing without bound on a long-lived process
	if (failures.size > 1000) {
		for (const [key, times] of failures) {
			if (!times.some((at) => now - at < WINDOW_MS)) failures.delete(key);
		}
	}
}
