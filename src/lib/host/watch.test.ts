import { describe, expect, it } from 'vitest';
import { shouldIgnorePath } from './watchIgnore';

describe('shouldIgnorePath', () => {
	it('ignores atomic write temps and Finder noise', () => {
		expect(shouldIgnorePath('/proj/index.mdx.ewtmp')).toBe(true);
		expect(shouldIgnorePath('/proj/.DS_Store')).toBe(true);
		expect(shouldIgnorePath('/proj/.easy-writing/lock.json')).toBe(true);
		expect(shouldIgnorePath('/proj/easy-writing.lock.json')).toBe(true);
		expect(shouldIgnorePath('/proj/Unknown File.easy-writing/lock.json')).toBe(true);
		expect(shouldIgnorePath('/proj/index.mdx')).toBe(false);
	});
});
