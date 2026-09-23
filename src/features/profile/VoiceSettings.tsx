import { Play, Snail, Square } from 'lucide-react';
import { Badge, IconButton, type BadgeTone } from '../../ui';
import { useTts, type VoiceStatus } from '../../speech/tts';
import { updateSettings, useSettings } from '../../state/settings';
import { Item, RateSlider, Section } from './SettingsParts';
import s from './Profile.module.css';

const VOICES = [
  { lang: 'es-ES', label: 'Spanisch (Spanien)', sample: '¡Hola! Encantada de conocerte. ¿Qué tal estás hoy?' },
  { lang: 'es-MX', label: 'Spanisch (Lateinamerika)', sample: '¡Hola! Mucho gusto. ¿Cómo estás hoy?' },
  { lang: 'pt-BR', label: 'Portugiesisch (Brasilien)', sample: 'Olá! Muito prazer. Tudo bem com você?' },
] as const;

const STATUS: Record<VoiceStatus, { label: string; tone: BadgeTone }> = {
  ok: { label: 'Stimme vorhanden', tone: 'success' },
  'region-fallback': { label: 'Ersatzstimme', tone: 'warning' },
  missing: { label: 'Keine Stimme', tone: 'danger' },
  unknown: { label: 'Status unbekannt', tone: 'neutral' },
  unsupported: { label: 'Nicht unterstützt', tone: 'danger' },
};

/** Sprachausgabe: Tempo, Test je Sprache, Stimmen-Status + Hilfe. */
export function VoiceSettings() {
  const settings = useSettings();
  const tts = useTts();

  const play = (lang: string, text: string, rate: number, key: string) => {
    if (tts.speaking && tts.speakingKey === key) { tts.stop(); return; }
    void tts.speak(text, { lang, rate, key });
  };

  return (
    <Section
      id="set-voice"
      title="Sprachausgabe"
      note="Die Sprachausgabe nutzt die Stimmen deines Geräts und läuft lokal. Mehr Stimmen installierst du in den Systemeinstellungen."
    >
      {!tts.available && (
        <Item>
          <p className={s.warnText}>
            Dein Browser bietet keine Sprachausgabe. Du kannst trotzdem lernen – Hörübungen zeigen dann den Text an.
          </p>
        </Item>
      )}
      <Item>
        <RateSlider
          label="Normales Tempo"
          value={settings.ttsRate}
          min={0.8}
          max={1.1}
          disabled={!tts.available}
          onCommit={(v) => updateSettings({ ttsRate: v })}
        />
      </Item>
      <Item>
        <RateSlider
          label="Langsames Tempo"
          value={settings.ttsSlowRate}
          min={0.5}
          max={0.8}
          disabled={!tts.available}
          onCommit={(v) => updateSettings({ ttsSlowRate: v })}
        />
      </Item>
      {tts.available && VOICES.map((v) => {
        const status = tts.voiceStatus(v.lang);
        const st = STATUS[status];
        const voice = tts.bestVoice(v.lang);
        const help = status === 'missing' || status === 'region-fallback' ? tts.missingVoiceHelp(v.lang) : null;
        const keyN = `settings-${v.lang}-n`;
        const keyS = `settings-${v.lang}-s`;
        const playingN = tts.speaking && tts.speakingKey === keyN;
        const playingS = tts.speaking && tts.speakingKey === keyS;
        return (
          <Item key={v.lang}>
            <div className={s.voiceRow}>
              <div className={s.voiceInfo}>
                <span className={s.voiceName}>{v.label}</span>
                <span><Badge tone={st.tone}>{st.label}</Badge>{voice ? <span className={s.meta}> · {voice.name}</span> : null}</span>
              </div>
              <div className={s.voiceButtons}>
                <IconButton
                  variant="tonal"
                  label={playingN ? `${v.label}: Test stoppen` : `${v.label} im normalen Tempo testen`}
                  icon={playingN ? <Square size={18} /> : <Play size={18} />}
                  onClick={() => play(v.lang, v.sample, settings.ttsRate, keyN)}
                />
                <IconButton
                  variant="tonal"
                  label={playingS ? `${v.label}: Test stoppen` : `${v.label} langsam testen`}
                  icon={playingS ? <Square size={18} /> : <Snail size={18} />}
                  onClick={() => play(v.lang, v.sample, settings.ttsSlowRate, keyS)}
                />
              </div>
            </div>
            {help && <p className={s.voiceHelp}>{help}</p>}
          </Item>
        );
      })}
      {tts.error && (
        <Item>
          <p className={s.warnText} role="alert">{tts.error}</p>
        </Item>
      )}
    </Section>
  );
}
