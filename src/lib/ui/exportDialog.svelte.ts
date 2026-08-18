import type { ExportChoice, ExportFormat, MdxMode } from '$lib/export/types';

class ExportDialogState {
	open = $state(false);
	format = $state<ExportFormat>('pdf');
	mdxMode = $state<MdxMode>('copy');
	selected = $state<string[]>([]);
	busy = $state(false);
	private resolve: ((value: ExportChoice | null) => void) | null = null;

	ask(input: { format: ExportFormat; mdxMode: MdxMode; chapters: string[] }): Promise<ExportChoice | null> {
		this.cancel();
		this.format = input.format;
		this.mdxMode = input.mdxMode;
		this.selected = [...input.chapters];
		this.busy = false;
		this.open = true;
		return new Promise((resolve) => {
			this.resolve = resolve;
		});
	}

	cancel(): void {
		this.open = false;
		const resolve = this.resolve;
		this.resolve = null;
		resolve?.(null);
	}

	submit(): void {
		if (this.selected.length === 0) {
			return;
		}
		this.open = false;
		const resolve = this.resolve;
		this.resolve = null;
		resolve?.({
			format: this.format,
			chapterPaths: [...this.selected],
			mdxMode: this.mdxMode,
		});
	}

	toggleChapter(path: string): void {
		if (this.selected.includes(path)) {
			this.selected = this.selected.filter((entry) => entry !== path);
			return;
		}
		this.selected = [...this.selected, path];
	}

	selectAll(paths: string[]): void {
		this.selected = [...paths];
	}
}

export const exportDialog = new ExportDialogState();
