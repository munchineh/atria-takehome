/**
 * Live Gemini generation for demo testers (chat 5d, ledger L-163).
 * The Worker holds the key and the daily caps; this file only asks for images and tracks what's left.
 * When live generation is off or used up, callers keep the sample image they already have.
 */
import { useSyncExternalStore } from 'react';
import { adImage, registerImage } from '../components/Thumb';

export type Quota = { live: boolean; limit: number; left: number };
let quota: Quota = { live: false, limit: 10, left: 0 };
const subs = new Set<() => void>();
const set = (q: Quota) => {
  quota = q;
  subs.forEach((f) => f());
};
export const useQuota = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => quota,
  );

const visitor = (() => {
  try {
    let id = localStorage.getItem('atria.visitor');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('atria.visitor', id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
})();

export async function refreshQuota() {
  try {
    const r = await fetch('./api/quota', { headers: { 'x-visitor': visitor } });
    if (r.ok) set(await r.json());
  } catch {
    /* no Worker (vite preview, artifact): stays off */
  }
}

/** Draws a slot's image to a canvas (max 1024 px) and returns JPEG base64, so photos, inlined photos and SVG art all work. */
async function toJpeg(slot: string): Promise<string | null> {
  const src = adImage(slot);
  if (!src) return null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();
  const scale = Math.min(1, 1024 / Math.max(img.naturalWidth || 720, img.naturalHeight || 720));
  const c = document.createElement('canvas');
  c.width = Math.round((img.naturalWidth || 720) * scale);
  c.height = Math.round((img.naturalHeight || 720) * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.88).split(',')[1];
}

let n = 0;
/** Returns a new slot holding the generated image, or null to keep the sample. */
export async function generateLive(fromSlot: string, instruction: string, ratio: '2:3' | '3:4' = '2:3'): Promise<string | null> {
  if (!quota.live || quota.left <= 0) return null;
  try {
    const imageData = await toJpeg(fromSlot);
    if (!imageData) return null;
    const r = await fetch('./api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-visitor': visitor },
      body: JSON.stringify({ imageData, mime: 'image/jpeg', instruction, ratio }),
    });
    const out = (await r.json()) as { image?: string; left?: number; limit?: number; sample?: boolean; reason?: string };
    if (out.sample) {
      if (out.reason === 'limit') set({ ...quota, left: 0 });
      return null;
    }
    if (!out.image) return null;
    set({ ...quota, left: out.left ?? Math.max(0, quota.left - 1) });
    n += 1;
    const slot = `live-${Date.now()}-${n}`;
    registerImage(slot, out.image);
    return slot;
  } catch {
    return null;
  }
}

refreshQuota();
