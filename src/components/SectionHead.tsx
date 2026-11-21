import type { ReactNode } from 'react';

/**
 * One section heading for every page (Mancini 10:31).
 * Row 1: title, with an optional action on the right. Row 2: one line on what the section is for, with optional meta on the right.
 * Rule: a section that is one block puts this inside its card; a section that is a list of cards puts it above them, so cards never nest.
 */
export function SectionHead({ title, help, meta, action, id, bar }: { title: ReactNode; help?: ReactNode; meta?: ReactNode; action?: ReactNode; id?: string; bar?: boolean }) {
  return (
    <div className={`sec-head ${bar ? 'sec-head-bar' : ''}`}>
      <div className="sec-head-row">
        <h2 id={id} className="panel-title">
          {title}
        </h2>
        {action}
      </div>
      {(help || meta) && (
        <div className="sec-head-sub">
          {help && <span className="t-help sec-head-help">{help}</span>}
          {meta && <span className="t-help sec-head-meta">{meta}</span>}
        </div>
      )}
    </div>
  );
}
