/**
 * Container types for the frontend
 */

export type ContainerStatus = 'running' | 'starting' | 'stopping' | 'stopped' | 'error' | 'unknown'
export type InstanceType = 'lite' | 'basic' | 'standard-1' | 'standard-2' | 'standard-3' | 'standard-4'

/**
 * Instance type specifications
 */
export const INSTANCE_SPECS: Record<InstanceType, { vcpu: string; memory: string; disk: string }> = {
    lite: { vcpu: '1/16', memory: '256 MiB', disk: '2 GB' },
    basic: { vcpu: '1/4', memory: '1 GiB', disk: '4 GB' },
    'standard-1': { vcpu: '1/2', memory: '4 GiB', disk: '8 GB' },
    'standard-2': { vcpu: '1', memory: '6 GiB', disk: '12 GB' },
    'standard-3': { vcpu: '2', memory: '8 GiB', disk: '16 GB' },
    'standard-4': { vcpu: '4', memory: '12 GiB', disk: '20 GB' },
}

/**
 * Container class definition (from wrangler config)
 */
export interface ContainerClass {
    name: string
    className: string
    workerName: string
    image: string
    instanceType: InstanceType
    maxInstances: number
    defaultPort?: number
    sleepAfter?: string
    createdAt: string
    modifiedAt: string
}

/**
 * Running container instance
 */
export interface ContainerInstance {
    id: string
    containerName: string
    status: ContainerStatus
    location?: string
    startedAt?: string
    lastActivityAt?: string
    cpuPercent?: number
    memoryMb?: number
}

/**
 * Container with instances and metadata
 */
export interface Container {
    class: ContainerClass
    instances: ContainerInstance[]
    status: ContainerStatus
    color?: string
}

/**
 * API response for containers list
 */
export interface ContainersResponse {
    containers: Container[]
    total: number
}

/**
 * API response for single container
 */
export interface ContainerResponse {
    container: Container
}

/**
 * API response for instances
 */
export interface InstancesResponse {
    instances: ContainerInstance[]
    total: number
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
    enabled: boolean
    endpoint: string
    intervalSeconds: number
    timeoutSeconds: number
    failureThreshold: number
}

/**
 * Container action request
 */
export interface ContainerAction {
    action: 'restart' | 'stop' | 'signal'
    signal?: number // For signal action (SIGTERM=15, SIGKILL=9)
    instanceId?: string // For single instance actions
}

/**
 * Color options for container tags
 */
export const CONTAINER_COLORS = [
    { name: 'slate', value: '#64748b' },
    { name: 'gray', value: '#6b7280' },
    { name: 'red', value: '#ef4444' },
    { name: 'orange', value: '#f97316' },
    { name: 'amber', value: '#f59e0b' },
    { name: 'yellow', value: '#eab308' },
    { name: 'lime', value: '#84cc16' },
    { name: 'green', value: '#22c55e' },
    { name: 'emerald', value: '#10b981' },
    { name: 'teal', value: '#14b8a6' },
    { name: 'cyan', value: '#06b6d4' },
    { name: 'sky', value: '#0ea5e9' },
    { name: 'blue', value: '#3b82f6' },
    { name: 'indigo', value: '#6366f1' },
    { name: 'violet', value: '#8b5cf6' },
    { name: 'purple', value: '#a855f7' },
    { name: 'fuchsia', value: '#d946ef' },
    { name: 'pink', value: '#ec4899' },
    { name: 'rose', value: '#f43f5e' },
] as const
