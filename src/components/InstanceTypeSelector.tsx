import { Cpu, HardDrive, MemoryStick, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type InstanceType, INSTANCE_SPECS } from '@/types/container'

interface InstanceTypeSelectorProps {
    value: InstanceType
    onChange: (type: InstanceType) => void
    disabled?: boolean
}

const instanceTypes: InstanceType[] = [
    'lite',
    'basic',
    'standard-1',
    'standard-2',
    'standard-3',
    'standard-4',
]

const instanceDescriptions: Record<InstanceType, string> = {
    lite: 'Minimal workloads, quick startups',
    basic: 'Small services, lightweight APIs',
    'standard-1': 'General purpose applications',
    'standard-2': 'Memory-intensive workloads',
    'standard-3': 'CPU-intensive processing',
    'standard-4': 'High-performance applications',
}

export function InstanceTypeSelector({
    value,
    onChange,
    disabled = false,
}: InstanceTypeSelectorProps): React.ReactNode {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium">Instance Type</h3>

            <div className="grid gap-2">
                {instanceTypes.map((type) => {
                    const specs = INSTANCE_SPECS[type]
                    const isSelected = value === type

                    return (
                        <button
                            key={type}
                            onClick={() => onChange(type)}
                            disabled={disabled}
                            className={cn(
                                'flex items-center gap-4 p-3 rounded-lg border text-left transition-all',
                                isSelected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'hover:border-muted-foreground/50 hover:bg-muted/50',
                                disabled && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                                <Zap className={cn(
                                    'h-5 w-5',
                                    isSelected ? 'text-primary' : 'text-muted-foreground'
                                )} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium capitalize">
                                        {type.replace('-', ' ')}
                                    </span>
                                    {isSelected && (
                                        <span className="px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary">
                                            Selected
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {instanceDescriptions[type]}
                                </p>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1" title="vCPU">
                                    <Cpu className="h-4 w-4" />
                                    <span>{specs.vcpu}</span>
                                </div>
                                <div className="flex items-center gap-1" title="Memory">
                                    <MemoryStick className="h-4 w-4" />
                                    <span>{specs.memory}</span>
                                </div>
                                <div className="flex items-center gap-1" title="Disk">
                                    <HardDrive className="h-4 w-4" />
                                    <span>{specs.disk}</span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
