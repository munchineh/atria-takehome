import { Tag, Tooltip } from 'antd';
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
 * Ad page goal pill (chat 5c, Mancini 19:08: make goals obvious). Reads "Goal: Sales · get purchases".
 * The goal comes from the campaign objective; when copies run under different objectives, the one with
 * most spend wins and the tooltip says so.
 */
export function GoalPill({ c }: { c: Creative }) {
  const goal = goalOf(c);
  const mixed = new Set(c.ads.map(objectiveOf)).size > 1;
  const tip = `From the campaign objective in ${c.ads[0]?.platform ?? 'Meta'}. Suggestions are ordered by what this goal needs most.${mixed ? ` Copies run under different objectives. Most spend is in ${goal} campaigns.` : ''}`;
  return (
    <Tooltip title={tip}>
      <Tag className="goal-pill" icon={GOAL_ICON[goal]}>
        Goal: <b>{goal}</b> · {GOALS[goal].plain}
      </Tag>
    </Tooltip>
  );
}
