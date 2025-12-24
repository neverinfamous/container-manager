import { useState, useCallback } from 'react'
import { Plus, Trash2, AlertCircle, Network, Globe, Lock } from 'lucide-react'
import type { NetworkConfig, EgressRule } from '@/types/config'
import { cn } from '@/lib/utils'

interface NetworkConfigEditorProps {
    config: NetworkConfig
    onChange: (config: NetworkConfig) => void
    readOnly?: boolean
}

export function NetworkConfigEditor({
    config,
    onChange,
    readOnly = false,
}: NetworkConfigEditorProps): React.ReactNode {
    const [newHost, setNewHost] = useState('')
    const [ruleError, setRuleError] = useState<string | null>(null)

    const handleToggleEgress = useCallback((enabled: boolean): void => {
        onChange({ ...config, allowEgress: enabled })
    }, [config, onChange])

    const handleAddHost = useCallback((): void => {
        if (!newHost.trim()) return

        // Basic hostname validation
        const hostPattern = /^(\*\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/
        if (!hostPattern.test(newHost)) {
            setRuleError('Invalid hostname format. Use domain.com or *.domain.com')
            return
        }

        if (config.allowedHosts.includes(newHost)) {
            setRuleError('Host already in list')
            return
        }

        onChange({
            ...config,
            allowedHosts: [...config.allowedHosts, newHost],
        })
        setNewHost('')
        setRuleError(null)
    }, [config, newHost, onChange])

    const handleRemoveHost = useCallback((host: string): void => {
        onChange({
            ...config,
            allowedHosts: config.allowedHosts.filter((h) => h !== host),
        })
    }, [config, onChange])

    const handleAddRule = useCallback((): void => {
        const newRule: EgressRule = {
            id: crypto.randomUUID(),
            destination: '0.0.0.0/0',
            ports: '443',
            protocol: 'tcp',
            action: 'allow',
        }
        onChange({
            ...config,
            egressRules: [...config.egressRules, newRule],
        })
    }, [config, onChange])

    const handleUpdateRule = useCallback((id: string, updates: Partial<EgressRule>): void => {
        onChange({
            ...config,
            egressRules: config.egressRules.map((r) =>
                r.id === id ? { ...r, ...updates } : r
            ),
        })
    }, [config, onChange])

    const handleRemoveRule = useCallback((id: string): void => {
        onChange({
            ...config,
            egressRules: config.egressRules.filter((r) => r.id !== id),
        })
    }, [config, onChange])

    return (
        <div className="space-y-6">
            {/* Egress toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'p-2 rounded-full',
                        config.allowEgress ? 'bg-green-500/20' : 'bg-muted'
                    )}>
                        {config.allowEgress ? (
                            <Globe className="h-5 w-5 text-green-600" />
                        ) : (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                    </div>
                    <div>
                        <p className="font-medium">Outbound Traffic</p>
                        <p className="text-sm text-muted-foreground">
                            {config.allowEgress
                                ? 'Container can make outbound requests'
                                : 'Outbound requests are blocked'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => handleToggleEgress(!config.allowEgress)}
                    disabled={readOnly}
                    className={cn(
                        'relative w-12 h-6 rounded-full transition-colors',
                        config.allowEgress ? 'bg-green-500' : 'bg-muted',
                        readOnly && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        config.allowEgress ? 'translate-x-7' : 'translate-x-1'
                    )} />
                </button>
            </div>

            {/* Allowed hosts */}
            {config.allowEgress && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Allowed Hosts</h4>
                        <span className="text-xs text-muted-foreground">
                            Wildcard supported (*.example.com)
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {config.allowedHosts.map((host) => (
                            <div
                                key={host}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm"
                            >
                                <Network className="h-3 w-3" />
                                <span className="font-mono">{host}</span>
                                {!readOnly && (
                                    <button
                                        onClick={() => handleRemoveHost(host)}
                                        className="ml-1 p-0.5 rounded hover:bg-destructive/20 text-destructive"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {config.allowedHosts.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">
                                All hosts allowed (no restrictions)
                            </p>
                        )}
                    </div>

                    {!readOnly && (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newHost}
                                onChange={(e) => setNewHost(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddHost()}
                                placeholder="api.example.com"
                                className="flex-1 px-3 py-1.5 text-sm font-mono bg-background border rounded"
                            />
                            <button
                                onClick={handleAddHost}
                                disabled={!newHost.trim()}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Add Host
                            </button>
                        </div>
                    )}

                    {ruleError && (
                        <div className="flex items-center gap-1.5 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {ruleError}
                        </div>
                    )}
                </div>
            )}

            {/* Egress rules */}
            {config.allowEgress && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Egress Rules</h4>
                        {!readOnly && (
                            <button
                                onClick={handleAddRule}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <Plus className="h-3 w-3" />
                                Add Rule
                            </button>
                        )}
                    </div>

                    {config.egressRules.length > 0 ? (
                        <div className="space-y-2">
                            {config.egressRules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
                                >
                                    <select
                                        value={rule.action}
                                        onChange={(e) => handleUpdateRule(rule.id, { action: e.target.value as 'allow' | 'deny' })}
                                        disabled={readOnly}
                                        className={cn(
                                            'px-2 py-1 text-sm rounded border bg-background',
                                            rule.action === 'allow' ? 'text-green-600' : 'text-destructive'
                                        )}
                                    >
                                        <option value="allow">Allow</option>
                                        <option value="deny">Deny</option>
                                    </select>

                                    <input
                                        type="text"
                                        value={rule.destination}
                                        onChange={(e) => handleUpdateRule(rule.id, { destination: e.target.value })}
                                        disabled={readOnly}
                                        placeholder="0.0.0.0/0"
                                        className="flex-1 px-2 py-1 text-sm font-mono bg-background border rounded"
                                    />

                                    <input
                                        type="text"
                                        value={rule.ports}
                                        onChange={(e) => handleUpdateRule(rule.id, { ports: e.target.value })}
                                        disabled={readOnly}
                                        placeholder="443"
                                        className="w-20 px-2 py-1 text-sm font-mono bg-background border rounded"
                                    />

                                    <select
                                        value={rule.protocol}
                                        onChange={(e) => handleUpdateRule(rule.id, { protocol: e.target.value as 'tcp' | 'udp' | 'any' })}
                                        disabled={readOnly}
                                        className="px-2 py-1 text-sm rounded border bg-background"
                                    >
                                        <option value="tcp">TCP</option>
                                        <option value="udp">UDP</option>
                                        <option value="any">Any</option>
                                    </select>

                                    {!readOnly && (
                                        <button
                                            onClick={() => handleRemoveRule(rule.id)}
                                            className="p-1 rounded hover:bg-destructive/20 text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            No egress rules defined
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
