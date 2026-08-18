import { marked } from 'marked';
import { footnotesToHtml } from './footnotes';

marked.setOptions({ gfm: true, breaks: false });

export type HtmlDocumentInput = {
	title: string;
	lang: string;
	bodyMarkdown: string;
	footnoteHeading: string;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

const PRINT_CSS = `
@page { size: A4; margin: 22mm 18mm; }
html, body {
  margin: 0;
  background: #fff;
  color: #111;
  font-family: ui-monospace, 'IBM Plex Mono', Menlo, Consolas, monospace;
  font-size: 11pt;
  line-height: 1.55;
}
main {
  max-width: 72ch;
  margin: 0 auto;
}
h1, h2, h3 { font-weight: 700; line-height: 1.25; }
h1 { font-size: 1.5rem; break-before: page; margin: 0 0 1.2rem; }
h1:first-of-type { break-before: auto; }
h2 { font-size: 1.15rem; margin: 1.6rem 0 0.7rem; }
h3 { font-size: 1rem; margin: 1.2rem 0 0.5rem; }
p, li { margin: 0 0 0.7rem; }
blockquote {
  margin: 0 0 0.9rem;
  padding: 0 0 0 0.8rem;
  border-left: 1px solid #111;
}
code, pre { font-family: inherit; }
pre {
  border: 1px solid #ddd;
  padding: 0.7rem;
  overflow: auto;
  white-space: pre-wrap;
}
img { max-width: 100%; height: auto; display: block; margin: 0.8rem 0; }
figcaption, em.caption { display: block; font-size: 0.9rem; color: #444; margin: -0.3rem 0 1rem; }
a { color: inherit; }
hr { border: 0; border-top: 1px solid #111; margin: 1.4rem 0; }
table { border-collapse: collapse; width: 100%; margin: 0 0 1rem; }
th, td { border: 1px solid #111; padding: 0.25rem 0.5rem; text-align: left; vertical-align: top; }
th { font-weight: 700; }
.footnotes { margin-top: 2rem; border-top: 1px solid #ddd; padding-top: 0.8rem; }
.fn a { text-decoration: none; }
.title { font-size: 1.7rem; margin: 0 0 2rem; break-before: auto; }
`;

export function markdownToHtmlFragment(markdown: string, footnoteHeading: string): string {
	const prepared = footnotesToHtml(markdown, footnoteHeading);
	return marked.parse(prepared, { async: false }) as string;
}

export function buildPrintDocument(input: HtmlDocumentInput): string {
	const body = markdownToHtmlFragment(input.bodyMarkdown, input.footnoteHeading);
	const title = escapeHtml(input.title);
	return `<!doctype html>
<html lang="${escapeHtml(input.lang)}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<main>
<h1 class="title">${title}</h1>
${body}
</main>
<script>document.title = 'READY';</script>
</body>
</html>`;
}
