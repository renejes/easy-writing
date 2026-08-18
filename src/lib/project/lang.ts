import type { Locale } from '$lib/appState.svelte';
import type { ProjectLang, SpellLang } from './types';

export function isProjectLang(value: unknown): value is ProjectLang {
	return value === 'de' || value === 'en' || value === 'en-US' || value === 'en-GB';
}

export function spellLangOf(lang: ProjectLang): SpellLang {
	switch (lang) {
		case 'de':
			return 'de';
		case 'en':
		case 'en-US':
			return 'en-US';
		case 'en-GB':
			return 'en-GB';
		default: {
			const _exhaustive: never = lang;
			return _exhaustive;
		}
	}
}

export function htmlLangOf(lang: ProjectLang): string {
	return spellLangOf(lang);
}

export function isEnglishLang(lang: ProjectLang): boolean {
	switch (lang) {
		case 'de':
			return false;
		case 'en':
		case 'en-US':
		case 'en-GB':
			return true;
		default: {
			const _exhaustive: never = lang;
			return _exhaustive;
		}
	}
}

export function projectLangFromLocale(locale: Locale): ProjectLang {
	return locale === 'de' ? 'de' : 'en-US';
}

export const DOCUMENT_LANGS: SpellLang[] = ['de', 'en-US', 'en-GB'];
