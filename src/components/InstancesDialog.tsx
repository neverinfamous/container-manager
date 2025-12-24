import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Square, MapPin, Clock, Cpu, MemoryStick } from 'lucide-react'
import { listInstances, stopInstance } from '@/services/containerApi'
import { formatDate, formatDuration, cn } from '@/lib/utils'
import type { Container, ContainerInstance, ContainerStatus } from '@/types/container'

interface InstancesDialogProps {
    container: Container
    onClose: () => void
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

export function InstancesDialog({ container, onClose }: InstancesDialogProps): React.ReactNode {
    const [instances, setInstances] = useState<ContainerInstance[]>(container.instances)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set())

    const fetchInstances = useCallback(async (): Promise<void> => {
        try {
            setLoading(true)
            const data = await listInstances(container.class.name, true)
            setInstances(data)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load instances')
        } finally {
            setLoading(false)
        }
    }, [container.class.name])

    useEffect(() => {
        void fetchInstances()
    }, [fetchInstances])

    const handleStopInstance = async (instanceId: string): Promise<void> => {
        try {
            setStoppingIds((prev) => new Set(prev).add(instanceId))
            await stopInstance(container.class.name, instanceId)
            void fetchInstances()
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to stop instance:', err)
        } finally {
            setStoppingIds((prev) => {
                const next = new Set(prev)
                next.delete(instanceId)
                return next
            })
        }
    }

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">Instances</h2>
                        <p className="text-sm text-muted-foreground">{container.class.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => void fetchInstances()}
                            disabled={loading}
                            className="p-2 rounded hover:bg-muted transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded hover:bg-muted transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {error && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-4">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {instances.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No running instances</p>
                            <p className="text-sm mt-1">
                                Instances start automatically when the container receives traffic
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {instances.map((instance) => (
                                <div
                                    key={instance.id}
                                    className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={cn('h-2 w-2 rounded-full', statusColors[instance.status])} />
                                                <span className="font-mono text-sm truncate">{instance.id}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {statusLabels[instance.status]}
                                                </span>
                                            </div>

                                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                                {instance.location && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        <span>{instance.location}</span>
                                                    </div>
                                                )}
                                                {instance.startedAt && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span title={formatDate(instance.startedAt)}>
                                                            Up {formatDuration(Date.now() - new Date(instance.startedAt).getTime())}
                                                        </span>
                                                    </div>
                                                )}
                                                {instance.cpuPercent !== undefined && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Cpu className="h-3.5 w-3.5" />
                                                        <span>{instance.cpuPercent.toFixed(1)}% CPU</span>
                                                    </div>
                                                )}
                                                {instance.memoryMb !== undefined && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MemoryStick className="h-3.5 w-3.5" />
                                                        <span>{instance.memoryMb.toFixed(0)} MB</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {instance.status === 'running' && (
                                            <button
                                                onClick={() => void handleStopInstance(instance.id)}
                                                disabled={stoppingIds.has(instance.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors disabled:opacity-50"
                                            >
                                                {stoppingIds.has(instance.id) ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Square className="h-4 w-4" />
                                                )}
                                                Stop
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        {instances.length} instance{instances.length !== 1 ? 's' : ''} •
                        Max {container.class.maxInstances}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
