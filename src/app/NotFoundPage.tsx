import { Compass, House } from 'lucide-react';
import { Button, EmptyState, Page } from '../ui';

/** 404 – unbekannte Adresse innerhalb der App. */
export default function NotFoundPage() {
  return (
    <Page title="Seite nicht gefunden" back largeTitle={false}>
      <EmptyState
        icon={<Compass />}
        title="Hier geht es nicht weiter"
        description="Diese Adresse gibt es in AppLingua nicht (mehr). Vielleicht hat sich ein Tippfehler eingeschlichen oder der Inhalt ist umgezogen."
        action={
          <Button to="/" icon={<House />} replace>
            Zur Startseite
          </Button>
        }
      />
    </Page>
  );
}
