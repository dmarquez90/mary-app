import { useState, useContext, useMemo, useEffect } from 'react'
import { useStore } from '../store'
import { supabase } from '../supabase'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { today, fmt, fmtNum, r2 } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, StatCard, Icons, inputCls, selectCls } from '../components'
import { buildOPR } from '../pages/Reportes'

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
  const { can, rol }            = usePermissions()
  const isEs                    = lang === 'ES'

  const { proyectos, presupuesto, costos_directos, nominas, subcontratos,
    equipos, costos_indirectos, salidas, entradas,
    presupuesto_indirectos = [] } = state

  const [tab, setTab]       = useState(0)
  const [proyId, setProyId] = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer] = useState(false)
  const [form, setForm]     = useState({})
  const [editId, setEditId] = useState(null)

  // Subcontratos module state
  const [scView, setScView]       = useState('list')   // 'list' | 'detail' | 'avaluo'
  const [scSelected, setScSelected] = useState(null)   // subcontrato activo
  const [scAvaluoId, setScAvaluoId] = useState(null)   // avaluo en edicion
  const [scItems, setScItems]     = useState([])        // items del contrato (crear)
  const [avItems, setAvItems]     = useState([])        // items del avaluo
  const [scForm, setScForm]       = useState({})
  const [avForm, setAvForm]       = useState({})
  const setScF  = k => e => setScForm(f => ({ ...f, [k]: e.target.value }))
  const setAvF  = k => e => setAvForm(f => ({ ...f, [k]: e.target.value }))

  // Load subcontratos data from store
  const { subcontratos_contratos = [], subcontratos_items = [],
          subcontratos_avaluos = [], subcontratos_avaluo_items = [] } = state

  const fmt2 = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n||0)

  const puedeEditar = can('financiero_editar')
  const [currentUserId, setCurrentUserId] = useState(null)
  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (user) setCurrentUserId(user.id) }) }, [])
  const set         = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Tabs: Imprevistos | Nómina | Subcontratos | Equipos | Administración
  const TABS = [
    t('rep_cat_imprevistos'),
    t('fin_tab_payroll'),
    t('fin_tab_subcontracts'),
    t('fin_tab_equipment'),
    t('rep_cat_admin'),
  ]

  const proy   = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const acts   = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'actividad')
  const closed = proy?.estado === 'completado' || proy?.estado === 'cancelado'

  const directs = costos_directos.filter(c => c.proyecto_id === proyId && c.tipo !== 'subcontrato')
  const noms    = nominas.filter(n => n.proyecto_id === proyId)
  const subs    = subcontratos.filter(s => s.proyecto_id === proyId)
  const eqs     = equipos.filter(e => e.proyecto_id === proyId)
  const inds    = costos_indirectos.filter(c => c.proyecto_id === proyId)

  const totalDir = directs.reduce((s,c) => s+(parseFloat(c.monto)||0), 0)
  const totalNom = noms.reduce((s,n) => s+(parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0), 0)
  // totalSub: suma de avalúos APROBADOS del nuevo sistema de subcontratos
  const scContratosDelProy = subcontratos_contratos.filter(sc => sc.proyecto_id === proyId)
  const scContratosIds     = scContratosDelProy.map(sc => sc.id)
  const totalSub = subcontratos_avaluos
    .filter(a => scContratosIds.includes(a.subcontrato_id) && a.estado === 'aprobado')
    .reduce((s,a) => s + (parseFloat(a.monto_total)||0), 0)
    // Fallback: si no hay nuevo sistema, usar el campo monto_pagado del sistema anterior
    + subs.reduce((s,sc) => s+(parseFloat(sc.monto_pagado)||0), 0)
  const totalEq  = eqs.reduce((s,e) => s+(parseFloat(e.costo_total)||0), 0)
  const totalInd = inds.reduce((s,c) => s+(parseFloat(c.monto)||0), 0)

  const indsPresDelProy = presupuesto_indirectos.filter(p => p.proyecto_id === proyId)
  const comparacionIndirectos = CAT_KEYS.map(catKey => {
    const cat           = CATEGORIAS_IND[catKey]
    const pres          = indsPresDelProy.find(p => p.categoria === catKey)
    const presupuestado = parseFloat(pres?.monto_presupuestado || 0)
    const ejecutado     = inds
      .filter(c => {
        const ck = CAT_KEYS.find(k =>
          CATEGORIAS_IND[k].es === c.categoria || CATEGORIAS_IND[k].en === c.categoria || k === c.categoria
        )
        return ck === catKey
      })
      .reduce((s, c) => s + parseFloat(c.monto || 0), 0)
    const diferencia = presupuestado - ejecutado
    return { catKey, label: isEs ? cat.es : cat.en, presupuestado, ejecutado, diferencia }
  }).filter(r => r.presupuestado > 0 || r.ejecutado > 0)
  const totalIndPres = indsPresDelProy.reduce((s, p) => s + parseFloat(p.monto_presupuestado || 0), 0)
  const totalMat = salidas.filter(s=>s.proyecto_id===proyId).reduce((s,sa) => {
    const idx = entradas.find(e=>e.material_id===sa.material_id)
    return s+r2((parseFloat(sa.cantidad)||0)*(parseFloat(idx?.precio_unitario)||0))
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
    if (!window.confirm(t('fin_delete_confirm'))) return
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
          {proyId && !closed && puedeEditar && tab !== 2 && <PrimaryBtn onClick={openDrawer}>+ {TABS[tab]}</PrimaryBtn>}
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
          {tab === 2 && <SubcontratosModule
            proyId={proyId} moneda={moneda} puedeEditar={puedeEditar} closed={closed}
            presupuesto={presupuesto} isEs={isEs}
            proyectos={proyectos}
            scView={scView} setScView={setScView}
            scSelected={scSelected} setScSelected={setScSelected}
            scAvaluoId={scAvaluoId} setScAvaluoId={setScAvaluoId}
            scItems={scItems} setScItems={setScItems}
            avItems={avItems} setAvItems={setAvItems}
            scForm={scForm} setScForm={setScForm} setScF={setScF}
            avForm={avForm} setAvForm={setAvForm} setAvF={setAvF}
            subcontratos_contratos={subcontratos_contratos}
            subcontratos_items={subcontratos_items}
            subcontratos_avaluos={subcontratos_avaluos}
            subcontratos_avaluo_items={subcontratos_avaluo_items}
            subcontratos_retenciones={state.subcontratos_retenciones||[]}
            ordenes_pago_retencion={state.ordenes_pago_retencion||[]}
            dispatch={dispatch} fmt2={fmt2} fmt={fmt}
            can={can} rol={rol} currentUserId={currentUserId}
            t={t}
          />}

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
            <>
              {comparacionIndirectos.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">{t('fin_budgeted_vs_executed')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-gray-100">
                        {[isEs?'Categoría':'Category', isEs?'Presupuestado':'Budgeted', isEs?'Ejecutado':'Executed', isEs?'Diferencia':'Difference', isEs?'Estado':'Status'].map((h,i) => (
                          <th key={i} className={thCls}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {comparacionIndirectos.map(r => {
                          const pct    = r.presupuestado > 0 ? (r.ejecutado / r.presupuestado) * 100 : 0
                          const status = r.diferencia < 0 ? 'sobrecosto' : r.diferencia === 0 ? 'justo' : 'ahorro'
                          return (
                            <tr key={r.catKey} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className={tdCls}>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.label}</span>
                              </td>
                              <td className={tdCls + ' font-mono'}>{fmt(r.presupuestado, moneda)}</td>
                              <td className={tdCls + ' font-mono'}>{fmt(r.ejecutado, moneda)}</td>
                              <td className={tdCls + ' font-mono font-bold'} style={{color: status==='sobrecosto' ? '#ef4444' : '#1D9E75'}}>
                                {r.diferencia >= 0 ? '+' : ''}{fmt(r.diferencia, moneda)}
                              </td>
                              <td className={tdCls}>
                                <div className="flex flex-col gap-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${
                                    status === 'ahorro'     ? 'bg-green-100 text-green-700' :
                                    status === 'sobrecosto' ? 'bg-red-100 text-red-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {status === 'ahorro' ? (t('fin_saving')) : status === 'sobrecosto' ? (t('fin_overrun')) : (t('fin_on_budget'))}
                                  </span>
                                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{
                                      width: `${Math.min(100, pct)}%`,
                                      background: pct > 100 ? '#ef4444' : pct > 80 ? '#e0982c' : '#1D9E75'
                                    }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bg-gray-50">
                          <td className={tdCls + ' font-semibold text-gray-600'}>{t('fin_row_total')}</td>
                          <td className={tdCls + ' font-mono font-bold'} style={{color:'#1B3A6B'}}>{fmt(totalIndPres, moneda)}</td>
                          <td className={tdCls + ' font-mono font-bold'} style={{color:'#1B3A6B'}}>{fmt(totalInd, moneda)}</td>
                          <td className={tdCls + ' font-mono font-bold'} style={{color: totalIndPres - totalInd < 0 ? '#ef4444' : '#1D9E75'}}>
                            {totalIndPres - totalInd >= 0 ? '+' : ''}{fmt(totalIndPres - totalInd, moneda)}
                          </td>
                          <td/>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {inds.length === 0 ? (
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
              )}
            </>
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

          {/* SUBCONTRATOS — handled by SubcontratosModule */}

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

// ── SUBCONTRATOS MODULE ──────────────────────────────────────────────────────
function SubcontratosModule({ can, rol,
  proyId, moneda, puedeEditar, closed, presupuesto, proyectos, isEs,
  scView, setScView, scSelected, setScSelected,
  scAvaluoId, setScAvaluoId,
  scItems, setScItems, avItems, setAvItems,
  scForm, setScForm, setScF, avForm, setAvForm, setAvF,
  subcontratos_contratos, subcontratos_items,
  subcontratos_avaluos, subcontratos_avaluo_items,
  subcontratos_retenciones,
  ordenes_pago_retencion = [],
  dispatch, fmt2, fmt, t,
  currentUserId,
}) {
  const BRAND = '#1B3A6B'
  const puedeRechazar = ['super_admin','client_admin','gerente'].includes(rol)
  const acts  = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'actividad')
  const contratosProy = subcontratos_contratos.filter(sc => sc.proyecto_id === proyId)

  const thCls = 'px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap font-medium'
  const tdCls = 'px-4 py-3 text-sm text-gray-700'

  // ── Helpers ──
  const scSubtotal = scItems.reduce((s,it) =>
    s + r2(parseFloat(it.cantidad_contrato||0) * parseFloat(it.costo_unitario||0)), 0)
  const scImpPct   = parseFloat(scForm.impuesto_pct||0)
  const scImpMonto = r2(scSubtotal * (scImpPct/100))
  const scTotal    = r2(scSubtotal + scImpMonto)

  const setScItem = (idx, k, v) =>
    setScItems(items => items.map((it,i) => i===idx ? {...it,[k]:v} : it))

  // Para el avalúo activo
  const avaluosPrevios = scSelected
    ? subcontratos_avaluos.filter(a =>
        a.subcontrato_id === scSelected.id && a.estado === 'aprobado')
    : []

  // Calcular cantidad anterior para cada item
  const getCantAnterior = (itemId) =>
    avaluosPrevios.reduce((s, av) => {
      const avItem = subcontratos_avaluo_items.find(
        i => i.avaluo_id === av.id && i.subcontrato_item_id === itemId)
      return s + parseFloat(avItem?.cantidad_actual||0)
    }, 0)

  const avSubtotal    = avItems.reduce((s,it) => {
    const scIt = subcontratos_items.find(x => x.id === it.subcontrato_item_id)
    return s + r2(parseFloat(it.cantidad_actual||0) * parseFloat(scIt?.costo_unitario||0))
  }, 0)
  const avImpMonto    = r2(avSubtotal * (parseFloat(scSelected?.impuesto_pct||0)/100))
  const avTotal       = r2(avSubtotal + avImpMonto)
  // Retención: porcentaje definido en el contrato, aplicado sobre el total del avalúo
  const avRetencionPct   = parseFloat(scSelected?.retencion_pct ?? 0)
  const avRetencionMonto = r2(avTotal * (avRetencionPct / 100))
  const avMontoAPagar    = r2(avTotal - avRetencionMonto)

  const numAvaluo = scSelected
    ? subcontratos_avaluos.filter(a => a.subcontrato_id === scSelected.id).length + 1
    : 1

  // ── Guardar contrato ──
  const saveContrato = () => {
    if (!scForm.subcontratista || scItems.length === 0) return
    dispatch({
      type: 'ADD_SC_CONTRATO',
      payload: {
        contrato: {
          proyecto_id:          proyId,
          subcontratista:       scForm.subcontratista,
          descripcion:          scForm.descripcion || '',
          fecha_contrato:       scForm.fecha_contrato || null,
          fecha_inicio:         scForm.fecha_inicio || null,
          fecha_fin:            scForm.fecha_fin || null,
          moneda,
          impuesto_pct:         parseFloat(scForm.impuesto_pct||0),
          subtotal:             scSubtotal,
          impuesto_monto:       scImpMonto,
          monto_total:          scTotal,
          monto_pagado:         0,
          avance_pct:           0,
          estado:               'activo',
          notas:                scForm.notas || '',
          retencion_pct:        parseFloat(scForm.retencion_pct ?? 10),
          plazo_garantia_meses: parseInt(scForm.plazo_garantia_meses ?? 6),
        },
        items: scItems.map(it => ({
          actividad_id:      it.actividad_id || null,
          descripcion:       it.descripcion,
          unidad:            it.unidad || 'und',
          cantidad_contrato: parseFloat(it.cantidad_contrato||0),
          costo_unitario:    parseFloat(it.costo_unitario||0),
          costo_total:       r2(parseFloat(it.cantidad_contrato||0) * parseFloat(it.costo_unitario||0)),
        }))
      }
    })
    setScView('list')
    setScForm({})
    setScItems([])
  }

  // ── Guardar avalúo ──
  const saveAvaluo = () => {
    if (!scSelected) return
    const avaluo = {
      subcontrato_id:    scSelected.id,
      numero:            numAvaluo,
      periodo_inicio:    avForm.periodo_inicio || null,
      periodo_fin:       avForm.periodo_fin || null,
      fecha_elaboracion: avForm.fecha_elaboracion || new Date().toISOString().split('T')[0],
      subtotal:          avSubtotal,
      impuesto_monto:    avImpMonto,
      monto_total:       avTotal,
      retencion_pct:     avRetencionPct,
      retencion_monto:   avRetencionMonto,
      monto_a_pagar:     avMontoAPagar,
      estado:            'borrador',
      notas:             avForm.notas || '',
    }
    const items = avItems.map(it => {
      const scIt = subcontratos_items.find(x => x.id === it.subcontrato_item_id)
      return {
        subcontrato_item_id: it.subcontrato_item_id,
        cantidad_anterior:   getCantAnterior(it.subcontrato_item_id),
        cantidad_actual:     parseFloat(it.cantidad_actual||0),
        cantidad_acumulada:  getCantAnterior(it.subcontrato_item_id) + parseFloat(it.cantidad_actual||0),
        costo_unitario:      parseFloat(scIt?.costo_unitario||0),
        monto_actual:        r2(parseFloat(it.cantidad_actual||0) * parseFloat(scIt?.costo_unitario||0)),
      }
    })
    if (avForm._editId) {
      dispatch({ type: 'UPD_SC_AVALUO', payload: { avaluo: { ...avaluo, id: avForm._editId }, items } })
    } else {
      dispatch({ type: 'ADD_SC_AVALUO', payload: { avaluo, items, contrato: scSelected } })
    }
    setScView('detail')
    setAvForm({})
    setAvItems([])
  }

  // ── Aprobar avalúo ──
  const aprobarAvaluo = (av) => {
    dispatch({ type: 'APROBAR_SC_AVALUO', payload: { avaluo: av, contrato: scSelected, creador_id: av.created_by || currentUserId } })
  }

  const rechazarAvaluo = (av) => {
    if (!window.confirm(isEs ? '¿Rechazar este avalúo? El subcontratista será notificado.' : 'Reject this valuation? The subcontractor will be notified.')) return
    dispatch({ type: 'RECHAZAR_SC_AVALUO', payload: { avaluo: av, contrato: scSelected, creador_id: av.created_by || currentUserId } })
  }

  const eliminarAvaluoAprobado = (av) => {
    if (!window.confirm(isEs ? '¿Eliminar este avalúo aprobado? Se revertirá el costo directo asociado.' : 'Delete this approved valuation? The associated direct cost will be reversed.')) return
    dispatch({ type: 'ELIMINAR_SC_AVALUO_APROBADO', payload: { avaluo: av, contrato: scSelected } })
  }

  const editarAvaluo = (av) => {
    const itemsContrato = subcontratos_items.filter(i => i.subcontrato_id === scSelected.id)
    setAvForm({
      periodo_inicio:    av.periodo_inicio || '',
      periodo_fin:       av.periodo_fin    || '',
      fecha_elaboracion: av.fecha_elaboracion || new Date().toISOString().split('T')[0],
      notas:             av.notas || '',
      _editId:           av.id,
      _editAvaluoNum:    av.numero,
    })
    setAvItems(itemsContrato.map(it => {
      const avItem = subcontratos_avaluo_items.find(x => x.avaluo_id === av.id && x.subcontrato_item_id === it.id)
      const cantAnt = subcontratos_avaluos
        .filter(a => a.subcontrato_id === scSelected.id && a.estado === 'aprobado' && a.numero < av.numero)
        .reduce((s, a) => {
          const ai = subcontratos_avaluo_items.find(x => x.avaluo_id === a.id && x.subcontrato_item_id === it.id)
          return s + parseFloat(ai?.cantidad_actual || 0)
        }, 0)
      return {
        subcontrato_item_id: it.id,
        descripcion:         it.descripcion || '',
        unidad:              it.unidad || 'und',
        cantidad_contrato:   parseFloat(it.cantidad_contrato || 0),
        costo_unitario:      parseFloat(it.costo_unitario || 0),
        cantidad_acumulada:  cantAnt,
        cantidad_actual:     avItem ? String(avItem.cantidad_actual) : '',
      }
    }))
    setScAvaluoId(av.id)
    setScView('avaluo')
  }

  // ── VISTA: LISTA DE CONTRATOS ──
  if (scView === 'list') return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {contratosProy.length} {t('fin_subcontracts_count', { n: '' }).replace(' ', '')}
        </p>
        {puedeEditar && !closed && (
          <button onClick={() => { setScForm({ impuesto_pct: '0' }); setScItems([]); setScView('nuevo') }}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white"
            style={{ background: BRAND }}>
            {t('fin_new_subcontract')}
          </button>
        )}
      </div>

      {contratosProy.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">{t('fin_empty_subcontracts')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {[
                t('fin_sc_col_subcontractor'),
                t('fin_sc_col_desc'),
                t('fin_sc_col_contract'),
                t('fin_sc_col_paid'),
                t('fin_sc_col_progress'),
                t('fin_sc_col_status'),
                '',
              ].map((h,i) => <th key={i} className={thCls}>{h}</th>)}
            </tr></thead>
            <tbody>
              {contratosProy.map(sc => {
                const avaluos = subcontratos_avaluos.filter(a => a.subcontrato_id === sc.id)
                const pagado  = avaluos.filter(a => a.estado === 'aprobado')
                  .reduce((s,a) => s + parseFloat(a.monto_total||0), 0)
                const pct = sc.monto_total > 0
                  ? Math.min(100, (pagado / parseFloat(sc.monto_total)) * 100).toFixed(1)
                  : '0.0'
                return (
                  <tr key={sc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className={tdCls + ' font-medium'}>{sc.subcontratista}</td>
                    <td className={tdCls + ' text-xs text-gray-500 max-w-[180px] truncate'}>{sc.descripcion || '—'}</td>
                    <td className={tdCls + ' font-mono'}>{fmt(sc.monto_total, moneda)}</td>
                    <td className={tdCls + ' font-mono font-bold'} style={{ color: '#1D9E75' }}>{fmt(pagado, moneda)}</td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: '#1D9E75' }} />
                        </div>
                        <span className="text-xs font-mono font-medium" style={{ color: '#1D9E75' }}>{pct}%</span>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        sc.estado === 'activo' ? 'bg-green-100 text-green-700' :
                        sc.estado === 'completado' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'}`}>
                        {sc.estado === 'activo' ? t('fin_sc_status_active') :
                         sc.estado === 'completado' ? t('fin_sc_status_completed') :
                         sc.estado}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <div className="flex gap-1">
                        <button onClick={() => { setScSelected(sc); setScView('detail') }}
                          className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">
                          {t('btn_view')}
                        </button>
                        {puedeEditar && (
                          <button onClick={() => dispatch({ type: 'DEL_SC_CONTRATO', payload: sc.id })}
                            className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">
                            {t('btn_delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // ── VISTA: NUEVO CONTRATO ──
  if (scView === 'nuevo') return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setScView('list')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h2 className="text-base font-semibold text-gray-800">{t('fin_sc_form_title')}</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        {/* Datos generales */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_sc_form_contractor')}</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] bg-[#F2F2F2]"
              value={scForm.subcontratista||''} onChange={setScF('subcontratista')} placeholder={t('fin_sc_form_contractor_ph')} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_sc_form_tax')}</label>
            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] bg-[#F2F2F2]"
              value={scForm.impuesto_pct||''} onChange={setScF('impuesto_pct')} placeholder="0" min="0" max="100" step="0.01" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_sc_col_desc')}</label>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] bg-[#F2F2F2]"
            rows={2} value={scForm.descripcion||''} onChange={setScF('descripcion')} />
        </div>

        {/* Retención de garantía */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <div>
            <label className="text-xs font-medium text-amber-700 block mb-1">
              {t('fin_sc_form_retention')}
            </label>
            <input type="number" className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
              value={scForm.retencion_pct ?? 10} onChange={setScF('retencion_pct')}
              placeholder="10" min="0" max="50" step="0.5" />
            <p className="text-xs text-amber-600 mt-1">{t('fin_sc_form_retention_hint')}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-amber-700 block mb-1">
              {t('fin_sc_form_warranty')}
            </label>
            <input type="number" className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
              value={scForm.plazo_garantia_meses ?? 6} onChange={setScF('plazo_garantia_meses')}
              placeholder="6" min="1" max="60" step="1" />
            <p className="text-xs text-amber-600 mt-1">{t('fin_sc_form_warranty_hint')}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_sc_form_contract_date')}</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] bg-[#F2F2F2]"
              value={scForm.fecha_contrato||''} onChange={setScF('fecha_contrato')} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_sc_form_start_date')}</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] bg-[#F2F2F2]"
              value={scForm.fecha_inicio||''} onChange={setScF('fecha_inicio')} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_sc_form_end_date')}</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B] bg-[#F2F2F2]"
              value={scForm.fecha_fin||''} onChange={setScF('fecha_fin')} />
          </div>
        </div>

        {/* Ítems del contrato */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('fin_sc_form_activities')}
            </p>
            <button onClick={() => setScItems(i => [...i, { actividad_id:'', descripcion:'', unidad:'und', cantidad_contrato:'', costo_unitario:'' }])}
              className="text-xs font-medium px-3 py-1 rounded-lg"
              style={{ color: BRAND, background: '#EEF2F7' }}>
              {t('fin_sc_form_add')}
            </button>
          </div>

          {scItems.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              {t('fin_sc_form_no_activities')}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {scItems.map((it, idx) => {
              const subtotalIt = r2(parseFloat(it.cantidad_contrato||0) * parseFloat(it.costo_unitario||0))
              return (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-400">#{idx+1}</span>
                    <button onClick={() => setScItems(i => i.filter((_,j) => j!==idx))}
                      className="text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-400 block mb-1">{t('fin_sc_form_budget_activity')}</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1B3A6B]"
                      value={it.actividad_id||''} onChange={e => {
                        const act = acts.find(a => a.id === e.target.value)
                        setScItem(idx, 'actividad_id', e.target.value)
                        if (act) { setScItem(idx, 'descripcion', act.descripcion); setScItem(idx, 'unidad', act.unidad || 'und'); setScItem(idx, 'cantidad_contrato', act.cantidad ? String(act.cantidad) : '') }
                      }}>
                      <option value="">— {t('fin_sc_form_select_optional').replace(' —', '')} —</option>
                      {acts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-400 block mb-1">{t('fin_sc_form_act_desc')}</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F2F2F2] focus:outline-none focus:border-[#1B3A6B]"
                      value={it.descripcion||''} onChange={e => setScItem(idx,'descripcion',e.target.value)}
                      placeholder={t('fin_sc_form_act_desc_ph')} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">{t('fin_sc_form_act_unit')}</label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F2F2F2] focus:outline-none focus:border-[#1B3A6B]"
                        value={it.unidad||'und'} onChange={e => setScItem(idx,'unidad',e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">{t('fin_sc_form_act_qty')}</label>
                      <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F2F2F2] focus:outline-none focus:border-[#1B3A6B]"
                        value={it.cantidad_contrato||''} onChange={e => setScItem(idx,'cantidad_contrato',e.target.value)} placeholder="0" min="0" step="0.01" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">{t('fin_sc_form_act_unit_cost')}</label>
                      <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F2F2F2] focus:outline-none focus:border-[#1B3A6B]"
                        value={it.costo_unitario||''} onChange={e => setScItem(idx,'costo_unitario',e.target.value)} placeholder="0.00" min="0" step="0.01" />
                    </div>
                  </div>
                  {subtotalIt > 0 && (
                    <div className="mt-2 text-right text-xs font-mono text-gray-500">
                      Subtotal: <span className="font-bold text-gray-700">{fmt2(subtotalIt)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Totales */}
        {scItems.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            {[
              [t('fin_sc_form_subtotal'), fmt2(scSubtotal)],
              [t('fin_sc_form_tax_row', { pct: scImpPct }), fmt2(scImpMonto)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm py-1">
                <span className="text-gray-500">{label}</span>
                <span className="font-mono text-gray-700">{val}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
              <span>{t('fin_sc_form_grand_total')}</span>
              <span style={{ color: BRAND }}>{fmt2(scTotal)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={() => setScView('list')}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            {t('btn_cancel')}
          </button>
          <button onClick={saveContrato}
            disabled={!scForm.subcontratista || scItems.length === 0}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40"
            style={{ background: BRAND }}>
            {t('fin_sc_form_save')}
          </button>
        </div>
      </div>
    </div>
  )

  // ── VISTA: DETALLE DEL CONTRATO + AVALÚOS ──
  if (scView === 'detail' && scSelected) {
    const itemsContrato = subcontratos_items.filter(i => i.subcontrato_id === scSelected.id)
    const avaluosSc     = subcontratos_avaluos.filter(a => a.subcontrato_id === scSelected.id)
      .sort((a,b) => a.numero - b.numero)
    const totalPagado   = avaluosSc.filter(a => a.estado === 'aprobado')
      .reduce((s,a) => s + parseFloat(a.monto_total||0), 0)

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => { setScView('list'); setScSelected(null) }}
            className="text-gray-400 hover:text-gray-600 text-lg">←</button>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-800">{scSelected.subcontratista}</h2>
            {scSelected.descripcion && <p className="text-xs text-gray-400">{scSelected.descripcion}</p>}
          </div>
          {puedeEditar && !closed && (
            <button onClick={() => {
              setAvForm({
                periodo_inicio: '',
                periodo_fin: '',
                fecha_elaboracion: new Date().toISOString().split('T')[0],
              })
              setAvItems(itemsContrato.map(it => {
                const acumuladoPrevio = subcontratos_avaluos
                  .filter(a => a.subcontrato_id === scSelected.id && a.estado === 'aprobado')
                  .reduce((s, a) => {
                    const avi = subcontratos_avaluo_items.find(
                      x => x.avaluo_id === a.id && x.subcontrato_item_id === it.id
                    )
                    return s + parseFloat(avi?.cantidad_actual || 0)
                  }, 0)
                return {
                  subcontrato_item_id: it.id,
                  descripcion:         it.descripcion       || '',
                  unidad:              it.unidad             || 'und',
                  cantidad_contrato:   parseFloat(it.cantidad_contrato || 0),
                  costo_unitario:      parseFloat(it.costo_unitario    || 0),
                  cantidad_acumulada:  acumuladoPrevio,
                  cantidad_actual:     '',
                }
              }))
              setScView('avaluo')
            }}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white"
              style={{ background: BRAND }}>
              {t('fin_sc_new_valuation')}
            </button>
          )}
        </div>

        {/* Resumen financiero */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            [t('fin_sc_col_contract'), fmt(scSelected.monto_total, moneda), '#1B3A6B'],
            [t('fin_sc_valued'), fmt(totalPagado, moneda), '#1D9E75'],
            [t('fin_sc_balance'), fmt(parseFloat(scSelected.monto_total||0) - totalPagado, moneda), '#D97706'],
          ].map(([label, val, color]) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-xl font-bold font-mono" style={{ color }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Panel de retenciones */}
        {(() => {
          const retencionTotal = avaluosSc
            .filter(a => a.estado === 'aprobado' && (a.retencion_monto||0) > 0)
            .reduce((s,a) => s + parseFloat(a.retencion_monto||0), 0)
          const retenciones = (subcontratos_retenciones||[])
            .filter(r => r.subcontrato_id === scSelected.id)
          const retencionDevuelta = retenciones
            .filter(r => r.estado === 'devuelta' || r.estado === 'pagada')
            .reduce((s,r) => s + parseFloat(r.monto_retenido||0), 0)
          const retencionPendiente = retencionTotal - retencionDevuelta
          // Retenciones liberadas sin orden de pago — candidatas para generar OPR
          const sinOrden = retenciones.filter(r =>
            (r.estado === 'devuelta') && !r.orden_pago_id)
          const totalSinOrden = sinOrden.reduce((s,r) => s + parseFloat(r.monto_retenido||0), 0)
          // Órdenes de pago de este subcontrato
          const ordenes = (ordenes_pago_retencion||[]).filter(o => o.subcontrato_id === scSelected.id)
          if (retencionTotal === 0) return null
          return (
            <div className="mb-5 p-4 bg-amber-50 rounded-xl border border-amber-100">
              {/* Header con botón Generar OPR */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  {t('fin_sc_retention_title')}
                </p>
                {sinOrden.length > 0 && puedeEditar && (
                  <button
                    onClick={() => {
                      const msg = (isEs
                        ? `Generar Orden de Pago por ${sinOrden.length} retención(es) liberada(s) de ${scSelected.subcontratista}?
Total: `
                        : `Generate Payment Order for ${sinOrden.length} released retention(s) of ${scSelected.subcontratista}?
Total: `)
                        + fmt(totalSinOrden, moneda)
                      if (!window.confirm(msg)) return
                      dispatch({
                        type: 'EMITIR_ORDEN_PAGO_RETENCION',
                        payload: {
                          subcontrato:  scSelected,
                          retenciones:  sinOrden,
                          proyecto_id:  proyId,
                          notas: '',
                        }
                      })
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5"
                    style={{ background: '#1B3A6B' }}>
                    📄 {t('fin_sc_emit_order_btn')} ({fmt(totalSinOrden, moneda)})
                  </button>
                )}
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-xs text-amber-600">{t('fin_sc_retained')}</p>
                  <p className="text-base font-bold font-mono text-amber-700">{fmt(retencionTotal, moneda)}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">{t('fin_sc_released')}</p>
                  <p className="text-base font-bold font-mono text-green-600">{fmt(retencionDevuelta, moneda)}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-600">{t('fin_sc_pending_release')}</p>
                  <p className="text-base font-bold font-mono text-amber-700">{fmt(retencionPendiente, moneda)}</p>
                </div>
              </div>

              {/* Tabla de retenciones por avalúo */}
              <table className="w-full text-xs mb-3">
                <thead><tr className="border-b border-amber-200">
                  {['Avalúo', isEs?'Retenido':'Retained', isEs?'Devolución est.':'Est. release', isEs?'Estado':'Status', isEs?'Orden de pago':'Payment order'].map((h,i) =>
                    <th key={i} className="px-2 py-1 text-left text-amber-600 font-medium">{h}</th>
                  )}
                </tr></thead>
                <tbody>
                  {avaluosSc.filter(a=>a.estado==='aprobado'&&(a.retencion_monto||0)>0).map(av => {
                    const ret      = retenciones.find(r => r.avaluo_id === av.id)
                    const devuelta = ret?.estado === 'devuelta' || ret?.estado === 'pagada'
                    const fechaEst = ret?.fecha_devolucion_est
                    const vencida  = fechaEst && new Date(fechaEst) <= new Date() && !devuelta
                    const orden    = ret?.orden_pago_id
                      ? ordenes.find(o => o.id === ret.orden_pago_id)
                      : null
                    return (
                      <tr key={av.id} className="border-b border-amber-100">
                        <td className="px-2 py-1.5 font-medium">#{av.numero}</td>
                        <td className="px-2 py-1.5 font-mono">{fmt(av.retencion_monto, moneda)}</td>
                        <td className={`px-2 py-1.5 font-mono ${vencida ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                          {fechaEst || '—'}{vencida ? ' ⚠' : ''}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            ret?.estado === 'pagada' ? 'bg-blue-100 text-blue-700' :
                            devuelta ? 'bg-green-100 text-green-700' :
                            vencida  ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-700'}`}>
                            {ret?.estado === 'pagada' ? (isEs?'Pagada':'Paid') :
                             devuelta ? (isEs?'Devuelta':'Released') :
                             vencida  ? (isEs?'Vencida':'Overdue') :
                             (isEs?'Retenida':'Retained')}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          {orden ? (
                            <span className="text-xs font-mono font-semibold text-blue-700">
                              {orden.numero_orden}
                            </span>
                          ) : devuelta ? (
                            <span className="text-xs text-amber-600 italic">
                              {isEs ? 'Sin orden' : 'No order'}
                            </span>
                          ) : ret && puedeEditar ? (
                            <button
                              onClick={() => {
                                if (!window.confirm(
                                  isEs ? `¿Liberar la retención #${av.numero} de ${scSelected.subcontratista}?`
                                       : `Release retention #${av.numero} of ${scSelected.subcontratista}?`
                                )) return
                                dispatch({ type:'DEVOLVER_RETENCION', payload:{ retencion: ret, contrato: scSelected } })
                              }}
                              className="text-xs px-2 py-0.5 rounded-lg text-white font-medium"
                              style={{ background: '#1D9E75' }}>
                              {t('fin_sc_release_btn')}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Órdenes de pago emitidas para este subcontrato */}
              {ordenes.length > 0 && (
                <div className="mt-2 pt-3 border-t border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
                    {isEs ? 'Órdenes de pago emitidas' : 'Issued payment orders'}
                  </p>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-amber-200">
                      {[isEs?'Número':'Number', isEs?'Fecha':'Date', isEs?'Avalúos':'Valuations',
                        isEs?'Total':'Total', isEs?'Estado':'Status', ''].map((h,i) =>
                        <th key={i} className="px-2 py-1 text-left text-amber-600 font-medium">{h}</th>
                      )}
                    </tr></thead>
                    <tbody>
                      {ordenes.map((o, idx) => (
                        <tr key={o.id} className={`border-b border-amber-100 ${idx%2===1?'bg-amber-50/40':''}`}>
                          <td className="px-2 py-1.5 font-mono font-semibold text-blue-700">{o.numero_orden}</td>
                          <td className="px-2 py-1.5 text-gray-500">{o.fecha_orden}</td>
                          <td className="px-2 py-1.5 text-center">{o.cantidad_avaluos}</td>
                          <td className="px-2 py-1.5 font-mono font-bold" style={{color:'#1B3A6B'}}>{fmt(o.monto_total, moneda)}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              o.estado === 'pagada' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {o.estado === 'pagada'
                                ? (isEs?'Pagada':'Paid')
                                : (isEs?'Emitida':'Issued')}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => {
                                const retsOrden = (subcontratos_retenciones||[]).filter(r => r.orden_pago_id === o.id)
                                buildOPR({
                                  orden:       o,
                                  retenciones: retsOrden,
                                  contrato:    scSelected,
                                  proy:        proyectos?.find(p => p.id === proyId),
                                  usuario:     null,
                                  lang:        isEs ? 'ES' : 'EN',
                                })
                              }}
                              className="text-xs px-2 py-0.5 rounded-lg text-white font-medium flex items-center gap-1"
                              style={{ background: '#1D9E75' }}
                              title={isEs ? 'Descargar Excel' : 'Download Excel'}>
                              📥 Excel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}

        {/* Items del contrato */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-5">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('fin_sc_contract_activities')}
            </p>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {[isEs?'Descripción':'Description', isEs?'Unidad':'Unit',
                isEs?'Cant. Contrato':'Contract Qty', isEs?'C. Unitario':'Unit Cost',
                isEs?'Total Contrato':'Contract Total',
                isEs?'Acumulado':'Accumulated', isEs?'Saldo':'Balance'].map((h,i) =>
                <th key={i} className={thCls}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {itemsContrato.map(it => {
                const acum  = getCantAnterior(it.id) +
                  avaluosSc.filter(a => a.estado === 'borrador')
                    .reduce((s,av) => {
                      const ai = subcontratos_avaluo_items.find(x => x.avaluo_id===av.id && x.subcontrato_item_id===it.id)
                      return s + parseFloat(ai?.cantidad_actual||0)
                    }, 0)
                const saldo = parseFloat(it.cantidad_contrato||0) - acum
                return (
                  <tr key={it.id} className="border-b border-gray-50">
                    <td className={tdCls}>{it.descripcion}</td>
                    <td className={tdCls + ' text-xs text-gray-400'}>{it.unidad}</td>
                    <td className={tdCls + ' font-mono'}>{it.cantidad_contrato}</td>
                    <td className={tdCls + ' font-mono'}>{fmt2(it.costo_unitario)}</td>
                    <td className={tdCls + ' font-mono font-medium'}>{fmt2(it.costo_total)}</td>
                    <td className={tdCls + ' font-mono'} style={{ color: '#1D9E75' }}>{fmt2(r2(acum * parseFloat(it.costo_unitario||0)))}</td>
                    <td className={tdCls + ' font-mono'} style={{ color: saldo < 0 ? '#ef4444' : '#D97706' }}>{fmt2(r2(saldo * parseFloat(it.costo_unitario||0)))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Lista de avalúos */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('fin_sc_valuations_title')}
            </p>
          </div>
          {avaluosSc.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              {t('fin_sc_no_valuations')}
            </p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                {['#', isEs?'Período':'Period', isEs?'Fecha':'Date',
                  isEs?'Subtotal':'Subtotal', isEs?'Impuesto':'Tax',
                  isEs?'Total Avalúo':'Valuation Total',
                  isEs?'Estado':'Status', ''].map((h,i) =>
                  <th key={i} className={thCls}>{h}</th>
                )}
              </tr></thead>
              <tbody>
                {avaluosSc.map(av => (
                  <tr key={av.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className={tdCls + ' font-mono font-bold'} style={{ color: BRAND }}>#{av.numero}</td>
                    <td className={tdCls + ' text-xs text-gray-400'}>
                      {av.periodo_inicio && av.periodo_fin
                        ? `${av.periodo_inicio} → ${av.periodo_fin}`
                        : '—'}
                    </td>
                    <td className={tdCls + ' text-xs text-gray-400'}>{av.fecha_elaboracion}</td>
                    <td className={tdCls + ' font-mono'}>{fmt2(av.subtotal)}</td>
                    <td className={tdCls + ' font-mono'}>{fmt2(av.impuesto_monto)}</td>
                    <td className={tdCls + ' font-mono font-bold'} style={{ color: '#1D9E75' }}>
                      {fmt(av.monto_total, moneda)}
                    </td>
                    <td className={tdCls}>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        av.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                        av.estado === 'borrador' ? 'bg-gray-100 text-gray-500' :
                        av.estado === 'rechazado' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-700'}`}>
                        {av.estado === 'aprobado' ? t('fin_sc_status_approved') :
                         av.estado === 'borrador' ? t('fin_sc_status_draft') :
                         av.estado === 'rechazado' ? (isEs?'Rechazado':'Rejected') :
                         av.estado}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <div className="flex gap-1 flex-wrap">
                        {av.estado === 'borrador' && puedeEditar && (
                          <>
                            <button onClick={() => editarAvaluo(av)}
                              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                              {isEs ? 'Editar' : 'Edit'}
                            </button>
                            {puedeRechazar && (
                              <button onClick={() => rechazarAvaluo(av)}
                                className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                                {isEs ? 'Rechazar' : 'Reject'}
                              </button>
                            )}
                            {puedeRechazar && (
                              <button onClick={() => aprobarAvaluo(av)}
                                className="text-xs px-3 py-1 rounded-lg text-white font-medium"
                                style={{ background: '#1D9E75' }}>
                                {t('fin_sc_approve_btn')}
                              </button>
                            )}
                          </>
                        )}
                        {av.estado === 'aprobado' && puedeRechazar && (
                          <button onClick={() => eliminarAvaluoAprobado(av)}
                            className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                            {isEs ? 'Eliminar' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  // ── VISTA: NUEVO AVALÚO ──
  if (scView === 'avaluo' && scSelected) {
    const itemsContrato = subcontratos_items.filter(i => i.subcontrato_id === scSelected.id)
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setScView('detail')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
          <h2 className="text-base font-semibold text-gray-800">
            {avForm._editId ? (isEs ? `Editar Avalúo #${avForm._editAvaluoNum||numAvaluo}` : `Edit Valuation #${avForm._editAvaluoNum||numAvaluo}`) : (isEs ? `Avalúo #${numAvaluo}` : `Valuation #${numAvaluo}`)} — {scSelected.subcontratista}
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
          {/* Cabecera */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_av_period_start')}</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F2F2F2] focus:outline-none focus:border-[#1B3A6B]"
                value={avForm.periodo_inicio||''} onChange={setAvF('periodo_inicio')} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_av_period_end')}</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F2F2F2] focus:outline-none focus:border-[#1B3A6B]"
                value={avForm.periodo_fin||''} onChange={setAvF('periodo_fin')} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">{t('fin_av_prepared_date')}</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F2F2F2] focus:outline-none focus:border-[#1B3A6B]"
                value={avForm.fecha_elaboracion||''} onChange={setAvF('fecha_elaboracion')} />
            </div>
          </div>

          {/* Tabla de ítems */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {[isEs?'Descripción':'Description', isEs?'UM':'UM',
                  isEs?'Cant. Contrato':'Contract Qty',
                  isEs?'C. Unitario':'Unit Cost',
                  isEs?'Período Anterior':'Prev. Period',
                  isEs?'Período Actual *':'Current Period *',
                  isEs?'Acumulado':'Accumulated',
                  isEs?'Saldo':'Balance',
                  isEs?'Monto Actual':'Current Amount'].map((h,i) =>
                  <th key={i} className="px-3 py-2 text-left text-xs text-gray-500 whitespace-nowrap">{h}</th>
                )}
              </tr></thead>
              <tbody>
                {itemsContrato.map((it, idx) => {
                  const avItem    = avItems.find(x => x.subcontrato_item_id === it.id)
                  const cantAnt   = getCantAnterior(it.id)
                  const cantAct   = parseFloat(avItem?.cantidad_actual||0)
                  const cantAcum  = cantAnt + cantAct
                  const cantSaldo = parseFloat(it.cantidad_contrato||0) - cantAcum
                  const montoAct  = r2(cantAct * parseFloat(it.costo_unitario||0))
                  const excede    = cantAcum > parseFloat(it.cantidad_contrato||0)
                  return (
                    <tr key={it.id} className={`border-b border-gray-50 ${excede ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2 text-sm text-gray-700">{it.descripcion}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{it.unidad}</td>
                      <td className="px-3 py-2 text-sm font-mono">{it.cantidad_contrato}</td>
                      <td className="px-3 py-2 text-sm font-mono text-gray-500">{fmt2(it.costo_unitario)}</td>
                      <td className="px-3 py-2 text-sm font-mono text-gray-400">{cantAnt > 0 ? cantAnt : '—'}</td>
                      <td className="px-3 py-2">
                        <input type="number"
                          className={`w-24 border rounded-lg px-2 py-1 text-sm focus:outline-none ${excede ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-[#1B3A6B]'}`}
                          value={avItem?.cantidad_actual||''}
                          placeholder="0"
                          min="0" step="0.01"
                          onChange={e => {
                            const val = e.target.value
                            setAvItems(prev => {
                              const exists = prev.find(x => x.subcontrato_item_id === it.id)
                              if (exists) return prev.map(x => x.subcontrato_item_id===it.id ? {...x, cantidad_actual:val} : x)
                              return [...prev, { subcontrato_item_id: it.id, cantidad_actual: val }]
                            })
                          }}
                        />
                        {excede && <p className="text-xs text-red-500 mt-0.5">{t('fin_av_exceeds')}</p>}
                      </td>
                      <td className="px-3 py-2 text-sm font-mono" style={{ color: excede ? '#ef4444' : '#1D9E75' }}>{fmt2(cantAcum)}</td>
                      <td className="px-3 py-2 text-sm font-mono text-gray-500">{fmt2(cantSaldo)}</td>
                      <td className="px-3 py-2 text-sm font-mono font-medium" style={{ color: BRAND }}>{montoAct > 0 ? fmt2(montoAct) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="border-t border-gray-100 pt-3">
            {[
              [t('fin_av_subtotal'), fmt2(avSubtotal)],
              [t('fin_av_tax_row', { pct: scSelected.impuesto_pct||0 }), fmt2(avImpMonto)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm py-1">
                <span className="text-gray-500">{label}</span>
                <span className="font-mono text-gray-700">{val}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
              <span>{t('fin_av_total')}</span>
              <span style={{ color: BRAND }}>{fmt(avTotal, moneda)}</span>
            </div>
            {avRetencionPct > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex justify-between text-sm py-0.5">
                  <span className="text-amber-700 font-medium">
                    🔒 {isEs ? `Retención garantía (${avRetencionPct}%)` : `Retention (${avRetencionPct}%)`}
                  </span>
                  <span className="font-mono text-amber-700 font-bold">-{fmt2(avRetencionMonto)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-amber-200 mt-1">
                  <span className="text-gray-800">{t('fin_av_amount_to_pay')}</span>
                  <span style={{ color: '#1D9E75' }}>{fmt(avMontoAPagar, moneda)}</span>
                </div>
                <p className="text-xs text-amber-600 mt-1.5">
                  {isEs
                    ? `Esta retención se liberará en ${scSelected.plazo_garantia_meses || 6} meses de garantía.`
                    : `This retention will be released after ${scSelected.plazo_garantia_meses || 6} months warranty.`}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{t('lbl_notes')}</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-[#F2F2F2] focus:outline-none focus:border-[#1B3A6B]"
              rows={2} value={avForm.notas||''} onChange={setAvF('notas')} />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setScView('detail')}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              {t('btn_cancel')}
            </button>
            <button onClick={saveAvaluo}
              disabled={avItems.every(i => !i.cantidad_actual || parseFloat(i.cantidad_actual)===0)}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40"
              style={{ background: BRAND }}>
              {t('fin_av_save')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

