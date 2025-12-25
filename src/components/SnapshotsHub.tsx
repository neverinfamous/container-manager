import { useState, useEffect, useCallback } from 'react'
import {
    RefreshCw,
    Plus,
    Trash2,
    Archive,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
    Clock,
    HardDrive,
    Calendar,
    Container,
} from 'lucide-react'
import {
    fetchSnapshots,
    createSnapshot,
    deleteSnapshot,
    restoreSnapshot,
    fetchSnapshotStats,
    formatSnapshotSize,
    formatTimeAgo,
} from '@/services/snapshotsApi'
import { cn } from '@/lib/utils'
import type {
    Snapshot,
    SnapshotStats,
    SnapshotStatus,
    RestoreSnapshotOptions,
} from '@/types/snapshots'

const statusIcons: Record<SnapshotStatus, React.ReactNode> = {
    creating: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
    ready: <CheckCircle className="h-4 w-4 text-green-500" />,
    restoring: <RotateCcw className="h-4 w-4 text-yellow-500 animate-spin" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
}

const statusColors: Record<SnapshotStatus, string> = {
    creating: 'bg-blue-500/20 text-blue-600',
    ready: 'bg-green-500/20 text-green-600',
    restoring: 'bg-yellow-500/20 text-yellow-600',
    failed: 'bg-red-500/20 text-red-600',
}

export function SnapshotsHub(): React.ReactNode {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([])
    const [stats, setStats] = useState<SnapshotStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [containerFilter, setContainerFilter] = useState<string>('')
    const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [showRestoreDialog, setShowRestoreDialog] = useState<string | null>(null)
    const [createForm, setCreateForm] = useState({ containerName: '', name: '', description: '' })
    const [restoreOptions, setRestoreOptions] = useState<RestoreSnapshotOptions>({
        restoreEnv: true,
        restoreConfig: true,
        restoreNetworking: true,
        createBackupFirst: true,
    })

    const loadSnapshots = useCallback(async (skipCache: boolean): Promise<void> => {
        try {
            setLoading(true)
            const [snapshotsData, statsData] = await Promise.all([
                fetchSnapshots(containerFilter || undefined, skipCache),
                fetchSnapshotStats(skipCache),
            ])
            setSnapshots(snapshotsData.snapshots)
            setStats(statsData)
        } catch {
            // Silently fail
        } finally {
            setLoading(false)
        }
    }, [containerFilter])

    useEffect(() => {
        void loadSnapshots(false)
    }, [loadSnapshots])

    const handleCreate = async (): Promise<void> => {
        try {
            const request: {
                containerName: string
                name: string
                description?: string
            } = {
                containerName: createForm.containerName,
                name: createForm.name,
            }
            if (createForm.description) {
                request.description = createForm.description
            }
            await createSnapshot(request)
            setCreateForm({ containerName: '', name: '', description: '' })
            setShowCreateForm(false)
            void loadSnapshots(true)
        } catch {
            // Silently fail
        }
    }

    const handleDelete = async (id: string): Promise<void> => {
        try {
            await deleteSnapshot(id)
            void loadSnapshots(true)
        } catch {
            // Silently fail
        }
    }

    const handleRestore = async (id: string): Promise<void> => {
        try {
            await restoreSnapshot(id, restoreOptions)
            setShowRestoreDialog(null)
            void loadSnapshots(true)
        } catch {
            // Silently fail
        }
    }

    const uniqueContainers = [...new Set(snapshots.map((s) => s.containerName))]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Snapshots</h1>
                    <p className="text-muted-foreground">
                        Backup and restore container configurations
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Create Snapshot
                    </button>
                    <button
                        onClick={() => void loadSnapshots(true)}
                        disabled={loading}
                        className="p-2 rounded hover:bg-muted transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Total Snapshots</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{stats.totalSnapshots}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Total Size</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{formatSnapshotSize(stats.totalSize)}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                            <Container className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Containers</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{stats.containerCounts.length}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Latest</p>
                        </div>
                        <p className="text-xl font-bold mt-1">
                            {stats.newestSnapshot ? formatTimeAgo(stats.newestSnapshot) : '-'}
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
                <label className="text-sm text-muted-foreground">Filter by container:</label>
                <select
                    value={containerFilter}
                    onChange={(e) => setContainerFilter(e.target.value)}
                    className="px-3 py-1.5 rounded border bg-background text-sm"
                >
                    <option value="">All containers</option>
                    {uniqueContainers.map((name) => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            {/* Create form */}
            {showCreateForm && (
                <div className="p-4 rounded-lg border bg-card space-y-4">
                    <h3 className="font-semibold">Create Snapshot</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="text-sm font-medium">Container</label>
                            <input
                                type="text"
                                value={createForm.containerName}
                                onChange={(e) => setCreateForm({ ...createForm, containerName: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                                placeholder="api-gateway"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Snapshot Name</label>
                            <input
                                type="text"
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                                placeholder="before-deploy-v2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Description</label>
                            <input
                                type="text"
                                value={createForm.description}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                                placeholder="Optional description"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="px-3 py-1.5 rounded hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => void handleCreate()}
                            disabled={!createForm.containerName || !createForm.name}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}

            {/* Snapshots list */}
            <div className="rounded-lg border bg-card overflow-hidden">
                {snapshots.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No snapshots found</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {snapshots.map((snapshot) => (
                            <div key={snapshot.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {statusIcons[snapshot.status]}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{snapshot.name}</p>
                                                <span className="px-2 py-0.5 text-xs bg-muted rounded">
                                                    {snapshot.containerName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{formatTimeAgo(snapshot.createdAt)}</span>
                                                <span>•</span>
                                                <span>{formatSnapshotSize(snapshot.size)}</span>
                                                <span>•</span>
                                                <span>{snapshot.trigger}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'px-2 py-0.5 text-xs rounded-full',
                                            statusColors[snapshot.status]
                                        )}>
                                            {snapshot.status}
                                        </span>
                                        {snapshot.status === 'ready' && (
                                            <button
                                                onClick={() => setShowRestoreDialog(snapshot.id)}
                                                className="p-1 rounded hover:bg-muted"
                                                title="Restore"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => void handleDelete(snapshot.id)}
                                            className="p-1 rounded hover:bg-muted text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setExpandedSnapshot(
                                                expandedSnapshot === snapshot.id ? null : snapshot.id
                                            )}
                                            className="p-1 rounded hover:bg-muted"
                                        >
                                            {expandedSnapshot === snapshot.id ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {expandedSnapshot === snapshot.id && (
                                    <div className="mt-4 p-3 rounded bg-muted/50 text-sm space-y-2">
                                        {snapshot.description && (
                                            <p className="text-muted-foreground">{snapshot.description}</p>
                                        )}
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Instance Type</p>
                                                <p className="font-medium">{snapshot.config.instanceType}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Max Instances</p>
                                                <p className="font-medium">{snapshot.config.maxInstances}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Environment Variables</p>
                                                <p className="font-medium">
                                                    {Object.keys(snapshot.config.envVars).length} vars
                                                </p>
                                            </div>
                                            {snapshot.config.defaultPort && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Default Port</p>
                                                    <p className="font-medium">{snapshot.config.defaultPort}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Restore dialog */}
                                {showRestoreDialog === snapshot.id && (
                                    <div className="mt-4 p-4 rounded border bg-card space-y-4">
                                        <h4 className="font-semibold">Restore Snapshot</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Restore &quot;{snapshot.name}&quot; to {snapshot.containerName}
                                        </p>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={restoreOptions.restoreEnv}
                                                    onChange={(e) => setRestoreOptions({
                                                        ...restoreOptions,
                                                        restoreEnv: e.target.checked,
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">Restore environment variables</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={restoreOptions.restoreConfig}
                                                    onChange={(e) => setRestoreOptions({
                                                        ...restoreOptions,
                                                        restoreConfig: e.target.checked,
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">Restore configuration</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={restoreOptions.restoreNetworking}
                                                    onChange={(e) => setRestoreOptions({
                                                        ...restoreOptions,
                                                        restoreNetworking: e.target.checked,
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">Restore networking rules</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={restoreOptions.createBackupFirst}
                                                    onChange={(e) => setRestoreOptions({
                                                        ...restoreOptions,
                                                        createBackupFirst: e.target.checked,
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">Create backup before restore</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setShowRestoreDialog(null)}
                                                className="px-3 py-1.5 rounded hover:bg-muted transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => void handleRestore(snapshot.id)}
                                                className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                                            >
                                                Restore
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
