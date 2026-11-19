import { useMemo, useState, type HTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Grid, Segmented, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FilterOutlined, InfoCircleOutlined, BranchesOutlined, DownOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, CREATIVES, METRIC_META, money, short, type Creative, type Media } from '../data/mock';
import { useStore } from '../data/store';
import { Thumb } from '../components/Thumb';
import { GradeTag, OverallTag } from '../components/GradeTag';
import { StatusCell } from '../components/StatusCell';
import { duration, ease, listDelay, pageTransition, spring } from '../motion/tokens';

type TabKey = 'winners' | 'potential' | 'candidates' | 'all';
const TABS: { key: TabKey; label: string; icon: string; tip: string }[] = [
  { key: 'winners', label: 'Winners', icon: '🏆', tip: 'Top grades across the board. Scale these.' },
  { key: 'potential', label: 'High iteration potential', icon: '⚑', tip: 'Strong in one metric, weak in another. A focused fix could lift them.' },
  { key: 'candidates', label: 'Iteration candidates', icon: '··', tip: 'Weaker overall, but enough spend to be worth a try.' },
  { key: 'all', label: 'All', icon: '', tip: 'Every creative in the window.' },
];

const MediaTag = ({ m }: { m: Media }) => <Tag className={`media-tag media-${m.toLowerCase()}`}>{m}</Tag>;

function NameCell({ c, morph = true }: { c: Creative; morph?: boolean }) {
  const parent = c.variationOf ? CREATIVES.find((x) => x.id === c.variationOf) : null;
  return (
    <div className="name-cell">
      <Thumb kind={c.thumb} layoutId={morph ? `creative-${c.id}` : undefined} />
      <div className="name-text">
        <Tooltip title={c.name} placement="topLeft" mouseEnterDelay={0.6}>
          <div className="name ellipsis">{c.name}</div>
        </Tooltip>
        <div className="name-sub">
          <MediaTag m={c.media} />
          <span className="muted">{c.ads.length} ads</span>
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.enter, delay: listDelay(i) } }}
    />
  );
};

export function Radar() {
  const nav = useNavigate();
  const bp = Grid.useBreakpoint();
  const cards = !bp.md; // below tablet width
  const { status } = useStore();
  const [tab, setTab] = useState<TabKey>('potential');
  const [media, setMedia] = useState<'All' | Media>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      CREATIVES.filter((c) => (tab === 'all' ? true : c.tab.includes(tab)))
        .filter((c) => media === 'All' || c.media === media)
        .sort((a, b) => b.spend - a.spend),
    [tab, media],
  );
  const count = (k: TabKey) => (k === 'all' ? CREATIVES.length : CREATIVES.filter((c) => c.tab.includes(k)).length);
  const open = (c: Creative) => nav(`/ad/${c.id}`);

  const columns: ColumnsType<Creative> = [
    { title: 'Ad name', key: 'name', width: 300, fixed: 'left', render: (_, c) => <NameCell c={c} /> },
    {
      title: (
        <span>
          Next step{' '}
          <Tooltip title="What to fix first. Click to see the issue and its fix.">
            <InfoCircleOutlined className="muted" />
          </Tooltip>
        </span>
      ),
      key: 'rec',
      width: 210,
      render: (_, c) => <StatusCell creative={c} status={status[c.id]} />,
    },
    { title: 'Overall', key: 'overall', width: 90, render: (_, c) => <OverallTag creative={c} /> },
    { title: 'Conversion', key: 'conv', width: 95, render: (_, c) => <GradeTag creative={c} metric="conversion" /> },
    { title: 'Hook', key: 'hook', width: 70, render: (_, c) => <GradeTag creative={c} metric="hook" /> },
    { title: 'Retention', key: 'ret', width: 85, render: (_, c) => <GradeTag creative={c} metric="retention" /> },
    { title: 'CTR', key: 'ctr', width: 70, render: (_, c) => <GradeTag creative={c} metric="ctr" /> },
    { title: 'Spend', key: 'spend', width: 115, align: 'right', sorter: (a, b) => a.spend - b.spend, defaultSortOrder: 'descend', render: (_, c) => money(c.spend) },
    { title: 'CPA', key: 'cpa', width: 90, align: 'right', render: (_, c) => <span className="cpa">{money(c.values.cpa)}</span> },
  ];

  return (
    <motion.div {...pageTransition} className="page radar">
      <div className="page-head">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Radar
        </Typography.Title>
        <p className="muted desc">
          Radar grades each creative against the rest of this account over the last {ACCOUNT.windowDays} days, using our AI-powered algorithm built on
          insights from over $1 billion in ad spend. Best results with ad spend over $10,000/month.
        </p>
      </div>

      <div className="filter-bar">
        <Button icon={<FilterOutlined />}>Dimension filter</Button>
        <Segmented
          value={media}
          onChange={(v) => setMedia(v as typeof media)}
          options={['All', 'Image', 'Video', 'Carousel'].map((m) => ({ label: m, value: m }))}
          aria-label="Media type"
        />
        <span className="window muted">Grades: {ACCOUNT.windowLabel}</span>
      </div>

      {cards ? (
        <Segmented
          block
          className="radar-seg"
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          options={TABS.map((t) => ({
            value: t.key,
            label: (
              <span className="seg-label">
                <span>{{ winners: 'Winners', potential: 'Potential', candidates: 'Candidates', all: 'All' }[t.key]}</span>
                <span className="seg-count">{count(t.key)}</span>
              </span>
            ),
          }))}
        />
      ) : (
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        className="radar-tabs"
        items={TABS.map((t) => ({
          key: t.key,
          label: (
            <span className="tab-label">
              {t.icon && <span className="tab-icon">{t.icon}</span>}
              {t.label} <span className="tab-count">{count(t.key)}</span>
              {!cards && (
                <Tooltip title={t.tip}>
                  <InfoCircleOutlined className="muted" />
                </Tooltip>
              )}
            </span>
          ),
        }))}
      />
      )}

      {cards ? (
        <div className="radar-cards">
          <AnimatePresence mode="popLayout" initial>
            {rows.map((c, i) => (
              <motion.article
                key={`${tab}-${media}-${c.id}`}
                layout="position"
                className="radar-card"
                onClick={() => open(c)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.enter, delay: listDelay(i) } }}
                exit={{ opacity: 0, transition: { duration: duration.instant } }}
              >
                <NameCell c={c} morph={false} />
                <StatusCell creative={c} status={status[c.id]} />
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
                      animate={{ opacity: 1, height: 'auto', transition: { height: spring.layout, opacity: { duration: duration.base, delay: 0.04 } } }}
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
          scroll={{ x: 1100 }}
          size="middle"
          components={{ body: { row: MotionRow } }}
          onRow={(c, i) => ({ onClick: () => open(c), className: 'clickable-row', 'data-index': i } as never)}
          pagination={{ total: rows.length, pageSize: 20, showTotal: (t) => `Total ${t} items`, showSizeChanger: false }}
        />
      )}
    </motion.div>
  );
}
