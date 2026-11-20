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
