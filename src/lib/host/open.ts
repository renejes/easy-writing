import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';

export async function openInDefaultApp(path: string): Promise<void> {
	await openPath(path);
}

export async function revealInFolder(path: string): Promise<void> {
	await revealItemInDir(path);
}
