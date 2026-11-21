import { GoalPill, objectiveOf } from '../components/Goal';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Grid, Button, Checkbox, ConfigProvider, Tag, Tooltip } from 'antd';
import { darkBarTheme } from '../theme';
import { CheckOutlined, DownOutlined, ExportOutlined, HistoryOutlined, PlusOutlined, ReloadOutlined, CalendarOutlined, InfoCircleOutlined, GiftOutlined, SmileOutlined, HomeOutlined, CoffeeOutlined, SunOutlined, ThunderboltOutlined, HeartOutlined, EnvironmentOutlined, PlayCircleOutlined, AppstoreOutlined, PictureOutlined } from '../components/AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import {
  ACCOUNT,
  CREATIVES,
  METRIC_META,
  WINDOW,
  WINDOWS,
  graded,
  money,
  plural,
  recommendationsFor,
  GOALS,
  goalOf,
  type Creative as CreativeT,
  type MetricKey,
  type Recommendation, copyStatus, copiesTitle, platformOf } from '../data/mock';
import { accountOf, findCreative, recName, useStore, type RowStatus } from '../data/store';
import { ideaText, iterationHistory, suggestionParts, type SuggestionParts } from '../data/insights';
import { CarouselArt, Creative } from '../components/Thumb';
import { Placements } from '../components/Placements';
import { GradeTag, OverallTag } from '../components/GradeTag';
import { Body, CreateDialog } from '../components/CreateDialog';
import { timeLeft } from '../components/TasksPanel';
import { Rolling } from '../components/Rolling';
import { HistoryButton } from '../components/LineageDrawer';
import { IterationHistory } from '../components/IterationHistory';
import { SectionHead } from '../components/SectionHead';
import { PageHeader } from '../components/PageHeader';
import { Rating } from '../components/Rating';
import { ReportAudience } from '../components/ReportAudience';
import { duration, ease, fadeUp, pageTransition, spring, stagger } from '../motion/tokens';

/** Persona icons per account (accounts.ts Persona['icon']). */
const PERSONA_ICON: Record<string, React.ReactNode> = {
  gift: <GiftOutlined />,
  calm: <SmileOutlined />,
  home: <HomeOutlined />,
  leaf: <EnvironmentOutlined />,
  run: <ThunderboltOutlined />,
  paw: <HeartOutlined />,
  sun: <SunOutlined />,
  cup: <CoffeeOutlined />,
};

const section = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.cards, delayChildren: 0.05 } },
};

const val = (c: CreativeT, k: MetricKey) => {
  const key = ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[k];
  return METRIC_META[k].unit(c.values[key] ?? 0);
};

/** AD-13 to AD-15: the reading, then what to do. Numbers live in the stat strip below (P3, L-035, R-M9). */
function summary(c: CreativeT, parent?: CreativeT) {
  if (parent) return `Converts better than the original. Let it run before you judge it: about ${money(Math.round(c.spend)).replace(/\.\d\d$/, '')} spent so far.`;
  // C5d-41: the reading follows the ad's goal, like the suggestions (L-146). Goal metric first, then the ones that
  // support it; metrics the goal doesn't care about never drive the sentence (an Awareness ad gets no CPA reading).
  const goal = GOALS[goalOf(c)];
  const toKey: Record<string, MetricKey> = { CPA: 'conversion', ROAS: 'conversion', CTR: 'ctr', Hook: 'hook' };
  const tier = (ts: string[]) => [...new Set(ts.map((t) => toKey[t]))];
  const primary = tier(goal.primary);
  if (primary.includes('hook')) primary.push('retention');
  const order = [...primary, ...tier(goal.supporting).filter((k) => !primary.includes(k))].filter((k) => c.grades[k]);
  const rank = (k: MetricKey) => 'ABCD'.indexOf(c.grades[k]![0]);
  const weak = order.find((k) => rank(k) >= 2);
  if (!weak) {
    const allGood = (Object.keys(METRIC_META) as MetricKey[]).every((k) => !c.grades[k] || rank(k) <= 1);
    return allGood
      ? 'Strong on every graded metric. Use it as the starting point for new variations.'
      : `Strong on what matters for ${goalOf(c).toLowerCase()}. Use it as the starting point for new variations.`;
  }
  return {
    conversion: `Customers click but few ${({ Leads: 'sign up', 'App promotion': 'install' } as Record<string, string>)[goalOf(c)] ?? 'buy'}. Improve what happens after the click, starting with the suggestions below.`,
    ctr: 'Few customers click. Make the ad stop the scroll, starting with the suggestions below.',
    hook: 'Customers scroll past in the first seconds. Change the opening, starting with the suggestions below.',
    retention: 'Customers stop watching early. Tighten the middle of the video, starting with the suggestions below.',
  }[weak];
}

/** Per-suggestion feedback (Mancini, 20 Nov 17:48: rate each one, not the whole list). */
function RateRow() {
  return <Rating question="Was this helpful?" />;
}

/** 5d C5d-13: label + value, no colon. */
const KV = ({ k, v }: { k: string; v: string }) => (
  <span className="kv">
    <span className="kv-k">{k}</span> <span className="kv-v">{v}</span>
  </span>
);

/** Item 4 (R-H, R-I): Suggestion card in four structured parts from suggestionParts(). */
function RecCard({
  parts,
  selected,
  suggested,
  disabled,
  onToggle,
  footer,
}: {
  parts: SuggestionParts;
  selected: boolean;
  suggested: boolean;
  disabled?: boolean;
  onToggle: () => void;
  footer?: { text: string; action?: () => void; running?: boolean };
}) {
  const { diagnosis, evidence, action, apply } = parts;
  const { message } = App.useApp();
  const gradeTag = evidence.grade ? (
    <Tag className={`rec-grade grade-tag g-${evidence.grade[0]}`}>{evidence.grade}</Tag>
  ) : (
    <Tooltip title={`${evidence.metric} isn't graded on this account. Radar grades conversion on ${ACCOUNT.conversionMetric}.`}>
      <Tag className="rec-grade no-grade">No grade</Tag>
    </Tooltip>
  );
  const recTag = suggested && !disabled && (
    <Tooltip title="High priority for this ad's goal.">
      {/* K37 (R-I11, R-C1): neutral tag; orange stays on primary action, progress and selection only. */}
      <Tag className="rec-suggested">Recommended</Tag>
    </Tooltip>
  );
  return (
    <motion.div
      variants={fadeUp}
      className={`rec-card rec-four ${selected ? 'selected' : ''} ${disabled ? 'read-only' : ''}`}
      onClick={disabled ? undefined : onToggle}
      role={disabled ? undefined : 'checkbox'}
      aria-checked={disabled ? undefined : selected}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={(e) => !disabled && (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), onToggle())}
    >
      {/* Part 1: Diagnosis (What's happening) */}
      <div className="rec-part rec-part-diag">
        <div className="rec-diag-left">
          {!disabled && <Checkbox checked={selected} tabIndex={-1} className="rec-check" />}
          {gradeTag}
          <span className="rec-metric">{evidence.metric}</span>
          <span className="rec-issue-text">{diagnosis}</span>
        </div>
        {recTag}
      </div>

      {/* Part 2: Evidence (Metric value vs account average) */}
      <div className="rec-part rec-part-evidence">
        <span className="rec-ev-label">Evidence</span>
        <span className="rec-ev-val">
          {evidence.row.label} <b>{evidence.row.value}</b>
          {evidence.row.note && <span className="muted">{'\u00a0'}· {evidence.row.note}</span>}
        </span>
      </div>

      {/* Part 3: Recommended action (What to change + why + examples) */}
      <div className="rec-part rec-part-action">
        <b className="rec-how">{action.title}</b>
        <p className="rec-why">{action.why}</p>
        {action.examples.length > 0 && (
          <div className="rec-try">
            <span className="t-label">Ideas to try</span>
            <div className="rec-ideas">
              {/* Mancini 10:27: no copy icon; hover says what will be copied. A pill with two or more quoted options is advice, so it doesn't copy. */}
              {action.examples.map((e) => {
                const idea = ideaText(e);
                return idea.copy ? (
                  <Tooltip key={e} title="Copy to clipboard.">
                    <button
                      type="button"
                      className="idea-pill"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void navigator.clipboard?.writeText(idea.copy!);
                        message.success("Copied to clipboard");
                      }}
                    >
                      {idea.label}
                    </button>
                  </Tooltip>
                ) : (
                  <span key={e} className="idea-pill idea-note">
                    {idea.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Part 4: Apply to brief + per-suggestion rating */}
      <div className="rec-part rec-part-apply">
        {!disabled ? (
          <span className={`rec-apply-pill ${selected ? 'on' : ''}`}>
            {selected ? <CheckOutlined aria-hidden /> : <PlusOutlined aria-hidden />}
            <span>{selected ? 'Added to brief' : apply.label}</span>
          </span>
        ) : (
          <span className="t-help">Apply these ideas when creating your next ad.</span>
        )}
        <RateRow />
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
  const { statusOf, jobsFor, startJob, credits: balance, windowDays, jobs: allJobs } = useStore();
  // The grading period set on Radar carries into the ad page (Mancini, 19:00), grades included.
  const c = graded(findCreative(id) ?? CREATIVES[0], windowDays);
  const win = WINDOWS.find((w) => w.days === windowDays) ?? WINDOWS[1];
  const [reportedAud, setReportedAud] = useState<string[]>([]);
  const adHistory = iterationHistory(accountOf(c) as never, windowDays, allJobs, c.id);
  const parent = c.variationOf ? findCreative(c.variationOf) : undefined;
  const s: RowStatus = statusOf(c.id);
  const jobs = jobsFor(c.id);
  const iterable = c.media === 'Image';

  const recs = useMemo(() => recommendationsFor(c), [c]);
  const suggestedIds = recs.slice(0, 2).map((r) => r.id);
  /** Suggestions with a round still running or just made aren't preselected again (Mancini, 18:54). */
  const fresh = (rid: string) =>
    jobs.some((j) => j.recIds.includes(rid) && (j.state === 'generating' || j.state === 'queued' || (j.state !== 'failed' && (j.unseen || j.minutesAgo < 60))));
  // Mancini (18:57): the top 2 are always preselected; the ready status opens results directly instead.
  const preselect = () => (iterable ? recommendationsFor(c).slice(0, 2).map((r) => r.id) : []);
  void fresh;
  const [selected, setSelected] = useState<string[]>(preselect);
  const [adsOpen, setAdsOpen] = useState(true);
  const [openCopy, setOpenCopy] = useState<string | null>(null);
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
    if (j.state === 'generating' || j.state === 'queued') return { text: `Generating ${plural(j.perRec, 'variation')}`, running: true };
    if (j.state === 'failed') return { text: `Couldn't create variations\u00a0· ${j.cost}\u00a0credits returned.` };
    const n = j.variations.filter((v, i) => v.recId === r.id && !j.failed.includes(i)).length;
    if (j.unseen || j.minutesAgo < 60) return { text: `${plural(n, 'variation')} ready`, action: () => viewRound(j.id, r.id) };
    return { text: `${plural(n, 'variation')} made on ${j.date}`, action: () => viewRound(j.id, r.id) };
  };

  const morph = dialog && !!bp.md;
  const create = ({ perRec, size }: { perRec: number; size: string }) => {
    setDialog(false);
    // 5d C5d-10: no start toast; the bar below turns into the progress bar, so the news is said once.
    startJob({ creativeId: c.id, recIds: selected, perRec, size });
  };
  useEffect(() => {
    if (!morph) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setDialog(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [morph]);
  // R-K1 / R-K5: goal metric comes first after Overall, followed by the remaining graded metrics.
  const goalMetric = GOALS[goalOf(c)].metric;
  const gradedMetrics = (Object.keys(METRIC_META) as MetricKey[])
    .filter((k) => c.grades[k])
    .sort((a, b) => (a === goalMetric ? -1 : b === goalMetric ? 1 : 0));

  // E1 (375px) & E2 (1440px): desktop docks inline above suggestions so no card is covered; phones dock compactly at bottom.
  const actionBar = iterable ? (
    <motion.div
      layout
      className={`sticky-bar ${morph ? 'expanded' : ''} ${busy ? 'progressing' : ''}`}
      style={{ borderRadius: bp.md ? 16 : 0 }}
      initial={{ y: bp.md ? 0 : 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: spring.gentle }}
      transition={{ layout: spring.layout }}
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
            <ConfigProvider theme={darkBarTheme}>
              <Body creative={c} recCount={selected.length} picked={recs.filter((r) => selected.includes(r.id))} panel onCancel={() => setDialog(false)} onCreate={create} />
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
              {busy ? (
                <>
                  <span className="bar-progress" aria-hidden>
                    <motion.i animate={{ scaleX: s.kind === 'generating' ? Math.max(0.04, s.progress) : 0.02 }} transition={{ duration: duration.slow, ease: ease.standard }} />
                  </span>
                  {/* K1 (R-T9), K24 (R-M6), K51 (R-L4, R-AI7): "Generating", lowercase after dot, authored phone line. */}
                  <b>{s.kind === 'queued' ? `Queued\u00a0· ${plural(s.count, 'variation')}` : `Generating ${plural(s.count, 'variation')}`}</b>
                  <span className="muted small left">
                    {!bp.md
                      ? s.kind === 'generating'
                        ? `${plural(s.count, 'variation')}\u00a0· ${timeLeft(s.progress)}`
                        : 'Starts when the current round finishes.'
                      : `${s.kind === 'generating' ? `${timeLeft(s.progress).replace(/^./, (x) => x.toUpperCase())}\u00a0· ` : 'Starts when the current round finishes\u00a0· '}you can leave this page. Tasks will tell you when they're ready.`}
                  </span>
                </>
              ) : selected.length === 0 && s.kind === 'ready' ? (
                <>
                  <b>{plural(s.count, 'new variation')} ready</b>
                  {/* K27 (R-M3, R-V2) */}
                  {bp.md && <span className="muted small left">Select more suggestions to create more variations.</span>}
                </>
              ) : selected.length === 0 ? (
                <span>Select a suggestion to create variations</span>
              ) : short_ ? (
                <span>
                  {/* K18 (R-M8) */}
                  Needs {cost}{'\u00a0'}credits. You have {balance.toLocaleString('en-US')}.
                </span>
              ) : (
                <>
                  <b>
                    <Rolling value={selected.length} /> {selected.length === 1 ? 'suggestion' : 'suggestions'} selected
                  </b>
                  {/* E1: hide secondary helper on phones so docked bar stays one compact row. */}
                  {bp.md && <span className="muted small left">Choose how many variations and the size in the next step.</span>}
                </>
              )}
            </div>
            {!busy &&
              (short_ && selected.length ? (
                <Button size="large" onClick={() => message.info("In the live product, this opens billing. It's not part of this prototype.")}>
                  Get credits
                </Button>
              ) : selected.length === 0 && s.kind === 'ready' ? (
                <Button type="primary" size="large" onClick={() => viewRound(s.jobId)}>
                  View variations
                </Button>
              ) : (
                <Button type="primary" size="large" disabled={selected.length === 0} onClick={() => setDialog(true)}>
                  Create variations
                </Button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  ) : null;

  return (
    <motion.div {...pageTransition} className="page detail">
      {/* S-32: one header. The period is read-only here (set on Radar), so it's quiet meta, not a control. */}
      <PageHeader
        crumbs={[{ title: <Link to="/">Radar</Link> }, { title: c.name }]}
        title={c.name}
        desc="See why this ad performs as it does and pick the fixes to try."
        actions={
          <>
            <Tooltip title="Set on Radar. Grades on this page use the same period.">
              <span className="ph-meta">
                <CalendarOutlined /> {win.short}
                {bp.md && <span className="ph-meta-sub">{win.long.split(' · ')[1]}</span>}
              </span>
            </Tooltip>
            <HistoryButton creative={c} size="middle" />
          </>
        }
      />

      <div className="detail-grid">
        <aside className="detail-left">
          <div className="panel creative-panel">
            <SectionHead
              title="Creative"
              action={
                <span className={`media-pill ${c.media.toLowerCase()} ad-media`}>
                  {c.media === 'Video' ? <PlayCircleOutlined /> : c.media === 'Carousel' ? <AppstoreOutlined /> : <PictureOutlined />}
                  {c.media}
                </span>
              }
            />
            {c.media === 'Carousel' ? <CarouselArt c={c} /> : <Creative c={c} layoutId={bp.md ? `creative-${c.id}` : undefined} />}
          </div>

          <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
            <button className="panel-toggle" onClick={() => setAdsOpen((o) => !o)} aria-expanded={adsOpen}>
              {/* Mancini 10:29: the count carries the weight; the rest of the title is regular. */}
              <b className="panel-title copies-title">
                <span className="copies-n">{copiesTitle(c).split(' ')[0]}</span> {copiesTitle(c).split(' ').slice(1).join(' ')}
              </b>
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
                  {/* 5d (Mancini 23:49): the split across all copies comes first, in its own light-fill box, like Radar's copies panel. */}
                  <div className="placement">
                    <Placements items={c.placements} animate />
                  </div>
                  {/* Mancini 09:43: one compact, scrollable list from the start. Each row shows the campaign, spend and CPA;
                      a click opens its details; the arrow jumps to the platform's Ads Manager. No "Show more". */}
                  <div className="copies-scroll" role="list">
                    {c.ads.map((a) => {
                      const open = openCopy === a.id;
                      return (
                        <div key={a.id} className={`copy-row ${open ? 'open' : ''}`} role="listitem">
                          <button type="button" className="copy-row-main" onClick={() => setOpenCopy(open ? null : a.id)} aria-expanded={open}>
                            <i className={`live-dot ${copyStatus(c, a) === 'Paused' ? 'paused' : ''}`} aria-label={copyStatus(c, a)} />
                            <span className="campaign">{a.campaign}</span>
                            <span className="copy-nums">
                              {money(a.spend)}
                              <span className="muted">{'\u00a0'}· {ACCOUNT.conversionMetric} {money(a.cpa)}</span>
                            </span>
                            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy} className="chev">
                              <DownOutlined />
                            </motion.span>
                          </button>
                          <Tooltip title={`Open in ${platformOf(a)} Ads Manager.`}>
                            <Button
                              type="text"
                              size="small"
                              className="icon-only ext-link"
                              icon={<ExportOutlined />}
                              aria-label={`Open in ${platformOf(a)} Ads Manager`}
                              onClick={() => message.info(`In the live product, this opens the ad in ${platformOf(a)} Ads Manager. It's not part of this prototype.`)}
                            />
                          </Tooltip>
                          <AnimatePresence initial={false}>
                            {open && (
                              <motion.div
                                className="ad-fields kv-line"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto', transition: { height: spring.layout, opacity: { duration: duration.fast } } }}
                                exit={{ opacity: 0, height: 0, transition: { duration: duration.fast, ease: ease.exit } }}
                              >
                                <KV k="Platform" v={platformOf(a)} />
                                <KV k="Goal" v={objectiveOf(a)} />
                                <KV k="Audience" v={a.adSet} />
                                <KV k="Ad ID" v={a.id} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* S-46: lineage was said four times (line under the title, Source, Made from this ad, history). Now: Where it came from, then the history. */}
          <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
            <SectionHead title="Where it came from" />
            <dl className="cp-kv">
              {parent ? (
                <>
                  <div><dt>Made in</dt><dd>Atria, as a variation</dd></div>
                  <div><dt>Made from</dt><dd><Link to={`/ad/${parent.id}`}>{parent.name}</Link></dd></div>
                  <div><dt>To fix</dt><dd>{recName(parent.id, 'cta')}</dd></div>
                  <div><dt>Round</dt><dd><Link to={`/ad/${parent.id}/variations?round=job-hero-1`}>Round 1 · Nov 12</Link></dd></div>
                </>
              ) : (
                <>
                  <div><dt>Made in</dt><dd>Outside Atria</dd></div>
                  <div><dt>Synced from</dt><dd>{c.ads[0] ? platformOf(c.ads[0]) : 'Meta'}</dd></div>
                </>
              )}
            </dl>
          </motion.div>
          {/* Mancini 09:43, item 20: the same iteration history as Overview and Radar, limited to this ad and the ads around it. */}
          {adHistory.length > 0 && (
            <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
              <SectionHead title="Iteration history" help="Rounds made from this ad, and how its variations did." />
              <IterationHistory items={adHistory} limit={4} empty="" />
            </motion.div>
          )}
        </aside>

        <motion.section className="detail-right" variants={section} initial="hidden" animate="show">
          {/* Item 8 (R-H, R-K1, R-K5, R-N3): Ad summary card structured in three clear zones. */}
          <motion.div variants={fadeUp} className="panel verdict">
            {/* Zone 1: Identity, goal and live status */}
            <div className="verdict-zone verdict-head">
              <SectionHead title="Summary" bar action={<GoalPill c={c} />} />
            </div>

            {/* Zone 2: Plain-language diagnosis and action */}
            <div className="verdict-zone verdict-reading">
              <p className="verdict-line">{summary(c, parent)}</p>
            </div>

            {/* Zone 3: KPI stat strip (Overall -> goal metric -> other graded metrics -> Spend -> ROAS) */}
            <div className="verdict-zone verdict-metrics">
              <div className="stat-strip">
                <div className="stat stat-primary">
                  <span className="t-label">Overall</span>
                  <span className="stat-val">
                    <OverallTag creative={c} />
                  </span>
                </div>
                {gradedMetrics.map((k, idx) => (
                  <div className={`stat ${idx === 0 && k === goalMetric ? 'stat-goal' : ''}`} key={k}>
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
                  <span className="stat-val">{(c.roas ?? 0).toFixed(2)}</span>
                </div>
              </div>
              <span className="t-help">{bp.md ? "Hover over a grade to see how it's graded." : "Tap a grade to see how it's graded."}</span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="section-title">
            <SectionHead
              bar
              title="Suggestions"
              help={<>Ways to improve this ad, sorted by priority.{iterable && preselect().length === 2 ? ' The top 2 are selected for you.' : ''}</>}
              meta={
                <span className="rec-date">
                  Updated {WINDOW.synced}
                  <Tooltip title="Refresh suggestions.">
                    <Button type="text" size="small" className="icon-only" icon={<ReloadOutlined />} aria-label="Refresh suggestions" onClick={() => message.success('Suggestions are up to date')} />
                  </Tooltip>
                </span>
              }
            />
          </motion.div>

          {parent && (
            <motion.div variants={fadeUp} className="already-tried">
              {/* K23 (R-M7): drop colon. */}
              <HistoryOutlined /> <span>This variation already applies <b>{recName(parent.id, 'cta')}</b></span>
            </motion.div>
          )}


          {recs.map((r) => (
            <RecCard
              key={r.id}
              parts={suggestionParts(c, r, accountOf(c).avg)}
              selected={selected.includes(r.id)}
              suggested={suggestedIds.includes(r.id)}
              disabled={!iterable}
              onToggle={() => toggle(r.id)}
              footer={footerFor(r)}
            />
          ))}

          <motion.div variants={fadeUp} className="panel personas">
            <SectionHead
              bar
              title={
                <>
                  Likely audience{' '}
                  <Tooltip title="Atria's AI reads this from the ad's image and text. It may not be exact.">
                    <InfoCircleOutlined className="title-info" aria-label="About this section" />
                  </Tooltip>
                </>
              }
              help="Who this ad seems to speak to, based on its image and text."
            />
            {/* Persona cards (Mancini, 19:01): the reason is shown, not hidden in a tooltip. */}
            <div className="persona-cards">
              {accountOf(c).personas.map((p) => (
                <div key={p.label} className="persona-card">
                  <span className="persona-avatar" style={{ background: p.tint }}>
                    {PERSONA_ICON[p.icon] ?? <SmileOutlined />}
                  </span>
                  <span className="persona-text">
                    <b>{p.label}</b>
                    <span className="t-help">{p.why}</span>
                    <ReportAudience audience={p.label} reported={reportedAud.includes(p.label)} onReported={() => setReportedAud((x) => [...x, p.label])} />
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>
      </div>
      {iterable && !bp.md && <div className="sticky-spacer" />}

      {/* On desktop the inline bar morphs into the centered create panel; on phones the bar stays docked at bottom. */}
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
      {/* Mancini 09:43: float the bar again, over a white fade, so it morphs into the form. */}
      {iterable && <div className="bar-fade" aria-hidden />}
      {actionBar}

      <CreateDialog
        open={dialog && !bp.md}
        mobile={!bp.md}
        creative={c}
        recCount={selected.length}
        picked={recs.filter((r) => selected.includes(r.id))}
        onClose={() => setDialog(false)}
        onCreate={create}
      />
    </motion.div>
  );
}
