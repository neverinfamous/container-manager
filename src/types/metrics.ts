/**
 * Metrics types for container performance monitoring
 */

/**
 * Single metric data point
 */
export interface MetricDataPoint {
    timestamp: string
    value: number
}

/**
 * Time series metric
 */
export interface MetricSeries {
    name: string
    data: MetricDataPoint[]
    unit: string
    color?: string
}

/**
 * Container metrics snapshot
 */
export interface ContainerMetrics {
    containerName: string
    timestamp: string
    cpu: {
        usage: number // percentage
        limit: number // percentage (100 = 1 core)
    }
    memory: {
        used: number // bytes
        limit: number // bytes
        percentage: number
    }
    network: {
        bytesIn: number
        bytesOut: number
        requestsPerSecond: number
    }
    instances: {
        total: number
        running: number
        sleeping: number
        errored: number
    }
}

/**
 * Aggregated metrics for dashboard
 */
export interface AggregatedMetrics {
    totalContainers: number
    runningInstances: number
    cpuUsage: number // average percentage
    memoryUsage: number // average percentage
    requestsPerMinute: number
    errorsPerMinute: number
}

/**
 * Metrics time range
 */
export type MetricsTimeRange = '1h' | '6h' | '24h' | '7d' | '30d'

/**
 * Metrics response from API
 */
export interface MetricsResponse {
    container: string
    range: MetricsTimeRange
    series: {
        cpu: MetricDataPoint[]
        memory: MetricDataPoint[]
        requests: MetricDataPoint[]
        errors: MetricDataPoint[]
    }
    current: ContainerMetrics
}

/**
 * Dashboard metrics response
 */
export interface DashboardMetricsResponse {
    aggregated: AggregatedMetrics
    topContainers: {
        byCpu: { name: string; value: number }[]
        byMemory: { name: string; value: number }[]
        byRequests: { name: string; value: number }[]
    }
    timeline: {
        cpu: MetricDataPoint[]
        memory: MetricDataPoint[]
        requests: MetricDataPoint[]
    }
}
