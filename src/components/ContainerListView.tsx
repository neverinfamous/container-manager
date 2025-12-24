import { cn } from '@/lib/utils'
import type { Container, ContainerStatus } from '@/types/container'
import { RotateCcw, Square, Server, ArrowUpDown } from 'lucide-react'
import { useState } from 'react'

interface ContainerListViewProps {
    containers: Container[]
    onRestart: (container: Container) => void
    onStop: (container: Container) => void
    onViewInstances: (container: Container) => void
    onSelect?: (container: Container) => void
}

type SortKey = 'name' | 'status' | 'instances' | 'type'
type SortDirection = 'asc' | 'desc'

const statusColors: Record<ContainerStatus, string> = {
    running: 'bg-green-500',
    starting: 'bg-yellow-500 animate-pulse',
    stopping: 'bg-orange-500 animate-pulse',
    stopped: 'bg-gray-400',
    error: 'bg-red-500',
    unknown: 'bg-gray-400',
}

const statusLabels: Record<ContainerStatus, string> = {
    running: 'Running',
    starting: 'Starting',
    stopping: 'Stopping',
    stopped: 'Stopped',
    error: 'Error',
    unknown: 'Unknown',
}

interface SortButtonProps {
    column: SortKey
    label: string
    currentSortKey: SortKey
    onSort: (key: SortKey) => void
}

function SortButton({ column, label, currentSortKey, onSort }: SortButtonProps): React.ReactNode {
    return (
        <button
            onClick={() => onSort(column)}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
            {label}
            <ArrowUpDown
                className={cn(
                    'h-3 w-3',
                    currentSortKey === column ? 'text-foreground' : 'text-muted-foreground/50'
                )}
            />
        </button>
    )
}

export function ContainerListView({
    containers,
    onRestart,
    onStop,
    onViewInstances,
    onSelect,
}: ContainerListViewProps): React.ReactNode {
    const [sortKey, setSortKey] = useState<SortKey>('name')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

    const handleSort = (key: SortKey): void => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDirection('asc')
        }
    }

    const sortedContainers = [...containers].sort((a, b) => {
        let comparison = 0
        switch (sortKey) {
            case 'name':
                comparison = a.class.name.localeCompare(b.class.name)
                break
            case 'status':
                comparison = a.status.localeCompare(b.status)
                break
            case 'instances':
                comparison = a.instances.length - b.instances.length
                break
            case 'type':
                comparison = a.class.instanceType.localeCompare(b.class.instanceType)
                break
        }
        return sortDirection === 'asc' ? comparison : -comparison
    })

    return (
        <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
                <thead className="bg-muted/50">
                    <tr className="text-left text-sm text-muted-foreground">
                        <th className="px-4 py-3 font-medium">
                            <SortButton column="name" label="Name" currentSortKey={sortKey} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3 font-medium">
                            <SortButton column="status" label="Status" currentSortKey={sortKey} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3 font-medium">
                            <SortButton column="instances" label="Instances" currentSortKey={sortKey} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3 font-medium">
                            <SortButton column="type" label="Type" currentSortKey={sortKey} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3 font-medium">Image</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {sortedContainers.map((container) => (
                        <tr
                            key={container.class.name}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => onSelect?.(container)}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    {container.color && (
                                        <span
                                            className="h-3 w-3 rounded-full shrink-0"
                                            style={{ backgroundColor: container.color }}
                                        />
                                    )}
                                    <div>
                                        <p className="font-medium">{container.class.name}</p>
                                        <p className="text-xs text-muted-foreground">{container.class.className}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className="flex items-center gap-1.5 text-sm">
                                    <span className={cn('h-2 w-2 rounded-full', statusColors[container.status])} />
                                    {statusLabels[container.status]}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                                {container.instances.length}/{container.class.maxInstances}
                            </td>
                            <td className="px-4 py-3 text-sm">
                                {container.class.instanceType}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                                {container.class.image}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onViewInstances(container)
                                        }}
                                        className="p-1.5 rounded hover:bg-muted transition-colors"
                                        title="View instances"
                                    >
                                        <Server className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRestart(container)
                                        }}
                                        className="p-1.5 rounded hover:bg-muted transition-colors"
                                        title="Restart"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                    {container.status === 'running' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onStop(container)
                                            }}
                                            className="p-1.5 rounded hover:bg-muted transition-colors text-destructive"
                                            title="Stop"
                                        >
                                            <Square className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
