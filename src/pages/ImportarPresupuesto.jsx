import { useState, useRef, useContext } from 'react'
import * as XLSX from 'xlsx'
import { useStore } from '../store'
import { LangContext } from '../i18n'

const CATEGORIAS_ES = ['Etapa', 'Sub-etapa', 'Actividad']
const CATEGORIAS_EN = ['Stage', 'Sub-stage', 'Activity']

export default function ImportarPresupuesto({ proyId, moneda, onDone }) {
  const { state, dispatch } = useStore()
  const { lang } = useContext(LangContext)
  const isEs = lang === 'ES'

  const fileRef = useRef(null)
  const [rows, setRows]         = useState([])
  const [errors, setErrors]     = useState([])
  const [step, setStep]         = useState('idle')
  const [progress, setProgress] = useState(0)

  const reset = () => { setRows([]); setErrors([]); setStep('idle'); setProgress(0) }

  const descargarPlantilla = () => {
    const lang_code = isEs ? 'ES' : 'EN'
    const a = document.createElement('a')
    a.href = `/templates/MARY_Plantilla_Presupuesto_${lang_code}.xlsx`
    a.download = `MARY_Plantilla_Presupuesto_${lang_code}.xlsx`
    a.click()
  }

  const parseFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        let headerRow = -1
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          const row = data[i].map(c => String(c).toLowerCase())
          const nonEmpty = row.filter(c => c.trim() !== '')
          if (nonEmpty.length >= 2 && row.some(c => c.includes('catego') || c.includes('descrip'))) {
            headerRow = i; break
          }
        }
        if (headerRow === -1) {
          setErrors([isEs ? 'No se encontro la fila de encabezados en el archivo.' : 'Header row not found in file.'])
          setStep('error'); return
        }

        const headers = data[headerRow].map(c => String(c).trim().toLowerCase())
        const colIdx  = (names) => {
          for (const n of names) {
            const i = headers.findIndex(h => h.includes(n))
            if (i !== -1) return i
          }
          return -1
        }

        const iCat  = colIdx(['categor'])
        const iDesc = colIdx(['descrip'])
        const iUnit = colIdx(['unidad', 'unit'])
        const iQty  = colIdx(['cantidad', 'quantity', 'qty'])
        const iMO   = colIdx(['mano', 'labor'])
        const iMat  = colIdx(['material'])
        const iEq   = colIdx(['transport', 'equip'])

        if (iCat === -1 || iDesc === -1) {
          setErrors([isEs ? 'Columnas requeridas no encontradas. Usa la plantilla oficial.' : 'Required columns not found. Use the official template.'])
          setStep('error'); return
        }

        const VALID_CATS = isEs ? CATEGORIAS_ES : CATEGORIAS_EN
        const parsed = []
        const errs   = []

        for (let r = headerRow + 1; r < data.length; r++) {
          const row  = data[r]
          const cat  = String(row[iCat]  || '').trim()
          const desc = String(row[iDesc] || '').trim()
          if (!cat && !desc) continue
          if (cat.startsWith('*') || cat.length > 30) continue

          const qty  = parseFloat(row[iQty] || 0) || 0
          const mo   = parseFloat(row[iMO]  || 0) || 0
          const mat  = parseFloat(row[iMat] || 0) || 0
          const eq   = parseFloat(row[iEq]  || 0) || 0
          const unit = String(row[iUnit] || 'und').trim() || 'und'

          if (!desc) { errs.push(`Row ${r + 1}: empty description`); continue }
          if (cat && !VALID_CATS.includes(cat)) {
            errs.push(`Row ${r + 1}: category "${cat}" not valid. Use: ${VALID_CATS.join(', ')}`)
            continue
          }

          let tipo = 'actividad'
          if (cat === 'Etapa'     || cat === 'Stage')     tipo = 'etapa'
          if (cat === 'Sub-etapa' || cat === 'Sub-stage') tipo = 'sub_etapa'

          const id = crypto.randomUUID()
          parsed.push({ id, tipo, desc, unit, qty, mo, mat, eq, rowNum: r + 1 })
        }

        if (parsed.length === 0) {
          setErrors(errs.length ? errs : [isEs ? 'No se encontraron filas con datos validos.' : 'No valid data rows found.'])
          setStep('error'); return
        }

        // ── Construir parent_ids Y codigos en el mismo recorrido ──────────────
        // El store genera codigos basandose en cuantos hermanos ya existen en DB,
        // pero como los dispatches llegan casi simultaneos (80ms), el contador
        // siempre ve 0 hermanos → todos quedan como "01.001".
        // SOLUCION: pre-calcular los codigos aqui y pasarlos en el payload.
        let lastEtapaId    = null
        let lastSubEtapaId = null
        let stageNum = 0
        let subNum   = 0
        let actNum   = 0

        const rowsConParent = parsed.map(row => {
          let parent_id = null
          let code      = ''

          if (row.tipo === 'etapa') {
            stageNum++
            subNum    = 0
            actNum    = 0
            parent_id = null
            code      = String(stageNum).padStart(2, '0')
            lastSubEtapaId = null
          } else if (row.tipo === 'sub_etapa') {
            subNum++
            actNum    = 0
            parent_id = lastEtapaId
            code      = `${String(stageNum).padStart(2, '0')}.${String(subNum).padStart(2, '0')}`
          } else {
            // actividad
            actNum++
            parent_id = lastSubEtapaId || lastEtapaId
            code      = `${String(stageNum).padStart(2, '0')}.${String(subNum).padStart(2, '0')}.${String(actNum).padStart(3, '0')}`
          }

          // Actualizar referencias DESPUES de asignar parent_id
          if (row.tipo === 'etapa')     { lastEtapaId = row.id;    lastSubEtapaId = null }
          if (row.tipo === 'sub_etapa') { lastSubEtapaId = row.id }

          return { ...row, parent_id, code }
        })

        setRows(rowsConParent)
        setErrors(errs)
        setStep('preview')
      } catch (err) {
        setErrors([isEs ? `Error al leer el archivo: ${err.message}` : `Error reading file: ${err.message}`])
        setStep('error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const importar = async () => {
    setStep('importing')
    setProgress(0)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setProgress(Math.round(((i + 1) / rows.length) * 100))

      await new Promise(resolve => setTimeout(async () => {
        await dispatch({
          type: 'ADD_BUDGET',
          payload: {
            id:               row.id,
            proyectoId:       proyId,
            tipo:             row.tipo,
            descripcion:      row.desc,
            unidad:           row.unit,
            cantidad:         row.qty,
            costo_mo:         row.mo,
            costo_materiales: row.mat,
            costo_equipos:    row.eq,
            parent_id:        row.parent_id,
            code:             row.code,    // ← codigo pre-calculado, evita race condition
          }
        })
        resolve()
      }, 80))
    }

    setStep('done')
    if (onDone) onDone()
  }

  const tipoColor = (tipo) => {
    if (tipo === 'etapa')     return 'bg-green-100 text-green-700'
    if (tipo === 'sub_etapa') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }
  const tipoLabel = (tipo) => {
    if (!isEs) {
      if (tipo === 'etapa')     return 'Stage'
      if (tipo === 'sub_etapa') return 'Sub-stage'
      return 'Activity'
    }
    if (tipo === 'etapa')     return 'Etapa'
    if (tipo === 'sub_etapa') return 'Sub-etapa'
    return 'Actividad'
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl rounded-t-none border-t-0 px-4 py-3">
      {step === 'idle' && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            {isEs ? 'Importar desde Excel' : 'Import from Excel'}
          </span>
          <label className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#1B3A6B] hover:text-[#1B3A6B] cursor-pointer transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {isEs ? 'Seleccionar archivo .xlsx' : 'Select .xlsx file'}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => parseFile(e.target.files[0])} />
          </label>
          <button onClick={descargarPlantilla}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#1B3A6B] hover:underline">
            ↓ {isEs ? 'Descargar plantilla' : 'Download template'}
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">
                {isEs ? `${rows.length} filas listas para importar` : `${rows.length} rows ready to import`}
              </span>
              {errors.length > 0 && (
                <span className="text-xs text-amber-600">
                  ({errors.length} {isEs ? 'advertencias' : 'warnings'})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={importar}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                style={{ background: '#1B3A6B' }}>
                {isEs ? 'Importar ahora' : 'Import now'}
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
              <p className="font-medium mb-1">{isEs ? 'Filas con advertencias (seran omitidas):' : 'Rows with warnings (will be skipped):'}</p>
              {errors.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[isEs?'Tipo':'Type', isEs?'Codigo':'Code', isEs?'Descripcion':'Description', isEs?'Unidad':'Unit',
                    isEs?'Cantidad':'Qty', 'M.O.', isEs?'Mat.':'Mat.', isEs?'Equip.':'Equip.'].map((h,i) => (
                    <th key={i} className="px-2 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${r.tipo === 'etapa' ? 'bg-green-50/40' : r.tipo === 'sub_etapa' ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${tipoColor(r.tipo)}`}>
                        {tipoLabel(r.tipo)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-gray-400 text-xs">{r.code}</td>
                    <td className="px-2 py-1.5 text-gray-700"
                      style={{ paddingLeft: r.tipo === 'actividad' ? 20 : r.tipo === 'sub_etapa' ? 12 : 8 }}>
                      {r.desc}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500">{r.tipo === 'actividad' ? r.unit : '—'}</td>
                    <td className="px-2 py-1.5 font-mono">{r.tipo === 'actividad' ? r.qty : '—'}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-500">{r.tipo === 'actividad' ? r.mo : '—'}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-500">{r.tipo === 'actividad' ? r.mat : '—'}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-500">{r.tipo === 'actividad' ? r.eq : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="flex flex-col gap-2 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{isEs ? 'Importando...' : 'Importing...'}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: '#1B3A6B' }} />
          </div>
          <p className="text-xs text-gray-400">
            {isEs ? 'No cierres esta ventana.' : 'Do not close this window.'}
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex items-center gap-3 py-1">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">✓</div>
          <span className="text-sm text-green-700 font-medium">
            {isEs ? `${rows.length} items importados correctamente.` : `${rows.length} items imported successfully.`}
          </span>
          <button onClick={reset} className="ml-auto text-xs text-gray-400 hover:text-gray-600">
            {isEs ? 'Importar otro' : 'Import another'}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col gap-2">
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
            <p className="font-medium mb-1">{isEs ? 'Error al procesar el archivo:' : 'Error processing file:'}</p>
            {errors.map((e, i) => <p key={i}>• {e}</p>)}
          </div>
          <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 self-start">
            ← {isEs ? 'Intentar de nuevo' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  )
}
