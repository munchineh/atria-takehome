import { useEffect } from 'react';
import { Empty, Grid, Progress, Select, Tooltip } from 'antd';
import { setHub } from '../data/nav';
import { AppstoreOutlined, ArrowDownOutlined, ArrowUpOutlined, RadarChartOutlined, CalendarOutlined, InfoCircleOutlined, MinusOutlined, RightOutlined } from '../components/AppIcons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { WINDOWS, goalOf, graded, money, plural, type TabKey } from '../data/mock';
import { DEMO_ACCOUNTS, findCreative, useStore } from '../data/store';
import { creativeDiversity, formatBreakdown, healthBreakdown, iterationHistory, overviewBriefing, topTags, trendSeries, type Delta } from '../data/insights';
import { AskRaya } from '../components/AskRaya';
import { SectionHead } from '../components/SectionHead';
import { ExpandLink } from '../components/ExpandLink';
import { PageHeader } from '../components/PageHeader';
import { BarList } from '../components/BarList';
import { IterationHistory } from '../components/IterationHistory';
import { GradeChip, OverallTag } from '../components/GradeTag';
import { Thumb } from '../components/Thumb';
import { usePeriodSheet } from '../components/PopSheet';
import { GOAL_ICON } from '../components/Goal';
import { fadeUp, pageTransition } from '../motion/tokens';

/**
 * Overview (Item 15, R-H, R-P): structured around the four core user questions
 * from overviewBriefing() — What to know now, What to do next, What you did, What changed.
 */

const TAB_TONE: Record<TabKey, string> = { winners: 'best', potential: 'improve', candidates: 'rework' };

/** This period (solid) over the period before (dashed), no axes: the shape is the point. */
function Sparkline({ d }: { d: Delta }) {
  const { now, before } = trendSeries(d);
  const all = [...now, ...before];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const W = 100;
  const H = 32;
  // Smooth curve (Catmull-Rom to Bézier) so the line reads as a trend, not noise.
  const path = (vals: number[]) => {
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * W, H - 2 - ((v - lo) / (hi - lo || 1)) * (H - 4)]);
    return pts
      .map((p, i) => {
        if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`;
        const p0 = pts[i - 2] ?? pts[i - 1];
        const p1 = pts[i - 1];
        const p3 = pts[i + 1] ?? p;
        const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6];
        const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
        return `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p[0].toFixed(1)},${p[1].toFixed(1)}`;
      })
      .join(' ');
  };
  // Mancini 15:38: a soft fill under this period's line, a quieter line for the period before, and a dot on the latest value.
  const lastY = H - 2 - ((now[now.length - 1] - lo) / (hi - lo || 1)) * (H - 4);
  return (
    <span className={`ov-spark-wrap tone-${d.tone}`} aria-hidden>
      <svg className="ov-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={`${path(now)} L${W},${H} L0,${H} Z`} className="ov-spark-area" />
        <path d={path(before)} className="ov-spark-before" />
        <path d={path(now)} className="ov-spark-now" />
      </svg>
      <i className="ov-spark-dot" style={{ top: `${(lastY / H) * 100}%` }} />
    </span>
  );
}

/**
 * Key metric tile (Mancini 13:49, after SaaS KPI card patterns): label with a definition on hover, the value,
 * the change against the period before coloured by whether it's good, and a sparkline. Every tile has the same four parts.
 */
function Kpi({ label, value, help, delta, compact }: { label: string; value: string; help: string; delta: Delta; compact?: boolean }) {
  const word = delta.pct > 0 ? 'Up' : delta.pct < 0 ? 'Down' : 'No change';
  const Icon = delta.pct > 0 ? ArrowUpOutlined : delta.pct < 0 ? ArrowDownOutlined : MinusOutlined;
  return (
    <div className={compact ? 'ov-stat' : 'ov-tile'}>
      <span className="ov-tile-label">
        {label}
        <Tooltip title={help.replace(/\u00a0/g, ' ')}>
          <InfoCircleOutlined className="ov-tile-info" aria-label={`About ${label}`} />
        </Tooltip>
      </span>
      <span className="ov-tile-val">{value}</span>
      <span className={`ov-tile-delta tone-${delta.tone}`} aria-label={`${word} ${Math.abs(delta.pct)}% against the period before`}>
        <Icon aria-hidden />
        {Math.abs(delta.pct)}%<span className="ov-tile-vs">vs. previous period</span>
      </span>
      {!compact && <Sparkline d={delta} />}
    </div>
  );
}

export function Overview() {
  // Breadcrumbs below this page start from here (Mancini 13:21).
  useEffect(() => setHub('overview'), []);
  const { accountId, windowDays, setWindowDays, jobs } = useStore();
  const bp = Grid.useBreakpoint();
  const nav = useNavigate();
  const account = DEMO_ACCOUNTS.find((a) => a.id === accountId) ?? DEMO_ACCOUNTS[0];
  const win = WINDOWS.find((w) => w.days === windowDays) ?? WINDOWS[1];
  const period = usePeriodSheet(windowDays, WINDOWS, (d) => setWindowDays(d));
  const ads = account.creatives.map((c) => graded(c, windowDays));
  const briefing = overviewBriefing(account, windowDays, jobs);

  const deltaBy = (key: Delta['key']) => briefing.now.deltas.find((d) => d.key === key)!;
  const dSpend = deltaBy('spend');
  const dPurchases = deltaBy('purchases');
  const dCpa = deltaBy('cpa');
  const dRoas = deltaBy('roas');
  const dValue = deltaBy('value');
  const dAov = deltaBy('aov');
  const dCpc = deltaBy('cpc');
  const dCpm = deltaBy('cpm');
  const health = healthBreakdown(account, windowDays);
  const formats = formatBreakdown(account, windowDays);
  const topSpend = [...ads].sort((a, b) => b.spend - a.spend).slice(0, 4);
  const history = iterationHistory(account, windowDays, jobs);
  const diversity = creativeDiversity(account, windowDays);
  const tags = topTags(account, windowDays);


  const { titles } = briefing;

  return (
    <motion.div {...pageTransition} className="page overview">
      {/* Mancini 13:36: the period goes back on the title row, as before the overhaul. A row of its own left an empty band. */}
      <PageHeader
        title="Overview"
        desc="See how this account is doing and where to look first."
        actions={
          <>
        <Select
          value={windowDays}
          onChange={(d) => setWindowDays(d)}
          {...period.selectProps}
          popupMatchSelectWidth={false}
          className="window-select"
          aria-label="Grading period"
          prefix={<CalendarOutlined className="window-icon" />}
          labelRender={() => (
            <span className="window-value">
              <b>{win.short}</b>
              {bp.md && <span className="window-dates">{win.long.split(' · ')[1]}</span>}
            </span>
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
          </>
        }
      />

      {/* Mancini 13:36: Ask Raya first again. */}
      <AskRaya key={account.id} account={account} windowDays={windowDays} jobs={jobs} />

      {/* Key metrics, as in Atria's Overview (Mancini 09:43, item 21). Overview is the account; Radar is each ad. */}
      <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-now" aria-labelledby="ov-sec-now">
        <SectionHead
          id="ov-sec-now"
          title="Key metrics"
          help={titles.now.help}
          action={
            <span className="ov-legend" aria-hidden>
              <i className="ov-legend-now" /> This period <i className="ov-legend-before" /> Previous period
            </span>
          }
        />
        {/* Mancini 14:18: seven equal tiles had no focal point. Three headline metrics keep the tile and sparkline;
            the four supporting ones step down to a quiet row of label, value and change. */}
        <div className="ov-kpis-hero" aria-label="Key metrics">
          <Kpi label="Spend" value={money(dSpend.now).replace(/\.\d\d$/, '')} help={`${plural(ads.length, 'ad')} with spend`} delta={dSpend} />
          <Kpi label="ROAS" value={dRoas.now.toFixed(2)} help={'Revenue per $1 of\u00a0spend'} delta={dRoas} />
          <Kpi label="CPA" value={money(dCpa.now)} help={`Account average\u00a0${money(account.avg.cpa)}`} delta={dCpa} />
        </div>
        <div className="ov-kpi-strip" aria-label="More metrics">
          <Kpi compact label="Purchase value" value={money(dValue.now).replace(/\.\d\d$/, '')} help={`${Math.round(dPurchases.now).toLocaleString('en-US')} purchases`} delta={dValue} />
          <Kpi compact label="AOV" value={money(dAov.now)} help="Average order value" delta={dAov} />
          <Kpi compact label="CPC" value={money(dCpc.now)} help="Cost per link click" delta={dCpc} />
          <Kpi compact label="CPM" value={money(dCpm.now)} help="Cost per 1,000 impressions" delta={dCpm} />
        </div>
      </motion.section>

      <div className="ov-grid ov-grid-even">
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel" aria-labelledby="ov-sec-health">
          <SectionHead id="ov-sec-health" title="Ad health" action={<ExpandLink to="/" icon={<RadarChartOutlined />}>Open Radar</ExpandLink>} help={<>Share of spend going to ads Radar puts in each group. Grades cover the {win.short.toLowerCase()}.</>} />
          <BarList rows={health} tone={(k) => TAB_TONE[k as TabKey]} onPick={(k) => nav(`/?tab=${k}`)} />
        </motion.section>
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel" aria-labelledby="ov-sec-format">
          <SectionHead id="ov-sec-format" title="Spend by format" help={<>How this account's budget splits across ad types.</>} />
          <BarList rows={formats} tone={() => 'neutral'} />
        </motion.section>
      </div>

      {/* Mancini 14:18: Creative diversity after Atria's own section, in light mode: the score in a ring, what it means,
          the trend, and each creative dimension rated on its own. */}
      <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-div" aria-labelledby="ov-sec-div">
        <SectionHead id="ov-sec-div" title="Creative diversity" help={<>How varied this account's ads are. An ad and its variations count as one concept.</>} meta={win.long.split(' · ')[1]} />
        <div className="div-body">
          <div className="div-ring">
            <Progress
              type="circle"
              percent={diversity.score}
              size={104}
              strokeWidth={8}
              strokeColor={`var(--c-${diversity.label === 'Good' ? 'success' : diversity.label === 'Fair' ? 'warning' : 'error'})`}
              railColor="var(--c-fill)"
              format={() => (
                <span className="div-ring-val">
                  <b>{diversity.score}</b>
                  <span>/100</span>
                </span>
              )}
              aria-label={`Creative diversity score ${diversity.score} out of 100`}
            />
          </div>
          <div className="div-read">
            {/* Mancini 14:56: an unlabelled line read as random. The change is stated in words instead. */}
            <span className="div-level">
              {diversity.label}
              {diversity.trend[0] !== diversity.score && (
                <span className={`div-delta ${diversity.score > diversity.trend[0] ? 'up' : 'down'}`}>
                  {diversity.score > diversity.trend[0] ? <ArrowUpOutlined aria-hidden /> : <ArrowDownOutlined aria-hidden />}
                  {Math.abs(diversity.score - diversity.trend[0])} points in 8 weeks
                </span>
              )}
            </span>
            <p className="div-line">{diversity.line}</p>
            <p className="t-help div-meta">
              {plural(diversity.concepts, 'concept')} · {plural(diversity.formats, 'format')}
            </p>
            <p className="t-help div-meta">Biggest concept: {Math.round(diversity.topShare * 100)}% of spend</p>
          </div>
          <ul className="div-cats" aria-label="Diversity by creative dimension">
            {diversity.categories.map((cat) => (
              <li key={cat.name} className="div-cat">
                <span className="div-cat-name">{cat.name}</span>
                <span className={`div-label tone-${cat.level.toLowerCase()}`}>{cat.level}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel" aria-labelledby="ov-sec-tags">
        <SectionHead id="ov-sec-tags" title="Top creative tags" help={<>What your ads show and say. Ranked by spend, with CPA against the account average.</>} />
        {/* Mancini 15:09: each tag is a tile with a hover fill to guide the eye. The bar is its share of spend;
            the chip says how its CPA compares with the account, in color and words. */}
        <ul className="tag-list tag-tiles">
          {tags.map((t) => {
            const good = t.vsAccount <= 0;
            return (
              <li key={t.tag} className="tag-tile">
                <span className="tag-tile-top">
                  <span className="tag-name">{t.tag}</span>
                  <span className="tag-cpa-val">{money(t.cpa)}</span>
                </span>
                <span className="tag-share" aria-hidden>
                  <i style={{ width: `${Math.max(4, Math.round(t.share * 100))}%` }} />
                </span>
                <span className="tag-tile-foot">
                  <span className="bar-list-count">{plural(t.count, 'ad')} · {Math.round(t.share * 100)}% of spend</span>
                  <span className={`tag-delta tone-${t.vsAccount === 0 ? 'neutral' : good ? 'good' : 'bad'}`}>
                    {t.vsAccount !== 0 && (good ? <ArrowDownOutlined aria-hidden /> : <ArrowUpOutlined aria-hidden />)}
                    {t.vsAccount === 0 ? 'Average CPA' : `${Math.abs(t.vsAccount)}% ${good ? 'below' : 'above'} average`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </motion.section>

      <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-top" aria-labelledby="ov-sec-top">
        <SectionHead id="ov-sec-top" title="Top spend" help={<>The ads spending most in this period.</>} />
        <ul className="ov-top-grid">
          {topSpend.map((c) => (
            <li key={c.id}>
              <button type="button" className="ov-top-card" onClick={() => nav(`/ad/${c.id}`)}>
                <Thumb c={c} size={56} />
                <span className="ov-top-text">
                  <b className="ov-top-name">{c.name}</b>
                  <span className="t-help">
                    {money(c.spend).replace(/\.\d\d$/, '')}
                    {c.roas != null ? `\u00a0· ROAS ${c.roas.toFixed(2)}` : ''}
                  </span>
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <OverallTag creative={c} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </motion.section>

      <div className="ov-grid">
        <div className="ov-col">
          {/* Atria's Overview has weekly iteration suggestions; ours point at the ads to open in Radar first. */}
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-fix" aria-labelledby="ov-sec-next">
            <SectionHead id="ov-sec-next" title="Iteration suggestions" action={<ExpandLink to="/" icon={<RadarChartOutlined />}>Open Radar</ExpandLink>} help={<>{titles.next.help}</>} />
            {briefing.next.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing to improve first. Every ad is B or above on its goal." />
            ) : (
              <ol className="ov-list">
                {briefing.next.map((item) => {
                  const ad = ads.find((x) => x.id === item.adId) ?? findCreative(item.adId);
                  if (!ad) return null;
                  const goal = goalOf(ad);
                  return (
                    <li key={item.adId}>
                      <button className="ov-row" onClick={() => nav(`/ad/${item.adId}`)}>
                        <Thumb c={ad} size={40} />
                        <span className="ov-row-text">
                          <b>{item.name}</b>
                          <span className="ov-fix-line small">
                            <GradeChip g={item.grade as never} />
                            <span>{item.metric}</span>
                            <span className="muted" aria-hidden>{'\u00a0'}·</span>
                            <span className="muted ov-goal">
                              {GOAL_ICON[goal]} {goal}
                            </span>
                          </span>
                          <span className="t-help ov-row-why">{item.why}</span>
                        </span>
                        <span className="ov-row-end small">{money(item.spend).replace(/\.\d\d$/, '')}</span>
                        <RightOutlined className="ov-chev" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </motion.section>
        </div>
        <div className="ov-col">
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel" aria-labelledby="ov-sec-history">
            <SectionHead id="ov-sec-history" title="Iteration history" action={<ExpandLink to="/creation" icon={<AppstoreOutlined />}>Creative Gallery</ExpandLink>} help={<>Rounds you made in Atria and how their variations did once they ran.</>} />
            <IterationHistory items={history} empty={`No rounds yet for ${account.name.replace(/\.$/, '')}. Open an ad under Iteration suggestions to create variations.`} />
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
