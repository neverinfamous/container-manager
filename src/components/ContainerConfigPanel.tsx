import { useState, useEffect, useCallback } from 'react'
import {
    X,
    RefreshCw,
    Save,
    Settings,
    Variable,
    Network,
    Heart,
    Moon,
    Server,
    AlertCircle,
    CheckCircle,
} from 'lucide-react'
import { EnvVarEditor } from './EnvVarEditor'
import { InstanceTypeSelector } from './InstanceTypeSelector'
import { NetworkConfigEditor } from './NetworkConfigEditor'
import { HealthCheckEditor } from './HealthCheckEditor'
import { getConfiguration, updateConfiguration } from '@/services/configApi'
import { cn } from '@/lib/utils'
import type { Container, InstanceType } from '@/types/container'
import type { ContainerConfiguration, EnvVar, NetworkConfig, HealthCheckConfig, SleepConfig } from '@/types/config'

interface ContainerConfigPanelProps {
    container: Container
    onClose: () => void
    onSaved?: () => void
}

type ConfigTab = 'general' | 'env' | 'network' | 'health' | 'sleep'

const defaultConfig: ContainerConfiguration = {
    name: '',
    className: '',
    image: '',
    instanceType: 'standard-1',
    maxInstances: 5,
    envVars: [],
    ports: [{ containerPort: 8080, protocol: 'tcp', isDefault: true }],
    network: {
        allowEgress: true,
        egressRules: [],
        allowedHosts: [],
    },
    healthCheck: {
        enabled: false,
        endpoint: '/health',
        intervalSeconds: 30,
        timeoutSeconds: 5,
        failureThreshold: 3,
        successThreshold: 1,
    },
    sleep: {
        enabled: true,
        sleepAfter: '5m',
        wakeOnRequest: true,
    },
    updatedAt: new Date().toISOString(),
}

export function ContainerConfigPanel({
    container,
    onClose,
    onSaved,
}: ContainerConfigPanelProps): React.ReactNode {
    const [config, setConfig] = useState<ContainerConfiguration>({
        ...defaultConfig,
        name: container.class.name,
        className: container.class.className,
        image: container.class.image,
        instanceType: container.class.instanceType,
        maxInstances: container.class.maxInstances,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<ConfigTab>('general')
    const [hasChanges, setHasChanges] = useState(false)

    const fetchConfig = useCallback(async (): Promise<void> => {
        try {
            setLoading(true)
            const data = await getConfiguration(container.class.name)
            setConfig(data)
            setError(null)
        } catch {
            // Use default config if API not available (demo mode)
            setConfig({
                ...defaultConfig,
                name: container.class.name,
                className: container.class.className,
                image: container.class.image,
                instanceType: container.class.instanceType,
                maxInstances: container.class.maxInstances,
            })
        } finally {
            setLoading(false)
        }
    }, [container])

    useEffect(() => {
        void fetchConfig()
    }, [fetchConfig])

    const handleSave = async (): Promise<void> => {
        try {
            setSaving(true)
            setError(null)
            await updateConfiguration(container.class.name, {
                envVars: config.envVars,
                instanceType: config.instanceType,
                maxInstances: config.maxInstances,
                network: config.network,
                healthCheck: config.healthCheck,
                sleep: config.sleep,
            })
            setSuccess('Configuration saved successfully')
            setHasChanges(false)
            onSaved?.()
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save configuration')
        } finally {
            setSaving(false)
        }
    }

    const updateConfig = <K extends keyof ContainerConfiguration>(
        field: K,
        value: ContainerConfiguration[K]
    ): void => {
        setConfig((prev) => ({ ...prev, [field]: value }))
        setHasChanges(true)
    }

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const tabs: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
        { id: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
        { id: 'env', label: 'Environment', icon: <Variable className="h-4 w-4" /> },
        { id: 'network', label: 'Network', icon: <Network className="h-4 w-4" /> },
        { id: 'health', label: 'Health', icon: <Heart className="h-4 w-4" /> },
        { id: 'sleep', label: 'Sleep', icon: <Moon className="h-4 w-4" /> },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-background rounded-lg shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">Container Configuration</h2>
                        <p className="text-sm text-muted-foreground">{container.class.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => void fetchConfig()}
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
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    {/* Instance type */}
                                    <InstanceTypeSelector
                                        value={config.instanceType}
                                        onChange={(type: InstanceType) => updateConfig('instanceType', type)}
                                    />

                                    {/* Max instances */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium">
                                            <Server className="h-4 w-4" />
                                            Maximum Instances
                                        </label>
                                        <input
                                            type="number"
                                            value={config.maxInstances}
                                            onChange={(e) => updateConfig('maxInstances', parseInt(e.target.value) || 1)}
                                            min={1}
                                            max={100}
                                            className="w-24 px-3 py-2 text-sm bg-background border rounded"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Maximum concurrent container instances
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'env' && (
                                <EnvVarEditor
                                    envVars={config.envVars}
                                    onChange={(envVars: EnvVar[]) => updateConfig('envVars', envVars)}
                                />
                            )}

                            {activeTab === 'network' && (
                                <NetworkConfigEditor
                                    config={config.network}
                                    onChange={(network: NetworkConfig) => updateConfig('network', network)}
                                />
                            )}

                            {activeTab === 'health' && (
                                <HealthCheckEditor
                                    config={config.healthCheck}
                                    onChange={(healthCheck: HealthCheckConfig) => updateConfig('healthCheck', healthCheck)}
                                />
                            )}

                            {activeTab === 'sleep' && (
                                <div className="space-y-4">
                                    {/* Sleep toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'p-2 rounded-full',
                                                config.sleep.enabled ? 'bg-blue-500/20' : 'bg-muted'
                                            )}>
                                                <Moon className={cn(
                                                    'h-5 w-5',
                                                    config.sleep.enabled ? 'text-blue-600' : 'text-muted-foreground'
                                                )} />
                                            </div>
                                            <div>
                                                <p className="font-medium">Sleep Mode</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {config.sleep.enabled
                                                        ? 'Container will sleep after inactivity'
                                                        : 'Container runs continuously'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateConfig('sleep', { ...config.sleep, enabled: !config.sleep.enabled })}
                                            className={cn(
                                                'relative w-12 h-6 rounded-full transition-colors',
                                                config.sleep.enabled ? 'bg-blue-500' : 'bg-muted'
                                            )}
                                        >
                                            <span className={cn(
                                                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                                                config.sleep.enabled ? 'translate-x-7' : 'translate-x-1'
                                            )} />
                                        </button>
                                    </div>

                                    {config.sleep.enabled && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Sleep After</label>
                                                <select
                                                    value={config.sleep.sleepAfter}
                                                    onChange={(e) => updateConfig('sleep', { ...config.sleep, sleepAfter: e.target.value } as SleepConfig)}
                                                    className="w-full px-3 py-2 text-sm bg-background border rounded"
                                                >
                                                    <option value="30s">30 seconds</option>
                                                    <option value="1m">1 minute</option>
                                                    <option value="5m">5 minutes</option>
                                                    <option value="10m">10 minutes</option>
                                                    <option value="30m">30 minutes</option>
                                                    <option value="1h">1 hour</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                                <input
                                                    type="checkbox"
                                                    checked={config.sleep.wakeOnRequest}
                                                    onChange={(e) => updateConfig('sleep', { ...config.sleep, wakeOnRequest: e.target.checked } as SleepConfig)}
                                                    className="rounded"
                                                    id="wakeOnRequest"
                                                />
                                                <label htmlFor="wakeOnRequest" className="text-sm">
                                                    Wake on incoming request
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-4">
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive mb-3">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                            <CheckCircle className="h-4 w-4" />
                            {success}
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={() => void handleSave()}
                            disabled={saving || !hasChanges}
                            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
