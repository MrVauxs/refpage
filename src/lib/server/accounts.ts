import { asc, eq, sql } from 'drizzle-orm';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { account, session, user } from '#lib/server/db/schema.ts';
import { isAdminEmail } from '#lib/server/allowed-emails.ts';

/** Better Auth's own floor. Kept here so the forms can say it out loud. */
export const MIN_PASSWORD_LENGTH = 8;

export type AccountRow = {
	id: string;
	name: string;
	email: string;
	createdAt: Date;
	/** False for an account that only ever signed in through GitHub. */
	hasPassword: boolean;
	isAdmin: boolean;
};

export async function listAccounts(): Promise<AccountRow[]> {
	const rows = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			createdAt: user.createdAt,
			passwords: sql<number>`sum(case when ${account.providerId} = 'credential' and ${account.password} is not null then 1 else 0 end)`
		})
		.from(user)
		.leftJoin(account, eq(account.userId, user.id))
		.groupBy(user.id)
		.orderBy(asc(user.email));

	return rows.map(({ passwords, ...row }) => ({
		...row,
		hasPassword: passwords > 0,
		isAdmin: isAdminEmail(row.email)
	}));
}

/** Whether this account can sign in with a password at all. */
export async function hasPassword(userId: string): Promise<boolean> {
	const context = await auth.$context;
	const accounts = await context.internalAdapter.findAccounts(userId);

	return accounts.some((row) => row.providerId === 'credential' && row.password);
}

export async function findAccountByEmail(email: string): Promise<{ id: string } | undefined> {
	const [row] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email.trim().toLowerCase()));

	return row;
}

/**
 * Sets someone else's password. There is no mail server here, so a forgotten
 * password is fixed by the admin typing a new one and passing it on out of
 * band; that is also why every session of theirs is dropped afterwards, so a
 * device that was left signed in cannot outlive the reset.
 *
 * Works for an account that has never had a password — a GitHub-only sign-in
 * gets a credential account created for it, so email sign-in starts working.
 */
export async function setAccountPassword(userId: string, password: string): Promise<void> {
	const context = await auth.$context;
	const hash = await context.password.hash(password);

	const accounts = await context.internalAdapter.findAccounts(userId);
	const credential = accounts.find((row) => row.providerId === 'credential');

	if (credential) {
		await context.internalAdapter.updatePassword(userId, hash);
	} else {
		await context.internalAdapter.linkAccount({
			userId,
			providerId: 'credential',
			accountId: userId,
			password: hash
		});
	}

	await db.delete(session).where(eq(session.userId, userId));
}
