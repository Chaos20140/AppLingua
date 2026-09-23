/** Level-Leiter 1–120: Titelgruppen mit XP-Schwellen (reine Logik). */
import { LEVEL_TITLES, MAX_LEVEL, totalXpForLevel } from '../../engine/levels';

export interface LadderStep {
  level: number;
  /** benötigte Gesamt-XP */
  xp: number;
}

export interface LadderGroup {
  title: string;
  from: number;
  to: number;
  steps: LadderStep[];
}

export function levelLadder(maxLevel: number = MAX_LEVEL): LadderGroup[] {
  const groups: LadderGroup[] = [];
  for (let from = 1; from <= maxLevel; from += 10) {
    const to = Math.min(maxLevel, from + 9);
    const idx = Math.min(LEVEL_TITLES.length - 1, Math.floor((from - 1) / 10));
    const steps: LadderStep[] = [];
    for (let l = from; l <= to; l++) steps.push({ level: l, xp: totalXpForLevel(l) });
    groups.push({ title: LEVEL_TITLES[idx], from, to, steps });
  }
  return groups;
}

const nf = new Intl.NumberFormat('de-DE');
export const formatNumber = (n: number) => nf.format(Math.round(n));
