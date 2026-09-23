# AppLingua – Architektur & Arbeitsvertrag

Verbindlich für alle Module. Die **Quelle der Wahrheit für Typen** sind `src/core/types.ts`
(Domäne/Speicherung) und `src/content/types.ts` (Inhalte). Diese Dateien nicht ändern, ohne es im
Abschlussbericht ausdrücklich zu melden. Datenspeicher: `src/data/store.ts` (fertig, nur benutzen).

## Produkt in einem Satz
Mobile-first-PWA (Safari/iPhone zuerst), React 19 + TypeScript + Vite 8, lokal-first (IndexedDB),
optionale Cloud (Supabase: Auth + Tabelle `user_records` + Edge Function `ai-coach`), UI komplett
auf Deutsch. Spanisch (Varianten es-ES / es-LA) und brasilianisches Portugiesisch (pt-BR) als
vollständig getrennte Lernpfade. Hosting: GitHub Pages unter Basis-Pfad `import.meta.env.BASE_URL`.

## Harte Regeln (gelten für jede Datei)
1. **Keine toten Buttons, keine Fake-Erfolge.** Jede sichtbare Schaltfläche tut etwas Echtes. Wenn etwas
   nicht verfügbar ist (Cloud nicht eingerichtet, keine Spracherkennung, kein KI-Schlüssel, keine Stimme
   installiert), zeige einen ehrlichen, hilfreichen Fallback – nie eine simulierte Erfolgsmeldung.
2. **iPhone/Safari:** Touch-Ziele ≥ 44×44 px; nichts nur per Hover; Eingabefelder `font-size ≥ 16px`;
   Safe-Area-Insets (`env(safe-area-inset-*)`); `100dvh`; Tastatur darf Eingaben nicht verdecken;
   Audio/Sprachausgabe/Mikrofon nur nach Nutzer-Geste starten; `prefers-reduced-motion` respektieren.
3. **Barrierefreiheit:** semantische Elemente, `aria-label` für Icon-Buttons, sichtbarer Fokus,
   Tastaturbedienung (Enter prüft Antworten), Kontrast ≥ 4.5:1, `aria-live` für Feedback.
4. **Sicherheit:** kein `dangerouslySetInnerHTML`, Nutzer-/KI-Text nur als Text rendern (Md via
   `<RichText>`); keine Secrets im Frontend; keine Nutzerdaten in URLs.
5. **Keine neuen npm-Abhängigkeiten** (vorhanden: react, react-dom, react-router-dom 7, zustand 5,
   @supabase/supabase-js, idb, lucide-react, vite-plugin-pwa, workbox-window, vitest, fake-indexeddb,
   @testing-library/react, @playwright/test, sharp). Bedarf → im Bericht melden.
6. **Nur eigene Dateien bearbeiten** (siehe Zuständigkeiten). Fremde Datei braucht eine Änderung →
   minimal halten und im Bericht nennen.
7. **Typecheck:** `npx tsc -p tsconfig.json --noEmit` – Fehler in eigenen Dateien müssen 0 sein
   (Fehler in noch unfertigen fremden Dateien ignorieren). Tests: `npx vitest run <pfad>`.
8. **Deutsch & Didaktik:** Erklärungen verständlich, freundlich, nicht kindisch; Fehler sind Lernchancen
   (nie Sperren/Leben-Verlust). Spielerlevel (XP) und Sprachniveau (nachgewiesen) strikt getrennt.
   „Native Mastery“ ist eine Trainingsstufe, kein Versprechen. Browser-Aussprachebewertung heißt
   „Verständlichkeit laut Spracherkennung“ und ist ausdrücklich keine phonetische Analyse.
9. **Songs & Recht:** nur selbst erstellte Demo-Lernlieder oder private Nutzereingaben; keine
   Songtexte Dritter im Code, kein Scraping, keine Downloads; Musikdienste nur über offizielle
   Einbettungen nach Einwilligung (Zwei-Klick, youtube-nocookie.com).

## Verzeichnisse & Zuständigkeiten
```
src/core/            types.ts (fertig)
src/data/            store.ts (fertig) · db.ts · sync/* · auth/* · supabase.ts · migrateGuest.ts   → DATA
src/ai/              client.ts                                                                    → DATA
supabase/            migrations/*.sql · functions/ai-coach/index.ts · config.toml                 → DATA
src/engine/          reine Logik ohne React: levels, xp, srs, grading, competence, streak,
                     dates, text, missions, badges, unlock, plan, review                          → ENGINE
src/state/           React-Hooks + Aktionen auf Basis von store+engine                            → ENGINE
src/speech/          tts, stt, recorder, pronunciationScore                                       → SPEECH
src/styles/ src/ui/ src/app/ src/main.tsx src/App.tsx src/routes.tsx index.html vite.config.ts
public/ scripts/     Design-System, UI-Kit, Shell, Navigation, Router, PWA, Icons                 → SHELL
src/content/<lang>/  Kursinhalte                                                                  → CONTENT-*
src/content/songs/   Demo-Lernlieder                                                              → SONGS-CONTENT
src/features/<x>/    Seiten/Features                                                              → UI-* (Phase 2)
```

## Routen (fest; SHELL legt lazy-Routen an, Features liefern die Seiten als `export default`)
Vollbild-Routen (ohne Bottom-Navigation): Onboarding, Auth, Lektion, Prüfung, Song-Player, Partner-Chat.
| Pfad | Modul (default export) |
|---|---|
| `/` | `features/home/HomeRedirect` (→ `/willkommen` falls Onboarding offen, sonst `/dashboard`) |
| `/willkommen` | `features/onboarding/WelcomePage` (Startseite) |
| `/onboarding` | `features/onboarding/OnboardingPage` (Sprache → Variante → Ziel → Einstufung/Überspringen → Konto/Gast) |
| `/einstufung` | `features/onboarding/PlacementPage` |
| `/anmelden` `/registrieren` `/passwort-vergessen` `/passwort-neu` `/auth/callback` | `features/auth/LoginPage` `RegisterPage` `ForgotPasswordPage` `UpdatePasswordPage` `AuthCallbackPage` |
| `/dashboard` | `features/dashboard/DashboardPage` |
| `/lernpfad` · `/lernpfad/:stageId` | `features/path/PathPage` · `features/path/StagePage` |
| `/lektion/:lessonId` | `features/lesson/LessonPage` |
| `/pruefungen` · `/pruefung/:examId` | `features/exams/ExamsHubPage` · `features/exams/ExamPage` |
| `/ueben` | `features/practice/PracticeHubPage` (Grammatik, Aussprache, Vokabeln, Wiederholung, KI-Partner, Prüfungen, Fehlerarchiv, Statistik) |
| `/grammatik` · `/grammatik/:topicId` | `features/grammar/GrammarCenterPage` · `GrammarTopicPage` |
| `/fehlerarchiv` | `features/errors/ErrorArchivePage` |
| `/aussprache` · `/aussprache/:categoryId` | `features/pronunciation/PronLabPage` · `PronCategoryPage` |
| `/vokabeln` | `features/vocab/VocabPage` |
| `/wiederholung` | `features/review/ReviewPage` |
| `/partner` · `/partner/:scenarioId` | `features/partner/PartnerHubPage` · `PartnerChatPage` |
| `/erfolge` · `/statistik` | `features/achievements/AchievementsPage` · `features/stats/StatsPage` |
| `/profil` · `/einstellungen` | `features/profile/ProfilePage` · `SettingsPage` |
| `/songs` | `features/songs/SongsHomePage` (Entdecken/Empfehlungen, Bibliothek+Suche+Filter, Favoriten, Playlists) |
| `/songs/eigener-text` · `/songs/eigener-text/:textId` | `features/songs/UserTextPage` |
| `/songs/playlist/:playlistId` | `features/songs/PlaylistPage` |
| `/songs/:songId` | `features/songs/SongDetailPage` |
| `/songs/:songId/spielen` (Query `?modus=`) | `features/songs/player/SongPlayerPage` |
| `/songs/:songId/uebungen` | `features/songs/exercises/SongExercisesPage` |
| `/datenschutz` · `/rechtliches` | `features/legal/PrivacyPage` · `LegalPage` |
Bottom-Navigation (5): **Start** `/dashboard` · **Lernpfad** `/lernpfad` · **Songs** `/songs` (Mitte, hervorgehoben) · **Üben** `/ueben` · **Profil** `/profil`. Desktop ≥ 1024px: linke Seitenleiste mit allen Bereichen.
Song-IDs in URLs: Demo-Songs `song.es.…`; eigene Texte `user.<uuid>`.

## Modul-APIs (Exporte, auf die sich andere verlassen)
### SHELL – `src/ui/index.ts` (Barrel)
`Button` (variant primary|secondary|ghost|danger, size md|lg, loading, icon), `IconButton` (label Pflicht),
`Card`, `Page` (title?, back?: boolean|string, actions?, children; Safe-Area, scroll), `TopBar`,
`ProgressBar` (value 0..1, label), `ProgressRing`, `BottomSheet` (open, onClose, title), `Dialog`,
`ConfirmDialog`, `Tabs`/`Segmented` (options, value, onChange), `Chip`, `Toggle`, `TextField`,
`TextArea`, `Select`, `EmptyState`, `Spinner`, `Skeleton`, `StatTile`, `Badge`, `ListRow`,
`RichText` (md: Md, onSpeak?: (text) => void – rendert **fett**, _kursiv_, `Zielsprache` als
antippbare Hervorhebung, Listen; nie innerHTML), `Celebration` (XP/Level-Up-Overlay),
`useToast()` → `toast(msg, {tone: 'success'|'error'|'info'})`, `ErrorState` (message, onRetry),
`LoadingScreen`. Icons: `lucide-react`. Farben/Abstände nur über CSS-Variablen aus `src/styles/tokens.css`.
### ENGINE – `src/state/*` (Hooks/Aktionen) und `src/engine/*` (rein)
- `settings.ts`: `DEFAULT_SETTINGS`, `useSettings()`, `updateSettings(patch)`, `useProfile()`, `updateProfile(patch)`,
  `useActiveCourse(): CourseId`, `setActiveCourse(id)`, `useVariant(): Variant`, `variantOf(settings, courseId)`,
  `ttsLangFor(variant)` ('es-ES' | 'es-MX' | 'pt-BR').
- `progress.ts`: `useLevelInfo()` → `{level, title, totalXp, xpIntoLevel, xpForLevel, progress}` (≥ 100 Level),
  `useTodayXp()`, `useWeekXp()` → 7×`{day, xp}`, `useStreak()` → `{current, longest, todayDone, songStreak}`,
  `useCompetences(courseId)` → `Record<Skill,{score,evidence}>`, `useLanguageLevel(courseId)` →
  `{level: LanguageLevel, provisional, basis}`, `useStageStatus(courseId, content)`, `useLessonStatus(courseId, content)`
  → `Record<lessonId,'locked'|'available'|'completed'>`, `useNextLesson(courseId, content)`, `useTopicMastery(courseId)`,
  `usePersonalRecords()`, `useStrengthsWeaknesses(courseId)`.
- `actions.ts`: `recordAnswer({courseId, exercise, outcome, context, refId})`, `awardXp(amount, reason, {courseId?, ref?, id?})`,
  `completeLesson({courseId, lesson, scorePct, bestCombo, durationSec})` → `{xp, stars, firstTime, newBadges, levelUp}`,
  `recordExam({courseId, exam|examId, kind, scorePct, perSkill, durationSec})` → `{passed, xp, unlockedStage?}`,
  `recordPlacement(courseId, result)`, `addSrsCard(partial)` → id, `reviewCard(id, grade 0..3)`,
  `recordPronAttempt(attempt)`, `claimMission(missionId, periodKey)`, `recordSongActivity(...)`.
- `missions.ts` `useMissions()`; `badges.ts` `BADGES`, `useBadges()`; `review.ts` `useDueCards(courseId)`,
  `buildReviewSession(courseId, content, opts)`; `plan.ts` `useDailyPlan(courseId, content)` (inkl. Wiedereinstieg
  nach Pause).
- `src/engine/grading.ts`: `type ExerciseOutcome = {correct, score (0..1), accentOnly, userAnswer, expected, durationMs, explanation?: MistakeExplanation}`,
  `gradeText(input, accepted, {strictAccents})`, `gradeExercise(exercise, answer, opts)`, `explainMistake(exercise, userAnswer, expected)`.
- `src/engine/text.ts`: `normalize`, `stripAccents`, `levenshtein`, `tokenizeWords`.
### SPEECH – `src/speech/*`
`tts.ts`: `speak(text, {lang, rate?}) → Promise<void>`, `stopSpeaking()`, `useTts()` → `{available, speaking, speak, voicesFor(lang), missingVoiceHelp}`.
`stt.ts`: `sttSupport()` → `{available, reason?}`, `listen({lang, maxAlternatives?, timeoutMs?}) → Promise<{transcripts: string[], confidence?}>`, `stopListening()`.
`recorder.ts`: `recorderSupport()`, `startRecording()`, `stopRecording() → Promise<Blob>`, Objekt-URLs selbst freigeben.
`pronunciationScore.ts`: `scorePronunciation(target, transcripts, {lang, issueCodes?})` → `{scorePct, words: {text, ok}[], issues: string[], tips: string[]}`.
`src/speech/usePronunciationCheck.ts`: Hook, der Aufnahme → Erkennung → Bewertung → manuellen Fallback (Selbstbewertung) kapselt.
### DATA
`src/data/supabase.ts`: `cloudConfigured: boolean`, `loadSupabase()` → `Promise<SupabaseClient | null>` (lädt `@supabase/supabase-js` per dynamischem Import, nur wenn konfiguriert). `src/data/cloud/lazySupabase.ts`: `supabaseCloudAdapter` / `supabaseAuthProvider` (oder `null`) laden `supabaseAdapter.ts` erst beim ersten Aufruf – im Lokalen Modus lädt der Browser kein Supabase-Bundle.
`src/data/auth/*`: `useAuth()` → `{user, status: 'loading'|'guest'|'signed-in', signUp, signIn, signInWithApple, signOut, resetPassword, updatePassword, deleteAccount}` (werfen deutsche Fehlertexte).
`src/data/sync/*`: `startSync()`, `syncNow()`, `useSyncStatus(): SyncStatus`. Pull bei Start/Fokus/online/60 s; Push nach jeder Änderung (entprellt).
`src/data/bootstrap.ts`: `bootstrapData()` (IndexedDB öffnen → `hydrate()` → Sync starten). Gastmodus = lokale Daten ohne Konto; beim Anmelden Übernahme anbieten (`src/data/migrateGuest.ts`).
`src/ai/client.ts`: `aiStatus()` → `{available, reason}`; `aiPartnerReply(req)`, `aiPartnerEvaluate(req)`, `aiExplain(req)` (Fehler → deutsche Meldung, Aufrufer zeigt Offline-Fallback).

## Inhalts-IDs (für Querverweise zwischen Inhalts-Autoren)
- Lektionen: `es.s0.l01`…`es.s0.l14`, `es.a1.l01`…`es.a1.l04`, `pt.s0.l01`…`pt.s0.l07` (Dateien `src/content/es/lessons/s0l01.ts`, `a1l01.ts`, `src/content/pt-BR/lessons/p0l01.ts` usw., `export default` Lesson).
- Kapitel: `es.s0.c1`…`es.s0.c5`, `es.a1.c1`…; Prüfungen: `es.exam.s0.mid`, `es.exam.s0.final`, `es.exam.s0.boss`, `es.exam.a1.c1`, `pt.exam.s0.final`, `pt.exam.s0.boss`.
- Vokabeln: `<lessonId>.v.<slug>`; Übungen: `<lessonId>.g01` (geführt), `.a01` (Anwendung), `.r01` (Wiederholung); Grammatik-Übungen `<topicId>.L1.01`; Prüfungsübungen `<examId>.01`; Einstufung `es.pl.01`.
- Grammatikthemen Spanisch (`src/content/es/grammar/`): `es.g.alphabet-sounds`, `es.g.stress`, `es.g.formality`,
  `es.g.pronouns`, `es.g.ser`, `es.g.estar`, `es.g.ser-estar`, `es.g.articles`, `es.g.gender-plural`, `es.g.adjectives`,
  `es.g.word-order-negation`, `es.g.present-regular`, `es.g.numbers`, `es.g.questions`, `es.g.hay`,
  `es.g.tener`, `es.g.gustar`, `es.g.reflexive`, `es.g.ir-a`, `es.g.possessives` (letzte 5 = A1).
- Aussprache Spanisch – Kategorien `es.pc.vowels|r|j-g|ll-y|b-v|c-z|ny|h-ch|stress|syllables|intonation`; Items, die Lektionen referenzieren dürfen:
  `es.p.vowels.mama|pelo|libro|todo|luna|euro`, `es.p.r.pero|perro|caro|carro|rosa|tres`, `es.p.j.jamon|gente|gato|guitarra|julio`,
  `es.p.ll.llamo|calle|yo|playa`, `es.p.bv.vaca|beber|vivir|uva`, `es.p.cz.gracias|cerveza|zapato|cinco`,
  `es.p.ny.espanol|manana|nino`, `es.p.h.hola|hablar|chico|noche`, `es.p.stress.hablo|hablo-pasado|cafe|arbol|telefono|ciudad`,
  `es.p.syl.buenos-dias|encantado`, `es.p.into.como-te-llamas|me-llamo-ana|que-bien|de-donde-eres`.
- Portugiesisch: Präfix `pt.` (Grammatik `pt.g.*`, Aussprache `pt.pc.*`/`pt.p.*`) – vollständig im Besitz von CONTENT-PT.
- KI-Szenarien: `<es|pt>.sc.<key>` mit key ∈ `alltag, gefuehrt, restaurant, hotel, flughafen, universitaet, arbeit,
  bewerbung, arzt, einkaufen, telefon, diskussion, praesentation, reise, pruefung`.
- Songs: `song.es.<slug>` / `song.pt.<slug>`; `grammarTags` nur aus obigen Grammatik-IDs.

## Datenhaltung & Sync (Kurzfassung)
Sammlungen siehe `CollectionData` in `src/core/types.ts`. Mutable Sammlungen: Last-Write-Wins je Datensatz
(`updatedAt`), feldweise Merge über `registerMerger` (z. B. `lessonProgress` = Maximum, `songProgress` =
Vereinigung gelernter Zeilen). Event-Sammlungen (`EVENT_COLLECTIONS`) nur anhängen; deterministische IDs
machen Belohnungen idempotent (`mission:<periode>:<id>`, `lesson:<lessonId>:first`).
Abgeleitete Werte (XP-Summe, Level, Streak, Kompetenzen, Sprachniveau, Freischaltungen, Missionen)
werden **immer aus Ereignissen berechnet**, nie separat gespeichert.
Cloud: eine Tabelle `public.user_records (user_id, collection, id, data jsonb, updated_at, deleted,
server_updated_at)` mit RLS `auth.uid() = user_id`, Trigger verwirft ältere Schreibvorgänge.
Eigene Songtexte: `localOnly`, außer `settings.songs.syncUserTexts` ist aktiv. Das gilt auch für alles, was
Text daraus enthält (`isPrivateSongRecord` in `src/data/sync/engine.ts`): Notizen, Markierungen, Erklärungen
(ID/`songId` mit Präfix `user.`), Übungsantworten und Fehlerarchiv (`refId`) sowie Aussprache-Versuche (`itemId`).
Ausnahme: Vokabelkarten, die die Nutzerin selbst aus einem eigenen Text anlegt, werden normal synchronisiert
(Hinweis im Formular und in der Datenschutzerklärung). Beim Löschen eines eigenen Texts werden Notizen,
Markierungen, Erklärungen, Fortschritt, Favorit, Playlist-Einträge und Fehlerarchiv-Einträge mitgelöscht;
Antworten und Aussprache-Versuche sind unveränderliche Ereignisse und bleiben bis „Lokale Daten löschen“ bzw. Konto löschen.

Lokales Speichern: Änderungen landen sofort im Store und werden im selben Microtask als IndexedDB-Transaktion
gestartet und per `tx.commit()` sofort abgeschlossen (`src/data/db.ts`);
`flushLocalWrites()` wartet, bis alle laufenden Transaktionen abgeschlossen sind (vor Update-Reload,
Export, Kontowechsel). Ein harter Reload innerhalb weniger Millisekunden nach einer Änderung kann die
laufende Transaktion abbrechen – Browser erlauben beim Entladen keine synchronen IndexedDB-Schreibvorgänge.

## Offline & Caching (Service Worker, `vite.config.ts`)
- **Precache** (bei Installation/Update): App-Shell, alle Seiten-Chunks, Spanisch-Kurs (Standardkurs) und Songs.
- **Portugiesisch** (`assets/pt-BR-*.js`, ~350 KB) ist bewusst nicht im Precache: Runtime-Cache `course-content`
  (CacheFirst, Dateinamen mit Hash). `src/app/useOfflineWarmup.ts` lädt den aktiven Kurs nach dem Start im
  Hintergrund vor und legt ihn in diesen Cache – nach einmaligem Öffnen online ist auch pt-BR offline verfügbar.
- **Supabase** (`assets/vendor-supabase-*.js`): nur im Precache, wenn der Build mit Supabase-Variablen gebaut
  wurde (Sitzung auch offline wiederherstellbar); im Lokalen Modus wird es weder geladen noch gecacht.
- YouTube-Vorschaubilder (nur nach Einwilligung): Runtime-Cache `yt-thumbnails`.
- Navigationen fallen offline auf `index.html` zurück (außer Dateien wie `/robots.txt`).
