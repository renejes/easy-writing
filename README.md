# Easy Writing

**Aufmachen. Schreiben. Speichern. Exportieren.**

Desktop-App zum Schreiben in Markdown/MDX. Ein Ordner ist das Projekt. Die Datei auf der Platte ist die Wahrheit — nicht ein Layout, nicht eine Vorschau.

[![License: MIT](https://img.shields.io/badge/license-MIT-111111?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-111111?style=flat-square)](https://v2.tauri.app)
[![Svelte](https://img.shields.io/badge/Svelte-5-111111?style=flat-square)](https://svelte.dev)
[![macOS](https://img.shields.io/badge/platform-macOS-111111?style=flat-square)](#entwickeln)

A writing app, not a design studio. Folders, `.mdx` files, citations, footnotes, export. Typesetting belongs in Penwright — or wherever you set type. Easy Writing stops at the sentence.

> v0.1.0 · macOS first · [MIT](LICENSE)

---

## Wofür

Denselben Schreibtisch, zwei Vorlagen:

| Vorlage | Typische Arbeit |
|---------|-----------------|
| **Blog** | Artikel, Bilder, Frontmatter, Export als MDX ins Blog-Repo |
| **Paper** | Kapitel, BibTeX, Fußnoten, APA/Chicago/Harvard/Vancouver, Export als DOCX oder PDF |

Kein Mathematik-Satz. Kein Theme-Store. Keine Live-PDF-Vorschau.

## Was es kann

- **Ordnerprojekt** — öffnen und schreiben, auch in Dropbox
- **Autosave** nach 5 Sekunden, sofort mit ⌘S, Flush beim Kapitelwechsel und beim Beenden
- **Toolbar** für alles, was der Dialekt erlaubt: Überschriften, Listen, Tabellen, Links, Bilder, Figures, Zitate, Fußnoten
- **Zitate** aus einer `.bib`-Datei im Projekt: `[@citekey]` und `[@citekey, p. 12]`, Autocomplete mit `@`
- **Fußnoten** im Pandoc-Stil: `[^1]`
- **Rechtschreibung** Deutsch, English (US), English (UK); UI Deutsch oder Englisch
- **Export** PDF, Word (DOCX), Markdown, MDX

### MDX für Penwright

Der MDX-Export kopiert das Projekt (Kapitel, `assets/`, `project.yaml`, Bibliographie). Diesen Ordner kann Penwright direkt öffnen. Auf der Platte bleiben `[@key]` und `[^id]` erhalten — gesetzt wird woanders.

## Dialekt

Dateien heißen `.mdx`, der Umfang ist geschlossen:

| In der Datei | Bedeutung |
|--------------|-----------|
| YAML-Frontmatter | unbekannte Keys überleben den Round-Trip |
| GFM | Überschriften, Listen, Tabellen, Code, Quotes, Links, Bilder |
| `[@key]` / `[@key, p. 12]` | Zitat |
| `[^id]` | Fußnote |
| `<Figure src="…" alt="…" caption="…" />` | Abbildung mit Bildunterschrift |

Kein beliebiges JSX, keine Imports, keine Ausdrücke.

## Projekt auf der Platte

```text
mein-text/
  project.yaml
  index.mdx                 # Blog
  chapters/01-einleitung.mdx
  assets/
  references.bib            # Paper
  project.dic               # optionales Projektwörterbuch
```

Die App schreibt atomar (Tempdatei, dann Rename) und verträgt gemeinsame Ordner besser als Truncate-in-place.

## Entwickeln

Voraussetzungen: **macOS**, [Node.js](https://nodejs.org) 20+, [Rust](https://rustup.rs) (stable).

```bash
git clone https://github.com/renejes/easy-writing.git
cd easy-writing
npm install
npm run tauri dev
```

Weitere Befehle:

```bash
npm test              # Round-Trip, Flatten, Bib-Parser
npm run check         # svelte-check
npm run tauri build   # .app unter src-tauri/target/release/bundle
```

Tauri-Imports liegen nur in `$lib/host/`. Der Editor-Kern ist TipTap 3 mit `@tiptap/markdown`.

Ausführlicher Plan: [`documentation/01_implementationsplan.md`](documentation/01_implementationsplan.md).

## Status

v1-Desktop ist schreibbereit: Dateien, Kapitel, Bilder, Zitate, Fußnoten, Tabellen, Export, Sprachen, Härten (Round-Trip-Tests, atomare Writes, Crash-Recovery).

**Geplant:** iPad (Phase 8). Windows/Linux später, nicht in derselben Phase.

**Absichtlich nicht in v1:** Design-Tokens, Live-PDF, Mathematik, Kommentare, Zotero-Plugin, Dark Mode, Accounts, Plugin-API.

## Mitmachen

Issues und Pull Requests sind willkommen, wenn sie beim nächsten Satz helfen. „Sieht schöner aus“ oder „geht auch in InDesign“ gehört nicht in diese App.

## Lizenz

[MIT](LICENSE) © 2026 René Jesser
