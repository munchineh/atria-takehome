import { Grid, Popover, Tag, Tooltip } from 'antd';
import { accountOf, useStore } from '../data/store';
import { ACCOUNT, METRIC_META, WINDOWS, type Creative, type Grade, type MetricKey } from '../data/mock';

const COLOR: Record<string, string> = { A: 'green', B: 'blue', C: 'gold', D: 'red' };

export function GradeChip({ g }: { g: Grade }) {
  if (!g)
    return (
      <Tooltip title="Graded on video ads only.">
        <span className="na">N/A</span>
      </Tooltip>
    );
  return (
    <Tag color={COLOR[g[0]]} className="grade-tag" bordered>
      {g}
    </Tag>
  );
}

/** Hover on desktop, tap on touch (Mancini, 20 Nov 17:00). */
function useGradeTrigger() {
  const bp = Grid.useBreakpoint();
  const { windowDays } = useStore();
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return { trigger: (!bp.md || touch ? 'click' : 'hover') as 'click' | 'hover', windowLong: (WINDOWS.find((w) => w.days === windowDays) ?? WINDOWS[1]).long };
}

const BAND: Record<string, string> = { A: 'Top', B: 'Above average', C: 'Below average', D: 'Lowest' };
/** Mock position behind the letter (deck RA-35, L-040: no quartile claim). */
function beats(id: string, metric: string, g: string) {
  const h = [...(id + metric)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % 15;
  return ({ A: 80, B: 56, C: 32, D: 8 } as Record<string, number>)[g[0]] + h;
}

/** R6: hover a grade for its band, its position and the number behind it (RA-35 to RA-38). */
export function GradeTag({ creative, metric }: { creative: Creative; metric: MetricKey }) {
  const { trigger, windowLong } = useGradeTrigger();
  const g = creative.grades[metric];
  if (!g) return <GradeChip g={g} />;
  const meta = METRIC_META[metric];
  const valueKey = ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[metric];
  const value = creative.values[valueKey] ?? 0;
  const avg = accountOf(creative).avg[meta.avgKey];
  const name = metric === 'conversion' ? ACCOUNT.conversionMetric : meta.label;
  const content = (
    <div className="grade-pop" onClick={(e) => e.stopPropagation()}>
      <div className="grade-pop-title">
        <GradeChip g={g} /> {meta.label} · {BAND[g[0]]}
      </div>
      <p className="grade-pop-lead">Beats {beats(creative.id, metric, g)}% of the ads in this account.</p>
      <div className="grade-pop-kv">
        <span className="t-key">This ad</span>
        <span>{metric === 'conversion' ? `${name} ${meta.unit(value)}` : meta.unit(value)}</span>
        <span className="t-key">Account average</span>
        <span>{meta.unit(avg)}</span>
      </div>
      <p className="t-help">{meta.lowerIsBetter ? 'Lower' : 'Higher'} is better.</p>
      <p className="grade-pop-meta">{windowLong}</p>
    </div>
  );
  return (
    <Popover content={content} trigger={trigger} placement="bottom" mouseEnterDelay={0.15}>
      <button className="grade-btn" onClick={(e) => e.stopPropagation()} aria-label={`${meta.label} grade ${g}. Show how it's graded`}>
        <GradeChip g={g} />
      </button>
    </Popover>
  );
}

/** Overall grade shows its breakdown (RA-37). */
export function OverallTag({ creative }: { creative: Creative }) {
  const { trigger, windowLong } = useGradeTrigger();
  const parts = (Object.keys(METRIC_META) as MetricKey[]).filter((k) => creative.grades[k]);
  const content = (
    <div className="grade-pop" onClick={(e) => e.stopPropagation()}>
      <div className="grade-pop-title">
        <GradeChip g={creative.overall} /> Overall · {creative.overall ? BAND[creative.overall[0]] : ''}
      </div>
      <p className="grade-pop-lead">Combines this ad's grades into one.</p>
      <div className="grade-pop-kv overall-kv">
        {parts.map((k) => (
          <span key={k} className="kv-pair">
            <span className="t-key">{METRIC_META[k].label}</span>
            <GradeChip g={creative.grades[k]} />
          </span>
        ))}
      </div>
      {creative.media !== 'Video' && <p className="t-help">Hook and retention are graded on video ads only.</p>}
      <p className="grade-pop-meta">{windowLong}</p>
    </div>
  );
  return (
    <Popover content={content} trigger={trigger} placement="bottom" mouseEnterDelay={0.15}>
      <button className="grade-btn" onClick={(e) => e.stopPropagation()} aria-label={`Overall grade ${creative.overall}. Show how it's graded`}>
        <GradeChip g={creative.overall} />
      </button>
    </Popover>
  );
}
