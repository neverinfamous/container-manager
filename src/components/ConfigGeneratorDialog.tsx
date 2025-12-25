/**
 * ConfigGeneratorDialog - Modal showing generated wrangler.toml and TypeScript class code
 */

import { useState } from 'react'
import { X, Copy, Check, Code, FileCode } from 'lucide-react'
import type { Container } from '@/types/container'

interface ConfigGeneratorDialogProps {
    isOpen: boolean
    onClose: () => void
    container: Container
}

function generateWranglerConfig(container: Container): string {
    const { name, className, image, maxInstances } = container.class

    return `# Add to your wrangler.toml

[[containers]]
class_name = "${className}"
image = "${image ?? `./containers/${name}/Dockerfile`}"
max_instances = ${maxInstances ?? 5}

[[durable_objects.bindings]]
name = "${className.toUpperCase().replace(/-/g, '_')}"
class_name = "${className}"

[[migrations]]
tag = "v1_${name.replace(/-/g, '_')}"
new_sqlite_classes = ["${className}"]`
}

function generateTypeScriptClass(container: Container): string {
    const { className, defaultPort, sleepAfter } = container.class

    const sleepLine = sleepAfter ? `\n    override sleepAfter = '${sleepAfter}'` : ''

    return `import { Container } from '@cloudflare/containers'

export class ${className} extends Container {
    override defaultPort = ${defaultPort ?? 8080}${sleepLine}
}

// Add to your Env interface:
// ${className.toUpperCase().replace(/-/g, '_')}: DurableObjectNamespace<${className}>`
}

function generateDockerfile(container: Container): string {
    const { defaultPort } = container.class
    const port = defaultPort ?? 8080

    return `# containers/${container.class.name}/Dockerfile
FROM node:20-alpine
WORKDIR /app

# Copy your application files
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE ${port}
CMD ["node", "server.js"]`
}

export function ConfigGeneratorDialog({
    isOpen,
    onClose,
    container,
}: ConfigGeneratorDialogProps): React.ReactNode {
    const [copiedSection, setCopiedSection] = useState<string | null>(null)

    if (!isOpen) return null

    const wranglerConfig = generateWranglerConfig(container)
    const tsClass = generateTypeScriptClass(container)
    const dockerfile = generateDockerfile(container)

    const handleCopy = async (text: string, section: string): Promise<void> => {
        await navigator.clipboard.writeText(text)
        setCopiedSection(section)
        setTimeout(() => setCopiedSection(null), 2000)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-700 sticky top-0 bg-zinc-900">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Code className="w-5 h-5 text-blue-400" />
                        Export Configuration: {container.class.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* wrangler.toml Section */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <FileCode className="w-4 h-4 text-orange-400" />
                                wrangler.toml
                            </h3>
                            <button
                                onClick={() => void handleCopy(wranglerConfig, 'wrangler')}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                            >
                                {copiedSection === 'wrangler' ? (
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
                        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono">
                            {wranglerConfig}
                        </pre>
                    </section>

                    {/* TypeScript Class Section */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <FileCode className="w-4 h-4 text-blue-400" />
                                Container Class (TypeScript)
                            </h3>
                            <button
                                onClick={() => void handleCopy(tsClass, 'typescript')}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                            >
                                {copiedSection === 'typescript' ? (
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
                        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono">
                            {tsClass}
                        </pre>
                    </section>

                    {/* Dockerfile Section */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                <FileCode className="w-4 h-4 text-cyan-400" />
                                Dockerfile (Template)
                            </h3>
                            <button
                                onClick={() => void handleCopy(dockerfile, 'dockerfile')}
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
                        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono">
                            {dockerfile}
                        </pre>
                    </section>

                    {/* Instructions */}
                    <section className="border-t border-zinc-800 pt-4">
                        <h3 className="text-sm font-medium text-zinc-300 mb-2">Quick Start</h3>
                        <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                            <li>Add the wrangler.toml snippet to your project</li>
                            <li>Create the Container class in your worker</li>
                            <li>Add the Dockerfile to <code className="text-zinc-300">containers/{container.class.name}/</code></li>
                            <li>Deploy with <code className="text-zinc-300">wrangler deploy</code> (from WSL2 on Windows)</li>
                        </ol>
                    </section>
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
