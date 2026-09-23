/** Setup vor einem Gespräch: Modus, Niveau, Thema, Anrede, Tempo, Korrektur, Übersetzungshilfen. */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Compass, Info, MessageCircle, Volume2 } from 'lucide-react';
import type { PartnerPrefs } from '../../core/types';
import type { Scenario } from '../../content/types';
import type { AiStatus } from '../../ai/client';
import { BottomSheet, Button, Segmented, Select, TextField, Toggle, useToast } from '../../ui';
import { ttsLangFor, updateSettings, useSettings, useVariant } from '../../state/settings';
import { useTts } from '../../speech/tts';
import { pickScript } from './offlineEngine';
import { LANGUAGE_LEVELS, type PartnerLaunchState } from './launch';
import { rateForSpeed, type ChatMode } from './useConversation';
import s from './Hub.module.css';

export interface SetupSheetProps {
  scenario: Scenario | null;
  onClose: () => void;
  ai: AiStatus;
}

export function SetupSheet({ scenario, onClose, ai }: SetupSheetProps) {
  const settings = useSettings();
  const variant = useVariant(scenario?.courseId);
  const navigate = useNavigate();
  const toast = useToast();
  const tts = useTts();
  const [prefs, setPrefs] = useState<PartnerPrefs>(settings.partner);
  const [mode, setMode] = useState<ChatMode>(ai.available ? 'ai' : 'offline');
  const [topic, setTopic] = useState('');
  const [saveDefault, setSaveDefault] = useState(false);

  // beim Öffnen: Voreinstellungen aus den Einstellungen, Anrede passend zur Situation
  useEffect(() => {
    if (!scenario) return;
    setPrefs({ ...settings.partner, formal: scenario.register === 'formell' });
    setMode(ai.available ? 'ai' : 'offline');
    setTopic('');
    setSaveDefault(false);
    // nur beim Wechsel der Situation neu setzen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.id]);

  useEffect(() => {
    if (!ai.available) setMode('offline');
  }, [ai.available]);

  const script = useMemo(() => (scenario ? pickScript(scenario, prefs.formal) : null), [scenario, prefs.formal]);
  const set = <K extends keyof PartnerPrefs>(k: K, v: PartnerPrefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));
  const lang = ttsLangFor(variant);
  const sample = script?.nodes[0]?.partner ?? scenario?.phrases[0]?.target ?? '';
  const offlineUnavailable = mode === 'offline' && !script;

  const start = () => {
    if (!scenario || offlineUnavailable) return;
    if (saveDefault) {
      updateSettings({ partner: prefs });
      toast('Als Standard gespeichert.', { tone: 'success' });
    }
    tts.stop();
    const state: PartnerLaunchState = { prefs, mode, ...(mode === 'ai' && topic.trim() ? { topic: topic.trim() } : {}) };
    navigate(`/partner/${encodeURIComponent(scenario.id)}`, { state });
  };

  return (
    <BottomSheet
      open={scenario !== null}
      onClose={() => { tts.stop(); onClose(); }}
      title={scenario ? `${scenario.emoji} ${scenario.title}` : 'Gespräch'}
      description={scenario?.description}
      footer={
        <Button block size="lg" icon={<MessageCircle size={20} />} onClick={start} disabled={offlineUnavailable}>
          Gespräch starten
        </Button>
      }
    >
      {scenario && (
        <div className={s.setup}>
          <div className={s.roles}>
            <p><span className={s.roleLabel}>Du</span>{scenario.userRole}</p>
            <p><span className={s.roleLabel}>Partner</span>{scenario.partnerRole}</p>
          </div>
          {scenario.goals.length > 0 && (
            <div>
              <h3 className={s.setupHeading}>Deine Ziele</h3>
              <ul className={s.goals}>
                {scenario.goals.map((g) => <li key={g}>{g}</li>)}
              </ul>
            </div>
          )}

          <div className={s.field}>
            <h3 className={s.setupHeading}>Modus</h3>
            {ai.available ? (
              <Segmented<ChatMode>
                label="Gesprächsmodus"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'ai', label: 'KI-Partner', icon: <Bot size={16} /> },
                  { value: 'offline', label: 'Geführt', icon: <Compass size={16} /> },
                ]}
              />
            ) : (
              <p className={s.info}><Info size={16} aria-hidden="true" /><span><strong>Geführter Offline-Dialog.</strong> {ai.reason}</span></p>
            )}
            <p className={s.fieldHint}>
              {mode === 'ai'
                ? 'Frei sprechen: Der KI-Partner reagiert auf alles, was du schreibst, und korrigiert dich.'
                : 'Ein geskriptetes Gespräch mit Tipps und Beispielantworten – funktioniert auch ohne Internet.'}
            </p>
          </div>

          {mode === 'ai' ? (
            <>
              <Select
                label="Sprachniveau"
                value={prefs.level}
                onChange={(v) => set('level', v)}
                options={LANGUAGE_LEVELS.map((l) => ({ value: l, label: l }))}
                hint="So einfach oder anspruchsvoll formuliert dein Partner."
              />
              <TextField
                label="Thema (optional)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={80}
                placeholder="z. B. vegetarisch essen, Allergien, Wochenende"
                hint="Ein Schwerpunkt, den der KI-Partner ins Gespräch einbaut."
                enterKeyHint="done"
              />
            </>
          ) : (
            <p className={s.fieldHint}>Sprachniveau und Thema passt nur der KI-Partner an – der geführte Dialog ist fest geschrieben.</p>
          )}

          <div className={s.field}>
            <h3 className={s.setupHeading}>Anrede</h3>
            <Segmented<'formell' | 'informell'>
              label="Anrede"
              value={prefs.formal ? 'formell' : 'informell'}
              onChange={(v) => set('formal', v === 'formell')}
              options={[
                { value: 'informell', label: 'Informell' },
                { value: 'formell', label: 'Formell' },
              ]}
            />
            {mode === 'offline' && script?.notice && <p className={s.fieldHint}>{script.notice}</p>}
            {mode === 'offline' && !script && <p className={s.fieldError}>Für diese Situation gibt es keinen geführten Dialog.</p>}
          </div>

          <div className={s.field}>
            <div className={s.fieldRow}>
              <h3 className={s.setupHeading}>Sprechtempo</h3>
              {tts.available && sample && (
                <Button
                  variant="ghost"
                  icon={<Volume2 size={16} />}
                  onClick={() => void tts.speak(sample, { lang, rate: rateForSpeed(prefs.speed, settings), key: 'setup-sample' })}
                >
                  Hörprobe
                </Button>
              )}
            </div>
            <Segmented<PartnerPrefs['speed']>
              label="Sprechtempo"
              value={prefs.speed}
              onChange={(v) => set('speed', v)}
              options={[
                { value: 'langsam', label: 'Langsam' },
                { value: 'normal', label: 'Normal' },
                { value: 'schnell', label: 'Schnell' },
              ]}
            />
            {!tts.available && <p className={s.fieldHint}>Sprachausgabe ist in diesem Browser nicht verfügbar – du liest die Nachrichten.</p>}
            {tts.error && <p className={s.fieldError} role="alert">{tts.error}</p>}
          </div>

          <div className={s.field}>
            <h3 className={s.setupHeading}>Korrekturen</h3>
            <Segmented<PartnerPrefs['correction']>
              label="Korrekturen"
              value={prefs.correction}
              onChange={(v) => set('correction', v)}
              options={[
                { value: 'sofort', label: 'Sofort' },
                { value: 'danach', label: 'Erst am Ende' },
              ]}
            />
            <p className={s.fieldHint}>
              {prefs.correction === 'sofort' ? 'Hinweise direkt unter deiner Nachricht.' : 'Ungestört sprechen – alles Wichtige steht in der Auswertung.'}
            </p>
          </div>

          <div className={s.toggles}>
            <Toggle
              checked={prefs.translations}
              onChange={(v) => set('translations', v)}
              label="Übersetzungshilfen"
              description="Deutsche Übersetzung pro Nachricht auf Tippen."
            />
            <Toggle
              checked={saveDefault}
              onChange={setSaveDefault}
              label="Als Standard speichern"
              description="Diese Einstellungen für künftige Gespräche vorauswählen."
            />
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
