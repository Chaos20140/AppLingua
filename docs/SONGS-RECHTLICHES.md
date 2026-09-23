# Songs und Recht

Kurzfassung der technischen Leitplanken im Songbereich. Das ist **keine Rechtsberatung**. Vor einer
öffentlichen oder kommerziellen Nutzung mit fremden Liedern sollte eine Fachperson die Lizenzfrage prüfen.

## Was AppLingua heute enthält

| Quelle | Rechte | Umsetzung |
|---|---|---|
| **Demo-Lernlieder** (6 Stück, `src/content/songs/`) | eigens für AppLingua geschrieben, `license.kind = 'original'` | Text, Übersetzung und Timing im Code, Begleitmusik per Web Audio, Gesang per Sprachausgabe; keine Audiodateien Dritter |
| **Eigene Texte** (`/songs/eigener-text`) | Verantwortung der Nutzerin, nur private Analyse | Pflicht-Bestätigung „nur privat“, `license.kind = 'user-private'`, höchstens 8000 Zeichen/200 Zeilen; bleibt auf dem Gerät, außer „Eigene Texte synchronisieren“ ist aktiv (dann nur im eigenen Konto, per RLS nur für sie lesbar) |
| **Einbettungen** (YouTube, Spotify, Apple Music) | Wiedergabe über die offiziellen Player der Anbieter | nur Links bzw. IDs werden gespeichert; Laden erst nach Zwei-Klick-Einwilligung je Dienst |

Bewusst **nicht** enthalten: Liedtexte Dritter im Code oder auf dem Server, Scraping von Lyrics-Seiten,
Downloads oder Mitschnitte von Audio/Video, Umgehen von Anbieter-Beschränkungen. Eigene Texte werden nie
veröffentlicht, geteilt oder zwischen Nutzerinnen ausgetauscht.

## Eigene Texte (private Nutzung)

- Die Nutzerin fügt einen Text ein, den sie rechtmäßig besitzt (z. B. aus dem Booklet), und bestätigt
  die rein private Nutzung. Ohne diese Bestätigung wird nichts gespeichert.
- KI-Erklärungen (falls eingerichtet) bekommen nur den markierten Ausschnitt, die zugehörige Zeile und
  den Songtitel, nicht den ganzen Text.
- Löschen entfernt den Text samt Notizen, Markierungen, Erklärungen, Fortschritt, Favorit,
  Playlist-Einträgen und Fehlerarchiv. Mit Konto gilt das auch für die Cloud. Übungsantworten und
  Aussprache-Versuche sind Protokolleinträge und verschwinden mit „Lokale Daten löschen“ bzw. dem Löschen
  des Kontos. Wird „Eigene Texte synchronisieren“ ausgeschaltet, entfernt die App alle zugehörigen
  Einträge aus der Cloud.
- Selbst angelegte Vokabelkarten (bei Wendungen mit der ganzen Zeile) werden wie alle Karten
  synchronisiert. Das Formular weist darauf hin.

## Einbettungen

- **YouTube** über `www.youtube-nocookie.com` (IFrame-API), **Spotify** über die offizielle iFrame-API,
  **Apple Music** über `embed.music.apple.com`.
- Vor der Einwilligung lädt die App nichts von diesen Diensten, auch keine Vorschaubilder. Danach
  überträgt der Browser Daten (z. B. die IP-Adresse) an den Anbieter. Die Einwilligung lässt sich unter
  *Einstellungen → Externe Einbettungen* widerrufen. Die Datenschutzerklärung nennt alle drei Anbieter.
- Die CSP erlaubt genau diese Quellen (`frame-src`, `script-src`, `img-src`).
- Die App liest keine Texte oder Audiodaten aus den Playern. Bei eigenen Texten mit Link nutzt sie nur
  die Wiedergabeposition des offiziellen Players, um die selbst eingegebenen Zeilen mitzuführen.
  Der Text stammt immer von der Nutzerin, nie vom Dienst.

## Lizenzierte Lyrics-API anbinden (nicht implementiert)

Wer fremde Liedtexte anzeigen will, braucht einen Vertrag mit einem Lyrics-Lizenzgeber (z. B. LyricFind
oder Musixmatch) für das jeweilige Land und die Nutzungsart. So würde es technisch passen:

1. **Nur serverseitig**: neue Supabase Edge Function, z. B. `supabase/functions/lyrics/`. Der API-Schlüssel
   wird als Secret gesetzt (`npx supabase secrets set LYRICS_API_KEY=…`) und gelangt nie ins Frontend.
   Das Frontend ruft die Function wie `ai-coach` mit Nutzer-JWT auf, `ALLOWED_ORIGINS` und
   Ratenbegrenzung inklusive (Muster: `supabase/functions/ai-coach/index.ts`, Tabelle `ai_usage`).
2. **Abruf pro Song bei Bedarf** über die Katalog-ID des Anbieters (ISRC o. ä.), keine Massenabrufe.
3. **Speichern nur im erlaubten Umfang**: Die meisten Lizenzen verbieten dauerhafte Kopien. Texte also
   nicht in `user_records` synchronisieren, höchstens so lange lokal cachen, wie der Vertrag erlaubt,
   und `localOnly` markieren.
4. **Pflichtangaben** des Anbieters anzeigen (Copyright-Zeile, Quelle, ggf. Tracking-Pixel oder
   Nutzungsmeldung) und Gebietsbeschränkungen beachten.
5. **Zeitstempel** für Mitlese- und Karaoke-Modi sind oft eine eigene Lizenz.
6. **Übersetzungen** von Liedtexten sind Bearbeitungen und brauchen in der Regel eine eigene Erlaubnis.
   KI-Übersetzungen ganzer Texte deshalb nur, wenn die Lizenz das ausdrücklich deckt.
7. CSP und Datenschutzerklärung anpassen, falls das Frontend den Anbieter direkt kontaktiert (z. B. für
   Tracking-Pixel).

Für eine tiefere Integration von **Spotify** oder **Apple Music** (Bibliothek, Suche, volle
Wiedergabesteuerung) wären Entwicklerzugänge nötig: Spotify Web API/Web Playback SDK mit Premium-Konto,
Apple MusicKit JS mit Developer Token. Beides ist nicht implementiert. Die vorhandenen Einbettungen
brauchen keinen Schlüssel.
