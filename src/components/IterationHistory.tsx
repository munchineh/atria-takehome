import { Progress } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, RightOutlined, WarningOutlined } from './AppIcons';
import { useNavigate } from 'react-router-dom';
import type { HistoryItem } from '../data/insights';
import { findCreative, timeAgo } from '../data/store';
import { OverallTag } from './GradeTag';
import { Creative, Thumb } from './Thumb';
import { Peek } from './Peek';

/**
 * One iteration history for Overview, Radar and the ad page (Mancini 09:43, item 20).
 * Two groups: rounds made in Atria, then how the variation ads did once they ran.
 */
export function IterationHistory({ items, limit = 5, empty, onNavigate, resultsLabel = 'Results in Meta', currentId, originalId }: { items: HistoryItem[]; limit?: number; empty: string; onNavigate?: () => void; resultsLabel?: string | null; currentId?: string; /** 254: the first ad of the chain, shown as the first row. */ originalId?: string }) {
  const nav = useNavigate();
  const go = (to: string) => {
    onNavigate?.();
    nav(to);
  };
  const rounds = items.filter((x): x is Extract<HistoryItem, { kind: 'round' }> => x.kind === 'round').slice(0, limit);
  const results = items.filter((x): x is Extract<HistoryItem, { kind: 'result' }> => x.kind === 'result').slice(0, limit);
  if (!rounds.length && !results.length) return <p className="t-help ih-empty">{empty}</p>;

  return (
    <div className="ih">
      {rounds.length > 0 && (
        <div className="ih-group">
          <span className="t-label ih-group-title">Rounds</span>
          <ul className="ih-list">
            {rounds.map((r) => {
              const ad = findCreative(r.adId);
              if (!ad) return null;
              const active = r.job.state === 'generating' || r.job.state === 'queued';
              return (
                <li key={r.id}>
                  <button type="button" className="ih-row" onClick={() => go(`/ad/${r.adId}/variations?round=${r.id}`)}>
                    <Peek preview={<Creative c={ad} />} title={ad.name}><Thumb c={ad} size={36} /></Peek>
                    <span className="ih-text">
                      <b className="ih-name">{r.name}</b>
                      {active ? (
                        <span className="ih-progress">
                          <Progress percent={Math.round(r.job.progress * 100)} showInfo={false} size="small" strokeColor="#f66c30" />
                          <span className="t-help">{r.job.state === 'queued' ? 'Queued' : `${r.text} · ${Math.round(r.job.progress * 100)}%`}</span>
                        </span>
                      ) : (
                        <span className="t-help">
                          {r.text}
                          {' '}· {timeAgo(r.minutesAgo)}
                        </span>
                      )}
                    </span>
                    {r.job.unseen && <i className="unseen-dot" aria-label="Not opened yet" />}
                    <RightOutlined className="ih-chev" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {results.length > 0 && (
        <div className="ih-group">
          {resultsLabel && <span className="t-label ih-group-title">{resultsLabel}</span>}
          <ul className="ih-list">
            {/* 254 (Mancini 16:24): the chain starts with the original, which has nothing before it to compare against. */}
            {originalId && findCreative(originalId) && (() => {
              const o = findCreative(originalId)!;
              return (
                <li key={`orig-${o.id}`}>
                  <button type="button" className="ih-row" onClick={() => go(`/ad/${o.id}`)}>
                    <Peek preview={<Creative c={o} />} title={o.name}><Thumb c={o} size={36} /></Peek>
                    <span className="ih-text">
                      <span className="ih-head">
                        <b className="ih-name">{o.name}</b>
                        <span className="ih-orig">Original</span>
                        <span className="ih-grades" onClick={(e) => e.stopPropagation()}>
                          <OverallTag creative={o} />
                        </span>
                      </span>
                      <span className="t-help">The first ad in this chain</span>
                    </span>
                    <RightOutlined className="ih-chev" aria-hidden />
                  </button>
                </li>
              );
            })()}
            {results.map((r) => {
              const ad = findCreative(r.adId);
              const parent = findCreative(r.parentId);
              if (!ad) return null;
              const isCurrent = r.adId === currentId;
              return (
                <li key={r.id}>
                  <button type="button" className={`ih-row ${isCurrent ? 'is-current' : ''}`} aria-current={isCurrent ? 'page' : undefined} onClick={isCurrent ? undefined : () => go(`/ad/${r.adId}`)}>
                    <Peek preview={<Creative c={ad} />} title={ad.name}><Thumb c={ad} size={36} /></Peek>
                    <span className="ih-text">
                      <span className="ih-head">
                        <b className="ih-name">{r.name}</b>
                        {isCurrent && <span className="ih-this">This ad</span>}
                        <span className="ih-grades" onClick={(e) => e.stopPropagation()}>
                          <OverallTag creative={ad} />
                          {parent?.overall && <span className="t-help">vs {parent.overall}</span>}
                        </span>
                      </span>
                      <span className={`ih-delta tone-${r.tone}`}>
                        {/\bdown\b/i.test(r.text) ? <ArrowDownOutlined aria-hidden /> : <ArrowUpOutlined aria-hidden />}
                        <span>{r.text}</span>
                      </span>
                      {r.repeat && (
                        <span className="ih-repeat">
                          <WarningOutlined aria-hidden /> Tests an idea you already tried
                        </span>
                      )}
                    </span>
                    {!isCurrent && <RightOutlined className="ih-chev" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
