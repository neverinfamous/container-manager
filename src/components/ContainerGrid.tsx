import { useState, useEffect, useCallback } from 'react'
import { Search, LayoutGrid, List, RefreshCw, Plus } from 'lucide-react'
import { ContainerCard } from './ContainerCard'
import { ContainerListView } from './ContainerListView'
import { InstancesDialog } from './InstancesDialog'
import { ContainerConfigPanel } from './ContainerConfigPanel'
import { ContainerLogsPanel } from './ContainerLogsPanel'
import { ContainerEditDialog } from './ContainerEditDialog'
import { ConfigGeneratorDialog } from './ConfigGeneratorDialog'
import { listContainers, performContainerAction, deleteContainer } from '@/services/containerApi'
import { copyToClipboard } from '@/lib/utils'
import type { Container } from '@/types/container'

type ViewMode = 'grid' | 'list'

interface ContainerGridProps {
    onContainerSelect?: (container: Container) => void
}

export function ContainerGrid({ onContainerSelect }: ContainerGridProps): React.ReactNode {
    const [containers, setContainers] = useState<Container[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [refreshing, setRefreshing] = useState(false)
    const [selectedContainer, setSelectedContainer] = useState<Container | null>(null)
    const [showInstances, setShowInstances] = useState(false)
    const [showConfig, setShowConfig] = useState(false)
    const [showLogs, setShowLogs] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [editingContainer, setEditingContainer] = useState<Container | undefined>(undefined)
    const [showExportDialog, setShowExportDialog] = useState(false)
    const [exportingContainer, setExportingContainer] = useState<Container | null>(null)


    const fetchContainers = useCallback(async (skipCache?: boolean): Promise<void> => {
        try {
            setRefreshing(true)
            const data = await listContainers(skipCache)
            setContainers(data)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load containers')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        void fetchContainers()
    }, [fetchContainers])

    const handleRefresh = useCallback((): void => {
        void fetchContainers(true)
    }, [fetchContainers])

    const handleRestart = useCallback(async (container: Container): Promise<void> => {
        try {
            await performContainerAction(container.class.name, { action: 'restart' })
            void fetchContainers(true)
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to restart container:', err)
        }
    }, [fetchContainers])

    const handleStop = useCallback(async (container: Container): Promise<void> => {
        try {
            await performContainerAction(container.class.name, { action: 'stop' })
            void fetchContainers(true)
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to stop container:', err)
        }
    }, [fetchContainers])

    const handleViewInstances = useCallback((container: Container): void => {
        setSelectedContainer(container)
        setShowInstances(true)
    }, [])

    const handleCopyName = useCallback(async (name: string): Promise<void> => {
        await copyToClipboard(name)
    }, [])

    const handleConfigure = useCallback((container: Container): void => {
        setSelectedContainer(container)
        setShowConfig(true)
    }, [])

    const handleViewLogs = useCallback((container: Container): void => {
        setSelectedContainer(container)
        setShowLogs(true)
    }, [])

    const handleEdit = useCallback((container: Container): void => {
        setEditingContainer(container)
        setShowEditDialog(true)
    }, [])

    const handleDelete = useCallback(async (container: Container): Promise<void> => {
        if (!confirm(`Delete container "${container.class.name}"? This only removes it from the registry, not from Cloudflare.`)) {
            return
        }
        try {
            await deleteContainer(container.class.name)
            void fetchContainers(true)
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to delete container:', err)
        }
    }, [fetchContainers])

    const handleCreateNew = useCallback((): void => {
        setEditingContainer(undefined)
        setShowEditDialog(true)
    }, [])

    const handleExport = useCallback((container: Container): void => {
        setExportingContainer(container)
        setShowExportDialog(true)
    }, [])

    // Filter containers by search query
    const filteredContainers = containers.filter((container) =>
        container.class.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.class.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.class.image.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
                <button
                    onClick={handleRefresh}
                    className="mt-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    Try again
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search containers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                {/* View mode toggle */}
                <div className="flex items-center gap-1 rounded-md border p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                        title="Grid view"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                        title="List view"
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>

                {/* Refresh */}
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>

                {/* Register new container */}
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Register
                </button>
            </div>

            {/* Empty state */}
            {filteredContainers.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {searchQuery ? 'No containers match your search' : 'No containers found'}
                    </p>
                    {containers.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Deploy a container using wrangler to get started
                        </p>
                    )}
                </div>
            )}

            {/* Container grid/list */}
            {viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredContainers.map((container) => (
                        <ContainerCard
                            key={container.class.name}
                            name={container.class.name}
                            className={container.class.className}
                            instanceType={container.class.instanceType}
                            instanceCount={container.instances.length}
                            status={container.status}
                            image={container.class.image}
                            maxInstances={container.class.maxInstances}
                            onRestart={() => void handleRestart(container)}
                            onStop={() => void handleStop(container)}
                            onViewInstances={() => handleViewInstances(container)}
                            onCopyName={() => void handleCopyName(container.class.name)}
                            onConfigure={() => handleConfigure(container)}
                            onViewLogs={() => handleViewLogs(container)}
                            onEdit={() => handleEdit(container)}
                            onDelete={() => void handleDelete(container)}
                            onExport={() => handleExport(container)}
                            {...(container.color !== undefined && { color: container.color })}
                            {...(container.class.sleepAfter !== undefined && { sleepAfter: container.class.sleepAfter })}
                        />
                    ))}
                </div>
            ) : (
                <ContainerListView
                    containers={filteredContainers}
                    onRestart={(c) => void handleRestart(c)}
                    onStop={(c) => void handleStop(c)}
                    onViewInstances={handleViewInstances}
                    {...(onContainerSelect !== undefined && { onSelect: onContainerSelect })}
                />
            )}

            {/* Instances dialog */}
            {showInstances && selectedContainer && (
                <InstancesDialog
                    container={selectedContainer}
                    onClose={() => {
                        setShowInstances(false)
                        setSelectedContainer(null)
                    }}
                />
            )}

            {/* Config panel */}
            {showConfig && selectedContainer && (
                <ContainerConfigPanel
                    container={selectedContainer}
                    onClose={() => {
                        setShowConfig(false)
                        setSelectedContainer(null)
                    }}
                    onSaved={() => void fetchContainers(true)}
                />
            )}

            {/* Logs panel */}
            {showLogs && selectedContainer && (
                <ContainerLogsPanel
                    container={selectedContainer}
                    onClose={() => {
                        setShowLogs(false)
                        setSelectedContainer(null)
                    }}
                />
            )}

            {/* Edit/Create dialog */}
            <ContainerEditDialog
                isOpen={showEditDialog}
                onClose={() => {
                    setShowEditDialog(false)
                    setEditingContainer(undefined)
                }}
                onSuccess={() => void fetchContainers(true)}
                container={editingContainer}
            />

            {/* Config Generator dialog */}
            {exportingContainer && (
                <ConfigGeneratorDialog
                    isOpen={showExportDialog}
                    onClose={() => {
                        setShowExportDialog(false)
                        setExportingContainer(null)
                    }}
                    container={exportingContainer}
                />
            )}
        </div>
    )
}
