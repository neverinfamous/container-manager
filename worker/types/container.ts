/**
 * Container class configuration
 */
export interface ContainerConfig {
    name: string
    className: string
    image: string
    instanceType: 'lite' | 'basic' | 'standard-1' | 'standard-2' | 'standard-3' | 'standard-4'
    maxInstances: number
    defaultPort?: number
    sleepAfter?: string
    envVars?: Record<string, string>
}

/**
 * Running container instance
 */
export interface ContainerInstance {
    id: string
    containerName: string
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
    location?: string
    startedAt?: string
    lastActivityAt?: string
}

/**
 * Container with instances and metadata
 */
export interface Container {
    config: ContainerConfig
    instances: ContainerInstance[]
    instanceCount: number
    color?: string
}

/**
 * Container metrics
 */
export interface ContainerMetrics {
    containerName: string
    timeRange: '24h' | '7d' | '30d'
    cpu: MetricDataPoint[]
    memory: MetricDataPoint[]
    requests: MetricDataPoint[]
    errors: MetricDataPoint[]
    latencyP50: MetricDataPoint[]
    latencyP90: MetricDataPoint[]
    latencyP99: MetricDataPoint[]
}

export interface MetricDataPoint {
    timestamp: string
    value: number
}

/**
 * Job history entry
 */
export interface Job {
    id: number
    containerName: string | null
    operation: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    startedAt: string
    completedAt: string | null
    durationMs: number | null
    errorMessage: string | null
    metadata: Record<string, unknown> | null
}

/**
 * Webhook configuration
 */
export interface Webhook {
    id: number
    url: string
    events: WebhookEvent[]
    containerFilter: string | null
    secret: string | null
    enabled: boolean
    createdAt: string
    updatedAt: string
    lastTriggeredAt: string | null
    lastStatus: number | null
}

export type WebhookEvent =
    | 'container.start'
    | 'container.stop'
    | 'container.error'
    | 'container.restart'
    | 'schedule.executed'
    | 'schedule.failed'
    | 'snapshot.created'
    | 'snapshot.restored'
    | 'health.degraded'

/**
 * Snapshot configuration
 */
export interface Snapshot {
    id: number
    containerName: string
    name: string | null
    description: string | null
    r2Key: string
    createdAt: string
    createdBy: 'manual' | 'scheduled' | 'auto-before-delete' | 'auto-before-rebuild'
    sizeBytes: number | null
    metadata: SnapshotMetadata | null
}

export interface SnapshotMetadata {
    imageDigest?: string
    instanceType?: string
    maxInstances?: number
    envVarCount?: number
    ports?: number[]
}

/**
 * Scheduled action
 */
export interface ScheduledAction {
    id: number
    containerName: string
    actionType: 'restart' | 'rebuild' | 'scale' | 'snapshot' | 'signal'
    cronExpression: string
    timezone: string
    enabled: boolean
    lastRunAt: string | null
    lastRunStatus: 'success' | 'failed' | null
    nextRunAt: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
    updatedAt: string
}
