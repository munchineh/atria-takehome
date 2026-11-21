import { MadeFromIcon } from '../components/Icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Dropdown, Empty, Grid, Modal, Popconfirm, Select, Tag, Tooltip } from 'antd';
import {
  BarChartOutlined,
  CopyPlusOutlined,
  DownOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  ExclamationCircleOutlined,
  FontSizeOutlined,
  LockOutlined,
  SendOutlined,
  StarFilled,
  StarOutlined,
  SwapOutlined,
} from '../components/AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, CREATIVES, platformOf, plural, recommendationsFor, type Creative as CreativeT } from '../data/mock';
import { findCreative, useStore, type Job } from '../data/store';
import { useWorkspace } from '../data/nav';
import { ANGLE_REASON, ANGLE_TIP, ratioFor, type Variation, type Version } from '../data/variations';
import { PredictedTag } from './Editor';
import { AdArt, Creative } from '../components/Thumb';
import { CreateDialog } from '../components/CreateDialog';
import { Rolling } from '../components/Rolling';
import { HistoryButton } from '../components/LineageDrawer';
import { PageHeader } from '../components/PageHeader';
import { SectionHead } from '../components/SectionHead';
import { duration, ease, fadeUp, pageTransition, spring, stagger } from '../motion/tokens';

type CardState = 'ready' | 'generating' | 'failed';

function cardState(j: Job, i: number): CardState {
  if (j.failed.includes(i)) return 'failed';
  if (j.state === 'ready') return 'ready';
  if (j.state === 'failed') return 'failed';
  return i < Math.floor(j.progress * j.count) ? 'ready' : 'generating';
}

/** Press and hold an image on phones to see the original in its place; let go to come back. */
function HoldCompare({
  variation,
  original,
  onTap,
  showHint,
}: {
  variation: React.ReactNode;
  original: React.ReactNode;
  onTap: () => void;
  showHint: boolean;
}) {
  const [held, setHeld] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const longPress = useRef(false);
  const stop = () => {
    window.clearTimeout(timer.current);
    start.current = null;
    setHeld(false);
  };
  return (
    <div
      className={`hold-compare ${held ? 'held' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Open in the editor. Press and hold to see the original."
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        longPress.current = false;
        timer.current = window.setTimeout(() => {
          longPress.current = true;
          setHeld(true);
        }, 220);
      }}
      onPointerMove={(e) => {
        if (start.current && !longPress.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) stop();
      }}
      onPointerUp={() => {
        const tap = start.current && !longPress.current;
        stop();
        if (tap) onTap();
      }}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => e.key === 'Enter' && onTap()}
    >
      <div className="hc-layer">{variation}</div>
      <AnimatePresence>
        {held && (
          <motion.div
            key="orig"
            className="hc-layer hc-orig"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}
            exit={{ opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
          >
            {original}
            <span className="compare-label">Original</span>
          </motion.div>
        )}
      </AnimatePresence>
      {showHint && !held && <span className="hc-hint">Hold to see the original</span>}
    </div>
  );
}

/** On phones each suggestion's "why" sits behind one toggle, so the cards come first. */
function GroupWhy({ why, mobile }: { why: string; mobile: boolean }) {
  const [open, setOpen] = useState(false);
  if (!mobile) return null;
  return (
    <>
      <button type="button" className={`why-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        Why this might work <DownOutlined />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            className="t-help var-group-why"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: duration.base, ease: ease.standard } }}
            exit={{ height: 0, opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
          >
            {why}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}

function VariationCard({
  v,
  state,
  original,
  picked,
  mobile,
  onPick,
  onRefine,
  onFixText,
  onMore,
  onRetry,
  moreCost,
  index,
  versions,
}: {
  v: Variation;
  versions: Version[];
  onFixText: () => void;
  state: CardState;
  original: CreativeT;
  picked: boolean;
  mobile: boolean;
  onPick: () => void;
  onRefine: () => void;
  onMore: () => void;
  onRetry: () => void;
  moreCost: string;
  index: number;
}) {
  const cur = [...versions].reverse().find((x) => x.state === 'ready') ?? versions[0];
  const typo = cur.n === 1 ? v.typo : undefined;
  const applying = versions.at(-1)?.state === 'applying';
  return (
    <motion.article
      className={`var-card ${picked ? 'picked' : ''} ${state}`}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { duration: duration.fast, ease: ease.standard, delay: Math.min(index, stagger.maxItems) * stagger.cards },
      }}
      exit={{ opacity: 0, transition: { duration: duration.instant } }}
    >
      <div className="var-media">
        <AnimatePresence mode="popLayout" initial={false}>
          {state === 'ready' ? (
            <motion.div key="img" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: duration.base, ease: ease.standard } }}>
              {mobile ? (
                <HoldCompare
                  showHint={index === 0}
                  onTap={onRefine}
                  variation={<AdArt slot={cur.img} copy={cur.copy} typo={typo} ratio={ratioFor(cur.img)} alt={`${v.angle} variation`} />}
                  original={<AdArt slot={original.img} copy={original.copy} ratio="2 / 3" alt="Original" />}
                />
              ) : (
                <button type="button" className="art-btn" onClick={onRefine} aria-label={`Open ${v.angle} in the editor`}>
                  <AdArt slot={cur.img} copy={cur.copy} typo={typo} ratio={ratioFor(cur.img)} alt={`${v.angle} variation`} />
                </button>
              )}
              {versions.length > 1 && <span className="ver-badge">{applying ? 'Applying' : `v${cur.n}`}</span>}
            </motion.div>
          ) : state === 'generating' ? (
            <motion.div key="gen" className="var-skeleton" exit={{ opacity: 0, transition: { duration: duration.fast } }}>
              <span>Generating</span>
            </motion.div>
          ) : (
            <motion.div key="fail" className="var-failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ExclamationCircleOutlined />
              <span>This one failed. 4 credits returned.</span>
              <Button onClick={onRetry}>Retry</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="var-meta">
        <div className="var-head-row">
          <Tooltip title={ANGLE_TIP}>
            <strong className="var-angle">{v.angle}</strong>
          </Tooltip>
          {state === 'ready' && (
            <span className="var-pred">
              <span className="t-help">Predicted CTR</span>
              <PredictedTag id={v.id} bare />
            </span>
          )}
        </div>

        {state === 'ready' && (v.from || v.launched || typo) && (
          <div className="var-flags">
            {v.launched && (
              <Tooltip title="In an ad, so it can't be edited. Open it to iterate.">
                <Tag color="blue" icon={<LockOutlined />}>
                  In an ad
                </Tag>
              </Tooltip>
            )}
            {typo && (
              <Tooltip title={`The headline may contain a typo: ${v.typo}.`}>
                <Tag color="error" icon={<ExclamationCircleOutlined />}>
                  Check text
                </Tag>
              </Tooltip>
            )}
            {v.from && (
              <Tag icon={<MadeFromIcon />} className="from-tag">
                {v.from.how === 'stylized' ? 'Stylized text from' : 'New variation from'} v{v.from.v}
              </Tag>
            )}
          </div>
        )}

        {ANGLE_REASON[v.angle] && <p className="var-reason">{ANGLE_REASON[v.angle]}</p>}
      </div>

      {state === 'ready' && (
        <div className={`var-actions ${mobile ? 'phone' : ''}`}>
          {typo ? (
            <Button size={mobile ? 'large' : 'middle'} className="var-main" icon={<FontSizeOutlined />} onClick={onFixText}>
              Edit text
            </Button>
          ) : (
            <Button size={mobile ? 'large' : 'middle'} className="var-main" icon={<EditOutlined />} onClick={onRefine}>
              Refine
            </Button>
          )}
          <Tooltip title={picked ? 'Saved to the gallery. Click to remove it.' : 'Save to the gallery.'}>
            <Button
              size={mobile ? 'large' : 'middle'}
              className={`var-icon pick-btn ${picked ? 'on' : ''}`}
              icon={picked ? <StarFilled /> : <StarOutlined />}
              onClick={onPick}
              aria-pressed={picked}
              aria-label={picked ? 'Remove from gallery' : 'Save to gallery'}
            />
          </Tooltip>
          <Popconfirm title="Create 4 new variations close to this one?" description={moreCost} okText="Create 4" cancelText="Cancel" onConfirm={onMore}>
            <Tooltip title="More like this: create 4 new variations close to this one.">
              <Button size={mobile ? 'large' : 'middle'} className="var-icon" icon={<CopyPlusOutlined />} aria-label="More like this" />
            </Tooltip>
          </Popconfirm>
        </div>
      )}
    </motion.article>
  );
}

/**
 * Variations page (S-01 to S-92):
 * Focal point: the variation cards grouped by suggestion.
 * Single primary action: Test in Meta (in the floating shortlist bar once options are starred).
 */
export function Results() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const ws = useWorkspace();
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const { message } = App.useApp();
  const c = findCreative(id) ?? CREATIVES[0];
  const { jobsFor, startJob, retryJob, markSeen, credits, lastSettings, versionsOf, launch, saved, setSaved } = useStore();
  const rounds = jobsFor(c.id);
  const job = rounds.find((j) => j.id === params.get('round')) ?? rounds.at(-1);
  const recs = useMemo(() => {
    const all = recommendationsFor(c);
    return job
      ? job.recIds.map((rid) => all.find((r) => r.id === rid) ?? recommendationsFor(findCreative('mm-1090245')!).find((r) => r.id === rid)!).filter(Boolean)
      : [];
  }, [c, job]);
  const recFilter = params.get('rec') ?? 'all';
  const roundIds = job ? job.variations.map((v) => v.id) : [];
  const shortlist = roundIds.filter((vid) => saved.includes(vid));
  const setShortlist = (f: string[] | ((p: string[]) => string[])) => setSaved(roundIds, typeof f === 'function' ? f(shortlist) : f);
  const [compare, setCompare] = useState(false);
  const [testing, setTesting] = useState(false);
  const [nudgeOff, setNudgeOff] = useState(false);
  const [sameRecOff, setSameRecOff] = useState(false);
  const [nextAngle, setNextAngle] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const platform = c.ads[0] ? platformOf(c.ads[0]) : 'Meta';

  useEffect(() => {
    if (job?.unseen && job.state === 'ready') markSeen(job.id);
  }, [job, markSeen]);

  if (!job) {
    return (
      <div className="page">
        <Empty description={<strong>No variations for this ad yet</strong>}>
          <Button type="primary" onClick={() => nav(`/ad/${c.id}`)}>
            Open the ad
          </Button>
        </Empty>
      </div>
    );
  }

  const settings = lastSettings[c.id] ?? { perRec: job.perRec, size: job.size };
  const moreCount = recs.length * settings.perRec;
  const perRecCost = settings.perRec * ACCOUNT.creditsPerImage;
  const visible = job.variations.map((v, i) => ({ v, i })).filter(({ v }) => !v.deleted && (recFilter === 'all' || v.recId === recFilter));
  const openEditor = (v: Variation, text = false) => nav(ws.editorPath(c.id, v.id, job.id, text));
  const audience = c.ads[0]?.adSet ?? 'Variation_Test';
  const allAngles = [...new Set(rounds.flatMap((r) => r.variations.map((v) => v.angle)))];
  const allVars = rounds.flatMap((r) => r.variations).slice(-12);
  const counts = allVars.reduce<Record<string, number>>((a, v) => ({ ...a, [v.angle]: (a[v.angle] ?? 0) + 1 }), {});
  const [topAngle, topN] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  const unused = ['Before and after', 'Social proof', 'Lifestyle', 'Gift'].find((a) => !allAngles.includes(a)) ?? 'Social proof';
  const picks = job.variations.filter((v) => shortlist.includes(v.id));
  const sameRec = picks.length >= 2 && picks.every((p) => p.recId === picks[0].recId) && recs.length > 1;
  const otherRec = recs.find((r) => r.id !== picks[0]?.recId);

  const go = (extra: Record<string, string>) =>
    setParams({ round: job.id, ...(recFilter !== 'all' ? { rec: recFilter } : {}), ...extra }, { replace: true });
  const createMore = (recIds: string[], perRec = settings.perRec, size = settings.size) => {
    const j = startJob({ creativeId: c.id, recIds, perRec, size });
    message.success({ content: `Generating ${plural(j.count, 'variation')}`, duration: 3 });
    setParams({ round: j.id }, { replace: false });
  };

  // S-31 & S-46: plain-link breadcrumb, without Creation tags or repeating the ad name / round date.
  const crumbs =
    c.project || ws.inCreation
      ? [{ title: <Link to="/creation">Creative gallery</Link> }]
      : [
          { title: <Link to="/">Radar</Link> },
          { title: <Link to={ws.radarPath(c.id)}>{c.name}</Link> },
        ];

  return (
    <motion.div {...pageTransition} className="page results">
      <PageHeader
        crumbs={crumbs}
        title={`Variations of ${c.name}`}
        desc={`Star the options worth keeping. They're saved to the gallery, and you can test them in ${platform}.`}
        actions={
          !c.project ? (
            <>
              <HistoryButton creative={c} />
              <Button icon={<BarChartOutlined />} onClick={() => nav(ws.radarPath(c.id))}>
                {ws.inCreation ? 'View in Radar' : 'Open the ad'}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* S-33: Controls row with round switcher (when > 1 round) and concise round summary without repeating dates. */}
      <div className="res-controls">
        {rounds.length > 1 && (
          <Select
            value={job.id}
            onChange={(val) => setParams({ round: val })}
            aria-label="Round"
            popupMatchSelectWidth={false}
            options={rounds
              .slice()
              .reverse()
              .map((r, i) => ({ value: r.id, label: `Round ${rounds.length - i}\u00a0· ${r.date}\u00a0· ${r.count}` }))}
          />
        )}
        <span className="t-help res-summary">
          {plural(job.count, 'variation')} from {plural(job.recIds.length, 'suggestion')}
          {rounds.length === 1 ? `\u00a0· ${job.date}` : ''}
          {job.label ? `\u00a0· ${job.label}` : ''}
        </span>
      </div>

      <div className="results-grid">
        {!mobile && (
          <aside className="original-panel panel">
            <span className="orig-title">{c.project ? 'Starting point' : 'Original'}</span>
            <Creative c={c} />
            {c.project && (
              <span className="t-help">{c.project === 'clone' ? 'Cloned ad' : 'Made from a brief'}{'\u00a0'}· not on Radar</span>
            )}
          </aside>
        )}

        <section className="results-main">
          <AnimatePresence initial={false}>
            {!nudgeOff && topN >= 3 && (
              <motion.div key="nudge" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="nudge">
                <Alert
                  type="info"
                  showIcon
                  title={nextAngle ? `Next round will include ${nextAngle}.` : `${topN} of your last ${allVars.length} variations use ${topAngle}.`}
                  action={
                    <span className="res-alert-actions">
                      {!nextAngle && (
                        <Button
                          onClick={() => {
                            setNextAngle(unused);
                            message.info(`Next round will try ${unused}`);
                          }}
                        >
                          Try {unused}
                        </Button>
                      )}
                      <Button type="text" onClick={() => setNudgeOff(true)}>
                        Dismiss
                      </Button>
                    </span>
                  }
                />
              </motion.div>
            )}
            {sameRec && otherRec && !sameRecOff && (
              <motion.div key="pick-hint" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="nudge">
                <Alert
                  type="info"
                  showIcon
                  title={`All ${picks.length} shortlisted variations fix the same issue. Add one that targets ${otherRec.target} to compare both fixes.`}
                  action={
                    <span className="res-alert-actions">
                      <Button onClick={() => go({ rec: otherRec.id })}>Show {otherRec.target}</Button>
                      <Button type="text" onClick={() => setSameRecOff(true)}>
                        Dismiss
                      </Button>
                    </span>
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>

          {recFilter !== 'all' && (
            <Button type="link" className="inline-link show-all-recs" onClick={() => setParams({ round: job.id }, { replace: true })}>
              Show all {job.recIds.length} suggestions
            </Button>
          )}

          {recs
            .filter((r) => recFilter === 'all' || r.id === recFilter)
            .map((r) => {
              const items = visible.filter(({ v }) => v.recId === r.id);
              const meta = `Improves ${r.target === 'Hook' ? 'hook' : r.target}\u00a0· ${plural(items.length, 'variation')}`;
              return (
                <section key={r.id} className="var-group">
                  <div className="var-group-head">
                    <SectionHead title={r.fix} help={!mobile ? r.why : undefined} meta={meta} />
                    {r.why && <GroupWhy why={r.why} mobile={mobile} />}
                  </div>

                  {items.length === 0 ? (
                    <p className="t-help">No variations for this suggestion yet.</p>
                  ) : (
                    <div className={`var-grid ${mobile ? 'var-rail' : ''}`}>
                      <AnimatePresence mode="popLayout">
                        {items.map(({ v, i }, k) => (
                          <VariationCard
                            key={v.id}
                            index={k}
                            v={v}
                            state={cardState(job, i)}
                            original={c}
                            mobile={mobile}
                            picked={shortlist.includes(v.id)}
                            onPick={() => setShortlist((p) => (p.includes(v.id) ? p.filter((x) => x !== v.id) : [...p, v.id]))}
                            onRefine={() => openEditor(v)}
                            onFixText={() => openEditor(v, true)}
                            versions={versionsOf(v)}
                            onMore={() => {
                              const j = startJob({ creativeId: c.id, recIds: [v.recId], perRec: 4, size: job.size, like: v });
                              message.success({ content: `Generating 4 variations like ${v.angle}`, duration: 3 });
                              setParams({ round: j.id });
                            }}
                            moreCost={`Uses ${4 * ACCOUNT.creditsPerImage} of ${credits.toLocaleString('en-US')}\u00a0credits`}
                            onRetry={() => retryJob(job.id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  <div className="var-group-more">
                    <Popconfirm
                      title={`Create ${settings.perRec} more for this suggestion?`}
                      description={`Uses ${perRecCost} of ${credits.toLocaleString('en-US')}\u00a0credits`}
                      okText={`Create ${settings.perRec}`}
                      onConfirm={() => createMore([r.id])}
                    >
                      <Button size={mobile ? 'large' : 'middle'}>Create {settings.perRec} more</Button>
                    </Popconfirm>
                  </div>
                </section>
              );
            })}

          <div className="results-end">
            <span className="t-help">Need more variations?</span>
            <Popconfirm
              title={`Create ${moreCount} more with the same settings?`}
              description={`Uses ${moreCount * ACCOUNT.creditsPerImage} of ${credits.toLocaleString('en-US')}\u00a0credits`}
              okText={`Create ${moreCount}`}
              onConfirm={() => createMore(job.recIds)}
            >
              <Button>Create {moreCount} more</Button>
            </Popconfirm>
            <Button type="link" onClick={() => setEdit(true)}>
              Edit settings
            </Button>
          </div>
        </section>
      </div>
      <div className="sticky-spacer" />

      <AnimatePresence>
        {shortlist.length > 0 && (
          <motion.div
            className="sticky-bar"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: spring.gentle }}
            exit={{ y: 24, opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
          >
            <div className="sticky-summary">
              <strong>
                <Rolling value={shortlist.length} /> shortlisted
              </strong>
            </div>
            {mobile ? (
              <div className="res-bar-actions">
                <Button type="primary" icon={<SendOutlined />} onClick={() => setTesting(true)}>
                  Test in {platform}
                </Button>
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'compare', icon: <SwapOutlined />, label: 'Compare with original', onClick: () => setCompare(true) },
                      {
                        key: 'download',
                        icon: <DownloadOutlined />,
                        label: `Download ${shortlist.length}`,
                        onClick: () => message.success(`Downloaded ${plural(shortlist.length, 'variation')}`),
                      },
                      { type: 'divider' },
                      { key: 'clear', label: 'Clear shortlist', onClick: () => setShortlist([]) },
                    ],
                  }}
                >
                  <Tooltip title="More shortlist actions.">
                    <Button icon={<EllipsisOutlined />} aria-label="More shortlist actions" />
                  </Tooltip>
                </Dropdown>
              </div>
            ) : (
              <div className="res-bar-actions">
                <Button icon={<SwapOutlined />} onClick={() => setCompare(true)}>
                  Compare with original
                </Button>
                <Button icon={<DownloadOutlined />} onClick={() => message.success(`Downloaded ${plural(shortlist.length, 'variation')}`)}>
                  Download {shortlist.length}
                </Button>
                <Button type="primary" icon={<SendOutlined />} onClick={() => setTesting(true)}>
                  Test in {platform}
                </Button>
                <Button type="text" className="on-dark" onClick={() => setShortlist([])}>
                  Clear
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={compare}
        onCancel={() => setCompare(false)}
        footer={null}
        title="Compare with original"
        width={Math.min(1100, 300 + picks.length * 260)}
        className="compare-modal"
      >
        <div className="compare-grid">
          <figure>
            <AdArt slot={c.img} copy={c.copy} ratio="2 / 3" alt="Original" />
            <figcaption>
              <strong>Original</strong>
              <span className="t-help">
                CTR {c.grades.ctr}{'\u00a0'}· {ACCOUNT.conversionMetric} {c.grades.conversion}
              </span>
            </figcaption>
          </figure>
          {picks.map((v) => {
            const cur = versionsOf(v).filter((x) => x.state === 'ready').at(-1)!;
            return (
              <figure key={v.id}>
                <AdArt slot={cur.img} copy={cur.copy} typo={cur.n === 1 ? v.typo : undefined} ratio="2 / 3" alt={v.angle} />
                <figcaption>
                  <strong>{v.angle}</strong>
                  <span className="t-help">Improves {recs.find((r) => r.id === v.recId)?.target ?? 'CTR'}</span>
                  <PredictedTag id={v.id} />
                </figcaption>
              </figure>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={testing}
        title={`Test ${plural(picks.length, 'variation')} in ${platform}`}
        okText={`Add ${picks.length} paused ${picks.length === 1 ? 'ad' : 'ads'}`}
        cancelText="Cancel"
        onCancel={() => setTesting(false)}
        onOk={() => {
          launch(
            job.id,
            picks.map((p) => p.id),
            audience,
          );
          setTesting(false);
          message.success({
            content: (
              <span>
                {plural(picks.length, 'paused ad')} added to {audience}
                {'\u00a0'}·{' '}
                <a onClick={() => message.info("In the live product, this opens the ads in Meta Ads Manager. It's not part of this prototype.")}>
                  Open in {platform}
                </a>
              </span>
            ),
            duration: 5,
          });
        }}
        width={480}
      >
        <p>
          Atria adds them to {audience} as paused ads. Nothing spends until you turn them on in {platform}.
        </p>
        <div className="test-thumbs">
          {picks.map((p) => {
            const cur = versionsOf(p).filter((x) => x.state === 'ready').at(-1)!;
            return <AdArt key={p.id} slot={cur.img} copy={cur.copy} ratio={ratioFor(cur.img)} alt={p.angle} />;
          })}
        </div>
        <p className="t-help">Their results come back to Radar as ads tagged "Variation of {c.name}".</p>
      </Modal>

      <CreateDialog
        open={edit}
        mobile={mobile}
        creative={c}
        recCount={recFilter === 'all' ? recs.length : 1}
        onClose={() => setEdit(false)}
        onCreate={({ perRec, size }) => {
          setEdit(false);
          createMore(recFilter === 'all' ? job.recIds : [recFilter], perRec, size);
        }}
      />
    </motion.div>
  );
}
