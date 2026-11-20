import { MadeFromIcon } from '../components/Icons';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Breadcrumb, Grid, Button, Checkbox, ConfigProvider, Tag, Tooltip, theme as antdTheme } from 'antd';
import { CloudUploadOutlined, LikeOutlined, DislikeOutlined, DownOutlined, ExportOutlined, HistoryOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import {
  ACCOUNT,
  CREATIVES,
  METRIC_META,
  PERSONAS,
  WINDOW,
  money,
  plural,
  recommendationsFor,
  short,
  type Creative as CreativeT,
  type MetricKey,
  type Recommendation, statusOf as adStatusOf, copyStatus, platformOf } from '../data/mock';
import { ALL_CREATIVES, findCreative, recName, useStore, type RowStatus } from '../data/store';
import { Creative, Thumb } from '../components/Thumb';
import { Placements } from '../components/Placements';
import { GradeTag, OverallTag } from '../components/GradeTag';
import { StatusCell } from '../components/StatusCell';
import { Body, CreateDialog } from '../components/CreateDialog';
import { Rolling } from '../components/Rolling';
import { duration, ease, fadeUp, pageTransition, spring, stagger } from '../motion/tokens';

const section = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.cards, delayChildren: 0.05 } },
};

const val = (c: CreativeT, k: MetricKey) => {
  const key = ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[k];
  return METRIC_META[k].unit(c.values[key] ?? 0);
};

/** AD-13 to AD-15: the reading, then what to do. Numbers live in the stat strip below (P3, L-035). */
function summary(c: CreativeT, parent?: CreativeT) {
  if (parent) return `Converts better than the original. Let it run before you judge it: ${money(c.spend)} spent so far.`;
  const keys = (Object.keys(METRIC_META) as MetricKey[]).filter((k) => c.grades[k]);
  const rank = (k: MetricKey) => 'ABCD'.indexOf(c.grades[k]![0]);
  const worst = keys.reduce((a, b) => (rank(b) > rank(a) ? b : a));
  if (rank(worst) <= 1) return 'Strong on every graded metric. Use it as the starting point for new variations.';
  return {
    conversion: 'People click but few buy. Fix what happens after the click, starting with the fixes below.',
    ctr: 'Few people click. Make the ad stop the scroll, starting with the fixes below.',
    hook: 'People scroll past in the first seconds. Change the opening, starting with the fixes below.',
    retention: 'People stop watching early. Tighten the middle of the video, starting with the fixes below.',
  }[worst];
}

/** Per-suggestion feedback (Mancini, 20 Nov 17:48: rate each one, not the whole list). */
function RateRow() {
  const [v, setV] = useState<'up' | 'down' | null>(null);
  return (
    <div className="rec-rate" onClick={(e) => e.stopPropagation()}>
      {v ? (
        <span className="t-help">Thanks for the feedback.</span>
      ) : (
        <>
          <span className="t-help">Useful?</span>
          <Tooltip title="Useful">
            <Button type="text" size="small" className="icon-only" icon={<LikeOutlined />} aria-label="Useful" onClick={() => setV('up')} />
          </Tooltip>
          <Tooltip title="Not useful">
            <Button type="text" size="small" className="icon-only" icon={<DislikeOutlined />} aria-label="Not useful" onClick={() => setV('down')} />
          </Tooltip>
        </>
      )}
    </div>
  );
}

const GRADE_COLOR: Record<string, string> = { A: 'green', B: 'blue', C: 'gold', D: 'red' };

function RecCard({
  r,
  selected,
  suggested,
  disabled,
  onToggle,
  footer,
  targetGrade,
}: {
  r: Recommendation;
  selected: boolean;
  suggested: boolean;
  disabled?: boolean;
  onToggle: () => void;
  footer?: { text: string; action?: () => void; running?: boolean };
  targetGrade?: string | null;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={`rec-card ${selected ? 'selected' : ''} ${disabled ? 'read-only' : ''}`}
      onClick={disabled ? undefined : onToggle}
      role={disabled ? undefined : 'checkbox'}
      aria-checked={disabled ? undefined : selected}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={(e) => !disabled && (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), onToggle())}
    >
      {/* How > What > Why (Mancini, 20 Nov 17:43). 18:49 hierarchy pass: the problem is a coloured eyebrow
          (grade + metric + issue), the fix is the title, the reason is quiet, examples are chips. */}
      <div className="rec-head">
        {!disabled && <Checkbox checked={selected} tabIndex={-1} className="rec-check" />}
        <div className="rec-body">
          <div className="rec-eyebrow">
            {targetGrade && <Tag className="rec-grade" color={GRADE_COLOR[targetGrade[0]]}>{targetGrade}</Tag>}
            <span className="rec-metric">{r.target}</span>
            <span className="rec-issue-text">{r.issue}</span>
            {suggested && !disabled && (
              <Tooltip title="One of the top 2 by priority.">
                <Tag color="orange" className="rec-suggested">Suggested</Tag>
              </Tooltip>
            )}
          </div>
          <b className="rec-how">{r.fix}</b>
          <p className="rec-why">{r.why}</p>
          <div className="rec-bottom">
            {r.examples.length > 0 && (
              <div className="rec-try">
                <span className="t-label">Try</span>
                {r.examples.map((e) => (
                  <span key={e} className="rec-chip">{e}</span>
                ))}
              </div>
            )}
            <RateRow />
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {footer && (
          <motion.div
            className="rec-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}
            onClick={(e) => e.stopPropagation()}
          >
            <HistoryOutlined />
            <span>{footer.text}</span>
            {footer.action && (
              <Button type="link" size="small" onClick={footer.action}>
                View variations
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AdDetail() {
  const { id } = useParams();
  const { message } = App.useApp();
  const bp = Grid.useBreakpoint();
  const nav = useNavigate();
  const c = findCreative(id) ?? CREATIVES[0];
  const parent = c.variationOf ? findCreative(c.variationOf) : undefined;
  const { statusOf, jobsFor, startJob, credits: balance, versionsOf } = useStore();
  const s: RowStatus = statusOf(c.id);
  const jobs = jobsFor(c.id);
  const iterable = c.media === 'Image';

  const recs = useMemo(() => recommendationsFor(c), [c]);
  const suggestedIds = recs.slice(0, 2).map((r) => r.id);
  /** Suggestions with a round still running or just made aren't preselected again (Mancini, 18:54). */
  const fresh = (rid: string) =>
    jobs.some((j) => j.recIds.includes(rid) && (j.state === 'generating' || j.state === 'queued' || (j.state !== 'failed' && (j.unseen || j.minutesAgo < 60))));
  const preselect = () => (iterable ? recommendationsFor(c).slice(0, 2).map((r) => r.id).filter((rid) => !fresh(rid)) : []);
  const [selected, setSelected] = useState<string[]>(preselect);
  const [adsOpen, setAdsOpen] = useState(true);
  const [showAllAds, setShowAllAds] = useState(false);
  const [dialog, setDialog] = useState(false);
  useEffect(() => {
    setSelected(preselect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, iterable]);

  const total = selected.length * ACCOUNT.variationsPerRecommendation;
  const cost = total * ACCOUNT.creditsPerImage;
  const busy = s.kind === 'generating' || s.kind === 'queued';
  const short_ = cost > balance;
  const toggle = (rid: string) => setSelected((p) => (p.includes(rid) ? p.filter((x) => x !== rid) : [...p, rid]));
  const viewRound = (jobId: string, rec?: string) => nav(`/ad/${c.id}/variations?round=${jobId}${rec ? `&rec=${rec}` : ''}`);

  /** AD-21e/f/g: footer per recommendation from its latest round. */
  const footerFor = (r: Recommendation) => {
    const j = jobs.filter((x) => x.recIds.includes(r.id)).at(-1);
    if (!j) return undefined;
    if (j.state === 'generating' || j.state === 'queued') return { text: `Generating ${plural(j.perRec, 'variation')}…`, running: true };
    if (j.state === 'failed') return { text: "Couldn't create variations. Credits returned." };
    const n = j.variations.filter((v, i) => v.recId === r.id && !j.failed.includes(i)).length;
    if (j.unseen || j.minutesAgo < 60) return { text: `${plural(n, 'variation')} ready`, action: () => viewRound(j.id, r.id) };
    return { text: `${plural(n, 'variation')} made on ${j.date}`, action: () => viewRound(j.id, r.id) };
  };

  const ads = showAllAds ? c.ads : c.ads.slice(0, 3);
  const morph = dialog && !!bp.md;
  const create = ({ perRec, size }: { perRec: number; size: string }) => {
    setDialog(false);
    const j = startJob({ creativeId: c.id, recIds: selected, perRec, size });
    message.success({ content: `Creating ${j.count} variations. This will take a couple of minutes.`, duration: 4 });
  };
  useEffect(() => {
    if (!morph) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setDialog(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [morph]);
  /** Demo 1, lineage (D6, D7): ads made from this one, graded or still paused in Meta. */
  const made = [
    ...ALL_CREATIVES.filter((x) => x.variationOf === c.id).map((x) => ({ kind: 'ad' as const, id: x.id, c: x })),
    ...jobs.flatMap((j) =>
      j.variations
        .filter((v) => v.launched && !v.deleted)
        .map((v) => ({ kind: 'paused' as const, id: v.id, jobId: j.id, angle: v.angle, img: (versionsOf(v).filter((x) => x.state === 'ready').at(-1) ?? { img: v.img }).img })),
    ),
  ];
  const statusLabel = (x: typeof c) => (adStatusOf(x) === 'Paused' ? 'Paused' : 'Active');

  return (
    <motion.div {...pageTransition} className="page detail">
      <div className="detail-head">
        <Breadcrumb
          items={[
            { title: <Link to="/">Radar</Link> },
            { title: <Tooltip title={c.name}>{short(c.name, 36)}</Tooltip> },
          ]}
        />
        <span className="muted small window">{bp.md ? WINDOW.long : WINDOW.short}</span>
      </div>

      {parent && (
        <motion.div className="lineage" variants={fadeUp} initial="hidden" animate="show">
          <MadeFromIcon /> Made from <Link to={`/ad/${parent.id}`}>{parent.name}</Link>
        </motion.div>
      )}

      <div className="detail-grid">
        <aside className="detail-left">
          <div className="panel creative-panel">
            <div className="t-label">Ad</div>
            <div className="ad-name">{c.name}</div>
            <Creative c={c} layoutId={bp.md ? `creative-${c.id}` : undefined} />
          </div>

          <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
            <button className="panel-toggle" onClick={() => setAdsOpen((o) => !o)} aria-expanded={adsOpen}>
              <b>Where it runs · {c.ads.length}</b>
              {c.ads.length > 1 && (
                <span className="t-help">Spend and results are totals across {c.ads.length === 2 ? 'both' : `all ${c.ads.length}`}.</span>
              )}
              <motion.span animate={{ rotate: adsOpen ? 180 : 0 }} transition={spring.snappy} className="chev">
                <DownOutlined />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {adsOpen && (
                <motion.div
                  className="ads-list"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto', transition: { height: spring.layout, opacity: { duration: duration.fast } } }}
                  exit={{ opacity: 0, height: 0, transition: { height: { duration: duration.base, ease: ease.exit }, opacity: { duration: duration.instant } } }}
                >
                  {ads.map((a) => (
                    <div key={a.id} className="ad-row">
                      <div className="ad-row-id">
                        <i className={`live-dot ${copyStatus(c, a) === 'Paused' ? 'paused' : ''}`} aria-label={copyStatus(c, a)} /> <span className="campaign">{a.campaign}</span>
                        <ExportOutlined className="muted ext-link" aria-label="Open in Ads Manager" role="link" onClick={() => message.info(`Opens ${platformOf(a)} Ads Manager in a new tab.`)} />
                      </div>
                      <div className="ad-fields muted small">
                        <span>Platform: {platformOf(a)}</span>
                        <span>Audience: {a.adSet}</span>
                        <span>Ad ID: {a.id}</span>
                      </div>
                      <div className="ad-row-nums">
                        <span>
                          <span className="muted">Spend</span> {money(a.spend)}
                        </span>
                        <span>
                          <span className="muted">{ACCOUNT.conversionMetric}</span> {money(a.cpa)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {c.ads.length > 3 && !showAllAds && (
                    <Button type="link" size="small" onClick={() => setShowAllAds(true)}>
                      Show {plural(c.ads.length - 3, 'more ad', 'more ads')}
                    </Button>
                  )}
                  <div className="placement">
                    <Placements items={c.placements} animate />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div className="panel source" variants={fadeUp} initial="hidden" animate="show">
            <b>Source</b>
            {parent ? (
              <div className="source-body">
                <Tag color="orange" icon={<MadeFromIcon />}>
                  Created in Atria
                </Tag>
                <div>
                  Variation of <Link to={`/ad/${parent.id}`}>{short(parent.name, 18)}</Link>
                </div>
                <div className="muted small">From “{recName(parent.id, 'cta')}” · Brief v1 · 12 Nov</div>
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => nav(`/ad/${parent.id}/variations?round=job-hero-1`)}>
                  View brief and images
                </Button>
              </div>
            ) : (
              <div className="source-body">
                <Tag icon={<CloudUploadOutlined />}>Uploaded</Tag>
                <div className="t-help">Made outside Atria and synced from Meta</div>
              </div>
            )}
          </motion.div>
                  {made.length > 0 && (
            <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
              <b>Made from this ad · {made.length}</b>
              <div className="made-list">
                {made.map((m) =>
                  m.kind === 'ad' ? (
                    <Link key={m.id} to={`/ad/${m.id}`} className="made-row">
                      <Thumb c={m.c} size={40} />
                      <span className="small">
                        <span className="made-name">{short(m.c.name, 30)}</span>
                        <span className="muted">
                          Overall {m.c.overall} · {ACCOUNT.conversionMetric} {money(m.c.values.cpa)} · {statusLabel(m.c)}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <Link key={m.id} to={`/ad/${c.id}/variations/${m.id}?round=${m.jobId}`} className="made-row">
                      <Thumb c={{ img: m.img, media: 'Image', name: m.angle }} size={40} />
                      <span className="small">
                        <span className="made-name">{m.angle}</span>
                        <span className="muted">Paused in Meta · not graded yet</span>
                      </span>
                    </Link>
                  ),
                )}
              </div>
            </motion.div>
          )}
        </aside>

        <motion.section className="detail-right" variants={section} initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="panel verdict">
            <span className="t-label">Summary</span>
            <p className="verdict-line">{summary(c, parent)}</p>
            <div className="stat-strip">
              <div className="stat">
                <span className="t-label">Overall</span>
                <span className="stat-val">
                  <OverallTag creative={c} />
                </span>
              </div>
              {(Object.keys(METRIC_META) as MetricKey[])
                .filter((k) => c.grades[k])
                .map((k) => (
                  <div className="stat" key={k}>
                    <span className="t-label">{METRIC_META[k].label}</span>
                    <span className="stat-val">
                      <GradeTag creative={c} metric={k} /> {val(c, k)}
                    </span>
                  </div>
                ))}
              <div className="stat">
                <span className="t-label">Spend</span>
                <span className="stat-val">{money(c.spend)}</span>
              </div>
              <div className="stat">
                <span className="t-label">ROAS</span>
                <span className="stat-val">{c.roas}</span>
              </div>
            </div>
            <span className="t-help">{bp.md ? 'Hover over a grade to see how it\'s graded.' : 'Tap a grade to see how it\'s graded.'}</span>
            {s.kind !== 'idle' && (
              <div className="verdict-status">
                <StatusCell creative={c} status={s} />
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="section-title">
            <h4>Suggestions</h4>
            <span className="t-help">{iterable && preselect().length === 2 ? 'Most important first. The top 2 are already selected.' : 'Most important first.'}</span>
            <span className="t-help rec-date">
              Updated {WINDOW.synced}
              <Tooltip title="Refresh">
                <Button type="text" size="small" className="icon-only" icon={<ReloadOutlined />} aria-label="Refresh suggestions" onClick={() => message.success('Suggestions are up to date.')} />
              </Tooltip>
            </span>
          </motion.div>

          {parent && (
            <motion.div variants={fadeUp} className="already-tried">
              <HistoryOutlined /> This variation already applies: <b>{recName(parent.id, 'cta')}</b>
            </motion.div>
          )}

          {recs.map((r) => (
            <RecCard
              key={r.id}
              r={r}
              selected={selected.includes(r.id)}
              suggested={suggestedIds.includes(r.id)}
              disabled={!iterable}
              onToggle={() => toggle(r.id)}
              footer={footerFor(r)}
              targetGrade={c.grades[({ CPA: 'conversion', CTR: 'ctr', Hook: 'hook', ROAS: '' } as Record<string, string>)[r.target] as MetricKey] ?? null}
            />
          ))}

          <motion.div variants={fadeUp} className="panel personas">
            <h4>Likely audience</h4>
            <div className="persona-tags">
              {PERSONAS.map((p) => (
                <Tooltip key={p.label} title={p.why}>
                  <Tag className="persona">
                    {p.label} <InfoCircleOutlined />
                  </Tag>
                </Tooltip>
              ))}
            </div>
          </motion.div>
        </motion.section>
      </div>
      <div className="sticky-spacer" />

      {/* Always present (AD-27). On desktop the bar itself grows into the create panel (Mancini's morphing reference, 20 Nov 17:59). */}
      <AnimatePresence>
        {morph && (
          <motion.div
            key="scrim"
            className="bar-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.base } }}
            exit={{ opacity: 0, transition: { duration: duration.fast } }}
            onClick={() => setDialog(false)}
          />
        )}
      </AnimatePresence>
      <motion.div
        layout
        className={`sticky-bar ${morph ? 'expanded' : ''}`}
        style={{ borderRadius: 14 }}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: spring.gentle }}
        transition={{ layout: { type: 'spring', bounce: 0, duration: 0.42 } }}
        role={morph ? 'dialog' : undefined}
        aria-label={morph ? 'Create variations' : undefined}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {morph ? (
            <motion.div
              key="panel"
              className="bar-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.16, duration: duration.base, ease: ease.standard } }}
              exit={{ opacity: 0, transition: { duration: duration.instant } }}
            >
              <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm, token: { colorPrimary: '#f5582a', colorBgContainer: '#2a272e', colorBgElevated: '#2a272e', colorBorder: '#3d3942', colorBorderSecondary: '#333037', colorText: '#ece9ef', colorTextSecondary: '#a8a3ad', colorTextTertiary: '#8c8791', colorTextPlaceholder: '#7d7883', colorTextDisabled: '#6b6670', colorBgContainerDisabled: '#2a272e', borderRadius: 6 } }}>
                <Body creative={c} recCount={selected.length} panel onCancel={() => setDialog(false)} onCreate={create} />
              </ConfigProvider>
            </motion.div>
          ) : (
            <motion.div
              key="row"
              className="bar-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.12, duration: duration.fast } }}
              exit={{ opacity: 0, transition: { duration: duration.instant } }}
            >
        <div className="sticky-summary">
          {!iterable ? (
            <span>AI-generated variations currently support image ads only. You can still apply the suggestions above yourself.</span>
          ) : busy ? (
            <>
              <b>Generating {s.kind === 'generating' || s.kind === 'queued' ? s.count : total}</b>
              <span className="muted small left">{balance.toLocaleString()} credits left</span>
            </>
          ) : selected.length === 0 && s.kind === 'ready' ? (
            <>
              <b>{s.count} new variations are ready</b>
              <span className="muted small left">Or select a suggestion to create more.</span>
            </>
          ) : selected.length === 0 ? (
            <span>Select a suggestion to create variations</span>
          ) : short_ ? (
            <span>
              Needs {cost} credits. You have {balance}.
            </span>
          ) : (
            <>
              <b>
                <Rolling value={selected.length} /> {selected.length === 1 ? 'suggestion' : 'suggestions'} selected
              </b>
              <span className="muted small left">Choose how many variations and the size in the next step.</span>
            </>
          )}
        </div>
        {iterable &&
          (short_ && !busy && selected.length ? (
            <Button size="large" onClick={() => message.info('Opens billing in a new tab.')}>Get credits</Button>
          ) : (
            selected.length === 0 && s.kind === 'ready' ? (
              <Button type="primary" size="large" onClick={() => viewRound(s.jobId)}>View variations</Button>
            ) : (
            <Button type="primary" size="large" disabled={busy || selected.length === 0} onClick={() => setDialog(true)}>
              {busy ? `Generating ${s.kind === 'generating' || s.kind === 'queued' ? s.count : ''}` : 'Create variations'}
            </Button>
            )
          ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <CreateDialog
        open={dialog && !bp.md}
        mobile={!bp.md}
        creative={c}
        recCount={selected.length}
        onClose={() => setDialog(false)}
        onCreate={create}
      />
    </motion.div>
  );
}
