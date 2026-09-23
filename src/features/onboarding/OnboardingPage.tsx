import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Check, ChevronLeft, CloudOff, Compass, HardDrive, Play, RefreshCw, ShieldCheck, Sparkles, Square,
} from 'lucide-react';
import type { CourseId, EsVariant, Profile } from '../../core/types';
import { Badge, Button, Card, Chip, IconButton, Page, ProgressBar, Spinner, TextField, useToast } from '../../ui';
import { cx } from '../../ui/internal/helpers';
import { useAuth } from '../../data/auth';
import { nowIso } from '../../data/store';
import { recordPlacement } from '../../state/actions';
import {
  DAILY_GOAL_OPTIONS, setActiveCourse, setEsVariant, updateCourseState, updateProfile, updateSettings,
  useCourseState, useProfile, useSettings,
} from '../../state/settings';
import { useTts } from '../../speech/tts';
import { ChoiceList, type Choice } from './ChoiceList';
import { StepFooter } from './StepFooter';
import { STAGE_SHORT } from './placementLogic';
import s from './Onboarding.module.css';

type StepId = 'language' | 'variant' | 'level' | 'goal' | 'name' | 'placement' | 'account';
type Prior = NonNullable<Profile['priorKnowledge']>;

interface Draft {
  step: StepId;
  course: CourseId;
  variant: EsVariant;
  prior: Prior | null;
  motivation: string | null;
  goal: number;
  name: string;
}

const DRAFT_KEY = 'applingua.onboarding.draft';
const STEP_PARAM: Record<string, StepId> = { einstufung: 'placement', konto: 'account' };

const MOTIVATIONS = [
  'Reisen', 'Beruf & Karriere', 'Studium & Schule', 'Familie & Freunde', 'Musik & Kultur', 'Auswandern', 'Einfach aus Freude',
];

const SAMPLES: Record<EsVariant, { lang: string; label: string; text: string }> = {
  'es-ES': { lang: 'es-ES', label: 'Spanien', text: 'Gracias, la ciudad es preciosa. ¿Vosotros también queréis un café?' },
  'es-LA': { lang: 'es-MX', label: 'Lateinamerika', text: 'Gracias, la ciudad es preciosa. ¿Ustedes también quieren un café?' },
};

function readDraft(): Partial<Draft> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* privater Modus – egal */ }
}
function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* egal */ }
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const settings = useSettings();
  const profile = useProfile();
  const auth = useAuth();
  const tts = useTts();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(() => {
    const stored = readDraft();
    const stateCourse = (location.state as { course?: CourseId } | null)?.course;
    const goalOk = DAILY_GOAL_OPTIONS.some((o) => o.xp === settings.dailyGoalXp);
    const base: Draft = {
      step: 'language',
      course: settings.activeCourse,
      variant: settings.esVariant,
      prior: profile.priorKnowledge ?? null,
      motivation: profile.motivation ?? null,
      goal: goalOk ? settings.dailyGoalXp : 50,
      name: profile.displayName,
    };
    const merged: Draft = { ...base, ...(stored ?? {}) };
    if (stateCourse === 'es' || stateCourse === 'pt-BR') {
      merged.course = stateCourse;
      merged.step = 'language';
    }
    const fromParam = STEP_PARAM[params.get('schritt') ?? ''];
    if (fromParam) merged.step = fromParam;
    return merged;
  });
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [busy, setBusy] = useState(false);

  const courseState = useCourseState(draft.course);
  const placement = courseState.placement;

  const steps = useMemo<StepId[]>(
    () => ['language', ...(draft.course === 'es' ? (['variant'] as StepId[]) : []), 'level', 'goal', 'name', 'placement', 'account'],
    [draft.course],
  );
  const step: StepId = steps.includes(draft.step) ? draft.step : 'language';
  const index = steps.indexOf(step);

  useEffect(() => { writeDraft(draft); }, [draft]);

  // ?schritt=… wurde in den Entwurf übernommen – aus der URL entfernen (Neuladen springt sonst zurück).
  useEffect(() => {
    if (params.has('schritt')) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Schrittwechsel: Überschrift fokussieren (Screenreader), nach oben scrollen.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Stoppt eine laufende Hörprobe beim Verlassen.
  useEffect(() => () => tts.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  /** Sofort wirksam: Auswahl beim Verlassen eines Schritts speichern. */
  const commit = (id: StepId) => {
    if (id === 'language') setActiveCourse(draft.course);
    if (id === 'variant') setEsVariant(draft.variant);
    if (id === 'goal') updateSettings({ dailyGoalXp: draft.goal });
    if (id === 'level' || id === 'name') {
      updateProfile({
        priorKnowledge: draft.prior ?? undefined,
        motivation: draft.motivation ?? undefined,
        displayName: draft.name,
      });
    }
  };

  const goTo = (target: StepId, dir: 'fwd' | 'back') => {
    tts.stop();
    setDirection(dir);
    patch({ step: target });
  };
  const next = () => {
    commit(step);
    const n = steps[index + 1];
    if (n) goTo(n, 'fwd');
  };
  const back = () => {
    const p = steps[index - 1];
    if (p) goTo(p, 'back');
  };

  /** Stufe 0 ohne Test: Entscheidung merken (nur, wenn noch nichts eingestuft ist). */
  const startFromZero = () => {
    if (!placement && courseState.currentStageId === 'stage0') {
      recordPlacement(draft.course, { takenAt: nowIso(), skipped: true, scorePct: 0, startStage: 'stage0' });
    }
    goTo('account', 'fwd');
  };

  const startPlacement = () => {
    setActiveCourse(draft.course);
    if (draft.course === 'es') setEsVariant(draft.variant);
    writeDraft({ ...draft, step: 'placement' });
    navigate('/einstufung?from=onboarding');
  };

  const finish = (to = '/dashboard') => {
    if (busy) return;
    setBusy(true);
    setActiveCourse(draft.course);
    if (draft.course === 'es') setEsVariant(draft.variant);
    updateSettings({ dailyGoalXp: draft.goal });
    updateProfile({
      onboardingDone: true,
      displayName: draft.name,
      priorKnowledge: draft.prior ?? undefined,
      motivation: draft.motivation ?? undefined,
    });
    updateCourseState(draft.course, {});
    clearDraft();
    tts.stop();
    if (to === '/dashboard') toast('Alles eingerichtet – ¡vamos! Viel Freude beim Lernen.', { tone: 'success' });
    navigate(to, { replace: true });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 'level' && !draft.prior) return;
    if (step === 'placement') {
      if (placement && !placement.skipped) next();
      else if (draft.prior === 'none' || !draft.prior) startFromZero();
      else startPlacement();
      return;
    }
    if (step === 'account') {
      if (auth.available && auth.status === 'guest') finish('/registrieren');
      else finish();
      return;
    }
    next();
  };

  // ───────── Inhalte der Schritte ─────────
  const courseChoices: Choice<CourseId>[] = [
    {
      value: 'es', leading: '🇪🇸', title: 'Spanisch', badge: <Badge tone="accent" solid>Standard</Badge>,
      description: 'Mit Spanien- oder Lateinamerika-Variante – über 500 Millionen Sprecher:innen.',
    },
    {
      value: 'pt-BR', leading: '🇧🇷', title: 'Portugiesisch (Brasilien)',
      description: 'Brasilianische Aussprache und Alltagssprache – von Anfang an.',
    },
  ];
  const variantChoices: Choice<EsVariant>[] = [
    {
      value: 'es-LA', leading: '🌎', title: 'Lateinamerika',
      description: '„z“ und „c“ klingen wie „s“, „ustedes“ für „ihr“. Die meistgesprochene Form; unsere Stimme orientiert sich an Mexiko.',
    },
    {
      value: 'es-ES', leading: '🇪🇸', title: 'Spanien',
      description: '„z“ und „c“ vor e/i wie ein gelispeltes „th“, „vosotros“ für „ihr“. Ideal für Reisen nach Spanien.',
    },
  ];
  const priorChoices: Choice<Prior>[] = [
    { value: 'none', leading: '🌱', title: 'Ich fange bei null an', description: 'Kein Problem – Stufe 0 beginnt bei den ersten Lauten.' },
    { value: 'some', leading: '🌿', title: 'Ich kenne schon etwas', description: 'Begrüßungen, Zahlen, ein paar einfache Sätze.' },
    { value: 'good', leading: '🌳', title: 'Ich kann mich verständigen', description: 'Einfache Gespräche klappen schon ganz gut.' },
  ];
  const goalEmoji = ['☕', '🚶', '🏃', '🔥'];
  const goalChoices: Choice<string>[] = DAILY_GOAL_OPTIONS.map((o, i) => ({
    value: String(o.xp),
    leading: goalEmoji[i] ?? '⭐',
    title: o.label,
    badge: (
      <>
        <Badge tone="gold">{o.xp} XP</Badge>
        {o.xp === 50 && <Badge tone="success">Empfohlen</Badge>}
      </>
    ),
    description: o.description,
  }));

  const renderVariantSamples = () => {
    if (!tts.available) {
      return <p className={s.note}>Dein Browser bietet keine Sprachausgabe – die Hörprobe ist hier leider nicht verfügbar.</p>;
    }
    return (
      <div className={s.samples}>
        {(['es-LA', 'es-ES'] as EsVariant[]).map((v) => {
          const sm = SAMPLES[v];
          const key = `sample-${v}`;
          const playing = tts.speaking && tts.speakingKey === key;
          const help = tts.missingVoiceHelp(sm.lang);
          return (
            <div key={v}>
              <div className={s.sample}>
                <IconButton
                  variant="tonal"
                  label={playing ? `Hörprobe ${sm.label} stoppen` : `Hörprobe ${sm.label} abspielen`}
                  icon={playing ? <Square size={18} /> : <Play size={18} />}
                  onClick={() => (playing ? tts.stop() : void tts.speak(sm.text, { lang: sm.lang, key }))}
                />
                <p className={s.sampleText}>
                  <span className={s.sampleLabel}>{sm.label}</span>
                  <span lang={sm.lang}>{sm.text}</span>
                </p>
              </div>
              {help && <p className={cx(s.warn, s.spaced)}>{help}</p>}
            </div>
          );
        })}
        {tts.error && <p className={s.warn} role="alert">{tts.error}</p>}
      </div>
    );
  };

  const stageLabel = placement ? STAGE_SHORT[placement.startStage] : 'Stufe 0';

  let eyebrow = `Schritt ${index + 1} von ${steps.length}`;
  let title = '';
  let lead: string | null = null;
  let body: ReactNode = null;
  let footer: ReactNode = null;
  let tallFooter = false;

  const nextButton = (label = 'Weiter', disabled = false) => (
    <Button type="submit" size="lg" block disabled={disabled} iconRight={<ArrowRight size={20} />}>
      {label}
    </Button>
  );

  switch (step) {
    case 'language':
      title = 'Welche Sprache möchtest du lernen?';
      lead = 'Beide Kurse sind getrennte Lernpfade mit eigenem Fortschritt. Du kannst später jederzeit wechseln.';
      body = (
        <ChoiceList name="course" legend="Sprache" choices={courseChoices} value={draft.course} onChange={(course) => patch({ course })} />
      );
      footer = nextButton();
      break;

    case 'variant':
      title = 'Welches Spanisch passt zu dir?';
      lead = 'Beide Varianten werden überall verstanden. Der Unterschied liegt vor allem in Aussprache und einigen Wörtern.';
      body = (
        <>
          <ChoiceList name="variant" legend="Variante" choices={variantChoices} value={draft.variant} onChange={(variant) => patch({ variant })} />
          <Card tone="muted">
            <h3 className={s.cardTitle}>Hör den Unterschied</h3>
            {renderVariantSamples()}
          </Card>
        </>
      );
      footer = nextButton();
      break;

    case 'level':
      title = 'Wie viel kannst du schon?';
      lead = 'Damit wir dir den passenden Einstieg vorschlagen können.';
      body = (
        <>
          <ChoiceList name="prior" legend="Vorkenntnisse" choices={priorChoices} value={draft.prior} onChange={(prior) => patch({ prior })} />
          <div>
            <h3 className={s.subhead} id="motivation-label">Was motiviert dich am meisten? <span className={s.note}>(optional)</span></h3>
            <div className={cx(s.chips, s.spaced)} role="group" aria-labelledby="motivation-label">
              {MOTIVATIONS.map((m) => (
                <Chip
                  key={m}
                  selected={draft.motivation === m}
                  onClick={() => patch({ motivation: draft.motivation === m ? null : m })}
                >
                  {m}
                </Chip>
              ))}
            </div>
          </div>
        </>
      );
      footer = nextButton(draft.prior ? 'Weiter' : 'Bitte wähle deine Vorkenntnisse', !draft.prior);
      break;

    case 'goal':
      title = 'Wie viel Zeit möchtest du täglich investieren?';
      lead = 'Regelmäßigkeit schlägt Marathon. Du kannst dein Tagesziel jederzeit anpassen.';
      body = (
        <ChoiceList
          name="goal" legend="Tagesziel" choices={goalChoices} value={String(draft.goal)}
          onChange={(v) => patch({ goal: Number(v) })}
        />
      );
      footer = nextButton();
      break;

    case 'name':
      title = 'Wie dürfen wir dich nennen?';
      lead = 'Nur für die persönliche Ansprache in der App. Du kannst das Feld auch leer lassen.';
      body = (
        <TextField
          label="Dein Vorname (optional)"
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value.slice(0, 40) })}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={40}
          placeholder="z. B. Alex"
          hint="Bleibt auf deinem Gerät – bzw. in deinem Konto, falls du eines anlegst."
        />
      );
      footer = nextButton(draft.name.trim() ? 'Weiter' : 'Ohne Namen weiter');
      break;

    case 'placement':
      title = 'Wo möchtest du einsteigen?';
      if (placement && !placement.skipped) {
        lead = null;
        body = (
          <Card>
            <div className={s.infoCard}>
              <span className={cx(s.infoIcon, s.infoIconSuccess)} aria-hidden="true"><Check size={20} /></span>
              <div className={s.infoBody}>
                <p className={s.infoTitle}>Einstufung gespeichert: Start bei {stageLabel}</p>
                <p className={s.infoText}>
                  Das Ergebnis ist vorläufig – dein Sprachniveau bestätigst du später mit Prüfungen im Lernpfad.
                </p>
              </div>
            </div>
          </Card>
        );
        tallFooter = true;
        footer = (
          <>
            {nextButton()}
            <Button variant="ghost" block icon={<RefreshCw size={18} />} onClick={startPlacement}>
              Einstufung wiederholen
            </Button>
          </>
        );
      } else if (draft.prior === 'none' || !draft.prior) {
        lead = 'Du startest ganz entspannt bei Stufe 0.';
        body = (
          <Card tone="accent">
            <div className={s.infoCard}>
              <span className={cx(s.infoIcon, s.infoIconAccent)} aria-hidden="true"><Sparkles size={20} /></span>
              <div className={s.infoBody}>
                <p className={s.infoTitle}>Unsere Empfehlung: Bei Null starten</p>
                <p className={s.infoText}>
                  Stufe 0 führt dich Schritt für Schritt von den ersten Lauten bis zu kleinen Gesprächen – mit klaren
                  Erklärungen und ohne Zeitdruck.
                </p>
              </div>
            </div>
          </Card>
        );
        tallFooter = true;
        footer = (
          <>
            {nextButton('Bei Null starten')}
            <Button variant="ghost" block onClick={startPlacement}>
              Doch einen Einstufungstest machen
            </Button>
          </>
        );
      } else {
        lead = 'Ein kurzer Test zeigt, welche Etappen du überspringen kannst.';
        body = (
          <Card>
            <div className={s.infoCard}>
              <span className={s.infoIcon} aria-hidden="true"><Compass size={20} /></span>
              <div className={s.infoBody}>
                <p className={s.infoTitle}>Einstufungstest · ca. 5 Minuten</p>
                <ul className={s.bullets}>
                  <li><Check size={16} aria-hidden="true" />Die Fragen werden nach und nach schwieriger.</li>
                  <li><Check size={16} aria-hidden="true" />„Weiß ich nicht“ ist ausdrücklich erlaubt.</li>
                  <li><Check size={16} aria-hidden="true" />Das Ergebnis ist ein Vorschlag – du entscheidest.</li>
                </ul>
              </div>
            </div>
          </Card>
        );
        tallFooter = true;
        footer = (
          <>
            {nextButton('Einstufungstest starten')}
            <Button variant="ghost" block onClick={startFromZero}>
              Überspringen – bei Stufe 0 beginnen
            </Button>
          </>
        );
      }
      break;

    case 'account':
      eyebrow = `Schritt ${index + 1} von ${steps.length} · Fast geschafft`;
      if (!auth.available) {
        title = 'Dein Fortschritt bleibt auf diesem Gerät';
        body = (
          <Card>
            <div className={s.infoCard}>
              <span className={s.infoIcon} aria-hidden="true"><HardDrive size={20} /></span>
              <div className={s.infoBody}>
                <p className={s.infoTitle}>Lokaler Modus</p>
                <p className={s.infoText}>
                  Konten sind in dieser Installation noch nicht eingerichtet. Alles, was du lernst, wird sicher auf diesem
                  Gerät gespeichert. Eine Sicherung kannst du jederzeit unter Einstellungen → Daten exportieren.
                </p>
              </div>
            </div>
          </Card>
        );
        footer = nextButton('Los geht’s');
      } else if (auth.status === 'loading') {
        title = 'Konto wird geprüft …';
        body = <Spinner label="Anmeldestatus wird geladen" />;
        footer = (
          <Button size="lg" block variant="secondary" onClick={() => finish()}>
            Ohne Konto fortfahren
          </Button>
        );
      } else if (auth.status === 'signed-in') {
        title = 'Du bist angemeldet';
        body = (
          <Card>
            <div className={s.infoCard}>
              <span className={cx(s.infoIcon, s.infoIconSuccess)} aria-hidden="true"><ShieldCheck size={20} /></span>
              <div className={s.infoBody}>
                <p className={s.infoTitle}>{auth.user?.email ?? 'Dein Konto'}</p>
                <p className={s.infoText}>Dein Fortschritt wird automatisch in deinem Konto gesichert.</p>
              </div>
            </div>
          </Card>
        );
        footer = nextButton('Los geht’s');
      } else {
        title = 'Möchtest du deinen Fortschritt sichern?';
        lead = 'Mit einem kostenlosen Konto lernst du auf allen Geräten weiter und verlierst nichts.';
        body = (
          <Card tone="muted">
            <div className={s.infoCard}>
              <span className={s.infoIcon} aria-hidden="true"><CloudOff size={20} /></span>
              <div className={s.infoBody}>
                <p className={s.infoTitle}>Als Gast geht es auch</p>
                <p className={s.infoText}>
                  Dann bleibt alles auf diesem Gerät. Legst du später ein Konto an, kannst du deinen Gastfortschritt
                  vollständig übernehmen.
                </p>
              </div>
            </div>
          </Card>
        );
        tallFooter = true;
        footer = (
          <>
            {nextButton('Konto erstellen')}
            <div className={s.footerRow}>
              <Button variant="secondary" onClick={() => finish('/anmelden')}>Anmelden</Button>
              <Button variant="ghost" onClick={() => finish()}>Als Gast weiter</Button>
            </div>
          </>
        );
      }
      break;
  }

  return (
    <Page
      title="Einrichtung"
      largeTitle={false}
      back={index === 0 ? '/willkommen' : undefined}
      leading={index > 0 ? <IconButton label="Zurück" icon={<ChevronLeft size={24} />} onClick={back} /> : undefined}
      actions={<span className={s.stepCount} aria-hidden="true">{index + 1}/{steps.length}</span>}
    >
      <div className={s.progressWrap}>
        <ProgressBar value={(index + 1) / steps.length} label="Fortschritt der Einrichtung" valueText={eyebrow} size="sm" />
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div key={step} className={cx(s.step, direction === 'back' && s.stepBack)}>
          <header className={s.stepHead}>
            <p className={s.eyebrow}>{eyebrow}</p>
            <h2 ref={headingRef} tabIndex={-1} className={s.question}>{title}</h2>
            {lead && <p className={s.lead}>{lead}</p>}
          </header>
          {body}
        </div>
        <StepFooter tall={tallFooter}>{footer}</StepFooter>
      </form>
    </Page>
  );
}
