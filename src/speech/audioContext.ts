/**
 * Gemeinsamer AudioContext (intern) für Soundeffekte und Pegelanzeige.
 * Wird erst bei Bedarf erzeugt – Aufrufer sorgen dafür, dass das innerhalb einer
 * Nutzer-Geste passiert (iOS startet ihn sonst „suspended“).
 */
import { isBrowser } from './env';

let ctx: AudioContext | null = null;

type Ctor = typeof AudioContext;

export function getAudioContext(create = true): AudioContext | null {
  if (!isBrowser) return null;
  if (ctx && ctx.state !== 'closed') return ctx;
  if (!create) return null;
  const C: Ctor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C({ latencyHint: 'interactive' });
  } catch {
    try {
      ctx = new C();
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

/** Setzt einen angehaltenen/unterbrochenen Kontext fort (iOS: nach Anruf/Hintergrund). */
export async function resumeAudioContext(c: AudioContext | null = ctx): Promise<boolean> {
  if (!c) return false;
  if (c.state === 'running') return true;
  try {
    await c.resume();
  } catch {
    return false;
  }
  return (c.state as string) === 'running';
}
