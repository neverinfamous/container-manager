/**
 * Webhooks API service
 */

import { setCache, getCached } from '@/lib/cache'
import type {
    Webhook,
    WebhooksResponse,
    WebhookDeliveriesResponse,
    WebhookFormData,
} from '@/types/webhooks'

const API_BASE = '/api'

/**
 * Fetch all webhooks
 */
export async function fetchWebhooks(skipCache = false): Promise<WebhooksResponse> {
    const cacheKey = 'webhooks'

    if (!skipCache) {
        const cached = getCached(cacheKey) as WebhooksResponse | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(`${API_BASE}/webhooks`)

    if (!response.ok) {
        throw new Error(`Failed to fetch webhooks: ${response.statusText}`)
    }

    const data = await response.json() as WebhooksResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Create a new webhook
 */
export async function createWebhook(webhook: WebhookFormData): Promise<Webhook> {
    const response = await fetch(`${API_BASE}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhook),
    })

    if (!response.ok) {
        throw new Error(`Failed to create webhook: ${response.statusText}`)
    }

    return await response.json() as Webhook
}

/**
 * Update an existing webhook
 */
export async function updateWebhook(id: string, webhook: Partial<WebhookFormData>): Promise<Webhook> {
    const response = await fetch(`${API_BASE}/webhooks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhook),
    })

    if (!response.ok) {
        throw new Error(`Failed to update webhook: ${response.statusText}`)
    }

    return await response.json() as Webhook
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/webhooks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    })

    if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.statusText}`)
    }
}

/**
 * Toggle webhook enabled status
 */
export async function toggleWebhook(id: string, enabled: boolean): Promise<Webhook> {
    return updateWebhook(id, { enabled })
}

/**
 * Fetch webhook deliveries
 */
export async function fetchWebhookDeliveries(
    webhookId: string,
    skipCache = false
): Promise<WebhookDeliveriesResponse> {
    const cacheKey = `webhook-deliveries:${webhookId}`

    if (!skipCache) {
        const cached = getCached(cacheKey) as WebhookDeliveriesResponse | null
        if (cached) {
            return cached
        }
    }

    const response = await fetch(`${API_BASE}/webhooks/${encodeURIComponent(webhookId)}/deliveries`)

    if (!response.ok) {
        throw new Error(`Failed to fetch webhook deliveries: ${response.statusText}`)
    }

    const data = await response.json() as WebhookDeliveriesResponse

    setCache(cacheKey, data)

    return data
}

/**
 * Test a webhook by sending a test event
 */
export async function testWebhook(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/webhooks/${encodeURIComponent(id)}/test`, {
        method: 'POST',
    })

    if (!response.ok) {
        throw new Error(`Failed to test webhook: ${response.statusText}`)
    }
}
