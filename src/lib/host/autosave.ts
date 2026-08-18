export function createDebouncedSaver(
	delayMs: number,
	save: () => Promise<void>,
): { schedule: () => void; flush: () => Promise<void>; cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let inFlight: Promise<void> | null = null;
	let queued = false;

	const run = async (): Promise<void> => {
		if (inFlight) {
			queued = true;
			await inFlight;
			return;
		}
		inFlight = save().finally(() => {
			inFlight = null;
		});
		await inFlight;
		if (queued) {
			queued = false;
			await run();
		}
	};

	return {
		schedule() {
			if (timer !== null) {
				clearTimeout(timer);
			}
			timer = setTimeout(() => {
				timer = null;
				void run();
			}, delayMs);
		},
		async flush() {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			await run();
		},
		cancel() {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			queued = false;
		},
	};
}

export function countWords(text: string): number {
	const trimmed = text.trim();
	if (trimmed.length === 0) {
		return 0;
	}
	return trimmed.split(/\s+/).length;
}
