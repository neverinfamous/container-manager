/**
 * Snapshots API service
 */

import { setCache, getCached } from '@/lib/cache'
import type {
    Snapshot,
    SnapshotsResponse,
    SnapshotStats,
    CreateSnapshotRequest,
    RestoreSnapshotOptions,
    RestoreResult,
} from '@/types/snapshots'

const API_BASE = '/api'

/**
 * Fetch all snapshots
 */
export async function fetchSnapshots(
    containerName?: string,
    skipCache = false
): Promise<SnapshotsResponse> {
    const cacheKey = `snapshots:${containerName ?? 'all'}`

    if (!skipCache) {
        const cached = getCached(cacheKey) as SnapshotsResponse | null
        if (cached) {
            return cached
        }
    }

    const params = containerName ? `?container=${encodeURIComponent(containerName)}` : ''
    const response = await fetch(`${API_BASE}/snapshots${params}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch snapshots: ${response.statusText}`)
    }

    const data = await response.json() as SnapshotsResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Fetch a single snapshot
 */
export async function fetchSnapshot(snapshotId: string): Promise<Snapshot> {
    const response = await fetch(`${API_BASE}/snapshots/${encodeURIComponent(snapshotId)}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch snapshot: ${response.statusText}`)
    }

    return await response.json() as Snapshot
}

/**
 * Create a new snapshot
 */
export async function createSnapshot(request: CreateSnapshotRequest): Promise<Snapshot> {
    const response = await fetch(`${API_BASE}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        throw new Error(`Failed to create snapshot: ${response.statusText}`)
    }

    return await response.json() as Snapshot
}

/**
 * Restore from a snapshot
 */
export async function restoreSnapshot(
    snapshotId: string,
    options: RestoreSnapshotOptions
): Promise<RestoreResult> {
    const response = await fetch(`${API_BASE}/snapshots/${encodeURIComponent(snapshotId)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
    })

    if (!response.ok) {
        throw new Error(`Failed to restore snapshot: ${response.statusText}`)
    }

    return await response.json() as RestoreResult
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/snapshots/${encodeURIComponent(snapshotId)}`, {
        method: 'DELETE',
    })

    if (!response.ok) {
        throw new Error(`Failed to delete snapshot: ${response.statusText}`)
    }
}

/**
 * Fetch snapshot statistics
 */
export async function fetchSnapshotStats(skipCache = false): Promise<SnapshotStats> {
    const cacheKey = 'snapshot-stats'

    if (!skipCache) {
        const cached = getCached(cacheKey) as SnapshotStats | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(`${API_BASE}/snapshots/stats`)

    if (!response.ok) {
        throw new Error(`Failed to fetch snapshot stats: ${response.statusText}`)
    }

    const data = await response.json() as SnapshotStats

    setCache(cacheKey, data)

    return data
}

/**
 * Format snapshot size
 */
export function formatSnapshotSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format time ago
 */
export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
}
