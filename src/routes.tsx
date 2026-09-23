import { lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppShell from './app/AppShell';
import NotFoundPage from './app/NotFoundPage';
import { useOfflineWarmup } from './app/useOfflineWarmup';
import HomeRedirect from './features/home/HomeRedirect';

// Hauptbereiche – werden nach dem Start im Leerlauf vorgeladen (schnelle Tab-Wechsel).
const loadDashboard = () => import('./features/dashboard/DashboardPage');
const loadPath = () => import('./features/path/PathPage');
const loadSongsHome = () => import('./features/songs/SongsHomePage');
const loadPractice = () => import('./features/practice/PracticeHubPage');
const loadProfile = () => import('./features/profile/ProfilePage');

const DashboardPage = lazy(loadDashboard);
const PathPage = lazy(loadPath);
const SongsHomePage = lazy(loadSongsHome);
const PracticeHubPage = lazy(loadPractice);
const ProfilePage = lazy(loadProfile);

const WelcomePage = lazy(() => import('./features/onboarding/WelcomePage'));
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage'));
const PlacementPage = lazy(() => import('./features/onboarding/PlacementPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const UpdatePasswordPage = lazy(() => import('./features/auth/UpdatePasswordPage'));
const AuthCallbackPage = lazy(() => import('./features/auth/AuthCallbackPage'));
const StagePage = lazy(() => import('./features/path/StagePage'));
const LessonPage = lazy(() => import('./features/lesson/LessonPage'));
const ExamsHubPage = lazy(() => import('./features/exams/ExamsHubPage'));
const ExamPage = lazy(() => import('./features/exams/ExamPage'));
const GrammarCenterPage = lazy(() => import('./features/grammar/GrammarCenterPage'));
const GrammarTopicPage = lazy(() => import('./features/grammar/GrammarTopicPage'));
const ErrorArchivePage = lazy(() => import('./features/errors/ErrorArchivePage'));
const PronLabPage = lazy(() => import('./features/pronunciation/PronLabPage'));
const PronCategoryPage = lazy(() => import('./features/pronunciation/PronCategoryPage'));
const VocabPage = lazy(() => import('./features/vocab/VocabPage'));
const ReviewPage = lazy(() => import('./features/review/ReviewPage'));
const PartnerHubPage = lazy(() => import('./features/partner/PartnerHubPage'));
const PartnerChatPage = lazy(() => import('./features/partner/PartnerChatPage'));
const AchievementsPage = lazy(() => import('./features/achievements/AchievementsPage'));
const StatsPage = lazy(() => import('./features/stats/StatsPage'));
const SettingsPage = lazy(() => import('./features/profile/SettingsPage'));
const UserTextPage = lazy(() => import('./features/songs/UserTextPage'));
const PlaylistPage = lazy(() => import('./features/songs/PlaylistPage'));
const SongDetailPage = lazy(() => import('./features/songs/SongDetailPage'));
const SongPlayerPage = lazy(() => import('./features/songs/player/SongPlayerPage'));
const SongExercisesPage = lazy(() => import('./features/songs/exercises/SongExercisesPage'));
const PrivacyPage = lazy(() => import('./features/legal/PrivacyPage'));
const LegalPage = lazy(() => import('./features/legal/LegalPage'));

function usePreloadMainTabs() {
  useEffect(() => {
    const preload = () => {
      for (const load of [loadDashboard, loadPath, loadSongsHome, loadPractice, loadProfile]) load().catch(() => undefined);
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(preload, { timeout: 4000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(preload, 2500);
    return () => window.clearTimeout(t);
  }, []);
}

/** Alle Routen laut docs/ARCHITECTURE.md. Vollbild-Routen laufen ohne Navigation. */
export default function AppRoutes() {
  usePreloadMainTabs();
  useOfflineWarmup();
  return (
    <Routes>
      <Route index element={<HomeRedirect />} />

      {/* Vollbild: Onboarding, Auth, Lektion, Prüfung, Song-Player, Partner-Chat */}
      <Route element={<AppShell fullscreen />}>
        <Route path="willkommen" element={<WelcomePage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="einstufung" element={<PlacementPage />} />
        <Route path="anmelden" element={<LoginPage />} />
        <Route path="registrieren" element={<RegisterPage />} />
        <Route path="passwort-vergessen" element={<ForgotPasswordPage />} />
        <Route path="passwort-neu" element={<UpdatePasswordPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="lektion/:lessonId" element={<LessonPage />} />
        <Route path="pruefung/:examId" element={<ExamPage />} />
        <Route path="songs/:songId/spielen" element={<SongPlayerPage />} />
        <Route path="partner/:scenarioId" element={<PartnerChatPage />} />
      </Route>

      {/* Mit Bottom-Navigation / Seitenleiste */}
      <Route element={<AppShell />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="lernpfad" element={<PathPage />} />
        <Route path="lernpfad/:stageId" element={<StagePage />} />
        <Route path="pruefungen" element={<ExamsHubPage />} />
        <Route path="ueben" element={<PracticeHubPage />} />
        <Route path="grammatik" element={<GrammarCenterPage />} />
        <Route path="grammatik/:topicId" element={<GrammarTopicPage />} />
        <Route path="fehlerarchiv" element={<ErrorArchivePage />} />
        <Route path="aussprache" element={<PronLabPage />} />
        <Route path="aussprache/:categoryId" element={<PronCategoryPage />} />
        <Route path="vokabeln" element={<VocabPage />} />
        <Route path="wiederholung" element={<ReviewPage />} />
        <Route path="partner" element={<PartnerHubPage />} />
        <Route path="erfolge" element={<AchievementsPage />} />
        <Route path="statistik" element={<StatsPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="einstellungen" element={<SettingsPage />} />
        <Route path="songs" element={<SongsHomePage />} />
        <Route path="songs/eigener-text" element={<UserTextPage />} />
        <Route path="songs/eigener-text/:textId" element={<UserTextPage />} />
        <Route path="songs/playlist/:playlistId" element={<PlaylistPage />} />
        <Route path="songs/:songId" element={<SongDetailPage />} />
        <Route path="songs/:songId/uebungen" element={<SongExercisesPage />} />
        <Route path="datenschutz" element={<PrivacyPage />} />
        <Route path="rechtliches" element={<LegalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
