export type ExportFormat = 'pdf' | 'docx' | 'md' | 'mdx';
export type MdxMode = 'copy' | 'flatten';

export type ExportChoice = {
	format: ExportFormat;
	chapterPaths: string[];
	mdxMode: MdxMode;
};
