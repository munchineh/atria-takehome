import { Button, Empty, Grid, Progress, Select, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, CalendarOutlined, MinusOutlined, RightOutlined, WarningOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TABS, WINDOWS, goalOf, graded, money, plural, type TabKey } from '../data/mock';
import { DEMO_ACCOUNTS, findCreative, timeAgo, useStore } from '../data/store';
import { overviewBriefing, type Delta } from '../data/insights';
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
  const dCtr = deltaBy('ctr');

  const tabCounts: { key: TabKey; label: string; n: number }[] = [
    { key: 'winners', label: TABS[0].label, n: briefing.now.counts.best },
    { key: 'potential', label: TABS[1].label, n: briefing.now.counts.improve },
    { key: 'candidates', label: TABS[2].label, n: briefing.now.counts.rework },
  ];

  const { titles } = briefing;
  const firstNext = briefing.next[0];

  return (
    <motion.div {...pageTransition} className="page overview">
      <div className="page-head ov-head">
        <div>
          <Typography.Title level={1} className="page-title">
            Overview
          </Typography.Title>
          <p className="muted desc">See how this account is doing and where to look first.</p>
        </div>
        <Select
          variant="filled"
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

      {/* 1. What to know now */}
      <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-now" aria-labelledby="ov-sec-now">
        <div className="ov-sec-head">
          <div>
            <h2 id="ov-sec-now" className="panel-title">{titles.now.title}</h2>
            <p className="t-help ov-sec-help">{titles.now.help}</p>
          </div>
          {/* G5 (R-L): keep one period line in the first card on phones (period selector sits directly above). */}
          {bp.md && <span className="t-help ov-period-note">Grades cover the {win.short.toLowerCase()}.</span>}
        </div>

        <p className="ov-headline">{briefing.now.headline}</p>

        <div className="ov-kpis" aria-label="Spend and results">
          <Kpi hero label="Spend" value={money(dSpend.now).replace(/\.\d\d$/, '')} help={`${plural(ads.length, 'ad')} with spend`} delta={dSpend} />
          <Kpi label="Purchases" value={Math.round(dPurchases.now).toLocaleString('en-US')} help="From ads graded on CPA" delta={dPurchases} />
          <Kpi label="CPA" value={money(dCpa.now)} help={`Account average\u00a0${money(account.avg.cpa)}`} delta={dCpa} />
          <Kpi label="ROAS" value={dRoas.now.toFixed(2)} help={'Revenue per $1 of\u00a0spend'} delta={dRoas} />
          <Kpi label="CTR" value={`${dCtr.now.toFixed(2)}%`} help={`Account average\u00a0${account.avg.ctr.toFixed(2)}%`} delta={dCtr} />
        </div>

        <div className="ov-grades-wrap">
          <div className="ov-grades">
            {tabCounts.map((t) => (
              <Link key={t.key} to={`/?tab=${t.key}`} className={`ov-grade ${TAB_TONE[t.key]}`}>
                <span className="ov-grade-n">{t.n}</span>
                <span className="ov-grade-label">
                  {t.label} <RightOutlined />
                </span>
              </Link>
            ))}
          </div>
          <div className="ov-grade-bar" aria-hidden>
            {tabCounts.map((t) => (
              <i key={t.key} className={TAB_TONE[t.key]} style={{ flexGrow: t.n }} />
            ))}
          </div>
        </div>
      </motion.section>

      <div className="ov-grid">
        <div className="ov-col">
          {/* 2. What to do next */}
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-fix" aria-labelledby="ov-sec-next">
            <div className="ov-sec-head">
              <h2 id="ov-sec-next" className="panel-title">{titles.next.title}</h2>
              <Link to="/" className="small">Open Radar</Link>
            </div>
            <p className="t-help ov-sec-help">{titles.next.help}</p>
            {briefing.next.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing to fix first. Every ad is B or above on its goal." />
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

          {/* 4. What changed */}
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-vars" aria-labelledby="ov-sec-changed">
            <h2 id="ov-sec-changed" className="panel-title">{titles.changed.title}</h2>
            <p className="t-help ov-sec-help">{titles.changed.help}</p>
            {briefing.changed.length === 0 ? (
              <p className="t-help">No ads made from variations running yet. Variations you test in Meta show up here once they have data.</p>
            ) : (
              <div className="ov-changes">
                {briefing.changed.map((item) => {
                  const ad = ads.find((x) => x.id === item.adId) ?? findCreative(item.adId);
                  if (!ad) return null;
                  const parent = ad.variationOf ? ads.find((p) => p.id === ad.variationOf) ?? findCreative(ad.variationOf) : undefined;
                  const hasRepeat = item.text.includes('Repeats an earlier test');
                  const mainText = item.text.replace(/\s*Repeats an earlier test\.?$/, '');
                  return (
                    <div
                      key={item.adId}
                      className="ov-change-row"
                      role="link"
                      tabIndex={0}
                      onClick={() => nav(`/ad/${item.adId}`)}
                      onKeyDown={(e) => e.key === 'Enter' && nav(`/ad/${item.adId}`)}
                    >
                      <Thumb c={ad} size={40} />
                      <div className="ov-row-text">
                        <div className="ov-change-head">
                          <b>{item.name}</b>
                          <span className="ov-pair-grade" onClick={(e) => e.stopPropagation()}>
                            <OverallTag creative={ad} />
                            {parent?.overall && <span className="muted small">vs {parent.overall}</span>}
                          </span>
                        </div>
                        <span className={`ov-change-delta small tone-${item.tone}`}>
                          {/\bdown\b/i.test(mainText) ? <ArrowDownOutlined aria-hidden /> : /\bup\b/i.test(mainText) ? <ArrowUpOutlined aria-hidden /> : <MinusOutlined aria-hidden />}
                          <span>{mainText}</span>
                        </span>
                        {hasRepeat && (
                          <span className="ov-repeat-note small">
                            <WarningOutlined aria-hidden /> Repeats an earlier test.
                          </span>
                        )}
                      </div>
                      <RightOutlined className="ov-chev" />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        </div>

        <div className="ov-col">
          {/* 3. What you did */}
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-rounds" aria-labelledby="ov-sec-done">
            <div className="ov-sec-head">
              <h2 id="ov-sec-done" className="panel-title">{titles.done.title}</h2>
              <Link to="/creation" className="small">Creative gallery</Link>
            </div>
            <p className="t-help ov-sec-help">{titles.done.help}</p>
            {briefing.done.length === 0 ? (
              <div className="ov-empty-rounds">
                <p className="t-help">No rounds yet for {account.name.replace(/\.$/, '')}. Pick an ad under {titles.next.title} to create variations.</p>
                {firstNext && (
                  <Button size="small" onClick={() => nav(`/ad/${firstNext.adId}`)}>
                    Open {firstNext.name}
                  </Button>
                )}
              </div>
            ) : (
              <ul className="ov-list">
                {briefing.done.slice(0, 5).map((item) => {
                  const ad = findCreative(item.adId);
                  const job = jobs.find((j) => j.id === item.jobId);
                  if (!ad) return null;
                  const active = job && (job.state === 'generating' || job.state === 'queued');
                  return (
                    <li key={item.jobId}>
                      <button className="ov-row" onClick={() => nav(`/ad/${item.adId}/variations?round=${item.jobId}`)}>
                        <Thumb c={ad} size={40} />
                        <span className="ov-row-text">
                          <b>{item.name}</b>
                          {active ? (
                            <span className="ov-round-progress">
                              <Progress percent={Math.round(job.progress * 100)} showInfo={false} size="small" strokeColor="#f66c30" />
                              <span className="small muted">
                                {job.state === 'queued' ? 'Queued' : `Generating ${job.count}\u00a0· ${Math.round(job.progress * 100)}%`}
                              </span>
                            </span>
                          ) : (
                            <span className="small muted">
                              {item.text}{'\u00a0'}· {job ? timeAgo(job.minutesAgo) : item.date}
                            </span>
                          )}
                        </span>
                        {job?.unseen && <i className="unseen-dot" aria-label="Not opened yet" />}
                        <RightOutlined className="ov-chev" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
