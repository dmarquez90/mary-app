// ─────────────────────────────────────────────────────────────
//  MARY — Textos de la landing page (ES / EN)
//  Separado de Landing.jsx solo por volumen de copy.
// ─────────────────────────────────────────────────────────────

export const PAISES_LANDING = {
  ES: [
    'Estados Unidos','México','Guatemala','El Salvador','Honduras','Nicaragua',
    'Costa Rica','Panamá','Colombia','Venezuela','Ecuador','Perú','Bolivia',
    'Chile','Argentina','Uruguay','Paraguay','España','Otro'
  ],
  EN: [
    'United States','Mexico','Guatemala','El Salvador','Honduras','Nicaragua',
    'Costa Rica','Panama','Colombia','Venezuela','Ecuador','Peru','Bolivia',
    'Chile','Argentina','Uruguay','Paraguay','Spain','Other'
  ],
}

export const LANDING = {
  ES: {
    // ── NAV ───────────────────────────────────────────────────
    nav: {
      modules:  'Módulos',
      flow:     'Cómo funciona',
      scurve:   'Curva S',
      pricing:  'Planes',
      training: 'Capacitación',
      faq:      'Preguntas',
      login:    'Iniciar sesión',
      trial:    'Probar gratis',
      menu:     'Menú',
    },

    // ── HERO ──────────────────────────────────────────────────
    hero: {
      badge:     'ERP de construcción · 22 países · ES / EN',
      title1:    'Todo tu proyecto de construcción,',
      titleHl:   'bajo control',
      title2:    'en una sola plataforma',
      sub:       'Presupuesto, materiales, compras, bodega, avance de obra y finanzas conectados entre sí. MARY calcula tu Curva S de presupuesto vs. real mientras tu equipo trabaja — sin hojas de cálculo sueltas ni cierres manuales a fin de mes.',
      cta1:      'Empezar prueba de 7 días',
      cta2:      'Agendar capacitación',
      micro:     'Sin tarjeta de crédito · Configuración en minutos · Cancela cuando quieras',
      mockTitle: 'Panel Principal',
      mockKpis:  [
        { label: 'Presupuesto',   value: '$1,284,500' },
        { label: 'Comprometido',  value: '$812,340' },
        { label: 'Avance real',   value: '63.2%' },
      ],
      mockChart: 'Curva S — Presupuesto vs. Real',
      mockLegendPlan: 'Planificado',
      mockLegendReal: 'Real',
      mockRows: [
        'OC-0142 · Acero de refuerzo #4 · Aprobada',
        'Salida bodega · Cemento gris 42.5kg · 120 sacos',
        'Bitácora · Fundición losa nivel 3 · 2 fotos',
        'Avalúo #7 · Cliente · $96,430 · En revisión',
      ],
    },

    // ── STATS ─────────────────────────────────────────────────
    stats: [
      { value: 15, suffix: '',  label: 'módulos integrados' },
      { value: 9,  suffix: '',  label: 'roles con permisos propios' },
      { value: 22, suffix: '',  label: 'países de América y España' },
      { value: 2,  suffix: '',  label: 'idiomas: español e inglés' },
    ],

    // ── PROBLEMA / SOLUCIÓN ───────────────────────────────────
    problem: {
      badge:  'El problema',
      title:  'La obra avanza. Los números llegan tarde.',
      sub:    'Cuando el presupuesto vive en un Excel, las compras en un chat y la bodega en un cuaderno, nadie sabe cuánto costó realmente el proyecto hasta que ya es tarde para corregirlo.',
      beforeTitle: 'Sin MARY',
      before: [
        'Presupuesto en Excel que solo una persona sabe actualizar',
        'Órdenes de compra aprobadas por mensajes de WhatsApp',
        'Materiales que salen de bodega sin quedar registrados',
        'Avance de obra reportado en fotos sueltas y notas de voz',
        'Sobrecostos que se descubren al cierre del mes',
        'Cada reporte al cliente se arma a mano, desde cero',
      ],
      afterTitle: 'Con MARY',
      after: [
        'Presupuesto importado desde Excel y versionado en la plataforma',
        'Solicitud → aprobación → OC → recepción, con trazabilidad completa',
        'Entradas y salidas de bodega con existencias y valor en tiempo real',
        'Bitácora de obra con fotos y documentos adjuntos por proyecto',
        'Curva S que compara presupuesto vs. real conforme se registra',
        'Reportes y exportaciones a Excel listos en un clic',
      ],
    },

    // ── MÓDULOS ───────────────────────────────────────────────
    modules: {
      badge: 'Qué incluye',
      title: '15 módulos que hablan entre sí',
      sub:   'No son herramientas sueltas: lo que se registra en un módulo alimenta a los demás. Filtra por área para ver lo que le toca a cada equipo.',
      filters: {
        all:      'Todos',
        obra:     'Obra y proyectos',
        compras:  'Compras y bodega',
        finanzas: 'Finanzas y cliente',
        control:  'Control y equipo',
      },
      badgePro:  'Pro+',
      badgeEnt:  'Enterprise',
      items: [
        { id:'dashboard',  cat:'obra',     name:'Panel Principal',        desc:'Indicadores del proyecto en vivo: presupuesto, compras pendientes, valor de inventario, solicitudes y alertas.' },
        { id:'proyectos',  cat:'obra',     name:'Proyectos',              desc:'Administra varias obras a la vez, cada una con su cliente, moneda, fechas y equipo asignado.' },
        { id:'presupuesto',cat:'obra',     name:'Presupuesto',            desc:'Importa tu presupuesto desde Excel con la plantilla de MARY: capítulos, partidas, cantidades y precios unitarios.' },
        { id:'matpres',    cat:'obra',     name:'Mat. Presupuestados',    desc:'Define qué material y cuánto corresponde a cada partida, para comparar lo presupuestado contra lo realmente consumido.' },
        { id:'inventario', cat:'compras',  name:'Inventario / Bodega',    desc:'Entradas, salidas y existencias por proyecto, con valor del inventario y catálogo de materiales importable.' },
        { id:'compras',    cat:'compras',  name:'Compras / Órdenes',      desc:'Solicitud de materiales, aprobación según rol, orden de compra al proveedor y recepción en bodega.' },
        { id:'ordenes',    cat:'obra',     name:'Órdenes de Cambio',      desc:'Registra cambios de alcance con su monto y estado, para que el contrato y el presupuesto no se desalineen.', badge:'pro' },
        { id:'avaluos',    cat:'finanzas', name:'Avalúos de cliente',     desc:'Estimaciones de cobro por avance, con retenciones, órdenes de pago y su reflejo en la Curva S.', badge:'pro' },
        { id:'financiero', cat:'finanzas', name:'Financiero',             desc:'Costos directos e indirectos por categoría: materiales, nómina, equipos, subcontratos, administración e imprevistos.' },
        { id:'curvas',     cat:'finanzas', name:'Curva S',                desc:'Presupuesto vs. real acumulado en el tiempo, calculado con los datos que tu equipo ya está registrando.' },
        { id:'reportes',   cat:'finanzas', name:'Reportes',               desc:'Reportes operativos y financieros exportables a Excel: órdenes de pago, retenciones, avalúos y detalle de Curva S.' },
        { id:'supervision',cat:'obra',     name:'Bitácora de Supervisión',desc:'Registro diario de obra con fotos y documentos adjuntos, y respuestas del equipo sobre cada evento.' },
        { id:'chat',       cat:'control',  name:'Chat interno',           desc:'Conversaciones por canal dentro de la plataforma, con avisos de mensajes no leídos en el menú.' },
        { id:'auditoria',  cat:'control',  name:'Auditoría',              desc:'Rastro de quién hizo qué y cuándo dentro del sistema, para revisiones internas y control de cambios.', badge:'ent' },
        { id:'config',     cat:'control',  name:'Configuración y roles',  desc:'Usuarios, permisos por módulo, notificaciones, datos de la empresa y administración de la suscripción.' },
      ],
    },

    // ── FLUJO ─────────────────────────────────────────────────
    flow: {
      badge: 'Cómo funciona',
      title: 'Un solo flujo, de la partida presupuestada al costo real',
      sub:   'Cada paso deja el dato donde el siguiente lo necesita. Haz clic en una etapa para ver qué pasa dentro.',
      auto:  'Avanza solo · haz clic para detener',
      steps: [
        {
          n:'01', title:'Carga el presupuesto',
          desc:'Importa tu presupuesto desde la plantilla de Excel de MARY o créalo dentro de la plataforma.',
          bullets:['Capítulos, partidas, unidades y precios unitarios','Plantillas descargables en español e inglés','Material presupuestado por partida'],
        },
        {
          n:'02', title:'Solicita y compra',
          desc:'La obra solicita material, el rol autorizado aprueba y se emite la orden de compra al proveedor.',
          bullets:['Solicitud desde campo por el residente','Aprobación según matriz de permisos','Orden de compra con proveedor y montos'],
        },
        {
          n:'03', title:'Recibe en bodega',
          desc:'El bodeguero registra la entrada, y cada salida descuenta existencias y carga el costo al proyecto.',
          bullets:['Entradas ligadas a la orden de compra','Salidas por proyecto y responsable','Existencias y valor de inventario al día'],
        },
        {
          n:'04', title:'Reporta el avance',
          desc:'Supervisión documenta lo ejecutado con bitácora, fotos y avalúos de avance para el cliente.',
          bullets:['Bitácora diaria con adjuntos','Avalúos con retenciones y órdenes de pago','Órdenes de cambio cuando el alcance se mueve'],
        },
        {
          n:'05', title:'Mide y decide',
          desc:'La Curva S y los reportes muestran dónde estás parado contra el presupuesto, sin trabajo extra.',
          bullets:['Presupuesto vs. real acumulado','Costos directos e indirectos por categoría','Exportación a Excel para el cliente o la junta'],
        },
      ],
    },

    // ── CURVA S ───────────────────────────────────────────────
    scurve: {
      badge: 'La función estrella',
      title: 'Tu Curva S se arma sola',
      sub:   'No es un reporte que alguien prepara el viernes. Conforme se aprueban compras, se registran salidas de bodega y se emiten avalúos, la curva se actualiza.',
      bullets: [
        { title:'Presupuesto vs. real acumulado', desc:'Compara lo planificado contra lo efectivamente comprometido y ejecutado, mes a mes.' },
        { title:'Distribución por avalúos',       desc:'El presupuesto se distribuye en el tiempo usando los avalúos de cliente, no una estimación genérica.' },
        { title:'Detalle exportable',             desc:'Baja el detalle de la curva a Excel cuando necesites justificar un número frente al cliente.' },
        { title:'Por proyecto',                   desc:'Cada obra tiene su propia curva, con su moneda y sus fechas de contrato.' },
      ],
      legendPlan: 'Presupuesto',
      legendReal: 'Real',
      note:       'Gráfico ilustrativo con datos de ejemplo.',
    },

    // ── SEGURIDAD ─────────────────────────────────────────────
    security: {
      badge: 'Control y seguridad',
      title: 'Cada empresa, en su propio espacio',
      sub:   'MARY es multi-tenant: los datos de tu empresa están aislados de los de cualquier otra, y dentro de tu empresa cada persona ve solo lo que le corresponde.',
      items: [
        { title:'Aislamiento por empresa',   desc:'Cada compañía opera en su propio espacio de datos. Ningún usuario de otra empresa puede consultar tu información.' },
        { title:'9 roles predefinidos',      desc:'Admin, coordinador, gerente, residente, bodeguero, contador, supervisor, lectura y super admin, cada uno con su matriz de permisos.' },
        { title:'Permisos por módulo',       desc:'Define quién ve y quién edita en cada módulo, e incluso limita a un usuario a sus propios proyectos.' },
        { title:'Rastro de auditoría',       desc:'El plan Enterprise registra la actividad de los usuarios dentro del sistema para revisiones internas.' },
        { title:'Adjuntos privados',         desc:'Las fotos y documentos de bitácora se sirven mediante enlaces firmados temporales, no públicos.' },
        { title:'Bilingüe de verdad',        desc:'Toda la plataforma funciona en español e inglés, y cada usuario elige su idioma sin afectar a los demás.' },
      ],
    },

    // ── PARA QUIÉN ────────────────────────────────────────────
    audience: {
      badge: 'Para quién es',
      title: 'Pensado para quien construye de verdad',
      items: [
        { title:'Constructoras',      desc:'Varias obras activas, un solo tablero de control y reportes consistentes para la junta directiva.' },
        { title:'Contratistas',       desc:'Control de costos por partida y avalúos de avance listos para cobrarle al contratante.' },
        { title:'Supervisión y PMO',  desc:'Bitácora documentada, órdenes de cambio y trazabilidad para respaldar cada decisión.' },
        { title:'Desarrolladores',    desc:'Visibilidad del presupuesto comprometido y del flujo real de cada proyecto del portafolio.' },
      ],
    },

    // ── PLANES ────────────────────────────────────────────────
    pricing: {
      badge:    'Planes',
      title:    'Precios claros, sin sorpresas',
      sub:      'Todos los planes incluyen 7 días de prueba, sin tarjeta de crédito. Cambia de plan o cancela cuando quieras.',
      monthly:  'Mensual',
      annual:   'Anual',
      saveTag:  '-5%',
      perMonth: '/mes',
      billedAnnually: 'facturado anualmente',
      popular:  'Más elegido',
      cta:      'Empezar prueba gratis',
      ctaTraining: '¿Necesitas ayuda para elegir? Agenda una sesión',
      plans: {
        starter: {
          tagline: 'Para empezar a ordenar tu primera obra.',
          features: ['1 usuario','2 proyectos','Presupuesto, inventario y compras','Curva S y reportes','Bitácora de supervisión','Soporte por correo'],
        },
        pro: {
          tagline: 'Para equipos que ya manejan varias obras.',
          features: ['3 usuarios','5 proyectos','Todo lo del plan Starter','Órdenes de Cambio','Avalúos de cliente','Soporte prioritario'],
        },
        enterprise: {
          tagline: 'Para operaciones con control y auditoría.',
          features: ['5 usuarios base','10 proyectos','Todo lo del plan Pro','Auditoría de actividad','Usuarios adicionales ($20/mes c/u)','Acompañamiento en la implementación'],
        },
      },
      note: 'Precios en dólares estadounidenses. El plan anual se cobra por adelantado con 5% de descuento.',
    },

    // ── CAPACITACIÓN ──────────────────────────────────────────
    training: {
      badge: 'Capacitación',
      title: 'Te enseñamos a usar MARY con tu propia obra',
      sub:   'Una sesión guiada con tu equipo, usando tus proyectos y tu presupuesto real. Déjanos tus datos y coordinamos fecha y modalidad.',
      points: [
        { title:'Sesión por rol',        desc:'Contenido distinto para gerencia, residencia, bodega y contabilidad. Cada quien aprende lo que usará.' },
        { title:'Con tus datos',         desc:'Te ayudamos a importar tu catálogo de materiales y tu presupuesto desde Excel durante la sesión.' },
        { title:'Virtual o presencial',  desc:'Videollamada para equipos distribuidos, o presencial si tu operación lo requiere.' },
        { title:'Material en ES / EN',   desc:'Guías y plantillas en el idioma de tu equipo, para consultar después de la capacitación.' },
      ],
      formTitle: 'Solicitar capacitación',
      formSub:   'Respondemos por correo dentro de 1 día hábil.',
      f: {
        nombre:        'Nombre completo',
        nombrePh:      'Juan Pérez',
        empresa:       'Empresa',
        empresaPh:     'Constructora XYZ',
        email:         'Correo electrónico',
        emailPh:       'juan@empresa.com',
        telefono:      'Teléfono / WhatsApp',
        telefonoPh:    '+1 555 000 0000',
        pais:          'País',
        paisPh:        'Seleccionar país',
        rol:           'Tu rol',
        rolPh:         'Seleccionar rol',
        roles:         ['Dueño / Gerencia','Gerente de proyecto','Residente de obra','Supervisión','Compras','Bodega','Contabilidad / Finanzas','Otro'],
        participantes: 'Participantes',
        participantesPh:'¿Cuántas personas?',
        modalidad:     'Modalidad',
        modalidades:   { virtual:'Virtual', presencial:'Presencial', hibrida:'Cualquiera' },
        interes:       'Temas de interés',
        interesHint:   'Selecciona los que apliquen',
        temas:         ['Presupuesto e importación','Compras y órdenes','Inventario / bodega','Curva S y reportes','Avalúos y órdenes de cambio','Bitácora de supervisión','Roles y permisos'],
        mensaje:       'Cuéntanos de tu operación',
        mensajePh:     '¿Cuántas obras activas tienes? ¿Qué es lo que más te cuesta controlar hoy?',
        optional:      'opcional',
        submit:        'Enviar solicitud',
        sending:       'Enviando...',
        successTitle:  '¡Solicitud recibida!',
        successMsg:    'Gracias por escribirnos. Te contactaremos por correo dentro de 1 día hábil para coordinar la sesión.',
        successAgain:  'Enviar otra solicitud',
        errFields:     'Completa nombre, correo y país para continuar.',
        errEmail:      'Revisa el formato del correo electrónico.',
        errGeneric:    'No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos a deybi@marquezprojectsolutions.com.',
        errRate:       'Ya recibimos una solicitud tuya hace poco. Te contactaremos pronto.',
        privacy:       'Usaremos tus datos solo para contactarte sobre la capacitación.',
      },
    },

    // ── FAQ ───────────────────────────────────────────────────
    faq: {
      badge: 'Preguntas frecuentes',
      title: 'Lo que suelen preguntarnos',
      items: [
        { q:'¿Necesito tarjeta de crédito para la prueba?', a:'No. La prueba de 7 días se activa solo con tus datos de registro. Al terminar, eliges un plan si quieres continuar.' },
        { q:'¿Puedo migrar mi presupuesto desde Excel?', a:'Sí. MARY incluye plantillas descargables en español e inglés para presupuesto, catálogo de materiales y materiales presupuestados. Llenas la plantilla y la importas.' },
        { q:'¿Mis datos están separados de los de otras empresas?', a:'Sí. La plataforma es multi-tenant: cada empresa opera en su propio espacio de datos y los usuarios solo acceden a la información de su compañía.' },
        { q:'¿Cuántos usuarios puedo tener?', a:'Starter incluye 1 usuario, Pro 3 y Enterprise 5 usuarios base. En Enterprise puedes agregar usuarios adicionales por $20 al mes cada uno.' },
        { q:'¿Funciona en inglés?', a:'Sí. Toda la plataforma está en español e inglés, y cada usuario elige su idioma desde su propia sesión.' },
        { q:'¿Puedo cambiar de plan después?', a:'Sí. Puedes subir o bajar de plan desde Configuración, y el cobro se ajusta en tu siguiente ciclo.' },
        { q:'¿Qué pasa si cancelo?', a:'Conservas el acceso hasta el final del período pagado y luego entras en modo lectura. Tus datos se conservan 30 días antes de eliminarse de forma permanente.' },
        { q:'¿La capacitación tiene costo?', a:'La sesión inicial de acompañamiento está incluida cuando contratas un plan. Para programas más extensos o presenciales, cotizamos según el alcance.' },
      ],
    },

    // ── CTA FINAL ─────────────────────────────────────────────
    finalCta: {
      title: 'Empieza hoy con tu próxima obra',
      sub:   'Crea tu cuenta, importa tu presupuesto y mira tu primera Curva S esta misma semana.',
      cta1:  'Crear cuenta gratis',
      cta2:  'Hablar con nosotros',
    },

    // ── FOOTER ────────────────────────────────────────────────
    footer: {
      tagline:  'ERP de construcción para equipos que quieren saber cuánto cuesta la obra mientras la construyen.',
      product:  'Producto',
      company:  'Empresa',
      legal:    'Legal',
      links: {
        modules:  'Módulos',
        pricing:  'Planes',
        training: 'Capacitación',
        login:    'Iniciar sesión',
        trial:    'Prueba gratis',
        about:    'Quiénes somos',
        contact:  'Contacto',
        site:     'Sitio web',
        tos:      'Términos de Servicio',
        pp:       'Política de Privacidad',
      },
      rights: 'MARQUEZ PROJECT SOLUTIONS LLC · 2026',
    },
  },

  // ═══════════════════════════════════════════════════════════
  EN: {
    nav: {
      modules:  'Modules',
      flow:     'How it works',
      scurve:   'S-Curve',
      pricing:  'Pricing',
      training: 'Training',
      faq:      'FAQ',
      login:    'Sign in',
      trial:    'Try it free',
      menu:     'Menu',
    },

    hero: {
      badge:     'Construction ERP · 22 countries · ES / EN',
      title1:    'Your entire construction project,',
      titleHl:   'under control',
      title2:    'on a single platform',
      sub:       'Budget, materials, purchasing, warehouse, field progress and finance all connected. MARY builds your budget-vs-actual S-Curve while your team works — no scattered spreadsheets, no manual month-end close.',
      cta1:      'Start your 7-day trial',
      cta2:      'Book a training session',
      micro:     'No credit card · Set up in minutes · Cancel anytime',
      mockTitle: 'Dashboard',
      mockKpis:  [
        { label: 'Budget',      value: '$1,284,500' },
        { label: 'Committed',   value: '$812,340' },
        { label: 'Actual progress', value: '63.2%' },
      ],
      mockChart: 'S-Curve — Budget vs. Actual',
      mockLegendPlan: 'Planned',
      mockLegendReal: 'Actual',
      mockRows: [
        'PO-0142 · #4 rebar · Approved',
        'Warehouse issue · Portland cement 42.5kg · 120 bags',
        'Field log · Level 3 slab pour · 2 photos',
        'Valuation #7 · Client · $96,430 · Under review',
      ],
    },

    stats: [
      { value: 15, suffix: '',  label: 'integrated modules' },
      { value: 9,  suffix: '',  label: 'roles with their own permissions' },
      { value: 22, suffix: '',  label: 'countries across the Americas and Spain' },
      { value: 2,  suffix: '',  label: 'languages: Spanish and English' },
    ],

    problem: {
      badge:  'The problem',
      title:  'The job moves forward. The numbers arrive late.',
      sub:    "When the budget lives in a spreadsheet, purchasing lives in a chat and the warehouse lives in a notebook, nobody knows what the project really cost until it's too late to fix it.",
      beforeTitle: 'Without MARY',
      before: [
        'A budget spreadsheet only one person knows how to update',
        'Purchase orders approved over WhatsApp messages',
        'Materials leaving the warehouse with no record',
        'Field progress reported through loose photos and voice notes',
        'Cost overruns discovered at month-end close',
        'Every client report rebuilt by hand, from scratch',
      ],
      afterTitle: 'With MARY',
      after: [
        'Budget imported from Excel and kept on the platform',
        'Request → approval → PO → receipt, fully traceable',
        'Warehouse in and out with live stock levels and value',
        'Field log with photos and documents attached per project',
        'An S-Curve comparing budget vs. actual as data is entered',
        'Reports and Excel exports ready in one click',
      ],
    },

    modules: {
      badge: "What's included",
      title: '15 modules that talk to each other',
      sub:   'These are not separate tools: what you record in one module feeds the rest. Filter by area to see what each team gets.',
      filters: {
        all:      'All',
        obra:     'Field & projects',
        compras:  'Purchasing & warehouse',
        finanzas: 'Finance & client',
        control:  'Control & team',
      },
      badgePro:  'Pro+',
      badgeEnt:  'Enterprise',
      items: [
        { id:'dashboard',  cat:'obra',     name:'Dashboard',              desc:'Live project indicators: budget, pending purchases, inventory value, requests and alerts.' },
        { id:'proyectos',  cat:'obra',     name:'Projects',               desc:'Run several jobs at once, each with its own client, currency, dates and assigned team.' },
        { id:'presupuesto',cat:'obra',     name:'Budget',                 desc:"Import your budget from MARY's Excel template: chapters, line items, quantities and unit prices." },
        { id:'matpres',    cat:'obra',     name:'Budgeted Materials',     desc:'Define which material and how much belongs to each line item, to compare budgeted against actual consumption.' },
        { id:'inventario', cat:'compras',  name:'Inventory / Warehouse',  desc:'Receipts, issues and stock per project, with inventory value and an importable material catalog.' },
        { id:'compras',    cat:'compras',  name:'Purchasing / POs',       desc:'Material request, role-based approval, purchase order to the supplier and receipt at the warehouse.' },
        { id:'ordenes',    cat:'obra',     name:'Change Orders',          desc:'Record scope changes with amount and status, so contract and budget never drift apart.', badge:'pro' },
        { id:'avaluos',    cat:'finanzas', name:'Client Valuations',      desc:'Progress billing estimates with retention, payment orders and their effect on the S-Curve.', badge:'pro' },
        { id:'financiero', cat:'finanzas', name:'Financial',              desc:'Direct and indirect costs by category: materials, payroll, equipment, subcontracts, admin and contingencies.' },
        { id:'curvas',     cat:'finanzas', name:'S-Curve',                desc:'Cumulative budget vs. actual over time, computed from the data your team is already entering.' },
        { id:'reportes',   cat:'finanzas', name:'Reports',                desc:'Operational and financial reports exportable to Excel: payment orders, retention, valuations and S-Curve detail.' },
        { id:'supervision',cat:'obra',     name:'Field Supervision Log',  desc:'Daily site log with photos and documents attached, plus team replies on each entry.' },
        { id:'chat',       cat:'control',  name:'Internal chat',          desc:'Channel-based conversations inside the platform, with unread badges in the menu.' },
        { id:'auditoria',  cat:'control',  name:'Audit log',              desc:'A trail of who did what and when inside the system, for internal review and change control.', badge:'ent' },
        { id:'config',     cat:'control',  name:'Settings & roles',       desc:'Users, per-module permissions, notifications, company data and subscription management.' },
      ],
    },

    flow: {
      badge: 'How it works',
      title: 'One flow, from budget line item to actual cost',
      sub:   'Each step leaves the data exactly where the next one needs it. Click a stage to see what happens inside.',
      auto:  'Auto-advancing · click to pause',
      steps: [
        {
          n:'01', title:'Load the budget',
          desc:"Import your budget from MARY's Excel template or build it inside the platform.",
          bullets:['Chapters, line items, units and unit prices','Downloadable templates in Spanish and English','Budgeted material per line item'],
        },
        {
          n:'02', title:'Request and purchase',
          desc:'The field requests material, the authorized role approves and the purchase order goes out to the supplier.',
          bullets:['Request raised from the field by the site engineer','Approval driven by the permission matrix','Purchase order with supplier and amounts'],
        },
        {
          n:'03', title:'Receive at the warehouse',
          desc:'The warehouse keeper logs the receipt, and every issue reduces stock and charges cost to the project.',
          bullets:['Receipts linked to the purchase order','Issues by project and responsible person','Stock levels and inventory value up to date'],
        },
        {
          n:'04', title:'Report progress',
          desc:'Supervision documents the work with the field log, photos and client progress valuations.',
          bullets:['Daily log with attachments','Valuations with retention and payment orders','Change orders when scope moves'],
        },
        {
          n:'05', title:'Measure and decide',
          desc:'The S-Curve and reports show where you stand against budget, with no extra work.',
          bullets:['Cumulative budget vs. actual','Direct and indirect costs by category','Excel export for the client or the board'],
        },
      ],
    },

    scurve: {
      badge: 'The flagship feature',
      title: 'Your S-Curve builds itself',
      sub:   'It is not a report someone prepares on Friday. As purchases get approved, warehouse issues are logged and valuations are issued, the curve updates.',
      bullets: [
        { title:'Cumulative budget vs. actual', desc:'Compare what was planned against what was actually committed and executed, month by month.' },
        { title:'Distribution by valuations',   desc:'The budget is spread over time using client valuations, not a generic estimate.' },
        { title:'Exportable detail',            desc:'Download the curve detail to Excel whenever you need to justify a number to the client.' },
        { title:'Per project',                  desc:'Every job has its own curve, with its own currency and contract dates.' },
      ],
      legendPlan: 'Budget',
      legendReal: 'Actual',
      note:       'Illustrative chart with sample data.',
    },

    security: {
      badge: 'Control and security',
      title: 'Every company in its own space',
      sub:   'MARY is multi-tenant: your company data is isolated from any other, and inside your company each person only sees what they should.',
      items: [
        { title:'Per-company isolation', desc:'Each company runs in its own data space. No user from another company can query your information.' },
        { title:'9 predefined roles',    desc:'Admin, coordinator, manager, site engineer, warehouse, accountant, supervisor, read-only and super admin, each with its own permission matrix.' },
        { title:'Per-module permissions',desc:'Decide who can view and who can edit in each module, and even limit a user to their own projects.' },
        { title:'Audit trail',           desc:'The Enterprise plan records user activity inside the system for internal review.' },
        { title:'Private attachments',   desc:'Field log photos and documents are served through temporary signed links, never public URLs.' },
        { title:'Genuinely bilingual',   desc:'The whole platform works in Spanish and English, and each user picks their own language.' },
      ],
    },

    audience: {
      badge: 'Who it is for',
      title: 'Built for people who actually build',
      items: [
        { title:'General contractors', desc:'Several active jobs, a single control dashboard and consistent reports for the board.' },
        { title:'Subcontractors',      desc:'Cost control by line item and progress valuations ready to bill the main contractor.' },
        { title:'Supervision & PMO',   desc:'A documented field log, change orders and traceability to back every decision.' },
        { title:'Developers',          desc:'Visibility of committed budget and real cash flow for every project in the portfolio.' },
      ],
    },

    pricing: {
      badge:    'Pricing',
      title:    'Clear pricing, no surprises',
      sub:      'Every plan includes a 7-day trial with no credit card. Change plans or cancel whenever you want.',
      monthly:  'Monthly',
      annual:   'Annual',
      saveTag:  '-5%',
      perMonth: '/mo',
      billedAnnually: 'billed annually',
      popular:  'Most chosen',
      cta:      'Start free trial',
      ctaTraining: 'Need help choosing? Book a session',
      plans: {
        starter: {
          tagline: 'To start bringing order to your first job.',
          features: ['1 user','2 projects','Budget, inventory and purchasing','S-Curve and reports','Field supervision log','Email support'],
        },
        pro: {
          tagline: 'For teams already running several jobs.',
          features: ['3 users','5 projects','Everything in Starter','Change Orders','Client Valuations','Priority support'],
        },
        enterprise: {
          tagline: 'For operations that need control and audit.',
          features: ['5 base users','10 projects','Everything in Pro','Activity audit log','Additional users ($20/mo each)','Guided implementation'],
        },
      },
      note: 'Prices in US dollars. The annual plan is charged upfront with a 5% discount.',
    },

    training: {
      badge: 'Training',
      title: 'We teach you MARY using your own job site',
      sub:   'A guided session with your team, using your projects and your real budget. Leave us your details and we will arrange the date and format.',
      points: [
        { title:'Role-based session',   desc:'Different content for management, site, warehouse and accounting. Everyone learns what they will actually use.' },
        { title:'With your data',       desc:'We help you import your material catalog and your budget from Excel during the session.' },
        { title:'Online or on site',    desc:'Video call for distributed teams, or in person if your operation needs it.' },
        { title:'Materials in ES / EN', desc:"Guides and templates in your team's language, to review after the training." },
      ],
      formTitle: 'Request training',
      formSub:   'We reply by email within 1 business day.',
      f: {
        nombre:        'Full name',
        nombrePh:      'John Smith',
        empresa:       'Company',
        empresaPh:     'XYZ Construction',
        email:         'Email address',
        emailPh:       'john@company.com',
        telefono:      'Phone / WhatsApp',
        telefonoPh:    '+1 555 000 0000',
        pais:          'Country',
        paisPh:        'Select country',
        rol:           'Your role',
        rolPh:         'Select role',
        roles:         ['Owner / Executive','Project manager','Site engineer','Supervision','Purchasing','Warehouse','Accounting / Finance','Other'],
        participantes: 'Participants',
        participantesPh:'How many people?',
        modalidad:     'Format',
        modalidades:   { virtual:'Online', presencial:'On site', hibrida:'Either one' },
        interes:       'Topics of interest',
        interesHint:   'Select all that apply',
        temas:         ['Budget and import','Purchasing and POs','Inventory / warehouse','S-Curve and reports','Valuations and change orders','Field supervision log','Roles and permissions'],
        mensaje:       'Tell us about your operation',
        mensajePh:     'How many active jobs do you run? What is hardest to control today?',
        optional:      'optional',
        submit:        'Send request',
        sending:       'Sending...',
        successTitle:  'Request received!',
        successMsg:    'Thanks for reaching out. We will email you within 1 business day to schedule the session.',
        successAgain:  'Send another request',
        errFields:     'Please fill in name, email and country to continue.',
        errEmail:      'Please check the email format.',
        errGeneric:    'We could not send your request. Try again or write to deybi@marquezprojectsolutions.com.',
        errRate:       'We already received a request from you recently. We will be in touch soon.',
        privacy:       'We will only use your details to contact you about the training.',
      },
    },

    faq: {
      badge: 'FAQ',
      title: 'What people usually ask us',
      items: [
        { q:'Do I need a credit card for the trial?', a:'No. The 7-day trial starts with your registration details only. When it ends, you pick a plan if you want to continue.' },
        { q:'Can I migrate my budget from Excel?', a:'Yes. MARY includes downloadable templates in Spanish and English for budget, material catalog and budgeted materials. You fill in the template and import it.' },
        { q:'Is my data separated from other companies?', a:'Yes. The platform is multi-tenant: each company runs in its own data space and users only access their own company information.' },
        { q:'How many users can I have?', a:'Starter includes 1 user, Pro 3 and Enterprise 5 base users. On Enterprise you can add extra users for $20 per month each.' },
        { q:'Does it work in English?', a:'Yes. The entire platform is available in Spanish and English, and each user picks their language in their own session.' },
        { q:'Can I change plans later?', a:'Yes. You can upgrade or downgrade from Settings, and billing adjusts on your next cycle.' },
        { q:'What happens if I cancel?', a:'You keep access until the end of the paid period and then move to read-only mode. Your data is kept for 30 days before permanent deletion.' },
        { q:'Does training cost extra?', a:'The initial onboarding session is included when you subscribe to a plan. For longer or on-site programs we quote based on scope.' },
      ],
    },

    finalCta: {
      title: 'Start with your next job today',
      sub:   'Create your account, import your budget and see your first S-Curve this week.',
      cta1:  'Create free account',
      cta2:  'Talk to us',
    },

    footer: {
      tagline:  'Construction ERP for teams that want to know what the job costs while they are building it.',
      product:  'Product',
      company:  'Company',
      legal:    'Legal',
      links: {
        modules:  'Modules',
        pricing:  'Pricing',
        training: 'Training',
        login:    'Sign in',
        trial:    'Free trial',
        about:    'About us',
        contact:  'Contact',
        site:     'Website',
        tos:      'Terms of Service',
        pp:       'Privacy Policy',
      },
      rights: 'MARQUEZ PROJECT SOLUTIONS LLC · 2026',
    },
  },
}
