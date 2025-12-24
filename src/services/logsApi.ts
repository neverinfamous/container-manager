/**
 * Logs API service
 */

import { cacheKeys, getCached, setCache } from '@/lib/cache'
import type { LogsResponse, LogFilter, HttpTestRequest, HttpTestResponse } from '@/types/logs'

const API_BASE = '/api'

/**
 * Fetch logs for a container
 */
export async function fetchLogs(
    containerName: string,
    filter: Partial<LogFilter> = {},
    cursor?: string,
    skipCache = false
): Promise<LogsResponse> {
    const cacheKey = cacheKeys.logs(containerName)

    if (!skipCache && !cursor) {
        const cached = getCached(cacheKey) as LogsResponse | null
        if (cached) {
            return filterLogs(cached, filter)
        }
    }

    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (filter.levels?.length) params.set('levels', filter.levels.join(','))
    if (filter.sources?.length) params.set('sources', filter.sources.join(','))
    if (filter.search) params.set('search', filter.search)
    if (filter.instanceId) params.set('instanceId', filter.instanceId)
    if (filter.startTime) params.set('startTime', filter.startTime)
    if (filter.endTime) params.set('endTime', filter.endTime)

    const url = `${API_BASE}/containers/${encodeURIComponent(containerName)}/logs?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`)
    }

    const data = await response.json() as LogsResponse

    if (!cursor) {
        setCache(cacheKey, data)
    }

    return data
}

/**
 * Filter logs client-side
 */
function filterLogs(response: LogsResponse, filter: Partial<LogFilter>): LogsResponse {
    let logs = response.logs

    if (filter.levels?.length) {
        const levels = filter.levels
        logs = logs.filter((log) => levels.includes(log.level))
    }

    if (filter.sources?.length) {
        const sources = filter.sources
        logs = logs.filter((log) => sources.includes(log.source))
    }

    if (filter.search) {
        const search = filter.search.toLowerCase()
        logs = logs.filter((log) => log.message.toLowerCase().includes(search))
    }

    if (filter.instanceId) {
        logs = logs.filter((log) => log.instanceId === filter.instanceId)
    }

    return { ...response, logs }
}

/**
 * Send HTTP test request to container
 */
export async function sendHttpTest(
    containerName: string,
    request: HttpTestRequest
): Promise<HttpTestResponse> {
    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/http-test`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        }
    )

    if (!response.ok) {
        throw new Error(`HTTP test failed: ${response.statusText}`)
    }

    return await response.json() as HttpTestResponse
}

/**
 * Clear logs for a container
 */
export async function clearLogs(containerName: string): Promise<void> {
    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/logs`,
        { method: 'DELETE' }
    )

    if (!response.ok) {
        throw new Error(`Failed to clear logs: ${response.statusText}`)
    }
}

/**
 * Download logs as file
 */
export async function downloadLogs(
    containerName: string,
    format: 'json' | 'txt' = 'txt'
): Promise<Blob> {
    const response = await fetch(
        `${API_BASE}/containers/${encodeURIComponent(containerName)}/logs/download?format=${format}`
    )

    if (!response.ok) {
        throw new Error(`Failed to download logs: ${response.statusText}`)
    }

    return await response.blob()
}
