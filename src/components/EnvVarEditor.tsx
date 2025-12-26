import { useState, useCallback } from 'react'
import { Plus, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import type { EnvVar } from '@/types/config'
import { cn } from '@/lib/utils'

interface EnvVarEditorProps {
    envVars: EnvVar[]
    onChange: (envVars: EnvVar[]) => void
    readOnly?: boolean
}

export function EnvVarEditor({ envVars, onChange, readOnly = false }: EnvVarEditorProps): React.ReactNode {
    const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set())
    const [newKey, setNewKey] = useState('')
    const [newValue, setNewValue] = useState('')
    const [newIsSecret, setNewIsSecret] = useState(false)
    const [errors, setErrors] = useState<Map<string, string>>(new Map())

    const validateKey = useCallback((key: string): string | null => {
        if (!key) return 'Key is required'
        if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
            return 'Key must start with a letter or underscore and contain only letters, numbers, and underscores'
        }
        if (envVars.some((v) => v.key === key)) {
            return 'Key already exists'
        }
        return null
    }, [envVars])

    const handleAdd = useCallback((): void => {
        const error = validateKey(newKey)
        if (error) {
            setErrors((prev) => new Map(prev).set('new', error))
            return
        }

        onChange([
            ...envVars,
            { key: newKey, value: newValue, isSecret: newIsSecret, source: 'config' as const },
        ])
        setNewKey('')
        setNewValue('')
        setNewIsSecret(false)
        setErrors((prev) => {
            const next = new Map(prev)
            next.delete('new')
            return next
        })
    }, [envVars, newKey, newValue, newIsSecret, onChange, validateKey])

    const handleRemove = useCallback((key: string): void => {
        onChange(envVars.filter((v) => v.key !== key))
    }, [envVars, onChange])

    const handleUpdate = useCallback((key: string, updates: Partial<EnvVar>): void => {
        onChange(
            envVars.map((v) => (v.key === key ? { ...v, ...updates } : v))
        )
    }, [envVars, onChange])

    const toggleShowSecret = useCallback((key: string): void => {
        setShowSecrets((prev) => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }, [])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Environment Variables</h3>
                <span className="text-xs text-muted-foreground">
                    {envVars.length} variable{envVars.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Existing vars */}
            <div className="space-y-2">
                {envVars.map((envVar) => (
                    <div
                        key={envVar.key}
                        className={cn(
                            'flex items-center gap-2 p-2 rounded-md border bg-muted/30',
                            envVar.source !== 'config' && 'opacity-60'
                        )}
                    >
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={envVar.key}
                                disabled
                                className="px-2 py-1 text-sm font-mono bg-transparent border rounded"
                            />
                            <div className="flex items-center gap-1">
                                <input
                                    type={envVar.isSecret && !showSecrets.has(envVar.key) ? 'password' : 'text'}
                                    value={envVar.value}
                                    onChange={(e) => handleUpdate(envVar.key, { value: e.target.value })}
                                    disabled={readOnly || envVar.source !== 'config'}
                                    className="flex-1 px-2 py-1 text-sm font-mono bg-background border rounded"
                                />
                                {envVar.isSecret && (
                                    <button
                                        onClick={() => toggleShowSecret(envVar.key)}
                                        className="p-1 rounded hover:bg-muted"
                                        title={showSecrets.has(envVar.key) ? 'Hide' : 'Show'}
                                    >
                                        {showSecrets.has(envVar.key) ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {envVar.isSecret && (
                                <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600">
                                    secret
                                </span>
                            )}
                            {envVar.source !== 'config' && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600">
                                    {envVar.source}
                                </span>
                            )}
                        </div>

                        {!readOnly && envVar.source === 'config' && (
                            <button
                                onClick={() => handleRemove(envVar.key)}
                                className="p-1 rounded hover:bg-destructive/20 text-destructive"
                                title="Remove"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add new var */}
            {!readOnly && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <input
                            id="env-new-key"
                            type="text"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                            placeholder="KEY_NAME"
                            className="flex-1 px-2 py-1.5 text-sm font-mono bg-background border rounded"
                        />
                        <input
                            id="env-new-value"
                            type={newIsSecret ? 'password' : 'text'}
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="value"
                            className="flex-1 px-2 py-1.5 text-sm font-mono bg-background border rounded"
                        />
                        <label className="flex items-center gap-1.5 text-sm">
                            <input
                                type="checkbox"
                                checked={newIsSecret}
                                onChange={(e) => setNewIsSecret(e.target.checked)}
                                className="rounded"
                            />
                            Secret
                        </label>
                        <button
                            onClick={handleAdd}
                            disabled={!newKey}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            Add
                        </button>
                    </div>

                    {errors.has('new') && (
                        <div className="flex items-center gap-1.5 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {errors.get('new')}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
