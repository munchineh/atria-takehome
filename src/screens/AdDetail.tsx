import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Breadcrumb, Grid, Button, Checkbox, Tag, Tooltip, Typography } from 'antd';
import { ArrowRightOutlined, BranchesOutlined, CloudUploadOutlined, DownOutlined, ExportOutlined, HistoryOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
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
  type Recommendation, statusOf } from '../data/mock';
import { findCreative, recName, useStore, type RowStatus } from '../data/store';
import { Creative } from '../components/Thumb';
import { GradeTag, OverallTag } from '../components/GradeTag';
import { StatusCell } from '../components/StatusCell';
import { CreateDialog } from '../components/CreateDialog';
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
const mname = (k: MetricKey) => (k === 'conversion' ? ACCOUNT.conversionMetric : METRIC_META[k].label);

/** AD-13 to AD-15: what happens, then the best and worst grade with numbers. No adjectives. */
function summary(c: CreativeT, parent?: CreativeT) {
  if (parent)
    return `Converts better than the original. ${mname('conversion')} is ${c.grades.conversion} (${money(c.values.cpa)}, original ${money(parent.values.cpa)}). CTR is still ${c.grades.ctr}. Early result: ${money(c.spend)} spent so far.`;
  const keys = (Object.keys(METRIC_META) as MetricKey[]).filter((k) => c.grades[k]);
  const rank = (k: MetricKey) => 'ABCD'.indexOf(c.grades[k]![0]);
  const worst = keys.reduce((a, b) => (rank(b) > rank(a) ? b : a));
  // Pair a weak conversion grade with CTR, so the sentence reads as one story.
  const best = worst === 'conversion' && c.grades.ctr ? 'ctr' : keys.reduce((a, b) => (rank(b) < rank(a) ? b : a));
  const lead =
    rank(worst) <= 1 ? 'Strong on every graded metric' : worst === 'conversion' ? 'People click but few buy' : worst === 'ctr' ? 'Few people click' : worst === 'hook' ? 'People scroll past in the first seconds' : 'People stop watching early';
  const avg = METRIC_META[worst].unit(ACCOUNT.avg[METRIC_META[worst].avgKey]);
  return `${lead}. ${mname(best)} is ${c.grades[best]} (${val(c, best)}). ${mname(worst)} is ${c.grades[worst]} (${val(c, worst)}, account average ${avg}).`;
}

function RecCard({
  r,
  selected,
  suggested,
  disabled,
  onToggle,
  footer,
}: {
  r: Recommendation;
  selected: boolean;
  suggested: boolean;
  disabled?: boolean;
  onToggle: () => void;
  footer?: { text: string; action?: () => void; running?: boolean };
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
      <div className="rec-top">
        {!disabled && <Checkbox checked={selected} tabIndex={-1} />}
        <span className="rec-priority">{r.priority}</span>
        <div className="rec-issue">
          <span className="muted small">Issue</span>
          <b>{r.issue}</b>
        </div>
        <div className="rec-tags">
          {suggested && !disabled && (
            <Tooltip title="One of the top 2 by priority">
              <Tag color="orange">Suggested</Tag>
            </Tooltip>
          )}
          <Tag>Targets {r.target}</Tag>
        </div>
      </div>
      <p className="rec-detail">{r.issueDetail}</p>
      <div className="rec-fix">
        <ArrowRightOutlined className="rec-arrow" />
        <div>
          <span className="muted small">Fix</span>
          <b>{r.fix}</b>
          <ul>
            {r.examples.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
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
  const { statusOf, jobsFor, startJob, credits: balance } = useStore();
  const s: RowStatus = statusOf(c.id);
  const jobs = jobsFor(c.id);
  const iterable = c.media === 'Image';

  const recs = useMemo(() => recommendationsFor(c), [c]);
  const suggestedIds = recs.slice(0, 2).map((r) => r.id);
  const [selected, setSelected] = useState<string[]>(iterable ? suggestedIds : []);
  const [adsOpen, setAdsOpen] = useState(true);
  const [showAllAds, setShowAllAds] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  useEffect(() => {
    setSelected(iterable ? recommendationsFor(c).slice(0, 2).map((r) => r.id) : []);
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

  return (
    <motion.div {...pageTransition} className="page detail">
      <div className="detail-head">
        <Breadcrumb
          items={[
            { title: <Link to="/">Radar</Link> },
            ...(parent ? [{ title: <Link to={`/ad/${parent.id}`}>{short(parent.name, 14)}</Link> }] : []),
            { title: <Tooltip title={c.name}>{short(c.name, 22)}</Tooltip> },
          ]}
        />
        <span className="muted small window">{bp.md ? WINDOW.long : WINDOW.short}</span>
      </div>

      {parent && (
        <motion.div className="lineage" variants={fadeUp} initial="hidden" animate="show">
          <BranchesOutlined /> Made from
          <Link to={`/ad/${parent.id}`}>{short(parent.name, 14)}</Link>
          <span className="muted">›</span>
          <b>{short(c.name, 18)}</b>
        </motion.div>
      )}

      <div className="detail-grid">
        <aside className="detail-left">
          <div className="panel creative-panel">
            <div className="muted small">Ad</div>
            <div className="ad-name">{c.name}</div>
            <Creative c={c} layoutId={bp.md ? `creative-${c.id}` : undefined} />
          </div>

          <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
            <button className="panel-toggle" onClick={() => setAdsOpen((o) => !o)} aria-expanded={adsOpen}>
              <b>Where it runs · {c.ads.length}</b>
              {c.ads.length > 1 && (
                <span className="muted small">Spend and results are totals across {c.ads.length === 2 ? 'both' : `all ${c.ads.length}`}</span>
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
                        <i className={`live-dot ${statusOf(c) === 'Paused' ? 'paused' : ''}`} aria-label={statusOf(c)} /> <span className="campaign">{a.campaign}</span>
                        <ExportOutlined className="muted" aria-label="Open in Meta Ads Manager" role="link" />
                      </div>
                      <div className="ad-fields muted small">
                        <span>Platform: Meta</span>
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
                    <div className="muted small">Spend by placement</div>
                    <div className="placement-bar">
                      {c.placements.map((p, i) => (
                        <motion.i
                          key={p.label}
                          style={{ width: `${p.share * 100}%`, originX: 0 }}
                          className={`seg seg-${i}`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1, transition: { ...spring.gentle, delay: 0.05 + i * 0.04 } }}
                        />
                      ))}
                    </div>
                    <div className="small">{c.placements.map((p) => `${p.label} ${Math.round(p.share * 100)}%`).join(' · ')}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div className="panel source" variants={fadeUp} initial="hidden" animate="show">
            <b>Source</b>
            {parent ? (
              <div className="source-body">
                <Tag color="orange" icon={<BranchesOutlined />}>
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
                <div className="muted small">Made outside Atria and synced from Meta</div>
              </div>
            )}
          </motion.div>
        </aside>

        <motion.section className="detail-right" variants={section} initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="panel verdict">
            <Typography.Text type="secondary" className="small">
              Summary
            </Typography.Text>
            <p className="verdict-line">{summary(c, parent)}</p>
            <div className="grade-row">
              <span>
                Overall <OverallTag creative={c} />
              </span>
              {(Object.keys(METRIC_META) as MetricKey[])
                .filter((k) => c.grades[k])
                .map((k) => (
                  <span key={k}>
                    {METRIC_META[k].label} <GradeTag creative={c} metric={k} />
                  </span>
                ))}
              <span className="muted">
                Spend <b className="ink">{money(c.spend)}</b>
              </span>
              <span className="muted">
                ROAS <b className="ink">{c.roas}</b>
              </span>
            </div>
            <span className="muted small">Select a grade to see how it's calculated</span>
            {s.kind !== 'idle' && (
              <div className="verdict-status">
                <StatusCell creative={c} status={s} />
                {s.kind === 'ready' && (
                  <Button type="link" size="small" onClick={() => viewRound(s.jobId)}>
                    View variations
                  </Button>
                )}
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="section-title">
            <h4>What's holding it back</h4>
            <span className="muted small">{iterable ? 'In priority order. The top 2 are selected for you.' : 'In priority order'}</span>
            <span className="muted small rec-date">
              Recommendations from {WINDOW.synced} ·{' '}
              <Button type="link" size="small" className="inline-link" icon={<ReloadOutlined />}>
                Refresh
              </Button>
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
            />
          ))}

          <motion.div variants={fadeUp} className="feedback small">
            <span className="muted">Were these recommendations useful?</span>
            <AnimatePresence mode="wait" initial={false}>
              {feedback ? (
                <motion.span key="thanks" variants={fadeUp} initial="hidden" animate="show" className="muted">
                  Thanks. This helps Atria rank the next ones.
                </motion.span>
              ) : (
                <motion.span key="ask" className="row-gap" exit={{ opacity: 0, transition: { duration: duration.instant } }}>
                  <Button size="small" onClick={() => setFeedback('yes')}>
                    Yes
                  </Button>
                  <Button size="small" onClick={() => setFeedback('no')}>
                    No
                  </Button>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

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

      {/* Always present (AD-27): the bar explains itself instead of vanishing. */}
      <motion.div className="sticky-bar" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: spring.gentle }}>
        <div className="sticky-summary">
          {!iterable ? (
            <span>Variations work for image ads only. You can still use the recommendations above.</span>
          ) : busy ? (
            <>
              <b>Generating {s.kind === 'generating' || s.kind === 'queued' ? s.count : total}…</b>
              <span className="muted small left">{balance.toLocaleString()} credits left</span>
            </>
          ) : selected.length === 0 ? (
            <span>Select a recommendation to create variations</span>
          ) : short_ ? (
            <span>
              Needs {cost} credits. You have {balance}.
            </span>
          ) : (
            <>
              <b>
                <Rolling value={selected.length} /> {selected.length === 1 ? 'recommendation' : 'recommendations'} selected
              </b>
              <span className="muted small left">
                Uses <Rolling value={cost} /> of {balance.toLocaleString()} credits
              </span>
            </>
          )}
        </div>
        {iterable &&
          (short_ && !busy && selected.length ? (
            <Button size="large">Get credits</Button>
          ) : (
            <Button type="primary" size="large" disabled={busy || selected.length === 0} onClick={() => setDialog(true)}>
              {busy ? `Generating ${s.kind === 'generating' || s.kind === 'queued' ? s.count : ''}…` : `Create ${total || ''} variations`.replace('  ', ' ')}
            </Button>
          ))}
      </motion.div>

      <CreateDialog
        open={dialog}
        mobile={!bp.md}
        creative={c}
        recCount={selected.length}
        onClose={() => setDialog(false)}
        onCreate={({ perRec, size }) => {
          setDialog(false);
          const j = startJob({ creativeId: c.id, recIds: selected, perRec, size });
          message.success({ content: `Creating ${j.count} variations. This takes about 2 minutes. You can leave this page.`, duration: 4 });
        }}
      />
    </motion.div>
  );
}
