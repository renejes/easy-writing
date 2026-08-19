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
import {
	exists as scopedExists,
	getFolderInfo,
	mkdir as scopedMkdir,
	readDir as scopedReadDir,
	readFile as scopedReadFile,
	readTextFile as scopedReadTextFile,
	removeDir as scopedRemoveDir,
	removeFile as scopedRemoveFile,
	rename as scopedRename,
	stat as scopedStat,
	writeFile as scopedWriteFile,
	writeTextFile as scopedWriteTextFile,
} from 'tauri-plugin-scoped-storage-api';
import { splitRelative } from '$lib/project/paths';
import { markOwnWrite } from './ownWrites';
import {
	isScopedPath,
	joinScoped,
	parseScopedPath,
	scopedDirName,
	scopedFileName,
} from './scopedPath';

function asFileInfo(isFile: boolean, isDirectory: boolean, size = 0): FileInfo {
	return {
		isFile,
		isDirectory,
		isSymlink: false,
		size,
		mtime: null,
		atime: null,
		birthtime: null,
		readonly: false,
		fileAttributes: null,
		dev: null,
		ino: null,
		mode: null,
		nlink: null,
		uid: null,
		gid: null,
		rdev: null,
		blksize: null,
		blocks: null,
	};
}

export async function readText(path: string): Promise<string> {
	const scoped = parseScopedPath(path);
	if (scoped) {
		return scopedReadTextFile(scoped.id, scoped.rel);
	}
	return readTextFile(path);
}

export async function writeText(path: string, content: string): Promise<void> {
	const scoped = parseScopedPath(path);
	if (scoped) {
		markOwnWrite(path);
		await scopedWriteTextFile(scoped.id, scoped.rel, content, { recursive: true });
		return;
	}
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
	if (isScopedPath(path)) {
		return scopedFileName(path);
	}
	return basename(path);
}

export async function dirNameOf(path: string): Promise<string> {
	if (isScopedPath(path)) {
		return scopedDirName(path);
	}
	return dirname(path);
}

export async function joinPath(...parts: string[]): Promise<string> {
	if (parts.length > 0 && isScopedPath(parts[0])) {
		return joinScoped(parts[0], ...parts.slice(1));
	}
	return join(...parts);
}

export async function resolveProjectPath(root: string, relativePath: string): Promise<string> {
	const parts = splitRelative(relativePath);
	if (parts.length === 0) {
		return root;
	}
	return joinPath(root, ...parts);
}

export async function pathExists(path: string): Promise<boolean> {
	const scoped = parseScopedPath(path);
	if (scoped) {
		if (scoped.rel.length === 0) {
			try {
				await getFolderInfo(scoped.id);
				return true;
			} catch {
				return false;
			}
		}
		return scopedExists(scoped.id, scoped.rel);
	}
	return exists(path);
}

export async function pathStat(path: string): Promise<FileInfo> {
	const scoped = parseScopedPath(path);
	if (scoped) {
		if (scoped.rel.length === 0) {
			return asFileInfo(false, true);
		}
		const info = await scopedStat(scoped.id, scoped.rel);
		return asFileInfo(info.isFile, info.isDir, info.size ?? 0);
	}
	return stat(path);
}

export async function makeDir(path: string): Promise<void> {
	const scoped = parseScopedPath(path);
	if (scoped) {
		if (scoped.rel.length === 0) {
			return;
		}
		await scopedMkdir(scoped.id, scoped.rel, true);
		return;
	}
	await mkdir(path, { recursive: true });
}

export async function listDir(path: string): Promise<DirEntry[]> {
	const scoped = parseScopedPath(path);
	if (scoped) {
		const entries = await scopedReadDir(scoped.id, scoped.rel.length > 0 ? scoped.rel : undefined);
		return entries.map((entry) => ({
			name: entry.name,
			isDirectory: entry.isDir,
			isFile: entry.isFile,
			isSymlink: false,
		}));
	}
	return readDir(path);
}

export async function renamePath(from: string, to: string): Promise<void> {
	markOwnWrite(from);
	markOwnWrite(to);
	const fromScoped = parseScopedPath(from);
	const toScoped = parseScopedPath(to);
	if (fromScoped && toScoped) {
		if (fromScoped.id !== toScoped.id) {
			throw new Error('Cannot rename across folders.');
		}
		await scopedRename(fromScoped.id, fromScoped.rel, toScoped.rel);
		return;
	}
	await rename(from, to);
}

export async function removePath(path: string): Promise<void> {
	markOwnWrite(path);
	const scoped = parseScopedPath(path);
	if (scoped) {
		const info = await scopedStat(scoped.id, scoped.rel);
		if (info.isDir) {
			await scopedRemoveDir(scoped.id, scoped.rel, true);
			return;
		}
		await scopedRemoveFile(scoped.id, scoped.rel);
		return;
	}
	await remove(path);
}

export async function readBytes(path: string): Promise<Uint8Array> {
	const scoped = parseScopedPath(path);
	if (scoped) {
		return scopedReadFile(scoped.id, scoped.rel);
	}
	return readFile(path);
}

export async function writeBytes(path: string, data: Uint8Array): Promise<void> {
	markOwnWrite(path);
	const scoped = parseScopedPath(path);
	if (scoped) {
		await scopedWriteFile(scoped.id, scoped.rel, data, { recursive: true });
		return;
	}
	await writeFile(path, data);
}
