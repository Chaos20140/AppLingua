# Supabase einrichten (Konten, Sync, KI-Coach)

Ohne diese Einrichtung läuft AppLingua vollständig im **lokalen Modus**: Alle Daten bleiben im Browser
(IndexedDB), die Konto-Seiten erklären, dass Konten noch nicht verfügbar sind, und der KI-Partner nutzt
die Offline-Skripte. Die Supabase-Bibliothek wird in diesem Modus gar nicht geladen. Nach den Schritten
unten und einem neuen Build funktionieren Konten, Geräte-Sync und KI.

Benötigt: Supabase-Konto, [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase …` genügt),
für die KI ein Anthropic-API-Schlüssel.

## 1. Projekt anlegen
1. <https://supabase.com/dashboard> → **New project** (Region z. B. *Frankfurt, eu-central-1*), sicheres DB-Passwort notieren.
2. **Project Settings → API**: *Project URL* und den öffentlichen Schlüssel (*anon* bzw. *publishable key*) notieren.
   Der *service_role*-Schlüssel gehört **niemals** ins Frontend.

## 2. Datenbankschema einspielen
Entweder per CLI (im Repo-Ordner):
```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```
oder im Dashboard unter **SQL Editor** den Inhalt von
`supabase/migrations/20260921000000_init.sql` ausführen.

Das legt an: `public.user_records` (RLS: nur eigene Zeilen; Trigger verwirft ältere Stände),
`public.ai_usage` (nur für die Edge Function) und die Funktionen `ai_usage_increment/-release`.

## 3. Auth-Einstellungen
**Authentication → URL Configuration** (Beispiel GitHub Pages des Kontos `chaos20140`, an die eigene
Adresse anpassen; bei Vercel/Netlify die jeweilige Domain eintragen)
- *Site URL*: `https://chaos20140.github.io/AppLingua/`
- *Redirect URLs*:
  - `https://chaos20140.github.io/AppLingua/**`
  - `http://localhost:5173/**`
  - `http://127.0.0.1:5173/**`

**Authentication → Sign In / Providers → Email**
- *Enable Email provider*: an, *Confirm email*: an (Bestätigungslink führt zu `…/auth/callback`).
- *Minimum password length*: 8.
- Für echten Versand eigenen SMTP-Server eintragen (**Authentication → Emails → SMTP Settings**);
  der eingebaute Versand ist stark begrenzt und nur zum Testen gedacht.
- Optional die E-Mail-Vorlagen (Bestätigung, Passwort zurücksetzen) auf Deutsch übersetzen.

**Optional: Sign in with Apple** – unter **Providers → Apple** Services-ID, Team-ID, Key-ID und
privaten Schlüssel eintragen (Apple Developer Account nötig). Danach im Frontend
`VITE_ENABLE_APPLE_LOGIN=true` setzen (Schritt 6). Ohne diese Variable zeigt die App keinen Apple-Button.

## 4. Secrets für die Edge Functions
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set ALLOWED_ORIGINS=https://chaos20140.github.io,http://localhost:5173,http://127.0.0.1:5173
# optional:
npx supabase secrets set AI_DAILY_LIMIT=150        # KI-Anfragen je Nutzer und Tag (Standard 150)
npx supabase secrets set AI_MODEL=claude-opus-5    # Standard: claude-opus-5
```
`ALLOWED_ORIGINS` enthält nur Origins (Schema + Host + Port), **ohne** Pfad `/AppLingua/`.
`SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase automatisch bereit.

## 5. Edge Functions deployen
```bash
npx supabase functions deploy ai-coach
npx supabase functions deploy delete-account
```
`supabase/config.toml` setzt `verify_jwt = false`: Beide Functions prüfen das JWT selbst
(`auth.getUser`), damit CORS-Preflights und die neuen JWT-Signaturschlüssel funktionieren.
Anfragen ohne gültige Anmeldung werden mit 401 abgewiesen.

## 6. Frontend verbinden (GitHub Pages)
Im GitHub-Repository **Settings → Secrets and variables → Actions → Variables**:

| Name | Wert |
|---|---|
| `VITE_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable key (öffentlich, durch RLS geschützt) |
| `VITE_ENABLE_APPLE_LOGIN` | nur `true`, wenn Schritt 3 „Apple“ erledigt ist |

Der Workflow `.github/workflows/deploy.yml` übergibt sie bereits beim Build:
```yaml
- run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
    VITE_ENABLE_APPLE_LOGIN: ${{ vars.VITE_ENABLE_APPLE_LOGIN }}
```
Nach dem Eintragen den Workflow neu starten (**Actions → Test & Deploy → Run workflow**), denn die Werte
werden beim Build eingebettet. Vercel/Netlify: dieselben Namen als Umgebungsvariablen des Projekts
(siehe [DEPLOY.md](DEPLOY.md)). Lokal: `.env.example` nach `.env.local` kopieren, ausfüllen und
`npm run dev` neu starten.

Ohne gültige URL (https, oder `localhost`) und Schlüssel bleibt die App im lokalen Modus. Ein Tippfehler
fällt also nicht als Absturz auf, sondern als „Konten nicht eingerichtet“.

## 7. Prüfen
1. App öffnen → **Registrieren** → Bestätigungs-Mail → Link öffnet `…/auth/callback` → angemeldet.
2. Etwas lernen, in einem zweiten Browser mit demselben Konto anmelden → Fortschritt erscheint (Sync ≤ 60 s,
   sofort beim Fokuswechsel).
3. Dashboard → **Table Editor → user_records**: Zeilen des Kontos sind sichtbar.
4. KI-Partner starten → Antwort kommt von der Edge Function (Logs: **Edge Functions → ai-coach → Logs**).
5. Profil → Konto löschen → Nutzer verschwindet unter **Authentication → Users**, seine Zeilen ebenfalls.

## Datenschutz-Hinweise
- Eigene Songtexte bleiben nur auf dem Gerät, außer „Eigene Texte synchronisieren“ ist aktiv. Beim
  Ausschalten werden sie aus der Cloud entfernt. Das gilt auch für alles, was Text daraus enthält:
  Notizen, Markierungen, Erklärungen, Übungsantworten, Fehlerarchiv und Aussprache-Versuche.
  Ausnahme: Vokabelkarten, die man selbst aus einem eigenen Text anlegt, werden normal synchronisiert
  (Hinweis im Formular).
- Sprachaufnahmen werden nie hochgeladen (nur lokal und nur mit Einwilligung).
- Gelöschte Einträge werden in der Cloud ohne Inhalt als Löschmarkierung gespeichert.
- An die KI gehen nur die für die Anfrage nötigen Texte (Szenario, Gesprächsverlauf bzw. markierter Ausschnitt).
