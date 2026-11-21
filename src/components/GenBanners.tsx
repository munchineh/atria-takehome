import { Button, Progress } from 'antd';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { CloseOutlined, ExclamationCircleFilled } from './AppIcons';
import { plural } from '../data/mock';
import { findCreative, useStore, type Job } from '../data/store';
import { useWorkspace } from '../data/nav';
import { Thumb } from './Thumb';
import { duration, ease, spring } from '../motion/tokens';
import { timeLeft } from './TasksPanel';

/**
 * 258 (Mancini 17:36): rounds you start show as floating banners at the top right, like macOS notifications.
 * Each one stays until you dismiss it: progress while it runs, then ready or failed with one action.
 * Only rounds started in the prototype get a banner, so a refresh never replays old ones.
 */
export function GenBanners() {
  const { jobs, dismissedBanners, dismissBanner, retryJob, markSeen, tasksOpen } = useStore();
  const nav = useNavigate();
  const ws = useWorkspace();
  // Hidden while Notifications is open, which shows the same rounds.
  const list = tasksOpen ? [] : jobs.filter((j) => j.id.startsWith('job-new-') && !dismissedBanners.includes(j.id)).slice(-3).reverse();
  return (
    <div className="gen-banners" aria-live="polite">
      <AnimatePresence initial={false}>
        {list.map((j) => (
          <motion.div
            key={j.id}
            layout
            className={`gen-banner ${j.state}`}
            role="status"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0, transition: spring.gentle }}
            exit={{ opacity: 0, x: 24, transition: { duration: duration.fast, ease: ease.exit } }}
          >
            <Banner
              j={j}
              onView={() => {
                markSeen(j.id);
                dismissBanner(j.id);
                nav(ws.roundPath(j.creativeId, j.id));
              }}
              onRetry={() => retryJob(j.id)}
            />
            <Button type="text" size="small" className="gen-banner-x" icon={<CloseOutlined />} aria-label="Dismiss" onClick={() => dismissBanner(j.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Banner({ j, onView, onRetry }: { j: Job; onView: () => void; onRetry: () => void }) {
  const c = findCreative(j.creativeId);
  const ok = j.count - j.failed.length;
  const running = j.state === 'generating' || j.state === 'queued';
  return (
    <>
      {c && <Thumb c={c} size={40} />}
      {/* 300 (Mancini 19:48): a ready banner opens its round when tapped anywhere, not only on View creatives. */}
      <div
        className={`gen-banner-body ${j.state === 'ready' ? 'is-openable' : ''}`}
        onClick={j.state === 'ready' ? onView : undefined}
        role={j.state === 'ready' ? 'link' : undefined}
      >
        <b className="gen-banner-title">
          {j.state === 'queued'
            ? `Waiting to create ${plural(j.count, 'creative')}`
            : j.state === 'generating'
              ? `Creating ${plural(j.count, 'creative')}`
              : j.state === 'failed'
                ? 'Failed to create'
                : j.failed.length
                  ? `${ok} of ${j.count} creatives ready`
                  : `${plural(j.count, 'creative')} ready`}
        </b>
        <span className="gen-banner-sub">{c?.name}</span>
        {running && (
          <>
            <Progress percent={Math.round(j.progress * 100)} size="small" showInfo={false} strokeColor="var(--c-primary)" className="gen-banner-bar" />
            <span className="gen-banner-meta">{j.state === 'queued' ? 'Starts when the round before it finishes' : timeLeft(j.progress).replace(/^./, (x) => x.toUpperCase())}</span>
          </>
        )}
        {j.state === 'failed' && (
          <span className="gen-banner-meta">
            <ExclamationCircleFilled className="gen-banner-warn" aria-hidden /> {j.cost}{' '}credits returned
          </span>
        )}
        {j.state === 'ready' && j.failed.length > 0 && (
          <span className="gen-banner-meta">
            <ExclamationCircleFilled className="gen-banner-warn" aria-hidden /> {j.failed.length} failed{' '}· {j.failed.length * 4}{' '}credits returned
          </span>
        )}
        {!running && (
          <div className="gen-banner-actions">
            {j.state === 'failed' ? (
              <Button size="small" type="primary" onClick={onRetry}>
                Try generating again
              </Button>
            ) : (
              <>
                <Button
                  size="small"
                  type="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                >
                  View creatives
                </Button>
                {j.failed.length > 0 && (
                  <Button size="small" onClick={(e) => { e.stopPropagation(); onRetry(); }}>
                    Try generating again
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
