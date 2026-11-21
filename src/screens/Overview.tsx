import { Empty, Grid, Select } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, CalendarOutlined, MinusOutlined, RightOutlined } from '../components/AppIcons';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { WINDOWS, goalOf, graded, money, plural, type TabKey } from '../data/mock';
import { DEMO_ACCOUNTS, findCreative, useStore } from '../data/store';
import { creativeDiversity, formatBreakdown, healthBreakdown, iterationHistory, overviewBriefing, topTags, type Delta } from '../data/insights';
import { AskRaya } from '../components/AskRaya';
import { SectionHead } from '../components/SectionHead';
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

function DeltaBadge({ d }: { d: Delta }) {
  const Icon = d.pct > 0 ? ArrowUpOutlined : d.pct < 0 ? ArrowDownOutlined : MinusOutlined;
  const word = d.pct > 0 ? 'up' : d.pct < 0 ? 'down' : 'unchanged';
  return (
    <span className={`ov-delta tone-${d.tone}`} aria-label={`${d.label} ${word} ${Math.abs(d.pct)}% against the period before`}>
      <Icon aria-hidden />
      <span>{Math.abs(d.pct)}%</span>
    </span>
  );
}

function Kpi({ label, value, help, delta, hero }: { label: string; value: string; help: string; delta: Delta; hero?: boolean }) {
  return (
    <div className={`ov-kpi ${hero ? 'hero' : ''}`}>
      <div className="ov-kpi-top">
        <span className="t-label">{label}</span>
        <DeltaBadge d={delta} />
      </div>
      <span className="ov-kpi-val">{value}</span>
      <span className="t-help">{help}</span>
    </div>
  );
}

function Headline({ lead, fallback }: { lead: { best?: Delta; worst?: Delta }; fallback: string }) {
  const part = (d: Delta) => (
    <>
      {/* Keep the metric and "is" together so "is" never sits alone on a line. */}
      <span>{`${d.label}\u00a0is`.replace(/ /g, '\u00a0')}</span>{' '}
      <span className={`ov-hl-pill tone-${d.tone}`}>
        {d.pct > 0 ? <ArrowUpOutlined aria-hidden /> : <ArrowDownOutlined aria-hidden />}
        {d.pct > 0 ? 'up' : 'down'} {Math.abs(d.pct)}%
      </span>
    </>
  );
  const { best, worst } = lead;
  return (
    <p className="ov-headline ov-headline-xl">
      {best && worst ? (
        <>
          {part(best)}, but {part(worst)}
        </>
      ) : best ? (
        part(best)
      ) : worst ? (
        part(worst)
      ) : (
        fallback
      )}
      {/* S-46: "against the period before" is the section's help line, so the headline ends at the numbers. */}
    </p>
  );
}

export function Overview() {
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
      <PageHeader title="Overview" desc="See how this account is doing and where to look first." />
      {/* S-33: the period is a control, so it sits in the controls row like Radar's, not with the title. */}
      <div className="filter-bar">
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
      </div>

      {/* Key metrics, as in Atria's Overview (Mancini 09:43, item 21). Overview is the account; Radar is each ad. */}
      <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-now" aria-labelledby="ov-sec-now">
        <SectionHead id="ov-sec-now" title="Key metrics" help={titles.now.help} />
        {/* Mancini 10:55: the headline is the page's focal point. Large type, the two numbers that matter as coloured pills, no grey box. */}
        <Headline lead={briefing.now.lead} fallback={briefing.now.headline} />
        <div className="ov-kpis ov-kpis-7" aria-label="Key metrics">
          <Kpi hero label="Spend" value={money(dSpend.now).replace(/\.\d\d$/, '')} help={`${plural(ads.length, 'ad')} with spend`} delta={dSpend} />
          <Kpi label="ROAS" value={dRoas.now.toFixed(2)} help={'Revenue per $1 of\u00a0spend'} delta={dRoas} />
          <Kpi label="CPA" value={money(dCpa.now)} help={`Account average\u00a0${money(account.avg.cpa)}`} delta={dCpa} />
          <Kpi label="Purchase value" value={money(dValue.now).replace(/\.\d\d$/, '')} help={`${Math.round(dPurchases.now).toLocaleString('en-US')} purchases`} delta={dValue} />
          <Kpi label="AOV" value={money(dAov.now)} help="Average order value" delta={dAov} />
          <Kpi label="CPC" value={money(dCpc.now)} help="Cost per link click" delta={dCpc} />
          <Kpi label="CPM" value={money(dCpm.now)} help="Cost per 1,000 impressions" delta={dCpm} />
        </div>
      </motion.section>

      {/* S-34: the headline is the focal point, so Ask Raya follows the metrics instead of sitting above them. */}
      <AskRaya key={account.id} account={account} windowDays={windowDays} jobs={jobs} />

      <div className="ov-grid ov-grid-even">
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel" aria-labelledby="ov-sec-health">
          <SectionHead id="ov-sec-health" title="Ad health" action={<Link to="/">Open Radar</Link>} help={<>Share of spend going to ads Radar puts in each group. Grades cover the {win.short.toLowerCase()}.</>} />
          <BarList rows={health} tone={(k) => TAB_TONE[k as TabKey]} onPick={(k) => nav(`/?tab=${k}`)} />
        </motion.section>
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel" aria-labelledby="ov-sec-format">
          <SectionHead id="ov-sec-format" title="Spend by format" help={<>How this account's budget splits across ad types.</>} />
          <BarList rows={formats} tone={() => 'neutral'} />
        </motion.section>
      </div>

      <div className="ov-grid ov-grid-even">
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel" aria-labelledby="ov-sec-div">
          <SectionHead id="ov-sec-div" title="Creative diversity" help={<>How evenly spend spreads across different ad concepts. An ad and its variations count as one concept.</>} />
          <div className="div-score">
            <span className="div-num">{diversity.score}</span>
            <span className={`div-label tone-${diversity.label.toLowerCase()}`}>{diversity.label}</span>
          </div>
          <span className="bar-list-track div-track" aria-hidden>
            <motion.i className={`div-${diversity.label.toLowerCase()}`} initial={{ scaleX: 0 }} animate={{ scaleX: diversity.score / 100 }} />
          </span>
          <p className="div-line">{diversity.line}</p>
          <dl className="div-facts">
            <div><dt className="t-help">Concepts</dt><dd>{diversity.concepts}</dd></div>
            <div><dt className="t-help">Formats</dt><dd>{diversity.formats}</dd></div>
            <div><dt className="t-help">Biggest concept</dt><dd>{Math.round(diversity.topShare * 100)}% of spend</dd></div>
          </dl>
        </motion.section>
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel" aria-labelledby="ov-sec-tags">
          <SectionHead id="ov-sec-tags" title="Top creative tags" help={<>What your ads show and say. Ranked by spend, with CPA against the account average.</>} />
          <ul className="tag-list">
            {tags.map((t) => (
              <li key={t.tag} className="tag-row">
                <span className="tag-name">{t.tag}<span className="bar-list-count">{plural(t.count, 'ad')} · {Math.round(t.share * 100)}% of spend</span></span>
                <span className={`tag-cpa tone-${t.vsAccount <= 0 ? 'good' : 'bad'}`}>
                  {money(t.cpa)}
                  <span>{t.vsAccount === 0 ? 'average' : `${Math.abs(t.vsAccount)}% ${t.vsAccount < 0 ? 'below' : 'above'}`}</span>
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>

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
            <SectionHead id="ov-sec-next" title="Iteration suggestions" action={<Link to="/">Open Radar</Link>} help={<>{titles.next.help}</>} />
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
            <SectionHead id="ov-sec-history" title="Iteration history" action={<Link to="/creation">Creative gallery</Link>} help={<>Rounds you made in Atria and how their variations did once they ran.</>} />
            <IterationHistory items={history} empty={`No rounds yet for ${account.name.replace(/\.$/, '')}. Open an ad under Iteration suggestions to create variations.`} />
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
