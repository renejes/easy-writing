import { normalizePath } from '$lib/project/paths';

const WINDOW_MS = 2500;
const stamps = new Map<string, number>();

export function markOwnWrite(path: string): void {
	stamps.set(normalizePath(path), Date.now());
}

export function isOwnWrite(path: string): boolean {
	const stamp = stamps.get(normalizePath(path));
	if (stamp === undefined) {
		return false;
	}
	return Date.now() - stamp < WINDOW_MS;
}
