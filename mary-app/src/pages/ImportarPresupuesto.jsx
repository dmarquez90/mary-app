import { useState, useRef, useContext } from 'react'
import * as XLSX from 'xlsx'
import { useStore } from '../store'
import { useAuth } from '../auth'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { SecondaryBtn, PrimaryBtn } from '../components'
import { UNIDADES, uuid, genBudgetCode, today } from '../utils'
import { supabase } from '../supabase'

function parseTipo(raw) {
  if (!raw) return null
  const s = raw.toString().trim().toLowerCase().replace(/\s+/g, ' ')
  if (s.startsWith('etapa'))     return 'etapa'
  if (s.startsWith('sub'))       return 'sub_etapa'
  if (s.startsWith('actividad')) return 'actividad'
  return null
}

function mapUnidad(raw) {
  if (!raw) return 'm²'
  const u = raw.toString().trim()
  return UNIDADES.find(v => v.toLowerCase() === u.toLowerCase()) || u || 'm²'
}

const fmtC = (n, moneda = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: moneda, minimumFractionDigits: 0 }).format(n || 0)

export default function ImportarPresupuesto({ proyId, moneda = 'USD', onDone }) {
  const { dispatch }        = useStore()
  const { tenantId }        = useAuth()          // ← viene directo del AuthContext, sin query extra
  const { t }               = useContext(LangContext)
  const { can }             = usePermissions()
  const fileRef             = useRef(null)

  const [step, setStep]         = useState('idle')
  const [rows, setRows]         = useState([])
  const [errMsg, setErrMsg]     = useState('')
  const [progress, setProgress] = useState(0)

  const puedeEditar = can('presupuesto_editar')
  if (!puedeEditar) return null

  // ── LEER EXCEL ────────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrMsg(''); setStep('idle'); setRows([])

    try {
      const buf       = await file.arrayBuffer()
      const wb        = XLSX.read(buf, { type: 'array' })
      const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'presupuesto')
      if (!sheetName) throw new Error('No se encontró la hoja "Presupuesto". Verifica que el archivo sea la plantilla MARY.')

      const ws     = wb.Sheets[sheetName]
      const parsed = []

      for (let r = 8; r <= 500; r++) {
        const catRaw = ws[`A${r}`]?.v
        const desc   = ws[`B${r}`]?.v?.toString().trim() || ''
        const tipo   = parseTipo(catRaw)

        if (!catRaw && !desc) {
          const n1 = ws[`A${r+1}`]?.v || ws[`B${r+1}`]?.v
          const n2 = ws[`A${r+2}`]?.v || ws[`B${r+2}`]?.v
          if (!n1 && !n2) break
          continue
        }

        if (!tipo || !desc) continue

        parsed.push({
          tipo,
          descripcion:      desc,
          unidad:           mapUnidad(ws[`C${r}`]?.v),
          cantidad:         parseFloat(ws[`D${r}`]?.v) || 0,
          costo_mo:         parseFloat(ws[`E${r}`]?.v) || 0,
          costo_materiales: parseFloat(ws[`F${r}`]?.v) || 0,
          costo_equipos:    parseFloat(ws[`G${r}`]?.v) || 0,
        })
      }

      if (parsed.length === 0)
        throw new Error('No se encontraron filas. Verifica que la columna A tenga Etapa, Sub Etapa o Actividad desde la fila 8.')
      if (!parsed.some(r => r.tipo === 'etapa'))
        throw new Error('No se encontró ninguna Etapa. Al menos una fila debe tener "Etapa" en la columna A.')

      setRows(parsed)
      setStep('preview')
    } catch (err) {
      setErrMsg(err.message)
      setStep('error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── GUARDAR EN SUPABASE ───────────────────────────────────────────────────
  const guardar = async () => {
    if (!proyId)   { setErrMsg('Selecciona un proyecto antes de importar.'); setStep('error'); return }
    if (!tenantId) { setErrMsg('No se pudo obtener tenant_id. Verifica que estés autenticado.'); setStep('error'); return }

    setStep('saving'); setProgress(0)

    try {
      // Cargar presupuesto existente para generar códigos correlativos correctos
      const { data: existentes } = await supabase
        .from('presupuesto').select('*').eq('proyecto_id', proyId).eq('tenant_id', tenantId)
      let byProject = existentes || []

      const etapaMap  = {}  // descripcion → id
      const subEtaMap = {}  // `${etapa}||${sub}` → id
      let curEtapaId     = null
      let curEtapaNombre = null
      let done = 0

      for (const row of rows) {

        // ── ETAPA ─────────────────────────────────────────────────────────
        if (row.tipo === 'etapa') {
          if (!etapaMap[row.descripcion]) {
            const id   = uuid()
            const code = genBudgetCode(byProject, 'etapa', null)
            const item = {
              id, code, proyecto_id: proyId, tipo: 'etapa', parent_id: null,
              descripcion: row.descripcion, unidad: null,
              cantidad: 0, costo_mo: 0, costo_materiales: 0, costo_equipos: 0,
              created_at: today(), tenant_id: tenantId,
            }
            const { error } = await supabase.from('presupuesto').insert(item)
            if (error) throw new Error(`Error creando etapa "${row.descripcion}": ${error.message}`)
            dispatch({ type: 'ADD_BUDGET', payload: item })
            byProject = [...byProject, item]
            etapaMap[row.descripcion] = id
          }
          curEtapaId     = etapaMap[row.descripcion]
          curEtapaNombre = row.descripcion
          done++; setProgress(Math.round((done / rows.length) * 100))
          continue
        }

        // ── SUB ETAPA ─────────────────────────────────────────────────────
        if (row.tipo === 'sub_etapa') {
          if (!curEtapaId) {
            // Sin etapa padre → crear etapa "General" automáticamente
            curEtapaNombre = 'General'
            if (!etapaMap['General']) {
              const id   = uuid()
              const code = genBudgetCode(byProject, 'etapa', null)
              const item = {
                id, code, proyecto_id: proyId, tipo: 'etapa', parent_id: null,
                descripcion: 'General', unidad: null,
                cantidad: 0, costo_mo: 0, costo_materiales: 0, costo_equipos: 0,
                created_at: today(), tenant_id: tenantId,
              }
              await supabase.from('presupuesto').insert(item)
              dispatch({ type: 'ADD_BUDGET', payload: item })
              byProject = [...byProject, item]
              etapaMap['General'] = id
            }
            curEtapaId = etapaMap['General']
          }

          const key = `${curEtapaNombre}||${row.descripcion}`
          if (!subEtaMap[key]) {
            const id   = uuid()
            const code = genBudgetCode(byProject, 'sub_etapa', curEtapaId)
            const item = {
              id, code, proyecto_id: proyId, tipo: 'sub_etapa', parent_id: curEtapaId,
              descripcion: row.descripcion, unidad: null,
              cantidad: 0, costo_mo: 0, costo_materiales: 0, costo_equipos: 0,
              created_at: today(), tenant_id: tenantId,
            }
            const { error } = await supabase.from('presupuesto').insert(item)
            if (error) throw new Error(`Error creando sub-etapa "${row.descripcion}": ${error.message}`)
            dispatch({ type: 'ADD_BUDGET', payload: item })
            byProject = [...byProject, item]
            subEtaMap[key] = id
          }
          done++; setProgress(Math.round((done / rows.length) * 100))
          continue
        }

        // ── ACTIVIDAD ─────────────────────────────────────────────────────
        // Regla: actividad puede ir directo bajo etapa (sin sub-etapa obligatoria)
        if (row.tipo === 'actividad') {
          let parentId = null

          // Buscar la última sub-etapa de la etapa actual
          const keysDeEtapa = Object.keys(subEtaMap).filter(k => k.startsWith(`${curEtapaNombre}||`))
          if (keysDeEtapa.length > 0) {
            // Hay sub-etapa → usar la última
            parentId = subEtaMap[keysDeEtapa[keysDeEtapa.length - 1]]
          } else if (curEtapaId) {
            // No hay sub-etapa → crear una sub-etapa implícita con el mismo nombre de la etapa
            // Esto mantiene compatibilidad con el store que requiere parent = sub_etapa
            const autoKey = `${curEtapaNombre}||__auto__`
            if (!subEtaMap[autoKey]) {
              const id   = uuid()
              const code = genBudgetCode(byProject, 'sub_etapa', curEtapaId)
              const item = {
                id, code, proyecto_id: proyId, tipo: 'sub_etapa', parent_id: curEtapaId,
                descripcion: curEtapaNombre, unidad: null,
                cantidad: 0, costo_mo: 0, costo_materiales: 0, costo_equipos: 0,
                created_at: today(), tenant_id: tenantId,
              }
              await supabase.from('presupuesto').insert(item)
              dispatch({ type: 'ADD_BUDGET', payload: item })
              byProject = [...byProject, item]
              subEtaMap[autoKey] = id
            }
            parentId = subEtaMap[autoKey]
          } else {
            // Sin contexto → saltar actividad
            done++; setProgress(Math.round((done / rows.length) * 100))
            continue
          }

          const id   = uuid()
          const code = genBudgetCode(byProject, 'actividad', parentId)
          const item = {
            id, code, proyecto_id: proyId, tipo: 'actividad', parent_id: parentId,
            descripcion:      row.descripcion,
            unidad:           row.unidad,
            cantidad:         row.cantidad,
            costo_mo:         row.costo_mo,
            costo_materiales: row.costo_materiales,
            costo_equipos:    row.costo_equipos,
            created_at:       today(),
            tenant_id:        tenantId,
          }
          const { error } = await supabase.from('presupuesto').insert(item)
          if (error) throw new Error(`Error creando actividad "${row.descripcion}": ${error.message}`)
          dispatch({ type: 'ADD_BUDGET', payload: item })
          byProject = [...byProject, item]
        }

        done++
        setProgress(Math.round((done / rows.length) * 100))
      }

      setStep('done')
      setTimeout(() => onDone?.(), 1500)

    } catch (err) {
      console.error('Error importando:', err)
      setErrMsg(err.message || 'Error inesperado. Revisa la consola (F12).')
      setStep('error')
    }
  }

  const reset = () => { setStep('idle'); setRows([]); setErrMsg(''); setProgress(0) }

  const etapasCount      = rows.filter(r => r.tipo === 'etapa').length
  const subEtapasCount   = rows.filter(r => r.tipo === 'sub_etapa').length
  const actividadesCount = rows.filter(r => r.tipo === 'actividad').length
  const totalEstimado    = rows
    .filter(r => r.tipo === 'actividad')
    .reduce((s, r) => s + r.cantidad * (r.costo_mo + r.costo_materiales + r.costo_equipos), 0)

  const tipoBadge = {
    etapa:     'bg-green-100 text-green-700',
    sub_etapa: 'bg-blue-100 text-blue-700',
    actividad: 'bg-gray-100 text-gray-500',
  }
  const tipoLabel = { etapa: 'Etapa', sub_etapa: 'Sub Etapa', actividad: 'Actividad' }
  const tipoColor = { etapa: '#1D9E75', sub_etapa: '#185FA5', actividad: '#374151' }
  const tipoPL    = { etapa: 12, sub_etapa: 20, actividad: 28 }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <span className="text-sm font-semibold text-gray-700">Importar desde Excel</span>
        </div>
        <a href="/templates/Presupuesto_MARY_Template.xlsx"
          download="Presupuesto_MARY_Template.xlsx"
          className="text-xs flex items-center gap-1 text-[#185FA5] hover:underline">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Descargar plantilla
        </a>
      </div>

      {/* IDLE */}
      {step === 'idle' && (
        <div
          role="button" tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: fileRef.current }) }
          }}
          className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer
                     hover:border-[#1D9E75] hover:bg-green-50/20 transition-all">
          <svg className="w-9 h-9 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p className="text-sm text-gray-500">Haz clic o arrastra tu archivo <span className="font-semibold text-gray-700">.xlsx</span></p>
          <p className="text-xs text-gray-400 mt-1">Columna A: Etapa / Sub Etapa / Actividad</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile}/>
        </div>
      )}

      {/* ERROR */}
      {step === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Error al procesar</p>
          <p className="text-xs text-red-600 leading-relaxed">{errMsg}</p>
          <button onClick={reset} className="mt-3 text-xs text-red-500 hover:underline font-medium">← Intentar de nuevo</button>
        </div>
      )}

      {/* PREVIEW */}
      {step === 'preview' && (
        <div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Etapas',      value: etapasCount,      color: '#1D9E75' },
              { label: 'Sub-Etapas',  value: subEtapasCount,   color: '#185FA5' },
              { label: 'Actividades', value: actividadesCount, color: '#374151' },
              { label: 'Total',       value: fmtC(totalEstimado, moneda), color: '#1D9E75' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-gray-100 overflow-hidden mb-4">
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full min-w-[700px] text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {['Tipo','Descripción','Unidad','Cant','M.O.','Materiales','Equipos','Total'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium border-b border-gray-100 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const tc       = r.cantidad * (r.costo_mo + r.costo_materiales + r.costo_equipos)
                    const isHeader = r.tipo !== 'actividad'
                    return (
                      <tr key={i} className={`border-b border-gray-50 ${isHeader ? 'bg-gray-50/60' : ''}`}>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tipoBadge[r.tipo]}`}>
                            {tipoLabel[r.tipo]}
                          </span>
                        </td>
                        <td className={`py-2 ${isHeader ? 'font-semibold' : 'text-gray-600'}`}
                          style={{ color: isHeader ? tipoColor[r.tipo] : undefined, paddingLeft: tipoPL[r.tipo] }}>
                          {r.descripcion}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{isHeader ? '—' : r.unidad}</td>
                        <td className="px-3 py-2 text-right font-mono">{isHeader ? '—' : r.cantidad}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">{isHeader ? '—' : fmtC(r.costo_mo, moneda)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">{isHeader ? '—' : fmtC(r.costo_materiales, moneda)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">{isHeader ? '—' : fmtC(r.costo_equipos, moneda)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold"
                          style={{ color: isHeader ? tipoColor[r.tipo] : '#374151' }}>
                          {isHeader ? '—' : fmtC(tc, moneda)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <SecondaryBtn onClick={reset}>Cancelar</SecondaryBtn>
            <PrimaryBtn onClick={guardar} disabled={!proyId}>
              Importar {rows.length} filas
            </PrimaryBtn>
          </div>
        </div>
      )}

      {/* SAVING */}
      {step === 'saving' && (
        <div className="py-8 text-center">
          <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: '#1D9E75' }}/>
          </div>
          <p className="text-sm text-gray-600 font-medium">Guardando en Supabase... {progress}%</p>
          <p className="text-xs text-gray-400 mt-1">No cierres esta ventana</p>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: '#1D9E75' }}>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">¡Importación completada!</p>
          <p className="text-xs text-gray-400 mt-1">
            {etapasCount} etapas · {subEtapasCount} sub-etapas · {actividadesCount} actividades guardadas
          </p>
        </div>
      )}
    </div>
  )
}
