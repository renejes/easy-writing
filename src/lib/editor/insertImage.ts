import type { Editor } from '@tiptap/core';
import { appState } from '$lib/appState.svelte';
import { pickImageFile } from '$lib/host/dialogs';
import { formatHostError } from '$lib/host/error';
import { importImageBytes, importImagePath, isImageFile } from '$lib/host/assets';
import { t } from '$lib/i18n';
import { appDialog } from '$lib/ui/dialog.svelte';

export type ImageInsertKind = 'image' | 'figure';

async function promptMeta(kind: ImageInsertKind): Promise<{ alt: string; caption: string } | null> {
	const alt = await appDialog.ask(t('imageAltPrompt'));
	if (alt === null) {
		return null;
	}
	if (kind === 'image') {
		return { alt, caption: '' };
	}
	const caption = await appDialog.ask(t('figureCaptionPrompt'));
	if (caption === null) {
		return null;
	}
	return { alt, caption };
}

function insertNode(editor: Editor, kind: ImageInsertKind, src: string, alt: string, caption: string): void {
	switch (kind) {
		case 'image':
			editor.chain().focus().setImage({ src, alt }).run();
			return;
		case 'figure':
			editor.chain().focus().setFigure({ src, alt, caption }).run();
			return;
		default: {
			const _exhaustive: never = kind;
			return _exhaustive;
		}
	}
}

async function importAndInsert(
	editor: Editor,
	kind: ImageInsertKind,
	imported: { relativeSrc: string },
): Promise<void> {
	const meta = await promptMeta(kind);
	if (!meta) {
		return;
	}
	insertNode(editor, kind, imported.relativeSrc, meta.alt, meta.caption);
}

function requireProject(): { projectRoot: string; chapterPath: string } | null {
	const projectRoot = appState.projectRoot;
	const chapterPath = appState.filePath;
	if (!projectRoot || !chapterPath) {
		return null;
	}
	return { projectRoot, chapterPath };
}

function reportImageError(error: unknown): void {
	if (error instanceof Error && error.message === 'unsupported-image') {
		appState.lastError = t('imageUnsupported');
		return;
	}
	appState.lastError = formatHostError(error, t('imageFailed'));
}

export async function insertImageFromPicker(editor: Editor, kind: ImageInsertKind): Promise<void> {
	const project = requireProject();
	if (!project) {
		return;
	}
	const sourcePath = await pickImageFile();
	if (!sourcePath) {
		return;
	}
	try {
		const imported = await importImagePath({ ...project, sourcePath });
		await importAndInsert(editor, kind, imported);
	} catch (error) {
		reportImageError(error);
	}
}

export async function insertImageFromFile(
	editor: Editor,
	file: File,
	kind: ImageInsertKind = 'image',
): Promise<void> {
	const project = requireProject();
	if (!project) {
		return;
	}
	if (!isImageFile(file)) {
		appState.lastError = t('imageUnsupported');
		return;
	}
	try {
		const bytes = new Uint8Array(await file.arrayBuffer());
		const imported = await importImageBytes({
			...project,
			bytes,
			originalName: file.name || 'bild',
			mime: file.type,
		});
		await importAndInsert(editor, kind, imported);
	} catch (error) {
		reportImageError(error);
	}
}

export function firstImageFile(data: DataTransfer | null): File | null {
	if (!data) {
		return null;
	}
	for (const file of Array.from(data.files)) {
		if (isImageFile(file)) {
			return file;
		}
	}
	for (const item of Array.from(data.items)) {
		if (item.kind !== 'file' || !item.type.startsWith('image/')) {
			continue;
		}
		const file = item.getAsFile();
		if (file && isImageFile(file)) {
			return file;
		}
	}
	return null;
}

export function imageFilesFrom(data: DataTransfer | null): File[] {
	if (!data) {
		return [];
	}
	return Array.from(data.files).filter(isImageFile);
}
