import { useState, useEffect, useCallback } from 'react'
import {
    RefreshCw,
    Plus,
    Trash2,
    Send,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
    Clock,
    Link2,
    Webhook,
    Power,
    PowerOff,
} from 'lucide-react'
import {
    fetchWebhooks,
    createWebhook,
    deleteWebhook,
    toggleWebhook,
    testWebhook,
    fetchWebhookDeliveries,
} from '@/services/webhooksApi'
import { cn } from '@/lib/utils'
import type {
    Webhook as WebhookType,
    WebhookDelivery,
    WebhookFormData,
    WebhookEvent,
    WebhookDeliveryStatus,
} from '@/types/webhooks'
import { WEBHOOK_EVENTS } from '@/types/webhooks'

const deliveryStatusIcons: Record<WebhookDeliveryStatus, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    delivered: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    retrying: <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />,
}

export function WebhooksPanel(): React.ReactNode {
    const [webhooks, setWebhooks] = useState<WebhookType[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null)
    const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({})
    const [formData, setFormData] = useState<WebhookFormData>({
        name: '',
        url: '',
        events: [],
        enabled: true,
    })

    const loadWebhooks = useCallback(async (skipCache: boolean): Promise<void> => {
        try {
            setLoading(true)
            const data = await fetchWebhooks(skipCache)
            setWebhooks(data.webhooks)
        } catch {
            // Silently fail
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadWebhooks(false)
    }, [loadWebhooks])

    const loadDeliveries = async (webhookId: string): Promise<void> => {
        try {
            const data = await fetchWebhookDeliveries(webhookId)
            setDeliveries((prev) => ({ ...prev, [webhookId]: data.deliveries }))
        } catch {
            // Silently fail
        }
    }

    const handleToggleExpand = async (webhookId: string): Promise<void> => {
        if (expandedWebhook === webhookId) {
            setExpandedWebhook(null)
        } else {
            setExpandedWebhook(webhookId)
            if (!deliveries[webhookId]) {
                await loadDeliveries(webhookId)
            }
        }
    }

    const handleCreate = async (): Promise<void> => {
        try {
            await createWebhook(formData)
            setFormData({ name: '', url: '', events: [], enabled: true })
            setShowForm(false)
            void loadWebhooks(true)
        } catch {
            // Silently fail
        }
    }

    const handleDelete = async (id: string): Promise<void> => {
        try {
            await deleteWebhook(id)
            void loadWebhooks(true)
        } catch {
            // Silently fail
        }
    }

    const handleToggle = async (id: string, enabled: boolean): Promise<void> => {
        try {
            await toggleWebhook(id, enabled)
            void loadWebhooks(true)
        } catch {
            // Silently fail
        }
    }

    const handleTest = async (id: string): Promise<void> => {
        try {
            await testWebhook(id)
            void loadWebhooks(true)
        } catch {
            // Silently fail
        }
    }

    const toggleEvent = (event: WebhookEvent): void => {
        const current = formData.events
        if (current.includes(event)) {
            setFormData({ ...formData, events: current.filter((e) => e !== event) })
        } else {
            setFormData({ ...formData, events: [...current, event] })
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
                    <p className="text-muted-foreground">
                        Configure event notifications
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Webhook
                    </button>
                    <button
                        onClick={() => void loadWebhooks(true)}
                        disabled={loading}
                        className="p-2 rounded hover:bg-muted transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="p-4 rounded-lg border bg-card space-y-4">
                    <h3 className="font-semibold">Create Webhook</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                                placeholder="My Webhook"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">URL</label>
                            <input
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded border bg-background"
                                placeholder="https://example.com/webhook"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Events</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {WEBHOOK_EVENTS.map((event) => (
                                <button
                                    key={event.value}
                                    onClick={() => toggleEvent(event.value)}
                                    className={cn(
                                        'px-3 py-1 text-sm rounded border transition-colors',
                                        formData.events.includes(event.value)
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'hover:bg-muted'
                                    )}
                                >
                                    {event.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-3 py-1.5 rounded hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => void handleCreate()}
                            disabled={!formData.name || !formData.url || formData.events.length === 0}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}

            {/* Webhooks list */}
            <div className="rounded-lg border bg-card overflow-hidden">
                {webhooks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No webhooks configured</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {webhooks.map((webhook) => (
                            <div key={webhook.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'p-2 rounded-lg',
                                            webhook.enabled ? 'bg-green-500/10' : 'bg-muted'
                                        )}>
                                            {webhook.enabled ? (
                                                <Power className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <PowerOff className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{webhook.name}</p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Link2 className="h-3 w-3" />
                                                <span className="truncate max-w-xs">{webhook.url}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            {webhook.events.slice(0, 2).map((event) => (
                                                <span
                                                    key={event}
                                                    className="px-2 py-0.5 text-xs bg-muted rounded"
                                                >
                                                    {event}
                                                </span>
                                            ))}
                                            {webhook.events.length > 2 && (
                                                <span className="text-xs text-muted-foreground">
                                                    +{webhook.events.length - 2}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => void handleToggle(webhook.id, !webhook.enabled)}
                                            className="p-1 rounded hover:bg-muted"
                                            title={webhook.enabled ? 'Disable' : 'Enable'}
                                        >
                                            {webhook.enabled ? (
                                                <Power className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <PowerOff className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => void handleTest(webhook.id)}
                                            className="p-1 rounded hover:bg-muted"
                                            title="Test"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => void handleDelete(webhook.id)}
                                            className="p-1 rounded hover:bg-muted text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => void handleToggleExpand(webhook.id)}
                                            className="p-1 rounded hover:bg-muted"
                                        >
                                            {expandedWebhook === webhook.id ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                {expandedWebhook === webhook.id && (
                                    <div className="mt-4 space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Recent Deliveries
                                        </p>
                                        {deliveries[webhook.id]?.length ? (
                                            <div className="space-y-2">
                                                {deliveries[webhook.id]?.map((d) => (
                                                    <div
                                                        key={d.id}
                                                        className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {deliveryStatusIcons[d.status]}
                                                            <span>{d.event}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            {d.responseStatus && (
                                                                <span className={cn(
                                                                    'px-1.5 py-0.5 rounded',
                                                                    d.responseStatus < 400
                                                                        ? 'bg-green-500/20'
                                                                        : 'bg-red-500/20'
                                                                )}>
                                                                    {d.responseStatus}
                                                                </span>
                                                            )}
                                                            <span>{new Date(d.lastAttemptAt).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                No deliveries yet
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
