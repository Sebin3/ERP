/**
 * Catálogo geográfico local para la demo.
 *
 * La estructura sigue el nivel Departamento → Provincia → Distrito del UBIGEO.
 * En producción estos catálogos vivirán normalizados en PostgreSQL. La fuente
 * de referencia del catálogo nacional es https://github.com/RitchieRD/ubigeos-peru-data (CC0).
 */
export interface PeruLocation {
  departamento: string
  provincia: string
  distrito: string
}

export const departamentosPeru = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
] as const

export const ubicacionesPeruDemo: readonly PeruLocation[] = [
  { departamento: 'Amazonas', provincia: 'Chachapoyas', distrito: 'Chachapoyas' },
  { departamento: 'Áncash', provincia: 'Huaraz', distrito: 'Huaraz' },
  { departamento: 'Apurímac', provincia: 'Abancay', distrito: 'Abancay' },
  { departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Arequipa' },
  { departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Cayma' },
  { departamento: 'Ayacucho', provincia: 'Huamanga', distrito: 'Ayacucho' },
  { departamento: 'Cajamarca', provincia: 'Cajamarca', distrito: 'Cajamarca' },
  { departamento: 'Callao', provincia: 'Callao', distrito: 'Callao' },
  { departamento: 'Cusco', provincia: 'Cusco', distrito: 'Cusco' },
  { departamento: 'Huancavelica', provincia: 'Huancavelica', distrito: 'Huancavelica' },
  { departamento: 'Huánuco', provincia: 'Huánuco', distrito: 'Huánuco' },
  { departamento: 'Ica', provincia: 'Ica', distrito: 'Ica' },
  { departamento: 'Junín', provincia: 'Huancayo', distrito: 'Huancayo' },
  { departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo' },
  { departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Chiclayo' },
  { departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores' },
  { departamento: 'Lima', provincia: 'Lima', distrito: 'Cercado de Lima' },
  { departamento: 'Lima', provincia: 'Lima', distrito: 'San Martín de Porres' },
  { departamento: 'Loreto', provincia: 'Maynas', distrito: 'Iquitos' },
  { departamento: 'Madre de Dios', provincia: 'Tambopata', distrito: 'Tambopata' },
  { departamento: 'Moquegua', provincia: 'Mariscal Nieto', distrito: 'Moquegua' },
  { departamento: 'Pasco', provincia: 'Pasco', distrito: 'Chaupimarca' },
  { departamento: 'Piura', provincia: 'Piura', distrito: 'Piura' },
  { departamento: 'Puno', provincia: 'Puno', distrito: 'Puno' },
  { departamento: 'San Martín', provincia: 'San Martín', distrito: 'Tarapoto' },
  { departamento: 'Tacna', provincia: 'Tacna', distrito: 'Tacna' },
  { departamento: 'Tumbes', provincia: 'Tumbes', distrito: 'Tumbes' },
  { departamento: 'Ucayali', provincia: 'Coronel Portillo', distrito: 'Callería' },
]

export function provinciasPorDepartamento(departamento: string): string[] {
  return [...new Set(ubicacionesPeruDemo.filter((item) => item.departamento === departamento).map((item) => item.provincia))]
}

export function distritosPorProvincia(departamento: string, provincia: string): string[] {
  return [...new Set(ubicacionesPeruDemo.filter((item) => item.departamento === departamento && item.provincia === provincia).map((item) => item.distrito))]
}

export function ubicacionCliente(index: number): PeruLocation {
  return ubicacionesPeruDemo[index % ubicacionesPeruDemo.length]
}
