interface CacheEntry {
    data: unknown
    timestamp: number
}

const cache = new Map<string, CacheEntry>()

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const METRICS_TTL = 2 * 60 * 1000 // 2 minutes for metrics

/**
 * Get data from cache if not expired
 */
export function getCached(key: string, ttl = DEFAULT_TTL): unknown {
    const entry = cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > ttl) {
        cache.delete(key)
        return null
    }

    return entry.data
}

/**
 * Set data in cache
 */
export function setCache(key: string, data: unknown): void {
    cache.set(key, {
        data,
        timestamp: Date.now(),
    })
}

/**
 * Invalidate cache entries matching a prefix
 */
export function invalidateCache(prefix: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key)
        }
    }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
    cache.clear()
}

/**
 * Get metrics data from cache (shorter TTL)
 */
export function getMetricsCached(key: string): unknown {
    return getCached(key, METRICS_TTL)
}

/**
 * Cache key generators
 */
export const cacheKeys = {
    containers: (): string => 'containers',
    container: (name: string): string => `container:${name}`,
    instances: (name: string): string => `instances:${name}`,
    config: (name: string): string => `config:${name}`,
    metrics: (name: string, range: string): string => `metrics:${name}:${range}`,
    logs: (name: string): string => `logs:${name}`,
    snapshots: (name: string): string => `snapshots:${name}`,
    topology: (): string => 'topology',
    jobs: (): string => 'jobs',
    webhooks: (): string => 'webhooks',
    schedules: (): string => 'schedules',
}
