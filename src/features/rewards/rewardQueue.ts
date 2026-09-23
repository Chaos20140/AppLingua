/**
 * Reine Warteschlangen-Logik für das RewardCenter: sammelt Belohnungs-Ereignisse,
 * fasst mehrere Level-ups zusammen (nur das höchste zählt), entfernt doppelte Abzeichen
 * und ignoriert XP-Ereignisse (die zeigen die Seiten selbst).
 */
import type { RewardEvent } from '../../state/rewards';

export type RewardItem =
  | { kind: 'level-up'; level: number; title: string }
  | { kind: 'badges'; badgeIds: string[] };

export interface RewardQueueState {
  /** noch nicht angezeigte Einträge (Level-ups immer zuerst) */
  queue: RewardItem[];
  /** höchstes bereits eingereihtes/gezeigtes Level dieser Sitzung */
  maxLevel: number;
  /** bereits eingereihte/gezeigte Abzeichen dieser Sitzung */
  seenBadges: ReadonlySet<string>;
}

export const initialRewardQueue = (): RewardQueueState => ({ queue: [], maxLevel: 0, seenBadges: new Set() });

export function enqueueReward(
  state: RewardQueueState,
  event: RewardEvent,
  isKnownBadge: (id: string) => boolean = () => true,
): RewardQueueState {
  if (event.type === 'xp') return state;

  if (event.type === 'level-up') {
    if (!Number.isFinite(event.level) || event.level <= state.maxLevel) return state;
    const item: RewardItem = { kind: 'level-up', level: event.level, title: event.title };
    const rest = state.queue.filter((q) => q.kind !== 'level-up');
    return { ...state, queue: [item, ...rest], maxLevel: event.level };
  }

  const fresh: string[] = [];
  for (const id of event.badgeIds ?? []) {
    if (!id || state.seenBadges.has(id) || fresh.includes(id) || !isKnownBadge(id)) continue;
    fresh.push(id);
  }
  if (!fresh.length) return state;
  const seenBadges = new Set(state.seenBadges);
  for (const id of fresh) seenBadges.add(id);

  const idx = state.queue.findIndex((q) => q.kind === 'badges');
  if (idx >= 0) {
    const existing = state.queue[idx] as Extract<RewardItem, { kind: 'badges' }>;
    const queue = state.queue.slice();
    queue[idx] = { kind: 'badges', badgeIds: [...existing.badgeIds, ...fresh] };
    return { ...state, queue, seenBadges };
  }
  return { ...state, queue: [...state.queue, { kind: 'badges', badgeIds: fresh }], seenBadges };
}

/** Nimmt den nächsten Eintrag aus der Warteschlange. */
export function takeNext(state: RewardQueueState): { item: RewardItem | null; state: RewardQueueState } {
  const [item, ...rest] = state.queue;
  if (!item) return { item: null, state };
  return { item, state: { ...state, queue: rest } };
}

/**
 * Routen, auf denen ein modales Overlay stören würde (laufende Lektion, Prüfung, Übungssitzung,
 * Song-Player, Chat, Onboarding/Anmeldung). Dort wird gesammelt und nach dem Verlassen gefeiert.
 */
const FOCUS_ROUTES: RegExp[] = [
  /^\/lektion\//,
  /^\/pruefung\//,
  /^\/einstufung/,
  /^\/onboarding/,
  /^\/willkommen/,
  /^\/(anmelden|registrieren|passwort-vergessen|passwort-neu|auth\/)/,
  /^\/partner\/[^/]+/,
  /^\/songs\/[^/]+\/(spielen|uebungen)/,
  /^\/songs\/eigener-text/,
  /^\/wiederholung/,
  /^\/grammatik\/[^/]+/,
  /^\/aussprache\/[^/]+/,
  /^\/vokabeln/,
];

export const isFocusRoute = (pathname: string) => FOCUS_ROUTES.some((r) => r.test(pathname));
