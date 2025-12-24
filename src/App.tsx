import { Container, Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './contexts/ThemeContext'

function App(): React.ReactNode {
    const { theme, setTheme, resolvedTheme } = useTheme()

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="flex items-center gap-2 font-semibold">
                        <Container className="h-6 w-6 text-primary" />
                        <span>Container Manager</span>
                    </div>

                    <nav className="ml-6 flex items-center gap-4 text-sm">
                        <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                            Containers
                        </a>
                        <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                            Topology
                        </a>
                        <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                            Metrics
                        </a>
                        <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                            Jobs
                        </a>
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
                <div className="flex flex-col gap-6">
                    {/* Hero section */}
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">Containers</h1>
                        <p className="text-muted-foreground">
                            Manage your Cloudflare Container instances
                        </p>
                    </div>

                    {/* Placeholder content */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="rounded-lg border bg-card p-6 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-primary/10 p-2">
                                        <Container className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Container {i}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {i === 1 ? 'Running' : i === 2 ? 'Stopped' : 'Starting'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>3 instances</span>
                                    <span>•</span>
                                    <span>standard-1</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Status indicator */}
                    <div className="rounded-lg border bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">
                            Theme: <span className="font-medium text-foreground">{theme}</span>
                            {theme === 'system' && (
                                <span className="ml-2">
                                    (resolved to <span className="font-medium text-foreground">{resolvedTheme}</span>)
                                </span>
                            )}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            🚧 Phase 1 Foundation Complete — Ready for Phase 2 implementation
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default App
