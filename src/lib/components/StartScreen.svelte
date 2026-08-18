<script lang="ts">
	import { appState } from '$lib/appState.svelte';
	import { setLocale, t } from '$lib/i18n';
	import { newProjectUi } from '$lib/ui/newProject.svelte';

	let { onopen }: { onopen: (path?: string) => void } = $props();
</script>

<main class="start">
	<header>
		<p class="kicker">{t('appName')}</p>
		<h1>{t('tagline')}</h1>
	</header>

	<div class="actions">
		<button type="button" onclick={() => onopen()}>{t('openFolder')}</button>
		<button type="button" onclick={() => newProjectUi.show()}>{t('newProject')}</button>
	</div>

	{#if appState.lastError}
		<p class="error">{appState.lastError}</p>
	{/if}

	<section>
		<h2>{t('recent')}</h2>
		{#if appState.recent.length === 0}
			<p class="muted">{t('noRecent')}</p>
		{:else}
			<ul>
				{#each appState.recent as project (project.path)}
					<li>
						<button type="button" class="recent" onclick={() => onopen(project.path)}>
							<span>{project.name}</span>
							<span class="muted">{project.path}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<footer>
		<label>
			{t('language')}
			<select
				value={appState.locale}
				onchange={(event) => {
					const value = event.currentTarget.value;
					if (value === 'de' || value === 'en') {
						setLocale(value);
					}
				}}
			>
				<option value="de">{t('german')}</option>
				<option value="en">{t('english')}</option>
			</select>
		</label>
	</footer>
</main>

<style>
	.start {
		min-height: 100vh;
		max-width: 42rem;
		margin: 0 auto;
		padding: 12vh 1.5rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.kicker {
		margin: 0 0 0.4rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.8rem;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.2;
	}

	h2 {
		margin: 0 0 0.8rem;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.actions {
		display: flex;
		gap: 0.6rem;
	}

	.error {
		margin: 0;
		border: 1px solid var(--line);
		padding: 0.6rem 0.8rem;
	}

	.muted {
		color: var(--muted);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.recent {
		width: 100%;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		border-color: var(--hairline);
	}

	.recent span:last-child {
		font-size: 0.75rem;
		word-break: break-all;
	}

	footer {
		margin-top: auto;
	}

	select {
		margin-left: 0.5rem;
	}
</style>
