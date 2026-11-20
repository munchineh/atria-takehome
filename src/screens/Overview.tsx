import { Button, Empty, Grid, Progress, Tag, Tooltip, Typography } from 'antd';
import { CalendarOutlined, RightOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GOALS, METRIC_META, TABS, WINDOWS, goalOf, graded, money, plural, type Creative, type TabKey } from '../data/mock';
import { DEMO_ACCOUNTS, findCreative, recName, timeAgo, useStore, type Job } from '../data/store';
import { GradeChip, OverallTag } from '../components/GradeTag';
import { Thumb } from '../components/Thumb';
import { GOAL_ICON } from '../components/Goal';
import { fadeUp, pageTransition } from '../motion/tokens';

/**
 * Overview (chat 5c, Mancini 20 Nov 19:08): one page that ties the account together, so the
 * Overview/Radar switch has somewhere to go. Every block hands off to the screen that does the work:
 * grade counts open Radar tabs, Fix first opens the ad, rounds open their variations page.
 * Same period as Radar (one store value), so the numbers match the table.
 */

const TAB_TONE: Record<TabKey, string> = { winners: 'best', potential: 'improve', candidates: 'rework' };

/** The grade the ad's goal cares about most; falls back to Conversion when that grade doesn't apply (hook on an image). */
function goalGrade(c: Creative) {
  const goal = goalOf(c);
  const m = GOALS[goal].metric;
  const key = c.grades[m] ? m : 'conversion';
  return { goal, metric: key, grade: c.grades[key] };
}

function Kpi({ label, value, help, hero }: { label: string; value: string; help: string; hero?: boolean }) {
  return (
    <div className={`ov-kpi ${hero ? 'hero' : ''}`}>
      <span className="t-label">{label}</span>
      <span className="ov-kpi-val">{value}</span>
      <span className="t-help">{help}</span>
    </div>
  );
}

function RoundRow({ j }: { j: Job }) {
  const c = findCreative(j.creativeId)!;
  const nav = useNavigate();
  const to = `/ad/${c.id}/variations?round=${j.id}`;
  const fixes = j.recIds.map((r) => recName(c.id, r)).join(' · ');
  return (
    <button className="ov-row" onClick={() => nav(to)}>
      <Thumb c={c} size={40} />
      <span className="ov-row-text">
        <b>{c.name}</b>
        <span className="t-help">{fixes}</span>
        {j.state === 'generating' || j.state === 'queued' ? (
          <span className="ov-round-progress">
            <Progress percent={Math.round(j.progress * 100)} showInfo={false} size="small" strokeColor="#f5582a" />
            <span className="small muted">{j.state === 'queued' ? 'Queued' : `Generating ${j.count} · ${Math.round(j.progress * 100)}%`}</span>
          </span>
        ) : (
          <span className="small">
            <Tag color="success" className="task-tag">Ready</Tag>
            {plural(j.count - j.failed.length, 'variation')} · {timeAgo(j.minutesAgo)}
          </span>
        )}
      </span>
      {j.unseen && <i className="unseen-dot" aria-label="Not opened yet" />}
      <RightOutlined className="ov-chev" />
    </button>
  );
}

export function Overview() {
  const { accountId, windowDays, jobs } = useStore();
  const bp = Grid.useBreakpoint();
  const nav = useNavigate();
  const account = DEMO_ACCOUNTS.find((a) => a.id === accountId) ?? DEMO_ACCOUNTS[0];
  const win = WINDOWS.find((w) => w.days === windowDays) ?? WINDOWS[1];
  const ads = account.creatives.map((c) => graded(c, windowDays));

  // Spend and results for the period (same numbers Radar sums).
  const spend = ads.reduce((s, c) => s + c.spend, 0);
  const purchases = ads.reduce((s, c) => s + (c.values.cpa ? c.spend / c.values.cpa : 0), 0);
  const cpa = purchases ? spend / purchases : 0;
  const roas = spend ? ads.reduce((s, c) => s + (c.roas ?? 0) * c.spend, 0) / spend : 0;
  const ctr = spend ? ads.reduce((s, c) => s + c.values.ctr * c.spend, 0) / spend : 0;

  const counts = TABS.map((t) => ({ ...t, n: ads.filter((c) => c.tab === t.key).length }));

  // Fix first: top 3 ads by spend with a C or D on their goal's metric.
  const fixFirst = ads
    .map((c) => ({ c, ...goalGrade(c) }))
    .filter((x) => /^[CD]/.test(x.grade ?? ''))
    .sort((a, b) => b.c.spend - a.c.spend)
    .slice(0, 3);

  // Rounds in progress or ready (last 7 days, this account).
  const rounds = jobs
    .filter((j) => findCreative(j.creativeId)?.accountId === account.id && !j.label)
    .filter((j) => j.state === 'generating' || j.state === 'queued' || (j.state === 'ready' && j.minutesAgo < 7 * 1440))
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, 4);

  // Variation ads vs their originals.
  const pairs = ads
    .filter((c) => c.variationOf)
    .map((c) => ({ c, parent: ads.find((p) => p.id === c.variationOf) ?? findCreative(c.variationOf)! }))
    .filter((x) => x.parent);

  return (
    <motion.div {...pageTransition} className="page overview">
      <div className="page-head ov-head">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Overview
          </Typography.Title>
          <p className="muted desc">How {account.name} is doing, and where to look first.</p>
        </div>
        <Tooltip title="Set on Radar. Overview uses the same period.">
          <span className="period-chip">
            <CalendarOutlined /> {win.short}
            {bp.md && <span className="window-dates">{win.long.split(' · ')[1]}</span>}
          </span>
        </Tooltip>
      </div>

      <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-kpis" aria-label="Spend and results">
        <Kpi hero label="Spend" value={money(spend).replace(/\.\d\d$/, '')} help={`${plural(ads.length, 'ad')} with spend`} />
        <Kpi label="Purchases" value={Math.round(purchases).toLocaleString('en-US')} help="From ads graded on CPA" />
        <Kpi label="CPA" value={money(cpa)} help={`Account average ${money(account.avg.cpa)}`} />
        <Kpi label="ROAS" value={roas.toFixed(2)} help="Revenue per $1 of spend" />
        <Kpi label="CTR" value={`${ctr.toFixed(2)}%`} help={`Account average ${account.avg.ctr.toFixed(2)}%`} />
      </motion.section>

      <div className="ov-grid">
        <div className="ov-col">
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-fix">
            <div className="ov-sec-head">
              <h4 className="panel-title">Fix first</h4>
              <Link to="/" className="small">Open Radar</Link>
            </div>
            <p className="t-help ov-sec-help">The ads spending most with a C or D on the metric their goal needs.</p>
            {fixFirst.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing to fix first. Every ad is B or above on its goal." />
            ) : (
              <ol className="ov-list">
                {fixFirst.map(({ c, goal, metric, grade }) => (
                  <li key={c.id}>
                    <button className="ov-row" onClick={() => nav(`/ad/${c.id}`)}>
                      <Thumb c={c} size={40} />
                      <span className="ov-row-text">
                        <b>{c.name}</b>
                        <span className="ov-fix-line small">
                          <GradeChip g={grade} />
                          <span>{metric === 'conversion' ? 'CPA' : METRIC_META[metric].label}</span>
                          <span className="muted">·</span>
                          <span className="muted ov-goal">
                            {GOAL_ICON[goal]} {goal}
                          </span>
                        </span>
                      </span>
                      <span className="ov-row-end small">{money(c.spend).replace(/\.\d\d$/, '')}</span>
                      <RightOutlined className="ov-chev" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </motion.section>

          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-vars">
            <h4 className="panel-title">Variation ads vs their originals</h4>
            <p className="t-help ov-sec-help">Ads made in Atria, graded against the ad they came from.</p>
            {pairs.length === 0 ? (
              <p className="t-help">No variation ads running yet. Variations you test in Meta show up here once they have data.</p>
            ) : (
              <div className="ov-pairs">
                <div className="ov-pair ov-pair-head t-label">
                  <span>Variation</span>
                  <span>Overall</span>
                  <span>CPA</span>
                </div>
                {pairs.map(({ c, parent }) => {
                  const better = c.values.cpa < parent.values.cpa;
                  return (
                    <button key={c.id} className="ov-pair" onClick={() => nav(`/ad/${c.id}`)}>
                      <span className="ov-pair-name">
                        <Thumb c={c} size={32} />
                        <span className="ov-row-text">
                          <b>{c.name}</b>
                          <span className="t-help">From {parent.name}</span>
                        </span>
                      </span>
                      <span className="ov-pair-grade">
                        <OverallTag creative={c} />
                        <span className="muted small">vs {parent.overall}</span>
                      </span>
                      <span className={`ov-pair-cpa small ${better ? 'up' : 'down'}`}>
                        {money(c.values.cpa)}
                        <span className="muted"> vs {money(parent.values.cpa)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.section>
        </div>

        <div className="ov-col">
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-glance">
            <h4 className="panel-title">Grades at a glance</h4>
            <p className="t-help ov-sec-help">{plural(ads.length, 'ad')} graded on the {win.short.toLowerCase()}.</p>
            <div className="ov-grades">
              {counts.map((t) => (
                <Link key={t.key} to={`/?tab=${t.key}`} className={`ov-grade ${TAB_TONE[t.key]}`}>
                  <span className="ov-grade-n">{t.n}</span>
                  <span className="ov-grade-label">
                    {t.label} <RightOutlined />
                  </span>
                </Link>
              ))}
            </div>
            <div className="ov-grade-bar" aria-hidden>
              {counts.map((t) => (
                <i key={t.key} className={TAB_TONE[t.key]} style={{ flexGrow: t.n }} />
              ))}
            </div>
          </motion.section>

          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel ov-rounds">
            <h4 className="panel-title">Variation rounds</h4>
            <p className="t-help ov-sec-help">In progress or ready in the last 7 days.</p>
            {rounds.length === 0 ? (
              <div className="ov-empty-rounds">
                <p className="t-help">No rounds yet for {account.name}. Pick an ad under Fix first to create variations.</p>
                {fixFirst[0] && (
                  <Button size="small" onClick={() => nav(`/ad/${fixFirst[0].c.id}`)}>
                    Open {fixFirst[0].c.name}
                  </Button>
                )}
              </div>
            ) : (
              <ul className="ov-list">
                {rounds.map((j) => (
                  <li key={j.id}>
                    <RoundRow j={j} />
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
