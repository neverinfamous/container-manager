import { Container, Moon, Sun, Monitor, BarChart3, GitBranch, Clock } from 'lucide-react'
import { useTheme } from './hooks/useTheme'
import { ContainerGrid } from './components/ContainerGrid'
import { useState } from 'react'

type Page = 'containers' | 'topology' | 'metrics' | 'jobs'

function App(): React.ReactNode {
    const { theme, setTheme } = useTheme()
    const [currentPage, setCurrentPage] = useState<Page>('containers')

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="flex items-center gap-2 font-semibold">
                        <Container className="h-6 w-6 text-primary" />
                        <span>Container Manager</span>
                    </div>

                    <nav className="ml-6 flex items-center gap-1 text-sm">
                        <button
                            onClick={() => setCurrentPage('containers')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${currentPage === 'containers'
                                ? 'bg-muted text-foreground'
                                : 'text-foreground/60 hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <Container className="h-4 w-4" />
                            Containers
                        </button>
                        <button
                            onClick={() => setCurrentPage('topology')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${currentPage === 'topology'
                                ? 'bg-muted text-foreground'
                                : 'text-foreground/60 hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <GitBranch className="h-4 w-4" />
                            Topology
                        </button>
                        <button
                            onClick={() => setCurrentPage('metrics')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${currentPage === 'metrics'
                                ? 'bg-muted text-foreground'
                                : 'text-foreground/60 hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <BarChart3 className="h-4 w-4" />
                            Metrics
                        </button>
                        <button
                            onClick={() => setCurrentPage('jobs')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${currentPage === 'jobs'
                                ? 'bg-muted text-foreground'
                                : 'text-foreground/60 hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <Clock className="h-4 w-4" />
                            Jobs
                        </button>
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        {/* Theme toggle */}
                        <div className="flex items-center gap-1 rounded-md border p-1">
                            <button
                                onClick={() => setTheme('light')}
                                className={`rounded p-1.5 ${theme === 'light' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                                title="Light mode"
                            >
                                <Sun className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`rounded p-1.5 ${theme === 'dark' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                                title="Dark mode"
                            >
                                <Moon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setTheme('system')}
                                className={`rounded p-1.5 ${theme === 'system' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                                title="System theme"
                            >
                                <Monitor className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="container py-6">
                {currentPage === 'containers' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">Containers</h1>
                            <p className="text-muted-foreground">
                                Manage your Cloudflare Container instances
                            </p>
                        </div>
                        <ContainerGrid />
                    </div>
                )}

                {currentPage === 'topology' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">Topology</h1>
                            <p className="text-muted-foreground">
                                Visualize container dependencies and bindings
                            </p>
                        </div>
                        <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
                            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Topology visualization coming in Phase 5</p>
                        </div>
                    </div>
                )}

                {currentPage === 'metrics' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
                            <p className="text-muted-foreground">
                                Monitor container performance and resource usage
                            </p>
                        </div>
                        <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
                            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Metrics dashboard coming in Phase 8</p>
                        </div>
                    </div>
                )}

                {currentPage === 'jobs' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">Job History</h1>
                            <p className="text-muted-foreground">
                                View operation history and audit log
                            </p>
                        </div>
                        <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Job history coming in Phase 11</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default App
