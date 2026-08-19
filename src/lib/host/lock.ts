import { joinPath, pathExists, readText, removePath, writeText } from './files';
import { LEGACY_LOCK_DIR, LOCK_FILE_NAME } from './lockNames';

const MACHINE_ID_KEY = 'easy-writing.machineId';
const LEGACY_LOCK_FILE = 'lock.json';
export const LOCK_STALE_MS = 2 * 60 * 1000;
export const LOCK_HEARTBEAT_MS = 30 * 1000;

export interface ProjectLock {
	user: string;
	machine: string;
	machineId: string;
	timestamp: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getMachineId(): string {
	if (typeof localStorage === 'undefined') {
		return 'unknown';
	}
	const stored = localStorage.getItem(MACHINE_ID_KEY);
	if (stored) {
		return stored;
	}
	const created = crypto.randomUUID();
	localStorage.setItem(MACHINE_ID_KEY, created);
	return created;
}

export function machineLabel(): string {
	if (typeof navigator === 'undefined') {
		return 'Computer';
	}
	const ua = navigator.userAgent;
	const iPad =
		/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	if (iPad) {
		return 'iPad';
	}
	if (ua.includes('Mac')) {
		return 'Mac';
	}
	if (ua.includes('Windows')) {
		return 'Windows';
	}
	if (ua.includes('Linux')) {
		return 'Linux';
	}
	return 'Computer';
}

export function isLockStale(lock: ProjectLock, now = Date.now()): boolean {
	return now - lock.timestamp > LOCK_STALE_MS;
}

export function isOurLock(lock: ProjectLock): boolean {
	return lock.machineId === getMachineId();
}

export async function lockPath(root: string): Promise<string> {
	return joinPath(root, LOCK_FILE_NAME);
}

async function legacyLockPath(root: string): Promise<string> {
	return joinPath(root, LEGACY_LOCK_DIR, LEGACY_LOCK_FILE);
}

function parseLock(raw: string): ProjectLock | null {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) {
			return null;
		}
		if (
			typeof parsed.user !== 'string' ||
			typeof parsed.machine !== 'string' ||
			typeof parsed.machineId !== 'string' ||
			typeof parsed.timestamp !== 'number'
		) {
			return null;
		}
		return {
			user: parsed.user,
			machine: parsed.machine,
			machineId: parsed.machineId,
			timestamp: parsed.timestamp,
		};
	} catch {
		return null;
	}
}

async function readLockFile(path: string): Promise<ProjectLock | null> {
	if (!(await pathExists(path))) {
		return null;
	}
	try {
		return parseLock(await readText(path));
	} catch {
		return null;
	}
}

export async function readLock(root: string): Promise<ProjectLock | null> {
	return (await readLockFile(await lockPath(root))) ?? (await readLockFile(await legacyLockPath(root)));
}

export async function writeLock(root: string): Promise<ProjectLock> {
	const lock: ProjectLock = {
		user: 'lokal',
		machine: machineLabel(),
		machineId: getMachineId(),
		timestamp: Date.now(),
	};
	await writeText(await lockPath(root), `${JSON.stringify(lock, null, 2)}\n`);
	return lock;
}

export async function releaseLock(root: string): Promise<void> {
	const current = await readLock(root);
	if (!current || !isOurLock(current)) {
		return;
	}
	for (const path of [await lockPath(root), await legacyLockPath(root)]) {
		if (await pathExists(path)) {
			await removePath(path);
		}
	}
}
