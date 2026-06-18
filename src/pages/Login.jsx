import { useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../supabase'

const PAISES = {
  ES: [
    'Estados Unidos','México','Guatemala','El Salvador','Honduras','Nicaragua',
    'Costa Rica','Panamá','Colombia','Venezuela','Ecuador','Perú','Bolivia',
    'Chile','Argentina','Uruguay','Paraguay','España','Otro'
  ],
  EN: [
    'United States','Mexico','Guatemala','El Salvador','Honduras','Nicaragua',
    'Costa Rica','Panama','Colombia','Venezuela','Ecuador','Peru','Bolivia',
    'Chile','Argentina','Uruguay','Paraguay','Spain','Other'
  ]
}

const T = {
  ES: {
    tagline:           'MANAGEMENT & RESOURCES YIELD',
    email:             'usuario@empresa.com',
    password:          '••••••••',
    enter:             'Entrar al Sistema',
    loading:           'Cargando...',
    forgot:            '¿Olvidaste tu contraseña?',
    try:               '¿No tienes cuenta? Prueba MARY gratis',
    footer:            'MARQUEZ PROJECT SOLUTIONS LLC · 2026',
    err_credentials:   'Credenciales incorrectas. Verifica tu email y contraseña.',
    reg_title:         'Prueba MARY gratis por 7 días',
    reg_sub:           'Sin tarjeta de crédito. Elige tu plan:',
    reg_plan:          'Selecciona un plan',
    err_plan:          'Por favor selecciona un plan.',
    reg_name:          'Nombre completo',
    reg_company:       'Nombre de la empresa',
    reg_phone:         'Teléfono',
    reg_email:         'Correo electrónico',
    reg_password:      'Contraseña (mín. 8 caracteres)',
    reg_country:       'País',
    reg_select:        '— Seleccionar país —',
    reg_btn:           'Crear cuenta gratis',
    reg_loading:       'Creando cuenta...',
    reg_back:          '← Volver al inicio de sesión',
    reg_success:       '¡Cuenta creada! Ya puedes iniciar sesión.',
    reg_terms:         'He leído y acepto los',
    reg_terms_link:    'Términos de Servicio',
    reg_and:           'y la',
    reg_privacy_link:  'Política de Privacidad',
    reg_terms_required:'Debes aceptar los Términos de Servicio y la Política de Privacidad para continuar.',
    err_email_taken:   'Este correo ya está registrado.',
    err_company_taken: 'Ya existe una empresa con ese nombre.',
    err_fields:        'Por favor completa todos los campos.',
    err_password:      'La contraseña debe tener al menos 8 caracteres.',
    forgot_title:      'Recuperar contraseña',
    forgot_sub:        'Te enviaremos un enlace para restablecer tu contraseña.',
    forgot_btn:        'Enviar enlace',
    forgot_loading:    'Enviando...',
    forgot_sent:       '✓ Revisa tu correo. Si existe una cuenta con ese email, recibirás el enlace.',
    forgot_back:       '← Volver al inicio de sesión',
    tos_title:         'Términos de Servicio',
    pp_title:          'Política de Privacidad',
    close:             'Cerrar',
    last_updated:      'Última actualización: Mayo 2026',
    show_pass:         'Mostrar contraseña',
    hide_pass:         'Ocultar contraseña',
    reg_ref_code:      '¿Tienes un código de referido? (opcional)',
    reg_ref_code_ph:   'Ej: GABR202601',
    reg_ref_applied:   'Código aplicado',
  },
  EN: {
    tagline:           'MANAGEMENT & RESOURCES YIELD',
    email:             'user@company.com',
    password:          '••••••••',
    enter:             'Sign In',
    loading:           'Loading...',
    forgot:            'Forgot your password?',
    try:               "Don't have an account? Try MARY free",
    footer:            'MARQUEZ PROJECT SOLUTIONS LLC · 2026',
    err_credentials:   'Incorrect credentials. Check your email and password.',
    reg_title:         'Try MARY free for 7 days',
    reg_sub:           'No credit card required. Choose your plan:',
    reg_plan:          'Select a plan',
    err_plan:          'Please select a plan.',
    reg_name:          'Full name',
    reg_company:       'Company name',
    reg_phone:         'Phone number',
    reg_email:         'Email address',
    reg_password:      'Password (min. 8 characters)',
    reg_country:       'Country',
    reg_select:        '— Select country —',
    reg_btn:           'Create free account',
    reg_loading:       'Creating account...',
    reg_back:          '← Back to sign in',
    reg_success:       'Account created! You can now sign in.',
    reg_terms:         'I have read and accept the',
    reg_terms_link:    'Terms of Service',
    reg_and:           'and the',
    reg_privacy_link:  'Privacy Policy',
    reg_terms_required:'You must accept the Terms of Service and Privacy Policy to continue.',
    err_email_taken:   'This email is already registered.',
    err_company_taken: 'A company with that name already exists.',
    err_fields:        'Please fill in all fields.',
    err_password:      'Password must be at least 8 characters.',
    forgot_title:      'Reset password',
    forgot_sub:        "We'll send you a link to reset your password.",
    forgot_btn:        'Send link',
    forgot_loading:    'Sending...',
    forgot_sent:       "✓ Check your email. If an account exists with that email, you'll receive the link.",
    forgot_back:       '← Back to sign in',
    tos_title:         'Terms of Service',
    pp_title:          'Privacy Policy',
    close:             'Close',
    last_updated:      'Last updated: May 2026',
    show_pass:         'Show password',
    hide_pass:         'Hide password',
    reg_ref_code:      'Do you have a referral code? (optional)',
    reg_ref_code_ph:   'E.g.: GABR202601',
    reg_ref_applied:   'Code applied',
  }
}

// ── DESIGN TOKENS (matching landing page) ─────────────────────────────────
const NAVY_900  = '#0B1C36'
const NAVY_800  = '#122848'
const NAVY_700  = '#1B3A6B'
const NAVY_600  = '#2E5FA3'
const BLUE_500  = '#1A5EB4'
const BLUE_400  = '#2E78D6'
const BLUE_200  = '#93B8D8'
const BLUE_100  = '#D6E4F0'
const WHITE     = '#FFFFFF'
const GRAY_100  = '#F3F4F6'
const GRAY_400  = '#9CA3AF'
const GRAY_500  = '#6B7280'
const GRAY_600  = '#4B5563'
const GRAY_700  = '#374151'
const GRAY_900  = '#111827'
const GREEN_500 = '#1A9E5C'
const RED_FG    = '#f08080'
const RED_BG    = 'rgba(220,60,60,0.08)'
const RED_BD    = 'rgba(220,80,80,0.25)'

// ── SHARED STYLES ─────────────────────────────────────────────────────────

// Background matching landing hero: dark navy + blueprint grid + radial glow
const bgStyle = {
  minHeight: '100vh',
  background: `linear-gradient(180deg, ${NAVY_900} 0%, ${NAVY_800} 100%)`,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem 1rem',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
}

// Blueprint grid overlay (from landing hero)
const blueprintGridStyle = {
  position: 'fixed',
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(127,168,212,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(127,168,212,0.05) 1px, transparent 1px)
  `,
  backgroundSize: '48px 48px',
  WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, #000 30%, transparent 75%)',
  maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, #000 30%, transparent 75%)',
  pointerEvents: 'none',
  zIndex: 0,
}

// Radial glow (from landing hero)
const radialGlowStyle = {
  position: 'fixed',
  top: '-10%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 900,
  height: 600,
  background: `radial-gradient(ellipse at center, rgba(46,95,163,0.28) 0%, transparent 65%)`,
  pointerEvents: 'none',
  zIndex: 0,
}

// Card container — matches landing's glass-card style on dark
const cardStyle = {
  position: 'relative',
  zIndex: 1,
  width: '100%',
  background: 'rgba(18, 40, 72, 0.72)',
  border: `1px solid rgba(127,168,212,0.18)`,
  borderRadius: 16,
  backdropFilter: 'saturate(140%) blur(16px)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(46,95,163,0.12)',
  padding: '2rem 1.75rem',
}

// Input base — same as landing's form inputs
const inputBase = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(11,28,54,0.55)',
  border: `1px solid rgba(127,168,212,0.22)`,
  borderRadius: 10,
  padding: '12px 14px 12px 42px',
  fontFamily: 'inherit',
  fontSize: 14,
  color: WHITE,
  outline: 'none',
  transition: 'border-color 160ms, background 160ms',
}

const inputBaseNoIcon = { ...inputBase, padding: '12px 14px' }
const inputBaseWithEye = { ...inputBase, paddingRight: '42px' }

// Primary button — matches landing's Button variant="primary"
const btnPrimary = {
  width: '100%',
  padding: '13px',
  borderRadius: 10,
  border: 'none',
  background: `linear-gradient(135deg, ${BLUE_500} 0%, ${BLUE_400} 100%)`,
  color: WHITE,
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  boxShadow: `0 0 0 1px rgba(46,120,214,0.4), 0 4px 20px rgba(26,94,180,0.45)`,
  transition: 'opacity 160ms, transform 80ms',
}

// Secondary / outline button
const btnSecondary = {
  width: '100%',
  padding: '13px',
  borderRadius: 10,
  border: `1.5px solid rgba(46,120,214,0.55)`,
  background: 'rgba(26,94,180,0.10)',
  color: BLUE_200,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 160ms, border-color 160ms',
  letterSpacing: '0.02em',
}

// ── LOGO SVG (matching exact landing logo) ────────────────────────────────
const MaryLogoSVG = () => (
  <svg
    viewBox="0 0 320 90"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      width: 360,
      height: 'auto',
      display: 'block',
      margin: '0 auto',
      filter: `drop-shadow(0 2px 24px rgba(26,94,180,0.40))`,
    }}
    aria-label="MARY"
  >
    {/* Construction-themed mark — bars + S-curve trend + arrow */}
    <g transform="translate(10,5)">
      <rect x="28" y="48" width="14" height="26" rx="2" fill={BLUE_200} opacity="0.65"/>
      <rect x="44" y="38" width="14" height="36" rx="2" fill={BLUE_200} opacity="0.75"/>
      <rect x="60" y="28" width="14" height="46" rx="2" fill={BLUE_200} opacity="0.85"/>
      <ellipse cx="51" cy="54" rx="30" ry="9" fill="none" stroke={BLUE_400} strokeWidth="2.5" opacity="0.75"/>
      <ellipse cx="51" cy="54" rx="24" ry="7" fill="none" stroke={NAVY_600} strokeWidth="1.5" opacity="0.45"/>
      <rect x="46" y="28" width="16" height="16" rx="3" fill={GREEN_500} opacity="0.95"/>
      <rect x="62" y="18" width="13" height="13" rx="3" fill="#26d4ff" opacity="0.80"/>
      <line x1="62" y1="32" x2="80" y2="10" stroke={GREEN_500} strokeWidth="2.5" opacity="0.90"/>
      <polygon points="80,5 85,14 75,14" fill={GREEN_500} opacity="0.90"/>
    </g>
    {/* MARY wordmark */}
    <text
      x="110" y="60"
      fontFamily="'Arial Black', Arial, sans-serif"
      fontWeight="900"
      fontSize="52"
      fill={WHITE}
      letterSpacing="2"
    >MARY</text>
    {/* Tagline */}
    <text
      x="110" y="78"
      fontFamily="Arial, sans-serif"
      fontWeight="500"
      fontSize="10"
      fill={`rgba(147,184,216,0.50)`}
      letterSpacing="4"
    >MANAGEMENT &amp; RESOURCES YIELD</text>
  </svg>
)

// Blue accent divider (from landing)
const AccentDivider = () => (
  <div style={{
    width: 40,
    height: 3,
    background: `linear-gradient(90deg, ${GREEN_500}, ${BLUE_500})`,
    borderRadius: 2,
    margin: '0.6rem auto 0',
  }} />
)

// Pill badge (from landing hero)
const PillBadge = ({ children }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '5px 14px',
    borderRadius: 9999,
    background: 'rgba(46,120,214,0.14)',
    border: `1px solid rgba(46,120,214,0.36)`,
    marginBottom: 20,
    fontSize: 11,
    fontWeight: 600,
    color: '#8FB8E8',
    letterSpacing: '0.04em',
  }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: BLUE_400, flexShrink: 0 }} />
    {children}
  </div>
)

// ── LANG TOGGLE ───────────────────────────────────────────────────────────
const LangToggle = ({ lang, setLang }) => (
  <button
    onClick={() => setLang(l => l === 'ES' ? 'EN' : 'ES')}
    style={{
      position: 'absolute', top: '1rem', right: '1rem', zIndex: 2,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      color: 'rgba(255,255,255,0.75)',
      background: 'rgba(255,255,255,0.06)',
      border: `1px solid rgba(255,255,255,0.14)`,
      borderRadius: 6,
      padding: '5px 11px',
      cursor: 'pointer',
    }}
  >
    🌐 {lang === 'ES' ? 'EN' : 'ES'}
  </button>
)

// ── EYE ICON ──────────────────────────────────────────────────────────────
const EyeIcon = ({ visible }) => visible ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

// ── LEGAL MODAL ───────────────────────────────────────────────────────────
function LegalModal({ type, lang, onClose }) {
  const t = T[lang]
  const isEs = lang === 'ES'

  const TOS_ES = `
TÉRMINOS DE SERVICIO — MARY ERP
Marquez Project Solutions LLC
Última actualización: Mayo 2026

1. DESCRIPCIÓN DEL SERVICIO

MARY (Management And Resources Yield) es una plataforma de software como servicio (SaaS) para gestión de proyectos, inventario, compras y finanzas, operada por Marquez Project Solutions LLC, empresa registrada en el estado de California, Estados Unidos. Al crear una cuenta o utilizar MARY, usted acepta íntegramente estos Términos de Servicio.

2. SU CUENTA

Usted se compromete a proporcionar información veraz, completa y actualizada al momento del registro. Es su responsabilidad mantener la confidencialidad de su contraseña y de las credenciales de acceso de su organización. Usted es el único responsable de todas las actividades que ocurran bajo su cuenta.

3. USO ACEPTABLE

MARY está diseñada exclusivamente para gestión empresarial legítima. Usted acepta NO utilizar el servicio para:

- Intentar acceder a datos de otras empresas registradas en la plataforma
- Realizar ingeniería inversa, copiar, modificar o redistribuir el código fuente de MARY
- Usar scripts automatizados, bots o herramientas para extraer datos masivamente
- Compartir sus credenciales de acceso con personas externas a su organización
- Revender o sublicenciar el acceso a MARY a terceros sin autorización escrita
- Cualquier actividad ilegal, fraudulenta o que cause daño a terceros
- Proporcionar información falsa al momento del registro

4. PLANES, PRECIOS Y PERÍODO DE PRUEBA

MARY ofrece un período de prueba gratuito de 60 días con el plan Pro sin necesidad de tarjeta de crédito. Al vencimiento del período de prueba, el servicio requiere una suscripción mensual activa para continuar operando. Los precios y límites de cada plan están publicados en www.marquezprojectsolutions.com y pueden actualizarse con previo aviso.

5. SUSPENSIÓN Y CANCELACIÓN DE CUENTAS

Marquez Project Solutions LLC se reserva el derecho de suspender o cancelar su cuenta, con o sin previo aviso, en los siguientes casos: violación de estos Términos de Servicio, actividad fraudulenta, falta de pago de la suscripción, uso indebido de la plataforma, o cualquier actividad que ponga en riesgo la seguridad del sistema o de otros usuarios. Usted puede cancelar su cuenta en cualquier momento desde la configuración de su perfil. Sus datos serán conservados por un período de 30 días después de la cancelación, tras lo cual serán eliminados permanentemente.

6. PROPIEDAD INTELECTUAL

MARY, su código fuente, diseño, arquitectura, módulos y toda la tecnología asociada son propiedad exclusiva de Marquez Project Solutions LLC y están protegidos por las leyes de propiedad intelectual aplicables. El usuario conserva la propiedad de los datos que introduce en la plataforma. Al utilizar MARY, usted no adquiere ningún derecho sobre el software más allá del uso del servicio contratado.

7. LIMITACIÓN DE RESPONSABILIDAD

MARY se proporciona "tal como está" y "según disponibilidad". Marquez Project Solutions LLC no garantiza que el servicio sea ininterrumpido, libre de errores o completamente seguro. En la máxima medida permitida por la ley aplicable, Marquez Project Solutions LLC no será responsable por: pérdida de datos, lucro cesante, daños indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de uso del servicio, incluyendo interrupciones del servicio, accesos no autorizados por terceros o pérdida de información por causas fuera de nuestro control razonable.

8. MODIFICACIONES

Marquez Project Solutions LLC se reserva el derecho de modificar estos Términos de Servicio en cualquier momento. Los cambios significativos serán notificados por correo electrónico a la dirección registrada. El uso continuado del servicio después de la notificación constituye aceptación de los nuevos términos.

9. LEY APLICABLE

Estos Términos de Servicio se rigen por las leyes del estado de California, Estados Unidos. Cualquier disputa será resuelta en los tribunales competentes del estado de California.

Para consultas: deybi@marquezprojectsolutions.com
Sitio web: www.marquezprojectsolutions.com
`

  const TOS_EN = `
TERMS OF SERVICE — MARY ERP
Marquez Project Solutions LLC
Last updated: May 2026

1. DESCRIPTION OF SERVICE

MARY (Management And Resources Yield) is a software-as-a-service (SaaS) platform for project management, inventory, purchasing and finance, operated by Marquez Project Solutions LLC, a company registered in the state of California, United States. By creating an account or using MARY, you fully accept these Terms of Service.

2. YOUR ACCOUNT

You agree to provide truthful, complete and up-to-date information at the time of registration. It is your responsibility to maintain the confidentiality of your password and your organization's access credentials. You are solely responsible for all activities that occur under your account.

3. ACCEPTABLE USE

MARY is designed exclusively for legitimate business management. You agree NOT to use the service to:

- Attempt to access data from other companies registered on the platform
- Reverse engineer, copy, modify or redistribute MARY's source code
- Use automated scripts, bots or tools to extract data in bulk
- Share your access credentials with persons outside your organization
- Resell or sublicense access to MARY to third parties without written authorization
- Any illegal, fraudulent activity or that causes harm to third parties
- Provide false information at the time of registration

4. PLANS, PRICING AND TRIAL PERIOD

MARY offers a free 60-day trial with the Pro plan without requiring a credit card. Upon expiration of the trial period, the service requires an active monthly subscription to continue operating. Prices and limits for each plan are published at www.marquezprojectsolutions.com and may be updated with prior notice.

5. ACCOUNT SUSPENSION AND CANCELLATION

Marquez Project Solutions LLC reserves the right to suspend or cancel your account, with or without prior notice, in the following cases: violation of these Terms of Service, fraudulent activity, non-payment of subscription, misuse of the platform, or any activity that jeopardizes the security of the system or other users. You may cancel your account at any time from your profile settings. Your data will be retained for 30 days after cancellation, after which it will be permanently deleted.

6. INTELLECTUAL PROPERTY

MARY, its source code, design, architecture, modules and all associated technology are the exclusive property of Marquez Project Solutions LLC and are protected by applicable intellectual property laws. The user retains ownership of the data they enter into the platform. By using MARY, you do not acquire any rights over the software beyond the use of the contracted service.

7. LIMITATION OF LIABILITY

MARY is provided "as is" and "as available." Marquez Project Solutions LLC does not guarantee that the service will be uninterrupted, error-free or completely secure. To the maximum extent permitted by applicable law, Marquez Project Solutions LLC will not be liable for: data loss, lost profits, indirect, incidental or consequential damages arising from the use or inability to use the service, including service interruptions, unauthorized access by third parties or loss of information due to causes beyond our reasonable control.

8. MODIFICATIONS

Marquez Project Solutions LLC reserves the right to modify these Terms of Service at any time. Significant changes will be notified by email to the registered address. Continued use of the service after notification constitutes acceptance of the new terms.

9. GOVERNING LAW

These Terms of Service are governed by the laws of the state of California, United States. Any dispute shall be resolved in the competent courts of the state of California.

For inquiries: deybi@marquezprojectsolutions.com
Website: www.marquezprojectsolutions.com
`

  const PP_ES = `
POLÍTICA DE PRIVACIDAD — MARY ERP
Marquez Project Solutions LLC
Última actualización: Mayo 2026

En Marquez Project Solutions LLC nos comprometemos a proteger su privacidad. Esta Política de Privacidad describe cómo recopilamos, usamos y protegemos su información personal cuando utiliza MARY.

1. INFORMACIÓN QUE RECOPILAMOS

Al registrarse y usar MARY recopilamos:

Información de registro: nombre completo, nombre de la empresa, número de teléfono, correo electrónico y país.

Información operativa: datos que usted introduce en la plataforma, incluyendo proyectos, materiales, costos, presupuestos, usuarios de su empresa y cualquier otro dato ingresado en los módulos del sistema.

Información técnica: fecha y hora de acceso, tipo de navegador y datos de sesión necesarios para el funcionamiento del sistema.

2. CÓMO USAMOS SU INFORMACIÓN

Utilizamos su información para:

- Operar y mantener el servicio de MARY
- Gestionar su cuenta y suscripción
- Enviarle comunicaciones relacionadas con su cuenta, actualizaciones del servicio y notificaciones importantes
- Generar estadísticas anónimas y agregadas sobre el uso de la plataforma (sin identificar personas ni empresas específicas)
- Mejorar las funcionalidades del sistema
- Cumplir con obligaciones legales aplicables

3. ESTADÍSTICAS Y MENCIONES PÚBLICAS

Marquez Project Solutions LLC puede mencionar públicamente métricas generales de uso de la plataforma, tales como número total de empresas registradas o países donde opera MARY. En ningún caso se revelarán nombres de empresas, usuarios, datos financieros ni información operativa de ningún cliente sin su autorización expresa y por escrito.

4. COMPARTIR INFORMACIÓN CON TERCEROS

No vendemos, alquilamos ni compartimos su información personal con terceros con fines comerciales. Únicamente compartimos información con proveedores de infraestructura tecnológica necesarios para operar el servicio (almacenamiento en la nube, autenticación y entrega del servicio), quienes están contractualmente obligados a proteger su información y a no usarla para ningún otro fin.

5. SEGURIDAD DE LOS DATOS

Implementamos medidas técnicas y organizativas razonables para proteger su información contra acceso no autorizado, pérdida, alteración o divulgación. Esto incluye cifrado de contraseñas, comunicaciones cifradas mediante TLS/HTTPS y control de acceso basado en roles. Sin embargo, ningún sistema de seguridad es completamente infalible.

6. SUS DERECHOS

Usted tiene derecho a acceder, corregir o eliminar sus datos personales. Para ejercer estos derechos, escríbanos a: deybi@marquezprojectsolutions.com.

7. COOKIES

MARY utiliza únicamente cookies técnicas estrictamente necesarias para el funcionamiento del sistema. No utilizamos cookies de publicidad ni seguimiento de terceros.

8. RETENCIÓN DE DATOS

Sus datos se conservan mientras su cuenta esté activa. Al cancelar su cuenta, sus datos serán eliminados permanentemente después de un período de retención de 30 días.

9. CAMBIOS A ESTA POLÍTICA

Le notificaremos por correo electrónico ante cambios significativos. El uso continuado del servicio después de la notificación constituye su aceptación de la política actualizada.

10. CONTACTO

Marquez Project Solutions LLC
deybi@marquezprojectsolutions.com
www.marquezprojectsolutions.com
California, Estados Unidos
`

  const PP_EN = `
PRIVACY POLICY — MARY ERP
Marquez Project Solutions LLC
Last updated: May 2026

At Marquez Project Solutions LLC we are committed to protecting your privacy. This Privacy Policy describes how we collect, use and protect your personal information when you use MARY.

1. INFORMATION WE COLLECT

When you register and use MARY we collect:

Registration information: full name, company name, phone number, email address and country.

Operational information: data you enter into the platform, including projects, materials, costs, budgets, your company's users and any other data entered in the system modules.

Technical information: date and time of access, browser type and session data necessary for the system to function.

2. HOW WE USE YOUR INFORMATION

We use your information to:

- Operate and maintain the MARY service
- Manage your account and subscription
- Send you communications related to your account, service updates and important notifications
- Generate anonymous and aggregated statistics about platform usage
- Improve system functionalities
- Comply with applicable legal obligations

3. STATISTICS AND PUBLIC MENTIONS

Marquez Project Solutions LLC may publicly mention general platform usage metrics. Under no circumstances will company names, users, financial data or operational information of any client be revealed without their express written authorization.

4. SHARING INFORMATION WITH THIRD PARTIES

We do not sell, rent or share your personal information with third parties for commercial purposes. We only share information with technology infrastructure providers necessary to operate the service.

5. DATA SECURITY

We implement reasonable technical and organizational measures to protect your information against unauthorized access, loss, alteration or disclosure.

6. YOUR RIGHTS

You have the right to access, correct or delete your personal data. Write to us at: deybi@marquezprojectsolutions.com.

7. COOKIES

MARY uses only strictly necessary technical cookies. We do not use advertising or third-party tracking cookies.

8. DATA RETENTION

Your data is retained while your account is active. Upon cancellation, your data will be permanently deleted after a 30-day retention period.

9. CHANGES TO THIS POLICY

We will notify you by email of significant changes. Continued use of the service after notification constitutes your acceptance of the updated policy.

10. CONTACT

Marquez Project Solutions LLC
deybi@marquezprojectsolutions.com
www.marquezprojectsolutions.com
California, United States
`

  const content = type === 'tos' ? (isEs ? TOS_ES : TOS_EN) : (isEs ? PP_ES : PP_EN)
  const title   = type === 'tos' ? t.tos_title : t.pp_title

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 640,
        background: NAVY_800,
        border: `1px solid rgba(127,168,212,0.18)`,
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: `1px solid rgba(127,168,212,0.12)`,
        }}>
          <div>
            <p style={{ color: WHITE, fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</p>
            <p style={{ color: `rgba(147,184,216,0.45)`, fontSize: 11, margin: '2px 0 0' }}>
              {t.last_updated} · Marquez Project Solutions LLC
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: `rgba(147,184,216,0.6)`,
              cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 8px',
            }}
          >✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {content.trim().split('\n').map((line, i) => {
            const trimmed = line.trim()
            if (!trimmed) return <div key={i} style={{ height: '8px' }} />
            if (/^\d+\./.test(trimmed) && trimmed.length < 60)
              return <p key={i} style={{ color: BLUE_200, fontWeight: 700, fontSize: 13, marginTop: 16, marginBottom: 4 }}>{trimmed}</p>
            if (trimmed.startsWith('TÉRMINOS') || trimmed.startsWith('POLÍTICA') || trimmed.startsWith('TERMS') || trimmed.startsWith('PRIVACY'))
              return <p key={i} style={{ color: WHITE, fontWeight: 900, fontSize: 15, margin: 0 }}>{trimmed}</p>
            if (trimmed.startsWith('Marquez Project') && i < 5)
              return <p key={i} style={{ color: `rgba(147,184,216,0.55)`, fontSize: 11, margin: 0 }}>{trimmed}</p>
            if (trimmed.startsWith('Última actualización') || trimmed.startsWith('Last updated'))
              return <p key={i} style={{ color: `rgba(147,184,216,0.38)`, fontSize: 11, marginBottom: 12 }}>{trimmed}</p>
            if (trimmed.startsWith('-'))
              return <p key={i} style={{ color: `rgba(200,220,255,0.72)`, fontSize: 13, paddingLeft: 16, marginBottom: 4 }}>• {trimmed.slice(1).trim()}</p>
            return <p key={i} style={{ color: `rgba(200,220,255,0.72)`, fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>{trimmed}</p>
          })}
        </div>
        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid rgba(127,168,212,0.12)` }}>
          <button onClick={onClose} style={{ ...btnPrimary, fontSize: 14, padding: '12px' }}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── HELPER: detect lang ───────────────────────────────────────────────────
function detectLang() {
  const saved = localStorage.getItem('mary_lang')
  if (saved === 'ES' || saved === 'EN') return saved
  const browser = (navigator.language || navigator.languages?.[0] || 'es').toLowerCase()
  return browser.startsWith('es') ? 'ES' : 'EN'
}

// ── FIELD ICON WRAPPER ────────────────────────────────────────────────────
const FieldIcon = ({ children }) => (
  <span style={{
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: `rgba(147,184,216,0.50)`,
    pointerEvents: 'none', display: 'flex', alignItems: 'center',
  }}>
    {children}
  </span>
)

// ── ERROR BOX ─────────────────────────────────────────────────────────────
const ErrorBox = ({ msg }) => (
  <div style={{
    background: RED_BG,
    border: `0.5px solid ${RED_BD}`,
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: RED_FG,
    textAlign: 'center',
  }}>
    {msg}
  </div>
)

// ── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function Login({ onNavigate }) {
  const { login }                   = useAuth()
  const [lang, setLangState]        = useState(detectLang)
  const [view, setView]             = useState('login')
  const [legalModal, setLegalModal] = useState(null)
  const t = T[lang]

  const setLang = (updater) => {
    setLangState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('mary_lang', next)
      return next
    })
  }

  // Login state
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Register state
  const [reg, setReg]                 = useState({ nombre:'', empresa:'', telefono:'', email:'', password:'', pais:'', ref_code:'' })
  const [showRegPass, setShowRegPass] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [regError, setRegError]       = useState('')
  const [regSuccess, setRegSuccess]   = useState(false)
  const [regLoading, setRegLoading]   = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const setR = k => e => setReg(f => ({ ...f, [k]: e.target.value }))

  // Forgot state
  const [forgotEmail, setForgotEmail]     = useState('')
  const [forgotSent, setForgotSent]       = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError(t.err_credentials)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegError('')
    if (!reg.nombre || !reg.empresa || !reg.telefono || !reg.email || !reg.password || !reg.pais) {
      setRegError(t.err_fields); return
    }
    if (reg.password.length < 8) {
      setRegError(t.err_password); return
    }
    if (!selectedPlan) {
      setRegError(t.err_plan); return
    }
    if (!termsAccepted) {
      setRegError(t.reg_terms_required); return
    }
    setRegLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-trial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            nombre: reg.nombre, empresa: reg.empresa, telefono: reg.telefono,
            email: reg.email, password: reg.password, pais: reg.pais,
            plan: selectedPlan,
            ref_code: reg.ref_code.trim().toUpperCase() || undefined,
            lang,
          })
        }
      )
      const result = await res.json()
      if (!res.ok) {
        if (result.error === 'company_taken') { setRegError(t.err_company_taken); setRegLoading(false); return }
        if (result.error === 'email_taken')   { setRegError(t.err_email_taken);   setRegLoading(false); return }
        throw new Error(result.error || 'Error al crear la cuenta.')
      }
      setRegSuccess(true)
      setReg({ nombre:'', empresa:'', telefono:'', email:'', password:'', pais:'', ref_code:'' })
      setSelectedPlan('')
      setTermsAccepted(false)
    } catch (err) {
      setRegError(err.message || 'Error al crear la cuenta.')
    }
    setRegLoading(false)
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      setForgotSent(true)
    } catch {}
    setForgotLoading(false)
  }

  // Shared eye button style
  const eyeBtn = {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    color: `rgba(147,184,216,0.55)`, display: 'flex', alignItems: 'center', padding: 0,
  }

  const labelStyle = {
    fontSize: 12,
    color: `rgba(180,210,255,0.60)`,
    display: 'block',
    marginBottom: 4,
    fontWeight: 500,
    letterSpacing: '0.02em',
  }

  const selectStyle = {
    ...inputBaseNoIcon,
    cursor: 'pointer',
    color: WHITE,
    backgroundColor: NAVY_900,
  }

  const footerStyle = {
    marginTop: '2rem', textAlign: 'center',
    borderTop: `1px solid rgba(127,168,212,0.08)`,
    paddingTop: '1rem',
  }

  const footerTextStyle = {
    fontSize: 10, fontWeight: 600, letterSpacing: '0.25em',
    color: `rgba(147,184,216,0.30)`,
    textTransform: 'uppercase', margin: 0,
  }

  return (
    <>
      {/* Global background layers */}
      <div style={blueprintGridStyle} />
      <div style={radialGlowStyle} />

      {/* Legal modal */}
      {legalModal && (
        <LegalModal type={legalModal} lang={lang} onClose={() => setLegalModal(null)} />
      )}

      {/* ── LOGIN ─────────────────────────────────────────────────────────── */}
      {view === 'login' && (
        <div style={bgStyle}>
          <LangToggle lang={lang} setLang={setLang} />
          <div style={{ ...cardStyle, maxWidth: 400 }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <MaryLogoSVG />
              <AccentDivider />
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: '1.5rem' }}>
              {/* Email */}
              <div style={{ position: 'relative' }}>
                <FieldIcon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </FieldIcon>
                <input
                  type="email"
                  placeholder={t.email}
                  style={inputBase}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div style={{ position: 'relative' }}>
                <FieldIcon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </FieldIcon>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder={t.password}
                  style={inputBaseWithEye}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" style={eyeBtn} onClick={() => setShowPass(v => !v)} aria-label={showPass ? t.hide_pass : t.show_pass}>
                  <EyeIcon visible={showPass} />
                </button>
              </div>

              {error && <ErrorBox msg={error} />}

              <button
                type="submit"
                disabled={loading}
                style={{ ...btnPrimary, marginTop: 4, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? t.loading : t.enter}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => { setView('forgot'); setForgotSent(false); setForgotEmail('') }}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 13, fontWeight: 500,
                  color: `rgba(200,220,255,0.72)`,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  textDecorationColor: `rgba(200,220,255,0.22)`,
                }}
              >
                {t.forgot}
              </button>
              <div style={{ borderTop: `1px solid rgba(127,168,212,0.10)`, paddingTop: 12 }}>
                <button
                  onClick={() => { setView('register'); setRegError(''); setRegSuccess(false); setTermsAccepted(false); setSelectedPlan('') }}
                  style={{ ...btnSecondary }}
                >
                  ✨ {t.try}
                </button>
              </div>
            </div>

            <footer style={footerStyle}>
              <p style={footerTextStyle}>{t.footer}</p>
            </footer>
          </div>
        </div>
      )}

      {/* ── REGISTER ──────────────────────────────────────────────────────── */}
      {view === 'register' && (
        <div style={bgStyle}>
          <LangToggle lang={lang} setLang={setLang} />
          <div style={{ ...cardStyle, maxWidth: 500 }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <MaryLogoSVG />
              <AccentDivider />
            </div>

            {/* Heading */}
            <div style={{ textAlign: 'center', margin: '1.25rem 0 1rem' }}>
              <PillBadge>
                {lang === 'ES' ? 'ERP de construcción · 22 países' : 'Construction ERP · 22 countries'}
              </PillBadge>
              <h2 style={{ color: WHITE, fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                {t.reg_title}
              </h2>
              <p style={{ color: `rgba(180,210,255,0.60)`, fontSize: 13, margin: '0 0 16px' }}>{t.reg_sub}</p>

              {/* Plan selector */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'starter',    name: 'Starter',    users: 1, projects: 2,  price: '$29.99/m', fg: '#5F5E5A', bg: 'rgba(95,94,90,0.15)' },
                  { id: 'pro',        name: 'Pro',         users: 3, projects: 5,  price: '$49.99/m', fg: BLUE_200, bg: `rgba(46,120,214,0.18)` },
                  { id: 'enterprise', name: 'Enterprise',  users: 5, projects: 10, price: '$69.99/m', fg: '#B4B0FF', bg: 'rgba(60,52,137,0.22)' },
                ].map(plan => {
                  const active = selectedPlan === plan.id
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      style={{
                        flex: 1, minWidth: 0,
                        padding: '10px 6px',
                        borderRadius: 10,
                        border: active
                          ? `1.5px solid ${BLUE_400}`
                          : `1px solid rgba(127,168,212,0.20)`,
                        background: active ? 'rgba(46,120,214,0.20)' : 'rgba(11,28,54,0.45)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 150ms',
                      }}
                    >
                      <p style={{ color: active ? WHITE : `rgba(200,220,255,0.72)`, fontWeight: 700, fontSize: 13, margin: '0 0 3px' }}>
                        {plan.name}
                      </p>
                      <p style={{ color: active ? BLUE_200 : `rgba(147,184,216,0.50)`, fontSize: 11, margin: '0 0 2px' }}>
                        {lang === 'ES'
                          ? `${plan.users} usuario${plan.users > 1 ? 's' : ''} · ${plan.projects} proyectos`
                          : `${plan.users} user${plan.users > 1 ? 's' : ''} · ${plan.projects} projects`}
                      </p>
                      <p style={{ color: active ? BLUE_200 : `rgba(100,150,200,0.45)`, fontSize: 11, margin: 0 }}>
                        {plan.price}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {regSuccess ? (
              <div style={{
                background: 'rgba(26,158,92,0.10)',
                border: `1px solid rgba(26,158,92,0.30)`,
                borderRadius: 12, padding: '1.5rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
                <p style={{ color: GREEN_500, fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}>{t.reg_success}</p>
                <button
                  onClick={() => { setView('login'); setRegSuccess(false) }}
                  style={{
                    background: 'none', border: 'none',
                    color: BLUE_200, fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  {t.reg_back}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t.reg_name} *</label>
                    <input style={inputBaseNoIcon} value={reg.nombre} onChange={setR('nombre')} placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.reg_company} *</label>
                    <input style={inputBaseNoIcon} value={reg.empresa} onChange={setR('empresa')} placeholder="Constructora XYZ" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t.reg_phone} *</label>
                    <input style={inputBaseNoIcon} value={reg.telefono} onChange={setR('telefono')} placeholder="+1 555 000 0000" />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.reg_country} *</label>
                    <select style={selectStyle} value={reg.pais} onChange={setR('pais')}>
                      <option value="" style={{ backgroundColor: NAVY_900, color: WHITE }}>{t.reg_select}</option>
                      {PAISES[lang].map(p => (
                        <option key={p} value={p} style={{ backgroundColor: NAVY_900, color: WHITE }}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t.reg_email} *</label>
                  <input type="email" style={inputBaseNoIcon} value={reg.email} onChange={setR('email')} placeholder="juan@empresa.com" />
                </div>

                <div>
                  <label style={labelStyle}>{t.reg_password} *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      style={{ ...inputBaseNoIcon, paddingRight: '42px' }}
                      value={reg.password}
                      onChange={setR('password')}
                      placeholder="••••••••"
                    />
                    <button type="button" style={eyeBtn} onClick={() => setShowRegPass(v => !v)} aria-label={showRegPass ? t.hide_pass : t.show_pass}>
                      <EyeIcon visible={showRegPass} />
                    </button>
                  </div>
                </div>

                {/* Referral code */}
                <div>
                  <label style={{ ...labelStyle, color: `rgba(180,200,240,0.50)` }}>{t.reg_ref_code}</label>
                  <input
                    type="text"
                    style={{ ...inputBaseNoIcon, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    value={reg.ref_code}
                    onChange={e => setReg(f => ({ ...f, ref_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                    maxLength={20}
                    placeholder={t.reg_ref_code_ph}
                  />
                  {reg.ref_code && (
                    <p style={{ fontSize: 11, color: GREEN_500, marginTop: 4 }}>
                      ✓ {t.reg_ref_applied}: {reg.ref_code}
                    </p>
                  )}
                </div>

                {/* Terms */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingTop: 4 }}>
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    style={{ marginTop: 2, width: 15, height: 15, cursor: 'pointer', flexShrink: 0, accentColor: BLUE_500 }}
                  />
                  <label htmlFor="terms" style={{ fontSize: 12, color: `rgba(180,200,240,0.62)`, lineHeight: 1.5, cursor: 'pointer' }}>
                    {t.reg_terms}{' '}
                    <button type="button" onClick={() => setLegalModal('tos')}
                      style={{ background: 'none', border: 'none', color: BLUE_200, cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}>
                      {t.reg_terms_link}
                    </button>
                    {' '}{t.reg_and}{' '}
                    <button type="button" onClick={() => setLegalModal('pp')}
                      style={{ background: 'none', border: 'none', color: BLUE_200, cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}>
                      {t.reg_privacy_link}
                    </button>
                    {' '}de MARY.
                  </label>
                </div>

                {regError && <ErrorBox msg={regError} />}

                <button type="submit" disabled={regLoading} style={{ ...btnPrimary, marginTop: 4, opacity: regLoading ? 0.6 : 1 }}>
                  {regLoading ? t.reg_loading : t.reg_btn}
                </button>

                <button type="button" onClick={() => setView('login')}
                  style={{
                    background: 'none', border: 'none',
                    color: `rgba(200,220,255,0.72)`,
                    fontSize: 13, cursor: 'pointer', padding: '8px',
                    textDecoration: 'underline', textUnderlineOffset: '3px',
                    textDecorationColor: `rgba(200,220,255,0.22)`,
                  }}>
                  {t.reg_back}
                </button>
              </form>
            )}

            <footer style={footerStyle}>
              <p style={footerTextStyle}>{t.footer}</p>
            </footer>
          </div>
        </div>
      )}

      {/* ── FORGOT PASSWORD ───────────────────────────────────────────────── */}
      {view === 'forgot' && (
        <div style={bgStyle}>
          <LangToggle lang={lang} setLang={setLang} />
          <div style={{ ...cardStyle, maxWidth: 400 }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <MaryLogoSVG />
              <AccentDivider />
            </div>

            <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
              <h2 style={{ color: WHITE, fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.3px' }}>{t.forgot_title}</h2>
              <p style={{ color: `rgba(180,210,255,0.60)`, fontSize: 13, margin: 0 }}>{t.forgot_sub}</p>
            </div>

            {forgotSent ? (
              <div style={{
                background: 'rgba(26,158,92,0.10)',
                border: `1px solid rgba(26,158,92,0.30)`,
                borderRadius: 12, padding: '1.5rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📧</div>
                <p style={{ color: GREEN_500, fontWeight: 600, fontSize: 13, margin: 0 }}>{t.forgot_sent}</p>
              </div>
            ) : (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <FieldIcon>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </FieldIcon>
                  <input
                    type="email"
                    placeholder={t.email}
                    style={inputBase}
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={forgotLoading} style={{ ...btnPrimary, opacity: forgotLoading ? 0.6 : 1 }}>
                  {forgotLoading ? t.forgot_loading : t.forgot_btn}
                </button>
              </form>
            )}

            <button
              onClick={() => setView('login')}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                background: 'none', border: 'none',
                color: `rgba(200,220,255,0.72)`,
                fontSize: 13, cursor: 'pointer', padding: '12px', marginTop: 8,
                textDecoration: 'underline', textUnderlineOffset: '3px',
                textDecorationColor: `rgba(200,220,255,0.22)`,
              }}
            >
              {t.forgot_back}
            </button>

            <footer style={footerStyle}>
              <p style={footerTextStyle}>{t.footer}</p>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
