import { useState, useEffect, useCallback } from 'react'
import {
    RefreshCw,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Play,
    Square,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Timer,
} from 'lucide-react'
import { fetchJobs, cancelJob, retryJob, fetchJobStats, formatDuration } from '@/services/jobsApi'
import { cn } from '@/lib/utils'
import type { Job, JobStats, JobStatus, JobFilter } from '@/types/jobs'

const statusIcons: Record<JobStatus, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    running: <Play className="h-4 w-4 text-blue-500 animate-pulse" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    cancelled: <Square className="h-4 w-4 text-muted-foreground" />,
}

const statusColors: Record<JobStatus, string> = {
    pending: 'bg-muted text-muted-foreground',
    running: 'bg-blue-500/20 text-blue-600',
    completed: 'bg-green-500/20 text-green-600',
    failed: 'bg-red-500/20 text-red-600',
    cancelled: 'bg-muted text-muted-foreground',
}

const STATUS_FILTERS: JobStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled']

export function JobsPanel(): React.ReactNode {
    const [jobs, setJobs] = useState<Job[]>([])
    const [stats, setStats] = useState<JobStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<JobFilter>({})
    const [expandedJob, setExpandedJob] = useState<string | null>(null)

    const loadJobs = useCallback(async (skipCache: boolean): Promise<void> => {
        try {
            setLoading(true)
            const [jobsData, statsData] = await Promise.all([
                fetchJobs(filter, 1, 50, skipCache),
                fetchJobStats(skipCache),
            ])
            setJobs(jobsData.jobs)
            setStats(statsData)
        } catch {
            // Silently fail
        } finally {
            setLoading(false)
        }
    }, [filter])

    useEffect(() => {
        void loadJobs(false)
    }, [loadJobs])

    const handleCancel = async (jobId: string): Promise<void> => {
        try {
            await cancelJob(jobId)
            void loadJobs(true)
        } catch {
            // Silently fail
        }
    }

    const handleRetry = async (jobId: string): Promise<void> => {
        try {
            await retryJob(jobId)
            void loadJobs(true)
        } catch {
            // Silently fail
        }
    }

    const toggleFilter = (status: JobStatus): void => {
        const currentStatuses = filter.status ?? []
        if (currentStatuses.includes(status)) {
            setFilter({
                ...filter,
                status: currentStatuses.filter((s) => s !== status),
            })
        } else {
            setFilter({
                ...filter,
                status: [...currentStatuses, status],
            })
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
                    <p className="text-muted-foreground">
                        Monitor and manage background tasks
                    </p>
                </div>
                <button
                    onClick={() => void loadJobs(true)}
                    disabled={loading}
                    className="p-2 rounded hover:bg-muted transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-5">
                    <div className="p-4 rounded-lg border bg-card">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                        <p className="text-sm text-muted-foreground">Running</p>
                        <p className="text-2xl font-bold text-blue-500">{stats.running}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                        <p className="text-sm text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter:</span>
                {STATUS_FILTERS.map((status) => (
                    <button
                        key={status}
                        onClick={() => toggleFilter(status)}
                        className={cn(
                            'px-3 py-1 text-sm rounded-full border transition-colors',
                            filter.status?.includes(status)
                                ? statusColors[status]
                                : 'hover:bg-muted'
                        )}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Jobs list */}
            <div className="rounded-lg border bg-card overflow-hidden">
                {jobs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No jobs found</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {jobs.map((job) => (
                            <div key={job.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {statusIcons[job.status]}
                                        <div>
                                            <p className="font-medium">{job.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{job.trigger}</span>
                                                {job.containerName && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{job.containerName}</span>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <span>
                                                    {new Date(job.startedAt).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {job.duration !== undefined && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Timer className="h-3 w-3" />
                                                {formatDuration(job.duration)}
                                            </span>
                                        )}
                                        <span className={cn(
                                            'px-2 py-0.5 text-xs rounded-full',
                                            statusColors[job.status]
                                        )}>
                                            {job.status}
                                        </span>
                                        {job.status === 'running' && (
                                            <button
                                                onClick={() => void handleCancel(job.id)}
                                                className="p-1 rounded hover:bg-muted"
                                                title="Cancel"
                                            >
                                                <Square className="h-4 w-4" />
                                            </button>
                                        )}
                                        {job.status === 'failed' && (
                                            <button
                                                onClick={() => void handleRetry(job.id)}
                                                className="p-1 rounded hover:bg-muted"
                                                title="Retry"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setExpandedJob(
                                                expandedJob === job.id ? null : job.id
                                            )}
                                            className="p-1 rounded hover:bg-muted"
                                        >
                                            {expandedJob === job.id ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                {expandedJob === job.id && (
                                    <div className="mt-4 p-3 rounded bg-muted/50 text-sm">
                                        {job.description && (
                                            <p className="mb-2">{job.description}</p>
                                        )}
                                        {job.output && (
                                            <pre className="p-2 rounded bg-background overflow-x-auto text-xs">
                                                {job.output}
                                            </pre>
                                        )}
                                        {job.error && (
                                            <pre className="p-2 rounded bg-red-500/10 text-red-600 overflow-x-auto text-xs">
                                                {job.error}
                                            </pre>
                                        )}
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
