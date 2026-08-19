import {
	joinPath,
	makeDir,
	pathExists,
	resolveProjectPath,
	writeText,
} from '$lib/host/files';
import { isEnglishLang } from './lang';
import { serializeManifest } from './manifest';
import { slugify } from './paths';
import type { ProjectLang, ProjectManifest, ProjectType } from './types';

export interface ScaffoldOptions {
	parentDir: string;
	title: string;
	type: ProjectType;
	lang: ProjectLang;
}

interface PaperChapter {
	file: string;
	heading: string;
}

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function paperChapters(lang: ProjectLang): PaperChapter[] {
	if (isEnglishLang(lang)) {
		return [
			{ file: '01-abstract.mdx', heading: 'Abstract' },
			{ file: '02-introduction.mdx', heading: 'Introduction' },
			{ file: '03-method.mdx', heading: 'Method' },
			{ file: '04-results.mdx', heading: 'Results' },
			{ file: '05-discussion.mdx', heading: 'Discussion' },
		];
	}
	return [
		{ file: '01-abstract.mdx', heading: 'Abstract' },
		{ file: '02-einleitung.mdx', heading: 'Einleitung' },
		{ file: '03-methode.mdx', heading: 'Methode' },
		{ file: '04-ergebnisse.mdx', heading: 'Ergebnisse' },
		{ file: '05-diskussion.mdx', heading: 'Diskussion' },
	];
}

function bibComment(lang: ProjectLang): string {
	if (isEnglishLang(lang)) {
		return `% BibTeX. An entry looks like this:
% @article{key2024,
%   author = {Name, Given},
%   title = {Title},
%   journal = {Journal},
%   year = {2024}
% }
`;
	}
	return `% BibTeX. Ein Eintrag sieht so aus:
% @article{key2024,
%   author = {Name, Vorname},
%   title = {Titel},
%   journal = {Journal},
%   year = {2024}
% }
`;
}

function starterBib(lang: ProjectLang): string {
	return `${bibComment(lang)}
@article{lim2010sleep,
  author = {Lim, Julian and Dinges, David F.},
  title = {A Meta-Analysis of the Impact of Short-Term Sleep Deprivation on Cognitive Variables},
  journal = {Psychological Bulletin},
  year = {2010}
}
`;
}

function blogIndex(title: string, lang: ProjectLang): string {
	return `---
title: "${title.replaceAll('"', '\\"')}"
date: ${todayIso()}
lang: ${lang}
---

`;
}

export async function uniqueProjectRoot(parentDir: string, title: string): Promise<string> {
	const base = slugify(title) === 'kapitel' ? 'projekt' : slugify(title);
	let slug = base;
	let n = 2;
	let root = await joinPath(parentDir, slug);
	while (await pathExists(root)) {
		slug = `${base}-${n}`;
		n += 1;
		root = await joinPath(parentDir, slug);
	}
	return root;
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<string> {
	const root = await uniqueProjectRoot(options.parentDir, options.title);
	await makeDir(root);
	await makeDir(await joinPath(root, 'assets'));

	const manifest: ProjectManifest = {
		schema: 1,
		type: options.type,
		title: options.title.trim(),
		lang: options.lang,
		chapters: [],
	};

	switch (options.type) {
		case 'blog': {
			manifest.chapters = ['index.mdx'];
			await writeText(await resolveProjectPath(root, 'index.mdx'), blogIndex(options.title, options.lang));
			break;
		}
		case 'paper': {
			await makeDir(await joinPath(root, 'chapters'));
			const chapters = paperChapters(options.lang);
			manifest.chapters = chapters.map((chapter) => `chapters/${chapter.file}`);
			manifest.citation = { bibliography: 'references.bib', csl: 'apa' };
			for (const chapter of chapters) {
				await writeText(
					await resolveProjectPath(root, `chapters/${chapter.file}`),
					`# ${chapter.heading}\n\n`,
				);
			}
			await writeText(await joinPath(root, 'references.bib'), starterBib(options.lang));
			break;
		}
		default: {
			const _exhaustive: never = options.type;
			return _exhaustive;
		}
	}

	await writeText(await joinPath(root, 'project.yaml'), serializeManifest(manifest));
	try {
		await writeText(await joinPath(root, '.gitignore'), 'easy-writing.lock.json\n.easy-writing/\n');
	} catch {
		// Hidden files can be blocked by the host; the project is still usable.
	}
	return root;
}

export function emptyChapterMarkdown(title: string): string {
	return `# ${title}\n\n`;
}
