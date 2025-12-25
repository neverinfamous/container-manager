/**
 * Webhook types for event notifications
 */

/**
 * Webhook event type
 */
export type WebhookEvent =
    | 'container.started'
    | 'container.stopped'
    | 'container.error'
    | 'container.scaled'
    | 'job.started'
    | 'job.completed'
    | 'job.failed'

/**
 * Webhook delivery status
 */
export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying'

/**
 * Webhook definition
 */
export interface Webhook {
    id: string
    name: string
    url: string
    events: WebhookEvent[]
    enabled: boolean
    secret?: string
    headers?: Record<string, string>
    createdAt: string
    updatedAt: string
}

/**
 * Webhook delivery record
 */
export interface WebhookDelivery {
    id: string
    webhookId: string
    event: WebhookEvent
    status: WebhookDeliveryStatus
    requestBody: string
    responseStatus?: number
    responseBody?: string
    attemptCount: number
    lastAttemptAt: string
    nextRetryAt?: string
    error?: string
    duration?: number
}

/**
 * Webhook form data
 */
export interface WebhookFormData {
    name: string
    url: string
    events: WebhookEvent[]
    enabled: boolean
    secret?: string
    headers?: Record<string, string>
}

/**
 * Webhooks response
 */
export interface WebhooksResponse {
    webhooks: Webhook[]
    total: number
}

/**
 * Webhook deliveries response
 */
export interface WebhookDeliveriesResponse {
    deliveries: WebhookDelivery[]
    total: number
}

/**
 * Available webhook events for UI
 */
export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; category: string }[] = [
    { value: 'container.started', label: 'Container Started', category: 'Container' },
    { value: 'container.stopped', label: 'Container Stopped', category: 'Container' },
    { value: 'container.error', label: 'Container Error', category: 'Container' },
    { value: 'container.scaled', label: 'Container Scaled', category: 'Container' },
    { value: 'job.started', label: 'Job Started', category: 'Job' },
    { value: 'job.completed', label: 'Job Completed', category: 'Job' },
    { value: 'job.failed', label: 'Job Failed', category: 'Job' },
]
