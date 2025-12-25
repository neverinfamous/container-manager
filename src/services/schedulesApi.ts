/**
 * Schedules API service
 */

import { setCache, getCached } from '@/lib/cache'
import type {
    Schedule,
    SchedulesResponse,
    ScheduleExecutionsResponse,
    CreateScheduleRequest,
    UpdateScheduleRequest,
} from '@/types/schedules'

const API_BASE = '/api'

/**
 * Fetch all schedules
 */
export async function fetchSchedules(
    containerName?: string,
    skipCache = false
): Promise<SchedulesResponse> {
    const cacheKey = `schedules:${containerName ?? 'all'}`

    if (!skipCache) {
        const cached = getCached(cacheKey) as SchedulesResponse | null
        if (cached) {
            return cached
        }
    }

    const params = containerName ? `?container=${encodeURIComponent(containerName)}` : ''
    const response = await fetch(`${API_BASE}/schedules${params}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.statusText}`)
    }

    const data = await response.json() as SchedulesResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Fetch a single schedule
 */
export async function fetchSchedule(scheduleId: string): Promise<Schedule> {
    const response = await fetch(`${API_BASE}/schedules/${encodeURIComponent(scheduleId)}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch schedule: ${response.statusText}`)
    }

    return await response.json() as Schedule
}

/**
 * Create a new schedule
 */
export async function createSchedule(request: CreateScheduleRequest): Promise<Schedule> {
    const response = await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        throw new Error(`Failed to create schedule: ${response.statusText}`)
    }

    return await response.json() as Schedule
}

/**
 * Update a schedule
 */
export async function updateSchedule(
    scheduleId: string,
    request: UpdateScheduleRequest
): Promise<Schedule> {
    const response = await fetch(`${API_BASE}/schedules/${encodeURIComponent(scheduleId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        throw new Error(`Failed to update schedule: ${response.statusText}`)
    }

    return await response.json() as Schedule
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/schedules/${encodeURIComponent(scheduleId)}`, {
        method: 'DELETE',
    })

    if (!response.ok) {
        throw new Error(`Failed to delete schedule: ${response.statusText}`)
    }
}

/**
 * Toggle schedule enabled state
 */
export async function toggleSchedule(scheduleId: string, enabled: boolean): Promise<Schedule> {
    return updateSchedule(scheduleId, { enabled })
}

/**
 * Fetch schedule execution history
 */
export async function fetchScheduleExecutions(
    scheduleId: string,
    skipCache = false
): Promise<ScheduleExecutionsResponse> {
    const cacheKey = `schedule-executions:${scheduleId}`

    if (!skipCache) {
        const cached = getCached(cacheKey) as ScheduleExecutionsResponse | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(`${API_BASE}/schedules/${encodeURIComponent(scheduleId)}/history`)

    if (!response.ok) {
        throw new Error(`Failed to fetch schedule history: ${response.statusText}`)
    }

    const data = await response.json() as ScheduleExecutionsResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Trigger a schedule to run immediately
 */
export async function triggerSchedule(scheduleId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/schedules/${encodeURIComponent(scheduleId)}/trigger`, {
        method: 'POST',
    })

    if (!response.ok) {
        throw new Error(`Failed to trigger schedule: ${response.statusText}`)
    }

    return await response.json() as { success: boolean }
}

/**
 * Parse cron expression to human-readable string
 */
export function describeCron(cronExpression: string): string {
    const parts = cronExpression.split(' ')
    if (parts.length < 5) return cronExpression

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

    // Simple cases
    if (cronExpression === '* * * * *') return 'Every minute'
    if (cronExpression === '0 * * * *') return 'Every hour'
    if (cronExpression === '0 0 * * *') return 'Daily at midnight'

    if (minute?.startsWith('*/')) {
        const interval = minute.slice(2)
        return `Every ${interval} minutes`
    }

    if (hour?.startsWith('*/') && minute === '0') {
        const interval = hour.slice(2)
        return `Every ${interval} hours`
    }

    if (dayOfWeek !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek !== undefined) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const dayNum = parseInt(dayOfWeek, 10)
        const dayName = days[dayNum]
        if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6 && dayName !== undefined) {
            return `Weekly on ${dayName} at ${hour}:${minute?.padStart(2, '0')}`
        }
    }

    if (dayOfMonth !== '*' && dayOfWeek === '*') {
        return `Monthly on day ${dayOfMonth} at ${hour}:${minute?.padStart(2, '0')}`
    }

    return cronExpression
}

/**
 * Calculate next run time from cron expression
 */
export function getNextRunTime(_cronExpression: string, _timezone: string): Date {
    // Simplified - just return a time in the future
    // In production, use a proper cron parser library
    const now = new Date()
    const next = new Date(now.getTime() + 3600000) // 1 hour from now
    return next
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.round(diffMs / 60000)

    if (diffMins < 0) {
        const absMins = Math.abs(diffMins)
        if (absMins < 60) return `${absMins}m ago`
        const hours = Math.floor(absMins / 60)
        if (hours < 24) return `${hours}h ago`
        return `${Math.floor(hours / 24)}d ago`
    }

    if (diffMins < 60) return `in ${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    if (hours < 24) return `in ${hours}h`
    return `in ${Math.floor(hours / 24)}d`
}
