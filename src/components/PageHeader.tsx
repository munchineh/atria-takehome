import type { ReactNode } from 'react';
import { Breadcrumb, Typography } from 'antd';

/**
 * Page header (S-05, S-31, S-32 in handoffs/ui-system-rules.md). Every page's top section, built one way:
 * optional breadcrumb (plain links), title with at most one status tag, one line on what the page is for,
 * and actions on the right: at most one primary, the rest default buttons of the same height, destructive ones in a menu.
 */
export function PageHeader({
  title,
  desc,
  tag,
  eyebrow,
  actions,
  crumbs,
  className = '',
}: {
  title: ReactNode;
  desc: ReactNode;
  tag?: ReactNode;
  /** Status chips above the title (Mancini 14:47): what state this thing is in, before its name. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  crumbs?: { title: ReactNode }[];
  className?: string;
}) {
  return (
    <header className={`ph ${className}`}>
      {crumbs && <Breadcrumb className="ph-crumbs" items={crumbs} />}
      <div className="ph-row">
        <div className="ph-text">
          {eyebrow && <div className="ph-eyebrow">{eyebrow}</div>}
          <div className="ph-title-row">
            <Typography.Title level={1} className="page-title">
              {title}
            </Typography.Title>
            {tag}
          </div>
          <p className="desc">{desc}</p>
        </div>
        {actions && <div className="ph-actions">{actions}</div>}
      </div>
    </header>
  );
}
