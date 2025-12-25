/**
 * ContainerEditDialog - Modal dialog for creating/editing container registrations
 */

import { useState, useEffect } from 'react'
import { X, Save, Plus } from 'lucide-react'
import {
    createContainer,
    updateContainer,
    type ContainerRegistration,
} from '@/services/containerApi'
import type { Container } from '@/types/container'
import type { ContainerTemplate } from '@/data/templates'

interface ContainerEditDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    container: Container | undefined // If provided, we're editing; otherwise creating
    template: ContainerTemplate | undefined // If provided, pre-fill from template
}

const INSTANCE_TYPES = [
    { value: 'basic', label: 'Basic (Free tier)' },
    { value: 'standard-1', label: 'Standard 1 (1 vCPU)' },
    { value: 'standard-2', label: 'Standard 2 (2 vCPU)' },
    { value: 'standard-4', label: 'Standard 4 (4 vCPU)' },
]

const STATUS_OPTIONS = [
    { value: 'running', label: 'Running' },
    { value: 'stopped', label: 'Stopped' },
    { value: 'starting', label: 'Starting' },
    { value: 'error', label: 'Error' },
]

export function ContainerEditDialog({
    isOpen,
    onClose,
    onSuccess,
    container,
    template,
}: ContainerEditDialogProps): React.ReactNode {
    const isEditing = !!container

    // Form state
    const [name, setName] = useState('')
    const [className, setClassName] = useState('')
    const [workerName, setWorkerName] = useState('')
    const [image, setImage] = useState('')
    const [instanceType, setInstanceType] = useState('standard-1')
    const [maxInstances, setMaxInstances] = useState(5)
    const [defaultPort, setDefaultPort] = useState(8080)
    const [sleepAfter, setSleepAfter] = useState('')
    const [status, setStatus] = useState('stopped')

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Populate form when editing or from template
    useEffect(() => {
        if (container) {
            setName(container.class.name)
            setClassName(container.class.className)
            setWorkerName(container.class.workerName ?? '')
            setImage(container.class.image ?? '')
            setInstanceType(container.class.instanceType ?? 'standard-1')
            setMaxInstances(container.class.maxInstances ?? 5)
            setDefaultPort(container.class.defaultPort ?? 8080)
            setSleepAfter(container.class.sleepAfter ?? '')
            setStatus(container.status ?? 'stopped')
        } else if (template) {
            // Pre-fill from template
            setName('')
            setClassName(template.name.replace(/[\s.]+/g, ''))
            setWorkerName('')
            setImage(`./containers/my-${template.id}/Dockerfile`)
            setInstanceType(template.instanceType)
            setMaxInstances(5)
            setDefaultPort(template.defaultPort)
            setSleepAfter(template.sleepAfter)
            setStatus('stopped')
        } else {
            // Reset form for new container
            setName('')
            setClassName('')
            setWorkerName('')
            setImage('')
            setInstanceType('standard-1')
            setMaxInstances(5)
            setDefaultPort(8080)
            setSleepAfter('')
            setStatus('stopped')
        }
        setError(null)
    }, [container, template, isOpen])

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)

        try {
            const data: ContainerRegistration = {
                name: undefined, // Set on create only
                className,
                workerName: workerName || undefined,
                image: image || undefined,
                instanceType,
                maxInstances,
                defaultPort,
                sleepAfter: sleepAfter || undefined,
                status,
            }

            if (isEditing) {
                await updateContainer(container.class.name, data)
            } else {
                if (!name.trim()) {
                    setError('Container name is required')
                    setIsSubmitting(false)
                    return
                }
                await createContainer({ ...data, name: name.trim() })
            }

            onSuccess()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save container')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <Save className="w-5 h-5 text-blue-400" />
                                Edit Container
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 text-green-400" />
                                Register Container
                            </>
                        )}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Name (only for create) */}
                    {!isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">
                                Container Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="my-container"
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                                required
                            />
                            <p className="mt-1 text-xs text-zinc-500">
                                Unique identifier for this container registration
                            </p>
                        </div>
                    )}

                    {/* Class Name */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Class Name *
                        </label>
                        <input
                            type="text"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            placeholder="MyContainer"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                            required
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                            The class name that extends Container in your worker
                        </p>
                    </div>

                    {/* Worker Name */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Worker Name
                        </label>
                        <input
                            type="text"
                            value={workerName}
                            onChange={(e) => setWorkerName(e.target.value)}
                            placeholder="my-worker"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Image */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Dockerfile Path / Image
                        </label>
                        <input
                            type="text"
                            value={image}
                            onChange={(e) => setImage(e.target.value)}
                            placeholder="./containers/my-app/Dockerfile"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Two column layout */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Instance Type */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">
                                Instance Type
                            </label>
                            <select
                                value={instanceType}
                                onChange={(e) => setInstanceType(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                {INSTANCE_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Max Instances */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">
                                Max Instances
                            </label>
                            <input
                                type="number"
                                value={maxInstances}
                                onChange={(e) => setMaxInstances(parseInt(e.target.value) || 1)}
                                min={1}
                                max={100}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Default Port */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">
                                Default Port
                            </label>
                            <input
                                type="number"
                                value={defaultPort}
                                onChange={(e) => setDefaultPort(parseInt(e.target.value) || 8080)}
                                min={1}
                                max={65535}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Sleep After */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Sleep After (e.g., "5m", "1h")
                        </label>
                        <input
                            type="text"
                            value={sleepAfter}
                            onChange={(e) => setSleepAfter(e.target.value)}
                            placeholder="5m"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                            How long container waits before sleeping when idle
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !className.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : isEditing ? (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Container
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
