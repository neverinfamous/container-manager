/**
 * TemplateGalleryDialog - Modal showing pre-built container templates
 */

import { useState } from 'react'
import { X, Layout, Copy, Check } from 'lucide-react'
import { CONTAINER_TEMPLATES, type ContainerTemplate } from '@/data/templates'

interface TemplateGalleryDialogProps {
    isOpen: boolean
    onClose: () => void
    onSelectTemplate: (template: ContainerTemplate) => void
}

export function TemplateGalleryDialog({
    isOpen,
    onClose,
    onSelectTemplate,
}: TemplateGalleryDialogProps): React.ReactNode {
    const [selectedTemplate, setSelectedTemplate] = useState<ContainerTemplate | null>(null)
    const [copiedSection, setCopiedSection] = useState<string | null>(null)

    if (!isOpen) return null

    const handleCopy = async (text: string, section: string): Promise<void> => {
        await navigator.clipboard.writeText(text)
        setCopiedSection(section)
        setTimeout(() => setCopiedSection(null), 2000)
    }

    const handleUseTemplate = (): void => {
        if (selectedTemplate) {
            onSelectTemplate(selectedTemplate)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Layout className="w-5 h-5 text-purple-400" />
                        Container Templates
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Template Grid */}
                    <div className="w-1/2 p-4 overflow-auto border-r border-zinc-800">
                        <p className="text-sm text-zinc-400 mb-4">
                            Select a template to get started quickly
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {CONTAINER_TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`p-4 rounded-lg border text-left transition-all ${selectedTemplate?.id === template.id
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">{template.icon}</span>
                                        <span className="font-medium text-white">{template.name}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 line-clamp-2">
                                        {template.description}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                                        <span>Port: {template.defaultPort}</span>
                                        <span>•</span>
                                        <span>{template.instanceType}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="w-1/2 p-4 overflow-auto bg-zinc-950/50">
                        {selectedTemplate ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-medium flex items-center gap-2">
                                        <span className="text-xl">{selectedTemplate.icon}</span>
                                        {selectedTemplate.name}
                                    </h3>
                                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                                        {selectedTemplate.category}
                                    </span>
                                </div>

                                <p className="text-sm text-zinc-400">{selectedTemplate.description}</p>

                                {/* Config summary */}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-zinc-800/50 rounded p-2">
                                        <span className="text-zinc-500">Port</span>
                                        <p className="text-white">{selectedTemplate.defaultPort}</p>
                                    </div>
                                    <div className="bg-zinc-800/50 rounded p-2">
                                        <span className="text-zinc-500">Instance</span>
                                        <p className="text-white">{selectedTemplate.instanceType}</p>
                                    </div>
                                    <div className="bg-zinc-800/50 rounded p-2 col-span-2">
                                        <span className="text-zinc-500">Base Image</span>
                                        <p className="text-white font-mono text-xs">{selectedTemplate.baseImage}</p>
                                    </div>
                                </div>

                                {/* Dockerfile preview */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-zinc-400">Dockerfile</span>
                                        <button
                                            onClick={() => void handleCopy(selectedTemplate.dockerfile, 'dockerfile')}
                                            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                        >
                                            {copiedSection === 'dockerfile' ? (
                                                <>
                                                    <Check className="w-3 h-3 text-green-400" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3" />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 overflow-x-auto font-mono max-h-[200px] overflow-y-auto">
                                        {selectedTemplate.dockerfile}
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-500">
                                <p>Select a template to preview</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-zinc-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUseTemplate}
                        disabled={!selectedTemplate}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                    >
                        Use Template
                    </button>
                </div>
            </div>
        </div>
    )
}
