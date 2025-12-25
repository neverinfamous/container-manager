/**
 * Images API service
 */

import { setCache, getCached } from '@/lib/cache'
import type {
    ImageInfoResponse,
    RolloutsResponse,
    BuildsResponse,
    Build,
    RebuildRequest,
    RollbackRequest,
} from '@/types/images'

const API_BASE = '/api'

/**
 * Fetch image info for a container
 */
export async function fetchImageInfo(
    containerName: string,
    skipCache = false
): Promise<ImageInfoResponse> {
    const cacheKey = `image-info:${containerName}`

    if (!skipCache) {
        const cached = getCached(cacheKey) as ImageInfoResponse | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/image`
    )

    if (!response.ok) {
        throw new Error(`Failed to fetch image info: ${response.statusText}`)
    }

    const data = await response.json() as ImageInfoResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Fetch rollout history for a container
 */
export async function fetchRollouts(
    containerName: string,
    skipCache = false
): Promise<RolloutsResponse> {
    const cacheKey = `rollouts:${containerName}`

    if (!skipCache) {
        const cached = getCached(cacheKey) as RolloutsResponse | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/rollouts`
    )

    if (!response.ok) {
        throw new Error(`Failed to fetch rollouts: ${response.statusText}`)
    }

    const data = await response.json() as RolloutsResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Fetch builds for a container
 */
export async function fetchBuilds(
    containerName: string,
    skipCache = false
): Promise<BuildsResponse> {
    const cacheKey = `builds:${containerName}`

    if (!skipCache) {
        const cached = getCached(cacheKey) as BuildsResponse | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/builds`
    )

    if (!response.ok) {
        throw new Error(`Failed to fetch builds: ${response.statusText}`)
    }

    const data = await response.json() as BuildsResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Trigger a rebuild
 */
export async function triggerRebuild(request: RebuildRequest): Promise<Build> {
    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(request.containerName)}/rebuild`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        }
    )

    if (!response.ok) {
        throw new Error(`Failed to trigger rebuild: ${response.statusText}`)
    }

    return await response.json() as Build
}

/**
 * Rollback to a previous version
 */
export async function rollbackToVersion(
    request: RollbackRequest
): Promise<{ success: boolean; rolloutId: string }> {
    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(request.containerName)}/rollback`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        }
    )

    if (!response.ok) {
        throw new Error(`Failed to rollback: ${response.statusText}`)
    }

    return await response.json() as { success: boolean; rolloutId: string }
}

/**
 * Format image size
 */
export function formatImageSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Format short digest
 */
export function formatShortDigest(digest: string): string {
    if (digest.startsWith('sha256:')) {
        return digest.slice(7, 19)
    }
    return digest.slice(0, 12)
}

/**
 * Format relative time
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
