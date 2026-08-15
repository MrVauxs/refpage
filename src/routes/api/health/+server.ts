import { accessSync, constants } from 'node:fs';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { ensureUploadDir, uploadDir } from '#lib/server/uploads.ts';

export const prerender = false;

/**
 * Container health check. Checks the two things that can be broken by a missing
 * or misconfigured volume: the database file and the uploads directory.
 */
export const GET: RequestHandler = () => {
	const checks = {
		database: check(() => db.all(sql`select 1`)),
		uploads: check(() => {
			ensureUploadDir();
			accessSync(uploadDir, constants.W_OK);
		})
	};

	const healthy = Object.values(checks).every((result) => result === 'ok');

	return Response.json(
		{ status: healthy ? 'ok' : 'error', ...checks },
		{ status: healthy ? 200 : 503 }
	);
};

function check(probe: () => unknown): string {
	try {
		probe();
		return 'ok';
	} catch (error) {
		return error instanceof Error ? error.message : 'failed';
	}
}
