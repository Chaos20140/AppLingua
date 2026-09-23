/**
 * In-Memory-Cloud mit denselben Regeln wie public.user_records (für Tests und lokale Experimente):
 * - Upsert je (user, collection, id); ältere updated_at werden verworfen (wie der DB-Trigger),
 *   identische Stände verändern server_updated_at nicht.
 * - server_updated_at ist streng monoton.
 * - Schlüsselreihenfolge von `data` wird wie bei jsonb normalisiert (deckt Merge-Pingpong auf).
 */
import type { CollectionName, StoredRecord } from '../../core/types';
import { CloudError, type CloudAdapter, type PullPage, type PullRequest } from './adapter';

interface ServerRow {
  userId: string;
  record: StoredRecord;
  serverUpdatedAt: string;
}

/** jsonb speichert Schlüssel sortiert (erst nach Länge, dann bytewise). */
export function jsonbNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(jsonbNormalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    const keys = Object.keys(value).filter((k) => (value as Record<string, unknown>)[k] !== undefined);
    keys.sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
    for (const k of keys) out[k] = jsonbNormalize((value as Record<string, unknown>)[k]);
    return out;
  }
  return value;
}

export class MemoryCloudAdapter implements CloudAdapter {
  readonly id = 'memory';
  online = true;
  pushCalls = 0;
  /**
   * true: alle Zeilen eines Uploads erhalten denselben server_updated_at (wie viele Zeilen innerhalb
   * derselben Millisekunde in Postgres) – prüft das Weiterblättern bei gleichen Zeitstempeln.
   */
  sharedClockPerPush = false;
  private rows = new Map<string, ServerRow>();
  private clock = Date.parse('2026-01-01T00:00:00.000Z');

  private key(userId: string, c: string, id: string) { return `${userId}\u0000${c}\u0000${id}`; }
  private tick(): string { this.clock += 1; return new Date(this.clock).toISOString(); }
  private ensureOnline() { if (!this.online) throw new CloudError('network', 'offline (simuliert)'); }

  async push(userId: string, records: StoredRecord[]): Promise<void> {
    this.ensureOnline();
    this.pushCalls++;
    const shared = this.sharedClockPerPush ? this.tick() : null;
    for (const r of records) {
      if (r.localOnly) throw new Error('localOnly-Datensatz darf nie hochgeladen werden: ' + r.collection + '/' + r.id);
      const k = this.key(userId, r.collection, r.id);
      const prev = this.rows.get(k);
      const incoming: StoredRecord = {
        collection: r.collection, id: r.id, updatedAt: r.updatedAt,
        data: jsonbNormalize(r.deleted ? {} : r.data) as StoredRecord['data'],
      };
      if (r.deleted) incoming.deleted = true;
      if (prev) {
        if (incoming.updatedAt < prev.record.updatedAt) continue;
        if (incoming.updatedAt === prev.record.updatedAt && Boolean(incoming.deleted) === Boolean(prev.record.deleted)
          && JSON.stringify(incoming.data) === JSON.stringify(prev.record.data)) continue;
      }
      this.rows.set(k, { userId, record: incoming, serverUpdatedAt: shared ?? this.tick() });
    }
  }

  async pull(userId: string, req: PullRequest): Promise<PullPage> {
    this.ensureOnline();
    const all = [...this.rows.values()]
      .filter((r) => r.userId === userId && (!req.since || r.serverUpdatedAt >= req.since))
      .sort((a, b) => (a.serverUpdatedAt < b.serverUpdatedAt ? -1 : a.serverUpdatedAt > b.serverUpdatedAt ? 1
        : a.record.collection < b.record.collection ? -1 : a.record.collection > b.record.collection ? 1
          : a.record.id < b.record.id ? -1 : a.record.id > b.record.id ? 1 : 0));
    const page = all.slice(req.offset, req.offset + req.limit);
    return {
      records: page.map((r) => structuredClone(r.record)),
      rowCount: page.length,
      lastServerUpdatedAt: page.length ? page[page.length - 1].serverUpdatedAt : null,
    };
  }

  async purgeCollection(userId: string, collection: CollectionName, idPrefix?: string, dataField?: string): Promise<void> {
    this.ensureOnline();
    for (const [k, r] of this.rows) {
      if (r.userId !== userId || r.record.collection !== collection) continue;
      const value = dataField ? (r.record.data as unknown as Record<string, unknown>)?.[dataField] : r.record.id;
      if (!idPrefix || (typeof value === 'string' && value.startsWith(idPrefix))) this.rows.delete(k);
    }
  }

  /** Test-Hilfe: aktueller Server-Stand eines Datensatzes */
  get(userId: string, c: CollectionName, id: string): StoredRecord | undefined {
    const r = this.rows.get(this.key(userId, c, id));
    return r ? structuredClone(r.record) : undefined;
  }

  count(userId: string, c?: CollectionName): number {
    return [...this.rows.values()].filter((r) => r.userId === userId && (!c || r.record.collection === c)).length;
  }
}
