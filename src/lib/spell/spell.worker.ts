import nspell from 'nspell';
import { dictUrls } from './dicts';
import type { SpellLang, SpellRequest, SpellResponse } from './protocol';

type SpellChecker = ReturnType<typeof nspell>;

const cache = new Map<SpellLang, Promise<{ aff: string; dic: string }>>();
let checker: SpellChecker | null = null;

function post(message: SpellResponse): void {
	self.postMessage(message);
}

async function loadDict(lang: SpellLang): Promise<{ aff: string; dic: string }> {
	const cached = cache.get(lang);
	if (cached) {
		return cached;
	}
	const urls = dictUrls[lang];
	const pending = Promise.all([
		fetch(urls.aff).then((response) => {
			if (!response.ok) {
				throw new Error(`dict-aff-${lang}`);
			}
			return response.text();
		}),
		fetch(urls.dic).then((response) => {
			if (!response.ok) {
				throw new Error(`dict-dic-${lang}`);
			}
			return response.text();
		}),
	]).then(([aff, dic]) => ({ aff, dic }));
	cache.set(lang, pending);
	try {
		return await pending;
	} catch (error) {
		cache.delete(lang);
		throw error;
	}
}

function isCorrect(word: string): boolean {
	if (!checker) {
		return true;
	}
	if (checker.correct(word)) {
		return true;
	}
	const lower = word.toLocaleLowerCase();
	return lower !== word && checker.correct(lower);
}

async function configure(id: number, lang: SpellLang, extra: string[]): Promise<void> {
	const dict = await loadDict(lang);
	checker = nspell(dict.aff, dict.dic);
	for (const word of extra) {
		if (word.length > 0) {
			checker.add(word);
		}
	}
	post({ type: 'ready', id, lang });
}

self.onmessage = (event: MessageEvent<SpellRequest>) => {
	const message = event.data;
	void (async () => {
		try {
			switch (message.type) {
				case 'configure':
					await configure(message.id, message.lang, message.extra);
					return;
				case 'check': {
					const words = message.words.filter((word) => !isCorrect(word));
					post({ type: 'misspelled', id: message.id, words });
					return;
				}
				case 'suggest': {
					const suggestions = checker ? checker.suggest(message.word).slice(0, 6) : [];
					post({
						type: 'suggestions',
						id: message.id,
						word: message.word,
						suggestions,
					});
					return;
				}
				case 'add':
					checker?.add(message.word);
					return;
				default: {
					const _exhaustive: never = message;
					return _exhaustive;
				}
			}
		} catch (error) {
			const id = 'id' in message ? message.id : 0;
			post({
				type: 'error',
				id,
				message: error instanceof Error ? error.message : 'spell-worker',
			});
		}
	})();
};
