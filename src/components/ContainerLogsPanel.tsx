import { useState, useEffect, useCallback } from 'react'
import {
    X,
    RefreshCw,
    Terminal,
    Zap,
    Download,
    Trash2,
    Pause,
    Play,
} from 'lucide-react'
import { LogViewer } from './LogViewer'
import { LogFilterBar } from './LogFilterBar'
import { HttpTestClient } from './HttpTestClient'
import { fetchLogs, downloadLogs, clearLogs } from '@/services/logsApi'
import { cn } from '@/lib/utils'
import type { Container } from '@/types/container'
import type { LogEntry, LogFilter, LogLevel } from '@/types/logs'

interface ContainerLogsPanelProps {
    container: Container
    onClose: () => void
}

type LogTab = 'logs' | 'http-test'

const defaultFilter: LogFilter = {
    levels: ['debug', 'info', 'warn', 'error', 'fatal'] as LogLevel[],
    sources: ['stdout', 'stderr', 'system'],
    search: '',
}

export function ContainerLogsPanel({
    container,
    onClose,
}: ContainerLogsPanelProps): React.ReactNode {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<LogFilter>(defaultFilter)
    const [autoScroll, setAutoScroll] = useState(true)
    const [paused, setPaused] = useState(false)
    const [activeTab, setActiveTab] = useState<LogTab>('logs')
    const [hasMore, setHasMore] = useState(false)
    const [cursor, setCursor] = useState<string | undefined>(undefined)

    const loadLogs = useCallback(async (skipCache: boolean): Promise<void> => {
        if (paused) return
        try {
            setLoading(true)
            const response = await fetchLogs(container.class.name, filter, undefined, skipCache)
            setLogs(response.logs)
            setHasMore(response.hasMore)
            setCursor(response.cursor)
        } catch {
            // Silently fail - demo mode
        } finally {
            setLoading(false)
        }
    }, [container.class.name, filter, paused])

    const loadMore = useCallback(async (): Promise<void> => {
        if (!cursor) return
        try {
            const response = await fetchLogs(container.class.name, filter, cursor)
            setLogs((prev) => [...response.logs, ...prev])
            setHasMore(response.hasMore)
            setCursor(response.cursor)
        } catch {
            // Silently fail
        }
    }, [container.class.name, filter, cursor])

    // Initial load
    useEffect(() => {
        void loadLogs(false)
    }, [loadLogs])

    // Polling for new logs
    useEffect(() => {
        if (paused) return
        const interval = setInterval(() => {
            void loadLogs(true)
        }, 5000)
        return () => clearInterval(interval)
    }, [loadLogs, paused])

    const handleDownload = useCallback(async (): Promise<void> => {
        try {
            const blob = await downloadLogs(container.class.name, 'txt')
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${container.class.name}-logs.txt`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            // Silently fail
        }
    }, [container.class.name])

    const handleClear = useCallback(async (): Promise<void> => {
        try {
            await clearLogs(container.class.name)
            setLogs([])
        } catch {
            // Silently fail
        }
    }, [container.class.name])

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const instanceIds = logs.map((l) => l.instanceId).filter((id): id is string => id !== undefined)

    const tabs: { id: LogTab; label: string; icon: React.ReactNode }[] = [
        { id: 'logs', label: 'Logs', icon: <Terminal className="h-4 w-4" /> },
        { id: 'http-test', label: 'HTTP Test', icon: <Zap className="h-4 w-4" /> },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-background rounded-lg shadow-lg w-full max-w-5xl mx-4 h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Terminal className="h-5 w-5" />
                            Container Logs
                        </h2>
                        <p className="text-sm text-muted-foreground">{container.class.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeTab === 'logs' && (
                            <>
                                <button
                                    onClick={() => setPaused(!paused)}
                                    className={cn(
                                        'p-2 rounded hover:bg-muted transition-colors',
                                        paused && 'text-yellow-500'
                                    )}
                                    title={paused ? 'Resume' : 'Pause'}
                                >
                                    {paused ? (
                                        <Play className="h-4 w-4" />
                                    ) : (
                                        <Pause className="h-4 w-4" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setAutoScroll(!autoScroll)}
                                    className={cn(
                                        'px-2 py-1 text-xs rounded',
                                        autoScroll
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    )}
                                >
                                    Auto-scroll
                                </button>
                                <button
                                    onClick={() => void handleDownload()}
                                    className="p-2 rounded hover:bg-muted transition-colors"
                                    title="Download logs"
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => void handleClear()}
                                    className="p-2 rounded hover:bg-muted text-destructive transition-colors"
                                    title="Clear logs"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => void loadLogs(true)}
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

                {/* Tabs */}
                <div className="flex border-b px-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === 'logs' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <LogFilterBar
                            filter={filter}
                            onChange={setFilter}
                            instanceIds={instanceIds}
                        />
                        <LogViewer
                            logs={logs}
                            loading={loading}
                            autoScroll={autoScroll}
                            hasMore={hasMore}
                            onLoadMore={() => void loadMore()}
                        />
                    </div>
                )}

                {activeTab === 'http-test' && (
                    <HttpTestClient containerName={container.class.name} />
                )}

                {/* Footer */}
                <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
                    <span>{logs.length} log entries</span>
                    <span>
                        {paused ? (
                            <span className="text-yellow-500">Paused</span>
                        ) : (
                            'Live updating'
                        )}
                    </span>
                </div>
            </div>
        </div>
    )
}
