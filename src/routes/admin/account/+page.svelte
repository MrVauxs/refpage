<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let saving = $state(false);
</script>

<svelte:head><title>Your account · refpage</title></svelte:head>

<h1 class="text-xl">Your account</h1>
<p class="mt-1 text-sm text-surface-600-400">
	Signed in as {data.account.email}.
	{#if data.account.isAdmin}
		This account administers the site.
	{/if}
</p>

<section class="mt-8 max-w-96">
	<h2 class="text-sm text-surface-950-50">
		{data.account.hasPassword ? 'Change your password' : 'Set a password'}
	</h2>
	<p class="mt-1 text-sm text-surface-600-400">
		{#if data.account.hasPassword}
			Changing it signs you out everywhere else.
		{:else}
			This account signs in through GitHub only. Give it a password and email sign-in works too.
		{/if}
	</p>

	<form
		class="mt-4 space-y-3"
		method="post"
		action="?/password"
		use:enhance={() => {
			saving = true;

			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
	>
		<!-- password managers key off this even though the field is not shown -->
		<input type="hidden" name="email" value={data.account.email} autocomplete="username" />

		{#if data.account.hasPassword}
			<label class="label">
				<span class="label-text text-xs text-surface-600-400">Current password</span>
				<input
					class="input text-base"
					type="password"
					name="currentPassword"
					autocomplete="current-password"
					required
				/>
			</label>
		{/if}

		<label class="label">
			<span class="label-text text-xs text-surface-600-400">New password</span>
			<input
				class="input text-base"
				type="password"
				name="newPassword"
				autocomplete="new-password"
				minlength={data.minLength}
				required
			/>
		</label>

		<label class="label">
			<span class="label-text text-xs text-surface-600-400">New password again</span>
			<input
				class="input text-base"
				type="password"
				name="confirmPassword"
				autocomplete="new-password"
				minlength={data.minLength}
				required
			/>
		</label>

		<button class="btn preset-filled" disabled={saving}>
			{saving ? 'Saving…' : data.account.hasPassword ? 'Change password' : 'Set password'}
		</button>
	</form>

	{#if form?.message}
		<p class="mt-3 text-sm text-error-600-400" role="alert">{form.message}</p>
	{:else if form?.saved}
		<p class="mt-3 text-sm text-success-600-400" role="status">Password saved.</p>
	{/if}

	<p class="mt-3 text-xs text-surface-600-400">
		At least {data.minLength} characters. There is no password reset email here — if you lose it, ask
		the site administrator to set a new one.
	</p>
</section>
