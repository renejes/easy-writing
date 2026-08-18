import { parentDir, relativeToRoot, resolveFrom } from '$lib/project/paths';
import type { ProjectLang } from '$lib/project/types';
import { convertFigures } from './figures';
import { splitExportFootnotes } from './footnotes';
import { splitFrontmatter } from './frontmatter';
import { collectMarkdownImageSrcs, isRemoteSrc, rewriteMarkdownImages } from './images';

export type FlattenChapter = {
	relativePath: string;
	absolutePath: string;
	markdown: string;
};

export type FlattenInput = {
	root: string;
	title: string;
	lang: ProjectLang;
	chapters: FlattenChapter[];
};

export type FlattenResult = {
	title: string;
	lang: ProjectLang;
	markdown: string;
	imageSrcs: string[];
};

function remapFootnotes(markdown: string, prefix: string): string {
	const split = splitExportFootnotes(markdown);
	if (split.defs.length === 0) {
		return markdown;
	}
	const body = split.body.replace(/\[\^([^\]]+)\]/g, (_all, id: string) => `[^${prefix}-${id}]`);
	const defs = split.defs.map((def) => `[^${prefix}-${def.id}]: ${def.text}`).join('\n\n');
	return `${body.trimEnd()}\n\n${defs}\n`;
}

function rewriteChapterImages(root: string, chapterPath: string, markdown: string): string {
	const fromDir = parentDir(chapterPath);
	return rewriteMarkdownImages(markdown, (alt, src) => {
		if (isRemoteSrc(src)) {
			return { alt, src };
		}
		const absolute = resolveFrom(fromDir, src);
		return { alt, src: relativeToRoot(root, absolute) || src };
	});
}

export function flattenProject(input: FlattenInput): FlattenResult {
	let title = input.title;
	let lang = input.lang;
	const bodies: string[] = [];
	for (const [index, chapter] of input.chapters.entries()) {
		const split = splitFrontmatter(chapter.markdown);
		if (index === 0) {
			if (split.matter?.title) {
				title = split.matter.title;
			}
			if (split.matter?.lang) {
				lang = split.matter.lang;
			}
		}
		const withFigures = convertFigures(split.body.trim());
		const remapped = remapFootnotes(withFigures, `c${index + 1}`);
		const rewritten = rewriteChapterImages(input.root, chapter.absolutePath, remapped).trim();
		if (rewritten.length > 0) {
			bodies.push(rewritten);
		}
	}
	const markdown = bodies.join('\n\n');
	return {
		title,
		lang,
		markdown: markdown.length > 0 ? `${markdown}\n` : '',
		imageSrcs: collectMarkdownImageSrcs(markdown),
	};
}
