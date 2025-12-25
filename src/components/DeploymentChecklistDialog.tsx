/**
 * DeploymentChecklistDialog - Interactive checklist for deploying container-manager
 */

import { useState, useEffect } from 'react'
import { X, Rocket, Copy, Check, ChevronDown, ChevronRight, ExternalLink, Terminal } from 'lucide-react'
import { DEPLOYMENT_STEPS, type DeploymentStep } from '@/data/deploymentSteps'

interface DeploymentChecklistDialogProps {
    isOpen: boolean
    onClose: () => void
}

const STORAGE_KEY = 'container-manager-deployment-progress'

function loadProgress(): Record<string, boolean> {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved ? JSON.parse(saved) as Record<string, boolean> : {}
    } catch {
        return {}
    }
}

function saveProgress(progress: Record<string, boolean>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function DeploymentChecklistDialog({
    isOpen,
    onClose,
}: DeploymentChecklistDialogProps): React.ReactNode {
    const [progress, setProgress] = useState<Record<string, boolean>>(loadProgress)
    const [expandedStep, setExpandedStep] = useState<string | null>(null)
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

    useEffect(() => {
        saveProgress(progress)
    }, [progress])

    if (!isOpen) return null

    const completedCount = Object.values(progress).filter(Boolean).length
    const totalSteps = DEPLOYMENT_STEPS.length
    const progressPercent = Math.round((completedCount / totalSteps) * 100)

    const handleToggleComplete = (stepId: string): void => {
        setProgress((prev) => ({ ...prev, [stepId]: !prev[stepId] }))
    }

    const handleCopy = async (command: string): Promise<void> => {
        await navigator.clipboard.writeText(command)
        setCopiedCommand(command)
        setTimeout(() => setCopiedCommand(null), 2000)
    }

    const handleResetProgress = (): void => {
        setProgress({})
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-orange-400" />
                        Deployment Guide
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="px-4 py-3 border-b border-zinc-800">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-zinc-400">Progress</span>
                        <span className="text-zinc-300">{completedCount} of {totalSteps} steps</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Steps list */}
                <div className="flex-1 overflow-auto p-4 space-y-2">
                    {DEPLOYMENT_STEPS.map((step, index) => (
                        <StepItem
                            key={step.id}
                            step={step}
                            index={index}
                            isCompleted={!!progress[step.id]}
                            isExpanded={expandedStep === step.id}
                            copiedCommand={copiedCommand}
                            onToggleComplete={() => handleToggleComplete(step.id)}
                            onToggleExpand={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                            onCopy={handleCopy}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-4 border-t border-zinc-700">
                    <button
                        onClick={handleResetProgress}
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        Reset progress
                    </button>
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

interface StepItemProps {
    step: DeploymentStep
    index: number
    isCompleted: boolean
    isExpanded: boolean
    copiedCommand: string | null
    onToggleComplete: () => void
    onToggleExpand: () => void
    onCopy: (command: string) => Promise<void>
}

function StepItem({
    step,
    index,
    isCompleted,
    isExpanded,
    copiedCommand,
    onToggleComplete,
    onToggleExpand,
    onCopy,
}: StepItemProps): React.ReactNode {
    return (
        <div className={`border rounded-lg transition-colors ${isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-700'}`}>
            {/* Step header */}
            <div className="flex items-center gap-3 p-3">
                {/* Checkbox */}
                <button
                    onClick={onToggleComplete}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isCompleted
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-zinc-600 hover:border-zinc-500'
                        }`}
                >
                    {isCompleted && <Check className="w-4 h-4" />}
                </button>

                {/* Step info */}
                <button
                    onClick={onToggleExpand}
                    className="flex-1 flex items-center justify-between text-left"
                >
                    <div>
                        <span className="text-zinc-500 text-sm mr-2">{index + 1}.</span>
                        <span className={`font-medium ${isCompleted ? 'text-zinc-400 line-through' : 'text-white'}`}>
                            {step.title}
                        </span>
                        {step.platform === 'wsl2' && (
                            <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">WSL2</span>
                        )}
                    </div>
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0 ml-9 space-y-3">
                    <p className="text-sm text-zinc-400">{step.description}</p>

                    {/* Commands */}
                    {step.commands && step.commands.length > 0 && (
                        <div className="space-y-2">
                            {step.commands.map((cmd, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <Terminal className="w-4 h-4 text-zinc-500 mt-1.5 shrink-0" />
                                    <div className="flex-1">
                                        <span className="text-xs text-zinc-500">{cmd.label}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <code className="flex-1 text-sm bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-amber-300 font-mono overflow-x-auto whitespace-pre">
                                                {cmd.command}
                                            </code>
                                            <button
                                                onClick={() => void onCopy(cmd.command)}
                                                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors shrink-0"
                                                title="Copy command"
                                            >
                                                {copiedCommand === cmd.command ? (
                                                    <Check className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    {step.notes && step.notes.length > 0 && (
                        <ul className="text-sm text-zinc-500 space-y-1">
                            {step.notes.map((note, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-zinc-600">•</span>
                                    {note}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Links */}
                    {step.links && step.links.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {step.links.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                                >
                                    {link.label}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
