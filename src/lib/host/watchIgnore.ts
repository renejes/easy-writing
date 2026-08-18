import { normalizePath } from '$lib/project/paths';

export function shouldIgnorePath(path: string): boolean {
	const normalized = normalizePath(path);
	if (normalized.includes('/.easy-writing/')) {
		return true;
	}
	if (normalized.endsWith('/.ds_store')) {
		return true;
	}
	if (normalized.endsWith('.ewtmp')) {
		return true;
	}
	return false;
}
