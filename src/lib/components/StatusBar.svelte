<script lang="ts">
	import { appState } from '$lib/appState.svelte';
	import { t } from '$lib/i18n';
	import { DOCUMENT_LANGS, spellLangOf } from '$lib/project/lang';
	import type { SpellLang } from '$lib/project/types';
	import { setDocumentLang } from '$lib/session';

	const statusLabel = $derived.by(() => {
		switch (appState.saveStatus) {
			case 'saved':
				return t('saved');
			case 'saving':
				return t('saving');
			case 'dirty':
				return t('unsaved');
			case 'error':
				return appState.lastError ?? t('saveError');
			default: {
				const _exhaustive: never = appState.saveStatus;
				return _exhaustive;
			}
		}
	});

	const documentLang = $derived(
		appState.manifest ? spellLangOf(appState.manifest.lang) : null,
	);

	function langLabel(lang: SpellLang): string {
		switch (lang) {
			case 'de':
				return t('langDe');
			case 'en-US':
				return t('langEnUs');
			case 'en-GB':
				return t('langEnGb');
			default: {
				const _exhaustive: never = lang;
				return _exhaustive;
			}
		}
	}

	function onDocumentLang(event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (value === 'de' || value === 'en-US' || value === 'en-GB') {
			void setDocumentLang(value);
		}
	}
</script>

<footer>
	<span>{statusLabel}</span>
	<span>{appState.fileName ?? appState.projectTitle ?? ''}</span>
	<div class="end">
		{#if documentLang}
			<select
				aria-label={t('documentLanguage')}
				spellcheck="false"
				value={documentLang}
				onchange={onDocumentLang}
			>
				{#each DOCUMENT_LANGS as lang (lang)}
					<option value={lang}>{langLabel(lang)}</option>
				{/each}
			</select>
		{/if}
		<span>{appState.wordCount} {t('words')}</span>
	</div>
</footer>

<style>
	footer {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
		padding: 0.55rem 1.5rem;
		border-top: 1px solid var(--line);
		font-size: 0.8rem;
		color: var(--muted);
	}

	footer span:nth-child(2) {
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--fg);
	}

	.end {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 0.8rem;
	}

	select {
		padding: 0.15rem 0.35rem;
		font-size: 0.8rem;
	}
</style>
