import { Popover, Tag, Tooltip } from 'antd';
import { ACCOUNT, METRIC_META, WINDOW, gradeBand, type Creative, type Grade, type MetricKey } from '../data/mock';

const COLOR: Record<string, string> = { A: 'green', B: 'blue', C: 'gold', D: 'red' };

export function GradeChip({ g }: { g: Grade }) {
  if (!g)
    return (
      <Tooltip title="Graded on video only">
        <span className="na">N/A</span>
      </Tooltip>
    );
  return (
    <Tag color={COLOR[g[0]]} className="grade-tag" bordered>
      {g}
    </Tag>
  );
}

/** R6: click a grade for the band, the number and whether lower or higher is better (RA-35 to RA-38). */
export function GradeTag({ creative, metric }: { creative: Creative; metric: MetricKey }) {
  const g = creative.grades[metric];
  if (!g) return <GradeChip g={g} />;
  const meta = METRIC_META[metric];
  const valueKey = ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[metric];
  const value = creative.values[valueKey] ?? 0;
  const avg = ACCOUNT.avg[meta.avgKey];
  const name = metric === 'conversion' ? ACCOUNT.conversionMetric : meta.label;
  const content = (
    <div className="grade-pop" onClick={(e) => e.stopPropagation()}>
      <div className="grade-pop-title">
        <GradeChip g={g} /> {meta.label}
      </div>
      <p>{gradeBand(g)} of this account by {meta.plain}</p>
      <p className="grade-pop-num">
        {name} {meta.unit(value)}. <span className="muted">Account average {meta.unit(avg)}. {meta.lowerIsBetter ? 'Lower' : 'Higher'} is better.</span>
      </p>
      <p className="muted small">{WINDOW.long}</p>
    </div>
  );
  return (
    <Popover content={content} trigger="click" placement="bottom">
      <button className="grade-btn" onClick={(e) => e.stopPropagation()} aria-label={`${meta.label} grade ${g}. Show explanation`}>
        <GradeChip g={g} />
      </button>
    </Popover>
  );
}

/** Overall grade shows its breakdown (RA-39, RA-40). */
export function OverallTag({ creative }: { creative: Creative }) {
  const parts = (Object.keys(METRIC_META) as MetricKey[]).filter((k) => creative.grades[k]);
  const content = (
    <div className="grade-pop" onClick={(e) => e.stopPropagation()}>
      <div className="grade-pop-title">
        <GradeChip g={creative.overall} /> Overall
      </div>
      <p>Combines the grades below</p>
      <div className="grade-breakdown">
        {parts.map((k) => (
          <span key={k}>
            {METRIC_META[k].label} <GradeChip g={creative.grades[k]} />
          </span>
        ))}
      </div>
      {creative.media !== 'Video' && <p className="muted small">Hook and retention are graded on video only</p>}
      <p className="muted small">{WINDOW.long}</p>
    </div>
  );
  return (
    <Popover content={content} trigger="click" placement="bottom">
      <button className="grade-btn" onClick={(e) => e.stopPropagation()} aria-label={`Overall grade ${creative.overall}. Show explanation`}>
        <GradeChip g={creative.overall} />
      </button>
    </Popover>
  );
}
