import { useState } from 'react';
import { motion } from 'motion/react';
import { spring } from '../motion/tokens';

/**
 * Spend by placement, built to scale (Mancini, 20 Nov 17:36: "what if I have 15 placements?").
 * The bar shows the top 3 and one grey "Other" segment; below it a ranked list of the top 3
 * with "Show all N" for the rest, so 2 placements and 15 read the same way.
 */
export function Placements({ items, animate = false }: { items: { label: string; share: number }[]; animate?: boolean }) {
  const [all, setAll] = useState(false);
  const sorted = [...items].sort((a, b) => b.share - a.share);
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const other = rest.reduce((s, p) => s + p.share, 0);
  const pct = (v: number) => (v < 0.01 ? '<1%' : `${Math.round(v * 100)}%`);
  const segs = [...top.map((p, i) => ({ ...p, cls: `seg-${i}` })), ...(other ? [{ label: 'Other', share: other, cls: 'seg-other' }] : [])];
  const rows = all ? sorted : top;
  return (
    <div className="placements">
      <div className="t-label">Spend by placement</div>
      <div className="placement-bar" role="img" aria-label={sorted.map((p) => `${p.label} ${pct(p.share)}`).join(', ')}>
        {segs.map((p, i) => (
          <motion.i
            key={p.label}
            style={{ width: `${p.share * 100}%`, originX: 0 }}
            className={`seg ${p.cls}`}
            initial={animate ? { scaleX: 0 } : false}
            animate={{ scaleX: 1, transition: { ...spring.gentle, delay: 0.05 + i * 0.04 } }}
          />
        ))}
      </div>
      <ul className="place-list">
        {rows.map((p, i) => (
          <li key={p.label}>
            <i className={`place-dot ${i < 3 ? `seg-${i}` : 'seg-other'}`} />
            <span>{p.label}</span>
            <span className="place-pct">{pct(p.share)}</span>
          </li>
        ))}
        {!all && rest.length > 0 && (
          <li className="place-other">
            <i className="place-dot seg-other" />
            <span>Other {rest.length}</span>
            <span className="place-pct">{pct(other)}</span>
          </li>
        )}
      </ul>
      {rest.length > 0 && (
        <button className="link-btn small place-more" onClick={(e) => { e.stopPropagation(); setAll((a) => !a); }}>
          {all ? 'Show top 3' : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}
