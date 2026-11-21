import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Section-head link (Mancini 15:07): an icon at rest that slides open to icon plus label on hover or keyboard focus.
 * On touch screens there is no hover, so the label always shows. The label is always in the accessible name.
 */
export function ExpandLink({ to, icon, children }: { to: string; icon: ReactNode; children: string }) {
  return (
    <Link to={to} className="xlink" aria-label={children}>
      <span className="xlink-icon" aria-hidden>
        {icon}
      </span>
      <span className="xlink-label" aria-hidden>
        <span>{children}</span>
      </span>
    </Link>
  );
}
