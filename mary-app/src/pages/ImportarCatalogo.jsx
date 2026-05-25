import { useState, useRef, useContext } from 'react'
import * as XLSX from 'xlsx'
import { useStore } from '../store'
import { LangContext } from '../i18n'

const CATEGORIAS = [
  { es: 'Concreto',     en: 'Concrete',   key: 'concreto'     },
  { es: 'Acero',        en: 'Steel',      key: 'acero'        },
  { es: 'Madera',       en: 'Wood',     key: 'madera'       },
  { es: 'Electrico',    en: 'Electrical', key: 'electrico'    },
  { es: 'Plomeria',     en: 'Plumbing',   key: 'plomeria'     },
  { es: 'Acabados',     en: 'Finishes',   key: 'acabados'     },
  { es: 'Herramientas', en: 'Tools',      key: 'herramientas' },
  { es: 'Equipos',      en: 'Equipment',  key: 'equipos'      },
  { es: 'Otros',        en: 'Other',      key: 'otros'        },
]

// Normaliza texto eliminando acentos para comparacion robusta
const normalize = (str) =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const normalizarCategoria = (raw) => {
  const lower = normalize(raw)
  const match = CATEGORIAS.find(c =>
    normalize(c.es) === lower ||
    normalize(c.en) === lower ||
    c.key === lower
  )
  return match ? match.key : 'otros'
}

export default function ImportarCatalogo({ onDone }) {
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
    a.href = `/templates/MARY_Plantilla_Catalogo_Materiales_${lang_code}.xlsx`
    a.download = `MARY_Plantilla_Catalogo_Materiales_${lang_code}.xlsx`
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

        // Buscar fila de headers — normalize() elimina acentos para matchear
        // "Codigo", "Código", "Code", "CODIGO" — todos funcionan
        let headerRow = -1
        for (let i = 0; i < Math.min(data.length, 15); i++) {
          const row = data[i].map(c => normalize(c))
          if (row.some(c => c === 'codigo' || c === 'code' || c.startsWith('cod'))) {
            headerRow = i; break
          }
        }
        if (headerRow === -1) {
          setErrors([isEs
            ? 'No se encontro la fila de encabezados. Verifica que la columna "Codigo" exista.'
            : 'Header row not found. Make sure a "Code" column exists.'])
          setStep('error'); return
        }

        // Normalizar headers para busqueda robusta
        const headers = data[headerRow].map(c => normalize(c))

        const col = (names) => {
          for (const n of names) {
            const i = headers.findIndex(h => h.includes(n))
            if (i !== -1) return i
          }
          return -1
        }

        const iCod  = col(['codigo', 'code'])
        const iDesc = col(['descripcion', 'description', 'descrip'])
        const iCat  = col(['categoria', 'category', 'categor'])
        const iUnit = col(['unidad', 'unit'])
        const iStock= col(['stock ini', 'initial', 'stock_ini', 'stock i'])
        const iMin  = col(['stock min', 'min'])
        const iPU   = col(['precio', 'price', 'unit price', 'p.u'])
        const iUbic = col(['ubic', 'locat'])
        const iAct  = col(['activo', 'active'])

        if (iCod === -1 || iDesc === -1) {
          setErrors([isEs
            ? `No se encontraron las columnas requeridas. Encontradas: [${headers.filter(Boolean).join(', ')}]. Se necesitan "Codigo" y "Descripcion".`
            : `Required columns not found. Found: [${headers.filter(Boolean).join(', ')}]. Need "Code" and "Description".`])
          setStep('error'); return
        }

        const parsed = []
        const errs   = []
        const codigosExistentes = new Set(
          (state.materiales || []).map(m => normalize(m.codigo))
        )

        for (let r = headerRow + 1; r < data.length; r++) {
          const row  = data[r]
          const cod  = String(row[iCod]  || '').trim()
          const desc = String(row[iDesc] || '').trim()
          if (!cod && !desc) continue

          if (!cod)  { errs.push(`${isEs ? 'Fila' : 'Row'} ${r+1}: ${isEs ? 'codigo vacio' : 'empty code'}`); continue }
          if (!desc) { errs.push(`${isEs ? 'Fila' : 'Row'} ${r+1}: ${isEs ? 'descripcion vacia' : 'empty description'}`); continue }

          if (codigosExistentes.has(normalize(cod))) {
            errs.push(`${isEs ? 'Fila' : 'Row'} ${r+1}: ${isEs ? `codigo "${cod}" ya existe` : `code "${cod}" already exists`}`)
            continue
          }

          const cat    = normalizarCategoria(iCat  !== -1 ? row[iCat]  : '')
          const unit   = String(iUnit !== -1 ? (row[iUnit] || 'und') : 'und').trim() || 'und'
          const stock  = parseFloat(iStock !== -1 ? (row[iStock] || 0) : 0) || 0
          const minSt  = parseFloat(iMin   !== -1 ? (row[iMin]   || 0) : 0) || 0
          const pu     = parseFloat(iPU    !== -1 ? (row[iPU]    || 0) : 0) || 0
          const ubic   = String(iUbic !== -1 ? (row[iUbic] || '') : '').trim()
          const actRaw = normalize(iAct !== -1 ? (row[iAct] || 'si') : 'si')
          const activo = actRaw !== 'no' && actRaw !== 'false' && actRaw !== '0'

          parsed.push({
            codigo: cod, descripcion: desc, categoria: cat, unidad: unit,
            stock_actual: stock, stock_minimo: minSt,
            precio_unitario: pu, ubicacion_bodega: ubic, activo,
          })
        }

        if (parsed.length === 0) {
          setErrors(errs.length ? errs : [isEs ? 'No hay filas validas.' : 'No valid rows found.'])
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
      await new Promise(resolve => setTimeout(async () => {
        await dispatch({ type: 'ADD_MATERIAL', payload: rows[i] })
        resolve()
      }, 80))
    }
    setStep('done')
    if (onDone) onDone()
  }

  const catLabel = (key) => {
    const c = CATEGORIAS.find(c => c.key === key)
    return c ? (isEs ? c.es : c.en) : key
  }

  return (
    <div className="mt-4 border border-dashed border-gray-200 rounded-xl px-4 py-3 bg-gray-50/40">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {isEs ? 'Importar catalogo desde Excel' : 'Import catalog from Excel'}
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
            {isEs ? '↓ Descargar plantilla' : '↓ Download template'}
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-gray-700">
              {isEs ? `${rows.length} materiales listos para importar` : `${rows.length} materials ready to import`}
              {errors.length > 0 && <span className="text-amber-600 ml-2">({errors.length} {isEs ? 'omitidos' : 'skipped'})</span>}
            </span>
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
              <p className="font-medium mb-1">{isEs ? 'Filas omitidas:' : 'Skipped rows:'}</p>
              {errors.map((e, i) => <p key={i}>- {e}</p>)}
            </div>
          )}

          <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['Codigo', isEs ? 'Descripcion' : 'Description', isEs ? 'Categoria' : 'Category',
                    isEs ? 'Unidad' : 'Unit', 'Stock', 'Min.', isEs ? 'P.U.' : 'U.P.'].map((h,i) => (
                    <th key={i} className="px-2 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-2 py-1.5 font-mono font-medium text-gray-700">{r.codigo}</td>
                    <td className="px-2 py-1.5 text-gray-700">{r.descripcion}</td>
                    <td className="px-2 py-1.5 text-gray-500">{catLabel(r.categoria)}</td>
                    <td className="px-2 py-1.5 text-gray-500">{r.unidad}</td>
                    <td className="px-2 py-1.5 font-mono">{r.stock_actual}</td>
                    <td className="px-2 py-1.5 font-mono">{r.stock_minimo}</td>
                    <td className="px-2 py-1.5 font-mono">${r.precio_unitario}</td>
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
            <span>{isEs ? 'Importando materiales...' : 'Importing materials...'}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: '#1B3A6B' }} />
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">ok</div>
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
            {errors.map((e, i) => <p key={i}>- {e}</p>)}
          </div>
          <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 self-start">
            {isEs ? 'Intentar de nuevo' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  )
}
