import { relations, sql } from 'drizzle-orm';
import {
	type AnySQLiteColumn,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text
} from 'drizzle-orm/sqlite-core';

/** Matches the `created_at` default Better Auth generated for its own tables. */
const timestampNow = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const character = sqliteTable('character', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	/** URL segment. Lowercase, unique, and what a share link is built from. */
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	summary: text('summary'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(timestampNow).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(timestampNow)
		.$onUpdate(() => new Date())
		.notNull()
});

/**
 * An address (`me@example.com`) or a whole domain (`@example.com`) that may
 * create an account. This is the half of the allowlist the admin edits from
 * inside the app; the other half lives in `ALLOWED_EMAILS` and only a redeploy
 * can change it. See `#lib/server/allowed-emails.ts`.
 */
export const allowedEmail = sqliteTable('allowed_email', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	/** Stored already trimmed and lowercased, so matching is a plain compare. */
	entry: text('entry').notNull().unique(),
	/** Free text for the admin's own benefit — who this was meant for. */
	note: text('note'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(timestampNow).notNull()
});

/**
 * A share password. Whoever types it gets read-only access to the characters
 * linked through {@link accessKeyCharacter} — no account, no upload rights.
 *
 * Two derivations of the password are stored because they answer different
 * questions. `lookup` is a plain HMAC, so a submitted password finds its row in
 * one indexed read instead of one slow hash comparison per key in the table.
 * `hash` is the slow one, and is what actually decides the match — an HMAC
 * alone would fall to an offline dictionary attack if the file leaked.
 */
export const accessKey = sqliteTable('access_key', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	/** Who this password was handed to. Shown in the admin list, never public. */
	label: text('label').notNull(),
	/** Stored openly because these are share links, not account credentials. */
	password: text('password').notNull(),
	lookup: text('lookup').notNull().unique(),
	hash: text('hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(timestampNow).notNull(),
	lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
	/** Set instead of deleting, so an existing link stops working but the audit trail stays. */
	revokedAt: integer('revoked_at', { mode: 'timestamp_ms' })
});

export const accessKeyCharacter = sqliteTable(
	'access_key_character',
	{
		accessKeyId: text('access_key_id')
			.notNull()
			.references(() => accessKey.id, { onDelete: 'cascade' }),
		characterId: text('character_id')
			.notNull()
			.references(() => character.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.accessKeyId, table.characterId] }),
		index('access_key_character_characterId_idx').on(table.characterId)
	]
);

export const referenceImage = sqliteTable(
	'reference_image',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		characterId: text('character_id')
			.notNull()
			.references(() => character.id, { onDelete: 'cascade' }),
		variantOfId: text('variant_of_id').references((): AnySQLiteColumn => referenceImage.id, {
			onDelete: 'set null'
		}),
		isCover: integer('is_cover', { mode: 'boolean' }).default(false).notNull(),
		fileKey: text('file_key').notNull().unique(),
		description: text('description'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(timestampNow).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(timestampNow)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('reference_image_characterId_idx').on(table.characterId),
		index('reference_image_variantOfId_idx').on(table.variantOfId)
	]
);

export const tag = sqliteTable('tag', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull().unique()
});

export const referenceImageTag = sqliteTable(
	'reference_image_tag',
	{
		imageId: text('image_id')
			.notNull()
			.references(() => referenceImage.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.imageId, table.tagId] }),
		index('reference_image_tag_tagId_idx').on(table.tagId)
	]
);

export const characterRelations = relations(character, ({ many }) => ({
	accessKeys: many(accessKeyCharacter),
	images: many(referenceImage)
}));

export const referenceImageRelations = relations(referenceImage, ({ one, many }) => ({
	character: one(character, {
		fields: [referenceImage.characterId],
		references: [character.id]
	}),
	variantOf: one(referenceImage, {
		fields: [referenceImage.variantOfId],
		references: [referenceImage.id],
		relationName: 'imageVariants'
	}),
	variants: many(referenceImage, { relationName: 'imageVariants' }),
	tags: many(referenceImageTag)
}));

export const tagRelations = relations(tag, ({ many }) => ({
	images: many(referenceImageTag)
}));

export const referenceImageTagRelations = relations(referenceImageTag, ({ one }) => ({
	image: one(referenceImage, {
		fields: [referenceImageTag.imageId],
		references: [referenceImage.id]
	}),
	tag: one(tag, {
		fields: [referenceImageTag.tagId],
		references: [tag.id]
	})
}));

export const accessKeyRelations = relations(accessKey, ({ many }) => ({
	characters: many(accessKeyCharacter)
}));

export const accessKeyCharacterRelations = relations(accessKeyCharacter, ({ one }) => ({
	accessKey: one(accessKey, {
		fields: [accessKeyCharacter.accessKeyId],
		references: [accessKey.id]
	}),
	character: one(character, {
		fields: [accessKeyCharacter.characterId],
		references: [character.id]
	})
}));

export * from './auth.schema';
