/**
 * Log types for container log viewing
 */

/**
 * Log entry from a container
 */
export interface LogEntry {
    id: string
    timestamp: string
    level: LogLevel
    message: string
    source: 'stdout' | 'stderr' | 'system'
    instanceId?: string
    metadata?: Record<string, unknown>
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Log filter options
 */
export interface LogFilter {
    levels: LogLevel[]
    sources: ('stdout' | 'stderr' | 'system')[]
    search: string
    instanceId?: string
    startTime?: string
    endTime?: string
}

/**
 * Log stream connection status
 */
export type LogStreamStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * HTTP test request configuration
 */
export interface HttpTestRequest {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
    path: string
    headers: Record<string, string>
    body?: string
    timeout: number
}

/**
 * HTTP test response
 */
export interface HttpTestResponse {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    duration: number
    size: number
}

/**
 * API response for logs
 */
export interface LogsResponse {
    logs: LogEntry[]
    hasMore: boolean
    cursor?: string
}
