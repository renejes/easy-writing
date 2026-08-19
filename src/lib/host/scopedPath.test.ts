import { describe, expect, it } from 'vitest';
import {
	joinScoped,
	parseScopedPath,
	scopedDirName,
	scopedFileName,
	toScopedRoot,
} from './scopedPath';

describe('scopedPath', () => {
	it('parses a folder root and nested files', () => {
		expect(parseScopedPath('scoped:abc')).toEqual({ id: 'abc', rel: '' });
		expect(parseScopedPath('scoped:abc/chapters/01.mdx')).toEqual({
			id: 'abc',
			rel: 'chapters/01.mdx',
		});
		expect(parseScopedPath('/Users/me/proj')).toBeNull();
	});

	it('joins relative segments onto a scoped root', () => {
		expect(joinScoped('scoped:abc', 'chapters', '01.mdx')).toBe('scoped:abc/chapters/01.mdx');
		expect(joinScoped('scoped:abc/chapters', '01.mdx')).toBe('scoped:abc/chapters/01.mdx');
	});

	it('keeps the display name for the folder root', () => {
		const root = toScopedRoot('abc', 'Dropbox-Projekt', 'file://dropbox/abc');
		expect(root).toBe('scoped:abc');
		expect(scopedFileName(root)).toBe('Dropbox-Projekt');
		expect(scopedDirName('scoped:abc/index.mdx')).toBe('scoped:abc');
	});
});
