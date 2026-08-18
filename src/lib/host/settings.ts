import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { Locale } from '$lib/appState.svelte';

const FILE = 'settings.json';

export type AppSettings = {
	locale: Locale;
};

function isLocale(value: unknown): value is Locale {
	return value === 'de' || value === 'en';
}

export async function loadAppSettings(): Promise<AppSettings | null> {
	try {
		if (!(await exists(FILE, { baseDir: BaseDirectory.AppConfig }))) {
			return null;
		}
		const parsed: unknown = JSON.parse(await readTextFile(FILE, { baseDir: BaseDirectory.AppConfig }));
		if (typeof parsed !== 'object' || parsed === null || !isLocale((parsed as AppSettings).locale)) {
			return null;
		}
		return { locale: (parsed as AppSettings).locale };
	} catch {
		return null;
	}
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
	try {
		await mkdir('.', { baseDir: BaseDirectory.AppConfig, recursive: true });
		await writeTextFile(FILE, `${JSON.stringify(settings, null, 2)}\n`, {
			baseDir: BaseDirectory.AppConfig,
		});
	} catch {
		// Browser preview and missing app-config permission still keep localStorage.
	}
}
