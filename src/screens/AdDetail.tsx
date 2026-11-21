import { GoalPill, objectiveOf } from '../components/Goal';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Breadcrumb, Grid, Button, ConfigProvider, Typography, Tag, Tooltip } from 'antd';
import { darkBarTheme } from '../theme';
import { DownOutlined, ExportOutlined, HistoryOutlined, ReloadOutlined, CalendarOutlined, InfoCircleOutlined, GiftOutlined, SmileOutlined, HomeOutlined, CoffeeOutlined, SunOutlined, ThunderboltOutlined, HeartOutlined, EnvironmentOutlined, PlayCircleOutlined, AppstoreOutlined, PictureOutlined, ExclamationCircleFilled, CheckCircleFilled, CopyOutlined } from '../components/AppIcons';
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
  type Recommendation, copyStatus, copiesTitle, platformOf, TABS } from '../data/mock';
import { accountOf, findCreative, useStore, type RowStatus } from '../data/store';
import { ideaText, iterationHistory, suggestionParts, type SuggestionParts } from '../data/insights';
import { CarouselArt, Creative } from '../components/Thumb';
import { Placements } from '../components/Placements';
import { GradeTag, OverallTag } from '../components/GradeTag';
import { Body, CreateDialog } from '../components/CreateDialog';
import { timeLeft } from '../components/TasksPanel';
import { Rolling } from '../components/Rolling';
import { HistoryButton } from '../components/LineageDrawer';
import { STEP_NOTES, parentIdOf } from '../data/lineage';
import { answers } from '../data/variations';
import { IterationHistory } from '../components/IterationHistory';
import { SectionHead } from '../components/SectionHead';
import { hubCrumb } from '../data/nav';
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
  // 223: compare CPA with the original instead of always saying "better" ("Back in shape" costs more per purchase).
  if (parent) {
    const spent = money(Math.round(c.spend)).replace(/\.\d\d$/, '');
    const a = parent.values.cpa, b = c.values.cpa;
    const verdict = a == null || b == null || a === b ? 'Converts about the same as the ad it was made from.' : b < a ? 'Converts better than the ad it was made from.' : 'Costs more per purchase than the ad it was made from.';
    return `${verdict} Only ${spent} spent, so let it run.`; // 243: shorter so it fits one line at 1504
  }
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

const BAND: Record<string, string> = { A: 'Top', B: 'Above average', C: 'Below average', D: 'Lowest' };

/** 229: "say what makes it different and make one clear offer". Three or more picks are counted instead of listed. */
function roundPhrase(picked: { fix: string }[]) {
  const verb = (f: string) => f.replace(/\u00a0/g, ' ').replace(/^./, (ch) => ch.toLowerCase());
  if (picked.length === 1) return verb(picked[0].fix);
  if (picked.length === 2) return `${verb(picked[0].fix)} and ${verb(picked[1].fix)}`;
  return `apply your ${picked.length} suggestions`;
}

/** Item 4 (R-H, R-I): Suggestion card in four structured parts from suggestionParts(). */
function RecCard({
  parts,
  selected,
  suggested,
  disabled,
  onToggle,
  footer,
  index,
}: {
  index: number;
  parts: SuggestionParts;
  selected: boolean;
  suggested: boolean;
  disabled?: boolean;
  onToggle: () => void;
  footer?: { text: string; action?: () => void; running?: boolean };
}) {
  const { diagnosis, evidence, action } = parts;
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
      className={`rec-card rec-four ${selected ? 'selected' : ''} ${disabled ? 'read-only' : ''} ${suggested && !disabled ? 'is-recommended' : ''}`}
      onClick={disabled ? undefined : onToggle}
      role={disabled ? undefined : 'checkbox'}
      aria-checked={disabled ? undefined : selected}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={(e) => !disabled && (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), onToggle())}
    >
      {/* Part 1: Diagnosis (What's happening) */}
      <div className="rec-part rec-part-diag">
        <div className="rec-diag-left">
          <span className="rec-num" aria-hidden>{index}</span>
          {gradeTag}
          <span className="rec-metric">{evidence.metric}</span>
          {/* 220 (Mancini 15:58): the suggested action leads the card; the problem it answers sits in the body. */}
          <span className="rec-issue-text rec-action-text">{action.title}</span>
          {/* Mancini 15:33: the tag belongs to the suggestion, so it sits after its text, away from the button. */}
          {recTag}
        </div>
        <span className="rec-diag-right">
          {/* Mancini 14:47: a Pick button instead of a checkbox. The whole card still toggles, so this is its visible state. */}
          {!disabled && (
            <span className={`pick-chip ${selected ? 'on' : ''}`} aria-hidden>
              {selected && <CheckCircleFilled className="pick-tick" />}
              {selected ? 'Selected' : 'Select'}
            </span>
          )}
        </span>
      </div>

      {/* Part 2: the problem, the evidence for it, why it matters and ideas to try. */}
      <div className="rec-part rec-part-action">
        <b className="rec-how">{diagnosis}</b>
        <p className="rec-ev-line">
          <span className="rec-ev-label">Evidence</span>{' '}
          {evidence.row.label} <b>{evidence.row.value}</b>
          {evidence.row.note && <span className="muted">{'\u00a0'}· {evidence.row.note}</span>}
        </p>
        <p className="rec-why">{action.why}</p>
        {action.examples.length + action.visuals.length > 0 && (
          <div className="rec-try">
            <span className="t-label">Ideas to try</span>
            <div className="rec-ideas">
              {/* Mancini 10:27: no copy icon; hover says what will be copied. A pill with two or more quoted options is advice, so it doesn't copy.
                  226 (Mancini 16:00): copy ideas carry a text icon and creative ideas an image icon; a creative idea copies its whole line for the brief. */}
              {[...action.examples.map((e) => ({ e, kind: 'copy' as const })), ...action.visuals.map((e) => ({ e, kind: 'visual' as const }))].map(({ e, kind }) => {
                // 253 (Mancini 16:24): only words to put in the ad copy on click (a filled chip). Directions and image ideas are
                // plain sentences in an outlined box that doesn't copy.
                const idea = kind === 'visual' ? { label: e, copy: null } : ideaText(e);
                const icon = idea.copy ? <CopyOutlined className="idea-kind" aria-hidden /> : null;
                return idea.copy ? (
                  <Tooltip key={e} title="Copy to clipboard">
                    <button
                      type="button"
                      className={`idea-pill idea-${kind}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void navigator.clipboard?.writeText(idea.copy!);
                        message.success("Copied to clipboard");
                      }}
                    >
                      {icon}
                      {idea.label}
                    </button>
                  </Tooltip>
                ) : (
                  <span key={e} className={`idea-pill idea-note idea-${kind}`}>
                    {icon}
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
          // Mancini 14:38: the checkbox in the card's header already says picked or not. One control, one place.
          <span className="t-help">{selected ? 'Included in the next round.' : 'Not in the next round.'}</span>
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
  const hub = hubCrumb();
  const nav = useNavigate();
  const { statusOf, jobsFor, startJob, credits: balance, windowDays, jobs: allJobs } = useStore();
  // The grading period set on Radar carries into the ad page (Mancini, 19:00), grades included.
  const c = graded(findCreative(id) ?? CREATIVES[0], windowDays);
  const win = WINDOWS.find((w) => w.days === windowDays) ?? WINDOWS[1];
  const [reportedAud, setReportedAud] = useState<string[]>([]);
  // 224 (Mancini 15:59, 16:00): the left column says what this ad was made from; ads made from it get their own section on the right.
  const madeFromHistory = iterationHistory(accountOf(c) as never, windowDays, allJobs, c.id, 'from');
  const madeHereHistory = iterationHistory(accountOf(c) as never, windowDays, allJobs, c.id, 'made');
  // 231: the parent is the step this ad was actually made from (its history note), not always the original.
  const parentId = parentIdOf(c);
  const parent = parentId ? findCreative(parentId) : undefined;
  // 254: the first ad of this ad's chain.
  const rootId = (() => {
    let id = c.id;
    for (let g = 0, p = parentIdOf(c); p && g < 12; g++) { id = p; const pc = findCreative(p); p = pc ? parentIdOf(pc) : undefined; }
    return id === c.id ? undefined : id;
  })();
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
  // Mancini 15:31: when the last round failed, the bar says so first. Picking a suggestion goes back to the normal bar.
  const [failSeen, setFailSeen] = useState(false);
  const failedJob = s.kind === 'failed' && !failSeen ? jobs.find((j) => j.id === s.jobId) : undefined;
  const toggle = (rid: string) => {
    setFailSeen(true);
    setSelected((p) => (p.includes(rid) ? p.filter((x) => x !== rid) : [...p, rid]));
  };
  const viewRound = (jobId: string, rec?: string) => nav(`/ad/${c.id}/variations?round=${jobId}${rec ? `&rec=${rec}` : ''}`);

  /** AD-21e/f/g: footer per recommendation from its latest round. */
  const footerFor = (r: Recommendation) => {
    const j = jobs.filter((x) => x.recIds.includes(r.id)).at(-1);
    if (!j) return undefined;
    if (j.state === 'generating' || j.state === 'queued') return { text: `Creating ${plural(j.perRec, 'creative')}`, running: true };
    if (j.state === 'failed') return { text: `Failed to create\u00a0· ${j.cost}\u00a0credits returned` };
    const n = j.variations.filter((v, i) => answers(v, r.id) && !j.failed.includes(i)).length; // 250: combined variations count for each suggestion they answer
    if (j.unseen || j.minutesAgo < 60) return { text: `${plural(n, 'creative')} ready`, action: () => viewRound(j.id, r.id) };
    return { text: `${plural(n, 'creative')} made on ${j.date}`, action: () => viewRound(j.id, r.id) };
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
    // 247 (Mancini 16:17): the page behind the open form doesn't scroll. The scrollbar's width is kept so nothing shifts.
    const root = document.documentElement;
    const gap = window.innerWidth - root.clientWidth;
    const prev = { overflow: root.style.overflow, pad: root.style.paddingRight };
    root.style.overflow = 'hidden';
    if (gap > 0) root.style.paddingRight = `${gap}px`;
    return () => {
      window.removeEventListener('keydown', esc);
      root.style.overflow = prev.overflow;
      root.style.paddingRight = prev.pad;
    };
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
      className={`sticky-bar ${morph ? 'expanded' : ''} ${busy ? 'progressing' : ''} ${failedJob && !morph ? 'failed' : ''}`}
      style={{ borderRadius: !bp.md ? '16px 16px 0 0' : morph ? 16 : 32 }}
      initial={{ y: bp.md ? 0 : 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: spring.gentle }}
      transition={{ layout: spring.layout }}
      role={morph ? 'dialog' : undefined}
      aria-label={morph ? 'Create creatives' : undefined}
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
              <Body creative={c} recCount={selected.length} picked={recs.filter((r) => selected.includes(r.id))} panel onCancel={() => setDialog(false)} onCreate={create} onRemove={toggle} />
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
                  <b>{s.kind === 'queued' ? `Queued\u00a0· ${plural(s.count, 'creative')}` : `Creating ${plural(s.count, 'creative')}`}</b>
                  <span className="muted small left">
                    {!bp.md
                      ? s.kind === 'generating'
                        ? `${plural(s.count, 'creative')}\u00a0· ${timeLeft(s.progress)}`
                        : 'Starts when the current round finishes.'
                      : `${s.kind === 'generating' ? `${timeLeft(s.progress).replace(/^./, (x) => x.toUpperCase())}\u00a0· ` : 'Starts when the current round finishes\u00a0· '}you can leave this page. Notifications will tell you when they're ready.`}
                  </span>
                </>
              ) : failedJob ? (
                <>
                  <b className="bar-fail-title">
                    <ExclamationCircleFilled aria-hidden /> Failed to create variations
                  </b>
                  <span className="muted small left">{failedJob.cost}{'\u00a0'}credits were returned to you.</span>
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
                  {c.media === 'Image' ? (
                    // 229 (Mancini 16:03): image ads read as one sentence, "Create 8 variations that ...", using the picked actions.
                    bp.md ? (
                      <b className="bar-sentence">
                        Create <Rolling value={total} /> {total === 1 ? 'creative' : 'creatives'} that {roundPhrase(recs.filter((r) => selected.includes(r.id)))}
                      </b>
                    ) : (
                      // 232 (Mancini 16:07): phones use the short form so the bar stays one line.
                      <b className="bar-sentence">
                        <Rolling value={total} /> {total === 1 ? 'creative' : 'creatives'} from {plural(selected.length, 'suggestion')}
                      </b>
                    )
                  ) : (
                    <b>
                      <Rolling value={selected.length} /> {selected.length === 1 ? 'suggestion' : 'suggestions'} selected
                    </b>
                  )}
                  {/* Mancini 14:47: the bar says what the round will be, as in mock B. Phones keep one compact row. */}
                  {bp.md && (c.media === 'Image' ? <span className="muted small left">{cost} of {balance.toLocaleString('en-US')} credits</span> : <span className="muted small left">{plural(total, 'creative')}{'\u00a0'}· {cost} of {balance.toLocaleString('en-US')} credits</span>)}
                </>
              )}
            </div>
            {!busy &&
              (failedJob ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={() => {
                    setSelected(failedJob.recIds);
                    setFailSeen(true);
                    setDialog(true);
                  }}
                >
                  Try again
                </Button>
              ) : short_ && selected.length ? (
                <Button size="large" onClick={() => message.info("In the live product, this opens billing. It's not part of this prototype.")}>
                  Get credits
                </Button>
              ) : selected.length === 0 && s.kind === 'ready' ? (
                <Button type="primary" size="large" onClick={() => viewRound(s.jobId)}>
                  View variations
                </Button>
              ) : (
                <Button type="primary" size="large" disabled={selected.length === 0} onClick={() => setDialog(true)}>
                  Create creatives
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
      {/* Mancini 14:56 (mock B): the image leads on the left; chips, the ad's name and the reading sit beside it.
          The top row keeps only the breadcrumb and the read-only period. */}
      <header className="ph ad-top">
        <Breadcrumb className="ph-crumbs" items={[{ title: <Link to={hub.to}>{hub.label}</Link> }, { title: c.name }]} />
        <div className="ph-actions">
          <>
            <Tooltip title="Set on Radar. Grades on this page use the same period.">
              <span className="ph-meta">
                <CalendarOutlined /> {win.short}
                {bp.md && <span className="ph-meta-sub">{win.long.split(' · ')[1]}</span>}
              </span>
            </Tooltip>
            <HistoryButton creative={c} size="middle" />
          </>
        </div>
      </header>

      <div className="detail-grid">
        <aside className="detail-left">
          <div className="creative-panel creative-bare">
            <span className={`media-pill ${c.media.toLowerCase()} ad-media on-art`}>
              {c.media === 'Video' ? <PlayCircleOutlined /> : c.media === 'Carousel' ? <AppstoreOutlined /> : <PictureOutlined />}
              {c.media}
            </span>
            {c.media === 'Carousel' ? <CarouselArt c={c} /> : <Creative c={c} layoutId={bp.md ? `creative-${c.id}` : undefined} />}
          </div>

          <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
            <button className="panel-toggle" onClick={() => setAdsOpen((o) => !o)} aria-expanded={adsOpen}>
              {/* Mancini 10:29: the count carries the weight; the rest of the title is regular. */}
              {/* Mancini 14:42: the plain sentence was flat. Title says what the card is; the live count and spend sit beside it. */}
              <b className="panel-title copies-title">Where it runs</b>
              <span className="copies-meta">
                <i className="live-dot" aria-hidden /> {copiesTitle(c).replace(' of this ad', '')}
                <span className="copies-spend">{money(c.spend).replace(/\.\d\d$/, '')}</span>
              </span>
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
                          <Tooltip title={`Open in ${platformOf(a)} Ads Manager`}>
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
                  {/* Mancini 14:27: "Made in" read oddly. "Source" uses the same values as Radar's Source filter. */}
                  <div><dt>Source</dt><dd>Created in Atria</dd></div>
                  <div><dt>Made from</dt><dd><Link to={`/ad/${parent.id}`}>{parent.name}</Link></dd></div>
                  {STEP_NOTES[c.id]?.reason && <div><dt>To fix</dt><dd>{STEP_NOTES[c.id].reason}</dd></div>}
                </>
              ) : (
                <>
                  {/* Mancini 15:34: one fact, not two. The ad was made outside Atria and came in with the account sync. */}
                  <div><dt>Source</dt><dd>{c.ads[0] ? platformOf(c.ads[0]) : 'Meta'}</dd></div>
                </>
              )}
            </dl>
          </motion.div>
          {/* Mancini 15:34: audience is context about the ad, not something to act on, so it sits with the other facts on the left and reads as rows, not cards. */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel personas personas-side">
            <SectionHead
              title={
                <>
                  Likely audience{' '}
                  <Tooltip title="Atria's AI reads this from the ad's image and text. It may not be exact.">
                    <InfoCircleOutlined className="title-info" aria-label="About this section" />
                  </Tooltip>
                </>
              }
              help="Who this ad seems to speak to. Atria reads this from its image and text."
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
                  </span>
                  {/* Mancini 14:56: the report action sits on the right of the card, out of the reading line. */}
                  <ReportAudience audience={p.label} reported={reportedAud.includes(p.label)} onReported={() => setReportedAud((x) => [...x, p.label])} />
                </div>
              ))}
            </div>
          </motion.div>
          {/* Mancini 09:43, item 20: the same iteration history as Overview and Radar, limited to this ad and the ads around it. */}
          {/* 254: always shown. Ads made in Atria list the chain from its original; an original gets an empty state. */}
          <motion.div className="panel" variants={fadeUp} initial="hidden" animate="show">
            <SectionHead title="Iteration history" help={madeFromHistory.length > 0 ? 'The ads this one was made from and how each step did against the one before.' : undefined} />
            {madeFromHistory.length > 0 ? (
              <IterationHistory items={madeFromHistory} limit={6} empty="" resultsLabel={null} currentId={c.id} originalId={rootId} />
            ) : (
              <p className="t-help ih-empty-first">This is the first ad. It wasn't made from another ad.</p>
            )}
          </motion.div>
        </aside>

        <motion.section className="detail-right" variants={section} initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="ad-title">
            <div className="ph-eyebrow">
          <>
            {/* Mancini 14:47: the ad's group and goal as pill chips above its name, as in mock B. */}
            <span className={`state-chip tone-${c.tab}`}>
              <i aria-hidden />
              {TABS.find((t) => t.key === c.tab)?.label ?? 'Not graded'}
            </span>
            <GoalPill c={c} />
          </>
            </div>
            <Typography.Title level={1} className="page-title">
              {c.name}
            </Typography.Title>
            {/* The reading is this page's one line under the title: it says what is wrong and where to look. */}
            <p className="ad-lead">{summary(c, parent)}</p>
          </motion.div>
          {/* Item 8 (R-H, R-K1, R-K5, R-N3): Ad summary card structured in three clear zones. */}
          <motion.div variants={fadeUp} className="panel verdict">
            {/* Zone 1: Identity, goal and live status */}
            {/* Mancini 14:47 (mock B's structure on A's tokens): the reading leads the card as its headline; no "Summary" label. */}
            {/* Zone 3: KPI stat strip (Overall -> goal metric -> other graded metrics -> Spend -> ROAS) */}
            <div className="verdict-zone verdict-metrics">
              <div className="stat-strip">
                <div className="stat stat-primary">
                  <span className="t-label">Overall</span>
                  <span className="stat-val">
                    <OverallTag creative={c} />
                  </span>
                  <span className="t-help stat-note">{c.overall ? BAND[c.overall[0]] : 'Not graded'}</span>
                </div>
                {gradedMetrics.map((k, idx) => {
                  const meta = METRIC_META[k];
                  return (
                    <div className={`stat ${idx === 0 && k === goalMetric ? 'stat-goal' : ''}`} key={k}>
                      <span className="t-label">{meta.label}</span>
                      {/* Mancini 15:43: the value with its grade beside it. The band bars were removed: they showed the letter again, not a measurement. */}
                      <span className="stat-val stat-val-graded">
                        {val(c, k)}
                        <GradeTag creative={c} metric={k} />
                      </span>
                      <span className="t-help stat-note">Average {meta.unit(accountOf(c).avg[meta.avgKey])}</span>
                    </div>
                  );
                })}
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
              help="Ways to improve this ad in order of priority."
              meta={
                <span className="rec-date">
                  Updated {WINDOW.synced}
                  <Tooltip title="Refresh suggestions">
                    <Button type="text" size="small" className="icon-only" icon={<ReloadOutlined />} aria-label="Refresh suggestions" onClick={() => message.success('Suggestions are up to date')} />
                  </Tooltip>
                </span>
              }
            />
          </motion.div>

          {/* 242 (Mancini 16:14): the "Already applied" note is gone. What this ad changed is in "Where it came from" and "Iteration history". */}
          {/* 259 (Mancini 17:36): video and carousel ads can't make new creatives yet; say so where the suggestions are. */}
          {!iterable && (
            <p className="media-note" role="note">
              <PictureOutlined aria-hidden />
              <span>
                <b>Only image ads can make new creatives for now.</b> Apply these suggestions to this {c.media.toLowerCase()} ad in Meta.
              </span>
            </p>
          )}


          {recs.map((r, i) => (
            <RecCard
              key={r.id}
              index={i + 1}
              parts={suggestionParts(c, r, accountOf(c).avg)}
              selected={selected.includes(r.id)}
              suggested={suggestedIds.includes(r.id)}
              disabled={!iterable}
              onToggle={() => toggle(r.id)}
              footer={footerFor(r)}
            />
          ))}

          {madeHereHistory.length > 0 && (
            <>
              <motion.div variants={fadeUp} className="section-title made-here-head">
                <SectionHead bar title="Made from this ad" help="Rounds made from this ad, and how the ads made from it did in Meta." />
              </motion.div>
              <motion.div variants={fadeUp} className="panel made-here">
                <IterationHistory items={madeHereHistory} limit={6} empty="" />
              </motion.div>
            </>
          )}

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
            // 230 (Mancini 16:07): the page behind stays blocked while the form is open (reverts 228); a click outside closes it.
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
        onRemove={toggle}
        onClose={() => setDialog(false)}
        onCreate={create}
      />
    </motion.div>
  );
}
