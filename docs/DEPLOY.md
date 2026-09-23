# Deploy

AppLingua ist eine statische SPA mit Service Worker. Jeder Hoster für statische Dateien funktioniert,
sofern unbekannte Pfade (`/lernpfad`, `/auth/callback?code=…`) die App ausliefern. Konfiguriert sind:
**GitHub Pages** (Standard), **Vercel** und **Netlify**.

Die Supabase-Variablen sind optional. Ohne sie läuft die App im lokalen Modus
([SETUP-SUPABASE.md](SETUP-SUPABASE.md)). Sie werden **beim Build** eingebettet, also muss nach jeder
Änderung neu gebaut werden.

| Variable | Pflicht | Hinweis |
|---|---|---|
| `VITE_BASE_PATH` | nur GitHub Pages | `/AppLingua/`. Wird nur als Umgebungsvariable des Build-Prozesses gelesen, **nicht** aus `.env`-Dateien |
| `VITE_SUPABASE_URL` | nein | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | nein | öffentlicher anon/publishable key (alternativ `VITE_SUPABASE_PUBLISHABLE_KEY`) |
| `VITE_ENABLE_APPLE_LOGIN` | nein | `true` nur, wenn Apple in Supabase Auth eingerichtet ist |

Geheime Schlüssel (`ANTHROPIC_API_KEY`, `service_role`, `sb_secret_…`) gehören **nie** in diese Variablen.
`scripts/postbuild.mjs` bricht den Build ab, wenn so etwas im Bundle landet.

## GitHub Pages (Standard)

Workflow: `.github/workflows/deploy.yml`. Bei jedem Push auf `main` (oder manuell über *Run workflow*)
laufen `npm ci`, `npm test` und `npm run build` mit `VITE_BASE_PATH=/AppLingua/`, danach wird `dist/`
veröffentlicht.

1. Repository auf GitHub anlegen und pushen (Projektseite: `https://<user>.github.io/AppLingua/`).
   Heißt das Repo anders, `VITE_BASE_PATH` im Workflow anpassen, z. B. `/<repo>/`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Optional für die Cloud: **Settings → Secrets and variables → Actions → Variables** (nicht *Secrets*):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, ggf. `VITE_ENABLE_APPLE_LOGIN`. Danach den Workflow
   neu starten.
4. In Supabase die Site-/Redirect-URLs und `ALLOWED_ORIGINS` auf die Pages-Adresse setzen
   ([SETUP-SUPABASE.md](SETUP-SUPABASE.md), Schritte 3 und 4).

So funktionieren Deep-Links auf Pages: `postbuild` kopiert `index.html` nach `404.html`. Pages liefert
diese Datei für unbekannte Pfade aus (HTTP-Status 404, Inhalt ist die App). Pfad, Query und Hash bleiben
erhalten, deshalb klappen auch `…/auth/callback?code=…` und `…/passwort-neu?code=…`. Nach dem ersten
Besuch bedient der Service Worker alle Navigationen direkt. `.nojekyll` wird ebenfalls erzeugt.

Grenzen von Pages: Eigene HTTP-Header sind nicht möglich. Die Content-Security-Policy kommt als
`<meta>`-Tag, `frame-ancestors` (Clickjacking-Schutz) wirkt nur als Header und fehlt auf Pages.

Lokal nachprüfen:

```bash
MSYS_NO_PATHCONV=1 VITE_BASE_PATH=/AppLingua/ npm run build   # MSYS_NO_PATHCONV nur in Git-Bash unter Windows
```

`dist/` muss dann unter `/AppLingua/` ausgeliefert werden, und fehlende Pfade müssen `404.html`
bekommen. `vite preview` kann das nicht exakt nachbilden. Geprüft wurden (Chromium, Nachbau des
Pages-Verhaltens): Deep-Link `/AppLingua/lernpfad` lädt die App, Manifest (`id` `/AppLingua/`,
`start_url`/`scope` `./`), alle Icons 200, Service Worker mit Scope `/AppLingua/`, unbekannte Pfade
liefern die App, und nach dem ersten Besuch lädt `/AppLingua/lernpfad` auch offline.

## Vercel

`vercel.json` ist fertig: Vite-Preset, `npm ci`, `npm run build`, Ausgabe `dist`, SPA-Rewrite auf
`/index.html`, Sicherheits-Header inkl. CSP mit `frame-ancestors 'none'`, `sw.js` ohne Cache.

1. Projekt in Vercel importieren (Framework wird erkannt).
2. `VITE_BASE_PATH` **nicht** setzen (Basis `/`).
3. Optional unter *Settings → Environment Variables* die Supabase-Variablen eintragen und neu deployen.
4. Supabase: Vercel-Domain zu Redirect-URLs und `ALLOWED_ORIGINS` hinzufügen.

## Netlify

`netlify.toml` ist fertig: `npm run build`, Ausgabe `dist`, Node 22, SPA-Redirect (Status 200),
dieselben Header wie bei Vercel.

1. Site aus dem Repository anlegen. Die Einstellungen kommen aus `netlify.toml`.
2. `VITE_BASE_PATH` nicht setzen.
3. Optional die Supabase-Variablen unter *Site configuration → Environment variables* eintragen.
4. Supabase: Netlify-Domain zu Redirect-URLs und `ALLOWED_ORIGINS` hinzufügen.

## CSP und eigene Supabase-Domain

Die CSP erlaubt `https://*.supabase.co` und `wss://*.supabase.co`. Bei einer eigenen Domain ergänzt
`vite.config.ts` den Meta-Tag automatisch. In `vercel.json` und `netlify.toml` muss sie unter
`connect-src` von Hand ergänzt werden. `postbuild` gibt dafür einen Hinweis aus, bei anderen Abweichungen
zwischen Meta-Tag und Headern bricht der Build ab.

## Nach einem Update

Nach einem neuen Deploy zeigt die App „Neue Version verfügbar“ und lädt erst nach „Aktualisieren“ neu.
Offene lokale Schreibvorgänge werden vorher abgeschlossen. Alte Precache-Stände räumt Workbox automatisch auf.
