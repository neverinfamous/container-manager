/**
 * Configuration API service
 */

import { cacheKeys, getCached, setCache, invalidateCache } from '@/lib/cache'
import type {
    ContainerConfiguration,
    ConfigurationResponse,
    UpdateConfigRequest,
    ConfigValidation,
} from '@/types/config'

const API_BASE = '/api'

/**
 * Get container configuration
 */
export async function getConfiguration(
    containerName: string,
    skipCache = false
): Promise<ContainerConfiguration> {
    const cacheKey = cacheKeys.config(containerName)

    if (!skipCache) {
        const cached = getCached(cacheKey) as ConfigurationResponse | null
        if (cached) {
            return cached.config
        }
    }

    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/config`
    )

    if (!response.ok) {
        throw new Error(`Failed to get configuration: ${response.statusText}`)
    }

    const data = await response.json() as ConfigurationResponse
    setCache(cacheKey, data)
    return data.config
}

/**
 * Update container configuration
 */
export async function updateConfiguration(
    containerName: string,
    updates: UpdateConfigRequest
): Promise<{ success: boolean; config: ContainerConfiguration }> {
    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/config`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        }
    )

    if (!response.ok) {
        const error = await response.json() as { error?: string }
        throw new Error(error.error ?? `Failed to update configuration: ${response.statusText}`)
    }

    // Invalidate caches
    invalidateCache(`config:${containerName}`)
    invalidateCache('containers')
    invalidateCache(`container:${containerName}`)

    return await response.json() as { success: boolean; config: ContainerConfiguration }
}

/**
 * Validate configuration before applying
 */
export async function validateConfiguration(
    containerName: string,
    updates: UpdateConfigRequest
): Promise<ConfigValidation> {
    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/config/validate`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        }
    )

    if (!response.ok) {
        throw new Error(`Failed to validate configuration: ${response.statusText}`)
    }

    return await response.json() as ConfigValidation
}

/**
 * Get configuration diff between current and proposed
 */
export async function getConfigDiff(
    containerName: string,
    proposed: UpdateConfigRequest
): Promise<{ changes: { field: string; oldValue: string; newValue: string; type: string }[] }> {
    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/config/diff`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proposed),
        }
    )

    if (!response.ok) {
        throw new Error(`Failed to get config diff: ${response.statusText}`)
    }

    return await response.json() as { changes: { field: string; oldValue: string; newValue: string; type: string }[] }
}
