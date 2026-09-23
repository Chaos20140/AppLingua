import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, X } from 'lucide-react';
import { cx } from './internal/helpers';
import s from './Toast.module.css';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  tone?: ToastTone;
  /** Anzeigedauer in ms (Standard: 3,5 s; Fehler/mit Aktion 6 s). */
  duration?: number;
  /** Optionale Aktion, z. B. „Rückgängig“. */
  action?: { label: string; onClick: () => void };
}

/**
 * `toast(message, options)`. Kann direkt aufgerufen oder destrukturiert werden:
 * `const toast = useToast()` bzw. `const { toast } = useToast()`.
 */
export type ToastFn = ((message: string, options?: ToastOptions) => void) & { toast: ToastFn };

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastOptions['action'];
  leaving: boolean;
}

const MAX_VISIBLE = 3;
const EXIT_MS = 200;
let seq = 0;

const ToastContext = createContext<ToastFn | null>(null);

function makeToastFn(fn: (message: string, options?: ToastOptions) => void): ToastFn {
  const t = fn as ToastFn;
  t.toast = t;
  return t;
}

const fallbackToast = makeToastFn((message) => {
  console.warn('[AppLingua] useToast() ohne <ToastProvider>:', message);
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const remove = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
    setItems((list) => list.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), EXIT_MS);
  }, []);

  const toast = useMemo(
    () =>
      makeToastFn((message, options = {}) => {
        const id = ++seq;
        const tone = options.tone ?? 'info';
        const duration = options.duration ?? (tone === 'error' || options.action ? 6000 : 3500);
        setItems((list) => {
          const next = [...list, { id, message, tone, action: options.action, leaving: false }];
          return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
        });
        timers.current.set(id, window.setTimeout(() => remove(id), duration));
      }),
    [remove],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className={s.region} aria-live="polite" aria-relevant="additions">
          {items.map((t) => (
            <div
              key={t.id}
              className={cx(s.toast, s[t.tone])}
              role={t.tone === 'error' ? 'alert' : 'status'}
              data-leaving={t.leaving || undefined}
            >
              <span className={s.icon} aria-hidden="true">
                {t.tone === 'success' ? <Check /> : t.tone === 'error' ? <X /> : <Info />}
              </span>
              <span className={s.message}>{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className={s.action}
                  onClick={() => {
                    t.action?.onClick();
                    remove(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" className={s.close} aria-label="Hinweis schließen" onClick={() => remove(t.id)}>
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

/** Kurze Rückmeldungen: `toast('Gespeichert', { tone: 'success' })`. */
export function useToast(): ToastFn {
  return useContext(ToastContext) ?? fallbackToast;
}
