import type { PageServerLoad } from './$types';
import { listAccessKeys } from '#lib/server/access-keys.ts';
import { listCharacters } from '#lib/server/characters.ts';

export const load: PageServerLoad = async () => {
	const [characters, keys] = await Promise.all([listCharacters(), listAccessKeys()]);

	const live = keys.filter((key) => !key.revokedAt);

	return {
		counts: {
			characters: characters.length,
			liveKeys: live.length,
			revokedKeys: keys.length - live.length
		},
		// what got used most recently is the only signal the admin has that a
		// password is out in the world and still in use
		recentlyUsed: keys
			.filter((key) => key.lastUsedAt)
			.sort((a, b) => b.lastUsedAt!.getTime() - a.lastUsedAt!.getTime())
			.slice(0, 5)
	};
};
