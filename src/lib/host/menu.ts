import { CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { appState } from '$lib/appState.svelte';
import { t, setLocale } from '$lib/i18n';
import { DOCUMENT_LANGS, spellLangOf } from '$lib/project/lang';
import type { SpellLang } from '$lib/project/types';
import { newProjectUi } from '$lib/ui/newProject.svelte';
import {
	closeOpenProject,
	exportCurrentProject,
	openExistingProject,
	setDocumentLang,
} from '$lib/session';

let generation = 0;

function isTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

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

export async function installAppMenu(): Promise<void> {
	if (!isTauri()) {
		return;
	}
	const gen = (generation += 1);
	try {
	const hasProject = Boolean(appState.projectRoot);
	const documentLang = appState.manifest ? spellLangOf(appState.manifest.lang) : null;

	const appMenu = await Submenu.new({
		text: t('appName'),
		items: [
			await PredefinedMenuItem.new({
				item: { About: { name: t('appName') } },
				text: t('about'),
			}),
			await PredefinedMenuItem.new({ item: 'Separator' }),
			await PredefinedMenuItem.new({ item: 'Hide', text: t('hideApp') }),
			await PredefinedMenuItem.new({ item: 'HideOthers' }),
			await PredefinedMenuItem.new({ item: 'ShowAll' }),
			await PredefinedMenuItem.new({ item: 'Separator' }),
			await PredefinedMenuItem.new({ item: 'Quit', text: t('quit') }),
		],
	});

	const fileMenu = await Submenu.new({
		text: t('menuFile'),
		items: [
			await MenuItem.new({
				id: 'new-project',
				text: t('newProject'),
				accelerator: 'CmdOrCtrl+N',
				action: () => {
					newProjectUi.show();
				},
			}),
			await MenuItem.new({
				id: 'open-project',
				text: t('openFolder'),
				accelerator: 'CmdOrCtrl+O',
				action: () => {
					void openExistingProject();
				},
			}),
			await MenuItem.new({
				id: 'export-project',
				text: t('export'),
				accelerator: 'CmdOrCtrl+E',
				enabled: hasProject,
				action: () => {
					void exportCurrentProject();
				},
			}),
			await PredefinedMenuItem.new({ item: 'Separator' }),
			await MenuItem.new({
				id: 'close-project',
				text: t('closeProject'),
				enabled: hasProject,
				action: () => {
					void closeOpenProject();
				},
			}),
		],
	});

	const editMenu = await Submenu.new({
		text: t('menuEdit'),
		items: [
			await PredefinedMenuItem.new({ item: 'Undo' }),
			await PredefinedMenuItem.new({ item: 'Redo' }),
			await PredefinedMenuItem.new({ item: 'Separator' }),
			await PredefinedMenuItem.new({ item: 'Cut' }),
			await PredefinedMenuItem.new({ item: 'Copy' }),
			await PredefinedMenuItem.new({ item: 'Paste' }),
			await PredefinedMenuItem.new({ item: 'SelectAll' }),
		],
	});

	const languageItems = [
		await CheckMenuItem.new({
			id: 'ui-de',
			text: `${t('uiLanguage')}: ${t('german')}`,
			checked: appState.locale === 'de',
			action: () => {
				setLocale('de');
			},
		}),
		await CheckMenuItem.new({
			id: 'ui-en',
			text: `${t('uiLanguage')}: ${t('english')}`,
			checked: appState.locale === 'en',
			action: () => {
				setLocale('en');
			},
		}),
		await PredefinedMenuItem.new({ item: 'Separator' }),
		...DOCUMENT_LANGS.map((lang) =>
			CheckMenuItem.new({
				id: `doc-${lang}`,
				text: `${t('documentLanguage')}: ${langLabel(lang)}`,
				checked: documentLang === lang,
				enabled: hasProject,
				action: () => {
					void setDocumentLang(lang);
				},
			}),
		),
	];
	const languageMenu = await Submenu.new({
		text: t('menuLanguage'),
		items: await Promise.all(languageItems),
	});

	const windowMenu = await Submenu.new({
		text: t('menuWindow'),
		items: [
			await PredefinedMenuItem.new({ item: 'Minimize' }),
			await PredefinedMenuItem.new({ item: 'Maximize' }),
			await PredefinedMenuItem.new({ item: 'Fullscreen' }),
		],
	});

	const menu = await Menu.new({
		items: [appMenu, fileMenu, editMenu, languageMenu, windowMenu],
	});
	if (gen !== generation) {
		return;
	}
	await menu.setAsAppMenu();
	} catch {
		// Preview without Tauri, or a stale rebuild, should not break writing.
	}
}
