import type { ChapterRef, ProjectManifest, ProjectType, RecentProject } from '$lib/project/types';
import type { BibEntry } from '$lib/cite/parseBib';

const LOCALE_KEY = 'easy-writing.locale';
const RECENT_KEY = 'easy-writing.recent-projects';
const MAX_RECENT = 8;

export type Locale = 'de' | 'en';
export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

function isLocale(value: string | null): value is Locale {
	return value === 'de' || value === 'en';
}

function readStoredLocale(): Locale {
	if (typeof localStorage === 'undefined') {
		return 'de';
	}
	const stored = localStorage.getItem(LOCALE_KEY);
	return isLocale(stored) ? stored : 'de';
}

function readStoredRecent(): RecentProject[] {
	if (typeof localStorage === 'undefined') {
		return [];
	}
	try {
		const raw = localStorage.getItem(RECENT_KEY);
		if (!raw) {
			return [];
		}
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.filter((entry): entry is RecentProject => {
			return (
				typeof entry === 'object' &&
				entry !== null &&
				typeof (entry as RecentProject).path === 'string' &&
				typeof (entry as RecentProject).name === 'string' &&
				typeof (entry as RecentProject).openedAt === 'number'
			);
		});
	} catch {
		return [];
	}
}

class AppState {
	locale = $state<Locale>(readStoredLocale());
	projectRoot = $state<string | null>(null);
	projectTitle = $state<string | null>(null);
	projectType = $state<ProjectType | null>(null);
	manifest = $state<ProjectManifest | null>(null);
	chapters = $state<ChapterRef[]>([]);
	filePath = $state<string | null>(null);
	fileName = $state<string | null>(null);
	chapterContent = $state('');
	lastSavedContent = $state('');
	contentEpoch = $state(0);
	saveStatus = $state<SaveStatus>('saved');
	lastError = $state<string | null>(null);
	wordCount = $state(0);
	recent = $state<RecentProject[]>(readStoredRecent());
	conflict = $state(false);
	lockWarning = $state<string | null>(null);
	offerCreateManifest = $state(false);
	bibEntries = $state<BibEntry[]>([]);
	bibAbsolutePath = $state<string | null>(null);
	bibEpoch = $state(0);
	bibPanelOpen = $state(false);
	crashRecovered = $state(false);
	flushDocument: () => Promise<void> = async () => {};

	setLocale(locale: Locale): void {
		this.locale = locale;
		localStorage.setItem(LOCALE_KEY, locale);
	}

	openProject(input: {
		root: string;
		manifest: ProjectManifest;
		chapters: ChapterRef[];
		active: ChapterRef;
		content: string;
		diskContent?: string;
		offerCreateManifest: boolean;
		lockWarning: string | null;
		crashRecovered?: boolean;
	}): void {
		this.projectRoot = input.root;
		this.projectTitle = input.manifest.title;
		this.projectType = input.manifest.type;
		this.manifest = input.manifest;
		this.chapters = input.chapters;
		this.filePath = input.active.absolutePath;
		this.fileName = input.active.title;
		this.chapterContent = input.content;
		this.lastSavedContent = input.diskContent ?? input.content;
		this.contentEpoch += 1;
		this.saveStatus = input.crashRecovered ? 'dirty' : 'saved';
		this.lastError = null;
		this.conflict = false;
		this.lockWarning = input.lockWarning;
		this.offerCreateManifest = input.offerCreateManifest;
		this.crashRecovered = Boolean(input.crashRecovered);
		this.wordCount = 0;
		this.bibEntries = [];
		this.bibAbsolutePath = null;
		this.bibPanelOpen = false;
		this.remember(input.root, input.manifest.title);
	}

	setActiveChapter(chapter: ChapterRef, content: string, options?: { diskContent?: string; crashRecovered?: boolean }): void {
		this.filePath = chapter.absolutePath;
		this.fileName = chapter.title;
		this.chapterContent = content;
		this.lastSavedContent = options?.diskContent ?? content;
		this.contentEpoch += 1;
		this.saveStatus = options?.crashRecovered ? 'dirty' : 'saved';
		this.lastError = null;
		this.conflict = false;
		this.crashRecovered = Boolean(options?.crashRecovered);
	}

	setChapters(chapters: ChapterRef[], manifest: ProjectManifest): void {
		this.chapters = chapters;
		this.manifest = manifest;
		this.projectTitle = manifest.title;
		this.projectType = manifest.type;
	}

	setBibliography(entries: BibEntry[], absolutePath: string | null): void {
		this.bibEntries = entries;
		this.bibAbsolutePath = absolutePath;
		this.bibEpoch += 1;
	}

	reloadActiveContent(content: string): void {
		this.chapterContent = content;
		this.lastSavedContent = content;
		this.saveStatus = 'saved';
		this.conflict = false;
		this.lastError = null;
		this.crashRecovered = false;
		this.contentEpoch += 1;
	}

	closeProject(): void {
		this.projectRoot = null;
		this.projectTitle = null;
		this.projectType = null;
		this.manifest = null;
		this.chapters = [];
		this.filePath = null;
		this.fileName = null;
		this.chapterContent = '';
		this.lastSavedContent = '';
		this.saveStatus = 'saved';
		this.lastError = null;
		this.wordCount = 0;
		this.conflict = false;
		this.lockWarning = null;
		this.offerCreateManifest = false;
		this.flushDocument = async () => {};
		this.bibEntries = [];
		this.bibAbsolutePath = null;
		this.bibPanelOpen = false;
		this.crashRecovered = false;
	}

	remember(path: string, name: string): void {
		const next: RecentProject[] = [
			{ path, name, openedAt: Date.now() },
			...this.recent.filter((entry) => entry.path !== path),
		].slice(0, MAX_RECENT);
		this.recent = next;
		localStorage.setItem(RECENT_KEY, JSON.stringify(next));
	}
}

export const appState = new AppState();
