import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx, useModal, usePresence } from './internal/helpers';
import { Button } from './Button';
import { IconButton } from './IconButton';
import s from './Overlay.module.css';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons unten (mobil gestapelt, primäre Aktion zuletzt übergeben). */
  actions?: ReactNode;
  /** false = kein Schließen per Esc/Tipp außerhalb/X (z. B. während gespeichert wird). */
  dismissible?: boolean;
  /** Element, das beim Öffnen den Fokus erhält. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  role?: 'dialog' | 'alertdialog';
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  dismissible = true,
  initialFocusRef,
  role = 'dialog',
  className,
}: DialogProps) {
  const rendered = usePresence(open, 220);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useModal({ open, containerRef: panelRef, onEscape: dismissible ? onClose : undefined, initialFocusRef });

  if (!rendered) return null;

  return createPortal(
    <div className={cx(s.root, s.dialogRoot)} data-state={open ? 'open' : 'closed'}>
      <div className={s.backdrop} onClick={dismissible ? onClose : undefined} aria-hidden="true" />
      <div
        ref={panelRef}
        className={cx(s.dialog, className)}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        {dismissible && (
          <IconButton className={s.dialogClose} label="Schließen" icon={<X />} size="sm" variant="tonal" onClick={onClose} />
        )}
        <h2 id={titleId} className={s.dialogTitle}>
          {title}
        </h2>
        {description && (
          <div id={descId} className={s.dialogDescription}>
            {description}
          </div>
        )}
        {children && <div className={s.dialogBody}>{children}</div>}
        {actions && <div className={s.dialogActions}>{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  /** Abbrechen / Schließen */
  onClose: () => void;
  /** Bestätigen; darf ein Promise liefern (Button zeigt dann Ladezustand). Schließen übernimmt der Aufrufer. */
  onConfirm: () => void | Promise<unknown>;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = destruktive Aktion (roter Button, Fokus startet auf „Abbrechen“). */
  tone?: 'default' | 'danger';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  tone = 'default',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = async () => {
    const result = onConfirm();
    if (result instanceof Promise) {
      setBusy(true);
      try {
        await result;
      } catch (err) {
        // Fehlermeldung ist Sache des Aufrufers (z. B. Toast); hier nur protokollieren.
        console.error(err);
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      role="alertdialog"
      dismissible={!busy}
      initialFocusRef={tone === 'danger' ? cancelRef : undefined}
      actions={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
