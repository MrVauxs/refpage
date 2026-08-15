// Applies the committed drizzle migrations to the SQLite file before the server
// boots. Runs on plain node — no SvelteKit or drizzle-kit involved — so it works
// inside the production image, which only carries `dependencies`.
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const url = process.env.DATABASE_URL;

if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const file = resolve(url);
mkdirSync(dirname(file), { recursive: true });

const client = new Database(file);
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

try {
	migrate(drizzle(client), {
		migrationsFolder: resolve(import.meta.dirname, '..', 'drizzle')
	});
	console.log(`migrations applied to ${file}`);
} finally {
	client.close();
}
