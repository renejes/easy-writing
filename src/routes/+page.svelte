<script lang="ts">
	import { appState } from '$lib/appState.svelte';
	import EditorShell from '$lib/components/EditorShell.svelte';
	import StartScreen from '$lib/components/StartScreen.svelte';
	import { openExistingProject } from '$lib/session';

	async function openProject(path?: string): Promise<void> {
		await openExistingProject(path);
	}

	async function onKeydown(event: KeyboardEvent): Promise<void> {
		if (appState.projectRoot) {
			return;
		}
		const mod = event.metaKey || event.ctrlKey;
		if (!mod) {
			return;
		}
		if (event.key === 'o') {
			event.preventDefault();
			await openProject();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if appState.projectRoot}
	{#key `${appState.filePath}:${appState.contentEpoch}`}
		<EditorShell initialContent={appState.chapterContent} />
	{/key}
{:else}
	<StartScreen onopen={openProject} />
{/if}
