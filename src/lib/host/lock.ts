import { joinPath, makeDir, pathExists, readText, removePath, writeText } from './files';

const MACHINE_ID_KEY = 'easy-writing.machineId';
const LOCK_DIR = '.easy-writing';
const LOCK_FILE = 'lock.json';
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
	const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
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
	return joinPath(root, LOCK_DIR, LOCK_FILE);
}

export async function readLock(root: string): Promise<ProjectLock | null> {
	const path = await lockPath(root);
	if (!(await pathExists(path))) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(await readText(path));
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

export async function writeLock(root: string): Promise<ProjectLock> {
	const dir = await joinPath(root, LOCK_DIR);
	await makeDir(dir);
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
	const path = await lockPath(root);
	if (await pathExists(path)) {
		await removePath(path);
	}
}
