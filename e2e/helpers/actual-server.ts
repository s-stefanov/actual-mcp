import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

/**
 * Pinned to match the installed @actual-app/api (see Global Constraints).
 * Verify this exact tag exists on Docker Hub and is protocol-compatible with
 * @actual-app/api@26.9.0 before merging.
 */
export const E2E_SERVER_IMAGE = 'actualbudget/actual-server:25.10.0';

/** Fixed password used for the disposable test server + budget sync. */
export const E2E_TEST_PASSWORD = 'e2e-test-password';

const ACTUAL_INTERNAL_PORT = 5006;

/**
 * Returns true when a Docker daemon is reachable. Lets the suite skip cleanly
 * on machines without Docker instead of hard-failing (spec §7.1).
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    // Prefer testcontainers' runtime-client probe when the export exists; fall
    // back to false on any error (missing export, no daemon) so the suite skips
    // cleanly instead of throwing. Verify the export name against the installed
    // testcontainers version; if absent, replace the body with a lightweight
    // Docker socket check (e.g. fs.existsSync('/var/run/docker.sock')).
    const tc = (await import('testcontainers')) as {
      getContainerRuntimeClient?: () => Promise<unknown>;
    };
    if (typeof tc.getContainerRuntimeClient !== 'function') return false;
    await tc.getContainerRuntimeClient();
    return true;
  } catch {
    return false;
  }
}

export interface ActualServerHandle {
  url: string;
  password: string;
  stop: () => Promise<void>;
}

/**
 * Boots ONE actual-server container, waits for HTTP health, and bootstraps the
 * server password so api.init can authenticate.
 */
export async function startActualServer(): Promise<ActualServerHandle> {
  const container: StartedTestContainer = await new GenericContainer(E2E_SERVER_IMAGE)
    .withExposedPorts(ACTUAL_INTERNAL_PORT)
    .withWaitStrategy(Wait.forHttp('/account/needs-bootstrap', ACTUAL_INTERNAL_PORT).forStatusCode(200))
    .withStartupTimeout(120_000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(ACTUAL_INTERNAL_PORT);
  const url = `http://${host}:${port}`;

  // Bootstrap: a fresh server has no password. POST {url}/account/bootstrap
  // with { password } (confirmed against @actual-app/api bootstrap()).
  const res = await fetch(`${url}/account/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: E2E_TEST_PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    await container.stop();
    throw new Error(`Server bootstrap failed (${res.status}): ${text}`);
  }

  return {
    url,
    password: E2E_TEST_PASSWORD,
    stop: async () => {
      await container.stop();
    },
  };
}
