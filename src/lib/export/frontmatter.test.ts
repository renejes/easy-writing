import { describe, expect, it } from 'vitest';
import { splitFrontmatter, splitRawFrontmatter } from './frontmatter';

describe('frontmatter passthrough', () => {
	it('keeps unknown keys in the raw fence', () => {
		const source = `---
title: "Schlaf"
tags:
  - a
draft: true
customKey: bleibt
---

Body
`;
		const raw = splitRawFrontmatter(source);
		expect(raw.fence).toContain('customKey: bleibt');
		expect(raw.body.trim()).toBe('Body');
		const parsed = splitFrontmatter(source);
		expect(parsed.matter?.raw.customKey).toBe('bleibt');
		expect(parsed.matter?.raw.draft).toBe(true);
	});
});
