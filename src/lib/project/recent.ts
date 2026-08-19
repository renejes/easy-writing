import type { RecentProject } from './types';
import { isScopedPath, parseScopedPath } from '$lib/host/scopedPath';

export const MAX_RECENT = 8;

export function recentSubtitle(project: RecentProject): string {
	if (!isScopedPath(project.path)) {
		return project.path;
	}
	const parsed = parseScopedPath(project.path);
	if (!project.location || project.location === parsed?.id) {
		return '';
	}
	return project.location;
}

export function withoutRecent(list: RecentProject[], entry: RecentProject): RecentProject[] {
	return list.filter((existing) => !sameRecent(existing, entry));
}

export function upsertRecent(
	list: RecentProject[],
	entry: RecentProject,
	max = MAX_RECENT,
): RecentProject[] {
	return [entry, ...list.filter((existing) => !sameRecent(existing, entry))].slice(0, max);
}

export function sameRecent(left: RecentProject, right: RecentProject): boolean {
	if (left.path === right.path) {
		return true;
	}
	if (left.uri && right.uri && left.uri === right.uri) {
		return true;
	}
	if (
		isScopedPath(left.path) &&
		isScopedPath(right.path) &&
		left.location &&
		left.location === right.location &&
		left.location !== parseScopedPath(left.path)?.id
	) {
		return true;
	}
	return false;
}
