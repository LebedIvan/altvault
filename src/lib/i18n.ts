// ─── Translation keys ──────────────────────────────────────────────────────────

export type Lang = "en" | "ru" | "es";
export type Variant = "a" | "b" | "c";

const translations = {
  en: {
    // Nav
    nav_signin:       "Sign in",
    nav_try:          "Try free",

    // Hero A — Tracker
    hero_a_headline:  "One dashboard for everything you collect",
    hero_a_sub:       "LEGO, Pokémon, CS2 skins, gold, sports cards — track every asset, see real P&L, stop guessing what your collection is worth.",
    hero_a_social:    "Join 2,400+ collectors already tracking",
    hero_a_hook:      "Unlock AI analyst for $5/yr →",

    // Hero B — Returns
    hero_b_headline:  "LEGO +340%. Pokémon +280%. What's your ROI?",
    hero_b_sub:       "The market is moving. Track real-time prices across 10 asset classes and finally know if your collection is making or losing money.",
    hero_b_social:    "2,400 collectors track $4.2M in alternative assets on Vaulty",
    hero_b_hook:      "Want to know what to buy next? Merlin builds you a portfolio →",

    // Hero C — Merlin
    hero_c_headline:  "Build your alt investment portfolio in 30 seconds",
    hero_c_sub:       "Tell Merlin your budget. AI scans the market, calculates returns, picks the optimal allocation — with stress tests and price targets.",
    hero_c_social:    "Used by 2,400+ collectors & alt investors",
    hero_c_badge:     "🔒 Early bird — $5/yr locked forever",
    hero_c_spots:     "spots left",

    // CTAs
    cta_free:         "Start tracking free",
    cta_premium:      "Build my portfolio — $5/yr",
    cta_secondary:    "Or track for free →",
    cta_returns:      "Calculate my returns →",
    email_placeholder:"your@email.com",
    no_spam:          "No spam · No credit card for free plan",

    // Features
    features_title:   "Everything alternative investors need",
    feat_lego_title:  "LEGO Sets",
    feat_lego_desc:   "Retirement dates, eBay sold prices, appreciation history. Know which sets to buy before they retire.",
    feat_pokemon_title:"Pokémon & TCG",
    feat_pokemon_desc:"Real-time card prices via TCGPlayer & Scryfall. Track sealed product ROI.",
    feat_cs2_title:   "CS2 Skins",
    feat_cs2_desc:    "Live marketplace prices with float & wear tracking. See your skin portfolio at a glance.",
    feat_metals_title:"Precious Metals",
    feat_metals_desc: "Gold, silver, platinum & palladium spot prices. Perfect inflation hedge tracker.",
    feat_ai_title:    "AI Analyst — Merlin",
    feat_ai_desc:     "Build an optimized portfolio in 30 seconds. Buy/hold/sell signals on every asset. Stress tests for any scenario.",
    feat_sports_title:"Sports Cards & Comics",
    feat_sports_desc: "PriceCharting integration, CGC/PSA grade tracking, ROI by player or issue.",

    // Pricing
    pricing_title:    "Simple pricing",
    pricing_sub:      "Free forever — or unlock the AI analyst for less than a coffee.",
    plan_free:        "Free forever",
    plan_free_desc:   "Track everything. No credit card.",
    plan_premium:     "Premium",
    plan_premium_price:"$5 / year",
    plan_premium_badge:"Early bird — locked forever",
    plan_premium_desc:"Everything free + AI analyst.",
    feat_free_1:      "All 10 asset classes",
    feat_free_2:      "Real-time price feeds",
    feat_free_3:      "P&L charts & ROI",
    feat_free_4:      "Demo mode — no account needed",
    feat_premium_1:   "✦ Merlin AI portfolio builder",
    feat_premium_2:   "✦ Buy/hold/sell predictions",
    feat_premium_3:   "✦ Health score & stress tests",
    feat_premium_4:   "✦ Unlimited AI analyst queries",
    feat_premium_5:   "✦ Priority support",
    cta_free_plan:    "Start free →",
    cta_premium_plan: "Get early access — $5/yr",

    // Footer
    footer_copy:      "© 2026 Vaulty. Alternative investments dashboard.",
    footer_signin:    "Sign in",
    footer_register:  "Register",
    footer_terminal:  "Terminal",
  },

  ru: {
    nav_signin:       "Войти",
    nav_try:          "Попробовать",

    hero_a_headline:  "Все твои альт-инвестиции в одном месте",
    hero_a_sub:       "LEGO, Покемоны, CS2 скины, золото, спортивные карточки — отслеживай каждый актив, смотри P&L, знай что стоит сколько.",
    hero_a_social:    "2 400+ коллекционеров уже трекают портфель",
    hero_a_hook:      "Открыть AI-аналитика за $5/год →",

    hero_b_headline:  "LEGO +340%. Pokémon +280%. А твоя доходность?",
    hero_b_sub:       "Рынок движется. Отслеживай цены в реальном времени по 10 классам активов и наконец узнай — твоя коллекция зарабатывает или теряет деньги.",
    hero_b_social:    "2 400 коллекционеров трекают $4.2M в альт-активах",
    hero_b_hook:      "Хочешь знать что купить? Merlin строит портфель →",

    hero_c_headline:  "Собери портфель за 30 секунд",
    hero_c_sub:       "Скажи Мерлину свой бюджет. AI сканирует рынок, считает доходность, выбирает оптимальную аллокацию — со стресс-тестом и целевыми ценами.",
    hero_c_social:    "Уже 2 400+ коллекционеров и альт-инвесторов",
    hero_c_badge:     "🔒 Early bird — $5/год навсегда",
    hero_c_spots:     "мест осталось",

    cta_free:         "Начать бесплатно",
    cta_premium:      "Собрать портфель — $5/год",
    cta_secondary:    "Или трекать бесплатно →",
    cta_returns:      "Посчитать мою доходность →",
    email_placeholder:"твой@email.com",
    no_spam:          "Без спама · Карта не нужна для бесплатного",

    features_title:   "Всё что нужно альт-инвестору",
    feat_lego_title:  "LEGO-сеты",
    feat_lego_desc:   "Дата выхода из производства, проданные цены на eBay, история роста. Знай какие сеты покупать до выхода.",
    feat_pokemon_title:"Покемоны и TCG",
    feat_pokemon_desc:"Цены карточек в реальном времени. ROI по запечатанным продуктам.",
    feat_cs2_title:   "CS2 Скины",
    feat_cs2_desc:    "Живые цены маркетплейса с отслеживанием float и wear. Портфель скинов с первого взгляда.",
    feat_metals_title:"Драгоценные металлы",
    feat_metals_desc: "Спот-цены золота, серебра, платины и палладия. Трекер хеджирования инфляции.",
    feat_ai_title:    "AI-аналитик — Мерлин",
    feat_ai_desc:     "Оптимальный портфель за 30 секунд. Сигналы покупать/держать/продавать. Стресс-тесты для любого сценария.",
    feat_sports_title:"Спорт-карточки и комиксы",
    feat_sports_desc: "Интеграция с PriceCharting, трекинг грейдов CGC/PSA, ROI по игроку или выпуску.",

    pricing_title:    "Простые цены",
    pricing_sub:      "Бесплатно навсегда — или открой AI-аналитика дешевле чашки кофе.",
    plan_free:        "Бесплатно навсегда",
    plan_free_desc:   "Трекай всё. Карта не нужна.",
    plan_premium:     "Премиум",
    plan_premium_price:"$5 / год",
    plan_premium_badge:"Early bird — зафиксировано навсегда",
    plan_premium_desc:"Всё из бесплатного + AI-аналитик.",
    feat_free_1:      "Все 10 классов активов",
    feat_free_2:      "Цены в реальном времени",
    feat_free_3:      "Графики P&L и ROI",
    feat_free_4:      "Демо-режим — аккаунт не нужен",
    feat_premium_1:   "✦ Мерлин — AI-строитель портфеля",
    feat_premium_2:   "✦ Предикшены покупать/держать/продавать",
    feat_premium_3:   "✦ Health score и стресс-тесты",
    feat_premium_4:   "✦ Неограниченные AI-запросы",
    feat_premium_5:   "✦ Приоритетная поддержка",
    cta_free_plan:    "Начать бесплатно →",
    cta_premium_plan: "Получить ранний доступ — $5/год",

    footer_copy:      "© 2026 Vaulty. Дашборд альт-инвестиций.",
    footer_signin:    "Войти",
    footer_register:  "Регистрация",
    footer_terminal:  "Терминал",
  },

  es: {
    nav_signin:       "Iniciar sesión",
    nav_try:          "Probar gratis",

    hero_a_headline:  "Un panel para todo lo que coleccionas",
    hero_a_sub:       "LEGO, Pokémon, skins de CS2, oro, cartas deportivas — rastrea cada activo, ve tu P&L real y deja de adivinar cuánto vale tu colección.",
    hero_a_social:    "2.400+ coleccionistas ya rastrean su cartera",
    hero_a_hook:      "Desbloquea el analista IA por $5/año →",

    hero_b_headline:  "LEGO +340%. Pokémon +280%. ¿Cuál es tu ROI?",
    hero_b_sub:       "El mercado se mueve. Rastrea precios en tiempo real en 10 clases de activos y descubre si tu colección gana o pierde dinero.",
    hero_b_social:    "2.400 coleccionistas rastrean $4,2M en activos alternativos",
    hero_b_hook:      "¿Quieres saber qué comprar? Merlin construye tu cartera →",

    hero_c_headline:  "Construye tu cartera de inversión alternativa en 30 segundos",
    hero_c_sub:       "Dile a Merlin tu presupuesto. La IA escanea el mercado, calcula rentabilidades y elige la asignación óptima — con pruebas de estrés y objetivos de precio.",
    hero_c_social:    "Usado por 2.400+ coleccionistas e inversores alternativos",
    hero_c_badge:     "🔒 Early bird — $5/año para siempre",
    hero_c_spots:     "plazas disponibles",

    cta_free:         "Empezar gratis",
    cta_premium:      "Construir mi cartera — $5/año",
    cta_secondary:    "O rastrear gratis →",
    cta_returns:      "Calcular mi rentabilidad →",
    email_placeholder:"tu@email.com",
    no_spam:          "Sin spam · Sin tarjeta para el plan gratuito",

    features_title:   "Todo lo que necesita un inversor alternativo",
    feat_lego_title:  "Sets de LEGO",
    feat_lego_desc:   "Fechas de retiro, precios vendidos en eBay, historial de apreciación. Sabe qué sets comprar antes de que se retiren.",
    feat_pokemon_title:"Pokémon y TCG",
    feat_pokemon_desc:"Precios de cartas en tiempo real. Rastrea el ROI de productos sellados.",
    feat_cs2_title:   "Skins de CS2",
    feat_cs2_desc:    "Precios del marketplace en vivo con seguimiento de float y desgaste.",
    feat_metals_title:"Metales preciosos",
    feat_metals_desc: "Precios spot de oro, plata, platino y paladio. Rastreador de cobertura de inflación.",
    feat_ai_title:    "Analista IA — Merlin",
    feat_ai_desc:     "Cartera optimizada en 30 segundos. Señales de comprar/mantener/vender. Pruebas de estrés para cualquier escenario.",
    feat_sports_title:"Cartas deportivas y cómics",
    feat_sports_desc: "Integración con PriceCharting, seguimiento de grados CGC/PSA, ROI por jugador o número.",

    pricing_title:    "Precios simples",
    pricing_sub:      "Gratis para siempre — o desbloquea el analista IA por menos que un café.",
    plan_free:        "Gratis para siempre",
    plan_free_desc:   "Rastrea todo. Sin tarjeta.",
    plan_premium:     "Premium",
    plan_premium_price:"$5 / año",
    plan_premium_badge:"Early bird — fijo para siempre",
    plan_premium_desc:"Todo lo gratuito + analista IA.",
    feat_free_1:      "Las 10 clases de activos",
    feat_free_2:      "Precios en tiempo real",
    feat_free_3:      "Gráficos de P&L y ROI",
    feat_free_4:      "Modo demo — sin cuenta",
    feat_premium_1:   "✦ Merlin — constructor de cartera IA",
    feat_premium_2:   "✦ Predicciones comprar/mantener/vender",
    feat_premium_3:   "✦ Health score y pruebas de estrés",
    feat_premium_4:   "✦ Consultas IA ilimitadas",
    feat_premium_5:   "✦ Soporte prioritario",
    cta_free_plan:    "Empezar gratis →",
    cta_premium_plan: "Acceso anticipado — $5/año",

    footer_copy:      "© 2026 Vaulty. Panel de inversiones alternativas.",
    footer_signin:    "Iniciar sesión",
    footer_register:  "Registro",
    footer_terminal:  "Terminal",
  },
} as const;

export type TKey = keyof typeof translations.en;

export function t(lang: Lang, key: TKey): string {
  return (translations[lang] as Record<string, string>)[key] ?? translations.en[key] ?? key;
}
