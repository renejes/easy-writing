import { invoke } from '@tauri-apps/api/core';
import { pickDirectory, pickSavePath } from './dialogs';
import {
	dirNameOf,
	joinPath,
	listDir,
	makeDir,
	pathExists,
	readBytes,
	writeBytes,
	writeText,
} from './files';
import { isLockSidecarName } from './lockNames';

export async function htmlToPdf(html: string, dest: string): Promise<void> {
	await invoke('html_to_pdf', { html, dest });
}

export async function pickPdfPath(defaultPath: string): Promise<string | null> {
	return pickSavePath({ defaultPath, extensions: ['pdf'], name: 'PDF' });
}

export async function pickDocxPath(defaultPath: string): Promise<string | null> {
	return pickSavePath({ defaultPath, extensions: ['docx'], name: 'Word' });
}

export async function pickMdPath(defaultPath: string): Promise<string | null> {
	return pickSavePath({ defaultPath, extensions: ['md'], name: 'Markdown' });
}

export async function pickMdxPath(defaultPath: string): Promise<string | null> {
	return pickSavePath({ defaultPath, extensions: ['mdx'], name: 'MDX' });
}

export async function pickExportFolder(): Promise<string | null> {
	return pickDirectory();
}

export async function writeBinary(path: string, data: Uint8Array): Promise<void> {
	await writeBytes(path, data);
}

export async function writeUtf8(path: string, content: string): Promise<void> {
	await writeText(path, content);
}

export async function ensureDir(path: string): Promise<void> {
	await makeDir(path);
}

export async function uniqueDir(parent: string, name: string): Promise<string> {
	const dest = await joinPath(parent, name);
	if (!(await pathExists(dest))) {
		return dest;
	}
	let n = 2;
	while (await pathExists(await joinPath(parent, `${name}-${n}`))) {
		n += 1;
	}
	return joinPath(parent, `${name}-${n}`);
}

export async function copyBytes(from: string, to: string): Promise<void> {
	await writeBytes(to, await readBytes(from));
}

export async function loadImageBytes(path: string): Promise<Uint8Array> {
	return readBytes(path);
}

export async function ensureParent(path: string): Promise<void> {
	await makeDir(await dirNameOf(path));
}

export async function copyDir(from: string, to: string): Promise<void> {
	await makeDir(to);
	const entries = await listDir(from);
	for (const entry of entries) {
		if (entry.name === '.git' || isLockSidecarName(entry.name)) {
			continue;
		}
		const src = await joinPath(from, entry.name);
		const dest = await joinPath(to, entry.name);
		if (entry.isDirectory) {
			await copyDir(src, dest);
			continue;
		}
		await copyBytes(src, dest);
	}
}
