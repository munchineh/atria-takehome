import { useId } from 'react';
import { BarChartOutlined, RadarChartOutlined } from '@ant-design/icons';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { spring } from '../motion/tokens';

const OPTIONS = [
  { value: 'overview', label: 'Overview', to: '/overview', icon: <BarChartOutlined /> },
  { value: 'radar', label: 'Radar', to: '/', icon: <RadarChartOutlined /> },
] as const;

/**
 * Item 13 (DL-02, R-MO): Overview and Radar sliding pill switch.
 * Labels stay "Overview" and "Radar"; motion uses spring.snappy (bounce: 0).
 */
export function ModeSwitch() {
  const loc = useLocation();
  const nav = useNavigate();
  const id = useId();
  const active = loc.pathname.startsWith('/overview') ? 'overview' : 'radar';

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = OPTIONS[(idx + 1) % OPTIONS.length];
      nav(next.to);
    }
  };

  return (
    <div className="mode-switch top-nav" role="tablist" aria-label="View mode">
      {OPTIONS.map((opt, idx) => {
        const selected = active === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`mode-pill-btn ${selected ? 'active' : ''}`}
            onClick={() => nav(opt.to)}
            onKeyDown={(e) => onKeyDown(e, idx)}
          >
            {selected && (
              <motion.span
                layoutId={`mode-pill-${id}`}
                className="mode-pill-thumb"
                transition={spring.snappy}
                aria-hidden
              />
            )}
            <span className="mode-pill-content">
              {opt.icon}
              <span>{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
