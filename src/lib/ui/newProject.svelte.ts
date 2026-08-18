import type { ProjectType } from '$lib/project/types';

class NewProjectUi {
	open = $state(false);
	title = $state('');
	type = $state<ProjectType>('blog');

	show(): void {
		this.open = true;
	}

	hide(): void {
		this.open = false;
		this.title = '';
		this.type = 'blog';
	}
}

export const newProjectUi = new NewProjectUi();
