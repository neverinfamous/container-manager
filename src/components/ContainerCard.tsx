import { cn } from '@/lib/utils'
import { type ContainerStatus, type InstanceType, INSTANCE_SPECS } from '@/types/container'
import {
    Container as ContainerIcon,
    Play,
    Square,
    RotateCcw,
    MoreVertical,
    Copy,
    Server,
    Clock,
    Cpu,
    HardDrive,
} from 'lucide-react'

interface ContainerCardProps {
    name: string
    className: string
    instanceType: InstanceType
    instanceCount: number
    status: ContainerStatus
    color?: string
    image: string
    maxInstances: number
    sleepAfter?: string
    onRestart?: () => void
    onStop?: () => void
    onViewInstances?: () => void
    onCopyName?: () => void
}

const statusColors: Record<ContainerStatus, string> = {
    running: 'bg-green-500',
    starting: 'bg-yellow-500 animate-pulse',
    stopping: 'bg-orange-500 animate-pulse',
    stopped: 'bg-gray-400',
    error: 'bg-red-500',
    unknown: 'bg-gray-400',
}

const statusLabels: Record<ContainerStatus, string> = {
    running: 'Running',
    starting: 'Starting',
    stopping: 'Stopping',
    stopped: 'Stopped',
    error: 'Error',
    unknown: 'Unknown',
}

export function ContainerCard({
    name,
    className,
    instanceType,
    instanceCount,
    status,
    color,
    image,
    maxInstances,
    sleepAfter,
    onRestart,
    onStop,
    onViewInstances,
    onCopyName,
}: ContainerCardProps): React.ReactNode {
    const specs = INSTANCE_SPECS[instanceType]

    return (
        <div
            className={cn(
                'rounded-lg border bg-card shadow-sm transition-all hover:shadow-md',
                'relative overflow-hidden'
            )}
        >
            {/* Color tag bar */}
            {color && (
                <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: color }}
                />
            )}

            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-full bg-primary/10 p-2 shrink-0">
                            <ContainerIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate">{name}</h3>
                                <button
                                    onClick={onCopyName}
                                    className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                                    title="Copy name"
                                >
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{className}</p>
                        </div>
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-sm">
                            <span className={cn('h-2 w-2 rounded-full', statusColors[status])} />
                            {statusLabels[status]}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Server className="h-4 w-4" />
                        <span>
                            {instanceCount}/{maxInstances} instances
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Cpu className="h-4 w-4" />
                        <span>{instanceType}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <HardDrive className="h-4 w-4" />
                        <span>{specs.memory}</span>
                    </div>
                    {sleepAfter && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Sleep: {sleepAfter}</span>
                        </div>
                    )}
                </div>

                {/* Image */}
                <div className="mt-3 text-xs text-muted-foreground truncate" title={image}>
                    {image}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 border-t pt-3">
                    {status === 'running' || status === 'starting' ? (
                        <>
                            <button
                                onClick={onRestart}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                                title="Restart"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Restart
                            </button>
                            <button
                                onClick={onStop}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-destructive"
                                title="Stop"
                            >
                                <Square className="h-4 w-4" />
                                Stop
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onRestart}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-green-600"
                            title="Start"
                        >
                            <Play className="h-4 w-4" />
                            Start
                        </button>
                    )}

                    <button
                        onClick={onViewInstances}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md hover:bg-muted transition-colors ml-auto"
                    >
                        <Server className="h-4 w-4" />
                        Instances
                    </button>

                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                        <MoreVertical className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
