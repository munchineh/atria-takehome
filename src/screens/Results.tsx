import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, App, Breadcrumb, Button, Checkbox, Empty, Grid, Modal, Popconfirm, Segmented, Select, Tag, Tooltip } from 'antd';
import { BranchesOutlined, CopyOutlined, DownloadOutlined, EditOutlined, ExclamationCircleOutlined, SendOutlined, SwapOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, CREATIVES, WINDOW, plural, recommendationsFor, short, type Creative as CreativeT, type Recommendation } from '../data/mock';
import { findCreative, useStore, type Job } from '../data/store';
import { ANGLE_TIP, ratioFor, type Variation, type Version } from '../data/variations';
import { PredictedTag } from './Editor';
import { AdArt, Creative } from '../components/Thumb';
import { CreateDialog } from '../components/CreateDialog';
import { Rolling } from '../components/Rolling';
import { duration, ease, fadeUp, pageTransition, spring, stagger } from '../motion/tokens';

type CardState = 'ready' | 'generating' | 'failed';

function cardState(j: Job, i: number): CardState {
  if (j.failed.includes(i)) return 'failed';
  if (j.state === 'ready') return 'ready';
  if (j.state === 'failed') return 'failed';
  return i < Math.floor(j.progress * j.count) ? 'ready' : 'generating';
}

function VariationCard({
  v,
  state,
  rec,
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
  rec?: Recommendation;
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
  const [slide, setSlide] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  // Cards show the latest finished version (E6: count on the card).
  const cur = [...versions].reverse().find((x) => x.state === 'ready') ?? versions[0];
  const typo = cur.n === 1 ? v.typo : undefined;
  const applying = versions.at(-1)?.state === 'applying';
  return (
    <motion.article
      className={`var-card ${picked ? 'picked' : ''} ${state}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: Math.min(index, stagger.maxItems) * stagger.cards } }}
      exit={{ opacity: 0, transition: { duration: duration.instant } }}
    >
      <div className="var-media">
        <AnimatePresence mode="popLayout" initial={false}>
          {state === 'ready' ? (
            <motion.div key="img" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: duration.base, ease: ease.standard } }}>
              {mobile ? (
                // Mobile: swipe to compare with the original (section 4).
                <>
                  <div
                    className="compare-strip"
                    ref={strip}
                    onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                  >
                    <div className="compare-slide">
                      <AdArt slot={cur.img} copy={cur.copy} typo={typo} ratio={ratioFor(cur.img)} alt={`${v.angle} variation`} />
                    </div>
                    <div className="compare-slide">
                      <AdArt slot={original.img} copy={original.copy} ratio="2 / 3" alt="Original" />
                      <span className="compare-label">Original</span>
                    </div>
                  </div>
                  <div className="compare-dots" aria-hidden>
                    <i className={slide === 0 ? 'on' : ''} />
                    <i className={slide === 1 ? 'on' : ''} />
                  </div>
                </>
              ) : (
                <button className="art-btn" onClick={onRefine} aria-label={`Open ${v.angle} in the editor`}>
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
              <Button size="small" onClick={onRetry}>
                Retry
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="var-meta">
        {state === 'ready' && (
          <div className="var-flags">
            <PredictedTag id={v.id} />
            {v.from && (
              <Tag icon={<BranchesOutlined />} className="from-tag">
                {v.from.how === 'stylized' ? 'Stylized text from' : 'New variation from'} v{v.from.v}
              </Tag>
            )}
            {v.launched && <Tag>Paused in Meta</Tag>}
          </div>
        )}
        {state === 'ready' && typo && (
          <Tooltip title={`The headline may contain a typo: ${v.typo}`}>
            <Tag color="error" className="typo-tag" icon={<ExclamationCircleOutlined />}>
              Check text
            </Tag>
          </Tooltip>
        )}
        <div className="small">
          <Tooltip title={ANGLE_TIP}>
            <span className="muted dotted">Angle:</span>
          </Tooltip>{' '}
          <b>{v.angle}</b>
        </div>
        {rec && (
          <div className="small muted">
            Fixes: {rec.issue} ({rec.target})
          </div>
        )}
      </div>
      {state === 'ready' && (
        <div className="var-actions">
          {typo ? (
            <Button size="small" icon={<EditOutlined />} onClick={onFixText}>
              Fix text
            </Button>
          ) : (
            <Tooltip title="Change this image">
              <Button size="small" icon={<EditOutlined />} onClick={onRefine}>
                Refine
              </Button>
            </Tooltip>
          )}
          <Popconfirm title="Create 4 new variations close to this one?" description={moreCost} okText="Create 4" cancelText="Cancel" onConfirm={onMore}>
            <Tooltip title={`Create 4 new variations close to this one. ${moreCost}`}>
              <Button size="small" icon={<CopyOutlined />}>
                More like this
              </Button>
            </Tooltip>
          </Popconfirm>
          <Button size="small" className={`pick-btn ${picked ? 'on' : ''}`} onClick={onPick} aria-pressed={picked} aria-label="Add to shortlist">
            <Checkbox checked={picked} tabIndex={-1} /> {picked ? 'Shortlisted' : 'Shortlist'}
          </Button>
        </div>
      )}
    </motion.article>
  );
}

export function Results() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const { message } = App.useApp();
  const c = findCreative(id) ?? CREATIVES[0];
  const { jobsFor, startJob, retryJob, markSeen, credits, lastSettings, versionsOf, launch } = useStore();
  const rounds = jobsFor(c.id);
  const job = rounds.find((j) => j.id === params.get('round')) ?? rounds.at(-1);
  const recs = useMemo(() => {
    const all = recommendationsFor(c);
    // Recommendations a past round used may no longer be listed (e.g. "cta" on the hero after v2).
    return job ? job.recIds.map((rid) => all.find((r) => r.id === rid) ?? recommendationsFor(findCreative('mm-1090245')!).find((r) => r.id === rid)!).filter(Boolean) : [];
  }, [c, job]);
  const recFilter = params.get('rec') ?? 'all';
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  const [testing, setTesting] = useState(false);
  const [nudgeOff, setNudgeOff] = useState(false);
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    if (job?.unseen && job.state === 'ready') markSeen(job.id);
  }, [job, markSeen]);
  useEffect(() => {
    setShortlist([]);
  }, [job?.id]);

  if (!job)
    return (
      <div className="page">
        <Empty description={<b>No variations for this creative yet</b>}>
          <Button type="primary" onClick={() => nav(`/ad/${c.id}`)}>
            Open the creative
          </Button>
        </Empty>
      </div>
    );

  const settings = lastSettings[c.id] ?? { perRec: job.perRec, size: job.size };
  const moreCount = recs.length * settings.perRec;
  const perRecCost = settings.perRec * ACCOUNT.creditsPerImage;
  const visible = job.variations.map((v, i) => ({ v, i })).filter(({ v }) => !v.deleted && (recFilter === 'all' || v.recId === recFilter));
  const openEditor = (v: Variation, text = false) => nav(`/ad/${c.id}/variations/${v.id}?round=${job.id}${text ? '&text=1' : ''}`);
  const audience = c.ads[0]?.adSet ?? 'Variation_Test';
  const readyCount = job.variations.filter((_, i) => cardState(job, i) === 'ready').length;
  const allAngles = [...new Set(rounds.flatMap((r) => r.variations.map((v) => v.angle)))];
  const allVars = rounds.flatMap((r) => r.variations).slice(-12);
  const counts = allVars.reduce<Record<string, number>>((a, v) => ({ ...a, [v.angle]: (a[v.angle] ?? 0) + 1 }), {});
  const [topAngle, topN] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  const unused = ['Before and after', 'Social proof', 'Lifestyle', 'Gift'].find((a) => !allAngles.includes(a)) ?? 'Social proof';
  const picks = job.variations.filter((v) => shortlist.includes(v.id));
  const sameRec = picks.length >= 2 && picks.every((p) => p.recId === picks[0].recId) && recs.length > 1;
  const otherRec = recs.find((r) => r.id !== picks[0]?.recId);

  const go = (extra: Record<string, string>) => setParams({ round: job.id, ...(recFilter !== 'all' ? { rec: recFilter } : {}), ...extra }, { replace: true });
  const createMore = (recIds: string[], perRec = settings.perRec, size = settings.size) => {
    const j = startJob({ creativeId: c.id, recIds, perRec, size });
    message.success({ content: `Creating ${j.count} variations. This takes about 2 minutes. You can leave this page.`, duration: 3 });
    setParams({ round: j.id }, { replace: false });
  };

  return (
    <motion.div {...pageTransition} className="page results">
      <div className="detail-head">
        <Breadcrumb
          items={[
            { title: <Link to="/">Radar</Link> },
            { title: <Link to={`/ad/${c.id}`}>{short(c.name, mobile ? 12 : 22)}</Link> },
            { title: 'Variations' },
          ]}
        />
      </div>

      <div className="results-head">
        <div className="results-title">
          <h3>Variations of {short(c.name, mobile ? 18 : 30)}</h3>
          <p className="muted small">
            {plural(job.count, 'variation')} from {plural(job.recIds.length, 'recommendation')} · {job.date}
            {job.label ? ` · ${job.label}` : ''}
          </p>
        </div>
        <div className="results-actions">
          {rounds.length > 1 && (
            <Select
              size="middle"
              value={job.id}
              onChange={(v) => setParams({ round: v })}
              aria-label="Round"
              popupMatchSelectWidth={false}
              options={rounds
                .slice()
                .reverse()
                .map((r, i) => ({ value: r.id, label: `Round ${rounds.length - i} · ${r.date} · ${r.count}` }))}
            />
          )}
          <Popconfirm title={`Create ${moreCount} more with the same settings?`} description={`Uses ${moreCount * ACCOUNT.creditsPerImage} of ${credits.toLocaleString()} credits`} okText={`Create ${moreCount}`} onConfirm={() => createMore(job.recIds)}>
            <Button type="primary">Create {moreCount} more</Button>
          </Popconfirm>
          <Button type="link" onClick={() => setEdit(true)}>
            Edit settings
          </Button>
        </div>
      </div>

      <div className="results-grid">
        {!mobile && (
          <aside className="original-panel panel">
            <div className="t-label">Original</div>
            <Creative c={c} />
            <div className="small ad-name">{short(c.name, 34)}</div>
            <div className="muted small">Data from {WINDOW.synced}</div>
            <Button size="small" block onClick={() => nav(`/ad/${c.id}`)}>
              Open the creative
            </Button>
          </aside>
        )}

        <section className="results-main">
          <div className="results-filters">
            <Segmented
              value={recFilter}
              onChange={(v) => setParams(v === 'all' ? { round: job.id } : { round: job.id, rec: String(v) }, { replace: true })}
              options={[
                { value: 'all', label: <span className="seg-opt">All <span className="seg-n">{job.count}</span></span> },
                ...recs.map((r) => ({
                  value: r.id,
                  label: (
                    <span className="seg-opt">
                      <span className="ellipsis">{r.fix}</span>
                      <span className="seg-n">Targets {r.target} · {job.variations.filter((v) => v.recId === r.id).length}</span>
                    </span>
                  ),
                })),
              ]}
              className="rec-filter"
            />
            <div className="muted small angles">Angles used: {allAngles.join(', ')}</div>
          </div>

          <AnimatePresence initial={false}>
            {!nudgeOff && topN >= 3 && (
              <motion.div key="nudge" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="nudge">
                <Alert
                  type="info"
                  showIcon
                  message={`${topN} of your last ${allVars.length} variations use ${topAngle}.`}
                  action={
                    <span className="row-gap">
                      <Button size="small" onClick={() => message.info(`Next round will try ${unused}`)}>
                        Try {unused}
                      </Button>
                      <Button size="small" type="text" onClick={() => setNudgeOff(true)}>
                        Dismiss
                      </Button>
                    </span>
                  }
                />
              </motion.div>
            )}
            {sameRec && otherRec && (
              <motion.div key="pick-hint" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="nudge">
                <Alert
                  type="info"
                  showIcon
                  message={`All ${picks.length} picks fix the same issue. Add one that targets ${otherRec.target} to compare both fixes.`}
                  action={
                    <Button size="small" onClick={() => go({ rec: otherRec.id })}>
                      Show {otherRec.target}
                    </Button>
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>

          {recFilter !== 'all' && (
            <div className="rec-more small">
              <Button
                size="small"
                onClick={() => createMore([recFilter])}
              >
                Create {settings.perRec} more
              </Button>
              <span className="muted">
                Uses {perRecCost} of {credits.toLocaleString()} credits
              </span>
              <Button type="link" size="small" className="inline-link" onClick={() => setEdit(true)}>
                Edit settings
              </Button>
            </div>
          )}

          {mobile && readyCount > 0 && <p className="muted small swipe-hint">Swipe an image to compare it with the original</p>}

          {visible.length === 0 ? (
            <Empty description={<b>No variations for this recommendation yet</b>}>
              <Button onClick={() => createMore([recFilter])}>Create {settings.perRec} variations</Button>
            </Empty>
          ) : (
            <div className="var-grid">
              <AnimatePresence mode="popLayout">
                {visible.map(({ v, i }, k) => (
                  <VariationCard
                    key={v.id}
                    index={k}
                    v={v}
                    state={cardState(job, i)}
                    rec={recs.find((r) => r.id === v.recId)}
                    original={c}
                    mobile={mobile}
                    picked={shortlist.includes(v.id)}
                    onPick={() => setShortlist((p) => (p.includes(v.id) ? p.filter((x) => x !== v.id) : [...p, v.id]))}
                    onRefine={() => openEditor(v)}
                    onFixText={() => openEditor(v, true)}
                    versions={versionsOf(v)}
                    onMore={() => {
                      const j = startJob({ creativeId: c.id, recIds: [v.recId], perRec: 4, size: job.size, like: v });
                      message.success({ content: `Creating 4 variations like ${v.angle}.`, duration: 3 });
                      setParams({ round: j.id });
                    }}
                    moreCost={`Uses ${4 * ACCOUNT.creditsPerImage} of ${credits.toLocaleString()} credits`}
                    onRetry={() => retryJob(job.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
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
              <b>
                <Rolling value={shortlist.length} /> shortlisted
              </b>
            </div>
            <div className="row-gap wrap">
              <Button icon={<SwapOutlined />} onClick={() => setCompare(true)}>
                Compare with original
              </Button>
              <Button icon={<SendOutlined />} onClick={() => setTesting(true)}>
                Test in Meta
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => message.success(`Downloaded ${plural(shortlist.length, 'variation')}`)}
              >
                Download {shortlist.length}
              </Button>
              <Button type="text" className="on-dark" onClick={() => setShortlist([])}>
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={compare} onCancel={() => setCompare(false)} footer={null} title="Compare with original" width={Math.min(1100, 300 + picks.length * 260)} className="compare-modal">
        <div className="compare-grid">
          <figure>
            <AdArt slot={c.img} copy={c.copy} ratio="2 / 3" alt="Original" />
            <figcaption>
              <b>Original</b>
              <span className="muted small">
                CTR {c.grades.ctr} · {ACCOUNT.conversionMetric} {c.grades.conversion}
              </span>
            </figcaption>
          </figure>
          {picks.map((v) => {
            const cur = versionsOf(v).filter((x) => x.state === 'ready').at(-1)!;
            return (
            <figure key={v.id}>
              <AdArt slot={cur.img} copy={cur.copy} typo={cur.n === 1 ? v.typo : undefined} ratio="2 / 3" alt={v.angle} />
              <figcaption>
                <b>{v.angle}</b>
                <span className="muted small">Fixes: {recs.find((r) => r.id === v.recId)?.issue}</span>
                <PredictedTag id={v.id} />
              </figcaption>
            </figure>
            );
          })}
        </div>
      </Modal>

      {/* Demo 1 (D1-02, D1-03): the closed loop. Paused, so nothing spends until the user turns them on. */}
      <Modal
        open={testing}
        title={`Test ${plural(picks.length, 'variation')} in Meta`}
        okText={`Add ${picks.length} paused ${picks.length === 1 ? 'ad' : 'ads'}`}
        cancelText="Cancel"
        onCancel={() => setTesting(false)}
        onOk={() => {
          launch(job.id, picks.map((p) => p.id), audience);
          setTesting(false);
          setShortlist([]);
          message.success({
            content: (
              <span>
                {plural(picks.length, 'paused ad')} added to {short(audience, 24)} ·{' '}
                <a onClick={() => message.info('Opens Meta Ads Manager in a new tab')}>Open in Meta</a>
              </span>
            ),
            duration: 5,
          });
        }}
        width={480}
      >
        <p>
          Atria adds them to {audience} as paused ads. Nothing spends until you turn them on in Meta.
        </p>
        <div className="test-thumbs">
          {picks.map((p) => {
            const cur = versionsOf(p).filter((x) => x.state === 'ready').at(-1)!;
            return <AdArt key={p.id} slot={cur.img} copy={cur.copy} ratio={ratioFor(cur.img)} alt={p.angle} />;
          })}
        </div>
        <p className="muted small">Their results come back to Radar as ads tagged “Variation of {short(c.name, 28)}”.</p>
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
