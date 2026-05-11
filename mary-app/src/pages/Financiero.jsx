import { useState, useContext, useMemo } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { today, fmt, fmtNum } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, StatCard, Icons, inputCls, selectCls } from '../components'

// ── CATEGORÍAS DE COSTOS INDIRECTOS ──────────────────────────────────────
const CATEGORIAS_IND = {
  'Administración de obra': {
    es: 'Administración de obra',
    en: 'Project Administration',
    subs: {
      es: ['Personal administrativo de obra','Papelería, impresiones, comunicaciones','Seguridad e higiene industrial'],
      en: ['Administrative staff','Stationery, printing, communications','Safety and industrial hygiene'],
    }
  },
  'Instalaciones y servicios generales': {
    es: 'Instalaciones y servicios generales',
    en: 'Facilities & General Services',
    subs: {
      es: ['Oficina, bodegas, casetas','Baños portátiles','Energía eléctrica temporal','Agua, internet, vigilancia','Señalización y control de accesos'],
      en: ['Office, warehouses, booths','Portable restrooms','Temporary electrical power','Water, internet, security','Signage and access control'],
    }
  },
  'Seguros, fianzas y garantías': {
    es: 'Seguros, fianzas y garantías',
    en: 'Insurance, Bonds & Guarantees',
    subs: {
      es: ['Seguro de obra','Seguro de responsabilidad civil','Fianzas de cumplimiento y anticipo'],
      en: ['Construction insurance','Civil liability insurance','Performance and advance bonds'],
    }
  },
  'Servicios profesionales y legales': {
    es: 'Servicios profesionales y legales',
    en: 'Professional & Legal Services',
    subs: {
      es: ['Licencias','Permisos','Consultorías'],
      en: ['Licenses','Permits','Consultancies'],
    }
  },
}

const CAT_KEYS = Object.keys(CATEGORIAS_IND)

export default function Financiero() {
  const { state, dispatch }     = useStore()
  const { t, lang }             = useContext(LangContext)
  const { can }                 = usePermissions()
  const isEs                    = lang === 'ES'

  const { proyectos, presupuesto, costos_directos, nominas, subcontratos,
    equipos, costos_indirectos, salidas, entradas } = state

  const [tab, setTab]       = useState(0)
  const [proyId, setProyId] = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer] = useState(false)
  const [form, setForm]     = useState({})
  const [editId, setEditId] = useState(null)

  const puedeEditar = can('financiero_editar')
  const set         = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Tabs: Imprevistos | Nómina | Subcontratos | Equipos | Administración
  const TABS = [
    isEs ? 'Imprevistos'    : 'Contingencies',
    t('fin_tab_payroll'),
    t('fin_tab_subcontracts'),
    t('fin_tab_equipment'),
    isEs ? 'Administración' : 'Administration',
  ]

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const acts   = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'actividad')
  const closed = proy?.estado === 'completado' || proy?.estado === 'cancelado'

  const directs = costos_directos.filter(c => c.proyecto_id === proyId)
  const noms    = nominas.filter(n => n.proyecto_id === proyId)
  const subs    = subcontratos.filter(s => s.proyecto_id === proyId)
  const eqs     = equipos.filter(e => e.proyecto_id === proyId)
  const inds    = costos_indirectos.filter(c => c.proyecto_id === proyId)

  const totalDir = directs.reduce((s,c) => s+(parseFloat(c.monto)||0), 0)
  const totalNom = noms.reduce((s,n) => s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0), 0)
  const totalSub = subs.reduce((s,sc) => s+(parseFloat(sc.monto_pagado)||0), 0)
  const totalEq  = eqs.reduce((s,e) => s+(parseFloat(e.costo_total)||0), 0)
  const totalInd = inds.reduce((s,c) => s+(parseFloat(c.monto)||0), 0)
  const totalMat = salidas.filter(s=>s.proyecto_id===proyId).reduce((s,sa) => {
    const idx = entradas.find(e=>e.material_id===sa.material_id)
    return s+(parseFloat(sa.cantidad)||0)*(parseFloat(idx?.precio_unitario)||0)
  }, 0)
  const totalReal = totalMat + totalDir + totalNom + totalSub + totalEq + totalInd

  // ── Días trabajados para nómina ───────────────────────────────────────
  const diasTrabajados = useMemo(() => {
    const inicio = form.periodo_inicio ? new Date(form.periodo_inicio) : null
    const fin    = form.periodo_fin    ? new Date(form.periodo_fin)    : null
    if (!inicio || !fin || fin < inicio) return 0
    return Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1
  }, [form.periodo_inicio, form.periodo_fin])

  // ── Cálculo automático de salario base en nómina ──────────────────────
  const calcSalarioBase = (dias, tipoPago, tarifa) => {
    const d = parseFloat(dias) || 0
    const r = parseFloat(tarifa) || 0
    if (!d || !r) return ''
    if (tipoPago === 'hora') {
      // Asume 8 horas por día
      return (d * 8 * r).toFixed(2)
    }
    return (d * r).toFixed(2)
  }

  // ── Subcategorías según categoría seleccionada ────────────────────────
  const subcats = useMemo(() => {
    if (!form.categoria || !CATEGORIAS_IND[form.categoria]) return []
    return CATEGORIAS_IND[form.categoria].subs[isEs ? 'es' : 'en']
  }, [form.categoria, isEs])

  const openDrawer = () => {
    setEditId(null)
    const base = { proyecto_id: proyId }
    if (tab===0) setForm({...base, tipo:'factura_obra', descripcion:'', monto:'', numero_documento:'', actividad_id:'', fecha:today()})
    if (tab===1) setForm({...base, trabajador:'', cargo:'', periodo_inicio:today(), periodo_fin:today(), tipo_pago:'dia', tarifa:'', salario_base:'', deducciones:'0'})
    if (tab===2) setForm({...base, subcontratista:'', descripcion_trabajo:'', monto_contrato:'', avance_porcentaje:'0', monto_pagado:'0', actividad_id:''})
    if (tab===3) setForm({...base, descripcion:'', tipo:'alquiler', tarifa_diaria:'', dias_uso:'', costo_total:''})
    if (tab===4) setForm({...base, categoria:'', subcategoria:'', descripcion:'', monto:'', fecha:today()})
    setDrawer(true)
  }

  const openEdit = (item) => {
    setEditId(item.id)
    setForm({ ...item })
    setDrawer(true)
  }

  const TYPES     = ['ADD_COSTO_DIRECTO','ADD_NOMINA','ADD_SUBCONTRATO','ADD_EQUIPO','ADD_COSTO_INDIRECTO']
  const UPD_TYPES = ['UPD_COSTO_DIRECTO','UPD_NOMINA','UPD_SUBCONTRATO','UPD_EQUIPO','UPD_COSTO_INDIRECTO']
  const DEL_TYPES = ['DEL_COSTO_DIRECTO','DEL_NOMINA','DEL_SUBCONTRATO','DEL_EQUIPO','DEL_COSTO_INDIRECTO']

  const del = (id) => {
    if (!window.confirm(isEs ? '¿Eliminar este registro? Esta acción no se puede deshacer.' : 'Delete this record? This action cannot be undone.')) return
    dispatch({ type: DEL_TYPES[tab], payload: id })
  }

  const save = () => {
    if (editId) {
      dispatch({ type: UPD_TYPES[tab], payload: { ...form, id: editId } })
    } else {
      if (tab===0) { if (!form.descripcion||!form.monto) return; dispatch({ type:'ADD_COSTO_DIRECTO', payload:form }) }
      if (tab===1) { if (!form.trabajador||!form.salario_base) return; dispatch({ type:'ADD_NOMINA', payload:form }) }
      if (tab===2) { if (!form.subcontratista||!form.monto_contrato) return; dispatch({ type:'ADD_SUBCONTRATO', payload:form }) }
      if (tab===3) { if (!form.descripcion||!form.costo_total) return; dispatch({ type:'ADD_EQUIPO', payload:form }) }
      if (tab===4) { if (!form.categoria||!form.monto) return; dispatch({ type:'ADD_COSTO_INDIRECTO', payload:form }) }
    }
    setDrawer(false)
    setEditId(null)
  }

  const calcCostoTotal = (tarifa, dias) => {
    const t2 = parseFloat(tarifa)||0
    const d  = parseFloat(dias)||0
    return t2>0&&d>0 ? t2*d : ''
  }

  const thCls = 'px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap'
  const tdCls = 'px-4 py-3 text-sm text-gray-700'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('fin_title')}</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1B3A6B]"
            value={proyId} onChange={e => setProyId(e.target.value)}>
            <option value="">{t('lbl_select')}</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          {proyId && !closed && puedeEditar && <PrimaryBtn onClick={openDrawer}>+ {TABS[tab]}</PrimaryBtn>}
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.financial} title={t('fin_select_project')} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label={t('fin_total_real')}   value={fmt(totalReal, moneda)} color="#1B3A6B" />
            <StatCard label={t('fin_materials')}    value={fmt(totalMat, moneda)}  sub={t('fin_materials_sub')} />
            <StatCard label={t('fin_payroll')}      value={fmt(totalNom, moneda)}  sub={t('fin_payroll_sub')} />
            <StatCard label={t('fin_subcontracts')} value={fmt(totalSub, moneda)}  sub={t('fin_subcontracts_sub')} />
          </div>

          {/* TABS */}
          <div className="flex border-b border-gray-200 mb-5 overflow-x-auto">
            {TABS.map((tab_label, i) => {
              const counts = [directs.length, noms.length, subs.length, eqs.length, inds.length]
              return (
                <button key={i} onClick={() => setTab(i)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap
                    ${tab===i ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab_label}
                  {counts[i] > 0 && <span className="ml-1.5 text-xs text-gray-400">({counts[i]})</span>}
                </button>
              )
            })}
          </div>

          {/* ── TAB 0: IMPREVISTOS ────────────────────────────────────── */}
          {tab === 0 && (
            directs.length === 0 ? (
              <EmptyState icon={Icons.financial}
                title={t('fin_empty_direct')}
                action={puedeEditar&&!closed ? `+ ${TABS[0]}` : null}
                onAction={puedeEditar&&!closed ? openDrawer : null} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {[t('fin_form_date'), t('fin_form_type'), t('fin_form_desc'), t('fin_form_activity'), t('fin_form_amount'), t('fin_form_doc'), puedeEditar?'':null]
                      .filter(h=>h!==null).map((h,i)=><th key={i} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {directs.map(c => {
                      const act = acts.find(a => a.id === c.actividad_id)
                      return (
                        <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className={tdCls+' text-xs text-gray-400'}>{c.fecha||c.created_at?.slice(0,10)}</td>
                          <td className={tdCls}><span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{c.tipo==='factura_obra'?(isEs?'Factura':'Invoice'):(isEs?'Caja chica':'Petty cash')}</span></td>
                          <td className={tdCls}>{c.descripcion||'—'}</td>
                          <td className={tdCls+' text-xs text-gray-400'}>{act?`${act.code} — ${act.descripcion}`:'—'}</td>
                          <td className={tdCls+' font-mono font-bold'} style={{color:'#1D9E75'}}>{fmt(c.monto,moneda)}</td>
                          <td className={tdCls+' text-xs text-gray-400'}>{c.numero_documento||'—'}</td>
                          {puedeEditar && <td className={tdCls}><div className="flex gap-1">
                            <TBtn onClick={()=>openEdit(c)}>{isEs?'Modificar':'Edit'}</TBtn>
                            <TBtn danger onClick={()=>del(c.id)}>{isEs?'Eliminar':'Delete'}</TBtn>
                          </div></td>}
                        </tr>
                      )
                    })}
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{t('lbl_total')}</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalDir,moneda)}</td>
                      <td/>{puedeEditar&&<td/>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── TAB 1: NÓMINA ─────────────────────────────────────────── */}
          {tab === 1 && (
            noms.length === 0 ? (
              <EmptyState icon={Icons.financial} title={t('fin_empty_payroll')}
                action={puedeEditar&&!closed ? `+ ${TABS[1]}` : null}
                onAction={puedeEditar&&!closed ? openDrawer : null} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {[t('fin_col_worker'), t('fin_col_position'),
                      isEs?'Período':'Period',
                      isEs?'Días trab.':'Days worked',
                      isEs?'Tipo pago':'Pay type',
                      isEs?'Tarifa':'Rate',
                      t('fin_col_base'), t('fin_col_deductions'), t('fin_col_net'),
                      puedeEditar?'':null].filter(h=>h!==null).map((h,i)=><th key={i} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {noms.map(n => {
                      const dias = n.periodo_inicio && n.periodo_fin
                        ? Math.round((new Date(n.periodo_fin)-new Date(n.periodo_inicio))/(1000*60*60*24))+1 : '—'
                      const neto = (parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0)
                      return (
                        <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className={tdCls+' font-medium'}>{n.trabajador}</td>
                          <td className={tdCls+' text-xs text-gray-500'}>{n.cargo||'—'}</td>
                          <td className={tdCls+' text-xs text-gray-400'}>{n.periodo_inicio} → {n.periodo_fin}</td>
                          <td className={tdCls+' text-center font-mono'}>{dias}</td>
                          <td className={tdCls}>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {n.tipo_pago==='hora'?(isEs?'Por hora':'Per hour'):(isEs?'Por día':'Per day')}
                            </span>
                          </td>
                          <td className={tdCls+' font-mono text-xs'}>{fmt(n.tarifa||0, moneda)}</td>
                          <td className={tdCls+' font-mono'}>{fmt(n.salario_base,moneda)}</td>
                          <td className={tdCls+' font-mono text-red-500'}>{fmt(n.deducciones||0,moneda)}</td>
                          <td className={tdCls+' font-mono font-bold'} style={{color:'#1D9E75'}}>{fmt(neto,moneda)}</td>
                          {puedeEditar && <td className={tdCls}><div className="flex gap-1">
                            <TBtn onClick={()=>openEdit(n)}>{isEs?'Modificar':'Edit'}</TBtn>
                            <TBtn danger onClick={()=>del(n.id)}>{isEs?'Eliminar':'Delete'}</TBtn>
                          </div></td>}
                        </tr>
                      )
                    })}
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{t('lbl_total')} {isEs?'neto':'net'}</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalNom,moneda)}</td>
                      {puedeEditar&&<td/>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── TAB 2: SUBCONTRATOS ───────────────────────────────────── */}
          {tab === 2 && (
            subs.length === 0 ? (
              <EmptyState icon={Icons.financial} title={t('fin_empty_subcontracts')}
                action={puedeEditar&&!closed ? `+ ${TABS[2]}` : null}
                onAction={puedeEditar&&!closed ? openDrawer : null} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {[t('fin_col_subcontractor'), t('fin_col_work'), t('fin_col_activity'),
                      t('fin_col_contract'), t('fin_col_paid'),
                      isEs?'% Avance':'% Progress',
                      puedeEditar?'':null].filter(h=>h!==null).map((h,i)=><th key={i} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {subs.map(s => {
                      const act  = acts.find(a => a.id === s.actividad_id)
                      const pct  = s.monto_contrato > 0
                        ? Math.min(100, ((parseFloat(s.monto_pagado)||0)/(parseFloat(s.monto_contrato)||1)*100)).toFixed(1)
                        : '0.0'
                      return (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className={tdCls+' font-medium'}>{s.subcontratista}</td>
                          <td className={tdCls+' text-xs text-gray-500 max-w-[160px] truncate'}>{s.descripcion_trabajo||'—'}</td>
                          <td className={tdCls+' text-xs text-gray-400'}>{act?`${act.code} — ${act.descripcion}`:'—'}</td>
                          <td className={tdCls+' font-mono'}>{fmt(s.monto_contrato,moneda)}</td>
                          <td className={tdCls+' font-mono font-bold'} style={{color:'#1D9E75'}}>{fmt(s.monto_pagado,moneda)}</td>
                          <td className={tdCls}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                                <div className="h-1.5 rounded-full" style={{width:`${pct}%`, background:'#1D9E75'}}/>
                              </div>
                              <span className="text-xs font-mono font-medium" style={{color:'#1D9E75'}}>{pct}%</span>
                            </div>
                          </td>
                          {puedeEditar && <td className={tdCls}><div className="flex gap-1">
                            <TBtn onClick={()=>openEdit(s)}>{isEs?'Modificar':'Edit'}</TBtn>
                            <TBtn danger onClick={()=>del(s.id)}>{isEs?'Eliminar':'Delete'}</TBtn>
                          </div></td>}
                        </tr>
                      )
                    })}
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{t('lbl_total')}</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalSub,moneda)}</td>
                      <td/>{puedeEditar&&<td/>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── TAB 3: EQUIPOS ────────────────────────────────────────── */}
          {tab === 3 && (
            eqs.length === 0 ? (
              <EmptyState icon={Icons.financial} title={t('fin_empty_equipment')}
                action={puedeEditar&&!closed ? `+ ${TABS[3]}` : null}
                onAction={puedeEditar&&!closed ? openDrawer : null} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {[t('fin_col_eq_desc'), t('fin_col_eq_type'), t('fin_col_eq_rate'), t('fin_col_eq_days'), t('fin_col_eq_total'), puedeEditar?'':null]
                      .filter(h=>h!==null).map((h,i)=><th key={i} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {eqs.map(e => (
                      <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className={tdCls}>{e.descripcion}</td>
                        <td className={tdCls}><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{e.tipo}</span></td>
                        <td className={tdCls+' font-mono'}>{fmt(e.tarifa_diaria,moneda)}</td>
                        <td className={tdCls+' font-mono text-center'}>{fmtNum(e.dias_uso)}</td>
                        <td className={tdCls+' font-mono font-bold'} style={{color:'#1D9E75'}}>{fmt(e.costo_total,moneda)}</td>
                        {puedeEditar && <td className={tdCls}><div className="flex gap-1">
                          <TBtn onClick={()=>openEdit(e)}>{isEs?'Modificar':'Edit'}</TBtn>
                          <TBtn danger onClick={()=>del(e.id)}>{isEs?'Eliminar':'Delete'}</TBtn>
                        </div></td>}
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{t('lbl_total')}</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalEq,moneda)}</td>
                      {puedeEditar&&<td/>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── TAB 4: ADMINISTRACIÓN ─────────────────────────────────── */}
          {tab === 4 && (
            inds.length === 0 ? (
              <EmptyState icon={Icons.financial}
                title={t('fin_empty_indirect')}
                action={puedeEditar&&!closed ? `+ ${TABS[4]}` : null}
                onAction={puedeEditar&&!closed ? openDrawer : null} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {[t('fin_form_date'),
                      isEs?'Categoría':'Category',
                      isEs?'Subcategoría':'Subcategory',
                      t('fin_form_desc'),
                      t('fin_form_amount'),
                      puedeEditar?'':null].filter(h=>h!==null).map((h,i)=><th key={i} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {inds.map(c => {
                      const catKey = CAT_KEYS.find(k =>
                        CATEGORIAS_IND[k].es === c.categoria || CATEGORIAS_IND[k].en === c.categoria || k === c.categoria
                      )
                      const catLabel = catKey ? (isEs ? CATEGORIAS_IND[catKey].es : CATEGORIAS_IND[catKey].en) : c.categoria
                      return (
                        <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className={tdCls+' text-xs text-gray-400'}>{c.fecha||c.created_at?.slice(0,10)}</td>
                          <td className={tdCls}><span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{catLabel}</span></td>
                          <td className={tdCls+' text-xs text-gray-500'}>{c.subcategoria||'—'}</td>
                          <td className={tdCls}>{c.descripcion||'—'}</td>
                          <td className={tdCls+' font-mono font-bold'} style={{color:'#1D9E75'}}>{fmt(c.monto,moneda)}</td>
                          {puedeEditar && <td className={tdCls}><div className="flex gap-1">
                            <TBtn onClick={()=>openEdit(c)}>{isEs?'Modificar':'Edit'}</TBtn>
                            <TBtn danger onClick={()=>del(c.id)}>{isEs?'Eliminar':'Delete'}</TBtn>
                          </div></td>}
                        </tr>
                      )
                    })}
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{t('lbl_total')}</td>
                      <td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalInd,moneda)}</td>
                      {puedeEditar&&<td/>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {/* ── DRAWER ────────────────────────────────────────────────────── */}
      {puedeEditar && (
        <Drawer open={drawer} onClose={() => { setDrawer(false); setEditId(null) }}
          title={editId
            ? (isEs ? `Modificar — ${TABS[tab]}` : `Edit — ${TABS[tab]}`)
            : `+ ${TABS[tab]}`}
          width={420}>

          {/* IMPREVISTOS */}
          {tab===0 && <>
            <Field label={t('fin_form_type')}>
              <select className={selectCls} value={form.tipo||'factura_obra'} onChange={set('tipo')}>
                <option value="factura_obra">{isEs?'Factura de obra':'Construction invoice'}</option>
                <option value="caja_chica">{isEs?'Caja chica':'Petty cash'}</option>
              </select>
            </Field>
            <Field label={t('fin_form_desc')} required>
              <input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')} placeholder={isEs?'Descripción del imprevisto':'Contingency description'} />
            </Field>
            <Field label={t('fin_form_activity')}>
              <select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
                <option value="">{t('lbl_select')}</option>
                {acts.map(a=><option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fin_form_amount')} required>
                <input type="number" className={inputCls} value={form.monto||''} onChange={set('monto')} placeholder="0.00" min="0" step="0.01"/>
              </Field>
              <Field label={t('fin_form_date')}>
                <input type="date" className={inputCls} value={form.fecha||today()} onChange={set('fecha')}/>
              </Field>
            </div>
            <Field label={t('fin_form_doc')}>
              <input className={inputCls} value={form.numero_documento||''} onChange={set('numero_documento')} placeholder="FAC-001"/>
            </Field>
          </>}

          {/* NÓMINA MEJORADA */}
          {tab===1 && <>
            <Field label={t('fin_form_worker')} required>
              <input className={inputCls} value={form.trabajador||''} onChange={set('trabajador')} placeholder={t('fin_form_worker')}/>
            </Field>
            <Field label={t('fin_form_position')}>
              <input className={inputCls} value={form.cargo||''} onChange={set('cargo')} placeholder={t('fin_form_position')}/>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fin_form_period_start')}>
                <input type="date" className={inputCls} value={form.periodo_inicio||today()}
                  onChange={e => {
                    const val = e.target.value
                    const dias = val && form.periodo_fin
                      ? Math.round((new Date(form.periodo_fin)-new Date(val))/(1000*60*60*24))+1 : 0
                    const base = calcSalarioBase(dias, form.tipo_pago, form.tarifa)
                    setForm(f => ({...f, periodo_inicio:val, salario_base: base||f.salario_base}))
                  }}/>
              </Field>
              <Field label={t('fin_form_period_end')}>
                <input type="date" className={inputCls} value={form.periodo_fin||today()}
                  onChange={e => {
                    const val = e.target.value
                    const dias = form.periodo_inicio && val
                      ? Math.round((new Date(val)-new Date(form.periodo_inicio))/(1000*60*60*24))+1 : 0
                    const base = calcSalarioBase(dias, form.tipo_pago, form.tarifa)
                    setForm(f => ({...f, periodo_fin:val, salario_base: base||f.salario_base}))
                  }}/>
              </Field>
            </div>

            {/* Días trabajados calculados */}
            {diasTrabajados > 0 && (
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm flex justify-between">
                <span className="text-blue-600">{isEs?'Días trabajados:':'Days worked:'}</span>
                <span className="font-bold text-blue-700">{diasTrabajados} {isEs?'días':'days'}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label={isEs?'Tipo de pago':'Pay type'}>
                <select className={selectCls} value={form.tipo_pago||'dia'}
                  onChange={e => {
                    const tipo = e.target.value
                    const base = calcSalarioBase(diasTrabajados, tipo, form.tarifa)
                    setForm(f => ({...f, tipo_pago:tipo, salario_base: base||f.salario_base}))
                  }}>
                  <option value="dia">{isEs?'Por día':'Per day'}</option>
                  <option value="hora">{isEs?'Por hora':'Per hour'}</option>
                </select>
              </Field>
              <Field label={isEs?`Tarifa (${form.tipo_pago==='hora'?'hora':'día'})`:  `Rate (${form.tipo_pago==='hora'?'hour':'day'})`}>
                <input type="number" className={inputCls} value={form.tarifa||''}
                  onChange={e => {
                    const tarifa = e.target.value
                    const base   = calcSalarioBase(diasTrabajados, form.tipo_pago, tarifa)
                    setForm(f => ({...f, tarifa, salario_base: base||f.salario_base}))
                  }}
                  placeholder="0.00" min="0" step="0.01"/>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fin_form_base')} required>
                <input type="number" className={inputCls} value={form.salario_base||''} onChange={set('salario_base')} placeholder="0.00" min="0" step="0.01"/>
                <p className="text-xs text-gray-400 mt-1">{isEs?'Calculado automáticamente':'Auto-calculated'}</p>
              </Field>
              <Field label={t('fin_form_deductions')}>
                <input type="number" className={inputCls} value={form.deducciones||''} onChange={set('deducciones')} placeholder="0.00" min="0" step="0.01"/>
              </Field>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm font-medium">
              <span className="text-gray-600">{t('fin_col_net')}:</span>
              <span style={{color:'#1D9E75'}}>{fmt((parseFloat(form.salario_base)||0)-(parseFloat(form.deducciones)||0), moneda)}</span>
            </div>
          </>}

          {/* SUBCONTRATOS */}
          {tab===2 && <>
            <Field label={t('fin_form_subcontractor')} required>
              <input className={inputCls} value={form.subcontratista||''} onChange={set('subcontratista')} placeholder={t('fin_form_subcontractor')}/>
            </Field>
            <Field label={t('fin_form_work_desc')}>
              <textarea className={inputCls} rows={2} value={form.descripcion_trabajo||''} onChange={set('descripcion_trabajo')}/>
            </Field>
            <Field label={t('fin_form_activity')}>
              <select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
                <option value="">{t('lbl_select')}</option>
                {acts.map(a=><option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fin_form_contract_amt')} required>
                <input type="number" className={inputCls} value={form.monto_contrato||''} onChange={set('monto_contrato')} placeholder="0.00" min="0" step="0.01"/>
              </Field>
              <Field label={t('fin_form_paid')}>
                <input type="number" className={inputCls} value={form.monto_pagado||''} onChange={set('monto_pagado')} placeholder="0.00" min="0" step="0.01"/>
              </Field>
            </div>
            {/* % calculado automáticamente */}
            {form.monto_contrato > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm font-medium">
                <span className="text-gray-600">{isEs?'% Avance calculado:':'Calculated progress:'}</span>
                <span style={{color:'#1D9E75'}}>
                  {Math.min(100,((parseFloat(form.monto_pagado)||0)/(parseFloat(form.monto_contrato)||1)*100)).toFixed(1)}%
                </span>
              </div>
            )}
          </>}

          {/* EQUIPOS */}
          {tab===3 && <>
            <Field label={t('fin_form_eq_desc')} required>
              <input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')} placeholder={t('fin_form_eq_desc')}/>
            </Field>
            <Field label={t('fin_form_eq_type')}>
              <select className={selectCls} value={form.tipo||'alquiler'} onChange={set('tipo')}>
                <option value="alquiler">{t('fin_eq_rental')}</option>
                <option value="propio">{t('fin_eq_owned')}</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fin_form_eq_rate')}>
                <input type="number" className={inputCls} value={form.tarifa_diaria||''}
                  onChange={e => { const tarifa=e.target.value; setForm(f=>({...f, tarifa_diaria:tarifa, costo_total:calcCostoTotal(tarifa,f.dias_uso)})) }}
                  placeholder="0.00" min="0" step="0.01"/>
              </Field>
              <Field label={t('fin_form_eq_days')}>
                <input type="number" className={inputCls} value={form.dias_uso||''}
                  onChange={e => { const dias=e.target.value; setForm(f=>({...f, dias_uso:dias, costo_total:calcCostoTotal(f.tarifa_diaria,dias)})) }}
                  placeholder="0" min="0"/>
              </Field>
            </div>
            <Field label={t('fin_form_eq_total')} required>
              <input type="number" className={inputCls} value={form.costo_total||''} onChange={set('costo_total')} placeholder="0.00" min="0" step="0.01"/>
            </Field>
          </>}

          {/* ADMINISTRACIÓN con categorías y subcategorías */}
          {tab===4 && <>
            <Field label={isEs?'Categoría':'Category'} required>
              <select className={selectCls} value={form.categoria||''}
                onChange={e => setForm(f => ({...f, categoria:e.target.value, subcategoria:''}))}>
                <option value="">{isEs?'— Seleccionar categoría —':'— Select category —'}</option>
                {CAT_KEYS.map(k => (
                  <option key={k} value={k}>{isEs ? CATEGORIAS_IND[k].es : CATEGORIAS_IND[k].en}</option>
                ))}
              </select>
            </Field>

            {subcats.length > 0 && (
              <Field label={isEs?'Subcategoría':'Subcategory'}>
                <select className={selectCls} value={form.subcategoria||''} onChange={set('subcategoria')}>
                  <option value="">{isEs?'— Seleccionar subcategoría —':'— Select subcategory —'}</option>
                  {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}

            <Field label={t('fin_form_desc')}>
              <input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')}
                placeholder={isEs?'Descripción adicional (opcional)':'Additional description (optional)'}/>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fin_form_amount')} required>
                <input type="number" className={inputCls} value={form.monto||''} onChange={set('monto')} placeholder="0.00" min="0" step="0.01"/>
              </Field>
              <Field label={t('fin_form_date')}>
                <input type="date" className={inputCls} value={form.fecha||today()} onChange={set('fecha')}/>
              </Field>
            </div>
          </>}

          <div className="flex gap-2 mt-auto pt-2">
            <SecondaryBtn onClick={() => { setDrawer(false); setEditId(null) }} className="flex-1">{t('btn_cancel')}</SecondaryBtn>
            <PrimaryBtn onClick={save} className="flex-1">{t('btn_save')}</PrimaryBtn>
          </div>
        </Drawer>
      )}
    </div>
  )
}
