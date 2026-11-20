import { Grid, Tag, Tooltip } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { PopSheet } from './PopSheet';
import { accountOf, useStore } from '../data/store';
import { METRIC_META, WINDOWS, money, type Creative, type Grade, type MetricKey } from '../data/mock';

export function GradeChip({ g }: { g: Grade }) {
  if (!g)
    return (
      <Tooltip title="Graded on video ads only.">
        <span className="na">N/A</span>
      </Tooltip>
    );
  return <Tag className={`grade-tag g-${g[0]}`}>{g}</Tag>;
}

/** Hover on desktop, tap on touch (Mancini, 20 Nov 17:00). */
function useGradeTrigger() {
  const bp = Grid.useBreakpoint();
  const { windowDays } = useStore();
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return {
    trigger: (!bp.md || touch ? 'click' : 'hover') as 'click' | 'hover',
    windowLong: (WINDOWS.find((w) => w.days === windowDays) ?? WINDOWS[1]).long,
  };
}

const BAND: Record<string, string> = { A: 'Top', B: 'Above average', C: 'Below average', D: 'Lowest' };

/** Mock position behind the letter (deck RA-35, L-040: no quartile claim). */
function beats(id: string, metric: string, g: string) {
  const h = [...(id + metric)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % 15;
  return ({ A: 80, B: 56, C: 32, D: 8 } as Record<string, number>)[g[0]] + h;
}

/**
 * Item 7 (R-H, DL-01): Grade popover in three clear tiers:
 * 1. Header (grade + band + takeaway)
 * 2. Breakdown (tabular numbers, direction + semantic color)
 * 3. Muted footer separated by a divider (grading window + scope note)
 */
export function GradeTag({ creative, metric }: { creative: Creative; metric: MetricKey }) {
  const { trigger, windowLong } = useGradeTrigger();
  const g = creative.grades[metric];
  if (!g) return <GradeChip g={g} />;
  const meta = METRIC_META[metric];
  const valueKey = ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[metric];
  const value = creative.values[valueKey] ?? 0;
  const avg = accountOf(creative).avg[meta.avgKey];
  const better = meta.lowerIsBetter ? value < avg : value > avg;
  const higher = value > avg;
  const DirIcon = higher ? ArrowUpOutlined : ArrowDownOutlined;

  const content = (
    <div className="grade-pop" onClick={(e) => e.stopPropagation()}>
      <div className="grade-pop-header">
        <div className="grade-pop-title">
          <GradeChip g={g} />
          <span className="grade-pop-name">{meta.label}</span>
          <span className="grade-pop-band">{BAND[g[0]]}</span>
        </div>
        <p className="grade-pop-lead">Beats {beats(creative.id, metric, g)}% of the ads in this account.</p>
      </div>

      <div className="grade-pop-kv">
        <span className="t-key">This ad</span>
        <span className={`grade-pop-val ${better ? 'val-good' : 'val-bad'}`}>
          <DirIcon aria-hidden /> {meta.unit(value)}
        </span>
        <span className="t-key">Account average</span>
        <span className="grade-pop-val">{meta.unit(avg)}</span>
      </div>

      <div className="grade-pop-footer">
        <p className="grade-pop-window">{windowLong}</p>
        <p className="grade-pop-note">Compared with other ads in this account.</p>
      </div>
    </div>
  );

  return (
    <PopSheet
      content={content}
      sheetTitle={
        <span className="sheet-grade-title">
          <GradeChip g={g} /> {meta.label}
          {'\u00a0'}· {BAND[g[0]]}
        </span>
      }
      trigger={trigger}
      placement="bottom"
      mouseEnterDelay={0.15}
    >
      <button className="grade-btn" onClick={(e) => e.stopPropagation()} aria-label={`${meta.label} grade ${g}. Show how it's graded`}>
        <GradeChip g={g} />
      </button>
    </PopSheet>
  );
}

/** Overall grade shows its breakdown in the same three-tier layout (Item 7, RA-37). */
export function OverallTag({ creative }: { creative: Creative }) {
  const { trigger, windowLong } = useGradeTrigger();
  const parts = (Object.keys(METRIC_META) as MetricKey[]).filter((k) => creative.grades[k]);
  const band = creative.overall ? BAND[creative.overall[0]] : '';

  const content = (
    <div className="grade-pop" onClick={(e) => e.stopPropagation()}>
      <div className="grade-pop-header">
        <div className="grade-pop-title">
          <GradeChip g={creative.overall} />
          <span className="grade-pop-name">Overall</span>
          {band && <span className="grade-pop-band">{band}</span>}
        </div>
        <p className="grade-pop-lead">Combines this ad's grades into one.</p>
      </div>

      <div className="grade-pop-kv overall-kv">
        {parts.map((k) => (
          <span key={k} className="kv-pair">
            <span className="t-key">{METRIC_META[k].label}</span>
            <GradeChip g={creative.grades[k]} />
          </span>
        ))}
        <span className="kv-pair overall-spend">
          <span className="t-key">Spend</span>
          <span className="grade-pop-val">{money(creative.spend)}</span>
        </span>
      </div>

      <div className="grade-pop-footer">
        <p className="grade-pop-window">{windowLong}</p>
        <p className="grade-pop-note">
          {creative.media !== 'Video' ? 'Hook and retention apply to video ads\u00a0only.' : 'Ads that spend more carry more weight.'}
        </p>
      </div>
    </div>
  );

  return (
    <PopSheet
      content={content}
      sheetTitle={
        <span className="sheet-grade-title">
          <GradeChip g={creative.overall} /> Overall{band ? `\u00a0· ${band}` : ''}
        </span>
      }
      trigger={trigger}
      placement="bottom"
      mouseEnterDelay={0.15}
    >
      <button className="grade-btn" onClick={(e) => e.stopPropagation()} aria-label={`Overall grade ${creative.overall}. Show how it's graded`}>
        <GradeChip g={creative.overall} />
      </button>
    </PopSheet>
  );
}
