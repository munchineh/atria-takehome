import { useState } from 'react';
import { MadeFromIcon } from './Icons';
import { Alert, Button, Drawer, Grid, Tag } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  HistoryOutlined,
  MinusOutlined,
  RightOutlined,
  WarningOutlined,
} from './AppIcons';
import { useNavigate } from 'react-router-dom';
import { hasLineage, lineageOf, type Lineage, type LineageStep } from '../data/lineage';
import { graded, money, plural, type Creative } from '../data/mock';
import { accountOf, useStore } from '../data/store';
import { useWorkspace } from '../data/nav';
import { GradeChip } from './GradeTag';
import { Thumb } from './Thumb';

function StepCard({
  step,
  all,
  isLast,
  onOpenAd,
  onOpenRound,
}: {
  step: LineageStep;
  all: Creative[];
  isLast: boolean;
  onOpenAd: (adId: string) => void;
  onOpenRound: (adId: string, jobId: string) => void;
}) {
  const dirIcon =
    step.result && step.result.pct !== 0 ? (
      step.result.pct > 0 ? (
        <ArrowUpOutlined aria-hidden />
      ) : (
        <ArrowDownOutlined aria-hidden />
      )
    ) : (
      <MinusOutlined aria-hidden />
    );

  return (
    <li className={`lin-item ${isLast ? 'is-last' : ''}`}>
      <div className="lin-rail" aria-hidden>
        <span className={`lin-letter ${step.current ? 'current' : ''} ${step.repeat ? 'repeat' : ''}`}>{step.letter}</span>
        {!isLast && <i className="lin-line" />}
      </div>

      <article className={`lin-card ${step.current ? 'is-current' : ''} ${step.repeat ? 'has-repeat' : ''}`}>
        <div className="lin-card-head">
          <Thumb c={{ img: step.img, media: 'Image', name: step.name }} size={44} />
          <div className="lin-card-id">
            <div className="lin-name-row">
              {step.current ? (
                <strong className="lin-name">{step.name}</strong>
              ) : (
                <button type="button" className="lin-name-btn" onClick={() => onOpenAd(step.id)}>
                  {step.name}
                </button>
              )}
              {step.letter === 'A' && <Tag className="lin-current-tag">Original</Tag>}
              {step.current && <Tag className="lin-current-tag is-this">This ad</Tag>}
            </div>
            {/* G2 (R-L) & G3 (R-N1): keep date + placement joined without trailing dot; spend on its own line in whole dollars. */}
            <div className="lin-meta">
              <span className="lin-meta-line">
                {step.date ? `${step.date}\u00a0·\u00a0${step.placement}` : step.placement}
              </span>
              <span className="lin-spend">{money(Math.round(step.spend)).replace(/\.\d\d$/, '')} spend</span>
            </div>
          </div>
          <div className="lin-grade">
            <GradeChip g={step.overall} />
          </div>
        </div>

        {step.result && (
          <div className={`lin-result ${step.result.better ? 'tone-good' : 'tone-bad'}`}>
            {dirIcon}
            <span className="lin-result-text">{step.result.text}</span>
            <span className="lin-result-range">
              {step.result.from} to {step.result.to}
            </span>
          </div>
        )}

        {/* Mancini 15:12: the first step says "Original" as a tag, so it needs no body line. */}
        {step.summary !== 'Original ad' && (
          <div className="lin-body">
            <p className="lin-summary">{step.summary}</p>
            {step.reason && <p className="lin-reason">{step.reason}</p>}
          </div>
        )}

        {step.repeat && (
          <div className="lin-repeat" role="status">
            <WarningOutlined aria-hidden />
            <div>
              <b>Repeats step {step.repeat.firstSeenLetter}</b>
              <p>{step.repeat.text}</p>
            </div>
          </div>
        )}

        {(step.rounds.length > 0 || step.branchIds.length > 0) && (
          <div className="lin-branches">
            {step.rounds.length > 0 && <span className="lin-branches-label">Variations made from this ad</span>}
            {step.rounds.map((r) => (
              <button key={r.jobId} type="button" className="lin-round" onClick={() => onOpenRound(step.id, r.jobId)}>
                <span className="lin-round-thumbs" aria-hidden>
                  {r.imgs.slice(0, 4).map((img, k) => (
                    <Thumb key={k} c={{ img, media: 'Image', name: '' }} size={40} />
                  ))}
                  {r.imgs.length > 4 && <span className="lin-round-more">+{r.imgs.length - 4}</span>}
                </span>
                <span className="lin-round-text">
                  <b>{r.date}</b>
                  <span className="t-help">
                    {plural(r.kept || r.count, 'variation')}
                    {r.versions > 0 ? `\u00a0· ${plural(r.versions, 'version')}` : ''}
                  </span>
                </span>
                <RightOutlined aria-hidden />
              </button>
            ))}
            {step.branchIds.map((bid) => {
              const b = all.find((x) => x.id === bid);
              if (!b) return null;
              return (
                <button key={bid} type="button" className="lin-branch-chip alt" onClick={() => onOpenAd(bid)}>
                  <MadeFromIcon />
                  <span>Branch{'\u00a0'}· {b.name}</span>
                  <RightOutlined aria-hidden />
                </button>
              );
            })}
          </div>
        )}
      </article>
    </li>
  );
}

export function LineageDrawer({
  open,
  onClose,
  lineage,
  all,
}: {
  open: boolean;
  onClose: () => void;
  lineage: Lineage;
  all: Creative[];
}) {
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const nav = useNavigate();
  const ws = useWorkspace();

  const openAd = (adId: string) => {
    onClose();
    nav(ws.radarPath(adId));
  };
  const openRound = (adId: string, jobId: string) => {
    onClose();
    nav(ws.roundPath(adId, jobId));
  };

  const firstRepeat = lineage.steps.find((s) => s.repeat);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement={mobile ? 'bottom' : 'right'}
      size={mobile ? 'large' : 560}
      styles={mobile ? { wrapper: { height: '86svh' } } : undefined}
      closable={!mobile}
      extra={
        mobile ? (
          <Button type="text" icon={<CloseOutlined />} aria-label="Close" className="sheet-close-btn" onClick={onClose} />
        ) : undefined
      }
      title={
        <div className="lin-drawer-title">
          <span className="lin-drawer-name">
            Ad history <Tag className="lin-path-tag">{lineage.path}</Tag>
          </span>
          <span className="t-help">See what changed at each step and how it did against the ad before it.</span>
        </div>
      }
      className={`lineage-drawer ${mobile ? 'pop-sheet lineage-sheet' : ''}`}
      destroyOnHidden
    >
      <div className="lin-intro">
        {lineage.repeats > 0 && (
          /* G4 (R-V): use the specific repeat explanation from the first repeating step instead of generic copy. */
          <Alert
            type="warning"
            showIcon
            title={`${plural(lineage.repeats, 'repeat pattern')} found in this chain.`}
            description={firstRepeat?.repeat?.text ?? 'A later step went back to something an earlier step had already moved away from.'}
          />
        )}
      </div>
      <ol className="lin-list">
        {lineage.steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            all={all}
            isLast={i === lineage.steps.length - 1}
            onOpenAd={openAd}
            onOpenRound={openRound}
          />
        ))}
      </ol>
    </Drawer>
  );
}

/**
 * Items 16 & 17 (DL-04): History entry button + Lineage drawer.
 * Shows on AdDetail and Results whenever hasLineage() is true.
 */
export function HistoryButton({ creative, size = 'small' }: { creative: Creative; size?: 'small' | 'middle' }) {
  const [open, setOpen] = useState(false);
  const { jobs, versionsOf, windowDays } = useStore();
  const acc = accountOf(creative);
  const all = acc.creatives.map((x) => graded(x, windowDays));

  if (!hasLineage(creative.id, all, jobs)) return null;
  const lineage = lineageOf(creative.id, all, jobs, versionsOf);
  if (!lineage) return null;

  return (
    <>
      {/* S-12: a help-level action in the page header is a text button with an icon, like Radar's. */}
      <Button type="text" size={size} icon={<HistoryOutlined />} className="history-btn" onClick={() => setOpen(true)}>
        History
        {lineage.repeats > 0 && <WarningOutlined className="hist-warn-ic" aria-label="Tests an idea you already tried" />}
      </Button>
      <LineageDrawer open={open} onClose={() => setOpen(false)} lineage={lineage} all={all} />
    </>
  );
}
