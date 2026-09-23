-- ═══════════════════════════════════════════════════════════════════════════
-- AppLingua – Grundschema
--   * public.user_records : alle synchronisierten Nutzerdaten (eine Zeile je Datensatz)
--   * public.ai_usage     : Tageszähler für KI-Anfragen (nur für die Edge Function)
-- Idempotent formuliert, damit ein erneutes Ausführen im SQL-Editor nichts kaputt macht.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────── user_records ─────────────────────────
create table if not exists public.user_records (
  user_id           uuid        not null default auth.uid()
                                references auth.users (id) on delete cascade,
  collection        text        not null,
  id                text        not null,
  data              jsonb       not null,
  -- Zeitpunkt der letzten Änderung auf dem Gerät (Last-Write-Wins)
  updated_at        timestamptz not null,
  -- Soft-Delete, damit Löschungen auf andere Geräte übertragen werden
  deleted           boolean     not null default false,
  -- vom Server gesetzt; Grundlage für den Pull-Cursor der Geräte
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, collection, id),
  -- nur bekannte Sammlungen (siehe COLLECTIONS in src/core/types.ts)
  constraint user_records_collection_check check (collection in (
    'profile', 'settings', 'courseState', 'lessonProgress', 'vocabCards', 'errorEntries', 'badges',
    'xpEvents', 'answers', 'examResults', 'pronAttempts', 'partnerSessions',
    'songFavorites', 'playlists', 'songProgress', 'songNotes', 'songMarkedWords',
    'songExplanations', 'songUserTexts', 'songExerciseResults'
  )),
  constraint user_records_id_length check (char_length(id) between 1 and 200),
  -- Datensätze sind immer JSON-Objekte (Tombstones: {})
  constraint user_records_data_object check (jsonb_typeof(data) = 'object'),
  -- Schutz vor übergroßen Einträgen: höchstens 512 KiB je Datensatz, gemessen am JSON-Text
  -- (deterministisch, unabhängig von TOAST-Kompression). Der Client lädt nur Einträge bis
  -- 200 000 Bytes kompaktes JSON hoch (MAX_RECORD_BYTES in src/data/sync/engine.ts).
  constraint user_records_data_size check (octet_length(data::text) <= 524288)
);

comment on table public.user_records is
  'AppLingua: synchronisierte Nutzerdaten (lokal-first). Zugriff nur auf eigene Zeilen (RLS).';

-- Pull-Abfragen: where user_id = ? and server_updated_at >= ?
--   order by server_updated_at, collection, id (stabile Seiten) → vollständig per Index sortiert
create index if not exists user_records_user_sync_idx
  on public.user_records (user_id, server_updated_at, collection, id);

-- ───────────────────────── Zeilensicherheit (RLS) ─────────────────────────
alter table public.user_records enable row level security;

drop policy if exists "user_records: eigene Zeilen lesen" on public.user_records;
create policy "user_records: eigene Zeilen lesen"
  on public.user_records for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_records: eigene Zeilen anlegen" on public.user_records;
create policy "user_records: eigene Zeilen anlegen"
  on public.user_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_records: eigene Zeilen ändern" on public.user_records;
create policy "user_records: eigene Zeilen ändern"
  on public.user_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_records: eigene Zeilen löschen" on public.user_records;
create policy "user_records: eigene Zeilen löschen"
  on public.user_records for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Anonyme Zugriffe grundsätzlich ausschließen; angemeldete nur über die Policies oben.
-- (Supabase vergibt per Default-Privileges auch TRUNCATE/REFERENCES/TRIGGER – TRUNCATE umginge RLS.)
revoke all on table public.user_records from anon, authenticated, public;
grant select, insert, update, delete on table public.user_records to authenticated;

-- ───────────────────────── Trigger: Serverzeit & Konfliktschutz ─────────────────────────
create or replace function public.user_records_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Schlüssel sind unveränderlich.
    if new.user_id is distinct from old.user_id
       or new.collection is distinct from old.collection
       or new.id is distinct from old.id then
      raise exception 'Schlüssel von user_records dürfen nicht geändert werden'
        using errcode = '42501';
    end if;
    -- Älterer Stand eines anderen Geräts → alten Datensatz behalten (Last-Write-Wins).
    -- Identischer Stand → nichts ändern, damit andere Geräte nicht unnötig neu laden.
    if new.updated_at < old.updated_at
       or (new.updated_at = old.updated_at
           and new.deleted = old.deleted
           and new.data = old.data) then
      return old;
    end if;
  end if;
  -- Serverzeit immer selbst setzen (Werte vom Client werden ignoriert).
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists user_records_before_write on public.user_records;
create trigger user_records_before_write
  before insert or update on public.user_records
  for each row execute function public.user_records_before_write();

-- ───────────────────────── ai_usage (nur service_role) ─────────────────────────
create table if not exists public.ai_usage (
  user_id uuid    not null references auth.users (id) on delete cascade,
  day     date    not null,
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

comment on table public.ai_usage is
  'AppLingua: Anzahl KI-Anfragen je Nutzer und Tag (UTC). Nur für die Edge Function ai-coach.';

-- RLS ohne Policies: für anon/authenticated unsichtbar; service_role umgeht RLS.
alter table public.ai_usage enable row level security;
revoke all on table public.ai_usage from anon, authenticated, public;
grant select, insert, update, delete on table public.ai_usage to service_role;

-- Zählt atomar eine Anfrage, sofern das Tageslimit noch nicht erreicht ist.
-- Rückgabe: allowed = false, wenn das Limit bereits ausgeschöpft war; used = Zählerstand.
create or replace function public.ai_usage_increment(p_user_id uuid, p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day   date := (now() at time zone 'utc')::date;
  v_count integer;
begin
  if p_user_id is null or p_limit is null or p_limit < 1 then
    return query select false, 0;
    return;
  end if;

  insert into public.ai_usage as u (user_id, day, count)
  values (p_user_id, v_day, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < p_limit
  returning u.count into v_count;

  if v_count is null then
    -- Konflikt, aber Limit erreicht → keine Zeile aktualisiert
    select u.count into v_count from public.ai_usage u where u.user_id = p_user_id and u.day = v_day;
    return query select false, coalesce(v_count, p_limit);
  else
    return query select true, v_count;
  end if;
end;
$$;

-- Gibt eine gezählte Anfrage zurück (z. B. wenn der KI-Dienst ausgefallen ist).
create or replace function public.ai_usage_release(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
     set count = count - 1
   where user_id = p_user_id
     and day = (now() at time zone 'utc')::date
     and count > 0;
$$;

revoke execute on function public.ai_usage_increment(uuid, integer) from public, anon, authenticated;
revoke execute on function public.ai_usage_release(uuid) from public, anon, authenticated;
grant execute on function public.ai_usage_increment(uuid, integer) to service_role;
grant execute on function public.ai_usage_release(uuid) to service_role;

-- Die Triggerfunktion wird nur vom Trigger aufgerufen.
revoke execute on function public.user_records_before_write() from public, anon, authenticated;
