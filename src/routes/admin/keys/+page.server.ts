import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '#lib/server/admin.ts';
import {
	characterIdsByKey,
	charactersExist,
	createAccessKey,
	deleteAccessKey,
	listAccessKeys,
	restoreAccessKey,
	revokeAccessKey,
	setAccessKeyCharacters
} from '#lib/server/access-keys.ts';
import { listCharacters } from '#lib/server/characters.ts';

export const load: PageServerLoad = async () => {
	const [keys, characters, selected] = await Promise.all([
		listAccessKeys(),
		listCharacters(),
		characterIdsByKey()
	]);

	return {
		keys: keys.map((key) => ({ ...key, characterIds: selected.get(key.id) ?? [] })),
		characters: characters.map(({ id, name }) => ({ id, name }))
	};
};

/** Checkbox groups arrive as repeated fields under the same name. */
function characterIds(form: FormData): string[] {
	return form.getAll('characterId').map(String);
}

export const actions: Actions = {
	create: async (event) => {
		await requireAdmin(event);

		const form = await event.request.formData();
		const label = String(form.get('label') ?? '').trim();
		const custom = String(form.get('password') ?? '').trim();
		const ids = characterIds(form);

		if (!label) return fail(400, { message: 'Say who this password is for.' });
		if (custom && custom.length < 8) {
			return fail(400, { message: 'A password you choose yourself needs at least 8 characters.' });
		}
		if (!(await charactersExist(ids))) return fail(400, { message: 'Unknown character selected.' });

		const created = await createAccessKey({ label, password: custom || undefined, characterIds: ids });

		// the only time the plaintext exists — the row stores a hash
		return { created: { label, password: created.password } };
	},

	setCharacters: async (event) => {
		await requireAdmin(event);

		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const ids = characterIds(form);

		if (!id) return fail(400, { message: 'Missing password.' });
		if (!(await charactersExist(ids))) return fail(400, { message: 'Unknown character selected.' });

		await setAccessKeyCharacters(id, ids);

		return { saved: id };
	},

	revoke: async (event) => {
		await requireAdmin(event);

		const form = await event.request.formData();
		await revokeAccessKey(String(form.get('id') ?? ''));

		return { ok: true };
	},

	restore: async (event) => {
		await requireAdmin(event);

		const form = await event.request.formData();
		await restoreAccessKey(String(form.get('id') ?? ''));

		return { ok: true };
	},

	delete: async (event) => {
		await requireAdmin(event);

		const form = await event.request.formData();
		await deleteAccessKey(String(form.get('id') ?? ''));

		return { ok: true };
	}
};
