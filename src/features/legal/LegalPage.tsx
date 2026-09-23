import { AudioLines, BookHeart, Code2, FileText, GraduationCap, Info, Music4, Tag } from 'lucide-react';
import { version as APP_VERSION } from '../../../package.json';
import { Page } from '../../ui';
import { LegalSection, LegalToc } from './LegalSection';
import s from './Legal.module.css';

const LICENSES = [
  { name: 'React & React DOM', license: 'MIT', note: 'Benutzeroberfläche' },
  { name: 'React Router', license: 'MIT', note: 'Navigation' },
  { name: 'Zustand', license: 'MIT', note: 'Zustandsverwaltung' },
  { name: 'supabase-js', license: 'MIT', note: 'Konto & Synchronisierung' },
  { name: 'idb', license: 'ISC', note: 'Lokale Datenbank (IndexedDB)' },
  { name: 'Lucide Icons (lucide-react)', license: 'ISC', note: 'Symbole' },
  { name: 'Workbox & vite-plugin-pwa', license: 'MIT', note: 'Offline-Nutzung' },
  { name: 'Vite', license: 'MIT', note: 'Build-Werkzeug' },
];

const TOC = [
  { id: 'lieder', label: 'Lernlieder' },
  { id: 'eigene-texte', label: 'Eigene Texte' },
  { id: 'aussprache', label: 'Aussprache' },
  { id: 'niveau', label: 'Sprachniveau' },
  { id: 'marken', label: 'Marken' },
  { id: 'lizenzen', label: 'Open Source' },
];

export default function LegalPage() {
  return (
    <Page title="Rechtliches" subtitle="Hinweise zu Inhalten, Marken und verwendeter Software." back gap="lg">
      <LegalToc items={TOC} />

      <LegalSection id="lieder" icon={<Music4 size={20} />} title="Demo-Lernlieder">
        <p>
          Die Lernlieder in AppLingua sind <strong>eigens für die App geschriebene Originale</strong>. Sie enthalten keine
          Songtexte Dritter. AppLingua lädt keine Songtexte aus dem Internet und bietet keine Downloads von Musik an.
        </p>
        <p>
          Musikdienste wie YouTube, Spotify oder Apple Music werden – wenn überhaupt – ausschließlich über deren offizielle
          Einbettungen und erst nach deiner Einwilligung eingebunden.
        </p>
      </LegalSection>

      <LegalSection id="eigene-texte" icon={<FileText size={20} />} title="Eigene Songtexte">
        <p>
          Du kannst eigene Texte eingeben, um sie <strong>privat</strong> zu analysieren und damit zu üben. Die Verantwortung
          dafür, dass du die Texte verwenden darfst, liegt bei dir. AppLingua veröffentlicht oder teilt diese Texte nicht:
          Sie bleiben standardmäßig nur auf deinem Gerät und werden nur dann privat in deinem Konto gespeichert, wenn du die
          Synchronisierung ausdrücklich einschaltest.
        </p>
      </LegalSection>

      <LegalSection id="aussprache" icon={<AudioLines size={20} />} title="Hinweis zur Aussprachebewertung">
        <p>
          Die Bewertung im Aussprache-Labor heißt bewusst <strong>„Verständlichkeit laut Spracherkennung“</strong>. Sie zeigt,
          wie gut die Spracherkennung deines Browsers dich verstanden hat – sie ist <strong>keine phonetische Analyse</strong>{' '}
          und kein Urteil über deinen Akzent. Mikrofon, Umgebungsgeräusche und der jeweilige Browser beeinflussen das Ergebnis.
        </p>
      </LegalSection>

      <LegalSection id="niveau" icon={<GraduationCap size={20} />} title="Sprachniveau & Native Mastery">
        <p>
          Die Sprachniveaus (A1 bis C2) orientieren sich am Gemeinsamen Europäischen Referenzrahmen, sind aber{' '}
          <strong>keine offiziellen Zertifikate</strong>. Das Ergebnis des Einstufungstests ist ausdrücklich vorläufig.
        </p>
        <p>
          <strong>„Native Mastery“</strong> ist eine Trainingsstufe für sehr fortgeschrittene Lernende – kein Versprechen,
          danach wie eine Muttersprachlerin oder ein Muttersprachler zu klingen. Spielerlevel (XP) und Sprachniveau sind
          getrennt: XP belohnen deinen Fleiß, das Sprachniveau steigt nur mit bestandenen Prüfungen.
        </p>
        <p>Erklärungen und KI-Antworten werden sorgfältig erstellt, können aber Fehler enthalten.</p>
      </LegalSection>

      <LegalSection id="marken" icon={<Tag size={20} />} title="Markenhinweise">
        <p>
          YouTube, Google und Chrome sind Marken der Google LLC. Spotify ist eine Marke der Spotify AB. Apple, Apple Music,
          Safari und Siri sind Marken der Apple Inc. Claude und Anthropic sind Marken der Anthropic PBC. Supabase ist eine
          Marke der Supabase Inc. GitHub ist eine Marke der GitHub, Inc.
        </p>
        <p>
          Die Nennung dient nur der Beschreibung von Funktionen. Es besteht keine Partnerschaft mit diesen Unternehmen, und
          sie empfehlen AppLingua nicht.
        </p>
      </LegalSection>

      <LegalSection id="lizenzen" icon={<Code2 size={20} />} title="Open-Source-Lizenzen">
        <p>AppLingua baut auf großartiger freier Software auf. Danke an alle, die daran mitwirken!</p>
        <ul className={s.licenses}>
          {LICENSES.map((l) => (
            <li key={l.name} className={s.license}>
              <span>
                <span className={s.licenseName}>{l.name}</span>
                <br />
                <span className={s.licenseNote}>{l.note}</span>
              </span>
              <span className={s.licenseNote}>{l.license}</span>
            </li>
          ))}
        </ul>
        <p>
          MIT- und ISC-Lizenz erlauben die Nutzung, Veränderung und Weitergabe, sofern der Urheberrechtshinweis und der
          Lizenztext erhalten bleiben. Die vollständigen Lizenztexte samt Urheberangaben liegen den jeweiligen Paketen bei.
        </p>
      </LegalSection>

      <LegalSection id="app" icon={<Info size={20} />} title="Über diese App">
        <p>
          AppLingua · Version {APP_VERSION}. Eine Lern-App für Spanisch und brasilianisches Portugiesisch – lokal zuerst, ohne
          Werbung und ohne Tracking.
        </p>
        <p>
          <BookHeart size={16} aria-hidden="true" className={s.inlineIcon} />
          Anbieterangaben (Impressum) stellt der Betreiber dieser Installation bereit – dort, wo du AppLingua erhalten hast.
        </p>
      </LegalSection>
    </Page>
  );
}
