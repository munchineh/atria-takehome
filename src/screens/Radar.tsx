import { useMemo, useState, type HTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Checkbox, Empty, Grid, Popover, Segmented, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FilterOutlined, BranchesOutlined, DownOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { METRIC_META, RELIABLE_SPEND, TABS, WINDOW, money, plural, short, type Creative, type Media, type MetricKey } from '../data/mock';
import { ALL_CREATIVES, DEMO_ACCOUNTS } from '../data/store';
import { useStore } from '../data/store';
import { Thumb } from '../components/Thumb';
import { GradeTag, OverallTag } from '../components/GradeTag';
import { StatusCell } from '../components/StatusCell';
import { duration, ease, fadeUp, listDelay, pageTransition, spring } from '../motion/tokens';

type TabKey = (typeof TABS)[number]['key'];

const MediaTag = ({ m }: { m: Media }) => <Tag className={`media-tag media-${m.toLowerCase()}`}>{m}</Tag>;

function NameCell({ c, morph = true }: { c: Creative; morph?: boolean }) {
  const parent = c.variationOf ? ALL_CREATIVES.find((x) => x.id === c.variationOf) : null;
  return (
    <div className="name-cell">
      <Thumb c={c} layoutId={morph ? `creative-${c.id}` : undefined} />
      <div className="name-text">
        <Tooltip title={c.name} placement="topLeft" mouseEnterDelay={0.6}>
          <div className="name ellipsis">{c.name}</div>
        </Tooltip>
        <div className="name-sub">
          <MediaTag m={c.media} />
          <span className="muted">Running in {c.ads.length} {c.ads.length === 1 ? 'ad' : 'ads'}</span>
          {parent && (
            <Tag icon={<BranchesOutlined />} className="variation-tag">
              Variation of {short(parent.name, 10)}
            </Tag>
          )}
        </div>
      </div>
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

const HOW_GRADING = (
  <div className="grade-pop">
    <p>Each metric is ranked against every other creative in this account. Creatives with more spend count for more.</p>
    <p>A is the top 25%, D the bottom 25%. A plus or minus shows the upper or lower part of a band.</p>
    <p>Overall combines the grades a creative has. Hook and retention are graded on video only.</p>
    <p className="muted small">Built on patterns from over $1 billion in ad spend.</p>
  </div>
);

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
  { label: 'Placement', options: ['Feed', 'Stories', 'Reels'] },
  { label: 'Ad status', options: ['Active', 'Paused'] },
  { label: 'Source', options: ['Uploaded', 'Created in Atria'] },
];

/** "Filters" with grouped options (groups are an assumption about Atria's dimensions). */
function FiltersButton({ campaigns }: { campaigns: string[] }) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const total = Object.values(picked).flat().length;
  const content = (
    <div className="filters-pop">
      {[{ label: 'Campaign', options: campaigns }, ...FILTER_GROUPS].map((g) => (
        <div key={g.label} className="filters-group">
          <div className="filters-label">{g.label}</div>
          <Checkbox.Group
            value={picked[g.label] ?? []}
            onChange={(v) => setPicked((p) => ({ ...p, [g.label]: v as string[] }))}
            options={g.options.map((o) => ({ label: o, value: o }))}
          />
        </div>
      ))}
      <div className="filters-foot">
        <Button size="small" type="text" disabled={!total} onClick={() => setPicked({})}>
          Clear all
        </Button>
      </div>
    </div>
  );
  return (
    <Popover content={content} trigger="click" placement="bottomLeft">
      <Badge count={total} size="small" color="#f5582a">
        <Button icon={<FilterOutlined />}>Filters</Button>
      </Badge>
    </Popover>
  );
}

export function Radar() {
  const nav = useNavigate();
  const bp = Grid.useBreakpoint();
  const cards = !bp.md; // below tablet width
  const { statusOf, accountId } = useStore();
  const account = DEMO_ACCOUNTS.find((a) => a.id === accountId) ?? DEMO_ACCOUNTS[0];
  const CREATIVES = account.creatives;
  const lowSpend = account.monthlySpend < RELIABLE_SPEND;
  const [tab, setTab] = useState<TabKey>('potential');
  const [media, setMedia] = useState<'All' | Media>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      CREATIVES.filter((c) => (tab === 'all' ? true : c.tab === tab))
        .filter((c) => media === 'All' || c.media === media)
        .sort((a, b) => b.spend - a.spend),
    [tab, media, CREATIVES],
  );
  const count = (k: TabKey) => (k === 'all' ? CREATIVES.length : CREATIVES.filter((c) => c.tab === k).length);
  const open = (c: Creative) => nav(`/ad/${c.id}`);

  const columns: ColumnsType<Creative> = [
    { title: 'Creative', key: 'name', width: 290, fixed: 'left', render: (_, c) => <NameCell c={c} /> },
    {
      title: <Head label="Next step" tip="The weakest grade on this creative. Click the row to see the fix" />,
      key: 'rec',
      width: 235,
      render: (_, c) => <StatusCell creative={c} status={statusOf(c.id)} />,
    },
    { title: 'Overall', key: 'overall', width: 90, render: (_, c) => <OverallTag creative={c} /> },
    metricCol('conversion', 'conv', 100),
    metricCol('hook', 'hook', 70),
    metricCol('retention', 'ret', 90),
    metricCol('ctr', 'ctr', 70),
    { title: 'Spend', key: 'spend', width: 115, align: 'right', sorter: (a, b) => a.spend - b.spend, defaultSortOrder: 'descend', render: (_, c) => money(c.spend) },
    { title: 'CPA', key: 'cpa', width: 90, align: 'right', render: (_, c) => <span className="cpa">{money(c.values.cpa)}</span> },
  ];

  return (
    <motion.div {...pageTransition} className="page radar">
      <div className="page-head">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Radar
        </Typography.Title>
        <p className="muted desc">Grades each creative against the others in this account, so you can see what to fix first</p>
      </div>

      <AnimatePresence initial={false}>
        {lowSpend && (
          <motion.div key={account.id} variants={fadeUp} initial="hidden" animate="show" exit="exit" className="spend-alert">
            <Alert
              type="info"
              showIcon
              message={`Radar works best on accounts that spend over ${money(RELIABLE_SPEND).replace('.00', '')} a month. This one spends about ${money(account.monthlySpend).replace('.00', '')}, so read its grades as a rough guide.`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="filter-bar">
        <FiltersButton key={account.id} campaigns={[...new Set(CREATIVES.flatMap((c) => c.ads.map((a) => a.campaign)))]} />
        <Segmented
          value={media}
          onChange={(v) => setMedia(v as typeof media)}
          options={['All', 'Image', 'Video', 'Carousel'].map((m) => ({ label: m === 'All' ? 'All media' : m, value: m }))}
          aria-label="Media type"
        />
        <span className="window muted">
          <span className="window-long">{WINDOW.long}</span>
          <span className="window-short">{WINDOW.short}</span> ·{' '}
          <Popover content={HOW_GRADING} title="How grading works" trigger="click" placement="bottomRight">
            <Button type="link" size="small" className="inline-link">
              How grading works
            </Button>
          </Popover>
        </span>
      </div>

      {cards ? (
        <div className="radar-grid-tabs" role="tablist" aria-label="Radar views">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              <span>{t.label}</span>
              <span className="seg-count">{count(t.key)}</span>
            </button>
          ))}
        </div>
      ) : (
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
      )}

      <div className="tab-desc" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={tab} variants={fadeUp} initial="hidden" animate="show" exit="exit">
            {TABS.find((t) => t.key === tab)!.desc}
          </motion.p>
        </AnimatePresence>
      </div>

      {rows.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="radar-empty">
          {tab === 'winners' && media === 'All' ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><b>No winners in the last 60 days</b><br />No creative is strong on every graded metric yet. The closest are under One weak metric.</>}>
              <Button onClick={() => setTab('potential')}>View one weak metric</Button>
            </Empty>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<b>No {media === 'All' ? '' : `${media.toLowerCase()} `}creatives in this tab</b>}>
              {media !== 'All' && <Button onClick={() => setMedia('All')}>Show all media</Button>}
            </Empty>
          )}
        </motion.div>
      ) : cards ? (
        <div className="radar-cards">
          <AnimatePresence initial>
            {rows.map((c, i) => (
              <motion.article
                key={`${tab}-${media}-${c.id}`}
                className="radar-card"
                onClick={() => open(c)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(i) } }}
                exit={{ opacity: 0, transition: { duration: duration.instant } }}
              >
                <NameCell c={c} morph={false} />
                <StatusCell creative={c} status={statusOf(c.id)} />
                <div className="card-row">
                  <span className="card-overall">
                    Overall <OverallTag creative={c} />
                  </span>
                  <span className="muted small">{money(c.spend)} spend</span>
                  <button
                    className="card-more"
                    aria-expanded={expanded === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded((x) => (x === c.id ? null : c.id));
                    }}
                  >
                    All grades{' '}
                    <motion.span animate={{ rotate: expanded === c.id ? 180 : 0 }} transition={spring.snappy} style={{ display: 'inline-flex' }}>
                      <DownOutlined />
                    </motion.span>
                  </button>
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
                          CPA <b className="ink">{money(c.values.cpa)}</b>
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Table<Creative>
          key={`${tab}-${media}`}
          rowKey="id"
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1115 }}
          size="middle"
          components={{ body: { row: MotionRow } }}
          onRow={(c, i) => ({ onClick: () => open(c), className: 'clickable-row', 'data-index': i } as never)}
          pagination={{ total: rows.length, pageSize: 20, showTotal: (t) => plural(t, 'creative'), showSizeChanger: false }}
        />
      )}
    </motion.div>
  );
}
