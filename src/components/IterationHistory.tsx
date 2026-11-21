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
export function IterationHistory({ items, limit = 5, empty, onNavigate }: { items: HistoryItem[]; limit?: number; empty: string; onNavigate?: () => void }) {
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
          <span className="t-label ih-group-title">Results in Meta</span>
          <ul className="ih-list">
            {results.map((r) => {
              const ad = findCreative(r.adId);
              const parent = findCreative(r.parentId);
              if (!ad) return null;
              return (
                <li key={r.id}>
                  <button type="button" className="ih-row" onClick={() => go(`/ad/${r.adId}`)}>
                    <Peek preview={<Creative c={ad} />} title={ad.name}><Thumb c={ad} size={36} /></Peek>
                    <span className="ih-text">
                      <span className="ih-head">
                        <b className="ih-name">{r.name}</b>
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
                          <WarningOutlined aria-hidden /> Repeats an earlier test
                        </span>
                      )}
                    </span>
                    <RightOutlined className="ih-chev" aria-hidden />
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
