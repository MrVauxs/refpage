<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';

	let { data, children } = $props();

	let signingOut = $state(false);

	// People hands out accounts and passwords, so it is the one page an
	// invited account cannot open — the server says no either way
	const links = $derived([
		{ href: '/admin', label: 'Overview' },
		{ href: '/admin/characters', label: 'Characters' },
		{ href: '/characters', label: 'Gallery' },
		{ href: '/admin/keys', label: 'Access' },
		...(data.admin.isAdmin ? [{ href: '/admin/people', label: 'People' }] : [])
	]);

	// `/admin` would otherwise light up on every child route
	function isActive(href: string): boolean {
		return href === '/admin' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	async function signOut() {
		signingOut = true;
		await authClient.signOut();
		await goto('/', { invalidateAll: true });
	}
</script>

<div class="min-h-dvh">
	<header
		class="sticky top-0 z-10 border-b border-surface-200-800 bg-surface-50-950/80 backdrop-blur"
	>
		<div class="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
			<a href="/admin" class="font-mono text-sm text-surface-950-50 no-underline">refpage</a>

			<nav class="flex items-center gap-5" aria-label="Admin">
				{#each links as link (link.href)}
					<a
						href={link.href}
						aria-current={isActive(link.href) ? 'page' : undefined}
						class="text-sm no-underline transition-colors {isActive(link.href)
							? 'text-surface-950-50'
							: 'text-surface-600-400 hover:text-surface-950-50'}"
					>
						{link.label}
					</a>
				{/each}
			</nav>

			<div class="ml-auto flex items-center gap-4">
				<a
					href="/admin/account"
					class="max-w-32 truncate text-xs text-surface-600-400 no-underline hover:text-surface-950-50 sm:max-w-none"
					aria-current={page.url.pathname === '/admin/account' ? 'page' : undefined}
				>
					{data.admin.email}
				</a>
				<button class="btn btn-sm preset-tonal" onclick={signOut} disabled={signingOut}>
					{signingOut ? 'Signing out…' : 'Sign out'}
				</button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-6 py-10">
		{@render children()}
	</main>
</div>
