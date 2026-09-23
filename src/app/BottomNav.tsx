import { Link, useLocation } from 'react-router-dom';
import { cx } from '../ui/internal/helpers';
import { PRIMARY_NAV, isActivePath } from './nav';
import s from './BottomNav.module.css';

/** Mobile Hauptnavigation (≤ 1023 px) mit Blur; Songs in der Mitte hervorgehoben. */
export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className={s.nav} aria-label="Hauptnavigation">
      <ul className={s.list}>
        {PRIMARY_NAV.map((item) => {
          const active = isActivePath(pathname, item.match);
          const Icon = item.icon;
          const featured = item.to === '/songs';
          return (
            <li key={item.to} className={s.cell}>
              <Link
                to={item.to}
                className={cx(s.item, featured && s.featured)}
                aria-current={active ? 'page' : undefined}
              >
                <span className={s.iconWrap} aria-hidden="true">
                  <Icon strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className={s.label}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
