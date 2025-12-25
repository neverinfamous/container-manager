import { useMemo } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { MetricDataPoint } from '@/types/metrics'

interface MetricsChartProps {
    data: MetricDataPoint[]
    title: string
    color?: string
    unit?: string
    height?: number
    className?: string
    showGrid?: boolean
    showLegend?: boolean
    gradientId?: string
}

function formatTime(timestamp: string): string {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
}

export function MetricsChart({
    data,
    title,
    color = '#3b82f6',
    unit = '',
    height = 200,
    className,
    showGrid = true,
    showLegend = false,
    gradientId = 'chartGradient',
}: MetricsChartProps): React.ReactNode {
    const chartData = useMemo(() => {
        return data.map((point) => ({
            time: formatTime(point.timestamp),
            value: point.value,
            timestamp: point.timestamp,
        }))
    }, [data])

    const uniqueGradientId = `${gradientId}-${title.replace(/\s/g, '')}`

    return (
        <div className={cn('w-full', className)}>
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id={uniqueGradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            opacity={0.3}
                        />
                    )}
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                        tickFormatter={(value: number) => `${value}${unit}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)}${unit}`, title]}
                        labelFormatter={(label: string) => `Time: ${label}`}
                    />
                    {showLegend && <Legend />}
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#${uniqueGradientId})`}
                        animationDuration={300}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

// Multi-series chart
interface MultiSeriesChartProps {
    series: {
        name: string
        data: MetricDataPoint[]
        color: string
    }[]
    title: string
    unit?: string
    height?: number
    className?: string
}

export function MultiSeriesChart({
    series,
    title,
    unit = '',
    height = 250,
    className,
}: MultiSeriesChartProps): React.ReactNode {
    const chartData = useMemo(() => {
        const firstSeries = series[0]
        if (series.length === 0 || !firstSeries || firstSeries.data.length === 0) return []

        // Use first series timestamps as base
        return firstSeries.data.map((point, index) => {
            const entry: Record<string, string | number> = {
                time: formatTime(point.timestamp),
                timestamp: point.timestamp,
            }
            series.forEach((s) => {
                entry[s.name] = s.data[index]?.value ?? 0
            })
            return entry
        })
    }, [series])

    return (
        <div className={cn('w-full', className)}>
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                        {series.map((s) => (
                            <linearGradient
                                key={s.name}
                                id={`gradient-${s.name}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                    />
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                        tickFormatter={(value: number) => `${value}${unit}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => [`${value.toFixed(2)}${unit}`, name]}
                        labelFormatter={(label: string) => `Time: ${label}`}
                    />
                    <Legend />
                    {series.map((s) => (
                        <Area
                            key={s.name}
                            type="monotone"
                            dataKey={s.name}
                            stroke={s.color}
                            strokeWidth={2}
                            fill={`url(#gradient-${s.name})`}
                            animationDuration={300}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
