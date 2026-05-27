import { useState, useMemo, useContext } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { fmt, fmtNum, calcGrandTotal } from '../utils'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const BRAND    = '#1B3A6B'
const BRAND_HX = '1B3A6B'
const LIGHT_HX = 'EEF2F7'
const WHITE_HX = 'FFFFFF'
const GRAY_HX  = 'F8FAFC'
const GREEN_HX = '1D9E75'
const RED_HX   = 'EF4444'

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
  c1.value = 'Marquez Project Solutions LLC'
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
async function buildFinanciero({ data, budget, moneda, proy, desde, hasta, presupuesto }) {
  const wb  = new ExcelJS.Workbook()
  wb.creator = 'MARY ERP — Marquez Project Solutions LLC'
  wb.created = new Date()

  const proyLabel    = `${proy?.project_code} — ${proy?.nombre}`
  const periodoLabel = desde || hasta ? `${desde||'inicio'} al ${hasta||'hoy'}` : 'Todo el período'
  const fechaHoy     = new Date().toLocaleDateString('es')
  const COLS         = 7

  // ── HOJA 1: Resumen ──
  const ws1 = wb.addWorksheet('Presupuesto vs Real')
  setCols(ws1, [32, 18, 14, 14, 14, 14, 12])

  let row = addHeaderBlock(ws1, 'Reporte Financiero', 'Marquez Project Solutions LLC', proyLabel, periodoLabel, fechaHoy, COLS)

  // KPIs
  row = addSectionTitle(ws1, row, 'RESUMEN EJECUTIVO', COLS)
  const totalReal  = data.resumen.reduce((s,r) => s+r.real, 0)
  const desviacion = totalReal - budget
  const kpis = [
    ['Presupuesto total', budget, '', 'Costo real ejecutado', totalReal, ''],
    ['Desviación', desviacion, '', '% Ejecución', budget>0?totalReal/budget:0, ''],
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
  row = addSectionTitle(ws1, row, 'RESUMEN DE GASTOS POR CATEGORÍA', COLS)

  // Headers
  ws1.getRow(row).height = 18
  ;['Categoría', 'Costo Real', '% del Total', '', '', '', ''].forEach((h, i) => {
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
  const tl = ws1.getCell(row, 1); tl.value = 'TOTAL REAL'; styleTotal(tl)
  const tv = ws1.getCell(row, 2); tv.value = totalReal; tv.numFmt = '"$"#,##0.00'; styleTotal(tv)
  const tp = ws1.getCell(row, 3); tp.value = 1; tp.numFmt = '0.0%'; styleTotal(tp)
  ws1.mergeCells(row, 4, row, COLS)
  row += 2

  // Presupuesto vs Real por actividad
  row = addSectionTitle(ws1, row, 'PRESUPUESTO VS REAL POR ACTIVIDAD', COLS)
  ws1.getRow(row).height = 18
  ;['Código','Actividad','Presupuestado','Real','Saldo en Presupuesto $','S.%','Estado'].forEach((h,i) => {
    const c = ws1.getCell(row, i+1); c.value = h; styleHeader(c)
  })
  row++

  data.actividades.forEach((a, i) => {
    ws1.getRow(row).height = 17
    const even     = i % 2 === 1
    const saldo    = a.pres - a.real
    const devClr   = saldo >= 0 ? GREEN_HX : RED_HX
    const pctUsado = a.pres > 0 ? (a.real / a.pres) * 100 : 0
    const status   = pctUsado <= 100 ? '✓ OK' : pctUsado <= 115 ? '⚠ Alerta' : '⚠ Crítico'
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
  const ws2 = wb.addWorksheet('Detalle por Categoría')
  setCols(ws2, [14, 20, 35, 22, 16, 16, 16])
  let r2 = addHeaderBlock(ws2, 'Detalle de Costos', 'Marquez Project Solutions LLC', proyLabel, periodoLabel, fechaHoy, 7)

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
    'COSTOS DIRECTOS',
    ['Fecha','Tipo','Descripción','Actividad','Documento','Monto'],
    data.dirs.map(c => [c.fecha||'',c.tipo||'',c.descripcion||'',
      presupuesto.find(b=>b.id===c.actividad_id)?.descripcion||'—',
      c.numero_documento||'—', parseFloat(c.monto)||0]),
    data.dirs.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  )

  r2 = addDetalle(ws2, r2,
    'NÓMINA / PLANILLA',
    ['Período inicio','Período fin','Trabajador','Cargo','Salario base','Deducciones','Neto'],
    data.noms.map(n => [n.periodo_inicio||'',n.periodo_fin||'',n.trabajador||'',n.cargo||'',
      parseFloat(n.salario_base)||0, parseFloat(n.deducciones)||0,
      (parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0)]),
    data.noms.reduce((s,n)=>s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0),0)
  )

  r2 = addDetalle(ws2, r2,
    'SUBCONTRATOS',
    ['Subcontratista','Descripción trabajo','Actividad','Contrato','% Avance','Pagado'],
    data.subs.map(s => [s.subcontratista||'',s.descripcion_trabajo||'',
      presupuesto.find(b=>b.id===s.actividad_id)?.descripcion||'—',
      parseFloat(s.monto_contrato)||0, parseFloat(s.avance_porcentaje)||0, parseFloat(s.monto_pagado)||0]),
    data.subs.reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
  )

  r2 = addDetalle(ws2, r2,
    'EQUIPOS',
    ['Descripción','Tipo','Tarifa diaria','Días de uso','Costo total'],
    data.eqs.map(e => [e.descripcion||'',e.tipo||'',
      parseFloat(e.tarifa_diaria)||0, parseFloat(e.dias_uso)||0, parseFloat(e.costo_total)||0]),
    data.eqs.reduce((s,e)=>s+(parseFloat(e.costo_total)||0),0)
  )

  r2 = addDetalle(ws2, r2,
    'COSTOS INDIRECTOS',
    ['Fecha','Categoría','Descripción','Monto'],
    data.inds.map(c => [c.fecha||c.created_at?.slice(0,10)||'',c.categoria||'',c.descripcion||'',parseFloat(c.monto)||0]),
    data.inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  )

  // ── HOJA 3: Avalúo financiero acumulado ──
  if (data.avsProy?.length > 0) {
    const ws3 = wb.addWorksheet('Avalúo Financiero')
    setCols(ws3, [14, 32, 12, 14, 16, 16, 16, 16])
    let r3 = addHeaderBlock(ws3, 'Avalúo Financiero Acumulado', 'Marquez Project Solutions LLC', proyLabel, periodoLabel, fechaHoy, 8)
    ws3.getRow(r3).height = 18
    ;['Avalúo','Actividad','Unidad','P.U.','Contrato $','Ant. $','Periodo $','Acumulado $'].forEach((h,i) => {
      const c = ws3.getCell(r3,i+1); c.value=h; styleHeader(c)
    })
    r3++
    let totalAcum = 0
    data.avsProy.forEach(av => {
      const avItems = data.avsItems.filter(i => i.avaluo_id === av.id)
      avItems.forEach((it, idx) => {
        ws3.getRow(r3).height = 16
        const even = idx % 2 === 1
        const vals = [
          av.numero_avaluo || av.folio || '—',
          it.descripcion || '—',
          it.unidad || '—',
          parseFloat(it.precio_unitario||0),
          parseFloat(it.monto_contrato||0),
          parseFloat(it.monto_anterior||0),
          parseFloat(it.monto_periodo||0),
          parseFloat(it.monto_acumulado||0),
        ]
        vals.forEach((v,ci) => {
          const c = ws3.getCell(r3,ci+1)
          const isNum = ci >= 3
          styleData(c, { even, align:isNum?'right':'left', numFmt:isNum?'"$"#,##0.00':undefined })
          c.value = v
        })
        totalAcum += parseFloat(it.monto_acumulado||0)
        r3++
      })
    })
    ws3.mergeCells(r3,1,r3,7); const at=ws3.getCell(r3,1); at.value='TOTAL ACUMULADO COBRADO'; styleTotal(at)
    const av=ws3.getCell(r3,8); av.value=totalAcum; av.numFmt='"$"#,##0.00'; styleTotal(av)
  }

  // ── HOJA 4: Costos indirectos presupuestados vs ejecutados ──
  if (data.comparacionInd?.length > 0) {
    const ws4 = wb.addWorksheet('Indirectos Pres vs Ejec')
    setCols(ws4, [40, 20, 20, 20, 16])
    let r4 = addHeaderBlock(ws4, 'Costos Indirectos: Presupuestado vs Ejecutado', 'Marquez Project Solutions LLC', proyLabel, periodoLabel, fechaHoy, 5)
    ws4.getRow(r4).height = 18
    ;['Categoría','Presupuestado','Ejecutado','Diferencia','Estado'].forEach((h,i) => {
      const c = ws4.getCell(r4,i+1); c.value=h; styleHeader(c)
    })
    r4++
    let totPres=0, totEjec=0
    data.comparacionInd.forEach((r, idx) => {
      ws4.getRow(r4).height = 17
      const even   = idx%2===1
      const status = r.diferencia < 0 ? 'Sobrecosto' : r.diferencia === 0 ? 'En punto' : 'Ahorro'
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
    const tl=ws4.getCell(r4,1); tl.value='TOTAL'; styleTotal(tl)
    const tp=ws4.getCell(r4,2); tp.value=totPres; tp.numFmt='"$"#,##0.00'; styleTotal(tp)
    const te=ws4.getCell(r4,3); te.value=totEjec; te.numFmt='"$"#,##0.00'; styleTotal(te)
    const td=ws4.getCell(r4,4); td.value=totPres-totEjec; td.numFmt='"$"#,##0.00'; styleTotal(td)
    ws4.mergeCells(r4,5,r4,5); const ts=ws4.getCell(r4,5); ts.value=''; styleTotal(ts)
  }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `Reporte_Financiero_${proy?.project_code}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── EXPORT INVENTARIO ─────────────────────────────────────
async function buildInventario({ data, materiales, proyectos, presupuesto, desde, hasta }) {
  const wb       = new ExcelJS.Workbook()
  wb.creator     = 'MARY ERP'
  const periodoLabel = desde||hasta ? `${desde||'inicio'} al ${hasta||'hoy'}` : 'Todo el período'
  const fechaHoy = new Date().toLocaleDateString('es')

  // HOJA 1: Stock
  const ws1 = wb.addWorksheet('Stock Actual')
  setCols(ws1, [14, 35, 10, 24, 14, 14, 10])
  let r1 = addHeaderBlock(ws1, 'Stock Actual de Materiales', 'Marquez Project Solutions LLC', null, periodoLabel, fechaHoy, 7)
  ws1.getRow(r1).height = 18
  ;['Código','Descripción','Unidad','Ubicación en bodega','Stock actual','Stock mínimo','Estado'].forEach((h,i) => {
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
  const ws2 = wb.addWorksheet('Entradas de Materiales')
  setCols(ws2, [12, 12, 32, 12, 8, 14, 14, 14, 22, 12])
  let r2 = addHeaderBlock(ws2, 'Entradas de Materiales', 'Marquez Project Solutions LLC', null, periodoLabel, fechaHoy, 10)
  ws2.getRow(r2).height = 18
  ;['Fecha','Código','Material','Cantidad','Unidad','Precio unit.','Total','Factura','Proveedor','Proyecto'].forEach((h,i) => {
    const c = ws2.getCell(r2,i+1); c.value=h; styleHeader(c)
  })
  r2++
  let totalEntradas = 0
  data.entradas.forEach((e,i) => {
    ws2.getRow(r2).height = 16
    const even = i%2===1
    const m     = materiales.find(x=>x.id===e.material_id)
    const p     = proyectos.find(x=>x.id===e.proyecto_id)
    const total = (parseFloat(e.cantidad)||0)*(parseFloat(e.precio_unitario)||0)
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
  ws2.mergeCells(r2,1,r2,6); const te=ws2.getCell(r2,1); te.value='TOTAL ENTRADAS'; styleTotal(te)
  const tv2=ws2.getCell(r2,7); tv2.value=totalEntradas; tv2.numFmt='"$"#,##0.00'; styleTotal(tv2)

  // HOJA 3: Salidas
  const ws3 = wb.addWorksheet('Salidas de Materiales')
  setCols(ws3, [12, 12, 32, 12, 8, 14, 40])
  let r3 = addHeaderBlock(ws3, 'Salidas de Materiales', 'Marquez Project Solutions LLC', null, periodoLabel, fechaHoy, 7)
  ws3.getRow(r3).height = 18
  ;['Fecha','Código','Material','Cantidad','Unidad','Proyecto','Actividad'].forEach((h,i) => {
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
  saveAs(new Blob([buf]), `Reporte_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── EXPORT RESUMEN GENERAL ────────────────────────────────
async function buildResumenGeneral({ proy, proyectos, presupuesto, costos_directos, nominas,
  subcontratos, subcontratos_contratos = [], subcontratos_avaluos = [],
  equipos, costos_indirectos, salidas, entradas, budget, moneda }) {

  const wb       = new ExcelJS.Workbook()
  wb.creator     = 'MARY ERP'
  const proyId   = proy?.id
  const proyLabel = `${proy?.project_code} — ${proy?.nombre}`
  const fechaHoy  = new Date().toLocaleDateString('es')
  const COLS      = 7

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
  // totalSub: avalúos aprobados del nuevo sistema + fallback al sistema anterior
  const scIdsRes = subcontratos_contratos.filter(sc=>sc.proyecto_id===proyId).map(sc=>sc.id)
  const totalSub = subcontratos_avaluos
    .filter(a=>scIdsRes.includes(a.subcontrato_id)&&a.estado==='aprobado')
    .reduce((s,a)=>s+(parseFloat(a.monto_total)||0),0)
    + subs.reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
  const totalEq  = eqs.reduce((s,e)=>s+(parseFloat(e.costo_total)||0),0)
  const totalInd = inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
  const totalReal = totalMat+totalDir+totalNom+totalSub+totalEq+totalInd
  const desviacion = totalReal - budget

  const ws = wb.addWorksheet('Resumen General')
  setCols(ws, [28, 20, 32, 20, 16, 16, 16])
  let row = addHeaderBlock(ws, 'Resumen General del Proyecto', 'Marquez Project Solutions LLC', proyLabel, null, fechaHoy, COLS)

  // Info proyecto
  row = addSectionTitle(ws, row, 'INFORMACIÓN DEL PROYECTO', COLS)
  const infoRows = [
    ['Código', proy?.project_code||''], ['Nombre', proy?.nombre||''],
    ['Cliente', proy?.cliente_externo||'—'], ['Estado', proy?.estado||''],
    ['Fecha inicio', proy?.fecha_inicio||'—'], ['Fecha fin estimada', proy?.fecha_fin_estimada||'—'],
    ['Ciudad / País', `${proy?.ciudad||''} ${proy?.pais||''}`.trim()||'—'], ['Moneda', moneda],
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
  row = addSectionTitle(ws, row, 'RESUMEN FINANCIERO', COLS)
  ws.getRow(row).height = 18
  ;['Concepto','Monto','% del Costo Real','','','',''].forEach((h,i) => {
    const c = ws.getCell(row,i+1); c.value=h; styleHeader(c)
  })
  row++

  // Fila presupuesto
  ws.getRow(row).height=17
  const pb = ws.getCell(row,1); pb.value='Presupuesto total'; styleLabel(pb)
  const pv = ws.getCell(row,2); pv.value=budget; pv.numFmt='"$"#,##0.00'; styleData(pv,{bold:true,align:'right',color:BRAND_HX})
  ws.mergeCells(row,3,row,COLS)
  row++

  const categorias = [
    ['  Materiales', totalMat],
    ['  Costos directos', totalDir],
    ['  Nómina / Planilla', totalNom],
    ['  Subcontratos', totalSub],
    ['  Equipos', totalEq],
    ['  Costos indirectos', totalInd],
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
  const tl=ws.getCell(row,1); tl.value='TOTAL COSTO REAL'; styleTotal(tl)
  const tv=ws.getCell(row,2); tv.value=totalReal; tv.numFmt='"$"#,##0.00'; styleTotal(tv)
  const tp=ws.getCell(row,3); tp.value=1; tp.numFmt='0.0%'; styleTotal(tp)
  ws.mergeCells(row,4,row,COLS)
  row+=2

  // Desviacion
  row = addSectionTitle(ws, row, 'ANÁLISIS DE DESVIACIÓN', COLS)
  ws.getRow(row).height=17
  ;[
    ['Desviación ($)', desviacion, '"$"#,##0.00', desviacion>0?RED_HX:GREEN_HX],
    ['Desviación (%)', budget>0?desviacion/budget:0, '0.0%', desviacion>0?RED_HX:GREEN_HX],
    ['% Ejecución del presupuesto', budget>0?totalReal/budget:0, '0.0%', BRAND_HX],
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
    row = addSectionTitle(ws, row, 'DETALLE — NÓMINA / PLANILLA', COLS)
    ws.getRow(row).height=18
    ;['Trabajador','Cargo','Período inicio','Período fin','Salario base','Deducciones','Neto'].forEach((h,i) => {
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
    ws.mergeCells(row,1,row,COLS-1); const nt=ws.getCell(row,1); nt.value='SUBTOTAL NÓMINA'; styleTotal(nt)
    const nv=ws.getCell(row,COLS); nv.value=totalNom; nv.numFmt='"$"#,##0.00'; styleTotal(nv)
    row+=2
  }

  // Detalle subcontratos
  if (subs.length > 0) {
    row = addSectionTitle(ws, row, 'DETALLE — SUBCONTRATOS', COLS)
    ws.getRow(row).height=18
    ;['Subcontratista','Descripción','Actividad','Monto contrato','% Avance','Monto pagado','Estado'].forEach((h,i) => {
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
    ws.mergeCells(row,1,row,COLS-1); const st=ws.getCell(row,1); st.value='SUBTOTAL SUBCONTRATOS'; styleTotal(st)
    const sv=ws.getCell(row,COLS); sv.value=totalSub; sv.numFmt='"$"#,##0.00'; styleTotal(sv)
    row+=2
  }

  // Detalle equipos
  if (eqs.length > 0) {
    row = addSectionTitle(ws, row, 'DETALLE — EQUIPOS', COLS)
    ws.getRow(row).height=18
    ;['Descripción','Tipo','Tarifa diaria','Días de uso','Costo total','',''].forEach((h,i) => {
      const c=ws.getCell(row,i+1); c.value=h; styleHeader(c)
    })
    row++
    eqs.forEach((e,i) => {
      ws.getRow(row).height=16
      const even=i%2===1
      const vals=[e.descripcion||'',e.tipo||'',parseFloat(e.tarifa_diaria)||0,
        parseFloat(e.dias_uso)||0,parseFloat(e.costo_total)||0,'','']
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
    ws.mergeCells(row,1,row,COLS-1); const et=ws.getCell(row,1); et.value='SUBTOTAL EQUIPOS'; styleTotal(et)
    const ev=ws.getCell(row,COLS); ev.value=totalEq; ev.numFmt='"$"#,##0.00'; styleTotal(ev)
    row+=2
  }

  // Detalle costos directos
  if (dirs.length > 0) {
    row = addSectionTitle(ws, row, 'DETALLE — COSTOS DIRECTOS', COLS)
    ws.getRow(row).height=18
    ;['Fecha','Tipo','Descripción','Actividad','Documento','Monto',''].forEach((h,i) => {
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
    ws.mergeCells(row,1,row,COLS-1); const dt=ws.getCell(row,1); dt.value='SUBTOTAL COSTOS DIRECTOS'; styleTotal(dt)
    const dv=ws.getCell(row,COLS); dv.value=totalDir; dv.numFmt='"$"#,##0.00'; styleTotal(dv)
    row+=2
  }

  // Pie de página
  row++
  ws.mergeCells(row,1,row,COLS)
  const footer=ws.getCell(row,1)
  footer.value='Marquez Project Solutions LLC · MARY ERP — Management And Resources Yield · Documento generado automáticamente'
  footer.font={ size:8, name:'Arial', color:{ argb:'FF9CA3AF' }, italic:true }
  footer.alignment={ horizontal:'center' }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `Resumen_General_${proy?.project_code}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────
export default function Reportes() {
  const { state } = useStore()
  const { t, lang } = useContext(LangContext)
  const isEs = lang === 'ES'
  const {
    proyectos, presupuesto, materiales, entradas, salidas,
    costos_directos, nominas, subcontratos, equipos, costos_indirectos,
    subcontratos_contratos = [], subcontratos_avaluos = [], subcontratos_items = [],
    presupuesto_indirectos = [],
    avaluos_cliente = [], avaluos_cliente_items = [],
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
  const utilidadMonto  = subtotalPres * (utilidadPct / 100)
  const granTotalPres  = subtotalPres + utilidadMonto
  const impuestoMonto  = granTotalPres * (impuestoPct / 100)
  const budget         = granTotalPres + impuestoMonto

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
      return s+(parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0)
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
    const totalEq  = eqs.reduce((s,e)=>s+(parseFloat(e.costo_total)||0),0)
    const totalInd = inds.reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
    const totalReal = totalMat+totalDir+totalNom+totalSub+totalEq+totalInd

    const actividades = items.filter(i=>i.tipo==='actividad').map(act => {
      const pres=(act.cantidad||0)*((act.costo_mo||0)+(act.costo_materiales||0)+(act.costo_equipos||0))
      // Real por actividad: materiales + imprevistos + subcontratos (nuevo y anterior)
      const scActIds = subcontratos_items.filter(si=>si.actividad_id===act.id).map(si=>si.subcontrato_id)
      const realScNuevo = subcontratos_avaluos
        .filter(a=>scActIds.includes(a.subcontrato_id)&&a.estado==='aprobado')
        .reduce((s,a)=>s+(parseFloat(a.monto_total)||0),0)
      const realScAntiguo = subcontratos.filter(s=>s.proyecto_id===proyId&&s.actividad_id===act.id)
        .reduce((s,sc)=>s+(parseFloat(sc.monto_pagado)||0),0)
      const real=salidas.filter(s=>s.proyecto_id===proyId&&s.actividad_id===act.id)
        .reduce((s,sa)=>{const e=entradas.find(en=>en.material_id===sa.material_id);return s+(parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0)},0)
        +costos_directos.filter(c=>c.proyecto_id===proyId&&c.actividad_id===act.id).reduce((s,c)=>s+(parseFloat(c.monto)||0),0)
        +realScNuevo+realScAntiguo
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
    }
  }, [proyId, desde, hasta, lang, presupuesto, salidas, entradas, costos_directos, nominas, subcontratos, subcontratos_contratos, subcontratos_avaluos, subcontratos_items, equipos, costos_indirectos, avaluos_cliente, avaluos_cliente_items, presupuesto_indirectos, t])

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
          presupuesto_indirectos, avaluos_cliente, avaluos_cliente_items })
      } else if (reportType==='inventario') {
        await buildInventario({ data:datosInventario, materiales, proyectos, presupuesto, desde, hasta })
      } else if (reportType==='general' && proyId) {
        await buildResumenGeneral({ proy, proyectos, presupuesto, costos_directos, nominas,
          subcontratos, subcontratos_contratos, subcontratos_avaluos,
          equipos, costos_indirectos, salidas, entradas, budget, moneda })
      }
    } catch(e) { console.error(e); alert('Error generando el reporte: ' + e.message) }
    setLoading(false)
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('btn_view')==='Ver'?'Reportes':'Reports'}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{t('btn_view')==='Ver'?'Genera y exporta reportes a Excel con formato profesional':'Generate and export professionally formatted Excel reports'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {t('btn_view')==='Ver'?'Configurar reporte':'Configure report'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t('btn_view')==='Ver'?'Tipo de reporte':'Report type'}</label>
            <select className={inputCls+' w-full'} value={reportType} onChange={e=>setReportType(e.target.value)}>
              <option value="financiero">📊 {t('btn_view')==='Ver'?'Reporte Financiero':'Financial Report'}</option>
              <option value="inventario">📦 {t('btn_view')==='Ver'?'Reporte de Inventario':'Inventory Report'}</option>
              <option value="general">📋 {t('btn_view')==='Ver'?'Resumen General del Proyecto':'General Project Summary'}</option>
            </select>
          </div>
          {(reportType==='financiero'||reportType==='general') && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('lbl_project')} *</label>
              <select className={inputCls+' w-full'} value={proyId} onChange={e=>setProyId(e.target.value)}>
                <option value="">— {t('lbl_select')} —</option>
                {proyectos.map(p=><option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t('btn_view')==='Ver'?'Desde':'From'}</label>
            <input type="date" className={inputCls+' w-full'} value={desde} onChange={e=>setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t('btn_view')==='Ver'?'Hasta':'To'}</label>
            <input type="date" className={inputCls+' w-full'} value={hasta} onChange={e=>setHasta(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleExport}
            disabled={loading||((reportType==='financiero'||reportType==='general')&&!proyId)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-40 transition-all hover:opacity-90"
            style={{background:BRAND}}>
            {loading
              ? <><span className="animate-spin">⏳</span> {t('btn_view')==='Ver'?'Generando...':'Generating...'}</>
              : <><span>⬇</span> {t('btn_view')==='Ver'?'Descargar Excel':'Download Excel'}</>
            }
          </button>
          <button onClick={()=>window.print()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
            🖨 {t('btn_view')==='Ver'?'Imprimir vista':'Print view'}
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
                      <td className={tdC+' text-right font-mono text-gray-500'}>{fmt(it.monto_saldo,moneda)}</td>
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
        <tbody>{data.entradas.map((e,i)=>{const m=materiales.find(x=>x.id===e.material_id);const p=proyectos.find(x=>x.id===e.proyecto_id);const total=(parseFloat(e.cantidad)||0)*(parseFloat(e.precio_unitario)||0);return(<tr key={e.id} className={i%2===0?'bg-white':'bg-gray-50/50'}><td className={tdC}>{fmtDate(e.fecha_recepcion)}</td><td className={tdC+' font-mono text-xs'}>{m?.codigo||'—'}</td><td className={tdC}>{m?.descripcion||'—'}</td><td className={tdC+' font-mono text-green-600'}>+{fmtNum(e.cantidad)}</td><td className={tdC+' font-mono'}>${fmtNum(e.precio_unitario)}</td><td className={tdC+' font-mono font-medium'}>${fmtNum(total)}</td><td className={tdC}>{e.numero_factura||'—'}</td><td className={tdC}>{e.proveedor||'—'}</td><td className={tdC+' text-xs'}>{p?.project_code||'—'}</td></tr>)})}</tbody>
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
  const totalMat=salidas.filter(s=>s.proyecto_id===proyId).reduce((s,sa)=>{const e=entradas.find(en=>en.material_id===sa.material_id);return s+(parseFloat(sa.cantidad)||0)*(parseFloat(e?.precio_unitario)||0)},0)
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
  const totalEq=eqs.reduce((s,e)=>s+(parseFloat(e.costo_total)||0),0)
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
