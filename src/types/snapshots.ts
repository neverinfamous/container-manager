/**
 * Snapshot types for container configuration backup and restore
 */

/**
 * Snapshot status
 */
export type SnapshotStatus = 'creating' | 'ready' | 'restoring' | 'failed'

/**
 * Snapshot trigger type
 */
export type SnapshotTrigger = 'manual' | 'scheduled' | 'pre-deploy' | 'auto'

/**
 * Container configuration snapshot
 */
export interface Snapshot {
    id: string
    containerName: string
    name: string
    description?: string
    status: SnapshotStatus
    trigger: SnapshotTrigger
    createdAt: string
    createdBy?: string
    size: number // bytes
    r2Key: string // R2 object key

    // Captured configuration
    config: SnapshotConfig
}

/**
 * Snapshot configuration data
 */
export interface SnapshotConfig {
    instanceType: string
    maxInstances: number
    sleepAfter?: number
    defaultPort?: number
    envVars: Record<string, string>
    networkRules?: {
        allowedHosts?: string[]
        blockedHosts?: string[]
    }
    healthCheck?: {
        path?: string
        interval?: number
        timeout?: number
    }
}

/**
 * Snapshot list response
 */
export interface SnapshotsResponse {
    snapshots: Snapshot[]
    total: number
}

/**
 * Create snapshot request
 */
export interface CreateSnapshotRequest {
    containerName: string
    name: string
    description?: string
}

/**
 * Restore snapshot options
 */
export interface RestoreSnapshotOptions {
    restoreEnv: boolean
    restoreConfig: boolean
    restoreNetworking: boolean
    createBackupFirst: boolean
}

/**
 * Restore result
 */
export interface RestoreResult {
    success: boolean
    snapshotId: string
    containerName: string
    restoredAt: string
    backupSnapshotId?: string
    changes: {
        field: string
        oldValue: unknown
        newValue: unknown
    }[]
}

/**
 * Snapshot statistics
 */
export interface SnapshotStats {
    totalSnapshots: number
    totalSize: number
    oldestSnapshot?: string
    newestSnapshot?: string
    containerCounts: {
        containerName: string
        count: number
    }[]
}
