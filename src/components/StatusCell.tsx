import { Progress, Tooltip } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined, ExclamationCircleFilled, RightOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, METRIC_META, type Creative, type MetricKey } from '../data/mock';
import type { RowStatus } from '../data/store';
import { spring, swap } from '../motion/tokens';

/** R5 / RA-28 to RA-30: the weakest grade, on every row (video included, decided 20 Nov). */
export function diagnosis(c: Creative) {
  const order: MetricKey[] = ['conversion', 'hook', 'retention', 'ctr'];
  const rank = (g: string | null) => (g ? 'ABCD'.indexOf(g[0]) : -1);
  const worst = order.reduce<MetricKey | null>((w, k) => (rank(c.grades[k]) > (w ? rank(c.grades[w]) : -1) ? k : w), null);
  if (!worst) return 'Not enough data to grade';
  if (rank(c.grades[worst]) <= 1) return 'No fix needed';
  const metric = worst === 'conversion' ? ACCOUNT.conversionMetric : worst === 'ctr' ? 'CTR' : METRIC_META[worst].label.toLowerCase();
  return `Fix ${metric} · ${c.grades[worst]}`;
}

export function StatusCell({ creative, status }: { creative: Creative; status: RowStatus }) {
  const healthy = status.kind === 'idle' && diagnosis(creative).startsWith('No fix');
  const key = status.kind === 'generating' ? 'gen' : status.kind;
  return (
    <span className={`status-cell ${status.kind} ${healthy ? 'healthy' : ''}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={key} variants={swap} initial="hidden" animate="show" exit="exit" className="status-inner">
          {status.kind === 'idle' && (
            <>
              {healthy ? <CheckCircleFilled className="status-icon calm" /> : <ThunderboltOutlined className="status-icon" />}
              {healthy ? (
                <Tooltip title="All grades are B or above">
                  <span>{diagnosis(creative)}</span>
                </Tooltip>
              ) : (
                <span>{diagnosis(creative)}</span>
              )}
              <RightOutlined className="status-chev" />
            </>
          )}
          {status.kind === 'queued' && (
            <>
              <ClockCircleOutlined />
              <span>Queued · {status.count} variations</span>
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
              <span>{status.count} variations ready</span>
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
            </>
          )}
          {status.kind === 'failed' && (
            <>
              <ExclamationCircleFilled className="status-icon bad" />
              <span>Couldn't create variations</span>
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
