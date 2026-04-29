export const uuid = () => crypto.randomUUID()

export const fmt = (n, moneda = 'USD') => {
  const currency = ['USD','NIO','COP','GTQ','PEN','MXN'].includes(moneda) ? moneda : 'USD'
  return new Intl.NumberFormat('es-US', { style:'currency', currency, minimumFractionDigits:2 }).format(n || 0)
}

export const fmtNum = (n) =>
  new Intl.NumberFormat('es', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n || 0)

export const today = () => new Date().toISOString().split('T')[0]

export const genProjectCode = (proyectos) => {
  const year = new Date().getFullYear()
  const n = (proyectos || []).length + 1
  return `P-${year}-${String(n).padStart(3,'0')}`
}

export const genOCCode = (ocs) => {
  const year = new Date().getFullYear()
  const n = (ocs || []).length + 1
  return `OC-${year}-${String(n).padStart(3,'0')}`
}

export const genBudgetCode = (items, tipo, parentId) => {
  if (tipo === 'etapa') {
    const n = items.filter(i => i.tipo === 'etapa').length + 1
    return String(n).padStart(2,'0')
  }
  if (tipo === 'sub_etapa') {
    const parent = items.find(i => i.id === parentId)
    const pc = parent?.code || '01'
    const n = items.filter(i => i.tipo === 'sub_etapa' && i.parent_id === parentId).length + 1
    return `${pc}.${String(n).padStart(2,'0')}`
  }
  if (tipo === 'actividad') {
    const parent = items.find(i => i.id === parentId)
    const pc = parent?.code || '01.01'
    const n = items.filter(i => i.tipo === 'actividad' && i.parent_id === parentId).length + 1
    return `${pc}.${String(n).padStart(3,'0')}`
  }
}

export const flatBudgetItems = (items) => {
  const stages = items.filter(i => i.tipo === 'etapa').sort((a,b) => a.code.localeCompare(b.code))
  const out = []
  stages.forEach(st => {
    out.push(st)
    items.filter(i => i.tipo === 'sub_etapa' && i.parent_id === st.id)
      .sort((a,b) => a.code.localeCompare(b.code))
      .forEach(ss => {
        out.push(ss)
        items.filter(i => i.tipo === 'actividad' && i.parent_id === ss.id)
          .sort((a,b) => a.code.localeCompare(b.code))
          .forEach(ac => out.push(ac))
      })
  })
  return out
}

export const calcSubtotal = (items, id, tipo) => {
  if (tipo === 'sub_etapa') {
    return items.filter(i => i.tipo === 'actividad' && i.parent_id === id)
      .reduce((s, a) => s + (a.cantidad||0) * ((a.costo_mo||0)+(a.costo_materiales||0)+(a.costo_equipos||0)), 0)
  }
  if (tipo === 'etapa') {
    return items.filter(i => i.tipo === 'sub_etapa' && i.parent_id === id)
      .reduce((s, ss) => s + calcSubtotal(items, ss.id, 'sub_etapa'), 0)
  }
  return 0
}

export const calcGrandTotal = (items) =>
  items.filter(i => i.tipo === 'actividad')
    .reduce((s, a) => s + (a.cantidad||0) * ((a.costo_mo||0)+(a.costo_materiales||0)+(a.costo_equipos||0)), 0)

export const ESTADO_COLORS = {
  planificacion: 'bg-blue-100 text-blue-700',
  en_ejecucion:  'bg-green-100 text-green-700',
  pausado:       'bg-yellow-100 text-yellow-700',
  completado:    'bg-gray-100 text-gray-600',
  cancelado:     'bg-red-100 text-red-600',
  pendiente:     'bg-yellow-100 text-yellow-700',
  aprobada:      'bg-green-100 text-green-700',
  rechazada:     'bg-red-100 text-red-600',
  oc_generada:   'bg-blue-100 text-blue-700',
  borrador:      'bg-gray-100 text-gray-600',
  pendiente_aprobacion: 'bg-yellow-100 text-yellow-700',
  recibida_parcial: 'bg-blue-100 text-blue-700',
  recibida_total:   'bg-green-100 text-green-700',
  cancelada:        'bg-red-100 text-red-600',
  activo:           'bg-green-100 text-green-700',
}

export const ESTADO_LABELS = {
  planificacion: 'Planificación', en_ejecucion: 'En Ejecución',
  pausado: 'Pausado', completado: 'Completado', cancelado: 'Cancelado',
  pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada',
  oc_generada: 'OC Generada', borrador: 'Borrador',
  pendiente_aprobacion: 'Pend. Aprobación', recibida_parcial: 'Recibida Parcial',
  recibida_total: 'Recibida Total', cancelada: 'Cancelada',
  activo: 'Activo', completado_sub: 'Completado',
}

export const MONEDAS = ['USD','NIO','COP','GTQ','PEN','MXN']
export const UNIDADES = ['m²','m³','m','ml','kg','ton','und','gl','hr','día','semana','mes','lote','viaje','%','lb','pie²']
