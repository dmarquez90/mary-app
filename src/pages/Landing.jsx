import { useState, useEffect, useRef, useMemo } from 'react'
import { LANDING, PAISES_LANDING } from './landingCopy'
import { LegalModal } from './Login'
import { PLAN_PRECIOS, calcPrecio, calcPrecioAnual } from '../plans'

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────
const BG        = '#060E1D'
const NAVY_900  = '#0B1C36'
const BLUE_600  = '#1650A0'
const BLUE_500  = '#1A5EB4'
const BLUE_400  = '#2E78D6'
const BLUE_200  = '#93B8D8'
const CYAN      = '#26D4FF'
const GREEN_500 = '#1A9E5C'
const GREEN_400 = '#25C173'
const WHITE     = '#FFFFFF'

const TXT       = 'rgba(214,230,248,0.92)'
const TXT_SOFT  = 'rgba(147,184,216,0.72)'
const TXT_DIM   = 'rgba(147,184,216,0.48)'
const LINE      = 'rgba(127,168,212,0.14)'
const CARD_BG   = 'rgba(18,40,72,0.42)'

// ── HELPERS ───────────────────────────────────────────────────────────────
function detectLang() {
  const saved = localStorage.getItem('mary_lang')
  if (saved === 'ES' || saved === 'EN') return saved
  const browser = (navigator.language || navigator.languages?.[0] || 'es').toLowerCase()
  return browser.startsWith('es') ? 'ES' : 'EN'
}

function scrollToId(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Observa todos los [data-reveal] y los anima al entrar en pantalla
function useRevealOnScroll(deps = []) {
  useEffect(() => {
    const nodes = document.querySelectorAll('[data-reveal]:not(.is-in)')
    if (!nodes.length) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    nodes.forEach(n => io.observe(n))
    return () => io.disconnect()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}

// Devuelve true la primera vez que el elemento entra en pantalla
function useInView(threshold = 0.25) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect() }
    }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView]
}

// Contador animado que arranca cuando el elemento entra en pantalla
function useCountUp(target, duration = 1400) {
  const ref = useRef(null)
  const [value, setValue] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = null
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(Math.round(target * eased))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [target, duration])
  return [ref, value]
}

// ── ICONOS DE MÓDULOS ─────────────────────────────────────────────────────
const S = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

const MODULE_ICONS = {
  dashboard:  <svg {...S}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  proyectos:  <svg {...S}><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>,
  presupuesto:<svg {...S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>,
  matpres:    <svg {...S}><path d="M20 7 12 3 4 7l8 4 8-4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>,
  inventario: <svg {...S}><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 9 5 4h14l2 5"/><path d="M10 13h4"/></svg>,
  compras:    <svg {...S}><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/></svg>,
  ordenes:    <svg {...S}><path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M20 9A8 8 0 0 0 6.3 5.3L4 7.6"/><path d="M4 15a8 8 0 0 0 13.7 3.7L20 16.4"/></svg>,
  avaluos:    <svg {...S}><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  financiero: <svg {...S}><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>,
  curvas:     <svg {...S}><path d="M3 21V3"/><path d="M3 21h18"/><path d="M6 17c3.5 0 4-9 8-9 2.5 0 3.5 4 6 4"/></svg>,
  reportes:   <svg {...S}><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7" rx="1"/><rect x="12.5" y="7" width="3" height="11" rx="1"/><rect x="18" y="13" width="3" height="5" rx="1"/></svg>,
  supervision:<svg {...S}><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z"/><path d="m9 11 2 2 4-4"/></svg>,
  chat:       <svg {...S}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.6L3 21l1.8-5A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/></svg>,
  auditoria:  <svg {...S}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M8.5 11h5M11 8.5v5"/></svg>,
  config:     <svg {...S}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>,
}

const SECURITY_ICONS = [
  <svg key="a" {...S}><rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/><path d="M7 9v6M17 9v6"/></svg>,
  <svg key="b" {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>,
  <svg key="c" {...S}><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  <svg key="d" {...S}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>,
  <svg key="e" {...S}><path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9"/><circle cx="9" cy="10" r="2"/><path d="m5 18 4-3 3 2"/><path d="M17 17v4M15 19h4"/></svg>,
  <svg key="f" {...S}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9z"/></svg>,
]

const AUDIENCE_ICONS = [
  <svg key="a" {...S}><path d="M3 21h18"/><path d="M6 21V8l6-4 6 4v13"/><path d="M10 12h4M10 16h4"/></svg>,
  <svg key="b" {...S}><path d="M2 20h20"/><path d="m5 20 2-8 5-2 5 2 2 8"/><circle cx="12" cy="6" r="3"/></svg>,
  <svg key="c" {...S}><path d="M9 11 12 14l5-6"/><path d="M20 12a8 8 0 1 1-4.2-7"/></svg>,
  <svg key="d" {...S}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>,
]

const TRAINING_ICONS = [
  <svg key="a" {...S}><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>,
  <svg key="b" {...S}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>,
  <svg key="c" {...S}><rect x="2" y="4" width="14" height="12" rx="2"/><path d="m16 9 6-3v10l-6-3"/></svg>,
  <svg key="d" {...S}><path d="M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-1.5z"/><path d="M8 7h7M8 11h7"/></svg>,
]

// ── UI ATOMS ──────────────────────────────────────────────────────────────
const Badge = ({ children, tone = 'blue' }) => {
  const c = tone === 'green'
    ? { bg: 'rgba(26,158,92,0.14)', bd: 'rgba(26,158,92,0.34)', fg: '#5FD79B' }
    : { bg: 'rgba(26,94,180,0.16)', bd: 'rgba(46,120,214,0.34)', fg: '#8FB8E8' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '6px 14px', borderRadius: 9999,
      background: c.bg, border: `1px solid ${c.bd}`,
      fontSize: 11.5, fontWeight: 600, color: c.fg, letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      <span className="anim-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: c.fg, flexShrink: 0 }} />
      {children}
    </span>
  )
}

const SectionHead = ({ badge, title, sub, align = 'center', tone }) => (
  <div data-reveal style={{ textAlign: align, maxWidth: align === 'center' ? 760 : 620, margin: align === 'center' ? '0 auto' : 0 }}>
    {badge && <Badge tone={tone}>{badge}</Badge>}
    <h2 style={{
      margin: '18px 0 0', color: WHITE, fontWeight: 800,
      fontSize: 'clamp(26px, 4vw, 42px)', lineHeight: 1.15, letterSpacing: '-0.02em',
    }}>
      {title}
    </h2>
    {sub && (
      <p style={{ margin: '14px 0 0', color: TXT_SOFT, fontSize: 'clamp(14px,1.6vw,16.5px)', lineHeight: 1.7 }}>
        {sub}
      </p>
    )}
  </div>
)

const Check = ({ color = GREEN_400, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const Cross = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#E4776B" strokeWidth="2.4" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const MaryMark = ({ size = 34 }) => (
  <svg viewBox="0 0 90 90" style={{ width: size, height: size, display: 'block', flexShrink: 0 }} aria-hidden="true">
    <g transform="translate(5,5)">
      <rect x="14" y="38" width="12" height="22" rx="2" fill={BLUE_200} opacity="0.65"/>
      <rect x="28" y="28" width="12" height="32" rx="2" fill={BLUE_200} opacity="0.78"/>
      <rect x="42" y="18" width="12" height="42" rx="2" fill={BLUE_200} opacity="0.9"/>
      <rect x="30" y="18" width="14" height="14" rx="3" fill={GREEN_500}/>
      <rect x="45" y="10" width="11" height="11" rx="3" fill={CYAN} opacity="0.85"/>
      <line x1="45" y1="22" x2="62" y2="3" stroke={GREEN_500} strokeWidth="2.5"/>
      <polygon points="62,0 67,8 57,8" fill={GREEN_500}/>
    </g>
  </svg>
)

// Botones
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  padding: '14px 26px', borderRadius: 12, border: 'none',
  background: `linear-gradient(135deg, ${BLUE_500} 0%, ${BLUE_400} 60%, ${CYAN} 190%)`,
  color: WHITE, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, letterSpacing: '0.01em',
  cursor: 'pointer', whiteSpace: 'nowrap',
  boxShadow: '0 8px 30px rgba(26,94,180,0.42), inset 0 1px 0 rgba(255,255,255,0.18)',
  transition: 'transform 140ms ease, box-shadow 140ms ease, filter 140ms ease',
}

const btnGhost = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  padding: '14px 24px', borderRadius: 12,
  border: `1px solid rgba(127,168,212,0.28)`,
  background: 'rgba(147,184,216,0.06)',
  color: TXT, fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'background 140ms ease, border-color 140ms ease, transform 140ms ease',
}

const hoverLift = {
  onMouseEnter: e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.06)' },
  onMouseLeave: e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none' },
}

// ── GRÁFICO CURVA S ───────────────────────────────────────────────────────
const PLAN_DATA = [2, 6, 13, 23, 35, 48, 60, 71, 80, 88, 95, 100]
const REAL_DATA = [1.5, 5, 11.5, 21, 33.5, 46, 59, 68.5, 76]

function curvePath(values, w, h, pad) {
  const maxX = PLAN_DATA.length - 1
  const pts = values.map((v, i) => [
    pad + (i / maxX) * (w - pad * 2),
    h - pad - (v / 100) * (h - pad * 2),
  ])
  // Suavizado tipo catmull-rom → bezier
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`
  }
  return { d, pts }
}

function SCurveChart({ w = 560, h = 280, compact = false, legendPlan, legendReal }) {
  const pad = compact ? 16 : 34
  const plan = useMemo(() => curvePath(PLAN_DATA, w, h, pad), [w, h, pad])
  const real = useMemo(() => curvePath(REAL_DATA, w, h, pad), [w, h, pad])
  const last = real.pts[real.pts.length - 1]
  const [ref, inView] = useInView(0.3)

  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }} role="img" aria-label="S-Curve">
      <defs>
        <linearGradient id="scArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLUE_400} stopOpacity="0.34" />
          <stop offset="100%" stopColor={BLUE_400} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="scReal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GREEN_500} />
          <stop offset="100%" stopColor={CYAN} />
        </linearGradient>
      </defs>

      {/* Rejilla */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = pad + f * (h - pad * 2)
        return <line key={f} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(127,168,212,0.13)" strokeWidth="1" strokeDasharray="3 6" />
      })}
      {!compact && [0, 0.25, 0.5, 0.75, 1].map(f => (
        <text key={`l${f}`} x={pad - 8} y={pad + f * (h - pad * 2) + 4} textAnchor="end"
          fill="rgba(147,184,216,0.42)" fontSize="9.5" fontFamily="Inter, sans-serif">
          {Math.round((1 - f) * 100)}%
        </text>
      ))}

      {/* Área bajo el presupuesto */}
      <path d={`${plan.d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#scArea)"
        className={inView ? 'anim-fade-in' : ''} style={{ opacity: inView ? undefined : 0 }} />

      {/* Presupuesto (punteado) */}
      <path d={plan.d} fill="none" stroke={BLUE_400} strokeWidth={compact ? 2 : 2.4}
        strokeDasharray="7 6" strokeLinecap="round"
        className={inView ? 'anim-draw-dashed' : ''} style={{ opacity: inView ? 1 : 0, animationDelay: '.15s' }} />

      {/* Real */}
      <path d={real.d} fill="none" stroke="url(#scReal)" strokeWidth={compact ? 2.4 : 3.2}
        strokeLinecap="round"
        className={inView ? 'anim-draw' : ''} style={{ opacity: inView ? 1 : 0, animationDelay: '.45s' }} />

      {/* Punto actual */}
      <circle cx={last[0]} cy={last[1]} r={compact ? 9 : 12} fill={GREEN_400} opacity="0.16" className="anim-pulse" />
      <circle cx={last[0]} cy={last[1]} r={compact ? 3.4 : 4.4} fill={GREEN_400} stroke={BG} strokeWidth="1.5" />

      {!compact && (
        <g>
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(127,168,212,0.24)" strokeWidth="1" />
          {['M1','M3','M5','M7','M9','M11'].map((m, i) => (
            <text key={m} x={pad + (i * 2 / (PLAN_DATA.length - 1)) * (w - pad * 2)} y={h - pad + 16}
              textAnchor="middle" fill="rgba(147,184,216,0.42)" fontSize="9.5" fontFamily="Inter, sans-serif">{m}</text>
          ))}
          <g transform={`translate(${pad + 8}, ${pad + 2})`}>
            <line x1="0" y1="0" x2="18" y2="0" stroke={BLUE_400} strokeWidth="2.4" strokeDasharray="6 5" strokeLinecap="round" />
            <text x="24" y="3.5" fill={TXT_DIM} fontSize="10.5" fontFamily="Inter, sans-serif">{legendPlan}</text>
            <line x1="0" y1="16" x2="18" y2="16" stroke={GREEN_400} strokeWidth="3" strokeLinecap="round" />
            <text x="24" y="19.5" fill={TXT_DIM} fontSize="10.5" fontFamily="Inter, sans-serif">{legendReal}</text>
          </g>
        </g>
      )}
    </svg>
  )
}

// ── MOCKUP DEL PRODUCTO (hero) ────────────────────────────────────────────
function ProductMockup({ hero }) {
  const [row, setRow] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setRow(r => (r + 1) % hero.mockRows.length), 2600)
    return () => clearInterval(id)
  }, [hero.mockRows.length])

  return (
    <div className="anim-float" style={{
      position: 'relative',
      borderRadius: 18,
      border: `1px solid rgba(127,168,212,0.20)`,
      background: 'linear-gradient(160deg, rgba(18,40,72,0.92) 0%, rgba(11,28,54,0.96) 100%)',
      boxShadow: '0 40px 90px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(46,120,214,0.10)',
      overflow: 'hidden',
    }}>
      {/* Barra del navegador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: `1px solid ${LINE}`, background: 'rgba(6,14,29,0.5)' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E4776B' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E8B558' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: GREEN_400 }} />
        <div style={{ marginLeft: 8, flex: 1, height: 20, borderRadius: 6, background: 'rgba(127,168,212,0.08)', border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', padding: '0 9px' }}>
          <span style={{ fontSize: 9.5, color: TXT_DIM, letterSpacing: '0.04em' }}>app.marquezprojectsolutions.com</span>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MaryMark size={18} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: WHITE, letterSpacing: '0.03em' }}>{hero.mockTitle}</span>
          </div>
          <span style={{ fontSize: 9.5, color: GREEN_400, background: 'rgba(26,158,92,0.13)', border: `1px solid rgba(26,158,92,0.28)`, borderRadius: 999, padding: '3px 9px', fontWeight: 600 }}>
            ● live
          </span>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {hero.mockKpis.map((k, i) => (
            <div key={i} style={{ background: 'rgba(127,168,212,0.06)', border: `1px solid ${LINE}`, borderRadius: 10, padding: '9px 10px' }}>
              <p style={{ margin: 0, fontSize: 8.5, color: TXT_DIM, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{k.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, fontWeight: 800, color: i === 2 ? GREEN_400 : WHITE, fontVariantNumeric: 'tabular-nums' }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Gráfico */}
        <div style={{ background: 'rgba(6,14,29,0.5)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 12px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: TXT_SOFT, fontWeight: 600 }}>{hero.mockChart}</span>
            <span style={{ display: 'flex', gap: 10, fontSize: 9, color: TXT_DIM }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 2, background: BLUE_400, display: 'inline-block', borderRadius: 2 }} />{hero.mockLegendPlan}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 2, background: GREEN_400, display: 'inline-block', borderRadius: 2 }} />{hero.mockLegendReal}
              </span>
            </span>
          </div>
          <SCurveChart w={420} h={150} compact />
        </div>

        {/* Actividad rotativa */}
        <div style={{ marginTop: 10, background: 'rgba(127,168,212,0.05)', border: `1px solid ${LINE}`, borderRadius: 10, padding: '9px 11px', overflow: 'hidden' }}>
          <div key={row} className="anim-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: CYAN, flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: TXT_SOFT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hero.mockRows[row]}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── NAV ───────────────────────────────────────────────────────────────────
function Nav({ t, lang, setLang, onNavigate }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24)
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    ['modulos', t.nav.modules],
    ['flujo', t.nav.flow],
    ['curva', t.nav.scurve],
    ['planes', t.nav.pricing],
    ['capacitacion', t.nav.training],
    ['faq', t.nav.faq],
  ]

  const go = (id) => { setOpen(false); scrollToId(id) }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      background: scrolled ? 'rgba(6,14,29,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: `1px solid ${scrolled ? LINE : 'transparent'}`,
      transition: 'background 220ms ease, border-color 220ms ease',
    }}>
      <div style={{ height: 2, background: 'transparent' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${GREEN_500}, ${BLUE_400}, ${CYAN})`, transition: 'width 90ms linear' }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <MaryMark size={28} />
          <span style={{ fontSize: 19, fontWeight: 900, color: WHITE, letterSpacing: 2 }}>MARY</span>
        </button>

        <nav className="ld-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(([id, label]) => (
            <button key={id} onClick={() => go(id)} className="ld-navlink"
              style={{ background: 'none', border: 'none', color: TXT_SOFT, fontSize: 13.5, fontWeight: 500, padding: '8px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <button onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')} title="ES / EN"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: TXT_SOFT, background: 'rgba(147,184,216,0.07)', border: `1px solid ${LINE}`, borderRadius: 8, padding: '7px 11px', cursor: 'pointer', fontFamily: 'inherit' }}>
            🌐 {lang === 'ES' ? 'EN' : 'ES'}
          </button>

          <button onClick={() => onNavigate('/login')} className="ld-desktop"
            style={{ ...btnGhost, padding: '9px 16px', fontSize: 13.5 }}>
            {t.nav.login}
          </button>

          <button onClick={() => onNavigate('/registro')} {...hoverLift}
            style={{ ...btnPrimary, padding: '10px 18px', fontSize: 13.5 }}>
            {t.nav.trial}
          </button>

          <button onClick={() => setOpen(o => !o)} aria-label={t.nav.menu} className="ld-mobile"
            style={{ background: 'rgba(147,184,216,0.07)', border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 9px', cursor: 'pointer', color: TXT, lineHeight: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="ld-mobile anim-slide-up" style={{ borderTop: `1px solid ${LINE}`, background: 'rgba(6,14,29,0.98)', padding: '10px 20px 18px' }}>
          {links.map(([id, label]) => (
            <button key={id} onClick={() => go(id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${LINE}`, color: TXT, fontSize: 15, padding: '13px 2px', cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
          <button onClick={() => onNavigate('/login')} style={{ ...btnGhost, width: '100%', marginTop: 14 }}>
            {t.nav.login}
          </button>
        </div>
      )}
    </header>
  )
}

// ── HERO ──────────────────────────────────────────────────────────────────
function Hero({ t, onNavigate }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 128, paddingBottom: 70 }}>
      {/* Fondo: rejilla de planos + glows */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(127,168,212,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(127,168,212,0.055) 1px, transparent 1px)`,
        backgroundSize: '54px 54px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 78%)',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 78%)',
      }} />
      <div aria-hidden className="anim-drift" style={{
        position: 'absolute', top: '-28%', left: '-10%', width: '70%', height: '90%',
        background: 'radial-gradient(circle at 40% 40%, rgba(26,94,180,0.40) 0%, transparent 62%)',
        filter: 'blur(18px)', pointerEvents: 'none',
      }} />
      <div aria-hidden className="anim-drift-slow" style={{
        position: 'absolute', top: '-10%', right: '-14%', width: '62%', height: '80%',
        background: 'radial-gradient(circle at 60% 40%, rgba(38,212,255,0.16) 0%, transparent 60%)',
        filter: 'blur(22px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        <div className="ld-hero-grid">
          <div>
            <div data-reveal><Badge>{t.hero.badge}</Badge></div>

            <h1 data-reveal style={{
              margin: '22px 0 0', color: WHITE, fontWeight: 800,
              fontSize: 'clamp(32px, 5.2vw, 58px)', lineHeight: 1.08, letterSpacing: '-0.03em',
              transitionDelay: '60ms',
            }}>
              {t.hero.title1}{' '}
              <span style={{
                background: `linear-gradient(100deg, ${GREEN_400} 0%, ${CYAN} 45%, ${BLUE_400} 100%)`,
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>
                {t.hero.titleHl}
              </span>{' '}
              {t.hero.title2}
            </h1>

            <p data-reveal style={{ margin: '20px 0 0', color: TXT_SOFT, fontSize: 'clamp(15px,1.8vw,17.5px)', lineHeight: 1.72, maxWidth: 560, transitionDelay: '120ms' }}>
              {t.hero.sub}
            </p>

            <div data-reveal style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30, transitionDelay: '180ms' }}>
              <button onClick={() => onNavigate('/registro')} style={btnPrimary} {...hoverLift}>
                {t.hero.cta1}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button onClick={() => scrollToId('capacitacion')} style={btnGhost}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(147,184,216,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(147,184,216,0.06)' }}>
                {t.hero.cta2}
              </button>
            </div>

            <p data-reveal style={{ margin: '18px 0 0', fontSize: 12.5, color: TXT_DIM, transitionDelay: '240ms' }}>
              {t.hero.micro}
            </p>
          </div>

          <div data-reveal style={{ transitionDelay: '200ms' }}>
            <ProductMockup hero={t.hero} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── STATS ─────────────────────────────────────────────────────────────────
function StatItem({ stat }) {
  const [ref, value] = useCountUp(stat.value)
  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '4px 10px' }}>
      <p style={{
        margin: 0, fontSize: 'clamp(28px,4.4vw,40px)', fontWeight: 800, letterSpacing: '-0.02em',
        background: `linear-gradient(120deg, ${WHITE}, ${BLUE_200})`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}{stat.suffix}
      </p>
      <p style={{ margin: '5px 0 0', fontSize: 12.5, color: TXT_DIM, lineHeight: 1.5 }}>{stat.label}</p>
    </div>
  )
}

function StatsStrip({ t }) {
  return (
    <section style={{ padding: '10px 20px 60px' }}>
      <div data-reveal style={{
        maxWidth: 1000, margin: '0 auto', padding: '26px 18px', borderRadius: 18,
        background: 'linear-gradient(120deg, rgba(18,40,72,0.62), rgba(11,28,54,0.38))',
        border: `1px solid ${LINE}`,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10,
      }}>
        {t.stats.map((s, i) => <StatItem key={i} stat={s} />)}
      </div>
    </section>
  )
}

// ── PROBLEMA / SOLUCIÓN ───────────────────────────────────────────────────
function ProblemSection({ t }) {
  const p = t.problem
  return (
    <section style={{ padding: '70px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead badge={p.badge} title={p.title} sub={p.sub} />
        <div className="ld-two-col" style={{ marginTop: 44 }}>
          <div data-reveal style={{
            padding: '26px 24px', borderRadius: 16,
            background: 'rgba(120,40,40,0.07)', border: '1px solid rgba(228,119,107,0.20)',
          }}>
            <p style={{ margin: '0 0 18px', fontSize: 13, fontWeight: 700, color: '#E4776B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {p.beforeTitle}
            </p>
            {p.before.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 13 }}>
                <Cross />
                <span style={{ fontSize: 14.5, color: 'rgba(214,230,248,0.62)', lineHeight: 1.55 }}>{item}</span>
              </div>
            ))}
          </div>

          <div data-reveal style={{
            padding: '26px 24px', borderRadius: 16, transitionDelay: '100ms',
            background: 'linear-gradient(150deg, rgba(26,158,92,0.09), rgba(26,94,180,0.07))',
            border: '1px solid rgba(37,193,115,0.26)',
            boxShadow: '0 20px 60px -34px rgba(26,158,92,0.5)',
          }}>
            <p style={{ margin: '0 0 18px', fontSize: 13, fontWeight: 700, color: GREEN_400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {p.afterTitle}
            </p>
            {p.after.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 13 }}>
                <Check />
                <span style={{ fontSize: 14.5, color: TXT, lineHeight: 1.55 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── MÓDULOS ───────────────────────────────────────────────────────────────
function ModulesSection({ t }) {
  const m = t.modules
  const [filter, setFilter] = useState('all')
  const filters = [
    ['all', m.filters.all],
    ['obra', m.filters.obra],
    ['compras', m.filters.compras],
    ['finanzas', m.filters.finanzas],
    ['control', m.filters.control],
  ]
  const items = filter === 'all' ? m.items : m.items.filter(i => i.cat === filter)

  return (
    <section id="modulos" style={{ padding: '70px 20px', scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHead badge={m.badge} title={m.title} sub={m.sub} />

        <div data-reveal style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 34 }}>
          {filters.map(([id, label]) => {
            const active = filter === id
            return (
              <button key={id} onClick={() => setFilter(id)}
                style={{
                  padding: '9px 16px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 600,
                  color: active ? WHITE : TXT_SOFT,
                  background: active ? `linear-gradient(135deg, ${BLUE_600}, ${BLUE_400})` : 'rgba(147,184,216,0.06)',
                  border: `1px solid ${active ? 'rgba(46,120,214,0.55)' : LINE}`,
                  boxShadow: active ? '0 6px 20px -8px rgba(26,94,180,0.8)' : 'none',
                  transition: 'all 160ms ease',
                }}>
                {label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 28 }}>
          {items.map((item, i) => (
            <article key={item.id} className="ld-card anim-fade-in" style={{
              position: 'relative', padding: '22px 20px', borderRadius: 15,
              background: CARD_BG, border: `1px solid ${LINE}`,
              animationDelay: `${Math.min(i, 8) * 45}ms`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(26,94,180,0.16)', border: '1px solid rgba(46,120,214,0.26)', color: BLUE_200, marginBottom: 14,
              }}>
                {MODULE_ICONS[item.id]}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: WHITE }}>{item.name}</h3>
                {item.badge && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: '3px 7px', borderRadius: 6, letterSpacing: '0.04em',
                    color: item.badge === 'ent' ? '#B6AEFF' : '#8FB8E8',
                    background: item.badge === 'ent' ? 'rgba(124,58,237,0.16)' : 'rgba(26,94,180,0.18)',
                    border: `1px solid ${item.badge === 'ent' ? 'rgba(124,58,237,0.34)' : 'rgba(46,120,214,0.30)'}`,
                  }}>
                    {item.badge === 'ent' ? m.badgeEnt : m.badgePro}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: TXT_SOFT, lineHeight: 1.62 }}>{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FLUJO ─────────────────────────────────────────────────────────────────
function FlowSection({ t }) {
  const f = t.flow
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setActive(a => (a + 1) % f.steps.length), 4800)
    return () => clearInterval(id)
  }, [auto, f.steps.length])

  const step = f.steps[active]

  return (
    <section id="flujo" style={{ padding: '70px 20px', scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead badge={f.badge} title={f.title} sub={f.sub} tone="green" />

        <div className="ld-flow-grid" style={{ marginTop: 44 }}>
          {/* Lista de pasos */}
          <div data-reveal>
            {f.steps.map((s, i) => {
              const on = i === active
              return (
                <button key={s.n} onClick={() => { setActive(i); setAuto(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                    padding: '15px 16px', marginBottom: 8, borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit',
                    background: on ? 'linear-gradient(120deg, rgba(26,94,180,0.22), rgba(26,158,92,0.08))' : 'rgba(147,184,216,0.035)',
                    border: `1px solid ${on ? 'rgba(46,120,214,0.45)' : LINE}`,
                    transition: 'all 200ms ease',
                  }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12.5, fontWeight: 800, letterSpacing: '0.02em',
                    color: on ? WHITE : TXT_DIM,
                    background: on ? `linear-gradient(135deg, ${GREEN_500}, ${BLUE_500})` : 'rgba(127,168,212,0.09)',
                    border: `1px solid ${on ? 'transparent' : LINE}`,
                  }}>
                    {s.n}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: on ? WHITE : TXT }}>{s.title}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: TXT_DIM, marginTop: 2 }}>
                      {on && auto ? f.auto : ''}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Detalle */}
          <div data-reveal style={{
            padding: '30px 28px', borderRadius: 18, transitionDelay: '100ms',
            background: 'linear-gradient(155deg, rgba(18,40,72,0.75), rgba(11,28,54,0.5))',
            border: `1px solid ${LINE}`, position: 'relative', overflow: 'hidden',
          }}>
            <div aria-hidden style={{
              position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(26,94,180,0.28), transparent 68%)',
            }} />
            <div key={active} className="anim-slide-up" style={{ position: 'relative' }}>
              <span style={{ fontSize: 46, fontWeight: 900, color: 'rgba(127,168,212,0.13)', lineHeight: 1, display: 'block' }}>{step.n}</span>
              <h3 style={{ margin: '10px 0 10px', fontSize: 22, fontWeight: 700, color: WHITE, letterSpacing: '-0.01em' }}>{step.title}</h3>
              <p style={{ margin: '0 0 20px', fontSize: 15, color: TXT_SOFT, lineHeight: 1.68 }}>{step.desc}</p>
              {step.bullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 11 }}>
                  <Check size={15} />
                  <span style={{ fontSize: 14, color: TXT, lineHeight: 1.55 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── CURVA S ───────────────────────────────────────────────────────────────
function SCurveSection({ t }) {
  const c = t.scurve
  return (
    <section id="curva" style={{ padding: '70px 20px', scrollMarginTop: 80, position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden className="anim-drift-slow" style={{
        position: 'absolute', bottom: '-30%', left: '20%', width: '60%', height: '90%',
        background: 'radial-gradient(circle, rgba(26,158,92,0.13) 0%, transparent 62%)', pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
        <div className="ld-two-col" style={{ alignItems: 'center', gap: 44 }}>
          <div>
            <SectionHead badge={c.badge} title={c.title} sub={c.sub} align="left" tone="green" />
            <div style={{ marginTop: 28 }}>
              {c.bullets.map((b, i) => (
                <div key={i} data-reveal style={{ display: 'flex', gap: 13, marginBottom: 18, transitionDelay: `${i * 70}ms` }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginTop: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(26,158,92,0.14)', border: '1px solid rgba(37,193,115,0.28)',
                  }}>
                    <Check size={15} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: WHITE }}>{b.title}</span>
                    <span style={{ display: 'block', fontSize: 13.5, color: TXT_SOFT, lineHeight: 1.6, marginTop: 3 }}>{b.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal style={{
            padding: '24px 22px 18px', borderRadius: 18,
            background: 'linear-gradient(155deg, rgba(18,40,72,0.8), rgba(6,14,29,0.72))',
            border: `1px solid ${LINE}`,
            boxShadow: '0 30px 80px -40px rgba(0,0,0,0.9)',
          }}>
            <SCurveChart w={560} h={300} legendPlan={c.legendPlan} legendReal={c.legendReal} />
            <p style={{ margin: '12px 0 0', fontSize: 11, color: TXT_DIM, textAlign: 'center' }}>{c.note}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── SEGURIDAD ─────────────────────────────────────────────────────────────
function SecuritySection({ t }) {
  const s = t.security
  return (
    <section style={{ padding: '70px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead badge={s.badge} title={s.title} sub={s.sub} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, marginTop: 40 }}>
          {s.items.map((item, i) => (
            <div key={i} data-reveal className="ld-card" style={{
              padding: '22px 20px', borderRadius: 15, background: CARD_BG, border: `1px solid ${LINE}`,
              transitionDelay: `${(i % 3) * 80}ms`,
            }}>
              <div style={{ color: BLUE_200, marginBottom: 13 }}>{SECURITY_ICONS[i % SECURITY_ICONS.length]}</div>
              <h3 style={{ margin: '0 0 7px', fontSize: 15.5, fontWeight: 700, color: WHITE }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: TXT_SOFT, lineHeight: 1.62 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── PARA QUIÉN ────────────────────────────────────────────────────────────
function AudienceSection({ t }) {
  const a = t.audience
  return (
    <section style={{ padding: '30px 20px 70px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead badge={a.badge} title={a.title} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginTop: 38 }}>
          {a.items.map((item, i) => (
            <div key={i} data-reveal className="ld-card" style={{
              padding: '24px 20px', borderRadius: 15, transitionDelay: `${i * 70}ms`,
              background: 'linear-gradient(160deg, rgba(18,40,72,0.55), rgba(11,28,54,0.3))',
              border: `1px solid ${LINE}`,
            }}>
              <div style={{ color: GREEN_400, marginBottom: 13 }}>{AUDIENCE_ICONS[i % AUDIENCE_ICONS.length]}</div>
              <h3 style={{ margin: '0 0 7px', fontSize: 15.5, fontWeight: 700, color: WHITE }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: TXT_SOFT, lineHeight: 1.62 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── PLANES ────────────────────────────────────────────────────────────────
function PricingSection({ t, onNavigate }) {
  const p = t.pricing
  const [annual, setAnnual] = useState(false)

  const planes = [
    { id: 'starter',    nombre: 'Starter',    color: BLUE_200,  accent: 'rgba(127,168,212,0.30)' },
    { id: 'pro',        nombre: 'Pro',        color: BLUE_400,  accent: 'rgba(46,120,214,0.55)', popular: true },
    { id: 'enterprise', nombre: 'Enterprise', color: '#B6AEFF', accent: 'rgba(124,58,237,0.42)' },
  ]

  return (
    <section id="planes" style={{ padding: '70px 20px', scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead badge={p.badge} title={p.title} sub={p.sub} />

        {/* Toggle mensual / anual */}
        <div data-reveal style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13, marginTop: 30 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: annual ? TXT_DIM : WHITE }}>{p.monthly}</span>
          <button onClick={() => setAnnual(a => !a)} aria-label="monthly / annual"
            style={{
              position: 'relative', width: 50, height: 27, borderRadius: 9999, cursor: 'pointer',
              background: annual ? `linear-gradient(135deg, ${GREEN_500}, ${BLUE_500})` : 'rgba(127,168,212,0.18)',
              border: `1px solid ${LINE}`, transition: 'background 200ms ease',
            }}>
            <span style={{
              position: 'absolute', top: 2.5, left: annual ? 25 : 3, width: 20, height: 20, borderRadius: '50%',
              background: WHITE, transition: 'left 200ms cubic-bezier(.4,1.4,.5,1)', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }} />
          </button>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: annual ? WHITE : TXT_DIM, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {p.annual}
            <span style={{ fontSize: 10.5, fontWeight: 700, color: GREEN_400, background: 'rgba(26,158,92,0.15)', border: '1px solid rgba(37,193,115,0.3)', borderRadius: 999, padding: '2px 7px' }}>
              {p.saveTag}
            </span>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 32, alignItems: 'start' }}>
          {planes.map((plan, i) => {
            const info = p.plans[plan.id]
            const precio = annual ? calcPrecio(plan.id, true) : PLAN_PRECIOS[plan.id]
            return (
              <div key={plan.id} data-reveal className="ld-card" style={{
                position: 'relative', padding: '28px 24px', borderRadius: 18, transitionDelay: `${i * 80}ms`,
                background: plan.popular
                  ? 'linear-gradient(165deg, rgba(26,94,180,0.20), rgba(11,28,54,0.6))'
                  : CARD_BG,
                border: `1px solid ${plan.popular ? plan.accent : LINE}`,
                boxShadow: plan.popular ? '0 28px 70px -40px rgba(26,94,180,0.95)' : 'none',
              }}>
                {plan.popular && (
                  <span style={{
                    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${GREEN_500}, ${BLUE_400})`, color: WHITE,
                    fontSize: 10.5, fontWeight: 700, padding: '5px 13px', borderRadius: 999, whiteSpace: 'nowrap',
                    boxShadow: '0 6px 18px -6px rgba(26,94,180,0.9)',
                  }}>
                    {p.popular}
                  </span>
                )}

                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {plan.nombre}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 13.5, color: TXT_SOFT, lineHeight: 1.55, minHeight: 40 }}>{info.tagline}</p>

                <div style={{ margin: '18px 0 6px', display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 15, color: TXT_DIM, fontWeight: 600 }}>$</span>
                  <span style={{ fontSize: 40, fontWeight: 800, color: WHITE, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {precio.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 14, color: TXT_DIM }}>{p.perMonth}</span>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, color: annual ? GREEN_400 : 'transparent', minHeight: 17 }}>
                  ${calcPrecioAnual(plan.id).toFixed(2)} {p.billedAnnually}
                </p>

                <div style={{ height: 1, background: LINE, margin: '20px 0' }} />

                {info.features.map((ftr, j) => (
                  <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 11 }}>
                    <Check size={15} color={plan.popular ? GREEN_400 : BLUE_200} />
                    <span style={{ fontSize: 13.5, color: TXT, lineHeight: 1.5 }}>{ftr}</span>
                  </div>
                ))}

                <button onClick={() => onNavigate('/registro')} {...hoverLift}
                  style={plan.popular
                    ? { ...btnPrimary, width: '100%', marginTop: 22 }
                    : { ...btnGhost, width: '100%', marginTop: 22 }}>
                  {p.cta}
                </button>
              </div>
            )
          })}
        </div>

        <p data-reveal style={{ textAlign: 'center', margin: '26px 0 0', fontSize: 12.5, color: TXT_DIM }}>
          {p.note}
        </p>
        <p data-reveal style={{ textAlign: 'center', margin: '10px 0 0' }}>
          <button onClick={() => scrollToId('capacitacion')}
            style={{ background: 'none', border: 'none', color: BLUE_200, fontSize: 13.5, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'inherit' }}>
            {p.ctaTraining}
          </button>
        </p>
      </div>
    </section>
  )
}

// ── CAPACITACIÓN (FORMULARIO) ─────────────────────────────────────────────
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(6,14,29,0.6)',
  border: `1px solid rgba(127,168,212,0.22)`,
  borderRadius: 10, padding: '11px 13px',
  fontFamily: 'inherit', fontSize: 14, color: WHITE, outline: 'none',
  transition: 'border-color 160ms ease, background 160ms ease',
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 5,
  color: 'rgba(180,210,255,0.62)', letterSpacing: '0.02em',
}

function Field({ label, optional, children }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{optional && <span style={{ color: TXT_DIM, fontWeight: 400 }}> · {optional}</span>}
      </label>
      {children}
    </div>
  )
}

function TrainingSection({ t, lang }) {
  const tr = t.training
  const f = tr.f
  const [form, setForm] = useState({
    nombre: '', empresa: '', email: '', telefono: '', pais: '', rol: '',
    participantes: '', modalidad: 'virtual', mensaje: '',
  })
  const [temas, setTemas]     = useState([])
  const [error, setError]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const toggleTema = (tema) => setTemas(prev => prev.includes(tema) ? prev.filter(x => x !== tema) : [...prev, tema])

  const focus = {
    onFocus: e => { e.currentTarget.style.borderColor = 'rgba(46,120,214,0.7)'; e.currentTarget.style.background = 'rgba(26,94,180,0.10)' },
    onBlur:  e => { e.currentTarget.style.borderColor = 'rgba(127,168,212,0.22)'; e.currentTarget.style.background = 'rgba(6,14,29,0.6)' },
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim() || !form.email.trim() || !form.pais) {
      setError(f.errFields); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setError(f.errEmail); return
    }

    setSending(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/solicitar-capacitacion`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            nombre:        form.nombre.trim(),
            empresa:       form.empresa.trim(),
            email:         form.email.trim(),
            telefono:      form.telefono.trim(),
            pais:          form.pais,
            rol:           form.rol,
            participantes: form.participantes ? Number(form.participantes) : null,
            modalidad:     form.modalidad,
            temas,
            mensaje:       form.mensaje.trim(),
            lang,
          }),
        }
      )
      if (res.status === 429) { setError(f.errRate); setSending(false); return }
      if (!res.ok) throw new Error('request_failed')
      setSent(true)
      setForm({ nombre: '', empresa: '', email: '', telefono: '', pais: '', rol: '', participantes: '', modalidad: 'virtual', mensaje: '' })
      setTemas([])
    } catch {
      setError(f.errGeneric)
    }
    setSending(false)
  }

  return (
    <section id="capacitacion" style={{ padding: '70px 20px', scrollMarginTop: 80, position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden className="anim-drift" style={{
        position: 'absolute', top: '10%', right: '-20%', width: '60%', height: '80%',
        background: 'radial-gradient(circle, rgba(26,94,180,0.20) 0%, transparent 62%)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
        <div className="ld-two-col" style={{ gap: 40, alignItems: 'start' }}>
          {/* Izquierda: propuesta de valor */}
          <div>
            <SectionHead badge={tr.badge} title={tr.title} sub={tr.sub} align="left" tone="green" />
            <div style={{ marginTop: 30 }}>
              {tr.points.map((pt, i) => (
                <div key={i} data-reveal style={{ display: 'flex', gap: 13, marginBottom: 20, transitionDelay: `${i * 70}ms` }}>
                  <span style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(26,94,180,0.16)', border: '1px solid rgba(46,120,214,0.26)', color: BLUE_200,
                  }}>
                    {TRAINING_ICONS[i % TRAINING_ICONS.length]}
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: WHITE }}>{pt.title}</span>
                    <span style={{ display: 'block', fontSize: 13.5, color: TXT_SOFT, lineHeight: 1.6, marginTop: 3 }}>{pt.desc}</span>
                  </span>
                </div>
              ))}
            </div>

            <div data-reveal style={{
              marginTop: 8, padding: '16px 18px', borderRadius: 13,
              background: 'rgba(26,158,92,0.07)', border: '1px solid rgba(37,193,115,0.22)',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN_400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <a href="mailto:deybi@marquezprojectsolutions.com" style={{ fontSize: 13.5, color: TXT, textDecoration: 'none' }}>
                deybi@marquezprojectsolutions.com
              </a>
            </div>
          </div>

          {/* Derecha: formulario */}
          <div data-reveal style={{
            padding: '28px 26px', borderRadius: 20,
            background: 'linear-gradient(160deg, rgba(18,40,72,0.88), rgba(6,14,29,0.82))',
            border: `1px solid rgba(127,168,212,0.20)`,
            boxShadow: '0 40px 90px -46px rgba(0,0,0,0.95)',
          }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '36px 10px' }}>
                <div style={{
                  width: 62, height: 62, borderRadius: '50%', margin: '0 auto 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(26,158,92,0.14)', border: '1px solid rgba(37,193,115,0.35)',
                }}>
                  <Check size={28} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 700, color: WHITE }}>{f.successTitle}</h3>
                <p style={{ margin: '0 0 22px', fontSize: 14, color: TXT_SOFT, lineHeight: 1.65 }}>{f.successMsg}</p>
                <button onClick={() => setSent(false)} style={{ ...btnGhost, padding: '11px 20px', fontSize: 14 }}>
                  {f.successAgain}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h3 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 700, color: WHITE }}>{tr.formTitle}</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: TXT_DIM }}>{tr.formSub}</p>

                <div style={{ display: 'grid', gap: 13 }}>
                  <div className="ld-form-row">
                    <Field label={`${f.nombre} *`}>
                      <input style={inputStyle} {...focus} value={form.nombre} onChange={set('nombre')} placeholder={f.nombrePh} />
                    </Field>
                    <Field label={f.empresa} optional={f.optional}>
                      <input style={inputStyle} {...focus} value={form.empresa} onChange={set('empresa')} placeholder={f.empresaPh} />
                    </Field>
                  </div>

                  <div className="ld-form-row">
                    <Field label={`${f.email} *`}>
                      <input type="email" style={inputStyle} {...focus} value={form.email} onChange={set('email')} placeholder={f.emailPh} />
                    </Field>
                    <Field label={f.telefono} optional={f.optional}>
                      <input style={inputStyle} {...focus} value={form.telefono} onChange={set('telefono')} placeholder={f.telefonoPh} />
                    </Field>
                  </div>

                  <div className="ld-form-row">
                    <Field label={`${f.pais} *`}>
                      <select style={{ ...inputStyle, cursor: 'pointer' }} {...focus} value={form.pais} onChange={set('pais')}>
                        <option value="" style={{ background: NAVY_900 }}>{f.paisPh}</option>
                        {PAISES_LANDING[lang].map(p => (
                          <option key={p} value={p} style={{ background: NAVY_900 }}>{p}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={f.rol} optional={f.optional}>
                      <select style={{ ...inputStyle, cursor: 'pointer' }} {...focus} value={form.rol} onChange={set('rol')}>
                        <option value="" style={{ background: NAVY_900 }}>{f.rolPh}</option>
                        {f.roles.map(r => (
                          <option key={r} value={r} style={{ background: NAVY_900 }}>{r}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="ld-form-row">
                    <Field label={f.participantes} optional={f.optional}>
                      <input type="number" min="1" max="500" style={inputStyle} {...focus}
                        value={form.participantes} onChange={set('participantes')} placeholder={f.participantesPh} />
                    </Field>
                    <Field label={f.modalidad}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {Object.entries(f.modalidades).map(([id, label]) => {
                          const on = form.modalidad === id
                          return (
                            <button key={id} type="button" onClick={() => setForm(p => ({ ...p, modalidad: id }))}
                              style={{
                                flex: 1, minWidth: 0, padding: '11px 4px', borderRadius: 10, cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                                color: on ? WHITE : TXT_SOFT,
                                background: on ? 'rgba(26,94,180,0.30)' : 'rgba(6,14,29,0.6)',
                                border: `1px solid ${on ? 'rgba(46,120,214,0.6)' : 'rgba(127,168,212,0.22)'}`,
                                transition: 'all 150ms ease',
                              }}>
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </Field>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      {f.interes} <span style={{ color: TXT_DIM, fontWeight: 400 }}>· {f.interesHint}</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {f.temas.map(tema => {
                        const on = temas.includes(tema)
                        return (
                          <button key={tema} type="button" onClick={() => toggleTema(tema)}
                            style={{
                              padding: '7px 13px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit',
                              fontSize: 12, fontWeight: 500,
                              color: on ? WHITE : TXT_SOFT,
                              background: on ? 'rgba(26,158,92,0.20)' : 'rgba(6,14,29,0.6)',
                              border: `1px solid ${on ? 'rgba(37,193,115,0.45)' : 'rgba(127,168,212,0.20)'}`,
                              transition: 'all 150ms ease',
                            }}>
                            {on ? '✓ ' : ''}{tema}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Field label={f.mensaje} optional={f.optional}>
                    <textarea rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} {...focus}
                      value={form.mensaje} onChange={set('mensaje')} placeholder={f.mensajePh} />
                  </Field>

                  {error && (
                    <div style={{
                      background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,80,80,0.25)',
                      borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: '#f08080', textAlign: 'center',
                    }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={sending} {...hoverLift}
                    style={{ ...btnPrimary, width: '100%', opacity: sending ? 0.65 : 1, cursor: sending ? 'wait' : 'pointer' }}>
                    {sending ? f.sending : f.submit}
                  </button>

                  <p style={{ margin: 0, fontSize: 11.5, color: TXT_DIM, textAlign: 'center', lineHeight: 1.5 }}>
                    {f.privacy}
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────
function FaqSection({ t }) {
  const q = t.faq
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" style={{ padding: '70px 20px', scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <SectionHead badge={q.badge} title={q.title} />
        <div style={{ marginTop: 38 }}>
          {q.items.map((item, i) => {
            const on = open === i
            return (
              <div key={i} data-reveal style={{
                marginBottom: 10, borderRadius: 13, overflow: 'hidden',
                background: on ? 'rgba(26,94,180,0.10)' : 'rgba(147,184,216,0.035)',
                border: `1px solid ${on ? 'rgba(46,120,214,0.35)' : LINE}`,
                transition: 'background 180ms ease, border-color 180ms ease',
              }}>
                <button onClick={() => setOpen(on ? -1 : i)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    padding: '17px 20px', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: on ? WHITE : TXT }}>{item.q}</span>
                  <span style={{
                    flexShrink: 0, color: on ? BLUE_400 : TXT_DIM,
                    transform: on ? 'rotate(45deg)' : 'none', transition: 'transform 220ms ease', lineHeight: 0,
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </button>
                <div style={{
                  maxHeight: on ? 260 : 0, opacity: on ? 1 : 0,
                  transition: 'max-height 280ms ease, opacity 220ms ease',
                  overflow: 'hidden',
                }}>
                  <p style={{ margin: 0, padding: '0 20px 18px', fontSize: 14, color: TXT_SOFT, lineHeight: 1.7 }}>
                    {item.a}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── CTA FINAL ─────────────────────────────────────────────────────────────
function FinalCta({ t, onNavigate }) {
  const c = t.finalCta
  return (
    <section style={{ padding: '40px 20px 80px' }}>
      <div data-reveal style={{
        maxWidth: 940, margin: '0 auto', padding: 'clamp(34px, 6vw, 58px) 28px', borderRadius: 24,
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(140deg, rgba(26,94,180,0.30) 0%, rgba(11,28,54,0.85) 55%, rgba(26,158,92,0.18) 100%)',
        border: '1px solid rgba(46,120,214,0.34)',
        boxShadow: '0 40px 100px -50px rgba(26,94,180,0.9)',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(127,168,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(127,168,212,0.06) 1px, transparent 1px)`,
          backgroundSize: '38px 38px',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 10%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 10%, transparent 75%)',
        }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px,3.6vw,38px)', fontWeight: 800, color: WHITE, letterSpacing: '-0.02em', lineHeight: 1.18 }}>
            {c.title}
          </h2>
          <p style={{ margin: '14px auto 0', maxWidth: 560, fontSize: 'clamp(14px,1.7vw,16.5px)', color: TXT_SOFT, lineHeight: 1.7 }}>
            {c.sub}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 28 }}>
            <button onClick={() => onNavigate('/registro')} style={btnPrimary} {...hoverLift}>{c.cta1}</button>
            <button onClick={() => scrollToId('capacitacion')} style={btnGhost}>{c.cta2}</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────
function Footer({ t, onNavigate, onLegal }) {
  const ft = t.footer
  const linkStyle = {
    display: 'block', background: 'none', border: 'none', padding: '5px 0',
    color: TXT_SOFT, fontSize: 13.5, cursor: 'pointer', textAlign: 'left',
    textDecoration: 'none', fontFamily: 'inherit',
  }
  return (
    <footer style={{ borderTop: `1px solid ${LINE}`, background: 'rgba(6,14,29,0.6)', padding: '52px 20px 30px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="ld-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <MaryMark size={30} />
              <span style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: 2 }}>MARY</span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: TXT_SOFT, lineHeight: 1.65, maxWidth: 300 }}>{ft.tagline}</p>
          </div>

          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{ft.product}</p>
            <button style={linkStyle} onClick={() => scrollToId('modulos')}>{ft.links.modules}</button>
            <button style={linkStyle} onClick={() => scrollToId('planes')}>{ft.links.pricing}</button>
            <button style={linkStyle} onClick={() => scrollToId('capacitacion')}>{ft.links.training}</button>
          </div>

          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{ft.company}</p>
            <a style={linkStyle} href="https://www.marquezprojectsolutions.com" target="_blank" rel="noopener noreferrer">{ft.links.about}</a>
            <a style={linkStyle} href="mailto:deybi@marquezprojectsolutions.com">{ft.links.contact}</a>
            <a style={linkStyle} href="https://www.marquezprojectsolutions.com" target="_blank" rel="noopener noreferrer">{ft.links.site}</a>
          </div>

          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{ft.legal}</p>
            <button style={linkStyle} onClick={() => onLegal('tos')}>{ft.links.tos}</button>
            <button style={linkStyle} onClick={() => onLegal('pp')}>{ft.links.pp}</button>
            <button style={linkStyle} onClick={() => onNavigate('/login')}>{ft.links.login}</button>
          </div>
        </div>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${LINE}`, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', color: 'rgba(147,184,216,0.30)', textTransform: 'uppercase' }}>
            {ft.rights}
          </p>
          <button onClick={() => onNavigate('/registro')}
            style={{ background: 'none', border: 'none', color: BLUE_200, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {ft.links.trial} →
          </button>
        </div>
      </div>
    </footer>
  )
}

// ── ESTILOS GLOBALES DE LA LANDING ────────────────────────────────────────
const LANDING_CSS = `
.mary-landing { background: ${BG}; color: ${TXT}; min-height: 100vh; overflow-x: hidden; }
.mary-landing *, .mary-landing *::before, .mary-landing *::after { box-sizing: border-box; }
.mary-landing ::selection { background: rgba(46,120,214,0.45); color: #fff; }

[data-reveal] { opacity: 0; transform: translateY(26px);
  transition: opacity .75s cubic-bezier(.22,1,.36,1), transform .75s cubic-bezier(.22,1,.36,1); }
[data-reveal].is-in { opacity: 1; transform: none; }

.ld-navlink:hover { color: #fff !important; background: rgba(147,184,216,0.08) !important; }
.ld-card { transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease; }
.ld-card:hover { transform: translateY(-3px); border-color: rgba(46,120,214,0.42) !important;
  box-shadow: 0 22px 50px -32px rgba(26,94,180,0.85); }

.mary-landing input::placeholder, .mary-landing textarea::placeholder { color: rgba(147,184,216,0.38); }
.mary-landing select option { background: ${NAVY_900}; color: #fff; }

@keyframes ldFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-11px) } }
@keyframes ldDrift { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(4%,3%) scale(1.09) } }
@keyframes ldPulse { 0%,100% { opacity: .35; transform: scale(1) } 50% { opacity: 1; transform: scale(1.22) } }
@keyframes ldDraw { from { stroke-dashoffset: 1400 } to { stroke-dashoffset: 0 } }
@keyframes ldFadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes ldSlideUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }

.anim-float { animation: ldFloat 7s ease-in-out infinite; }
.anim-drift { animation: ldDrift 17s ease-in-out infinite; }
.anim-drift-slow { animation: ldDrift 26s ease-in-out infinite; }
.anim-pulse { animation: ldPulse 2.4s ease-in-out infinite; transform-origin: center; }
.anim-draw { stroke-dasharray: 1400; animation: ldDraw 2.1s cubic-bezier(.4,0,.2,1) forwards; }
.anim-draw-dashed { animation: ldFadeIn 1.2s ease both; }
.anim-fade-in { animation: ldFadeIn .7s ease both; }
.anim-slide-up { animation: ldSlideUp .42s cubic-bezier(.22,1,.36,1) both; }

.ld-hero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px; align-items: center; }
.ld-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.ld-flow-grid { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 24px; }
.ld-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.ld-footer-grid { display: grid; grid-template-columns: 1.7fr 1fr 1fr 1fr; gap: 28px; }
.ld-mobile { display: none !important; }

@media (max-width: 960px) {
  .ld-hero-grid, .ld-two-col, .ld-flow-grid { grid-template-columns: 1fr; gap: 34px; }
  .ld-footer-grid { grid-template-columns: 1fr 1fr; gap: 26px; }
  .ld-desktop { display: none !important; }
  .ld-mobile { display: block !important; }
}
@media (max-width: 560px) {
  .ld-form-row { grid-template-columns: 1fr; }
  .ld-footer-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
  .anim-float, .anim-drift, .anim-drift-slow, .anim-pulse, .anim-draw,
  .anim-draw-dashed, .anim-fade-in, .anim-slide-up { animation: none !important; opacity: 1 !important; }
  .anim-draw { stroke-dasharray: none; }
}
`

// ── PÁGINA ────────────────────────────────────────────────────────────────
export default function Landing({ onNavigate }) {
  const [lang, setLangState] = useState(detectLang)
  const [legal, setLegal]    = useState(null)
  const t = LANDING[lang]

  const setLang = (next) => {
    localStorage.setItem('mary_lang', next)
    setLangState(next)
  }

  useRevealOnScroll([lang])

  // El body de la app es claro; la landing necesita fondo oscuro sin franjas
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = BG
    return () => { document.body.style.background = prev }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'ES' ? 'es' : 'en'
  }, [lang])

  return (
    <div className="mary-landing">
      <style>{LANDING_CSS}</style>

      {legal && <LegalModal type={legal} lang={lang} onClose={() => setLegal(null)} />}

      <Nav t={t} lang={lang} setLang={setLang} onNavigate={onNavigate} />
      <main>
        <Hero t={t} onNavigate={onNavigate} />
        <StatsStrip t={t} />
        <ProblemSection t={t} />
        <ModulesSection t={t} />
        <FlowSection t={t} />
        <SCurveSection t={t} />
        <SecuritySection t={t} />
        <AudienceSection t={t} />
        <PricingSection t={t} onNavigate={onNavigate} />
        <TrainingSection t={t} lang={lang} />
        <FaqSection t={t} />
        <FinalCta t={t} onNavigate={onNavigate} />
      </main>
      <Footer t={t} onNavigate={onNavigate} onLegal={setLegal} />
    </div>
  )
}
