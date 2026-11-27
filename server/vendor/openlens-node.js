// Vendored from Philippe-arnd/OpenLens sdk/node/src/index.js at v0.7.0 (AGPL-3.0-only).
// @openlens/node is not on npm yet: replace this copy by the package once it is.
// Do not edit by hand; copy the file again to update it.

// OpenLens server SDK for Node (>= 18): a thin client over the HTTP API.
// Events are queued and sent in batches (every `flushInterval` ms or
// `flushAt` events). Errors never throw into the app: they go to `onError`.

import { monitorEventLoopDelay } from "node:perf_hooks";
import diagnostics from "node:diagnostics_channel";

/** @typedef {{ role?: string, account?: string, plan?: string }} Dimensions */

/** Distinct id of server events tied to no user: left out of user counts (#593). */
export const SERVER_ID = "$server";
/** Default length of one stats window (#593, decision 1): one event per
 * (method, route, status code) per window, never one per request. The
 * server may advertise a finer one (#628, D-091). */
export const STATS_WINDOW_MS = 10 * 60 * 1000;
/** The response header in which the server advertises the stats window, seconds (#628). */
export const STATS_WINDOW_HEADER = "x-openlens-stats-window";
/** Stats windows the server may advertise and `statsWindowSeconds` may set, seconds. */
const STATS_WINDOWS_S = [60, 300, 600];
/** Explicit bounds (seconds) of the `http.server.request.duration` histogram:
 * OpenTelemetry's defaults for it (#601). One more bucket holds the rest. */
export const BOUNDS_S = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10];
/** The header that carries the OpenLens session id: ours, so no tracing
 * instrumentation forwards it to other services (#601). */
export const SESSION_HEADER = "x-openlens-session";
/** Distinct (method, route, status code) keys kept per window: a bound on memory. */
const MAX_STATS_KEYS = 500;
/** Same error message sent at most this many times per minute. */
const MAX_SAME_ERROR = 5;
/** Sampling resolution of the event-loop delay histogram, ms (#610). */
const LOOP_RESOLUTION_MS = 20;
/** Largest event-loop delay sent, seconds: a bound, not a measure. */
const MAX_LOOP_DELAY_S = 3600;
/** Whether a client already sent this process's start (#610): once per process. */
let processStartSent = false;
/** Distinct external hosts kept per window by `captureOutgoing()` (#608):
 * calls to any other host count under `_OTHER`. */
export const MAX_CLIENT_HOSTS = 50;
/** Distinct (method, host, status, error) keys kept per window: a bound on memory. */
const MAX_CLIENT_KEYS = 500;
/** Node's documented diagnostics channels for outgoing HTTP requests (#608):
 * `http`/`https` client requests, and undici's, which the global `fetch` uses. */
const CLIENT_CHANNELS = {
  httpStart: "http.client.request.start",
  httpResponse: "http.client.response.finish",
  httpError: "http.client.request.error",
  undiciCreate: "undici:request:create",
  undiciHeaders: "undici:request:headers",
  undiciError: "undici:request:error",
};

/** Variables hosts set to the deployed commit, in order of preference (#495). */
const COMMIT_VARS = [
  "SOURCE_COMMIT",
  "GITHUB_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "CF_PAGES_COMMIT_SHA",
  "RENDER_GIT_COMMIT",
  "HEROKU_SLUG_COMMIT",
];

/**
 * The release the host exposes: the deployed commit (shortened to 12
 * characters when it is a full hash), else the package version npm or a
 * script runner sets. `undefined` when the host says nothing.
 * @param {Record<string, string | undefined>} env
 * @returns {string | undefined}
 */
export function detectRelease(env) {
  for (const name of COMMIT_VARS) {
    const v = (env[name] || "").trim();
    if (v) return /^[0-9a-f]{13,64}$/i.test(v) ? v.slice(0, 12).toLowerCase() : v.slice(0, 200);
  }
  const version = (env.npm_package_version || "").trim();
  return version ? version.slice(0, 200) : undefined;
}

export class OpenLens {
  /**
   * @param {{ host: string, key: string, release?: string, environment?: string,
   *   flushAt?: number, flushInterval?: number, onError?: (e: unknown) => void,
   *   fetch?: typeof fetch, statsWindowSeconds?: number }} opts
   */
  constructor(opts) {
    if (!opts || !opts.host || !opts.key) throw new Error("OpenLens: host and key are required");
    this.host = opts.host.replace(/\/$/, "");
    this.key = opts.key;
    // An explicit release wins; else what the host exposes (#495).
    this.release = opts.release || detectRelease(process.env);
    this.environment = opts.environment ?? process.env.NODE_ENV ?? "production";
    this.flushAt = opts.flushAt ?? 50;
    this.onError = opts.onError ?? (() => {});
    this.fetch = opts.fetch ?? globalThis.fetch;
    // The stats window (#628, D-091): an explicit `statsWindowSeconds`
    // (60, 300 or 600) wins; else the one the server advertises; else 10 minutes.
    this.statsWindowOverride = windowMs(opts.statsWindowSeconds);
    this.statsWindowMs = this.statsWindowOverride ?? STATS_WINDOW_MS;
    this.queue = [];
    /** @type {Map<string, any>} */
    this.stats = new Map();
    /** @type {Map<string, any>} */
    this.clientStats = new Map();
    this.seenErrors = new Map();
    this.reported = new WeakSet();
    this.seenMinute = 0;
    this.timer = setInterval(() => void this.flush(), opts.flushInterval ?? 5000);
    this.timer.unref?.();
  }

  /** Record an event for a user. */
  capture(distinctId, event, properties = {}) {
    if (!distinctId || !event) return;
    this.push(event, distinctId, properties);
  }

  /** Mark a use of a feature (a task start), as `openlens.feature()` does in the browser. */
  feature(distinctId, key, properties = {}) {
    this.capture(distinctId, "$feature", { ...properties, $feature: key });
  }

  /** Set the user's role (and account, plan): what OpenLens slices every KPI by. */
  identify(distinctId, dims = {}) {
    const p = {};
    if (dims.role) p.$role = dims.role;
    if (dims.account) p.$account = dims.account;
    if (dims.plan) p.$plan = dims.plan;
    this.capture(distinctId, "$identify", p);
  }

  /** Is a flag on for this user? Resolves to false on any error.
   * `dims`: { role, account, plan, properties: { seats: 12, … } } for rules. */
  async isEnabled(flag, distinctId, dims = {}) {
    try {
      const q = new URLSearchParams({ key: this.key, distinct_id: String(distinctId) });
      if (dims.role) q.set("role", dims.role);
      if (dims.account) q.set("account", dims.account);
      if (dims.plan) q.set("plan", dims.plan);
      for (const [k, v] of Object.entries(dims.properties || {}).slice(0, 20)) {
        if (v !== undefined && v !== null && v !== "") q.set(`p.${k.toLowerCase()}`, String(v));
      }
      const r = await this.fetch(`${this.host}/flags?${q}`);
      if (!r.ok) return false;
      const j = await r.json();
      return Array.isArray(j.flags) && j.flags.includes(flag);
    } catch (e) {
      this.onError(e);
      return false;
    }
  }

  /**
   * Report a server exception. It is sent as `$error` with `$kind: "server"`,
   * so it is grouped, alerted on and judged per release like a browser error.
   * `ctx` comes from `req.openlens` (the middleware) or is given by hand.
   * @param {unknown} err
   * @param {{ distinctId?: string, sessionId?: string, traceId?: string, route?: string,
   *   method?: string, properties?: Record<string, unknown> }} [ctx]
   */
  captureException(err, ctx = {}) {
    try {
      if (err && typeof err === "object") {
        if (this.reported.has(err)) return;
        this.reported.add(err);
      }
      const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : safeString(err));
      const message = `${e.name || "Error"}: ${e.message || ""}`.slice(0, 500);
      if (!this.allowError(message)) return;
      const stack = typeof e.stack === "string" ? e.stack.slice(0, 4000) : undefined;
      const props = { ...(ctx.properties || {}), $kind: "server", $message: message };
      if (stack) props.$stack = stack;
      const source = appFrame(stack);
      if (source) props.$source = source;
      // OpenTelemetry semantic-convention names next to OpenLens's own (#601).
      props["exception.type"] = (e.name || "Error").slice(0, 200);
      if (ctx.route) props["http.route"] = String(ctx.route).slice(0, 300);
      if (ctx.method) props["http.request.method"] = String(ctx.method).toUpperCase().slice(0, 10);
      if (ctx.traceId) props.trace_id = ctx.traceId;
      this.push("$error", ctx.distinctId || SERVER_ID, props, ctx.sessionId);
    } catch (e) {
      this.onError(e);
    }
  }

  /** Report uncaught exceptions and unhandled rejections, then let the
   * process fail as it would have. Opt-in. A crash exits at once, so its
   * event is sent only if the flush wins the race (best effort); a
   * rejection is flushed before the process fails. */
  captureUncaught() {
    process.on("uncaughtExceptionMonitor", (err) => {
      this.captureException(err);
      void this.flush();
    });
    process.on("unhandledRejection", (reason) => {
      this.captureException(reason);
      void this.flush().finally(() => {
        // Node's default for an unhandled rejection (since v15) is to crash.
        if (process.listenerCount("unhandledRejection") === 1) {
          setImmediate(() => {
            throw reason instanceof Error ? reason : new Error(safeString(reason));
          });
        }
      });
    });
  }

  /**
   * Count one request in its route's stats (any framework). `route` is the
   * route template (`/api/entries/:id`), never the raw URL. `traceId` and
   * `sessionId` describe the request if it becomes an exemplar (#607): the
   * slowest of its key's window, or the first answered 5xx. An exemplar
   * keeps the session, never the user (D-089).
   * @param {{ method: string, route: string, status: number, ms: number,
   *   traceId?: string, sessionId?: string }} r
   */
  recordRequest(r) {
    try {
      if (!r || !r.route) return;
      const now = Date.now();
      const len = this.statsWindowMs;
      const start = windowStart(now, len);
      const method = String(r.method || "GET").toUpperCase().slice(0, 10);
      const route = String(r.route).slice(0, 300);
      const raw = Math.trunc(Number(r.status) || 0);
      const status = raw >= 100 && raw < 600 ? raw : 0;
      const key = `${start} ${len} ${method} ${route} ${status}`;
      let s = this.stats.get(key);
      const secs = Math.max(0, Number(r.ms) || 0) / 1000;
      if (!s) {
        if (this.stats.size >= MAX_STATS_KEYS) return;
        s = { start, len, method, route, status, count: 0, sum: 0, min: secs, max: 0, buckets: new Array(BOUNDS_S.length + 1).fill(0) };
        this.stats.set(key, s);
      }
      s.count += 1;
      s.sum += secs;
      if (secs < s.min) s.min = secs;
      if (secs > s.max) s.max = secs;
      let i = BOUNDS_S.findIndex((b) => secs <= b);
      if (i < 0) i = BOUNDS_S.length;
      s.buckets[i] += 1;
      // Exemplars (#607): the slowest request and, for 5xx, the first; two
      // small objects per key at most, built only when kept.
      const slower = !s.slowest || secs > s.slowest.value;
      const first = status >= 500 && !s.first;
      if (slower || first) {
        const ex = exemplar(r, secs, now);
        if (slower) s.slowest = ex;
        if (first) s.first = ex;
      }
    } catch (e) {
      this.onError(e);
    }
  }

  /**
   * Express (4 and 5) middleware: route stats for every request, and
   * `req.openlens` = { traceId, sessionId }: the trace id of the incoming
   * W3C `traceparent` (read, never written) and the session the browser
   * SDK sends in `x-openlens-session`. Mount it first; mount
   * `expressErrors()` last.
   */
  express(opts = {}) {
    // Runtime health comes with the middleware (#610).
    this.captureRuntime();
    return (req, res, next) => {
      const t0 = process.hrtime.bigint();
      try {
        req.openlens = requestContext(req.headers || {});
      } catch {
        req.openlens = {};
      }
      // The signed-in user, when the app says how to read it (read when
      // the error happens: auth runs later). No user id travels in a header.
      if (typeof opts.user === "function") req.openlens.user = () => safeCall(opts.user, req);
      res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        const ctx = req.openlens || {};
        this.recordRequest({
          method: req.method,
          route: routeOf(req),
          status: res.statusCode,
          ms,
          traceId: ctx.traceId,
          sessionId: ctx.sessionId,
        });
      });
      next();
    };
  }

  /** Express error handler: reports the error with its route and request
   * context, then hands it on (`next(err)`). Mount it after the routes. */
  expressErrors() {
    return (err, req, _res, next) => {
      const ctx = req.openlens || {};
      const user = ctx.user ? ctx.user() : undefined;
      this.captureException(err, { ...ctx, distinctId: user, route: routeOf(req), method: req.method });
      next(err);
    };
  }

  /**
   * Outgoing calls (#608): per external host, the duration and outcome of
   * the app's HTTP calls (global `fetch` and `http`/`https`), read from
   * Node's diagnostics channels; one `$client_stats` per (method, host,
   * status) per stats window, with OpenTelemetry's
   * `http.client.request.duration` histogram. Only the host is kept, never
   * the path, the query or credentials. Calls to the OpenLens host are not
   * counted. Opt-in; calling it again does nothing; `shutdown()` stops it.
   * Does nothing where Node has no diagnostics channels.
   */
  captureOutgoing() {
    if (this.outgoing) return;
    try {
      if (!diagnostics || typeof diagnostics.channel !== "function") return;
      let own = "";
      try {
        own = new URL(this.host).hostname.toLowerCase();
      } catch {
        own = "";
      }
      const started = new WeakMap();
      const begin = (request) => {
        if (request && typeof request === "object") started.set(request, process.hrtime.bigint());
      };
      const end = (request, method, host, status, error) => {
        if (!request || typeof request !== "object") return;
        const t0 = started.get(request);
        if (t0 === undefined) return;
        started.delete(request);
        const h = clientHost(host);
        if (!h || h === own) return;
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        this.recordCall({ method, host: h, status, error, ms });
      };
      const undiciHost = (request) => {
        try {
          return new URL(String(request.origin)).hostname;
        } catch {
          return undefined;
        }
      };
      /** @type {[string, (m: any) => void][]} */
      const handlers = [
        [CLIENT_CHANNELS.httpStart, (m) => begin(m && m.request)],
        [
          CLIENT_CHANNELS.httpResponse,
          (m) => m && m.request && end(m.request, m.request.method, m.request.host, m.response && m.response.statusCode),
        ],
        [
          CLIENT_CHANNELS.httpError,
          (m) => m && m.request && end(m.request, m.request.method, m.request.host, 0, errorType(m.error)),
        ],
        [CLIENT_CHANNELS.undiciCreate, (m) => begin(m && m.request)],
        [
          CLIENT_CHANNELS.undiciHeaders,
          (m) => m && m.request && end(m.request, m.request.method, undiciHost(m.request), m.response && m.response.statusCode),
        ],
        [
          CLIENT_CHANNELS.undiciError,
          (m) => m && m.request && end(m.request, m.request.method, undiciHost(m.request), 0, errorType(m.error)),
        ],
      ];
      const subscribed = [];
      for (const [name, fn] of handlers) {
        const safe = (message) => {
          try {
            fn(message);
          } catch (e) {
            this.onError(e);
          }
        };
        try {
          // The module's `subscribe()` (Node >= 18.7) keeps the channel
          // alive; on older Node the channel object is kept here.
          const ch = diagnostics.channel(name);
          if (typeof diagnostics.subscribe === "function") diagnostics.subscribe(name, safe);
          else ch.subscribe(safe);
          subscribed.push([name, safe, ch]);
        } catch (e) {
          this.onError(e);
        }
      }
      this.outgoing = subscribed;
    } catch (e) {
      this.onError(e);
    }
  }

  /** @private Count one outgoing call in its host's stats. */
  recordCall(c) {
    try {
      const len = this.statsWindowMs;
      const start = windowStart(Date.now(), len);
      const method = clientMethod(c.method);
      const raw = Math.trunc(Number(c.status) || 0);
      const status = raw >= 100 && raw < 600 ? raw : 0;
      const error = status === 0 ? c.error || "_OTHER" : "";
      // A bound on hosts per window: the rest count together.
      if (!this.clientHosts || this.clientHosts.start !== start || this.clientHosts.len !== len) {
        this.clientHosts = { start, len, hosts: new Set() };
      }
      const seen = this.clientHosts.hosts;
      let host = c.host;
      if (!seen.has(host)) {
        if (seen.size >= MAX_CLIENT_HOSTS) host = "_OTHER";
        else seen.add(host);
      }
      const key = `${start} ${len} ${method} ${host} ${status} ${error}`;
      let s = this.clientStats.get(key);
      const secs = Math.max(0, Number(c.ms) || 0) / 1000;
      if (!s) {
        if (this.clientStats.size >= MAX_CLIENT_KEYS) return;
        s = { start, len, method, host, status, error, count: 0, sum: 0, min: secs, max: 0, buckets: new Array(BOUNDS_S.length + 1).fill(0) };
        this.clientStats.set(key, s);
      }
      addSample(s, secs);
    } catch (e) {
      this.onError(e);
    }
  }

  /** @private Turn the outgoing calls of closed windows (all of them when `all`) into events. */
  drainClientStats(all) {
    const now = Date.now();
    for (const [key, s] of this.clientStats) {
      if (!all && !this.closed(s, now)) continue;
      this.clientStats.delete(key);
      // One data point of OpenTelemetry's `http.client.request.duration`.
      const props = {
        $metric: "http.client.request.duration",
        $unit: "s",
        "http.request.method": s.method,
        "server.address": s.host,
        "http.response.status_code": s.status,
        count: s.count,
        sum: round6(s.sum),
        min: round6(s.min),
        max: round6(s.max),
        bucket_counts: s.buckets,
        $window_s: s.len / 1000,
      };
      if (s.error) props["error.type"] = s.error;
      this.push("$client_stats", SERVER_ID, props, undefined, new Date(s.start));
    }
  }

  /**
   * Runtime health (#610): event-loop delay, memory and process starts.
   * At once, one `$runtime_stats` with `process.start: true` (sent by the
   * next flush, so a process that crash-loops is still counted); then, for
   * every stats window, one `$runtime_stats` with the event-loop delay p50
   * and p99 (seconds) and the largest RSS and heap used (bytes) of the
   * window, sampled on each flush. On with `express()`; call it for other
   * frameworks. Calling it again does nothing.
   */
  captureRuntime() {
    if (this.runtime) return;
    try {
      let loop;
      try {
        loop = monitorEventLoopDelay({ resolution: LOOP_RESOLUTION_MS });
        loop.enable();
      } catch {
        loop = undefined;
      }
      const len = this.statsWindowMs;
      this.runtime = { start: windowStart(Date.now(), len), len, loop, rss: 0, heap: 0 };
      this.sampleRuntime();
      if (!processStartSent) {
        processStartSent = true;
        this.push("$runtime_stats", SERVER_ID, { "process.start": true, ...memoryProps(this.runtime) });
      }
    } catch (e) {
      this.onError(e);
    }
  }

  /** @private Keep the window's largest RSS and heap used. */
  sampleRuntime() {
    const r = this.runtime;
    if (!r) return;
    try {
      const m = process.memoryUsage();
      if (m.rss > r.rss) r.rss = m.rss;
      if (m.heapUsed > r.heap) r.heap = m.heapUsed;
    } catch (e) {
      this.onError(e);
    }
  }

  /** @private Turn the runtime of a closed window (the open one too when `all`) into an event. */
  drainRuntime(all) {
    const r = this.runtime;
    if (!r) return;
    const now = Date.now();
    if (!all && !this.closed(r, now)) return;
    // OpenTelemetry runtime metric names (#610): `nodejs.eventloop.delay.*`
    // in seconds, `process.memory.usage` (RSS) and `v8js.memory.heap.used`
    // in bytes, here the largest sample of the window.
    const props = { ...memoryProps(r), $window_s: r.len / 1000 };
    if (r.loop && r.loop.count > 0) {
      props["nodejs.eventloop.delay.p50"] = delaySeconds(r.loop.percentile(50));
      props["nodejs.eventloop.delay.p99"] = delaySeconds(r.loop.percentile(99));
    }
    r.loop?.reset();
    this.push("$runtime_stats", SERVER_ID, props, undefined, new Date(r.start));
    // The next window, at the length in force now, aligned on it.
    r.len = this.statsWindowMs;
    r.start = windowStart(now, r.len);
    r.rss = 0;
    r.heap = 0;
  }

  /** @private Queue one event. */
  push(event, distinctId, properties, sessionId, timestamp) {
    const props = { $lib: "node", $environment: this.environment, ...properties };
    if (this.release) props.$release = this.release;
    const ev = {
      event,
      distinct_id: String(distinctId),
      uuid: crypto.randomUUID(),
      timestamp: (timestamp || new Date()).toISOString(),
      properties: props,
    };
    if (sessionId) ev.session_id = String(sessionId);
    this.queue.push(ev);
    if (this.queue.length >= this.flushAt) void this.flush();
  }

  /** @private At most MAX_SAME_ERROR of one message per minute. */
  allowError(message) {
    const minute = Math.floor(Date.now() / 60000);
    if (minute !== this.seenMinute) {
      this.seenMinute = minute;
      this.seenErrors.clear();
    }
    const k = message.slice(0, 200);
    const n = (this.seenErrors.get(k) || 0) + 1;
    if (this.seenErrors.size < 1000 || this.seenErrors.has(k)) this.seenErrors.set(k, n);
    return n <= MAX_SAME_ERROR;
  }

  /** @private Is this window closed: it ended, or the window length changed
   * since it opened (#628)? Either way it is sent with its own length. */
  closed(w, now) {
    return w.start + w.len <= now || w.len !== this.statsWindowMs;
  }

  /** @private Follow the window the server advertises in a capture
   * response (#628, D-091), unless `statsWindowSeconds` is set. The windows
   * being filled close on the next flush; new ones use the new length. */
  followWindow(r) {
    if (this.statsWindowOverride !== undefined) return;
    try {
      const h = r && r.headers && typeof r.headers.get === "function" ? r.headers.get(STATS_WINDOW_HEADER) : null;
      const ms = h === null || h === undefined ? undefined : windowMs(Number(h));
      if (ms !== undefined) this.statsWindowMs = ms;
    } catch (e) {
      this.onError(e);
    }
  }

  /** @private Turn the stats of closed windows (all of them when `all`) into events. */
  drainStats(all) {
    const now = Date.now();
    for (const [key, s] of this.stats) {
      if (!all && !this.closed(s, now)) continue;
      this.stats.delete(key);
      // One data point of OpenTelemetry's `http.server.request.duration`
      // histogram, with its semantic-convention attributes (#601).
      this.push(
        "$request_stats",
        SERVER_ID,
        {
          $metric: "http.server.request.duration",
          $unit: "s",
          "http.request.method": s.method,
          "http.route": s.route,
          "http.response.status_code": s.status,
          count: s.count,
          sum: round6(s.sum),
          min: round6(s.min),
          max: round6(s.max),
          bucket_counts: s.buckets,
          $window_s: s.len / 1000,
          ...exemplarsProp(s),
        },
        undefined,
        new Date(s.start),
      );
    }
  }

  /**
   * Job check-in (#609): call it at the end of a cron or background job, so
   * OpenLens alerts when the job does not run, fails or gets slower. Sent at
   * once (not queued); resolves to false on any error, never throws.
   * @param {string} slug 1 to 64 of a-z, 0-9, `_` and `-`
   * @param {{ status?: "ok" | "error", ms?: number, expectEvery?: number }} [opts]
   *   `ms`: the run's duration; `expectEvery`: seconds between runs, instead
   *   of the schedule OpenLens learns.
   */
  async checkIn(slug, opts = {}) {
    try {
      const q = new URLSearchParams();
      if (opts.status) q.set("status", opts.status);
      if (opts.ms !== undefined) q.set("ms", String(Math.max(0, Math.round(opts.ms))));
      if (opts.expectEvery !== undefined) q.set("expectEvery", String(Math.round(opts.expectEvery)));
      const qs = q.toString();
      const r = await this.fetch(
        `${this.host}/check-in/${encodeURIComponent(String(slug))}${qs ? `?${qs}` : ""}`,
        { method: "POST", headers: { "x-openlens-key": this.key } },
      );
      if (!r.ok) this.onError(new Error(`OpenLens check-in failed: HTTP ${r.status}`));
      return r.ok;
    } catch (e) {
      this.onError(e);
      return false;
    }
  }

  /** Send queued events now. */
  async flush(all = false) {
    this.sampleRuntime();
    this.drainRuntime(all);
    this.drainStats(all);
    this.drainClientStats(all);
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      const r = await this.fetch(`${this.host}/capture`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-openlens-key": this.key },
        body: JSON.stringify({ sent_at: new Date().toISOString(), batch }),
      });
      if (!r.ok) this.onError(new Error(`OpenLens capture failed: HTTP ${r.status}`));
      else this.followWindow(r);
    } catch (e) {
      this.onError(e);
    }
  }

  /** Flush and stop the timer (call on shutdown). */
  async shutdown() {
    clearInterval(this.timer);
    for (const [name, fn, ch] of this.outgoing || []) {
      try {
        if (typeof diagnostics.unsubscribe === "function") diagnostics.unsubscribe(name, fn);
        else ch.unsubscribe(fn);
      } catch {
        // already gone
      }
    }
    this.outgoing = undefined;
    await this.flush(true);
    this.runtime?.loop?.disable();
    this.runtime = undefined;
  }
}

/** The route template of an Express request (`/api/entries/:id`), or
 * `(unmatched)`: never the raw URL, which would make one key per id. */
function routeOf(req) {
  const p = req.route && req.route.path;
  if (typeof p !== "string") return "(unmatched)";
  return `${req.baseUrl || ""}${p}` || "/";
}

/** The trace id of a W3C `traceparent` (version 00 layout; `ff` and
 * all-zero ids are invalid) and the OpenLens session header. */
export function requestContext(headers) {
  const ctx = {};
  const tp = String(headers.traceparent || "").trim();
  const m = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/.exec(tp);
  if (m && m[1] !== "ff" && !/^0+$/.test(m[2]) && !/^0+$/.test(m[3])) ctx.traceId = m[2];
  const sid = String(headers[SESSION_HEADER] || "").trim();
  if (/^[A-Za-z0-9_-]{1,100}$/.test(sid)) ctx.sessionId = sid;
  return ctx;
}

/**
 * One exemplar (#607), in OpenTelemetry's shape: the duration (seconds),
 * when it ended, the trace id and, as its only filtered attribute, the
 * session. Never the user (D-089: `$request_stats` belongs to `$server`, so
 * erasing a person would not reach a user id kept here; the session is
 * erased with the person). Nothing else of the request is ever read: no
 * body, header, cookie, URL or query string.
 */
function exemplar(r, secs, now) {
  const ex = { value: secs, time: new Date(now).toISOString() };
  const trace = typeof r.traceId === "string" ? r.traceId : "";
  if (/^[0-9a-f]{32}$/.test(trace) && !/^0+$/.test(trace)) ex.trace_id = trace;
  const attrs = {};
  const sid = typeof r.sessionId === "string" ? r.sessionId : "";
  if (/^[A-Za-z0-9_-]{1,100}$/.test(sid)) attrs["session.id"] = sid;
  if (Object.keys(attrs).length > 0) ex.filtered_attributes = attrs;
  return ex;
}

/** The `exemplars` of a key's window: its slowest and its first 5xx, once each. */
function exemplarsProp(s) {
  const kept = [s.slowest, s.first].filter((ex, i, all) => ex && all.indexOf(ex) === i);
  const list = kept.map((ex) => ({ ...ex, value: round6(ex.value) }));
  return list.length > 0 ? { exemplars: list } : {};
}

/** Add one duration (seconds) to a histogram data point. */
function addSample(s, secs) {
  s.count += 1;
  s.sum += secs;
  if (secs < s.min) s.min = secs;
  if (secs > s.max) s.max = secs;
  let i = BOUNDS_S.findIndex((b) => secs <= b);
  if (i < 0) i = BOUNDS_S.length;
  s.buckets[i] += 1;
}

/** The host of an outgoing call, lowercased: a DNS name or an IP address
 * only (brackets of an IPv6 address dropped), at most 253 characters;
 * `undefined` for anything else. Never a path, a query or credentials. */
function clientHost(raw) {
  if (typeof raw !== "string") return undefined;
  const h = raw.trim().replace(/^\[|\]$/g, "").toLowerCase();
  return /^[a-z0-9._:-]{1,253}$/.test(h) ? h : undefined;
}

/** `GET`, `POST`…, else `_OTHER` (OpenTelemetry's value for an unknown method). */
function clientMethod(raw) {
  const m = String(raw || "GET").toUpperCase();
  return /^[A-Z]{1,10}$/.test(m) ? m : "_OTHER";
}

/** The class of a failed call: the error's code (`ECONNREFUSED`), else its
 * name (`TimeoutError`), at most 64 characters; never its message. */
function errorType(err) {
  const pick = (v) => (typeof v === "string" && /^[A-Za-z0-9._:-]{1,64}$/.test(v) ? v : undefined);
  if (!err || typeof err !== "object") return "_OTHER";
  return pick(err.code) || pick(err.cause && err.cause.code) || pick(err.name) || "_OTHER";
}

/** Start of the stats window of length `len` (ms) that holds `ms`:
 * windows are aligned on multiples of their length. */
function windowStart(ms, len) {
  return ms - (ms % len);
}

/** A stats window in seconds (60, 300 or 600) as ms; `undefined` for anything else. */
function windowMs(seconds) {
  return typeof seconds === "number" && STATS_WINDOWS_S.includes(seconds) ? seconds * 1000 : undefined;
}

/** The window's largest RSS and heap used, when sampled. */
function memoryProps(r) {
  const p = {};
  if (r.rss > 0) p["process.memory.usage"] = r.rss;
  if (r.heap > 0) p["v8js.memory.heap.used"] = r.heap;
  return p;
}

/** A histogram value (nanoseconds) in seconds, bounded. */
function delaySeconds(ns) {
  const s = Math.max(0, Number(ns) || 0) / 1e9;
  return round6(Math.min(s, MAX_LOOP_DELAY_S));
}

function round6(v) {
  return Math.round(v * 1e6) / 1e6;
}

function safeCall(fn, req) {
  try {
    const v = fn(req);
    return v === undefined || v === null || v === "" ? undefined : String(v).slice(0, 200);
  } catch {
    return undefined;
  }
}

function safeString(v) {
  try {
    return typeof v === "object" ? JSON.stringify(v).slice(0, 500) : String(v);
  } catch {
    return "non-error value";
  }
}

/** First stack frame outside node_modules and Node's own modules, as
 * `file:line:col`: the error's group is its message @ this file. */
export function appFrame(stack) {
  if (!stack) return undefined;
  for (const line of stack.split("\n").slice(1, 50)) {
    const m = /\(?((?:file:\/\/)?[^()\s]+):(\d+):(\d+)\)?\s*$/.exec(line.trim());
    if (!m) continue;
    const file = m[1];
    if (file.includes("node_modules") || file.startsWith("node:") || !file.includes("/")) continue;
    return `${file.replace(/^file:\/\//, "")}:${m[2]}:${m[3]}`;
  }
  return undefined;
}

export default OpenLens;
