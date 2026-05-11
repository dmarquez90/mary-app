import { useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'

const PAISES = [
  'Estados Unidos','México','Guatemala','El Salvador','Honduras','Nicaragua',
  'Costa Rica','Panamá','Colombia','Venezuela','Ecuador','Perú','Bolivia',
  'Chile','Argentina','Uruguay','Paraguay','España','Otro'
]

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
    reg_title:         'Prueba MARY por 60 días',
    reg_sub:           'Plan Pro gratis. Sin tarjeta de crédito.',
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
    // Documentos legales
    tos_title:         'Términos de Servicio',
    pp_title:          'Política de Privacidad',
    close:             'Cerrar',
    last_updated:      'Última actualización: Mayo 2026',
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
    reg_title:         'Try MARY for 60 days',
    reg_sub:           'Pro plan free. No credit card required.',
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
  }
}

const inputCls       = 'w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm'
const inputClsNoIcon = 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm'

// ── MODAL LEGAL ───────────────────────────────────────────────────────────
function LegalModal({ type, lang, onClose }) {
  const t    = T[lang]
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

Implementamos medidas técnicas y organizativas razonables para proteger su información contra acceso no autorizado, pérdida, alteración o divulgación. Esto incluye cifrado de contraseñas, comunicaciones cifradas mediante TLS/HTTPS y control de acceso basado en roles. Sin embargo, ningún sistema de seguridad es completamente infalible. Marquez Project Solutions LLC no garantiza seguridad absoluta frente a ataques externos o brechas causadas por terceros. En caso de una brecha de seguridad que afecte sus datos, le notificaremos en el menor tiempo posible.

6. SUS DERECHOS

Usted tiene derecho a:

- Acceder a los datos personales que tenemos sobre usted
- Solicitar la corrección de información incorrecta o desactualizada
- Solicitar la eliminación de su cuenta y datos personales
- Retirar su consentimiento en cualquier momento

Para ejercer cualquiera de estos derechos, escríbanos a: deybi@marquezprojectsolutions.com. Responderemos en un plazo máximo de 30 días hábiles.

7. COOKIES

MARY utiliza únicamente cookies técnicas estrictamente necesarias para el funcionamiento del sistema, como el mantenimiento de su sesión activa y preferencias de idioma. No utilizamos cookies de publicidad, seguimiento ni análisis de comportamiento de terceros.

8. RETENCIÓN DE DATOS

Sus datos se conservan mientras su cuenta esté activa. Al cancelar su cuenta, sus datos serán eliminados permanentemente después de un período de retención de 30 días, salvo que la ley aplicable exija su conservación por un período mayor.

9. CAMBIOS A ESTA POLÍTICA

Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos por correo electrónico ante cambios significativos. El uso continuado del servicio después de la notificación constituye su aceptación de la política actualizada.

10. CONTACTO

Para preguntas sobre esta Política de Privacidad:
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
- Generate anonymous and aggregated statistics about platform usage (without identifying specific persons or companies)
- Improve system functionalities
- Comply with applicable legal obligations

3. STATISTICS AND PUBLIC MENTIONS

Marquez Project Solutions LLC may publicly mention general platform usage metrics, such as the total number of registered companies or countries where MARY operates. Under no circumstances will company names, users, financial data or operational information of any client be revealed without their express written authorization.

4. SHARING INFORMATION WITH THIRD PARTIES

We do not sell, rent or share your personal information with third parties for commercial purposes. We only share information with technology infrastructure providers necessary to operate the service (cloud storage, authentication and service delivery), who are contractually obligated to protect your information and not use it for any other purpose.

5. DATA SECURITY

We implement reasonable technical and organizational measures to protect your information against unauthorized access, loss, alteration or disclosure. This includes password encryption, encrypted communications via TLS/HTTPS and role-based access control. However, no security system is completely infallible. Marquez Project Solutions LLC does not guarantee absolute security against external attacks or breaches caused by third parties. In the event of a security breach affecting your data, we will notify you as soon as possible.

6. YOUR RIGHTS

You have the right to:

- Access the personal data we hold about you
- Request correction of incorrect or outdated information
- Request deletion of your account and personal data
- Withdraw your consent at any time

To exercise any of these rights, write to us at: deybi@marquezprojectsolutions.com. We will respond within a maximum of 30 business days.

7. COOKIES

MARY uses only strictly necessary technical cookies for the system to function, such as maintaining your active session and language preferences. We do not use advertising, tracking or third-party behavioral analysis cookies.

8. DATA RETENTION

Your data is retained while your account is active. Upon cancellation of your account, your data will be permanently deleted after a 30-day retention period, unless applicable law requires its retention for a longer period.

9. CHANGES TO THIS POLICY

We may update this Privacy Policy periodically. We will notify you by email of significant changes. Continued use of the service after notification constitutes your acceptance of the updated policy.

10. CONTACT

For questions about this Privacy Policy:
Marquez Project Solutions LLC
deybi@marquezprojectsolutions.com
www.marquezprojectsolutions.com
California, United States
`

  const content = type === 'tos'
    ? (isEs ? TOS_ES : TOS_EN)
    : (isEs ? PP_ES  : PP_EN)

  const title = type === 'tos' ? t.tos_title : t.pp_title

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <p className="text-white font-bold text-base">{title}</p>
            <p className="text-slate-500 text-xs mt-0.5">{t.last_updated} · Marquez Project Solutions LLC</p>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {content.trim().split('\n').map((line, i) => {
            const trimmed = line.trim()
            if (!trimmed) return <div key={i} className="h-2" />
            if (/^\d+\./.test(trimmed) && trimmed.length < 60) {
              return <p key={i} className="text-blue-400 font-bold text-sm mt-4 mb-1">{trimmed}</p>
            }
            if (trimmed.startsWith('TÉRMINOS') || trimmed.startsWith('POLÍTICA') || trimmed.startsWith('TERMS') || trimmed.startsWith('PRIVACY')) {
              return <p key={i} className="text-white font-black text-base mb-0">{trimmed}</p>
            }
            if (trimmed.startsWith('Marquez Project') && i < 5) {
              return <p key={i} className="text-slate-400 text-xs mb-0">{trimmed}</p>
            }
            if (trimmed.startsWith('Última actualización') || trimmed.startsWith('Last updated')) {
              return <p key={i} className="text-slate-500 text-xs mb-3">{trimmed}</p>
            }
            if (trimmed.startsWith('-')) {
              return <p key={i} className="text-slate-300 text-sm pl-4 mb-1">• {trimmed.slice(1).trim()}</p>
            }
            return <p key={i} className="text-slate-300 text-sm leading-relaxed mb-2">{trimmed}</p>
          })}
        </div>
        <div className="px-6 py-4 border-t border-slate-700">
          <button onClick={onClose}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTES BASE ──────────────────────────────────────────────────────
const Logo = ({ lang }) => (
  <div className="text-center mb-8">
    <div className="flex justify-center mb-4">
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/30 rotate-3">
        <span className="text-white text-2xl font-black -rotate-3">M</span>
      </div>
    </div>
    <h1 className="text-white text-3xl font-black tracking-tighter">
      MARY<span className="text-blue-500">.</span>
    </h1>
    <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] mt-1 font-bold">{T[lang].tagline}</p>
  </div>
)

const LangToggle = ({ lang, setLang }) => (
  <button onClick={() => setLang(l => l === 'ES' ? 'EN' : 'ES')}
    className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
    🌐 {lang === 'ES' ? 'EN' : 'ES'}
  </button>
)

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export default function Login({ onNavigate }) {
  const { login }               = useAuth()
  const [lang, setLang]         = useState('ES')
  const [view, setView]         = useState('login')
  const [legalModal, setLegalModal] = useState(null) // 'tos' | 'pp' | null
  const t = T[lang]

  // Login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Register
  const [reg, setReg]           = useState({ nombre:'', empresa:'', telefono:'', email:'', password:'', pais:'' })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const setR = k => e => setReg(f => ({ ...f, [k]: e.target.value }))

  // Forgot
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
    if (!termsAccepted) {
      setRegError(t.reg_terms_required); return
    }
    setRegLoading(true)
    try {
      const { data: empresaExistente } = await supabase
        .from('tenants').select('id').ilike('nombre_empresa', reg.empresa).maybeSingle()
      if (empresaExistente) { setRegError(t.err_company_taken); setRegLoading(false); return }

      const ahora    = new Date()
      const trialFin = new Date(ahora)
      trialFin.setDate(trialFin.getDate() + 60)

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants').insert({
          nombre_empresa: reg.empresa,
          plan:           'pro',
          max_usuarios:   15,
          max_proyectos:  10,
          activo:         true,
          es_trial:       true,
          trial_inicio:   ahora.toISOString(),
          trial_fin:      trialFin.toISOString(),
          telefono:       reg.telefono,
          pais:           reg.pais,
          fecha_creacion: ahora.toISOString(),
        }).select().single()

      if (tenantError) throw tenantError

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email:         reg.email,
        password:      reg.password,
        email_confirm: true,
      })

      if (authError) {
        await supabase.from('tenants').delete().eq('id', tenant.id)
        if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
          setRegError(t.err_email_taken)
        } else { throw authError }
        setRegLoading(false); return
      }

      await supabase.from('usuarios').insert({
        id:                    authData.user.id,
        tenant_id:             tenant.id,
        nombre:                reg.nombre,
        email:                 reg.email,
        rol:                   'client_admin',
        activo:                true,
        terminos_aceptados:    true,
        fecha_terminos:        ahora.toISOString(),
      })

      setRegSuccess(true)
      setReg({ nombre:'', empresa:'', telefono:'', email:'', password:'', pais:'' })
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
    } catch { }
    setForgotLoading(false)
  }

  return (
    <>
      {/* Modal legal */}
      {legalModal && (
        <LegalModal type={legalModal} lang={lang} onClose={() => setLegalModal(null)} />
      )}

      {/* ── LOGIN ─────────────────────────────────────────────────────── */}
      {view === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: '#0f172a' }}>
          <LangToggle lang={lang} setLang={setLang} />
          <div className="w-full max-w-sm">
            <Logo lang={lang} />
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input type="email" placeholder={t.email} className={inputCls}
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input type="password" placeholder={t.password} className={inputCls}
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && (
                <div className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl text-white font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
                {loading ? t.loading : t.enter}
              </button>
            </form>
            <div className="text-center mt-6 flex flex-col gap-3">
              <button onClick={() => { setView('forgot'); setForgotSent(false); setForgotEmail('') }}
                className="text-slate-400 text-sm hover:text-white transition-colors">{t.forgot}</button>
              <div className="border-t border-slate-800 pt-4">
                <button onClick={() => { setView('register'); setRegError(''); setRegSuccess(false); setTermsAccepted(false) }}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-all">
                  ✨ {t.try}
                </button>
              </div>
            </div>
            <footer className="mt-10 text-center border-t border-slate-800 pt-6">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{t.footer}</p>
            </footer>
          </div>
        </div>
      )}

      {/* ── REGISTRO ──────────────────────────────────────────────────── */}
      {view === 'register' && (
        <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: '#0f172a' }}>
          <LangToggle lang={lang} setLang={setLang} />
          <div className="w-full max-w-md">
            <Logo lang={lang} />
            <div className="text-center mb-6">
              <h2 className="text-white text-xl font-bold">{t.reg_title}</h2>
              <p className="text-slate-400 text-sm mt-1">{t.reg_sub}</p>
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                {(lang === 'ES'
                  ? ['✓ 60 días gratis','✓ Plan Pro','✓ Sin tarjeta']
                  : ['✓ 60 days free','✓ Pro plan','✓ No credit card']
                ).map((b,i) => (
                  <span key={i} className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">{b}</span>
                ))}
              </div>
            </div>

            {regSuccess ? (
              <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-green-400 font-semibold text-sm">{t.reg_success}</p>
                <button onClick={() => { setView('login'); setRegSuccess(false) }}
                  className="mt-4 text-blue-400 text-sm hover:text-white transition-colors">{t.reg_back}</button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{t.reg_name} *</label>
                    <input className={inputClsNoIcon} value={reg.nombre} onChange={setR('nombre')} placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{t.reg_company} *</label>
                    <input className={inputClsNoIcon} value={reg.empresa} onChange={setR('empresa')} placeholder="Constructora XYZ" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{t.reg_phone} *</label>
                    <input className={inputClsNoIcon} value={reg.telefono} onChange={setR('telefono')} placeholder="+1 555 000 0000" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{t.reg_country} *</label>
                    <select className={inputClsNoIcon + ' cursor-pointer'} value={reg.pais} onChange={setR('pais')}>
                      <option value="">{t.reg_select}</option>
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.reg_email} *</label>
                  <input type="email" className={inputClsNoIcon} value={reg.email} onChange={setR('email')} placeholder="juan@empresa.com" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.reg_password} *</label>
                  <input type="password" className={inputClsNoIcon} value={reg.password} onChange={setR('password')} placeholder="••••••••" />
                </div>

                {/* CHECKBOX TÉRMINOS */}
                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 cursor-pointer flex-shrink-0"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                    {t.reg_terms}{' '}
                    <button type="button" onClick={() => setLegalModal('tos')}
                      className="text-blue-400 hover:text-blue-300 underline font-medium">
                      {t.reg_terms_link}
                    </button>
                    {' '}{t.reg_and}{' '}
                    <button type="button" onClick={() => setLegalModal('pp')}
                      className="text-blue-400 hover:text-blue-300 underline font-medium">
                      {t.reg_privacy_link}
                    </button>
                    {' '}de MARY.
                  </label>
                </div>

                {regError && (
                  <div className="text-red-400 text-xs text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{regError}</div>
                )}

                <button type="submit" disabled={regLoading}
                  className="w-full py-4 rounded-xl text-white font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60 mt-2"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
                  {regLoading ? t.reg_loading : t.reg_btn}
                </button>

                <button type="button" onClick={() => setView('login')}
                  className="w-full text-center text-slate-400 text-sm hover:text-white transition-colors py-2">
                  {t.reg_back}
                </button>
              </form>
            )}

            <footer className="mt-6 text-center border-t border-slate-800 pt-4">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{t.footer}</p>
            </footer>
          </div>
        </div>
      )}

      {/* ── FORGOT PASSWORD ────────────────────────────────────────────── */}
      {view === 'forgot' && (
        <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: '#0f172a' }}>
          <LangToggle lang={lang} setLang={setLang} />
          <div className="w-full max-w-sm">
            <Logo lang={lang} />
            <div className="text-center mb-6">
              <h2 className="text-white text-xl font-bold">{t.forgot_title}</h2>
              <p className="text-slate-400 text-sm mt-1">{t.forgot_sub}</p>
            </div>
            {forgotSent ? (
              <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">📧</div>
                <p className="text-green-400 font-semibold text-sm">{t.forgot_sent}</p>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input type="email" placeholder={t.email} className={inputCls}
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                </div>
                <button type="submit" disabled={forgotLoading}
                  className="w-full py-4 rounded-xl text-white font-bold text-base hover:brightness-110 transition-all shadow-lg disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
                  {forgotLoading ? t.forgot_loading : t.forgot_btn}
                </button>
              </form>
            )}
            <button onClick={() => setView('login')}
              className="w-full text-center text-slate-400 text-sm hover:text-white transition-colors py-3 mt-4">
              {t.forgot_back}
            </button>
            <footer className="mt-8 text-center border-t border-slate-800 pt-6">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{t.footer}</p>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
