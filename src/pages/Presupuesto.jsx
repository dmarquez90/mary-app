import { useState, useMemo, useContext, useRef, Fragment } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { fmt, fmtNum, flatBudgetItems, calcSubtotal, calcGrandTotal, UNIDADES, UNIDADES_CONFIG, getUnitLabel, r2 } from '../utils'
import { EmptyState, PrimaryBtn, TBtn, Confirm, Icons, inputCls, selectCls, PageHeader } from '../components'
import ImportarPresupuesto from './ImportarPresupuesto'
import { CATEGORIAS_IND, CAT_KEYS, getSubcategorias, getCategoriaLabel } from './categoriasIndirectos'

// Id de la fila que todavia no existe en la base: la partida que se esta
// escribiendo. No colisiona con los uuid reales.
const DRAFT_ID = '__nueva__'

// Que se puede editar tocando la celda, segun el tipo de fila. El costo
// unitario y el total no estan: son calculados.
const CAMPOS_EDITABLES = {
  etapa:     ['descripcion'],
  sub_etapa: ['descripcion'],
  actividad: ['descripcion','unidad','cantidad','costo_mo','costo_materiales','costo_equipos'],
}

export default function Presupuesto() {
  const { state, dispatch } = useStore()
  const { t, lang } = useContext(LangContext)
  const { can } = usePermissions()
  const { proyectos, presupuesto, presupuesto_indirectos = [], cajas_chicas = [] } = state

  const [proyId, setProyId]         = useState(proyectos[0]?.id || '')
  const [edit, setEdit]             = useState(null)  // { id, campo } de la celda abierta
  const [editVal, setEditVal]       = useState('')
  const [draft, setDraft]           = useState(null)  // partida nueva sin guardar
  const [confirmDel, setConfirmDel] = useState(null)

  const isEs = lang === 'ES'
  const puedeEditar = can('presupuesto_editar')

  const [indForm, setIndForm]   = useState({ categoria: '', subcategoria: '', monto_presupuestado: '' })
  const [indEdit, setIndEdit]   = useState(null)
  const setIndF = k => e => setIndForm(f => ({ ...f, [k]: e.target.value }))

  // Bloquea eliminar el indirecto "Caja Chica" mientras haya un fondo activo en este proyecto.
  const eliminarPresInd = (item) => {
    const esCajaChica = item.categoria === 'Caja Chica' || item.categoria === 'Petty Cash'
    if (esCajaChica) {
      const cajaActiva = cajas_chicas.find(c => c.proyecto_id === proyId && c.estado === 'activa')
      if (cajaActiva) {
        alert(t('pres_ind_alert_cc_active'))
        return
      }
    }
    dispatch({ type: 'DEL_PRES_IND', payload: item.id })
  }

  const CATS_IND = CAT_KEYS.map(key => ({ key, label: getCategoriaLabel(key, lang) }))

  // Auto-sync desde Supabase al seleccionar un proyecto
  // Evita mostrar datos desincronizados del store local
  const [syncing, setSyncing] = useState(false)

  const syncPresupuesto = async (pid) => {
    if (!pid) return
    setSyncing(true)
    await dispatch({ type: 'REFRESH_PRESUPUESTO', payload: { proyectoId: pid } })
    setSyncing(false)
  }

  // Sincroniza automáticamente al cambiar de proyecto
  const handleProyChange = (pid) => {
    setProyId(pid)
    setDraft(null)
    setEdit(null)
    syncPresupuesto(pid)
  }

  const proy   = proyectos.find(p => p.id === proyId)
  const items  = useMemo(() => presupuesto.filter(b => b.proyecto_id === proyId), [presupuesto, proyId])
  const flat   = useMemo(() => flatBudgetItems(items), [items])
  const closed = proy?.estado === 'completado' || proy?.estado === 'cancelado'

  const stages    = items.filter(i => i.tipo === 'etapa')
  const substages = items.filter(i => i.tipo === 'sub_etapa')
  const grandTotal = calcGrandTotal(items)

  // ── Edición directa en celdas ──────────────────────────────
  // La tabla se edita como una hoja de cálculo: clic en la celda, Tab para
  // avanzar, Esc para cancelar. El costo unitario y el total son calculados,
  // así que no se editan.
  const num = v => parseFloat(v) || 0
  const saltarBlur = useRef(false)

  // Cuando la salida de una celda la decide el teclado (Enter/Tab/Esc), el
  // blur del input que se desmonta llegaría después y pisaría lo que acabamos
  // de hacer. Esto lo desactiva por lo que dura ese ciclo.
  const marcarSalida = () => {
    saltarBlur.current = true
    setTimeout(() => { saltarBlur.current = false }, 0)
  }

  const ultima = (tipo) => {
    for (let i = flat.length - 1; i >= 0; i--) if (flat[i].tipo === tipo) return flat[i]
    return null
  }

  // Las filas que se dibujan: las guardadas más, si la hay, la partida nueva.
  // Va al final del bloque de su padre, que es donde uno espera verla.
  const filas = useMemo(() => {
    const base = flat.map(item => ({ item, esDraft: false }))
    if (!draft) return base
    const fila = { item: { ...draft, id: DRAFT_ID }, esDraft: true }
    if (draft.tipo === 'etapa' || !draft.parent_id) { base.push(fila); return base }
    const idxPadre = base.findIndex(f => f.item.id === draft.parent_id)
    if (idxPadre < 0) { base.push(fila); return base }
    const desciendeDelPadre = (item) => {
      let p = item.parent_id
      for (let saltos = 0; p && saltos < 10; saltos++) {
        if (p === draft.parent_id) return true
        p = flat.find(x => x.id === p)?.parent_id
      }
      return false
    }
    let j = idxPadre + 1
    while (j < base.length && desciendeDelPadre(base[j].item)) j++
    base.splice(j, 0, fila)
    return base
  }, [flat, draft])

  // Orden de tabulación: todas las celdas editables, fila por fila.
  const celdas = useMemo(
    () => filas.flatMap(f => (CAMPOS_EDITABLES[f.item.tipo] || []).map(campo => ({ id: f.item.id, campo }))),
    [filas],
  )

  const filaPorId = (id) => filas.find(f => f.item.id === id)?.item

  const abrirCelda = (item, campo) => {
    if (!puedeEditar || closed) return
    const v = item[campo]
    const texto = (campo === 'descripcion' || campo === 'unidad')
      ? (v ?? '')
      : (v === '' || v == null || Number(v) === 0 ? '' : String(v))
    setEditVal(texto)
    setEdit({ id: item.id, campo })
  }

  // En la partida nueva solo actualiza el borrador; en una fila guardada
  // escribe el campo, y solo si de verdad cambió.
  const commitCelda = (item, campo, valor) => {
    if (item.id === DRAFT_ID) { setDraft(d => d && ({ ...d, [campo]: valor })); return }
    const numerico = campo !== 'descripcion' && campo !== 'unidad'
    const nuevo    = numerico ? num(valor) : String(valor).trim()
    const actual   = numerico ? num(item[campo]) : (item[campo] || '')
    if (campo === 'descripcion' && !nuevo) return
    if (nuevo === actual) return
    dispatch({ type: 'UPD_BUDGET', payload: { id: item.id, [campo]: nuevo } })
  }

  const nuevaPartida = (tipo) => {
    const parent_id = tipo === 'sub_etapa' ? (ultima('etapa')?.id || '')
      : tipo === 'actividad' ? (ultima('sub_etapa')?.id || ultima('etapa')?.id || '')
      : ''
    setDraft({ tipo, parent_id, descripcion: '', unidad: 'm²', cantidad: '', costo_mo: '', costo_materiales: '', costo_equipos: '' })
    setEditVal('')
    setEdit({ id: DRAFT_ID, campo: 'descripcion' })
  }

  const cancelarDraft = () => { setDraft(null); setEdit(null) }

  const draftListo = (d) => !!d && !!String(d.descripcion || '').trim() && (d.tipo === 'etapa' || !!d.parent_id)

  // Guarda la partida nueva y deja otra igual lista, para cargar de corrido.
  const guardarDraft = (d) => {
    if (!draftListo(d)) return
    dispatch({ type: 'ADD_BUDGET', payload: {
      proyectoId: proyId, tipo: d.tipo, parent_id: d.parent_id || null,
      descripcion: String(d.descripcion).trim(), unidad: d.unidad || 'm²',
      cantidad: num(d.cantidad), costo_mo: num(d.costo_mo),
      costo_materiales: num(d.costo_materiales), costo_equipos: num(d.costo_equipos),
    } })
    setDraft({ tipo: d.tipo, parent_id: d.parent_id, descripcion: '', unidad: d.unidad || 'm²',
      cantidad: '', costo_mo: '', costo_materiales: '', costo_equipos: '' })
    setEditVal('')
    setEdit({ id: DRAFT_ID, campo: 'descripcion' })
  }

  const teclaCelda = (e, item, campo) => {
    if (e.key === 'Escape') {
      e.preventDefault(); marcarSalida()
      if (item.id === DRAFT_ID) cancelarDraft(); else setEdit(null)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault(); marcarSalida()
      if (item.id === DRAFT_ID) guardarDraft({ ...draft, [campo]: editVal })
      else { commitCelda(item, campo, editVal); setEdit(null) }
      return
    }
    if (e.key !== 'Tab') return
    e.preventDefault(); marcarSalida()
    commitCelda(item, campo, editVal)
    const i   = celdas.findIndex(c => c.id === item.id && c.campo === campo)
    const sig = celdas[i + (e.shiftKey ? -1 : 1)]
    if (!sig) { setEdit(null); return }
    const itemSig = sig.id === DRAFT_ID
      ? { ...draft, ...(item.id === DRAFT_ID ? { [campo]: editVal } : {}), id: DRAFT_ID }
      : filaPorId(sig.id)
    if (itemSig) abrirCelda(itemSig, sig.campo)
    else setEdit(null)
  }

  // Una celda de la tabla. Es una función y no un componente a propósito: como
  // componente, React lo remontaría en cada tecla y el input perdería el foco.
  const celda = (item, campo, { contenido, align = 'right', clase = '' }) => {
    const puede  = puedeEditar && !closed && (CAMPOS_EDITABLES[item.tipo] || []).includes(campo)
    const activa = puede && edit && edit.id === item.id && edit.campo === campo
    const base   = `px-3 py-2.5 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''} ${clase}`

    if (activa) {
      const numerico = campo !== 'descripcion' && campo !== 'unidad'
      return (
        <td className={base}>
          {campo === 'unidad' ? (
            <select autoFocus className="m-cell-input" value={editVal}
              onChange={e => { marcarSalida(); setEditVal(e.target.value); commitCelda(item, campo, e.target.value); setEdit(null) }}
              onKeyDown={e => teclaCelda(e, item, campo)}
              onBlur={() => { if (!saltarBlur.current) setEdit(null) }}>
              {UNIDADES_CONFIG.map(u => <option key={u.value} value={u.value}>{lang === 'ES' ? u.es : u.en}</option>)}
            </select>
          ) : (
            <input autoFocus className={`m-cell-input${numerico ? ' num' : ''}`}
              type={numerico ? 'number' : 'text'} min={numerico ? '0' : undefined} step={numerico ? '0.01' : undefined}
              placeholder={numerico ? '0.00' : ''}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => teclaCelda(e, item, campo)}
              onBlur={() => {
                if (saltarBlur.current) return
                commitCelda(item, campo, editVal)
                setEdit(prev => (prev && prev.id === item.id && prev.campo === campo) ? null : prev)
              }} />
          )}
        </td>
      )
    }
    return (
      <td className={`${base}${puede ? ' m-cell' : ''}`} onClick={puede ? () => abrirCelda(item, campo) : undefined}>
        {contenido}
      </td>
    )
  }

  const del = () => {
    dispatch({ type:'DEL_BUDGET', payload: confirmDel })
    setConfirmDel(null)
  }

  const moneda   = proy?.moneda || 'USD'

  const indsDelProy   = presupuesto_indirectos.filter(p => p.proyecto_id === proyId)
  const totalIndirecto = indsDelProy.reduce((s, p) => s + parseFloat(p.monto_presupuestado || 0), 0)

  // Agrupar por categoría: una fila por categoría (con su total), y debajo
  // una fila por cada subcategoría/registro individual (editable).
  const indsAgrupados = useMemo(() => {
    const groups = {}
    indsDelProy.forEach(ind => {
      if (!groups[ind.categoria]) groups[ind.categoria] = []
      groups[ind.categoria].push(ind)
    })
    return Object.keys(groups).map(cat => ({
      categoria: cat,
      label: CATS_IND.find(c => c.key === cat)?.label ?? cat,
      items: groups[cat],
      total: groups[cat].reduce((s,i) => s + parseFloat(i.monto_presupuestado||0), 0),
    }))
  }, [indsDelProy, lang])
  const subtotalPres   = grandTotal + totalIndirecto
  const utilidadPct    = parseFloat(proy?.utilidad_pct || 0)
  const impuestoPct    = parseFloat(proy?.impuesto_pct || 0)
  const utilidadMonto  = r2(subtotalPres * (utilidadPct / 100))
  const granTotal      = r2(subtotalPres + utilidadMonto)
  const impuestoMonto  = r2(granTotal * (impuestoPct / 100))
  const totalConImp    = r2(granTotal + impuestoMonto)

  const saveInd = () => {
    if (!indForm.categoria || !indForm.monto_presupuestado) return
    // Normalizar subcategoría a ES si fue seleccionada en EN
    let subcategoria = indForm.subcategoria || ''
    if (subcategoria && lang !== 'ES') {
      const cat = CATEGORIAS_IND[indForm.categoria]
      const idxEn = cat?.subs.en.indexOf(subcategoria)
      if (idxEn >= 0) subcategoria = cat.subs.es[idxEn]
    }
    const payload = { ...indForm, subcategoria: subcategoria || null }
    if (indEdit) {
      dispatch({ type: 'UPD_PRES_IND', payload: { ...payload, id: indEdit, proyecto_id: proyId } })
    } else {
      dispatch({ type: 'ADD_PRES_IND', payload: { ...payload, proyecto_id: proyId } })
    }
    setIndForm({ categoria: '', subcategoria: '', monto_presupuestado: '' })
    setIndEdit(null)
  }
  const tipoLabel = (tipo) => {
    if (tipo==='etapa')     return t('pres_form_stage')
    if (tipo==='sub_etapa') return t('pres_form_substage')
    return t('pres_form_activity')
  }

  return (
    <div className="p-5 md:p-6 max-w-full">
      <PageHeader
        title={t('pres_title')}
        subtitle={proy ? `${proy.project_code} — ${proy.nombre}` : null}
        actions={<>
          <button
            onClick={() => syncPresupuesto(proyId)}
            disabled={!proyId || syncing}
            title={t('pres_reload_server')}
            className="m-btn m-btn-ghost" style={{ padding: 9 }}>
            {syncing ? '⟳' : '↺'}
          </button>
          <select
            className="m-input" style={{ width: 'auto', minWidth: 190 }}
            value={proyId} onChange={e => handleProyChange(e.target.value)}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </>}
      />

      {!proyId ? (
        <EmptyState icon={Icons.budget} title={t('pres_no_project')} subtitle={t('pres_empty_sub')} />
      ) : (
        <>
          <div className="m-card mb-0 px-4 py-3 flex items-center gap-2 flex-wrap rounded-b-none border-b-0 sticky top-0 z-20">
            {puedeEditar && !closed && <>
              <TBtn onClick={() => nuevaPartida('etapa')}>
                <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{background:'#1D9E75'}}/>
                {t('pres_add_stage')}
              </TBtn>
              <TBtn onClick={() => nuevaPartida('sub_etapa')} disabled={stages.length===0}>
                <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{background:'#185FA5'}}/>
                {t('pres_add_substage')}
              </TBtn>
              <TBtn onClick={() => nuevaPartida('actividad')} disabled={stages.length===0}>
                <span className="w-2 h-2 rounded-sm inline-block mr-1 bg-gray-400"/>
                {t('pres_add_activity')}
              </TBtn>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <span className="text-[11px] text-gray-400 hidden md:inline">
                {isEs ? 'Clic en una celda para editarla · Tab avanza · Esc cancela'
                      : 'Click a cell to edit · Tab moves on · Esc cancels'}
              </span>
            </>}
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-gray-400 text-xs">{t('pres_grand_total')}:</span>
              <span className="font-semibold font-mono text-sm" style={{color:'#1D9E75'}}>{fmt(grandTotal, moneda)}</span>
            </div>
          </div>

          {/* ← IMPORTAR DESDE EXCEL */}
          {puedeEditar && !closed && (
            <ImportarPresupuesto proyId={proyId} moneda={moneda} onDone={() => { setDraft(null); setEdit(null) }} />
          )}

          {flat.length === 0 && !draft ? (
            <div className="m-card rounded-t-none py-16">
              <EmptyState icon={Icons.table} title={t('pres_empty')} subtitle={t('pres_empty_sub')}
                action={puedeEditar ? t('pres_add_stage') : null}
                onAction={puedeEditar ? () => nuevaPartida('etapa') : null} />
            </div>
          ) : (
            <div className="m-card rounded-t-none overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 ">
                    {['ID',t('pres_col_desc'),t('pres_col_unit'),t('pres_col_qty'),t('pres_col_mo'),t('pres_col_mat'),t('pres_col_eq'),t('pres_col_uc'),t('pres_col_total')].map((h,i) => (
                      <th key={i} className={`px-3 py-3 text-xs text-gray-500 whitespace-nowrap ${i>=3?'text-right':'text-left'}`}>{h}</th>
                    ))}
                    {puedeEditar && !closed && <th className="px-3 py-3 w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ item, esDraft }) => {
                    const isEt = item.tipo==='etapa'
                    const isSs = item.tipo==='sub_etapa'
                    const isAc = item.tipo==='actividad'
                    const uc   = isAc ? r2(num(item.costo_mo)+num(item.costo_materiales)+num(item.costo_equipos)) : 0
                    const tc   = isAc ? r2(num(item.cantidad)*uc)
                               : esDraft ? 0
                               : calcSubtotal(items, item.id, item.tipo)
                    return (
                      <tr key={item.id}
                        className={`transition-colors
                          ${isEt ? 'border-b-2 border-t border-gray-200' : 'border-b border-gray-50'}
                          ${esDraft ? 'bg-amber-50/70' : isEt ? 'bg-green-50/60 hover:bg-green-50' : 'hover:bg-gray-50/50'}`}>

                        {/* ID — en la partida nueva, el selector de padre */}
                        <td className="px-3 py-2.5">
                          {esDraft ? (
                            isEt ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                {isEs ? 'NUEVA' : 'NEW'}
                              </span>
                            ) : (
                              <select className="m-cell-input" style={{ width: 104 }} value={item.parent_id || ''}
                                title={isEs ? 'Dónde se cuelga la partida' : 'Where this item hangs'}
                                onChange={e => setDraft(d => d && ({ ...d, parent_id: e.target.value }))}>
                                <option value="">{isEs ? '— padre —' : '— parent —'}</option>
                                {(isSs ? stages : [...substages, ...stages]).map(s => (
                                  <option key={s.id} value={s.id}>{s.code} — {s.descripcion}</option>
                                ))}
                              </select>
                            )
                          ) : isEt ? (
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-5 rounded-full bg-green-500 flex-shrink-0"/>
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-green-100 text-green-700">
                                {item.code}
                              </span>
                            </div>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium
                              ${isSs?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>
                              {item.code}
                            </span>
                          )}
                        </td>

                        {celda(item, 'descripcion', {
                          align: 'left', clase: 'max-w-xs',
                          contenido: (
                            <div className="flex items-center gap-1.5" style={{ paddingLeft: isAc?24:isSs?12:0 }}>
                              <span className={`text-sm ${isEt?'font-semibold text-gray-800':isSs?'font-medium text-gray-700':'text-gray-600'}`}>
                                {item.descripcion || <span className="text-gray-300">{tipoLabel(item.tipo)}…</span>}
                              </span>
                              {item.origen_oc_id && (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                  OC
                                </span>
                              )}
                            </div>
                          ),
                        })}

                        {celda(item, 'unidad', {
                          align: 'center', clase: 'text-xs text-gray-500',
                          contenido: isAc ? getUnitLabel(item.unidad, lang) : '—',
                        })}
                        {celda(item, 'cantidad', {
                          clase: 'text-xs font-mono text-gray-600',
                          contenido: isAc ? fmtNum(item.cantidad) : '—',
                        })}
                        {celda(item, 'costo_mo', {
                          clase: 'text-xs font-mono text-gray-500',
                          contenido: isAc ? fmt(item.costo_mo, moneda) : '—',
                        })}
                        {celda(item, 'costo_materiales', {
                          clase: 'text-xs font-mono text-gray-500',
                          contenido: isAc ? fmt(item.costo_materiales, moneda) : '—',
                        })}
                        {celda(item, 'costo_equipos', {
                          clase: 'text-xs font-mono text-gray-500',
                          contenido: isAc ? fmt(item.costo_equipos, moneda) : '—',
                        })}

                        <td className="px-3 py-2.5 text-right text-xs font-mono font-medium text-gray-700">{isAc?fmt(uc,moneda):'—'}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-mono font-semibold"
                          style={{ color: isEt?'#1D9E75':isSs?'#185FA5':'#374151' }}>
                          {fmt(tc, moneda)}
                        </td>

                        {puedeEditar && !closed && (
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {esDraft ? (
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => guardarDraft(draft)} disabled={!draftListo(draft)}
                                  title={t('btn_add')} className="m-btn m-btn-sm m-btn-primary" style={{ padding: '3px 9px' }}>✓</button>
                                <TBtn onClick={cancelarDraft} title={t('btn_cancel')}>✕</TBtn>
                              </div>
                            ) : (
                              <TBtn danger onClick={() => setConfirmDel(item.id)} title={t('btn_delete')}>✕</TBtn>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={8} className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('pres_grand_total')}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold font-mono" style={{color:'#1D9E75'}}>{fmt(grandTotal, moneda)}</td>
                    {puedeEditar && !closed && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── SECCIÓN COSTOS INDIRECTOS PRESUPUESTADOS ── */}
      {proyId && (
        <div className="mt-6 m-card overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{t('pres_indirect_title')}</p>
          </div>
          <div className="p-4">
            {puedeEditar && !closed && (
              <div className="flex gap-2 mb-4 flex-wrap">
                <select className={selectCls + ' flex-1 min-w-[220px]'}
                  value={indForm.categoria} onChange={e=>setIndForm(f=>({...f, categoria: e.target.value, subcategoria: ''}))}>
                  <option value="">{t('pres_indirect_select_cat')}</option>
                  {CATS_IND.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                {indForm.categoria && (
                  <select className={selectCls + ' flex-1 min-w-[200px]'}
                    value={indForm.subcategoria} onChange={setIndF('subcategoria')}>
                    <option value="">{isEs?'— Subcategoría (opcional) —':'— Subcategory (optional) —'}</option>
                    {getSubcategorias(indForm.categoria, lang).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                <input type="number" className={inputCls + ' w-36'}
                  placeholder={t('pres_indirect_budget_ph')}
                  value={indForm.monto_presupuestado} onChange={setIndF('monto_presupuestado')}
                  min="0" step="0.01" />
                <PrimaryBtn onClick={saveInd} disabled={!indForm.categoria || !indForm.monto_presupuestado}>
                  {indEdit ? t('btn_save') : t('btn_add')}
                </PrimaryBtn>
                {indEdit && (
                  <SecondaryBtn onClick={() => { setIndForm({ categoria: '', subcategoria: '', monto_presupuestado: '' }); setIndEdit(null) }}>
                    {t('btn_cancel')}
                  </SecondaryBtn>
                )}
              </div>
            )}
            {indsDelProy.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">{t('pres_indirect_empty')}</p>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-500 px-2 py-2">{t('pres_indirect_col_cat')}</th>
                  <th className="text-right text-xs text-gray-500 px-2 py-2">{t('pres_indirect_col_amount')}</th>
                  {puedeEditar && <th className="px-2 py-2"></th>}
                </tr></thead>
                <tbody>
                  {indsAgrupados.map(g => {
                    const isSimple = g.items.length === 1 && !g.items[0].subcategoria
                    const item0 = g.items[0]
                    return (
                      <Fragment key={g.categoria}>
                        <tr className={isSimple ? 'border-b border-gray-50 hover:bg-gray-50/50' : 'bg-gray-50/70 border-b border-gray-100'}>
                          <td className={`px-2 py-2 text-sm ${isSimple ? 'text-gray-700' : 'font-semibold text-gray-700'}`}>{g.label}</td>
                          <td className="px-2 py-2 text-sm font-mono text-right font-medium" style={{ color: 'var(--brand)' }}>{fmt(g.total, moneda)}</td>
                          {puedeEditar && (
                            <td className="px-2 py-2">
                              {isSimple && (
                                <div className="flex gap-1">
                                  <TBtn onClick={() => { setIndForm({ categoria: item0.categoria, subcategoria: item0.subcategoria||'', monto_presupuestado: item0.monto_presupuestado }); setIndEdit(item0.id) }}>{t('btn_edit')}</TBtn>
                                  <TBtn danger onClick={() => eliminarPresInd(item0)}>{t('btn_delete')}</TBtn>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                        {!isSimple && g.items.map(ind => (
                          <tr key={ind.id} className="m-tr">
                            <td className="px-2 py-2 pl-7 text-xs text-gray-500">
                              {(() => {
                                const sub = ind.subcategoria
                                if (!sub) return isEs ? 'General / sin subcategoría' : 'General / no subcategory'
                                if (lang === 'ES') return sub
                                // traducir ES→EN
                                const cat = CATEGORIAS_IND[ind.categoria]
                                const idxEs = cat?.subs.es.indexOf(sub)
                                return (idxEs >= 0 && cat?.subs.en[idxEs]) ? cat.subs.en[idxEs] : sub
                              })()}
                            </td>
                            <td className="px-2 py-2 text-sm font-mono text-right text-gray-600">{fmt(ind.monto_presupuestado, moneda)}</td>
                            {puedeEditar && (
                              <td className="px-2 py-2">
                                <div className="flex gap-1">
                                  <TBtn onClick={() => { setIndForm({ categoria: ind.categoria, subcategoria: ind.subcategoria||'', monto_presupuestado: ind.monto_presupuestado }); setIndEdit(ind.id) }}>{t('btn_edit')}</TBtn>
                                  <TBtn danger onClick={() => eliminarPresInd(ind)}>{t('btn_delete')}</TBtn>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </Fragment>
                    )
                  })}
                  <tr className="bg-gray-50">
                    <td className="px-2 py-2 text-xs font-semibold text-gray-500 text-right">{t('pres_indirect_total')}</td>
                    <td className="px-2 py-2 text-sm font-mono font-bold text-right" style={{ color: 'var(--brand)' }}>{fmt(totalIndirecto, moneda)}</td>
                    {puedeEditar && <td/>}
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── RESUMEN FINANCIERO COMPLETO ── */}
      {proyId && (
        <div className="mt-4 m-card overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">{t('pres_summary_title')}</p>
          </div>
          <div className="p-4 flex flex-col gap-1.5">
            {[
              [t('pres_summary_direct'), grandTotal, '#374151'],
              [t('pres_summary_indirect'), totalIndirecto, '#374151'],
            ].map(([label, val, color]) => (
              <div key={label} className="flex justify-between text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-mono" style={{color}}>{fmt(val, moneda)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-1 border-b border-gray-100">
              <span className="text-gray-600 font-medium">{t('pres_summary_subtotal')}</span>
              <span className="font-mono font-medium text-gray-700">{fmt(subtotalPres, moneda)}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">{isEs ? `Utilidad (${utilidadPct}%)` : `Profit (${utilidadPct}%)`}</span>
              <span className="font-mono text-gray-600">{fmt(utilidadMonto, moneda)}</span>
            </div>
            <div className="flex justify-between text-base font-bold py-2 border-b border-gray-200">
              <span className="text-gray-800">{t('pres_summary_grand_total')}</span>
              <span className="font-mono" style={{color:'#1D9E75'}}>{fmt(granTotal, moneda)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">{proy?.impuesto_descripcion || (isEs ? `Impuesto (${impuestoPct}%)` : `Tax (${impuestoPct})`)}</span>
              <span className="font-mono text-gray-600">{fmt(impuestoMonto, moneda)}</span>
            </div>
            <div className="flex justify-between text-base font-bold py-2 bg-blue-50 rounded-lg px-3 mt-1">
              <span style={{ color: 'var(--brand)' }}>{t('pres_summary_with_tax')}</span>
              <span className="font-mono" style={{ color: 'var(--brand)' }}>{fmt(totalConImp, moneda)}</span>
            </div>
            {(!proy?.utilidad_pct && !proy?.impuesto_pct) && (
              <p className="text-xs text-amber-600 mt-2">
                {t('pres_summary_tax_hint')}
              </p>
            )}
          </div>
        </div>
      )}

      <Confirm open={!!confirmDel} message={t('pres_delete_confirm')}
        onConfirm={del} onCancel={() => setConfirmDel(null)}
        confirmLabel={t('btn_delete')} cancelLabel={t('btn_cancel')} />
    </div>
  )
}

