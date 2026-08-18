import { joinPath, pathExists, readText, writeText } from '$lib/host/files';

const FILE = 'project.dic';

function parseDictionary(raw: string): string[] {
	const words: string[] = [];
	const seen = new Set<string>();
	for (const line of raw.split(/\r?\n/)) {
		const word = line.trim();
		if (word.length === 0 || word.startsWith('#')) {
			continue;
		}
		if (seen.has(word)) {
			continue;
		}
		seen.add(word);
		words.push(word);
	}
	return words;
}

export async function loadProjectDictionary(root: string): Promise<string[]> {
	const path = await joinPath(root, FILE);
	if (!(await pathExists(path))) {
		return [];
	}
	return parseDictionary(await readText(path));
}

export async function addProjectDictionaryWord(root: string, word: string): Promise<string[]> {
	const words = await loadProjectDictionary(root);
	if (words.includes(word)) {
		return words;
	}
	const next = [...words, word];
	await writeText(await joinPath(root, FILE), `${next.join('\n')}\n`);
	return next;
}
