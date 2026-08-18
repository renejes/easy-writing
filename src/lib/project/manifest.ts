import { parse, stringify } from 'yaml';
import { isProjectLang } from './lang';
import type { ProjectLang, ProjectManifest, ProjectType } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProjectType(value: unknown): value is ProjectType {
	return value === 'blog' || value === 'paper';
}

export function parseManifest(raw: string): ProjectManifest {
	const parsed: unknown = parse(raw);
	if (!isRecord(parsed)) {
		throw new Error('invalid-manifest');
	}
	if (!isProjectType(parsed.type)) {
		throw new Error('invalid-manifest');
	}
	if (typeof parsed.title !== 'string' || parsed.title.trim().length === 0) {
		throw new Error('invalid-manifest');
	}
	if (!Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
		throw new Error('invalid-manifest');
	}
	const chapters = parsed.chapters.filter((entry): entry is string => {
		return typeof entry === 'string' && entry.trim().length > 0;
	});
	if (chapters.length === 0) {
		throw new Error('invalid-manifest');
	}
	const lang: ProjectLang = isProjectLang(parsed.lang) ? parsed.lang : 'de';
	const manifest: ProjectManifest = {
		schema: 1,
		type: parsed.type,
		title: parsed.title.trim(),
		lang,
		chapters,
	};
	if (isRecord(parsed.citation)) {
		const bibliography =
			typeof parsed.citation.bibliography === 'string'
				? parsed.citation.bibliography
				: 'references.bib';
		const csl = typeof parsed.citation.csl === 'string' ? parsed.citation.csl : 'apa';
		manifest.citation = { bibliography, csl };
	}
	return manifest;
}

export function serializeManifest(manifest: ProjectManifest): string {
	const body: Record<string, unknown> = {
		schema: 1,
		type: manifest.type,
		title: manifest.title,
		lang: manifest.lang,
		chapters: manifest.chapters,
	};
	if (manifest.citation) {
		body.citation = {
			bibliography: manifest.citation.bibliography,
			csl: manifest.citation.csl,
		};
	}
	return stringify(body, { lineWidth: 0 });
}

export function inferredType(chapterPaths: string[]): ProjectType {
	return chapterPaths.some((path) => path.startsWith('chapters/') || path.startsWith('chapters\\'))
		? 'paper'
		: 'blog';
}
