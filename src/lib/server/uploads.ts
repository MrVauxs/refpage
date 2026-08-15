import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { UPLOAD_DIR } from '$app/env/private';

/** Absolute path of the uploads volume. */
export const uploadDir = resolve(UPLOAD_DIR || 'uploads');

/** Roughly matches `BODY_SIZE_LIMIT=25M` in the container. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * SVG is deliberately absent — it can carry script, and these files are served
 * from the app's own origin.
 */
const EXTENSION_BY_TYPE = new Map([
	['image/png', '.png'],
	['image/jpeg', '.jpg'],
	['image/webp', '.webp'],
	['image/gif', '.gif'],
	['image/avif', '.avif']
]);

const TYPE_BY_EXTENSION = new Map([...EXTENSION_BY_TYPE].map(([type, ext]) => [ext, type]));

export class UploadError extends Error {}

/** Creates the uploads directory if the volume is mounted but still empty. */
export function ensureUploadDir(): void {
	mkdirSync(uploadDir, { recursive: true });
}

/** Content type to serve a stored file with, or `null` if it isn't an allowed image. */
export function contentTypeFor(name: string): string | null {
	return TYPE_BY_EXTENSION.get(extname(name).toLowerCase()) ?? null;
}

/**
 * Writes an uploaded image to the uploads volume and returns its key — the
 * name to store in the database and to build a `/uploads/<key>` URL from.
 */
export async function saveUpload(file: File): Promise<string> {
	const extension = EXTENSION_BY_TYPE.get(file.type);
	if (!extension) throw new UploadError(`unsupported image type: ${file.type || 'unknown'}`);
	if (file.size === 0) throw new UploadError('file is empty');
	if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('file is too large');

	const key = `${randomUUID()}${extension}`;

	ensureUploadDir();
	await writeFile(join(uploadDir, key), Buffer.from(await file.arrayBuffer()));

	return key;
}

/**
 * Resolves a key to an absolute path inside the uploads volume, or `null` if it
 * escapes the volume (`../`, absolute paths, symlink-ish tricks).
 */
export function resolveUpload(key: string): string | null {
	if (!key || key.includes('\0')) return null;

	const path = resolve(uploadDir, key);
	if (path !== uploadDir && !path.startsWith(uploadDir + sep)) return null;

	return path;
}

/** Removes a stored upload. Missing files are not an error. */
export async function deleteUpload(key: string): Promise<void> {
	const path = resolveUpload(key);
	if (!path) return;

	await unlink(path).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== 'ENOENT') throw error;
	});
}
