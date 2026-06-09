/**
 * WelcomeTour.jsx
 * ---------------
 * Tour de bienvenida — se muestra la PRIMERA VEZ que cualquier usuario
 * entra a MARY. Funciona para todos los roles sin excepción.
 *
 * INTEGRACIÓN:
 *   import WelcomeTour from './pages/WelcomeTour'
 *   // Dentro del árbol autenticado en App.jsx o Layout:
 *   {perfil && <WelcomeTour />}
 *
 * CÓMO DETECTA "primera vez":
 *   Lee tour_completado desde public.usuarios (columna recién migrada).
 *   Al cerrar/terminar → UPDATE tour_completado = true.
 *   localStorage actúa como caché para evitar parpadeo en recargas.
 *
 * DEPENDENCIAS (ya en el proyecto):
 *   - ../auth     → useAuth() { perfil }
 *   - ../supabase → supabase (cliente directo)
 *   - ../i18n     → LangContext
 */

import { useState, useEffect, useCallback, useContext } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../supabase'
import { LangContext } from '../i18n'

// ─── Botón de idioma inline ────────────────────────────────────────────────
function LangBtn({ lang, toggleLang }) {
  return (
    <button
      onClick={toggleLang}
      title={lang === 'ES' ? 'Switch to English' : 'Cambiar a Español'}
      style={{
        border: '1.5px solid rgba(255,255,255,0.25)',
        background: 'rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.85)',
        borderRadius: 7,
        padding: '4px 11px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.07em',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
        lineHeight: 1.4,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
    >
      🌐 {lang === 'ES' ? 'EN' : 'ES'}
    </button>
  )
}

// ─── Contenido bilingüe ────────────────────────────────────────────────────

const CONTENT = {
  ES: {
    badge:    'MARY · Management And Resources Yield',
    welcome:  nombre => `¡Hola${nombre ? `, ${nombre}` : ''}!`,
    subtitle: 'Tu plataforma de gestión de construcción está lista. Aquí tienes un recorrido rápido — puedes saltarlo en cualquier momento.',
    skip:     'Omitir tour',
    next:     'Siguiente',
    prev:     'Anterior',
    finish:   '¡Empezar!',
    modulo:   'Módulo',
    counter:  (c, t) => `Paso ${c} de ${t}`,
    finalMsg: 'Ya conoces los módulos principales de MARY. ¡Comienza a gestionar tus proyectos!',
    modules: [
      { icon: '🏗️', titulo: 'Dashboard',           color: '#1B3A6B', desc: 'Tu centro de mando. Resumen de proyectos activos, avance presupuestal vs. costo real, alertas de stock crítico y órdenes de compra pendientes en tiempo real.' },
      { icon: '📁', titulo: 'Proyectos',             color: '#1D9E75', desc: 'Cada proyecto funciona como una sub-empresa con su propio personal, inventario y finanzas. Crea proyectos, define la ruta crítica y gestiona todo el ciclo de vida.' },
      { icon: '📊', titulo: 'Presupuesto',           color: '#2563EB', desc: 'Define el presupuesto base con etapas, sub-etapas y actividades. MARY genera la Curva S automáticamente comparando presupuesto vs. costo real.' },
      { icon: '📦', titulo: 'Inventario',            color: '#7C3AED', desc: 'Control completo de bodega: catálogo de materiales, entradas por orden de compra, salidas asignadas a actividades. Alertas automáticas por stock bajo mínimo.' },
      { icon: '🛒', titulo: 'Solicitudes y OC',      color: '#D97706', desc: 'Residente solicita materiales → se genera la OC → Admin la aprueba → Bodega la recibe. Flujo completo documentado y trazable.' },
      { icon: '💰', titulo: 'Control Financiero',    color: '#DC2626', desc: 'Registra nóminas, subcontratos, equipos, caja chica y costos indirectos. Cada gasto vinculado a su proyecto y actividad.' },
      { icon: '👥', titulo: 'Usuarios y Roles',      color: '#059669', desc: 'Gestiona el equipo: Admin, Gerente, Residente, Bodeguero y Contador. Cada rol con permisos específicos. Los usuarios creados por el Admin también verán este tour.' },
    ],
  },
  EN: {
    badge:    'MARY · Management And Resources Yield',
    welcome:  name => `Hi${name ? `, ${name}` : ''}!`,
    subtitle: "Your construction management platform is ready. Here's a quick tour — you can skip it anytime.",
    skip:     'Skip tour',
    next:     'Next',
    prev:     'Back',
    finish:   "Let's go!",
    modulo:   'Module',
    counter:  (c, t) => `Step ${c} of ${t}`,
    finalMsg: "You've seen MARY's main modules. Start managing your projects!",
    modules: [
      { icon: '🏗️', titulo: 'Dashboard',          color: '#1B3A6B', desc: 'Your command center. Summary of active projects, budget vs. actual cost, critical stock alerts, and pending purchase orders in real time.' },
      { icon: '📁', titulo: 'Projects',            color: '#1D9E75', desc: 'Each project works as its own sub-company with its own staff, inventory, and finances. Create projects, define the critical path, and manage the full lifecycle.' },
      { icon: '📊', titulo: 'Budget',              color: '#2563EB', desc: 'Define the base budget with stages, sub-stages, and activities. MARY automatically generates the S-Curve comparing budget vs. actual cost.' },
      { icon: '📦', titulo: 'Inventory',           color: '#7C3AED', desc: 'Full warehouse control: material catalog, entries by purchase order, exits assigned to activities. Automatic alerts when stock falls below minimum.' },
      { icon: '🛒', titulo: 'Requests & POs',      color: '#D97706', desc: 'Foreman requests materials → PO is generated → Admin approves → Warehouse receives. The entire flow documented and traceable.' },
      { icon: '💰', titulo: 'Financial Control',   color: '#DC2626', desc: 'Record payroll, subcontracts, equipment, petty cash, and indirect costs. Every expense linked to its project and activity.' },
      { icon: '👥', titulo: 'Users & Roles',       color: '#059669', desc: 'Manage the team: Admin, Manager, Foreman, Warehouse, Accountant. Each role has specific permissions. Users created by the Admin also see this tour.' },
    ],
  },
}

// ─── Helpers de estilo ─────────────────────────────────────────────────────

const btnBase = {
  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  transition: 'all 0.15s',
}

// ─── Componente principal ──────────────────────────────────────────────────

export default function WelcomeTour() {
  const { perfil }    = useAuth()
  const { lang, toggleLang } = useContext(LangContext)

  const [visible,   setVisible]   = useState(false)
  const [step,      setStep]      = useState(0)   // 0=intro, 1..N=módulos, N+1=final
  const [saliendo,  setSaliendo]  = useState(false)
  const [checking,  setChecking]  = useState(true)

  const c     = CONTENT[lang] || CONTENT.ES
  const TOTAL = c.modules.length          // 7
  const esIntro  = step === 0
  const esFinal  = step === TOTAL + 1
  const mod      = (!esIntro && !esFinal) ? c.modules[step - 1] : null

  // ── Verificar si debe mostrarse ──────────────────────────────────────────
  useEffect(() => {
    if (!perfil?.id) return

    const cacheKey = `mary_tour_${perfil.id}`

    // Caché local → no mostrar si ya se marcó en este navegador
    if (localStorage.getItem(cacheKey) === '1') {
      setChecking(false)
      return
    }

    const verificar = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('tour_completado')
        .eq('id', perfil.id)
        .single()

      if (error || data?.tour_completado) {
        // Ya completó el tour o error → no mostrar
        if (!error) localStorage.setItem(cacheKey, '1')
      } else {
        // Primera vez
        setVisible(true)
      }
      setChecking(false)
    }

    verificar()
  }, [perfil?.id])

  // ── Cerrar y marcar completado ───────────────────────────────────────────
  const cerrar = useCallback(async () => {
    setSaliendo(true)
    setTimeout(() => {
      setVisible(false)
      setSaliendo(false)
    }, 320)

    if (!perfil?.id) return

    localStorage.setItem(`mary_tour_${perfil.id}`, '1')

    await supabase
      .from('usuarios')
      .update({ tour_completado: true })
      .eq('id', perfil.id)
  }, [perfil?.id])

  const siguiente = () => {
    if (step <= TOTAL) setStep(s => s + 1)
    else cerrar()
  }

  const anterior = () => setStep(s => Math.max(0, s - 1))

  // ── Render guard ─────────────────────────────────────────────────────────
  if (checking || !visible || !perfil) return null

  const nombre = perfil.nombre?.split(' ')[0] || ''

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) cerrar() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(8,18,40,0.78)',
        backdropFilter: 'blur(8px)',
        opacity:   saliendo ? 0 : 1,
        transition: 'opacity 0.32s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        borderRadius: 20,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        transform:  saliendo ? 'scale(0.93) translateY(8px)' : 'scale(1) translateY(0)',
        transition: 'transform 0.32s cubic-bezier(0.34,1.2,0.64,1)',
      }}>

        {/* ══ CABECERA ════════════════════════════════════════════════════ */}
        <div style={{
          background: '#1B3A6B', padding: '24px 28px 20px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decoración */}
          {[[160,-50,-40,null,null,0.07],[90,10,null,null,55,0.05],[70,null,null,-15,'38%',0.06]].map(([s,top,right,bottom,left,op],i)=>(
            <div key={i} style={{ position:'absolute', width:s, height:s, borderRadius:'50%', background:'#fff', opacity:op, top, right, bottom, left }} />
          ))}

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Badge + controles */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                {c.badge}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LangBtn lang={lang} toggleLang={toggleLang} />
                <button onClick={cerrar} style={{
                  ...btnBase,
                  background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
                  borderRadius: 7, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                }}>
                  {c.skip} ✕
                </button>
              </div>
            </div>

            {/* Título */}
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>
              {esIntro  ? c.welcome(nombre) :
               esFinal  ? (lang==='ES' ? '¡Todo listo!' : "You're all set!") :
               mod?.titulo}
            </h2>
            {esIntro && (
              <p style={{ margin: '7px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>
                {c.subtitle}
              </p>
            )}

            {/* Barra de progreso */}
            <div style={{ marginTop: 16, height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99, background: '#1D9E75',
                width: `${(step / (TOTAL + 2)) * 100}%`,
                transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>
              {c.counter(step + 1, TOTAL + 2)}
            </div>
          </div>
        </div>

        {/* ══ CUERPO ══════════════════════════════════════════════════════ */}
        <div style={{ padding: '20px 28px 4px', minHeight: 200 }}>

          {/* INTRO — grid de módulos */}
          {esIntro && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {c.modules.map((m, i) => (
                <button key={i} onClick={() => setStep(i + 1)} style={{
                  ...btnBase,
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '10px 12px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', background: '#FAFAFA',
                  textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#1F2937',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.background = `${m.color}12`; e.currentTarget.style.color = m.color }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.color = '#1F2937' }}
                >
                  <span style={{ fontSize: 17 }}>{m.icon}</span>
                  <span>{m.titulo}</span>
                </button>
              ))}
            </div>
          )}

          {/* MÓDULO INDIVIDUAL */}
          {!esIntro && !esFinal && mod && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 13, flexShrink: 0,
                  background: `${mod.color}15`, border: `2px solid ${mod.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>
                  {mod.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: mod.color }}>
                    {c.modulo}
                  </p>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>{mod.titulo}</p>
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.75, margin: 0 }}>
                {mod.desc}
              </p>
              {/* Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 18 }}>
                {c.modules.map((m, i) => (
                  <button key={i} onClick={() => setStep(i + 1)} style={{
                    ...btnBase,
                    width: (i + 1 === step) ? 22 : 7, height: 7,
                    borderRadius: 99, padding: 0,
                    background: (i + 1 === step) ? mod.color : '#D1D5DB',
                    transition: 'all 0.25s',
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* PANTALLA FINAL */}
          {esFinal && (
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#1D9E7515', border: '2px solid #1D9E7530',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 14px',
              }}>
                ✅
              </div>
              <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.75, margin: 0 }}>
                {c.finalMsg}
              </p>
            </div>
          )}
        </div>

        {/* ══ PIE — navegación ════════════════════════════════════════════ */}
        <div style={{
          padding: '16px 28px 24px',
          display: 'flex', alignItems: 'center',
          justifyContent: step === 0 ? 'flex-end' : 'space-between',
        }}>
          {step > 0 && (
            <button onClick={anterior} style={{
              ...btnBase,
              background: 'none', border: '1.5px solid #D1D5DB',
              color: '#6B7280', borderRadius: 10, padding: '9px 20px',
              fontSize: 13, fontWeight: 600,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#9CA3AF'; e.currentTarget.style.color = '#374151' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#6B7280' }}
            >
              ← {c.prev}
            </button>
          )}
          <button onClick={siguiente} style={{
            ...btnBase,
            background: esFinal ? '#1D9E75' : '#1B3A6B',
            color: '#fff', borderRadius: 10, padding: '9px 24px',
            fontSize: 13, fontWeight: 700,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = esFinal ? '#178A68' : '#16305A' }}
          onMouseLeave={e => { e.currentTarget.style.background = esFinal ? '#1D9E75' : '#1B3A6B' }}
          >
            {esFinal ? `✓ ${c.finish}` : `${c.next} →`}
          </button>
        </div>

      </div>
    </div>
  )
}
