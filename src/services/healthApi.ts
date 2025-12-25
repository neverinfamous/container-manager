/**
 * Health API - Functions for checking container health
 */

const API_BASE_URL = '/api'

export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'unknown'
    statusCode: number | null
    latencyMs: number | null
    lastChecked: string
    error: string | null
}

export interface HealthProbeConfig {
    enabled: boolean
    path: string
    expectedStatus: number
    timeoutMs: number
}

// In-memory cache for health results
const healthCache = new Map<string, { data: HealthCheckResult; timestamp: number }>()
const CACHE_TTL_MS = 30000 // 30 seconds

/**
 * Check health of a container by name
 */
export async function checkContainerHealth(
    containerName: string,
    config?: Partial<HealthProbeConfig>,
    skipCache = false
): Promise<HealthCheckResult> {
    const cacheKey = containerName
    const cached = healthCache.get(cacheKey)

    if (!skipCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data
    }

    try {
        const params = new URLSearchParams()
        if (config?.path !== undefined) params.set('path', config.path)
        if (config?.expectedStatus !== undefined) params.set('expectedStatus', config.expectedStatus.toString())
        if (config?.timeoutMs !== undefined) params.set('timeoutMs', config.timeoutMs.toString())

        const url = `${API_BASE_URL}/containers/${encodeURIComponent(containerName)}/health${params.toString() ? '?' + params.toString() : ''}`

        const response = await fetch(url)
        const result = await response.json() as HealthCheckResult

        healthCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
    } catch (error) {
        const result: HealthCheckResult = {
            status: 'unknown',
            statusCode: null,
            latencyMs: null,
            lastChecked: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        }
        return result
    }
}

/**
 * Clear health cache for a container
 */
export function clearHealthCache(containerName?: string): void {
    if (containerName) {
        healthCache.delete(containerName)
    } else {
        healthCache.clear()
    }
}

/**
 * Default health probe configuration
 */
export const DEFAULT_HEALTH_CONFIG: HealthProbeConfig = {
    enabled: false,
    path: '/health',
    expectedStatus: 200,
    timeoutMs: 5000,
}
