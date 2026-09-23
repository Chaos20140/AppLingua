/**
 * Nach `vite build`:
 *  - dist/404.html = Kopie von index.html (GitHub Pages): Deep-Links wie /AppLingua/lernpfad,
 *    /AppLingua/auth/callback?code=… oder /AppLingua/passwort-neu?code=… laden die SPA. Pages
 *    liefert 404.html unter der ursprünglichen URL aus – Pfad, Query (?code=) und Hash bleiben
 *    erhalten, der Router und der PKCE-Austausch von Supabase sehen sie unverändert.
 *  - dist/.nojekyll → Pages verarbeitet Dateien/Ordner mit Unterstrich unverändert.
 *  - Sicherheits-Check: Das Bundle darf keine geheimen Schlüssel enthalten (Anthropic-Key,
 *    Supabase-Secret-Key, service_role-JWT) und muss die Content-Security-Policy tragen.
 *  - Konsistenz: Die CSP-Header in vercel.json/netlify.toml müssen der Meta-CSP entsprechen
 *    (plus frame-ancestors 'none', das nur als Header wirkt).
 */
import { access, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const index = path.join(dist, 'index.html');

try {
  await access(index);
} catch {
  console.error('postbuild: dist/index.html fehlt – zuerst `vite build` ausführen.');
  process.exit(1);
}

// ── Geheimnisse im Bundle? ──
const SECRET_PATTERNS = [
  { name: 'Anthropic-API-Key', re: /sk-ant-[A-Za-z0-9_-]{8,}/ },
  { name: 'Supabase-Secret-Key', re: /sb_secret_[A-Za-z0-9_-]{8,}/ },
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]+/g;

function jwtRole(payload) {
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))?.role ?? null;
  } catch {
    return null;
  }
}

const findings = [];
for (const rel of await readdir(dist, { recursive: true })) {
  if (!/\.(js|mjs|html|json|webmanifest|txt|map)$/.test(rel)) continue;
  const text = await readFile(path.join(dist, rel), 'utf8');
  for (const { name, re } of SECRET_PATTERNS) if (re.test(text)) findings.push(`${name} in ${rel}`);
  for (const m of text.matchAll(JWT)) if (jwtRole(m[1]) === 'service_role') findings.push(`service_role-JWT in ${rel}`);
}
if (findings.length) {
  console.error('postbuild: Geheime Schlüssel im Build gefunden – Abbruch:\n  ' + findings.join('\n  '));
  process.exit(1);
}

const html = await readFile(index, 'utf8');
const metaCsp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1];
if (!metaCsp) {
  console.error('postbuild: dist/index.html enthält keine Content-Security-Policy – Abbruch.');
  process.exit(1);
}

// ── CSP-Header für Vercel/Netlify (vercel.json, netlify.toml) = Meta-CSP + frame-ancestors ──
function parseCsp(csp) {
  const map = new Map();
  for (const part of csp.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) map.set(name.toLowerCase(), new Set(sources));
  }
  return map;
}

async function hostingCsp(file, extract) {
  try {
    return extract(await readFile(path.join(dist, '..', file), 'utf8'));
  } catch {
    return undefined;
  }
}

const hostingHeaders = [
  ['vercel.json', await hostingCsp('vercel.json', (t) => JSON.parse(t).headers
    ?.flatMap((h) => h.headers ?? [])
    .find((h) => h.key?.toLowerCase() === 'content-security-policy')?.value)],
  ['netlify.toml', await hostingCsp('netlify.toml', (t) => /Content-Security-Policy\s*=\s*"([^"]+)"/.exec(t)?.[1])],
];
const meta = parseCsp(metaCsp);
const cspProblems = [];
const cspHints = [];
for (const [file, value] of hostingHeaders) {
  if (!value) { cspProblems.push(`${file}: kein Content-Security-Policy-Header gefunden`); continue; }
  const header = parseCsp(value);
  if ([...(header.get('frame-ancestors') ?? [])].join(' ') !== "'none'") cspProblems.push(`${file}: frame-ancestors 'none' fehlt`);
  for (const name of new Set([...meta.keys(), ...header.keys()])) {
    if (name === 'frame-ancestors') continue;
    const m = meta.get(name) ?? new Set();
    const h = header.get(name) ?? new Set();
    const missing = [...m].filter((s) => !h.has(s));
    const extra = [...h].filter((s) => !m.has(s));
    // Eigene Supabase-Domain (nur im Meta-Tag) → Header ergänzen, aber den Build nicht abbrechen.
    if (name === 'connect-src' && !extra.length) {
      if (missing.length) cspHints.push(`${file}: connect-src um ${missing.join(' ')} ergänzen`);
      continue;
    }
    if (missing.length || extra.length) cspProblems.push(`${file}: ${name} weicht vom Meta-Tag ab (fehlt: ${missing.join(' ') || '–'}; zusätzlich: ${extra.join(' ') || '–'})`);
  }
}
if (cspProblems.length) {
  console.error('postbuild: CSP-Header passen nicht zur CSP in vite.config.ts – Abbruch:\n  ' + cspProblems.join('\n  '));
  process.exit(1);
}
for (const hint of cspHints) console.warn(`postbuild: Hinweis – ${hint}`);

await copyFile(index, path.join(dist, '404.html'));
await writeFile(path.join(dist, '.nojekyll'), '');
console.log('postbuild: Sicherheits-Check ok; dist/404.html und dist/.nojekyll erstellt.');
