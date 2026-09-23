// AppLingua – Konto endgültig löschen.
// Prüft das JWT des Aufrufers und löscht genau diesen Nutzer mit der Service-Role.
// Alle Zeilen in user_records und ai_usage verschwinden per ON DELETE CASCADE.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { bearerToken, fail, guardRequest, json, tooLarge } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

Deno.serve(async (req) => {
  const guarded = guardRequest(req);
  if (guarded) return guarded;
  const origin = req.headers.get('Origin');

  if (!admin) return fail(503, 'not-configured', 'Die Kontolöschung ist auf dem Server nicht eingerichtet.', origin);

  const token = bearerToken(req);
  if (!token) return fail(401, 'unauthorized', 'Bitte melde dich an.', origin);

  if (tooLarge(req, 1024)) return fail(413, 'too-large', 'Die Anfrage ist zu groß.', origin);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'invalid-body', 'Ungültige Anfrage.', origin);
  }
  // Schutz vor versehentlichen Aufrufen: ausdrückliche Bestätigung im Body
  if (!body || typeof body !== 'object' || (body as { confirm?: unknown }).confirm !== true) {
    return fail(400, 'confirmation-required', 'Die Löschung muss ausdrücklich bestätigt werden.', origin);
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return fail(401, 'unauthorized', 'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.', origin);

  const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
  if (delError) {
    console.error('[delete-account] Löschen fehlgeschlagen', delError.message);
    return fail(500, 'delete-failed', 'Das Konto konnte gerade nicht gelöscht werden. Bitte versuche es später erneut.', origin);
  }
  return json({ ok: true }, 200, origin);
});
