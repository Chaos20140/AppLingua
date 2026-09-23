import { Link, NavLink } from 'react-router-dom';
import { useActiveCourse, useVariant, VARIANT_LABELS } from '../state/settings';
import { cx } from '../ui/internal/helpers';
import { LogoMark } from '../ui/internal/LogoMark';
import { SIDEBAR_SECTIONS } from './nav';
import SyncIndicator from './SyncIndicator';
import s from './Sidebar.module.css';

/** Desktop-Seitenleiste (≥ 1024 px) mit allen Bereichen, aktivem Kurs und Sync-Status. */
export default function Sidebar() {
  const course = useActiveCourse();
  const variant = useVariant();
  const [lang, region] = splitVariantLabel(VARIANT_LABELS[variant]);

  return (
    <aside className={s.sidebar} aria-label="Seitenleiste">
      <Link to="/dashboard" className={s.brand} aria-label="AppLingua – zur Startseite">
        <LogoMark size={34} className={s.logo} />
        <span className={s.brandName}>AppLingua</span>
      </Link>

      <div className={s.course} data-course={course}>
        <span className={s.courseDot} aria-hidden="true" />
        <span className={s.courseText}>
          <span className={s.courseLabel}>Aktiver Kurs</span>
          <span className={s.courseName}>
            {lang}
            {region && <span className={s.courseRegion}> · {region}</span>}
          </span>
        </span>
      </div>

      <nav className={s.nav} aria-label="Bereiche">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className={s.section}>
            <h2 className={s.sectionTitle}>{section.title}</h2>
            <ul className={s.list}>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/dashboard'}
                      className={({ isActive }) => cx(s.link, isActive && s.active, item.to === '/songs' && s.songs)}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={s.footer}>
        <SyncIndicator variant="full" />
        <div className={s.legal}>
          <Link to="/datenschutz">Datenschutz</Link>
          <Link to="/rechtliches">Rechtliches</Link>
        </div>
      </div>
    </aside>
  );
}

/** „Spanisch (Spanien)“ → ["Spanisch", "Spanien"] */
function splitVariantLabel(label: string): [string, string | null] {
  const m = /^(.*?)\s*\((.*)\)$/.exec(label);
  return m ? [m[1], m[2]] : [label, null];
}
