import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findAccessKeyByPassword, startGuestSession } from '#lib/server/access.ts';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const password = url.searchParams.get('key')?.trim();
	if (!password) error(404, 'Not found');

	const key = await findAccessKeyByPassword(password);
	if (!key) error(404, 'Not found');

	startGuestSession(cookies, key.id);
	redirect(303, '/characters');
};
