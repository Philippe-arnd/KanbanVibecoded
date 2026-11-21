// OpenObserve RUM + browser logs bootstrap.
// Configuration comes from Vite env vars (injected at build time, see Dockerfile):
//   VITE_OO_RUM_TOKEN, VITE_OO_APP_ID, VITE_OO_SERVICE_NAME  (+ optional VITE_OO_SITE, VITE_OO_ORG)
// The RUM client token is a public, write-only ingestion token (it ships to browsers by design).
// Without token/app id the monitoring is a no-op (dev, tests, forks).
import { openobserveRum } from '@openobserve/browser-rum'
import { openobserveLogs } from '@openobserve/browser-logs'

const env = import.meta.env
const clientToken = env.VITE_OO_RUM_TOKEN
const applicationId = env.VITE_OO_APP_ID
const service = env.VITE_OO_SERVICE_NAME
const site = env.VITE_OO_SITE || 'openobserve.philapps.com'
const organizationIdentifier = env.VITE_OO_ORG || 'default'
// Telemetry is relayed through the backend (same-origin for Kanban, API origin for Journal):
// no cross-origin request to OpenObserve, immune to service workers and tracker blockers.
const proxy = `${window.location.origin}/api/o2-proxy`

// Share of sessions whose replay is wanted from the start. Every other session
// is only recorded from the first error onwards (see below) to save disk space.
const REPLAY_BASELINE_SAMPLE_RATE = 10

let enabled = false

// Kanban: API is served from the same origin as the SPA.
function tracingUrls() {
  const urls = [window.location.origin]
  try {
    if (env.VITE_API_URL) urls.push(new URL(env.VITE_API_URL, window.location.origin).origin)
  } catch {
    /* ignore malformed VITE_API_URL */
  }
  return [...new Set(urls)]
}

export function initObservability() {
  if (enabled || !clientToken || !applicationId) return
  enabled = true

  const common = {
    clientToken,
    site,
    organizationIdentifier,
    apiVersion: 'v1',
    insecureHTTP: false,
    proxy,
    service,
    env: env.MODE,
  }

  openobserveRum.init({
    ...common,
    applicationId,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    // Replay is started manually: for ~${REPLAY_BASELINE_SAMPLE_RATE}% of sessions at boot, and for any
    // session as soon as an error occurs. Nominal sessions are not recorded.
    startSessionReplayRecordingManually: true,
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    // 'mask' (not 'mask-user-input'): task titles and subtasks are decrypted client-side and
    // rendered as plain DOM text. 'mask-user-input' only hides form fields, so titles leaked into
    // session replays AND into RUM action names (click targets). 'mask' covers both.
    defaultPrivacyLevel: 'mask',
    // Propagate W3C traceparent to the (OpenTelemetry-instrumented) backend.
    allowedTracingUrls: tracingUrls(),
    propagatorTypes: ['tracecontext'],
  })

  openobserveLogs.init({
    ...common,
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
  })

  // Deterministic opt-in for testing: open the app with ?o2replay=1 (remembered in localStorage;
  // ?o2replay=0 turns it off). Only affects the visitor's own session.
  let forceReplay = false
  try {
    const flag = new URLSearchParams(window.location.search).get('o2replay')
    if (flag === '1') localStorage.setItem('o2_replay', '1')
    if (flag === '0') localStorage.removeItem('o2_replay')
    forceReplay = localStorage.getItem('o2_replay') === '1'
  } catch {
    /* storage unavailable */
  }

  if (forceReplay || Math.random() * 100 < REPLAY_BASELINE_SAMPLE_RATE) {
    wantReplay()
  }

  window.addEventListener('error', wantReplay)
  window.addEventListener('unhandledrejection', wantReplay)

  // Any of these counts as user activity: it (re)starts the recording if this session wants a
  // replay, and pushes back the idle pause. Merely having the tab open does not.
  for (const type of ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel']) {
    window.addEventListener(type, resumeReplay, { capture: true, passive: true })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') pauseReplay()
  })
}

// Replay recording is paused after REPLAY_IDLE_MS without user interaction, or as soon as the
// tab is hidden, and resumed on the next interaction. The RUM SDK itself keeps a session alive
// while the tab is visible (up to 4 h), so without this an idle open tab would keep recording.
// Only sessions that want a replay (baseline sample, ?o2replay=1, or after an error) resume.
// Trade-off: each resume starts with a fresh full DOM snapshot (a few tens of kB).
const REPLAY_IDLE_MS = 60_000
let replayWanted = false
let recording = false
let idleTimer

function wantReplay() {
  replayWanted = true
  resumeReplay()
}

function resumeReplay() {
  if (!replayWanted || document.visibilityState !== 'visible') return
  if (!recording) {
    openobserveRum.startSessionReplayRecording()
    recording = true
  }
  clearTimeout(idleTimer)
  idleTimer = setTimeout(pauseReplay, REPLAY_IDLE_MS)
}

function pauseReplay() {
  clearTimeout(idleTimer)
  if (!recording) return
  openobserveRum.stopSessionReplayRecording()
  recording = false
}

export function identifyUser(user) {
  if (!enabled || !user) return
  // id only: RUM data is kept for months, the email/name are not needed to group sessions.
  const info = { id: user.id }
  openobserveRum.setUser(info)
  openobserveLogs.setUser(info)
}

export function clearUser() {
  if (!enabled) return
  openobserveRum.clearUser()
  openobserveLogs.clearUser()
}

// Reports a handled error to RUM with structured context. Never put user content in `context`
// (ids and field names only): RUM data is kept for months.
export function reportError(error, context) {
  if (!enabled) return
  openobserveRum.addError(error instanceof Error ? error : new Error(String(error)), context)
}
