import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { App, Breadcrumb, Grid, Button, Checkbox, Tag, Tooltip, Typography } from 'antd';
import {
  ArrowRightOutlined,
  BranchesOutlined,
  CloudUploadOutlined,
  DownOutlined,
  ExportOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, CREATIVES, PERSONAS, PLACEMENTS, RECOMMENDATIONS, money, short, type Creative as CreativeT, type Recommendation } from '../data/mock';
import { ALL_CREATIVES, useStore } from '../data/store';
import { Creative } from '../components/Thumb';
import { GradeTag, OverallTag } from '../components/GradeTag';
import { StatusCell } from '../components/StatusCell';
import { duration, ease, fadeUp, spring, stagger } from '../motion/tokens';

const section = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.cards, delayChildren: 0.05 } },
};

/** Number that slides when it changes (sticky bar counts). */
function Rolling({ value }: { value: string | number }) {
  return (
    <span className="rolling">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}
          exit={{ opacity: 0, transition: { duration: duration.instant } }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function verdict(c: CreativeT, parent?: CreativeT) {
  if (parent) {
    return (
      <>
        <b>Promising.</b> Keeps the original's <b>CTR A</b> and converts better: <b>CPA B</b>, {money(c.values.cpa)} vs {money(parent.values.cpa)} on the
        original. Still early at {money(c.spend)} spent.
      </>
    );
  }
  if (c.id !== 'id-1090245') {
    return (
      <>
        <b>Overall {c.overall}.</b> CPA {money(c.values.cpa)}, CTR {c.values.ctr.toFixed(2)}%, {money(c.spend)} spent at ROAS {c.roas}.
      </>
    );
  }
  return (
    <>
      <b>Mixed.</b> People click (<b>CTR A</b>) but few buy (<b>CPA D</b>, {money(c.values.cpa)} vs account avg {money(ACCOUNT.avg.cpa)}).{' '}
      {money(c.spend)} spent at ROAS {c.roas}.
    </>
  );
}

function RecCard({
  r,
  selected,
  suggested,
  onToggle,
  jobCount,
  generating,
}: {
  r: Recommendation;
  selected: boolean;
  suggested: boolean;
  onToggle: () => void;
  jobCount?: number;
  generating?: boolean;
}) {
  const footerCount = jobCount ?? r.tried?.count;
  return (
    <motion.div variants={fadeUp} className={`rec-card ${selected ? 'selected' : ''}`} onClick={onToggle} role="checkbox" aria-checked={selected} tabIndex={0}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), onToggle())}
    >
      <div className="rec-top">
        <Checkbox checked={selected} tabIndex={-1} />
        <span className="rec-priority">{r.priority}</span>
        <div className="rec-issue">
          <span className="muted small">Issue</span>
          <b>{r.issue}</b>
        </div>
        <div className="rec-tags">
          {suggested && <Tag color="orange">Suggested</Tag>}
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
        {(footerCount || generating) && (
          <motion.div
            className="rec-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}
            onClick={(e) => e.stopPropagation()}
          >
            <HistoryOutlined />
            {generating ? (
              <span>Generating variations from this recommendation…</span>
            ) : (
              <>
                <span>
                  {r.tried && !jobCount ? `Tried ${r.tried.date} · ` : ''}Variations from this recommendation ({footerCount})
                </span>
                <Button type="link" size="small">
                  View
                </Button>
              </>
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
  const c = ALL_CREATIVES.find((x) => x.id === id) ?? CREATIVES[1];
  const parent = c.variationOf ? CREATIVES.find((x) => x.id === c.variationOf) : undefined;
  const { status, startJob, markSeen, credits: balance } = useStore();
  const s = status[c.id];

  // D6: on a variation, the recommendation it already applied is history, not an option.
  const recs = useMemo(() => (parent ? RECOMMENDATIONS.filter((r) => r.id !== 'stronger').map((r, i) => ({ ...r, priority: i + 1, tried: undefined, ...(r.id === 'simplify' ? { issueDetail: 'CPA improved to B, but the ad still carries two offers. One clear offer should close the gap.' } : {}) })) : RECOMMENDATIONS), [parent]);
  const suggestedIds = recs.slice(0, 2).map((r) => r.id);
  const [selected, setSelected] = useState<string[]>(suggestedIds);
  const [adsOpen, setAdsOpen] = useState(true);

  useEffect(() => {
    if (s?.kind === 'ready') markSeen(c.id);
  }, [s?.kind, c.id, markSeen]);

  const images = selected.length * ACCOUNT.variationsPerRecommendation;
  const credits = images * ACCOUNT.creditsPerImage;
  const busy = s?.kind === 'generating';
  const toggle = (rid: string) => setSelected((p) => (p.includes(rid) ? p.filter((x) => x !== rid) : [...p, rid]));

  return (
    <div className="page detail">
      <motion.div className="detail-head" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: duration.base } }}>
        <Breadcrumb
          items={[
            { title: <Link to="/">Radar</Link> },
            ...(parent ? [{ title: <Link to={`/ad/${parent.id}`}>{short(parent.name, 14)}</Link> }] : []),
            { title: <Tooltip title={c.name}>{short(c.name, 22)}</Tooltip> },
          ]}
        />
        <span className="muted small window">{ACCOUNT.windowLabel}</span>
      </motion.div>

      {parent && (
        <motion.div className="lineage" variants={fadeUp} initial="hidden" animate="show">
          <BranchesOutlined /> Lineage:
          <Link to={`/ad/${parent.id}`}>{short(parent.name, 14)}</Link>
          <span className="muted">›</span>
          <b>{short(c.name, 18)}</b>
        </motion.div>
      )}

      <div className="detail-grid">
        <aside className="detail-left">
          <div className="panel creative-panel">
            <div className="muted small">Ad name</div>
            <div className="ad-name">{c.name}</div>
            <Creative kind={c.thumb} layoutId={bp.md ? `creative-${c.id}` : undefined} />
          </div>

          <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
            <button className="panel-toggle" onClick={() => setAdsOpen((o) => !o)} aria-expanded={adsOpen}>
              <b>Running in {c.ads.length} {c.ads.length === 1 ? 'ad' : 'ads'}</b>
              {c.ads.length > 1 && <span className="muted small">metrics combined</span>}
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
                  {c.ads.slice(0, 3).map((a) => (
                    <div key={a.id} className="ad-row">
                      <div className="ad-row-id">
                        <i className="live-dot" /> Meta ad {a.id}
                        <ExportOutlined className="muted" />
                      </div>
                      <div className="campaign">{a.campaign}</div>
                      <div className="muted small">Ad set: {a.adSet}</div>
                      <div className="ad-row-nums">
                        <span>
                          <span className="muted">Spend</span> {money(a.spend)}
                        </span>
                        <span>
                          <span className="muted">CPA</span> {money(a.cpa)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {c.ads.length > 3 && <Button type="link" size="small">Show {c.ads.length - 3} more</Button>}
                  <div className="placement">
                    <div className="muted small">Placement split (spend)</div>
                    <div className="placement-bar">
                      {PLACEMENTS.map((p, i) => (
                        <motion.i
                          key={p.label}
                          style={{ width: `${p.share * 100}%`, originX: 0 }}
                          className={`seg seg-${i}`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1, transition: { ...spring.gentle, delay: 0.05 + i * 0.04 } }}
                        />
                      ))}
                    </div>
                    <div className="small">{PLACEMENTS.map((p) => `${p.label} ${Math.round(p.share * 100)}%`).join(' · ')}</div>
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
                <div className="muted small">From “Use stronger CTAs” · Brief v1 · 12 Nov</div>
                <Button size="small" type="link" style={{ padding: 0 }}>
                  View brief and images
                </Button>
              </div>
            ) : (
              <div className="source-body">
                <Tag icon={<CloudUploadOutlined />}>Uploaded</Tag>
                <div className="muted small">Made outside Atria and synced from Meta.</div>
              </div>
            )}
          </motion.div>
        </aside>

        <motion.section className="detail-right" variants={section} initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="panel verdict">
            <Typography.Text type="secondary" className="small">
              Verdict
            </Typography.Text>
            <p className="verdict-line">{verdict(c, parent)}</p>
            <div className="grade-row">
              <span>
                Overall <OverallTag creative={c} />
              </span>
              <span>
                Conversion <GradeTag creative={c} metric="conversion" />
              </span>
              <span>
                CTR <GradeTag creative={c} metric="ctr" />
              </span>
              <span className="muted">
                ROAS <b className="ink">{c.roas}</b>
              </span>
              <span className="muted small">Click a grade to see what it means</span>
            </div>
            {s && s.kind !== 'idle' && (
              <div className="verdict-status">
                <StatusCell creative={c} status={s} />
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="section-title">
            <h4>What's holding it back</h4>
            <span className="muted small">
              Ordered by priority · pick what to fix{' '}
              <Tooltip title="The top 2 are ticked for you. Each recommendation makes 4 variations.">
                <InfoCircleOutlined />
              </Tooltip>
            </span>
          </motion.div>

          {parent && (
            <motion.div variants={fadeUp} className="already-tried">
              <HistoryOutlined /> Already applied in this variation: <b>Use stronger CTAs</b>
            </motion.div>
          )}

          {recs.map((r) => {
            const jobHas = s && s.kind !== 'idle' && s.recIds?.includes(r.id);
            return (
              <RecCard
                key={r.id}
                r={r}
                selected={selected.includes(r.id)}
                suggested={suggestedIds.includes(r.id)}
                onToggle={() => toggle(r.id)}
                generating={!!(jobHas && s.kind === 'generating')}
                jobCount={jobHas && s.kind === 'ready' ? ACCOUNT.variationsPerRecommendation : undefined}
              />
            );
          })}

          <motion.div variants={fadeUp} className="panel personas">
            <h4>Who it's for</h4>
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

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            className="sticky-bar"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: spring.gentle }}
            exit={{ y: 24, opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
          >
            <div className="sticky-summary">
              <b>
                <Rolling value={selected.length} /> selected
              </b>
              <span className="dot-sep">·</span>
              <span>
                <Rolling value={images} /> images
              </span>
              <span className="dot-sep">·</span>
              <span>
                <Rolling value={credits} /> credits
              </span>
              <span className="muted small left">{busy ? `${balance.toLocaleString()} left` : `${(balance - credits).toLocaleString()} left after`}</span>
            </div>
            <Button
              type="primary"
              size="large"
              disabled={busy}
              onClick={() => {
                startJob(c.id, images, selected, credits);
                message.success({
                  content: `Generating ${images} variations. You can leave this page; progress shows on the Radar row and in the tracker.`,
                  duration: 4,
                });
              }}
            >
              {busy ? 'Generating…' : 'Create variations'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
