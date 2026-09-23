import { lazy, Suspense } from 'react';

const GuestDecisionDialog = lazy(() => import('../features/auth/GuestDecisionDialog'));
const RewardCenter = lazy(() => import('../features/rewards/RewardCenter'));

/** App-weite Overlays (innerhalb des Routers, nach dem Datenstart). */
export default function GlobalOverlays() {
  return (
    <Suspense fallback={null}>
      <GuestDecisionDialog />
      <RewardCenter />
    </Suspense>
  );
}
