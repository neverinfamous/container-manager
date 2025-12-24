import { useState, useCallback } from 'react'
import { Send, Loader2, Copy, Check } from 'lucide-react'
import { sendHttpTest } from '@/services/logsApi'
import { cn } from '@/lib/utils'
import type { HttpTestRequest, HttpTestResponse } from '@/types/logs'

interface HttpTestClientProps {
    containerName: string
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const

export function HttpTestClient({ containerName }: HttpTestClientProps): React.ReactNode {
    const [request, setRequest] = useState<HttpTestRequest>({
        method: 'GET',
        path: '/',
        headers: {},
        timeout: 30000,
    })
    const [response, setResponse] = useState<HttpTestResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleSend = useCallback(async (): Promise<void> => {
        try {
            setLoading(true)
            setError(null)
            setResponse(null)
            const result = await sendHttpTest(containerName, request)
            setResponse(result)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed')
        } finally {
            setLoading(false)
        }
    }, [containerName, request])

    const handleCopy = useCallback(async (): Promise<void> => {
        if (!response) return
        await navigator.clipboard.writeText(response.body)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [response])

    const updateRequest = <K extends keyof HttpTestRequest>(
        field: K,
        value: HttpTestRequest[K]
    ): void => {
        setRequest((prev) => ({ ...prev, [field]: value }))
    }

    const hasBody = ['POST', 'PUT', 'PATCH'].includes(request.method)

    return (
        <div className="flex flex-col h-full">
            {/* Request builder */}
            <div className="p-4 border-b space-y-3">
                <div className="flex items-center gap-2">
                    {/* Method selector */}
                    <select
                        value={request.method}
                        onChange={(e) => updateRequest('method', e.target.value as HttpTestRequest['method'])}
                        className={cn(
                            'px-3 py-2 text-sm font-medium rounded border bg-background',
                            request.method === 'GET' && 'text-green-500',
                            request.method === 'POST' && 'text-yellow-500',
                            request.method === 'PUT' && 'text-blue-500',
                            request.method === 'PATCH' && 'text-purple-500',
                            request.method === 'DELETE' && 'text-red-500'
                        )}
                    >
                        {HTTP_METHODS.map((method) => (
                            <option key={method} value={method}>
                                {method}
                            </option>
                        ))}
                    </select>

                    {/* Path input */}
                    <input
                        type="text"
                        value={request.path}
                        onChange={(e) => updateRequest('path', e.target.value)}
                        placeholder="/api/endpoint"
                        className="flex-1 px-3 py-2 text-sm font-mono bg-background border rounded"
                    />

                    {/* Send button */}
                    <button
                        onClick={() => void handleSend()}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Send
                    </button>
                </div>

                {/* Request body (for POST/PUT/PATCH) */}
                {hasBody && (
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                            Request Body (JSON)
                        </label>
                        <textarea
                            value={request.body ?? ''}
                            onChange={(e) => {
                                const value = e.target.value
                                if (value) {
                                    setRequest((prev) => ({ ...prev, body: value }))
                                } else {
                                    setRequest((prev) => {
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                        const { body: _, ...rest } = prev
                                        return rest
                                    })
                                }
                            }}
                            placeholder='{"key": "value"}'
                            rows={4}
                            className="w-full px-3 py-2 text-sm font-mono bg-background border rounded resize-none"
                        />
                    </div>
                )}
            </div>

            {/* Response display */}
            <div className="flex-1 overflow-auto p-4">
                {error && (
                    <div className="p-4 rounded-lg border border-red-500/50 bg-red-500/10 text-red-500">
                        <p className="font-medium">Error</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                )}

                {response && (
                    <div className="space-y-3">
                        {/* Status line */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        'px-2 py-1 text-sm font-bold rounded',
                                        response.status >= 200 && response.status < 300 && 'bg-green-500/20 text-green-500',
                                        response.status >= 300 && response.status < 400 && 'bg-blue-500/20 text-blue-500',
                                        response.status >= 400 && response.status < 500 && 'bg-yellow-500/20 text-yellow-500',
                                        response.status >= 500 && 'bg-red-500/20 text-red-500'
                                    )}
                                >
                                    {response.status} {response.statusText}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {response.duration}ms
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {(response.size / 1024).toFixed(2)} KB
                                </span>
                            </div>

                            <button
                                onClick={() => void handleCopy()}
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3 w-3 text-green-500" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Headers */}
                        <details className="group">
                            <summary className="text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground">
                                Headers ({Object.keys(response.headers).length})
                            </summary>
                            <div className="mt-2 p-2 rounded bg-muted/30 font-mono text-xs space-y-1">
                                {Object.entries(response.headers).map(([key, value]) => (
                                    <div key={key}>
                                        <span className="text-blue-400">{key}:</span>{' '}
                                        <span className="text-gray-400">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </details>

                        {/* Body */}
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Response Body</p>
                            <pre className="p-3 rounded bg-[#1a1a2e] text-sm font-mono overflow-auto max-h-96 text-gray-300">
                                {response.body}
                            </pre>
                        </div>
                    </div>
                )}

                {!response && !error && !loading && (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Send a request to see the response
                    </div>
                )}
            </div>
        </div>
    )
}
