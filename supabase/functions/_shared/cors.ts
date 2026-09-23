// CORS & JSON-Antworten für die AppLingua-Edge-Functions.
// Erlaubte Ursprünge kommen aus dem Secret ALLOWED_ORIGINS (kommagetrennt), z. B.
//   https://chaos20140.github.io,http://localhost:5173
// Hinweis: Ein Origin ist nur Schema + Host (+ Port) – ohne Pfad wie /AppLingua/.

const allowedOrigins: string[] = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export function isOriginAllowed(origin: string | null): boolean {
  // Ohne Origin-Header (kein Browser) gibt es kein CORS; die JWT-Prüfung gilt trotzdem.
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export interface ApiErrorBody { error: { code: string; message: string } }

export function json(body: unknown, status: number, origin: string | null, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

/** Fehlerantwort ohne interne Details. */
export function fail(status: number, code: string, message: string, origin: string | null): Response {
  return json({ error: { code, message } } satisfies ApiErrorBody, status, origin);
}

/**
 * Gemeinsamer Einstieg: Preflight beantworten, fremde Origins und falsche Methoden abweisen.
 * Gibt eine fertige Antwort zurück oder null, wenn die Anfrage weiterverarbeitet werden soll.
 */
export function guardRequest(req: Request): Response | null {
  const origin = req.headers.get('Origin');
  if (!isOriginAllowed(origin)) {
    return fail(403, 'origin-not-allowed', 'Dieser Ursprung ist nicht freigegeben.', null);
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return fail(405, 'method-not-allowed', 'Nur POST ist erlaubt.', origin);
  return null;
}

/** true, wenn der Content-Length-Header mehr als `maxBytes` ankündigt (Abweisen ohne Einlesen). */
export function tooLarge(req: Request, maxBytes: number): boolean {
  const n = Number(req.headers.get('Content-Length') ?? '0');
  return Number.isFinite(n) && n > maxBytes;
}

/** Liest den Bearer-Token aus dem Authorization-Header. */
export function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}
