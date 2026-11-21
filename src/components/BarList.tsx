import { RightOutlined } from './AppIcons';
import { motion } from 'motion/react';
import { money, plural } from '../data/mock';
import type { BarRow } from '../data/insights';
import { duration, ease } from '../motion/tokens';

/**
 * Horizontal bar list (Mancini 09:43, item 2). Each row has its own bar, so uneven groups still read:
 * a group with one ad keeps its label and number, and a share of 0 shows as an empty track rather than vanishing.
 * Pie charts were ruled out: angles are hard to compare and small slices lose their labels.
 */
export function BarList({ rows, tone, onPick, unit = 'ad' }: { rows: BarRow[]; tone?: (key: string) => string; onPick?: (key: string) => void; unit?: string }) {
  return (
    <ul className="bar-list">
      {rows.map((r, i) => {
        const pct = Math.round(r.share * 100);
        const body = (
          <>
            <span className="bar-list-label">
              {r.label}
              <span className="bar-list-count">{plural(r.count, unit)}</span>
            </span>
            <span className="bar-list-track" aria-hidden>
              <motion.i
                className={tone ? tone(r.key) : undefined}
                // Mancini 15:37: width, not scaleX. Scaling squashed the rounded end into a square.
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(r.share, r.count ? 0.03 : 0) * 100}%` }}
                transition={{ duration: duration.slow, ease: ease.standard, delay: 0.05 * i }}
              />
            </span>
            <span className="bar-list-val">
              <b>{pct}%</b>
              <span className="bar-list-spend">{money(r.spend).replace(/\.\d\d$/, '')}</span>
            </span>
            {onPick && <RightOutlined className="bar-list-chev" aria-hidden />}
          </>
        );
        return (
          <li key={r.key}>
            {onPick ? (
              <button type="button" className="bar-list-row" onClick={() => onPick(r.key)} aria-label={`${r.label}: ${plural(r.count, unit)}, ${pct}% of spend`}>
                {body}
              </button>
            ) : (
              <div className="bar-list-row">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
