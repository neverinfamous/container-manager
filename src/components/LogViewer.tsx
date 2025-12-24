import { useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { LogEntry, LogLevel } from '@/types/logs'

interface LogViewerProps {
    logs: LogEntry[]
    loading?: boolean
    autoScroll?: boolean
    onLoadMore?: () => void
    hasMore?: boolean
}

const levelColors: Record<LogLevel, string> = {
    debug: 'text-gray-400',
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    fatal: 'text-purple-400',
}

const levelBadgeColors: Record<LogLevel, string> = {
    debug: 'bg-gray-500/20 text-gray-400',
    info: 'bg-blue-500/20 text-blue-400',
    warn: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400',
    fatal: 'bg-purple-500/20 text-purple-400',
}

function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0')
}

export function LogViewer({
    logs,
    loading = false,
    autoScroll = true,
    onLoadMore,
    hasMore = false,
}: LogViewerProps): React.ReactNode {
    const containerRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs.length, autoScroll])

    // Memoize grouped logs by timestamp (same second)
    const groupedLogs = useMemo(() => {
        return logs.reduce<LogEntry[][]>((groups, log, index) => {
            if (index === 0) {
                return [[log]]
            }
            const prevLog = logs[index - 1]
            if (!prevLog) {
                groups.push([log])
                return groups
            }
            const prevTime = new Date(prevLog.timestamp).getTime()
            const currTime = new Date(log.timestamp).getTime()

            // Group logs within 100ms of each other
            const lastGroup = groups[groups.length - 1]
            if (currTime - prevTime < 100 && lastGroup) {
                lastGroup.push(log)
            } else {
                groups.push([log])
            }
            return groups
        }, [])
    }, [logs])

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-auto font-mono text-sm bg-[#1a1a2e]"
        >
            {/* Load more button */}
            {hasMore && onLoadMore && (
                <button
                    onClick={onLoadMore}
                    disabled={loading}
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground bg-muted/20"
                >
                    {loading ? 'Loading...' : 'Load older logs'}
                </button>
            )}

            {/* Log entries */}
            <div className="p-2 space-y-0.5">
                {logs.length === 0 && !loading && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                        No logs to display
                    </div>
                )}

                {groupedLogs.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        {group.map((log, logIndex) => (
                            <div
                                key={log.id}
                                className={cn(
                                    'flex items-start gap-2 py-0.5 px-2 hover:bg-white/5 rounded',
                                    log.level === 'error' && 'bg-red-500/10',
                                    log.level === 'fatal' && 'bg-purple-500/10'
                                )}
                            >
                                {/* Timestamp - only show for first in group */}
                                <span className="text-gray-500 shrink-0 w-24">
                                    {logIndex === 0 ? formatTimestamp(log.timestamp) : ''}
                                </span>

                                {/* Level badge */}
                                <span
                                    className={cn(
                                        'px-1.5 py-0.5 text-xs rounded shrink-0 uppercase font-semibold',
                                        levelBadgeColors[log.level]
                                    )}
                                >
                                    {log.level.slice(0, 4)}
                                </span>

                                {/* Source */}
                                <span className="text-gray-500 shrink-0 w-14">
                                    [{log.source}]
                                </span>

                                {/* Instance ID */}
                                {log.instanceId && (
                                    <span className="text-gray-600 shrink-0">
                                        {log.instanceId.slice(0, 8)}
                                    </span>
                                )}

                                {/* Message */}
                                <span className={cn('flex-1 break-all', levelColors[log.level])}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                        <div className="animate-pulse">Loading logs...</div>
                    </div>
                )}
            </div>

            {/* Scroll anchor */}
            <div ref={bottomRef} />
        </div>
    )
}
