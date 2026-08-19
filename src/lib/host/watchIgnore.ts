import { normalizePath } from '$lib/project/paths';
import { LEGACY_LOCK_DIR, LOCK_FILE_NAME } from './lockNames';

export function shouldIgnorePath(path: string): boolean {
	const normalized = normalizePath(path);
	if (normalized.endsWith(`/${LOCK_FILE_NAME}`)) {
		return true;
	}
	if (normalized.includes(`/${LEGACY_LOCK_DIR}/`) || normalized.includes('/unknown file.easy-writing/')) {
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
