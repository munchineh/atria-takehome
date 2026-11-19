import { Progress, Tooltip } from 'antd';
import { CheckCircleFilled, RightOutlined, StopOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { METRIC_META, type Creative, type MetricKey, type RowStatus } from '../data/mock';
import { spring, swap } from '../motion/tokens';

/** R5: the diagnosis per row, which becomes the status once a job runs. */
export function diagnosis(c: Creative) {
  const order: MetricKey[] = ['conversion', 'hook', 'retention', 'ctr'];
  const rank = (g: string | null) => (g ? 'ABCD'.indexOf(g[0]) : -1);
  const worst = order.reduce<MetricKey | null>((w, k) => (rank(c.grades[k]) > (w ? rank(c.grades[w]) : -1) ? k : w), null);
  if (!worst) return 'Review';
  const verb = { conversion: 'Fix conversion', hook: 'Fix the hook', retention: 'Fix retention', ctr: 'Lift CTR' }[worst];
  const metric = worst === 'conversion' ? 'CPA' : METRIC_META[worst].label;
  return `${verb}: ${metric} ${c.grades[worst]}`;
}

export function StatusCell({ creative, status }: { creative: Creative; status: RowStatus }) {
  if (creative.media === 'Video') {
    return (
      <Tooltip title="Variations are for image ads for now. Video iteration is on the roadmap.">
        <span className="status-cell disabled">
          <StopOutlined /> Video: can't iterate yet
        </span>
      </Tooltip>
    );
  }
  const key = status.kind === 'generating' ? 'gen' : status.kind;
  return (
    <span className={`status-cell ${status.kind}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={key} variants={swap} initial="hidden" animate="show" exit="exit" className="status-inner">
          {status.kind === 'idle' && (
            <>
              <ThunderboltOutlined className="status-icon" />
              <span>{diagnosis(creative)}</span>
              <RightOutlined className="status-chev" />
            </>
          )}
          {status.kind === 'generating' && (
            <>
              <Progress type="circle" percent={Math.round(status.progress * 100)} size={14} showInfo={false} strokeWidth={14} />
              <span>Generating {status.count}…</span>
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
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, transition: spring.snappy }}
                    exit={{ scale: 0, opacity: 0 }}
                    aria-label="New"
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
