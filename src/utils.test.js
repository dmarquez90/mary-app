import { describe, it, expect } from 'vitest'
import {
  r2, calcSubtotal, calcGrandTotal, calcIndirectos, montoDesdePct, pctDesdeMonto,
  flatBudgetItems, genBudgetCode, genProjectCode, genOCCode, costosSalidasFIFO,
} from './utils'

// ── Fictitious budget ────────────────────────────────────────────────────────
// 01 Club House
//   01.01 Preliminaries      A1: 120 × (12.50 + 30.25 + 5.00) = 5,730.00
//                            A2: 3.333 × 10.00              =    33.33
//   01.02 Foundations        A3: 1 × (0.10 + 0.20)          =     0.30
// 02 Building A
//   (direct activity)        A4: 10 × 100.00                = 1,000.00
//                                                    TOTAL  = 6,763.63
const act = (id, parent_id, code, cantidad, costo_mo, costo_materiales = 0, costo_equipos = 0) =>
  ({ id, parent_id, code, tipo: 'actividad', cantidad, costo_mo, costo_materiales, costo_equipos })

const budget = () => [
  { id: 'ST1', tipo: 'etapa', code: '01', parent_id: null },
  { id: 'ST2', tipo: 'etapa', code: '02', parent_id: null },
  { id: 'S1', tipo: 'sub_etapa', code: '01.01', parent_id: 'ST1' },
  { id: 'S2', tipo: 'sub_etapa', code: '01.02', parent_id: 'ST1' },
  act('A1', 'S1', '01.01.001', 120, 12.5, 30.25, 5),
  act('A2', 'S1', '01.01.002', 3.333, 10),
  act('A3', 'S2', '01.02.001', 1, 0.1, 0.2),
  act('A4', 'ST2', '02.001', 10, 100),
]

describe('r2 (2-decimal rounding)', () => {
  it('rounds ordinary values', () => {
    expect(r2(2.667)).toBe(2.67)
    expect(r2(1.344)).toBe(1.34)
    expect(r2('12.345')).toBe(12.35)
    expect(r2(null)).toBe(0)
    expect(r2('abc')).toBe(0)
  })
  it('rounds half-cent values up (1.005 → 1.01, 8.675 → 8.68)', () => {
    expect(r2(1.005)).toBe(1.01)
    expect(r2(8.675)).toBe(8.68)
  })
  it('rounds negative half-cents symmetrically (-2.675 → -2.68)', () => {
    expect(r2(-2.675)).toBe(-2.68)
  })
})

describe('calcSubtotal / calcGrandTotal', () => {
  it('sub-stage subtotal = Σ qty × (labor + materials + equipment)', () => {
    expect(calcSubtotal(budget(), 'S1', 'sub_etapa')).toBe(5763.33)
    expect(calcSubtotal(budget(), 'S2', 'sub_etapa')).toBe(0.3)
  })
  it('stage subtotal includes sub-stages and direct activities', () => {
    expect(calcSubtotal(budget(), 'ST1', 'etapa')).toBe(5763.63)
    expect(calcSubtotal(budget(), 'ST2', 'etapa')).toBe(1000)
  })
  it('grand total is exact to the cent', () => {
    expect(calcGrandTotal(budget())).toBe(6763.63)
  })
  it('grand total equals the sum of stage subtotals', () => {
    const items = budget()
    const stages = calcSubtotal(items, 'ST1', 'etapa') + calcSubtotal(items, 'ST2', 'etapa')
    expect(calcGrandTotal(items)).toBe(r2(stages))
  })
  it('many cent-level activities still add up exactly', () => {
    const items = [{ id: 'ST', tipo: 'etapa', code: '01' }, { id: 'S', tipo: 'sub_etapa', code: '01.01', parent_id: 'ST' }]
    for (let i = 0; i < 100; i++) items.push(act(`X${i}`, 'S', `01.01.${i}`, 1, 0.1))
    expect(calcGrandTotal(items)).toBe(10)
    expect(calcSubtotal(items, 'ST', 'etapa')).toBe(10)
  })
  it('handles numeric values that arrive as strings (e.g. from form inputs)', () => {
    const items = [{ id: 'ST', tipo: 'etapa', code: '01' }, { id: 'S', tipo: 'sub_etapa', code: '01.01', parent_id: 'ST' },
      act('Z', 'S', '01.01.001', '2', '10', '5', '0')]
    expect(calcGrandTotal(items)).toBe(30)
  })
  it('ignores activities of an orphaned sub-stage (its stage was deleted) — same as the budget table', () => {
    const items = budget().filter(i => i.id !== 'ST1')   // Club House deleted, sub-stages left behind
    const visible = flatBudgetItems(items).filter(i => i.tipo === 'actividad')
    expect(visible.map(i => i.id)).toEqual(['A4'])
    expect(calcGrandTotal(items)).toBe(1000)
  })
})

describe('calcIndirectos (indirect costs)', () => {
  it('percentage mode: 15% of 100,000 direct = 15,000', () => {
    const r = calcIndirectos({ indirecto_pct: 15 }, 100000, [])
    expect(r.modo).toBe('pct')
    expect(r.total).toBe(15000)
    expect(r.disponible).toBe(15000)
    expect(r.sobregiro).toBe(false)
  })
  it('percentage mode with categories distributed', () => {
    const r = calcIndirectos({ indirecto_pct: 15 }, 100000,
      [{ monto_presupuestado: 6000 }, { monto_presupuestado: '4000' }])
    expect(r.asignado).toBe(10000)
    expect(r.disponible).toBe(5000)
    expect(r.pctAsignado).toBeCloseTo(66.667, 2)
    expect(r.pctDisponible).toBeCloseTo(33.333, 2)
  })
  it('flags over-allocation', () => {
    const r = calcIndirectos({ indirecto_pct: 10 }, 50000, [{ monto_presupuestado: 6000 }])
    expect(r.total).toBe(5000)
    expect(r.disponible).toBe(-1000)
    expect(r.sobregiro).toBe(true)
  })
  it('amount mode (no %): total = sum of rows', () => {
    const r = calcIndirectos({ indirecto_pct: 0 }, 100000, [{ monto_presupuestado: 2500.5 }, { monto_presupuestado: 1000 }])
    expect(r.modo).toBe('monto')
    expect(r.total).toBe(3500.5)
    expect(r.disponible).toBe(0)
  })
  it('works with no project / no direct cost', () => {
    const r = calcIndirectos(null, 0, [])
    expect(r.total).toBe(0)
    expect(r.pctAsignado).toBe(0)
    expect(r.pctOriginal).toBe(null)
    expect(r.totalOriginal).toBe(null)
  })
  it('frozen baseline % is kept separately from the current %', () => {
    const r = calcIndirectos({ indirecto_pct: 15, indirecto_pct_original: 12 }, 100000, [])
    expect(r.total).toBe(15000)
    expect(r.pctOriginal).toBe(12)
    expect(r.totalOriginal).toBe(12000)
  })
  it('a baseline of 0% is still a baseline (not treated as "not frozen")', () => {
    const r = calcIndirectos({ indirecto_pct: 10, indirecto_pct_original: 0 }, 100000, [])
    expect(r.totalOriginal).toBe(0)
  })
  // Documents current behaviour — the "original" amount is recomputed against TODAY's
  // direct cost, so it moves when the direct budget grows (e.g. after a change order).
  it('[behaviour] baseline amount follows the current direct cost', () => {
    const r = calcIndirectos({ indirecto_pct: 12, indirecto_pct_original: 12 }, 110000, [])
    expect(r.totalOriginal).toBe(13200)
  })
})

describe('montoDesdePct / pctDesdeMonto', () => {
  it('converts both ways', () => {
    expect(montoDesdePct(20, 15000)).toBe(3000)
    expect(pctDesdeMonto(3000, 15000)).toBe(20)
    expect(pctDesdeMonto(100, 0)).toBe(0)
    expect(montoDesdePct('', 15000)).toBe(0)
  })
  it('round-trip amount → % → amount keeps the amount (large budget)', () => {
    const bolsa = 1_250_000
    const monto = 123_456.78
    expect(montoDesdePct(pctDesdeMonto(monto, bolsa), bolsa)).toBe(monto)
  })
})

describe('flatBudgetItems', () => {
  it('orders stage → sub-stages → activities → direct activities', () => {
    expect(flatBudgetItems(budget()).map(i => i.id))
      .toEqual(['ST1', 'S1', 'A1', 'A2', 'S2', 'A3', 'ST2', 'A4'])
  })
  it('sorts 10+ sub-stages correctly', () => {
    const items = [{ id: 'ST', tipo: 'etapa', code: '01' }]
    for (let n = 1; n <= 12; n++) items.push({ id: `S${n}`, tipo: 'sub_etapa', code: `01.${String(n).padStart(2, '0')}`, parent_id: 'ST' })
    expect(flatBudgetItems(items.reverse()).slice(1).map(i => i.id))
      .toEqual(Array.from({ length: 12 }, (_, i) => `S${i + 1}`))
  })
})

describe('code generators', () => {
  it('budget codes: stage / sub-stage / activity', () => {
    const items = budget()
    expect(genBudgetCode(items, 'etapa')).toBe('03')
    expect(genBudgetCode(items, 'sub_etapa', 'ST1')).toBe('01.03')
    expect(genBudgetCode(items, 'actividad', 'S1')).toBe('01.01.003')
  })
  it('no duplicate stage code after deleting a middle stage', () => {
    const items = [
      { id: 'a', tipo: 'etapa', code: '01' },
      { id: 'c', tipo: 'etapa', code: '03' },  // '02' was deleted
    ]
    expect(genBudgetCode(items, 'etapa')).toBe('04')
  })
  it('no duplicate activity code after deleting one', () => {
    const items = [
      { id: 'S', tipo: 'sub_etapa', code: '01.01' },
      { id: 'x', tipo: 'actividad', parent_id: 'S', code: '01.01.002' },  // 001 was deleted
    ]
    expect(genBudgetCode(items, 'actividad', 'S')).toBe('01.01.003')
  })
  it('no duplicate project code after deleting a project', () => {
    const y = new Date().getFullYear()
    const proyectos = [{ project_code: `P-${y}-002` }]   // P-…-001 was deleted
    expect(genProjectCode(proyectos)).toBe(`P-${y}-003`)
    expect(genProjectCode([])).toBe(`P-${y}-001`)
  })
  it('PO codes use max + 1, so deletions do not cause duplicates', () => {
    const y = new Date().getFullYear()
    expect(genOCCode([{ oc_number: `OC-${y}-007` }, { oc_number: `OC-${y}-002` }])).toBe(`OC-${y}-008`)
    expect(genOCCode([])).toBe(`OC-${y}-001`)
  })
})

describe('costosSalidasFIFO', () => {
  const ents = [
    { material_id: 'REB', cantidad: 2000, precio_unitario: 0.95, fecha_recepcion: '2026-10-01' },
    { material_id: 'REB', cantidad: 10000, precio_unitario: 0.92, fecha_recepcion: '2026-10-04' },
  ]
  it('consumes oldest layers first (9,000 lb = 2,000 @0.95 + 7,000 @0.92)', () => {
    const c = costosSalidasFIFO(ents, [{ id: 's1', material_id: 'REB', cantidad: 9000, fecha_salida: '2026-10-04' }])
    expect(c.s1).toBe(8340)
  })
  it('later exits continue from where earlier ones left off', () => {
    const c = costosSalidasFIFO(ents, [
      { id: 'a', material_id: 'REB', cantidad: 1500, fecha_salida: '2026-10-02' },
      { id: 'b', material_id: 'REB', cantidad: 1000, fecha_salida: '2026-10-05' },
    ])
    expect(c.a).toBe(1425)              // 1,500 @0.95
    expect(c.b).toBe(r2(500 * 0.95 + 500 * 0.92))
  })
  it('"no cost" exits consume stock but cost 0', () => {
    const c = costosSalidasFIFO(ents, [
      { id: 'g', material_id: 'REB', cantidad: 2000, fecha_salida: '2026-10-02', tipo_salida: 'uso_general', costo_cargo: 0 },
      { id: 'd', material_id: 'REB', cantidad: 1000, fecha_salida: '2026-10-05', tipo_salida: 'uso_directo' },
    ])
    expect(c.g).toBe(0)
    expect(c.d).toBe(920)               // the 0.95 layer was used by the reserve exit
  })
  it('falls back to catalog price when there are no entries', () => {
    const c = costosSalidasFIFO([], [{ id: 'x', material_id: 'M', cantidad: 3 }], [{ id: 'M', precio_unitario: 10 }])
    expect(c.x).toBe(30)
  })
})
