/**
 * Image and build management types
 */

/**
 * Rollout status
 */
export type RolloutStatus = 'in_progress' | 'complete' | 'failed' | 'rolled_back'

/**
 * Build status
 */
export type BuildStatus = 'pending' | 'building' | 'pushing' | 'complete' | 'failed'

/**
 * Container image information
 */
export interface ContainerImage {
    containerName: string
    digest: string
    tag: string
    registry: string
    repository: string
    size: number // bytes
    createdAt: string
    builtAt: string
    dockerfileSource?: string
    buildArgs?: Record<string, string>
}

/**
 * Rollout record
 */
export interface Rollout {
    id: string
    containerName: string
    fromDigest?: string
    toDigest: string
    toTag: string
    status: RolloutStatus
    startedAt: string
    completedAt?: string
    duration?: number
    instancesUpdated: number
    instancesTotal: number
    triggeredBy: string
    error?: string
}

/**
 * Build record
 */
export interface Build {
    id: string
    containerName: string
    status: BuildStatus
    digest?: string
    tag: string
    startedAt: string
    completedAt?: string
    duration?: number
    logs?: string[]
    error?: string
    triggeredBy: string
}

/**
 * Rollback request
 */
export interface RollbackRequest {
    containerName: string
    targetDigest: string
    targetTag: string
    reason?: string
}

/**
 * Rebuild request
 */
export interface RebuildRequest {
    containerName: string
    tag?: string
    buildArgs?: Record<string, string>
    createSnapshotFirst?: boolean
}

/**
 * Rollouts list response
 */
export interface RolloutsResponse {
    rollouts: Rollout[]
    total: number
}

/**
 * Builds list response
 */
export interface BuildsResponse {
    builds: Build[]
    total: number
}

/**
 * Image info response
 */
export interface ImageInfoResponse {
    current: ContainerImage
    previousVersions: {
        digest: string
        tag: string
        builtAt: string
    }[]
}
