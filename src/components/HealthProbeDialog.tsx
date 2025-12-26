/**
 * HealthProbeDialog - Configure and test container health probes
 */

import { useState, useCallback } from 'react'
import { X, Heart, RefreshCw, Check, AlertCircle, HelpCircle, Copy } from 'lucide-react'
import { checkContainerHealth, type HealthCheckResult, type HealthProbeConfig, DEFAULT_HEALTH_CONFIG } from '@/services/healthApi'

interface HealthProbeDialogProps {
    isOpen: boolean
    onClose: () => void
    containerName: string
    containerUrl?: string
}

export function HealthProbeDialog({
    isOpen,
    onClose,
    containerName,
    containerUrl,
}: HealthProbeDialogProps): React.ReactNode {
    const [config, setConfig] = useState<HealthProbeConfig>(DEFAULT_HEALTH_CONFIG)
    const [result, setResult] = useState<HealthCheckResult | null>(null)
    const [checking, setChecking] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCheckNow = useCallback(async (): Promise<void> => {
        setChecking(true)
        setResult(null)
        try {
            const healthResult = await checkContainerHealth(containerName, config, true)
            setResult(healthResult)
        } finally {
            setChecking(false)
        }
    }, [containerName, config])

    const handleCopyUrl = async (): Promise<void> => {
        if (containerUrl) {
            await navigator.clipboard.writeText(`${containerUrl}${config.path}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (!isOpen) return null

    const fullUrl = containerUrl ? `${containerUrl}${config.path}` : null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-400" />
                        Health Probe: {containerName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Container URL Info */}
                    {fullUrl ? (
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-zinc-400">Health Check URL</span>
                                <button
                                    onClick={() => void handleCopyUrl()}
                                    className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                                    title="Copy URL"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <code className="text-sm text-cyan-400 font-mono break-all">{fullUrl}</code>
                        </div>
                    ) : (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-200">
                                No container URL configured. Add an image URL in the container settings to enable health checks.
                            </p>
                        </div>
                    )}

                    {/* Configuration */}
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="health-path" className="block text-sm text-zinc-400 mb-1">Health Path</label>
                            <input
                                id="health-path"
                                type="text"
                                value={config.path}
                                onChange={(e) => setConfig({ ...config, path: e.target.value })}
                                placeholder="/health"
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="health-expected-status" className="block text-sm text-zinc-400 mb-1">Expected Status</label>
                                <input
                                    id="health-expected-status"
                                    type="number"
                                    value={config.expectedStatus}
                                    onChange={(e) => setConfig({ ...config, expectedStatus: parseInt(e.target.value) || 200 })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                />
                            </div>
                            <div>
                                <label htmlFor="health-timeout" className="block text-sm text-zinc-400 mb-1">Timeout (ms)</label>
                                <input
                                    id="health-timeout"
                                    type="number"
                                    value={config.timeoutMs}
                                    onChange={(e) => setConfig({ ...config, timeoutMs: parseInt(e.target.value) || 5000 })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Check Now Button */}
                    <button
                        onClick={() => void handleCheckNow()}
                        disabled={checking || !fullUrl}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                        {checking ? 'Checking...' : 'Check Now'}
                    </button>

                    {/* Result */}
                    {result && (
                        <div className={`border rounded-lg p-4 ${result.status === 'healthy'
                            ? 'bg-green-500/10 border-green-500/30'
                            : result.status === 'unhealthy'
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-zinc-800 border-zinc-700'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {result.status === 'healthy' ? (
                                    <Check className="w-5 h-5 text-green-400" />
                                ) : result.status === 'unhealthy' ? (
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                ) : (
                                    <HelpCircle className="w-5 h-5 text-zinc-400" />
                                )}
                                <span className={`font-medium ${result.status === 'healthy' ? 'text-green-400' :
                                    result.status === 'unhealthy' ? 'text-red-400' : 'text-zinc-400'
                                    }`}>
                                    {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-zinc-500">Status Code</span>
                                    <p className="text-white">{result.statusCode ?? 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-zinc-500">Latency</span>
                                    <p className="text-white">{result.latencyMs ? `${result.latencyMs}ms` : 'N/A'}</p>
                                </div>
                            </div>
                            {result.error && (
                                <p className="mt-2 text-sm text-red-400">{result.error}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 border-t border-zinc-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
