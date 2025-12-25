import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Container, Database, HardDrive, Server, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TopologyNode } from '@/types/topology'

const statusColors: Record<TopologyNode['status'], string> = {
    running: 'bg-green-500',
    starting: 'bg-yellow-500 animate-pulse',
    stopped: 'bg-gray-500',
    sleeping: 'bg-blue-500',
    error: 'bg-red-500',
}

const typeIcons: Record<TopologyNode['type'], React.ComponentType<{ className?: string }>> = {
    container: Container,
    service: Server,
    database: Database,
    storage: HardDrive,
}

const typeBorderColors: Record<TopologyNode['type'], string> = {
    container: 'border-green-500/50',
    service: 'border-blue-500/50',
    database: 'border-purple-500/50',
    storage: 'border-orange-500/50',
}

interface ContainerNodeData extends TopologyNode {
    onSelect?: (id: string) => void
}

// Use NodeProps without generic to avoid React Flow v12 strict type issues
function ContainerNodeComponent({ data, selected }: NodeProps): React.ReactNode {
    // Type-safe access to data via unknown cast
    const nodeData = data as unknown as ContainerNodeData
    const Icon = typeIcons[nodeData.type] ?? Container

    return (
        <div
            className={cn(
                'px-4 py-3 rounded-lg border-2 bg-card shadow-lg transition-all min-w-[160px]',
                typeBorderColors[nodeData.type],
                selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            )}
            onClick={() => nodeData.onSelect?.(nodeData.id)}
        >
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
            />

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-2 h-2 rounded-full', statusColors[nodeData.status])} />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm truncate">{nodeData.name}</span>
            </div>

            {/* Details */}
            <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>{nodeData.instanceCount} instance{nodeData.instanceCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="truncate opacity-70">{nodeData.className}</div>
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
            />
        </div>
    )
}

export const ContainerNode = memo(ContainerNodeComponent)
