/** Grobe, ehrliche Einschätzung der Passwortstärke (nur Hinweis, keine Sicherheitsgarantie). */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

const COMMON = ['passwort', 'password', '12345678', '123456789', 'qwertz', 'qwerty', 'hallo123', 'applingua', 'abc12345', 'iloveyou'];

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return 0;
  const lower = pw.toLowerCase();
  if (pw.length < 8 || COMMON.some((c) => lower.includes(c)) || /^(.)\1+$/.test(pw)) return 1;
  let classes = 0;
  if (/[a-zäöüß]/.test(pw)) classes++;
  if (/[A-ZÄÖÜ]/.test(pw)) classes++;
  if (/\d/.test(pw)) classes++;
  if (/[^A-Za-z0-9äöüÄÖÜß]/.test(pw)) classes++;
  let score = 1;
  if (pw.length >= 10 || classes >= 3) score++;
  if (pw.length >= 12 && classes >= 2) score++;
  if (pw.length >= 16 || (pw.length >= 12 && classes >= 3)) score++;
  return Math.min(4, score) as PasswordStrength;
}

export const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: '',
  1: 'Schwach',
  2: 'Okay',
  3: 'Gut',
  4: 'Stark',
};

export const STRENGTH_TIPS: Record<PasswordStrength, string> = {
  0: 'Mindestens 8 Zeichen.',
  1: 'Zu leicht zu erraten – nimm mindestens 8 Zeichen und keine bekannten Wörter.',
  2: 'Geht – länger oder mit Zahlen und Sonderzeichen wird es deutlich sicherer.',
  3: 'Gutes Passwort.',
  4: 'Sehr gutes Passwort.',
};
