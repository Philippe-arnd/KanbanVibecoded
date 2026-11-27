// OpenLens on the server (https://openlens.philapps.com): server errors, route
// stats (per route template and status, never one event per request) and
// runtime health, next to the browser SDK's events (client/src/openlens.js).
//
// Config comes from the runtime environment: OPENLENS_HOST and OPENLENS_KEY,
// else the build-time VITE_OPENLENS_HOST / VITE_OPENLENS_KEY (the same public
// capture key as the browser). Without them, or under tests, this is a no-op.
//
// Privacy: nothing here reads a request body, header or URL. Route stats keep
// the route template (`/api/tasks/:id`); server errors carry the user id, the
// same id the browser SDK identifies with.
import { OpenLens } from './vendor/openlens-node.js'

const host = (process.env.OPENLENS_HOST || process.env.VITE_OPENLENS_HOST || '').replace(/\/$/, '')
const key = process.env.OPENLENS_KEY || process.env.VITE_OPENLENS_KEY
// Same release name as the browser (client/vite.config.js: 7-character commit).
const release = (process.env.SOURCE_COMMIT || '').slice(0, 7) || undefined

export const lens =
  host && key && process.env.NODE_ENV !== 'test'
    ? new OpenLens({
        host,
        key,
        release,
        onError: (e) => console.error('[openlens]', e instanceof Error ? e.message : e),
      })
    : null

const pass = (_req, _res, next) => next()
const passError = (err, _req, _res, next) => next(err)

/** First middleware: route stats, runtime health, request context. */
export const lensRequests = () => (lens ? lens.express({ user: (req) => req.user?.id }) : pass)

/** Error handler, after the routes: reports the error, then hands it on. */
export const lensErrors = () => (lens ? lens.expressErrors() : passError)

/** An error a route catches itself (it answers 500, so lensErrors never sees it). */
export function lensCapture(err, req) {
  if (!lens) return
  lens.captureException(err, {
    ...(req.openlens || {}),
    distinctId: req.user?.id,
    route: req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : undefined,
    method: req.method,
  })
}

if (lens) {
  lens.captureUncaught()
  // Send the open stats window before the container stops.
  process.once('SIGTERM', () => void lens.shutdown())
}
