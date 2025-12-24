/**
 * Container API service
 * Handles all API calls related to containers
 */

import { cacheKeys, getCached, setCache, invalidateCache } from '@/lib/cache'
import type {
    Container,
    ContainerAction,
    ContainersResponse,
    ContainerInstance,
    InstancesResponse,
} from '@/types/container'

const API_BASE = '/api'

/**
 * API error class
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

/**
 * Make an API request with error handling
 */
async function apiRequest<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string; message?: string }
        throw new ApiError(
            errorData.message ?? errorData.error ?? `Request failed with status ${response.status}`,
            response.status
        )
    }

    return await response.json() as T
}

/**
 * List all containers
 */
export async function listContainers(skipCache = false): Promise<Container[]> {
    const cacheKey = cacheKeys.containers()

    if (!skipCache) {
        const cached = getCached(cacheKey) as ContainersResponse | null
        if (cached) {
            return cached.containers
        }
    }

    const response = await apiRequest<ContainersResponse>('/containers')
    setCache(cacheKey, response)
    return response.containers
}

/**
 * Get a single container by name
 */
export async function getContainer(name: string, skipCache = false): Promise<Container> {
    const cacheKey = cacheKeys.container(name)

    if (!skipCache) {
        const cached = getCached(cacheKey) as { container: Container } | null
        if (cached) {
            return cached.container
        }
    }

    const response = await apiRequest<{ container: Container }>(`/containers/${encodeURIComponent(name)}`)
    setCache(cacheKey, response)
    return response.container
}

/**
 * List instances for a container
 */
export async function listInstances(containerName: string, skipCache = false): Promise<ContainerInstance[]> {
    const cacheKey = cacheKeys.instances(containerName)

    if (!skipCache) {
        const cached = getCached(cacheKey) as InstancesResponse | null
        if (cached) {
            return cached.instances
        }
    }

    const response = await apiRequest<InstancesResponse>(
        `/containers/${encodeURIComponent(containerName)}/instances`
    )
    setCache(cacheKey, response)
    return response.instances
}

/**
 * Perform an action on a container (restart, stop, signal)
 */
export async function performContainerAction(
    containerName: string,
    action: ContainerAction
): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest<{ success: boolean; message: string }>(
        `/containers/${encodeURIComponent(containerName)}/${action.action}`,
        {
            method: 'POST',
            body: JSON.stringify({
                signal: action.signal,
                instanceId: action.instanceId,
            }),
        }
    )

    // Invalidate caches after action
    invalidateCache('containers')
    invalidateCache(`container:${containerName}`)
    invalidateCache(`instances:${containerName}`)

    return response
}

/**
 * Stop a specific instance
 */
export async function stopInstance(
    containerName: string,
    instanceId: string
): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest<{ success: boolean; message: string }>(
        `/containers/${encodeURIComponent(containerName)}/instances/${encodeURIComponent(instanceId)}`,
        { method: 'DELETE' }
    )

    // Invalidate caches
    invalidateCache(`instances:${containerName}`)

    return response
}

/**
 * Update container color
 */
export async function updateContainerColor(
    containerName: string,
    color: string | null
): Promise<{ success: boolean }> {
    const response = await apiRequest<{ success: boolean }>(
        `/containers/${encodeURIComponent(containerName)}/color`,
        {
            method: 'PUT',
            body: JSON.stringify({ color }),
        }
    )

    // Invalidate cache
    invalidateCache('containers')
    invalidateCache(`container:${containerName}`)

    return response
}

/**
 * Get health check configuration
 */
export async function getHealthConfig(
    containerName: string
): Promise<{ enabled: boolean; endpoint?: string; interval?: number }> {
    return await apiRequest(`/containers/${encodeURIComponent(containerName)}/health`)
}

/**
 * Update health check configuration
 */
export async function updateHealthConfig(
    containerName: string,
    config: { enabled: boolean; endpoint?: string; interval?: number }
): Promise<{ success: boolean }> {
    return await apiRequest(`/containers/${encodeURIComponent(containerName)}/health`, {
        method: 'PUT',
        body: JSON.stringify(config),
    })
}
