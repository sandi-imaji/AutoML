'use client'

import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  PauseCircle,
  AlertCircle,
  PlayCircle,
  RefreshCw,
  Package
} from "lucide-react"
import { cn } from '@/lib/utils'


const STATUS_CONFIG = {
  PENDING:     { label: 'Pending',    icon: Clock,       gradient: 'from-amber-500 to-yellow-500',   pulse: true },
  QUEUED:      { label: 'Queued',     icon: Clock,       gradient: 'from-blue-500 to-indigo-500' },
  VALIDATING:  { label: 'Validating', icon: Package,     gradient: 'from-purple-500 to-purple-600',  pulse: true },
  RUNNING_PULL:{ label: 'Pulling',    icon: Loader2,     gradient: 'from-cyan-500 to-blue-500',      spin: true },
  RUNNING_TRAIN:{label: 'Training',   icon: RefreshCw,   gradient: 'from-orange-500 to-red-500',     spin: true },
  RUNNING_COMPARE:{label: 'Comparing',icon: Loader2,     gradient: 'from-indigo-500 to-purple-500',  spin: true },
  SUCCESS_PULL:{ label: 'Data Ready', icon: CheckCircle2,gradient: 'from-emerald-500 to-teal-500' },
  SUCCESS_TRAIN:{label: 'Success',    icon: CheckCircle2,gradient: 'from-emerald-600 to-green-600',  bold: true },
  ERROR_PULL:  { label: 'Failed',     icon: XCircle,     gradient: 'from-red-500 to-rose-500' },
  ERROR_TRAIN: { label: 'Train Failed',icon: XCircle,    gradient: 'from-red-600 to-pink-600',       bold: true },
  IDLE:        { label: 'IDLE',       icon: PlayCircle,  gradient: 'from-gray-400 to-gray-600' },
  ACTIVE:      { label: 'Active',     icon: CheckCircle2,gradient: 'from-emerald-500 to-lime-500',   bold: true },
  PAUSED:      { label: 'Paused',     icon: PauseCircle, gradient: 'from-amber-600 to-orange-600' },
  CANCELLED:   { label: 'Cancelled',  icon: AlertCircle, gradient: 'from-gray-600 to-gray-800',      dim: true },
  // Worker task statuses
  ONLINE:      { label: 'Online',     icon: CheckCircle2,gradient: 'from-emerald-500 to-teal-500',   bold: true, pulse: true },
  STOPPED:     { label: 'Stopped',    icon: PauseCircle, gradient: 'from-gray-500 to-gray-600',      dim: true },
}

export function StatusBadgeSmall({ status, className }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    icon: AlertCircle,
    gradient: 'from-gray-500 to-gray-700'
  }
  const Icon = config.icon
  return (
    <Badge
      variant="default"
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full transition-all hover:scale-105",
        `bg-gradient-to-r ${config.gradient} text-white`,
        config.pulse && "animate-pulse",
        config.bold && "font-bold shadow-md",
        config.dim && "opacity-80",
        className
      )}
    >
      <Icon className={cn("h-3 w-3", config.spin && "animate-spin")} />
      <span>{config.label}</span>
    </Badge>
  )
}

export function StatusBadgeMedium({ status, className }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown Status',
    icon: AlertCircle,
    gradient: 'from-gray-500 to-gray-700'
  }

  const Icon = config.icon

  return (
    <Badge
      variant="default"
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full shadow-lg transition-all duration-300 hover:scale-110",
        `bg-gradient-to-r ${config.gradient} text-white`,
        config.pulse && "animate-pulse",
        config.bold && "font-extrabold shadow-xl",
        config.dim && "opacity-85",
        className
      )}
    >
      <Icon className={cn("h-5 w-5", config.spin && "animate-spin")} />
      <span className="tracking-wide">{config.label}</span>
    </Badge>
  )
}


// export function StatusBadge({ status, className }) {
//   const variants = {
//     PENDING: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold shadow-sm animate-pulse',
//       label: 'Pending',
//       icon: <Clock className="h-3.5 w-3.5 mr-1.5" />
//     },
//     QUEUED: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-sm',
//       label: 'Queued',
//       icon: <Clock className="h-3.5 w-3.5 mr-1.5" />
//     },
//     VALIDATING: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-sm animate-pulse',
//       label: 'Validating',
//       icon: <Package className="h-3.5 w-3.5 mr-1.5" />
//     },
//     RUNNING_PULL: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-sm animate-pulse',
//       label: 'Pulling',
//       icon: <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
//     },
//     RUNNING_TRAIN: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-sm animate-pulse',
//       label: 'Training',
//       icon: <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
//     },
//     RUNNING_COMPARE: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold shadow-sm animate-pulse',
//       label: 'Comparing',
//       icon: <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
//     },
//     SUCCESS_PULL: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-sm',
//       label: 'Data Ready',
//       icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
//     },
//     SUCCESS_TRAIN: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold shadow-md',
//       label: 'Success',
//       icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
//     },
//     ERROR_PULL: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold shadow-sm',
//       label: 'Failed',
//       icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />
//     },
//     ERROR_TRAIN: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold shadow-md',
//       label: 'Train Failed',
//       icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />
//     },
//     IDLE: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-gray-400 to-gray-600 hover:from-gray-500 hover:to-gray-700 text-white font-semibold shadow-sm',
//       label: 'Idle',
//       icon: <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
//     },
//     ACTIVE: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-white font-bold shadow-md',
//       label: 'Active',
//       icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
//     },
//     PAUSED: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-sm',
//       label: 'Paused',
//       icon: <PauseCircle className="h-3.5 w-3.5 mr-1.5" />
//     },
//     CANCELLED: {
//       variant: 'default',
//       className: 'bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white font-semibold shadow-sm opacity-90',
//       label: 'Cancelled',
//       icon: <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
//     }
//   }

//   const config = variants[status] || {
//     variant: 'default',
//     className: 'bg-gradient-to-r from-gray-500 to-gray-700 text-white font-medium shadow-sm',
//     label: status || 'Unknown',
//     icon: <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
//   }

//   return (
//     <Badge
//       variant={config.variant}
//       className={cn(config.className, 'flex items-center w-fit px-3 py-1 rounded-full transition-all duration-200 hover:scale-105', className)}
//     >
//       {config.icon}
//       {config.label}
//     </Badge>
//   )
// }
