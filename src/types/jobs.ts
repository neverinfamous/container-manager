/**
 * Job types for scheduled tasks and background operations
 */

/**
 * Job status
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Job trigger type
 */
export type JobTrigger = 'manual' | 'scheduled' | 'webhook' | 'container_event'

/**
 * Job definition
 */
export interface Job {
    id: string
    name: string
    description?: string
    status: JobStatus
    trigger: JobTrigger
    containerName?: string
    startedAt: string
    completedAt?: string
    duration?: number // milliseconds
    output?: string
    error?: string
    metadata?: Record<string, unknown>
}

/**
 * Job history entry
 */
export interface JobHistoryEntry {
    id: string
    jobId: string
    status: JobStatus
    startedAt: string
    completedAt?: string
    duration?: number
    output?: string
    error?: string
}

/**
 * Job filter options
 */
export interface JobFilter {
    status?: JobStatus[]
    trigger?: JobTrigger[]
    containerName?: string
    startDate?: string
    endDate?: string
}

/**
 * Jobs list response
 */
export interface JobsResponse {
    jobs: Job[]
    total: number
    page: number
    pageSize: number
}

/**
 * Job statistics
 */
export interface JobStats {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    averageDuration: number
}
