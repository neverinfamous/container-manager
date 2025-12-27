/**
 * Topology API service
 */

import { cacheKeys, getCached, setCache } from '@/lib/cache'
import type { TopologyData, OrphanDetection } from '@/types/topology'

const API_BASE = '/api'

/**
 * Fetch container topology data
 */
export async function fetchTopology(skipCache = false): Promise<TopologyData> {
    const cacheKey = cacheKeys.topology()

    if (!skipCache) {
        const cached = getCached(cacheKey) as TopologyData | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(`${API_BASE}/topology`)

    if (!response.ok) {
        throw new Error(`Failed to fetch topology: ${response.statusText}`)
    }

    const data = await response.json() as TopologyData

    setCache(cacheKey, data)

    return data
}

/**
 * Detect orphan containers and unused bindings
 */
export async function detectOrphans(): Promise<OrphanDetection> {
    const response = await fetch(`${API_BASE}/topology/orphans`)

    if (!response.ok) {
        throw new Error(`Failed to detect orphans: ${response.statusText}`)
    }

    return await response.json() as OrphanDetection
}

/**
 * Save custom node positions
 */
export async function saveNodePositions(
    positions: Record<string, { x: number; y: number }>
): Promise<void> {
    const response = await fetch(`${API_BASE}/topology/positions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(positions),
    })

    if (!response.ok) {
        throw new Error(`Failed to save positions: ${response.statusText}`)
    }
}

interface ImportResult {
    success: boolean
    workerName?: string
    imported?: { containers: number; bindings: number }
    error?: string
}

/**
 * Import topology from wrangler.toml content
 */
export async function importTopology(tomlContent: string): Promise<ImportResult> {
    const response = await fetch(`${API_BASE}/topology/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: tomlContent,
    })

    const data = await response.json() as ImportResult
    return data
}
