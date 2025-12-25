/**
 * Jobs API service
 */

import { setCache, getCached } from '@/lib/cache'
import type { Job, JobsResponse, JobStats, JobFilter } from '@/types/jobs'

const API_BASE = '/api'

/**
 * Fetch jobs list
 */
export async function fetchJobs(
    filter?: JobFilter,
    page = 1,
    pageSize = 20,
    skipCache = false
): Promise<JobsResponse> {
    const cacheKey = `jobs:${JSON.stringify(filter)}:${page}:${pageSize}`

    if (!skipCache) {
        const cached = getCached(cacheKey) as JobsResponse | null
        if (cached) {
            return cached
        }
    }

    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())

    if (filter?.status?.length) {
        params.set('status', filter.status.join(','))
    }
    if (filter?.trigger?.length) {
        params.set('trigger', filter.trigger.join(','))
    }
    if (filter?.containerName) {
        params.set('container', filter.containerName)
    }

    const response = await fetch(`${API_BASE}/jobs?${params.toString()}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.statusText}`)
    }

    const data = await response.json() as JobsResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Fetch single job
 */
export async function fetchJob(jobId: string): Promise<Job> {
    const response = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch job: ${response.statusText}`)
    }

    return await response.json() as Job
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
    })

    if (!response.ok) {
        throw new Error(`Failed to cancel job: ${response.statusText}`)
    }
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId: string): Promise<Job> {
    const response = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: 'POST',
    })

    if (!response.ok) {
        throw new Error(`Failed to retry job: ${response.statusText}`)
    }

    return await response.json() as Job
}

/**
 * Fetch job statistics
 */
export async function fetchJobStats(skipCache = false): Promise<JobStats> {
    const cacheKey = 'job-stats'

    if (!skipCache) {
        const cached = getCached(cacheKey) as JobStats | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(`${API_BASE}/jobs/stats`)

    if (!response.ok) {
        throw new Error(`Failed to fetch job stats: ${response.statusText}`)
    }

    const data = await response.json() as JobStats

    setCache(cacheKey, data)

    return data
}

/**
 * Format job duration
 */
export function formatDuration(ms: number | undefined): string {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}
