import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * What the caller currently is, in one request. The front page is prerendered
 * and cannot ask this on the server, and the share-password cookie is httpOnly
 * so the browser cannot read it directly — this is how a returning visitor gets
 * moved along instead of being asked to sign in again.
 */
export const GET: RequestHandler = (event) => {
	return json({
		kind: event.locals.user ? 'admin' : event.locals.guest ? 'guest' : null
	});
};
