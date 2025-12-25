import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
    RefreshCw,
    AlertTriangle,
    Network,
} from 'lucide-react'
import { ContainerNode } from './ContainerNode'
import { BindingEdge } from './BindingEdge'
import { fetchTopology, detectOrphans, saveNodePositions } from '@/services/topologyApi'
import { cn } from '@/lib/utils'
import type { TopologyNode, OrphanDetection } from '@/types/topology'

// Register custom node and edge types
const nodeTypes = {
    container: ContainerNode,
}

const edgeTypes = {
    binding: BindingEdge,
}

interface DependencyGraphProps {
    onContainerSelect?: (containerId: string) => void
}

export function DependencyGraph({
    onContainerSelect,
}: DependencyGraphProps): React.ReactNode {
    // Use any[] to avoid React Flow v12 strict generic type issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([])
    const [loading, setLoading] = useState(true)
    const [orphans, setOrphans] = useState<OrphanDetection | null>(null)
    const [showOrphans, setShowOrphans] = useState(false)

    // Load topology data
    const loadTopology = useCallback(async (skipCache: boolean): Promise<void> => {
        try {
            setLoading(true)
            const data = await fetchTopology(skipCache)

            // Transform to React Flow format
            const flowNodes = data.nodes.map((node, index) => ({
                id: node.id,
                type: 'container',
                position: node.position ?? {
                    x: (index % 4) * 250 + 50,
                    y: Math.floor(index / 4) * 180 + 50,
                },
                data: {
                    ...node,
                    onSelect: onContainerSelect,
                },
            }))

            const flowEdges = data.edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: 'binding',
                animated: edge.animated,
                data: edge,
            }))

            setNodes(flowNodes)
            setEdges(flowEdges)
        } catch {
            // Silently fail - demo mode
        } finally {
            setLoading(false)
        }
    }, [onContainerSelect, setNodes, setEdges])

    // Load orphan detection
    const loadOrphans = useCallback(async (): Promise<void> => {
        try {
            const data = await detectOrphans()
            setOrphans(data)
        } catch {
            // Silently fail
        }
    }, [])

    // Initial load
    useEffect(() => {
        void loadTopology(false)
        void loadOrphans()
    }, [loadTopology, loadOrphans])

    // Save positions when nodes change
    const handleNodeDragStop = useCallback(() => {
        const positions: Record<string, { x: number; y: number }> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodes.forEach((node: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            positions[node.id as string] = { x: node.position.x as number, y: node.position.y as number }
        })
        void saveNodePositions(positions)
    }, [nodes])

    // Legend data
    const bindingTypes = useMemo(() => [
        { type: 'service', color: 'bg-green-500', label: 'Service' },
        { type: 'kv', color: 'bg-blue-500', label: 'KV' },
        { type: 'd1', color: 'bg-purple-500', label: 'D1' },
        { type: 'r2', color: 'bg-orange-500', label: 'R2' },
        { type: 'queue', color: 'bg-yellow-500', label: 'Queue' },
        { type: 'durable_object', color: 'bg-pink-500', label: 'DO' },
    ], [])

    const hasOrphans = orphans && (
        orphans.orphanContainers.length > 0 ||
        orphans.unusedBindings.length > 0 ||
        orphans.circularDependencies.length > 0
    )

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                    <Network className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Dependency Topology</h2>
                    <span className="text-sm text-muted-foreground">
                        {nodes.length} container{nodes.length !== 1 ? 's' : ''} • {edges.length} binding{edges.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {hasOrphans && (
                        <button
                            onClick={() => setShowOrphans(!showOrphans)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded',
                                showOrphans
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-yellow-500/20 text-yellow-600'
                            )}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Issues
                        </button>
                    )}
                    <button
                        onClick={() => void loadTopology(true)}
                        disabled={loading}
                        className="p-2 rounded hover:bg-muted transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Orphan warnings panel */}
            {showOrphans && orphans && (
                <div className="p-4 bg-yellow-500/10 border-b space-y-2">
                    {orphans.orphanContainers.length > 0 && (
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-700">
                                    Orphan Containers
                                </p>
                                <p className="text-xs text-yellow-600">
                                    {orphans.orphanContainers.join(', ')}
                                </p>
                            </div>
                        </div>
                    )}
                    {orphans.unusedBindings.length > 0 && (
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-700">
                                    Unused Bindings
                                </p>
                                <p className="text-xs text-yellow-600">
                                    {orphans.unusedBindings.join(', ')}
                                </p>
                            </div>
                        </div>
                    )}
                    {orphans.circularDependencies.length > 0 && (
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-700">
                                    Circular Dependencies
                                </p>
                                {orphans.circularDependencies.map((cycle, i) => (
                                    <p key={i} className="text-xs text-red-600">
                                        {cycle.join(' → ')} → {cycle[0]}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Graph */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeDragStop={handleNodeDragStop}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    minZoom={0.1}
                    maxZoom={2}
                    defaultEdgeOptions={{
                        type: 'binding',
                    }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                    <Controls
                        showZoom
                        showFitView
                        showInteractive={false}
                    />
                    <MiniMap
                        nodeColor={(node) => {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                            const status = (node.data as any)?.status as TopologyNode['status'] | undefined
                            if (!status) return '#6b7280'
                            switch (status) {
                                case 'running': return '#22c55e'
                                case 'starting': return '#eab308'
                                case 'stopped': return '#6b7280'
                                case 'sleeping': return '#3b82f6'
                                case 'error': return '#ef4444'
                                default: return '#6b7280'
                            }
                        }}
                        maskColor="rgba(0,0,0,0.3)"
                        className="!bg-muted/50"
                    />
                </ReactFlow>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-background/80 backdrop-blur border shadow-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Binding Types</p>
                    <div className="grid grid-cols-3 gap-2">
                        {bindingTypes.map((bt) => (
                            <div key={bt.type} className="flex items-center gap-1.5">
                                <div className={cn('w-3 h-0.5 rounded', bt.color)} />
                                <span className="text-xs">{bt.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loading overlay */}
                {loading && nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            Loading topology...
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
