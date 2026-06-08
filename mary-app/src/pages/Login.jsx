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

// ── ESTILOS COMPARTIDOS ───────────────────────────────────────────────────
const BG = { background: '#000000' }
const BG_RADIAL = {
  background: 'radial-gradient(ellipse at 70% 20%, rgba(26,94,180,0.10) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(36,185,100,0.07) 0%, transparent 50%), #000000'
}

const inputBase = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(150,180,220,0.18)',
  borderRadius: '10px',
  padding: '13px 14px 13px 42px',
  fontFamily: 'inherit',
  fontSize: '14px',
  color: '#ffffff',
  outline: 'none',
}

const inputBaseNoIcon = {
  ...inputBase,
  padding: '13px 14px',
}

const inputBaseWithEye = {
  ...inputBase,
  paddingRight: '42px',
}

const btnPrimary = {
  width: '100%',
  padding: '14px',
  borderRadius: '10px',
  border: 'none',
  background: '#1a5eb4',
  color: '#ffffff',
  fontFamily: 'inherit',
  fontSize: '15px',
  fontWeight: '700',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxShadow: '0 0 0 1px rgba(80,150,255,0.3), 0 4px 20px rgba(26,94,180,0.4)',
}

// ── LOGO SVG ──────────────────────────────────────────────────────────────
const MaryLogoSVG = () => (
  <svg
    viewBox="0 0 320 90"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '380px', height: 'auto', display: 'block', margin: '0 auto', filter: 'drop-shadow(0 2px 20px rgba(26,94,180,0.35))' }}
    aria-label="MARY"
  >
    <g transform="translate(10,5)">
      <rect x="28" y="48" width="14" height="26" rx="2" fill="#7a8fa6" opacity="0.7"/>
      <rect x="44" y="38" width="14" height="36" rx="2" fill="#a0b4c8" opacity="0.7"/>
      <rect x="60" y="28" width="14" height="46" rx="2" fill="#c0d0e0" opacity="0.7"/>
      <ellipse cx="51" cy="54" rx="30" ry="9" fill="none" stroke="#3a8adc" strokeWidth="2.5" opacity="0.8"/>
      <ellipse cx="51" cy="54" rx="24" ry="7" fill="none" stroke="#2a6ab8" strokeWidth="1.5" opacity="0.5"/>
      <rect x="46" y="28" width="16" height="16" rx="3" fill="#3bb876" opacity="0.95"/>
      <rect x="62" y="18" width="13" height="13" rx="3" fill="#26d4ff" opacity="0.85"/>
      <line x1="62" y1="32" x2="80" y2="10" stroke="#3bb876" strokeWidth="2.5" opacity="0.9"/>
      <polygon points="80,5 85,14 75,14" fill="#3bb876" opacity="0.9"/>
    </g>
    <text x="110" y="60" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="52" fill="#ffffff" letterSpacing="2">MARY</text>
    <text x="110" y="78" fontFamily="Arial, sans-serif" fontWeight="500" fontSize="11" fill="rgba(180,210,255,0.45)" letterSpacing="4">MANAGEMENT &amp; RESOURCES YIELD</text>
  </svg>
)

// ── LOGO + ACENTO ─────────────────────────────────────────────────────────
const Logo = () => (
  <div style={{ textAlign: 'center', marginBottom: '1.25rem', marginTop: '-1.5rem' }}>
    <MaryLogoSVG />
    <div style={{ width: '40px', height: '3px', background: 'linear-gradient(90deg, #1a9e5c, #1a5eb4)', borderRadius: '2px', margin: '0.5rem auto 0' }} />
  </div>
)

// ── TOGGLE IDIOMA ─────────────────────────────────────────────────────────
const LangToggle = ({ lang, setLang }) => (
  <button
    onClick={() => setLang(l => l === 'ES' ? 'EN' : 'ES')}
    style={{
      position: 'absolute', top: '1rem', right: '1rem',
      fontSize: '11px', fontWeight: '600',
      color: 'rgba(200,220,255,0.7)',
      background: 'rgba(255,255,255,0.05)',
      border: '0.5px solid rgba(200,220,255,0.2)',
      borderRadius: '6px', padding: '5px 10px',
      cursor: 'pointer', letterSpacing: '0.05em',
    }}
  >
    🌐 {lang === 'ES' ? 'EN' : 'ES'}
  </button>
)

// ── ICONO OJO ─────────────────────────────────────────────────────────────
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

  const content = type === 'tos' ? (isEs ? TOS_ES : TOS_EN) : (isEs ? PP_ES : PP_EN)
  const title   = type === 'tos' ? t.tos_title : t.pp_title

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.80)' }}>
      <div style={{ width: '100%', maxWidth: '640px', background: '#0d0d0d', border: '0.5px solid rgba(150,180,220,0.15)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '0.5px solid rgba(150,180,220,0.1)' }}>
          <div>
            <p style={{ color: '#ffffff', fontWeight: '700', fontSize: '15px', margin: 0 }}>{title}</p>
            <p style={{ color: 'rgba(150,180,220,0.4)', fontSize: '11px', margin: '2px 0 0' }}>{t.last_updated} · Marquez Project Solutions LLC</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(150,180,220,0.6)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px 8px' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {content.trim().split('\n').map((line, i) => {
            const trimmed = line.trim()
            if (!trimmed) return <div key={i} style={{ height: '8px' }} />
            if (/^\d+\./.test(trimmed) && trimmed.length < 60)
              return <p key={i} style={{ color: '#6fa8e0', fontWeight: '700', fontSize: '13px', marginTop: '16px', marginBottom: '4px' }}>{trimmed}</p>
            if (trimmed.startsWith('TÉRMINOS') || trimmed.startsWith('POLÍTICA') || trimmed.startsWith('TERMS') || trimmed.startsWith('PRIVACY'))
              return <p key={i} style={{ color: '#ffffff', fontWeight: '900', fontSize: '15px', margin: 0 }}>{trimmed}</p>
            if (trimmed.startsWith('Marquez Project') && i < 5)
              return <p key={i} style={{ color: 'rgba(150,180,220,0.5)', fontSize: '11px', margin: 0 }}>{trimmed}</p>
            if (trimmed.startsWith('Última actualización') || trimmed.startsWith('Last updated'))
              return <p key={i} style={{ color: 'rgba(150,180,220,0.35)', fontSize: '11px', marginBottom: '12px' }}>{trimmed}</p>
            if (trimmed.startsWith('-'))
              return <p key={i} style={{ color: 'rgba(200,220,255,0.75)', fontSize: '13px', paddingLeft: '16px', marginBottom: '4px' }}>• {trimmed.slice(1).trim()}</p>
            return <p key={i} style={{ color: 'rgba(200,220,255,0.75)', fontSize: '13px', lineHeight: '1.7', marginBottom: '8px' }}>{trimmed}</p>
          })}
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '0.5px solid rgba(150,180,220,0.1)' }}>
          <button onClick={onClose} style={{ ...btnPrimary, fontSize: '14px', padding: '12px' }}>{t.close}</button>
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
function detectLang() {
  const saved = localStorage.getItem('mary_lang')
  if (saved === 'ES' || saved === 'EN') return saved
  const browser = (navigator.language || navigator.languages?.[0] || 'es').toLowerCase()
  return browser.startsWith('es') ? 'ES' : 'EN'
}

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

  // Login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Register
  const [reg, setReg]               = useState({ nombre:'', empresa:'', telefono:'', email:'', password:'', pais:'', ref_code:'' })
  const [showRegPass, setShowRegPass] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [regError, setRegError]     = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
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
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ nombre: reg.nombre, empresa: reg.empresa, telefono: reg.telefono, email: reg.email, password: reg.password, pais: reg.pais, plan: selectedPlan, ref_code: reg.ref_code.trim().toUpperCase() || undefined, lang })
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
    } catch { }
    setForgotLoading(false)
  }

  // ── Estilos inline reutilizables ────────────────────────────────────────
  const screenWrap = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    position: 'relative',
    ...BG_RADIAL,
  }

  const fieldIconStyle = {
    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
    color: 'rgba(150,180,220,0.45)', pointerEvents: 'none', display: 'flex', alignItems: 'center',
  }

  const eyeBtnStyle = {
    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(150,180,220,0.5)', display: 'flex', alignItems: 'center', padding: 0,
  }

  const labelStyle = { fontSize: '12px', color: 'rgba(180,200,240,0.6)', display: 'block', marginBottom: '4px' }

  const inputNoIconStyle = {
    ...inputBaseNoIcon,
    border: '0.5px solid rgba(150,180,220,0.18)',
  }

  const selectStyle = {
    ...inputBaseNoIcon,
    border: '0.5px solid rgba(150,180,220,0.18)',
    cursor: 'pointer',
    color: '#ffffff',
    backgroundColor: '#0d1117',
  }

  const footerStyle = {
    marginTop: '2rem', textAlign: 'center',
    borderTop: '0.5px solid rgba(150,180,220,0.07)', paddingTop: '1rem',
  }

  const footerTextStyle = {
    fontSize: '10px', fontWeight: '600', letterSpacing: '0.25em',
    color: 'rgba(150,180,220,0.28)', textTransform: 'uppercase', margin: 0,
  }

  return (
    <>
      {legalModal && (
        <LegalModal type={legalModal} lang={lang} onClose={() => setLegalModal(null)} />
      )}

      {/* ── LOGIN ─────────────────────────────────────────────────────────── */}
      {view === 'login' && (
        <div style={screenWrap}>
          <LangToggle lang={lang} setLang={setLang} />
          <div style={{ width: '100%', maxWidth: '380px' }}>
            <Logo />
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Email */}
              <div style={{ position: 'relative' }}>
                <span style={fieldIconStyle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder={t.email}
                  style={inputBase}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password con ojo */}
              <div style={{ position: 'relative' }}>
                <span style={fieldIconStyle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder={t.password}
                  style={inputBaseWithEye}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  style={eyeBtnStyle}
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? t.hide_pass : t.show_pass}
                >
                  <EyeIcon visible={showPass} />
                </button>
              </div>

              {error && (
                <div style={{ background: 'rgba(220,60,60,0.08)', border: '0.5px solid rgba(220,80,80,0.25)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#f08080', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ ...btnPrimary, marginTop: '4px', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? t.loading : t.enter}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => { setView('forgot'); setForgotSent(false); setForgotEmail('') }}
                style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: '500', color: 'rgba(200,220,255,0.75)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(200,220,255,0.25)' }}
              >
                {t.forgot}
              </button>
              <div style={{ borderTop: '0.5px solid rgba(150,180,220,0.1)', paddingTop: '12px' }}>
                <button
                  onClick={() => { setView('register'); setRegError(''); setRegSuccess(false); setTermsAccepted(false); setSelectedPlan('') }}
                  style={{ width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid rgba(80,150,255,0.55)', background: 'rgba(26,94,180,0.12)', color: '#a8ccf8', fontSize: '14px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.01em' }}
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

      {/* ── REGISTRO ──────────────────────────────────────────────────────── */}
      {view === 'register' && (
        <div style={screenWrap}>
          <LangToggle lang={lang} setLang={setLang} />
          <div style={{ width: '100%', maxWidth: '460px' }}>
            <Logo />
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{t.reg_title}</h2>
              <p style={{ color: 'rgba(180,200,240,0.6)', fontSize: '13px', margin: '0 0 16px' }}>{t.reg_sub}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'starter',    labelEs: 'Starter',    labelEn: 'Starter',    users: 1, projects: 2,  price: '$29.99/m' },
                  { id: 'pro',        labelEs: 'Pro',        labelEn: 'Pro',        users: 3, projects: 5,  price: '$49.99/m' },
                  { id: 'enterprise', labelEs: 'Enterprise', labelEn: 'Enterprise', users: 5, projects: 10, price: '$69.99/m' },
                ].map(plan => {
                  const active = selectedPlan === plan.id
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      style={{
                        flex: 1, minWidth: '120px',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: active ? '1.5px solid #3a8adc' : '0.5px solid rgba(150,180,220,0.2)',
                        background: active ? 'rgba(26,94,180,0.22)' : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <p style={{ color: active ? '#ffffff' : 'rgba(200,220,255,0.75)', fontWeight: '700', fontSize: '13px', margin: '0 0 4px' }}>
                        {lang === 'ES' ? plan.labelEs : plan.labelEn}
                      </p>
                      <p style={{ color: active ? 'rgba(180,210,255,0.8)' : 'rgba(150,180,220,0.5)', fontSize: '11px', margin: '0 0 2px' }}>
                        {lang === 'ES' ? `${plan.users} usuario${plan.users > 1 ? 's' : ''} · ${plan.projects} proyectos` : `${plan.users} user${plan.users > 1 ? 's' : ''} · ${plan.projects} projects`}
                      </p>
                      <p style={{ color: active ? '#6fa8e0' : 'rgba(100,150,200,0.45)', fontSize: '11px', margin: 0 }}>
                        {plan.price}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {regSuccess ? (
              <div style={{ background: 'rgba(36,185,100,0.08)', border: '0.5px solid rgba(36,185,100,0.25)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
                <p style={{ color: '#3bb876', fontWeight: '600', fontSize: '14px', margin: '0 0 12px' }}>{t.reg_success}</p>
                <button onClick={() => { setView('login'); setRegSuccess(false) }}
                  style={{ background: 'none', border: 'none', color: '#6fa8e0', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                  {t.reg_back}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>{t.reg_name} *</label>
                    <input style={inputNoIconStyle} value={reg.nombre} onChange={setR('nombre')} placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.reg_company} *</label>
                    <input style={inputNoIconStyle} value={reg.empresa} onChange={setR('empresa')} placeholder="Constructora XYZ" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>{t.reg_phone} *</label>
                    <input style={inputNoIconStyle} value={reg.telefono} onChange={setR('telefono')} placeholder="+1 555 000 0000" />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.reg_country} *</label>
                    <select style={selectStyle} value={reg.pais} onChange={setR('pais')}>
                      <option value="" style={{ backgroundColor: '#0d1117', color: '#ffffff' }}>{t.reg_select}</option>
                      {PAISES[lang].map(p => (
                        <option key={p} value={p} style={{ backgroundColor: '#0d1117', color: '#ffffff' }}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t.reg_email} *</label>
                  <input type="email" style={inputNoIconStyle} value={reg.email} onChange={setR('email')} placeholder="juan@empresa.com" />
                </div>

                {/* Password con ojo */}
                <div>
                  <label style={labelStyle}>{t.reg_password} *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      style={{ ...inputNoIconStyle, paddingRight: '42px' }}
                      value={reg.password}
                      onChange={setR('password')}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      style={eyeBtnStyle}
                      onClick={() => setShowRegPass(v => !v)}
                      aria-label={showRegPass ? t.hide_pass : t.show_pass}
                    >
                      <EyeIcon visible={showRegPass} />
                    </button>
                  </div>
                </div>

                {/* Código de referido — opcional */}
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(180,200,240,0.5)', display: 'block', marginBottom: '5px', letterSpacing: '0.03em' }}>
                    {t.reg_ref_code}
                  </label>
                  <input
                    type="text"
                    style={{ ...inputNoIconStyle, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    value={reg.ref_code}
                    onChange={e => setReg(f => ({ ...f, ref_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                    maxLength={20}
                    placeholder={t.reg_ref_code_ph}
                  />
                  {reg.ref_code && (
                    <p style={{ fontSize: '11px', color: '#3bb876', marginTop: '4px' }}>
                      ✓ {t.reg_ref_applied}: {reg.ref_code}
                    </p>
                  )}
                </div>

                {/* Términos */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    style={{ marginTop: '2px', width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <label htmlFor="terms" style={{ fontSize: '12px', color: 'rgba(180,200,240,0.6)', lineHeight: '1.5', cursor: 'pointer' }}>
                    {t.reg_terms}{' '}
                    <button type="button" onClick={() => setLegalModal('tos')}
                      style={{ background: 'none', border: 'none', color: '#6fa8e0', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px', padding: 0 }}>
                      {t.reg_terms_link}
                    </button>
                    {' '}{t.reg_and}{' '}
                    <button type="button" onClick={() => setLegalModal('pp')}
                      style={{ background: 'none', border: 'none', color: '#6fa8e0', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px', padding: 0 }}>
                      {t.reg_privacy_link}
                    </button>
                    {' '}de MARY.
                  </label>
                </div>

                {regError && (
                  <div style={{ background: 'rgba(220,60,60,0.08)', border: '0.5px solid rgba(220,80,80,0.25)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#f08080', textAlign: 'center' }}>
                    {regError}
                  </div>
                )}

                <button type="submit" disabled={regLoading} style={{ ...btnPrimary, marginTop: '4px', opacity: regLoading ? 0.6 : 1 }}>
                  {regLoading ? t.reg_loading : t.reg_btn}
                </button>

                <button type="button" onClick={() => setView('login')}
                  style={{ background: 'none', border: 'none', color: 'rgba(200,220,255,0.75)', fontSize: '13px', cursor: 'pointer', padding: '8px', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(200,220,255,0.25)' }}>
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
        <div style={screenWrap}>
          <LangToggle lang={lang} setLang={setLang} />
          <div style={{ width: '100%', maxWidth: '380px' }}>
            <Logo />
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{t.forgot_title}</h2>
              <p style={{ color: 'rgba(180,200,240,0.6)', fontSize: '13px', margin: 0 }}>{t.forgot_sub}</p>
            </div>

            {forgotSent ? (
              <div style={{ background: 'rgba(36,185,100,0.08)', border: '0.5px solid rgba(36,185,100,0.25)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📧</div>
                <p style={{ color: '#3bb876', fontWeight: '600', fontSize: '13px', margin: 0 }}>{t.forgot_sent}</p>
              </div>
            ) : (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={fieldIconStyle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
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

            <button onClick={() => setView('login')}
              style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', color: 'rgba(200,220,255,0.75)', fontSize: '13px', cursor: 'pointer', padding: '12px', marginTop: '8px', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(200,220,255,0.25)' }}>
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
