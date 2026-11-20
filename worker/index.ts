/**
 * Atria prototype Worker (chat 5d, ledger L-163).
 * Static assets are served by Cloudflare as before; only /api/* runs this script (run_worker_first).
 *
 *   GET  /api/quota     → { live, limit, left }
 *   POST /api/generate  → { image: dataURL } or { sample: true, reason }
 *
 * The Gemini key lives only in the Worker secret GEMINI_API_KEY. Per-visitor and site-wide daily
 * caps live in KV (binding LIMITS). If either is missing, live generation is off and the app
 * falls back to sample images, so a missing setup can never spend money.
 */

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}
interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
  LIMITS?: KV;
  GEMINI_API_KEY?: string;
  PER_VISITOR?: string;
  PER_DAY?: string;
}

const MODEL = 'gemini-3.1-flash-image';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** Day boundary at midnight Seoul time. */
const day = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

async function sha(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

async function keys(req: Request) {
  const d = day();
  const visitor = (req.headers.get('x-visitor') ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'none';
  const ip = await sha(`atria:${req.headers.get('cf-connecting-ip') ?? ''}`);
  return { v: `v:${d}:${visitor}`, ip: `ip:${d}:${ip}`, all: `all:${d}` };
}

async function quota(env: Env, req: Request) {
  const perVisitor = Number(env.PER_VISITOR ?? 10);
  const perDay = Number(env.PER_DAY ?? 150);
  const live = Boolean(env.GEMINI_API_KEY && env.LIMITS);
  if (!live) return { live, limit: perVisitor, left: 0, k: null as null | Awaited<ReturnType<typeof keys>>, used: 0, all: 0 };
  const k = await keys(req);
  const [v, ip, all] = await Promise.all([k.v, k.ip, k.all].map((x) => env.LIMITS!.get(x)));
  const used = Math.max(Number(v ?? 0), Number(ip ?? 0));
  const allN = Number(all ?? 0);
  const left = allN >= perDay ? 0 : Math.max(0, perVisitor - used);
  return { live, limit: perVisitor, left, k, used, all: allN };
}

async function bump(env: Env, k: NonNullable<Awaited<ReturnType<typeof keys>>>) {
  const ttl = { expirationTtl: 2 * 86400 };
  const [v, ip, all] = await Promise.all([k.v, k.ip, k.all].map((x) => env.LIMITS!.get(x)));
  await Promise.all([
    env.LIMITS!.put(k.v, String(Number(v ?? 0) + 1), ttl),
    env.LIMITS!.put(k.ip, String(Number(ip ?? 0) + 1), ttl),
    env.LIMITS!.put(k.all, String(Number(all ?? 0) + 1), ttl),
  ]);
}

const toBase64 = (buf: ArrayBuffer) => {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

async function generate(req: Request, env: Env) {
  // Only the prototype's own pages may call this.
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: 'forbidden' }, 403);

  const q = await quota(env, req);
  if (!q.live) return json({ sample: true, reason: 'off' });
  if (q.left <= 0) return json({ sample: true, reason: 'limit', limit: q.limit, left: 0 });

  const body = (await req.json().catch(() => null)) as { image?: string; imageData?: string; mime?: string; instruction?: string; ratio?: string; text?: string } | null;
  const instruction = (body?.instruction ?? '').slice(0, 600);
  if (!instruction) return json({ error: 'bad request' }, 400);
  let mime = 'image/webp';
  let data = '';
  if (body?.imageData) {
    // The app draws the source photo to a canvas and sends a JPEG (covers inlined photos and drawn SVG art).
    if (body.imageData.length > 3_000_000 || !/^image\/(webp|png|jpe?g)$/.test(body.mime ?? '')) return json({ error: 'bad image' }, 400);
    mime = body.mime!;
    data = body.imageData;
  } else {
    const image = (body?.image ?? '').replace(/^\.\//, '/');
    if (!/^\/?assets\/[\w.-]+\.(webp|jpe?g|png)$/i.test(image)) return json({ error: 'bad request' }, 400);
    const src = await env.ASSETS.fetch(new Request(new URL(image, req.url)));
    if (!src.ok) return json({ error: 'image not found' }, 400);
    mime = src.headers.get('content-type')?.split(';')[0] ?? 'image/webp';
    data = toBase64(await src.arrayBuffer());
  }

  // Stylized text (plan item 11): the model draws the headline into the image instead of the app overlaying it.
  const drawText = (body?.text ?? '').replace(/["\n\r]/g, ' ').slice(0, 120).trim();
  const prompt =
    `You are making a new variation of this social media ad photo. ${instruction} ` +
    'Keep the same product, recognisable and accurate. Photographic, natural light. ' +
    (drawText
      ? `Draw this ad text into the image in bold, expressive display lettering that suits the product, spelled exactly as written: "${drawText}". Add no other text or logos.`
      : 'Do not add any text, letters, logos, prices or buttons to the image: the ad copy is added separately.');

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mime, data } }, { text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: body?.ratio === '3:4' ? '3:4' : '2:3', imageSize: '1K' } },
    }),
  });
  if (!r.ok) return json({ error: 'model', status: r.status }, 502);
  const out = (await r.json()) as { candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[] };
  const part = out.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part?.inlineData) return json({ error: 'no image' }, 502);

  await bump(env, q.k!);
  return json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, left: Math.max(0, q.left - 1), limit: q.limit });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    try {
      if (pathname === '/api/quota' && req.method === 'GET') {
        const q = await quota(env, req);
        return json({ live: q.live, limit: q.limit, left: q.left });
      }
      if (pathname === '/api/generate' && req.method === 'POST') return await generate(req, env);
      if (pathname.startsWith('/api/')) return json({ error: 'not found' }, 404);
    } catch {
      return json({ error: 'server' }, 500);
    }
    return env.ASSETS.fetch(req);
  },
};
