/**
 * Schedule types for container automation
 */

/**
 * Schedulable action types
 */
export type ScheduleActionType =
    | 'restart'      // Rolling restart of all instances
    | 'rebuild'      // Trigger image rebuild and redeploy
    | 'scale_up'     // Increase max_instances
    | 'scale_down'   // Decrease max_instances
    | 'snapshot'     // Create configuration snapshot
    | 'signal'       // Send signal (SIGTERM for graceful restart)

/**
 * Schedule status
 */
export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'failed'

/**
 * Scheduled action
 */
export interface Schedule {
    id: string
    containerName: string
    name: string
    description?: string
    action: ScheduleActionType
    actionParams?: Record<string, unknown>
    cronExpression: string
    cronDescription: string
    timezone: string
    enabled: boolean
    status: ScheduleStatus
    createdAt: string
    updatedAt: string
    lastRunAt?: string
    lastRunStatus?: 'success' | 'failed'
    lastRunError?: string
    nextRunAt?: string
    runCount: number
}

/**
 * Schedule execution history entry
 */
export interface ScheduleExecution {
    id: string
    scheduleId: string
    scheduleName: string
    containerName: string
    action: ScheduleActionType
    status: 'success' | 'failed' | 'running'
    startedAt: string
    completedAt?: string
    duration?: number
    output?: string
    error?: string
}

/**
 * Create schedule request
 */
export interface CreateScheduleRequest {
    containerName: string
    name: string
    description?: string
    action: ScheduleActionType
    actionParams?: Record<string, unknown>
    cronExpression: string
    timezone: string
    enabled: boolean
}

/**
 * Update schedule request
 */
export interface UpdateScheduleRequest {
    name?: string
    description?: string
    action?: ScheduleActionType
    actionParams?: Record<string, unknown>
    cronExpression?: string
    timezone?: string
    enabled?: boolean
}

/**
 * Schedules list response
 */
export interface SchedulesResponse {
    schedules: Schedule[]
    total: number
}

/**
 * Schedule executions response
 */
export interface ScheduleExecutionsResponse {
    executions: ScheduleExecution[]
    total: number
}

/**
 * Common cron presets
 */
export const CRON_PRESETS = [
    { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
    { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
    { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
    { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
    { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs every 6 hours' },
    { label: 'Daily at midnight', value: '0 0 * * *', description: 'Runs at 00:00 every day' },
    { label: 'Daily at 6 AM', value: '0 6 * * *', description: 'Runs at 06:00 every day' },
    { label: 'Weekly on Sunday', value: '0 0 * * 0', description: 'Runs at midnight every Sunday' },
    { label: 'Weekly on Monday', value: '0 0 * * 1', description: 'Runs at midnight every Monday' },
    { label: 'Monthly on 1st', value: '0 0 1 * *', description: 'Runs at midnight on the 1st of each month' },
] as const

/**
 * Common timezones
 */
export const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
] as const

/**
 * Action type display info
 */
export const SCHEDULE_ACTIONS: { value: ScheduleActionType; label: string; description: string }[] = [
    { value: 'restart', label: 'Restart', description: 'Rolling restart of all instances' },
    { value: 'rebuild', label: 'Rebuild', description: 'Trigger image rebuild and redeploy' },
    { value: 'scale_up', label: 'Scale Up', description: 'Increase max_instances' },
    { value: 'scale_down', label: 'Scale Down', description: 'Decrease max_instances' },
    { value: 'snapshot', label: 'Snapshot', description: 'Create configuration snapshot' },
    { value: 'signal', label: 'Signal', description: 'Send SIGTERM for graceful restart' },
]
