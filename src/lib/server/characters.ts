import { asc, eq, inArray, like, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { accessKey, accessKeyCharacter, character } from '#lib/server/db/schema.ts';

export type CharacterRow = typeof character.$inferSelect;

/** Everything, newest name-order first. The admin list and the owner's own view. */
export function listCharacters() {
	return db.select().from(character).orderBy(asc(character.name));
}

export async function getCharacter(id: string): Promise<CharacterRow | undefined> {
	const [row] = await db.select().from(character).where(eq(character.id, id)).limit(1);
	return row;
}

export function slugify(value: string): string {
	return value
		.normalize('NFKD')
		// strip the combining marks NFKD just split off, so "Ná" becomes "na"
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
}

/**
 * Appends `-2`, `-3`, … until the slug is free. `exceptId` keeps a character
 * from colliding with itself while being renamed.
 */
async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
	const stem = base || 'character';

	const taken = new Set(
		(
			await db
				.select({ slug: character.slug, id: character.id })
				.from(character)
				.where(like(character.slug, `${stem}%`))
		)
			.filter((row) => row.id !== exceptId)
			.map((row) => row.slug)
	);

	if (!taken.has(stem)) return stem;

	for (let suffix = 2; ; suffix++) {
		const candidate = `${stem}-${suffix}`;
		if (!taken.has(candidate)) return candidate;
	}
}

export async function createCharacter(input: {
	name: string;
	summary?: string | null;
}): Promise<CharacterRow> {
	const [row] = await db
		.insert(character)
		.values({
			name: input.name,
			summary: input.summary || null,
			slug: await uniqueSlug(slugify(input.name))
		})
		.returning();

	return row;
}

export async function updateCharacter(
	id: string,
	input: { name: string; summary?: string | null }
): Promise<void> {
	await db
		.update(character)
		.set({
			name: input.name,
			summary: input.summary || null,
			slug: await uniqueSlug(slugify(input.name), id)
		})
		.where(eq(character.id, id));
}

export async function deleteCharacter(id: string): Promise<void> {
	await db.delete(character).where(eq(character.id, id));
}

/** The share passwords that unlock one character, revoked ones included. */
export function keysForCharacter(id: string) {
	return db
		.select({
			id: accessKey.id,
			label: accessKey.label,
			revokedAt: accessKey.revokedAt
		})
		.from(accessKeyCharacter)
		.innerJoin(accessKey, eq(accessKey.id, accessKeyCharacter.accessKeyId))
		.where(eq(accessKeyCharacter.characterId, id))
		.orderBy(asc(accessKey.label));
}

/** How many share passwords currently unlock each of the given characters. */
export async function shareCounts(ids: string[]): Promise<Map<string, number>> {
	if (!ids.length) return new Map();

	const rows = await db
		.select({
			characterId: accessKeyCharacter.characterId,
			count: sql<number>`count(*)`.as('count')
		})
		.from(accessKeyCharacter)
		.where(inArray(accessKeyCharacter.characterId, ids))
		.groupBy(accessKeyCharacter.characterId);

	return new Map(rows.map((row) => [row.characterId, row.count]));
}
