import { appState, type Locale } from '$lib/appState.svelte';
import { saveAppSettings } from '$lib/host/settings';
import { de, type MessageKey } from './de';
import { en } from './en';

const dictionaries: Record<Locale, Record<MessageKey, string>> = { de, en };

export type { Locale, MessageKey };

export function t(key: MessageKey, vars?: Record<string, string>): string {
	let text: string = dictionaries[appState.locale][key];
	if (!vars) {
		return text;
	}
	for (const [name, value] of Object.entries(vars)) {
		text = text.replaceAll(`{${name}}`, value);
	}
	return text;
}

export function setLocale(locale: Locale): void {
	appState.setLocale(locale);
	void saveAppSettings({ locale });
}
