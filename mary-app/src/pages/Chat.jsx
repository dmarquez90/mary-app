import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { LangContext } from '../i18n'

const BRAND      = '#1B3A6B'
const BRAND_DARK = '#122848'

// ── HELPERS ───────────────────────────────────────────────
function timeMsg(dateStr, isEs) {
  const d    = new Date(dateStr)
  const now  = new Date()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return isEs ? 'ahora' : 'now'
  if (mins < 60)  return `${mins}m`
  if (diff < 86400000) return d.toLocaleTimeString(isEs ? 'es' : 'en', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString(isEs ? 'es' : 'en', { day: 'numeric', month: 'short' })
}

function initials(nombre) {
  if (!nombre) return '?'
  return nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ nombre, size = 8, online }) {
  const colors = ['#1B3A6B','#1D9E75','#D97706','#7C3AED','#DC2626','#0891B2']
  const idx    = nombre ? nombre.charCodeAt(0) % colors.length : 0
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold`}
        style={{ background: colors[idx], fontSize: size === 8 ? 13 : 10 }}
      >
        {initials(nombre)}
      </div>
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-400' : 'bg-gray-300'}`} />
      )}
    </div>
  )
}

// ── CANAL ITEM (sidebar) ──────────────────────────────────
function CanalItem({ canal, activo, onClick, noLeidos, isEs }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${activo ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}
    >
      <span className="text-base flex-shrink-0">
        {canal.tipo === 'general' ? '📢' : '💬'}
      </span>
      <span className="text-sm font-medium truncate flex-1">{canal.nombre}</span>
      {noLeidos > 0 && (
        <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
          {noLeidos > 99 ? '99+' : noLeidos}
        </span>
      )}
    </button>
  )
}

// ── MENSAJE ───────────────────────────────────────────────
function Mensaje({ msg, isMine, usuarios, presencia, onReply, replyMsg, isEs }) {
  const autor   = usuarios.find(u => u.id === msg.usuario_id)
  const online  = presencia.find(p => p.usuario_id === msg.usuario_id)?.en_linea
  const replyAu = replyMsg ? usuarios.find(u => u.id === replyMsg.usuario_id) : null

  return (
    <div className={`flex gap-2.5 group ${isMine ? 'flex-row-reverse' : ''}`}>
      <Avatar nombre={autor?.nombre} size={8} online={online} />
      <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <span className="text-xs font-semibold text-gray-500 mb-0.5 px-1">{autor?.nombre || '—'}</span>
        )}
        {/* Reply preview */}
        {replyMsg && (
          <div className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg mb-1 text-xs max-w-full border-l-2 border-blue-400 bg-blue-50 ${isMine ? 'self-end' : ''}`}>
            <span className="font-semibold text-blue-600 flex-shrink-0">{replyAu?.nombre || '—'}</span>
            <span className="text-gray-500 truncate">{replyMsg.mensaje}</span>
          </div>
        )}
        <div className="relative">
          <div
            className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
              isMine
                ? 'rounded-tr-sm text-white'
                : 'rounded-tl-sm bg-white text-gray-800 border border-gray-100 shadow-sm'
            }`}
            style={isMine ? { background: BRAND } : {}}
          >
            {/* Menciones */}
            {msg.mensaje.split(/(@\w+)/g).map((part, i) =>
              part.startsWith('@')
                ? <span key={i} className={`font-semibold ${isMine ? 'text-blue-200' : 'text-blue-600'}`}>{part}</span>
                : part
            )}
          </div>
          {/* Botón reply — aparece en hover */}
          <button
            onClick={() => onReply(msg)}
            className="absolute -top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-full p-1 shadow-sm"
            style={{ [isMine ? 'left' : 'right']: '-28px' }}
            title={isEs ? 'Responder' : 'Reply'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
            </svg>
          </button>
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 px-1">{timeMsg(msg.created_at, isEs)}</span>
      </div>
    </div>
  )
}

// ── MODAL NUEVO CANAL ─────────────────────────────────────
function ModalNuevoCanal({ open, onClose, onCrear, usuarios, proyectos, tenantId, usuarioId, isEs }) {
  const [nombre, setNombre]       = useState('')
  const [proyId, setProyId]       = useState('')
  const [selects, setSelects]     = useState([])
  const [loading, setLoading]     = useState(false)

  if (!open) return null

  const toggleUser = (id) => setSelects(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const crear = async () => {
    if (!nombre.trim()) return
    setLoading(true)
    try {
      const { data: canal } = await supabase.from('chat_canales').insert({
        tenant_id: tenantId, nombre: nombre.trim(),
        tipo: 'proyecto', proyecto_id: proyId || null,
        creado_por: usuarioId,
      }).select().single()

      // Agregar participantes seleccionados + creador
      const todos = [...new Set([...selects, usuarioId])]
      await supabase.from('chat_participantes').insert(
        todos.map(uid => ({ canal_id: canal.id, usuario_id: uid, tenant_id: tenantId }))
      )
      onCrear(canal)
      setNombre(''); setProyId(''); setSelects([]); onClose()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{isEs ? 'Nuevo canal' : 'New channel'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{isEs ? 'Nombre del canal *' : 'Channel name *'}</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
              value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder={isEs ? 'Ej: Obra Norte — Equipo' : 'E.g.: North Site — Team'}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">{isEs ? 'Proyecto (opcional)' : 'Project (optional)'}</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A6B]"
              value={proyId} onChange={e => setProyId(e.target.value)}>
              <option value="">— {isEs ? 'Sin proyecto' : 'No project'} —</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">{isEs ? 'Participantes' : 'Participants'}</label>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {usuarios.filter(u => u.id !== usuarioId).map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selects.includes(u.id)} onChange={() => toggleUser(u.id)}
                    className="rounded border-gray-300" />
                  <Avatar nombre={u.nombre} size={6} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{u.nombre}</p>
                    <p className="text-xs text-gray-400 capitalize">{u.rol?.replace('_', ' ')}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
          <button onClick={crear} disabled={!nombre.trim() || loading}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40"
            style={{ background: BRAND }}>
            {loading ? '...' : (isEs ? 'Crear canal' : 'Create channel')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CHAT PRINCIPAL ────────────────────────────────────────
export default function Chat() {
  const { perfil }     = useAuth()
  const { lang }       = useContext(LangContext)
  const isEs           = lang === 'ES'
  const tenantId       = perfil?.tenant_id
  const usuarioId      = perfil?.id

  const [canales, setCanales]         = useState([])
  const [canalActivo, setCanalActivo] = useState(null)
  const [mensajes, setMensajes]       = useState([])
  const [usuarios, setUsuarios]       = useState([])
  const [presencia, setPresencia]     = useState([])
  const [texto, setTexto]             = useState('')
  const [replyTo, setReplyTo]         = useState(null)
  const [escribiendo, setEscribiendo] = useState([])
  const [modalCanal, setModalCanal]   = useState(false)
  const [noLeidos, setNoLeidos]       = useState({})
  const [proyectos, setProyectos]     = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [showMenciones, setShowMenciones] = useState(false)
  const [mencionQuery, setMencionQuery]   = useState('')
  const [confirmDelCanal, setConfirmDelCanal] = useState(null)

  const messagesEndRef  = useRef(null)
  const inputRef        = useRef(null)
  const escribiendoRef  = useRef(null)
  const canalActivoRef  = useRef(null)

  // ── Cargar datos iniciales ────────────────────────────
  useEffect(() => {
    if (!tenantId || !usuarioId) return
    loadInicial()
  }, [tenantId, usuarioId])

  async function loadInicial() {
    // Usuarios del tenant
    const { data: usrs } = await supabase.from('usuarios').select('id, nombre, rol, activo').eq('tenant_id', tenantId).eq('activo', true)
    setUsuarios(usrs || [])

    // Proyectos
    const { data: proys } = await supabase.from('proyectos').select('id, project_code, nombre').eq('tenant_id', tenantId)
    setProyectos(proys || [])

    // Canal general — obtener el primero existente o crear uno solo
    const { data: generales } = await supabase.from('chat_canales')
      .select('*').eq('tenant_id', tenantId).eq('tipo', 'general').order('created_at').limit(1)
    
    let general = generales?.[0] || null

    if (!general) {
      const { data: nuevo } = await supabase.from('chat_canales').insert({
        tenant_id: tenantId, nombre: 'General', tipo: 'general',
      }).select().single()
      general = nuevo
    }

    // Asegurar que el usuario esté en canal general
    if (general) {
      await supabase.from('chat_participantes').upsert({
        canal_id: general.id, usuario_id: usuarioId, tenant_id: tenantId,
      }, { onConflict: 'canal_id,usuario_id' })
    }

    // Canales donde participa el usuario
    const { data: parts } = await supabase.from('chat_participantes')
      .select('canal_id').eq('usuario_id', usuarioId)
    const canalIds = parts?.map(p => p.canal_id) || []

    const { data: cans } = await supabase.from('chat_canales')
      .select('*').in('id', canalIds).order('created_at')
    setCanales(cans || [])

    // Activar canal general primero
    if (general) setCanalActivo(general)

    // Presencia — marcar como online
    await supabase.from('chat_presencia').upsert({
      usuario_id: usuarioId, tenant_id: tenantId,
      nombre: perfil?.nombre, en_linea: true, ultimo_visto: new Date().toISOString(),
    }, { onConflict: 'usuario_id' })

    // Cargar presencia de todos
    const { data: pres } = await supabase.from('chat_presencia').select('*').eq('tenant_id', tenantId)
    setPresencia(pres || [])
  }

  // ── Marcar offline al salir ───────────────────────────
  useEffect(() => {
    const handleUnload = async () => {
      if (usuarioId) await supabase.from('chat_presencia').update({ en_linea: false, ultimo_visto: new Date().toISOString() }).eq('usuario_id', usuarioId)
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      handleUnload()
    }
  }, [usuarioId])

  // ── Heartbeat presencia cada 30s ─────────────────────
  useEffect(() => {
    if (!usuarioId) return
    const interval = setInterval(async () => {
      await supabase.from('chat_presencia').update({ en_linea: true, ultimo_visto: new Date().toISOString() }).eq('usuario_id', usuarioId)
    }, 30000)
    return () => clearInterval(interval)
  }, [usuarioId])

  // ── Sync ref con state ───────────────────────────────
  useEffect(() => { canalActivoRef.current = canalActivo }, [canalActivo])

  // ── Cargar mensajes del canal activo ──────────────────
  useEffect(() => {
    if (!canalActivo) return
    setLoadingMsgs(true)
    setMensajes([])
    setReplyTo(null)

    supabase.from('chat_mensajes').select('*')
      .eq('canal_id', canalActivo.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMensajes(data || [])
        setLoadingMsgs(false)
      })

    // Actualizar ultimo_leido
    supabase.from('chat_participantes')
      .update({ ultimo_leido: new Date().toISOString() })
      .eq('canal_id', canalActivo.id).eq('usuario_id', usuarioId)

    setNoLeidos(prev => ({ ...prev, [canalActivo.id]: 0 }))
  }, [canalActivo?.id])

  // ── Scroll al último mensaje ──────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  // ── Realtime suscripciones ────────────────────────────
  useEffect(() => {
    if (!tenantId || !usuarioId) return

    // Nuevos mensajes
    const msgChannel = supabase.channel(`chat_msgs_${tenantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensajes',
        filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        const msg = payload.new
        if (msg.canal_id === canalActivoRef.current?.id) {
          setMensajes(prev => [...prev, msg])
          // Actualizar ultimo_leido
          supabase.from('chat_participantes')
            .update({ ultimo_leido: new Date().toISOString() })
            .eq('canal_id', msg.canal_id).eq('usuario_id', usuarioId)
        } else {
          // Incrementar no leídos
          setNoLeidos(prev => ({ ...prev, [msg.canal_id]: (prev[msg.canal_id] || 0) + 1 }))
        }
      })
      .subscribe()

    // Presencia
    const presChannel = supabase.channel(`chat_pres_${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_presencia',
        filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        setPresencia(prev => {
          const idx = prev.findIndex(p => p.usuario_id === payload.new?.usuario_id)
          if (idx >= 0) { const n = [...prev]; n[idx] = payload.new; return n }
          return [...prev, payload.new]
        })
      })
      .subscribe()

    // Nuevos canales
    const canalChannel = supabase.channel(`chat_canales_${tenantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_participantes',
        filter: `usuario_id=eq.${usuarioId}` }, async (payload) => {
        const { data: canal } = await supabase.from('chat_canales').select('*').eq('id', payload.new.canal_id).single()
        if (canal) setCanales(prev => prev.some(c => c.id === canal.id) ? prev : [...prev, canal])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(presChannel)
      supabase.removeChannel(canalChannel)
    }
  }, [tenantId, usuarioId, canalActivo?.id])

  // ── Borrar canal ─────────────────────────────────────
  const borrarCanal = async (canal) => {
    if (canal.tipo === 'general') return // No borrar general
    await supabase.from('chat_mensajes').delete().eq('canal_id', canal.id)
    await supabase.from('chat_participantes').delete().eq('canal_id', canal.id)
    await supabase.from('chat_canales').delete().eq('id', canal.id)
    setCanales(prev => prev.filter(c => c.id !== canal.id))
    if (canalActivo?.id === canal.id) {
      const general = canales.find(c => c.tipo === 'general')
      setCanalActivo(general || null)
    }
    setConfirmDelCanal(null)
  }

  // ── Enviar mensaje ────────────────────────────────────
  const enviar = async () => {
    const msg = texto.trim()
    if (!msg || !canalActivo) return
    setTexto('')
    setReplyTo(null)
    setShowMenciones(false)

    // Extraer menciones
    const menciones = []
    const regex = /@(\w+)/g
    let m
    while ((m = regex.exec(msg)) !== null) {
      const u = usuarios.find(u => u.nombre?.toLowerCase().startsWith(m[1].toLowerCase()))
      if (u) menciones.push(u.id)
    }

    await supabase.from('chat_mensajes').insert({
      tenant_id:  tenantId,
      canal_id:   canalActivo.id,
      usuario_id: usuarioId,
      mensaje:    msg,
      reply_to:   replyTo?.id || null,
      menciones,
    })
  }

  // ── Indicador escribiendo ─────────────────────────────
  const handleTyping = (val) => {
    setTexto(val)

    // Detectar @ para menciones
    const lastAt = val.lastIndexOf('@')
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      const query = val.slice(lastAt + 1).split(' ')[0]
      setMencionQuery(query)
      setShowMenciones(true)
    } else {
      setShowMenciones(false)
    }
  }

  const insertMencion = (nombre) => {
    const lastAt = texto.lastIndexOf('@')
    setTexto(texto.slice(0, lastAt) + `@${nombre} `)
    setShowMenciones(false)
    inputRef.current?.focus()
  }

  const usuariosFiltrados = showMenciones
    ? usuarios.filter(u => u.nombre?.toLowerCase().includes(mencionQuery.toLowerCase()) && u.id !== usuarioId)
    : []

  // ── Online count ──────────────────────────────────────
  const onlineCount = presencia.filter(p => p.en_linea).length

  // ── Agrupar mensajes por fecha ────────────────────────
  const msgConFecha = []
  let lastDate = null
  mensajes.forEach(msg => {
    const d = new Date(msg.created_at).toDateString()
    if (d !== lastDate) {
      msgConFecha.push({ type: 'date', date: d, id: `date_${d}` })
      lastDate = d
    }
    msgConFecha.push({ type: 'msg', ...msg })
  })

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#F0F4F8' }}>

      {/* Modal confirmar borrar canal */}
      {confirmDelCanal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg">🗑</div>
              <div>
                <p className="font-semibold text-gray-800">{isEs ? 'Eliminar canal' : 'Delete channel'}</p>
                <p className="text-xs text-gray-400">#{confirmDelCanal.nombre}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {isEs ? 'Se eliminarán todos los mensajes de este canal. Esta acción no se puede deshacer.' : 'All messages in this channel will be deleted. This cannot be undone.'}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelCanal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={() => borrarCanal(confirmDelCanal)}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-red-500 hover:bg-red-600">
                {isEs ? 'Eliminar' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div className="w-64 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: BRAND_DARK }}>

        {/* Header sidebar */}
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: `${BRAND}80` }}>
          <div>
            <h2 className="text-white font-semibold text-sm">{isEs ? 'Chat interno' : 'Internal chat'}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#7FA8D4' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1" />
              {onlineCount} {isEs ? 'en línea' : 'online'}
            </p>
          </div>
          <button onClick={() => setModalCanal(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
            style={{ color: '#7FA8D4' }} title={isEs ? 'Nuevo canal' : 'New channel'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Canales */}
        <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5">
          <p className="text-xs font-semibold px-2 py-1 uppercase tracking-wider" style={{ color: '#4A7BA8' }}>
            {isEs ? 'Canales' : 'Channels'}
          </p>
          {canales.map(c => (
            <div key={c.id} className="flex items-center gap-1 group/canal">
              <div className="flex-1">
                <CanalItem canal={c} activo={canalActivo?.id === c.id}
                  onClick={() => setCanalActivo(c)} noLeidos={noLeidos[c.id] || 0} isEs={isEs} />
              </div>
              {c.tipo !== 'general' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelCanal(c) }}
                  className="opacity-0 group-hover/canal:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/20 flex-shrink-0"
                  style={{ color: '#ef4444' }}
                  title={isEs ? 'Eliminar canal' : 'Delete channel'}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Usuarios conectados */}
        <div className="border-t px-3 py-3" style={{ borderColor: `${BRAND}80` }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4A7BA8' }}>
            {isEs ? 'Equipo' : 'Team'}
          </p>
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
            {usuarios.map(u => {
              const online = presencia.find(p => p.usuario_id === u.id)?.en_linea
              return (
                <div key={u.id} className="flex items-center gap-2">
                  <Avatar nombre={u.nombre} size={6} online={online} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">{u.nombre}</p>
                    <p className="text-[10px] capitalize" style={{ color: '#4A7BA8' }}>{u.rol?.replace('_', ' ')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── AREA DE CHAT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!canalActivo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-sm font-medium">{isEs ? 'Selecciona un canal' : 'Select a channel'}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header canal */}
            <div className="flex-shrink-0 px-5 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">{canalActivo.tipo === 'general' ? '📢' : '💬'}</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{canalActivo.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {canalActivo.tipo === 'general'
                      ? (isEs ? 'Todos los miembros' : 'All members')
                      : `${usuarios.length} ${isEs ? 'participantes' : 'participants'}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Avatares de participantes online */}
                {presencia.filter(p => p.en_linea).slice(0, 5).map(p => {
                  const u = usuarios.find(u => u.id === p.usuario_id)
                  return u ? <Avatar key={u.id} nombre={u.nombre} size={7} online={true} /> : null
                })}
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-[#1B3A6B] rounded-full animate-spin" />
                </div>
              ) : msgConFecha.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-sm">{isEs ? 'Sé el primero en escribir' : 'Be the first to write'}</p>
                </div>
              ) : (
                msgConFecha.map(item => {
                  if (item.type === 'date') {
                    return (
                      <div key={item.id} className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium px-2">
                          {new Date(item.date).toLocaleDateString(isEs ? 'es' : 'en', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    )
                  }
                  const replyMsg = item.reply_to ? mensajes.find(m => m.id === item.reply_to) : null
                  return (
                    <Mensaje
                      key={item.id}
                      msg={item}
                      isMine={item.usuario_id === usuarioId}
                      usuarios={usuarios}
                      presencia={presencia}
                      onReply={setReplyTo}
                      replyMsg={replyMsg}
                      isEs={isEs}
                    />
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className="flex-shrink-0 mx-4 px-3 py-2 bg-blue-50 border-l-4 border-blue-400 rounded-lg flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-600">
                    {isEs ? 'Respondiendo a' : 'Replying to'} {usuarios.find(u => u.id === replyTo.usuario_id)?.nombre}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{replyTo.mensaje}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Sugerencias de menciones */}
            {showMenciones && usuariosFiltrados.length > 0 && (
              <div className="flex-shrink-0 mx-4 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {usuariosFiltrados.slice(0, 5).map(u => (
                  <button key={u.id} onClick={() => insertMencion(u.nombre)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left">
                    <Avatar nombre={u.nombre} size={6} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{u.nombre}</p>
                      <p className="text-xs text-gray-400 capitalize">{u.rol?.replace('_', ' ')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-100">
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-[#1B3A6B] transition-colors">
                <textarea
                  ref={inputRef}
                  className="flex-1 bg-transparent text-sm text-gray-800 resize-none focus:outline-none min-h-[36px] max-h-32 py-1 placeholder-gray-400"
                  placeholder={isEs ? `Mensaje en #${canalActivo.nombre}... (usa @ para mencionar)` : `Message in #${canalActivo.nombre}... (use @ to mention)`}
                  value={texto}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
                    if (e.key === 'Escape') { setReplyTo(null); setShowMenciones(false) }
                  }}
                  rows={1}
                />
                <button
                  onClick={enviar}
                  disabled={!texto.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-all flex-shrink-0 mb-0.5"
                  style={{ background: texto.trim() ? BRAND : '#9CA3AF' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 px-1">
                {isEs ? 'Enter para enviar · Shift+Enter nueva línea' : 'Enter to send · Shift+Enter new line'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Modal nuevo canal */}
      <ModalNuevoCanal
        open={modalCanal}
        onClose={() => setModalCanal(false)}
        onCrear={(canal) => {
          setCanales(prev => [...prev, canal])
          setCanalActivo(canal)
        }}
        usuarios={usuarios}
        proyectos={proyectos}
        tenantId={tenantId}
        usuarioId={usuarioId}
        isEs={isEs}
      />
    </div>
  )
}
