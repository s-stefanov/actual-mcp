import * as api from '@actual-app/api';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BudgetFile } from '../../types.js';

const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');
const DEFAULT_SYNC_TTL_MS = 60_000;

type ConnectionState = 'idle' | 'initializing' | 'ready' | 'closing' | 'closed' | 'failed';

export class ActualConnection {
  private state: ConnectionState = 'idle';
  private inflightInit: Promise<void> | null = null;
  private inflightSync: Promise<void> | null = null;
  private lastSyncAt = 0;

  /**
   * Ensure the connection is initialized and (when already ready) not stale.
   * Concurrent callers share one in-flight init; a failed attempt is not
   * cached — the next call starts a fresh attempt.
   */
  async ensureReady(): Promise<void> {
    if (this.state === 'closing' || this.state === 'closed') {
      throw new Error('ActualConnection is closed');
    }
    if (this.state === 'ready') {
      return this.syncIfStale();
    }
    if (this.state === 'initializing' && this.inflightInit) {
      return this.inflightInit;
    }
    // idle or failed → start a fresh attempt
    this.state = 'initializing';
    this.inflightInit = this.doInit()
      .then(() => {
        this.state = 'ready';
      })
      .catch((err: unknown) => {
        this.state = 'failed';
        this.inflightInit = null;
        throw err;
      });
    return this.inflightInit;
  }

  private syncTtlMs(): number {
    const raw = process.env.ACTUAL_SYNC_TTL_MS;
    if (raw === undefined || raw === '') return DEFAULT_SYNC_TTL_MS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : DEFAULT_SYNC_TTL_MS;
  }

  /**
   * Pull remote changes into local data when the TTL has elapsed. Concurrent
   * stale callers share one in-flight sync. A failed sync is logged, not thrown:
   * answering from slightly stale data beats failing the call.
   */
  private syncIfStale(): Promise<void> {
    const ttl = this.syncTtlMs();
    if (ttl < 0) return Promise.resolve();
    if (Date.now() - this.lastSyncAt < ttl) return Promise.resolve();
    if (this.inflightSync) return this.inflightSync;

    this.inflightSync = api
      .sync()
      .then(() => {
        this.lastSyncAt = Date.now();
      })
      .catch((error: unknown) => {
        console.error('Failed to sync with Actual server, continuing with local data:', error);
      })
      .finally(() => {
        this.inflightSync = null;
      });
    return this.inflightSync;
  }

  /** Carried over verbatim from the previous initActualApi body. */
  private async doInit(): Promise<void> {
    console.error('Initializing Actual Budget API...');
    const dataDir = process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const serverURL = process.env.ACTUAL_SERVER_URL;
    const password = process.env.ACTUAL_PASSWORD;
    // Reason: InitConfig is a discriminated union in 26.x — NoServerConfig forbids serverURL/password
    const initConfig = serverURL ? { dataDir, serverURL, password: password ?? '' } : { dataDir };
    await api.init(initConfig);

    const budgets: BudgetFile[] = await api.getBudgets();
    if (!budgets || budgets.length === 0) {
      throw new Error('No budgets found. Please create a budget in Actual first.');
    }

    const budgetId: string = process.env.ACTUAL_BUDGET_SYNC_ID || budgets[0].cloudFileId || budgets[0].id || '';
    console.error(`Loading budget: ${budgetId}`);
    await api.downloadBudget(
      budgetId,
      process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD
        ? { password: process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD }
        : undefined
    );

    // Reason: seed lastSyncAt so the first call after init does not immediately sync.
    this.lastSyncAt = Date.now();
    console.error('Actual Budget API initialized successfully');
  }
}

let instance: ActualConnection | null = null;

/** Process-wide connection accessor. */
export function getActualConnection(): ActualConnection {
  if (!instance) {
    instance = new ActualConnection();
  }
  return instance;
}

/** Test-only: discard the singleton so each test starts from a clean state. */
export function resetActualConnectionForTests(): void {
  instance = null;
}
