import type { Express } from 'express';

/**
 * Registers the HTTP health check endpoint used by container health probes.
 *
 * `GET /health` answers `200` with `{ "status": "ok" }` whenever the process is
 * up. It is a liveness check only -- it does not touch the Actual connection,
 * so a container whose Actual server is unreachable still reports healthy while
 * running (tool calls will report the connection error instead).
 *
 * # Reason: the route is deliberately registered outside the bearer-auth
 * middleware. Docker healthchecks (and other probes) have no way to attach an
 * `Authorization` header, and the fixed response leaks no data, so
 * unauthenticated access is safe.
 *
 * @param app - The Express app to register the endpoint on
 */
export function registerHealthCheck(app: Express): void {
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
}
