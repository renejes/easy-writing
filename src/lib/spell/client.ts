import type { SpellLang, SpellRequest, SpellResponse } from './protocol';

type Pending = {
	resolve: (value: SpellResponse) => void;
	reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function handleMessage(event: MessageEvent<SpellResponse>): void {
	const message = event.data;
	if (message.type === 'error') {
		const wait = pending.get(message.id);
		pending.delete(message.id);
		wait?.reject(new Error(message.message));
		return;
	}
	if (!('id' in message)) {
		return;
	}
	const wait = pending.get(message.id);
	if (!wait) {
		return;
	}
	pending.delete(message.id);
	wait.resolve(message);
}

function getWorker(): Worker {
	if (!worker) {
		worker = new Worker(new URL('./spell.worker.ts', import.meta.url), { type: 'module' });
		worker.addEventListener('message', handleMessage);
	}
	return worker;
}

function request(message: SpellRequest): Promise<SpellResponse> {
	if (!('id' in message)) {
		getWorker().postMessage(message);
		return Promise.resolve({ type: 'ready', id: 0, lang: 'de' });
	}
	return new Promise((resolve, reject) => {
		pending.set(message.id, { resolve, reject });
		getWorker().postMessage(message);
	});
}

export async function configureSpell(lang: SpellLang, extra: string[]): Promise<void> {
	const id = nextId;
	nextId += 1;
	await request({ type: 'configure', id, lang, extra });
}

export async function checkWords(words: string[]): Promise<string[]> {
	if (words.length === 0) {
		return [];
	}
	const id = nextId;
	nextId += 1;
	const response = await request({ type: 'check', id, words });
	return response.type === 'misspelled' ? response.words : [];
}

export async function suggestWord(word: string): Promise<string[]> {
	const id = nextId;
	nextId += 1;
	const response = await request({ type: 'suggest', id, word });
	return response.type === 'suggestions' ? response.suggestions : [];
}

export function addSpellWord(word: string): void {
	getWorker().postMessage({ type: 'add', word } satisfies SpellRequest);
}
