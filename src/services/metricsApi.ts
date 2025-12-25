/**
 * Metrics API service
 */

import { cacheKeys, setCache, getMetricsCached } from '@/lib/cache'
import type { MetricsResponse, DashboardMetricsResponse, MetricsTimeRange } from '@/types/metrics'

const API_BASE = '/api'

/**
 * Fetch metrics for a specific container
 */
export async function fetchContainerMetrics(
    containerName: string,
    range: MetricsTimeRange = '1h',
    skipCache = false
): Promise<MetricsResponse> {
    const cacheKey = cacheKeys.metrics(containerName, range)

    if (!skipCache) {
        const cached = getMetricsCached(cacheKey) as MetricsResponse | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(`${API_BASE}/containers/${encodeURIComponent(containerName)}/metrics?range=${range}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
    }

    const data = await response.json() as MetricsResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Fetch dashboard aggregate metrics
 */
export async function fetchDashboardMetrics(
    range: MetricsTimeRange = '1h',
    skipCache = false
): Promise<DashboardMetricsResponse> {
    const cacheKey = `dashboard-metrics:${range}`

    if (!skipCache) {
        const cached = getMetricsCached(cacheKey) as DashboardMetricsResponse | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(`${API_BASE}/metrics/dashboard?range=${range}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch dashboard metrics: ${response.statusText}`)
    }

    const data = await response.json() as DashboardMetricsResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(value: number): string {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
    }
    return value.toFixed(0)
}
