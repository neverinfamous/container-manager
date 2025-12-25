/**
 * Dependency topology types for container visualization
 */

/**
 * Container binding representing a dependency relationship
 */
export interface ContainerBinding {
    id: string
    sourceContainer: string
    targetContainer: string
    bindingType: 'service' | 'kv' | 'd1' | 'r2' | 'queue' | 'durable_object'
    bindingName: string
    description?: string
}

/**
 * Container node for the topology graph
 */
export interface TopologyNode {
    id: string
    name: string
    className: string
    status: 'running' | 'starting' | 'stopped' | 'sleeping' | 'error'
    instanceCount: number
    type: 'container' | 'service' | 'database' | 'storage'
    position?: { x: number; y: number }
}

/**
 * Edge representing a binding connection
 */
export interface TopologyEdge {
    id: string
    source: string
    target: string
    bindingType: ContainerBinding['bindingType']
    bindingName: string
    animated?: boolean
}

/**
 * Full topology data
 */
export interface TopologyData {
    nodes: TopologyNode[]
    edges: TopologyEdge[]
}

/**
 * Orphan detection result
 */
export interface OrphanDetection {
    orphanContainers: string[]
    unusedBindings: string[]
    circularDependencies: string[][]
}
