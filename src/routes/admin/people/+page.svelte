<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '#lib/format.ts';

	let { data, form } = $props();

	let copied = $state(false);
	let openAccount = $state<string | undefined>();

	async function copyPassword(password: string) {
		try {
			await navigator.clipboard.writeText(password);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	function confirmUninvite(entry: string) {
		return (event: SubmitEvent) => {
			if (!confirm(`Remove ${entry}? Nobody new can sign up with it after this.`)) {
				event.preventDefault();
			}
		};
	}
</script>

<svelte:head><title>People · refpage</title></svelte:head>

<h1 class="text-xl">People</h1>
<p class="mt-1 text-sm text-surface-600-400">
	An address has to be on this list before it can create an account. Anyone here can sign in and
	manage characters; only the addresses set in the environment can open this page.
</p>

{#if form?.reset}
	{@const reset = form.reset}
	<div class="card preset-tonal-success mt-6 p-5">
		<p class="text-sm font-medium">New password for {reset.email}</p>
		<p class="mt-1 text-xs opacity-80">
			Copy it now — only a hash is stored, so this is the last time it can be read. They were signed
			out of every device.
		</p>

		<div class="mt-4 flex flex-wrap items-center gap-3">
			<code
				class="flex h-10 items-center rounded-base border border-surface-300-700 bg-surface-50-950/60 px-3 font-mono text-base tracking-wider select-all"
			>
				{reset.password}
			</code>
			<button
				class="btn h-10 preset-filled"
				type="button"
				onclick={() => copyPassword(reset.password)}
			>
				{copied ? 'Copied' : 'Copy'}
			</button>
		</div>
	</div>
{/if}

<section class="mt-8">
	<h2 class="text-sm text-surface-950-50">Allowed addresses</h2>

	<form class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end" method="post" action="?/invite" use:enhance>
		<label class="label sm:w-72">
			<span class="label-text text-xs text-surface-600-400">Address or domain</span>
			<input
				class="input h-10 text-base"
				name="entry"
				placeholder="ada@example.com"
				autocomplete="off"
				spellcheck="false"
				value={form?.entry ?? ''}
				required
			/>
		</label>

		<label class="label flex-1">
			<span class="label-text text-xs text-surface-600-400">
				Note <span class="opacity-60">(optional)</span>
			</span>
			<input class="input h-10 text-base" name="note" value={form?.note ?? ''} />
		</label>

		<button class="btn h-10 shrink-0 preset-filled">Allow</button>
	</form>

	<p class="mt-2 text-xs text-surface-600-400">
		A leading <code class="font-mono">@</code> allows a whole domain, e.g.
		<code class="font-mono">@example.com</code>. They sign up themselves from the front page with
		GitHub or an email and password.
	</p>

	{#if form?.message}
		<p class="mt-3 text-sm text-error-600-400" role="alert">{form.message}</p>
	{:else if form?.invited}
		<p class="mt-3 text-sm text-success-600-400" role="status">{form.invited} can sign up now.</p>
	{/if}

	<ul class="mt-6 divide-y divide-surface-200-800 border-y border-surface-200-800">
		{#each data.root as entry (entry)}
			<li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
				<span class="font-mono text-sm text-surface-950-50">{entry}</span>
				<span class="badge preset-tonal text-xs">administrator</span>
				<span class="ml-auto text-xs text-surface-600-400">from the environment</span>
			</li>
		{/each}

		{#each data.entries as row (row.id)}
			<li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
				<span class="font-mono text-sm text-surface-950-50">{row.entry}</span>
				{#if row.note}
					<span class="text-xs text-surface-600-400">{row.note}</span>
				{/if}
				<span class="ml-auto text-xs text-surface-600-400">added {formatDate(row.createdAt)}</span>

				<form method="post" action="?/uninvite" onsubmit={confirmUninvite(row.entry)}>
					<input type="hidden" name="id" value={row.id} />
					<button class="btn btn-sm preset-tonal-error">Remove</button>
				</form>
			</li>
		{/each}

		{#if !data.root.length && !data.entries.length}
			<li class="py-3 text-sm text-error-600-400">
				The list is empty, so anyone at all can create an account and administer this site. Set
				<code class="font-mono">ALLOWED_EMAILS</code> and redeploy.
			</li>
		{/if}
	</ul>
</section>

<section class="mt-12">
	<h2 class="text-sm text-surface-950-50">Accounts</h2>
	<p class="mt-1 text-sm text-surface-600-400">
		There is no password reset email here. When someone is locked out, set a new password and tell
		them what it is.
	</p>

	{#if data.accounts.length}
		<ul class="mt-4 divide-y divide-surface-200-800 border-y border-surface-200-800">
			{#each data.accounts as account (account.id)}
				<li class="py-4">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
						<span class="text-sm text-surface-950-50">{account.email}</span>

						{#if account.isAdmin}
							<span class="badge preset-tonal text-xs">administrator</span>
						{/if}
						{#if !account.hasPassword}
							<span class="badge preset-tonal-warning text-xs">GitHub only</span>
						{/if}

						<span class="text-xs text-surface-600-400">
							{account.name} · joined {formatDate(account.createdAt)}
						</span>

						<div class="ml-auto">
							{#if account.id === data.self}
								<a href="/admin/account" class="btn btn-sm preset-tonal no-underline">
									Your account
								</a>
							{:else}
								<button
									class="btn btn-sm preset-tonal"
									type="button"
									aria-expanded={openAccount === account.id}
									onclick={() =>
										(openAccount = openAccount === account.id ? undefined : account.id)}
								>
									Set password
								</button>
							{/if}
						</div>
					</div>

					{#if openAccount === account.id}
						<form
							class="mt-4 flex flex-col gap-3 rounded-container border border-surface-200-800 p-4 sm:flex-row sm:items-end"
							method="post"
							action="?/setPassword"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
									openAccount = undefined;
								};
							}}
						>
							<input type="hidden" name="userId" value={account.id} />

							<label class="label flex-1">
								<span class="label-text text-xs text-surface-600-400">
									New password
									<span class="opacity-60">
										(optional — one is generated if you leave this blank)
									</span>
								</span>
								<input
									class="input h-10 font-mono text-base"
									name="password"
									autocomplete="off"
									spellcheck="false"
									minlength={data.minLength}
								/>
							</label>

							<button class="btn h-10 shrink-0 preset-filled">
								Set password for {account.email}
							</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p
			class="mt-4 rounded-container border border-dashed border-surface-200-800 p-8 text-center text-sm text-surface-600-400"
		>
			Nobody has signed up yet.
		</p>
	{/if}
</section>
