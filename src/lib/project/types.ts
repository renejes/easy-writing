export type ProjectType = 'blog' | 'paper';
export type ProjectLang = 'de' | 'en' | 'en-US' | 'en-GB';
export type SpellLang = 'de' | 'en-US' | 'en-GB';

export interface CitationConfig {
	bibliography: string;
	csl: string;
}

export interface ProjectManifest {
	schema: 1;
	type: ProjectType;
	title: string;
	lang: ProjectLang;
	citation?: CitationConfig;
	chapters: string[];
}

export interface ChapterRef {
	relativePath: string;
	absolutePath: string;
	title: string;
}

export interface RecentProject {
	path: string;
	name: string;
	openedAt: number;
	uri?: string;
	location?: string;
}
