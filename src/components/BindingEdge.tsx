import { memo } from 'react'
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { TopologyEdge } from '@/types/topology'

const bindingColors: Record<TopologyEdge['bindingType'], string> = {
    service: 'stroke-green-500',
    kv: 'stroke-blue-500',
    d1: 'stroke-purple-500',
    r2: 'stroke-orange-500',
    queue: 'stroke-yellow-500',
    durable_object: 'stroke-pink-500',
}

const bindingLabels: Record<TopologyEdge['bindingType'], string> = {
    service: 'Service',
    kv: 'KV',
    d1: 'D1',
    r2: 'R2',
    queue: 'Queue',
    durable_object: 'DO',
}

// Use EdgeProps without generic to avoid React Flow v12 strict type issues
function BindingEdgeComponent({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
}: EdgeProps): React.ReactNode {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    // Type-safe access to data via unknown cast
    const edgeData = data as unknown as TopologyEdge | undefined
    const bindingType = edgeData?.bindingType ?? 'service'
    const colorClass = bindingColors[bindingType]
    const isAnimated = edgeData?.animated ?? false
    const bindingName = edgeData?.bindingName

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                className={cn(
                    colorClass,
                    'stroke-2 transition-all',
                    selected && 'stroke-[3px]',
                    isAnimated && 'animate-pulse'
                )}
                style={{ strokeDasharray: isAnimated ? '5,5' : undefined }}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium bg-background border shadow-sm',
                        selected && 'ring-1 ring-primary'
                    )}
                >
                    <span className="text-muted-foreground">
                        {bindingLabels[bindingType]}
                    </span>
                    {bindingName && (
                        <span className="ml-1 opacity-60">
                            {bindingName}
                        </span>
                    )}
                </div>
            </EdgeLabelRenderer>
        </>
    )
}

export const BindingEdge = memo(BindingEdgeComponent)
