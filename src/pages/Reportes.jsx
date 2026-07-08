import { useState, useMemo, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt, fmtNum, calcGrandTotal, r2 as round2, flatBudgetItems } from '../utils'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useAuth } from '../auth'

const BRAND    = '#1B3A6B'
const BRAND_HX = '1B3A6B'
const LIGHT_HX = 'EEF2F7'
const WHITE_HX = 'FFFFFF'
const GRAY_HX  = 'F8FAFC'
const GREEN_HX = '1D9E75'
const RED_HX   = 'EF4444'

// ── ESTADO LABELS (para funciones Excel donde t() no está disponible) ──────
const ESTADO_LABELS = {
  ES: {
    planificado:    'Planificado',
    en_ejecucion:   'En Ejecución',
    pausado:        'Pausado',
    completado:     'Completado',
    cancelado:      'Cancelado',
  },
  EN: {
    planificado:    'Planned',
    en_ejecucion:   'In Progress',
    pausado:        'On Hold',
    completado:     'Completed',
    cancelado:      'Cancelled',
  },
}
const fmtEstado = (estado, lang) => ESTADO_LABELS[lang]?.[estado] || estado || '—'

// ── HELPERS ───────────────────────────────────────────────
const inPeriodo = (f, d, h) => {
  if (!f) return false
  if (d && f < d) return false
  if (h && f > h) return false
  return true
}
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es') : '—'
const pct = (v, t) => t > 0 ? `${((v / t) * 100).toFixed(1)}%` : '—'

// ── EXCEL HELPERS ─────────────────────────────────────────
const border = () => ({
  top:    { style: 'thin', color: { argb: 'FFD0D7DE' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
  left:   { style: 'thin', color: { argb: 'FFD0D7DE' } },
  right:  { style: 'thin', color: { argb: 'FFD0D7DE' } },
})

const thickBorder = () => ({
  top:    { style: 'medium', color: { argb: 'FF' + BRAND_HX } },
  bottom: { style: 'medium', color: { argb: 'FF' + BRAND_HX } },
  left:   { style: 'medium', color: { argb: 'FF' + BRAND_HX } },
  right:  { style: 'medium', color: { argb: 'FF' + BRAND_HX } },
})

function styleHeader(cell) {
  cell.font      = { bold: true, color: { argb: 'FF' + WHITE_HX }, size: 10, name: 'Arial' }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_HX } }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  cell.border    = border()
}

function styleTitle(cell) {
  cell.font      = { bold: true, size: 14, name: 'Arial', color: { argb: 'FF' + BRAND_HX } }
  cell.alignment = { vertical: 'middle' }
}

function styleSubtitle(cell) {
  cell.font      = { size: 10, name: 'Arial', color: { argb: 'FF64748B' } }
  cell.alignment = { vertical: 'middle' }
}

function styleLabel(cell) {
  cell.font      = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND_HX } }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_HX } }
  cell.border    = border()
  cell.alignment = { vertical: 'middle' }
}

function styleData(cell, opts = {}) {
  cell.font      = { bold: opts.bold||false, size: 10, name: 'Arial', color: { argb: 'FF' + (opts.color||'000000') } }
  cell.border    = border()
  cell.alignment = { vertical: 'middle', horizontal: opts.align||'left' }
  if (opts.even) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GRAY_HX } }
  if (opts.numFmt) cell.numFmt = opts.numFmt
}

function styleTotal(cell) {
  cell.font      = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + WHITE_HX } }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_HX } }
  cell.border    = border()
  cell.alignment = { horizontal: 'right', vertical: 'middle' }
}

function styleSectionTitle(cell) {
  cell.font      = { bold: true, size: 11, name: 'Arial', color: { argb: 'FF' + WHITE_HX } }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  cell.alignment = { vertical: 'middle' }
  cell.border    = border()
}

function addHeaderBlock(ws, titulo, empresa, proyecto, periodo, fecha, cols) {
  // Fila 1 — Logo / Empresa
  ws.mergeCells(1, 1, 1, Math.floor(cols / 3))
  const c1 = ws.getCell(1, 1)
  c1.value = empresa
  c1.font  = { bold: true, size: 13, name: 'Arial', color: { argb: 'FF' + BRAND_HX } }
  c1.alignment = { vertical: 'middle' }
  c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } }
  c1.border = thickBorder()
  ws.getRow(1).height = 28

  // Centro — Titulo reporte
  const midStart = Math.floor(cols / 3) + 1
  const midEnd   = Math.floor((cols * 2) / 3)
  ws.mergeCells(1, midStart, 1, midEnd)
  const c2 = ws.getCell(1, midStart)
  c2.value = titulo.toUpperCase()
  c2.font  = { bold: true, size: 13, name: 'Arial', color: { argb: 'FF' + WHITE_HX } }
  c2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_HX } }
  c2.alignment = { horizontal: 'center', vertical: 'middle' }
  c2.border = thickBorder()

  // Derecha — Fecha y código
  ws.mergeCells(1, midEnd + 1, 1, cols)
  const c3 = ws.getCell(1, midEnd + 1)
  c3.value = `MARY ERP\n${fecha}`
  c3.font  = { size: 9, name: 'Arial', color: { argb: 'FF' + BRAND_HX } }
  c3.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } }
  c3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  c3.border = thickBorder()

  // Fila 2 — Info proyecto
  ws.getRow(2).height = 20
  if (proyecto) {
    ws.mergeCells(2, 1, 2, Math.floor(cols / 2))
    const p = ws.getCell(2, 1)
    p.value = `Proyecto: ${proyecto}`
    styleLabel(p)
  }
  if (periodo) {
    ws.mergeCells(2, Math.floor(cols / 2) + 1, 2, cols)
    const pe = ws.getCell(2, Math.floor(cols / 2) + 1)
    pe.value = `Período: ${periodo}`
    styleLabel(pe)
  } else if (!proyecto) {
    ws.mergeCells(2, 1, 2, cols)
    const p2 = ws.getCell(2, 1)
    p2.value = empresa
    styleSubtitle(p2)
  }

  return 4 // primera fila de datos
}

function addSectionTitle(ws, row, label, cols) {
  ws.mergeCells(row, 1, row, cols)
  const c = ws.getCell(row, 1)
  c.value = label
  styleSectionTitle(c)
  ws.getRow(row).height = 18
  return row + 1
}

function setCols(ws, widths) {
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w })
}

// ── EXPORT FINANCIERO ─────────────────────────────────────
async function buildFinanciero({ data, budget, moneda, proy, desde, hasta, presupuesto, lang='ES', nombreEmpresa='Marquez Project Solutions LLC' }) {
  const isEs = lang === 'ES'
  const wb  = new ExcelJS.Workbook()
  wb.creator = `MARY ERP — ${nombreEmpresa}`
  wb.created = new Date()

  const proyLabel    = `${proy?.project_code} — ${proy?.nombre}`
  const periodoLabel = desde || hasta ? `${desde||( isEs?'inicio':'start')} al ${hasta||(isEs?'hoy':'today')}` : (isEs?'Todo el período':'Full period')
  const fechaHoy     = new Date().toLocaleDateString(isEs?'es':'en-US')
  const COLS         = 7

  // ── HOJA 1: Resumen ──
  const ws1 = wb.addWorksheet(isEs?'Presupuesto vs Real':'Budget vs Actual')
  setCols(ws1, [32, 18, 14, 14, 14, 14, 12])

  let row = addHeaderBlock(ws1, isEs?'Reporte Financiero':'Financial Report', nombreEmpresa, proyLabel, periodoLabel, fechaHoy, COLS)

  // KPIs
  row = addSectionTitle(ws1, row, isEs?'RESUMEN EJECUTIVO':'EXECUTIVE SUMMARY', COLS)
  const totalReal  = data.resumen.reduce((s,r) => s+r.real, 0)
  const desviacion = totalReal - budget
  const kpis = [
    [isEs?'Presupuesto total':'Total budget', budget, '', isEs?'Costo real ejecutado':'Real cost executed', totalReal, ''],
    [isEs?'Desviación':'Deviation', desviacion, '', isEs?'% Ejecución':'% Execution', budget>0?totalReal/budget:0, ''],
  ]
  kpis.forEach((krow, ki) => {
    ws1.getRow(row).height = 20
    const lc1 = ws1.getCell(row, 1); lc1.value = krow[0]; styleLabel(lc1)
    const dc1 = ws1.getCell(row, 2); dc1.value = krow[1]; styleData(dc1, { bold:true, numFmt:'"$"#,##0.00', align:'right', color: ki===1&&desviacion>0?RED_HX:GREEN_HX })
    ws1.mergeCells(row, 3, row, 3)
    const lc2 = ws1.getCell(row, 4); lc2.value = krow[3]; styleLabel(lc2)
    const dc2 = ws1.getCell(row, 5)
    if (ki === 1) { dc2.value = krow[4]; dc2.numFmt = '0.0%'; styleData(dc2, { bold:true, align:'right' }) }
    else          { dc2.value = krow[4]; styleData(dc2, { bold:true, numFmt:'"$"#,##0.00', align:'right', color:GREEN_HX }) }
    ws1.mergeCells(row, 6, row, COLS)
    row++
  })

  row++
  row = addSectionTitle(ws1, row, isEs?'RESUMEN DE GASTOS POR CATEGORÍA':'COST SUMMARY BY CATEGORY', COLS)

  // Headers
  ws1.getRow(row).height = 18
  ;[isEs?'Categoría':'Category', isEs?'Costo Real':'Real Cost', isEs?'% del Total':'% of Total', '', '', '', ''].forEach((h, i) => {
    const c = ws1.getCell(row, i+1); c.value = h; styleHeader(c)
  })
  row++

  data.resumen.forEach((r, i) => {
    ws1.getRow(row).height = 17
    const even = i % 2 === 1
    const c1 = ws1.getCell(row, 1); c1.value = r.categoria; styleData(c1, { even })
    const c2 = ws1.getCell(row, 2); c2.value = r.real; styleData(c2, { even, numFmt:'"$"#,##0.00', align:'right' })
    const c3 = ws1.getCell(row, 3); c3.value = totalReal>0?r.real/totalReal:0; styleData(c3, { even, numFmt:'0.0%', align:'right' })
    ws1.mergeCells(row, 4, row, COLS);
    row++
  })
  // Total
  ws1.getRow(row).height = 18
  const tl = ws1.getCell(row, 1); tl.value = isEs?'TOTAL REAL':'TOTAL ACTUAL'; styleTotal(tl)
  const tv = ws1.getCell(row, 2); tv.value = totalReal; tv.numFmt = '"$"#,##0.00'; styleTotal(tv)
  const tp = ws1.getCell(row, 3); tp.value = 1; tp.numFmt = '0.0%'; styleTotal(tp)
  ws1.mergeCells(row, 4, row, COLS)
  row += 2

  // Presupuesto vs Real por actividad
  row = addSectionTitle(ws1, row, isEs?'PRESUPUESTO VS REAL POR ACTIVIDAD':'BUDGET VS ACTUAL BY ACTIVITY', COLS)
  ws1.getRow(row).height = 18
  ;[isEs?'Código':'Code',isEs?'Actividad':'Activity',isEs?'Presupuestado':'Budgeted',isEs?'Real':'Actual',isEs?'Saldo en Presupuesto $':'Budget Balance $',isEs?'S.%':'B.%',isEs?'Estado':'Status'].forEach((h,i) => {
    const c = ws1.getCell(row, i+1); c.value = h; styleHeader(c)
  })
  row++

  data.actividades.forEach((a, i) => {
    ws1.getRow(row).height = 17
    const even     = i % 2 === 1
    const saldo    = a.pres - a.real
    const devClr   = saldo >= 0 ? GREEN_HX : RED_HX
    const pctUsado = a.pres > 0 ? (a.real / a.pres) * 100 : 0
    const status   = pctUsado <= 100 ? '✓ OK' : pctUsado <= 115 ? (isEs?'⚠ Alerta':'⚠ Alert') : (isEs?'⚠ Crítico':'⚠ Critical')
    const c1 = ws1.getCell(row,1); c1.value=a.code;        styleData(c1,{even})
    const c2 = ws1.getCell(row,2); c2.value=a.descripcion; styleData(c2,{even})
    const c3 = ws1.getCell(row,3); c3.value=a.pres;        styleData(c3,{even,numFmt:'"$"#,##0.00',align:'right'})
    const c4 = ws1.getCell(row,4); c4.value=a.real;        styleData(c4,{even,numFmt:'"$"#,##0.00',align:'right'})
    const c5 = ws1.getCell(row,5); c5.value=saldo;         styleData(c5,{even,numFmt:'"$"#,##0.00',align:'right',color:devClr,bold:true})
    const c6 = ws1.getCell(row,6); c6.value=a.pres>0?saldo/a.pres:0; styleData(c6,{even,numFmt:'0.0%',align:'right',color:devClr})
    const c7 = ws1.getCell(row,7); c7.value=status;        styleData(c7,{even,color:pctUsado<=100?GREEN_HX:RED_HX,bold:true})
    row++
  })

  // ── HOJA 2: Detalle por categoría ──
  const ws2 = wb.addWorksheet(isEs?'Detalle por Categoría':'Detail by Category')
  setCols(ws2, [14, 20, 35, 22, 16, 16, 16])
  let r2 = addHeaderBlock(ws2, isEs?'Detalle de Costos':'Cost Detail', nombreEmpresa, proyLabel, periodoLabel, fechaHoy, 7)

  const addDetalle = (ws, rowRef, titulo, headers, rows, subtotal) => {
    rowRef = addSectionTitle(ws, rowRef, titulo, 7)
    ws.getRow(rowRef).height = 18
    headers.forEach((h,i) => { const c=ws.getCell(rowRef,i+1); c.value=h; styleHeader(c) })
    rowRef++
    rows.forEach((rdata, ri) => {
      ws.getRow(rowRef).height = 16
      const even = ri%2===1
      rdata.forEach((v,ci) => {
        const c = ws.getCell(rowRef, ci+1)
        const isNum = typeof v === 'number'
        styleData(c, { even, numFmt: isNum?'"$"#,##0.00':undefined, align: isNum?'right':'left' })
        c.value = v
      })
      rowRef++
    })
    // Subtotal
    ws.mergeCells(rowRef, 1, rowRef, headers.length-1)
    const sc = ws.getCell(rowRef, 1); sc.value='SUBTOTAL'; styleTotal(sc)
    const sv = ws.getCell(rowRef, headers.length); sv.value=subtotal; sv.numFmt='"$"#,##0.00'; styleTotal(sv)
    rowRef += 2
    return rowRef
  }

  r2 = addDetalle(ws2, r2,
    isEs?'COSTOS DIRECTOS':'DIRECT COSTS',
    [isEs?'Fecha':'Date',isEs?'Tipo':'Type',isEs?'Descripción':'Description',isEs?'Actividad':'Activity',isEs?'Documento':'Document',isEs?'Monto':'Amount'],
    data.dirs.map(c => [c.fecha||'',c.tipo||'',c.descripcion||'',
      presupuesto.find(b=>b.id===c.actividad_id)?.descripcion||'—',
      c.numero_documento||'—', parseFloat(c.monto)||0]),
    data.dirs.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  )

  r2 = addDetalle(ws2, r2,
    isEs?'NÓMINA / PLANILLA':'PAYROLL',
    [isEs?'Período inicio':'Period start',isEs?'Período fin':'Period end',isEs?'Trabajador':'Worker',isEs?'Cargo':'Position',isEs?'Salario base':'Base salary',isEs?'Deducciones':'Deductions',isEs?'Neto':'Net'],
    data.noms.map(n => [n.periodo_inicio||'',n.periodo_fin||'',n.trabajador||'',n.cargo||'',
      parseFloat(n.salario_base)||0, parseFloat(n.deducciones)||0,
      (parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0)]),
    data.noms.reduce((s,n)=>s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0),0)
  )

  r2 = addDetalle(ws2, r2,
    isEs?'SUBCONTRATOS':'SUBCONTRACTS',
    [isEs?'Subcontratista':'Subcontractor',isEs?'Descripción trabajo':'Work description',isEs?'Actividad':'Activity',isEs?'Contrato':'Contract',isEs?'% Avance':'% Progress',isEs?'Pagado':'Paid'],
    data.subs.map(s => [s.subcontratista||'',s.descripcion_trabajo||'',
      presupuesto.find(b=>b.id===s.actividad_id)?.descripcion||'—',
      parseFloat(s.monto_contrato)||0, parseFloat(s.avance_porcentaje)||0, parseFloat(s.monto_pagado)||0]),
    data.subs.reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
  )

  r2 = addDetalle(ws2, r2,
    isEs?'EQUIPOS':'EQUIPMENT',
    [isEs?'Descripción':'Description',isEs?'Tipo':'Type',isEs?'Tarifa diaria':'Daily rate',isEs?'Días de uso':'Days used',isEs?'Costo total':'Total cost'],
    data.eqs.map(e => {
      const costoFinal = (e.costo_real && (e.estado_equipo==='ajustado'||e.estado_equipo==='cerrado_parcial'))
        ? parseFloat(e.costo_real) : parseFloat(e.costo_total)||0
      return [e.descripcion||'', e.tipo||'', parseFloat(e.tarifa_diaria)||0, parseFloat(e.dias_uso)||0, costoFinal]
    }),
    data.eqs.reduce((s,e)=>{
      const c = (e.costo_real && (e.estado_equipo==='ajustado'||e.estado_equipo==='cerrado_parcial'))
        ? parseFloat(e.costo_real) : parseFloat(e.costo_total)||0
      return s+c
    },0)
  )

  r2 = addDetalle(ws2, r2,
    isEs?'COSTOS INDIRECTOS':'INDIRECT COSTS',
    [isEs?'Fecha':'Date',isEs?'Categoría':'Category',isEs?'Descripción':'Description',isEs?'Monto':'Amount'],
    data.inds.map(c => [c.fecha||c.created_at?.slice(0,10)||'',c.categoria||'',c.descripcion||'',parseFloat(c.monto)||0]),
    data.inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  )

  // ── HOJA 3: Avalúo financiero acumulado ──
  if (data.avsProy?.length > 0) {
    const ws3 = wb.addWorksheet(isEs?'Avalúo Financiero':'Financial Valuation')
    setCols(ws3, [14, 36, 12, 14, 16, 16, 16, 16, 16])
    let r3 = addHeaderBlock(ws3, isEs?'Avalúo Financiero Acumulado':'Accumulated Financial Valuation', nombreEmpresa, proyLabel, periodoLabel, fechaHoy, 9)
    ws3.getRow(r3).height = 18
    ;[isEs?'Avalúo':'Valuation',isEs?'Actividad':'Activity',isEs?'Unidad':'Unit','P.U.',isEs?'Contrato $':'Contract $',isEs?'Ant. $':'Prev. $',isEs?'Periodo $':'Period $',isEs?'Acumulado $':'Accumulated $',isEs?'Saldo $':'Balance $'].forEach((h,i) => {
      const c = ws3.getCell(r3,i+1); c.value=h; styleHeader(c)
    })
    r3++
    let totalAcum = 0
    let totalSaldo = 0
    data.avsProy.forEach(av => {
      const avItems = data.avsItems.filter(i => i.avaluo_id === av.id)
      avItems.forEach((it, idx) => {
        ws3.getRow(r3).height = 16
        const even = idx % 2 === 1
        const contrato  = parseFloat(it.monto_contrato||0)
        const acumulado = parseFloat(it.monto_acumulado||0)
        const saldo     = contrato - acumulado
        const vals = [
          av.numero_avaluo || av.folio || '—',
          it.descripcion || '—',
          it.unidad || '—',
          parseFloat(it.precio_unitario||0),
          contrato,
          parseFloat(it.monto_anterior||0),
          parseFloat(it.monto_periodo||0),
          acumulado,
          saldo,
        ]
        vals.forEach((v,ci) => {
          const c = ws3.getCell(r3,ci+1)
          const isNum = ci >= 3
          styleData(c, { even, align:isNum?'right':'left', numFmt:isNum?'"$"#,##0.00':undefined })
          c.value = v
          if (ci === 8 && typeof v === 'number') {
            c.font = { ...c.font, color: { argb: v < 0 ? 'FFDC2626' : 'FF374151' } }
          }
        })
        totalAcum  += acumulado
        totalSaldo += saldo
        r3++
      })
    })
    ws3.mergeCells(r3,1,r3,7); const at=ws3.getCell(r3,1); at.value=isEs?'TOTAL ACUMULADO COBRADO':'TOTAL ACCUMULATED BILLED'; styleTotal(at)
    const av=ws3.getCell(r3,8);  av.value=totalAcum;   av.numFmt='"$"#,##0.00'; styleTotal(av)
    const avs=ws3.getCell(r3,9); avs.value=totalSaldo; avs.numFmt='"$"#,##0.00'; styleTotal(avs)
  }

  // ── HOJA 4: Costos indirectos presupuestados vs ejecutados ──
  if (data.comparacionInd?.length > 0) {
    const ws4 = wb.addWorksheet(isEs?'Indirectos Pres vs Ejec':'Indirect Costs Bud vs Act')
    setCols(ws4, [40, 20, 20, 20, 16])
    let r4 = addHeaderBlock(ws4, isEs?'Costos Indirectos: Presupuestado vs Ejecutado':'Indirect Costs: Budgeted vs Executed', nombreEmpresa, proyLabel, periodoLabel, fechaHoy, 5)
    ws4.getRow(r4).height = 18
    ;[isEs?'Categoría':'Category',isEs?'Presupuestado':'Budgeted',isEs?'Ejecutado':'Executed',isEs?'Diferencia':'Difference',isEs?'Estado':'Status'].forEach((h,i) => {
      const c = ws4.getCell(r4,i+1); c.value=h; styleHeader(c)
    })
    r4++
    let totPres=0, totEjec=0
    data.comparacionInd.forEach((r, idx) => {
      ws4.getRow(r4).height = 17
      const even   = idx%2===1
      const status = r.diferencia < 0 ? (isEs?'Sobrecosto':'Overrun') : r.diferencia === 0 ? (isEs?'En punto':'On target') : (isEs?'Ahorro':'Saving')
      const clr    = r.diferencia < 0 ? RED_HX : GREEN_HX
      const c1=ws4.getCell(r4,1); c1.value=r.categoria; styleData(c1,{even})
      const c2=ws4.getCell(r4,2); c2.value=r.presupuestado; styleData(c2,{even,numFmt:'"$"#,##0.00',align:'right'})
      const c3=ws4.getCell(r4,3); c3.value=r.ejecutado;    styleData(c3,{even,numFmt:'"$"#,##0.00',align:'right'})
      const c4=ws4.getCell(r4,4); c4.value=r.diferencia;   styleData(c4,{even,numFmt:'"$"#,##0.00',align:'right',color:clr,bold:true})
      const c5=ws4.getCell(r4,5); c5.value=status;         styleData(c5,{even,color:clr,bold:true})
      totPres+=r.presupuestado; totEjec+=r.ejecutado
      r4++
    })
    ws4.getRow(r4).height=18
    const tl=ws4.getCell(r4,1); tl.value=isEs?'TOTAL':'TOTAL'; styleTotal(tl)
    const tp=ws4.getCell(r4,2); tp.value=totPres; tp.numFmt='"$"#,##0.00'; styleTotal(tp)
    const te=ws4.getCell(r4,3); te.value=totEjec; te.numFmt='"$"#,##0.00'; styleTotal(te)
    const td=ws4.getCell(r4,4); td.value=totPres-totEjec; td.numFmt='"$"#,##0.00'; styleTotal(td)
    ws4.mergeCells(r4,5,r4,5); const ts=ws4.getCell(r4,5); ts.value=''; styleTotal(ts)
  }

  // ── HOJA 5: Órdenes de Cambio ──
  if (data.ocsDelProy?.length > 0) {
    const ws5 = wb.addWorksheet(isEs ? 'Órdenes de Cambio' : 'Change Orders')
    setCols(ws5, [16, 12, 14, 32, 16, 16, 12])
    let r5 = addHeaderBlock(ws5, isEs ? 'Órdenes de Cambio' : 'Change Orders', nombreEmpresa, proyLabel, periodoLabel, fechaHoy, 7)

    // KPI resumen en la hoja
    ws5.getRow(r5).height = 20
    const kOrig = ws5.getCell(r5, 1); kOrig.value = isEs ? 'Presupuesto original' : 'Original budget'; styleLabel(kOrig)
    const vOrig = ws5.getCell(r5, 2); vOrig.value = budget; vOrig.numFmt = '"$"#,##0.00'; styleData(vOrig, { bold: true, align: 'right' })
    const kDelta = ws5.getCell(r5, 3); kDelta.value = isEs ? 'Variación OCs' : 'CO variation'; styleLabel(kDelta)
    const vDelta = ws5.getCell(r5, 4); vDelta.value = data.deltaOCs; vDelta.numFmt = '"$"#,##0.00'
    styleData(vDelta, { bold: true, align: 'right', color: data.deltaOCs > 0 ? GREEN_HX : RED_HX })
    const kRev = ws5.getCell(r5, 5); kRev.value = isEs ? 'Presupuesto revisado' : 'Revised budget'; styleLabel(kRev)
    const vRev = ws5.getCell(r5, 6); vRev.value = data.budgetRevisado; vRev.numFmt = '"$"#,##0.00'; styleData(vRev, { bold: true, align: 'right', color: 'F59E0B' })
    ws5.mergeCells(r5, 7, r5, 7)
    r5 += 2

    // Tabla de OCs
    r5 = addSectionTitle(ws5, r5, isEs ? 'DETALLE DE ÓRDENES DE CAMBIO' : 'CHANGE ORDER DETAIL', 7)
    ws5.getRow(r5).height = 18
    ;[isEs?'Número':'Number', isEs?'Fecha':'Date', isEs?'Estado':'Status',
      isEs?'Motivo':'Reason', isEs?'Presentado a':'Submitted to',
      isEs?'Total OC':'CO Total', isEs?'% variación':'% variation'
    ].forEach((h, i) => { const c = ws5.getCell(r5, i+1); c.value = h; styleHeader(c) })
    r5++

    const ESTADO_LABELS = {
      borrador:   isEs ? 'Borrador'   : 'Draft',
      presentada: isEs ? 'Presentada' : 'Submitted',
      aprobada:   isEs ? 'Aprobada'   : 'Approved',
      rechazada:  isEs ? 'Rechazada'  : 'Rejected',
    }
    data.ocsDelProy.forEach((oc, i) => {
      ws5.getRow(r5).height = 17
      const even   = i % 2 === 1
      const total  = parseFloat(oc.total_oc || 0)
      const varPct = budget > 0 ? total / budget : 0
      const isAprobada = oc.estado === 'aprobada'
      const c1 = ws5.getCell(r5,1); c1.value = oc.numero || '—';          styleData(c1, { even })
      const c2 = ws5.getCell(r5,2); c2.value = oc.fecha || '—';           styleData(c2, { even })
      const c3 = ws5.getCell(r5,3); c3.value = ESTADO_LABELS[oc.estado] || oc.estado
      styleData(c3, { even, bold: true, color: isAprobada ? GREEN_HX : oc.estado === 'rechazada' ? RED_HX : '000000' })
      const c4 = ws5.getCell(r5,4); c4.value = oc.motivo || '—';          styleData(c4, { even })
      const c5 = ws5.getCell(r5,5); c5.value = oc.presentado_a || '—';    styleData(c5, { even })
      const c6 = ws5.getCell(r5,6); c6.value = total; c6.numFmt = '"$"#,##0.00'
      styleData(c6, { even, align: 'right', bold: true, color: isAprobada ? GREEN_HX : '000000' })
      const c7 = ws5.getCell(r5,7); c7.value = varPct; c7.numFmt = '0.00%'
      styleData(c7, { even, align: 'right' })
      r5++
    })

    // Total aprobado
    ws5.getRow(r5).height = 18
    ws5.mergeCells(r5, 1, r5, 5)
    const tl5 = ws5.getCell(r5, 1); tl5.value = isEs ? 'TOTAL APROBADO' : 'TOTAL APPROVED'; styleTotal(tl5)
    const tv5 = ws5.getCell(r5, 6); tv5.value = data.deltaOCs; tv5.numFmt = '"$"#,##0.00'; styleTotal(tv5)
    const tp5 = ws5.getCell(r5, 7); tp5.value = budget > 0 ? data.deltaOCs / budget : 0; tp5.numFmt = '0.00%'; styleTotal(tp5)
  }

  // ── HOJA 6: Subcontratos detallados (nuevo sistema) ──────────────────────────
  if (data.scContratos?.length > 0) {
    const ws6 = wb.addWorksheet(isEs ? 'Detalle Subcontratos' : 'Subcontract Detail')
    setCols(ws6, [28, 30, 16, 16, 16, 12, 16, 16])
    let r6 = addHeaderBlock(ws6, isEs ? 'Detalle de Subcontratos' : 'Subcontract Detail',
      nombreEmpresa, proyLabel, periodoLabel, fechaHoy, 8)
    // Headers
    ws6.getRow(r6).height = 18
    ;[isEs?'Subcontratista':'Subcontractor',
      isEs?'Descripción':'Description',
      isEs?'Monto Contrato':'Contract Amount',
      isEs?'Avaluado (aprob.)':'Valued (appr.)',
      isEs?'Saldo':'Balance',
      isEs?'% Retención':'Retention %',
      isEs?'Total Retenido':'Total Retained',
      isEs?'Estado':'Status',
    ].forEach((h, i) => { const c = ws6.getCell(r6, i+1); c.value = h; styleHeader(c) })
    r6++
    let totContrato = 0, totValuado = 0, totRetenido = 0
    data.scContratos.forEach((sc, idx) => {
      ws6.getRow(r6).height = 17
      const even     = idx % 2 === 1
      const valuado  = data.scAvaluosDetalle
        .filter(a => a.subcontrato_id === sc.id)
        .reduce((s, a) => s + parseFloat(a.monto_total||0), 0)
      const saldo    = parseFloat(sc.monto_total||0) - valuado
      const retenido = data.scAvaluosDetalle
        .filter(a => a.subcontrato_id === sc.id)
        .reduce((s, a) => s + parseFloat(a.retencion_monto||0), 0)
      const estado   = sc.estado === 'activo' ? (isEs?'Activo':'Active') :
                       sc.estado === 'completado' ? (isEs?'Completado':'Completed') : sc.estado
      totContrato += parseFloat(sc.monto_total||0)
      totValuado  += valuado
      totRetenido += retenido
      const vals = [
        sc.subcontratista, sc.descripcion||'—',
        parseFloat(sc.monto_total||0), valuado, saldo,
        parseFloat(sc.retencion_pct||0)/100, retenido, estado,
      ]
      vals.forEach((v, ci) => {
        const c   = ws6.getCell(r6, ci+1)
        const num = [2,3,4,6].includes(ci)
        const pct = ci === 5
        styleData(c, {
          even,
          numFmt: num ? '"$"#,##0.00' : pct ? '0.0%' : undefined,
          align:  (num || pct) ? 'right' : 'left',
          color:  ci === 4 ? (saldo < 0 ? RED_HX : GREEN_HX) : '000000',
          bold:   ci === 4,
        })
        c.value = v
      })
      r6++
    })
    // Totales
    ws6.getRow(r6).height = 18
    ws6.mergeCells(r6, 1, r6, 2)
    const tl6 = ws6.getCell(r6, 1); tl6.value = isEs ? 'TOTAL' : 'TOTAL'; styleTotal(tl6)
    const t6c = ws6.getCell(r6, 3); t6c.value = totContrato; t6c.numFmt = '"$"#,##0.00'; styleTotal(t6c)
    const t6v = ws6.getCell(r6, 4); t6v.value = totValuado;  t6v.numFmt = '"$"#,##0.00'; styleTotal(t6v)
    const t6s = ws6.getCell(r6, 5); t6s.value = totContrato - totValuado; t6s.numFmt = '"$"#,##0.00'; styleTotal(t6s)
    ws6.mergeCells(r6, 6, r6, 7)
    const t6r = ws6.getCell(r6, 7); t6r.value = totRetenido; t6r.numFmt = '"$"#,##0.00'; styleTotal(t6r)
  }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${isEs?'Reporte_Financiero':'Financial_Report'}_${proy?.project_code}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── EXPORT ORDEN DE PAGO DE RETENCIÓN (OPR) ──────────────
export async function buildOPR({ orden, retenciones, contrato, proy, usuario, lang='ES', nombreEmpresa='Marquez Project Solutions LLC' }) {
  const isEs    = lang === 'ES'
  const COLS    = 7
  const wb      = new ExcelJS.Workbook()
  wb.creator    = 'MARY ERP'

  // ── Constantes de color locales ──────────────────────────────────────────
  const BRAND   = '1B3A6B'
  const GREEN   = '1D9E75'
  const AMBER   = 'F59E0B'
  const LIGHT   = 'EEF2F7'
  const GRAY    = 'F8FAFC'

  const fechaHoy   = new Date().toLocaleDateString(isEs ? 'es' : 'en-US')
  const proyLabel  = proy ? `${proy.project_code} — ${proy.nombre}` : ''

  const ws = wb.addWorksheet(isEs ? 'Orden de Pago' : 'Payment Order')
  setCols(ws, [22, 18, 18, 16, 16, 18, 18])

  // helpers locales
  const bord = () => ({
    top:    { style: 'thin', color: { argb: 'FFD0D7DE' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
    left:   { style: 'thin', color: { argb: 'FFD0D7DE' } },
    right:  { style: 'thin', color: { argb: 'FFD0D7DE' } },
  })
  const thickB = () => ({
    top:    { style: 'medium', color: { argb: 'FF' + BRAND } },
    bottom: { style: 'medium', color: { argb: 'FF' + BRAND } },
    left:   { style: 'medium', color: { argb: 'FF' + BRAND } },
    right:  { style: 'medium', color: { argb: 'FF' + BRAND } },
  })

  const cell = (r, c) => ws.getCell(r, c)
  const merge = (r1, c1, r2, c2) => ws.mergeCells(r1, c1, r2, c2)

  // ── BLOQUE HEADER ─────────────────────────────────────────────────────────
  ws.getRow(1).height = 34
  merge(1, 1, 1, 3)
  const h1 = cell(1, 1)
  h1.value     = nombreEmpresa
  h1.font      = { bold: true, size: 13, name: 'Arial', color: { argb: 'FF' + BRAND } }
  h1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  h1.alignment = { vertical: 'middle' }
  h1.border    = thickB()

  merge(1, 4, 1, 5)
  const h2 = cell(1, 4)
  h2.value     = isEs ? 'ORDEN DE PAGO DE RETENCIÓN' : 'RETENTION PAYMENT ORDER'
  h2.font      = { bold: true, size: 13, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  h2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
  h2.alignment = { horizontal: 'center', vertical: 'middle' }
  h2.border    = thickB()

  merge(1, 6, 1, COLS)
  const h3 = cell(1, 6)
  h3.value     = `MARY ERP\n${fechaHoy}`
  h3.font      = { size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
  h3.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  h3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  h3.border    = thickB()

  // ── FILA INFO GENERAL ─────────────────────────────────────────────────────
  ws.getRow(2).height = 18
  merge(2, 1, 2, 3)
  const i1 = cell(2, 1); i1.value = `${isEs?'Proyecto':'Project'}: ${proyLabel}`
  i1.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  i1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  i1.alignment = { vertical: 'middle' }; i1.border = thickB()

  merge(2, 4, 2, 5)
  const i2 = cell(2, 4); i2.value = `N°: ${orden.numero_orden}`
  i2.font = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  i2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } }
  i2.alignment = { horizontal: 'center', vertical: 'middle' }; i2.border = thickB()

  merge(2, 6, 2, COLS)
  const i3 = cell(2, 6); i3.value = `${isEs?'Fecha':'Date'}: ${orden.fecha_orden}`
  i3.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  i3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  i3.alignment = { vertical: 'middle' }; i3.border = thickB()

  // ── SECCIÓN: DATOS DEL SUBCONTRATISTA ────────────────────────────────────
  let row = 4
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  const sec1 = cell(row, 1)
  sec1.value = isEs ? 'DATOS DEL SUBCONTRATISTA' : 'SUBCONTRACTOR INFORMATION'
  sec1.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec1.alignment = { vertical: 'middle' }; sec1.border = bord()
  row++

  const infoRows = [
    [isEs?'Subcontratista / Payee:':'Subcontractor / Payee:', contrato?.subcontratista || orden.subcontratista],
    [isEs?'Descripción del contrato:':'Contract description:', contrato?.descripcion || '—'],
    [isEs?'Monto del contrato:':'Contract amount:', contrato?.monto_total
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contrato.monto_total)
      : '—'],
  ]
  infoRows.forEach(([lbl, val]) => {
    ws.getRow(row).height = 17
    merge(row, 1, row, 2)
    const lc = cell(row, 1)
    lc.value = lbl; lc.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
    lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
    lc.border = bord(); lc.alignment = { vertical: 'middle' }
    merge(row, 3, row, COLS)
    const vc = cell(row, 3)
    vc.value = val; vc.font = { size: 10, name: 'Arial' }
    vc.border = bord(); vc.alignment = { vertical: 'middle' }
    row++
  })
  row++ // espaciado

  // ── SECCIÓN: DETALLE DE RETENCIONES ──────────────────────────────────────
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  const sec2 = cell(row, 1)
  sec2.value = isEs ? 'DETALLE DE RETENCIONES A PAGAR' : 'RETENTION PAYMENT DETAIL'
  sec2.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec2.alignment = { vertical: 'middle' }; sec2.border = bord()
  row++

  // Headers tabla
  ws.getRow(row).height = 18
  const tHeaders = isEs
    ? ['Avalúo #', 'Fecha Retención', 'Devolución Est.', '% Retención', 'Monto Retenido', 'Fecha Liberación', 'Estado']
    : ['Valuation #', 'Retention Date', 'Est. Release', 'Retention %', 'Amount Retained', 'Release Date', 'Status']
  tHeaders.forEach((h, i) => {
    const c2 = cell(row, i + 1)
    c2.value = h
    c2.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' }
    c2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
    c2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c2.border = bord()
  })
  row++

  let totalMonto = 0
  retenciones.forEach((r, idx) => {
    ws.getRow(row).height = 17
    const even   = idx % 2 === 1
    const bg     = even ? 'FFF8FAFC' : 'FFFFFFFF'
    const status = r.estado === 'devuelta' ? (isEs ? 'Liberada' : 'Released') :
                   r.estado === 'pagada'   ? (isEs ? 'Pagada'   : 'Paid')     :
                                             (isEs ? 'Retenida' : 'Retained')
    const monto  = parseFloat(r.monto_retenido || 0)
    totalMonto  += monto
    const vals = [
      `#${r.numero_avaluo || '—'}`,
      r.fecha_retencion || '—',
      r.fecha_devolucion_est || '—',
      (parseFloat(r.retencion_pct || 0) / 100),
      monto,
      r.fecha_devolucion_real || '—',
      status,
    ]
    vals.forEach((v, ci) => {
      const c3 = cell(row, ci + 1)
      c3.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      c3.border    = bord()
      c3.alignment = { vertical: 'middle', horizontal: [3, 4].includes(ci) ? 'right' : 'center' }
      if (ci === 3) { c3.numFmt = '0.0%'; c3.value = v }
      else if (ci === 4) { c3.numFmt = '"$"#,##0.00'; c3.value = v; c3.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } } }
      else { c3.value = v; c3.font = { size: 10, name: 'Arial' } }
    })
    row++
  })

  // Fila total
  ws.getRow(row).height = 20
  merge(row, 1, row, 4)
  const tl = cell(row, 1)
  tl.value = isEs ? 'TOTAL A PAGAR' : 'TOTAL TO PAY'
  tl.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  tl.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
  tl.alignment = { horizontal: 'right', vertical: 'middle' }
  tl.border = bord()
  merge(row, 5, row, COLS)
  const tv = cell(row, 5)
  tv.value  = totalMonto
  tv.numFmt = '"$"#,##0.00'
  tv.font   = { bold: true, size: 13, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  tv.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } }
  tv.alignment = { horizontal: 'center', vertical: 'middle' }
  tv.border = bord()
  row += 2

  // ── SECCIÓN: FIRMAS ───────────────────────────────────────────────────────
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  const sec3 = cell(row, 1)
  sec3.value = isEs ? 'AUTORIZACIONES Y FIRMAS' : 'AUTHORIZATIONS AND SIGNATURES'
  sec3.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec3.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec3.alignment = { vertical: 'middle' }; sec3.border = bord()
  row++

  // Instrucción
  ws.getRow(row).height = 14
  merge(row, 1, row, COLS)
  const instr = cell(row, 1)
  instr.value = isEs
    ? 'Las partes abajo firmantes confirman la recepción y conformidad con el pago descrito en este documento.'
    : 'The undersigned parties confirm receipt and agreement with the payment described in this document.'
  instr.font  = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } }
  instr.alignment = { horizontal: 'center', vertical: 'middle' }
  row += 2

  // Bloques de firma — 4 columnas distribuidas en 2 filas
  const firmantes = [
    { label: isEs ? 'Preparado por' : 'Prepared by',    nombre: usuario?.nombre || '___________________________', cargo: isEs ? 'Administrador de Proyecto' : 'Project Administrator' },
    { label: isEs ? 'Autorizado por' : 'Authorized by', nombre: '___________________________',                   cargo: isEs ? 'CEO / Director General'       : 'CEO / General Director' },
    { label: isEs ? 'Recibido por' : 'Received by',     nombre: '___________________________',                   cargo: isEs ? 'Subcontratista / Representante' : 'Subcontractor / Representative' },
    { label: isEs ? 'Conforme / Pagado por' : 'Confirmed / Paid by', nombre: '___________________________',      cargo: isEs ? 'Tesorería / Contabilidad'      : 'Treasury / Accounting' },
  ]

  // Fila de líneas de firma (2 columnas, 2 bloques por fila)
  for (let i = 0; i < firmantes.length; i += 2) {
    const left  = firmantes[i]
    const right = firmantes[i + 1]

    // Línea de firma
    ws.getRow(row).height = 22
    merge(row, 1, row, 3)
    const fl = cell(row, 1)
    fl.value = left.nombre
    fl.font  = { size: 10, name: 'Arial' }
    fl.border = { bottom: { style: 'medium', color: { argb: 'FF' + BRAND } } }
    fl.alignment = { horizontal: 'center', vertical: 'bottom' }

    merge(row, 5, row, COLS)
    const fr = cell(row, 5)
    fr.value = right.nombre
    fr.font  = { size: 10, name: 'Arial' }
    fr.border = { bottom: { style: 'medium', color: { argb: 'FF' + BRAND } } }
    fr.alignment = { horizontal: 'center', vertical: 'bottom' }
    row++

    // Label del rol
    ws.getRow(row).height = 16
    merge(row, 1, row, 3)
    const ll = cell(row, 1)
    ll.value = left.label
    ll.font  = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
    ll.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
    ll.alignment = { horizontal: 'center', vertical: 'middle' }
    ll.border = bord()

    merge(row, 5, row, COLS)
    const lr = cell(row, 5)
    lr.value = right.label
    lr.font  = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
    lr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
    lr.alignment = { horizontal: 'center', vertical: 'middle' }
    lr.border = bord()
    row++

    // Cargo
    ws.getRow(row).height = 15
    merge(row, 1, row, 3)
    const cl = cell(row, 1)
    cl.value = left.cargo
    cl.font  = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } }
    cl.alignment = { horizontal: 'center', vertical: 'middle' }

    merge(row, 5, row, COLS)
    const cr = cell(row, 5)
    cr.value = right.cargo
    cr.font  = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } }
    cr.alignment = { horizontal: 'center', vertical: 'middle' }
    row += 2
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  ws.getRow(row).height = 14
  merge(row, 1, row, COLS)
  const ft = cell(row, 1)
  ft.value = `${nombreEmpresa}  ·  appmary.com  ·  ${isEs ? 'Generado por MARY ERP' : 'Generated by MARY ERP'}  ·  ${fechaHoy}`
  ft.font  = { italic: true, size: 8, name: 'Arial', color: { argb: 'FF94A3B8' } }
  ft.alignment = { horizontal: 'center', vertical: 'middle' }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `OPR_${orden.numero_orden}_${orden.subcontratista.replace(/\s+/g,'_')}_${orden.fecha_orden}.xlsx`)
}

// ── COMPROBANTE DE ENTREGA DE FONDO DE CAJA CHICA ──────────────────────────
export async function buildPettyCashReceipt({ caja, proy, responsable, lang='ES', nombreEmpresa='Marquez Project Solutions LLC' }) {
  const isEs  = lang === 'ES'
  const COLS  = 6
  const wb    = new ExcelJS.Workbook()
  wb.creator  = `MARY ERP — ${nombreEmpresa}`
  wb.created  = new Date()

  const BRAND = '1B3A6B'
  const GREEN = '1D9E75'
  const LIGHT = 'EEF2F7'

  const bord = () => ({
    top:    { style: 'thin', color: { argb: 'FFD0D7DE' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
    left:   { style: 'thin', color: { argb: 'FFD0D7DE' } },
    right:  { style: 'thin', color: { argb: 'FFD0D7DE' } },
  })
  const thickB = () => ({
    top:    { style: 'medium', color: { argb: 'FF' + BRAND } },
    bottom: { style: 'medium', color: { argb: 'FF' + BRAND } },
    left:   { style: 'medium', color: { argb: 'FF' + BRAND } },
    right:  { style: 'medium', color: { argb: 'FF' + BRAND } },
  })

  const fechaHoy  = new Date().toLocaleDateString(isEs ? 'es' : 'en-US')
  const proyLabel = proy ? `${proy.project_code} — ${proy.nombre}` : ''
  const moneda    = proy?.moneda || 'USD'

  const ws = wb.addWorksheet(isEs ? 'Comprobante Caja Chica' : 'Petty Cash Receipt')
  setCols(ws, [20, 20, 14, 16, 14, 16])

  const cell  = (r, c) => ws.getCell(r, c)
  const merge = (r1, c1, r2, c2) => ws.mergeCells(r1, c1, r2, c2)

  // ── HEADER ──────────────────────────────────────────────────────────────
  ws.getRow(1).height = 34
  merge(1, 1, 1, 2)
  const h1 = cell(1, 1)
  h1.value     = nombreEmpresa
  h1.font      = { bold: true, size: 13, name: 'Arial', color: { argb: 'FF' + BRAND } }
  h1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  h1.alignment = { vertical: 'middle' }
  h1.border    = thickB()

  merge(1, 3, 1, 4)
  const h2 = cell(1, 3)
  h2.value     = isEs ? 'COMPROBANTE DE ENTREGA DE FONDO — CAJA CHICA' : 'PETTY CASH FUND DELIVERY RECEIPT'
  h2.font      = { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  h2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
  h2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  h2.border    = thickB()

  merge(1, 5, 1, COLS)
  const h3 = cell(1, 5)
  h3.value     = `MARY ERP\n${fechaHoy}`
  h3.font      = { size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
  h3.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  h3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  h3.border    = thickB()

  // ── INFO GENERAL ────────────────────────────────────────────────────────
  ws.getRow(2).height = 18
  merge(2, 1, 2, 3)
  const i1 = cell(2, 1); i1.value = `${isEs?'Proyecto':'Project'}: ${proyLabel}`
  i1.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  i1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  i1.alignment = { vertical: 'middle' }; i1.border = thickB()

  merge(2, 4, 2, COLS)
  const i2 = cell(2, 4); i2.value = `${isEs?'Fecha de entrega':'Delivery date'}: ${fechaHoy}`
  i2.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  i2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  i2.alignment = { vertical: 'middle' }; i2.border = thickB()

  // ── SECCIÓN: DATOS DEL FONDO ────────────────────────────────────────────
  let row = 4
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  let sec = cell(row, 1)
  sec.value = isEs ? 'DATOS DEL FONDO' : 'FUND INFORMATION'
  sec.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec.alignment = { vertical: 'middle' }; sec.border = bord()
  row++

  const METODOS = {
    efectivo:     { es: 'Efectivo',          en: 'Cash' },
    cheque:       { es: 'Cheque',            en: 'Check' },
    transferencia:{ es: 'Transferencia bancaria', en: 'Bank transfer' },
  }
  const metodoLabel = METODOS[caja.metodo_entrega]?.[isEs ? 'es' : 'en'] || (isEs ? 'No especificado' : 'Not specified')

  const montoFmt = new Intl.NumberFormat(isEs ? 'es' : 'en-US', { style: 'currency', currency: moneda }).format(parseFloat(caja.monto_asignado)||0)

  const infoRows = [
    [isEs ? 'Monto entregado:' : 'Amount delivered:', montoFmt],
    [isEs ? 'Método de entrega:' : 'Delivery method:', metodoLabel],
    [isEs ? 'No. de cheque / referencia:' : 'Check no. / reference:', caja.referencia_entrega || '—'],
    [isEs ? 'Responsable del fondo:' : 'Fund responsible:', responsable?.nombre || responsable?.email || '—'],
    [isEs ? 'Rol:' : 'Role:', responsable?.rol || '—'],
  ]
  infoRows.forEach(([lbl, val]) => {
    ws.getRow(row).height = 17
    merge(row, 1, row, 2)
    const lc = cell(row, 1)
    lc.value = lbl; lc.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
    lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
    lc.border = bord(); lc.alignment = { vertical: 'middle' }
    merge(row, 3, row, COLS)
    const vc = cell(row, 3)
    vc.value = val; vc.font = { size: 10, name: 'Arial' }
    vc.border = bord(); vc.alignment = { vertical: 'middle' }
    row++
  })
  row++ // espaciado

  // ── DECLARACIÓN ─────────────────────────────────────────────────────────
  ws.getRow(row).height = 30
  merge(row, 1, row, COLS)
  const decl = cell(row, 1)
  decl.value = isEs
    ? `Se hace constar que la persona arriba indicada recibió el monto detallado, mediante el método de entrega señalado, en calidad de fondo de caja chica para el proyecto mencionado. El responsable se compromete a administrar dichos fondos conforme a las políticas de la empresa y a presentar las rendiciones de cuenta correspondientes.`
    : `This document certifies that the person named above received the amount detailed, through the delivery method indicated, as a petty cash fund for the project mentioned. The responsible party agrees to manage these funds in accordance with company policy and to submit the corresponding expense settlements.`
  decl.font  = { size: 9, name: 'Arial', color: { argb: 'FF475569' } }
  decl.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  row += 2

  // ── SECCIÓN: FIRMAS ─────────────────────────────────────────────────────
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  sec = cell(row, 1)
  sec.value = isEs ? 'FIRMAS' : 'SIGNATURES'
  sec.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec.alignment = { vertical: 'middle' }; sec.border = bord()
  row += 2

  const firmantes = [
    { label: isEs ? 'Entregado por' : 'Delivered by', nombre: '___________________________', cargo: isEs ? 'Administrador / Gerente' : 'Administrator / Manager' },
    { label: isEs ? 'Recibido por' : 'Received by',   nombre: responsable?.nombre || responsable?.email || '___________________________', cargo: responsable?.rol || (isEs ? 'Responsable del fondo' : 'Fund responsible') },
  ]

  const left  = firmantes[0]
  const right = firmantes[1]

  ws.getRow(row).height = 22
  merge(row, 1, row, 3)
  const fl = cell(row, 1)
  fl.value = left.nombre
  fl.font  = { size: 10, name: 'Arial' }
  fl.border = { bottom: { style: 'medium', color: { argb: 'FF' + BRAND } } }
  fl.alignment = { horizontal: 'center', vertical: 'bottom' }

  merge(row, 4, row, COLS)
  const fr = cell(row, 4)
  fr.value = right.nombre
  fr.font  = { size: 10, name: 'Arial' }
  fr.border = { bottom: { style: 'medium', color: { argb: 'FF' + BRAND } } }
  fr.alignment = { horizontal: 'center', vertical: 'bottom' }
  row++

  ws.getRow(row).height = 16
  merge(row, 1, row, 3)
  const ll = cell(row, 1)
  ll.value = left.label
  ll.font  = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
  ll.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  ll.alignment = { horizontal: 'center', vertical: 'middle' }
  ll.border = bord()

  merge(row, 4, row, COLS)
  const lr = cell(row, 4)
  lr.value = right.label
  lr.font  = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
  lr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  lr.alignment = { horizontal: 'center', vertical: 'middle' }
  lr.border = bord()
  row++

  ws.getRow(row).height = 15
  merge(row, 1, row, 3)
  const cl = cell(row, 1)
  cl.value = left.cargo
  cl.font  = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } }
  cl.alignment = { horizontal: 'center', vertical: 'middle' }

  merge(row, 4, row, COLS)
  const cr = cell(row, 4)
  cr.value = right.cargo
  cr.font  = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } }
  cr.alignment = { horizontal: 'center', vertical: 'middle' }
  row += 2

  // ── FOOTER ──────────────────────────────────────────────────────────────
  ws.getRow(row).height = 14
  merge(row, 1, row, COLS)
  const ft = cell(row, 1)
  ft.value = `${nombreEmpresa}  ·  appmary.com  ·  ${isEs ? 'Generado por MARY ERP' : 'Generated by MARY ERP'}  ·  ${fechaHoy}`
  ft.font  = { italic: true, size: 8, name: 'Arial', color: { argb: 'FF94A3B8' } }
  ft.alignment = { horizontal: 'center', vertical: 'middle' }

  const buf = await wb.xlsx.writeBuffer()
  const respSlug = (responsable?.nombre || responsable?.email || 'responsable').replace(/\s+/g, '_')
  saveAs(new Blob([buf]), `${isEs ? 'Comprobante_Caja_Chica' : 'Petty_Cash_Receipt'}_${proy?.project_code || ''}_${respSlug}_${fechaHoy.replace(/\//g,'-')}.xlsx`)
}

// ── COMPROBANTE DE PAGO DE AVALÚO DE SUBCONTRATO ────────────────────────────
export async function buildAvaluoComprobante({ avaluo, contrato, itemsContrato, avaluoItems, presupuesto, proy, lang='ES', nombreEmpresa='Marquez Project Solutions LLC' }) {
  const isEs  = lang === 'ES'
  const COLS  = 7
  const wb    = new ExcelJS.Workbook()
  wb.creator  = `MARY ERP — ${nombreEmpresa}`
  wb.created  = new Date()

  const BRAND = '1B3A6B'
  const GREEN = '1D9E75'
  const AMBER = 'F59E0B'
  const LIGHT = 'EEF2F7'

  const bord = () => ({
    top:    { style: 'thin', color: { argb: 'FFD0D7DE' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
    left:   { style: 'thin', color: { argb: 'FFD0D7DE' } },
    right:  { style: 'thin', color: { argb: 'FFD0D7DE' } },
  })
  const thickB = () => ({
    top:    { style: 'medium', color: { argb: 'FF' + BRAND } },
    bottom: { style: 'medium', color: { argb: 'FF' + BRAND } },
    left:   { style: 'medium', color: { argb: 'FF' + BRAND } },
    right:  { style: 'medium', color: { argb: 'FF' + BRAND } },
  })

  const fechaHoy  = new Date().toLocaleDateString(isEs ? 'es' : 'en-US')
  const proyLabel = proy ? `${proy.project_code} — ${proy.nombre}` : ''
  const moneda    = contrato?.moneda || proy?.moneda || 'USD'
  const money = (v) => new Intl.NumberFormat(isEs ? 'es' : 'en-US', { style: 'currency', currency: moneda }).format(parseFloat(v)||0)

  const ws = wb.addWorksheet(isEs ? `Avalúo ${avaluo.numero}` : `Valuation ${avaluo.numero}`)
  setCols(ws, [26, 12, 12, 14, 14, 14, 14])

  const cell  = (r, c) => ws.getCell(r, c)
  const merge = (r1, c1, r2, c2) => ws.mergeCells(r1, c1, r2, c2)

  // ── HEADER ──────────────────────────────────────────────────────────────
  ws.getRow(1).height = 34
  merge(1, 1, 1, 3)
  const h1 = cell(1, 1)
  h1.value     = nombreEmpresa
  h1.font      = { bold: true, size: 13, name: 'Arial', color: { argb: 'FF' + BRAND } }
  h1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  h1.alignment = { vertical: 'middle' }
  h1.border    = thickB()

  merge(1, 4, 1, 5)
  const h2 = cell(1, 4)
  h2.value     = isEs ? 'COMPROBANTE DE PAGO — AVALÚO' : 'PAYMENT VOUCHER — VALUATION'
  h2.font      = { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  h2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
  h2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  h2.border    = thickB()

  merge(1, 6, 1, COLS)
  const h3 = cell(1, 6)
  h3.value     = `MARY ERP\n${fechaHoy}`
  h3.font      = { size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
  h3.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  h3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  h3.border    = thickB()

  // ── INFO GENERAL ────────────────────────────────────────────────────────
  ws.getRow(2).height = 18
  merge(2, 1, 2, 3)
  const i1 = cell(2, 1); i1.value = `${isEs?'Proyecto':'Project'}: ${proyLabel}`
  i1.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  i1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  i1.alignment = { vertical: 'middle' }; i1.border = thickB()

  merge(2, 4, 2, 5)
  const i2 = cell(2, 4); i2.value = `${isEs?'Avalúo N°':'Valuation No.'}: ${avaluo.numero}`
  i2.font = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  i2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } }
  i2.alignment = { horizontal: 'center', vertical: 'middle' }; i2.border = thickB()

  merge(2, 6, 2, COLS)
  const i3 = cell(2, 6); i3.value = `${isEs?'Fecha':'Date'}: ${avaluo.fecha_elaboracion || fechaHoy}`
  i3.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  i3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  i3.alignment = { vertical: 'middle' }; i3.border = thickB()

  // ── SECCIÓN: DATOS DEL SUBCONTRATO ──────────────────────────────────────
  let row = 4
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  let sec = cell(row, 1)
  sec.value = isEs ? 'DATOS DEL SUBCONTRATO' : 'SUBCONTRACT INFORMATION'
  sec.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec.alignment = { vertical: 'middle' }; sec.border = bord()
  row++

  const periodoLabel = avaluo.periodo_inicio && avaluo.periodo_fin
    ? `${avaluo.periodo_inicio} → ${avaluo.periodo_fin}`
    : '—'

  const infoRows = [
    [isEs?'Subcontratista:':'Subcontractor:', contrato?.subcontratista || '—'],
    [isEs?'Descripción del contrato:':'Contract description:', contrato?.descripcion || '—'],
    [isEs?'Período del avalúo:':'Valuation period:', periodoLabel],
    [isEs?'Monto total del contrato:':'Total contract amount:', money(contrato?.monto_total)],
  ]
  infoRows.forEach(([lbl, val]) => {
    ws.getRow(row).height = 17
    merge(row, 1, row, 2)
    const lc = cell(row, 1)
    lc.value = lbl; lc.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
    lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
    lc.border = bord(); lc.alignment = { vertical: 'middle' }
    merge(row, 3, row, COLS)
    const vc = cell(row, 3)
    vc.value = val; vc.font = { size: 10, name: 'Arial' }
    vc.border = bord(); vc.alignment = { vertical: 'middle' }
    row++
  })
  row++ // espaciado

  // ── SECCIÓN: DETALLE DEL AVALÚO ──────────────────────────────────────────
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  sec = cell(row, 1)
  sec.value = isEs ? 'DETALLE DEL AVALÚO' : 'VALUATION DETAIL'
  sec.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec.alignment = { vertical: 'middle' }; sec.border = bord()
  row++

  // Headers tabla
  ws.getRow(row).height = 28
  const tHeaders = isEs
    ? ['Descripción', 'Cant. Anterior', 'Cant. Actual', 'Cant. Acumulada', 'Costo Unitario', '% Avance', 'Monto Avalúo']
    : ['Description', 'Previous Qty', 'Current Qty', 'Accumulated Qty', 'Unit Cost', '% Progress', 'Valuation Amount']
  tHeaders.forEach((h, i) => {
    const c2 = cell(row, i + 1)
    c2.value = h
    c2.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' }
    c2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
    c2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c2.border = bord()
  })
  row++

  itemsContrato.forEach((it, idx) => {
    const ai = avaluoItems.find(x => x.avaluo_id === avaluo.id && x.subcontrato_item_id === it.id)
    if (!ai) return
    const even = idx % 2 === 1
    const bg   = even ? 'FFF8FAFC' : 'FFFFFFFF'
    const cantContrato  = parseFloat(it.cantidad_contrato)||0
    const cantAcum      = parseFloat(ai.cantidad_acumulada)||0
    const pctAvance     = cantContrato > 0 ? (cantAcum / cantContrato) * 100 : 0

    ws.getRow(row).height = 17
    const c1 = cell(row, 1); c1.value = it.descripcion; c1.font = { size: 9, name: 'Arial' }
    const c2 = cell(row, 2); c2.value = parseFloat(ai.cantidad_anterior)||0
    const c3 = cell(row, 3); c3.value = parseFloat(ai.cantidad_actual)||0
    const c4 = cell(row, 4); c4.value = cantAcum
    const c5 = cell(row, 5); c5.value = parseFloat(ai.costo_unitario)||0
    const c6 = cell(row, 6); c6.value = pctAvance / 100
    const c7 = cell(row, 7); c7.value = parseFloat(ai.monto_actual)||0

    ;[c2,c3,c4].forEach(c => { c.numFmt = '#,##0.00' })
    ;[c5,c7].forEach(c => { c.numFmt = '"' + moneda + '" #,##0.00' })
    c6.numFmt = '0.0%'

    ;[c1,c2,c3,c4,c5,c6,c7].forEach(c => {
      c.font = c.font || { size: 9, name: 'Arial' }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      c.border = bord()
      c.alignment = { vertical: 'middle', horizontal: c === c1 ? 'left' : 'right' }
    })
    row++
  })

  // ── TOTALES ─────────────────────────────────────────────────────────────
  const totalRows = [
    [isEs?'Subtotal':'Subtotal', money(avaluo.subtotal)],
    [`${isEs?'Impuesto':'Tax'} (${contrato?.impuesto_pct||0}%)`, money(avaluo.impuesto_monto)],
    [isEs?'Total Avalúo':'Valuation Total', money(avaluo.monto_total)],
  ]
  if (parseFloat(avaluo.retencion_monto||0) > 0) {
    totalRows.push([`${isEs?'Retención':'Retention'} (${avaluo.retencion_pct||0}%)`, `-${money(avaluo.retencion_monto)}`])
  }
  totalRows.push([isEs?'MONTO A PAGAR':'AMOUNT DUE', money(avaluo.monto_a_pagar ?? avaluo.monto_total)])

  totalRows.forEach(([lbl, val], i) => {
    const isLast = i === totalRows.length - 1
    ws.getRow(row).height = isLast ? 22 : 17
    merge(row, 1, row, 5)
    const lc = cell(row, 1)
    lc.value = lbl
    lc.font  = isLast ? { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } } : { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
    lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: isLast ? 'FF' + GREEN : 'FF' + LIGHT } }
    lc.alignment = { horizontal: 'right', vertical: 'middle' }; lc.border = bord()

    merge(row, 6, row, COLS)
    const vc = cell(row, 6)
    vc.value = val
    vc.font  = isLast ? { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } } : { bold: true, size: 10, name: 'Arial' }
    vc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: isLast ? 'FF' + GREEN : 'FFFFFFFF' } }
    vc.alignment = { horizontal: 'right', vertical: 'middle' }; vc.border = bord()
    row++
  })
  row++

  if (avaluo.notas) {
    ws.getRow(row).height = 28
    merge(row, 1, row, COLS)
    const n = cell(row, 1)
    n.value = `${isEs?'Notas:':'Notes:'} ${avaluo.notas}`
    n.font  = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } }
    n.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    row += 2
  }

  // ── SECCIÓN: FIRMAS ─────────────────────────────────────────────────────
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  sec = cell(row, 1)
  sec.value = isEs ? 'AUTORIZACIONES Y FIRMAS' : 'AUTHORIZATIONS AND SIGNATURES'
  sec.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec.alignment = { vertical: 'middle' }; sec.border = bord()
  row += 2

  const firmantes = [
    { label: isEs ? 'Aprobado por' : 'Approved by',  nombre: '___________________________', cargo: isEs ? 'Administrador / Gerente' : 'Administrator / Manager' },
    { label: isEs ? 'Recibido por' : 'Received by',  nombre: '___________________________', cargo: contrato?.subcontratista || (isEs ? 'Subcontratista' : 'Subcontractor') },
  ]
  const left  = firmantes[0]
  const right = firmantes[1]

  ws.getRow(row).height = 22
  merge(row, 1, row, 3)
  let fl = cell(row, 1)
  fl.value = left.nombre; fl.font = { size: 10, name: 'Arial' }
  fl.border = { bottom: { style: 'medium', color: { argb: 'FF' + BRAND } } }
  fl.alignment = { horizontal: 'center', vertical: 'bottom' }

  merge(row, 5, row, COLS)
  let fr = cell(row, 5)
  fr.value = right.nombre; fr.font = { size: 10, name: 'Arial' }
  fr.border = { bottom: { style: 'medium', color: { argb: 'FF' + BRAND } } }
  fr.alignment = { horizontal: 'center', vertical: 'bottom' }
  row++

  ws.getRow(row).height = 16
  merge(row, 1, row, 3)
  let ll = cell(row, 1)
  ll.value = left.label; ll.font = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
  ll.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  ll.alignment = { horizontal: 'center', vertical: 'middle' }; ll.border = bord()

  merge(row, 5, row, COLS)
  let lr = cell(row, 5)
  lr.value = right.label; lr.font = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
  lr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  lr.alignment = { horizontal: 'center', vertical: 'middle' }; lr.border = bord()
  row++

  ws.getRow(row).height = 15
  merge(row, 1, row, 3)
  let cl = cell(row, 1)
  cl.value = left.cargo; cl.font = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } }
  cl.alignment = { horizontal: 'center', vertical: 'middle' }

  merge(row, 5, row, COLS)
  let cr = cell(row, 5)
  cr.value = right.cargo; cr.font = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } }
  cr.alignment = { horizontal: 'center', vertical: 'middle' }
  row += 2

  // ── FOOTER ──────────────────────────────────────────────────────────────
  ws.getRow(row).height = 14
  merge(row, 1, row, COLS)
  const ft = cell(row, 1)
  ft.value = `${nombreEmpresa}  ·  appmary.com  ·  ${isEs ? 'Generado por MARY ERP' : 'Generated by MARY ERP'}  ·  ${fechaHoy}`
  ft.font  = { italic: true, size: 8, name: 'Arial', color: { argb: 'FF94A3B8' } }
  ft.alignment = { horizontal: 'center', vertical: 'middle' }

  const buf = await wb.xlsx.writeBuffer()
  const subSlug = (contrato?.subcontratista || 'subcontrato').replace(/\s+/g, '_')
  saveAs(new Blob([buf]), `${isEs ? 'Avaluo' : 'Valuation'}_${avaluo.numero}_${subSlug}_${proy?.project_code || ''}.xlsx`)
}

// ── EXPORTAR CONTRATO DE SUBCONTRATO (con historial de avalúos) ─────────────
export async function buildSubcontratoDoc({ contrato, itemsContrato, avaluos, avaluoItems, presupuesto, proy, lang='ES', nombreEmpresa='Marquez Project Solutions LLC' }) {
  const isEs  = lang === 'ES'
  const COLS  = 7
  const wb    = new ExcelJS.Workbook()
  wb.creator  = `MARY ERP — ${nombreEmpresa}`
  wb.created  = new Date()

  const BRAND = '1B3A6B'
  const GREEN = '1D9E75'
  const AMBER = 'F59E0B'
  const LIGHT = 'EEF2F7'

  const bord = () => ({
    top:    { style: 'thin', color: { argb: 'FFD0D7DE' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
    left:   { style: 'thin', color: { argb: 'FFD0D7DE' } },
    right:  { style: 'thin', color: { argb: 'FFD0D7DE' } },
  })
  const thickB = () => ({
    top:    { style: 'medium', color: { argb: 'FF' + BRAND } },
    bottom: { style: 'medium', color: { argb: 'FF' + BRAND } },
    left:   { style: 'medium', color: { argb: 'FF' + BRAND } },
    right:  { style: 'medium', color: { argb: 'FF' + BRAND } },
  })

  const fechaHoy  = new Date().toLocaleDateString(isEs ? 'es' : 'en-US')
  const proyLabel = proy ? `${proy.project_code} — ${proy.nombre}` : ''
  const moneda    = contrato?.moneda || proy?.moneda || 'USD'
  const money = (v) => new Intl.NumberFormat(isEs ? 'es' : 'en-US', { style: 'currency', currency: moneda }).format(parseFloat(v)||0)

  const avaluosSc = (avaluos||[]).filter(a => a.subcontrato_id === contrato.id).sort((a,b) => a.numero - b.numero)
  const totalValorado = avaluosSc.filter(a => a.estado === 'aprobado').reduce((s,a) => s + (parseFloat(a.monto_total)||0), 0)
  const totalPagar    = avaluosSc.filter(a => a.estado === 'aprobado').reduce((s,a) => s + (parseFloat(a.monto_a_pagar ?? a.monto_total)||0), 0)

  // ── HOJA 1: RESUMEN DEL CONTRATO ─────────────────────────────────────────
  const ws = wb.addWorksheet(isEs ? 'Contrato' : 'Contract')
  setCols(ws, [26, 14, 14, 14, 14, 14, 14])

  const cell  = (r, c) => ws.getCell(r, c)
  const merge = (r1, c1, r2, c2) => ws.mergeCells(r1, c1, r2, c2)

  // Header
  ws.getRow(1).height = 34
  merge(1, 1, 1, 3)
  const h1 = cell(1, 1)
  h1.value     = nombreEmpresa
  h1.font      = { bold: true, size: 13, name: 'Arial', color: { argb: 'FF' + BRAND } }
  h1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  h1.alignment = { vertical: 'middle' }
  h1.border    = thickB()

  merge(1, 4, 1, 5)
  const h2 = cell(1, 4)
  h2.value     = isEs ? 'CONTRATO DE SUBCONTRATO' : 'SUBCONTRACT AGREEMENT'
  h2.font      = { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  h2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
  h2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  h2.border    = thickB()

  merge(1, 6, 1, COLS)
  const h3 = cell(1, 6)
  h3.value     = `MARY ERP\n${fechaHoy}`
  h3.font      = { size: 9, name: 'Arial', color: { argb: 'FF' + BRAND } }
  h3.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  h3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  h3.border    = thickB()

  // Info general
  ws.getRow(2).height = 18
  merge(2, 1, 2, 3)
  const i1 = cell(2, 1); i1.value = `${isEs?'Proyecto':'Project'}: ${proyLabel}`
  i1.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  i1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  i1.alignment = { vertical: 'middle' }; i1.border = thickB()

  merge(2, 4, 2, COLS)
  const i2 = cell(2, 4); i2.value = `${isEs?'Fecha de exportación':'Export date'}: ${fechaHoy}`
  i2.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  i2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  i2.alignment = { vertical: 'middle' }; i2.border = thickB()

  // Sección: datos del subcontrato
  let row = 4
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  let sec = cell(row, 1)
  sec.value = isEs ? 'DATOS DEL SUBCONTRATO' : 'SUBCONTRACT INFORMATION'
  sec.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec.alignment = { vertical: 'middle' }; sec.border = bord()
  row++

  const ESTADOS_LABEL = {
    activo: { es: 'Activo', en: 'Active' },
    completado: { es: 'Completado', en: 'Completed' },
    cancelado: { es: 'Cancelado', en: 'Cancelled' },
  }
  const estadoLbl = ESTADOS_LABEL[contrato.estado]?.[isEs?'es':'en'] || contrato.estado || '—'

  const infoRows = [
    [isEs?'Subcontratista:':'Subcontractor:', contrato.subcontratista || '—'],
    [isEs?'Descripción:':'Description:', contrato.descripcion || '—'],
    [isEs?'Fecha de contrato:':'Contract date:', contrato.fecha_contrato || '—'],
    [isEs?'Vigencia:':'Term:', (contrato.fecha_inicio && contrato.fecha_fin) ? `${contrato.fecha_inicio} → ${contrato.fecha_fin}` : '—'],
    [isEs?'Estado:':'Status:', estadoLbl],
    [isEs?'% Retención:':'Retention %:', `${contrato.retencion_pct || 0}%`],
    [isEs?'Plazo de garantía (meses):':'Warranty period (months):', contrato.plazo_garantia_meses || '—'],
    [isEs?'% de impuesto:':'Tax %:', `${contrato.impuesto_pct || 0}%`],
  ]
  infoRows.forEach(([lbl, val]) => {
    ws.getRow(row).height = 17
    merge(row, 1, row, 2)
    const lc = cell(row, 1)
    lc.value = lbl; lc.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
    lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
    lc.border = bord(); lc.alignment = { vertical: 'middle' }
    merge(row, 3, row, COLS)
    const vc = cell(row, 3)
    vc.value = val; vc.font = { size: 10, name: 'Arial' }
    vc.border = bord(); vc.alignment = { vertical: 'middle' }
    row++
  })
  row++

  // Sección: items del contrato
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  sec = cell(row, 1)
  sec.value = isEs ? 'ACTIVIDADES DEL CONTRATO' : 'CONTRACT ACTIVITIES'
  sec.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec.alignment = { vertical: 'middle' }; sec.border = bord()
  row++

  ws.getRow(row).height = 28
  const tHeaders = isEs
    ? ['Descripción', 'Unidad', 'Cant. Contrato', 'Costo Unitario', 'Total Contrato', 'Acumulado', 'Saldo']
    : ['Description', 'Unit', 'Contract Qty', 'Unit Cost', 'Contract Total', 'Accumulated', 'Balance']
  tHeaders.forEach((h, i) => {
    const c2 = cell(row, i + 1)
    c2.value = h
    c2.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' }
    c2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
    c2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c2.border = bord()
  })
  row++

  let totalContrato = 0, totalAcumMonto = 0
  itemsContrato.forEach((it, idx) => {
    // Acumulado = suma de cantidad_actual de avalúos aprobados para este item
    const acum = avaluosSc.filter(a => a.estado === 'aprobado').reduce((s, av) => {
      const ai = (avaluoItems||[]).find(x => x.avaluo_id === av.id && x.subcontrato_item_id === it.id)
      return s + (parseFloat(ai?.cantidad_actual)||0)
    }, 0)
    const cantContrato = parseFloat(it.cantidad_contrato)||0
    const costoUnit     = parseFloat(it.costo_unitario)||0
    const costoTotal    = parseFloat(it.costo_total)||0
    const saldo         = cantContrato - acum
    const acumMonto     = r2(acum * costoUnit)
    const saldoMonto    = r2(saldo * costoUnit)
    totalContrato  += costoTotal
    totalAcumMonto += acumMonto

    const even = idx % 2 === 1
    const bg   = even ? 'FFF8FAFC' : 'FFFFFFFF'
    ws.getRow(row).height = 17
    const c1 = cell(row, 1); c1.value = it.descripcion
    const c2 = cell(row, 2); c2.value = it.unidad || ''
    const c3 = cell(row, 3); c3.value = cantContrato
    const c4 = cell(row, 4); c4.value = costoUnit
    const c5 = cell(row, 5); c5.value = costoTotal
    const c6 = cell(row, 6); c6.value = acumMonto
    const c7 = cell(row, 7); c7.value = saldoMonto

    c3.numFmt = '#,##0.00'
    ;[c4,c5,c6,c7].forEach(c => { c.numFmt = '"' + moneda + '" #,##0.00' })

    ;[c1,c2,c3,c4,c5,c6,c7].forEach((c, i) => {
      c.font = { size: 9, name: 'Arial', color: i === 5 ? { argb: 'FF' + GREEN } : (i === 6 ? { argb: saldo < 0 ? 'FFEF4444' : 'FF' + AMBER } : undefined) }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      c.border = bord()
      c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right' }
    })
    row++
  })

  // Total row
  ws.getRow(row).height = 18
  merge(row, 1, row, 4)
  const tl = cell(row, 1)
  tl.value = isEs ? 'TOTAL CONTRATO' : 'CONTRACT TOTAL'
  tl.font  = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
  tl.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
  tl.alignment = { horizontal: 'right', vertical: 'middle' }; tl.border = bord()

  const tv = cell(row, 5)
  tv.value = totalContrato; tv.numFmt = '"' + moneda + '" #,##0.00'
  tv.font  = { bold: true, size: 10, name: 'Arial' }
  tv.alignment = { horizontal: 'right', vertical: 'middle' }; tv.border = bord()

  const tav = cell(row, 6)
  tav.value = totalAcumMonto; tav.numFmt = '"' + moneda + '" #,##0.00'
  tav.font  = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + GREEN } }
  tav.alignment = { horizontal: 'right', vertical: 'middle' }; tav.border = bord()

  const tsv = cell(row, 7)
  tsv.value = r2(totalContrato - totalAcumMonto); tsv.numFmt = '"' + moneda + '" #,##0.00'
  tsv.font  = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + AMBER } }
  tsv.alignment = { horizontal: 'right', vertical: 'middle' }; tsv.border = bord()
  row += 2

  // Sección: resumen financiero
  ws.getRow(row).height = 18
  merge(row, 1, row, COLS)
  sec = cell(row, 1)
  sec.value = isEs ? 'RESUMEN FINANCIERO' : 'FINANCIAL SUMMARY'
  sec.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } }
  sec.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5FA3' } }
  sec.alignment = { vertical: 'middle' }; sec.border = bord()
  row++

  const resumenRows = [
    [isEs?'Monto total del contrato:':'Total contract amount:', money(contrato.monto_total)],
    [isEs?'Total valorado (avalúos aprobados):':'Total valued (approved valuations):', money(totalValorado)],
    [isEs?'Total pagado/a pagar:':'Total paid/payable:', money(totalPagar)],
    [isEs?'Saldo por valorar:':'Balance to value:', money(r2((parseFloat(contrato.monto_total)||0) - totalValorado))],
  ]
  resumenRows.forEach(([lbl, val]) => {
    ws.getRow(row).height = 17
    merge(row, 1, row, 4)
    const lc = cell(row, 1)
    lc.value = lbl; lc.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF' + BRAND } }
    lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT } }
    lc.border = bord(); lc.alignment = { vertical: 'middle' }
    merge(row, 5, row, COLS)
    const vc = cell(row, 5)
    vc.value = val; vc.font = { bold: true, size: 10, name: 'Arial' }
    vc.border = bord(); vc.alignment = { horizontal: 'right', vertical: 'middle' }
    row++
  })
  row += 2

  // Footer hoja 1
  ws.getRow(row).height = 14
  merge(row, 1, row, COLS)
  const ft = cell(row, 1)
  ft.value = `${nombreEmpresa}  ·  appmary.com  ·  ${isEs ? 'Generado por MARY ERP' : 'Generated by MARY ERP'}  ·  ${fechaHoy}`
  ft.font  = { italic: true, size: 8, name: 'Arial', color: { argb: 'FF94A3B8' } }
  ft.alignment = { horizontal: 'center', vertical: 'middle' }

  // ── HOJA 2: HISTORIAL DE AVALÚOS ─────────────────────────────────────────
  if (avaluosSc.length > 0) {
    const ws2 = wb.addWorksheet(isEs ? 'Historial de Avalúos' : 'Valuation History')
    setCols(ws2, [10, 22, 14, 14, 14, 14, 14, 14])

    const cell2  = (r, c) => ws2.getCell(r, c)
    const merge2 = (r1, c1, r2, c2) => ws2.mergeCells(r1, c1, r2, c2)

    ws2.getRow(1).height = 30
    merge2(1, 1, 1, 8)
    const t1 = cell2(1, 1)
    t1.value = isEs ? `Historial de Avalúos — ${contrato.subcontratista}` : `Valuation History — ${contrato.subcontratista}`
    t1.font  = { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } }
    t1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
    t1.alignment = { horizontal: 'center', vertical: 'middle' }
    t1.border = thickB()

    let r2row = 3
    ws2.getRow(r2row).height = 24
    const histHeaders = isEs
      ? ['#', 'Período', 'Fecha', 'Subtotal', 'Impuesto', 'Retención', 'Total Avalúo', 'Estado']
      : ['#', 'Period', 'Date', 'Subtotal', 'Tax', 'Retention', 'Valuation Total', 'Status']
    histHeaders.forEach((h, i) => {
      const c = cell2(r2row, i + 1)
      c.value = h
      c.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' }
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } }
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      c.border = bord()
    })
    r2row++

    const ESTADOS_AV = {
      aprobado: { es: 'Aprobado', en: 'Approved' },
      borrador: { es: 'Borrador', en: 'Draft' },
      rechazado: { es: 'Rechazado', en: 'Rejected' },
    }

    avaluosSc.forEach((av, idx) => {
      const even = idx % 2 === 1
      const bg   = even ? 'FFF8FAFC' : 'FFFFFFFF'
      const periodo = av.periodo_inicio && av.periodo_fin ? `${av.periodo_inicio} → ${av.periodo_fin}` : '—'
      const estLbl  = ESTADOS_AV[av.estado]?.[isEs?'es':'en'] || av.estado || '—'

      ws2.getRow(r2row).height = 17
      const vals = [
        `#${av.numero}`, periodo, av.fecha_elaboracion || '—',
        money(av.subtotal), money(av.impuesto_monto),
        parseFloat(av.retencion_monto||0) > 0 ? money(av.retencion_monto) : '—',
        money(av.monto_total), estLbl,
      ]
      vals.forEach((v, i) => {
        const c = cell2(r2row, i + 1)
        c.value = v
        c.font  = { size: 9, name: 'Arial', bold: i === 0 || i === 6 }
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        c.border = bord()
        c.alignment = { horizontal: i <= 2 ? 'left' : (i === 7 ? 'center' : 'right'), vertical: 'middle' }
      })
      r2row++
    })

    r2row++
    ws2.getRow(r2row).height = 14
    merge2(r2row, 1, r2row, 8)
    const ft2 = cell2(r2row, 1)
    ft2.value = `${nombreEmpresa}  ·  appmary.com  ·  ${isEs ? 'Generado por MARY ERP' : 'Generated by MARY ERP'}  ·  ${fechaHoy}`
    ft2.font  = { italic: true, size: 8, name: 'Arial', color: { argb: 'FF94A3B8' } }
    ft2.alignment = { horizontal: 'center', vertical: 'middle' }
  }

  const buf = await wb.xlsx.writeBuffer()
  const subSlug = (contrato.subcontratista || 'subcontrato').replace(/\s+/g, '_')
  saveAs(new Blob([buf]), `${isEs ? 'Contrato_Subcontrato' : 'Subcontract'}_${subSlug}_${proy?.project_code || ''}.xlsx`)
}

// ── EXPORT RETENCIONES ────────────────────────────────────
async function buildRetenciones({ data, proy, moneda, lang='ES', nombreEmpresa='Marquez Project Solutions LLC' }) {
  const isEs      = lang === 'ES'
  const wb        = new ExcelJS.Workbook()
  wb.creator      = 'MARY ERP'
  const proyLabel = proy ? `${proy.project_code} — ${proy.nombre}` : ''
  const fechaHoy  = new Date().toLocaleDateString(isEs ? 'es' : 'en-US')
  const periodoLabel = isEs ? 'Todas las retenciones' : 'All retentions'

  // ── HOJA 1: Subcontratos resumen ──────────────────────────────────────────
  const ws1 = wb.addWorksheet(isEs ? 'Subcontratos Resumen' : 'Subcontracts Summary')
  setCols(ws1, [28, 30, 16, 16, 12, 16, 16, 14])
  let r1 = addHeaderBlock(ws1, isEs ? 'Retenciones de Garantía — Subcontratos' : 'Retention Bonds — Subcontracts',
    nombreEmpresa, proyLabel, periodoLabel, fechaHoy, 8)
  ws1.getRow(r1).height = 18
  ;[isEs?'Subcontratista':'Subcontractor',
    isEs?'Descripción':'Description',
    isEs?'Monto Contrato':'Contract Amount',
    isEs?'Avaluado (aprob.)':'Valued (approved)',
    isEs?'% Retención':'Retention %',
    isEs?'Total Retenido':'Total Retained',
    isEs?'Devuelto':'Released',
    isEs?'Pendiente':'Pending',
  ].forEach((h, i) => { const c = ws1.getCell(r1, i+1); c.value = h; styleHeader(c) })
  r1++
  let totContrato=0, totValuado=0, totRetenido=0, totDevuelto=0
  ;(data.scContratos||[]).forEach((sc, idx) => {
    ws1.getRow(r1).height = 17
    const even     = idx % 2 === 1
    const valuado  = (data.scAvaluosDetalle||[])
      .filter(a => a.subcontrato_id === sc.id)
      .reduce((s, a) => s + parseFloat(a.monto_total||0), 0)
    const retsDelSc = (data.retenciones||[]).filter(r => r.subcontrato_id === sc.id)
    const retenido  = retsDelSc.reduce((s, r) => s + parseFloat(r.monto_retenido||0), 0)
    const devuelto  = retsDelSc.filter(r => r.estado === 'devuelta' || r.estado === 'pagada')
                                .reduce((s, r) => s + parseFloat(r.monto_devuelto||0), 0)
    totContrato += parseFloat(sc.monto_total||0)
    totValuado  += valuado
    totRetenido += retenido
    totDevuelto += devuelto
    const vals = [
      sc.subcontratista, sc.descripcion||'—',
      parseFloat(sc.monto_total||0), valuado,
      parseFloat(sc.retencion_pct||0)/100,
      retenido, devuelto, retenido - devuelto,
    ]
    vals.forEach((v, ci) => {
      const c   = ws1.getCell(r1, ci+1)
      const num = [2,3,5,6,7].includes(ci)
      const pct = ci === 4
      styleData(c, {
        even,
        numFmt: num ? '"$"#,##0.00' : pct ? '0.0%' : undefined,
        align:  (num || pct) ? 'right' : 'left',
        color:  ci === 7 ? (v > 0 ? 'F59E0B' : GREEN_HX) : '000000',
        bold:   ci === 7,
      })
      c.value = v
    })
    r1++
  })
  ws1.getRow(r1).height = 18
  ws1.mergeCells(r1,1,r1,4)
  const tl1 = ws1.getCell(r1,1); tl1.value = isEs?'TOTAL':'TOTAL'; styleTotal(tl1)
  const tt1c = ws1.getCell(r1,5); tt1c.value=''; styleTotal(tt1c)
  const tt1r = ws1.getCell(r1,6); tt1r.value=totRetenido; tt1r.numFmt='"$"#,##0.00'; styleTotal(tt1r)
  const tt1d = ws1.getCell(r1,7); tt1d.value=totDevuelto; tt1d.numFmt='"$"#,##0.00'; styleTotal(tt1d)
  const tt1p = ws1.getCell(r1,8); tt1p.value=totRetenido-totDevuelto; tt1p.numFmt='"$"#,##0.00'; styleTotal(tt1p)

  // ── HOJA 2: Detalle retenciones por avalúo ────────────────────────────────
  const ws2 = wb.addWorksheet(isEs ? 'Detalle Retenciones' : 'Retention Detail')
  setCols(ws2, [28, 12, 14, 14, 16, 16, 16, 14])
  let r2 = addHeaderBlock(ws2, isEs ? 'Detalle de Retenciones por Avalúo' : 'Retention Detail by Valuation',
    nombreEmpresa, proyLabel, periodoLabel, fechaHoy, 8)
  ws2.getRow(r2).height = 18
  ;[isEs?'Subcontratista':'Subcontractor',
    isEs?'Avalúo #':'Valuation #',
    isEs?'% Retención':'Retention %',
    isEs?'Monto Retenido':'Amount Retained',
    isEs?'Fecha Retención':'Retention Date',
    isEs?'Devolución Est.':'Est. Release',
    isEs?'Devolución Real':'Actual Release',
    isEs?'Estado':'Status',
  ].forEach((h, i) => { const c = ws2.getCell(r2, i+1); c.value = h; styleHeader(c) })
  r2++
  const STATUS_LABELS = {
    retenida: isEs ? 'Retenida'  : 'Retained',
    devuelta: isEs ? 'Devuelta'  : 'Released',
    pagada:   isEs ? 'Pagada'    : 'Paid',
  }
  let totRet2 = 0
  ;(data.retenciones||[]).forEach((r, idx) => {
    ws2.getRow(r2).height = 17
    const even   = idx % 2 === 1
    const status = STATUS_LABELS[r.estado] || r.estado
    const clr    = r.estado === 'retenida' ? 'F59E0B' : r.estado === 'devuelta' ? GREEN_HX : '1B3A6B'
    // Verificar si está vencida
    const vencida = r.fecha_devolucion_est && new Date(r.fecha_devolucion_est) <= new Date() && r.estado === 'retenida'
    totRet2 += parseFloat(r.monto_retenido||0)
    const vals = [
      r.subcontratista||'—',
      `#${r.numero_avaluo||'—'}`,
      parseFloat(r.retencion_pct||0)/100,
      parseFloat(r.monto_retenido||0),
      r.fecha_retencion||'—',
      r.fecha_devolucion_est ? r.fecha_devolucion_est + (vencida ? ' ⚠' : '') : '—',
      r.fecha_devolucion_real||'—',
      vencida ? (isEs?'VENCIDA ⚠':'OVERDUE ⚠') : status,
    ]
    vals.forEach((v, ci) => {
      const c   = ws2.getCell(r2, ci+1)
      const num = ci === 3
      const pct = ci === 2
      styleData(c, {
        even,
        numFmt: num ? '"$"#,##0.00' : pct ? '0.0%' : undefined,
        align:  (num || pct) ? 'right' : 'left',
        color:  ci === 7 ? (vencida ? RED_HX : clr) : '000000',
        bold:   ci === 7,
      })
      c.value = v
    })
    r2++
  })
  ws2.getRow(r2).height = 18
  ws2.mergeCells(r2,1,r2,3)
  const tl2 = ws2.getCell(r2,1); tl2.value = isEs?'TOTAL RETENIDO':'TOTAL RETAINED'; styleTotal(tl2)
  const tv2 = ws2.getCell(r2,4); tv2.value = totRet2; tv2.numFmt = '"$"#,##0.00'; styleTotal(tv2)

  // ── HOJA 3: Órdenes de Pago ──────────────────────────────────────────────
  if ((data.ordenesPago||[]).length > 0) {
    const ws3 = wb.addWorksheet(isEs ? 'Órdenes de Pago' : 'Payment Orders')
    setCols(ws3, [22, 22, 16, 14, 12, 16, 14])
    let r3 = addHeaderBlock(ws3, isEs ? 'Órdenes de Pago de Retención' : 'Retention Payment Orders',
      nombreEmpresa, proyLabel, periodoLabel, fechaHoy, 7)
    ws3.getRow(r3).height = 18
    ;[isEs?'Número Orden':'Order Number',
      isEs?'Subcontratista':'Subcontractor',
      isEs?'Fecha Emisión':'Issue Date',
      isEs?'# Avalúos':'# Valuations',
      isEs?'Total a Pagar':'Total to Pay',
      isEs?'Estado':'Status',
      isEs?'Fecha Pago':'Payment Date',
    ].forEach((h, i) => { const c = ws3.getCell(r3, i+1); c.value = h; styleHeader(c) })
    r3++
    let totOpr = 0
    ;(data.ordenesPago||[]).forEach((o, idx) => {
      ws3.getRow(r3).height = 17
      const even   = idx % 2 === 1
      const eLabel = o.estado === 'emitida' ? (isEs?'Emitida':'Issued') : (isEs?'Pagada':'Paid')
      const eClr   = o.estado === 'pagada' ? GREEN_HX : 'F59E0B'
      totOpr += parseFloat(o.monto_total||0)
      const vals = [
        o.numero_orden||'—', o.subcontratista||'—',
        o.fecha_orden||'—', parseInt(o.cantidad_avaluos||0),
        parseFloat(o.monto_total||0), eLabel, o.fecha_pago||'—',
      ]
      vals.forEach((v, ci) => {
        const c   = ws3.getCell(r3, ci+1)
        const num = ci === 4
        const cnt = ci === 3
        styleData(c, {
          even,
          numFmt: num ? '"$"#,##0.00' : cnt ? '#,##0' : undefined,
          align:  (num || cnt) ? 'right' : 'left',
          color:  ci === 5 ? eClr : '000000',
          bold:   ci === 5,
        })
        c.value = v
      })
      r3++
    })
    ws3.getRow(r3).height = 18
    ws3.mergeCells(r3,1,r3,4)
    const tl3 = ws3.getCell(r3,1); tl3.value=isEs?'TOTAL':'TOTAL'; styleTotal(tl3)
    const tv3 = ws3.getCell(r3,5); tv3.value=totOpr; tv3.numFmt='"$"#,##0.00'; styleTotal(tv3)
  }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${isEs?'Reporte_Retenciones':'Retention_Report'}_${proy?.project_code}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── EXPORT INVENTARIO ─────────────────────────────────────
async function buildInventario({ data, materiales, proyectos, presupuesto, desde, hasta, lang='ES', nombreEmpresa='Marquez Project Solutions LLC' }) {
  const isEs = lang === 'ES'
  const wb       = new ExcelJS.Workbook()
  wb.creator     = 'MARY ERP'
  const periodoLabel = desde||hasta ? `${desde||(isEs?'inicio':'start')} al ${hasta||(isEs?'hoy':'today')}` : (isEs?'Todo el período':'Full period')
  const fechaHoy = new Date().toLocaleDateString(isEs?'es':'en-US')

  // HOJA 1: Stock
  const ws1 = wb.addWorksheet(isEs?'Stock Actual':'Current Stock')
  setCols(ws1, [14, 35, 10, 24, 14, 14, 10])
  let r1 = addHeaderBlock(ws1, isEs?'Stock Actual de Materiales':'Current Material Stock', nombreEmpresa, null, periodoLabel, fechaHoy, 7)
  ws1.getRow(r1).height = 18
  ;[isEs?'Código':'Code',isEs?'Descripción':'Description',isEs?'Unidad':'Unit',isEs?'Ubicación en bodega':'Warehouse location',isEs?'Stock actual':'Current stock',isEs?'Stock mínimo':'Min stock',isEs?'Estado':'Status'].forEach((h,i) => {
    const c = ws1.getCell(r1,i+1); c.value=h; styleHeader(c)
  })
  r1++
  data.mats.forEach((m,i) => {
    ws1.getRow(r1).height = 16
    const even = i%2===1
    const crit = parseFloat(m.stock_actual||0) <= parseFloat(m.stock_minimo||0)
    const vals = [m.codigo, m.descripcion, m.unidad, m.ubicacion_bodega||'—',
      parseFloat(m.stock_actual)||0, parseFloat(m.stock_minimo)||0, crit?'CRÍTICO':'OK']
    vals.forEach((v,ci) => {
      const c = ws1.getCell(r1,ci+1)
      const isNum = ci>=4 && ci<=5
      styleData(c, { even, align:isNum?'right':'left', numFmt:isNum?'#,##0.00':undefined,
        color: ci===4&&crit?RED_HX:ci===6&&crit?RED_HX:ci===6?GREEN_HX:'000000', bold:ci===6 })
      c.value = v
    })
    r1++
  })

  // HOJA 2: Entradas
  const ws2 = wb.addWorksheet(isEs?'Entradas de Materiales':'Material Entries')
  setCols(ws2, [12, 12, 32, 12, 8, 14, 14, 14, 22, 12])
  let r2 = addHeaderBlock(ws2, isEs?'Entradas de Materiales':'Material Entries', nombreEmpresa, null, periodoLabel, fechaHoy, 10)
  ws2.getRow(r2).height = 18
  ;[isEs?'Fecha':'Date',isEs?'Código':'Code',isEs?'Material':'Material',isEs?'Cantidad':'Quantity',isEs?'Unidad':'Unit',isEs?'Precio unit.':'Unit price',isEs?'Total':'Total',isEs?'Factura':'Invoice',isEs?'Proveedor':'Supplier',isEs?'Proyecto':'Project'].forEach((h,i) => {
    const c = ws2.getCell(r2,i+1); c.value=h; styleHeader(c)
  })
  r2++
  let totalEntradas = 0
  data.entradas.forEach((e,i) => {
    ws2.getRow(r2).height = 16
    const even = i%2===1
    const m     = materiales.find(x=>x.id===e.material_id)
    const p     = proyectos.find(x=>x.id===e.proyecto_id)
    const total = round2((parseFloat(e.cantidad)||0)*(parseFloat(e.precio_unitario)||0))
    totalEntradas += total
    const vals = [e.fecha_recepcion, m?.codigo||'—', m?.descripcion||'—',
      parseFloat(e.cantidad)||0, m?.unidad||'', parseFloat(e.precio_unitario)||0,
      total, e.numero_factura||'—', e.proveedor||'—', p?.project_code||'—']
    vals.forEach((v,ci) => {
      const c = ws2.getCell(r2,ci+1)
      const isNum = [3,5,6].includes(ci)
      styleData(c, { even, align:isNum?'right':'left', numFmt:isNum?'"$"#,##0.00':ci===3?'#,##0.00':undefined,
        color:ci===3?GREEN_HX:'000000' })
      c.value = v
    })
    r2++
  })
  ws2.mergeCells(r2,1,r2,6); const te=ws2.getCell(r2,1); te.value=isEs?'TOTAL ENTRADAS':'TOTAL ENTRIES'; styleTotal(te)
  const tv2=ws2.getCell(r2,7); tv2.value=totalEntradas; tv2.numFmt='"$"#,##0.00'; styleTotal(tv2)

  // HOJA 3: Salidas
  const ws3 = wb.addWorksheet(isEs?'Salidas de Materiales':'Material Exits')
  setCols(ws3, [12, 12, 32, 12, 8, 14, 40])
  let r3 = addHeaderBlock(ws3, isEs?'Salidas de Materiales':'Material Exits', nombreEmpresa, null, periodoLabel, fechaHoy, 7)
  ws3.getRow(r3).height = 18
  ;[isEs?'Fecha':'Date',isEs?'Código':'Code',isEs?'Material':'Material',isEs?'Cantidad':'Quantity',isEs?'Unidad':'Unit',isEs?'Proyecto':'Project',isEs?'Actividad':'Activity'].forEach((h,i) => {
    const c = ws3.getCell(r3,i+1); c.value=h; styleHeader(c)
  })
  r3++
  data.salidas.forEach((s,i) => {
    ws3.getRow(r3).height = 16
    const even = i%2===1
    const m   = materiales.find(x=>x.id===s.material_id)
    const p   = proyectos.find(x=>x.id===s.proyecto_id)
    const act = presupuesto.find(x=>x.id===s.actividad_id)
    const vals = [s.fecha_salida, m?.codigo||'—', m?.descripcion||'—',
      parseFloat(s.cantidad)||0, m?.unidad||'', p?.project_code||'—',
      act?`${act.code} — ${act.descripcion}`:'—']
    vals.forEach((v,ci) => {
      const c = ws3.getCell(r3,ci+1)
      styleData(c, { even, align:ci===3?'right':'left', numFmt:ci===3?'#,##0.00':undefined,
        color:ci===3?RED_HX:'000000' })
      c.value = v
    })
    r3++
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${isEs?'Reporte_Inventario':'Inventory_Report'}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── EXPORT RESUMEN GENERAL ────────────────────────────────
async function buildResumenGeneral({ proy, proyectos, presupuesto, costos_directos, nominas,
  subcontratos, subcontratos_contratos = [], subcontratos_avaluos = [],
  equipos, costos_indirectos, salidas, entradas, budget, moneda, lang='ES', nombreEmpresa='Marquez Project Solutions LLC' }) {
  const isEs = lang === 'ES'

  const wb       = new ExcelJS.Workbook()
  wb.creator     = 'MARY ERP'
  const proyId   = proy?.id
  const proyLabel = `${proy?.project_code} — ${proy?.nombre}`
  const fechaHoy  = new Date().toLocaleDateString(isEs?'es':'en-US')
  const COLS      = 7

  const totalMat = salidas.filter(s=>s.proyecto_id===proyId).reduce((s,sa)=>{
    const e=entradas.find(en=>en.material_id===sa.material_id)
    return s+round2((parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0))
  },0)
  const dirs     = costos_directos.filter(c=>c.proyecto_id===proyId)
  const noms     = nominas.filter(n=>n.proyecto_id===proyId)
  const subs     = subcontratos.filter(s=>s.proyecto_id===proyId)
  const eqs      = equipos.filter(e=>e.proyecto_id===proyId)
  const inds     = costos_indirectos.filter(c=>c.proyecto_id===proyId)
  const totalDir = dirs.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  const totalNom = noms.reduce((s,n)=>s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0),0)
  // totalSub: avalúos aprobados del nuevo sistema + fallback al sistema anterior
  const scIdsRes = subcontratos_contratos.filter(sc=>sc.proyecto_id===proyId).map(sc=>sc.id)
  const totalSub = subcontratos_avaluos
    .filter(a=>scIdsRes.includes(a.subcontrato_id)&&a.estado==='aprobado')
    .reduce((s,a)=>s+(parseFloat(a.monto_total)||0),0)
    + subs.reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
  const costoEfectivoEq = (e) => (e.costo_real && (e.estado_equipo==='ajustado'||e.estado_equipo==='cerrado_parcial')) ? parseFloat(e.costo_real) : parseFloat(e.costo_total)||0
  const totalEq  = eqs.reduce((s,e)=>s+costoEfectivoEq(e),0)
  const totalInd = inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  const totalReal = totalMat+totalDir+totalNom+totalSub+totalEq+totalInd
  const desviacion = totalReal - budget

  const ws = wb.addWorksheet(isEs?'Resumen General':'General Summary')
  setCols(ws, [28, 20, 32, 20, 16, 16, 16])
  let row = addHeaderBlock(ws, isEs?'Resumen General del Proyecto':'General Project Summary', nombreEmpresa, proyLabel, null, fechaHoy, COLS)

  // Info proyecto
  row = addSectionTitle(ws, row, isEs?'INFORMACIÓN DEL PROYECTO':'PROJECT INFORMATION', COLS)
  const infoRows = [
    [isEs?'Código':'Code', proy?.project_code||''], [isEs?'Nombre':'Name', proy?.nombre||''],
    [isEs?'Cliente':'Client', proy?.cliente_externo||'—'], [isEs?'Estado':'Status', fmtEstado(proy?.estado, lang)],
    [isEs?'Fecha inicio':'Start date', proy?.fecha_inicio||'—'], [isEs?'Fecha fin estimada':'Est. end date', proy?.fecha_fin_estimada||'—'],
    [isEs?'Ciudad / País':'City / Country', `${proy?.ciudad||''} ${proy?.pais||''}`.trim()||'—'], [isEs?'Moneda':'Currency', moneda],
  ]
  infoRows.forEach((r, i) => {
    ws.getRow(row).height = 17
    const even = i%2===1
    const lc = ws.getCell(row,1); lc.value=r[0]; styleLabel(lc)
    ws.mergeCells(row,2,row,Math.floor(COLS/2))
    const dc = ws.getCell(row,2); dc.value=r[1]; styleData(dc,{even})
    if (i%2===0 && infoRows[i+1]) {
      // nada, se maneja en siguiente iteración
    }
    row++
  })
  row++

  // Resumen financiero
  row = addSectionTitle(ws, row, isEs?'RESUMEN FINANCIERO':'FINANCIAL SUMMARY', COLS)
  ws.getRow(row).height = 18
  ;[isEs?'Concepto':'Concept',isEs?'Monto':'Amount',isEs?'% del Costo Real':'% of Real Cost','','','',''].forEach((h,i) => {
    const c = ws.getCell(row,i+1); c.value=h; styleHeader(c)
  })
  row++

  // Fila presupuesto
  ws.getRow(row).height=17
  const pb = ws.getCell(row,1); pb.value=isEs?'Presupuesto total':'Total budget'; styleLabel(pb)
  const pv = ws.getCell(row,2); pv.value=budget; pv.numFmt='"$"#,##0.00'; styleData(pv,{bold:true,align:'right',color:BRAND_HX})
  ws.mergeCells(row,3,row,COLS)
  row++

  const categorias = [
    [isEs?'  Materiales':'  Materials', totalMat],
    [isEs?'  Costos directos':'  Direct costs', totalDir],
    [isEs?'  Nómina / Planilla':'  Payroll', totalNom],
    [isEs?'  Subcontratos':'  Subcontracts', totalSub],
    [isEs?'  Equipos':'  Equipment', totalEq],
    [isEs?'  Costos indirectos':'  Indirect costs', totalInd],
  ]
  categorias.forEach((cat, i) => {
    ws.getRow(row).height=17
    const even = i%2===1
    const cc = ws.getCell(row,1); cc.value=cat[0]; styleData(cc,{even})
    const cv = ws.getCell(row,2); cv.value=cat[1]; cv.numFmt='"$"#,##0.00'; styleData(cv,{even,align:'right'})
    const cp = ws.getCell(row,3); cp.value=totalReal>0?cat[1]/totalReal:0; cp.numFmt='0.0%'; styleData(cp,{even,align:'right'})
    ws.mergeCells(row,4,row,COLS)
    row++
  })

  // Total
  ws.getRow(row).height=18
  const tl=ws.getCell(row,1); tl.value=isEs?'TOTAL COSTO REAL':'TOTAL ACTUAL COST'; styleTotal(tl)
  const tv=ws.getCell(row,2); tv.value=totalReal; tv.numFmt='"$"#,##0.00'; styleTotal(tv)
  const tp=ws.getCell(row,3); tp.value=1; tp.numFmt='0.0%'; styleTotal(tp)
  ws.mergeCells(row,4,row,COLS)
  row+=2

  // Desviacion
  row = addSectionTitle(ws, row, isEs?'ANÁLISIS DE DESVIACIÓN':'DEVIATION ANALYSIS', COLS)
  ws.getRow(row).height=17
  ;[
    [isEs?'Desviación ($)':'Deviation ($)', desviacion, '"$"#,##0.00', desviacion>0?RED_HX:GREEN_HX],
    [isEs?'Desviación (%)':'Deviation (%)', budget>0?desviacion/budget:0, '0.0%', desviacion>0?RED_HX:GREEN_HX],
    [isEs?'% Ejecución del presupuesto':'% Budget execution', budget>0?totalReal/budget:0, '0.0%', BRAND_HX],
  ].forEach(([lbl,val,fmt,clr]) => {
    ws.getRow(row).height=17
    const lc=ws.getCell(row,1); lc.value=lbl; styleLabel(lc)
    const dc=ws.getCell(row,2); dc.value=val; dc.numFmt=fmt; styleData(dc,{bold:true,align:'right',color:clr})
    ws.mergeCells(row,3,row,COLS)
    row++
  })
  row++

  // Detalle nómina
  if (noms.length > 0) {
    row = addSectionTitle(ws, row, isEs?'DETALLE — NÓMINA / PLANILLA':'DETAIL — PAYROLL', COLS)
    ws.getRow(row).height=18
    ;[isEs?'Trabajador':'Worker',isEs?'Cargo':'Position',isEs?'Período inicio':'Period start',isEs?'Período fin':'Period end',isEs?'Salario base':'Base salary',isEs?'Deducciones':'Deductions',isEs?'Neto':'Net'].forEach((h,i) => {
      const c=ws.getCell(row,i+1); c.value=h; styleHeader(c)
    })
    row++
    noms.forEach((n,i) => {
      ws.getRow(row).height=16
      const even=i%2===1
      const neto=(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0)
      const vals=[n.trabajador||'',n.cargo||'',n.periodo_inicio||'',n.periodo_fin||'',
        parseFloat(n.salario_base)||0,parseFloat(n.deducciones)||0,neto]
      vals.forEach((v,ci)=>{
        const c=ws.getCell(row,ci+1)
        const isNum=ci>=4
        styleData(c,{even,align:isNum?'right':'left',numFmt:isNum?'"$"#,##0.00':undefined,
          color:ci===5?RED_HX:ci===6?GREEN_HX:'000000'})
        c.value=v
      })
      row++
    })
    ws.mergeCells(row,1,row,COLS-1); const nt=ws.getCell(row,1); nt.value=isEs?'SUBTOTAL NÓMINA':'PAYROLL SUBTOTAL'; styleTotal(nt)
    const nv=ws.getCell(row,COLS); nv.value=totalNom; nv.numFmt='"$"#,##0.00'; styleTotal(nv)
    row+=2
  }

  // Detalle subcontratos
  if (subs.length > 0) {
    row = addSectionTitle(ws, row, isEs?'DETALLE — SUBCONTRATOS':'DETAIL — SUBCONTRACTS', COLS)
    ws.getRow(row).height=18
    ;[isEs?'Subcontratista':'Subcontractor',isEs?'Descripción':'Description',isEs?'Actividad':'Activity',isEs?'Monto contrato':'Contract amount',isEs?'% Avance':'% Progress',isEs?'Monto pagado':'Amount paid',isEs?'Estado':'Status'].forEach((h,i) => {
      const c=ws.getCell(row,i+1); c.value=h; styleHeader(c)
    })
    row++
    subs.forEach((s,i) => {
      ws.getRow(row).height=16
      const even=i%2===1
      const vals=[s.subcontratista||'',s.descripcion_trabajo||'',
        presupuesto.find(b=>b.id===s.actividad_id)?.descripcion||'—',
        parseFloat(s.monto_contrato)||0,parseFloat(s.avance_porcentaje)||0,
        parseFloat(s.monto_pagado)||0,s.estado||'']
      vals.forEach((v,ci)=>{
        const c=ws.getCell(row,ci+1)
        const isNum=[3,4,5].includes(ci)
        styleData(c,{even,align:isNum?'right':'left',
          numFmt:ci===3||ci===5?'"$"#,##0.00':ci===4?'0.0%':undefined,
          color:ci===5?GREEN_HX:'000000'})
        c.value=v
      })
      row++
    })
    ws.mergeCells(row,1,row,COLS-1); const st=ws.getCell(row,1); st.value=isEs?'SUBTOTAL SUBCONTRATOS':'SUBCONTRACTS SUBTOTAL'; styleTotal(st)
    const sv=ws.getCell(row,COLS); sv.value=totalSub; sv.numFmt='"$"#,##0.00'; styleTotal(sv)
    row+=2
  }

  // Detalle equipos
  if (eqs.length > 0) {
    row = addSectionTitle(ws, row, isEs?'DETALLE — EQUIPOS':'DETAIL — EQUIPMENT', COLS)
    ws.getRow(row).height=18
    ;[isEs?'Descripción':'Description',isEs?'Tipo':'Type',isEs?'Tarifa diaria':'Daily rate',isEs?'Días de uso':'Days used',isEs?'Costo total':'Total cost',isEs?'Estado':'Status',''].forEach((h,i) => {
      const c=ws.getCell(row,i+1); c.value=h; styleHeader(c)
    })
    row++
    eqs.forEach((e,i) => {
      ws.getRow(row).height=16
      const even=i%2===1
      const costoFinal = (e.costo_real && (e.estado_equipo==='ajustado'||e.estado_equipo==='cerrado_parcial'))
        ? parseFloat(e.costo_real) : parseFloat(e.costo_total)||0
      const estadoLabel = isEs
        ? { activo:'Activo', ajustado:'Ajustado', cerrado_parcial:'Cierre parcial', completado:'Completado' }[e.estado_equipo||'activo'] || 'Activo'
        : { activo:'Active', ajustado:'Adjusted', cerrado_parcial:'Partial closure', completado:'Completed' }[e.estado_equipo||'activo'] || 'Active'
      const desvLabel = e.origen_oc_id && !e.es_presupuestado ? (isEs?'⚠️ Desviación':'⚠️ Deviation') : ''
      const vals=[e.descripcion||'',e.tipo||'',parseFloat(e.tarifa_diaria)||0,
        parseFloat(e.dias_uso)||0, costoFinal, estadoLabel + (desvLabel?' '+desvLabel:''), '']
      vals.forEach((v,ci)=>{
        const c=ws.getCell(row,ci+1)
        const isNum=[2,3,4].includes(ci)
        styleData(c,{even,align:isNum?'right':'left',
          numFmt:ci===2||ci===4?'"$"#,##0.00':ci===3?'#,##0':undefined,
          color:ci===4?GREEN_HX:'000000'})
        c.value=v
      })
      row++
    })
    ws.mergeCells(row,1,row,COLS-1); const et=ws.getCell(row,1); et.value=isEs?'SUBTOTAL EQUIPOS':'EQUIPMENT SUBTOTAL'; styleTotal(et)
    const ev=ws.getCell(row,COLS); ev.value=totalEq; ev.numFmt='"$"#,##0.00'; styleTotal(ev)
    row+=2
  }

  // Detalle costos directos
  if (dirs.length > 0) {
    row = addSectionTitle(ws, row, isEs?'DETALLE — COSTOS DIRECTOS':'DETAIL — DIRECT COSTS', COLS)
    ws.getRow(row).height=18
    ;[isEs?'Fecha':'Date',isEs?'Tipo':'Type',isEs?'Descripción':'Description',isEs?'Actividad':'Activity',isEs?'Documento':'Document',isEs?'Monto':'Amount',''].forEach((h,i) => {
      const c=ws.getCell(row,i+1); c.value=h; styleHeader(c)
    })
    row++
    dirs.forEach((c,i) => {
      ws.getRow(row).height=16
      const even=i%2===1
      const vals=[c.fecha||'',c.tipo||'',c.descripcion||'',
        presupuesto.find(b=>b.id===c.actividad_id)?.descripcion||'—',
        c.numero_documento||'—',parseFloat(c.monto)||0,'']
      vals.forEach((v,ci)=>{
        const cell=ws.getCell(row,ci+1)
        styleData(cell,{even,align:ci===5?'right':'left',
          numFmt:ci===5?'"$"#,##0.00':undefined,color:ci===5?GREEN_HX:'000000'})
        cell.value=v
      })
      row++
    })
    ws.mergeCells(row,1,row,COLS-1); const dt=ws.getCell(row,1); dt.value=isEs?'SUBTOTAL COSTOS DIRECTOS':'DIRECT COSTS SUBTOTAL'; styleTotal(dt)
    const dv=ws.getCell(row,COLS); dv.value=totalDir; dv.numFmt='"$"#,##0.00'; styleTotal(dv)
    row+=2
  }

  // Pie de página
  row++
  ws.mergeCells(row,1,row,COLS)
  const footer=ws.getCell(row,1)
  footer.value=isEs?`${nombreEmpresa} · MARY ERP — Management And Resources Yield · Documento generado automáticamente`:`${nombreEmpresa} · MARY ERP — Management And Resources Yield · Automatically generated document`
  footer.font={ size:8, name:'Arial', color:{ argb:'FF9CA3AF' }, italic:true }
  footer.alignment={ horizontal:'center' }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${isEs?'Resumen_General':'General_Summary'}_${proy?.project_code}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────
export default function Reportes() {
  const { state } = useStore()
  const { t, lang } = useContext(LangContext)
  const { perfil } = useAuth()
  const nombreEmpresa = perfil?.tenants?.nombre_empresa || 'Marquez Project Solutions LLC'
  const isEs = lang === 'ES'
  const {
    proyectos, presupuesto, materiales, entradas, salidas,
    costos_directos, nominas, subcontratos, equipos, costos_indirectos,
    subcontratos_contratos = [], subcontratos_avaluos = [],
    subcontratos_items = [], subcontratos_avaluo_items = [],
    subcontratos_retenciones = [], ordenes_pago_retencion = [],
    presupuesto_indirectos = [],
    avaluos_cliente = [], avaluos_cliente_items = [],
    ordenes_cambio = [], ordenes_cambio_items = [],
  } = state

  const [reportType, setReportType] = useState('financiero')
  const [proyId, setProyId]         = useState(proyectos[0]?.id || '')
  const [desde, setDesde]           = useState('')
  const [hasta, setHasta]           = useState('')
  const [loading, setLoading]       = useState(false)

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const items          = presupuesto.filter(b => b.proyecto_id === proyId)
  const totalDirectos  = calcGrandTotal(items)
  const indsDelProy    = presupuesto_indirectos.filter(p => p.proyecto_id === proyId)
  const totalIndPres   = indsDelProy.reduce((s, p) => s + parseFloat(p.monto_presupuestado || 0), 0)
  const subtotalPres   = totalDirectos + totalIndPres
  const utilidadPct    = parseFloat(proy?.utilidad_pct || 0)
  const impuestoPct    = parseFloat(proy?.impuesto_pct || 0)
  const utilidadMonto  = round2(subtotalPres * (utilidadPct / 100))
  const granTotalPres  = round2(subtotalPres + utilidadMonto)
  const impuestoMonto  = round2(granTotalPres * (impuestoPct / 100))
  const budget         = round2(granTotalPres + impuestoMonto)

  const datosFinanciero = useMemo(() => {
    if (!proyId) return null
    const isEs  = lang === 'ES'
    const filtro = f => inPeriodo(f, desde, hasta)

    const dirs  = costos_directos.filter(c => c.proyecto_id===proyId && filtro(c.fecha||c.created_at?.slice(0,10)))
    const noms  = nominas.filter(n => n.proyecto_id===proyId && filtro(n.periodo_fin))
    const subs  = subcontratos.filter(s => s.proyecto_id===proyId && filtro(s.created_at?.slice(0,10)))
    const eqs   = equipos.filter(e => e.proyecto_id===proyId && filtro(e.created_at?.slice(0,10)))
    const inds  = costos_indirectos.filter(c => c.proyecto_id===proyId && filtro(c.fecha||c.created_at?.slice(0,10)))

    const totalMat = salidas.filter(s=>s.proyecto_id===proyId&&filtro(s.fecha_salida)).reduce((s,sa)=>{
      const e=entradas.find(en=>en.material_id===sa.material_id)
      return s+round2((parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0))
    },0)
    const totalDir = dirs.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
    const totalNom = noms.reduce((s,n)=>s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0),0)
    // totalSub: avalúos aprobados del nuevo sistema + monto_pagado del sistema anterior
    const scIds = subcontratos_contratos.filter(sc=>sc.proyecto_id===proyId).map(sc=>sc.id)
    const totalSubNuevo = subcontratos_avaluos
      .filter(a=>scIds.includes(a.subcontrato_id) && a.estado==='aprobado' &&
        filtro(a.periodo_inicio || a.fecha_elaboracion || a.created_at?.slice(0,10)))
      .reduce((s,a)=>s+(parseFloat(a.monto_total)||0),0)
    const totalSubAntiguo = subs.reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
    const totalSub = totalSubNuevo + totalSubAntiguo
    const costoEfectivoEq = (e) => (e.costo_real && (e.estado_equipo==='ajustado'||e.estado_equipo==='cerrado_parcial')) ? parseFloat(e.costo_real) : parseFloat(e.costo_total)||0
    const totalEq  = eqs.reduce((s,e)=>s+costoEfectivoEq(e),0)
    const totalInd = inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
    const totalReal = totalMat+totalDir+totalNom+totalSub+totalEq+totalInd

    const actividades = flatBudgetItems(items).filter(i=>i.tipo==='actividad').map(act => {
      const pres=round2((act.cantidad||0)*((act.costo_mo||0)+(act.costo_materiales||0)+(act.costo_equipos||0)))
      // Real por actividad: materiales + imprevistos + subcontratos (nuevo y anterior)
      const scActIds = subcontratos_contratos.filter(sc=>sc.proyecto_id===proyId&&sc.actividad_id===act.id).map(sc=>sc.id)
      const realScNuevo = subcontratos_avaluos
        .filter(a=>scActIds.includes(a.subcontrato_id)&&a.estado==='aprobado')
        .reduce((s,a)=>s+(parseFloat(a.monto_total)||0),0)
      const realScAntiguo = subcontratos.filter(s=>s.proyecto_id===proyId&&s.actividad_id===act.id)
        .reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
      const real=salidas.filter(s=>s.proyecto_id===proyId&&s.actividad_id===act.id)
        .reduce((s,sa)=>{const e=entradas.find(en=>en.material_id===sa.material_id);return s+round2((parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0))},0)
        +costos_directos.filter(c=>c.proyecto_id===proyId&&c.actividad_id===act.id).reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
        +realScNuevo+realScAntiguo
        +eqs.filter(e=>e.actividad_id===act.id).reduce((s,e)=>s+costoEfectivoEq(e),0)
      const dev=real-pres
      return {code:act.code,descripcion:act.descripcion,pres,real,dev,devPct:pres>0?(dev/pres)*100:0}
    }).filter(a=>a.pres>0||a.real>0)

    // Avalúos del proyecto
    const avsProy  = avaluos_cliente.filter(a => a.proyecto_id === proyId)
    const avsItems = avaluos_cliente_items.filter(i => avsProy.some(a => a.id === i.avaluo_id))

    // Indirectos presupuestados
    const indsPres = presupuesto_indirectos.filter(p => p.proyecto_id === proyId)

    // Comparación indirectos
    const CATS_IND = isEs ? [
      'Administración de obra',
      'Instalaciones y servicios generales',
      'Seguros, fianzas y garantías',
      'Servicios profesionales y legales',
    ] : [
      'Construction Management',
      'General Installations and Services',
      'Insurance, Bonds and Guarantees',
      'Professional and Legal Services',
    ]
    const comparacionInd = CATS_IND.map(cat => {
      const presupuestado = parseFloat(indsPres.find(p => p.categoria === cat)?.monto_presupuestado || 0)
      const ejecutado     = inds.filter(c => c.categoria === cat || c.categoria?.includes(cat.split(' ')[0]))
                               .reduce((s,c) => s + parseFloat(c.monto||0), 0)
      return { categoria: cat, presupuestado, ejecutado, diferencia: presupuestado - ejecutado }
    }).filter(r => r.presupuestado > 0 || r.ejecutado > 0)

    // Órdenes de Cambio del proyecto
    const ocsDelProy      = ordenes_cambio.filter(o => o.proyecto_id === proyId)
    const ocsAprobadas    = ocsDelProy.filter(o => o.estado === 'aprobada')
    const deltaOCs        = ocsAprobadas.reduce((s, o) => s + parseFloat(o.total_oc || 0), 0)
    const budgetRevisado  = budget + deltaOCs
    const ocsItems        = ordenes_cambio_items.filter(i => ocsDelProy.some(o => o.id === i.oc_id))

    // Subcontratos nuevo sistema para el reporte
    const scContratos = subcontratos_contratos.filter(sc => sc.proyecto_id === proyId)
    const scAvaluosDetalle = subcontratos_avaluos.filter(a =>
      scContratos.some(sc => sc.id === a.subcontrato_id) && a.estado === 'aprobado')
    // Retenciones del proyecto
    const retenciones = subcontratos_retenciones.filter(r => r.proyecto_id === proyId)
    const ordenesPago = ordenes_pago_retencion.filter(o => o.proyecto_id === proyId)

    return {
      resumen:[
        {categoria: t('rep_cat_materiales'),   real:totalMat},
        {categoria: t('rep_cat_imprevistos'),   real:totalDir},
        {categoria: t('rep_cat_nomina'),        real:totalNom},
        {categoria: t('rep_cat_subcontratos'),  real:totalSub},
        {categoria: t('rep_cat_equipos'),       real:totalEq},
        {categoria: t('rep_cat_admin'),         real:totalInd},
      ],
      actividades, totalReal, dirs, noms, subs, eqs, inds,
      avsProy, avsItems, indsPres, comparacionInd,
      ocsDelProy, ocsAprobadas, deltaOCs, budgetRevisado, ocsItems,
      scContratos, scAvaluosDetalle, retenciones, ordenesPago,
    }
  }, [proyId, desde, hasta, lang, presupuesto, salidas, entradas, costos_directos, nominas, subcontratos, subcontratos_contratos, subcontratos_avaluos, subcontratos_items, subcontratos_avaluo_items, subcontratos_retenciones, ordenes_pago_retencion, equipos, costos_indirectos, avaluos_cliente, avaluos_cliente_items, presupuesto_indirectos, ordenes_cambio, ordenes_cambio_items, t])

  const datosInventario = useMemo(() => ({
    mats:    materiales.filter(m=>m.activo!==false),
    entradas: entradas.filter(e=>inPeriodo(e.fecha_recepcion,desde,hasta)),
    salidas:  salidas.filter(s=>inPeriodo(s.fecha_salida,desde,hasta)),
  }), [materiales, entradas, salidas, desde, hasta])

  const handleExport = async () => {
    setLoading(true)
    try {
      if (reportType==='financiero' && datosFinanciero) {
        await buildFinanciero({ data:datosFinanciero, budget, moneda, proy, desde, hasta, presupuesto,
          presupuesto_indirectos, avaluos_cliente, avaluos_cliente_items, lang, nombreEmpresa })
      } else if (reportType==='inventario') {
        await buildInventario({ data:datosInventario, materiales, proyectos, presupuesto, desde, hasta, lang, nombreEmpresa })
      } else if (reportType==='general' && proyId) {
        await buildResumenGeneral({ proy, proyectos, presupuesto, costos_directos, nominas,
          subcontratos, subcontratos_contratos, subcontratos_avaluos,
          equipos, costos_indirectos, salidas, entradas, budget, moneda, lang, nombreEmpresa })
      } else if (reportType==='retenciones' && datosFinanciero) {
        await buildRetenciones({ data: datosFinanciero, proy, moneda, lang, nombreEmpresa })
      }
    } catch(e) { console.error(e); alert('Error generando el reporte: ' + e.message) }
    setLoading(false)
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{isEs?'Reportes':'Reports'}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{isEs?'Genera y exporta reportes a Excel con formato profesional':'Generate and export professionally formatted Excel reports'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {isEs?'Configurar reporte':'Configure report'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">{isEs?'Tipo de reporte':'Report type'}</label>
            <select className={inputCls+' w-full'} value={reportType} onChange={e=>setReportType(e.target.value)}>
              <option value="financiero">📊 {isEs?'Reporte Financiero':'Financial Report'}</option>
              <option value="inventario">📦 {isEs?'Reporte de Inventario':'Inventory Report'}</option>
              <option value="general">📋 {isEs?'Resumen General del Proyecto':'General Project Summary'}</option>
              <option value="retenciones">🔒 {t('rep_type_retenciones')}</option>
            </select>
          </div>
          {(reportType==='financiero'||reportType==='general'||reportType==='retenciones') && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('lbl_project')} *</label>
              <select className={inputCls+' w-full'} value={proyId} onChange={e=>setProyId(e.target.value)}>
                <option value="">— {t('lbl_select')} —</option>
                {proyectos.map(p=><option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">{isEs?'Desde':'From'}</label>
            <input type="date" className={inputCls+' w-full'} value={desde} onChange={e=>setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{isEs?'Hasta':'To'}</label>
            <input type="date" className={inputCls+' w-full'} value={hasta} onChange={e=>setHasta(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleExport}
            disabled={loading||((reportType==='financiero'||reportType==='general'||reportType==='retenciones')&&!proyId)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-40 transition-all hover:opacity-90"
            style={{background:BRAND}}>
            {loading
              ? <><span className="animate-spin">⏳</span> {isEs?'Generando...':'Generating...'}</>
              : <><span>⬇</span> {isEs?'Descargar Excel':'Download Excel'}</>
            }
          </button>
          <button onClick={()=>window.print()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
            🖨 {isEs?'Imprimir vista':'Print view'}
          </button>
        </div>
      </div>

      {/* Vista previa */}
      {reportType==='financiero' && proyId && datosFinanciero && (
        <VistaFinanciero data={datosFinanciero} budget={budget} moneda={moneda} proy={proy} desde={desde} hasta={hasta} fmt={fmt} />
      )}
      {reportType==='inventario' && (
        <VistaInventario data={datosInventario} materiales={materiales} proyectos={proyectos} presupuesto={presupuesto} fmtDate={fmtDate} fmtNum={fmtNum} />
      )}
      {reportType==='retenciones' && proyId && datosFinanciero && (
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-sm font-semibold text-amber-700 mb-2">🔒 {t('rep_type_retenciones')}</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">{isEs?'Subcontratos':'Subcontracts'}</p>
              <p className="font-bold text-gray-800">{datosFinanciero.scContratos?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{isEs?'Retenciones':'Retentions'}</p>
              <p className="font-bold text-amber-700">{datosFinanciero.retenciones?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{isEs?'Órdenes de pago':'Payment orders'}</p>
              <p className="font-bold text-gray-800">{datosFinanciero.ordenesPago?.length || 0}</p>
            </div>
          </div>
        </div>
      )}
      {reportType==='general' && proyId && (
        <VistaGeneral proy={proy} presupuesto={presupuesto} costos_directos={costos_directos}
          nominas={nominas} subcontratos={subcontratos} equipos={equipos}
          costos_indirectos={costos_indirectos} salidas={salidas} entradas={entradas}
          subcontratos_contratos={subcontratos_contratos}
          subcontratos_avaluos={subcontratos_avaluos}
          budget={budget} moneda={moneda} fmt={fmt} fmtNum={fmtNum} />
      )}
    </div>
  )
}

// ── VISTAS EN APP ─────────────────────────────────────────
function VistaFinanciero({ data, budget, moneda, proy, desde, hasta, fmt }) {
  const { lang } = useContext(LangContext)
  const isEs = lang === 'ES'
  const { resumen, actividades, totalReal } = data
  const desviacion = totalReal - budget
  const thS = { background: BRAND }
  const thC = 'px-4 py-2.5 text-left text-xs font-semibold text-white'
  const tdC = 'px-4 py-2.5 text-sm text-gray-700'
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:isEs?'Presupuesto total':'Total budget',   val:fmt(budget,moneda),    color:BRAND},
          {label:isEs?'Costo real ejecutado':'Real cost executed',val:fmt(totalReal,moneda), color:'#1D9E75'},
          {label:isEs?'Desviación':'Deviation',          val:`${desviacion>=0?'+':''}${fmt(desviacion,moneda)}`, color:desviacion>0?'#ef4444':'#1D9E75'},
          {label:isEs?'% Ejecución':'% Execution',         val:budget>0?`${((totalReal/budget)*100).toFixed(1)}%`:'0%', color:BRAND},
        ].map((k,i)=>(
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className="text-lg font-bold" style={{color:k.color}}>{k.val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b" style={{borderColor:'#D6E4F0'}}><p className="text-sm font-semibold text-gray-700">{isEs?'Resumen por categoría':'Summary by category'}</p></div>
        <table className="w-full">
          <thead><tr style={thS}><th className={thC}>{isEs?'Categoría':'Category'}</th><th className={thC+' text-right'}>{isEs?'Costo real':'Real cost'}</th><th className={thC+' text-right'}>{isEs?'% del total':'% of total'}</th></tr></thead>
          <tbody>
            {resumen.map((r,i)=>(
              <tr key={i} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                <td className={tdC}>{r.categoria}</td>
                <td className={tdC+' text-right font-mono'}>{fmt(r.real,moneda)}</td>
                <td className={tdC+' text-right'}>{totalReal>0?`${((r.real/totalReal)*100).toFixed(1)}%`:'—'}</td>
              </tr>
            ))}
            <tr style={{background:'#EEF2F7'}}><td className={tdC+' font-bold'}>TOTAL</td><td className={tdC+' text-right font-mono font-bold'}>{fmt(totalReal,moneda)}</td><td className={tdC+' text-right font-bold'}>100%</td></tr>
          </tbody>
        </table>
      </div>
      {actividades.length>0&&(
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b" style={{borderColor:'#D6E4F0'}}><p className="text-sm font-semibold text-gray-700">{isEs?'Presupuesto vs Real por actividad':'Budget vs Actual by activity'}</p></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={thS}>{[isEs?'Código':'Code',isEs?'Actividad':'Activity',isEs?'Presupuestado':'Budgeted',isEs?'Real':'Real',isEs?'Saldo en Presupuesto $':'Budget Balance $',isEs?'S.%':'B.%',isEs?'Estado':'Status'].map((h,i)=><th key={i} className={thC+(i>1?' text-right':'')}>{h}</th>)}</tr></thead>
              <tbody>
                {actividades.map((a,i)=>{
                  // Saldo = presupuestado - real (positivo = queda presupuesto, negativo = sobrecosto)
                  const saldo = a.pres - a.real
                  const saldoPct = a.pres > 0 ? (saldo / a.pres) * 100 : 0
                  const saldoColor = saldo >= 0 ? '#1D9E75' : '#ef4444'
                  // Estado basado en si el real supera el presupuesto
                  const pctUsado = a.pres > 0 ? (a.real / a.pres) * 100 : 0
                  const status = pctUsado <= 100 ? 'ok' : pctUsado <= 115 ? 'alerta' : 'critico'
                  return(<tr key={i} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                    <td className={tdC+' font-mono text-xs'}>{a.code}</td>
                    <td className={tdC+' max-w-[160px] truncate'}>{a.descripcion}</td>
                    <td className={tdC+' text-right font-mono'}>{fmt(a.pres,moneda)}</td>
                    <td className={tdC+' text-right font-mono'}>{fmt(a.real,moneda)}</td>
                    <td className={tdC+' text-right font-mono font-medium'} style={{color:saldoColor}}>{saldo>=0?'+':''}{fmt(saldo,moneda)}</td>
                    <td className={tdC+' text-right'} style={{color:saldoColor}}>{saldoPct>=0?'+':''}{saldoPct.toFixed(1)}%</td>
                    <td className={tdC}><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status==='ok'?'bg-green-100 text-green-700':status==='alerta'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>{status==='ok'?'✓ OK':status==='alerta'?'⚠ Alerta':'⚠ Crítico'}</span></td>
                  </tr>)
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data.avsProy?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b" style={{borderColor:'#D6E4F0'}}>
            <p className="text-sm font-semibold text-gray-700">{isEs?'Avalúo financiero acumulado':'Accumulated financial progress billing'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={thS}>
                {[isEs?'Avalúo':'Billing',isEs?'Actividad':'Activity',isEs?'Contrato $':'Contract $',isEs?'Ant. $':'Prev. $',isEs?'Periodo $':'Period $',isEs?'Acumulado $':'Accum. $',isEs?'Saldo $':'Balance $'].map((h,i)=>(
                  <th key={i} className={thC+(i>1?' text-right':'')}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.avsProy.map(av => {
                  const avItems = data.avsItems.filter(i => i.avaluo_id === av.id)
                  return avItems.map((it,idx) => (
                    <tr key={it.id} className={idx%2===0?'bg-white':'bg-gray-50/50'}>
                      <td className={tdC+' text-xs font-mono'}>{av.numero_avaluo||av.folio||'—'}</td>
                      <td className={tdC+' max-w-[160px] truncate'}>{it.descripcion}</td>
                      <td className={tdC+' text-right font-mono'}>{fmt(it.monto_contrato,moneda)}</td>
                      <td className={tdC+' text-right font-mono text-gray-400'}>{parseFloat(it.monto_anterior||0)>0?fmt(it.monto_anterior,moneda):'—'}</td>
                      <td className={tdC+' text-right font-mono font-medium'} style={{color:'#1D9E75'}}>{fmt(it.monto_periodo,moneda)}</td>
                      <td className={tdC+' text-right font-mono font-bold'} style={{color:BRAND}}>{fmt(it.monto_acumulado,moneda)}</td>
                      <td className={tdC+' text-right font-mono'} style={{color: (parseFloat(it.monto_contrato||0) - parseFloat(it.monto_acumulado||0)) < 0 ? '#DC2626' : '#374151'}}>{fmt(parseFloat(it.monto_contrato||0) - parseFloat(it.monto_acumulado||0), moneda)}</td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data.comparacionInd?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b" style={{borderColor:'#D6E4F0'}}>
            <p className="text-sm font-semibold text-gray-700">{isEs?'Costos indirectos: presupuestado vs ejecutado':'Indirect costs: budgeted vs executed'}</p>
          </div>
          <table className="w-full">
            <thead><tr style={thS}>
              {[isEs?'Categoría':'Category',isEs?'Presupuestado':'Budgeted',isEs?'Ejecutado':'Executed',isEs?'Diferencia':'Difference',isEs?'Estado':'Status'].map((h,i)=>(
                <th key={i} className={thC+(i>0?' text-right':'')}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.comparacionInd.map((r,i)=>{
                const status = r.diferencia < 0 ? (isEs?'Sobrecosto':'Overrun') : r.diferencia===0 ? (isEs?'En punto':'On budget') : (isEs?'Ahorro':'Saving')
                const clr    = r.diferencia < 0 ? '#ef4444' : '#1D9E75'
                return (
                  <tr key={i} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                    <td className={tdC}>{r.categoria}</td>
                    <td className={tdC+' text-right font-mono'}>{fmt(r.presupuestado,moneda)}</td>
                    <td className={tdC+' text-right font-mono'}>{fmt(r.ejecutado,moneda)}</td>
                    <td className={tdC+' text-right font-mono font-bold'} style={{color:clr}}>{r.diferencia>=0?'+':''}{fmt(r.diferencia,moneda)}</td>
                    <td className={tdC+' text-right'}><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.diferencia<0?'bg-red-100 text-red-600':r.diferencia===0?'bg-gray-100 text-gray-600':'bg-green-100 text-green-700'}`}>{status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SECCIÓN: Órdenes de Cambio ── */}
      {data.ocsDelProy?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{borderColor:'#D6E4F0'}}>
            <p className="text-sm font-semibold text-gray-700">
              {isEs ? 'Órdenes de Cambio' : 'Change Orders'}
              <span className="ml-2 text-xs text-gray-400">({data.ocsDelProy.length})</span>
            </p>
            {data.deltaOCs !== 0 && (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-400">{isEs ? 'Pres. original:' : 'Original budget:'} <span className="font-mono font-medium text-gray-700">{fmt(budget, moneda)}</span></span>
                <span style={{color:'#F59E0B'}}>{isEs ? 'Variación OCs:' : 'CO variation:'} <span className="font-mono font-medium">{data.deltaOCs >= 0 ? '+' : ''}{fmt(data.deltaOCs, moneda)}</span></span>
                <span style={{color:BRAND}}>{isEs ? 'Pres. revisado:' : 'Revised budget:'} <span className="font-mono font-bold">{fmt(data.budgetRevisado, moneda)}</span></span>
              </div>
            )}
          </div>
          <table className="w-full">
            <thead><tr style={thS}>
              {[isEs?'Número':'Number', isEs?'Fecha':'Date', isEs?'Estado':'Status',
                isEs?'Motivo':'Reason', isEs?'Presentado a':'Submitted to',
                isEs?'Total OC':'CO Total', isEs?'% variación':'% variation'
              ].map((h,i)=>(
                <th key={i} className={thC+(i>4?' text-right':'')}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.ocsDelProy.map((oc, i) => {
                const total   = parseFloat(oc.total_oc || 0)
                const varPct  = budget > 0 ? ((total / budget) * 100).toFixed(2) : '—'
                const isAprobada = oc.estado === 'aprobada'
                const ESTADOS = { borrador: isEs?'Borrador':'Draft', presentada: isEs?'Presentada':'Submitted', aprobada: isEs?'Aprobada':'Approved', rechazada: isEs?'Rechazada':'Rejected' }
                return (
                  <tr key={oc.id} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                    <td className={tdC+' font-mono text-xs font-semibold'} style={{color:BRAND}}>{oc.numero||'—'}</td>
                    <td className={tdC+' text-xs text-gray-500'}>{oc.fecha||'—'}</td>
                    <td className={tdC}>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${isAprobada ? 'bg-green-100 text-green-700'
                          : oc.estado==='rechazada' ? 'bg-red-100 text-red-600'
                          : oc.estado==='presentada' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'}`}>
                        {ESTADOS[oc.estado] || oc.estado}
                      </span>
                    </td>
                    <td className={tdC+' max-w-[160px] truncate text-xs text-gray-500'}>{oc.motivo||'—'}</td>
                    <td className={tdC+' text-xs text-gray-500'}>{oc.presentado_a||'—'}</td>
                    <td className={tdC+' text-right font-mono font-bold'} style={{color: isAprobada ? '#1D9E75' : '#6b7280'}}>
                      {total > 0 ? (total >= 0 ? '+' : '') + fmt(total, moneda) : '—'}
                    </td>
                    <td className={tdC+' text-right text-xs'} style={{color: isAprobada ? '#1D9E75' : '#9ca3af'}}>
                      {varPct !== '—' ? `${total >= 0 ? '+' : ''}${varPct}%` : '—'}
                    </td>
                  </tr>
                )
              })}
              <tr style={{background:'#EEF2F7'}}>
                <td colSpan={5} className={tdC+' font-bold text-xs'} style={{color:BRAND}}>{isEs ? 'TOTAL APROBADO' : 'TOTAL APPROVED'}</td>
                <td className={tdC+' text-right font-mono font-bold'} style={{color:'#1D9E75'}}>
                  {data.deltaOCs > 0 ? `+${fmt(data.deltaOCs, moneda)}` : fmt(data.deltaOCs, moneda)}
                </td>
                <td className={tdC+' text-right text-xs font-medium'} style={{color:'#1D9E75'}}>
                  {budget > 0 ? `${((data.deltaOCs / budget) * 100).toFixed(2)}%` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function VistaInventario({ data, materiales, proyectos, presupuesto, fmtDate, fmtNum }) {
  const { lang } = useContext(LangContext)
  const isEs = lang === 'ES'
  const [subTab,setSubTab]=useState(0)
  const thS={background:BRAND}
  const thC='px-4 py-2.5 text-left text-xs font-semibold text-white'
  const tdC='px-4 py-2.5 text-sm text-gray-700'
  return(
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-gray-200">
        {['Stock actual','Entradas','Salidas'].map((label,i)=>(
          <button key={i} onClick={()=>setSubTab(i)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${subTab===i?'border-[#1B3A6B] text-[#1B3A6B]':'border-transparent text-gray-500'}`}>
            {label} <span className="ml-1 text-xs text-gray-400">({[data.mats.length,data.entradas.length,data.salidas.length][i]})</span>
          </button>
        ))}
      </div>
      {subTab===0&&<div className="bg-white rounded-xl border border-gray-100 overflow-x-auto"><table className="w-full">
        <thead><tr style={thS}>{['Código','Descripción','Unidad','Ubicación','Stock actual','Stock mín.','Estado'].map((h,i)=><th key={i} className={thC}>{h}</th>)}</tr></thead>
        <tbody>{data.mats.map((m,i)=>{const crit=parseFloat(m.stock_actual||0)<=parseFloat(m.stock_minimo||0);return(<tr key={m.id} className={i%2===0?'bg-white':'bg-gray-50/50'}><td className={tdC+' font-mono text-xs'}>{m.codigo}</td><td className={tdC}>{m.descripcion}</td><td className={tdC}>{m.unidad}</td><td className={tdC}>{m.ubicacion_bodega||'—'}</td><td className={tdC+' font-mono font-medium'} style={{color:crit?'#ef4444':'#1D9E75'}}>{fmtNum(m.stock_actual)}</td><td className={tdC+' font-mono'}>{fmtNum(m.stock_minimo)}</td><td className={tdC}><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${crit?'bg-red-100 text-red-600':'bg-green-100 text-green-700'}`}>{crit?'Crítico':'OK'}</span></td></tr>)})}</tbody>
      </table></div>}
      {subTab===1&&<div className="bg-white rounded-xl border border-gray-100 overflow-x-auto"><table className="w-full">
        <thead><tr style={thS}>{['Fecha','Código','Material','Cantidad','Precio unit.','Total','Factura','Proveedor','Proyecto'].map((h,i)=><th key={i} className={thC}>{h}</th>)}</tr></thead>
        <tbody>{data.entradas.map((e,i)=>{const m=materiales.find(x=>x.id===e.material_id);const p=proyectos.find(x=>x.id===e.proyecto_id);const total=round2((parseFloat(e.cantidad)||0)*(parseFloat(e.precio_unitario)||0));return(<tr key={e.id} className={i%2===0?'bg-white':'bg-gray-50/50'}><td className={tdC}>{fmtDate(e.fecha_recepcion)}</td><td className={tdC+' font-mono text-xs'}>{m?.codigo||'—'}</td><td className={tdC}>{m?.descripcion||'—'}</td><td className={tdC+' font-mono text-green-600'}>+{fmtNum(e.cantidad)}</td><td className={tdC+' font-mono'}>${fmtNum(e.precio_unitario)}</td><td className={tdC+' font-mono font-medium'}>${fmtNum(total)}</td><td className={tdC}>{e.numero_factura||'—'}</td><td className={tdC}>{e.proveedor||'—'}</td><td className={tdC+' text-xs'}>{p?.project_code||'—'}</td></tr>)})}</tbody>
      </table></div>}
      {subTab===2&&<div className="bg-white rounded-xl border border-gray-100 overflow-x-auto"><table className="w-full">
        <thead><tr style={thS}>{['Fecha','Código','Material','Cantidad','Proyecto','Actividad'].map((h,i)=><th key={i} className={thC}>{h}</th>)}</tr></thead>
        <tbody>{data.salidas.map((s,i)=>{const m=materiales.find(x=>x.id===s.material_id);const p=proyectos.find(x=>x.id===s.proyecto_id);const act=presupuesto.find(x=>x.id===s.actividad_id);return(<tr key={s.id} className={i%2===0?'bg-white':'bg-gray-50/50'}><td className={tdC}>{fmtDate(s.fecha_salida)}</td><td className={tdC+' font-mono text-xs'}>{m?.codigo||'—'}</td><td className={tdC}>{m?.descripcion||'—'}</td><td className={tdC+' font-mono text-red-500'}>-{fmtNum(s.cantidad)}</td><td className={tdC+' text-xs'}>{p?.project_code||'—'}</td><td className={tdC+' text-xs'}>{act?`${act.code} — ${act.descripcion}`:'—'}</td></tr>)})}</tbody>
      </table></div>}
    </div>
  )
}

function VistaGeneral({ proy, presupuesto, costos_directos, nominas, subcontratos, equipos, costos_indirectos, salidas, entradas, subcontratos_contratos = [], subcontratos_avaluos = [], budget, moneda, fmt, fmtNum }) {
  const { lang, t } = useContext(LangContext)
  const isEs = lang === 'ES'
  const proyId=proy?.id
  const thS={background:BRAND}
  const thC='px-4 py-2.5 text-left text-xs font-semibold text-white'
  const tdC='px-4 py-2.5 text-sm text-gray-700'
  const totalMat=salidas.filter(s=>s.proyecto_id===proyId).reduce((s,sa)=>{const e=entradas.find(en=>en.material_id===sa.material_id);return s+round2((parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0))},0)
  const dirs=costos_directos.filter(c=>c.proyecto_id===proyId)
  const noms=nominas.filter(n=>n.proyecto_id===proyId)
  const subs=subcontratos.filter(s=>s.proyecto_id===proyId)
  const eqs=equipos.filter(e=>e.proyecto_id===proyId)
  const inds=costos_indirectos.filter(c=>c.proyecto_id===proyId)
  const totalDir=dirs.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  const totalNom=noms.reduce((s,n)=>s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0),0)
  // totalSub: avalúos aprobados del nuevo sistema + fallback sistema anterior
  const scIdsVG = subcontratos_contratos.filter(sc=>sc.proyecto_id===proyId).map(sc=>sc.id)
  const totalSubNuevo = subcontratos_avaluos
    .filter(a=>scIdsVG.includes(a.subcontrato_id)&&a.estado==='aprobado')
    .reduce((s,a)=>s+(parseFloat(a.monto_total)||0),0)
  const totalSubAntiguo = subs.reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
  const totalSub = totalSubNuevo + totalSubAntiguo
  const costoEfectivoEq = (e) => (e.costo_real && (e.estado_equipo==='ajustado'||e.estado_equipo==='cerrado_parcial')) ? parseFloat(e.costo_real) : parseFloat(e.costo_total)||0
  const totalEq=eqs.reduce((s,e)=>s+costoEfectivoEq(e),0)
  const totalInd=inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  const totalReal=totalMat+totalDir+totalNom+totalSub+totalEq+totalInd
  const desviacion=totalReal-budget
  return(
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">{isEs?'Información del proyecto':'Project information'}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[[isEs?'Código':'Code',proy?.project_code],[isEs?'Cliente':'Client',proy?.cliente_externo||'—'],[isEs?'Estado':'Status',t(`estado_${proy?.estado}`)],[isEs?'Moneda':'Currency',moneda],[isEs?'Inicio':'Start',proy?.fecha_inicio||'—'],[isEs?'Fin est.':'Est. end',proy?.fecha_fin_estimada||'—'],[isEs?'Ciudad':'City',proy?.ciudad||'—'],[isEs?'País':'Country',proy?.pais||'—']].map(([k,v],i)=>(
            <div key={i}><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-gray-700">{v}</p></div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{label:isEs?'Presupuesto total':'Total budget',val:fmt(budget,moneda),color:BRAND},{label:isEs?'Costo real total':'Total real cost',val:fmt(totalReal,moneda),color:'#1D9E75'},{label:isEs?'Desviación':'Deviation',val:`${desviacion>=0?'+':''}${fmt(desviacion,moneda)}`,color:desviacion>0?'#ef4444':'#1D9E75'},{label:isEs?'% Ejecución':'% Execution',val:budget>0?`${((totalReal/budget)*100).toFixed(1)}%`:'0%',color:BRAND}].map((k,i)=>(
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400 mb-1">{k.label}</p><p className="text-lg font-bold" style={{color:k.color}}>{k.val}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b" style={{borderColor:'#D6E4F0'}}><p className="text-sm font-semibold text-gray-700">{isEs?'Resumen de costos':'Cost summary'}</p></div>
        <table className="w-full">
          <thead><tr style={thS}><th className={thC}>{isEs?'Categoría':'Category'}</th><th className={thC+' text-right'}>{isEs?'Monto':'Amount'}</th><th className={thC+' text-right'}>{isEs?'% del total':'% of total'}</th></tr></thead>
          <tbody>
            {[[isEs?'Materiales':'Materials',totalMat],[isEs?'Imprevistos':'Contingencies',totalDir],[isEs?'Nómina / Planilla':'Payroll',totalNom],[isEs?'Subcontratos':'Subcontracts',totalSub],[isEs?'Equipos':'Equipment',totalEq],[isEs?'Administración':'Administration',totalInd]].map(([cat,val],i)=>(
              <tr key={i} className={i%2===0?'bg-white':'bg-gray-50/50'}><td className={tdC}>{cat}</td><td className={tdC+' text-right font-mono'}>{fmt(val,moneda)}</td><td className={tdC+' text-right'}>{totalReal>0?`${((val/totalReal)*100).toFixed(1)}%`:'—'}</td></tr>
            ))}
            <tr style={{background:'#EEF2F7'}}><td className={tdC+' font-bold'}>{isEs?'TOTAL REAL':'TOTAL REAL'}</td><td className={tdC+' text-right font-mono font-bold'}>{fmt(totalReal,moneda)}</td><td className={tdC+' text-right font-bold'}>100%</td></tr>
          </tbody>
        </table>
      </div>
      {noms.length>0&&<div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b flex justify-between" style={{borderColor:'#D6E4F0'}}><p className="text-sm font-semibold text-gray-700">{isEs?'Nómina / Planilla':'Payroll'}</p><span className="text-sm font-mono font-semibold" style={{color:BRAND}}>{fmt(totalNom,moneda)}</span></div>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr style={thS}>{[isEs?'Trabajador':'Worker',isEs?'Cargo':'Position',isEs?'Período':'Period',isEs?'Base':'Base',isEs?'Deducciones':'Deductions',isEs?'Neto':'Net'].map((h,i)=><th key={i} className={thC}>{h}</th>)}</tr></thead><tbody>{noms.map((n,i)=>{const neto=(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0);return(<tr key={n.id} className={i%2===0?'bg-white':'bg-gray-50/50'}><td className={tdC}>{n.trabajador}</td><td className={tdC}>{n.cargo||'—'}</td><td className={tdC+' text-xs'}>{n.periodo_inicio} → {n.periodo_fin}</td><td className={tdC+' font-mono'}>{fmt(n.salario_base,moneda)}</td><td className={tdC+' font-mono text-red-500'}>-{fmt(n.deducciones,moneda)}</td><td className={tdC+' font-mono font-semibold'} style={{color:'#1D9E75'}}>{fmt(neto,moneda)}</td></tr>)})}</tbody></table></div>
      </div>}
      {subs.length>0&&<div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b flex justify-between" style={{borderColor:'#D6E4F0'}}><p className="text-sm font-semibold text-gray-700">{isEs?'Subcontratos':'Subcontracts'}</p><span className="text-sm font-mono font-semibold" style={{color:BRAND}}>{fmt(totalSub,moneda)}</span></div>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr style={thS}>{[isEs?'Subcontratista':'Subcontractor',isEs?'Descripción':'Description',isEs?'Contrato':'Contract',isEs?'% Avance':'% Progress',isEs?'Pagado':'Paid'].map((h,i)=><th key={i} className={thC}>{h}</th>)}</tr></thead><tbody>{subs.map((s,i)=>(<tr key={s.id} className={i%2===0?'bg-white':'bg-gray-50/50'}><td className={tdC}>{s.subcontratista}</td><td className={tdC+' text-xs max-w-[160px] truncate'}>{s.descripcion_trabajo||'—'}</td><td className={tdC+' font-mono'}>{fmt(s.monto_contrato,moneda)}</td><td className={tdC}>{fmtNum(s.avance_porcentaje)}%</td><td className={tdC+' font-mono font-semibold'} style={{color:'#1D9E75'}}>{fmt(s.monto_pagado,moneda)}</td></tr>))}</tbody></table></div>
      </div>}
    </div>
  )
}
