import { Progress, Tooltip } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined, ExclamationCircleFilled, RightOutlined } from './AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ACCOUNT, METRIC_META, plural, type Creative, type MetricKey } from '../data/mock';
import type { RowStatus } from '../data/store';
import { spring, swap } from '../motion/tokens';

/** R5 / RA-28 to RA-30: the weakest grade, on every row (video included, decided 20 Nov). */
export function weakest(c: Creative) {
  const order: MetricKey[] = ['conversion', 'hook', 'retention', 'ctr'];
  const rank = (g: string | null) => (g ? 'ABCD'.indexOf(g[0]) : -1);
  const worst = order.reduce<MetricKey | null>((w, k) => (rank(c.grades[k]) > (w ? rank(c.grades[w]) : -1) ? k : w), null);
  return worst ? { metric: worst, grade: c.grades[worst] as string } : null;
}

export function diagnosis(c: Creative) {
  const order: MetricKey[] = ['conversion', 'hook', 'retention', 'ctr'];
  const rank = (g: string | null) => (g ? 'ABCD'.indexOf(g[0]) : -1);
  const worst = order.reduce<MetricKey | null>((w, k) => (rank(c.grades[k]) > (w ? rank(c.grades[w]) : -1) ? k : w), null);
  // K47 (R-L2): concise string so dense rows and phone cards never clip.
  if (!worst) return 'Not enough data';
  // Mancini 14:21: a healthy ad gets a low-priority next step instead of a status. It opens the ad, where its strengths can seed new variations.
  if (rank(c.grades[worst]) <= 1) return 'Build similar';
  // Mancini 21 Nov 09:43: the action names the tab it belongs to. Improve tab: improve one metric. Rework tab: most
  // metrics are weak, so the step is to rework the whole ad with new variations, not to tune one number.
  if (c.tab === 'candidates') return 'Rework ad';
  const metric = worst === 'conversion' ? ACCOUNT.conversionMetric : worst === 'ctr' ? 'CTR' : METRIC_META[worst].label.toLowerCase();
  return `Improve ${metric}`;
}

export function StatusCell({ creative, status, withGrade }: { creative: Creative; status: RowStatus; withGrade?: boolean }) {
  const weak = weakest(creative);
  const healthy = status.kind === 'idle' && diagnosis(creative) === 'Build similar';
  const key = status.kind === 'generating' ? 'gen' : status.kind;
  const nav = useNavigate();
  const open =
    status.kind === 'ready'
      ? (e: React.MouseEvent | React.KeyboardEvent) => {
          e.stopPropagation();
          nav(`/ad/${creative.id}/variations?round=${status.jobId}`);
        }
      : undefined;
  return (
    <span
      className={`status-cell ${status.kind} ${healthy ? 'healthy' : ''}`}
      onClick={open}
      role={open ? 'link' : undefined}
      tabIndex={open ? 0 : undefined}
      onKeyDown={open ? (e) => e.key === 'Enter' && open(e) : undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={key} variants={swap} initial="hidden" animate="show" exit="exit" className="status-inner">
          {status.kind === 'idle' && (
            <>
              {healthy ? (
                <Tooltip title="All grades are B or above. Make new variations from what already works.">
                  <span>{diagnosis(creative)}</span>
                </Tooltip>
              ) : (
                <span>
                  {diagnosis(creative)}
                  {withGrade && weak && <span className="status-grade">{'\u00a0'}· {weak.grade}</span>}
                </span>
              )}
              <RightOutlined className="status-chev" />
            </>
          )}
          {status.kind === 'queued' && (
            <>
              <ClockCircleOutlined />
              {/* K20a (R-M11): shared plural() helper. */}
              <span>Queued{'\u00a0'}· {plural(status.count, 'variation')}</span>
            </>
          )}
          {status.kind === 'generating' && (
            <>
              <Progress type="circle" percent={Math.round(status.progress * 100)} size={14} showInfo={false} strokeWidth={14} />
              <span>Generating {status.count}</span>
            </>
          )}
          {status.kind === 'ready' && (
            <>
              <CheckCircleFilled className="status-icon ok" />
              {/* K32 (R-I7): says what opens instead of repeating the button label. */}
              <Tooltip title={`${status.count} new variations are ready to review.`}>
                <span>See results</span>
              </Tooltip>
              <AnimatePresence>
                {status.unseen && (
                  <motion.i
                    className="unseen-dot"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: spring.snappy }}
                    exit={{ opacity: 0 }}
                    aria-label="New"
                  />
                )}
              </AnimatePresence>
              <RightOutlined className="status-chev" />
            </>
          )}
          {status.kind === 'failed' && (
            <>
              <ExclamationCircleFilled className="status-icon bad" />
              {/* K16 (R-AI8): state what happened and credits returned. */}
              <Tooltip title={`The variations couldn't be created. ${status.count * ACCOUNT.creditsPerImage}\u00a0credits were returned.`}>
                <span>Failed to create</span>
              </Tooltip>
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
