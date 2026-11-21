import { useEffect, useRef, useState } from 'react';
import { Button, Empty, Progress } from 'antd';
import { CloseOutlined, RightOutlined } from './AppIcons';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useWorkspace } from '../data/nav';
import { useNavigate } from 'react-router-dom';
import { plural } from '../data/mock';
import { accountOf, findCreative, recName, timeAgo, useStore, type Job } from '../data/store';
import { Thumb } from './Thumb';
import { duration, ease, listDelay, spring } from '../motion/tokens';

const WEEK = 7 * 1440;

/** TR-02: named by intent. */
export function jobTitle(j: Job) {
  if (j.label) return j.label;
  const first = recName(j.creativeId, j.recIds[0]);
  return j.recIds.length > 1 ? `${first} + ${j.recIds.length - 1} more` : first;
}

/** TR-05 time left, spelled out (R-M10, R-T14). */
export const timeLeft = (p: number) => {
  const s = (1 - p) * 120;
  return s < 50 ? 'less than a minute left' : `about ${plural(Math.ceil(s / 60), 'minute')} left`;
};

function TaskRow({ j, i, onOpen, onDetails }: { j: Job; i: number; onOpen: (j: Job) => void; onDetails: (j: Job) => void }) {
  const { retryJob, accountId } = useStore();
  const c = findCreative(j.creativeId)!;
  const failedN = j.failed.length;
  const acct = accountOf(c);
  const other = acct.id !== accountId ? acct.name : '';
  const ago = timeAgo(j.minutesAgo);
  // K1 (R-T9), K45 (R-L2, R-L10): "Generating" for status; concise line with credits on meta line when partial fail.
  // 258 (Mancini 17:36): generations create creatives, so rows count creatives.
  const status =
    j.state === 'queued'
      ? `Waiting\u00a0· ${plural(j.count, 'creative')}`
      : j.state === 'generating'
        ? `Creating ${j.count}\u00a0· ${timeLeft(j.progress)}`
        : j.state === 'ready'
          ? failedN
            ? `${j.count - failedN} of ${j.count} ready\u00a0· ${failedN} failed to create`
            : `${plural(j.count, 'creative')} ready\u00a0· ${ago}`
          : `Failed to create\u00a0· ${j.cost}\u00a0credits returned`;
  const creditNote = j.state === 'ready' && failedN ? `${failedN * 4}\u00a0credits returned\u00a0· ${ago}` : null;
  const openable = j.state === 'ready';
  return (
    <motion.li
      className={`task-row ${j.state} ${j.unseen ? 'unseen' : ''} ${openable ? 'openable' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(i) } }}
      onClick={openable ? () => onOpen(j) : undefined}
      role={openable ? 'link' : undefined}
      tabIndex={openable ? 0 : undefined}
      onKeyDown={openable ? (e) => e.key === 'Enter' && onOpen(j) : undefined}
    >
      <Thumb c={c} size={48} />
      <div className="task-body">
        {other && <div className="task-acct">{other}</div>}
        <div className="task-title">
          <span className="task-name">{c.name}</span>
          {j.unseen && <i className="unseen-dot" aria-label="New" />}
        </div>
        <div className={`task-line ${j.state === 'failed' ? 'bad' : ''}`}>
          <span className="task-line-text">{status}</span>
          {(j.state === 'failed' || (j.state === 'ready' && failedN > 0)) && (
            <Button type="link" size="small" className="inline-link" onClick={(e) => { e.stopPropagation(); retryJob(j.id); }}>
              Try generating again
            </Button>
          )}
          {/* 276 (Mancini 19:12): View details goes back to the ad the round came from, where the failure shows again. */}
          {(j.state === 'failed' || (j.state === 'ready' && failedN > 0)) && (
            <Button type="link" size="small" className="inline-link task-details" onClick={(e) => { e.stopPropagation(); onDetails(j); }}>
              View details
            </Button>
          )}
        </div>
        {creditNote && <div className="task-line-meta">{creditNote}</div>}
        {j.state === 'generating' && <Progress percent={Math.round(j.progress * 100)} size="small" showInfo={false} strokeColor="#f66c30" className="task-progress" />}
      </div>
      {openable && <RightOutlined className="task-chev" />}
    </motion.li>
  );
}

function PanelBody({ onClose }: { onClose: () => void }) {
  const { jobs, markSeen, accountId, setAccount } = useStore();
  const nav = useNavigate();
  const ws = useWorkspace();
  const [tab, setTab] = useState<'tasks' | 'notes'>('tasks');
  const recent = jobs.filter((j) => j.minutesAgo < WEEK).sort((a, b) => a.minutesAgo - b.minutesAgo);
  const notes = recent.filter((j) => j.state === 'ready' || j.state === 'failed');
  const open = (j: Job) => {
    markSeen(j.id);
    // Tasks keep you where you are: Creation stays in Creation, Analytics in Analytics.
    nav(ws.roundPath(j.creativeId, j.id));
    onClose();
  };
  const details = (j: Job) => {
    markSeen(j.id);
    const c = findCreative(j.creativeId);
    if (c && c.accountId !== accountId) setAccount(c.accountId);
    nav(`/ad/${j.creativeId}?failed=${j.id}`);
    onClose();
  };

  return (
    <>
      <div className="tasks-head">
        <div>
          <b className="tasks-title">Notifications</b>
          <p className="tasks-desc t-help">Creatives you're creating, and the ones ready to look at.</p>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} aria-label="Close" />
      </div>
      <div className="tasks-scroll">
        {tab === 'tasks' || true ? (
          recent.length ? (
            <ul className="task-list">
              {recent.map((j, i) => (
                <TaskRow key={j.id} j={j} i={i} onOpen={open} onDetails={details} />
              ))}
            </ul>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><b>Nothing in the last 7 days</b><br />Creatives you create appear here while they generate.</>} />
          )
        ) : notes.length ? (
          <ul className="note-list">
            {notes.map((j) => {
              const c = findCreative(j.creativeId)!;
              return (
                <li key={j.id}>
                  <button className="note-row" onClick={() => (j.state === 'ready' ? open(j) : setTab('tasks'))}>
                    {j.unseen && <i className="unseen-dot" aria-label="New" />}
                    <span>
                      {j.state === 'ready' ? (
                        <>
                          {plural(j.count - j.failed.length, 'variation')} ready for <b>{c.name}</b>
                        </>
                      ) : (
                        <>
                          Failed to create variations for <b>{c.name}</b>. {j.cost} credits returned.
                        </>
                      )}
                      <span className="muted small block">{timeAgo(j.minutesAgo)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications" />
        )}
      </div>
      <div className="tasks-foot small muted">
        {/* K52 (R-L9): link + closing punctuation kept cleanly together. */}
        Last 7{'\u00a0'}days. See everything in{' '}
        <span className="nw">
          <Button
            type="link"
            size="small"
            className="inline-link"
            onClick={() => {
              nav('/creation');
              onClose();
            }}
          >
            Creative Gallery
          </Button>
          .
        </span>
      </div>
    </>
  );
}

/**
 * G10. Desktop: a panel under the bell. Mobile: a bottom sheet with drag to dismiss
 * (monitoring happens on the phone, so this is the priority layout).
 */
export function TasksPanel({ mobile }: { mobile: boolean }) {
  const { tasksOpen, setTasksOpen } = useStore();
  const close = () => setTasksOpen(false);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useDragControls();

  useEffect(() => {
    if (!tasksOpen) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const down = (e: MouseEvent) => {
      if (mobile) return;
      const t = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(t) && !t.closest('.bell-btn')) close();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('mousedown', down);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('mousedown', down);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksOpen, mobile]);

  return (
    <AnimatePresence>
      {tasksOpen &&
        (mobile ? (
          <motion.div key="sheet" className="sheet-root">
            <motion.div
              className="sheet-backdrop"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: duration.base } }}
              exit={{ opacity: 0, transition: { duration: duration.fast } }}
            />
            <motion.div
              ref={ref}
              role="dialog"
              aria-label="Notifications"
              className="tasks-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0, transition: spring.gentle }}
              exit={{ y: '100%', transition: { duration: duration.base, ease: ease.exit } }}
              drag="y"
              dragControls={drag}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => (info.offset.y > 90 || info.velocity.y > 500) && close()}
            >
              <div className="sheet-grip" onPointerDown={(e) => drag.start(e)} aria-hidden>
                <i />
              </div>
              <PanelBody onClose={close} />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="panel"
            ref={ref}
            role="dialog"
            aria-label="Notifications"
            className="tasks-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}
            exit={{ opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
          >
            <PanelBody onClose={close} />
          </motion.div>
        ))}
    </AnimatePresence>
  );
}
