import { joinPath, listDir, pathExists } from '$lib/host/files';
import { isMarkdownName } from './paths';

async function markdownIn(dir: string, prefix: string): Promise<string[]> {
	if (!(await pathExists(dir))) {
		return [];
	}
	const entries = await listDir(dir);
	return entries
		.filter((entry) => entry.isFile && isMarkdownName(entry.name))
		.map((entry) => (prefix.length > 0 ? `${prefix}/${entry.name}` : entry.name))
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export async function discoverChapterPaths(root: string): Promise<string[]> {
	const rootFiles = await markdownIn(root, '');
	const chapterDir = await joinPath(root, 'chapters');
	const nested = await markdownIn(chapterDir, 'chapters');
	return [...rootFiles, ...nested];
}
