// OpenTelemetry bootstrap: must be loaded BEFORE any other module
// (node --import / --require) so auto-instrumentation can patch http, express, pg...
// Configuration comes exclusively from standard OTEL_* environment variables
// (OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_TRACES_ENDPOINT, OTEL_EXPORTER_OTLP_HEADERS, ...).
// No endpoint or credential is hardcoded. Tracing is a no-op when no OTLP endpoint is set.
import { register } from 'node:module'

const enabled =
  process.env.NODE_ENV !== 'test' &&
  process.env.OTEL_SDK_DISABLED !== 'true' &&
  Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT)

const IGNORED_PATHS = new Set(['/health', '/api/health', '/api/o2-proxy'])

function isIgnoredPath(url) {
  if (!url) return false
  const q = url.indexOf('?')
  const path = q === -1 ? url : url.slice(0, q)
  return IGNORED_PATHS.has(path) || path.startsWith('/assets/')
}

const O2_ORIGIN = (() => {
  try {
    return process.env.O2_PROXY_TARGET ? new URL(process.env.O2_PROXY_TARGET).origin : ''
  } catch {
    return ''
  }
})()

if (enabled) {
  // The app is ESM ("type": "module"): register the import-in-the-middle hook so
  // that instrumentations can also patch modules loaded through `import`.
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url)

  const { NodeSDK } = await import('@opentelemetry/sdk-node')
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')

  // The exporter reads OTEL_EXPORTER_OTLP_TRACES_ENDPOINT / _HEADERS itself.
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Very noisy and useless for request tracing
        '@opentelemetry/instrumentation-fs': { enabled: false },
        // dns.lookup / tcp.connect spans add volume without telling anything the pg/http spans don't
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        // Healthchecks, static assets and the RUM relay were most of the spans.
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => isIgnoredPath(req.url),
        },
        // The relay's own upstream POSTs to OpenObserve: telemetry about telemetry.
        '@opentelemetry/instrumentation-undici': {
          ignoreRequestHook: (req) => Boolean(O2_ORIGIN) && req.origin === O2_ORIGIN,
        },
        // One span per Express middleware / handler duplicates the HTTP server span (which
        // already carries http.route and the duration). Express 5 routes through the `router`
        // package, whose own instrumentation emits those "middleware - x" spans.
        '@opentelemetry/instrumentation-router': { enabled: false },
        '@opentelemetry/instrumentation-express': {
          ignoreLayersType: ['router', 'middleware', 'request_handler'],
        },
      }),
    ],
  })

  sdk.start()

  const shutdown = () => {
    sdk.shutdown().catch((err) => console.error('[otel] shutdown error', err))
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}
