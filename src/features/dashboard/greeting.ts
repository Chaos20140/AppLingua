/** Begrüßung und motivierende Unterzeile für das Dashboard (reine Logik). */

export function salutationFor(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 11) return 'Guten Morgen';
  if (h >= 11 && h < 17) return 'Hallo';
  if (h >= 17 && h < 23) return 'Guten Abend';
  return 'Hallo, Nachteule';
}

export function greeting(hour: number, name?: string | null): string {
  const base = salutationFor(hour);
  const n = (name ?? '').trim();
  if (!n) return base;
  // „Hallo, Nachteule“ + Name → „Hallo Anna, noch wach?“
  if (base === 'Hallo, Nachteule') return `Hallo ${n}, noch wach?`;
  return `${base}, ${n}`;
}

export interface SublineInput {
  hour: number;
  totalXp: number;
  goalReached: boolean;
  goalXp: number;
  todayXp: number;
  streak: number;
  todayDone: boolean;
}

export function dashboardSubline(i: SublineInput): string {
  if (i.totalXp <= 0) return 'Schön, dass du da bist. Deine erste Lektion dauert nur ein paar Minuten.';
  if (i.goalReached) return 'Tagesziel geschafft – alles, was jetzt noch kommt, ist Bonus.';
  const left = Math.max(0, i.goalXp - i.todayXp);
  if (i.streak > 0 && !i.todayDone) {
    const days = i.streak === 1 ? '1 Tag' : `${i.streak} Tage`;
    return `Deine Serie steht bei ${days} – eine kurze Runde hält sie am Leben.`;
  }
  if (i.todayXp > 0) return `Noch ${left} XP bis zu deinem Tagesziel. Du bist schon unterwegs.`;
  if (i.hour >= 20 || i.hour < 5) return 'Auch fünf Minuten am Abend bringen dich weiter.';
  return 'Jeder Tag zählt – schon fünf Minuten machen einen Unterschied.';
}
