import { createContext, useEffect, useState, useMemo, type ReactNode, type Context } from 'react'

export type Theme = 'dark' | 'light' | 'system'

export interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'dark' | 'light'
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext: Context<ThemeContextType | undefined> = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): 'dark' | 'light' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getResolvedTheme(theme: Theme): 'dark' | 'light' {
    if (theme === 'system') return getSystemTheme()
    return theme
}

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'system'
        const stored = localStorage.getItem('theme') as Theme | null
        return stored ?? 'system'
    })

    const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => getSystemTheme())

    // Apply theme to DOM
    useEffect(() => {
        const root = window.document.documentElement
        const resolved = getResolvedTheme(theme)

        root.classList.remove('light', 'dark')
        root.classList.add(resolved)
        localStorage.setItem('theme', theme)
    }, [theme, systemTheme])

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = (): void => {
            setSystemTheme(getSystemTheme())
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    const resolvedTheme = useMemo(() => {
        if (theme === 'system') return systemTheme
        return theme
    }, [theme, systemTheme])

    const value = useMemo(() => ({
        theme,
        setTheme,
        resolvedTheme,
    }), [theme, resolvedTheme])

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}
