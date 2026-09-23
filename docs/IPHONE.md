# AppLingua auf dem iPhone

AppLingua ist eine Web-App, die man nicht aus dem App Store lädt. Getestet wird mit Safari- bzw.
WebKit-Profilen für iPhone SE, 15 und 15 Pro Max. Voraussetzung ist iOS/iPadOS 15 oder neuer.

## 1. Öffnen und installieren

1. Die Adresse der Installation in **Safari** öffnen (z. B. `https://<user>.github.io/AppLingua/`).
2. Einmal das Onboarding durchlaufen. Damit liegt die App offline bereit (Spanisch und Songs sofort,
   Portugiesisch nach dem ersten Öffnen des Kurses).
3. **Teilen** (Quadrat mit Pfeil) → **Zum Home-Bildschirm** → **Hinzufügen**. AppLingua startet dann im
   Vollbild ohne Adressleiste.

Gut zu wissen:
- **Getrennte Daten**: Die Home-Bildschirm-App und der Safari-Tab haben auf iOS getrennte Speicher. Wer
  in beiden lernt, sieht ohne Konto zwei verschiedene Fortschritte. Mit Konto (falls eingerichtet)
  werden sie abgeglichen. Ohne Konto hilft *Profil → Einstellungen → Daten & Konto → Export herunterladen*
  als Sicherung.
- **Datenaufbewahrung**: Safari kann Website-Daten löschen, wenn eine Seite mehrere Tage nicht
  benutzt wurde. Auf dem Home-Bildschirm installierte Web-Apps sind davon nach Apples Angaben
  ausgenommen. Wer nur im Safari-Tab lernt, sollte ein Konto nutzen oder regelmäßig exportieren.
- **Updates**: Ist eine neue Version verfügbar, zeigt die App „Neue Version verfügbar“. Nach
  „Aktualisieren“ wird neu geladen, der Fortschritt bleibt erhalten.

## 2. Stimmen für Spanisch und Portugiesisch installieren

Die Aussprache kommt von den Systemstimmen des iPhones. Fehlt eine Stimme, bleibt die Wiedergabe
stumm oder spricht mit falschem Akzent. Die App zeigt dann eine Anleitung.

**Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen**
- **Spanisch** → *Spanien* (für es-ES) bzw. *Mexiko* oder ein anderes Land Lateinamerikas (für es-LA)
- **Portugiesisch** → *Brasilien* (für pt-BR)

Eine Stimme antippen und laden. Die Version **„Erweitert“** klingt am natürlichsten. Danach AppLingua
schließen und neu öffnen, damit Safari die neue Stimme sicher erkennt. Die App wählt automatisch die
beste passende Stimme; Spielerei-Stimmen (z. B. „Grandma“) werden übergangen.

## 3. Mikrofon und Spracherkennung

Die Ausspracheübungen nutzen die Spracherkennung von Safari, also Apples Diktierfunktion.

1. **Siri & Diktieren** aktivieren: *Einstellungen → Allgemein → Tastatur → Diktierfunktion aktivieren*.
   Ist sie unter *Bildschirmzeit → Beschränkungen* gesperrt, dort Siri & Diktieren erlauben.
2. **Diktiersprachen**: *Einstellungen → Allgemein → Tastatur → Tastaturen → Tastatur hinzufügen* →
   Spanisch bzw. Portugiesisch (Brasilien). Ohne diese Sprache kann die Erkennung „nicht unterstützt“ melden.
3. **Mikrofon erlauben**: Safari fragt beim ersten Tippen auf die Aufnahme-Schaltfläche. Wurde das
   abgelehnt, lässt es sich in den Website-Einstellungen von Safari (Menü in der Adressleiste) bzw. unter
   *Einstellungen → Apps → Safari → Mikrofon* wieder erlauben.

Das Mikrofon ist nur aktiv, solange eine Aufnahme läuft. Die Erkennung kann Sprache an Apple senden und
braucht dann eine Internetverbindung. Aufnahmen werden nur mit ausdrücklicher Erlaubnis und nur lokal
gespeichert.

## 4. Bekannte iOS-Grenzen

- **Spracherkennung nur im Safari-Tab**: Aus der Home-Bildschirm-App heraus startet Safaris
  Spracherkennung nicht zuverlässig. Die App erkennt das und bietet stattdessen „Aufnehmen & vergleichen“
  und Selbsteinschätzung an. Für Sprechübungen AppLingua im Safari-Tab öffnen (Speicher siehe oben).
- **Keine phonetische Analyse**: Bewertet wird, ob die Spracherkennung dich versteht
  („Verständlichkeit laut Spracherkennung“), nicht deine Lautbildung im Detail.
- **Ton erst nach Tippen**: Sprachausgabe, Musik und Mikrofon starten nur nach einer Berührung, weil
  iOS Autoplay blockiert.
- **Stummschalter**: Begleitmusik der Demo-Songs und Soundeffekte laufen über Web Audio und bleiben bei
  aktivem Stummschalter still. Sprachausgabe: Lautstärke und Stummschalter prüfen, wenn nichts zu hören ist.
- **Hintergrund**: Wechselt man die App oder sperrt den Bildschirm, pausiert iOS Wiedergabe und
  Erkennung. Nach der Rückkehr einfach erneut starten.
- **Offline**: Lernen, Songs und der Offline-Partner funktionieren ohne Netz. KI-Funktionen, Konto-Sync,
  Spracherkennung (meist) und eingebettete Musikdienste brauchen Internet.
- **Einbettungen** (YouTube/Spotify/Apple Music) laden erst nach Einwilligung. Ob Spotify und Apple Music
  ganze Titel oder nur Vorschauen abspielen, hängt vom Login im jeweiligen Dienst ab.
