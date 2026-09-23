import { Component, type ErrorInfo, type ReactNode } from 'react';
import { House, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '../ui';
import s from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  /** Ändert sich der Wert (z. B. Pfad), wird der Fehlerzustand zurückgesetzt. */
  resetKey?: unknown;
  /** Ganze App betroffen (bildschirmfüllend) statt nur der aktuelle Seitenbereich. */
  fullPage?: boolean;
}

interface State {
  error: Error | null;
}

const CHUNK_RELOAD_KEY = 'applingua.chunkReloadAt';

/** Nach einem Update fehlen alte Code-Dateien – dann hilft genau ein Neuladen. */
function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically imported|Unable to preload CSS|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  );
}

function reloadOnceForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppLingua] Unerwarteter Fehler:', error, info.componentStack);
    if (isChunkLoadError(error) && navigator.onLine) reloadOnceForChunkError();
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkLoadError(error);
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const message = chunk
      ? offline
        ? 'Dieser Bereich ist noch nicht offline gespeichert. Verbinde dich mit dem Internet und lade neu.'
        : 'AppLingua wurde aktualisiert. Lade die App neu, um die neue Version zu verwenden.'
      : 'Beim Anzeigen ist ein unerwarteter Fehler aufgetreten. Dein Lernfortschritt ist gespeichert – lade die App neu oder gehe zurück zur Startseite.';

    return (
      <div className={this.props.fullPage ? s.full : s.inline} role="alert">
        <div className={s.icon} aria-hidden="true">
          <TriangleAlert />
        </div>
        <h1 className={s.title}>{chunk ? 'Neu laden erforderlich' : 'Da ist etwas schiefgelaufen'}</h1>
        <p className={s.message}>{message}</p>
        <div className={s.actions}>
          <Button icon={<RotateCcw />} onClick={() => window.location.reload()}>
            Neu laden
          </Button>
          {this.props.fullPage ? (
            <Button variant="secondary" icon={<House />} onClick={() => window.location.assign(import.meta.env.BASE_URL)}>
              Zur Startseite
            </Button>
          ) : (
            !chunk && (
              <Button variant="secondary" onClick={this.reset}>
                Erneut versuchen
              </Button>
            )
          )}
        </div>
        {error.message && (
          <details className={s.details}>
            <summary>Technische Details</summary>
            <code>{error.message}</code>
          </details>
        )}
      </div>
    );
  }
}
