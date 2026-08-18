import { getCurrentWindow } from '@tauri-apps/api/window';

function isTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function installQuitFlush(flush: () => Promise<void>): Promise<() => void> {
	if (!isTauri()) {
		return () => {};
	}
	let closing = false;
	const current = getCurrentWindow();
	const unlisten = await current.onCloseRequested(async (event) => {
		if (closing) {
			return;
		}
		event.preventDefault();
		closing = true;
		try {
			await flush();
		} catch {
			// Close anyway; a crash snapshot may still recover the buffer.
		}
		await current.destroy();
	});
	return unlisten;
}
