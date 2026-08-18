<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { untrack } from 'svelte';
	import { appState } from '$lib/appState.svelte';
	import { setEditorAssetContext } from '$lib/editor/assetSrc';
	import { createMarkdownEditor } from '$lib/editor/createEditor';
	import { insertFootnote } from '$lib/editor/insertCite';
	import { refreshCitationNodes, serializeEditorMarkdown } from '$lib/editor/markdownRoundtrip';
	import { countWords, createDebouncedSaver } from '$lib/host/autosave';
	import { writeMarkdownFile } from '$lib/host/files';
	import { clearCrashSnapshot, writeCrashSnapshot } from '$lib/host/crashTemp';
	import { t } from '$lib/i18n';
	import {
		addChapter,
		closeOpenProject,
		deleteChapter,
		dismissLockWarning,
		dismissManifestOffer,
		keepLocalChanges,
		reloadFromDisk,
		renameChapter,
		reorderChapters,
		saveDiscoveredManifest,
		selectChapter,
		exportCurrentProject,
	} from '$lib/session';
	import { setSpellEditor } from '$lib/spell/menuState.svelte';
	import ChapterList from './ChapterList.svelte';
	import BibPanel from './BibPanel.svelte';
	import SpellMenu from './SpellMenu.svelte';
	import StatusBar from './StatusBar.svelte';
	import Toolbar from './Toolbar.svelte';

	let { initialContent }: { initialContent: string } = $props();

	let editor = $state.raw<Editor | null>(null);
	let tick = $state(0);
	let lastWritten = untrack(() => appState.lastSavedContent);
	let paintedBibEpoch = 0;
	let bibExpanded = $state(true);

	const showList = $derived.by(() => {
		switch (appState.projectType) {
			case 'paper':
				return true;
			case 'blog':
				return appState.chapters.length > 1;
			case null:
				return false;
			default: {
				const _exhaustive: never = appState.projectType;
				return _exhaustive;
			}
		}
	});

	const showSidebar = $derived(showList || appState.projectType === 'paper' || appState.bibPanelOpen);

	const listLabel = $derived.by(() => {
		switch (appState.projectType) {
			case 'paper':
				return t('chapters');
			case 'blog':
				return t('files');
			case null:
				return t('files');
			default: {
				const _exhaustive: never = appState.projectType;
				return _exhaustive;
			}
		}
	});

	async function persist(): Promise<void> {
		const instance = editor;
		const path = appState.filePath;
		if (!instance || !path || appState.conflict) {
			return;
		}
		const markdown = serializeEditorMarkdown(instance);
		if (markdown === lastWritten) {
			appState.saveStatus = 'saved';
			appState.lastSavedContent = markdown;
			appState.crashRecovered = false;
			await clearCrashSnapshot(path);
			return;
		}
		appState.saveStatus = 'saving';
		try {
			await writeMarkdownFile(path, markdown);
			lastWritten = markdown;
			appState.lastSavedContent = markdown;
			appState.saveStatus = 'saved';
			appState.lastError = null;
			appState.crashRecovered = false;
			await clearCrashSnapshot(path);
		} catch (error) {
			appState.saveStatus = 'error';
			appState.lastError = error instanceof Error ? error.message : t('saveFailed');
		}
	}

	const saver = createDebouncedSaver(5000, persist);
	const crashSaver = createDebouncedSaver(2000, async () => {
		const instance = editor;
		const path = appState.filePath;
		if (!instance || !path || appState.conflict) {
			return;
		}
		try {
			await writeCrashSnapshot(path, serializeEditorMarkdown(instance));
		} catch {
			// Crash snapshots are best-effort.
		}
	});

	function attachEditor(element: HTMLElement): () => void {
		if (appState.projectRoot && appState.filePath) {
			setEditorAssetContext({
				projectRoot: appState.projectRoot,
				chapterPath: appState.filePath,
			});
		}
		const instance = createMarkdownEditor({
			element,
			content: initialContent,
			placeholder: t('writePlaceholder'),
			onUpdate(next) {
				if (appState.conflict) {
					tick += 1;
					return;
				}
				appState.saveStatus = 'dirty';
				appState.wordCount = countWords(next.getText());
				saver.schedule();
				crashSaver.schedule();
			},
			onTransaction() {
				tick += 1;
			},
		});
		editor = instance;
		setSpellEditor(instance);
		paintedBibEpoch = appState.bibEpoch;
		appState.wordCount = countWords(instance.getText());
		appState.flushDocument = () => saver.flush();
		if (appState.crashRecovered) {
			appState.saveStatus = 'dirty';
			saver.schedule();
		}
		return () => {
			if (appState.saveStatus === 'dirty' && appState.filePath) {
				void writeCrashSnapshot(appState.filePath, serializeEditorMarkdown(instance));
			}
			saver.cancel();
			crashSaver.cancel();
			appState.flushDocument = async () => {};
			setEditorAssetContext(null);
			setSpellEditor(null);
			instance.destroy();
			editor = null;
		};
	}

	$effect(() => {
		const epoch = appState.bibEpoch;
		const instance = editor;
		if (!instance || epoch === 0 || epoch === paintedBibEpoch) {
			return;
		}
		paintedBibEpoch = epoch;
		untrack(() => {
			refreshCitationNodes(instance);
		});
	});

	async function goBack(): Promise<void> {
		await closeOpenProject();
	}

	async function onKeydown(event: KeyboardEvent): Promise<void> {
		const mod = event.metaKey || event.ctrlKey;
		if (!mod) {
			return;
		}
		if (event.key === 's') {
			event.preventDefault();
			await saver.flush();
			return;
		}
		if (event.key === 'e') {
			event.preventDefault();
			await exportCurrentProject();
			return;
		}
		if (event.shiftKey && event.code === 'KeyF') {
			event.preventDefault();
			if (editor) {
				await insertFootnote(editor);
			}
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />
<svelte:document
	onvisibilitychange={() => {
		if (document.visibilityState === 'hidden') {
			void saver.flush();
		}
	}}
/>

<div class={['shell', showSidebar && 'with-sidebar']}>
	<header>
		<button type="button" onclick={goBack}>{t('back')}</button>
		<p>{appState.projectTitle}</p>
		<button type="button" onclick={() => void exportCurrentProject()}>{t('export')}</button>
		{#if !showList}
			<button type="button" class="add" onclick={() => void addChapter()}>{t('addFile')}</button>
		{/if}
		{#if appState.projectType === 'blog'}
			<button type="button" onclick={() => (appState.bibPanelOpen = !appState.bibPanelOpen)}>
				{t('bibliography')}
			</button>
		{/if}
	</header>

	<div class="banners">
		{#if appState.lastError}
			<div class="banner">
				<span>{appState.lastError}</span>
				<button type="button" onclick={() => (appState.lastError = null)}>{t('dismiss')}</button>
			</div>
		{/if}
		{#if appState.lockWarning}
			<div class="banner">
				<span>{appState.lockWarning}</span>
				<button type="button" onclick={dismissLockWarning}>{t('dismiss')}</button>
			</div>
		{/if}
		{#if appState.offerCreateManifest}
			<div class="banner">
				<span>{t('offerManifest')}</span>
				<button type="button" onclick={() => void saveDiscoveredManifest()}>{t('saveManifest')}</button>
				<button type="button" onclick={dismissManifestOffer}>{t('notNow')}</button>
			</div>
		{/if}
		{#if appState.crashRecovered}
			<div class="banner">
				<span>{t('crashRecovered')}</span>
				<button type="button" onclick={() => (appState.crashRecovered = false)}>{t('dismiss')}</button>
			</div>
		{/if}
		{#if appState.conflict}
			<div class="banner">
				<span>{t('conflictMessage')}</span>
				<button type="button" onclick={() => void keepLocalChanges()}>{t('keepLocal')}</button>
				<button type="button" onclick={() => void reloadFromDisk()}>{t('reloadDisk')}</button>
			</div>
		{/if}
	</div>

	<div class="toolbar-slot">
		<Toolbar {editor} {tick} />
	</div>

	{#if showSidebar}
		<div class="sidebar-slot">
			<div class={['sidebar-stack', showList && 'has-chapters']}>
				{#if showList}
					<div class="chapters-pane">
						<ChapterList
							chapters={appState.chapters}
							activePath={appState.filePath}
							label={listLabel}
							onselect={(path) => void selectChapter(path)}
							onadd={() => void addChapter()}
							onrename={(path) => void renameChapter(path)}
							ondelete={(path) => void deleteChapter(path)}
							onreorder={(fromIndex, toIndex) => void reorderChapters(fromIndex, toIndex)}
						/>
					</div>
				{/if}
				<div class={['bib-pane', !bibExpanded && 'is-collapsed']}>
					<BibPanel {editor} separated={showList} bind:expanded={bibExpanded} />
				</div>
			</div>
		</div>
	{/if}

	<div class="canvas">
		<div class="page" {@attach attachEditor}></div>
	</div>

	<div class="status-slot">
		<StatusBar />
	</div>
</div>
<SpellMenu />

<style>
	.shell {
		min-height: 100vh;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: auto auto auto 1fr auto;
		grid-template-areas:
			'header'
			'banners'
			'toolbar'
			'canvas'
			'status';
	}

	.shell.with-sidebar {
		grid-template-columns: 16.5rem minmax(0, 1fr);
		grid-template-areas:
			'header header'
			'banners banners'
			'toolbar toolbar'
			'sidebar canvas'
			'status status';
	}

	header {
		grid-area: header;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 1.5rem;
		border-bottom: 1px solid var(--line);
	}

	header p {
		margin: 0;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	header button {
		padding: 0.3rem 0.7rem;
		font-size: 0.8rem;
	}

	.banners {
		grid-area: banners;
	}

	.banner {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		padding: 0.55rem 1.5rem;
		border-bottom: 1px solid var(--line);
		font-size: 0.85rem;
	}

	.banner button {
		padding: 0.25rem 0.55rem;
		font-size: 0.75rem;
	}

	.toolbar-slot {
		grid-area: toolbar;
	}

	.sidebar-slot {
		grid-area: sidebar;
		min-height: 0;
		overflow: hidden;
	}

	.sidebar-stack {
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--line);
	}

	.chapters-pane {
		flex: 1 1 55%;
		min-height: 0;
		overflow: hidden;
	}

	.bib-pane {
		flex: 1 1 45%;
		min-height: 0;
		overflow: hidden;
	}

	.bib-pane.is-collapsed {
		flex: 0 0 auto;
	}

	.sidebar-stack:not(.has-chapters) .bib-pane {
		flex: 1 1 auto;
	}

	.sidebar-stack:not(.has-chapters) .bib-pane.is-collapsed {
		flex: 0 0 auto;
	}

	.canvas {
		grid-area: canvas;
		overflow: auto;
		min-width: 0;
	}

	.page {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 2.5rem 1.5rem 4rem;
	}

	.status-slot {
		grid-area: status;
	}
</style>
