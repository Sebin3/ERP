import { describe, expect, it } from 'vitest'
import { donutSegments, formatCompactPercent, formatCompactSoles, linearScale, monotoneCubicPath, niceTicks } from '../charts'

describe('utilidades de gráficos', () => {
  it('calcula escalas y ticks legibles', () => {
    expect(linearScale(50, [0, 100], [0, 200])).toBe(100)
    expect(linearScale(10, [10, 10], [0, 200])).toBe(100)
    expect(niceTicks(1000, 4)).toEqual([0, 500, 1000, 1500, 2000])
  })

  it('formatea soles y porcentajes de forma compacta', () => {
    expect(formatCompactSoles(12400)).toBe('S/ 12.4k')
    expect(formatCompactSoles(1_200_000)).toBe('S/ 1.2M')
    expect(formatCompactPercent(33.333)).toBe('33.3%')
  })

  it('genera curvas monótonas sin NaN con cero, uno y dos puntos', () => {
    expect(monotoneCubicPath([])).toBe('')
    expect(monotoneCubicPath([{ x: 0, y: 0 }])).not.toContain('NaN')
    expect(monotoneCubicPath([{ x: 0, y: 0 }, { x: 10, y: 4 }])).not.toContain('Infinity')
    expect(monotoneCubicPath([{ x: 0, y: 0 }, { x: 10, y: 4 }, { x: 20, y: 3 }])).not.toMatch(/NaN|Infinity/)
  })

  it('excluye segmentos cero y suma el donut a 100%', () => {
    const segmentos = donutSegments([10, 0, 20, 70, 0])
    expect(segmentos.map((segmento) => segmento.index)).toEqual([0, 2, 3])
    expect(segmentos.reduce((total, segmento) => total + segmento.percentage, 0)).toBe(100)
    expect(formatCompactPercent(segmentos[0].percentage)).toMatch(/%$/)
  })
})
