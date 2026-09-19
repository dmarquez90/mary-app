import { useState, useContext, useMemo } from 'react'
import { useStore } from '../store'
import { LangContext } from '../i18n'
import { usePermissions } from '../usePermissions'
import { useAuth } from '../auth'
import { supabase } from '../supabase'
import { EmptyState, Icons, Field, PrimaryBtn, Confirm, inputCls, PageHeader } from '../components'
import { uuid } from '../utils'

const BRAND = 'var(--brand)'

export default function Supervision() {
  const { state, dispatch } = useStore()
  const { lang } = useContext(LangContext)
  const { canView, can } = usePermissions()
  const { tenantId, perfil } = useAuth()
  const isEs = lang === 'ES'
  const { proyectos = [], bitacora_log = [], bitacora_adjuntos = [] } = state

  const puedeVer      = canView('supervision')
  const puedeEscribir = can('supervision_editar')

  // Proyectos a los que el usuario tiene acceso (restricción de
  // "Permisos personalizados" en Configuración, cuando aplica)
  const proyectosPermitidos = perfil?.proyectos_permitidos || null
  const proyectosVisibles = useMemo(
    () => proyectos.filter(p => !proyectosPermitidos || proyectosPermitidos.includes(p.id)),
    [proyectos, proyectosPermitidos]
  )

  const [fProyecto, setFProyecto]         = useState('')
  const [nuevaFecha, setNuevaFecha]       = useState(() => new Date().toISOString().slice(0, 10))
  const [nuevoTexto, setNuevoTexto]       = useState('')
  const [nuevosArchivos, setNuevosArchivos] = useState([])
  const [subiendo, setSubiendo]           = useState(false)
  const [confirmDel, setConfirmDel]       = useState(null)
  const [respuestaAbierta, setRespuestaAbierta] = useState(null)
  const [textoRespuesta, setTextoRespuesta]     = useState('')
  const [enviandoResp, setEnviandoResp]         = useState(false)

  const entradas = useMemo(() => {
    return bitacora_log
      .filter(b => !b.parent_id && (!fProyecto || b.proyecto_id === fProyecto))
      .slice()
      .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at))
      .map(b => ({
        ...b,
        adjuntos: bitacora_adjuntos.filter(a => a.bitacora_id === b.id),
        respuestas: bitacora_log
          .filter(r => r.parent_id === b.id)
          .slice()
          .sort((a, c) => new Date(a.created_at) - new Date(c.created_at)),
      }))
  }, [bitacora_log, bitacora_adjuntos, fProyecto])

  const proyLabel = (id) => {
    const p = proyectos.find(p => p.id === id)
    return p ? `${p.project_code} — ${p.nombre}` : (isEs ? '[Proyecto eliminado]' : '[Deleted project]')
  }

  const fmtFecha = (iso) => new Date(iso).toLocaleDateString(isEs ? 'es' : 'en-US', { dateStyle: 'medium' })

  const crearEntrada = async () => {
    if (!fProyecto || !nuevoTexto.trim()) return
    setSubiendo(true)
    try {
      const id = uuid()
      await dispatch({
        type: 'ADD_BITACORA',
        payload: { id, proyecto_id: fProyecto, fecha: nuevaFecha, texto: nuevoTexto.trim() },
      })
      if (nuevosArchivos.length) await subirAdjuntos(id, nuevosArchivos)
      setNuevoTexto('')
      setNuevosArchivos([])
    } finally {
      setSubiendo(false)
    }
  }

  const enviarRespuesta = async (entrada) => {
    if (!textoRespuesta.trim()) return
    setEnviandoResp(true)
    try {
      await dispatch({
        type: 'ADD_BITACORA',
        payload: {
          id: uuid(),
          proyecto_id: entrada.proyecto_id,
          parent_id: entrada.id,
          fecha: new Date().toISOString().slice(0, 10),
          texto: textoRespuesta.trim(),
        },
      })
      setTextoRespuesta('')
      setRespuestaAbierta(null)
    } finally {
      setEnviandoResp(false)
    }
  }

  const subirAdjuntos = async (bitacoraId, files) => {
    for (const file of files) {
      const path = `${tenantId}/${bitacoraId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('bitacora-adjuntos').upload(path, file)
      if (upErr) { console.error('upload adjunto:', upErr); continue }
      // El bucket es privado (solo la empresa/tenant dueña puede verlo), así que
      // guardamos la ruta y generamos una URL firmada temporal al momento de abrirlo.
      dispatch({
        type: 'ADD_BITACORA_ADJUNTO',
        payload: { bitacora_id: bitacoraId, url: path, nombre: file.name, tipo_mime: file.type },
      })
    }
  }

  const abrirAdjunto = async (path) => {
    const { data, error } = await supabase.storage.from('bitacora-adjuntos').createSignedUrl(path, 300)
    if (error || !data?.signedUrl) { console.error('signed url adjunto:', error); return }
    window.open(data.signedUrl, '_blank', 'noreferrer')
  }

  const eliminarEntrada = async (id) => {
    await dispatch({ type: 'DEL_BITACORA', payload: id })
    setConfirmDel(null)
  }

  if (!puedeVer) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <EmptyState icon={Icons.supervision}
          title={isEs ? 'Acceso restringido' : 'Restricted access'}
          subtitle={isEs
            ? 'Este módulo no está disponible para tu rol.'
            : 'This module is not available for your role.'} />
      </div>
    )
  }

  return (
    <div className="p-5 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title={isEs ? 'Supervisión — Bitácora' : 'Supervision — Log'}
        subtitle={isEs
          ? 'Registro de bitácora de obra por proyecto. Cada proyecto tiene su propia bitácora privada.'
          : 'Site log entries by project. Each project has its own private log.'}
      />

      {/* Selector de proyecto — único, controla filtro y nueva entrada */}
      <div className="m-card p-4 mb-5">
        <Field label={isEs ? 'Proyecto' : 'Project'}>
          <select className={inputCls} value={fProyecto} onChange={e => setFProyecto(e.target.value)}>
            <option value="">{isEs ? 'Selecciona un proyecto...' : 'Select a project...'}</option>
            {proyectosVisibles.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
          </select>
        </Field>
        {!fProyecto && (
          <p className="text-xs text-gray-400 mt-2">
            {isEs
              ? 'Selecciona un proyecto para ver y registrar su bitácora.'
              : 'Select a project to view and log its entries.'}
          </p>
        )}
      </div>

      {/* Formulario nueva entrada */}
      {puedeEscribir && fProyecto && (
        <div className="m-card p-4 mb-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">{isEs ? 'Nueva entrada' : 'New entry'}</p>
          <Field label={isEs ? 'Fecha' : 'Date'} required>
            <input type="date" className={inputCls} value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} />
          </Field>
          <Field label={isEs ? 'Texto' : 'Text'} required>
            <textarea className={inputCls} rows={3} value={nuevoTexto} onChange={e => setNuevoTexto(e.target.value)}
              placeholder={isEs ? 'Describe lo observado, avance, incidentes...' : 'Describe what was observed, progress, incidents...'} />
          </Field>
          <Field label={isEs ? 'Adjuntos (opcional)' : 'Attachments (optional)'}>
            <input type="file" multiple className={inputCls}
              onChange={e => setNuevosArchivos(Array.from(e.target.files || []))} />
          </Field>
          <div className="flex justify-end">
            <PrimaryBtn onClick={crearEntrada} disabled={subiendo || !nuevoTexto.trim()}>
              {subiendo ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar entrada' : 'Save entry')}
            </PrimaryBtn>
          </div>
        </div>
      )}

      {/* Lista */}
      {fProyecto && (
        <div className="flex flex-col gap-3">
          {entradas.length === 0 ? (
            <div className="m-card">
              <EmptyState icon={Icons.supervision} title={isEs ? 'Sin entradas registradas' : 'No entries recorded'} />
            </div>
          ) : entradas.map(e => (
            <div key={e.id} className="m-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-400">{fmtFecha(e.fecha || e.created_at)} · {proyLabel(e.proyecto_id)}</p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{e.texto}</p>
                  {e.adjuntos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {e.adjuntos.map(a => (
                        <button key={a.id} type="button" onClick={() => abrirAdjunto(a.url)}
                          className="m-btn m-btn-sm m-btn-ghost">
                          {a.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {e.creado_por_nombre || '—'}{e.creado_por_rol ? ` (${e.creado_por_rol})` : ''}
                  </p>
                </div>
                {puedeEscribir && (
                  <button onClick={() => setConfirmDel(e.id)} className="text-gray-300 hover:text-red-500 p-1">
                    <div className="w-4 h-4">{Icons.trash}</div>
                  </button>
                )}
              </div>

              {/* Respuestas */}
              {e.respuestas.length > 0 && (
                <div className="mt-3 pl-3 border-l-2 border-gray-100 flex flex-col gap-2">
                  {e.respuestas.map(r => (
                    <div key={r.id}>
                      <p className="text-xs text-gray-400">
                        {r.creado_por_nombre || '—'}{r.creado_por_rol ? ` (${r.creado_por_rol})` : ''} · {fmtFecha(r.created_at)}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.texto}</p>
                    </div>
                  ))}
                </div>
              )}

              {puedeEscribir && (
                respuestaAbierta === e.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea className={inputCls} rows={2} value={textoRespuesta}
                      onChange={ev => setTextoRespuesta(ev.target.value)}
                      placeholder={isEs ? 'Escribe una respuesta...' : 'Write a reply...'} />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setRespuestaAbierta(null); setTextoRespuesta('') }}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2">
                        {isEs ? 'Cancelar' : 'Cancel'}
                      </button>
                      <PrimaryBtn onClick={() => enviarRespuesta(e)} disabled={enviandoResp || !textoRespuesta.trim()}>
                        {enviandoResp ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Responder' : 'Reply')}
                      </PrimaryBtn>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setRespuestaAbierta(e.id); setTextoRespuesta('') }}
                    className="mt-2 text-xs font-medium hover:underline" style={{ color: BRAND }}>
                    {isEs ? 'Responder' : 'Reply'}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      <Confirm
        open={!!confirmDel}
        message={isEs ? '¿Eliminar esta entrada de bitácora?' : 'Delete this log entry?'}
        onConfirm={() => eliminarEntrada(confirmDel)}
        onCancel={() => setConfirmDel(null)}
        confirmLabel={isEs ? 'Eliminar' : 'Delete'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
      />
    </div>
  )
}
