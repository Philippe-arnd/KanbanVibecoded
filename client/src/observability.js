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
const site = env.VITE_OO_SITE || 'openobserve-mntizcveu9veqqliv9ol6azr.philapps.com'
const organizationIdentifier = env.VITE_OO_ORG || 'default'
// Telemetry is relayed through the backend (same-origin for Kanban, API origin for Journal):
// no cross-origin request to OpenObserve, immune to service workers and tracker blockers.
const proxy = `${window.location.origin}/api/o2-proxy`

// Share of sessions that are fully replayed from the start. Every other session
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
    defaultPrivacyLevel: 'mask-user-input',
    // Propagate W3C traceparent to the (OpenTelemetry-instrumented) backend.
    allowedTracingUrls: tracingUrls(),
    propagatorTypes: ['tracecontext'],
  })

  openobserveLogs.init({
    ...common,
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
  })

  if (Math.random() * 100 < REPLAY_BASELINE_SAMPLE_RATE) {
    openobserveRum.startSessionReplayRecording()
  }

  const startReplayOnError = () => openobserveRum.startSessionReplayRecording()
  window.addEventListener('error', startReplayOnError)
  window.addEventListener('unhandledrejection', startReplayOnError)
}

export function identifyUser(user) {
  if (!enabled || !user) return
  const info = { id: user.id, name: user.name, email: user.email }
  openobserveRum.setUser(info)
  openobserveLogs.setUser(info)
}

export function clearUser() {
  if (!enabled) return
  openobserveRum.clearUser()
  openobserveLogs.clearUser()
}
