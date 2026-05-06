import { useState, useMemo, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt, fmtNum, calcGrandTotal } from '../utils'
import { EmptyState, Icons } from '../components'
import * as XLSX from 'xlsx'

const BRAND = '#1B3A6B'

// ── HELPERS ───────────────────────────────────────────────
const inPeriodo = (fecha, desde, hasta) => {
  if (!fecha) return false
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es') : '—'

// ── ESTILOS EXCEL ─────────────────────────────────────────
const excelStyles = {
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11, name: 'Arial' },
    fill: { fgColor: { rgb: '1B3A6B' }, type: 'pattern', patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { bottom: { style: 'thin', color: { rgb: 'FFFFFF' } } }
  },
  title: {
    font: { bold: true, size: 14, name: 'Arial', color: { rgb: '1B3A6B' } },
    alignment: { horizontal: 'left' }
  },
  subtitle: {
    font: { bold: false, size: 10, name: 'Arial', color: { rgb: '64748B' } }
  },
  total: {
    font: { bold: true, size: 11, name: 'Arial' },
    fill: { fgColor: { rgb: 'EEF2F7' }, type: 'pattern', patternType: 'solid' }
  },
  currency: { numFmt: '"$"#,##0.00', font: { name: 'Arial', size: 10 } },
  normal: { font: { name: 'Arial', size: 10 } },
  evenRow: { fill: { fgColor: { rgb: 'F8FAFC' }, type: 'pattern', patternType: 'solid' } },
}

function applyStyle(cell, style) {
  if (style.font)      cell.font      = style.font
  if (style.fill)      cell.fill      = style.fill
  if (style.alignment) cell.alignment = style.alignment
  if (style.border)    cell.border    = style.border
  if (style.numFmt)    cell.numFmt    = style.numFmt
}

function addHeaderRow(ws, headers, rowNum, colStart = 1) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(rowNum, colStart + i)
    cell.value = h
    applyStyle(cell, excelStyles.header)
  })
}

function addTitleBlock(ws, titulo, subtitulo, proyecto, periodo) {
  ws.getCell('A1').value = titulo
  applyStyle(ws.getCell('A1'), excelStyles.title)
  ws.getCell('A2').value = `Marquez Project Solutions LLC — MARY ERP`
  applyStyle(ws.getCell('A2'), excelStyles.subtitle)
  if (proyecto) {
    ws.getCell('A3').value = `Proyecto: ${proyecto}`
    applyStyle(ws.getCell('A3'), excelStyles.subtitle)
  }
  if (periodo) {
    const row = proyecto ? 4 : 3
    ws.getCell(`A${row}`).value = `Período: ${periodo}`
    applyStyle(ws.getCell(`A${row}`), excelStyles.subtitle)
  }
  ws.getCell('F1').value = `Generado: ${new Date().toLocaleDateString('es')}`
  applyStyle(ws.getCell('F1'), excelStyles.subtitle)
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────
export default function Reportes() {
  const { state } = useStore()
  const { t } = useContext(LangContext)
  const {
    proyectos, presupuesto, materiales, entradas, salidas,
    costos_directos, nominas, subcontratos, equipos, costos_indirectos
  } = state

  const [reportType, setReportType] = useState('financiero')
  const [proyId, setProyId]         = useState(proyectos[0]?.id || '')
  const [desde, setDesde]           = useState('')
  const [hasta, setHasta]           = useState('')
  const [loading, setLoading]       = useState(false)

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const items  = presupuesto.filter(b => b.proyecto_id === proyId)
  const budget = calcGrandTotal(items)

  // ── DATOS FINANCIERO ──────────────────────────────────
  const datosFinanciero = useMemo(() => {
    if (!proyId) return null
    const filtro = (f) => inPeriodo(f, desde, hasta)

    const matCosts = salidas.filter(s => s.proyecto_id === proyId && filtro(s.fecha_salida)).map(s => {
      const e = entradas.find(en => en.material_id === s.material_id)
      return (parseFloat(s.cantidad)||0) * (parseFloat(e?.precio_unitario)||0)
    })
    const totalMat = matCosts.reduce((a,b) => a+b, 0)

    const dirs  = costos_directos.filter(c => c.proyecto_id===proyId && filtro(c.fecha||c.created_at?.slice(0,10)))
    const noms  = nominas.filter(n => n.proyecto_id===proyId && filtro(n.periodo_fin))
    const subs  = subcontratos.filter(s => s.proyecto_id===proyId && filtro(s.created_at?.slice(0,10)))
    const eqs   = equipos.filter(e => e.proyecto_id===proyId && filtro(e.created_at?.slice(0,10)))
    const inds  = costos_indirectos.filter(c => c.proyecto_id===proyId && filtro(c.fecha||c.created_at?.slice(0,10)))

    const totalDir = dirs.reduce((s,c) => s+(parseFloat(c.monto)||0), 0)
    const totalNom = noms.reduce((s,n) => s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0), 0)
    const totalSub = subs.reduce((s,sc) => s+(parseFloat(sc.monto_pagado)||0), 0)
    const totalEq  = eqs.reduce((s,e) => s+(parseFloat(e.costo_total)||0), 0)
    const totalInd = inds.reduce((s,c) => s+(parseFloat(c.monto)||0), 0)
    const totalReal = totalMat + totalDir + totalNom + totalSub + totalEq + totalInd

    // Presupuesto vs Real por actividad
    const actividades = items.filter(i => i.tipo === 'actividad').map(act => {
      const pres = (act.cantidad||0)*((act.costo_mo||0)+(act.costo_materiales||0)+(act.costo_equipos||0))
      const real = salidas.filter(s => s.proyecto_id===proyId && s.actividad_id===act.id)
        .reduce((s,sa) => { const e=entradas.find(en=>en.material_id===sa.material_id); return s+(parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0) }, 0)
        + costos_directos.filter(c=>c.proyecto_id===proyId&&c.actividad_id===act.id).reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
        + subcontratos.filter(s=>s.proyecto_id===proyId&&s.actividad_id===act.id).reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
      const dev = real - pres
      return { code: act.code, descripcion: act.descripcion, pres, real, dev, devPct: pres>0?(dev/pres)*100:0 }
    }).filter(a => a.pres > 0 || a.real > 0)

    return {
      resumen: [
        { categoria: 'Materiales', real: totalMat },
        { categoria: 'Costos Directos', real: totalDir },
        { categoria: 'Nómina / Planilla', real: totalNom },
        { categoria: 'Subcontratos', real: totalSub },
        { categoria: 'Equipos', real: totalEq },
        { categoria: 'Costos Indirectos', real: totalInd },
      ],
      actividades, totalReal, dirs, noms, subs, eqs, inds
    }
  }, [proyId, desde, hasta, presupuesto, salidas, entradas, costos_directos, nominas, subcontratos, equipos, costos_indirectos])

  // ── DATOS INVENTARIO ─────────────────────────────────
  const datosInventario = useMemo(() => {
    const mats    = materiales.filter(m => m.activo !== false)
    const entradasF = entradas.filter(e => inPeriodo(e.fecha_recepcion, desde, hasta))
    const salidasF  = salidas.filter(s => inPeriodo(s.fecha_salida, desde, hasta))
    return { mats, entradas: entradasF, salidas: salidasF }
  }, [materiales, entradas, salidas, desde, hasta])

  // ── EXCEL: FINANCIERO ─────────────────────────────────
  const exportFinanciero = () => {
    if (!datosFinanciero) return
    setLoading(true)
    try {
      const wb = XLSX.utils.book_new()
      const periodoLabel = desde || hasta ? `${desde||'inicio'} al ${hasta||'hoy'}` : 'Todo el período'
      const proyLabel = `${proy?.project_code} — ${proy?.nombre}`

      // ── HOJA 1: Resumen Presupuesto vs Real ──
      const ws1Data = [
        ['REPORTE FINANCIERO — PRESUPUESTO VS REAL'],
        ['Marquez Project Solutions LLC — MARY ERP'],
        [`Proyecto: ${proyLabel}`],
        [`Período: ${periodoLabel}`],
        [`Generado: ${new Date().toLocaleDateString('es')}`],
        [],
        ['RESUMEN POR CATEGORÍA'],
        ['Categoría', 'Costo Real', '% del Total'],
        ...datosFinanciero.resumen.map(r => [
          r.categoria,
          r.real,
          datosFinanciero.totalReal > 0 ? r.real/datosFinanciero.totalReal : 0
        ]),
        ['TOTAL REAL', datosFinanciero.totalReal, 1],
        [],
        ['PRESUPUESTO TOTAL', budget],
        ['COSTO REAL TOTAL', datosFinanciero.totalReal],
        ['DESVIACIÓN', datosFinanciero.totalReal - budget],
        ['% EJECUCIÓN', budget > 0 ? datosFinanciero.totalReal/budget : 0],
        [],
        ['PRESUPUESTO VS REAL POR ACTIVIDAD'],
        ['Código', 'Actividad', 'Presupuestado', 'Real', 'Desviación $', 'Desviación %', 'Estado'],
        ...datosFinanciero.actividades.map(a => [
          a.code, a.descripcion, a.pres, a.real, a.dev,
          a.pres > 0 ? a.dev/a.pres : 0,
          Math.abs(a.devPct) < 5 ? 'OK' : Math.abs(a.devPct) < 15 ? 'ALERTA' : 'CRÍTICO'
        ])
      ]

      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data)

      // Formato columnas
      ws1['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]

      XLSX.utils.book_append_sheet(wb, ws1, 'Presupuesto vs Real')

      // ── HOJA 2: Detalle por categoría ──
      const ws2Data = [
        ['DETALLE DE COSTOS POR CATEGORÍA'],
        [`Proyecto: ${proyLabel} | Período: ${periodoLabel}`],
        [],
        ['COSTOS DIRECTOS'],
        ['Fecha', 'Tipo', 'Descripción', 'Actividad', 'Documento', 'Monto'],
        ...datosFinanciero.dirs.map(c => [
          c.fecha||c.created_at?.slice(0,10)||'', c.tipo||'', c.descripcion||'',
          presupuesto.find(b=>b.id===c.actividad_id)?.descripcion||'—', c.numero_documento||'—', parseFloat(c.monto)||0
        ]),
        ['', '', '', '', 'SUBTOTAL', datosFinanciero.dirs.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)],
        [],
        ['NÓMINA / PLANILLA'],
        ['Período inicio', 'Período fin', 'Trabajador', 'Cargo', 'Salario base', 'Deducciones', 'Neto'],
        ...datosFinanciero.noms.map(n => [
          n.periodo_inicio||'', n.periodo_fin||'', n.trabajador||'', n.cargo||'',
          parseFloat(n.salario_base)||0, parseFloat(n.deducciones)||0,
          (parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0)
        ]),
        [],
        ['SUBCONTRATOS'],
        ['Subcontratista', 'Descripción', 'Contrato', '% Avance', 'Monto pagado'],
        ...datosFinanciero.subs.map(s => [
          s.subcontratista||'', s.descripcion_trabajo||'',
          parseFloat(s.monto_contrato)||0, parseFloat(s.avance_porcentaje)||0, parseFloat(s.monto_pagado)||0
        ]),
        [],
        ['EQUIPOS'],
        ['Descripción', 'Tipo', 'Tarifa diaria', 'Días', 'Total'],
        ...datosFinanciero.eqs.map(e => [
          e.descripcion||'', e.tipo||'',
          parseFloat(e.tarifa_diaria)||0, parseFloat(e.dias_uso)||0, parseFloat(e.costo_total)||0
        ]),
        [],
        ['COSTOS INDIRECTOS'],
        ['Fecha', 'Categoría', 'Descripción', 'Monto'],
        ...datosFinanciero.inds.map(c => [
          c.fecha||c.created_at?.slice(0,10)||'', c.categoria||'', c.descripcion||'', parseFloat(c.monto)||0
        ]),
      ]

      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data)
      ws2['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Detalle por Categoría')

      XLSX.writeFile(wb, `Reporte_Financiero_${proy?.project_code}_${new Date().toISOString().slice(0,10)}.xlsx`)
    } finally {
      setLoading(false)
    }
  }

  // ── EXCEL: INVENTARIO ─────────────────────────────────
  const exportInventario = () => {
    setLoading(true)
    try {
      const wb = XLSX.utils.book_new()
      const periodoLabel = desde || hasta ? `${desde||'inicio'} al ${hasta||'hoy'}` : 'Todo el período'

      // HOJA 1: Stock actual
      const ws1Data = [
        ['REPORTE DE INVENTARIO — STOCK ACTUAL'],
        ['Marquez Project Solutions LLC — MARY ERP'],
        [`Generado: ${new Date().toLocaleDateString('es')}`],
        [],
        ['Código', 'Descripción', 'Unidad', 'Ubicación en bodega', 'Stock actual', 'Stock mínimo', 'Estado'],
        ...datosInventario.mats.map(m => {
          const crit = parseFloat(m.stock_actual||0) <= parseFloat(m.stock_minimo||0)
          return [m.codigo, m.descripcion, m.unidad, m.ubicacion_bodega||'—',
            parseFloat(m.stock_actual)||0, parseFloat(m.stock_minimo)||0, crit ? 'CRÍTICO' : 'OK']
        })
      ]
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data)
      ws1['!cols'] = [{ wch: 14 }, { wch: 35 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(wb, ws1, 'Stock Actual')

      // HOJA 2: Entradas
      const ws2Data = [
        ['REPORTE DE ENTRADAS DE MATERIALES'],
        [`Período: ${periodoLabel} | Generado: ${new Date().toLocaleDateString('es')}`],
        [],
        ['Fecha', 'Código', 'Material', 'Cantidad', 'Unidad', 'Precio unitario', 'Total', 'Factura', 'Proveedor', 'Proyecto'],
        ...datosInventario.entradas.map(e => {
          const m = materiales.find(x => x.id === e.material_id)
          const p = proyectos.find(x => x.id === e.proyecto_id)
          const total = (parseFloat(e.cantidad)||0) * (parseFloat(e.precio_unitario)||0)
          return [e.fecha_recepcion, m?.codigo||'—', m?.descripcion||'—',
            parseFloat(e.cantidad)||0, m?.unidad||'', parseFloat(e.precio_unitario)||0,
            total, e.numero_factura||'—', e.proveedor||'—', p?.project_code||'—']
        })
      ]
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data)
      ws2['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 32 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Entradas')

      // HOJA 3: Salidas
      const ws3Data = [
        ['REPORTE DE SALIDAS DE MATERIALES'],
        [`Período: ${periodoLabel} | Generado: ${new Date().toLocaleDateString('es')}`],
        [],
        ['Fecha', 'Código', 'Material', 'Cantidad', 'Unidad', 'Proyecto', 'Actividad'],
        ...datosInventario.salidas.map(s => {
          const m   = materiales.find(x => x.id === s.material_id)
          const p   = proyectos.find(x => x.id === s.proyecto_id)
          const act = presupuesto.find(x => x.id === s.actividad_id)
          return [s.fecha_salida, m?.codigo||'—', m?.descripcion||'—',
            parseFloat(s.cantidad)||0, m?.unidad||'',
            p?.project_code||'—', act ? `${act.code} — ${act.descripcion}` : '—']
        })
      ]
      const ws3 = XLSX.utils.aoa_to_sheet(ws3Data)
      ws3['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 32 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 38 }]
      XLSX.utils.book_append_sheet(wb, ws3, 'Salidas')

      XLSX.writeFile(wb, `Reporte_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`)
    } finally {
      setLoading(false)
    }
  }

  // ── EXCEL: RESUMEN GENERAL ────────────────────────────
  const exportResumenGeneral = () => {
    if (!proyId) return
    setLoading(true)
    try {
      const wb = XLSX.utils.book_new()
      const proyLabel = `${proy?.project_code} — ${proy?.nombre}`

      // Calcular todos los costos
      const totalMat = salidas.filter(s=>s.proyecto_id===proyId).reduce((s,sa)=>{
        const e=entradas.find(en=>en.material_id===sa.material_id)
        return s+(parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0)
      },0)
      const dirs   = costos_directos.filter(c=>c.proyecto_id===proyId)
      const noms   = nominas.filter(n=>n.proyecto_id===proyId)
      const subs   = subcontratos.filter(s=>s.proyecto_id===proyId)
      const eqs    = equipos.filter(e=>e.proyecto_id===proyId)
      const inds   = costos_indirectos.filter(c=>c.proyecto_id===proyId)
      const totalDir = dirs.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
      const totalNom = noms.reduce((s,n)=>s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0),0)
      const totalSub = subs.reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
      const totalEq  = eqs.reduce((s,e)=>s+(parseFloat(e.costo_total)||0),0)
      const totalInd = inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
      const totalReal = totalMat+totalDir+totalNom+totalSub+totalEq+totalInd

      const wsData = [
        ['RESUMEN GENERAL DEL PROYECTO'],
        ['Marquez Project Solutions LLC — MARY ERP'],
        [`Proyecto: ${proyLabel}`],
        [`Moneda: ${moneda} | Generado: ${new Date().toLocaleDateString('es')}`],
        [],
        ['INFORMACIÓN DEL PROYECTO'],
        ['Código', proy?.project_code||''],
        ['Nombre', proy?.nombre||''],
        ['Cliente', proy?.cliente_externo||'—'],
        ['Estado', proy?.estado||''],
        ['Fecha inicio', proy?.fecha_inicio||'—'],
        ['Fecha fin estimada', proy?.fecha_fin_estimada||'—'],
        ['Ciudad / País', `${proy?.ciudad||''} ${proy?.pais||''}`.trim()||'—'],
        [],
        ['RESUMEN FINANCIERO'],
        ['Concepto', 'Monto', '% del Costo Real'],
        ['Presupuesto total', budget, ''],
        ['', '', ''],
        ['COSTOS DIRECTOS DE OBRA'],
        ['  Materiales', totalMat, totalReal>0?totalMat/totalReal:0],
        ['  Costos directos', totalDir, totalReal>0?totalDir/totalReal:0],
        ['  Nómina / Planilla', totalNom, totalReal>0?totalNom/totalReal:0],
        ['  Subcontratos', totalSub, totalReal>0?totalSub/totalReal:0],
        ['  Equipos', totalEq, totalReal>0?totalEq/totalReal:0],
        ['COSTOS INDIRECTOS', totalInd, totalReal>0?totalInd/totalReal:0],
        ['', '', ''],
        ['TOTAL COSTO REAL', totalReal, 1],
        ['DESVIACIÓN', totalReal-budget, budget>0?(totalReal-budget)/budget:0],
        ['% EJECUCIÓN DEL PRESUPUESTO', budget>0?totalReal/budget:0, ''],
        [],
        ['DETALLE — COSTOS DIRECTOS'],
        ['Fecha', 'Tipo', 'Descripción', 'Actividad', 'Documento', 'Monto'],
        ...dirs.map(c=>[c.fecha||'', c.tipo||'', c.descripcion||'',
          presupuesto.find(b=>b.id===c.actividad_id)?.descripcion||'—', c.numero_documento||'—', parseFloat(c.monto)||0]),
        ['', '', '', '', 'SUBTOTAL', totalDir],
        [],
        ['DETALLE — NÓMINA / PLANILLA'],
        ['Período inicio', 'Período fin', 'Trabajador', 'Cargo', 'Salario base', 'Deducciones', 'Neto'],
        ...noms.map(n=>[n.periodo_inicio||'', n.periodo_fin||'', n.trabajador||'', n.cargo||'',
          parseFloat(n.salario_base)||0, parseFloat(n.deducciones)||0,
          (parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0)]),
        ['', '', '', '', '', 'SUBTOTAL', totalNom],
        [],
        ['DETALLE — SUBCONTRATOS'],
        ['Subcontratista', 'Descripción', 'Actividad', 'Monto contrato', '% Avance', 'Monto pagado'],
        ...subs.map(s=>[s.subcontratista||'', s.descripcion_trabajo||'',
          presupuesto.find(b=>b.id===s.actividad_id)?.descripcion||'—',
          parseFloat(s.monto_contrato)||0, parseFloat(s.avance_porcentaje)||0, parseFloat(s.monto_pagado)||0]),
        ['', '', '', '', 'SUBTOTAL', totalSub],
        [],
        ['DETALLE — EQUIPOS'],
        ['Descripción', 'Tipo', 'Tarifa diaria', 'Días de uso', 'Costo total'],
        ...eqs.map(e=>[e.descripcion||'', e.tipo||'',
          parseFloat(e.tarifa_diaria)||0, parseFloat(e.dias_uso)||0, parseFloat(e.costo_total)||0]),
        ['', '', '', 'SUBTOTAL', totalEq],
        [],
        ['DETALLE — COSTOS INDIRECTOS'],
        ['Fecha', 'Categoría', 'Descripción', 'Monto'],
        ...inds.map(c=>[c.fecha||c.created_at?.slice(0,10)||'', c.categoria||'', c.descripcion||'', parseFloat(c.monto)||0]),
        ['', '', 'SUBTOTAL', totalInd],
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Resumen General')

      XLSX.writeFile(wb, `Resumen_General_${proy?.project_code}_${new Date().toISOString().slice(0,10)}.xlsx`)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (reportType === 'financiero')  exportFinanciero()
    if (reportType === 'inventario')  exportInventario()
    if (reportType === 'general')     exportResumenGeneral()
  }

  // ── VISTA EN APP ──────────────────────────────────────
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]'

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Reportes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Genera y exporta reportes a Excel</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Configurar reporte</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tipo de reporte</label>
            <select className={inputCls + ' w-full'} value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="financiero">📊 Reporte Financiero</option>
              <option value="inventario">📦 Reporte de Inventario</option>
              <option value="general">📋 Resumen General del Proyecto</option>
            </select>
          </div>
          {(reportType === 'financiero' || reportType === 'general') && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Proyecto *</label>
              <select className={inputCls + ' w-full'} value={proyId} onChange={e => setProyId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Desde</label>
            <input type="date" className={inputCls + ' w-full'} value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Hasta</label>
            <input type="date" className={inputCls + ' w-full'} value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleExport} disabled={loading || ((reportType==='financiero'||reportType==='general') && !proyId)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-40"
            style={{ background: '#1B3A6B' }}>
            {loading ? '⏳ Generando...' : '⬇ Descargar Excel'}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
            🖨 Imprimir vista
          </button>
        </div>
      </div>

      {/* VISTA PREVIA */}
      {reportType === 'financiero' && proyId && datosFinanciero && (
        <VistaFinanciero
          data={datosFinanciero} budget={budget} moneda={moneda}
          proy={proy} desde={desde} hasta={hasta} fmt={fmt} />
      )}
      {reportType === 'inventario' && (
        <VistaInventario
          data={datosInventario} materiales={materiales}
          proyectos={proyectos} presupuesto={presupuesto}
          desde={desde} hasta={hasta} fmtDate={fmtDate} fmtNum={fmtNum} />
      )}
      {reportType === 'general' && proyId && (
        <VistaGeneral
          proy={proy} proyectos={proyectos} presupuesto={presupuesto}
          costos_directos={costos_directos} nominas={nominas}
          subcontratos={subcontratos} equipos={equipos}
          costos_indirectos={costos_indirectos} salidas={salidas}
          entradas={entradas} budget={budget} moneda={moneda}
          fmt={fmt} fmtNum={fmtNum} />
      )}
    </div>
  )
}

// ── VISTA FINANCIERO ──────────────────────────────────────
function VistaFinanciero({ data, budget, moneda, proy, desde, hasta, fmt }) {
  const { resumen, actividades, totalReal } = data
  const desviacion = totalReal - budget

  const thCls = 'px-4 py-2.5 text-left text-xs font-semibold text-white'
  const tdCls = 'px-4 py-2.5 text-sm text-gray-700'
  const thStyle = { background: BRAND }

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      {/* Encabezado imprimible */}
      <div className="hidden print:block mb-4">
        <p className="text-lg font-bold" style={{ color: BRAND }}>Reporte Financiero — {proy?.project_code} {proy?.nombre}</p>
        <p className="text-xs text-gray-500">Marquez Project Solutions LLC · MARY ERP · {new Date().toLocaleDateString('es')}</p>
        {(desde||hasta) && <p className="text-xs text-gray-500">Período: {desde||'—'} al {hasta||'—'}</p>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Presupuesto total', val: fmt(budget, moneda), color: BRAND },
          { label: 'Costo real ejecutado', val: fmt(totalReal, moneda), color: '#1D9E75' },
          { label: 'Desviación', val: `${desviacion>=0?'+':''}${fmt(desviacion,moneda)}`, color: desviacion>0?'#ef4444':'#1D9E75' },
          { label: '% Ejecución', val: budget>0?`${((totalReal/budget)*100).toFixed(1)}%`:'0%', color: BRAND },
        ].map((k,i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Resumen por categoría */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-700">Resumen de gastos por categoría</p>
        </div>
        <table className="w-full">
          <thead><tr style={thStyle}>
            <th className={thCls}>Categoría</th>
            <th className={thCls + ' text-right'}>Costo real</th>
            <th className={thCls + ' text-right'}>% del total</th>
          </tr></thead>
          <tbody>
            {resumen.map((r,i) => (
              <tr key={i} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                <td className={tdCls}>{r.categoria}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmt(r.real, moneda)}</td>
                <td className={tdCls + ' text-right'}>
                  {totalReal>0 ? `${((r.real/totalReal)*100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-semibold">
              <td className={tdCls + ' font-bold'}>TOTAL</td>
              <td className={tdCls + ' text-right font-mono font-bold'}>{fmt(totalReal, moneda)}</td>
              <td className={tdCls + ' text-right'}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Presupuesto vs Real por actividad */}
      {actividades.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-700">Presupuesto vs Real por actividad</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={thStyle}>
                {['Código','Actividad','Presupuestado','Real','Desviación $','Desv. %','Estado'].map((h,i) => (
                  <th key={i} className={thCls + (i>1?' text-right':'')}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {actividades.map((a,i) => {
                  const status = Math.abs(a.devPct)<5?'ok':Math.abs(a.devPct)<15?'alerta':'critico'
                  return (
                    <tr key={i} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                      <td className={tdCls + ' font-mono text-xs'}>{a.code}</td>
                      <td className={tdCls + ' max-w-[160px] truncate'}>{a.descripcion}</td>
                      <td className={tdCls + ' text-right font-mono'}>{fmt(a.pres, moneda)}</td>
                      <td className={tdCls + ' text-right font-mono'}>{fmt(a.real, moneda)}</td>
                      <td className={tdCls + ' text-right font-mono font-medium'} style={{ color: a.dev>0?'#ef4444':'#1D9E75' }}>
                        {a.dev>=0?'+':''}{fmt(a.dev, moneda)}
                      </td>
                      <td className={tdCls + ' text-right'} style={{ color: a.dev>0?'#ef4444':'#1D9E75' }}>
                        {a.dev>=0?'+':''}{a.devPct.toFixed(1)}%
                      </td>
                      <td className={tdCls}>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${status==='ok'?'bg-green-100 text-green-700':status==='alerta'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>
                          {status==='ok'?'✓ OK':status==='alerta'?'⚠ Alerta':'⚠ Crítico'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── VISTA INVENTARIO ──────────────────────────────────────
function VistaInventario({ data, materiales, proyectos, presupuesto, fmtDate, fmtNum }) {
  const [subTab, setSubTab] = useState(0)
  const thStyle = { background: BRAND }
  const thCls   = 'px-4 py-2.5 text-left text-xs font-semibold text-white'
  const tdCls   = 'px-4 py-2.5 text-sm text-gray-700'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-gray-200">
        {['Stock actual','Entradas','Salidas'].map((label,i) => (
          <button key={i} onClick={() => setSubTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${subTab===i?'border-[#1B3A6B] text-[#1B3A6B]':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label} <span className="ml-1 text-xs text-gray-400">
              ({[data.mats.length, data.entradas.length, data.salidas.length][i]})
            </span>
          </button>
        ))}
      </div>

      {subTab === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full">
            <thead><tr style={thStyle}>
              {['Código','Descripción','Unidad','Ubicación en bodega','Stock actual','Stock mínimo','Estado'].map((h,i) => (
                <th key={i} className={thCls}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.mats.map((m,i) => {
                const crit = parseFloat(m.stock_actual||0) <= parseFloat(m.stock_minimo||0)
                return (
                  <tr key={m.id} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                    <td className={tdCls + ' font-mono text-xs'}>{m.codigo}</td>
                    <td className={tdCls}>{m.descripcion}</td>
                    <td className={tdCls}>{m.unidad}</td>
                    <td className={tdCls}>{m.ubicacion_bodega||'—'}</td>
                    <td className={tdCls + ' font-mono font-medium'} style={{ color: crit?'#ef4444':'#1D9E75' }}>
                      {fmtNum(m.stock_actual)}
                    </td>
                    <td className={tdCls + ' font-mono'}>{fmtNum(m.stock_minimo)}</td>
                    <td className={tdCls}>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${crit?'bg-red-100 text-red-600':'bg-green-100 text-green-700'}`}>
                        {crit?'Crítico':'OK'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full">
            <thead><tr style={thStyle}>
              {['Fecha','Código','Material','Cantidad','Precio unit.','Total','Factura','Proveedor','Proyecto'].map((h,i) => (
                <th key={i} className={thCls}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.entradas.map((e,i) => {
                const m = materiales.find(x=>x.id===e.material_id)
                const p = proyectos.find(x=>x.id===e.proyecto_id)
                const total = (parseFloat(e.cantidad)||0)*(parseFloat(e.precio_unitario)||0)
                return (
                  <tr key={e.id} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                    <td className={tdCls}>{fmtDate(e.fecha_recepcion)}</td>
                    <td className={tdCls + ' font-mono text-xs'}>{m?.codigo||'—'}</td>
                    <td className={tdCls}>{m?.descripcion||'—'}</td>
                    <td className={tdCls + ' font-mono text-green-600'}>+{fmtNum(e.cantidad)} {m?.unidad}</td>
                    <td className={tdCls + ' font-mono'}>${fmtNum(e.precio_unitario)}</td>
                    <td className={tdCls + ' font-mono font-medium'}>${fmtNum(total)}</td>
                    <td className={tdCls}>{e.numero_factura||'—'}</td>
                    <td className={tdCls}>{e.proveedor||'—'}</td>
                    <td className={tdCls + ' text-xs'}>{p?.project_code||'—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full">
            <thead><tr style={thStyle}>
              {['Fecha','Código','Material','Cantidad','Proyecto','Actividad'].map((h,i) => (
                <th key={i} className={thCls}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.salidas.map((s,i) => {
                const m   = materiales.find(x=>x.id===s.material_id)
                const p   = proyectos.find(x=>x.id===s.proyecto_id)
                const act = presupuesto.find(x=>x.id===s.actividad_id)
                return (
                  <tr key={s.id} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                    <td className={tdCls}>{fmtDate(s.fecha_salida)}</td>
                    <td className={tdCls + ' font-mono text-xs'}>{m?.codigo||'—'}</td>
                    <td className={tdCls}>{m?.descripcion||'—'}</td>
                    <td className={tdCls + ' font-mono text-red-500'}>-{fmtNum(s.cantidad)} {m?.unidad}</td>
                    <td className={tdCls + ' text-xs'}>{p?.project_code||'—'}</td>
                    <td className={tdCls + ' text-xs'}>{act?`${act.code} — ${act.descripcion}`:'—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── VISTA RESUMEN GENERAL ─────────────────────────────────
function VistaGeneral({ proy, presupuesto, costos_directos, nominas, subcontratos, equipos, costos_indirectos, salidas, entradas, budget, moneda, fmt, fmtNum }) {
  const proyId = proy?.id
  const thStyle = { background: BRAND }
  const thCls   = 'px-4 py-2.5 text-left text-xs font-semibold text-white'
  const tdCls   = 'px-4 py-2.5 text-sm text-gray-700'

  const totalMat = salidas.filter(s=>s.proyecto_id===proyId).reduce((s,sa)=>{
    const e=entradas.find(en=>en.material_id===sa.material_id)
    return s+(parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0)
  },0)
  const dirs     = costos_directos.filter(c=>c.proyecto_id===proyId)
  const noms     = nominas.filter(n=>n.proyecto_id===proyId)
  const subs     = subcontratos.filter(s=>s.proyecto_id===proyId)
  const eqs      = equipos.filter(e=>e.proyecto_id===proyId)
  const inds     = costos_indirectos.filter(c=>c.proyecto_id===proyId)
  const totalDir = dirs.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  const totalNom = noms.reduce((s,n)=>s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0),0)
  const totalSub = subs.reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
  const totalEq  = eqs.reduce((s,e)=>s+(parseFloat(e.costo_total)||0),0)
  const totalInd = inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  const totalReal = totalMat+totalDir+totalNom+totalSub+totalEq+totalInd
  const desviacion = totalReal - budget

  const categorias = [
    { label: 'Materiales',        val: totalMat, items: null },
    { label: 'Costos directos',   val: totalDir, items: dirs },
    { label: 'Nómina / Planilla', val: totalNom, items: noms },
    { label: 'Subcontratos',      val: totalSub, items: subs },
    { label: 'Equipos',           val: totalEq,  items: eqs  },
    { label: 'Costos indirectos', val: totalInd, items: inds },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Info proyecto */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Información del proyecto</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            ['Código', proy?.project_code],
            ['Cliente', proy?.cliente_externo||'—'],
            ['Estado', proy?.estado],
            ['Moneda', moneda],
            ['Fecha inicio', proy?.fecha_inicio||'—'],
            ['Fecha fin est.', proy?.fecha_fin_estimada||'—'],
            ['Ciudad', proy?.ciudad||'—'],
            ['País', proy?.pais||'—'],
          ].map(([k,v],i) => (
            <div key={i}>
              <p className="text-xs text-gray-400">{k}</p>
              <p className="font-medium text-gray-700">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Presupuesto total', val: fmt(budget, moneda), color: BRAND },
          { label: 'Costo real total', val: fmt(totalReal, moneda), color: '#1D9E75' },
          { label: 'Desviación', val: `${desviacion>=0?'+':''}${fmt(desviacion,moneda)}`, color: desviacion>0?'#ef4444':'#1D9E75' },
          { label: '% Ejecución', val: budget>0?`${((totalReal/budget)*100).toFixed(1)}%`:'0%', color: BRAND },
        ].map((k,i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabla resumen */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-700">Resumen de costos</p>
        </div>
        <table className="w-full">
          <thead><tr style={thStyle}>
            <th className={thCls}>Categoría</th>
            <th className={thCls + ' text-right'}>Monto</th>
            <th className={thCls + ' text-right'}>% del total</th>
            <th className={thCls + ' text-right'}>Vs. presupuesto</th>
          </tr></thead>
          <tbody>
            {categorias.map((c,i) => (
              <tr key={i} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                <td className={tdCls}>{c.label}</td>
                <td className={tdCls + ' text-right font-mono'}>{fmt(c.val, moneda)}</td>
                <td className={tdCls + ' text-right'}>{totalReal>0?`${((c.val/totalReal)*100).toFixed(1)}%`:'—'}</td>
                <td className={tdCls + ' text-right text-xs text-gray-400'}>—</td>
              </tr>
            ))}
            <tr className="bg-gray-100">
              <td className={tdCls + ' font-bold'}>TOTAL REAL</td>
              <td className={tdCls + ' text-right font-mono font-bold'}>{fmt(totalReal, moneda)}</td>
              <td className={tdCls + ' text-right font-bold'}>100%</td>
              <td className={tdCls + ' text-right font-mono font-bold'} style={{ color: desviacion>0?'#ef4444':'#1D9E75' }}>
                {desviacion>=0?'+':''}{fmt(desviacion, moneda)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detalle Nómina */}
      {noms.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex justify-between">
            <p className="text-sm font-semibold text-gray-700">Nómina / Planilla</p>
            <span className="text-sm font-mono font-semibold" style={{ color: BRAND }}>{fmt(totalNom, moneda)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={thStyle}>
                {['Trabajador','Cargo','Período','Salario base','Deducciones','Neto'].map((h,i) => (
                  <th key={i} className={thCls}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {noms.map((n,i) => (
                  <tr key={n.id} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                    <td className={tdCls}>{n.trabajador}</td>
                    <td className={tdCls}>{n.cargo||'—'}</td>
                    <td className={tdCls + ' text-xs'}>{n.periodo_inicio} → {n.periodo_fin}</td>
                    <td className={tdCls + ' font-mono'}>{fmt(n.salario_base, moneda)}</td>
                    <td className={tdCls + ' font-mono text-red-500'}>-{fmt(n.deducciones, moneda)}</td>
                    <td className={tdCls + ' font-mono font-semibold'} style={{ color: '#1D9E75' }}>
                      {fmt((parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0), moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle Subcontratos */}
      {subs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex justify-between">
            <p className="text-sm font-semibold text-gray-700">Subcontratos</p>
            <span className="text-sm font-mono font-semibold" style={{ color: BRAND }}>{fmt(totalSub, moneda)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={thStyle}>
                {['Subcontratista','Descripción','Contrato','% Avance','Pagado'].map((h,i) => (
                  <th key={i} className={thCls}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {subs.map((s,i) => (
                  <tr key={s.id} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                    <td className={tdCls}>{s.subcontratista}</td>
                    <td className={tdCls + ' text-xs max-w-[160px] truncate'}>{s.descripcion_trabajo||'—'}</td>
                    <td className={tdCls + ' font-mono'}>{fmt(s.monto_contrato, moneda)}</td>
                    <td className={tdCls}>{fmtNum(s.avance_porcentaje)}%</td>
                    <td className={tdCls + ' font-mono font-semibold'} style={{ color: '#1D9E75' }}>{fmt(s.monto_pagado, moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
