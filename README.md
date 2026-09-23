# AppLingua

Gamifizierter Sprachcoach für **Spanisch** (Varianten Spanien und Lateinamerika) und **brasilianisches
Portugiesisch** als Progressive Web App. Die Oberfläche ist komplett auf Deutsch und für das iPhone
(Safari) gebaut, läuft aber in jedem aktuellen Browser. Gespeichert wird zuerst lokal, die Cloud ist
optional.

> **Lokaler Modus ist der Standard.** Ohne Supabase-Konfiguration funktionieren alle Lernfunktionen
> dauerhaft im Browser (IndexedDB). Konten, Geräte-Sync und der KI-Coach sind dann ehrlich als
> „nicht eingerichtet“ gekennzeichnet, und die Supabase-Bibliothek wird gar nicht erst geladen.

## Funktionen

- **Lernpfad**: getrennte Kurse. Spanisch hat 18 Lektionen (14 Einstieg, 4 A1), Portugiesisch 7 Lektionen
  im Einstieg. Dazu Kapitelprüfungen, Boss-Prüfungen und ein optionaler Einstufungstest.
- **Übungen**: Auswahl, Lückentext, Satzbau, Übersetzen, Diktat, Konjugieren, Fehler finden, Zuordnen,
  Minimalpaare, Dialoge, freies Schreiben, Hören und Sprechen. Die Bewertung toleriert Akzente und
  Tippfehler und erklärt Fehler auf Deutsch.
- **Wiederholung**: Vokabelkarten mit Spaced Repetition, Fehlerarchiv, Grammatikzentrum mit drei Stufen
  je Thema.
- **Aussprache-Labor** mit der Spracherkennung des Browsers. Angezeigt wird die „Verständlichkeit laut
  Spracherkennung“, keine phonetische Analyse. Ohne Mikrofon gibt es Selbsteinschätzung sowie
  „Aufnehmen & vergleichen“.
- **Songs**: 6 selbst erstellte Demo-Lernlieder (Begleitmusik per Web Audio, Gesang per Sprachausgabe)
  mit 8 Modi, von Mitlesen und Karaoke über Lückentext bis Aussprache. Dazu Song-Übungen, Favoriten und
  Playlists. Eigene Liedtexte lassen sich zur privaten Analyse einfügen. Offizielle Einbettungen
  (YouTube/Spotify/Apple Music) werden erst nach Einwilligung geladen.
- **KI-Gesprächspartner** mit 15 Szenarien. Offline laufen geskriptete Dialoge, mit Cloud und KI-Schlüssel
  antwortet Claude über die Edge Function `ai-coach`.
- **Gamification**: XP, Spielerlevel, Serien, Tagesziel, Missionen und Abzeichen. Das Sprachniveau
  (A1 …) wird davon getrennt geführt und nur durch Nachweise vergeben.
- **PWA**: installierbar und offline nutzbar (siehe [Offline & Caching](docs/ARCHITECTURE.md#offline--caching-service-worker-viteconfigts)),
  mit Update-Hinweis, Datenexport als JSON und hellem/dunklem Design.

## Tech-Stack

React 19, TypeScript, Vite 8 (Rolldown), React Router 7, Zustand 5, `idb` (IndexedDB),
`vite-plugin-pwa`/Workbox, lucide-react. Optional Supabase (Auth, Postgres mit RLS, Edge Functions
in Deno). Tests: Vitest + Testing Library + fake-indexeddb, Playwright (WebKit-iPhone-Profile + Chromium).

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm ci
npm run dev          # http://localhost:5173 (lokaler Modus)
npm run build        # Produktions-Build nach dist/ (inkl. Sicherheits-Check scripts/postbuild.mjs)
npm run preview      # Build lokal ansehen (Service Worker aktiv)
```

Für Cloud-Funktionen `.env.example` nach `.env.local` kopieren und ausfüllen (siehe
[docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md)).

## Tests

```bash
npx tsc -p tsconfig.json --noEmit   # Typecheck
npm test                            # Unit- und Komponententests (Vitest)
npx playwright install webkit chromium   # einmalig
npm run test:e2e                    # E2E gegen einen eigenen Produktions-Build (Port 4317)
```

Die E2E-Tests laufen in den Profilen iPhone 15, iPhone SE, iPhone 15 Pro Max (WebKit) und Desktop-Chromium.
Die Offline-Tests laufen nur in Chromium, weil Playwright-WebKit unter Windows/Linux keine
Offline-Navigationen aus dem Service Worker ausliefert.

## Projektstruktur

```
src/core/       Typen (Domäne, Speicherung)
src/data/       Store, IndexedDB, Sync, Auth, Supabase (lazy), Export, Gast→Konto
src/engine/     reine Logik: Bewertung, SRS, XP/Level, Serien, Freischaltungen, Missionen
src/state/      React-Hooks und Aktionen auf Basis von Store und Engine
src/speech/     Sprachausgabe, Spracherkennung, Aufnahme, Aussprachebewertung
src/content/    Kursinhalte es/, pt-BR/, Demo-Songs, Inhaltsvalidierung
src/features/   Seiten (Lernpfad, Lektion, Prüfungen, Songs, Partner, …)
src/ui/ src/app/ src/styles/   UI-Kit, App-Shell, Design-System
src/ai/         Client für den KI-Coach
supabase/       Migration (user_records, ai_usage), Edge Functions ai-coach und delete-account
e2e/            Playwright-Tests
scripts/        postbuild (404.html, Secret-Scan, CSP-Abgleich), Icon-Generator
docs/           Architektur, Einrichtung, Deploy, iPhone, Songs & Recht
```

## Lokaler Modus oder Cloud

| | Lokaler Modus (Standard) | Mit Supabase |
|---|---|---|
| Lernen, Songs, Übungen, Offline-Partner | ja | ja |
| Speicherung | IndexedDB auf diesem Gerät | zusätzlich im Konto (Sync zwischen Geräten) |
| Konto, Passwort-Reset, Konto löschen | nein, mit Hinweis | ja |
| KI-Partner, KI-Erklärungen | nein, Offline-Fallback | ja, mit `ANTHROPIC_API_KEY` als Supabase-Secret |
| Sign in with Apple | nein | optional |

## Benötigte externe Zugangsdaten

| Wofür | Was | Wo |
|---|---|---|
| Konten und Sync | Supabase Project URL + anon/publishable key (öffentlich) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (GitHub-Repo-Variablen bzw. `.env.local`) |
| KI-Coach | Anthropic-API-Schlüssel | **nur** als Supabase-Secret `ANTHROPIC_API_KEY`, nie im Frontend |
| Apple-Anmeldung (optional) | Apple Developer Account (Services-ID, Key) | Supabase Auth → Apple, dazu `VITE_ENABLE_APPLE_LOGIN=true` |
| Lizenzierte Liedtexte (optional) | Vertrag mit einem Lyrics-Anbieter | eigene Edge Function, siehe [docs/SONGS-RECHTLICHES.md](docs/SONGS-RECHTLICHES.md) (nicht implementiert) |
| Tiefere Spotify- oder Apple-Music-Integration (optional) | Entwicklerzugänge | nicht implementiert; die Einbettungen brauchen keinen Schlüssel |

## Bekannte Grenzen

- **Kursumfang**: A1 ist bei Spanisch erst begonnen, Portugiesisch hat nur den Einstieg.
- **Offline-Partner**: Die geskripteten Dialoge erkennen Antworten über Schlüsselwörter, ohne Verneinung zu
  verstehen („Sí, pero no puedo“ kann als Zusage zählen). Freie Gespräche gibt es nur mit KI.
- **Aussprache**: Bewertet wird die Verständlichkeit laut Spracherkennung, keine Phonetik. Auf dem iPhone
  läuft die Erkennung nur im Safari-Tab zuverlässig (siehe [docs/IPHONE.md](docs/IPHONE.md)).
- **Speicherung ohne Konto**: Daten liegen nur in diesem Browser. Home-Bildschirm-App und Safari-Tab haben
  getrennte Speicher. Wird direkt nach einer Aktion hart neu geladen (innerhalb von Millisekunden), kann
  die letzte Änderung fehlen.
- **GitHub Pages** kann keine HTTP-Header setzen: Die CSP kommt als `<meta>`-Tag, `frame-ancestors` fehlt
  dort (bei Vercel/Netlify gesetzt).
- **Liedtexte Dritter** sind nicht enthalten. Es gibt nur eigene Demo-Lieder und privat eingefügte Texte.

## Dokumentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Architektur, Datenhaltung, Sync, Offline-Strategie
- [docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md): Cloud einrichten (Konten, Sync, KI)
- [docs/DEPLOY.md](docs/DEPLOY.md): GitHub Pages (Standard), Vercel, Netlify
- [docs/IPHONE.md](docs/IPHONE.md): Installation, Stimmen, Mikrofon, bekannte iOS-Grenzen
- [docs/SONGS-RECHTLICHES.md](docs/SONGS-RECHTLICHES.md): Liedtexte, Lizenzen, Einbettungen
