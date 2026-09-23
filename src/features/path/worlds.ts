/** Welten-Thema je Etappe: Emoji + Farbe (nur Token-Farben bzw. Mischungen daraus). */
import type { CSSProperties } from 'react';
import type { Stage } from '../../content/types';
import type { StageId } from '../../core/types';

export interface WorldTheme {
  emoji: string;
  color: string;
  /** kurzer Weltname (Teil nach dem Gedankenstrich im Etappentitel) */
  name: string;
}

const THEMES: Record<StageId, { emoji: string; color: string }> = {
  stage0: { emoji: '🌱', color: 'var(--accent)' },
  a1: { emoji: '🏙️', color: 'var(--info)' },
  a2: { emoji: '🧭', color: 'var(--success)' },
  b1: { emoji: '🌋', color: 'var(--gold)' },
  b2: { emoji: '🏛️', color: 'color-mix(in srgb, var(--info) 55%, var(--danger))' },
  c1: { emoji: '🎭', color: 'var(--danger)' },
  c2: { emoji: '🏔️', color: 'color-mix(in srgb, var(--info) 60%, var(--text-2))' },
  native: { emoji: '🌟', color: 'color-mix(in srgb, var(--gold) 70%, var(--accent))' },
};

export function worldName(title: string): string {
  const i = title.search(/\s[–-]\s/);
  return i >= 0 ? title.slice(i + 3).trim() : title;
}

export function worldTheme(stage: Pick<Stage, 'id' | 'title'>): WorldTheme {
  const t = THEMES[stage.id] ?? THEMES.stage0;
  return { ...t, name: worldName(stage.title) };
}

/** CSS-Variable --world für ein Element setzen. */
export const worldStyle = (theme: WorldTheme): CSSProperties => ({ ['--world' as string]: theme.color }) as CSSProperties;
