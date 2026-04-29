import { useState } from 'react'
import { useStore } from '../store'
import { today, fmt, fmtNum } from '../utils'
import { Drawer, EmptyState, Field, PrimaryBtn, SecondaryBtn, TBtn, StatCard, Icons, inputCls, selectCls } from '../components'

const TABS = ['Costos Directos','Nóminas','Subcontratos','Equipos','Costos Indirectos']

export default function Financiero() {
  const { state, dispatch } = useStore()
  const { proyectos, presupuesto, costos_directos, nominas, subcontratos, equipos, costos_indirectos, salidas, entradas, materiales } = state
  const [tab, setTab] = useState(0)
  const [proyId, setProyId] = useState(proyectos[0]?.id || '')
  const [drawer, setDrawer] = useState(false)
  const [form, setForm] = useState({})
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const proy = proyectos.find(p => p.id === proyId)
  const moneda = proy?.moneda || 'USD'
  const acts = presupuesto.filter(b => b.proyecto_id === proyId && b.tipo === 'actividad')
  const closed = proy?.estado === 'completado' || proy?.estado === 'cancelado'

  // Filtered by project
  const directs = costos_directos.filter(c => c.proyecto_id === proyId)
  const noms = nominas.filter(n => n.proyecto_id === proyId)
  const subs = subcontratos.filter(s => s.proyecto_id === proyId)
  const eqs = equipos.filter(e => e.proyecto_id === proyId)
  const inds = costos_indirectos.filter(c => c.proyecto_id === proyId)

  const totalDir = directs.reduce((s,c) => s + (parseFloat(c.monto)||0), 0)
  const totalNom = noms.reduce((s,n) => s + (parseFloat(n.salario_base)||0) - (parseFloat(n.deducciones)||0), 0)
  const totalSub = subs.reduce((s,sc) => s + (parseFloat(sc.monto_pagado)||0), 0)
  const totalEq = eqs.reduce((s,e) => s + (parseFloat(e.costo_total)||0), 0)
  const totalInd = inds.reduce((s,c) => s + (parseFloat(c.monto)||0), 0)
  const totalMat = salidas.filter(s=>s.proyecto_id===proyId).reduce((s, sa) => {
    const idx = entradas.find(e=>e.material_id===sa.material_id)
    return s + (parseFloat(sa.cantidad)||0) * (parseFloat(idx?.precio_unitario)||0)
  }, 0)
  const totalReal = totalMat + totalDir + totalNom + totalSub + totalEq + totalInd

  const openDrawer = () => {
    const base = { proyecto_id: proyId, fecha: today() }
    if (tab === 0) setForm({ ...base, tipo:'factura_obra', descripcion:'', monto:'', numero_documento:'', actividad_id:'' })
    if (tab === 1) setForm({ ...base, trabajador:'', cargo:'', periodo_inicio:today(), periodo_fin:today(), salario_base:'', deducciones:'0' })
    if (tab === 2) setForm({ ...base, subcontratista:'', descripcion_trabajo:'', monto_contrato:'', avance_porcentaje:'0', monto_pagado:'0', actividad_id:'' })
    if (tab === 3) setForm({ ...base, descripcion:'', tipo:'alquiler', tarifa_diaria:'', dias_uso:'', costo_total:'', actividad_id:'' })
    if (tab === 4) setForm({ ...base, categoria:'', descripcion:'', monto:'' })
    setDrawer(true)
  }

  const save = () => {
    if (tab === 0) { if (!form.descripcion||!form.monto) return; dispatch({ type:'ADD_COSTO_DIRECTO', payload: form }) }
    if (tab === 1) { if (!form.trabajador||!form.salario_base) return; dispatch({ type:'ADD_NOMINA', payload: form }) }
    if (tab === 2) { if (!form.subcontratista||!form.monto_contrato) return; dispatch({ type:'ADD_SUBCONTRATO', payload: form }) }
    if (tab === 3) { if (!form.descripcion||!form.costo_total) return; dispatch({ type:'ADD_EQUIPO', payload: form }) }
    if (tab === 4) { if (!form.categoria||!form.monto) return; dispatch({ type:'ADD_COSTO_INDIRECTO', payload: form }) }
    setDrawer(false)
  }

  const tabEmpty = [directs, noms, subs, eqs, inds][tab]
  const tabLabels = ['Costo Directo','Nómina','Subcontrato','Equipo','Costo Indirecto']

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Control Financiero</h1>
          {proy && <p className="text-sm text-gray-400 mt-0.5">{proy.project_code} — {proy.nombre}</p>}
        </div>
        <div className="flex items-center gap-3">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#1D9E75]" value={proyId} onChange={e => setProyId(e.target.value)}>
            <option value="">— Proyecto —</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
          {proyId && !closed && <PrimaryBtn onClick={openDrawer}>+ Agregar {tabLabels[tab]}</PrimaryBtn>}
        </div>
      </div>

      {!proyId ? (
        <EmptyState icon={Icons.financial} title="Selecciona un proyecto" />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Real Ejecutado" value={fmt(totalReal, moneda)} color="#1D9E75" />
            <StatCard label="Materiales" value={fmt(totalMat, moneda)} sub="salidas bodega" />
            <StatCard label="Mano de Obra" value={fmt(totalNom, moneda)} sub="nóminas pagadas" />
            <StatCard label="Subcontratos" value={fmt(totalSub, moneda)} sub="monto pagado" />
          </div>

          <div className="flex border-b border-gray-200 mb-5">
            {TABS.map((t,i) => {
              const counts = [directs.length, noms.length, subs.length, eqs.length, inds.length]
              return (
                <button key={t} onClick={() => setTab(i)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap
                    ${tab===i ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t} {counts[i] > 0 && <span className="ml-1 text-xs text-gray-400">({counts[i]})</span>}
                </button>
              )
            })}
          </div>

          {tabEmpty.length === 0 ? (
            <EmptyState icon={Icons.financial} title={`No hay ${tabLabels[tab].toLowerCase()}s registrados`}
              action={closed ? undefined : `+ Agregar ${tabLabels[tab]}`} onAction={openDrawer} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              {/* Costos Directos */}
              {tab === 0 && <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Fecha','Tipo','Descripción','Monto','Documento','Actividad'].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>)}
              </tr></thead><tbody>
                {directs.map(c => {
                  const act = presupuesto.find(b=>b.id===c.actividad_id)
                  return <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500">{c.fecha}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.tipo==='caja_chica'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>{c.tipo==='caja_chica'?'Caja chica':'Factura'}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-800">{c.descripcion}</td>
                    <td className="px-4 py-3 text-sm font-mono font-medium" style={{color:'#1D9E75'}}>{fmt(c.monto, moneda)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.numero_documento||'—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{act?`${act.code} ${act.descripcion}`:'—'}</td>
                  </tr>
                })}
                <tr className="bg-gray-50"><td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Total</td><td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalDir,moneda)}</td><td colSpan={2}/></tr>
              </tbody></table>}

              {/* Nóminas */}
              {tab === 1 && <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Trabajador','Cargo','Período','Salario Base','Deducciones','Neto'].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>)}
              </tr></thead><tbody>
                {noms.map(n => {
                  const neto = (parseFloat(n.salario_base)||0)-(parseFloat(n.deducciones)||0)
                  return <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{n.trabajador}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{n.cargo||'—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{n.periodo_inicio} → {n.periodo_fin}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{fmt(n.salario_base,moneda)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-red-500">-{fmt(n.deducciones,moneda)}</td>
                    <td className="px-4 py-3 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(neto,moneda)}</td>
                  </tr>
                })}
                <tr className="bg-gray-50"><td colSpan={5} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Total Neto</td><td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalNom,moneda)}</td></tr>
              </tbody></table>}

              {/* Subcontratos */}
              {tab === 2 && <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Subcontratista','Trabajo','Contrato','Avance %','Pagado','Estado'].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>)}
              </tr></thead><tbody>
                {subs.map(sc => (
                  <tr key={sc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{sc.subcontratista}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{sc.descripcion_trabajo||'—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{fmt(sc.monto_contrato,moneda)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{fmtNum(sc.avance_porcentaje)}%</td>
                    <td className="px-4 py-3 text-sm font-mono font-medium" style={{color:'#1D9E75'}}>{fmt(sc.monto_pagado,moneda)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.estado==='activo'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{sc.estado}</span></td>
                  </tr>
                ))}
                <tr className="bg-gray-50"><td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Total Pagado</td><td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalSub,moneda)}</td><td/></tr>
              </tbody></table>}

              {/* Equipos */}
              {tab === 3 && <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Descripción','Tipo','Tarifa/día','Días','Costo Total'].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>)}
              </tr></thead><tbody>
                {eqs.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-800">{e.descripcion}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.tipo==='alquiler'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{e.tipo}</span></td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{e.tarifa_diaria?fmt(e.tarifa_diaria,moneda):'—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{e.dias_uso||'—'}</td>
                    <td className="px-4 py-3 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(e.costo_total,moneda)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50"><td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Total</td><td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalEq,moneda)}</td></tr>
              </tbody></table>}

              {/* Costos Indirectos */}
              {tab === 4 && <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Fecha','Categoría','Descripción','Monto'].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500">{h}</th>)}
              </tr></thead><tbody>
                {inds.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500">{c.fecha}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.categoria}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-800">{c.descripcion||'—'}</td>
                    <td className="px-4 py-3 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(c.monto,moneda)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50"><td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Total</td><td className="px-4 py-2 text-sm font-mono font-bold" style={{color:'#1D9E75'}}>{fmt(totalInd,moneda)}</td></tr>
              </tbody></table>}
            </div>
          )}
        </>
      )}

      {/* DRAWERS */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={`Agregar ${tabLabels[tab]}`} width={400}>
        {tab === 0 && <>
          <Field label="Tipo"><select className={selectCls} value={form.tipo||'factura_obra'} onChange={set('tipo')}>
            <option value="factura_obra">Factura de Obra</option><option value="caja_chica">Caja Chica</option>
          </select></Field>
          <Field label="Descripción" required><input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')} placeholder="Descripción del costo" /></Field>
          <Field label="Actividad"><select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
            <option value="">— Sin actividad —</option>{acts.map(a=><option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
          </select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto" required><input type="number" className={inputCls} value={form.monto||''} onChange={set('monto')} placeholder="0.00" min="0" step="0.01"/></Field>
            <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha||today()} onChange={set('fecha')}/></Field>
          </div>
          <Field label="N° Documento"><input className={inputCls} value={form.numero_documento||''} onChange={set('numero_documento')} placeholder="FAC-001"/></Field>
        </>}
        {tab === 1 && <>
          <Field label="Trabajador" required><input className={inputCls} value={form.trabajador||''} onChange={set('trabajador')} placeholder="Nombre completo"/></Field>
          <Field label="Cargo"><input className={inputCls} value={form.cargo||''} onChange={set('cargo')} placeholder="Ej: Maestro de obra"/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Período inicio"><input type="date" className={inputCls} value={form.periodo_inicio||today()} onChange={set('periodo_inicio')}/></Field>
            <Field label="Período fin"><input type="date" className={inputCls} value={form.periodo_fin||today()} onChange={set('periodo_fin')}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Salario base" required><input type="number" className={inputCls} value={form.salario_base||''} onChange={set('salario_base')} placeholder="0.00" min="0" step="0.01"/></Field>
            <Field label="Deducciones"><input type="number" className={inputCls} value={form.deducciones||''} onChange={set('deducciones')} placeholder="0.00" min="0" step="0.01"/></Field>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm font-medium">
            <span className="text-gray-600">Neto a pagar:</span>
            <span style={{color:'#1D9E75'}}>{fmt((parseFloat(form.salario_base)||0)-(parseFloat(form.deducciones)||0), moneda)}</span>
          </div>
        </>}
        {tab === 2 && <>
          <Field label="Subcontratista" required><input className={inputCls} value={form.subcontratista||''} onChange={set('subcontratista')} placeholder="Nombre / Empresa"/></Field>
          <Field label="Descripción del trabajo"><textarea className={inputCls} rows={2} value={form.descripcion_trabajo||''} onChange={set('descripcion_trabajo')}/></Field>
          <Field label="Actividad"><select className={selectCls} value={form.actividad_id||''} onChange={set('actividad_id')}>
            <option value="">— Sin actividad —</option>{acts.map(a=><option key={a.id} value={a.id}>{a.code} — {a.descripcion}</option>)}
          </select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto contrato" required><input type="number" className={inputCls} value={form.monto_contrato||''} onChange={set('monto_contrato')} placeholder="0.00" min="0" step="0.01"/></Field>
            <Field label="Monto pagado"><input type="number" className={inputCls} value={form.monto_pagado||''} onChange={set('monto_pagado')} placeholder="0.00" min="0" step="0.01"/></Field>
          </div>
          <Field label="Avance (%)"><input type="number" className={inputCls} value={form.avance_porcentaje||''} onChange={set('avance_porcentaje')} placeholder="0" min="0" max="100" step="1"/></Field>
        </>}
        {tab === 3 && <>
          <Field label="Descripción" required><input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')} placeholder="Ej: Excavadora CAT 320"/></Field>
          <Field label="Tipo"><select className={selectCls} value={form.tipo||'alquiler'} onChange={set('tipo')}>
            <option value="alquiler">Alquiler</option><option value="propio">Propio</option>
          </select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarifa/día"><input type="number" className={inputCls} value={form.tarifa_diaria||''} onChange={set('tarifa_diaria')} placeholder="0.00" min="0" step="0.01"/></Field>
            <Field label="Días de uso"><input type="number" className={inputCls} value={form.dias_uso||''} onChange={set('dias_uso')} placeholder="0" min="0"/></Field>
          </div>
          <Field label="Costo total" required><input type="number" className={inputCls} value={form.costo_total||((parseFloat(form.tarifa_diaria)||0)*(parseFloat(form.dias_uso)||0)||'')} onChange={set('costo_total')} placeholder="0.00" min="0" step="0.01"/></Field>
        </>}
        {tab === 4 && <>
          <Field label="Categoría" required><input className={inputCls} value={form.categoria||''} onChange={set('categoria')} placeholder="Ej: Administración, Seguridad, Servicios"/></Field>
          <Field label="Descripción"><input className={inputCls} value={form.descripcion||''} onChange={set('descripcion')} placeholder="Descripción opcional"/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto" required><input type="number" className={inputCls} value={form.monto||''} onChange={set('monto')} placeholder="0.00" min="0" step="0.01"/></Field>
            <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha||today()} onChange={set('fecha')}/></Field>
          </div>
        </>}
        <div className="flex gap-2 mt-auto pt-2">
          <SecondaryBtn onClick={() => setDrawer(false)} className="flex-1">Cancelar</SecondaryBtn>
          <PrimaryBtn onClick={save} className="flex-1">Guardar</PrimaryBtn>
        </div>
      </Drawer>
    </div>
  )
}
