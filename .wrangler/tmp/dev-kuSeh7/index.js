var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
var MODEL = "gemini-3.1-flash-image";
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
var day = /* @__PURE__ */ __name(() => new Date(Date.now() + 9 * 3600 * 1e3).toISOString().slice(0, 10), "day");
async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
__name(sha, "sha");
async function keys(req) {
  const d = day();
  const visitor = (req.headers.get("x-visitor") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "none";
  const ip = await sha(`atria:${req.headers.get("cf-connecting-ip") ?? ""}`);
  return { v: `v:${d}:${visitor}`, ip: `ip:${d}:${ip}`, all: `all:${d}` };
}
__name(keys, "keys");
async function quota(env, req) {
  const perVisitor = Number(env.PER_VISITOR ?? 10);
  const perDay = Number(env.PER_DAY ?? 150);
  const live = Boolean(env.GEMINI_API_KEY && env.LIMITS);
  if (!live) return { live, limit: perVisitor, left: 0, k: null, used: 0, all: 0 };
  const k = await keys(req);
  const [v, ip, all] = await Promise.all([k.v, k.ip, k.all].map((x) => env.LIMITS.get(x)));
  const used = Math.max(Number(v ?? 0), Number(ip ?? 0));
  const allN = Number(all ?? 0);
  const left = allN >= perDay ? 0 : Math.max(0, perVisitor - used);
  return { live, limit: perVisitor, left, k, used, all: allN };
}
__name(quota, "quota");
async function bump(env, k) {
  const ttl = { expirationTtl: 2 * 86400 };
  const [v, ip, all] = await Promise.all([k.v, k.ip, k.all].map((x) => env.LIMITS.get(x)));
  await Promise.all([
    env.LIMITS.put(k.v, String(Number(v ?? 0) + 1), ttl),
    env.LIMITS.put(k.ip, String(Number(ip ?? 0) + 1), ttl),
    env.LIMITS.put(k.all, String(Number(all ?? 0) + 1), ttl)
  ]);
}
__name(bump, "bump");
var toBase64 = /* @__PURE__ */ __name((buf) => {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s);
}, "toBase64");
async function generate(req, env) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: "forbidden" }, 403);
  const q = await quota(env, req);
  if (!q.live) return json({ sample: true, reason: "off" });
  if (q.left <= 0) return json({ sample: true, reason: "limit", limit: q.limit, left: 0 });
  const body = await req.json().catch(() => null);
  const image = body?.image ?? "";
  const instruction = (body?.instruction ?? "").slice(0, 600);
  if (!/^\/?(assets\/)?[\w.-]+\.(webp|jpe?g|png)$/i.test(image.replace(/^\.\//, "")) || !instruction) return json({ error: "bad request" }, 400);
  const src = await env.ASSETS.fetch(new Request(new URL(image.replace(/^\.\//, "/"), req.url)));
  if (!src.ok) return json({ error: "image not found" }, 400);
  const mime = src.headers.get("content-type")?.split(";")[0] ?? "image/webp";
  const data = toBase64(await src.arrayBuffer());
  const prompt = `You are making a new variation of this social media ad photo. ${instruction} Keep the same product, recognisable and accurate. Photographic, natural light. Do not add any text, letters, logos, prices or buttons to the image: the ad copy is added separately.`;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mime, data } }, { text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: body?.ratio === "3:4" ? "3:4" : "2:3", imageSize: "1K" } }
    })
  });
  if (!r.ok) return json({ error: "model", status: r.status }, 502);
  const out = await r.json();
  const part = out.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part?.inlineData) return json({ error: "no image" }, 502);
  await bump(env, q.k);
  return json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, left: Math.max(0, q.left - 1), limit: q.limit });
}
__name(generate, "generate");
var worker_default = {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    try {
      if (pathname === "/api/quota" && req.method === "GET") {
        const q = await quota(env, req);
        return json({ live: q.live, limit: q.limit, left: q.left });
      }
      if (pathname === "/api/generate" && req.method === "POST") return await generate(req, env);
      if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    } catch {
      return json({ error: "server" }, 500);
    }
    return env.ASSETS.fetch(req);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-WJA2IW/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-WJA2IW/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
