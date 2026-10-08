/** PRNG pequeño y determinista para los datos simulados. No usa estado global. */
export interface SeedPrng {
  next(): number
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
}

export function crearPrng(semilla: number): SeedPrng {
  let estado = semilla >>> 0

  function next(): number {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min
    },
    pick(items) {
      return items[Math.floor(next() * items.length)]
    },
  }
}
