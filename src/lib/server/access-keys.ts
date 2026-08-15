import { randomInt } from 'node:crypto';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { accessKey, accessKeyCharacter, character } from '#lib/server/db/schema.ts';
import { deriveAccessKeySecrets } from '#lib/server/access.ts';

/**
 * No `0`/`o` and `1`/`l` so it doesn't get confused with whatever fonts.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** ~79 bits, in four hand-typable groups. */
export function generateAccessPassword(): string {
	const groups = Array.from({ length: 4 }, () =>
		Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
	);

	return groups.join('-');
}

export type AccessKeyRow = {
	id: string;
	label: string;
	createdAt: Date;
	lastUsedAt: Date | null;
	revokedAt: Date | null;
	characterCount: number;
};

export async function listAccessKeys(): Promise<AccessKeyRow[]> {
	return db
		.select({
			id: accessKey.id,
			label: accessKey.label,
			createdAt: accessKey.createdAt,
			lastUsedAt: accessKey.lastUsedAt,
			revokedAt: accessKey.revokedAt,
			characterCount: sql<number>`count(${accessKeyCharacter.characterId})`
		})
		.from(accessKey)
		.leftJoin(accessKeyCharacter, eq(accessKeyCharacter.accessKeyId, accessKey.id))
		.groupBy(accessKey.id)
		.orderBy(asc(accessKey.label));
}

/** The character ids each key unlocks, keyed by key id. */
export async function characterIdsByKey(): Promise<Map<string, string[]>> {
	const rows = await db.select().from(accessKeyCharacter);
	const byKey = new Map<string, string[]>();

	for (const row of rows) {
		const ids = byKey.get(row.accessKeyId);
		if (ids) ids.push(row.characterId);
		else byKey.set(row.accessKeyId, [row.characterId]);
	}

	return byKey;
}

/**
 * Creates a key and returns the plaintext password alongside it. This is the
 * only moment the password exists in readable form — only its hash is stored,
 * so a lost password means issuing a new key.
 */
export async function createAccessKey(input: {
	label: string;
	password?: string;
	characterIds: string[];
}): Promise<{ id: string; password: string }> {
	const password = input.password?.trim() || generateAccessPassword();
	const secrets = await deriveAccessKeySecrets(password);

	const [row] = await db
		.insert(accessKey)
		.values({ label: input.label, ...secrets })
		.returning({ id: accessKey.id });

	await setAccessKeyCharacters(row.id, input.characterIds);

	return { id: row.id, password };
}

export async function setAccessKeyCharacters(id: string, characterIds: string[]): Promise<void> {
	await db.delete(accessKeyCharacter).where(eq(accessKeyCharacter.accessKeyId, id));

	if (!characterIds.length) return;

	await db
		.insert(accessKeyCharacter)
		.values(characterIds.map((characterId) => ({ accessKeyId: id, characterId })));
}

/** Revoking keeps the row so the label and last-used date stay readable. */
export async function revokeAccessKey(id: string): Promise<void> {
	await db.update(accessKey).set({ revokedAt: new Date() }).where(eq(accessKey.id, id));
}

export async function restoreAccessKey(id: string): Promise<void> {
	await db.update(accessKey).set({ revokedAt: null }).where(eq(accessKey.id, id));
}

export async function deleteAccessKey(id: string): Promise<void> {
	await db.delete(accessKey).where(eq(accessKey.id, id));
}

/** True when every id names a character that exists. Guards form input. */
export async function charactersExist(ids: string[]): Promise<boolean> {
	if (!ids.length) return true;

	const rows = await db.select({ id: character.id }).from(character).where(inArray(character.id, ids));

	return rows.length === ids.length;
}
