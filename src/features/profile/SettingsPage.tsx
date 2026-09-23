import { useCallback, useEffect, useState } from 'react';
import { Bot, GraduationCap, Mic, Monitor, Moon, Palette, Play, Scale, ShieldCheck, Sun, Target, Tv } from 'lucide-react';
import { version as APP_VERSION } from '../../../package.json';
import type { CourseId, EsVariant, LanguageLevel, PartnerPrefs, Settings } from '../../core/types';
import { Badge, Button, ConfirmDialog, ListRow, Page, Segmented, Select, Toggle, useToast } from '../../ui';
import { cx } from '../../ui/internal/helpers';
import { getLocalDb, deleteAllRecordings, listRecordings } from '../../data/db';
import { useAiStatus } from '../../ai/client';
import { LANGUAGE_LEVEL_ORDER } from '../../engine/unlock';
import {
  DAILY_GOAL_OPTIONS, VARIANT_LABELS, setActiveCourse, setEsVariant, updateSettings, useSettings,
} from '../../state/settings';
import { DataSettings } from './DataSettings';
import { Item, ItemHead, Section } from './SettingsParts';
import { SongSettings } from './SongSettings';
import { VoiceSettings } from './VoiceSettings';
import s from './Profile.module.css';

function RecordingSettings({ settings }: { settings: Settings }) {
  const toast = useToast();
  const [count, setCount] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);

  const refresh = useCallback(() => {
    if (!getLocalDb()) { setCount(null); return; }
    listRecordings().then((r) => setCount(r.length), () => setCount(null));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const remove = async () => {
    try {
      await deleteAllRecordings();
      toast('Alle gespeicherten Aufnahmen wurden gelöscht.', { tone: 'success' });
    } catch {
      toast('Die Aufnahmen konnten nicht gelöscht werden.', { tone: 'error' });
    } finally {
      setConfirm(false);
      refresh();
    }
  };

  return (
    <Section id="set-rec" title="Sprachaufnahmen" icon={<Mic size={14} />}>
      <Item tight>
        <Toggle
          label="Aufnahmen speichern"
          description="Mit deiner Zustimmung speichert AppLingua deine Aussprache-Aufnahmen, damit du Fortschritte nachhören kannst – ausschließlich auf diesem Gerät, nie in der Cloud."
          checked={settings.storeRecordings}
          onChange={(v) => updateSettings({ storeRecordings: v })}
        />
      </Item>
      {count !== null && count > 0 && (
        <Item>
          <div className={s.inlineRow}>
            <span className={cx(s.desc, s.flush)}>{count} {count === 1 ? 'Aufnahme' : 'Aufnahmen'} auf diesem Gerät</span>
            <Button variant="ghost" onClick={() => setConfirm(true)}>Alle löschen</Button>
          </div>
        </Item>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        title="Alle Aufnahmen löschen?"
        message="Deine gespeicherten Aussprache-Aufnahmen werden unwiderruflich von diesem Gerät gelöscht."
        confirmLabel="Löschen"
        tone="danger"
      />
    </Section>
  );
}

function PartnerSettings({ settings }: { settings: Settings }) {
  const ai = useAiStatus();
  const p = settings.partner;
  const set = (patch: Partial<PartnerPrefs>) => updateSettings({ partner: patch });
  return (
    <Section
      id="set-partner"
      title="KI-Sprachpartner"
      icon={<Bot size={14} />}
      note="Standardwerte für neue Gespräche – du kannst sie im Gespräch jederzeit ändern."
    >
      <Item>
        <div className={s.inlineRow}>
          <span className={cx(s.label, s.flush)}>Status</span>
          {ai.available ? <Badge tone="success">KI verfügbar</Badge> : <Badge tone="neutral">Geführte Dialoge</Badge>}
        </div>
        {!ai.available && ai.reason && <span className={cx(s.desc, s.below)}>{ai.reason}</span>}
      </Item>
      <Item>
        <Select<LanguageLevel>
          label="Sprachniveau des Partners"
          value={p.level}
          onChange={(v) => set({ level: v })}
          options={LANGUAGE_LEVEL_ORDER.map((l) => ({ value: l, label: l }))}
        />
      </Item>
      <Item>
        <ItemHead label="Sprechtempo" />
        <Segmented<PartnerPrefs['speed']>
          label="Sprechtempo des Partners"
          value={p.speed}
          onChange={(v) => set({ speed: v })}
          options={[{ value: 'langsam', label: 'Langsam' }, { value: 'normal', label: 'Normal' }, { value: 'schnell', label: 'Schnell' }]}
        />
      </Item>
      <Item>
        <ItemHead label="Korrekturen" />
        <Segmented<PartnerPrefs['correction']>
          label="Zeitpunkt der Korrekturen"
          value={p.correction}
          onChange={(v) => set({ correction: v })}
          options={[{ value: 'sofort', label: 'Sofort' }, { value: 'danach', label: 'Am Ende' }]}
        />
      </Item>
      <Item tight>
        <Toggle label="Förmliche Anrede" description="Siezen (usted / o senhor) statt Duzen." checked={p.formal} onChange={(v) => set({ formal: v })} />
      </Item>
      <Item tight>
        <Toggle label="Übersetzungen anzeigen" checked={p.translations} onChange={(v) => set({ translations: v })} />
      </Item>
    </Section>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const toast = useToast();
  const goalKnown = DAILY_GOAL_OPTIONS.some((o) => o.xp === settings.dailyGoalXp);
  const goalOptions = [
    ...(goalKnown ? [] : [{ value: String(settings.dailyGoalXp), label: `Eigenes Ziel – ${settings.dailyGoalXp} XP` }]),
    ...DAILY_GOAL_OPTIONS.map((o) => ({ value: String(o.xp), label: `${o.label} – ${o.xp} XP (${o.description})` })),
  ];

  const switchCourse = (id: CourseId) => {
    if (id === settings.activeCourse) return;
    setActiveCourse(id);
    toast(`Aktiver Kurs: ${id === 'pt-BR' ? VARIANT_LABELS['pt-BR'] : 'Spanisch'}`, { tone: 'success' });
  };

  return (
    <Page title="Einstellungen" back="/profil" gap="lg">
      <Section id="set-course" title="Kurs & Variante" icon={<GraduationCap size={14} />}>
        <Item>
          <ItemHead label="Aktiver Kurs" description="Getrennte Lernpfade – der Fortschritt bleibt je Kurs erhalten." />
          <Segmented<CourseId>
            label="Aktiver Kurs"
            value={settings.activeCourse}
            onChange={switchCourse}
            options={[{ value: 'es', label: '🇪🇸 Spanisch' }, { value: 'pt-BR', label: '🇧🇷 Portugiesisch' }]}
          />
        </Item>
        <Item>
          <ItemHead
            label="Spanisch-Variante"
            description="Lateinamerika: „s“-Laut und ustedes. Spanien: gelispeltes „z/c“ und vosotros. Inhalte der anderen Variante werden ausgeblendet."
          />
          <Segmented<EsVariant>
            label="Spanisch-Variante"
            value={settings.esVariant}
            onChange={(v) => setEsVariant(v)}
            options={[{ value: 'es-LA', label: '🌎 Lateinamerika' }, { value: 'es-ES', label: '🇪🇸 Spanien' }]}
          />
        </Item>
      </Section>

      <Section id="set-goal" title="Tagesziel" icon={<Target size={14} />}>
        <Item>
          <Select<string>
            label="Tägliches XP-Ziel"
            value={String(settings.dailyGoalXp)}
            onChange={(v) => updateSettings({ dailyGoalXp: Number(v) })}
            options={goalOptions}
            hint="Das Ziel gilt ab sofort – bereits gesammelte XP von heute zählen mit."
          />
        </Item>
      </Section>

      <Section id="set-design" title="Darstellung" icon={<Palette size={14} />}>
        <Item>
          <ItemHead label="Design" />
          <Segmented<Settings['theme']>
            label="Design"
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: 'system', label: 'System', icon: <Monitor size={16} /> },
              { value: 'light', label: 'Hell', icon: <Sun size={16} /> },
              { value: 'dark', label: 'Dunkel', icon: <Moon size={16} /> },
            ]}
          />
        </Item>
        <Item>
          <ItemHead label="Bewegung reduzieren" description="Weniger Animationen und Übergänge." />
          <Segmented<Settings['reducedMotion']>
            label="Bewegung reduzieren"
            value={settings.reducedMotion}
            onChange={(v) => updateSettings({ reducedMotion: v })}
            options={[
              { value: 'system', label: 'Wie System' },
              { value: 'on', label: 'Reduziert' },
              { value: 'off', label: 'Alle' },
            ]}
          />
        </Item>
      </Section>

      <VoiceSettings />

      <Section id="set-learn" title="Lernen & Audio" icon={<Play size={14} />}>
        <Item tight>
          <Toggle
            label="Lautschrift (IPA) anzeigen"
            description="Zusätzlich zur vereinfachten deutschen Aussprachehilfe."
            checked={settings.showIPA}
            onChange={(v) => updateSettings({ showIPA: v })}
          />
        </Item>
        <Item tight>
          <Toggle
            label="Audio automatisch abspielen"
            description="Wörter und Sätze in Übungen werden automatisch vorgelesen, sobald du mit der Seite interagiert hast."
            checked={settings.autoplayAudio}
            onChange={(v) => updateSettings({ autoplayAudio: v })}
          />
        </Item>
        <Item tight>
          <Toggle
            label="Soundeffekte"
            description="Kurze Töne bei richtigen und falschen Antworten."
            checked={settings.soundEffects}
            onChange={(v) => updateSettings({ soundEffects: v })}
          />
        </Item>
        <Item tight>
          <Toggle
            label="Akzente streng werten"
            description="Aus: „esta“ statt „está“ zählt als richtig, mit Hinweis. An: fehlende Akzente zählen als Fehler."
            checked={settings.strictAccents}
            onChange={(v) => updateSettings({ strictAccents: v })}
          />
        </Item>
      </Section>

      <RecordingSettings settings={settings} />

      <Section
        id="set-embeds"
        title="Externe Einbettungen"
        icon={<Tv size={14} />}
        note="Ohne Zustimmung lädt AppLingua nichts von diesen Diensten. Beim Abspielen überträgt dein Browser Daten (z. B. IP-Adresse) an den jeweiligen Anbieter. Du kannst die Zustimmung jederzeit widerrufen."
      >
        <Item tight>
          <Toggle
            label="YouTube"
            description="Videos über youtube-nocookie.com (erweiterter Datenschutzmodus)."
            checked={settings.embedConsent.youtube}
            onChange={(v) => updateSettings({ embedConsent: { youtube: v } })}
          />
        </Item>
        <Item tight>
          <Toggle
            label="Spotify"
            description="Offizieller Spotify-Player."
            checked={settings.embedConsent.spotify}
            onChange={(v) => updateSettings({ embedConsent: { spotify: v } })}
          />
        </Item>
        <Item tight>
          <Toggle
            label="Apple Music"
            description="Offizieller Apple-Music-Player."
            checked={settings.embedConsent.appleMusic}
            onChange={(v) => updateSettings({ embedConsent: { appleMusic: v } })}
          />
        </Item>
      </Section>

      <PartnerSettings settings={settings} />

      <SongSettings />

      <DataSettings />

      <Section id="set-legal" title="Rechtliches" icon={<Scale size={14} />}>
        <ListRow leading={<ShieldCheck size={20} />} title="Datenschutz" subtitle="Was wo gespeichert wird" to="/datenschutz" />
        <ListRow leading={<Scale size={20} />} title="Rechtliches & Lizenzen" to="/rechtliches" />
      </Section>

      <p className={s.version}>AppLingua · Version {APP_VERSION}</p>
    </Page>
  );
}
