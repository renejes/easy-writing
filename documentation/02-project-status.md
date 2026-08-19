# Easy Writing — Projektstatus

**Stand:** 19. August 2026  
**Version:** 0.1.0  
**Leitsatz:** Aufmachen. Schreiben. Speichern. Exportieren.

Dieses Dokument beschreibt, **wo die App steht** und **wie die wichtigen Teile gebaut sind**. Der verbindliche Plan bleibt [`01_implementationsplan.md`](01_implementationsplan.md).

---

## 1. Kurz

Easy Writing ist eine Tauri-2-App mit Svelte 5 und TipTap 3. Ein Ordner ist das Projekt, `.mdx` auf der Platte ist die Wahrheit.

| Plattform | Schreiben | Dropbox | Export |
|-----------|-----------|---------|--------|
| macOS | ja | ja (POSIX-Pfad) | PDF, DOCX, MD, MDX |
| iPad | ja | ja (Files-App + Bookmark) | DOCX, MD, MDX |
| Windows / Linux | nicht in dieser Phase | — | — |

Phase 0–7 (Desktop) und Phase 8 (iPad-Schreiben) sind umgesetzt. PDF auf iOS und PencilKit sind bewusst nicht dabei.

---

## 2. Was geht

### Mac und iPad gemeinsam

- Ordner öffnen oder anlegen (Vorlagen Blog / Paper)
- Autosave nach 5 s, ⌘S / Flush beim Kapitelwechsel und beim Beenden
- Kapitel: anlegen, umbenennen, löschen, Reihenfolge per Handle
- Toolbar: H1–H3, Fett/Kursiv/Code, Listen, Quote, Tabelle, Link, Bild, Figure, Zitat, Fußnote
- Bilder: Picker, Paste und Drop kopieren nach `assets/` (Hash-Dedup)
- Zitate aus `references.bib` (`[@key]`, Locator), Fußnoten `[^id]`
- Rechtschreibung de / en-US / en-GB (nspell), UI Deutsch oder Englisch
- Weiches Projekt-Lock, Konfliktbanner, Crash-Temp
- Zuletzt geöffnete Projekte

### Nur Mac

- Nativer PDF-Export (offscreen WKWebView → `createPDF`)
- Native Menüs

### Nur iPad

- Ordnerwahl über Files (Dropbox erscheint dort, wenn die Dropbox-App installiert ist)
- Security-Scoped Bookmarks: nach App-Kill wieder über **Zuletzt geöffnet**
- Touch: keine klebenden Hover-States, Safe Area, 44pt-Trefferflächen, Sidebar als Overlay im Hochformat, Toolbar seitlich scrollbar
- Apple Pencil: **Scribble** (Handschrift → getippter Text) im Editor, ohne extra Code. Getestet, kein PencilKit.

---

## 3. Architektur

```text
Svelte-UI  →  $lib/session.ts  →  $lib/host/*  →  Tauri-Plugins / Rust
TipTap     →  serialize → .mdx auf der Platte
```

- **Kein Node-`fs`, kein Electron.** Dateizugriff nur in `$lib/host/`.
- **Desktop:** `@tauri-apps/plugin-fs` und `plugin-dialog` mit POSIX-Pfaden.
- **iOS:** virtuelle Pfade `scoped:<folderId>/relativer/pfad` über `tauri-plugin-scoped-storage` (vendored unter `src-tauri/vendor/`, weil der Upstream den Security-Scope zu früh freigab).
- JS entscheidet anhand des Präfixes `scoped:`, welcher Weg gilt (`files.ts`, `scopedPath.ts`).

Der Editor kennt keine Sandbox. Er bekommt Pfade vom Host und serialisiert Markdown.

---

## 4. Wie die iPad-Teile sitzen

### 4.1 Ordnerzugriff

`@tauri-apps/plugin-dialog` hat auf iOS **keinen Ordner-Picker**. Stattdessen `pickFolder()` aus scoped-storage. Der Handle ist eine UUID plus Bookmark; die App merkt sich `scoped:<id>` plus URI, damit Recents nicht bei jedem Picker-Aufruf duplizieren.

Lese-/Schreibzugriff läuft mit `NSFileCoordinator` und gehaltenem Security-Scoped Access (Fix im vendored Plugin: Access nicht im `defer` vor Ende der Operation schließen).

`Info.ios.plist`: `LSSupportsOpeningDocumentsInPlace`, `UIFileSharingEnabled`.

### 4.2 Lock

Ursprünglich `.easy-writing/lock.json`. iOS Files / Dropbox macht aus Punkt-Ordnern **Unknown File.easy-writing**.

Jetzt: eine Datei im Projektroot, `easy-writing.lock.json`. Alte Sidecars werden noch gelesen und beim Freigeben entfernt. Heartbeat 30 s, stale nach 2 min. Gerätelabel unterscheidet iPad und Mac.

### 4.3 Bilder

In der `.mdx` stehen relative Pfade (`assets/…` bzw. `../assets/…`). Am Mac lädt `convertFileSrc` sie. `scoped:`-Pfade kann das WebView nicht so öffnen — der Editor liest die Bytes und setzt Blob-URLs (`assetSrc.ts`). Beim Schließen des Projekts werden die Blobs freigegeben. Einfügen kopiert immer nach `assets/`; man muss nichts vorher dorthin legen.

### 4.4 Touch und Viewport

- Hover-Invert nur unter `(hover: hover) and (pointer: fine)`
- `viewport-fit=cover`, Safe Area, `--app-height` aus `visualViewport` (Tastatur)
- Unter 64rem: Kapitel-/Literatur-Leiste als Overlay, Toggle in der Kopfzeile
- Grober Pointer: Toolbar `overflow-x: auto` statt mehrzeiligem Umbruch

### 4.5 Pencil

Scribble ist System. TipTap ist `contenteditable` in WKWebView — Handschrift wird zu Text und landet in der Datei. Kein Ink-Overlay, keine zweite Wahrheit. PencilKit bleibt draußen.

### 4.6 Export auf iOS

DOCX (JS-`docx`), Markdown und MDX (Kopie/Flatten) brauchen keine Sidecar-Binary. PDF kompiliert auf iOS nicht denselben macOS-WKWebView-Weg; die UI sagt das. Bewusste Entscheidung, kein fehlender Fallback.

---

## 5. Dateien, die man kennen sollte

| Bereich | Ort |
|---------|-----|
| Host-I/O | `src/lib/host/files.ts`, `dialogs.ts`, `scopedPath.ts` |
| Lock | `src/lib/host/lock.ts`, `lockNames.ts` |
| Session / Recents | `src/lib/session.ts`, `src/lib/project/recent.ts` |
| Editor | `src/lib/editor/createEditor.ts`, `markdownRoundtrip.ts` |
| Bilder im Editor | `src/lib/editor/assetSrc.ts`, `insertImage.ts`, `src/lib/host/assets.ts` |
| iOS-Plugin | `src-tauri/vendor/tauri-plugin-scoped-storage/` |
| PDF (nur macOS) | `src-tauri/src/pdf.rs` |
| Capabilities | `src-tauri/capabilities/default.json`, `ios.json` |

---

## 6. Entwickeln auf dem Gerät

Dev-Build lädt die UI vom Vite-Server auf dem Mac. Mac und iPad müssen im **selben WLAN** sein:

```bash
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
export APPLE_DEVELOPMENT_TEAM=<Team-ID>
npx tauri ios dev --host <LAN-IP> "<Gerätename>"
```

Ein Release-IPA (`tauri ios build`) bündelt das Frontend. Dann kein Mac, kein gemeinsames WLAN.

---

## 7. Nicht in dieser Version

Aus dem Plan, unverändert: Design-Tokens, Live-PDF, Mathematik, Kommentare, Zotero-UI, Dark Mode, Accounts, Plugin-API, Windows-/Linux-Polish.

Zusätzlich festgehalten:

- kein PDF-Export auf dem iPad
- kein PencilKit
- keine neuen Schreib-Features parallel zur iPad-Arbeit

---

## 8. Nächster sinnvoller Schritt

Der Schreibweg Mac + iPad ist nutzbar. Offen sind Dinge **außerhalb** dieses Weges: Windows/Linux, optional später PDF auf iOS, wenn es denselben nativen WebView-Weg wie am Mac geben soll — nicht als JS-Ersatz.
