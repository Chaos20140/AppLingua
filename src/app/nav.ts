import {
  Archive,
  AudioLines,
  Award,
  BookOpen,
  ChartColumn,
  Dumbbell,
  GraduationCap,
  House,
  Library,
  MessagesSquare,
  Music,
  RotateCcw,
  Route,
  Settings,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Pfad-Präfixe, bei denen der Eintrag als aktiv gilt. */
  match: string[];
}

/** Bottom-Navigation (5 Einträge, Songs in der Mitte hervorgehoben). */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Start', icon: House, match: ['/dashboard'] },
  { to: '/lernpfad', label: 'Lernpfad', icon: Route, match: ['/lernpfad'] },
  { to: '/songs', label: 'Songs', icon: Music, match: ['/songs'] },
  {
    to: '/ueben',
    label: 'Üben',
    icon: Dumbbell,
    match: ['/ueben', '/grammatik', '/aussprache', '/vokabeln', '/wiederholung', '/partner', '/pruefungen', '/fehlerarchiv', '/statistik'],
  },
  { to: '/profil', label: 'Profil', icon: UserRound, match: ['/profil', '/einstellungen', '/erfolge', '/datenschutz', '/rechtliches'] },
];

export interface NavSection {
  title: string;
  items: NavItem[];
}

const item = (to: string, label: string, icon: LucideIcon): NavItem => ({ to, label, icon, match: [to] });

/** Seitenleiste (Desktop ≥ 1024 px) mit allen Bereichen. */
export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    title: 'Lernen',
    items: [
      item('/dashboard', 'Start', House),
      item('/lernpfad', 'Lernpfad', Route),
      item('/songs', 'Songs', Music),
      item('/ueben', 'Üben', Dumbbell),
    ],
  },
  {
    title: 'Trainieren',
    items: [
      item('/grammatik', 'Grammatik', BookOpen),
      item('/aussprache', 'Aussprache', AudioLines),
      item('/vokabeln', 'Vokabeln', Library),
      item('/wiederholung', 'Wiederholung', RotateCcw),
      item('/partner', 'KI-Partner', MessagesSquare),
      item('/pruefungen', 'Prüfungen', GraduationCap),
      item('/fehlerarchiv', 'Fehlerarchiv', Archive),
    ],
  },
  {
    title: 'Fortschritt',
    items: [item('/erfolge', 'Erfolge', Award), item('/statistik', 'Statistik', ChartColumn)],
  },
  {
    title: 'Konto',
    items: [item('/profil', 'Profil', UserRound), item('/einstellungen', 'Einstellungen', Settings)],
  },
];

export function isActivePath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
