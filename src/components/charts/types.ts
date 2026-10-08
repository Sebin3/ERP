import type { ReactNode } from 'react'
import type { ChartStatus } from './ChartFrame'

export interface ChartBaseProps {
  status?: ChartStatus
  errorMessage?: string
  emptyMessage?: string
  className?: string
}

export interface ChartDatum {
  label: string
  value: number
  detail?: string
}

export interface SeriesDatum extends ChartDatum {
  previous?: number | null
  secondary?: number
}

export interface ChartTooltipRow {
  label: string
  value: string
  color: 'accent' | 'soft' | 'success' | 'warning' | 'danger' | 'neutral'
}

export interface ChartTooltipProps {
  title: string
  rows: readonly ChartTooltipRow[]
  footer?: ReactNode
}
