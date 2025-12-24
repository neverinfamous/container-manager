import { useCallback } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LogFilter, LogLevel } from '@/types/logs'

interface LogFilterBarProps {
    filter: LogFilter
    onChange: (filter: LogFilter) => void
    instanceIds?: string[]
}

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
const LOG_SOURCES = ['stdout', 'stderr', 'system'] as const

const levelColors: Record<LogLevel, string> = {
    debug: 'bg-gray-500',
    info: 'bg-blue-500',
    warn: 'bg-yellow-500',
    error: 'bg-red-500',
    fatal: 'bg-purple-500',
}

export function LogFilterBar({
    filter,
    onChange,
    instanceIds = [],
}: LogFilterBarProps): React.ReactNode {
    const toggleLevel = useCallback((level: LogLevel): void => {
        const levels = filter.levels.includes(level)
            ? filter.levels.filter((l) => l !== level)
            : [...filter.levels, level]
        onChange({ ...filter, levels })
    }, [filter, onChange])

    const toggleSource = useCallback((source: 'stdout' | 'stderr' | 'system'): void => {
        const sources = filter.sources.includes(source)
            ? filter.sources.filter((s) => s !== source)
            : [...filter.sources, source]
        onChange({ ...filter, sources })
    }, [filter, onChange])

    const clearFilters = useCallback((): void => {
        onChange({
            levels: [...LOG_LEVELS],
            sources: [...LOG_SOURCES],
            search: '',
        })
    }, [onChange])

    const hasActiveFilters =
        filter.levels.length < LOG_LEVELS.length ||
        filter.sources.length < LOG_SOURCES.length ||
        filter.search.length > 0 ||
        filter.instanceId !== undefined

    return (
        <div className="flex flex-wrap items-center gap-3 p-3 border-b bg-muted/30">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    value={filter.search}
                    onChange={(e) => onChange({ ...filter, search: e.target.value })}
                    placeholder="Search logs..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-background border rounded"
                />
            </div>

            {/* Level filters */}
            <div className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-muted-foreground mr-1" />
                {LOG_LEVELS.map((level) => (
                    <button
                        key={level}
                        onClick={() => toggleLevel(level)}
                        className={cn(
                            'px-2 py-1 text-xs font-medium rounded transition-colors',
                            filter.levels.includes(level)
                                ? `${levelColors[level]} text-white`
                                : 'bg-muted text-muted-foreground'
                        )}
                    >
                        {level.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Source filters */}
            <div className="flex items-center gap-1">
                {LOG_SOURCES.map((source) => (
                    <button
                        key={source}
                        onClick={() => toggleSource(source)}
                        className={cn(
                            'px-2 py-1 text-xs font-medium rounded transition-colors',
                            filter.sources.includes(source)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                        )}
                    >
                        {source}
                    </button>
                ))}
            </div>

            {/* Instance filter */}
            {instanceIds.length > 0 && (
                <select
                    value={filter.instanceId ?? ''}
                    onChange={(e) => {
                        const value = e.target.value
                        if (value) {
                            onChange({ ...filter, instanceId: value })
                        } else {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { instanceId: _, ...rest } = filter
                            onChange(rest as LogFilter)
                        }
                    }}
                    className="px-2 py-1 text-sm bg-background border rounded"
                >
                    <option value="">All instances</option>
                    {instanceIds.map((id) => (
                        <option key={id} value={id}>
                            {id.slice(0, 8)}...
                        </option>
                    ))}
                </select>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                    <X className="h-3 w-3" />
                    Clear
                </button>
            )}
        </div>
    )
}
