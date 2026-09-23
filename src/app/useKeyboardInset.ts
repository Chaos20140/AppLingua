import { useEffect } from 'react';

const MIN_KEYBOARD_PX = 120;

function isEditable(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) {
    const nonText = ['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'];
    return !el.readOnly && !nonText.includes(el.type);
  }
  return false;
}

/**
 * Misst die Bildschirmtastatur über visualViewport und setzt
 * `--kb-inset` (px) sowie `html[data-kb="open"]` (blendet die Bottom-Navigation aus).
 * Fixierte Leisten nutzen `bottom: var(--kb-inset)`, Seiten reservieren den Platz automatisch.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    if (!vv) return;
    let raf = 0;
    let last = -1;

    const apply = () => {
      raf = 0;
      // Pinch-Zoom verkleinert den sichtbaren Bereich ebenfalls – nur bei fokussiertem Eingabefeld werten.
      const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      const open = overlap > MIN_KEYBOARD_PX && vv.scale <= 1.01 && isEditable(document.activeElement);
      const inset = open ? Math.round(overlap) : 0;
      if (inset === last) return;
      last = inset;
      root.style.setProperty('--kb-inset', `${inset}px`);
      if (open) root.setAttribute('data-kb', 'open');
      else root.removeAttribute('data-kb');
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    // Nach focusout kurz warten: Wechsel zwischen zwei Feldern schließt die Tastatur nicht.
    const onFocusOut = () => window.setTimeout(schedule, 80);

    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', onFocusOut);
    schedule();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', onFocusOut);
      root.style.removeProperty('--kb-inset');
      root.removeAttribute('data-kb');
    };
  }, []);
}
