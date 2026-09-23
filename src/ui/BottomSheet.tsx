import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx, useModal, usePresence } from './internal/helpers';
import { IconButton } from './IconButton';
import s from './Overlay.module.css';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Fixierter Bereich unten (z. B. Buttons). */
  footer?: ReactNode;
  className?: string;
}

const CLOSE_DISTANCE = 96;
const CLOSE_VELOCITY = 0.6; // px/ms

/**
 * Bottom-Sheet: schließt per Wisch nach unten (Griff/Kopfzeile), Tipp außerhalb, Esc
 * oder Schließen-Button. Fokusfalle, Hintergrund inert, Fokus-Rückgabe.
 */
export function BottomSheet({ open, onClose, title, description, children, footer, className }: BottomSheetProps) {
  const rendered = usePresence(open, 260);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; startY: number; lastY: number; lastT: number; v: number } | null>(null);

  useModal({ open, containerRef: panelRef, onEscape: onClose });

  useEffect(() => {
    if (open) setDragY(0);
  }, [open]);

  if (!rendered) return null;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!open || e.button !== 0 || (e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    drag.current = { id: e.pointerId, startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    const dy = e.clientY - d.startY;
    // Nach oben leicht gedämpft, nach unten 1:1.
    setDragY(dy > 0 ? dy : dy / 6);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    const dy = e.clientY - d.startY;
    if (e.type === 'pointerup' && (dy > CLOSE_DISTANCE || (d.v > CLOSE_VELOCITY && dy > 24))) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  const style = { '--drag-y': `${Math.round(dragY)}px` } as CSSProperties;

  return createPortal(
    <div className={cx(s.root, s.sheetRoot)} data-state={open ? 'open' : 'closed'}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={cx(s.sheet, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        style={style}
        data-dragging={dragging || undefined}
      >
        <div
          className={s.grabber}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <span className={s.handle} aria-hidden="true" />
          <div className={s.sheetHeader}>
            <h2 id={titleId} className={s.sheetTitle}>
              {title}
            </h2>
            <IconButton label="Schließen" icon={<X />} variant="tonal" size="sm" onClick={onClose} />
          </div>
        </div>
        {description && (
          <p id={descId} className={s.sheetDescription}>
            {description}
          </p>
        )}
        <div className={s.sheetBody}>{children}</div>
        {footer && <div className={s.sheetFooter}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
