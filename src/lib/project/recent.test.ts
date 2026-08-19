import { describe, expect, it } from 'vitest';
import { recentSubtitle, sameRecent, upsertRecent, withoutRecent } from './recent';
import type { RecentProject } from './types';

function entry(path: string, extras: Partial<RecentProject> = {}): RecentProject {
	return { path, name: 'Paper', openedAt: 1, ...extras };
}

describe('recent projects', () => {
	it('replaces a scoped folder that is the same URI with a new id', () => {
		const first = entry('scoped:aaa', { uri: 'file://dropbox/paper', location: 'paper' });
		const second = entry('scoped:bbb', { uri: 'file://dropbox/paper', location: 'paper', openedAt: 2 });
		expect(upsertRecent([first], second)).toEqual([second]);
	});

	it('collapses scoped duplicates that share a folder name', () => {
		const first = entry('scoped:aaa', { location: 'paper' });
		const second = entry('scoped:bbb', { location: 'paper', openedAt: 2 });
		expect(upsertRecent([first], second)).toEqual([second]);
	});

	it('keeps distinct folders', () => {
		const first = entry('scoped:aaa', { uri: 'file://a' });
		const second = entry('scoped:bbb', { uri: 'file://b' });
		expect(upsertRecent([first], second)).toEqual([second, first]);
	});

	it('hides scoped ids in the subtitle', () => {
		expect(recentSubtitle(entry('scoped:aaa', { location: 'Dropbox-Projekt' }))).toBe(
			'Dropbox-Projekt',
		);
		expect(recentSubtitle(entry('scoped:aaa'))).toBe('');
		expect(recentSubtitle(entry('/Users/me/book'))).toBe('/Users/me/book');
	});

	it('removes a recent project without touching the others', () => {
		const first = entry('scoped:aaa', { uri: 'file://a' });
		const second = entry('scoped:bbb', { uri: 'file://b' });
		expect(withoutRecent([first, second], first)).toEqual([second]);
	});

	it('treats matching paths as the same recent even without a URI', () => {
		expect(sameRecent(entry('/tmp/a'), entry('/tmp/a'))).toBe(true);
		expect(sameRecent(entry('/tmp/a'), entry('/tmp/b'))).toBe(false);
	});
});
