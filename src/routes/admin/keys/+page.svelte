<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate, formatRelative } from '#lib/format.ts';

	let { data, form } = $props();

	let copied = $state(false);
	let openKey = $state<string | undefined>();

	async function copyPassword(password: string) {
		try {
			await navigator.clipboard.writeText(password);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	function confirmDelete(label: string) {
		return (event: SubmitEvent) => {
			if (!confirm(`Delete the password for ${label}? Whoever has it loses access immediately.`)) {
				event.preventDefault();
			}
		};
	}
</script>

<svelte:head><title>Access · refpage</title></svelte:head>

<h1 class="text-xl">Access</h1>
<p class="mt-1 text-sm text-surface-600-400">
	Each password is handed to one person or group and unlocks exactly the characters you tick. It
	grants no upload or edit rights.
</p>

{#if form?.created}
	{@const created = form.created}
	<div class="card preset-tonal-success mt-6 p-5">
		<p class="text-sm font-medium">Password for {created.label}</p>
		<p class="mt-1 text-xs opacity-80">
			Copy it now — only a hash is stored, so this is the last time it can be read.
		</p>

		<div class="mt-4 flex flex-wrap items-center gap-3">
			<code
				class="rounded-base border border-surface-300-700 bg-surface-50-950/60 px-3 py-2 font-mono text-base tracking-wider select-all"
			>
				{created.password}
			</code>
			<button
				class="btn btn-sm preset-filled"
				type="button"
				onclick={() => copyPassword(created.password)}
			>
				{copied ? 'Copied' : 'Copy'}
			</button>
		</div>
	</div>
{/if}

<form class="mt-8 max-w-lg space-y-4" method="post" action="?/create" use:enhance>
	<label class="label">
		<span class="label-text text-xs text-surface-600-400">Who is this for?</span>
		<input class="input text-base" name="label" placeholder="e.g. Commission — Ada" required />
	</label>

	<fieldset class="fieldset">
		<legend class="legend text-xs text-surface-600-400">Characters they may see</legend>

		{#if data.characters.length}
			<div class="mt-2 flex flex-wrap gap-x-5 gap-y-2">
				{#each data.characters as option (option.id)}
					<label class="flex items-center gap-2 text-sm">
						<input class="checkbox" type="checkbox" name="characterId" value={option.id} />
						{option.name}
					</label>
				{/each}
			</div>
		{:else}
			<p class="mt-2 text-sm text-surface-600-400">
				No characters yet. <a href="/admin/characters">Add one first</a>.
			</p>
		{/if}
	</fieldset>

	<label class="label">
		<span class="label-text text-xs text-surface-600-400">
			Password <span class="opacity-60">(optional — one is generated if you leave this blank)</span>
		</span>
		<input class="input font-mono text-base" name="password" autocomplete="off" spellcheck="false" />
	</label>

	<div class="flex items-center gap-3">
		<button class="btn preset-filled">Create password</button>
		{#if form?.message}
			<span class="text-sm text-error-600-400" role="alert">{form.message}</span>
		{/if}
	</div>
</form>

<section class="mt-12">
	<h2 class="text-sm text-surface-600-400">Issued passwords</h2>

	{#if data.keys.length}
		<ul class="mt-3 divide-y divide-surface-200-800 border-y border-surface-200-800">
			{#each data.keys as key (key.id)}
				<li class="py-4">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
						<span class="text-sm text-surface-950-50">{key.label}</span>

						{#if key.revokedAt}
							<span class="badge preset-tonal-error text-xs">revoked</span>
						{/if}

						<span class="text-xs text-surface-600-400">
							{key.characterCount}
							{key.characterCount === 1 ? 'character' : 'characters'}
							· created {formatDate(key.createdAt)}
							· used {formatRelative(key.lastUsedAt)}
						</span>

						<div class="ml-auto flex items-center gap-2">
							<button
								class="btn btn-sm preset-tonal"
								type="button"
								aria-expanded={openKey === key.id}
								onclick={() => (openKey = openKey === key.id ? undefined : key.id)}
							>
								Characters
							</button>

							{#if key.revokedAt}
								<form method="post" action="?/restore" use:enhance>
									<input type="hidden" name="id" value={key.id} />
									<button class="btn btn-sm preset-tonal">Restore</button>
								</form>
							{:else}
								<form method="post" action="?/revoke" use:enhance>
									<input type="hidden" name="id" value={key.id} />
									<button class="btn btn-sm preset-tonal">Revoke</button>
								</form>
							{/if}

							<form method="post" action="?/delete" onsubmit={confirmDelete(key.label)}>
								<input type="hidden" name="id" value={key.id} />
								<button class="btn btn-sm preset-tonal-error">Delete</button>
							</form>
						</div>
					</div>

					{#if openKey === key.id}
						<form
							class="mt-4 rounded-container border border-surface-200-800 p-4"
							method="post"
							action="?/setCharacters"
							use:enhance={() => {
								return async ({ update }) => {
									// keep the ticked boxes as submitted, then fold the panel away
									await update({ reset: false });
									openKey = undefined;
								};
							}}
						>
							<input type="hidden" name="id" value={key.id} />

							<div class="flex flex-wrap gap-x-5 gap-y-2">
								{#each data.characters as option (option.id)}
									<label class="flex items-center gap-2 text-sm">
										<input
											class="checkbox"
											type="checkbox"
											name="characterId"
											value={option.id}
											checked={key.characterIds.includes(option.id)}
										/>
										{option.name}
									</label>
								{/each}
							</div>

							<button class="btn btn-sm preset-filled mt-4">Save</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p
			class="mt-3 rounded-container border border-dashed border-surface-200-800 p-8 text-center text-sm text-surface-600-400"
		>
			No passwords issued yet.
		</p>
	{/if}
</section>
