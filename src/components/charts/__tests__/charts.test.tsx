import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DonutChart } from '../DonutChart'
import { PixelChart } from '../PixelChart'
import { LineChart } from '../LineChart'
import { RankingBars } from '../RankingBars'
import { SalesPurchasesBarChart } from '../../data-display/SalesPurchasesBarChart'

describe('componentes accesibles de gráficos', () => {
  it('muestra un punto aislado y conserva los valores originales de la serie', () => {
    const markup = renderToStaticMarkup(<LineChart data={[{ label: 'Octubre', value: 1234 }]} />)
    expect(markup).toContain('<circle')
    expect(markup).toContain('<td>1234</td>')
    expect(markup).toContain('>Octubre</text>')
    expect(markup).not.toContain('>Periodo anterior</button>')
  })

  it('conserva nombres completos en el ranking y maneja resultados vacíos', () => {
    const name = 'Distribuidora empresarial con un nombre extenso'
    const markup = renderToStaticMarkup(<RankingBars data={[{ label: name, value: 500 }]} />)
    expect(markup).toContain(`${name}</span>`)
    expect(markup).toContain('<td>500</td>')
    expect(renderToStaticMarkup(<RankingBars data={[]} />)).toContain('Sin datos')
  })

  it('las compras ocultas no alteran la escala de ventas', () => {
    const render = (compras: number) => renderToStaticMarkup(<SalesPurchasesBarChart data={[{ etiqueta: 'Octubre', ventas: 100, compras }]} periodo="mes" onPeriodoChange={() => undefined} mostrarCompras={false} />)
    const normal = render(0)
    const hiddenLargeValue = render(10000000)
    expect(hiddenLargeValue.match(/<text[^>]*>S\/ [^<]+<\/text>/g)).toEqual(normal.match(/<text[^>]*>S\/ [^<]+<\/text>/g))
    expect(hiddenLargeValue).not.toContain('<th>Compras</th>')
  })

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
