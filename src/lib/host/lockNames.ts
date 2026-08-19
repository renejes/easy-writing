export const LOCK_FILE_NAME = 'easy-writing.lock.json';
export const LEGACY_LOCK_DIR = '.easy-writing';

export function isLockSidecarName(name: string): boolean {
	const lower = name.toLowerCase();
	return lower === LOCK_FILE_NAME || lower === LEGACY_LOCK_DIR || lower.endsWith('.easy-writing');
}
