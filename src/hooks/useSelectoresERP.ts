import { useShallow } from 'zustand/react/shallow'
import { selectCuentasCobrarVencidas, selectProductosStockCritico, selectVentasPendientesAprobacion } from '../store/selectors'
import { useERPStore } from '../store'

export function useContadoresSidebar() {
  return useERPStore(useShallow((state) => ({
    ventasPendientes: selectVentasPendientesAprobacion(state),
    productosStockCritico: selectProductosStockCritico(state).length,
    cuentasCobrarVencidas: selectCuentasCobrarVencidas(state, state.fechaReferencia),
  })))
}
