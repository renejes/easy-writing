import { parse } from 'yaml';
import { isProjectLang } from '$lib/project/lang';
import type { ProjectLang } from '$lib/project/types';

export type Frontmatter = {
	title?: string;
	lang?: ProjectLang;
	raw: Record<string, unknown>;
};

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function splitRawFrontmatter(markdown: string): { fence: string; body: string } {
	const match = markdown.match(FENCE);
	if (!match) {
		return { fence: '', body: markdown };
	}
	return { fence: match[0], body: markdown.slice(match[0].length) };
}

export function splitFrontmatter(markdown: string): { matter: Frontmatter | null; body: string } {
	const match = markdown.match(FENCE);
	if (!match) {
		return { matter: null, body: markdown };
	}
	const parsed: unknown = parse(match[1]);
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return { matter: null, body: markdown.slice(match[0].length) };
	}
	const raw = parsed as Record<string, unknown>;
	const title = typeof raw.title === 'string' ? raw.title.trim() : undefined;
	const lang = isProjectLang(raw.lang) ? raw.lang : undefined;
	return {
		matter: { title: title && title.length > 0 ? title : undefined, lang, raw },
		body: markdown.slice(match[0].length),
	};
}
