/**
 * IVNTRI — Core Domain Types
 * Visual Culture, Cinema, Fashion, and Autonomous Archival Telemetry.
 */

export interface SessionLogEntry {
  id: string;
  timestamp: string;
  type:
    | 'SESSION_INIT'
    | 'DB_HEARTBEAT'
    | 'ROUTE_NAVIGATION'
    | 'MANUAL_SYNC'
    | 'ERROR'
    | 'SYSTEM_NOTICE'
    | 'QUOTA_NOTICE';
  message: string;
  latencyMs?: number;
  status: 'synced' | 'local' | 'error';
}

export interface DatabaseSessionState {
  sessionId: string;
  userId: string | null;
  userEmail: string | null;
  status: 'CONNECTED' | 'SYNCING' | 'OFFLINE';
  startedAt: string;
  lastSyncedAt: string;
  syncCount: number;
  activeMenu: string;
  latencyMs: number;
  clientTime: string;
  logs: SessionLogEntry[];
}
