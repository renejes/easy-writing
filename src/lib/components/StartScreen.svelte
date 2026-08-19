<script lang="ts">
	import { appState } from '$lib/appState.svelte';
	import { releaseScopedFolder } from '$lib/host/dialogs';
	import { setLocale, t } from '$lib/i18n';
	import { recentSubtitle } from '$lib/project/recent';
	import type { RecentProject } from '$lib/project/types';
	import { newProjectUi } from '$lib/ui/newProject.svelte';

	let { onopen }: { onopen: (path?: string) => void } = $props();

	async function forget(project: RecentProject, event: MouseEvent): Promise<void> {
		event.preventDefault();
		event.stopPropagation();
		appState.forgetRecent(project);
		await releaseScopedFolder(project.path);
	}
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
					{@const location = recentSubtitle(project)}
					<li>
						<button type="button" class="recent" onclick={() => onopen(project.path)}>
							<span>{project.name}</span>
							{#if location}
								<span class="muted">{location}</span>
							{/if}
						</button>
						<button
							type="button"
							class="forget"
							aria-label={t('removeRecent')}
							onclick={(event) => void forget(project, event)}
						>
							×
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
		height: var(--app-height, 100dvh);
		overflow: auto;
		max-width: 42rem;
		margin: 0 auto;
		padding: max(12vh, calc(env(safe-area-inset-top, 0px) + 2rem))
			max(1.5rem, env(safe-area-inset-right, 0px)) max(3rem, env(safe-area-inset-bottom, 0px))
			max(1.5rem, env(safe-area-inset-left, 0px));
		display: flex;
		flex-direction: column;
		gap: 2rem;
		transform: translateY(var(--app-offset, 0px));
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
		flex-wrap: wrap;
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

	li {
		display: flex;
		align-items: stretch;
		gap: 0.35rem;
	}

	.recent {
		flex: 1;
		min-width: 0;
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

	.forget {
		flex: 0 0 auto;
		min-width: 2.75rem;
		padding: 0 0.7rem;
		border-color: var(--hairline);
		color: var(--muted);
		line-height: 1;
		font-size: 1.2rem;
	}

	footer {
		margin-top: auto;
	}

	select {
		margin-left: 0.5rem;
	}
</style>
