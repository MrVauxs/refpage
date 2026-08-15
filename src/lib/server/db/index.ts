import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

function connect() {
	if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const file = resolve(DATABASE_URL);

	// in production the database lives on a mounted volume, which may be empty
	mkdirSync(dirname(file), { recursive: true });

	const client = new Database(file);

	// WAL keeps readers from blocking the writer; the busy timeout stops
	// concurrent requests from failing outright with SQLITE_BUSY
	client.pragma('journal_mode = WAL');
	client.pragma('synchronous = NORMAL');
	client.pragma('busy_timeout = 5000');
	client.pragma('foreign_keys = ON');

	// flush the WAL and release the file cleanly when the container stops
	process.on('sveltekit:shutdown', () => client.close());

	return drizzle(client, { schema });
}

type Db = ReturnType<typeof connect>;

let instance: Db | undefined;

/**
 * Connecting lazily keeps `bun run build` (and prerendering) from touching the
 * database, so the image can be built without a volume or `DATABASE_URL`.
 */
export const db: Db = new Proxy({} as Db, {
	get(_target, property) {
		instance ??= connect();
		const value = Reflect.get(instance, property);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});
