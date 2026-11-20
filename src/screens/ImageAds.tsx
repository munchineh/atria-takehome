import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, Grid, Popover, Select, Tag, Tooltip, Typography } from 'antd';
import { CopyOutlined, FormOutlined, RightOutlined } from '@ant-design/icons';
import { MadeFromIcon } from '../components/Icons';
import { motion } from 'motion/react';
import { plural } from '../data/mock';
import { ALL_CREATIVES, DEMO_ACCOUNTS, useStore, type Job } from '../data/store';
import { Thumb } from '../components/Thumb';
import { GradeChip } from '../components/GradeTag';
import { TeachingCard } from '../components/TeachingCard';
import { duration, ease, listDelay, pageTransition } from '../motion/tokens';

type Source = 'radar' | 'clone' | 'scratch';
const SOURCE_LABEL: Record<Source, string> = { radar: 'From Radar', clone: 'Cloned', scratch: 'From scratch' };

interface Row {
  key: string;
  source: Source;
  brand: string;
  name: string;
  img: string;
  campaigns: string[];
  rounds: number;
  variations: number;
  last: string;
  grade?: ReturnType<typeof GradeChip> | null;
  overall?: string | null;
  status?: { kind: 'generating'; count: number } | { kind: 'new'; count: number };
  to?: string;
  variationOf?: string;
}


const HOW = (
  <div className="grade-pop">
    <p>Every creative you make in Atria is kept here. Variations are grouped by the ad they came from, and each time you create variations is one round.</p>
    <p>Cloned ads and ads made from scratch have their own&nbsp;entries.</p>
  </div>
);

function Campaigns({ list }: { list: string[] }) {
  if (!list.length) return <span className="muted small">No campaign yet</span>;
  return (
    <div className="pl-campaigns">
      {list.slice(0, 2).map((c) => (
        <Tooltip key={c} title={c} mouseEnterDelay={0.6}>
          <span className="pl-campaign">{c}</span>
        </Tooltip>
      ))}
      {list.length > 2 && <span className="muted small">+{plural(list.length - 2, 'more campaign', 'more campaigns')}</span>}
    </div>
  );
}

export function ImageAds() {
  const nav = useNavigate();
  const bp = Grid.useBreakpoint();
  const { jobs } = useStore();
  const [brand, setBrand] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [campaign, setCampaign] = useState<string>('all');

  const rows = useMemo<Row[]>(() => {
    const byCreative = new Map<string, Job[]>();
    for (const j of jobs) byCreative.set(j.creativeId, [...(byCreative.get(j.creativeId) ?? []), j]);
    const fromRadar: Row[] = [...byCreative.entries()].map(([cid, js]) => {
      const c = ALL_CREATIVES.find((x) => x.id === cid)!;
      const last = js.at(-1)!;
      const running = js.find((j) => j.state === 'generating' || j.state === 'queued');
      const unseen = js.find((j) => j.unseen);
      return {
        key: cid,
        source: (c.project ?? 'radar') as Source,
        brand: DEMO_ACCOUNTS.find((a) => a.id === c.accountId)!.name,
        name: c.name,
        img: c.img,
        campaigns: [...new Set(c.ads.map((a) => a.campaign))],
        rounds: js.length,
        // Hide empty projects (P1): a failed round with nothing kept doesn't count.
        variations: js.reduce((n, j) => n + (j.state === 'failed' ? 0 : j.count - j.failed.length), 0),
        last: last.date,
        overall: c.overall,
        status: running ? { kind: 'generating', count: running.count } : unseen ? { kind: 'new', count: unseen.count - unseen.failed.length } : undefined,
        to: `/ad/${cid}/variations?round=${last.id}`,
        variationOf: c.variationOf,
      };
    });
    return [...fromRadar].filter((r) => r.variations > 0 || r.status);
  }, [jobs]);

  const campaigns = [...new Set(rows.flatMap((r) => r.campaigns))];
  const shown = rows.filter(
    (r) => (brand === 'all' || r.brand === brand) && (source === 'all' || r.source === source) && (campaign === 'all' || r.campaigns.includes(campaign)),
  );

  return (
    <motion.div {...pageTransition} className="page image-ads">
      <div className="page-head pl-head">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Creative gallery
          </Typography.Title>
          <p className="muted desc">{plural(rows.filter((r) => r.source === 'radar').length, 'ad')} with variations</p>
        </div>
        <Popover content={HOW} title="How the gallery works" trigger="click" placement="bottomRight">
          <Button type="link" className="inline-link">
            How the gallery works
          </Button>
        </Popover>
      </div>

      <div className="filter-bar pl-filters">
        <Select
          value={brand}
          onChange={setBrand}
          options={[{ value: 'all', label: 'All brands' }, ...DEMO_ACCOUNTS.map((a) => ({ value: a.name, label: a.name }))]}
          popupMatchSelectWidth={false}
        />
        <Select
          value={source}
          onChange={setSource}
          options={[{ value: 'all', label: 'All sources' }, ...(['radar', 'clone', 'scratch'] as Source[]).map((s) => ({ value: s, label: SOURCE_LABEL[s] }))]}
          popupMatchSelectWidth={false}
        />
        <Select
          showSearch
          value={campaign}
          onChange={setCampaign}
          placeholder="Search campaigns"
          className="pl-campaign-select"
          popupClassName="wrap-options"
          popupMatchSelectWidth={bp.md ? 420 : true}
          optionFilterProp="label"
          options={[{ value: 'all', label: 'All campaigns' }, ...campaigns.map((c) => ({ value: c, label: c }))]}
        />
      </div>

      {shown.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<b>No ads match these filters</b>}>
          <Button
            onClick={() => {
              setBrand('all');
              setSource('all');
              setCampaign('all');
            }}
          >
            Clear filters
          </Button>
        </Empty>
      ) : (
        <ul className="pl-list">
          {shown.map((r, i) => (
            <motion.li
              key={r.key}
              className={`pl-row ${r.to ? 'link' : ''}`}
              onClick={() => r.to && nav(r.to)}
              role={r.to ? 'link' : undefined}
              tabIndex={r.to ? 0 : undefined}
              onKeyDown={(e) => r.to && e.key === 'Enter' && nav(r.to)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard, delay: listDelay(i) } }}
            >
              <Thumb c={{ img: r.img, media: 'Image', name: r.name }} size={bp.md ? 64 : 52} />
              <div className="pl-main">
                <div className="pl-name">
                  <span>{r.name}</span>
                  {r.status?.kind === 'new' && <i className="unseen-dot" aria-label="New" />}
                </div>
                <div className="pl-tags">
                  <Tag className="media-tag" icon={r.source === 'radar' ? undefined : r.source === 'clone' ? <CopyOutlined /> : <FormOutlined />}>
                    {SOURCE_LABEL[r.source]}
                  </Tag>
                  {r.variationOf && (
                    <Tag icon={<MadeFromIcon />} className="variation-tag">
                      Variation
                    </Tag>
                  )}
                  <span className="muted small">{r.brand}</span>
                </div>
                <Campaigns list={r.campaigns} />
              </div>
              <div className="pl-side">
                <div className="small">
                  <Tooltip title="Each time you create variations is one round.">
                    <span className="dotted">{plural(r.rounds, 'round')}</span>
                  </Tooltip>{' '}
                  · {plural(r.variations, 'variation')}
                </div>
                <div className="muted small">Last round {r.last}</div>
                <div className="pl-status">
                  {r.status?.kind === 'generating' && <span className="small">Generating {r.status.count}</span>}
                  {r.status?.kind === 'new' && <span className="small new">{r.status.count} new</span>}
                  {r.overall && (
                    <span className="small muted">
                      Overall <GradeChip g={r.overall as never} />
                    </span>
                  )}
                </div>
              </div>
              {r.to && <RightOutlined className="pl-chev muted" />}
            </motion.li>
          ))}
        </ul>
      )}
      <TeachingCard />
    </motion.div>
  );
}
