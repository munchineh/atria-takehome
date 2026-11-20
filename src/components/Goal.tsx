import { Grid, Tag, Tooltip } from 'antd';
import { EyeOutlined, LinkOutlined, MessageOutlined, MobileOutlined, ShoppingCartOutlined, UserAddOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { GOALS, goalOf, type Creative, type MetaAd, type Objective } from '../data/mock';

/** One icon per campaign objective (Meta's six). */
export const GOAL_ICON: Record<Objective, ReactNode> = {
  Sales: <ShoppingCartOutlined />,
  Leads: <UserAddOutlined />,
  Traffic: <LinkOutlined />,
  Awareness: <EyeOutlined />,
  Engagement: <MessageOutlined />,
  'App promotion': <MobileOutlined />,
};

export const objectiveOf = (a: MetaAd): Objective => a.objective ?? 'Sales';

/**
 * Ad page goal pill (K23, K31, K48, Item 5):
 * No colon, goal name in a compact pill (whitespace-nowrap), plain phrase as meta text on desktop.
 */
export function GoalPill({ c }: { c: Creative }) {
  const bp = Grid.useBreakpoint();
  const goal = goalOf(c);
  const mixed = new Set(c.ads.map(objectiveOf)).size > 1;
  const platform = c.ads[0]?.platform ?? 'Meta';
  const tip = `From the campaign objective in ${platform}.${mixed ? ` Copies run under different objectives. Most spend is in ${goal} campaigns.` : ''}`;
  return (
    <span className="goal-group">
      <Tooltip title={tip}>
        <Tag className="goal-pill" icon={GOAL_ICON[goal]}>
          <span className="goal-pill-name">{goal}</span>
        </Tag>
      </Tooltip>
      {bp.md && <span className="t-help goal-plain">{GOALS[goal].plain}</span>}
    </span>
  );
}
