import { Tooltip } from 'antd';
import { EyeOutlined, LinkOutlined, MessageOutlined, MobileOutlined, ShoppingCartOutlined, UserAddOutlined } from './AppIcons';
import type { ReactNode } from 'react';
import { goalOf, type Creative, type MetaAd, type Objective } from '../data/mock';

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
  const goal = goalOf(c);
  const mixed = new Set(c.ads.map(objectiveOf)).size > 1;
  const platform = c.ads[0]?.platform ?? 'Meta';
  const tip = `From the campaign objective in ${platform}. Suggestions are ordered by what this goal needs.${mixed ? ` Copies run under different objectives; most spend is in ${goal} campaigns.` : ''}`;
  return (
    <span className="goal-group">
      <Tooltip title={tip} placement="topRight">
        {/* Mancini 10:31: one pill in two parts, label on a deeper tint and value on a lighter one of the same hue. */}
        <span className="goal-split" tabIndex={0}>
          <span className="goal-split-k">Goal</span>
          <span className="goal-split-v">
            {GOAL_ICON[goal]}
            {goal}
          </span>
        </span>
      </Tooltip>
    </span>
  );
}
