import { useState, useRef, useContext } from 'react'
import * as XLSX from 'xlsx'
import { useStore } from '../store'
import { LangContext } from '../i18n'

export default function ImportarMatPresupuestados({ proyId, onDone }) {
  const { state, dispatch } = useStore()
  const { lang } = useContext(LangContext)
  const isEs = lang === 'ES'

  const fileRef = useRef(null)
  const [rows, setRows]     = useState([])
  const [errors, setErrors] = useState([])
  const [step, setStep]     = useState('idle')
  const [progress, setProgress] = useState(0)

  const reset = () => { setRows([]); setErrors([]); setStep('idle'); setProgress(0) }

  const descargarPlantilla = () => {
    const lang_code = isEs ? 'ES' : 'EN'
    const a = document.createElement('a')
    a.href = `/templates/MARY_Plantilla_Mat_Presupuestados_${lang_code}.xlsx`
    a.download = `MARY_Plantilla_Mat_Presupuestados_${lang_code}.xlsx`
    a.click()
  }

  const parseFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]

        // Leer celda por celda usando referencias directas (A1, B1, etc.)
        // Esto evita el problema de celdas mergeadas que desplazan índices
        const getCellValue = (col, row) => {
          const ref = `${col}${row}`
          const cell = ws[ref]
          if (!cell) return null
          return cell.v // valor raw
        }

        // Detectar fila de headers buscando "code" o "código" en columna A
        let headerRow = -1
        for (let r = 1; r <= 10; r++) {
          const val = String(getCellValue('A', r) ?? '').toLowerCase()
          if (val.includes('material code') || val.includes('código') || val.includes('codigo')) {
            headerRow = r; break
          }
        }
        if (headerRow === -1) {
          setErrors([isEs ? 'No se encontró la fila de encabezados.' : 'Header row not found.'])
          setStep('error'); return
        }

        // Con la plantilla conocida: A=código, B=nombre, C=unidad, D=cantidad
        // Detectar qué columna tiene números en los datos
        const dataStartRow = headerRow + 1
        // Buscar la fila de nota si existe (fila después del header con texto largo)
        let firstRealRow = dataStartRow
        for (let r = dataStartRow; r <= dataStartRow + 2; r++) {
          const valA = String(getCellValue('A', r) ?? '')
          const valD = getCellValue('D', r)
          if (valA.length > 30 || valA.startsWith('*')) {
            firstRealRow = r + 1
          } else if (valA && typeof valD === 'number') {
            firstRealRow = r; break
          }
        }

        // Encontrar la columna de cantidad verificando en la primera fila real
        // Por default D (índice 3), pero si D tiene texto buscar la primera numérica
        const colLetters = ['A','B','C','D','E','F','G','H']
        let cantColLetter = 'D'
        for (const cl of colLetters) {
          const val = getCellValue(cl, firstRealRow)
          if (typeof val === 'number' && val > 0) { cantColLetter = cl; break }
        }

        const parsed = []
        const errs   = []

        const matsByCodigo = {}
        state.materiales.forEach(m => {
          if (m.codigo) matsByCodigo[m.codigo.toLowerCase()] = m
        })

        // Encontrar el número máximo de filas con datos
        const maxRow = 500
        for (let r = firstRealRow; r <= maxRow; r++) {
          const cod  = String(getCellValue('A', r) ?? '').trim()
          const nom  = String(getCellValue('B', r) ?? '').trim()
          const unit = String(getCellValue('C', r) ?? 'und').trim() || 'und'
          const rawCant = getCellValue(cantColLetter, r)
          const cant = typeof rawCant === 'number' ? rawCant : parseFloat(String(rawCant ?? '').replace(',', '.')) || 0

          if (!cod) continue // fila vacía
          if (cod.length > 40 || cod.startsWith('*') ||
              cod.toLowerCase().includes('required')) continue // nota

          if (cant <= 0) {
            errs.push(`${isEs ? 'Fila' : 'Row'} ${r}: ${isEs
              ? `cantidad inválida para "${cod}" (valor leído: ${JSON.stringify(rawCant)})`
              : `invalid quantity for "${cod}" (read value: ${JSON.stringify(rawCant)})`}`)
            continue
          }

          const matVinculado = matsByCodigo[cod.toLowerCase()] || null
          const nombreFinal  = nom || matVinculado?.descripcion || cod
          const unidadFinal  = unit || matVinculado?.unidad || 'und'

          parsed.push({
            proyecto_id:            proyId,
            nombre_libre:           nombreFinal,
            unidad_libre:           unidadFinal,
            cantidad_presupuestada: cant,
            material_id:            matVinculado?.id || null,
            actividad_id:           null,
            etapa_id:               null,
            sub_etapa_id:           null,
            es_adicional:           false,
            _codigo:                cod,
            _vinculado:             !!matVinculado,
            rowNum:                 r,
          })
        }

        if (parsed.length === 0) {
          setErrors(errs.length ? errs : [isEs ? 'No hay filas válidas.' : 'No valid rows found.'])
          setStep('error'); return
        }

        setRows(parsed)
        setErrors(errs)
        setStep('preview')
      } catch (err) {
        setErrors([`${isEs ? 'Error al leer' : 'Error reading'}: ${err.message}`])
        setStep('error')
      }
    }
    reader.readAsArrayBuffer(file)
  }


  const importar = async () => {
    setStep('importing')
    setProgress(0)
    for (let i = 0; i < rows.length; i++) {
      setProgress(Math.round(((i + 1) / rows.length) * 100))
      const { _codigo, _vinculado, rowNum, ...payload } = rows[i]
      await new Promise(resolve => setTimeout(async () => {
        await dispatch({ type: 'ADD_MAT_PRES', payload })
        resolve()
      }, 80))
    }
    setStep('done')
    if (onDone) onDone()
  }

  return (
    <div className="mt-4 border border-dashed border-gray-200 rounded-xl px-4 py-3 bg-gray-50/40">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {isEs ? 'Importar materiales presupuestados desde Excel' : 'Import budgeted materials from Excel'}
        </span>
      </div>

      {step === 'idle' && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#1B3A6B] hover:text-[#1B3A6B] cursor-pointer transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {isEs ? 'Seleccionar archivo .xlsx' : 'Select .xlsx file'}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => parseFile(e.target.files[0])} />
          </label>
          <button onClick={descargarPlantilla} className="text-xs text-[#1B3A6B] hover:underline">
            ↓ {isEs ? 'Descargar plantilla' : 'Download template'}
          </button>
          <p className="text-xs text-gray-400 w-full mt-1">
            {isEs
              ? '💡 Los códigos que coincidan con el catálogo de inventario se vincularán automáticamente.'
              : '💡 Codes matching the inventory catalog will be linked automatically.'}
          </p>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-gray-700">
              {isEs ? `${rows.length} materiales listos` : `${rows.length} materials ready`}
              {' — '}
              <span className="text-blue-600">
                {rows.filter(r => r._vinculado).length} {isEs ? 'vinculados al catálogo' : 'linked to catalog'}
              </span>
              {errors.length > 0 && <span className="text-amber-600 ml-2">({errors.length} {isEs?'omitidos':'skipped'})</span>}
            </span>
            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={importar} className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg" style={{ background: '#1B3A6B' }}>
                {isEs ? 'Importar ahora' : 'Import now'}
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
              <p className="font-medium mb-1">{isEs ? 'Filas omitidas:' : 'Skipped rows:'}</p>
              {errors.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[isEs?'Código':'Code', isEs?'Nombre':'Name', isEs?'Unidad':'Unit',
                    isEs?'Cantidad':'Qty', isEs?'Vinculado':'Linked'].map((h,i) => (
                    <th key={i} className="px-2 py-1.5 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-2 py-1.5 font-mono text-gray-700">{r._codigo}</td>
                    <td className="px-2 py-1.5 text-gray-700">{r.nombre_libre}</td>
                    <td className="px-2 py-1.5 text-gray-500">{r.unidad_libre}</td>
                    <td className="px-2 py-1.5 font-mono">{r.cantidad_presupuestada}</td>
                    <td className="px-2 py-1.5">
                      {r._vinculado
                        ? <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{isEs?'Sí':'Yes'}</span>
                        : <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{isEs?'No (libre)':'No (free)'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="flex flex-col gap-2 py-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{isEs ? 'Importando...' : 'Importing...'}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#1B3A6B' }} />
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">✓</div>
          <span className="text-sm text-green-700 font-medium">
            {isEs ? `${rows.length} materiales importados.` : `${rows.length} materials imported.`}
          </span>
          <button onClick={reset} className="ml-auto text-xs text-gray-400 hover:text-gray-600">
            {isEs ? 'Importar otro' : 'Import another'}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col gap-2">
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
            <p className="font-medium mb-1">{isEs ? 'Error:' : 'Error:'}</p>
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
