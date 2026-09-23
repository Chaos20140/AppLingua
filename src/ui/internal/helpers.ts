/** Interne Hilfsfunktionen des UI-Kits (nicht Teil der öffentlichen API). */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

type ClassValue = string | false | null | undefined | 0;

/** Klassen zusammenfügen (falsy Werte werden ignoriert). */
export function cx(...values: ClassValue[]): string {
  let out = '';
  for (const v of values) if (v) out += (out ? ' ' : '') + v;
  return out;
}

/** Wert auf 0..1 begrenzen (NaN → 0). */
export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/** Respektiert System-Einstellung und manuelle App-Einstellung (html[data-motion]). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const forced = document.documentElement.dataset.motion;
  if (forced === 'reduce') return true;
  if (forced === 'full') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Hält ein Overlay nach dem Schließen noch so lange gemountet, bis die Ausblend-Animation
 * gelaufen ist. Rückgabe: ob gerendert werden soll.
 */
export function usePresence(open: boolean, exitMs: number): boolean {
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);
  useEffect(() => {
    if (open || !rendered) return;
    const t = window.setTimeout(() => setRendered(false), prefersReducedMotion() ? 0 : exitMs);
    return () => window.clearTimeout(t);
  }, [open, rendered, exitMs]);
  return open || rendered;
}

/** Aktuellste Callback-Referenz, ohne Effekte neu auszulösen. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest('[inert]') && el.getClientRects().length > 0,
  );
}

// ───────────── Modale Ebenen (Fokusfalle, Esc, Hintergrund inert, Scroll-Sperre) ─────────────

const modalStack: object[] = [];

function setBackgroundInert(on: boolean) {
  const root = document.getElementById('root');
  const html = document.documentElement;
  if (on) {
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-hidden', 'true');
    html.setAttribute('data-modal', '');
  } else {
    root?.removeAttribute('inert');
    root?.removeAttribute('aria-hidden');
    html.removeAttribute('data-modal');
  }
}

interface ModalOptions {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  /** Esc schließt (fehlt → Esc wird ignoriert). */
  onEscape?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Verhalten eines modalen Overlays: Fokus hinein und gefangen halten, Esc, App-Hintergrund
 * `inert`, Scroll-Sperre, Fokus beim Schließen zurückgeben. Unterstützt gestapelte Overlays.
 */
export function useModal({ open, containerRef, onEscape, initialFocusRef }: ModalOptions): void {
  const escapeRef = useLatest(onEscape);
  useEffect(() => {
    if (!open) return;
    const token = {};
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(token);
    if (modalStack.length === 1) setBackgroundInert(true);

    const raf = requestAnimationFrame(() => {
      const c = containerRef.current;
      if (!c || c.contains(document.activeElement)) return;
      const target = initialFocusRef?.current ?? focusableIn(c)[0] ?? c;
      target.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;
      const c = containerRef.current;
      if (!c) return;
      if (e.key === 'Escape') {
        if (escapeRef.current) {
          e.preventDefault();
          e.stopPropagation();
          escapeRef.current();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusableIn(c);
      if (items.length === 0) {
        e.preventDefault();
        c.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !c.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !c.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      const i = modalStack.indexOf(token);
      if (i >= 0) modalStack.splice(i, 1);
      if (modalStack.length === 0) setBackgroundInert(false);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open, containerRef, initialFocusRef, escapeRef]);
}
