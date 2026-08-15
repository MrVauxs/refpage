import type { LayoutServerLoad } from './$types';
import { requireUser } from '#lib/server/admin.ts';
import { isAdminEmail } from '#lib/server/allowed-emails.ts';

export const load: LayoutServerLoad = async (event) => {
	const user = await requireUser(event);

	return {
		admin: { name: user.name, email: user.email, isAdmin: isAdminEmail(user.email) }
	};
};
