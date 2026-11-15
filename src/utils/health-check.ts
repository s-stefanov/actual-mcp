import type { Express } from 'express';

/**
 * Registers the HTTP health check endpoint used by container health probes.
 * @param app - The Express app to register the endpoint on
 */
export function registerHealthCheck(app: Express): void {
  // Reason: Skip adding auth middleware so probes don't need to attach
  // Authorization header. Safe given this route doesn't access any user data
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
}
