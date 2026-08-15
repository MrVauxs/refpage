import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '#lib/server/admin.ts';

export const load: LayoutServerLoad = async (event) => {
	const user = await requireAdmin(event);

	return { admin: { name: user.name, email: user.email } };
};
