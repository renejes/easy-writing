import { describe, expect, it } from 'vitest';
import { isLockSidecarName } from './lockNames';

describe('isLockSidecarName', () => {
	it('recognizes the lock file and the old iOS/Dropbox folder name', () => {
		expect(isLockSidecarName('easy-writing.lock.json')).toBe(true);
		expect(isLockSidecarName('.easy-writing')).toBe(true);
		expect(isLockSidecarName('Unknown File.easy-writing')).toBe(true);
		expect(isLockSidecarName('index.mdx')).toBe(false);
	});
});
