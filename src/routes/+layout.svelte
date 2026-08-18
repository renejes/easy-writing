<script lang="ts">
	import '@fontsource/ibm-plex-mono/400.css';
	import '@fontsource/ibm-plex-mono/400-italic.css';
	import '@fontsource/ibm-plex-mono/700.css';
	import '@fontsource/ibm-plex-mono/700-italic.css';
	import '../app.css';
	import '$lib/editor/editor.css';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import ExportDialog from '$lib/components/ExportDialog.svelte';
	import NewProjectDialog from '$lib/components/NewProjectDialog.svelte';
	import { appState } from '$lib/appState.svelte';
	import { installAppMenu } from '$lib/host/menu';
	import { installQuitFlush } from '$lib/host/quit';
	import { loadAppSettings, saveAppSettings } from '$lib/host/settings';
	import { t } from '$lib/i18n';
	import { appDialog } from '$lib/ui/dialog.svelte';
	import { exportDialog } from '$lib/ui/exportDialog.svelte';
	import { newProjectUi } from '$lib/ui/newProject.svelte';
	import { onMount, type Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		let stopQuit: (() => void) | undefined;
		void (async () => {
			const settings = await loadAppSettings();
			if (settings) {
				appState.setLocale(settings.locale);
			} else {
				await saveAppSettings({ locale: appState.locale });
			}
			document.documentElement.lang = appState.locale === 'de' ? 'de' : 'en';
			document.documentElement.spellcheck = false;
			stopQuit = await installQuitFlush(() => appState.flushDocument());
		})();
		return () => {
			stopQuit?.();
		};
	});

	$effect(() => {
		const _menuKey = `${appState.locale}:${appState.projectRoot ?? ''}:${appState.manifest?.lang ?? ''}`;
		void _menuKey;
		document.documentElement.lang = appState.locale === 'de' ? 'de' : 'en';
		void installAppMenu();
	});

	function onKeydown(event: KeyboardEvent): void {
		const mod = event.metaKey || event.ctrlKey;
		if (!mod || event.key !== 'n') {
			return;
		}
		if (appDialog.current || exportDialog.open || newProjectUi.open) {
			return;
		}
		event.preventDefault();
		newProjectUi.show();
	}
</script>

<svelte:head>
	<title>{t('appName')}</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

{@render children()}
<AppDialog />
<ExportDialog />
<NewProjectDialog />
