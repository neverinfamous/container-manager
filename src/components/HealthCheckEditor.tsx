import { Activity, Clock, Heart, AlertTriangle } from 'lucide-react'
import type { HealthCheckConfig } from '@/types/config'
import { cn } from '@/lib/utils'

interface HealthCheckEditorProps {
    config: HealthCheckConfig
    onChange: (config: HealthCheckConfig) => void
    readOnly?: boolean
}

export function HealthCheckEditor({
    config,
    onChange,
    readOnly = false,
}: HealthCheckEditorProps): React.ReactNode {
    const handleToggle = (enabled: boolean): void => {
        onChange({ ...config, enabled })
    }

    const handleChange = <K extends keyof HealthCheckConfig>(
        field: K,
        value: HealthCheckConfig[K]
    ): void => {
        onChange({ ...config, [field]: value })
    }

    return (
        <div className="space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'p-2 rounded-full',
                        config.enabled ? 'bg-green-500/20' : 'bg-muted'
                    )}>
                        <Heart className={cn(
                            'h-5 w-5',
                            config.enabled ? 'text-green-600' : 'text-muted-foreground'
                        )} />
                    </div>
                    <div>
                        <p className="font-medium">Health Checks</p>
                        <p className="text-sm text-muted-foreground">
                            {config.enabled
                                ? 'Automatic health monitoring enabled'
                                : 'No health monitoring'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => handleToggle(!config.enabled)}
                    disabled={readOnly}
                    className={cn(
                        'relative w-12 h-6 rounded-full transition-colors',
                        config.enabled ? 'bg-green-500' : 'bg-muted',
                        readOnly && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        config.enabled ? 'translate-x-7' : 'translate-x-1'
                    )} />
                </button>
            </div>

            {/* Health check settings */}
            {config.enabled && (
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Endpoint */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Activity className="h-4 w-4" />
                            Health Endpoint
                        </label>
                        <input
                            type="text"
                            value={config.endpoint}
                            onChange={(e) => handleChange('endpoint', e.target.value)}
                            disabled={readOnly}
                            placeholder="/health"
                            className="w-full px-3 py-2 text-sm font-mono bg-background border rounded"
                        />
                        <p className="text-xs text-muted-foreground">
                            Path that returns 200 OK when healthy
                        </p>
                    </div>

                    {/* Interval */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            Check Interval
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={config.intervalSeconds}
                                onChange={(e) => handleChange('intervalSeconds', parseInt(e.target.value) || 30)}
                                disabled={readOnly}
                                min={5}
                                max={300}
                                className="w-20 px-3 py-2 text-sm bg-background border rounded"
                            />
                            <span className="text-sm text-muted-foreground">seconds</span>
                        </div>
                    </div>

                    {/* Timeout */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            Timeout
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={config.timeoutSeconds}
                                onChange={(e) => handleChange('timeoutSeconds', parseInt(e.target.value) || 5)}
                                disabled={readOnly}
                                min={1}
                                max={60}
                                className="w-20 px-3 py-2 text-sm bg-background border rounded"
                            />
                            <span className="text-sm text-muted-foreground">seconds</span>
                        </div>
                    </div>

                    {/* Thresholds */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Thresholds</label>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Failures:</span>
                                <input
                                    type="number"
                                    value={config.failureThreshold}
                                    onChange={(e) => handleChange('failureThreshold', parseInt(e.target.value) || 3)}
                                    disabled={readOnly}
                                    min={1}
                                    max={10}
                                    className="w-16 px-2 py-1 text-sm bg-background border rounded"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Successes:</span>
                                <input
                                    type="number"
                                    value={config.successThreshold}
                                    onChange={(e) => handleChange('successThreshold', parseInt(e.target.value) || 1)}
                                    disabled={readOnly}
                                    min={1}
                                    max={10}
                                    className="w-16 px-2 py-1 text-sm bg-background border rounded"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Failures to mark unhealthy, successes to mark healthy
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
