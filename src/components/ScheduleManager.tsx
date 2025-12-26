import { useState, useEffect, useCallback } from 'react'
import {
    RefreshCw,
    Plus,
    Trash2,
    Play,
    Pause,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
    Clock,
    Calendar,
    Zap,
    RotateCcw,
    TrendingUp,
    TrendingDown,
    Camera,
    Radio,
    PlayCircle,
} from 'lucide-react'
import {
    fetchSchedules,
    createSchedule,
    deleteSchedule,
    toggleSchedule,
    fetchScheduleExecutions,
    triggerSchedule,
    describeCron,
    formatRelativeTime,
} from '@/services/schedulesApi'
import { cn } from '@/lib/utils'
import type {
    Schedule,
    ScheduleExecution,
    ScheduleActionType,
    ScheduleStatus,
} from '@/types/schedules'
import { CRON_PRESETS, TIMEZONES, SCHEDULE_ACTIONS } from '@/types/schedules'

const statusColors: Record<ScheduleStatus, string> = {
    active: 'bg-green-500/20 text-green-600',
    paused: 'bg-yellow-500/20 text-yellow-600',
    completed: 'bg-blue-500/20 text-blue-600',
    failed: 'bg-red-500/20 text-red-600',
}

const actionIcons: Record<ScheduleActionType, React.ReactNode> = {
    restart: <RotateCcw className="h-4 w-4" />,
    rebuild: <Zap className="h-4 w-4" />,
    scale_up: <TrendingUp className="h-4 w-4" />,
    scale_down: <TrendingDown className="h-4 w-4" />,
    snapshot: <Camera className="h-4 w-4" />,
    signal: <Radio className="h-4 w-4" />,
}

interface CreateFormState {
    containerName: string
    name: string
    description: string
    action: ScheduleActionType
    cronExpression: string
    timezone: string
    enabled: boolean
}

const defaultCreateForm: CreateFormState = {
    containerName: '',
    name: '',
    description: '',
    action: 'restart',
    cronExpression: '0 0 * * *',
    timezone: 'UTC',
    enabled: true,
}

export function ScheduleManager(): React.ReactNode {
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null)
    const [executions, setExecutions] = useState<Record<string, ScheduleExecution[]>>({})
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [createForm, setCreateForm] = useState<CreateFormState>(defaultCreateForm)

    const loadSchedules = useCallback(async (skipCache: boolean): Promise<void> => {
        try {
            setLoading(true)
            const data = await fetchSchedules(undefined, skipCache)
            setSchedules(data.schedules)
        } catch {
            // Silently fail
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadSchedules(false)
    }, [loadSchedules])

    const loadExecutions = async (scheduleId: string): Promise<void> => {
        try {
            const data = await fetchScheduleExecutions(scheduleId)
            setExecutions((prev) => ({ ...prev, [scheduleId]: data.executions }))
        } catch {
            // Silently fail
        }
    }

    const handleToggleExpand = async (scheduleId: string): Promise<void> => {
        if (expandedSchedule === scheduleId) {
            setExpandedSchedule(null)
        } else {
            setExpandedSchedule(scheduleId)
            if (!executions[scheduleId]) {
                await loadExecutions(scheduleId)
            }
        }
    }

    const handleCreate = async (): Promise<void> => {
        try {
            const request: {
                containerName: string
                name: string
                description?: string
                action: ScheduleActionType
                cronExpression: string
                timezone: string
                enabled: boolean
            } = {
                containerName: createForm.containerName,
                name: createForm.name,
                action: createForm.action,
                cronExpression: createForm.cronExpression,
                timezone: createForm.timezone,
                enabled: createForm.enabled,
            }
            if (createForm.description) {
                request.description = createForm.description
            }
            await createSchedule(request)
            setCreateForm(defaultCreateForm)
            setShowCreateForm(false)
            void loadSchedules(true)
        } catch {
            // Silently fail
        }
    }

    const handleDelete = async (id: string): Promise<void> => {
        try {
            await deleteSchedule(id)
            void loadSchedules(true)
        } catch {
            // Silently fail
        }
    }

    const handleToggle = async (id: string, enabled: boolean): Promise<void> => {
        try {
            await toggleSchedule(id, enabled)
            void loadSchedules(true)
        } catch {
            // Silently fail
        }
    }

    const handleTrigger = async (id: string): Promise<void> => {
        try {
            await triggerSchedule(id)
            void loadSchedules(true)
        } catch {
            // Silently fail
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
                    <p className="text-muted-foreground">
                        Automate container actions with cron schedules
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Create Schedule
                    </button>
                    <button
                        onClick={() => void loadSchedules(true)}
                        disabled={loading}
                        className="p-2 rounded hover:bg-muted transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Create form */}
            {showCreateForm && (
                <div className="p-4 rounded-lg border bg-card space-y-4">
                    <h3 className="font-semibold">Create Schedule</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label htmlFor="schedule-container" className="text-sm font-medium">Container</label>
                            <input
                                id="schedule-container"
                                type="text"
                                value={createForm.containerName}
                                onChange={(e) => setCreateForm({ ...createForm, containerName: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                                placeholder="api-gateway"
                            />
                        </div>
                        <div>
                            <label htmlFor="schedule-name" className="text-sm font-medium">Schedule Name</label>
                            <input
                                id="schedule-name"
                                type="text"
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                                placeholder="daily-restart"
                            />
                        </div>
                        <div>
                            <label htmlFor="schedule-action" className="text-sm font-medium">Action</label>
                            <select
                                id="schedule-action"
                                value={createForm.action}
                                onChange={(e) => setCreateForm({ ...createForm, action: e.target.value as ScheduleActionType })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                            >
                                {SCHEDULE_ACTIONS.map((action) => (
                                    <option key={action.value} value={action.value}>
                                        {action.label} - {action.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="schedule-cron" className="text-sm font-medium">Cron Expression</label>
                            <select
                                id="schedule-cron"
                                value={createForm.cronExpression}
                                onChange={(e) => setCreateForm({ ...createForm, cronExpression: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                            >
                                {CRON_PRESETS.map((preset) => (
                                    <option key={preset.value} value={preset.value}>
                                        {preset.label} ({preset.value})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                {describeCron(createForm.cronExpression)}
                            </p>
                        </div>
                        <div>
                            <label htmlFor="schedule-timezone" className="text-sm font-medium">Timezone</label>
                            <select
                                id="schedule-timezone"
                                value={createForm.timezone}
                                onChange={(e) => setCreateForm({ ...createForm, timezone: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                            >
                                {TIMEZONES.map((tz) => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="schedule-description" className="text-sm font-medium">Description</label>
                            <input
                                id="schedule-description"
                                type="text"
                                value={createForm.description}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                                placeholder="Optional description"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={createForm.enabled}
                                onChange={(e) => setCreateForm({ ...createForm, enabled: e.target.checked })}
                                className="rounded"
                            />
                            <span className="text-sm">Enable immediately</span>
                        </label>
                        <div className="flex items-center gap-2">
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
                </div>
            )}

            {/* Schedules list */}
            <div className="rounded-lg border bg-card overflow-hidden">
                {schedules.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No schedules configured</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {schedules.map((schedule) => (
                            <div key={schedule.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'p-2 rounded-lg',
                                            schedule.enabled ? 'bg-primary/10' : 'bg-muted'
                                        )}>
                                            {actionIcons[schedule.action]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{schedule.name}</p>
                                                <span className="px-2 py-0.5 text-xs bg-muted rounded">
                                                    {schedule.containerName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>{schedule.cronDescription || describeCron(schedule.cronExpression)}</span>
                                                {schedule.nextRunAt && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Next: {formatRelativeTime(schedule.nextRunAt)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'px-2 py-0.5 text-xs rounded-full',
                                            statusColors[schedule.status]
                                        )}>
                                            {schedule.status}
                                        </span>
                                        {schedule.lastRunStatus && (
                                            schedule.lastRunStatus === 'success' ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )
                                        )}
                                        <button
                                            onClick={() => void handleTrigger(schedule.id)}
                                            className="p-1 rounded hover:bg-muted"
                                            title="Run now"
                                        >
                                            <PlayCircle className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => void handleToggle(schedule.id, !schedule.enabled)}
                                            className="p-1 rounded hover:bg-muted"
                                            title={schedule.enabled ? 'Pause' : 'Resume'}
                                        >
                                            {schedule.enabled ? (
                                                <Pause className="h-4 w-4" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => void handleDelete(schedule.id)}
                                            className="p-1 rounded hover:bg-muted text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => void handleToggleExpand(schedule.id)}
                                            className="p-1 rounded hover:bg-muted"
                                        >
                                            {expandedSchedule === schedule.id ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded execution history */}
                                {expandedSchedule === schedule.id && (
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Execution History ({schedule.runCount} runs)
                                            </p>
                                        </div>
                                        {executions[schedule.id]?.length ? (
                                            <div className="space-y-2">
                                                {executions[schedule.id]?.map((ex) => (
                                                    <div
                                                        key={ex.id}
                                                        className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {ex.status === 'success' ? (
                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                            ) : ex.status === 'failed' ? (
                                                                <XCircle className="h-4 w-4 text-red-500" />
                                                            ) : (
                                                                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                                                            )}
                                                            <span>{ex.action}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            {ex.duration && (
                                                                <span>{(ex.duration / 1000).toFixed(1)}s</span>
                                                            )}
                                                            <span>{new Date(ex.startedAt).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                No executions yet
                                            </p>
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
