import { basename, dirname, join } from '@tauri-apps/api/path';
import {
	exists,
	mkdir,
	readDir,
	readFile,
	readTextFile,
	remove,
	rename,
	stat,
	writeFile,
	writeTextFile,
	type DirEntry,
	type FileInfo,
} from '@tauri-apps/plugin-fs';
import { splitRelative } from '$lib/project/paths';
import { markOwnWrite } from './ownWrites';

export async function readText(path: string): Promise<string> {
	return readTextFile(path);
}

export async function writeText(path: string, content: string): Promise<void> {
	const dir = await dirname(path);
	const name = await basename(path);
	const tmp = await join(dir, `${name}.ewtmp`);
	markOwnWrite(tmp);
	markOwnWrite(path);
	try {
		await writeTextFile(tmp, content);
		try {
			await rename(tmp, path);
		} catch {
			if (await exists(path)) {
				markOwnWrite(path);
				await remove(path);
			}
			markOwnWrite(path);
			await rename(tmp, path);
		}
	} catch (error) {
		try {
			if (await exists(tmp)) {
				await remove(tmp);
			}
		} catch {
			// Prefer the original write error.
		}
		throw error;
	}
}

export async function readMarkdownFile(path: string): Promise<string> {
	return readText(path);
}

export async function writeMarkdownFile(path: string, content: string): Promise<void> {
	await writeText(path, content);
}

export async function fileNameOf(path: string): Promise<string> {
	return basename(path);
}

export async function dirNameOf(path: string): Promise<string> {
	return dirname(path);
}

export async function joinPath(...parts: string[]): Promise<string> {
	return join(...parts);
}

export async function resolveProjectPath(root: string, relativePath: string): Promise<string> {
	const parts = splitRelative(relativePath);
	if (parts.length === 0) {
		return root;
	}
	return join(root, ...parts);
}

export async function pathExists(path: string): Promise<boolean> {
	return exists(path);
}

export async function pathStat(path: string): Promise<FileInfo> {
	return stat(path);
}

export async function makeDir(path: string): Promise<void> {
	await mkdir(path, { recursive: true });
}

export async function listDir(path: string): Promise<DirEntry[]> {
	return readDir(path);
}

export async function renamePath(from: string, to: string): Promise<void> {
	markOwnWrite(from);
	markOwnWrite(to);
	await rename(from, to);
}

export async function removePath(path: string): Promise<void> {
	markOwnWrite(path);
	await remove(path);
}

export async function readBytes(path: string): Promise<Uint8Array> {
	return readFile(path);
}

export async function writeBytes(path: string, data: Uint8Array): Promise<void> {
	markOwnWrite(path);
	await writeFile(path, data);
}
