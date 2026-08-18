import { open, save } from '@tauri-apps/plugin-dialog';
import { t } from '$lib/i18n';

const markdownFilters = [{ name: 'Markdown', extensions: ['mdx', 'md'] }];

function asSinglePath(selected: string | string[] | null): string | null {
	if (selected === null) {
		return null;
	}
	if (Array.isArray(selected)) {
		return selected[0] ?? null;
	}
	return selected;
}

export async function pickMarkdownFile(): Promise<string | null> {
	const selected = await open({
		multiple: false,
		directory: false,
		filters: markdownFilters,
	});
	return asSinglePath(selected);
}

export async function pickNewMarkdownPath(): Promise<string | null> {
	return save({
		filters: markdownFilters,
		defaultPath: t('untitled'),
	});
}

export async function pickDirectory(): Promise<string | null> {
	const selected = await open({
		multiple: false,
		directory: true,
		recursive: true,
	});
	return asSinglePath(selected);
}

const imageFilters = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }];

export async function pickImageFile(): Promise<string | null> {
	const selected = await open({
		multiple: false,
		directory: false,
		filters: imageFilters,
	});
	return asSinglePath(selected);
}

const bibFilters = [{ name: 'BibTeX', extensions: ['bib'] }];

export async function pickBibFile(): Promise<string | null> {
	const selected = await open({
		multiple: false,
		directory: false,
		filters: bibFilters,
	});
	return asSinglePath(selected);
}

export async function pickSavePath(options: {
	defaultPath: string;
	extensions: string[];
	name: string;
}): Promise<string | null> {
	return save({
		defaultPath: options.defaultPath,
		filters: [{ name: options.name, extensions: options.extensions }],
	});
}
