import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { referenceImage, referenceImageTag, tag } from '#lib/server/db/schema.ts';

export type ImageRow = typeof referenceImage.$inferSelect;

export function normalizeTags(value: string): string[] {
	return [
		...new Set(
			value
				.split(/[\s,]+/)
				.map((name) =>
					name
						.trim()
						.toLowerCase()
						.replace(/[^a-z0-9_-]+/g, '_')
						.replace(/^_+|_+$/g, '')
						.slice(0, 64)
				)
				.filter(Boolean)
		)
	].slice(0, 64);
}

async function tagsByImage(ids: string[]): Promise<Map<string, string[]>> {
	if (!ids.length) return new Map();

	const rows = await db
		.select({ imageId: referenceImageTag.imageId, name: tag.name })
		.from(referenceImageTag)
		.innerJoin(tag, eq(tag.id, referenceImageTag.tagId))
		.where(inArray(referenceImageTag.imageId, ids))
		.orderBy(asc(tag.name));

	const result = new Map<string, string[]>();
	for (const row of rows) result.set(row.imageId, [...(result.get(row.imageId) ?? []), row.name]);
	return result;
}

export async function imagesForCharacter(characterId: string) {
	const rows = await db
		.select()
		.from(referenceImage)
		.where(eq(referenceImage.characterId, characterId))
		.orderBy(desc(referenceImage.createdAt));
	const tags = await tagsByImage(rows.map((row) => row.id));

	return rows.map((row) => ({ ...row, tags: tags.get(row.id) ?? [] }));
}

export async function imageSummariesForCharacters(characterIds: string[]) {
	if (!characterIds.length) return new Map<string, { count: number; cover: string | null; tags: string[] }>();

	const rows = await db
		.select()
		.from(referenceImage)
		.where(inArray(referenceImage.characterId, characterIds))
		.orderBy(desc(referenceImage.createdAt));
	const tags = await tagsByImage(rows.map((row) => row.id));
	const result = new Map<string, { count: number; cover: string | null; tags: string[] }>();

	for (const row of rows) {
		const current = result.get(row.characterId) ?? { count: 0, cover: null, tags: [] };
		if (!row.variantOfId) {
			current.count += 1;
			current.cover ??= row.fileKey;
		}
		if (row.isCover) current.cover = row.fileKey;
		current.tags.push(...(tags.get(row.id) ?? []));
		current.tags = [...new Set(current.tags)].sort();
		result.set(row.characterId, current);
	}

	return result;
}

async function ensureTags(names: string[]) {
	if (!names.length) return [];

	await db.insert(tag).values(names.map((name) => ({ name }))).onConflictDoNothing();
	return db.select().from(tag).where(inArray(tag.name, names));
}

async function replaceTags(imageId: string, value: string): Promise<void> {
	const tags = await ensureTags(normalizeTags(value));
	await db.delete(referenceImageTag).where(eq(referenceImageTag.imageId, imageId));
	if (tags.length) {
		await db.insert(referenceImageTag).values(tags.map((row) => ({ imageId, tagId: row.id })));
	}
}

export async function createImage(input: {
	characterId: string;
	fileKey: string;
	description?: string | null;
	tags: string;
}): Promise<ImageRow> {
	const [row] = await db
		.insert(referenceImage)
		.values({
			characterId: input.characterId,
			fileKey: input.fileKey,
			description: input.description || null
		})
		.returning();
	try {
		await replaceTags(row.id, input.tags);
	} catch (error) {
		await db.delete(referenceImage).where(eq(referenceImage.id, row.id));
		throw error;
	}
	return row;
}

export async function updateImage(
	id: string,
	characterId: string,
	input: { description?: string | null; tags: string; variantOfId?: string | null }
): Promise<boolean> {
	let variantOfId: string | null = null;
	if (input.variantOfId) {
		const [target] = await db
			.select({ id: referenceImage.id, variantOfId: referenceImage.variantOfId })
			.from(referenceImage)
			.where(
				and(
					eq(referenceImage.id, input.variantOfId),
					eq(referenceImage.characterId, characterId)
				)
			)
			.limit(1);
		if (!target) return false;
		variantOfId = target.variantOfId ?? target.id;
		if (variantOfId === id) return false;
	}

	if (variantOfId) {
		await db
			.update(referenceImage)
			.set({ variantOfId })
			.where(
				and(eq(referenceImage.variantOfId, id), eq(referenceImage.characterId, characterId))
			);
	}

	const rows = await db
		.update(referenceImage)
		.set({ description: input.description || null, variantOfId })
		.where(and(eq(referenceImage.id, id), eq(referenceImage.characterId, characterId)))
		.returning({ id: referenceImage.id, characterId: referenceImage.characterId });

	if (!rows[0]) return false;
	await replaceTags(id, input.tags);
	return true;
}

export async function removeImage(id: string, characterId: string): Promise<string | undefined> {
	const [row] = await db
		.delete(referenceImage)
		.where(and(eq(referenceImage.id, id), eq(referenceImage.characterId, characterId)))
		.returning({ fileKey: referenceImage.fileKey, characterId: referenceImage.characterId });
	return row?.fileKey;
}

export async function setCharacterCover(id: string, characterId: string): Promise<boolean> {
	const [image] = await db
		.select({ id: referenceImage.id })
		.from(referenceImage)
		.where(and(eq(referenceImage.id, id), eq(referenceImage.characterId, characterId)))
		.limit(1);
	if (!image) return false;

	await db
		.update(referenceImage)
		.set({ isCover: sql`${referenceImage.id} = ${id}` })
		.where(eq(referenceImage.characterId, characterId));
	return true;
}
