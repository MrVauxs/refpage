import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { accessKeyCharacter, referenceImage } from '#lib/server/db/schema.ts';
import { contentTypeFor, resolveUpload } from '#lib/server/uploads.ts';

export const prerender = false;

/**
 * Serves files from the uploads volume, which lives outside `static/` so that
 * it survives redeploys.
 *
 * Admins may read every image. Password holders may only read files attached
 * to characters their key unlocks.
 */
export const GET: RequestHandler = async ({ locals, params, request }) => {
	const path = resolveUpload(params.path);
	if (!path) error(404, 'Not found');

	const type = contentTypeFor(path);
	if (!type) error(404, 'Not found');

	if (!locals.user) {
		if (!locals.guest) error(404, 'Not found');
		const [allowed] = await db
			.select({ id: referenceImage.id })
			.from(referenceImage)
			.innerJoin(
				accessKeyCharacter,
				and(
					eq(accessKeyCharacter.characterId, referenceImage.characterId),
					eq(accessKeyCharacter.accessKeyId, locals.guest.keyId)
				)
			)
			.where(eq(referenceImage.fileKey, params.path))
			.limit(1);
		if (!allowed) error(404, 'Not found');
	}

	const stats = await stat(path).catch(() => null);
	if (!stats?.isFile()) error(404, 'Not found');

	const etag = `"${stats.size.toString(16)}-${stats.mtimeMs.toString(16)}"`;

	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers: { etag } });
	}

	// filenames are content-addressed by UUID, so a given URL never changes
	const headers = {
		'content-type': type,
		'content-length': String(stats.size),
		'cache-control': 'private, max-age=0, must-revalidate',
		'x-content-type-options': 'nosniff',
		etag
	};

	if (request.method === 'HEAD') return new Response(null, { headers });

	const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
	return new Response(stream, { headers });
};

export const HEAD: RequestHandler = GET;
