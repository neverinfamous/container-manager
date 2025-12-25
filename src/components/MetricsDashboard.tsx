import { useState, useEffect, useCallback } from 'react'
import {
    Cpu,
    MemoryStick,
    Activity,
    AlertCircle,
    RefreshCw,
    Server,
} from 'lucide-react'
import { MetricCard } from './MetricCard'
import { MetricsChart, MultiSeriesChart } from './MetricsChart'
import { fetchDashboardMetrics, formatPercent, formatNumber } from '@/services/metricsApi'
import { cn } from '@/lib/utils'
import type { DashboardMetricsResponse, MetricsTimeRange } from '@/types/metrics'

const TIME_RANGES: { value: MetricsTimeRange; label: string }[] = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
]

export function MetricsDashboard(): React.ReactNode {
    const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [range, setRange] = useState<MetricsTimeRange>('1h')

    const loadMetrics = useCallback(async (skipCache: boolean): Promise<void> => {
        try {
            setLoading(true)
            const data = await fetchDashboardMetrics(range, skipCache)
            setMetrics(data)
        } catch {
            // Silently fail - demo mode
        } finally {
            setLoading(false)
        }
    }, [range])

    useEffect(() => {
        void loadMetrics(false)
    }, [loadMetrics])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            void loadMetrics(true)
        }, 30000)
        return () => clearInterval(interval)
    }, [loadMetrics])

    if (!metrics && loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const agg = metrics?.aggregated

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Metrics Dashboard</h1>
                    <p className="text-muted-foreground">
                        Monitor container performance and resource usage
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Time range selector */}
                    <div className="flex items-center gap-1 rounded-lg border p-1">
                        {TIME_RANGES.map((tr) => (
                            <button
                                key={tr.value}
                                onClick={() => setRange(tr.value)}
                                className={cn(
                                    'px-3 py-1 text-sm rounded transition-colors',
                                    range === tr.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                )}
                            >
                                {tr.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => void loadMetrics(true)}
                        disabled={loading}
                        className="p-2 rounded hover:bg-muted transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Metric cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Containers"
                    value={agg?.totalContainers ?? 0}
                    icon={<Server className="h-4 w-4 text-blue-500" />}
                />
                <MetricCard
                    title="Running Instances"
                    value={agg?.runningInstances ?? 0}
                    icon={<Activity className="h-4 w-4 text-green-500" />}
                    color="success"
                />
                <MetricCard
                    title="CPU Usage"
                    value={formatPercent(agg?.cpuUsage ?? 0)}
                    subtitle="Average across containers"
                    icon={<Cpu className="h-4 w-4 text-yellow-500" />}
                    color={agg?.cpuUsage && agg.cpuUsage > 80 ? 'warning' : 'default'}
                />
                <MetricCard
                    title="Memory Usage"
                    value={formatPercent(agg?.memoryUsage ?? 0)}
                    subtitle="Average across containers"
                    icon={<MemoryStick className="h-4 w-4 text-purple-500" />}
                    color={agg?.memoryUsage && agg.memoryUsage > 80 ? 'warning' : 'default'}
                />
            </div>

            {/* Secondary metrics */}
            <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                    title="Requests / Minute"
                    value={formatNumber(agg?.requestsPerMinute ?? 0)}
                    icon={<Activity className="h-4 w-4 text-blue-500" />}
                />
                <MetricCard
                    title="Errors / Minute"
                    value={formatNumber(agg?.errorsPerMinute ?? 0)}
                    icon={<AlertCircle className="h-4 w-4 text-red-500" />}
                    color={agg?.errorsPerMinute && agg.errorsPerMinute > 0 ? 'danger' : 'default'}
                />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* CPU & Memory chart */}
                <div className="p-4 rounded-lg border bg-card">
                    <MultiSeriesChart
                        series={[
                            {
                                name: 'CPU',
                                data: metrics?.timeline.cpu ?? [],
                                color: '#eab308',
                            },
                            {
                                name: 'Memory',
                                data: metrics?.timeline.memory ?? [],
                                color: '#a855f7',
                            },
                        ]}
                        title="CPU & Memory Usage"
                        unit="%"
                        height={280}
                    />
                </div>

                {/* Requests chart */}
                <div className="p-4 rounded-lg border bg-card">
                    <MetricsChart
                        data={metrics?.timeline.requests ?? []}
                        title="Request Rate"
                        color="#3b82f6"
                        unit=" req/s"
                        height={280}
                    />
                </div>
            </div>

            {/* Top containers */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* By CPU */}
                <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Top by CPU</p>
                    <div className="space-y-2">
                        {metrics?.topContainers.byCpu.map((c, i) => (
                            <div key={c.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                                    <span className="text-sm font-medium truncate">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-500 rounded-full"
                                            style={{ width: `${c.value}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-10 text-right">
                                        {c.value.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Memory */}
                <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Top by Memory</p>
                    <div className="space-y-2">
                        {metrics?.topContainers.byMemory.map((c, i) => (
                            <div key={c.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                                    <span className="text-sm font-medium truncate">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500 rounded-full"
                                            style={{ width: `${c.value}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-10 text-right">
                                        {c.value.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Requests */}
                <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Top by Requests</p>
                    <div className="space-y-2">
                        {metrics?.topContainers.byRequests.map((c, i) => (
                            <div key={c.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                                    <span className="text-sm font-medium truncate">{c.name}</span>
                                </div>
                                <span className="text-xs font-medium">
                                    {formatNumber(c.value)} req/s
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
