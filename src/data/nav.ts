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
  `${ws === 'creation' ? `/creation/${creativeId}/${variationId}` : `/ad/${creativeId}/variations/${variationId}`}?round=${jobId}${text ? '&text=1' : ''}`;

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
