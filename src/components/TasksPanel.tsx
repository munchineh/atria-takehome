import { useEffect, useRef, useState } from 'react';
import { Button, Empty, Progress, Tag } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { short, plural } from '../data/mock';
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

/** TR-05 time left, on the ~2 minute scale the copy promises (A17). */
const timeLeft = (p: number) => {
  const s = (1 - p) * 120;
  return s < 50 ? 'less than a minute left' : `about ${Math.ceil(s / 60)} min left`;
};

function TaskRow({ j, i, onOpen }: { j: Job; i: number; onOpen: (j: Job) => void }) {
  const { retryJob } = useStore();
  const c = findCreative(j.creativeId)!;
  const failedN = j.failed.length;
  return (
    <motion.li
      className={`task-row ${j.state}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(i) } }}
    >
      <Thumb c={c} size={44} />
      <div className="task-body">
        {/* No truncation (Mancini, 19:00): the ad is the title, the fixes wrap underneath, the account moves to the foot. */}
        <div className="task-title">
          <span className="clamp-2">{c.name}</span>
          {j.unseen && <i className="unseen-dot" aria-label="New" />}
        </div>
        <div className="task-sub clamp-2">
          {j.label ?? j.recIds.map((r) => recName(j.creativeId, r)).join(' · ')}
        </div>
        <div className="task-status">
          {j.state === 'queued' && <span className="muted">Queued · {plural(j.count, 'variation')}</span>}
          {j.state === 'generating' && (
            <>
              <Progress percent={Math.round(j.progress * 100)} size="small" showInfo={false} strokeColor="#f5582a" className="task-progress" />
              <span className="muted">
                Generating · {Math.round(j.progress * 100)}% · {timeLeft(j.progress)}
              </span>
            </>
          )}
          {j.state === 'ready' &&
            (failedN ? (
              <span>
                {j.count - failedN} of {j.count} ready. {failedN} failed, {failedN * 4} credits returned.
              </span>
            ) : (
              <span>
                <Tag color="success" className="task-tag">
                  Ready
                </Tag>
                {plural(j.count, 'variation')}
              </span>
            ))}
          {j.state === 'failed' && (
            <span>
              <Tag color="error" className="task-tag">
                Failed
              </Tag>
              {j.cost} credits returned
            </span>
          )}
        </div>
        <div className="task-foot">
          <span className="muted small">
            <span className="nw">{timeAgo(j.minutesAgo)}</span> · <span className="nw">{j.cost} credits</span> ·{' '}
            <span className="nw">{accountOf(c).name}</span>
          </span>
          {j.state === 'ready' && (
            <Button size="small" type="primary" ghost onClick={() => onOpen(j)}>
              View variations
            </Button>
          )}
          {j.state === 'failed' && (
            <Button size="small" onClick={() => retryJob(j.id)}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function PanelBody({ onClose }: { onClose: () => void }) {
  const { jobs, markSeen } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState<'tasks' | 'notes'>('tasks');
  const recent = jobs.filter((j) => j.minutesAgo < WEEK).sort((a, b) => a.minutesAgo - b.minutesAgo);
  const notes = recent.filter((j) => j.state === 'ready' || j.state === 'failed');
  const open = (j: Job) => {
    markSeen(j.id);
    nav(`/ad/${j.creativeId}/variations?round=${j.id}`);
    onClose();
  };

  return (
    <>
      <div className="tasks-head">
        {/* One list (Mancini, 19:04): Notifications only repeated finished and failed tasks. */}
        <b className="tasks-title">Tasks</b>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} aria-label="Close" />
      </div>
      <div className="tasks-scroll">
        {tab === 'tasks' || true ? (
          recent.length ? (
            <ul className="task-list">
              {recent.map((j, i) => (
                <TaskRow key={j.id} j={j} i={i} onOpen={open} />
              ))}
            </ul>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><b>No tasks in the last 7 days</b><br />Variations you create appear here while they generate.</>} />
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
                          {plural(j.count - j.failed.length, 'variation')} ready for <b>{short(c.name, 22)}</b>
                        </>
                      ) : (
                        <>
                          Couldn't create variations for <b>{short(c.name, 22)}</b>. {j.cost} credits returned.
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
        Showing the last 7 days. Older work is in Image ads.{' '}
        <Button
          type="link"
          size="small"
          className="inline-link"
          onClick={() => {
            nav('/creation');
            onClose();
          }}
        >
          Open Image ads
        </Button>
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
              aria-label="Tasks"
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
            aria-label="Tasks"
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
