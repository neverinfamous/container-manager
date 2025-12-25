import { useState, useEffect, useCallback } from 'react'
import {
    RefreshCw,
    Box,
    GitCommit,
    History,
    Hammer,
    RotateCcw,
    CheckCircle,
    XCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertTriangle,
    Copy,
    Check,
} from 'lucide-react'
import {
    fetchImageInfo,
    fetchRollouts,
    triggerRebuild,
    rollbackToVersion,
    formatImageSize,
    formatShortDigest,
    formatTimeAgo,
} from '@/services/imagesApi'
import { cn } from '@/lib/utils'
import type {
    ContainerImage,
    Rollout,
    RolloutStatus,
} from '@/types/images'

const rolloutStatusColors: Record<RolloutStatus, string> = {
    in_progress: 'bg-blue-500/20 text-blue-600',
    complete: 'bg-green-500/20 text-green-600',
    failed: 'bg-red-500/20 text-red-600',
    rolled_back: 'bg-yellow-500/20 text-yellow-600',
}

const rolloutStatusIcons: Record<RolloutStatus, React.ReactNode> = {
    in_progress: <Loader2 className="h-4 w-4 animate-spin" />,
    complete: <CheckCircle className="h-4 w-4" />,
    failed: <XCircle className="h-4 w-4" />,
    rolled_back: <RotateCcw className="h-4 w-4" />,
}

export function ImageManager(): React.ReactNode {
    const [containerName, setContainerName] = useState('api-gateway')
    const [imageInfo, setImageInfo] = useState<ContainerImage | null>(null)
    const [previousVersions, setPreviousVersions] = useState<{ digest: string; tag: string; builtAt: string }[]>([])
    const [rollouts, setRollouts] = useState<Rollout[]>([])
    const [loading, setLoading] = useState(true)
    const [showRolloutHistory, setShowRolloutHistory] = useState(false)
    const [showRebuildDialog, setShowRebuildDialog] = useState(false)
    const [showRollbackDialog, setShowRollbackDialog] = useState<string | null>(null)
    const [rebuildOptions, setRebuildOptions] = useState({ createSnapshotFirst: true })
    const [copiedDigest, setCopiedDigest] = useState(false)

    const loadData = useCallback(async (skipCache: boolean): Promise<void> => {
        try {
            setLoading(true)
            const [infoData, rolloutsData] = await Promise.all([
                fetchImageInfo(containerName, skipCache),
                fetchRollouts(containerName, skipCache),
            ])
            setImageInfo(infoData.current)
            setPreviousVersions(infoData.previousVersions)
            setRollouts(rolloutsData.rollouts)
        } catch {
            // Silently fail
        } finally {
            setLoading(false)
        }
    }, [containerName])

    useEffect(() => {
        void loadData(false)
    }, [loadData])

    const handleRebuild = async (): Promise<void> => {
        try {
            await triggerRebuild({
                containerName,
                createSnapshotFirst: rebuildOptions.createSnapshotFirst,
            })
            setShowRebuildDialog(false)
            void loadData(true)
        } catch {
            // Silently fail
        }
    }

    const handleRollback = async (digest: string, tag: string): Promise<void> => {
        try {
            await rollbackToVersion({
                containerName,
                targetDigest: digest,
                targetTag: tag,
            })
            setShowRollbackDialog(null)
            void loadData(true)
        } catch {
            // Silently fail
        }
    }

    const copyDigest = async (): Promise<void> => {
        if (imageInfo?.digest) {
            await navigator.clipboard.writeText(imageInfo.digest)
            setCopiedDigest(true)
            setTimeout(() => setCopiedDigest(false), 2000)
        }
    }

    const containers = ['api-gateway', 'user-service', 'worker-processor']

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Images</h1>
                    <p className="text-muted-foreground">
                        Manage container images and deployments
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={containerName}
                        onChange={(e) => setContainerName(e.target.value)}
                        className="px-3 py-1.5 rounded border bg-background"
                    >
                        {containers.map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowRebuildDialog(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                        <Hammer className="h-4 w-4" />
                        Rebuild
                    </button>
                    <button
                        onClick={() => void loadData(true)}
                        disabled={loading}
                        className="p-2 rounded hover:bg-muted transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Current Image Info */}
            {imageInfo && (
                <div className="rounded-lg border bg-card p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <Box className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">{containerName}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {imageInfo.registry}/{imageInfo.repository}:{imageInfo.tag}
                                </p>
                            </div>
                        </div>
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-600 rounded-full flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                        </span>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <GitCommit className="h-4 w-4" />
                                <span className="text-xs">Digest</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="font-mono text-sm">{formatShortDigest(imageInfo.digest)}</code>
                                <button
                                    onClick={() => void copyDigest()}
                                    className="p-1 rounded hover:bg-muted"
                                    title="Copy full digest"
                                >
                                    {copiedDigest ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Box className="h-4 w-4" />
                                <span className="text-xs">Size</span>
                            </div>
                            <p className="font-semibold mt-1">{formatImageSize(imageInfo.size)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span className="text-xs">Built</span>
                            </div>
                            <p className="font-semibold mt-1">{formatTimeAgo(imageInfo.builtAt)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <History className="h-4 w-4" />
                                <span className="text-xs">Previous Versions</span>
                            </div>
                            <p className="font-semibold mt-1">{previousVersions.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Previous Versions */}
            {previousVersions.length > 0 && (
                <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-semibold">Previous Versions</h3>
                        <span className="text-sm text-muted-foreground">
                            Click to rollback
                        </span>
                    </div>
                    <div className="divide-y">
                        {previousVersions.map((version) => (
                            <div
                                key={version.digest}
                                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <GitCommit className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-sm">
                                                {formatShortDigest(version.digest)}
                                            </code>
                                            <span className="px-2 py-0.5 text-xs bg-muted rounded">
                                                {version.tag}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Built {formatTimeAgo(version.builtAt)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRollbackDialog(version.digest)}
                                    className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-muted"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Rollback
                                </button>

                                {/* Rollback confirmation dialog */}
                                {showRollbackDialog === version.digest && (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                        <div className="bg-card border rounded-lg p-6 max-w-md mx-4 space-y-4">
                                            <div className="flex items-center gap-2 text-yellow-600">
                                                <AlertTriangle className="h-5 w-5" />
                                                <h3 className="font-semibold">Confirm Rollback</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Rolling back to <code className="font-mono">{version.tag}</code> (
                                                {formatShortDigest(version.digest)}) will replace the current
                                                running image.
                                            </p>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setShowRollbackDialog(null)}
                                                    className="px-3 py-1.5 rounded hover:bg-muted transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => void handleRollback(version.digest, version.tag)}
                                                    className="px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                                                >
                                                    Rollback
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rollout History */}
            <div className="rounded-lg border bg-card overflow-hidden">
                <button
                    onClick={() => setShowRolloutHistory(!showRolloutHistory)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                    <h3 className="font-semibold">Rollout History</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {rollouts.length} rollouts
                        </span>
                        {showRolloutHistory ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </div>
                </button>
                {showRolloutHistory && (
                    <div className="border-t divide-y">
                        {rollouts.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No rollout history
                            </div>
                        ) : (
                            rollouts.map((rollout) => (
                                <div key={rollout.id} className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {rolloutStatusIcons[rollout.status]}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <code className="font-mono text-sm">
                                                        {formatShortDigest(rollout.toDigest)}
                                                    </code>
                                                    <span className="px-2 py-0.5 text-xs bg-muted rounded">
                                                        {rollout.toTag}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{formatTimeAgo(rollout.startedAt)}</span>
                                                    {rollout.duration && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{(rollout.duration / 1000).toFixed(1)}s</span>
                                                        </>
                                                    )}
                                                    <span>•</span>
                                                    <span>by {rollout.triggeredBy}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                {rollout.instancesUpdated}/{rollout.instancesTotal}
                                            </span>
                                            <span className={cn(
                                                'px-2 py-0.5 text-xs rounded-full',
                                                rolloutStatusColors[rollout.status]
                                            )}>
                                                {rollout.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    {rollout.error && (
                                        <div className="mt-2 p-2 rounded bg-red-500/10 text-red-600 text-sm">
                                            {rollout.error}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Rebuild Dialog */}
            {showRebuildDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border rounded-lg p-6 max-w-md mx-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <Hammer className="h-5 w-5" />
                            <h3 className="font-semibold">Rebuild Image</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            This will rebuild the container image for{' '}
                            <code className="font-mono">{containerName}</code> and trigger
                            a new rollout.
                        </p>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={rebuildOptions.createSnapshotFirst}
                                onChange={(e) =>
                                    setRebuildOptions({
                                        ...rebuildOptions,
                                        createSnapshotFirst: e.target.checked,
                                    })
                                }
                                className="rounded"
                            />
                            <span className="text-sm">Create snapshot before rebuild</span>
                        </label>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setShowRebuildDialog(false)}
                                className="px-3 py-1.5 rounded hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void handleRebuild()}
                                className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                            >
                                Rebuild
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
