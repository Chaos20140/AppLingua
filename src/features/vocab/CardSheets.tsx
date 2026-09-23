/** Detailansicht einer Karte (Notiz, Pausieren, Löschen) und „Eigene Karte anlegen“. */
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Plus, Save, Trash, Volume2 } from 'lucide-react';
import type { CourseId, SrsCard } from '../../core/types';
import { cardId, formatInterval } from '../../engine/srs';
import { looseKey } from '../../engine/text';
import { uid } from '../../data/store';
import { addSrsCard, removeSrsCard, setCardSuspended, updateCardNote } from '../../state/actions';
import { useTts } from '../../speech/tts';
import { BottomSheet, Button, ConfirmDialog, TextArea, TextField, useToast } from '../../ui';
import { ACCENTS } from '../partner/ChatParts';
import { dueLabel, formatDueDate, sourceText } from './vocabUtils';
import s from './VocabPage.module.css';

// ───────────────────────── Detail ─────────────────────────

export interface CardDetailSheetProps {
  card: SrsCard | null;
  lang: string;
  onClose: () => void;
}

export function CardDetailSheet({ card, lang, onClose }: CardDetailSheetProps) {
  const tts = useTts();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = card ? cardId(card.courseId, card.itemId) : '';

  useEffect(() => { setNote(card?.note ?? ''); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const noteChanged = (card?.note ?? '') !== note.trim();

  return (
    <>
      <BottomSheet
        open={card !== null}
        onClose={onClose}
        title={card?.front ?? 'Karte'}
        description={card?.back}
      >
        {card && (
          <div className={s.detail}>
            <div className={s.detailHead}>
              {tts.available && (
                <Button variant="secondary" icon={<Volume2 size={18} />} onClick={() => void tts.speak(card.front, { lang })}>
                  Anhören
                </Button>
              )}
              <span className={s.detailSource}>
                {sourceText(card)}
              </span>
            </div>
            {card.hint && <p className={s.detailHint}>{card.hint}</p>}

            <dl className={s.facts}>
              <div><dt>Status</dt><dd>{dueLabel(card)}</dd></div>
              <div><dt>Nächste Wiederholung</dt><dd>{card.suspended ? '–' : formatDueDate(card.dueAt)}</dd></div>
              <div><dt>Wiederholt</dt><dd>{card.reps}×</dd></div>
              <div><dt>Vergessen</dt><dd>{card.lapses}×</dd></div>
              <div><dt>Intervall</dt><dd>{card.reps ? formatInterval(card.intervalDays) : 'neu'}</dd></div>
            </dl>

            <div className={s.noteBox}>
              <TextArea
                label="Deine Notiz"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                showCount
                placeholder="Eselsbrücke, Beispielsatz …"
              />
              <Button
                variant="secondary"
                icon={<Save size={16} />}
                disabled={!noteChanged}
                onClick={() => { updateCardNote(id, note); toast('Notiz gespeichert.', { tone: 'success' }); }}
              >
                Notiz speichern
              </Button>
            </div>

            <div className={s.detailActions}>
              <Button
                variant="secondary"
                icon={card.suspended ? <Play size={16} /> : <Pause size={16} />}
                onClick={() => {
                  setCardSuspended(id, !card.suspended);
                  toast(card.suspended ? 'Karte ist wieder aktiv.' : 'Karte pausiert – sie erscheint nicht mehr in Wiederholungen.', { tone: 'info' });
                }}
              >
                {card.suspended ? 'Fortsetzen' : 'Pausieren'}
              </Button>
              <Button variant="danger" icon={<Trash size={16} />} onClick={() => setConfirmDelete(true)}>Löschen</Button>
            </div>
          </div>
        )}
      </BottomSheet>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeSrsCard(id);
          setConfirmDelete(false);
          onClose();
          toast('Karte gelöscht.', { tone: 'info' });
        }}
        title="Karte löschen?"
        message={card ? `„${card.front}“ und ihr Lernfortschritt werden entfernt. Das lässt sich nicht rückgängig machen.` : undefined}
        confirmLabel="Löschen"
        tone="danger"
      />
    </>
  );
}

// ───────────────────────── Neue Karte ─────────────────────────

export interface AddCardSheetProps {
  open: boolean;
  onClose: () => void;
  courseId: CourseId;
  lang: string;
  existing: readonly SrsCard[];
}

export function AddCardSheet({ open, onClose, courseId, lang, existing }: AddCardSheetProps) {
  const toast = useToast();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [hint, setHint] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setFront(''); setBack(''); setHint(''); setNote(''); setError(null); }
  }, [open]);

  const insert = (ch: string) => {
    const el = frontRef.current;
    const start = el?.selectionStart ?? front.length;
    const end = el?.selectionEnd ?? front.length;
    setFront(front.slice(0, start) + ch + front.slice(end));
    requestAnimationFrame(() => { el?.focus({ preventScroll: true }); el?.setSelectionRange(start + ch.length, start + ch.length); });
  };

  const save = (keepOpen: boolean) => {
    const f = front.trim();
    const b = back.trim();
    if (!f || !b) { setError('Bitte fülle Zielsprache und Deutsch aus.'); return; }
    if (existing.some((c) => looseKey(c.front) === looseKey(f))) { setError(`„${f}“ ist schon in deinen Vokabeln.`); return; }
    addSrsCard({
      courseId,
      itemId: `user.${uid()}`,
      kind: f.includes(' ') ? 'phrase' : 'vocab',
      front: f.slice(0, 160),
      back: b.slice(0, 160),
      source: { type: 'user', label: 'Eigene Karte' },
      ...(hint.trim() ? { hint: hint.trim().slice(0, 200) } : {}),
      ...(note.trim() ? { note: note.trim().slice(0, 500) } : {}),
    });
    toast(`„${f}“ angelegt – die Karte ist sofort fällig.`, { tone: 'success' });
    if (keepOpen) {
      setFront(''); setBack(''); setHint(''); setNote(''); setError(null);
      requestAnimationFrame(() => frontRef.current?.focus());
    } else onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Eigene Karte"
      description="Wörter oder Sätze, die du dir merken möchtest – sie landen direkt in deiner Wiederholung."
      footer={
        <div className={s.sheetFooter}>
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => save(true)}>Speichern & weitere</Button>
          <Button icon={<Save size={16} />} onClick={() => save(false)}>Speichern</Button>
        </div>
      }
    >
      <form className={s.addForm} onSubmit={(e) => { e.preventDefault(); save(false); }} noValidate>
        <div>
          <TextField
            ref={frontRef}
            label="Zielsprache"
            value={front}
            onChange={(e) => { setFront(e.target.value); setError(null); }}
            maxLength={160}
            lang={lang}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={courseId === 'es' ? 'z. B. la playa' : 'z. B. a praia'}
            enterKeyHint="next"
          />
          <div className={s.accentRow} role="group" aria-label="Sonderzeichen einfügen">
            {ACCENTS[courseId].map((ch) => (
              <button key={ch} type="button" className={s.accentBtn} onPointerDown={(e) => e.preventDefault()} onClick={() => insert(ch)} aria-label={`${ch} einfügen`}>
                {ch}
              </button>
            ))}
          </div>
        </div>
        <TextField
          label="Deutsch"
          value={back}
          onChange={(e) => { setBack(e.target.value); setError(null); }}
          maxLength={160}
          placeholder="z. B. der Strand"
          enterKeyHint="next"
        />
        <TextField label="Hinweis (optional)" value={hint} onChange={(e) => setHint(e.target.value)} maxLength={200} placeholder="z. B. feminin, Plural: las playas" />
        <TextArea label="Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Eselsbrücke, Beispielsatz …" />
        <p className={s.formError} role="alert" aria-live="assertive">{error ?? ''}</p>
      </form>
    </BottomSheet>
  );
}
