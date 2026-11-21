/**
 * 266 (Mancini 18:24): a page with unsaved changes can ask before the app navigates away. The shell's own buttons call
 * `leave(go)`; the page sets the guard while it has changes and clears it when it saves or unmounts.
 */
type Guard = (go: () => void) => void;
let current: Guard | null = null;
export const setLeaveGuard = (g: Guard | null) => {
  current = g;
};
export const leave = (go: () => void) => (current ? current(go) : go());
