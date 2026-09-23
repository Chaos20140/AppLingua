import { toAuthError } from '../../data/auth';
import { syncNow } from '../../data/sync';
import { useProfile } from '../../state/settings';

export const authErrorMessage = (e: unknown): string => toAuthError(e).message;

/** Nach dem Anmelden kurz auf die erste Synchronisierung warten (max. 5 s), damit Fortschritt sichtbar ist. */
export async function settleAfterSignIn(): Promise<void> {
  await Promise.race([
    syncNow().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 5000)),
  ]);
}

/** Nur interne Pfade als Rücksprungziel akzeptieren. */
export function safeFrom(state: unknown): string | null {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null;
}

/** Ziel für „ohne Konto weiter“. */
export function useLocalTarget(): string {
  const profile = useProfile();
  return profile.onboardingDone ? '/dashboard' : '/onboarding';
}
