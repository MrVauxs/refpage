import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { contentTypeFor, resolveUpload } from '#lib/server/uploads.ts';

export const prerender = false;

/**
 * Serves files from the uploads volume, which lives outside `static/` so that
 * it survives redeploys.
 *
 * Keys are random UUIDs, so a URL is only guessable by someone who was given
 * it. Add an `if (!locals.user) error(401)` here if you'd rather require a
 * signed-in session for every image.
 */
export const GET: RequestHandler = async ({ params, request }) => {
	const path = resolveUpload(params.path);
	if (!path) error(404, 'Not found');

	const type = contentTypeFor(path);
	if (!type) error(404, 'Not found');

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
		'cache-control': 'public, max-age=31536000, immutable',
		'x-content-type-options': 'nosniff',
		etag
	};

	if (request.method === 'HEAD') return new Response(null, { headers });

	const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
	return new Response(stream, { headers });
};

export const HEAD: RequestHandler = GET;
