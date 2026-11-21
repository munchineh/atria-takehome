import { Tag, Tooltip } from 'antd';
import { EyeOutlined, LinkOutlined, MessageOutlined, MobileOutlined, ShoppingCartOutlined, UserAddOutlined } from '@ant-design/icons';
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
      <Tooltip title={tip}>
        <Tag className="goal-pill" icon={GOAL_ICON[goal]}>
          {/* Mancini 09:43: "Sales · get purchases" said the same thing twice. One label, same KV style as the copies list. */}
          <span className="kv-k">Goal</span> <span className="goal-pill-name">{goal}</span>
        </Tag>
      </Tooltip>
    </span>
  );
}
