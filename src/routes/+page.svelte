<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';

	/** Where each door leads once it opens. */
	const GUEST_HOME = '/characters';
	const ADMIN_HOME = '/admin';

	/** Failures the OAuth handshake redirects back here as `?error=`. */
	const OAUTH_ERRORS: Record<string, string> = {
		EMAIL_NOT_ALLOWED: 'That account’s email address is not allowed here.'
	};

	const reduced = new MediaQuery('prefers-reduced-motion: reduce');
	const motion = $derived(reduced.current ? 0 : 180);

	let password = $state('');
	let email = $state('');
	let accountPassword = $state('');

	let showEmail = $state(false);
	let pending = $state<'password' | 'github' | 'email' | undefined>();
	let passwordError = $state('');
	let accountError = $state('');

	/** Set by the admin guard when it bounces an unauthenticated request. */
	let next = $state<string | null>(null);

	onMount(async () => {
		// this page is prerendered, so the query string is only readable here —
		// `url.searchParams` is off limits at build time
		const params = new URLSearchParams(location.search);

		next = params.get('next');

		const failure = params.get('error');
		if (failure) {
			accountError = OAUTH_ERRORS[failure] ?? 'Sign-in failed.';
			showEmail = true;
		}

		// a static page cannot check on the server who is asking, so anyone who
		// still has an account session or a live share password is moved along
		// on arrival rather than made to sign in again
		const { kind } = await fetch('/api/session').then((response) => response.json());

		if (kind === 'admin') await goto(next ?? ADMIN_HOME);
		else if (kind === 'guest') await goto(GUEST_HOME);
	});

	async function enterWithPassword(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;

		pending = 'password';
		passwordError = '';

		try {
			const response = await fetch('/api/access', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ password })
			});

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				passwordError = body.message ?? 'That password did not work.';
				return;
			}

			await goto(GUEST_HOME, { invalidateAll: true });
		} catch {
			passwordError = 'Could not reach the server. Try again.';
		} finally {
			pending = undefined;
		}
	}

	async function signInWithGithub() {
		if (pending) return;

		pending = 'github';
		accountError = '';

		const { error } = await authClient.signIn.social({
			provider: 'github',
			callbackURL: next ?? ADMIN_HOME,
			errorCallbackURL: '/'
		});

		// on success the browser is already on its way to GitHub
		if (error) {
			accountError = error.message ?? 'GitHub sign-in is not available.';
			pending = undefined;
		}
	}

	async function signInWithEmail(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;

		pending = 'email';
		accountError = '';

		const { error } = await authClient.signIn.email({ email, password: accountPassword });

		pending = undefined;

		if (error) {
			accountError = error.message ?? 'Those details did not match an account.';
			return;
		}

		await goto(next ?? ADMIN_HOME, { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>refpage</title>
	<meta name="description" content="A private reference library." />
</svelte:head>

<main class="grid min-h-dvh place-items-center px-6 py-16">
	<div class="entrance w-full max-w-88">
		<header class="mb-9">
			<h1 class="font-mono text-sm text-surface-950-50">refpage</h1>
			<p class="mt-2 text-sm text-pretty text-surface-600-400">
				A private reference library. Enter the password you were given.
			</p>
		</header>

		<form class="space-y-3" onsubmit={enterWithPassword}>
			<label class="label">
				<span class="label-text text-xs tracking-wide text-surface-600-400">Access password</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class="input text-base"
					type="password"
					name="access-password"
					autocomplete="current-password"
					autofocus
					spellcheck="false"
					placeholder="••••••••••••"
					aria-invalid={passwordError ? 'true' : undefined}
					bind:value={password}
				/>
			</label>

			{#if passwordError}
				<p class="text-sm text-error-600-400" role="alert">{passwordError}</p>
			{/if}

			<button
				class="btn preset-filled w-full transition-transform active:scale-[0.99] motion-reduce:transition-none"
				disabled={!password || pending !== undefined}
			>
				{pending === 'password' ? 'Checking…' : 'View references'}
			</button>
		</form>

		<div class="my-8 flex items-center gap-4" aria-hidden="true">
			<span class="h-px flex-1 bg-surface-200-800"></span>
			<span class="text-xs text-surface-600-400">or</span>
			<span class="h-px flex-1 bg-surface-200-800"></span>
		</div>

		<div class="space-y-3">
			<button
				class="btn preset-tonal w-full transition-transform active:scale-[0.99] motion-reduce:transition-none"
				disabled={pending !== undefined}
				onclick={signInWithGithub}
			>
				<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path
						d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
					/>
				</svg>
				{pending === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
			</button>

			{#if showEmail}
				<form
					class="space-y-3 pt-1"
					transition:slide={{ duration: motion, easing: cubicOut }}
					onsubmit={signInWithEmail}
				>
					<label class="label">
						<span class="label-text text-xs tracking-wide text-surface-600-400">Email</span>
						<input
							class="input text-base"
							type="email"
							name="email"
							autocomplete="username"
							bind:value={email}
						/>
					</label>
					<label class="label">
						<span class="label-text text-xs tracking-wide text-surface-600-400">Password</span>
						<input
							class="input text-base"
							type="password"
							name="password"
							autocomplete="current-password"
							bind:value={accountPassword}
						/>
					</label>
					<button
						class="btn preset-tonal w-full transition-transform active:scale-[0.99] motion-reduce:transition-none"
						disabled={!email || !accountPassword || pending !== undefined}
					>
						{pending === 'email' ? 'Signing in…' : 'Sign in'}
					</button>
				</form>
			{:else}
				<button
					class="w-full text-center text-xs text-surface-600-400 underline-offset-4 hover:text-surface-950-50 hover:underline"
					onclick={() => (showEmail = true)}
				>
					Sign in with email instead
				</button>
			{/if}

			{#if accountError}
				<p class="text-sm text-error-600-400" role="alert">{accountError}</p>
			{/if}
		</div>
	</div>
</main>

<style>
	.entrance {
		animation: entrance 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes entrance {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.entrance {
			animation: none;
		}
	}
</style>
