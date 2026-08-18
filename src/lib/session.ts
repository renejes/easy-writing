import { appState } from '$lib/appState.svelte';
import { isCslId, type CslId } from '$lib/cite/csl';
import { parseBibTeX } from '$lib/cite/parseBib';
import { applyCitations } from '$lib/export/citations';
import { markdownToDocx } from '$lib/export/docx';
import { flattenProject } from '$lib/export/flatten';
import { buildPrintDocument } from '$lib/export/html';
import { extOf, rewriteMarkdownImages, toDataUrl } from '$lib/export/images';
import type { ExportChoice, ExportFormat } from '$lib/export/types';
import { openInDefaultApp, revealInFolder } from '$lib/host/open';
import {
	copyBytes,
	copyDir,
	ensureDir,
	ensureParent,
	htmlToPdf,
	loadImageBytes,
	pickDocxPath,
	pickExportFolder,
	pickMdPath,
	pickMdxPath,
	pickPdfPath,
	uniqueDir,
	writeBinary,
	writeUtf8,
} from '$lib/host/export';
import { pickBibFile, pickDirectory } from '$lib/host/dialogs';
import { formatHostError } from '$lib/host/error';
import {
	dirNameOf,
	fileNameOf,
	joinPath,
	makeDir,
	pathExists,
	pathStat,
	readMarkdownFile,
	readText,
	removePath,
	renamePath,
	resolveProjectPath,
	writeText,
} from '$lib/host/files';
import { clearCrashSnapshot, readCrashSnapshot } from '$lib/host/crashTemp';
import {
	isLockStale,
	isOurLock,
	LOCK_HEARTBEAT_MS,
	readLock,
	releaseLock,
	writeLock,
} from '$lib/host/lock';
import { watchDirectory, type ProjectFileChange } from '$lib/host/watch';
import { t } from '$lib/i18n';
import { discoverChapterPaths } from '$lib/project/discover';
import { inferredType, parseManifest, serializeManifest } from '$lib/project/manifest';
import { eventTouches, relativeToRoot, samePath, slugify, titleFromRelativePath } from '$lib/project/paths';
import { isEnglishLang, isProjectLang, projectLangFromLocale } from '$lib/project/lang';
import { emptyChapterMarkdown, scaffoldProject } from '$lib/project/scaffold';
import type { ChapterRef, ProjectLang, ProjectManifest, ProjectType } from '$lib/project/types';
import { applySpellContext, rememberSpellWord, resetSpellContext } from '$lib/spell/extension';
import { addProjectDictionaryWord, loadProjectDictionary } from '$lib/spell/projectDic';
import { appDialog } from '$lib/ui/dialog.svelte';
import { exportDialog } from '$lib/ui/exportDialog.svelte';

type UnwatchFn = () => void;

let unwatch: UnwatchFn | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let ownsLock = false;
let handlingWatch = false;

function fail(message: string): boolean {
	appState.lastError = message;
	return false;
}

async function loadChapterMarkdown(path: string): Promise<{ content: string; disk: string; recovered: boolean }> {
	const disk = await readMarkdownFile(path);
	try {
		const crash = await readCrashSnapshot(path);
		if (crash !== null && crash !== disk) {
			return { content: crash, disk, recovered: true };
		}
		if (crash === disk) {
			await clearCrashSnapshot(path);
		}
	} catch {
		// Temp dir is optional; the document on disk still opens.
	}
	return { content: disk, disk, recovered: false };
}

async function stopRuntime(): Promise<void> {
	if (unwatch) {
		unwatch();
		unwatch = null;
	}
	if (heartbeat !== null) {
		clearInterval(heartbeat);
		heartbeat = null;
	}
	const root = appState.projectRoot;
	if (root && ownsLock) {
		await releaseLock(root);
	}
	ownsLock = false;
}

async function startHeartbeat(root: string): Promise<void> {
	if (heartbeat !== null) {
		clearInterval(heartbeat);
	}
	heartbeat = setInterval(() => {
		void writeLock(root);
	}, LOCK_HEARTBEAT_MS);
}

async function startWatch(root: string): Promise<void> {
	if (unwatch) {
		unwatch();
	}
	unwatch = await watchDirectory(root, (change) => {
		void onFsChange(change);
	});
}

async function resolveChapters(root: string, relativePaths: string[]): Promise<ChapterRef[]> {
	const chapters: ChapterRef[] = [];
	for (const relativePath of relativePaths) {
		const absolutePath = await resolveProjectPath(root, relativePath);
		if (!(await pathExists(absolutePath))) {
			continue;
		}
		chapters.push({
			relativePath,
			absolutePath,
			title: titleFromRelativePath(relativePath),
		});
	}
	return chapters;
}

async function writeManifestToDisk(root: string, manifest: ProjectManifest): Promise<void> {
	await writeText(await joinPath(root, 'project.yaml'), serializeManifest(manifest));
}

function withUpdatedChapters(manifest: ProjectManifest, relativePaths: string[]): ProjectManifest {
	return { ...manifest, chapters: relativePaths };
}

async function persistManifest(relativePaths?: string[]): Promise<void> {
	const root = appState.projectRoot;
	const manifest = appState.manifest;
	if (!root || !manifest) {
		return;
	}
	const next = relativePaths ? withUpdatedChapters(manifest, relativePaths) : manifest;
	appState.setChapters(appState.chapters, next);
	if (appState.offerCreateManifest) {
		return;
	}
	await writeManifestToDisk(root, next);
}

async function uniqueChapterRelative(root: string, dir: string, slug: string): Promise<string> {
	let name = `${slug}.mdx`;
	let relative = dir.length > 0 ? `${dir}/${name}` : name;
	let n = 2;
	while (await pathExists(await resolveProjectPath(root, relative))) {
		name = `${slug}-${n}.mdx`;
		relative = dir.length > 0 ? `${dir}/${name}` : name;
		n += 1;
	}
	return relative;
}

function chapterDir(type: ProjectType): string {
	switch (type) {
		case 'paper':
			return 'chapters';
		case 'blog':
			return '';
		default: {
			const _exhaustive: never = type;
			return _exhaustive;
		}
	}
}

async function onFsChange(change: ProjectFileChange): Promise<void> {
	if (handlingWatch || !appState.projectRoot || !appState.filePath) {
		return;
	}
	handlingWatch = true;
	try {
		const yamlPath = await joinPath(appState.projectRoot, 'project.yaml');
		const bibPath = appState.bibAbsolutePath;
		if (eventTouches(change.paths, yamlPath) && !appState.offerCreateManifest) {
			try {
				const parsed = parseManifest(await readText(yamlPath));
				const chapters = await resolveChapters(appState.projectRoot, parsed.chapters);
				if (chapters.length > 0) {
					appState.setChapters(chapters, parsed);
					const active = appState.filePath;
					if (active && !chapters.some((chapter) => samePath(chapter.absolutePath, active))) {
						const loaded = await loadChapterMarkdown(chapters[0].absolutePath);
						appState.setActiveChapter(chapters[0], loaded.content, {
							diskContent: loaded.disk,
							crashRecovered: loaded.recovered,
						});
					}
				}
			} catch {
				// Keep the in-memory manifest if Dropbox writes a partial file.
			}
		}
		if (bibPath && eventTouches(change.paths, bibPath)) {
			await loadBibliography();
		}
		const dictionaryPath = await joinPath(appState.projectRoot, 'project.dic');
		if (eventTouches(change.paths, dictionaryPath)) {
			await applySpellFromDisk();
		}
		if (!eventTouches(change.paths, appState.filePath)) {
			return;
		}
		const disk = await readMarkdownFile(appState.filePath);
		if (disk === appState.lastSavedContent) {
			return;
		}
		if (appState.conflict) {
			return;
		}
		if (appState.saveStatus === 'dirty' || appState.saveStatus === 'saving') {
			appState.conflict = true;
			return;
		}
		appState.reloadActiveContent(disk);
	} finally {
		handlingWatch = false;
	}
}

async function loadProjectAt(projectRoot: string, preferredFile: string | null): Promise<boolean> {
	await stopRuntime();
	const yamlPath = await joinPath(projectRoot, 'project.yaml');
	let manifest: ProjectManifest;
	let offerCreateManifest = false;

	if (await pathExists(yamlPath)) {
		try {
			manifest = parseManifest(await readText(yamlPath));
		} catch {
			return fail(t('invalidManifest'));
		}
	} else {
		const discovered = await discoverChapterPaths(projectRoot);
		if (discovered.length === 0) {
			return fail(t('noMarkdown'));
		}
		const folderName = await fileNameOf(projectRoot);
		manifest = {
			schema: 1,
			type: inferredType(discovered),
			title: folderName,
			lang: projectLangFromLocale(appState.locale),
			chapters: discovered,
		};
		offerCreateManifest = true;
	}

	const chapters = await resolveChapters(projectRoot, manifest.chapters);
	if (chapters.length === 0) {
		return fail(t('noMarkdown'));
	}

	let active = chapters[0];
	if (preferredFile) {
		const match = chapters.find((chapter) => samePath(chapter.absolutePath, preferredFile));
		if (match) {
			active = match;
		}
	}

	const loaded = await loadChapterMarkdown(active.absolutePath);
	let lockWarning: string | null = null;
	const existing = await readLock(projectRoot);
	if (existing && !isLockStale(existing) && !isOurLock(existing)) {
		lockWarning = t('lockWarning', { machine: existing.machine });
		ownsLock = false;
	} else {
		try {
			await writeLock(projectRoot);
			ownsLock = true;
			await startHeartbeat(projectRoot);
		} catch {
			ownsLock = false;
		}
	}

	appState.openProject({
		root: projectRoot,
		manifest,
		chapters,
		active,
		content: loaded.content,
		diskContent: loaded.disk,
		offerCreateManifest,
		lockWarning,
		crashRecovered: loaded.recovered,
	});
	await loadBibliography();
	await applySpellFromDisk();
	try {
		await startWatch(projectRoot);
	} catch {
		unwatch = null;
	}
	return true;
}

export async function openExistingProject(path?: string): Promise<boolean> {
	const selected = path ?? (await pickDirectory());
	if (!selected) {
		return false;
	}
	try {
		const info = await pathStat(selected);
		const projectRoot = info.isFile ? await dirNameOf(selected) : selected;
		const preferredFile = info.isFile ? selected : null;
		return await loadProjectAt(projectRoot, preferredFile);
	} catch (error) {
		return fail(formatHostError(error, t('openProjectFailed')));
	}
}

export async function createNewProject(title: string, type: ProjectType): Promise<boolean> {
	await appState.flushDocument();
	const parent = await pickDirectory();
	if (!parent) {
		return false;
	}
	const trimmed = title.trim();
	if (trimmed.length === 0) {
		return fail(t('createFailed'));
	}
	try {
		const root = await scaffoldProject({
			parentDir: parent,
			title: trimmed,
			type,
			lang: projectLangFromLocale(appState.locale),
		});
		return await loadProjectAt(root, null);
	} catch (error) {
		return fail(formatHostError(error, t('createFailed')));
	}
}

export async function closeOpenProject(): Promise<void> {
	appState.conflict = false;
	await appState.flushDocument();
	await stopRuntime();
	resetSpellContext();
	appState.closeProject();
}

export async function selectChapter(absolutePath: string): Promise<void> {
	if (!appState.filePath || samePath(absolutePath, appState.filePath) || appState.conflict) {
		return;
	}
	await appState.flushDocument();
	const chapter = appState.chapters.find((entry) => samePath(entry.absolutePath, absolutePath));
	if (!chapter) {
		return;
	}
	try {
		const loaded = await loadChapterMarkdown(chapter.absolutePath);
		appState.setActiveChapter(chapter, loaded.content, {
			diskContent: loaded.disk,
			crashRecovered: loaded.recovered,
		});
	} catch (error) {
		appState.lastError = formatHostError(error, t('openFailed'));
	}
}

export async function addChapter(): Promise<void> {
	const root = appState.projectRoot;
	const manifest = appState.manifest;
	const type = appState.projectType;
	if (!root || !manifest || !type || appState.conflict) {
		return;
	}
	const title = (await appDialog.ask(t('addChapterPrompt')))?.trim();
	if (!title) {
		return;
	}
	try {
		await appState.flushDocument();
		const dir = chapterDir(type);
		if (dir.length > 0) {
			await makeDir(await joinPath(root, dir));
		}
		const relativePath = await uniqueChapterRelative(root, dir, slugify(title));
		const absolutePath = await resolveProjectPath(root, relativePath);
		const content = emptyChapterMarkdown(title);
		await writeText(absolutePath, content);
		const chapter: ChapterRef = {
			relativePath,
			absolutePath,
			title: titleFromRelativePath(relativePath),
		};
		const chapters = [...appState.chapters, chapter];
		appState.setChapters(
			chapters,
			withUpdatedChapters(
				manifest,
				chapters.map((entry) => entry.relativePath),
			),
		);
		await persistManifest(chapters.map((entry) => entry.relativePath));
		appState.setActiveChapter(chapter, content);
	} catch (error) {
		appState.lastError = formatHostError(error, t('chapterFailed'));
	}
}

export async function renameChapter(absolutePath: string): Promise<void> {
	const root = appState.projectRoot;
	const manifest = appState.manifest;
	if (!root || !manifest || appState.conflict) {
		return;
	}
	const current = appState.chapters.find((entry) => samePath(entry.absolutePath, absolutePath));
	if (!current) {
		return;
	}
	const nextTitle = (await appDialog.ask(t('renameChapterPrompt'), current.title))?.trim();
	if (!nextTitle || nextTitle === current.title) {
		return;
	}
	try {
		if (samePath(absolutePath, appState.filePath ?? '')) {
			await appState.flushDocument();
		}
		const dir = current.relativePath.includes('/')
			? current.relativePath.slice(0, current.relativePath.lastIndexOf('/'))
			: '';
		const relativePath = await uniqueChapterRelative(root, dir, slugify(nextTitle));
		const nextAbsolute = await resolveProjectPath(root, relativePath);
		await renamePath(current.absolutePath, nextAbsolute);
		const renamed: ChapterRef = {
			relativePath,
			absolutePath: nextAbsolute,
			title: titleFromRelativePath(relativePath),
		};
		const chapters = appState.chapters.map((entry) =>
			samePath(entry.absolutePath, absolutePath) ? renamed : entry,
		);
		appState.setChapters(
			chapters,
			withUpdatedChapters(
				manifest,
				chapters.map((entry) => entry.relativePath),
			),
		);
		await persistManifest(chapters.map((entry) => entry.relativePath));
		if (samePath(absolutePath, appState.filePath ?? '')) {
			appState.filePath = renamed.absolutePath;
			appState.fileName = renamed.title;
		}
	} catch (error) {
		appState.lastError = formatHostError(error, t('chapterFailed'));
	}
}

export async function deleteChapter(absolutePath: string): Promise<void> {
	const root = appState.projectRoot;
	const manifest = appState.manifest;
	if (!root || !manifest || appState.conflict) {
		return;
	}
	if (appState.chapters.length <= 1) {
		appState.lastError = t('lastChapter');
		return;
	}
	if (!(await appDialog.confirm(t('deleteChapterConfirm')))) {
		return;
	}
	try {
		const remaining = appState.chapters.filter((entry) => !samePath(entry.absolutePath, absolutePath));
		const deletingActive = samePath(absolutePath, appState.filePath ?? '');
		if (deletingActive) {
			await appState.flushDocument();
		}
		await removePath(absolutePath);
		void clearCrashSnapshot(absolutePath);
		appState.setChapters(
			remaining,
			withUpdatedChapters(
				manifest,
				remaining.map((entry) => entry.relativePath),
			),
		);
		await persistManifest(remaining.map((entry) => entry.relativePath));
		if (deletingActive) {
			const next = remaining[0];
			const loaded = await loadChapterMarkdown(next.absolutePath);
			appState.setActiveChapter(next, loaded.content, {
				diskContent: loaded.disk,
				crashRecovered: loaded.recovered,
			});
		}
	} catch (error) {
		appState.lastError = formatHostError(error, t('chapterFailed'));
	}
}

export async function reorderChapters(fromIndex: number, toIndex: number): Promise<void> {
	const manifest = appState.manifest;
	if (!manifest || appState.conflict) {
		return;
	}
	if (
		fromIndex === toIndex ||
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= appState.chapters.length ||
		toIndex >= appState.chapters.length
	) {
		return;
	}
	const chapters = [...appState.chapters];
	const [moved] = chapters.splice(fromIndex, 1);
	chapters.splice(toIndex, 0, moved);
	appState.setChapters(chapters, withUpdatedChapters(manifest, chapters.map((entry) => entry.relativePath)));
	await persistManifest(chapters.map((entry) => entry.relativePath));
}

export async function keepLocalChanges(): Promise<void> {
	appState.conflict = false;
	await appState.flushDocument();
}

export async function reloadFromDisk(): Promise<void> {
	if (!appState.filePath) {
		return;
	}
	const path = appState.filePath;
	try {
		await clearCrashSnapshot(path);
		const content = await readMarkdownFile(path);
		appState.reloadActiveContent(content);
	} catch (error) {
		appState.lastError = formatHostError(error, t('openFailed'));
	}
}

export async function saveDiscoveredManifest(): Promise<void> {
	const root = appState.projectRoot;
	const manifest = appState.manifest;
	if (!root || !manifest) {
		return;
	}
	appState.offerCreateManifest = false;
	await writeManifestToDisk(root, manifest);
}

export function dismissManifestOffer(): void {
	appState.offerCreateManifest = false;
}

export function dismissLockWarning(): void {
	appState.lockWarning = null;
}

function isAbsoluteFsPath(path: string): boolean {
	return path.startsWith('/') || /^[a-zA-Z]:/.test(path);
}

async function resolveBibliographyPath(root: string, bibliography: string): Promise<string> {
	if (isAbsoluteFsPath(bibliography)) {
		return bibliography.replace(/\\/g, '/');
	}
	return resolveProjectPath(root, bibliography);
}

export async function loadBibliography(): Promise<void> {
	const root = appState.projectRoot;
	const bibliography = appState.manifest?.citation?.bibliography;
	if (!root || !bibliography) {
		appState.setBibliography([], null);
		return;
	}
	try {
		const absolute = await resolveBibliographyPath(root, bibliography);
		if (!(await pathExists(absolute))) {
			appState.setBibliography([], absolute);
			return;
		}
		appState.setBibliography(parseBibTeX(await readText(absolute)), absolute);
	} catch (error) {
		appState.lastError = formatHostError(error, t('bibFailed'));
		appState.setBibliography([], appState.bibAbsolutePath);
	}
}

export async function assignBibliographyFile(): Promise<void> {
	const root = appState.projectRoot;
	const manifest = appState.manifest;
	if (!root || !manifest) {
		return;
	}
	const selected = await pickBibFile();
	if (!selected) {
		return;
	}
	const stored = selected.replace(/\\/g, '/').startsWith(root.replace(/\\/g, '/'))
		? relativeToRoot(root, selected)
		: selected;
	const next = {
		...manifest,
		citation: {
			bibliography: stored,
			csl: manifest.citation?.csl ?? 'apa',
		},
	};
	appState.setChapters(appState.chapters, next);
	await persistManifest();
	await loadBibliography();
}

export async function setCslStyle(id: CslId): Promise<void> {
	const manifest = appState.manifest;
	if (!manifest || !isCslId(id)) {
		return;
	}
	const next = {
		...manifest,
		citation: {
			bibliography: manifest.citation?.bibliography ?? 'references.bib',
			csl: id,
		},
	};
	appState.setChapters(appState.chapters, next);
	await persistManifest();
}

export async function setDocumentLang(lang: ProjectLang): Promise<void> {
	const manifest = appState.manifest;
	if (!manifest || !isProjectLang(lang)) {
		return;
	}
	if (manifest.lang === lang) {
		return;
	}
	appState.setChapters(appState.chapters, { ...manifest, lang });
	await persistManifest();
	await applySpellFromDisk();
}

export async function addWordToProjectDictionary(word: string): Promise<void> {
	const root = appState.projectRoot;
	const trimmed = word.trim();
	if (!root || trimmed.length === 0) {
		return;
	}
	await addProjectDictionaryWord(root, trimmed);
	rememberSpellWord(trimmed);
}

async function applySpellFromDisk(): Promise<void> {
	const root = appState.projectRoot;
	if (!root) {
		return;
	}
	await applySpellContext(await loadProjectDictionary(root));
}

export async function openBibliographyFile(): Promise<void> {
	if (!appState.bibAbsolutePath) {
		return;
	}
	try {
		await openInDefaultApp(appState.bibAbsolutePath);
	} catch (error) {
		appState.lastError = formatHostError(error, t('bibOpenFailed'));
	}
}

export async function revealBibliographyFile(): Promise<void> {
	if (!appState.bibAbsolutePath) {
		return;
	}
	try {
		await revealInFolder(appState.bibAbsolutePath);
	} catch (error) {
		appState.lastError = formatHostError(error, t('bibOpenFailed'));
	}
}

function documentLabel(lang: ProjectLang, de: string, en: string): string {
	return isEnglishLang(lang) ? en : de;
}

async function flattenSelected(chapters: ChapterRef[]) {
	const root = appState.projectRoot;
	const manifest = appState.manifest;
	if (!root || !manifest) {
		throw new Error(t('exportFailed'));
	}
	const loaded = [];
	for (const chapter of chapters) {
		loaded.push({
			relativePath: chapter.relativePath,
			absolutePath: chapter.absolutePath,
			markdown: await readMarkdownFile(chapter.absolutePath),
		});
	}
	return flattenProject({
		root,
		title: manifest.title,
		lang: manifest.lang,
		chapters: loaded,
	});
}

async function loadProjectImages(srcs: string[]): Promise<Map<string, { bytes: Uint8Array; ext: string }>> {
	const root = appState.projectRoot;
	const images = new Map<string, { bytes: Uint8Array; ext: string }>();
	if (!root) {
		return images;
	}
	for (const src of srcs) {
		const absolute = await resolveProjectPath(root, src);
		if (!(await pathExists(absolute))) {
			continue;
		}
		images.set(src, { bytes: await loadImageBytes(absolute), ext: extOf(src) });
	}
	return images;
}

function citedMarkdown(flat: { markdown: string; lang: ProjectLang }): string {
	return applyCitations(
		flat.markdown,
		appState.bibEntries,
		appState.manifest?.citation?.csl,
		documentLabel(flat.lang, 'Literatur', 'References'),
	);
}

function withEmbeddedImages(
	markdown: string,
	images: Map<string, { bytes: Uint8Array; ext: string }>,
): string {
	return rewriteMarkdownImages(markdown, (alt, src) => {
		const image = images.get(src);
		if (!image) {
			return { alt, src };
		}
		return { alt, src: toDataUrl(image.bytes, image.ext) };
	});
}

async function exportFlattenedFile(choice: ExportChoice, chapters: ChapterRef[]): Promise<string | null> {
	const manifest = appState.manifest;
	if (!manifest) {
		return null;
	}
	const slug = slugify(manifest.title);
	const flat = await flattenSelected(chapters);
	const markdown = citedMarkdown(flat);
	const images = await loadProjectImages(flat.imageSrcs);
	const footnotes = documentLabel(flat.lang, 'Fußnoten', 'Notes');
	switch (choice.format) {
		case 'pdf': {
			if (!/Mac/i.test(navigator.userAgent)) {
				throw new Error(t('exportPdfUnsupported'));
			}
			const dest = await pickPdfPath(`${slug}.pdf`);
			if (!dest) {
				return null;
			}
			const html = buildPrintDocument({
				title: flat.title,
				lang: flat.lang,
				bodyMarkdown: withEmbeddedImages(markdown, images),
				footnoteHeading: footnotes,
			});
			await htmlToPdf(html, dest);
			return dest;
		}
		case 'docx': {
			const dest = await pickDocxPath(`${slug}.docx`);
			if (!dest) {
				return null;
			}
			const bytes = await markdownToDocx({
				title: flat.title,
				markdown: flat.markdown,
				images,
				entries: appState.bibEntries,
				csl: appState.manifest?.citation?.csl,
				bibliographyHeading: documentLabel(flat.lang, 'Literatur', 'References'),
			});
			await writeBinary(dest, bytes);
			return dest;
		}
		case 'md':
		case 'mdx': {
			const dest =
				choice.format === 'md' ? await pickMdPath(`${slug}.md`) : await pickMdxPath(`${slug}.mdx`);
			if (!dest) {
				return null;
			}
			const parent = await dirNameOf(dest);
			const stem = (await fileNameOf(dest)).replace(/\.(mdx|md)$/i, '');
			const assetsName = `${stem}-assets`;
			const assetsDir = await joinPath(parent, assetsName);
			let rewritten = markdown;
			if (images.size > 0) {
				await ensureDir(assetsDir);
				const used = new Set<string>();
				rewritten = rewriteMarkdownImages(markdown, (alt, src) => {
					const image = images.get(src);
					if (!image) {
						return { alt, src };
					}
					const base = src.split(/[/\\]/).pop() ?? src;
					used.add(src);
					return { alt, src: `${assetsName}/${base}` };
				});
				for (const src of used) {
					const image = images.get(src);
					if (!image) {
						continue;
					}
					const base = src.split(/[/\\]/).pop() ?? src;
					await writeBinary(await joinPath(assetsDir, base), image.bytes);
				}
			}
			await writeUtf8(dest, rewritten.endsWith('\n') ? rewritten : `${rewritten}\n`);
			return dest;
		}
		default: {
			const _exhaustive: never = choice.format;
			return _exhaustive;
		}
	}
}

async function exportMdxCopy(chapters: ChapterRef[]): Promise<string | null> {
	const root = appState.projectRoot;
	const manifest = appState.manifest;
	if (!root || !manifest) {
		return null;
	}
	const parent = await pickExportFolder();
	if (!parent) {
		return null;
	}
	const destRoot = await uniqueDir(parent, slugify(manifest.title));
	await ensureDir(destRoot);
	const nextManifest = { ...manifest, chapters: chapters.map((chapter) => chapter.relativePath) };
	await writeUtf8(await joinPath(destRoot, 'project.yaml'), serializeManifest(nextManifest));
	for (const chapter of chapters) {
		const dest = await resolveProjectPath(destRoot, chapter.relativePath);
		await ensureParent(dest);
		await copyBytes(chapter.absolutePath, dest);
	}
	const assetsFrom = await joinPath(root, 'assets');
	if (await pathExists(assetsFrom)) {
		await copyDir(assetsFrom, await joinPath(destRoot, 'assets'));
	}
	if (manifest.citation?.bibliography) {
		const bibFrom = await resolveProjectPath(root, manifest.citation.bibliography);
		if (await pathExists(bibFrom)) {
			const bibDest = await resolveProjectPath(destRoot, manifest.citation.bibliography);
			await ensureParent(bibDest);
			await copyBytes(bibFrom, bibDest);
		}
	}
	const dicFrom = await joinPath(root, 'project.dic');
	if (await pathExists(dicFrom)) {
		await copyBytes(dicFrom, await joinPath(destRoot, 'project.dic'));
	}
	return destRoot;
}

export async function exportCurrentProject(): Promise<void> {
	const manifest = appState.manifest;
	if (!manifest || !appState.projectRoot) {
		return;
	}
	await appState.flushDocument();
	const defaultFormat: ExportFormat = manifest.type === 'blog' ? 'mdx' : 'pdf';
	const choice = await exportDialog.ask({
		format: defaultFormat,
		mdxMode: 'copy',
		chapters: appState.chapters.map((chapter) => chapter.relativePath),
	});
	if (!choice) {
		return;
	}
	const chapters = appState.chapters.filter((chapter) => choice.chapterPaths.includes(chapter.relativePath));
	if (chapters.length === 0) {
		fail(t('exportNoChapters'));
		return;
	}
	try {
		let dest: string | null = null;
		switch (choice.format) {
			case 'mdx': {
				switch (choice.mdxMode) {
					case 'copy':
						dest = await exportMdxCopy(chapters);
						break;
					case 'flatten':
						dest = await exportFlattenedFile(choice, chapters);
						break;
					default: {
						const _exhaustive: never = choice.mdxMode;
						return _exhaustive;
					}
				}
				break;
			}
			case 'pdf':
			case 'docx':
			case 'md':
				dest = await exportFlattenedFile(choice, chapters);
				break;
			default: {
				const _exhaustive: never = choice.format;
				return _exhaustive;
			}
		}
		if (dest) {
			await revealInFolder(dest);
		}
	} catch (error) {
		appState.lastError = formatHostError(error, t('exportFailed'));
	}
}

