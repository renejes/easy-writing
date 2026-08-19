<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { appState } from '$lib/appState.svelte';
	import { CSL_IDS, cslLabelKey, isCslId } from '$lib/cite/csl';
	import { citeChipLabel } from '$lib/cite/label';
	import { entryTitle } from '$lib/cite/parseBib';
	import { insertCitationKey } from '$lib/editor/insertCite';
	import { t } from '$lib/i18n';
	import {
		assignBibliographyFile,
		loadBibliography,
		openBibliographyFile,
		revealBibliographyFile,
		setCslStyle,
	} from '$lib/session';

	let {
		editor,
		separated = false,
		expanded = $bindable(true),
	}: {
		editor: Editor | null;
		separated?: boolean;
		expanded?: boolean;
	} = $props();

	const cslValue = $derived(appState.manifest?.citation?.csl ?? 'apa');

	function onCslChange(event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (!isCslId(value)) {
			return;
		}
		void setCslStyle(value);
	}

	function insert(key: string): void {
		if (!editor) {
			return;
		}
		insertCitationKey(editor, key);
	}

	function toggle(): void {
		expanded = !expanded;
	}
</script>

<aside class={['sidebar', separated && 'separated', !expanded && 'is-collapsed']}>
	<div class="head">
		<button
			type="button"
			class="toggle"
			aria-expanded={expanded}
			aria-label={t('bibToggle')}
			onclick={toggle}
		>
			<span class="chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
			<span class="heading">{t('bibliography')}</span>
			<span class="count">{appState.bibEntries.length}</span>
		</button>
	</div>
	{#if expanded}
		<label>
			{t('cslStyle')}
			<select value={cslValue} onchange={onCslChange}>
				{#each CSL_IDS as id (id)}
					<option value={id}>{t(cslLabelKey(id))}</option>
				{/each}
			</select>
		</label>
		<div class="actions">
			<button type="button" onclick={() => void assignBibliographyFile()}>{t('bibAssign')}</button>
			<button type="button" disabled={!appState.bibAbsolutePath} onclick={() => void openBibliographyFile()}>
				{t('bibOpen')}
			</button>
			<button type="button" disabled={!appState.bibAbsolutePath} onclick={() => void revealBibliographyFile()}>
				{t('bibReveal')}
			</button>
			<button type="button" onclick={() => void loadBibliography()}>{t('bibReload')}</button>
		</div>
		{#if appState.bibEntries.length === 0}
			<p>{appState.bibAbsolutePath ? t('bibEmpty') : t('bibMissing')}</p>
		{:else}
			<ul>
				{#each appState.bibEntries as entry (entry.key)}
					<li>
						<button type="button" class="title" onclick={() => insert(entry.key)}>
							{citeChipLabel(entry, entry.key, '')}
						</button>
						<span class="meta">{entry.key}{entryTitle(entry) ? ` — ${entryTitle(entry)}` : ''}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</aside>

<style>
	.sidebar {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		overflow: auto;
		padding: 0.8rem 0.7rem 1.2rem;
		min-height: 0;
	}

	.sidebar.separated {
		border-top: 1px solid var(--line);
	}

	.sidebar.is-collapsed {
		overflow: hidden;
		padding-bottom: 0.8rem;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		border: 0;
		padding: 0;
		text-align: left;
	}

	.toggle:focus-visible {
		background: transparent;
		color: inherit;
	}

	@media (hover: hover) and (pointer: fine) {
		.toggle:hover {
			background: transparent;
			color: inherit;
		}
	}

	.chevron {
		font-size: 0.7rem;
		width: 0.8rem;
		flex: 0 0 auto;
	}

	.heading {
		flex: 1;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.count,
	p {
		margin: 0;
		font-size: 0.75rem;
		color: var(--muted);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.actions button {
		padding: 0.2rem 0.4rem;
		font-size: 0.7rem;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	li {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.35rem;
		border: 1px solid var(--hairline);
	}

	.title {
		text-align: left;
		border: 0;
		padding: 0.15rem 0.2rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		font-size: 0.7rem;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0 0.2rem;
	}
</style>
