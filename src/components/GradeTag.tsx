import { Popover, Tag, Tooltip } from 'antd';
import { ACCOUNT, METRIC_META, gradeBand, type Creative, type Grade, type MetricKey } from '../data/mock';

const COLOR: Record<string, string> = { A: 'green', B: 'blue', C: 'gold', D: 'red' };

export function GradeChip({ g }: { g: Grade }) {
  if (!g)
    return (
      <Tooltip title="Video only">
        <span className="na">N/A</span>
      </Tooltip>
    );
  return (
    <Tag color={COLOR[g[0]]} className="grade-tag" bordered>
      {g}
    </Tag>
  );
}

/** R6: click a grade for a plain-words explanation with the number and window. */
export function GradeTag({ creative, metric }: { creative: Creative; metric: MetricKey }) {
  const g = creative.grades[metric];
  if (!g) return <GradeChip g={g} />;
  const meta = METRIC_META[metric];
  const valueKey = ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[metric];
  const value = creative.values[valueKey] ?? 0;
  const avg = ACCOUNT.avg[meta.avgKey];
  const content = (
    <div className="grade-pop" onClick={(e) => e.stopPropagation()}>
      <div className="grade-pop-title">
        <GradeChip g={g} /> {meta.label}
      </div>
      <p>
        <b>{gradeBand(g)}</b> of this account by {meta.plain}, weighted by spend.
      </p>
      <p className="grade-pop-num">
        {meta.unit(value)} <span className="muted">vs account avg {meta.unit(avg)}</span>
      </p>
      <p className="muted small">{ACCOUNT.windowLabel}</p>
    </div>
  );
  return (
    <Popover content={content} trigger="click" placement="bottom">
      <button className="grade-btn" onClick={(e) => e.stopPropagation()} aria-label={`${meta.label} grade ${g}, explain`}>
        <GradeChip g={g} />
      </button>
    </Popover>
  );
}

/** Overall grade shows its breakdown. */
export function OverallTag({ creative }: { creative: Creative }) {
  const parts = (Object.keys(METRIC_META) as MetricKey[]).filter((k) => creative.grades[k]);
  const content = (
    <div className="grade-pop" onClick={(e) => e.stopPropagation()}>
      <div className="grade-pop-title">
        <GradeChip g={creative.overall} /> Overall
      </div>
      <p>Combines the grades this creative has, weighted by spend:</p>
      <div className="grade-breakdown">
        {parts.map((k) => (
          <span key={k}>
            {METRIC_META[k].label} <GradeChip g={creative.grades[k]} />
          </span>
        ))}
      </div>
      {creative.media === 'Image' && <p className="muted small">Hook and retention are video-only.</p>}
      <p className="muted small">{ACCOUNT.windowLabel}</p>
    </div>
  );
  return (
    <Popover content={content} trigger="click" placement="bottom">
      <button className="grade-btn" onClick={(e) => e.stopPropagation()} aria-label={`Overall grade ${creative.overall}, explain`}>
        <GradeChip g={creative.overall} />
      </button>
    </Popover>
  );
}
