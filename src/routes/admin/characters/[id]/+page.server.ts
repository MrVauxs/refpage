import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '#lib/server/admin.ts';
import {
	deleteCharacter,
	getCharacter,
	keysForCharacter,
	updateCharacter
} from '#lib/server/characters.ts';

export const load: PageServerLoad = async (event) => {
	const row = await getCharacter(event.params.id);

	if (!row) error(404, 'No such character.');

	return { character: row, keys: await keysForCharacter(row.id) };
};

export const actions: Actions = {
	update: async (event) => {
		await requireUser(event);

		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const summary = String(form.get('summary') ?? '').trim();

		if (!name) return fail(400, { message: 'Give the character a name.' });

		await updateCharacter(event.params.id, { name, summary });

		return { saved: true };
	},

	delete: async (event) => {
		await requireUser(event);

		// the join rows go with it, so any password that only named this
		// character stops unlocking anything
		await deleteCharacter(event.params.id);

		redirect(303, '/admin/characters');
	}
};
