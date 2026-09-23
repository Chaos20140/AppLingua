import { Navigate } from 'react-router-dom';
import { useProfile } from '../../state/settings';

/** `/` → Willkommensseite, solange das Onboarding offen ist, sonst Dashboard. */
export default function HomeRedirect() {
  const profile = useProfile();
  return <Navigate to={profile?.onboardingDone ? '/dashboard' : '/willkommen'} replace />;
}
