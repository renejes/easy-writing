# Easy Writing — Implementierungsplan

**Arbeitsname:** Easy Writing (Repo: `easy-writing`)
**Status:** Basisdokument für die Implementierung
**Stand:** 18. August 2026
**Leitsatz:** Aufmachen. Schreiben. Speichern. Exportieren. Nichts anderes.

Dieses Dokument ist die verbindliche Grundlage. Wenn eine Idee mit dem Leitsatz kollidiert, gewinnt der Leitsatz.

---

## 1. Auftrag

Wir bauen eine **Markdown-/MDX-Schreibanwendung** für alltägliche Schreibarbeit: Blogbeiträge, Essays, psychologische/wissenschaftliche Texte ohne Mathematik.

Die App soll dort ansetzen, wo Penwright zu viel geworden ist: **Schreiben statt Gestalten.**

### 1.1 Was der Nutzer tun können muss

| Fähigkeit | Bedeutung |
|-----------|-----------|
| Ordnerprojekt | Jedes Projekt ist ein Ordner. Kann in Dropbox liegen. Öffnen und schreiben. |
| MDX als Dateiformat | Jedes Kapitel / jeder Beitrag ist eine `.mdx`-Datei. |
| Formatierungsleiste | Alles, was das Dialekt erlaubt, ist per Toolbar erreichbar. Kein Markdown-Auswendiglernen nötig. |
| Kapitel | Mehrere Kapitel, per Drag neu sortieren. Jedes Kapitel = eine Datei. |
| Autosave | Speichern nach ~5 Sekunden Debounce. Kein „Speichern?“-Dialog beim Schreiben. |
| Bilder | Einfügen, im Projekt ablegen, beim Export mitnehmen. |
| Zitate | BibTeX pro Projekt, im Text zitieren, Fußnoten. |
| Export | `.mdx`, `.md`, `.pdf`, `.docx`. |
| Rechtschreibung | Mehrere Sprachen (mindestens Deutsch und Englisch). |
| UI-Sprache | Deutsch und Englisch, umschaltbar. |
| Plattform | Tauri v2: Desktop zuerst, iPad als Zielarchitektur. |
| Look | Schwarz/Weiß, schlicht, übersichtlich, Monospace. |

### 1.2 Für wen

Denselben Menschen in zwei Modi:

1. **Blog:** ein oder wenige Artikel, Bilder, klare Überschriften, Export nach Markdown/MDX für Astro/Next/sonstige Blogs.
2. **Wissenschaft (Psychology & Co.):** Kapitel, BibTeX, Fußnoten, APA/Chicago, Export nach DOCX/PDF. Keine Formeln, keine Layout-Studio-Features.

---

## 2. Lektion aus Penwright

Penwright (`vswrite-desktop`, v0.12) ist eine **Typst-WYSIWYG-App mit eingebautem Design-Studio**. Der Editor (TipTap) ist gut. Der Rest drumherum ist der Grund, warum die App zum Schreiben zu schwer geworden ist.

### 2.1 Was Penwright tatsächlich ist

| Schicht | Umfang |
|---------|--------|
| Runtime | Electron 41, nicht Tauri |
| UI | Svelte 5, ~41 Komponenten, ~25 Dialoge/Panels |
| Editor | TipTap 3 + CodeMirror für Neben-Dateien |
| Satz | Gebündelte Typst-CLI 0.15.1, 24 Packages, 7 Font-Familien |
| Design | `style.json` → `style.typ`, Safe-Apply-Compile, 23 Layout-Elemente, 33 Presets, 6 Themes, 8 Paletten, 8 Layouts |
| Magazine | 10 Extra-AST-Nodes + `macros.typ` |
| Round-Trip | Deserializer ~2.240 Zeilen Typst ↔ TipTap |
| Export | PDF, Print-PDF (Bleed/Crop), DOCX, Web-Mini-Site |
| Agents | MCP-Server mit 66 Tools, Design-Parität |

Das Kernproblem: **Schreiben und Gestalten teilen sich dasselbe mentale Modell.** Jede Textänderung läuft implizit auf „wird das PDF noch kompilieren?“ hinaus. Das DesignPanel allein hat ~2.300 Zeilen. Dazu kommt eine zweite Wahrheit (`style.typ` handgeschrieben vs. generiert) plus Guards, Inference und vier Export-Pipelines, die alle Design-Treue halten müssen.

### 2.2 Warum das zum Schreiben stört

1. **Compile-Zyklus.** Design-Änderung → Typst kompilieren → Rollback bei Fehler. Schreiben fühlt sich wie InDesign an, nicht wie ein Texteditor.
2. **Drei Repräsentationen.** JSON-Tokens, generiertes Typst, optional handgeschriebenes Typst. Round-Trip ist der teuerste Code im Projekt.
3. **Zu viele Oberflächen.** Start, Editor, Design-View, 5 Sidebar-Tabs, PDF-Preview, Toolbar, Slash-Menü, Preset-Galerie, Print-Export, MCP-Wizard, Lizenz, Onboarding.
4. **Falsches Versprechen der Live-Vorschau.** Editor-Breite ≠ Satzspiegel. Man korrigiert Umbrüche an der falschen Stelle.
5. **Feature-Parität mit Agents.** Jede Design-Funktion existiert zweimal (UI + MCP).

### 2.3 Was wir trotzdem übernehmen — als Idee, nicht als Code-Kopie

Diese Konzepte aus Penwright sind richtig und bleiben:

- Ordner = Projekt, portable, Dropbox-tauglich
- Kapitel als Dateien, Reihenfolge separat gespeichert
- Autosave + Crash-Recovery
- `.bib` im Projekt, `@citekey` mit Autocomplete
- File-Lock für Shared Folders
- `assets/` für Bilder
- Startbildschirm ohne Auto-Reopen des letzten Projekts (bewusst „öffnen und schreiben“)
- Slash-Commands als Ergänzung zur Toolbar, nicht als Ersatz
- Outline aus Live-Überschriften
- UI-i18n DE/EN zur Laufzeit
- Dokument-`lang` steuert Rechtschreibung
- TipTap als Editor-Kernel (Penwright beweist: Svelte 5 + TipTap 3 funktioniert)

Diese Dinge **kommen nicht mit:**

- Typst, `style.json`, DesignPanel, Presets, Themes, Paletten, Layout-Elemente
- Magazine-Nodes, Makro-Formulare, Safe-Apply
- PDF-Live-Vorschau als zweite Wahrheit
- Print-Geometrie (Bleed, Crop, Bundsteg)
- MCP, Claude-Skills, Polar/Lizenz
- Git-Versions-UI, Kommentar-System, Design-AI
- CodeMirror (außer wir brauchen später einen reinen `.bib`-Textmodus — dann erst)

### 2.4 Die eine Regel gegen Komplexitäts-Rückfall

> Jede neue Funktion muss die Frage beantworten: **Hilft sie beim nächsten Satz, den ich schreiben will?** Wenn die Antwort „sieht schöner aus“ oder „geht auch in InDesign“ ist, gehört sie nicht in die App.

Konkret verboten bis auf Widerruf in einem späteren Dokument:

- Farbpicker, Font-Picker, Seitenränder, Spalten, Header/Footer-Editor
- Beliebige JSX-Komponenten in MDX
- Zweites Layout neben dem Editor (PDF-WYSIWYG)
- Plugin-Marktplatz, Themes-Store, Preset-Galerie mit Thumbnails

---

## 3. Recherche: Wie die Anforderungen zusammenpassen

### 3.1 TipTap als Editor-Kern — ja, mit klarer Grenze

TipTap 3 (ProseMirror) ist die richtige Basis. Penwright nutzt es bereits erfolgreich. Neu und entscheidend für uns: **`@tiptap/markdown`** (Marked.js darunter) kann Markdown **bidirektional** parsen und serialisieren. Custom Nodes bekommen `parseMarkdown` / `renderMarkdown` / optional `markdownTokenizer`.

Das heißt:

- **Wahrheit auf der Platte:** `.mdx`-Text
- **Wahrheit im Editor:** ProseMirror-Dokument
- **Brücke:** TipTap-Markdown-Extension, nicht ein 2.000-Zeilen-Deserializer für eine Satzsprache

Grenze: TipTap-Markdown ist CommonMark plus wenige Extras. Fußnoten und Zitate sind **kein** CommonMark. Die bauen wir als eigene Nodes mit eigener Markdown-Syntax (Pandoc-kompatibel, siehe §5). Beliebige MDX-JSX wird **nicht** rundtrip-fähig gemacht.

Offizielle DOCX-Import/Export-Extensions von TipTap Pro brauchen Cloud-APIs und können Fußnoten schlecht. Die nutzen wir nicht. Export läuft lokal (Pandoc bzw. JS-Fallback).

Fußnoten im Editor: Community-Paket `tiptap-footnotes` (`Footnotes` / `Footnote` / `FootnoteReference`) als Ausgangspunkt, Serialisierung selbst auf Pandoc-Syntax mappen.

Zitate: keine First-Party-Extension. Eigenes Inline-Node `citation` mit Pandoc-Syntax `[@key]`. Autocomplete analog Penwright.

### 3.2 MDX — Dateiendung für Blogs, nicht Programmiersprache

Volles MDX (beliebiges JSX) wäre **derselbe Komplexitätsfehler wie Typst-Rohblöcke + Magazine-Makros.** Compiler, Component-Registry, Sandboxing, Round-Trip-Verlust.

**Entscheidung: Constrained MDX.**

Dateien heißen `.mdx`, damit sie in Astro/Next/MDX-Blogs landen. Der Dialekt ist aber geschlossen:

- YAML-Frontmatter
- GFM (Überschriften, Listen, Tabellen, Code, Quotes, Links, Bilder)
- Pandoc-Zitate und -Fußnoten
- **Genau eine** optionale MDX-Komponente in v1: `<Figure>`
- Kein `{expressions}`, keine Imports, keine beliebigen Tags

Was der Nutzer „MDX“ nennt, ist: *Markdown, das in meinem Blog-Repo als `.mdx` weiterlebt, plus Bilder und semantische Blöcke.*

### 3.3 Tauri v2 statt Electron

Penwright ist Electron. Wir gehen auf **Tauri 2**, weil:

- iOS **und iPadOS** sind dasselbe offizielle Target (`tauri ios init` / `tauri ios dev`). Es gibt kein separates iPadOS-SDK: iPadOS *ist* iOS mit größerem Screen. Tauris Xcode-Template setzt `TARGETED_DEVICE_FAMILY = 1,2` (iPhone + iPad) und eigene iPad-Orientierungen. Simulator-Liste enthält iPads. App-Store-Upload ist dokumentiert (`tauri ios build --export-method app-store-connect`).
- Kleineres Bundle, kein Chromium-Sidecar
- Dateisystem, Dialoge, Watcher als Plugins
- iOS/iPadOS: Security-Scoped Resources für Dateien außerhalb der Sandbox (Files-App, Dropbox)

Frontend: **Vite + Svelte 5 (ohne SvelteKit).** Begründung:

- Die App hat zwei Surfaces: Start und Editor. Kein Routing-Framework nötig.
- TipTap und Tauri-APIs sind Client-only. SSR wäre toter Ballast.
- `create-tauri-app` liefert genau dieses Template (`svelte-ts`).
- SvelteKit-SPA + `adapter-static` ginge (offizielle Docs erwähnen Tauri), bringt aber Fallback-Page, Adapter, `$app/*` ohne Nutzen.

Svelte-5-Regeln, die für den Editor gelten:

- Editor-Instanz als `$state.raw` (kein Deep-Proxy um ProseMirror).
- TipTap wird in `$effect` gemountet und im Cleanup zerstört — das ist der vorgesehene Escape Hatch für Third-Party-Libraries.
- Kapitel-Liste keyed nach Dateipfad, nicht nach Index (`animate:` für Reorder).

### 3.4 Export — PDF ohne Typst, Pandoc nur für Word

**Typst brauchen wir nicht.** Es wäre nur eine unsichtbare PDF-Engine hinter Pandoc gewesen, um LaTeX zu vermeiden. Das wäre genau der Komplexitäts-Fuß in der Tür: wieder eine Binary, wieder ein Satzsystem, wieder die Versuchung „nur kurz das Template anfassen“. Für Psychology-Texte (Worte + ein paar Bilder) ist das Overkill.

PDF-Optionen ohne LaTeX und ohne Typst:

| Weg | Pro | Contra |
|-----|-----|--------|
| HTML → natives WebView-PDF | Eine Pipeline auf Mac **und** iPad, kein Sidecar, Look = App-Look | Kein Magazin-Satz, Umbrüche sind Browser-Print |
| WeasyPrint / paged.js-cli | Mehr Print-CSS-Kontrolle | Extra-Stack, nicht auf iPad |
| `pandoc --pdf-engine=typst` | Guter Satz | Typst wieder im Projekt, nicht auf iPad |

**Entscheidung:**

- **Eine kanonische Zwischenform:** Flatten-Markdown (Kapitel zusammengeführt, Bilder relativ aufgelöst, Figure → Caption-Image, Zitate/Fußnoten unverändert).
- **PDF (alle Plattformen):** Flatten → HTML (schwarz/weiß, Monospace, Print-CSS A4) → natives Print-to-PDF. Auf Apple: `WKWebView.createPDF`. Auf Windows später: WebView2 `PrintToPdf`. `window.print()` in Tauris WKWebView ist unzuverlässig — deshalb ein kleiner Rust-Command, kein unsichtbares Satzsystem.
- **DOCX:** Desktop optional über gebündeltes Pandoc (`--citeproc`). iPad und Fallback: JS-Bibliothek `docx`.
- **MD / MDX:** reine Dateioperationen, kein Converter.

Citeproc für PDF sitzt in der HTML-Stufe (citation-js nur beim Export, nicht im Editor). Damit braucht PDF weder Pandoc noch Typst. Pandoc bleibt ein *optionale* Desktop-Hilfe für besonders treues Word, nicht die PDF-Voraussetzung.

### 3.5 BibTeX in der App

Zwei Ebenen, bewusst getrennt:

1. **Schreiben:** Eigenes kleines BibTeX-Parsing (Penwright `bibParser.ts` ist dependency-frei und wiederverwendbar). Autocomplete, Chip mit Author-Year aus den Feldern, Hover mit Titel. **Kein** voller CSL-Live-Renderer im Editor.
2. **Export:** citation-js / citeproc-js **nur in der Export-Pipeline** (HTML→PDF und JS-DOCX). Optional zusätzlich Pandoc `--citeproc` für Desktop-Word, wenn die Binary da ist.

Der Editor bleibt dumm: Chip `Mayer, 2019`. Volle CSL-Treue entsteht erst beim Export, nicht während des Tippens.

### 3.6 Rechtschreibung

| Ansatz | Sprachen | Aufwand | iPad |
|--------|----------|---------|------|
| Native `spellcheck` + `lang` | OS-Wörterbücher | Fast null | Gut auf iOS, auf macOS-WKWebView unzuverlässig |
| Harper (WASM) | praktisch nur Englisch | Mittel | Ja |
| nspell + `wooorm/dictionaries` | DE, EN, … | Mittel, rein JS | Ja |
| Hunspell in Rust | Beliebig | Hoch (Binaries, Dicts) | Schwierig |

**Entscheidung, gestaffelt:**

- v1: Native Spellcheck über `lang` am Editor (Dokument-Sprache, nicht UI-Sprache).
- v1.1: nspell-Worker mit gebündelten Dicts `de`, `en-US`, `en-GB` als zuverlässige Unterstreichung, unabhängig vom WebView.
- Harper nur als optionale **englische** Grammar-Ergänzung, nie als Ersatz für Deutsch.

### 3.7 Dropbox und iPad

**Desktop:** Ordner öffnen via `@tauri-apps/plugin-dialog`. Watcher via `@tauri-apps/plugin-fs`. Lockfile neben der Datei (Penwright-Modell, vereinfacht auf Projekt-Lock statt Per-File-Lock).

**iPad:** iOS sandbox. Ordner aus der Files-App (Dropbox erscheint dort, wenn die Dropbox-App installiert ist) über Document Picker mit `fileAccessMode: 'scoped'` plus Security-Scoped Bookmark, damit der Ordner nach App-Neustart wieder da ist. Community: `tauri-plugin-ios-bookmark` (Beta) — evaluieren in Phase iPad, nicht in Phase 1.

iPad ist **Zielarchitektur**, nicht Release-1-Pflicht. Der Code darf keine Electron-Annahmen machen und muss Dateizugriff hinter einem `host`-Modul verstecken. Mehr steht in §16.

---

## 4. Produktprinzipien

1. **Die Datei ist die Wahrheit.** Kein verstecktes JSON-Dokumentformat. Wer das Projekt in VS Code öffnet, sieht lesbare `.mdx`.
2. **Ein Look.** App-Chrome und Dokument sind schwarz/weiß, eine Monospace-Schrift. Semantische Formatierung (fett, Überschrift, Zitat), keine visuelle Gestaltung.
3. **Drei Klicks bis zum Text.** Start → Ordner öffnen oder „Neues Projekt“ → Editor mit Fokus im ersten Kapitel.
4. **Ein Panel zu viel ist eines zu viel.** v1 hat: Kapiteliste links, Editor Mitte, optional schmale Bibliographie rechts. Keine Preview-Spalte.
5. **Geschlossener Dialekt.** Was die Toolbar nicht anbietet, existiert nicht.
6. **Export ist ein Vorgang, kein Modus.** Kein Live-PDF. Button, Datei, fertig.
7. **Zwei Vorlagen, nicht dreißig.** `blog` und `paper`.

---

## 5. Das Dateiformat (Constrained MDX)

### 5.1 Was auf der Platte steht

```mdx
---
title: "Schlaf und Aufmerksamkeit"
lang: de
---

Schlaf reduziert die **Reaktionszeit** nicht linear.[^1] Meta-Analysen zeigen
einen robusten Effekt auf Vigilanz [@lim2010sleep].

![EEG-Verlauf](../assets/eeg.png)

<Figure src="../assets/setup.png" alt="Laboraufbau" caption="Abbildung 1. Versuchsaufbau." />

[^1]: Operationalisiert über die Psychomotor Vigilance Task.
```

### 5.2 Erlaubte Konstrukte (v1)

| Konstrukt | Syntax | Toolbar |
|-----------|--------|---------|
| Frontmatter | YAML, Schlüssel siehe §6.4 | Projekt-Einstellungen, nicht Toolbar |
| Absätze | Normaltext | — |
| Überschriften | `#` `##` `###` | H1 H2 H3 |
| Fett / Kursiv | `**` `*` | B / I |
| Inline-Code | `` ` `` | `<>` |
| Link | `[text](url)` | Link |
| Liste | `-` / `1.` | Listen |
| Zitatblock | `>` | Quote |
| Codeblock | ` ```lang ` | Code |
| Tabelle | GFM | Tabelle |
| Trennlinie | `---` | — |
| Bild | `![alt](relpath)` | Bild |
| Figure | `<Figure src alt caption />` | Bild mit Caption |
| Fußnote | `[^id]` + `[^id]: …` | Fußnote |
| Zitat | `[@citekey]` oder `[@citekey, p. 12]` | Zitat |
| Kommentar HTML | nicht in der Toolbar, Round-Trip erhalten wenn möglich | nein |

Nicht in v1: Durchgestrichen, Highlight, Textfarbe, Alignment, Unterstreichung, Task-Listen, Definition Lists, Math, JSX-Ausdrücke, `import`.

### 5.3 Frontmatter-Felder

Gemeinsam:

```yaml
title: string
lang: de | en | de-CH | en-GB | …   # Spellcheck + Export-Sprache
description: string                 # optional, Blogs
```

Blog zusätzlich: `date`, `tags` (Liste), `draft` (bool).

Paper zusätzlich: nichts Pflicht — Autor, Abstract leben im ersten Kapitel oder in `project.yaml`. Kein zweites Metadaten-System erfinden.

Unbekannte Frontmatter-Keys **bleiben erhalten** (Round-Trip). Die App muss Blog-Felder nicht verstehen, um sie nicht zu zerstören.

### 5.4 Round-Trip-Regel

Jeder Save muss gelten:

```
parse(serialize(doc)) ≈ doc
```

Getestet mit einem Corpus (leere Absätze, nested lists, Tabellen, Footnotes, Citations, Figure, Umlaute, Windows-Zeilenenden). Verlust von unbekanntem Frontmatter oder von Hand geschriebenem Markdown-Spacing, das CommonMark nicht repräsentiert, ist dokumentiert — alles andere ist ein Bug.

Kein zweites intern gespeichertes TipTap-JSON. Wenn der Round-Trip weh tut, ist der Dialekt zu groß — dann Dialekt verkleinern, nicht einen JSON-Cache einführen.

---

## 6. Projektmodell auf der Platte

### 6.1 Kanonische Struktur

```
mein-projekt/
  project.yaml          # Manifest: Typ, Kapitel-Reihenfolge, CSL, Sprache
  chapters/
    01-einleitung.mdx
    02-methode.mdx
  assets/
    eeg.png
  references.bib        # darf fehlen (Blogs ohne Zitate)
  .easy-writing/
    lock.json           # Dropbox-Lock, gitignorieren
```

Blog-Kurzform (ein Artikel, keine Kapitel-Metapher in der UI):

```
mein-artikel/
  project.yaml          # type: blog, chapters: [index.mdx]
  index.mdx
  assets/
  references.bib        # optional
```

Die UI sagt bei `type: blog` nicht „Kapitel“, sondern blendet die Dateiliste einzeilig aus, solange nur eine Inhaltsdatei existiert. Sobald eine zweite Datei dazukommt, erscheint die Liste (Serie / Mehrteiler).

### 6.2 `project.yaml`

```yaml
schema: 1
type: blog | paper
title: "Schlaf und Aufmerksamkeit"
lang: de
citation:
  bibliography: references.bib      # relativ zum Projektroot
  csl: apa                          # id aus gebündelten Styles, oder relativer Pfad zu .csl
chapters:
  - chapters/01-einleitung.mdx
  - chapters/02-methode.mdx
```

Kapitel-Reihenfolge lebt **nur hier**, nicht in Dateinamen. Umbenennen der Datei ändert nicht die Reihenfolge. Drag in der UI schreibt `project.yaml`.

Kein `main.mdx` mit Imports. Imports wären MDX-Programmierung.

### 6.3 Zwei Scaffold-Vorlagen

**Blog**

- `index.mdx` mit Frontmatter `title`, `date`, `lang`
- leeres `assets/`
- kein `references.bib` (kann später „Bibliographie hinzufügen“)

**Paper**

- `chapters/01-abstract.mdx`, `02-einleitung.mdx`, `03-methode.mdx`, `04-ergebnisse.mdx`, `05-diskussion.mdx`
- leeres `assets/`
- leeres `references.bib` mit einem Kommentar, wie ein Eintrag aussieht
- `citation.csl: apa`

Keine Thumbnail-Galerie, keine 33 Looks. Ein Dialog: Name, Ordner, Typ.

### 6.4 Fremde Ordner öffnen

„Ordner öffnen“ darf auch einen nackten Ordner mit `.md`/`.mdx` laden:

1. Gibt es `project.yaml`? → Projekt öffnen.
2. Sonst: alle `.mdx`/`.md` im Root und in `chapters/` einsammeln, alphabetisch, `project.yaml` anbieten zu erzeugen (nicht still überschreiben).

Damit funktionieren existierende Blog-Ordner ohne Migrationsassistent.

---

## 7. Tech-Stack

| Schicht | Wahl | Nicht |
|---------|------|--------|
| Shell | Tauri 2 | Electron |
| Frontend | Vite 6 + Svelte 5 + TypeScript | SvelteKit, React |
| Editor | TipTap 3 + `@tiptap/markdown` + StarterKit | CodeMirror als Haupteditor, Milkdown |
| State | Svelte-Runes-Module (`*.svelte.ts`) | Redux, Stores-Legacy |
| FS / Dialog / Watcher | `@tauri-apps/plugin-fs`, `plugin-dialog`, `plugin-os` | Node `fs` im Frontend |
| BibTeX | Port von Penwright `bibParser.ts` | Zotero-Zwangskopplung in v1 |
| Citeproc (Export) | citation-js nur beim Export | citation-js im Editor, Typst |
| DOCX | `docx` (JS); optional Pandoc auf Desktop | TipTap Cloud |
| PDF | HTML + natives WebView-PDF | Typst, TeX Live, WeasyPrint |
| i18n | Eigene JSON-Module, Pattern von Penwright, zwei Dateien `de.ts`/`en.ts` | Paraglide (überdimensioniert für 2 Sprachen) |
| Spellcheck | `lang` + später nspell-Worker | LanguageTool-Server, Harper-only |
| Styles | Eine `app.css`, CSS-Variablen, keine Tailwind-Pflicht | Design-Tokens-Studio |
| Tests | Vitest (Round-Trip, Bib, Manifest) + später Playwright-Smoke | 10 Test-Skript-Kategorien wie Penwright |

Sidecars: **keine in v1.** Weder Typst noch Pandoc sind Voraussetzung zum PDF-Export. Pandoc darf später als optionales Desktop-Extra für Word dazukommen, sobald JS-DOCX an Grenzen stößt. iPad bekommt ohnehin keine Sidecar-Binaries.

---

## 8. Architektur

```
┌─────────────────────────────────────────────────────────┐
│  Svelte UI                                              │
│  StartScreen │ Shell (Kapitel │ Editor │ Bib-Panel)     │
└────────────┬───────────────────────────┬────────────────┘
             │ commands / events         │
             ▼                           ▼
┌────────────────────┐        ┌───────────────────────────┐
│  appState.svelte.ts│        │  editor (TipTap)          │
│  project, uiLang,  │◄──────►│  markdown serialize/parse │
│  dirty, chapters   │        │  citation + footnote nodes│
└────────┬───────────┘        └─────────────┬─────────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────────────────────────────────────────────┐
│  host/*  — einzige Stelle mit Tauri-Imports             │
│  files.ts  watch.ts  dialogs.ts  export.ts  spell.ts    │
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────┐
│  Tauri commands / plugins                               │
│  fs, dialog, watcher, native PDF (WKWebView.createPDF)  │
└─────────────────────────────────────────────────────────┘
```

### 8.1 Host-Grenze

Alles Native hinter `src/lib/host/`. Die UI kennt keine `invoke()`-Calls. Das ermöglicht:

- Unit-Tests mit einem Fake-Host
- iPad-Implementierung als zweiten Host ohne UI-Rewrite

### 8.2 Speichern

```
TipTap update
  → debounce 5s
  → serialize Markdown
  → write chapter file
  → set dirty=false

project.yaml-Änderungen (Reorder, Titel, CSL)
  → debounce 5s oder sofort bei explizitem Akt
  → write project.yaml
```

Zusätzlich: Flush bei Fenster-Blur, App-Quit, Kapitelwechsel.

Kein Save-Button im Normalbetrieb. Statuszeile: „Gespeichert“ / „Speichert…“ / „Konflikt (Datei geändert)“.

### 8.3 Konflikt mit Dropbox

Watcher feuert bei fremder Änderung:

- Wenn lokal nicht dirty: Datei neu laden.
- Wenn dirty: Banner „Die Datei wurde außerhalb geändert. Behalten / Neu laden.“ Kein stilles Überschreiben.

Lock: eine Datei `.easy-writing/lock.json` mit user, machine, timestamp, Heartbeat 30s, stale nach 2 min. Zweites Gerät sieht „Projekt auf MacBook geöffnet“ und öffnet trotzdem (Warnung, nicht hart sperren). Hartes Locking in Dropbox ist ohnehin verloren — Warnung reicht.

### 8.4 Ordnerstruktur im Repo (App-Code)

```
easy-writing/
  documentation/
    01_implementationsplan.md    # dieses Dokument
  src/
    app.css
    main.ts
    App.svelte
    lib/
      appState.svelte.ts
      i18n/
      host/
      project/          # yaml, scaffold, chapter order
      editor/           # tiptap setup, nodes, toolbar map
      bib/
      export/           # flatten → HTML/PDF/DOCX
  src-tauri/
    src/lib.rs
    tauri.conf.json
    src/pdf.rs          # natives WebView-PDF, kein Sidecar
  resources/
    csl/                # apa.csl, chicago-author-date.csl, …
    dictionaries/       # später nspell
    templates/          # blog / paper scaffold
```

---

## 9. UI — schwarz, weiß, Monospace, wenig

### 9.1 Visuelle Regeln

- Hintergrund `#fff` (oder System-Light). Text `#111`. Hairlines `#111` bei 1px oder `#ddd` für Trenner. Kein Grau-Dschungel, kein Accent-Blau, kein Dark-Mode in v1 (später optional, dann nur Invert).
- Eine Schrift: **IBM Plex Mono** oder **JetBrains Mono** (OFL, gut lesbar). App-UI und Editor identisch.
- Keine Schatten, keine Rundungen über 0–2px, keine Icons-Bibliothek mit 400 Glyphs. Toolbar: Textkürzel (`B`, `I`, `H1`, `Bild`, `Zitat`) plus wenige SVG-Linien-Icons.
- Dichte: viel Weißraum im Editor (max-width ~72ch, zentriert). Chrome schmal.

### 9.2 Surfaces (nur diese)

**Start**

- App-Name
- Button: Ordner öffnen
- Button: Neues Projekt (dann Mini-Dialog: Name, Zielordner, Blog/Paper)
- Liste letzter Projekte (Pfad, Typ, Datum) — Klick öffnet. Kein Auto-Open beim Start.
- Fußzeile: Sprache DE/EN

**Editor-Shell**

```
┌──────────┬─────────────────────────────┬─────────────┐
│ Kapitel  │  H1 H2 B I  List  Bild  FN  │ Literatur   │
│          │  ─────────────────────────  │             │
│ • Einl.  │                             │ Filter      │
│ • Meth.  │     Editor (Monospace)      │ @lim2010    │
│ + Neu    │                             │ @mayer2019  │
│          │                             │             │
│          │  Gespeichert · de · 842 W   │             │
└──────────┴─────────────────────────────┴─────────────┘
```

- Linke Spalte einklappbar. Drag-Reorder der Kapitel (`animate:`).
- Rechte Spalte einklappbar. Default bei `blog` ohne `references.bib`: zu. Bei Paper: auf.
- **Keine** dritte Spalte Preview.
- Menü (nativ, Tauri): Datei (Öffnen, Neu, Export), Bearbeiten, Ansicht (Panels), Einstellungen (UI-Sprache, später Diktat).

**Dialoge in v1 (maximal)**

1. Neues Projekt
2. Export (Format wählen, Zieldatei)
3. Einstellungen (UI-Sprache, optional Standard-CSL)
4. Bild einfügen (Datei wählen → Kopie nach `assets/`)
5. Zitat einfügen (falls Autocomplete nicht greift)
6. Unbekannte Datei-Änderung (Konflikt)

Kein Onboarding-Wizard. Kein Lizenzdialog. Kein Preset-Carousel.

### 9.3 Toolbar — 1:1 zum Dialekt

Reihenfolge:

`H1 · H2 · H3 | B · I · Code | Link | Liste · Nummer · Quote | Tabelle | Bild · Figure | FN · Zitat | Codeblock`

Aktiver Zustand sichtbar (fett, wenn Selection in H2). Keine Farbpalette. Kein Align. Kein Font-Size.

Slash-Menü (`/`): dieselben Befehle, für Tastaturmenschen. Keine Extra-Befehle, die die Toolbar nicht hat.

### 9.4 Tastatur

| Shortcut | Aktion |
|----------|--------|
| ⌘N | Neues Projekt (auf Start) / neues Kapitel (im Editor) |
| ⌘O | Ordner öffnen |
| ⌘S | Sofort speichern (Flush), obwohl Autosave läuft |
| ⌘E | Export-Dialog |
| ⌘B / ⌘I | Fett / Kursiv |
| ⌘K | Link |
| ⌘⇧F | Fußnote |
| ⌘⇧C | Zitat-Palette |
| ⌘1/2/3 | Überschrift |
| ⌘\ | Kapitel-Panel togglen |

---

## 10. Editor — Implementierungsdetails

### 10.1 Extensions (geschlossen)

- `@tiptap/starter-kit` (Headline, Lists, Code, Blockquote, HR; **ohne** Gapcursor-Exotik falls störend)
- `@tiptap/extension-link`
- `@tiptap/extension-table` (+ row/cell/header), GFM-Limits: eine Block-Kind-Node pro Zelle
- `@tiptap/extension-image` oder eigenes Image-Node mit relativem Pfad
- `Figure` Node → serialisiert als `<Figure … />`
- `Citation` Node → `[@key]` bzw. `[@key, p. 12]`
- `FootnoteReference` + `Footnotes` → Pandoc `[^id]`
- `@tiptap/markdown`
- `@tiptap/suggestion` für `@` (Citekeys) und `/` (Slash)
- Placeholder: „Schreiben …“ / „Start writing …“

Kein TextAlign, Color, Highlight, Underline, Subscript (außer Fußnoten-Markierung).

### 10.2 Bildfluss

1. Drag/Paste/Dialog.
2. Host kopiert nach `assets/<slug>-<kurzhash>.<ext>` (Dedup per Hash, wie Penwright — das war gut).
3. Editor insertet relativen Pfad vom Kapitel zur Asset-Datei.
4. Anzeige über Tauri convertFileSrc oder eigenes `asset://`-Protokoll. **Nie** Base64 in die MDX-Datei.

Löschen im Editor entfernt nicht automatisch die Datei (keine Überraschungen). „Ungenutzte Assets“ ist kein v1-Feature.

### 10.3 Kapitelwechsel

Beim Wechsel: Debounce canceln, aktuellen Buffer synchron schreiben, neuen Buffer parsen. TipTap `setContent` mit `contentAsMarkdown: true`. Eine Editor-Instanz, nicht eine pro Kapitel (weniger State-Hölle).

### 10.4 Outline

Kein extra Panel in v1. Die Kapiteliste **ist** die Navigation. Innerhalb eines Kapitels reicht die normale Scrollbar; H1/H2 sind im Text sichtbar. (Outline-Panel ist Penwright-Komfort, kein Muss zum Losschreiben.)

---

## 11. Zitate, Fußnoten, BibTeX

### 11.1 Bibliographie-Datei

- Default-Pfad: `references.bib` laut `project.yaml`.
- Nutzer kann eine vorhandene Datei wählen (Zotero Better BibTeX Auto-Export: den Pfad eintragen, Watcher lädt neu).
- Kein Zotero-Plugin in v1. Datei reicht.

### 11.2 Schreiben

- `@` im Text öffnet Suggestion: Filter über citekey, Autor, Titel, Jahr.
- Insert als Citation-Node, im Markdown `[@lim2010sleep]`.
- Optional Locator-Dialog (Seite): `[@lim2010sleep, p. 12]`.
- Hover: Titel, Autoren, Jahr, Journal — aus geparsten Feldern.
- Unbekannter Key: Chip mit Warnung, Save trotzdem erlaubt (Entwurf).

### 11.3 `.bib` bearbeiten

v1: nicht in der App. „Im Finder zeigen“ / „Datei öffnen“. Wer Einträge hinzufügt, nutzt Zotero oder einen Texteditor. Ein „Neuer Eintrag“-Formular ist v2-Kandidat (schnell komplex).

Einziger In-App-Weg in v1: **Datei zuweisen und reloaden.**

### 11.4 CSL

Gebündelt unter `resources/csl/`:

- `apa`
- `chicago-author-date`
- `chicago-note`
- `harvard-cite-them-right`
- `vancouver` (numerisch, falls Journals)

Auswahl in Projekt-Einstellungen. Eigene `.csl` im Projektordner möglich (`citation.csl: ./my.csl`).

Editor rendert **nicht** nach CSL um. Nur Export.

### 11.5 Fußnoten vs. Zitate

Zwei getrennte Werkzeuge:

- Fußnote = eigener Kommentar des Autors (`[^1]`).
- Zitat = Literatur (`[@key]`).

Chicago-Note setzt Zitate beim Export in den Fußnotenapparat. Das ist CSL-Sache, nicht Editor-Sache. Im Editor bleiben Zitate Chips.

---

## 12. Export

### 12.1 Flatten (alle Formate)

Funktion `flattenProject(project) → { markdown, resourcePath, bibliography, csl }`:

1. Kapitel in `project.yaml`-Reihenfolge lesen (aktueller Buffer, nicht veraltete Disk, wenn dirty).
2. Frontmatter: erstes Kapitel gewinnt für `title`/`lang`; Rest verwerfen oder als YAML-Block des Gesamtdokuments.
3. Relativpfade von Bildern und Figure auf Projektroot auflösen.
4. `<Figure>` → `![alt](src)\n\n*caption*`
5. Dateien konkatenieren, getrennt durch `\n\n`.

Ergebnis ist Flatten-Markdown. Daraus werden MD, HTML (für PDF) und DOCX gebaut. Das ist die einzige Export-Zwischenform.

### 12.2 Formate

| Format | Alle Plattformen (v1) |
|--------|------------------------|
| MDX | Kapitel kopieren oder Flatten als eine `.mdx` |
| MD | Flatten, Figure schon gewandelt |
| DOCX | JS-`docx`; Bilder einbetten, Zitate via citation-js vorab als Text |
| PDF | Flatten → HTML + Print-CSS → natives WebView-PDF |

Export-Dialog fragt: Format, welche Kapitel (alle / Auswahl), Zieldatei. Bilder als `file://` bzw. eingebettetes Data-URL im HTML, damit das PDF sie mitnimmt.

Pandoc ist **kein** v1-Pfad. Wenn JS-DOCX für ein Journal-Manuskript nicht reicht, kommt Pandoc als optionales Desktop-Extra — nicht als PDF-Engine.

### 12.3 MDX-Export für Blogs

Zwei Unteroptionen:

- **Projekt kopieren:** Ordnerstruktur + Assets, fertig zum Commit ins Blog-Repo.
- **Eine Datei:** Flatten + Assets-Ordner daneben. Relativpfade anpassen.

Default für `type: blog`: Projekt kopieren. Default für `type: paper`: Flatten.

### 12.4 PDF ohne Satzsystem

Kein Typst, kein LaTeX, kein WeasyPrint. Der PDF-Look ist derselbe Schwarz/Weiß-Monospace-Look wie der Editor, plus A4-Print-CSS (Ränder, Seitenumbruch vor H1, Bildunterschriften). Wer Magazin-Typografie will, exportiert MDX und macht das in Penwright oder Word — nicht hier.

Technisch: offscreen WebView, HTML laden, `createPDF` (macOS/iOS). `window.print()` in Tauris WKWebView nicht als Hauptweg nutzen.

---

## 13. Autosave, Dropbox, Vertrauen

- Debounce: **5 Sekunden** nach letzter Änderung (`editor.on('update')`).
- Flush: Kapitelwechsel, Blur, Quit, ⌘S.
- Schreiben atomar: in Tempdatei schreiben, dann rename (Dropbox verträgt das besser als Truncate-in-place).
- Watcher ignoriert eigene Writes (kurze Ignore-Liste nach Pfad+mtime).
- `.easy-writing/` in einem Projekt-`.gitignore` anlegen, falls Git-Repo existiert — aber Git-UI bauen wir nicht.
- Keine Auto-Backups-Kopie alle N Minuten in v1. Die Datei *ist* das Backup, plus Dropbox-Versionierung. Crash-Recovery = letzter erfolgreicher Write; unsaved Buffer zusätzlich in `os.tmpdir` nur wenn dirty > 2s und App crasht — optional, nicht Blocker.

---

## 14. Rechtschreibung

- Jedes Dokument/Projekt hat `lang`. Default neu: UI-Sprache.
- Editor-Root: `spellcheck="true"` und `lang="de"` / `en` usw.
- Sprache umschalten: Projekt-Einstellung, sofort am Editor.
- Sprachen v1: `de`, `en-US`, `en-GB`. Weitere Dicts später.
- Kein rot-unterstrichenes UI-Chrome (nur Dokument).
- v1.1: nspell im Worker, Decorations als Plugin, Wörterbuch „zum Projekt hinzufügen“ = `project.dic` (eine Wortliste).

---

## 15. Internationalisierung der Menüs

- Zwei Dictionaries: `src/lib/i18n/de.ts`, `en.ts`. Keys flach oder leicht gruppiert (`toolbar.bold`, `start.openFolder`).
- `locale` in App-Config (`$APPDATA/settings.json`), nicht im Projekt.
- Umschalten sofort, ohne Restart.
- Native Menüs (Tauri Menu API) beim Switch neu aufbauen.
- Dokument-Sprache ≠ UI-Sprache. UI Englisch + Paper auf Deutsch ist der Normalfall.

Kein drittes Locale in v1. Strings nicht im Component-Markup hardcoden.

Pattern darf an Penwright `src/shared/i18n/` angelehnt sein, aber **eine** Datei pro Sprache, nicht 25 Module. Die App ist klein.

---

## 16. iPadOS (Zielarchitektur, nicht v1-Gate)

Apple trennt iOS und iPadOS marketingtechnisch. Für uns gilt: **ein iOS-Build, läuft auf dem iPad.** Tauri hat kein eigenes `ipad`-Target. `tauri ios init` erzeugt ein Universal-Xcode-Projekt (`TARGETED_DEVICE_FAMILY = 1,2`). Das reicht, damit die App auf dem iPad nativ (nicht im iPhone-Kompatibilitätsrahmen) läuft.

Was Tauri **kann:** WKWebView-App, Rust-Commands, Files-Picker, TestFlight/App Store.

Was der harte Teil ist (nicht „geht Tauri auf iPad?“, sondern „geht unser Dateimodell?“):

- Sandbox: Dropbox-Ordner nur über Files-App + Security-Scoped Bookmark, nicht als beliebigen POSIX-Pfad.
- Keine Sidecar-Binaries (deshalb PDF nativ, nicht Pandoc/Typst).
- Touch, Pointer, Split View, Tastatur: Web-UI muss ohne Hover leben.
- Apple Pencil ignorieren wir in v1.

### 16.1 Was der Desktop-Code jetzt schon tun muss

- Kein Node-`fs`, kein Electron.
- Keine Hover-only-Aktionen. Toolbar immer sichtbar oder Long-Press.
- Touch: Kapitel-Drag mit Handle, nicht mit der ganzen Zeile.
- Export ohne Sidecar-Annahme. PDF-Command muss auf `ios` kompilieren.

### 16.2 iPad-spezifisch (eigene Phase)

- Files-App-Ordner mit scoped access + Bookmark.
- Tastatur-Shortcuts wo verfügbar, primär Buttons.
- PDF = derselbe native WebView-Weg wie auf dem Mac.
- Dropbox = Ordner in Files, nicht Dropbox-SDK.

v1 shippet **macOS**. Windows/Linux folgen, sobald macOS sitzt. iPad, wenn der Host-Layer steht und Schreiben auf dem Desktop langweilig-stabil ist.

---

## 17. Phasenplan

Jede Phase endet mit etwas, das man **öffnen und benutzen** kann. Keine Phase „Infrastruktur ohne Textfeld“.

### Phase 0 — Gerüst (ca. 1–2 Tage)

- `create-tauri-app` → Svelte + TS
- Schwarz-weißes CSS, Monospace, Start-Screen-Dummy
- Tauri-Plugins: fs, dialog
- Host-Modul-Skelett
- i18n DE/EN mit 10 Strings, Umschalter

**Done:** Fenster öffnet, Sprache wechselt, noch ohne Editor.

### Phase 1 — Eine Datei, schreiben, Autosave

- TipTap + Markdown-Extension
- Ordner öffnen / eine `.mdx` laden
- Toolbar: H1–H3, B, I, Listen, Quote, Code, Link
- Autosave 5s auf dieselbe Datei
- Statuszeile

**Done:** Man schreibt einen Blogabsatz und findet ihn in Dropbox wieder.

### Phase 2 — Projektmodell

- `project.yaml` lesen/schreiben
- Scaffold Blog / Paper
- Kapitelliste, anlegen, umbenennen, löschen, Drag-Reorder
- Letzte Projekte auf dem Startscreen
- Watcher + Konflikt-Banner
- Lockfile (weich)

**Done:** Paper mit fünf Kapiteln, Reihenfolge ändern, Dropbox-sync.

### Phase 3 — Bilder

- Insert, Copy nach `assets/`, relative Pfade
- Figure-Node
- Paste aus Clipboard
- Anzeige im Editor

**Done:** Artikel mit zwei Bildern, Dateien liegen im Ordner.

### Phase 4 — Zitate und Fußnoten

- `references.bib` Watch + Parser (Penwright-Port)
- Citation-Node, `@`-Suggest, Hover
- Fußnoten
- CSL-Auswahl in Projekt-Settings
- Bib-Panel

**Done:** Satz mit `[@key]` und Fußnote, Datei ist gültiges Pandoc-Markdown.

### Phase 5 — Export Desktop

- Flatten
- HTML-Export mit citation-js
- natives WebView-PDF
- JS-DOCX
- MD / MDX copy/flatten
- Bilder im Export sichtbar

**Done:** Paper als DOCX und PDF, Bibliographie stimmt grob, Bilder drin.

### Phase 6 — Sprachen und Rechtschreibung

- Native Spellcheck über `lang` - hier gleich v1.1 einbauen über nspell.
- Restliche UI-Strings
- Native Menüs i18n
- Optional Start nspell, wenn native Unterstreichung auf macOS fehlt

**Done:** UI Englisch, Dokument Deutsch, rote Linien unter Tippfehlern.

### Phase 7 — Härten

- Round-Trip-Corpus-Tests
- Atomare Writes, Watcher-Ignore
- Quit-Flush, Crash-Temp
- Kleiner Testdurchlauf: Blog-Artikel + Paper mit 10 Sources

### Phase 8 — iPad (nach stabilem Desktop)

- iOS-Target, scoped folder, Bookmarks
- Touch-UI-Anpassungen
- JS-Export-Fallbacks
- Keine neuen Schreib-Features in derselben Phase

---

## 18. Explizit nicht in v1

| Thema | Warum nicht |
|-------|-------------|
| Design-Tokens, Themes, Fonts, Farben | Penwright-Falle |
| Live-PDF / Zweispalter-Preview | Zweite Wahrheit |
| Beliebiges MDX/JSX | Compiler-Falle |
| Mathematik | Nicht die Domain |
| Kommentare, Git-UI, MCP, AI | Ablenkung |
| Zotero-Plugin, Bib-Eintragsformular | Datei reicht |
| Dark Mode | Später, wenn der helle ruhig ist |
| Sync-Backend, Accounts, Cloud außer Dropbox-Ordner | Overkill |
| Windows-Polish, Linux-Polish | Nach macOS |
| Plugin-API | Nein |

Wenn etwas aus dieser Liste gebraucht wird, kommt ein neues Dokument `02_…`, das dieses hier nicht stillschweigend aufweicht.

---

## 19. Tests — klein, aber die richtigen

Nicht Penwrights Testmatrix kopieren. Drei Ebenen:

1. **Round-Trip-Corpus** (`src/lib/editor/corpus/`): je eine `.mdx` für Listen, Tabellen, Umlaute, Citations, Footnotes, Figure, Frontmatter-Passthrough. `parse → serialize → parse` gleich.
2. **Flatten/Export-Unit:** Bildpfade, Kapitel-Reihenfolge, fehlende `.bib`.
3. **Bib-Parser:** ein paar reale Psychology-Einträge (article, book, incollection, Umlaute).

Manuell vor jedem „kann man schreiben“-Meilenstein: ein Artikel in einem Dropbox-Ordner, App killen, App öffnen, Text noch da.

---

## 20. Wiederverwendung aus Penwright

Kopieren und anpassen (nicht das Repo als Abhängigkeit):

| Quelle | Ziel |
|--------|------|
| `src/shared/bibParser.ts` | `src/lib/bib/parse.ts` |
| i18n-Idee (Map + `t()` + Locale-State) | `src/lib/i18n/` — aber eine Datei/Sprache |
| Lockfile-Idee | `src/lib/host/lock.ts` — ein Lock pro Projekt |
| Asset-Hash-Dedup | `src/lib/host/assets.ts` |
| Citation-Suggest-UX (nicht Typst-Node) | neu in TipTap, Verhalten analog |

Nicht kopieren: Deserializer, Design, Compiler, MCP, Electron-IPC, App.svelte-Monolith.

---

## 21. Offene Punkte — bewusst wenige

Diese Dinge entscheidet die Implementierung, sobald Phase 1 läuft. Sie blockieren den Start nicht:

1. Konkrete Monospace-Datei (Plex vs. JetBrains) — beide OFL, im Gerüst austauschbar.
2. Ob Blog mit einer Datei `index.mdx` oder `chapters/01.mdx` auf der Platte beginnt. UI versteckt die Unterscheidung.
3. nspell schon in Phase 6 oder erst wenn native Spellcheck auf dem Mac-WebView versagt.
4. iOS-Bookmark-Plugin vs. selbst Security-Scoped wrappen — Phase 8.
5. Ob Pandoc später als optionales Desktop-Extra für Word dazukommt. PDF bleibt trotzdem HTML→WebView.

Nicht offen: Dialekt-Umfang, kein Design-Studio, kein SvelteKit, kein Electron, kein Live-PDF, **kein Typst**.

---

## 22. Definition of Done für v1

Die App ist v1, wenn René:

1. die App öffnet und in unter zehn Sekunden in einem Dropbox-Ordner schreibt,
2. einen Blogartikel mit Überschriften, Links, zwei Bildern speichert und als `.mdx` plus `assets/` in ein Blog-Repo legen kann,
3. ein Paper mit Kapiteln umsortiert, zehn BibTeX-Keys zitiert, eine Fußnote setzt und ein DOCX/PDF mit Bibliographie und Bildern bekommt,
4. die Oberfläche auf Englisch stellen kann, während das Dokument auf Deutsch geprüft wird,
5. keine Design-Einstellungen suchen muss, weil es sie nicht gibt.

Alles darüber ist eine andere Anwendung.
