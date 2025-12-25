import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
    title: string
    value: string | number
    subtitle?: string
    trend?: number // percentage change
    icon?: React.ReactNode
    className?: string
    color?: 'default' | 'success' | 'warning' | 'danger'
}

const colorClasses = {
    default: 'border-border',
    success: 'border-green-500/50 bg-green-500/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    danger: 'border-red-500/50 bg-red-500/5',
}

export function MetricCard({
    title,
    value,
    subtitle,
    trend,
    icon,
    className,
    color = 'default',
}: MetricCardProps): React.ReactNode {
    const getTrendIcon = (): React.ReactNode => {
        if (trend === undefined || trend === 0) {
            return <Minus className="h-3 w-3 text-muted-foreground" />
        }
        if (trend > 0) {
            return <TrendingUp className="h-3 w-3 text-green-500" />
        }
        return <TrendingDown className="h-3 w-3 text-red-500" />
    }

    const getTrendColor = (): string => {
        if (trend === undefined || trend === 0) return 'text-muted-foreground'
        if (trend > 0) return 'text-green-500'
        return 'text-red-500'
    }

    return (
        <div
            className={cn(
                'p-4 rounded-lg border bg-card',
                colorClasses[color],
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                    )}
                </div>
                {icon !== undefined && (
                    <div className="p-2 rounded-lg bg-muted/50">
                        {icon}
                    </div>
                )}
            </div>
            {trend !== undefined && trend !== null && (
                <div className={cn('flex items-center gap-1 mt-2 text-xs', getTrendColor())}>
                    {getTrendIcon()}
                    <span>{Math.abs(trend).toFixed(1)}% from last period</span>
                </div>
            )}
        </div>
    )
}
