import type { ReactNode } from 'react';
import { useEffect, useState, type HTMLAttributes } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PopSheet, usePeriodSheet } from '../components/PopSheet';
import { Progress, App, Tag, Badge, Button, Checkbox, Drawer, Empty, Grid, Popover, Select, Table, Tabs, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FilterOutlined, DownOutlined, CloseOutlined, ExportOutlined, CalendarOutlined, QuestionCircleOutlined, PlayCircleOutlined, AppstoreOutlined, PictureOutlined, BranchesOutlined, HistoryOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, GOALS, goalOf, glue, METRIC_META, RELIABLE_SPEND, TABS, WINDOWS, copiesLabel, copyStatus, copiesTitle, platformOf, graded, money, sourceOf, statusOf as adStatusOf, plural, type Creative, type MetricKey } from '../data/mock';
import { ALL_CREATIVES, DEMO_ACCOUNTS } from '../data/store';
import { GOAL_ICON } from '../components/Goal';
import { useStore } from '../data/store';
import { Thumb } from '../components/Thumb';
import { GradeTag, OverallTag } from '../components/GradeTag';
import { StatusCell } from '../components/StatusCell';
import { IterationHistory } from '../components/IterationHistory';
import { iterationHistory } from '../data/insights';
import { duration, ease, fadeUp, listDelay, pageTransition, spring } from '../motion/tokens';

type TabKey = (typeof TABS)[number]['key'];

/**
 * "Where it runs" (reworked Mancini 10:41, after foundey.com/blog/popover-ux): one concept, no scrolling, one clear next step.
 * The popover answers "where is this ad running and how is each copy doing". Per-copy details (audience, frequency, ID,
 * Ads Manager link) live in the ad page's copies panel, one click away. Desktop: popover. Phones: bottom sheet, same content.
 */
const RUNS_MAX = 4;
function WhereItRuns({ c, mobile }: { c: Creative; mobile: boolean }) {
  const [open, setOpen] = useState(false);
  const go = useNavigate();
  const { message } = App.useApp();
  const paused = c.ads.filter((a) => copyStatus(c, a) === 'Paused').length;
  const single = c.ads.length === 1;
  // Name the platform on each row only when this ad runs on more than one (Meta and TikTok).
  const mixed = new Set(c.ads.map(platformOf)).size > 1;
  const sorted = [...c.ads].sort((x, y) => y.spend - x.spend);
  const shown = sorted.slice(0, RUNS_MAX);
  const more = sorted.length - shown.length;
  const places = [...c.placements].sort((x, y) => y.share - x.share);
  const top = places.slice(0, 3).map((p) => `${p.label} ${Math.round(p.share * 100)}%`);
  const placeLine = places.length > 3 ? `${top.join(' · ')} · ${places.length - 3} more` : top.join(' · ');
  const openAd = () => {
    setOpen(false);
    go(`/ad/${c.id}`);
  };
  const body = (
    <div className="runs2" onClick={(e) => e.stopPropagation()}>
      <ul className="runs2-list">
        {shown.map((a) => {
          const st = copyStatus(c, a);
          const share = a.spend / c.spend;
          return (
            <li key={a.id} className="runs2-row">
              <i className={`live-dot ${st === 'Paused' ? 'paused' : ''}`} aria-label={st} />
              <span className="runs2-name">{a.campaign}</span>
              {!single && <span className="runs2-share">{Math.round(share * 100)}%</span>}
              <span className="runs2-meta">
                {mixed ? `${platformOf(a)} · ` : ''}
                {money(a.spend).replace(/\.\d\d$/, '')} · CPA {money(a.cpa)}
                {st === 'Paused' ? ' · Paused' : ''}
              </span>
              {!single && (
                <span className="runs2-bar" aria-hidden>
                  <i style={{ width: `${Math.max(share * 100, 2)}%` }} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {more > 0 && <p className="t-help runs2-more">And {plural(more, 'more copy', 'more copies')} on the ad page.</p>}
      <p className="t-help runs2-places">
        <span className="t-label">Placements</span> {placeLine}
      </p>
      {paused > 0 && <p className="t-help runs2-note">Paused copies still count toward this ad's grades.</p>}
      <div className="runs2-actions">
      <Button type={mobile ? 'primary' : 'default'} block={mobile} size={mobile ? 'large' : 'middle'} className="runs2-cta" onClick={openAd}>
        See copy details
      </Button>
      {/* One copy: its Ads Manager link, named after the platform it runs on (Meta or TikTok). */}
      {single && (
        <Button type="link" size="small" className="inline-link runs2-out" icon={<ExportOutlined />} iconPlacement="end" onClick={() => message.info(`In the live product, this opens the ad in ${platformOf(c.ads[0])} Ads Manager. It's not part of this prototype.`)}>
          Open in {platformOf(c.ads[0])} Ads Manager
        </Button>
      )}
      </div>
    </div>
  );
  const title = copiesTitle(c);
  const trigger = (
    <button
      className="copies-link"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        if (mobile) setOpen(true);
      }}
    >
      {copiesLabel(c)}
    </button>
  );
  if (mobile)
    return (
      <>
        {trigger}
        <Drawer open={open} onClose={() => setOpen(false)} placement="bottom" size="auto" title={title} className="runs-sheet" styles={{ body: { paddingTop: 4 } }}>
          {body}
        </Drawer>
      </>
    );
  return (
    <Popover content={body} title={title} trigger="click" placement="rightTop" arrow={{ pointAtCenter: true }} open={open} onOpenChange={setOpen} classNames={{ root: 'runs-pop runs-pop2' }}>
      {trigger}
    </Popover>
  );
}

function NameCell({ c, morph = true, mobile = false, meta, aside }: { c: Creative; morph?: boolean; mobile?: boolean; meta?: ReactNode; aside?: ReactNode }) {
  const parent = c.variationOf ? ALL_CREATIVES.find((x) => x.id === c.variationOf) : null;
  const go = useNavigate();
  return (
    <div className="name-cell">
      <Thumb c={c} layoutId={morph ? `creative-${c.id}` : undefined} />
      <div className="name-text">
        <div className="name-line">
          {/* G1 (R-L): glue last words and keep middle dot bound so names never break right after "·". */}
          <span className="name clamp2">{mobile ? glue(c.name).replace(/\u00a0· /g, '\u00a0·\u00a0') : c.name}</span>
        </div>
        {/* Mancini 09:43, item 20: "Variation 2" didn't say what it came from or look clickable. Name the parent and link to it. */}
        {parent && (
          <button
            type="button"
            className="made-from"
            onClick={(e) => {
              e.stopPropagation();
              go(`/ad/${parent.id}`);
            }}
          >
            <BranchesOutlined aria-hidden />
            <span className="made-from-text">
              Made from <b>{parent.name}</b>
            </span>
          </button>
        )}
        <div className="name-sub">
          {/* Media type back on the row (Mancini, 19:05): only image ads can get variations, so the type has to read at a glance. */}
          <span className={`media-pill ${c.media.toLowerCase()}`}>
            {c.media === 'Video' ? <PlayCircleOutlined /> : c.media === 'Carousel' ? <AppstoreOutlined /> : <PictureOutlined />}
            {c.media}
          </span>
          <WhereItRuns c={c} mobile={mobile} />
        </div>
        {meta}
      </div>
      {aside}
    </div>
  );
}

const MotionRow = (props: HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string; index?: number }) => {
  const i = Number(props['data-index' as keyof typeof props] ?? 0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onDrag, onDragStart, onDragEnd, onAnimationStart, ...rest } = props as never as Record<string, never>;
  return (
    <motion.tr
      {...(rest as object)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(i) } }}
    />
  );
};

// K15 (R-E9): one owner for the $10,000 accuracy point — omit here when the page Alert/meter already says it.
const howGrading = (lowSpend: boolean) => (
  <div className="grade-pop how-pop">
    <p>Radar compares each ad with the other ads in this account, one metric at a time. Ads that spend more count for more.</p>
    <div className="how-scale">
      {(['A', 'B', 'C', 'D'] as const).map((g) => (
        <span key={g}>
          <Tag className={`grade-tag g-${g}`}>{g}</Tag> {({ A: 'Top', B: 'Above average', C: 'Below average', D: 'Lowest' } as const)[g]}
        </span>
      ))}
    </div>
    <p>Overall is the average of an ad's grades. A plus or minus means it sits between two letters, so C+ is close to a&nbsp;B.</p>
    <p>Hook and retention apply to video ads&nbsp;only.</p>
    <p>Purchases count within the attribution window set in each ad account, such as 7 days after a click or 1 day after a&nbsp;view.</p>
    <p className="grade-pop-meta">Grades rank ads against each other in this account, so they show where an ad stands today, not how it will do next.{lowSpend ? '' : ' They are most accurate when an account spends over $10,000 a\u00a0month.'}</p>
  </div>
);

/** One component for grade accuracy (Mancini 09:43, item 19). Above about $3,000 a month it shows progress
 *  toward $10,000; below that, the same card without the bar, since the bar would barely move. */
const GradingNote = ({ spend }: { spend: number }) => {
  const showBar = spend >= RELIABLE_SPEND * 0.3;
  const amount = (n: number) => money(n).replace('.00', '');
  return (
    <div className="grading-note">
      <div className="grading-note-head">
        <span className="grading-note-title">Grades are most accurate above {amount(RELIABLE_SPEND)}{"\u00a0"}a&nbsp;month</span>
        {showBar && (
          <span className="data-meter-num">
            <b>{amount(spend)}</b> of {amount(RELIABLE_SPEND)} a month
          </span>
        )}
      </div>
      {showBar && <Progress percent={Math.round((spend / RELIABLE_SPEND) * 100)} showInfo={false} size="small" strokeColor="#f66c30" />}
      <span className="t-help">This account spends less, so grades may change as more data comes in.</span>
    </div>
  );
};

/** Column header with a one-sentence definition (RA-21, RA-23, RA-24). */
const Head = ({ label, tip }: { label: string; tip: string }) => (
  <Tooltip title={tip}>
    <span className="col-head">{label}</span>
  </Tooltip>
);
const metricCol = (k: MetricKey, key: string, width: number) => ({
  title: <Head label={METRIC_META[k].label} tip={METRIC_META[k].tip} />,
  key,
  width,
  render: (_: unknown, c: Creative) => <GradeTag creative={c} metric={k} />,
});

const FILTER_GROUPS: { label: string; options: string[] }[] = [
  { label: 'Media', options: ['Image', 'Video', 'Carousel'] },
  { label: 'Platform', options: ['Meta', 'TikTok'] },
  { label: 'Ad status', options: ['Active', 'Paused'] },
  { label: 'Source', options: ['Uploaded', 'Created in Atria'] },
];

type Picked = Record<string, string[]>;

/** Icon-only Filters button (L-059). Compact rows; campaigns are searched, not listed (Mancini, 20 Nov 17:01). */
function FiltersButton({ campaigns, placements, goals, picked, setPicked, popOpen, setPopOpen }: { campaigns: string[]; placements: string[]; goals: string[]; picked: Picked; setPicked: (p: Picked) => void; popOpen: boolean; setPopOpen: (v: boolean) => void }) {
  const total = Object.values(picked).flat().length;
  const row = (g: { label: string; options: string[] }) => (
    <div key={g.label} className="filters-row">
      <div className="filters-label t-label">{g.label}</div>
      <Checkbox.Group
        value={picked[g.label] ?? []}
        onChange={(v) => setPicked({ ...picked, [g.label]: v as string[] })}
        options={g.options.map((o) => ({ label: o, value: o }))}
      />
    </div>
  );
  const content = (
    <div className="filters-pop compact">
      {row(FILTER_GROUPS[0])}
      {row(FILTER_GROUPS[1])}
      {/* Goal row (chat 5c): only the goals this account's ads use. */}
      {row({ label: 'Goal', options: goals })}
      <div className="filters-row">
        <div className="filters-label t-label">Campaign</div>
        <Select
          mode="multiple"
          allowClear
          showSearch
          placeholder="Search campaigns"
          value={picked.Campaign ?? []}
          onChange={(v) => setPicked({ ...picked, Campaign: v })}
          options={campaigns.map((cmp) => ({ label: cmp, value: cmp }))}
          className="filters-search"
          maxTagCount="responsive"
          getPopupContainer={(n) => n.parentElement ?? document.body}
        />
      </div>
      <div className="filters-row">
        <div className="filters-label t-label">Placement</div>
        <Select
          mode="multiple"
          allowClear
          showSearch
          placeholder="Search placements"
          value={picked.Placement ?? []}
          onChange={(v) => setPicked({ ...picked, Placement: v })}
          options={placements.map((pl) => ({ label: pl, value: pl }))}
          className="filters-search"
          maxTagCount="responsive"
          getPopupContainer={(n) => n.parentElement ?? document.body}
        />
      </div>
      {FILTER_GROUPS.slice(2).map(row)}
      <div className="filters-foot">
        <Button size="small" type="text" disabled={!total} onClick={() => setPicked({})}>
          Clear all
        </Button>
      </div>
    </div>
  );
  return (
    <PopSheet content={content} sheetTitle="Filters" trigger="click" placement="bottomRight" open={popOpen} onOpenChange={setPopOpen}>
      <span className="filters-trigger">
      <Badge count={total} size="small" color="#f66c30">
        {/* 5c A-25: the name tooltip hides while the panel it names is open. */}
        <Tooltip title="Filters" open={popOpen ? false : undefined}>
          <Button icon={<FilterOutlined />} aria-label="Filters" className="filters-btn" />
        </Tooltip>
      </Badge>
      </span>
    </PopSheet>
  );
}

/** Active filters as light orange pills; on phones collapse extra pills into a "+N" chip (Item 5). */
function ActiveFilters({
  picked,
  setPicked,
  panelOpen,
  mobile,
  onOpenFilters,
}: {
  picked: Picked;
  setPicked: (p: Picked) => void;
  panelOpen: boolean;
  mobile: boolean;
  onOpenFilters: () => void;
}) {
  const items = Object.entries(picked).flatMap(([g, vs]) => vs.map((v) => ({ g, v })));
  const shown = mobile && items.length > 2 ? items.slice(0, 2) : items;
  const hiddenCount = items.length - shown.length;
  return (
    <AnimatePresence initial={false}>
      {items.length > 0 && (
        <motion.div className="active-filters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.fast }}>
          {shown.map(({ g, v }) => (
            <span key={`${g}-${v}`} className="filter-pill">
              {g === 'Media' ? v : `${g} ${v}`}
              <button aria-label={`Remove ${v}`} onClick={() => setPicked({ ...picked, [g]: picked[g].filter((x) => x !== v) })}>
                <CloseOutlined />
              </button>
            </span>
          ))}
          {hiddenCount > 0 && (
            <button type="button" className="filter-pill filter-more" onClick={onOpenFilters} aria-label={`Show ${hiddenCount} more active filters`}>
              +{hiddenCount}
            </button>
          )}
          {/* 5e Gm-15: one "Clear all" at a time. While the Filters panel is open, its own footer has it. */}
          {!panelOpen && (
            <Button type="link" size="small" className="inline-link clear-all" onClick={() => setPicked({})}>
              Clear all
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Radar() {
  const nav = useNavigate();
  const bp = Grid.useBreakpoint();
  const cards = !bp.md; // below tablet width
  const { statusOf, accountId, windowDays, setWindowDays, jobs } = useStore();
  const { message } = App.useApp();
  const account = DEMO_ACCOUNTS.find((a) => a.id === accountId) ?? DEMO_ACCOUNTS[0];
  // Grades follow the window: changing it re-grades every ad (mock: a few move).
  const CREATIVES = account.creatives.map((c) => graded(c, windowDays));
  const win = WINDOWS.find((w) => w.days === windowDays) ?? WINDOWS[1];
  const changeWindow = (days: number, undo = false) => {
    const before = account.creatives.map((c) => graded(c, windowDays).tab);
    const moved = account.creatives.filter((c, i) => graded(c, days).tab !== before[i]).length;
    const prev = windowDays;
    setWindowDays(days);
    if (undo) return;
    const w = WINDOWS.find((x) => x.days === days)!;
    message.open({
      key: 'window',
      type: 'success',
      duration: 5,
      content: (
        <span>
          Grades now cover the {w.short.toLowerCase()}.{moved ? ` ${plural(moved, 'ad')} moved to a different tab.` : ''}{' '}
          <a
            onClick={() => {
              changeWindow(prev, true);
              message.destroy('window');
            }}
          >
            Undo
          </a>
        </span>
      ),
    });
  };
  const period = usePeriodSheet(windowDays, WINDOWS, (d) => changeWindow(d));
  const lowSpend = account.monthlySpend < RELIABLE_SPEND;
  // Overview's grade counts link to a tab (#/?tab=winners).
  const [search] = useSearchParams();
  const asked = search.get('tab') as TabKey | null;
  const [tab, setTab] = useState<TabKey>(asked && TABS.some((t) => t.key === asked) ? asked : 'potential');
  useEffect(() => {
    if (asked && TABS.some((t) => t.key === asked)) setTab(asked);
  }, [asked]);
  const [picked, setPicked] = useState<Picked>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    setPicked({});
  }, [account.id]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const any = (g: string, test: (v: string) => boolean) => !(picked[g] ?? []).length || picked[g].some(test);
  const matches = (c: Creative) =>
    any('Media', (v) => v === c.media) &&
    any('Platform', (v) => c.ads.some((a) => platformOf(a) === v)) &&
    any('Goal', (v) => goalOf(c) === v) &&
    any('Campaign', (v) => c.ads.some((a) => a.campaign === v)) &&
    any('Placement', (v) => c.placements.some((p) => p.label === v)) &&
    any('Ad status', (v) => v === adStatusOf(c)) &&
    any('Source', (v) => v === sourceOf(c));
  const rows = CREATIVES.filter((c) => c.tab === tab && matches(c)).sort((a, b) => b.spend - a.spend);
  const count = (k: TabKey) => CREATIVES.filter((c) => c.tab === k && matches(c)).length;
  const open = (c: Creative) => nav(`/ad/${c.id}`);

  // 5c audit A-01 to A-03: the Ad column takes the spare width so names wrap before they truncate, and
  // below 1200 px Hook, Retention (video only) and CPA step out (Overall's popover still lists them), so nothing scrolls off.
  const wide = !!bp.xl;
  const columns: ColumnsType<Creative> = [
    { title: 'Ad', key: 'name', render: (_, c) => <NameCell c={c} /> },
    {
      // 5d C5d-21 (Mancini's wording). Below 1200 px the cell carries the grade, since its column is hidden (Gm-07).
      title: <Head label="Next steps" tip="Suggested based on your ad performance." />,
      key: 'rec',
      width: wide ? 170 : 144,
      render: (_, c) => <StatusCell creative={c} status={statusOf(c.id)} withGrade={!wide} />,
    },
    { title: <Head label="Overall" tip="All of this ad's grades combined into one." />, key: 'overall', width: wide ? 84 : 72, render: (_, c) => <OverallTag creative={c} /> },
    metricCol('conversion', 'conv', wide ? 104 : 92),
    ...(wide ? [metricCol('hook', 'hook', 70), metricCol('retention', 'ret', 92)] : []),
    metricCol('ctr', 'ctr', wide ? 64 : 56),
    { title: <Head label="Spend" tip="What this ad spent in the selected period, across all its copies." />, key: 'spend', width: wide ? 116 : 104, align: 'right', sorter: (a, b) => a.spend - b.spend, defaultSortOrder: 'descend', render: (_, c) => money(c.spend) },
    ...(wide ? [{ title: <Head label="CPA" tip="Cost per purchase: spend divided by purchases. Lower is better." />, key: 'cpa', width: 88, align: 'right' as const, render: (_: unknown, c: Creative) => <span className="cpa">{money(c.values.cpa)}</span> }] : []),
  ];

  return (
    <motion.div {...pageTransition} className="page radar">
      <div className="page-head">
        <div className="page-title-row">
          <Typography.Title level={1} className="page-title">
            Radar
          </Typography.Title>
          <span className="page-title-actions">
          <PopSheet content={<div className="ih-pop"><IterationHistory items={iterationHistory(account, windowDays, jobs)} limit={4} empty="No rounds yet. Open an ad and pick suggestions to create variations." /></div>} title="Iteration history" trigger="click" placement="bottomRight" classNames={{ root: 'how-pop-root' }}>
            <Button type="text" size="small" className="hgw" aria-label="Iteration history">
              <HistoryOutlined className="hgw-icon" />
              <span className="hgw-text">History</span>
            </Button>
          </PopSheet>
          <PopSheet content={howGrading(lowSpend)} title="How Radar grades your ads" trigger="click" placement="bottomRight" classNames={{ root: 'how-pop-root' }}>
            <Button type="text" size="small" className="hgw" aria-label="How Radar grades your ads">
              <QuestionCircleOutlined className="hgw-icon" />
              <span className="hgw-text">How grading works</span>
            </Button>
          </PopSheet>
          </span>
        </div>
        <p className="muted desc">Find out how each ad is performing and what to do next.</p>
      </div>

      <AnimatePresence initial={false}>
        {lowSpend && (
          <motion.div key={account.id} variants={fadeUp} initial="hidden" animate="show" exit="exit" className="spend-alert">
            <GradingNote spend={account.monthlySpend} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="filter-bar">
        {/* Grade window as a date-range control (Mancini, 18:58): presets only, since grades need enough data;
            the range shows inside the control so it can't be missed. */}
        <div className="window">
          <Select
            variant="filled"
            value={windowDays}
            onChange={(d) => changeWindow(d)}
            {...period.selectProps}
            popupMatchSelectWidth={false}
            className="window-select"
            aria-label="Grading period"
            prefix={<CalendarOutlined className="window-icon" />}
            labelRender={({ value }) => {
              const w = WINDOWS.find((x) => x.days === value) ?? win;
              return (
                <span className="window-value">
                  <b>{w.short}</b>
                  {/* K49 (R-L4, R-R11): hide range in trigger below md; full range stays in the period sheet. */}
                  {bp.md && <span className="window-dates">{w.long.split(' · ')[1]}</span>}
                </span>
              );
            }}
            popupRender={(menu) => (
              <div>
                <div className="window-pop-head t-label">Grade ads on data from</div>
                {menu}
              </div>
            )}
            options={WINDOWS.map((w) => ({
              value: w.days,
              label: (
                <span className="window-opt">
                  <span>{w.short}</span>
                  <span className="t-help">{w.long.split(' · ')[1]}</span>
                </span>
              ),
            }))}
          />
          {period.sheet}
        </div>
        <FiltersButton key={account.id} popOpen={filtersOpen} setPopOpen={setFiltersOpen} goals={[...new Set(CREATIVES.map((c) => goalOf(c)))]} picked={picked} setPicked={setPicked} campaigns={[...new Set(CREATIVES.flatMap((c) => c.ads.map((a) => a.campaign)))]} placements={[...new Set(CREATIVES.flatMap((c) => c.placements.map((p) => p.label)))]} />
      </div>
      <ActiveFilters picked={picked} setPicked={setPicked} panelOpen={filtersOpen} mobile={cards} onOpenFilters={() => setFiltersOpen(true)} />

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        className="radar-tabs"
        items={TABS.map((t) => ({
          key: t.key,
          label: (
            <span className="tab-label">
              {t.label} <span className="tab-count">{count(t.key)}</span>
            </span>
          ),
        }))}
      />

      <div className="tab-desc" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={tab} variants={fadeUp} initial="hidden" animate="show" exit="exit">
            {TABS.find((t) => t.key === tab)!.desc}
          </motion.p>
        </AnimatePresence>
      </div>

      {rows.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="radar-empty">
          {Object.values(picked).flat().length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <>
                  {/* K26, K35 (R-V2, R-I9, R-E5): distinct empty copy when no filters are active. */}
                  <b>No {TABS.find((t) => t.key === tab)!.label} ads in the {win.short.toLowerCase()}</b>
                  <br />
                  {tab === 'winners' ? 'No ad is strong on every graded metric yet. The closest are under Improve.' : 'Ads appear here once their grades land in this group.'}
                </>
              }
            >
              {tab === 'winners' && <Button onClick={() => setTab('potential')}>View Improve</Button>}
            </Empty>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<b>No ads match these filters</b>}>
              <Button onClick={() => setPicked({})}>Clear filters</Button>
            </Empty>
          )}
        </motion.div>
      ) : cards ? (
        <div className="radar-cards">
          <AnimatePresence initial>
            {rows.map((c, i) => {
              // R-K4: Phone summary card shows Overall grade + ONE number top right (goal metric value, or Spend if ungraded).
              const goal = goalOf(c);
              const gm = GOALS[goal].metric;
              const vKey = ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[gm];
              const goalVal = c.overall && c.values[vKey] != null ? METRIC_META[gm].unit(c.values[vKey]!) : money(c.spend).replace(/\.\d\d$/, '');
              const goalLabel = c.overall && c.values[vKey] != null ? (gm === 'conversion' ? ACCOUNT.conversionMetric : METRIC_META[gm].label) : 'Spend';
              return (
                <motion.article
                  key={`${tab}-${c.id}`}
                  className="radar-card"
                  onClick={() => open(c)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(i) } }}
                  exit={{ opacity: 0, transition: { duration: duration.instant } }}
                >
                  <NameCell
                    c={c}
                    morph={false}
                    mobile
                    meta={
                      <div className="card-tags">
                        <span className="card-goal-chip">
                          {GOAL_ICON[goal]} {goal}
                        </span>
                      </div>
                    }
                    aside={
                      <span className="card-corner" onClick={(e) => e.stopPropagation()}>
                        <OverallTag creative={c} />
                        <span className="card-corner-metric">
                          <span className="card-corner-label">{goalLabel}</span>{' '}
                          <b className="card-corner-val">{goalVal}</b>
                        </span>
                      </span>
                    }
                  />
                  <div className="card-foot">
                    <button
                      className="card-more"
                      aria-expanded={expanded === c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded((x) => (x === c.id ? null : c.id));
                      }}
                    >
                      Details{' '}
                      <motion.span animate={{ rotate: expanded === c.id ? 180 : 0 }} transition={spring.snappy} style={{ display: 'inline-flex' }}>
                        <DownOutlined />
                      </motion.span>
                    </button>
                    <StatusCell creative={c} status={statusOf(c.id)} withGrade />
                  </div>
                  <AnimatePresence initial={false}>
                    {expanded === c.id && (
                      <motion.div
                        className="card-grades"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto', transition: { height: spring.layout, opacity: { duration: duration.fast } } }}
                        exit={{ opacity: 0, height: 0, transition: { duration: duration.fast, ease: ease.exit } }}
                      >
                        <div className="card-grades-inner">
                          {(['conversion', 'hook', 'retention', 'ctr'] as const).map((k) => (
                            <span key={k}>
                              {METRIC_META[k].label} <GradeTag creative={c} metric={k} />
                            </span>
                          ))}
                          <span>
                            Spend <b className="ink">{money(c.spend)}</b>
                          </span>
                          <span>
                            CPA <b className="ink">{money(c.values.cpa)}</b>
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <Table<Creative>
          key={tab}
          rowKey="id"
          columns={columns}
          dataSource={rows}
          showSorterTooltip={false}
          components={{ body: { row: MotionRow } }}
          onRow={(c, i) => ({ onClick: () => open(c), className: 'clickable-row', 'data-index': i } as never)}
          pagination={{ total: rows.length, pageSize: 20, showTotal: (t) => plural(t, 'ad'), showSizeChanger: false, hideOnSinglePage: true }}
          // 5d OG-05: Atria's table ends with a totals row; ours had none.
          summary={() =>
            rows.length ? (
              <Table.Summary.Row className="radar-total">
                {columns.map((col, i) => (
                  <Table.Summary.Cell key={String(col.key)} index={i} align={col.key === 'spend' ? 'right' : undefined}>
                    {col.key === 'name' ? <span className="t-label">Total · {plural(rows.length, 'ad')}</span> : col.key === 'spend' ? <b>{money(rows.reduce((a, c) => a + c.spend, 0))}</b> : null}
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            ) : null
          }
        />
      )}
    </motion.div>
  );
}
