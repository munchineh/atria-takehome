/**
 * Where round and editor pages live (plan items 1 and 18, DL-06).
 * The same two screens are reachable from two places, and stay in the place you came from:
 *   Analytics:  /ad/:id/variations            /ad/:id/variations/:vid
 *   Creation:   /creation/:id                 /creation/:id/:vid
 * Screens ask this hook for paths so nothing hard-codes "/ad/…" and throws people back into Analytics.
 */
import { useLocation } from 'react-router-dom';

export type Workspace = 'analytics' | 'creation';

export const roundPath = (ws: Workspace, creativeId: string, jobId?: string) =>
  `${ws === 'creation' ? `/creation/${creativeId}` : `/ad/${creativeId}/variations`}${jobId ? `?round=${jobId}` : ''}`;

export const editorPath = (ws: Workspace, creativeId: string, variationId: string, jobId: string, text = false) =>
  `${ws === 'creation' ? `/creation/${creativeId}/${variationId}/edit` : `/ad/${creativeId}/variations/${variationId}`}?round=${jobId}${text ? '&text=1' : ''}`;

export function useWorkspace() {
  const { pathname } = useLocation();
  const workspace: Workspace = pathname.startsWith('/creation') ? 'creation' : 'analytics';
  return {
    workspace,
    inCreation: workspace === 'creation',
    roundPath: (creativeId: string, jobId?: string) => roundPath(workspace, creativeId, jobId),
    editorPath: (creativeId: string, variationId: string, jobId: string, text = false) => editorPath(workspace, creativeId, variationId, jobId, text),
    /** The explicit way out of Creation: the ad's performance page in Radar. */
    radarPath: (creativeId: string) => `/ad/${creativeId}`,
  };
}

/**
 * Breadcrumb root for Analytics pages (Mancini 13:21): an ad opened from Overview says "Overview",
 * from Radar says "Radar". The last hub page visited in this tab decides, so rounds and the editor follow too.
 */
const HUB_KEY = 'atria.hub.v1';
export type Hub = 'radar' | 'overview' | 'library';
export function setHub(hub: Hub) {
  try {
    sessionStorage.setItem(HUB_KEY, hub);
  } catch {
    /* storage can be unavailable; crumbs then fall back to Radar */
  }
}
/** Row 304 (Mancini 20:45): an ad opened from Ad Details ("See performance") says "Ad Library". */
export function hubCrumb(): { label: string; to: string; hub: Hub } {
  let hub: string | null = null;
  try {
    hub = sessionStorage.getItem(HUB_KEY);
  } catch {
    hub = null;
  }
  if (hub === 'overview') return { label: 'Overview', to: '/overview', hub: 'overview' };
  if (hub === 'library') return { label: 'Ad Library', to: '/creation/ads', hub: 'library' };
  return { label: 'Radar', to: '/', hub: 'radar' };
}
