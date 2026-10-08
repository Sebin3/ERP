import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DonutChart } from '../DonutChart'
import { PixelChart } from '../PixelChart'

describe('componentes accesibles de gráficos', () => {
  it('PixelChart refleja la etiqueta y sus datos en la tabla sr-only', () => {
    const markup = renderToStaticMarkup(<PixelChart data={[{ label: 'Oct 26', ventas: 1200, compras: 800 }]} />)
    expect(markup).toContain('aria-label="1 periodos; ventas S/ 1.2k y compras S/ 800"')
    expect(markup).toContain('Datos de ventas vs compras')
    expect(markup).toContain('<td>Oct 26</td>')
    expect(markup).toContain('<td>1200</td>')
    expect(markup).toContain('<td>800</td>')
  })

  it('DonutChart refleja segmentos, importes y porcentajes', () => {
    const markup = renderToStaticMarkup(<DonutChart title="Ventas por categoría" data={[{ label: 'Abarrotes', value: 600 }, { label: 'Bebidas', value: 400 }]} />)
    expect(markup).toContain('aria-label="Ventas por categoría: S/ 1.0k"')
    expect(markup).toContain('<td>Abarrotes</td>')
    expect(markup).toContain('<td>600</td>')
    expect(markup).toContain('<td>40</td>')
    expect(markup).toContain('<td>Bebidas</td>')
  })
})
