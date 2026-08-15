<script lang="ts">
	import { formatRelative } from '#lib/format.ts';

	let { data } = $props();

	const tiles = $derived([
		{ label: 'Characters', value: data.counts.characters, href: '/admin/characters' },
		{ label: 'Live passwords', value: data.counts.liveKeys, href: '/admin/keys' },
		{ label: 'Revoked', value: data.counts.revokedKeys, href: '/admin/keys' }
	]);
</script>

<svelte:head><title>Overview · refpage</title></svelte:head>

<h1 class="text-xl">Overview</h1>
<p class="mt-1 text-sm text-surface-600-400">
	Characters are what the site holds. A password is how someone else gets to see a few of them.
</p>

<div class="mt-8 grid gap-3 sm:grid-cols-3">
	{#each tiles as tile (tile.label)}
		<a
			href={tile.href}
			class="card preset-outlined-surface-200-800 p-5 no-underline transition-colors hover:border-surface-300-700"
		>
			<div class="text-3xl font-semibold tabular-nums text-surface-950-50">{tile.value}</div>
			<div class="mt-1 text-sm text-surface-600-400">{tile.label}</div>
		</a>
	{/each}
</div>

<section class="mt-10">
	<h2 class="text-sm text-surface-600-400">Recently used passwords</h2>

	{#if data.recentlyUsed.length}
		<ul class="mt-3 divide-y divide-surface-200-800 border-y border-surface-200-800">
			{#each data.recentlyUsed as key (key.id)}
				<li class="flex items-center justify-between gap-4 py-3">
					<span class="truncate text-sm text-surface-950-50">{key.label}</span>
					<span class="shrink-0 text-xs text-surface-600-400">
						{formatRelative(key.lastUsedAt)}
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-3 text-sm text-surface-600-400">
			No password has been used yet. Create one on the
			<a href="/admin/keys">Access</a> page and send it to someone.
		</p>
	{/if}
</section>
