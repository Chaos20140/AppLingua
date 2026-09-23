/**
 * Zugängliche SVG-Diagramme (aria-label + versteckte Tabelle), Farben aus den Tokens.
 */
import type { DayKey } from '../../engine/dates';
import { cx } from '../dashboard/Section';
import { activityLevel, formatDayKey, niceMax, toWeekColumns } from './statsLogic';
import s from './Charts.module.css';

export interface BarDatum {
  day: DayKey;
  xp: number;
  label: string;
  isToday?: boolean;
}

export interface XpBarChartProps {
  data: readonly BarDatum[];
  /** Tagesziel als gestrichelte Linie */
  goal?: number;
  /** Titel für Screenreader (aria-label, Tabellenbeschriftung) */
  title: string;
  /** Werte über den Balken */
  showValues?: boolean;
  /** nur jede n-te Beschriftung */
  labelEvery?: number;
  height?: number;
}

export function XpBarChart({ data, goal, title, showValues = true, labelEvery = 1, height = 168 }: XpBarChartProps) {
  const W = 320;
  const H = height;
  const top = showValues ? 22 : 12;
  const bottom = 22;
  const side = 4;
  const plotH = H - top - bottom;
  const max = niceMax(Math.max(goal ?? 0, ...data.map((d) => d.xp)));
  const slot = (W - side * 2) / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(28, slot * 0.62));
  const yOf = (v: number) => top + plotH - (v / max) * plotH;
  const base = top + plotH;

  const total = data.reduce((n, d) => n + d.xp, 0);
  const activeDays = data.filter((d) => d.xp > 0).length;
  const best = data.reduce<BarDatum | null>((b, d) => (d.xp > (b?.xp ?? 0) ? d : b), null);
  const summary =
    `${title}: insgesamt ${total} XP, an ${activeDays} von ${data.length} Tagen aktiv` +
    (best ? `, bester Tag ${formatDayKey(best.day)} mit ${best.xp} XP.` : '.');

  return (
    <figure className={s.figure}>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label={summary}>
        <line x1={side} x2={W - side} y1={base} y2={base} className={s.axis} />
        {goal ? (
          <g>
            <line x1={side} x2={W - side} y1={yOf(goal)} y2={yOf(goal)} className={s.goal} />
            <text x={W - side} y={yOf(goal) - 4} textAnchor="end" className={s.goalLabel}>
              Ziel {goal}
            </text>
          </g>
        ) : null}
        {data.map((d, i) => {
          const mid = side + slot * i + slot / 2;
          const h = d.xp > 0 ? Math.max(4, (d.xp / max) * plotH) : 3;
          const reached = !!goal && d.xp >= goal;
          const showLabel = i % labelEvery === 0 || i === data.length - 1;
          return (
            <g key={d.day}>
              <rect
                x={mid - barW / 2}
                y={base - h}
                width={barW}
                height={h}
                rx={Math.min(6, barW / 2)}
                className={cx(s.bar, d.xp === 0 && s.barEmpty, reached && s.barGoal, d.isToday && s.barToday)}
                style={{ animationDelay: `${Math.min(i, 30) * 25}ms` }}
              />
              {showValues && d.xp > 0 && (
                <text x={mid} y={base - h - 5} textAnchor="middle" className={s.value}>
                  {d.xp}
                </text>
              )}
              {showLabel && (
                <text x={mid} y={H - 6} textAnchor="middle" className={cx(s.label, d.isToday && s.labelToday)}>
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Tag</th>
            <th scope="col">XP</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{formatDayKey(d.day)}</th>
              <td>{d.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface ActivityCalendarProps {
  days: readonly { day: DayKey; xp: number }[];
  goal: number;
  today?: DayKey;
}

const ROW_LABELS = ['Mo', '', 'Mi', '', 'Fr', '', 'So'];

/** Aktivitätskalender (Wochen als Spalten, Mo–So als Zeilen). */
export function ActivityCalendar({ days, goal, today }: ActivityCalendarProps) {
  const cols = toWeekColumns(days);
  const active = days.filter((d) => d.xp > 0);
  const weeks = Math.round(days.length / 7);
  const summary = `Aktivität der letzten ${weeks} Wochen: an ${active.length} von ${days.length} Tagen gelernt.`;

  return (
    <figure className={s.cal}>
      <div className={s.calGrid} role="img" aria-label={summary}>
        <div className={s.rowLabels} aria-hidden="true">
          {ROW_LABELS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        {cols.map((col, ci) => (
          <div key={ci} className={s.week} aria-hidden="true">
            {col.map((c, ri) =>
              c ? (
                <span
                  key={ri}
                  className={cx(s.cell, c.day === today && s.cellToday)}
                  data-level={activityLevel(c.xp, goal)}
                  title={`${formatDayKey(c.day)}: ${c.xp} XP`}
                />
              ) : (
                <span key={ri} className={s.cellEmpty} />
              ),
            )}
          </div>
        ))}
      </div>
      <figcaption className={s.legend}>
        <span>{summary}</span>
        <span className={s.scale} aria-hidden="true">
          weniger
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={s.cell} data-level={l} />
          ))}
          mehr
        </span>
      </figcaption>
      {active.length > 0 && (
        <ul className="sr-only">
          {active.map((d) => (
            <li key={d.day}>{`${formatDayKey(d.day)}: ${d.xp} XP`}</li>
          ))}
        </ul>
      )}
    </figure>
  );
}
