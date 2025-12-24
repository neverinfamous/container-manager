/**
 * Configuration types for container management
 */

import type { InstanceType } from './container'

/**
 * Environment variable entry
 */
export interface EnvVar {
    key: string
    value: string
    isSecret: boolean
    source: 'config' | 'binding' | 'inherited'
}

/**
 * Port mapping configuration
 */
export interface PortConfig {
    containerPort: number
    protocol: 'tcp' | 'udp'
    isDefault: boolean
}

/**
 * Networking configuration
 */
export interface NetworkConfig {
    allowEgress: boolean
    egressRules: EgressRule[]
    allowedHosts: string[]
}

export interface EgressRule {
    id: string
    destination: string
    ports: string
    protocol: 'tcp' | 'udp' | 'any'
    action: 'allow' | 'deny'
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
    successThreshold: number
}

/**
 * Sleep/idle configuration
 */
export interface SleepConfig {
    enabled: boolean
    sleepAfter: string // Duration like "5m", "30s"
    wakeOnRequest: boolean
}

/**
 * Complete container configuration
 */
export interface ContainerConfiguration {
    name: string
    className: string
    image: string
    instanceType: InstanceType
    maxInstances: number
    envVars: EnvVar[]
    ports: PortConfig[]
    network: NetworkConfig
    healthCheck: HealthCheckConfig
    sleep: SleepConfig
    updatedAt: string
}

/**
 * Configuration change for diff display
 */
export interface ConfigChange {
    field: string
    oldValue: string
    newValue: string
    type: 'added' | 'removed' | 'modified'
}

/**
 * Configuration validation result
 */
export interface ConfigValidation {
    valid: boolean
    errors: ConfigValidationError[]
    warnings: ConfigValidationWarning[]
}

export interface ConfigValidationError {
    field: string
    message: string
}

export interface ConfigValidationWarning {
    field: string
    message: string
}

/**
 * API response for configuration
 */
export interface ConfigurationResponse {
    config: ContainerConfiguration
}

/**
 * API request for updating configuration
 */
export interface UpdateConfigRequest {
    envVars?: EnvVar[]
    instanceType?: InstanceType
    maxInstances?: number
    ports?: PortConfig[]
    network?: NetworkConfig
    healthCheck?: HealthCheckConfig
    sleep?: SleepConfig
}
