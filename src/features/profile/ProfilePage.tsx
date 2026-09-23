import { useState, type FormEvent } from 'react';
import {
  BarChart3, BookCheck, Compass, Flame, NotebookPen, Pencil, Scale, Settings, ShieldCheck, Sparkles, Trophy, UserRound,
} from 'lucide-react';
import type { CourseId, EsVariant } from '../../core/types';
import {
  Badge, BottomSheet, Button, Card, IconButton, ListRow, Page, ProgressRing, Segmented, StatTile, TextField, useToast,
} from '../../ui';
import { cx } from '../../ui/internal/helpers';
import { useBadges } from '../../state/badges';
import { useLanguageLevel, useLessonProgress, useLevelInfo, useStreak } from '../../state/progress';
import {
  VARIANT_LABELS, setActiveCourse, setEsVariant, updateProfile, useCourseState, useProfile, useSettings,
} from '../../state/settings';
import { STAGE_SHORT } from '../onboarding/placementLogic';
import { AccountCard } from './AccountCard';
import s from './Profile.module.css';

const fmt = (n: number) => n.toLocaleString('de-DE');

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return (first + last).toUpperCase();
}

export default function ProfilePage() {
  const profile = useProfile();
  const settings = useSettings();
  const courseId = settings.activeCourse;
  const levelInfo = useLevelInfo();
  const lang = useLanguageLevel(courseId);
  const streak = useStreak();
  const lessons = useLessonProgress(courseId);
  const badges = useBadges();
  const courseState = useCourseState(courseId);
  const toast = useToast();

  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const name = profile.displayName.trim();
  const initials = initialsOf(name);
  const since = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) : null;
  const lessonCount = Object.keys(lessons).length;
  const placement = courseState.placement;

  const openName = () => { setNameDraft(profile.displayName); setNameOpen(true); };
  const saveName = (e?: FormEvent) => {
    e?.preventDefault();
    updateProfile({ displayName: nameDraft });
    setNameOpen(false);
    toast(nameDraft.trim() ? 'Name gespeichert.' : 'Name entfernt.', { tone: 'success' });
  };

  const switchCourse = (id: CourseId) => {
    if (id === courseId) return;
    setActiveCourse(id);
    toast(`Aktiver Kurs: ${id === 'pt-BR' ? VARIANT_LABELS['pt-BR'] : 'Spanisch'}`, { tone: 'success' });
  };
  const switchVariant = (v: EsVariant) => {
    if (v === settings.esVariant) return;
    setEsVariant(v);
    toast(`Variante: ${VARIANT_LABELS[v]}`, { tone: 'success' });
  };

  const langLong = lang.level.length > 3;

  return (
    <Page
      title="Profil"
      actions={<IconButton label="Einstellungen" icon={<Settings size={22} />} to="/einstellungen" />}
      gap="lg"
    >
      <Card padding="lg">
        <div className={s.identity}>
          <div className={s.avatar} aria-hidden="true">{initials || <UserRound size={32} />}</div>
          <div className={s.who}>
            <h2 className={s.name}>{name || 'Dein Profil'}</h2>
            <p className={s.meta}>
              {courseId === 'pt-BR' ? '🇧🇷 Portugiesisch' : '🇪🇸 Spanisch'}
              {since ? ` · dabei seit ${since}` : ''}
            </p>
          </div>
          <IconButton label={name ? 'Namen ändern' : 'Namen hinzufügen'} icon={<Pencil size={20} />} variant="tonal" onClick={openName} />
        </div>
      </Card>

      <section aria-labelledby="levels-title" className={s.section}>
        <h2 id="levels-title" className={s.sectionTitle}>Zwei Arten von Fortschritt</h2>
        <div className={s.twoCol}>
          <Card>
            <div className={s.levelCard}>
              <div className={s.levelHead}>
                <ProgressRing
                  value={levelInfo.progress}
                  label="Fortschritt zum nächsten Spielerlevel"
                  valueText={levelInfo.maxed ? 'Maximallevel erreicht' : `${fmt(levelInfo.xpToNext)} XP bis Level ${levelInfo.level + 1}`}
                  size={64}
                  tone="gold"
                >
                  <span className={s.ringNumber}>{levelInfo.level}</span>
                </ProgressRing>
                <div>
                  <p className={s.eyebrow}>Spielerlevel</p>
                  <p className={s.levelValue}>Level {levelInfo.level}</p>
                  <p className={s.meta}>{levelInfo.title}</p>
                </div>
              </div>
              <p className={s.explain}>
                Steigt mit jeder Übung und zeigt deinen Fleiß.{' '}
                {levelInfo.maxed ? 'Du hast das Maximallevel erreicht!' : `Noch ${fmt(levelInfo.xpToNext)} XP bis Level ${levelInfo.level + 1}.`}
              </p>
            </div>
          </Card>
          <Card>
            <div className={s.levelCard}>
              <div className={s.levelHead}>
                <span className={cx(s.langBadge, langLong && s.langBadgeLong)} aria-hidden="true">{lang.level}</span>
                <div>
                  <p className={s.eyebrow}>Sprachniveau</p>
                  <p className={s.levelValue}>
                    {lang.level}
                    {lang.provisional && <Badge tone="info">vorläufig</Badge>}
                    {lang.isTrainingLevel && <Badge tone="gold">Trainingsstufe</Badge>}
                  </p>
                </div>
              </div>
              <p className={s.explain}>
                {lang.basis} Das Sprachniveau steigt nur mit bestandenen Prüfungen – es zeigt, was du nachweislich kannst.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <div className={s.stats}>
        <StatTile icon={<Flame size={20} />} tone="gold" value={fmt(streak.current)} label={streak.current === 1 ? 'Tag in Folge' : 'Tage in Folge'} hint={`Rekord: ${fmt(streak.longest)}`} />
        <StatTile icon={<Sparkles size={20} />} tone="accent" value={fmt(levelInfo.totalXp)} label="XP gesamt" />
        <StatTile icon={<BookCheck size={20} />} tone="success" value={fmt(lessonCount)} label={lessonCount === 1 ? 'Lektion geschafft' : 'Lektionen geschafft'} to="/lernpfad" />
        <StatTile icon={<Trophy size={20} />} tone="info" value={`${badges.earnedCount}/${badges.total}`} label="Abzeichen" to="/erfolge" />
      </div>

      <section aria-labelledby="account-title" className={s.section}>
        <h2 id="account-title" className={s.sectionTitle}>Konto & Synchronisierung</h2>
        <AccountCard />
      </section>

      <section aria-labelledby="course-title" className={s.section}>
        <h2 id="course-title" className={s.sectionTitle}>Kurs</h2>
        <Card padding="none">
          <div className={s.group}>
            <div className={s.item}>
              <span className={s.label} id="course-switch">Aktiver Kurs</span>
              <span className={s.desc}>Getrennte Lernpfade – dein Fortschritt bleibt in jedem Kurs erhalten.</span>
              <Segmented<CourseId>
                label="Aktiver Kurs"
                value={courseId}
                onChange={switchCourse}
                options={[{ value: 'es', label: '🇪🇸 Spanisch' }, { value: 'pt-BR', label: '🇧🇷 Portugiesisch' }]}
              />
            </div>
            {courseId === 'es' && (
              <div className={s.item}>
                <span className={s.label}>Variante</span>
                <span className={s.desc}>Bestimmt Aussprache, Stimme und regionale Wörter (z. B. vosotros/ustedes).</span>
                <Segmented<EsVariant>
                  label="Spanisch-Variante"
                  value={settings.esVariant}
                  onChange={switchVariant}
                  options={[{ value: 'es-LA', label: '🌎 Lateinamerika' }, { value: 'es-ES', label: '🇪🇸 Spanien' }]}
                />
              </div>
            )}
            <ListRow
              leading={<Compass size={20} />}
              title="Einstufungstest"
              subtitle={placement && !placement.skipped
                ? `Letztes Ergebnis: Start bei ${STAGE_SHORT[placement.startStage]} (vorläufig)`
                : 'Finde heraus, wo du einsteigen kannst'}
              to="/einstufung"
            />
          </div>
        </Card>
      </section>

      <Card padding="none">
        <nav aria-label="Weitere Bereiche">
          <ListRow leading={<Trophy size={20} />} title="Erfolge" subtitle={`${badges.earnedCount} von ${badges.total} Abzeichen`} to="/erfolge" />
          <ListRow leading={<BarChart3 size={20} />} title="Statistik" to="/statistik" />
          <ListRow leading={<NotebookPen size={20} />} title="Fehlerarchiv" subtitle="Aus Fehlern gezielt lernen" to="/fehlerarchiv" />
          <ListRow leading={<Settings size={20} />} title="Einstellungen" to="/einstellungen" />
          <ListRow leading={<ShieldCheck size={20} />} title="Datenschutz" to="/datenschutz" />
          <ListRow leading={<Scale size={20} />} title="Rechtliches" to="/rechtliches" />
        </nav>
      </Card>

      <BottomSheet
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        title={name ? 'Namen ändern' : 'Namen hinzufügen'}
        description="Nur für die persönliche Ansprache in der App."
        footer={
          <Button block type="submit" form="profile-name-form">Speichern</Button>
        }
      >
        <form id="profile-name-form" onSubmit={saveName}>
          <TextField
            label="Vorname"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value.slice(0, 40))}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="done"
            maxLength={40}
            placeholder="z. B. Alex"
          />
        </form>
      </BottomSheet>
    </Page>
  );
}
