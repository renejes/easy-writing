import { join, tempDir } from '@tauri-apps/api/path';
import { exists, mkdir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';

function crashName(filePath: string): string {
	let hash = 2166136261;
	for (let index = 0; index < filePath.length; index += 1) {
		hash ^= filePath.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return `ew-${(hash >>> 0).toString(16)}.mdx`;
}

async function crashPath(filePath: string): Promise<string> {
	const dir = await join(await tempDir(), 'easy-writing-crash');
	await mkdir(dir, { recursive: true });
	return join(dir, crashName(filePath));
}

export async function readCrashSnapshot(filePath: string): Promise<string | null> {
	const path = await crashPath(filePath);
	if (!(await exists(path))) {
		return null;
	}
	return readTextFile(path);
}

export async function writeCrashSnapshot(filePath: string, content: string): Promise<void> {
	const path = await crashPath(filePath);
	await writeTextFile(path, content);
}

export async function clearCrashSnapshot(filePath: string): Promise<void> {
	const path = await crashPath(filePath);
	if (await exists(path)) {
		await remove(path);
	}
}
