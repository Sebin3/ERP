export interface ChartPoint {
  x: number
  y: number
}

export interface DonutSegment {
  index: number
  value: number
  percentage: number
  startAngle: number
  endAngle: number
}

export function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

export function linearScale(value: number, domain: readonly [number, number], range: readonly [number, number]): number {
  const [domainStart, domainEnd] = domain
  const [rangeStart, rangeEnd] = range
  if (domainStart === domainEnd) return (rangeStart + rangeEnd) / 2
  return rangeStart + ((value - domainStart) / (domainEnd - domainStart)) * (rangeEnd - rangeStart)
}

export function niceTicks(maximum: number, count = 4): number[] {
  if (!Number.isFinite(maximum) || maximum <= 0) return Array.from({ length: count + 1 }, () => 0)
  const roughStep = maximum / Math.max(1, count)
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalized = roughStep / magnitude
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = factor * magnitude
  return Array.from({ length: count + 1 }, (_, index) => index * step)
}

export function formatCompactSoles(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  const absolute = Math.abs(safeValue)
  if (absolute >= 1_000_000) return `S/ ${(safeValue / 1_000_000).toFixed(1)}M`
  if (absolute >= 1_000) return `S/ ${(safeValue / 1_000).toFixed(1)}k`
  return `S/ ${safeValue.toFixed(0)}`
}

export function formatCompactPercent(value: number): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`
}

function tangent(previous: ChartPoint, current: ChartPoint, next: ChartPoint): number {
  const left = current.x - previous.x
  const right = next.x - current.x
  if (left === 0 || right === 0) return 0
  const slopeLeft = (current.y - previous.y) / left
  const slopeRight = (next.y - current.y) / right
  if (slopeLeft * slopeRight <= 0) return 0
  return (slopeLeft * right + slopeRight * left) / (left + right)
}

export function monotoneCubicPath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  const tangents = points.map((point, index) => {
    if (index === 0) return (points[1].y - point.y) / (points[1].x - point.x || 1)
    if (index === points.length - 1) return (point.y - points[index - 1].y) / (point.x - points[index - 1].x || 1)
    return tangent(points[index - 1], point, points[index + 1])
  })
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const distance = (next.x - current.x) / 3
    path += ` C ${current.x + distance} ${current.y + tangents[index] * distance}, ${next.x - distance} ${next.y - tangents[index + 1] * distance}, ${next.x} ${next.y}`
  }
  return path
}

export function donutSegments(values: readonly number[]): DonutSegment[] {
  const positive = values.map((value) => Math.max(0, Number.isFinite(value) ? value : 0))
  const total = positive.reduce((sum, value) => sum + value, 0)
  if (total === 0) return []
  const lastPositiveIndex = positive.reduce((last, value, index) => value > 0 ? index : last, -1)
  let angle = -90
  let percentageAcumulado = 0
  return positive.flatMap((value, index) => {
    if (value === 0) return []
    const percentage = index === lastPositiveIndex
      ? Number((100 - percentageAcumulado).toFixed(2))
      : Number(((value / total) * 100).toFixed(2))
    const startAngle = angle
    const endAngle = angle + (value / total) * 360
    angle = endAngle
    percentageAcumulado += percentage
    return [{ index, value, percentage, startAngle, endAngle }]
  })
}

export function polarToCartesian(center: number, radius: number, angle: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180
  return { x: center + radius * Math.cos(radians), y: center + radius * Math.sin(radians) }
}

export function arcPath(center: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(center, radius, endAngle)
  const end = polarToCartesian(center, radius, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`
}
