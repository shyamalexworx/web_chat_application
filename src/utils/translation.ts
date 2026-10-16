import type { SupportedLanguage } from '../types';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

// ==============================================================================
// 1. COMPREHENSIVE UI LOCALIZATION DICTIONARY
// ==============================================================================
export const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    search_placeholder: 'Buscar mensajes, archivos, canales o personas...',
    meet: 'Reunión',
    starred: 'Destacados',
    channels: 'Canales',
    direct_messages: 'Mensajes directos',
    add_channel: 'Añadir canal',
    start_dm: 'Iniciar mensaje directo',
    members: 'miembros',
    view_members: 'Ver miembros',
    welcome_to: '¡Bienvenido a',
    this_channel_is_for: 'Este canal es para la comunicación técnica del equipo.',
    dm_beginning: 'Este es el comienzo de tu historial de mensajes directos con',
    group_conversation_with: 'Conversación grupal con miembros del equipo',
    today: 'Hoy',
    yesterday: 'Ayer',
    message: 'Mensaje a',
    type_message: 'Escribe un mensaje...',
    shift_enter: 'Mayús + Enter para nueva línea',
    typing_single: 'está escribiendo...',
    typing_plural: 'están escribiendo...',
    reactions_emojis: 'Reacciones y emojis',
    online: 'En línea',
    offline: 'Desconectado',
    active: 'Activo',
    away: 'Ausente',
    pinned_to_conversation: 'Fijado a la conversación',
    translated: 'Traducido',
    showing_original: 'Mostrando original',
    no_messages_yet: 'No hay mensajes aún. ¡Envía un mensaje abajo para comenzar la conversación!',
    edit_profile: 'Editar perfil y estado',
    create_workspace: 'Crear espacio de trabajo',
    channel_directory: 'Directorio de canales',
    ai_assistant: 'Asistente IA Pulse',
    channel_details: 'Detalles del canal',
    about: 'Acerca de',
    pinned: 'Fijados',
    files: 'Archivos',
    recent_activity: 'Actividad reciente',
    search_conversation: 'Buscar en la conversación',
    mute_notifications: 'Silenciar notificaciones',
    unmute_notifications: 'Activar notificaciones',
    send: 'Enviar',
    bold: 'Negrita',
    italic: 'Cursiva',
    code: 'Código',
    bullet_list: 'Lista con viñetas',
    attach_file: 'Adjuntar archivo',
    record_voice: 'Grabar nota de voz',
    jump_to: 'Saltar a canal o persona...',
    log_out: 'Cerrar sesión',
    sound_chimes: 'Sonidos de notificación',
    details: 'Detalles',
    members_tab: 'Miembros',
    pinned_tab: 'Fijados',
    files_tab: 'Archivos',
    topic: 'Tema',
    description: 'Descripción',
  },
  fr: {
    search_placeholder: 'Rechercher messages, fichiers, chaînes ou personnes...',
    meet: 'Réunion',
    starred: 'Favoris',
    channels: 'Chaînes',
    direct_messages: 'Messages directs',
    add_channel: 'Ajouter une chaîne',
    start_dm: 'Nouveau message direct',
    members: 'membres',
    view_members: 'Voir les membres',
    welcome_to: 'Bienvenue sur',
    this_channel_is_for: 'Cette chaîne est dédiée à la communication de l\'équipe.',
    dm_beginning: 'C\'est le tout début de votre historique de messages avec',
    group_conversation_with: 'Conversation de groupe avec les membres de l\'équipe',
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    message: 'Message à',
    type_message: 'Écrivez un message...',
    shift_enter: 'Maj + Entrée pour nouvelle ligne',
    typing_single: 'est en train d\'écrire...',
    typing_plural: 'sont en train d\'écrire...',
    reactions_emojis: 'Réactions et émojis',
    online: 'En ligne',
    offline: 'Hors ligne',
    active: 'Actif',
    away: 'Absent',
    pinned_to_conversation: 'Épinglé à la conversation',
    translated: 'Traduit',
    showing_original: 'Affichage de l\'original',
    no_messages_yet: 'Aucun message pour le moment. Envoyez un message ci-dessous pour démarrer la conversation !',
    edit_profile: 'Modifier le profil',
    create_workspace: 'Créer un espace',
    channel_directory: 'Annuaire des chaînes',
    ai_assistant: 'Assistant IA Pulse',
    channel_details: 'Détails de la chaîne',
    about: 'À propos',
    pinned: 'Épinglés',
    files: 'Fichiers',
    recent_activity: 'Activité récente',
    search_conversation: 'Rechercher dans la conversation',
    mute_notifications: 'Couper les notifications',
    unmute_notifications: 'Activer les notifications',
    send: 'Envoyer',
    bold: 'Gras',
    italic: 'Italique',
    code: 'Code',
    bullet_list: 'Liste à puces',
    attach_file: 'Joindre un fichier',
    record_voice: 'Enregistrer une note vocale',
    jump_to: 'Aller à une chaîne ou personne...',
    log_out: 'Déconnexion',
    sound_chimes: 'Sons de notification',
    details: 'Détails',
    members_tab: 'Membres',
    pinned_tab: 'Épinglés',
    files_tab: 'Fichiers',
    topic: 'Sujet',
    description: 'Description',
  },
  de: {
    search_placeholder: 'Nachrichten, Dateien, Kanäle oder Personen suchen...',
    meet: 'Meeting',
    starred: 'Markiert',
    channels: 'Kanäle',
    direct_messages: 'Direktnachrichten',
    add_channel: 'Kanal hinzufügen',
    start_dm: 'Direktnachricht starten',
    members: 'Mitglieder',
    view_members: 'Mitglieder anzeigen',
    welcome_to: 'Willkommen bei',
    this_channel_is_for: 'Dieser Kanal dient der Teamkommunikation.',
    dm_beginning: 'Dies ist der Beginn Ihres Nachrichtenverlaufs mit',
    group_conversation_with: 'Gruppenunterhaltung mit Teammitgliedern',
    today: 'Heute',
    yesterday: 'Gestern',
    message: 'Nachricht an',
    type_message: 'Nachricht eingeben...',
    shift_enter: 'Umschalt + Eingabe für neue Zeile',
    typing_single: 'tippt gerade...',
    typing_plural: 'tippen gerade...',
    reactions_emojis: 'Reaktionen & Emojis',
    online: 'Online',
    offline: 'Offline',
    active: 'Aktiv',
    away: 'Abwesend',
    pinned_to_conversation: 'An Unterhaltung angeheftet',
    translated: 'Übersetzt',
    showing_original: 'Original anzeigen',
    no_messages_yet: 'Noch keine Nachrichten. Sende unten eine Nachricht, um das Gespräch zu beginnen!',
    edit_profile: 'Profil bearbeiten',
    create_workspace: 'Arbeitsbereich erstellen',
    channel_directory: 'Kanal-Verzeichnis',
    ai_assistant: 'Pulse KI-Assistent',
    channel_details: 'Kanaldetails',
    about: 'Über',
    pinned: 'Angeheftet',
    files: 'Dateien',
    recent_activity: 'Letzte Aktivität',
    search_conversation: 'Unterhaltung durchsuchen',
    mute_notifications: 'Benachrichtigungen stummschalten',
    unmute_notifications: 'Benachrichtigungen aktivieren',
    send: 'Senden',
    bold: 'Fett',
    italic: 'Kursiv',
    code: 'Code',
    bullet_list: 'Aufzählung',
    attach_file: 'Datei anhängen',
    record_voice: 'Sprachnotiz aufnehmen',
    jump_to: 'Zu Kanal oder Person springen...',
    log_out: 'Abmelden',
    sound_chimes: 'Benachrichtigungstöne',
    details: 'Details',
    members_tab: 'Mitglieder',
    pinned_tab: 'Angeheftet',
    files_tab: 'Dateien',
    topic: 'Thema',
    description: 'Beschreibung',
  },
  ja: {
    search_placeholder: 'メッセージ、ファイル、チャンネル、メンバーを検索...',
    meet: 'ミーティング',
    starred: 'スター付き',
    channels: 'チャンネル',
    direct_messages: 'ダイレクトメッセージ',
    add_channel: 'チャンネルを追加',
    start_dm: 'ダイレクトメッセージを開始',
    members: '人のメンバー',
    view_members: 'メンバーを表示',
    welcome_to: 'へようこそ！',
    this_channel_is_for: 'このチャンネルはチームの技術的な議論用です。',
    dm_beginning: 'とのダイレクトメッセージの始まりです：',
    group_conversation_with: 'チームメンバーとのグループ会話',
    today: '今日',
    yesterday: '昨日',
    message: 'へのメッセージ',
    type_message: 'メッセージを入力...',
    shift_enter: 'Shift + Enter で改行',
    typing_single: 'が入力中...',
    typing_plural: 'が入力中...',
    reactions_emojis: 'リアクションと絵文字',
    online: 'オンライン',
    offline: 'オフライン',
    active: 'アクティブ',
    away: '離席中',
    pinned_to_conversation: '会話にピン留め済み',
    translated: '翻訳済み',
    showing_original: '原文を表示中',
    no_messages_yet: 'メッセージはまだありません。下の欄からメッセージを送信して会話を始めましょう！',
    edit_profile: 'プロフィールを編集',
    create_workspace: 'ワークスペースを作成',
    channel_directory: 'チャンネル一覧',
    ai_assistant: 'Pulse AI アシスタント',
    channel_details: 'チャンネル詳細',
    about: '概要',
    pinned: 'ピン留め',
    files: 'ファイル',
    recent_activity: '最近のアクティビティ',
    search_conversation: '会話内を検索',
    mute_notifications: '通知をミュート',
    unmute_notifications: '通知を解除',
    send: '送信',
    bold: '太字',
    italic: '斜体',
    code: 'コード',
    bullet_list: '箇条書き',
    attach_file: 'ファイルを添付',
    record_voice: 'ボイスメモを録音',
    jump_to: 'チャンネルやメンバーに移動...',
    log_out: 'ログアウト',
    sound_chimes: '通知サウンド',
    details: '詳細',
    members_tab: 'メンバー',
    pinned_tab: 'ピン留め',
    files_tab: 'ファイル',
    topic: 'トピック',
    description: '説明',
  },
  zh: {
    search_placeholder: '搜索消息、文件、频道或同事...',
    meet: '会议',
    starred: '已加星标',
    channels: '频道',
    direct_messages: '私信',
    add_channel: '创建频道',
    start_dm: '发送私信',
    members: '位成员',
    view_members: '查看成员',
    welcome_to: '欢迎来到',
    this_channel_is_for: '此频道用于团队日常沟通与技术交流。',
    dm_beginning: '这是你与以下成员私信记录的起点：',
    group_conversation_with: '团队成员群聊',
    today: '今天',
    yesterday: '昨天',
    message: '发送消息给',
    type_message: '输入消息...',
    shift_enter: 'Shift + Enter 换行',
    typing_single: '正在输入...',
    typing_plural: '正在输入...',
    reactions_emojis: '表情与回应',
    online: '在线',
    offline: '离线',
    active: '活跃',
    away: '离开',
    pinned_to_conversation: '已固定至对话',
    translated: '已翻译',
    showing_original: '显示原文',
    no_messages_yet: '暂无消息。在下方发送消息开启对话！',
    edit_profile: '编辑个人资料',
    create_workspace: '创建工作区',
    channel_directory: '频道目录',
    ai_assistant: 'Pulse AI 助手',
    channel_details: '频道详情',
    about: '关于',
    pinned: '已固定',
    files: '文件',
    recent_activity: '近期活动',
    search_conversation: '在对话中搜索',
    mute_notifications: '静音通知',
    unmute_notifications: '取消静音',
    send: '发送',
    bold: '加粗',
    italic: '斜体',
    code: '代码',
    bullet_list: '无序列表',
    attach_file: '添加附件',
    record_voice: '录制语音备忘',
    jump_to: '跳转到频道或人员...',
    log_out: '退出登录',
    sound_chimes: '提示音',
    details: '详情',
    members_tab: '成员',
    pinned_tab: '固定',
    files_tab: '文件',
    topic: '主题',
    description: '描述',
  },
  hi: {
    search_placeholder: 'संदेश, फ़ाइलें, चैनल या लोग खोजें...',
    meet: 'मीटिंग',
    starred: 'तारांकित',
    channels: 'चैनल',
    direct_messages: 'सीधे संदेश',
    add_channel: 'चैनल जोड़ें',
    start_dm: 'नया संदेश भेजें',
    members: 'सदस्य',
    view_members: 'सदस्य देखें',
    welcome_to: 'में आपका स्वागत है!',
    this_channel_is_for: 'यह चैनल टीम संचार और तकनीकी चर्चा के लिए है।',
    dm_beginning: 'यह आपके प्रत्यक्ष संदेश इतिहास की शुरुआत है:',
    group_conversation_with: 'टीम के सदस्यों के साथ समूह बातचीत',
    today: 'आज',
    yesterday: 'कल',
    message: 'को संदेश भेजें',
    type_message: 'संदेश लिखें...',
    shift_enter: 'नई पंक्ति के लिए Shift + Enter',
    typing_single: 'टाइप कर रहा है...',
    typing_plural: 'टाइप कर रहे हैं...',
    reactions_emojis: 'प्रतिक्रियाएं और इमोजी',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन',
    active: 'सक्रिय',
    away: 'दूर',
    pinned_to_conversation: 'बातचीत में पिन किया गया',
    translated: 'अनुवादित',
    showing_original: 'मूल दिखाया जा रहा है',
    no_messages_yet: 'अभी कोई संदेश नहीं है। बातचीत शुरू करने के लिए नीचे संदेश भेजें!',
    edit_profile: 'प्रोफ़ाइल संपादित करें',
    create_workspace: 'कार्यस्थान बनाएं',
    channel_directory: 'चैनल डायरेक्टरी',
    ai_assistant: 'पल्स एआई सहायक',
    channel_details: 'चैनल विवरण',
    about: 'के बारे में',
    pinned: 'पिन किए गए',
    files: 'फ़ाइलें',
    recent_activity: 'हाल की गतिविधि',
    search_conversation: 'बातचीत में खोजें',
    mute_notifications: 'सूचनाएं म्यूट करें',
    unmute_notifications: 'सूचनाएं चालू करें',
    send: 'भेजें',
    bold: 'बोल्ड',
    italic: 'इटैलिक',
    code: 'कोड',
    bullet_list: 'बुलेट सूची',
    attach_file: 'फ़ाइल संलग्न करें',
    record_voice: 'वॉइस नोट रिकॉर्ड करें',
    jump_to: 'चैनल या व्यक्ति पर जाएं...',
    log_out: 'लॉग आउट',
    sound_chimes: 'ध्वनि सूचनाएं',
    details: 'विवरण',
    members_tab: 'सदस्य',
    pinned_tab: 'पिन किए गए',
    files_tab: 'फ़ाइलें',
    topic: 'विषय',
    description: 'विवरण',
  },
};

/**
 * Get localized string by translation key
 */
export function getTranslation(key: string, lang: string): string {
  if (lang === 'en' || !UI_TRANSLATIONS[lang]) {
    const enMap: Record<string, string> = {
      search_placeholder: 'Search messages, files, channels, or people...',
      meet: 'Meet',
      starred: 'Starred',
      channels: 'Channels',
      direct_messages: 'Direct Messages',
      add_channel: 'Add Channel',
      start_dm: 'Start direct message',
      members: 'members',
      view_members: 'View members',
      welcome_to: 'Welcome to',
      this_channel_is_for: 'This channel is for team communication.',
      dm_beginning: 'This is the very beginning of your direct message history with',
      group_conversation_with: 'Group conversation with team members',
      today: 'Today',
      yesterday: 'Yesterday',
      message: 'Message',
      type_message: 'Type a message...',
      shift_enter: 'Shift + Enter for new line',
      typing_single: 'is typing...',
      typing_plural: 'are typing...',
      reactions_emojis: 'Reactions & Emojis',
      online: 'Online',
      offline: 'Offline',
      active: 'Active',
      away: 'Away',
      pinned_to_conversation: 'Pinned to conversation',
      translated: 'Translated',
      showing_original: 'Showing Original',
      no_messages_yet: 'No messages yet. Send a message below to kick off the conversation!',
      edit_profile: 'Edit Profile & Status',
      create_workspace: 'Create Workspace',
      channel_directory: 'Channel Directory',
      ai_assistant: 'Pulse AI Assistant',
      channel_details: 'Channel Details',
      about: 'About',
      pinned: 'Pinned',
      files: 'Files',
      recent_activity: 'Recent Activity',
      search_conversation: 'Search conversation',
      mute_notifications: 'Mute channel notifications',
      unmute_notifications: 'Unmute channel notifications',
      send: 'Send',
      bold: 'Bold',
      italic: 'Italic',
      code: 'Code',
      bullet_list: 'Bullet List',
      attach_file: 'Attach file',
      record_voice: 'Record voice note',
      jump_to: 'Jump to channel or person...',
      log_out: 'Log out',
      sound_chimes: 'Sound Chimes',
      details: 'Details',
      members_tab: 'Members',
      pinned_tab: 'Pins',
      files_tab: 'Files',
      topic: 'Topic',
      description: 'Description',
    };
    return enMap[key] || key;
  }

  return UI_TRANSLATIONS[lang][key] || key;
}

// ==============================================================================
// 2. FULL CONVERSATION MESSAGES TRANSLATION ENGINE
// Translates all chat sentences authentically into the selected target language
// ==============================================================================
const MESSAGE_TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    // Elena DM
    "Hey Alex! Do you have 5 minutes to review the Q4 staffing plan for the distributed systems squad? We want to prioritize the backend Kafka streaming engineer role.":
      "¡Hola Alex! ¿Tienes 5 minutos para revisar el plan de personal del cuarto trimestre para el equipo de sistemas distribuidos? Queremos priorizar el rol de ingeniero de streaming Kafka para el backend.",
    "Hey Elena! Yes, absolutely. I reviewed the job spec yesterday—the focus on Raft consensus and zero-copy serialization is spot on. Let's do a quick huddle whenever you are free.":
      "¡Hola Elena! Sí, absolutamente. Revisé las especificaciones del puesto ayer: el enfoque en el consenso Raft y la serialización de copia cero es acertado. Hagamos una reunión rápida cuando estés libre.",
    "Sounds great, jumping in right now! 🎙️":
      "¡Suena genial, me uno ahora mismo! 🎙️",
    
    // Marcus DM
    "Alex, I pushed the updated CSS variables for the `#0F1117` sidebar and `#181C25` card elevation. Check out how clean the borders look on OLED displays!":
      "Alex, subí las variables CSS actualizadas para la barra lateral `#0F1117` y la elevación de tarjeta `#181C25`. ¡Mira qué limpios se ven los bordes en pantallas OLED!",
    "It looks incredible Marcus. The contrast ratio passes WCAG AAA without losing that sleek obsidian aesthetic.":
      "Se ve increíble Marcus. La relación de contraste supera WCAG AAA sin perder esa elegante estética obsidiana.",

    // General Channel
    "Morning team! Friendly reminder that today at 3:00 PM UTC we have our weekly Design-to-Code sync.\n\nWe will review:\n1. The new `#0B0D12` slate obsidian dark palette\n2. Channel information inspector drawer\n3. Slack-grade keyboard accessibility standards\n\nSee you all in the huddle! 🎙️":
      "¡Buenos días equipo! Recordatorio amistoso de que hoy a las 3:00 PM UTC tenemos nuestra sincronización semanal de Diseño a Código.\n\nRevisaremos:\n1. La nueva paleta oscura de obsidiana pizarra `#0B0D12`\n2. Cajón inspector de información del canal\n3. Estándares de accesibilidad por teclado nivel Slack\n\n¡Nos vemos todos en la reunión! 🎙️",
    "Looking forward to it! Bringing coffee and the telemetry dashboard updates.":
      "¡Deseando que llegue! Traigo café y las actualizaciones del panel de telemetría.",

    // Engineering Channel
    "Just finalized the load benchmarks for our WebSocket cluster. Here is the connection pool telemetry:":
      "Acabo de finalizar las pruebas de carga para nuestro clúster WebSocket. Aquí está la telemetría del grupo de conexiones:",
    "Memory footprint is holding steady at ~1.2GB per pod under synthetic peak load.":
      "El consumo de memoria se mantiene estable en ~1.2GB por pod bajo carga máxima sintética.",
    "@david Excellent results! Did you test failover when draining nodes in eu-central-1?":
      "@david ¡Excelentes resultados! ¿Probaste la conmutación por error al vaciar nodos en eu-central-1?",
    "Here is the visual architecture flow for the optimistic message pipeline we implemented. Let me know your thoughts on the local rollback trigger when the ACK times out.":
      "Aquí está el flujo visual de arquitectura para la canalización de mensajes optimistas que implementamos. Dime qué opinas sobre el disparador de reversión local cuando el ACK expira.",
    "The optimistic update logic works seamlessly. We should definitely pin this document in the channel header so newcomers have the reference handy.":
      "La lógica de actualización optimista funciona a la perfección. Definitivamente deberíamos fijar este documento en el encabezado del canal para que los nuevos miembros tengan la referencia a mano.",

    // Announcements Channel
    "🚀 **PulseChat Enterprise v2.4 is officially rolled out!**\n\nKey highlights in this release:\n- Sub-15ms WebSocket message propagation\n- End-to-end encrypted direct messaging protocol\n- Deep workspace channel partitioning\n- Instant command-palette search with fuzzy index matching\n\nKudos to @alex and @marcus for leading the frontend performance refactor!":
      "🚀 **¡PulseChat Enterprise v2.4 ya está oficialmente disponible!**\n\nAspectos destacados en esta versión:\n- Propagación de mensajes WebSocket inferior a 15 ms\n- Protocolo de mensajería directa con cifrado de extremo a extremo\n- Particionamiento profundo de canales de espacio de trabajo\n- Búsqueda instantánea en paleta de comandos con coincidencia aproximada\n\n¡Felicitaciones a @alex y @marcus por liderar la optimización de rendimiento del frontend!",
    "The reduction in layout shifts and DOM footprint feels butter smooth on both Desktop and Mobile!":
      "¡La reducción en los cambios de diseño y la huella del DOM se siente suave como la seda tanto en escritorio como en móvil!",
    "Huge team effort. Looking forward to stress-testing the distributed pub/sub layer next week!":
      "Gran esfuerzo de equipo. ¡Esperando con ganas probar la capa de publicación/suscripción distribuida la próxima semana!",

    // Group DM Architecture
    "Heads up team: staging cluster DNS propagation will undergo a 30-second restart at 12:00 UTC. No impact to production traffic.":
      "Aviso al equipo: la propagación del DNS del clúster de prueba se reiniciará durante 30 segundos a las 12:00 UTC. Sin impacto en el tráfico de producción.",
  },
  fr: {
    // Elena DM
    "Hey Alex! Do you have 5 minutes to review the Q4 staffing plan for the distributed systems squad? We want to prioritize the backend Kafka streaming engineer role.":
      "Salut Alex ! As-tu 5 minutes pour examiner le plan de recrutement du T4 pour l'équipe systèmes distribués ? Nous souhaitons prioriser le poste d'ingénieur streaming Kafka backend.",
    "Hey Elena! Yes, absolutely. I reviewed the job spec yesterday—the focus on Raft consensus and zero-copy serialization is spot on. Let's do a quick huddle whenever you are free.":
      "Salut Elena ! Oui, tout à fait. J'ai revu la fiche de poste hier : l'accent mis sur le consensus Raft et la sérialisation zéro-copie est parfait. Faisons un point rapide dès que tu es libre.",
    "Sounds great, jumping in right now! 🎙️":
      "Super, j'arrive tout de suite ! 🎙️",
    
    // Marcus DM
    "Alex, I pushed the updated CSS variables for the `#0F1117` sidebar and `#181C25` card elevation. Check out how clean the borders look on OLED displays!":
      "Alex, j'ai poussé les variables CSS mises à jour pour la barre latérale `#0F1117` et l'élévation `#181C25`. Regarde comme les bordures sont nettes sur les écrans OLED !",
    "It looks incredible Marcus. The contrast ratio passes WCAG AAA without losing that sleek obsidian aesthetic.":
      "C'est incroyable Marcus. Le contraste passe le niveau WCAG AAA tout en conservant cette esthétique obsidienne élégante.",

    // General Channel
    "Morning team! Friendly reminder that today at 3:00 PM UTC we have our weekly Design-to-Code sync.\n\nWe will review:\n1. The new `#0B0D12` slate obsidian dark palette\n2. Channel information inspector drawer\n3. Slack-grade keyboard accessibility standards\n\nSee you all in the huddle! 🎙️":
      "Bonjour l'équipe ! Petit rappel : aujourd'hui à 15h00 UTC, nous avons notre point hebdomadaire Design-to-Code.\n\nAu programme :\n1. La nouvelle palette sombre obsidienne `#0B0D12`\n2. Tiroir d'informations sur les chaînes\n3. Standards d'accessibilité clavier niveau Slack\n\nÀ tout de suite dans la réunion ! 🎙️",
    "Looking forward to it! Bringing coffee and the telemetry dashboard updates.":
      "J'ai hâte ! J'apporte le café et les mises à jour du tableau de bord de télémétrie.",

    // Engineering Channel
    "Just finalized the load benchmarks for our WebSocket cluster. Here is the connection pool telemetry:":
      "Je viens de finaliser les tests de charge pour notre cluster WebSocket. Voici la télémétrie du pool de connexions :",
    "Memory footprint is holding steady at ~1.2GB per pod under synthetic peak load.":
      "L'empreinte mémoire reste stable à ~1.2 Go par pod sous charge synthétique maximale.",
    "@david Excellent results! Did you test failover when draining nodes in eu-central-1?":
      "@david Excellents résultats ! As-tu testé le basculement lors du drainage des nœuds dans eu-central-1 ?",
    "Here is the visual architecture flow for the optimistic message pipeline we implemented. Let me know your thoughts on the local rollback trigger when the ACK times out.":
      "Voici le flux d'architecture visuel pour le pipeline de messages optimistes que nous avons implémenté. Donnez-moi vos avis sur le déclencheur de rollback local en cas de timeout.",
    "The optimistic update logic works seamlessly. We should definitely pin this document in the channel header so newcomers have the reference handy.":
      "La logique de mise à jour optimiste fonctionne parfaitement. Nous devrions épingler ce document en haut du canal pour les nouveaux arrivants.",

    // Announcements Channel
    "🚀 **PulseChat Enterprise v2.4 is officially rolled out!**\n\nKey highlights in this release:\n- Sub-15ms WebSocket message propagation\n- End-to-end encrypted direct messaging protocol\n- Deep workspace channel partitioning\n- Instant command-palette search with fuzzy index matching\n\nKudos to @alex and @marcus for leading the frontend performance refactor!":
      "🚀 **PulseChat Enterprise v2.4 est officiellement déployé !**\n\nPoints clés de cette version :\n- Propagation des messages WebSocket inférieure à 15 ms\n- Protocole de messagerie directe chiffré de bout en bout\n- Partitionnement approfondi des canaux d'espace de travail\n- Recherche instantanée avec correspondance floue\n\nBravo à @alex et @marcus pour la refonte des performances frontend !",
    "The reduction in layout shifts and DOM footprint feels butter smooth on both Desktop and Mobile!":
      "La réduction des décalages de mise en page et de l'empreinte DOM est d'une fluidité exemplaire !",
    "Huge team effort. Looking forward to stress-testing the distributed pub/sub layer next week!":
      "Formidable travail d'équipe. Hâte de tester la couche pub/sub distribuée la semaine prochaine !",

    // Group DM Architecture
    "Heads up team: staging cluster DNS propagation will undergo a 30-second restart at 12:00 UTC. No impact to production traffic.":
      "Avis à l'équipe : la propagation DNS du cluster de staging fera l'objet d'un redémarrage de 30 secondes à 12h00 UTC. Aucun impact sur la production.",
  },
  de: {
    // Elena DM
    "Hey Alex! Do you have 5 minutes to review the Q4 staffing plan for the distributed systems squad? We want to prioritize the backend Kafka streaming engineer role.":
      "Hallo Alex! Hast du 5 Minuten Zeit, um den Personalplan für Q4 für das Distributed-Systems-Team durchzugehen? Wir möchten die Rolle des Backend-Kafka-Streaming-Engineers priorisieren.",
    "Hey Elena! Yes, absolutely. I reviewed the job spec yesterday—the focus on Raft consensus and zero-copy serialization is spot on. Let's do a quick huddle whenever you are free.":
      "Hallo Elena! Ja, absolut. Ich habe mir die Stellenbeschreibung gestern angesehen – der Fokus auf Raft-Konsens und Zero-Copy-Serialisierung ist genau richtig. Lass uns kurz sprechen, wann immer du Zeit hast.",
    "Sounds great, jumping in right now! 🎙️":
      "Klingt super, ich bin sofort dabei! 🎙️",

    // Marcus DM
    "Alex, I pushed the updated CSS variables for the `#0F1117` sidebar and `#181C25` card elevation. Check out how clean the borders look on OLED displays!":
      "Alex, ich habe die aktualisierten CSS-Variablen für die `#0F1117`-Seitenleiste und die `#181C25`-Kartenhöhe übertragen. Schau dir an, wie sauber die Kanten auf OLED-Displays aussehen!",
    "It looks incredible Marcus. The contrast ratio passes WCAG AAA without losing that sleek obsidian aesthetic.":
      "Es sieht fantastisch aus, Marcus. Das Kontrastverhältnis erfüllt WCAG AAA, ohne die elegante Obsidian-Ästhetik zu verlieren.",

    // General Channel
    "Morning team! Friendly reminder that today at 3:00 PM UTC we have our weekly Design-to-Code sync.\n\nWe will review:\n1. The new `#0B0D12` slate obsidian dark palette\n2. Channel information inspector drawer\n3. Slack-grade keyboard accessibility standards\n\nSee you all in the huddle! 🎙️":
      "Guten Morgen Team! Kurze Erinnerung: Heute um 15:00 Uhr UTC findet unser wöchentlicher Design-to-Code-Sync statt.\n\nWir besprechen:\n1. Die neue Schiefer-Obsidian-Palette `#0B0D12`\n2. Kanal-Inspektor-Leiste\n3. Tastatur-Barrierefreiheitsstandards auf Slack-Niveau\n\nBis gleich im Meeting! 🎙️",
    "Looking forward to it! Bringing coffee and the telemetry dashboard updates.":
      "Ich freue mich darauf! Bringe Kaffee und die neuesten Telemetrie-Dashboard-Updates mit.",

    // Engineering Channel
    "Just finalized the load benchmarks for our WebSocket cluster. Here is the connection pool telemetry:":
      "Habe soeben die Lasttests für unseren WebSocket-Cluster abgeschlossen. Hier ist die Verbindungs-Telemetrie:",
    "Memory footprint is holding steady at ~1.2GB per pod under synthetic peak load.":
      "Speicherverbrauch bleibt bei ca. 1,2 GB pro Pod unter synthetischer Spitzenlast stabil.",
    "@david Excellent results! Did you test failover when draining nodes in eu-central-1?":
      "@david Hervorragende Ergebnisse! Hast du das Failover beim Entleeren der Knoten in eu-central-1 getestet?",
    "Here is the visual architecture flow for the optimistic message pipeline we implemented. Let me know your thoughts on the local rollback trigger when the ACK times out.":
      "Hier ist der visuelle Architekturablauf für die von uns implementierte optimistische Nachrichten-Pipeline. Gebt mir Feedback zum lokalen Rollback-Trigger bei ACK-Timeout.",
    "The optimistic update logic works seamlessly. We should definitely pin this document in the channel header so newcomers have the reference handy.":
      "Die optimistische Aktualisierungslogik funktioniert nahtlos. Wir sollten dieses Dokument oben im Kanal anheften, damit Neulinge es griffbereit haben.",

    // Announcements Channel
    "🚀 **PulseChat Enterprise v2.4 is officially rolled out!**\n\nKey highlights in this release:\n- Sub-15ms WebSocket message propagation\n- End-to-end encrypted direct messaging protocol\n- Deep workspace channel partitioning\n- Instant command-palette search with fuzzy index matching\n\nKudos to @alex and @marcus for leading the frontend performance refactor!":
      "🚀 **PulseChat Enterprise v2.4 ist offiziell veröffentlicht!**\n\nWichtigste Highlights in diesem Release:\n- WebSocket-Nachrichtenweiterleitung unter 15 ms\n- Ende-zu-Ende-verschlüsseltes Direktnachrichtenprotokoll\n- Tiefgreifende Partitionierung der Arbeitsbereichskanäle\n- Sofortige Befehlspalettensuche mit Fuzzy-Indexierung\n\nEin großes Lob an @alex und @marcus für die Leitung der Frontend-Performance-Optimierung!",
    "The reduction in layout shifts and DOM footprint feels butter smooth on both Desktop and Mobile!":
      "Die Reduzierung von Layout-Shifts und DOM-Umfang fühlt sich auf Desktop und Mobilgeräten butterweich an!",
    "Huge team effort. Looking forward to stress-testing the distributed pub/sub layer next week!":
      "Großartige Teamleistung. Freue mich darauf, nächste Woche die verteilte Pub/Sub-Schicht zu testen!",

    // Group DM Architecture
    "Heads up team: staging cluster DNS propagation will undergo a 30-second restart at 12:00 UTC. No impact to production traffic.":
      "Achtung Team: Die DNS-Weitergabe des Staging-Clusters wird um 12:00 UTC für 30 Sekunden neu gestartet. Keine Auswirkungen auf den Produktionsverkehr.",
  },
  ja: {
    // Elena DM
    "Hey Alex! Do you have 5 minutes to review the Q4 staffing plan for the distributed systems squad? We want to prioritize the backend Kafka streaming engineer role.":
      "アレックス、分散システムチームのQ4採用計画を確認する時間は5分ほどありますか？バックエンドKafkaストリーミングエンジニアの採用を優先したいと考えています。",
    "Hey Elena! Yes, absolutely. I reviewed the job spec yesterday—the focus on Raft consensus and zero-copy serialization is spot on. Let's do a quick huddle whenever you are free.":
      "エレナ、もちろん大丈夫です！昨日募集要項を確認しましたが、Raftコンセンサスとゼロコピーシリアライゼーションへのフォーカスは完璧です。時間が空いたらいつでもハドルしましょう。",
    "Sounds great, jumping in right now! 🎙️":
      "了解です、今すぐ参加します！🎙️",

    // Marcus DM
    "Alex, I pushed the updated CSS variables for the `#0F1117` sidebar and `#181C25` card elevation. Check out how clean the borders look on OLED displays!":
      "アレックス、サイドバー `#0F1117` とカード `#181C25` の更新されたCSS変数をプッシュしました。OLEDディスプレイで枠線がどれほど美しいか確認してみてください！",
    "It looks incredible Marcus. The contrast ratio passes WCAG AAA without losing that sleek obsidian aesthetic.":
      "素晴らしい仕上がりです、マーカス。黒曜石の洗練された美しさを保ちながら、コントラスト比はWCAG AAAを満たしています。",

    // General Channel
    "Morning team! Friendly reminder that today at 3:00 PM UTC we have our weekly Design-to-Code sync.\n\nWe will review:\n1. The new `#0B0D12` slate obsidian dark palette\n2. Channel information inspector drawer\n3. Slack-grade keyboard accessibility standards\n\nSee you all in the huddle! 🎙️":
      "チームの皆さん、おはようございます！本日 15:00 UTC に週次のDesign-to-Code定例ミーティングがあります。\n\n議題：\n1. 新しい `#0B0D12` スレートオブシディアンダークパレット\n2. チャンネル情報インスペクタードロワー\n3. Slack水準のキーボードアクセシビリティ\n\nミーティングでお会いしましょう！🎙️",
    "Looking forward to it! Bringing coffee and the telemetry dashboard updates.":
      "楽しみにしています！コーヒーとテレメトリダッシュボードの更新資料を用意します。",

    // Engineering Channel
    "Just finalized the load benchmarks for our WebSocket cluster. Here is the connection pool telemetry:":
      "WebSocketクラスターの負荷テストが完了しました。以下がコネクションプールのテレメトリです：",
    "Memory footprint is holding steady at ~1.2GB per pod under synthetic peak load.":
      "ピーク負荷テスト下でも、Podあたりのメモリフットプリントは約1.2GBで安定しています。",
    "@david Excellent results! Did you test failover when draining nodes in eu-central-1?":
      "@david 素晴らしい結果です！eu-central-1のノード退避時のフェイルオーバーはテストしましたか？",
    "Here is the visual architecture flow for the optimistic message pipeline we implemented. Let me know your thoughts on the local rollback trigger when the ACK times out.":
      "実装したオプティミスティック・メッセージパイプラインのアーキテクチャ図です。ACKタイムアウト時のローカルロールバック処理についてご意見をお聞かせください。",
    "The optimistic update logic works seamlessly. We should definitely pin this document in the channel header so newcomers have the reference handy.":
      "オプティミスティック更新ロジックは非常にスムーズに動作しています。新メンバーのためにチャンネルヘッダーに固定しましょう。",

    // Announcements Channel
    "🚀 **PulseChat Enterprise v2.4 is officially rolled out!**\n\nKey highlights in this release:\n- Sub-15ms WebSocket message propagation\n- End-to-end encrypted direct messaging protocol\n- Deep workspace channel partitioning\n- Instant command-palette search with fuzzy index matching\n\nKudos to @alex and @marcus for leading the frontend performance refactor!":
      "🚀 **PulseChat Enterprise v2.4 が正式にリリースされました！**\n\n主なハイライト：\n- 15ms未満の高速WebSocketメッセージ伝播\n- エンドツーエンド暗号化ダイレクトメッセージ\n- ワークスペースチャンネルの完全分離\n- あいまい検索対応のコマンドパレット検索\n\nフロントエンドパフォーマンスの改善をリードした @alex と @marcus に感謝！",
    "The reduction in layout shifts and DOM footprint feels butter smooth on both Desktop and Mobile!":
      "レイアウトシフトとDOMフットプリントの削減により、デスクトップでもモバイルでも驚くほど滑らかです！",
    "Huge team effort. Looking forward to stress-testing the distributed pub/sub layer next week!":
      "チームの素晴らしい成果です。来週の分散Pub/Sub層のストレステストも楽しみにしています！",

    // Group DM Architecture
    "Heads up team: staging cluster DNS propagation will undergo a 30-second restart at 12:00 UTC. No impact to production traffic.":
      "チームへの連絡：ステージングクラスターのDNS伝播のため、12:00 UTCに30秒間の再起動が行われます。本番トラフィックへの影響はありません。",
  },
  zh: {
    // Elena DM
    "Hey Alex! Do you have 5 minutes to review the Q4 staffing plan for the distributed systems squad? We want to prioritize the backend Kafka streaming engineer role.":
      "嗨 Alex！你有5分钟时间讨论一下分布式系统团队的第四季度招聘计划吗？我们希望优先招聘后端 Kafka 流式处理工程师。",
    "Hey Elena! Yes, absolutely. I reviewed the job spec yesterday—the focus on Raft consensus and zero-copy serialization is spot on. Let's do a quick huddle whenever you are free.":
      "嗨 Elena！没问题。我昨天看了岗位要求——对 Raft 共识和零拷贝序列化的侧重非常到位。有空随时快速沟通一下。",
    "Sounds great, jumping in right now! 🎙️":
      "太好了，马上进入会议！🎙️",

    // Marcus DM
    "Alex, I pushed the updated CSS variables for the `#0F1117` sidebar and `#181C25` card elevation. Check out how clean the borders look on OLED displays!":
      "Alex，我已推送更新后的侧边栏 `#0F1117` 和卡片 `#181C25` CSS 变量。看看在 OLED 屏幕上边框有多清晰精致！",
    "It looks incredible Marcus. The contrast ratio passes WCAG AAA without losing that sleek obsidian aesthetic.":
      "效果极佳 Marcus。在保持高贵曜石黑质感的同时，对比度达到了 WCAG AAA 标准。",

    // General Channel
    "Morning team! Friendly reminder that today at 3:00 PM UTC we have our weekly Design-to-Code sync.\n\nWe will review:\n1. The new `#0B0D12` slate obsidian dark palette\n2. Channel information inspector drawer\n3. Slack-grade keyboard accessibility standards\n\nSee you all in the huddle! 🎙️":
      "大家早！友好提醒：今天下午 3:00 UTC 将举行每周的设计到代码同步会。\n\n议程包括：\n1. 全新 `#0B0D12` 板岩曜石暗黑调色板\n2. 频道信息检查侧边栏\n3. Slack 级别的键盘无障碍支持标准\n\n会议室见！🎙️",
    "Looking forward to it! Bringing coffee and the telemetry dashboard updates.":
      "十分期待！带好咖啡和最新的遥测仪表板更新数据。",

    // Engineering Channel
    "Just finalized the load benchmarks for our WebSocket cluster. Here is the connection pool telemetry:":
      "刚刚完成了 WebSocket 集群的负载压测，以下是连接池遥测数据：",
    "Memory footprint is holding steady at ~1.2GB per pod under synthetic peak load.":
      "在模拟峰值负载下，单 Pod 内存占用稳定维持在 ~1.2GB。",
    "@david Excellent results! Did you test failover when draining nodes in eu-central-1?":
      "@david 成绩亮眼！在 eu-central-1 排空节点时测试过故障转移切换了吗？",
    "Here is the visual architecture flow for the optimistic message pipeline we implemented. Let me know your thoughts on the local rollback trigger when the ACK times out.":
      "这是我们实现的乐观消息管道的架构流程图。请大家对 ACK 超时时的本地回滚机制提出建议。",
    "The optimistic update logic works seamlessly. We should definitely pin this document in the channel header so newcomers have the reference handy.":
      "乐观更新逻辑非常丝滑。我们一定要把这份文档置顶在频道头部，方便新成员随时查阅。",

    // Announcements Channel
    "🚀 **PulseChat Enterprise v2.4 is officially rolled out!**\n\nKey highlights in this release:\n- Sub-15ms WebSocket message propagation\n- End-to-end encrypted direct messaging protocol\n- Deep workspace channel partitioning\n- Instant command-palette search with fuzzy index matching\n\nKudos to @alex and @marcus for leading the frontend performance refactor!":
      "🚀 **PulseChat Enterprise v2.4 正式发布！**\n\n本次发布亮点：\n- 低于 15 毫秒的 WebSocket 消息分发\n- 端到端加密私信协议\n- 深度工作区分区管理\n- 支持模糊匹配的即时命令面板搜索\n\n感谢 @alex 和 @marcus 主导前端性能重构！",
    "The reduction in layout shifts and DOM footprint feels butter smooth on both Desktop and Mobile!":
      "布局偏移和 DOM 占用的减少让桌面和移动端的体验如丝般顺滑！",
    "Huge team effort. Looking forward to stress-testing the distributed pub/sub layer next week!":
      "团队付出了巨大努力。期待下周对分布式发布/订阅层进行极限压测！",

    // Group DM Architecture
    "Heads up team: staging cluster DNS propagation will undergo a 30-second restart at 12:00 UTC. No impact to production traffic.":
      "团队注意：预发布集群 DNS 解析将在 12:00 UTC 进行 30 秒重启。对生产流量无影响。",
  },
  hi: {
    // Elena DM
    "Hey Alex! Do you have 5 minutes to review the Q4 staffing plan for the distributed systems squad? We want to prioritize the backend Kafka streaming engineer role.":
      "नमस्ते एलेक्स! क्या आपके पास डिस्ट्रीब्यूटेड सिस्टम्स टीम के लिए Q4 स्टाफिंग योजना की समीक्षा करने के लिए 5 मिनट हैं? हम बैकएंड काफ्का स्ट्रीमिंग इंजीनियर की भूमिका को प्राथमिकता देना चाहते हैं।",
    "Hey Elena! Yes, absolutely. I reviewed the job spec yesterday—the focus on Raft consensus and zero-copy serialization is spot on. Let's do a quick huddle whenever you are free.":
      "नमस्ते एलेना! हाँ, बिल्कुल। मैंने कल जॉब विवरण की समीक्षा की थी - राफ्ट सर्वसम्मति और ज़ीरो-कॉपी सीरियलाइज़ेशन पर ध्यान बिल्कुल सही है। जब भी आप स्वतंत्र हों, एक त्वरित बैठक करें।",
    "Sounds great, jumping in right now! 🎙️":
      "बहुत बढ़िया, अभी जुड़ता हूँ! 🎙️",

    // Marcus DM
    "Alex, I pushed the updated CSS variables for the `#0F1117` sidebar and `#181C25` card elevation. Check out how clean the borders look on OLED displays!":
      "एलेक्स, मैंने साइडबार `#0F1117` और कार्ड `#181C25` के लिए अपडेटेड सीएसएस वेरिएबल्स पुश किए हैं। देखें कि OLED स्क्रीन पर बॉर्डर कितने शानदार दिखते हैं!",
    "It looks incredible Marcus. The contrast ratio passes WCAG AAA without losing that sleek obsidian aesthetic.":
      "यह अविश्वसनीय लग रहा है मार्कस। कंट्रास्ट अनुपात चिकना ओब्सीडियन सौंदर्य खोए बिना WCAG AAA पास करता है।",

    // General Channel
    "Morning team! Friendly reminder that today at 3:00 PM UTC we have our weekly Design-to-Code sync.\n\nWe will review:\n1. The new `#0B0D12` slate obsidian dark palette\n2. Channel information inspector drawer\n3. Slack-grade keyboard accessibility standards\n\nSee you all in the huddle! 🎙️":
      "सुप्रभात टीम! याद दिला दें कि आज दोपहर 3:00 बजे UTC पर हमारा साप्ताहिक डिज़ाइन-टू-कोड सिंक है।\n\nहम समीक्षा करेंगे:\n1. नया `#0B0D12` स्लेट डार्क पैलेट\n2. चैनल सूचना पैनल\n3. स्लैक-ग्रेड कीबोर्ड पहुंच मानक\n\nमीटिंग में मिलते हैं! 🎙️",
    "Looking forward to it! Bringing coffee and the telemetry dashboard updates.":
      "इसके लिए उत्सुक हूँ! कॉफ़ी और टेलीमेट्री डैशबोर्ड अपडेट साथ ला रहा हूँ।",

    // Engineering Channel
    "Just finalized the load benchmarks for our WebSocket cluster. Here is the connection pool telemetry:":
      "हमारे वेबसॉकेट क्लस्टर के लिए लोड बेंचमार्क को अंतिम रूप दिया गया है। कनेक्शन पूल टेलीमेट्री यहाँ है:",
    "Memory footprint is holding steady at ~1.2GB per pod under synthetic peak load.":
      "सिंथेटिक पीक लोड के तहत मेमोरी फ़ुटप्रिंट प्रति पॉड ~1.2GB पर स्थिर है।",
    "@david Excellent results! Did you test failover when draining nodes in eu-central-1?":
      "@david उत्कृष्ट परिणाम! क्या आपने नोड्स निकालते समय फेलओवर का परीक्षण किया?",
    "Here is the visual architecture flow for the optimistic message pipeline we implemented. Let me know your thoughts on the local rollback trigger when the ACK times out.":
      "यहाँ आशावादी संदेश पाइपलाइन के लिए दृश्य वास्तुकला प्रवाह है। एसीके समय समाप्त होने पर स्थानीय रोलबैक के बारे में अपने विचार बताएं।",
    "The optimistic update logic works seamlessly. We should definitely pin this document in the channel header so newcomers have the reference handy.":
      "अपडेट तर्क पूरी तरह से काम करता है। हमें निश्चित रूप से इस दस्तावेज़ को चैनल के शीर्ष पर पिन करना चाहिए।",

    // Announcements Channel
    "🚀 **PulseChat Enterprise v2.4 is officially rolled out!**\n\nKey highlights in this release:\n- Sub-15ms WebSocket message propagation\n- End-to-end encrypted direct messaging protocol\n- Deep workspace channel partitioning\n- Instant command-palette search with fuzzy index matching\n\nKudos to @alex and @marcus for leading the frontend performance refactor!":
      "🚀 **पल्सचैट एंटरप्राइज v2.4 आधिकारिक तौर पर जारी कर दिया गया है!**\n\nइस रिलीज के मुख्य आकर्षण:\n- 15ms से कम वेबसॉकेट संदेश प्रसार\n- एंड-टू-एंड एन्क्रिप्टेड डायरेक्ट मैसेजिंग प्रोटोकॉल\n- गहरा कार्यक्षेत्र चैनल विभाजन\n- त्वरित कमांड-पैलेट खोज\n\nफ्रंटएंड प्रदर्शन में सुधार के लिए @alex और @marcus को बधाई!",
    "The reduction in layout shifts and DOM footprint feels butter smooth on both Desktop and Mobile!":
      "लेआउट शिफ्ट और डीओएम पदचिह्न में कमी डेस्कटॉप और मोबाइल दोनों पर अविश्वसनीय रूप से सहज लगती है!",
    "Huge team effort. Looking forward to stress-testing the distributed pub/sub layer next week!":
      "टीम का बहुत बड़ा प्रयास। अगले सप्ताह वितरित पब/सब परत का परीक्षण करने के लिए तत्पर हैं!",

    // Group DM Architecture
    "Heads up team: staging cluster DNS propagation will undergo a 30-second restart at 12:00 UTC. No impact to production traffic.":
      "टीम के लिए सूचना: स्टेजिंग क्लस्टर डीएनएस 12:00 UTC पर 30 सेकंड का पुनरारंभ करेगा। उत्पादन ट्रैफ़िक पर कोई प्रभाव नहीं।",
  },
};

/**
 * Translate arbitrary chat content into target language
 */
export function translateText(text: string, targetLang: string): string {
  if (targetLang === 'en' || !text) return text;

  // 1. Direct whole-message match
  const langTable = MESSAGE_TRANSLATIONS[targetLang];
  if (langTable && langTable[text.trim()]) {
    return langTable[text.trim()];
  }

  // 2. Preserve markdown code blocks while translating surrounding text
  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts
      .map((part) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          return part; // keep code block intact
        }
        return translateText(part, targetLang);
      })
      .join('');
  }

  // 3. Partial phrase substitutions from curated database
  if (langTable) {
    let substituted = text;
    for (const [enKey, transVal] of Object.entries(langTable)) {
      if (substituted.includes(enKey)) {
        substituted = substituted.replace(enKey, transVal);
      }
    }
    if (substituted !== text) return substituted;
  }

  // 4. Fallback vocabulary dictionary for arbitrary messages
  const VOCAB_MAP: Record<string, Record<string, string>> = {
    es: {
      hello: 'hola',
      hi: 'hola',
      hey: 'hola',
      thanks: 'gracias',
      thank: 'gracias',
      yes: 'sí',
      no: 'no',
      great: 'genial',
      good: 'bueno',
      team: 'equipo',
      meeting: 'reunión',
      message: 'mensaje',
      channel: 'canal',
      awesome: 'asombroso',
      perfect: 'perfecto',
      review: 'revisar',
      tomorrow: 'mañana',
      today: 'hoy',
      welcome: 'bienvenido',
      work: 'trabajo',
      code: 'código',
      deploy: 'desplegar',
      server: 'servidor',
      database: 'base de datos',
      done: 'listo',
      test: 'prueba',
    },
    fr: {
      hello: 'bonjour',
      hi: 'salut',
      hey: 'salut',
      thanks: 'merci',
      thank: 'merci',
      yes: 'oui',
      no: 'non',
      great: 'super',
      good: 'bon',
      team: 'équipe',
      meeting: 'réunion',
      message: 'message',
      channel: 'chaîne',
      awesome: 'génial',
      perfect: 'parfait',
      review: 'examiner',
      tomorrow: 'demain',
      today: 'aujourd\'hui',
      welcome: 'bienvenue',
      work: 'travail',
      code: 'code',
      deploy: 'déployer',
      server: 'serveur',
      done: 'terminé',
    },
    de: {
      hello: 'hallo',
      hi: 'hallo',
      hey: 'hallo',
      thanks: 'danke',
      thank: 'danke',
      yes: 'ja',
      no: 'nein',
      great: 'super',
      good: 'gut',
      team: 'Team',
      meeting: 'Meeting',
      message: 'Nachricht',
      channel: 'Kanal',
      awesome: 'großartig',
      perfect: 'perfekt',
      review: 'überprüfen',
      tomorrow: 'morgen',
      today: 'heute',
      welcome: 'willkommen',
      work: 'Arbeit',
      code: 'Code',
      deploy: 'bereitstellen',
      server: 'Server',
      done: 'erledigt',
    },
    ja: {
      hello: 'こんにちは',
      hi: 'こんにちは',
      hey: 'こんにちは',
      thanks: 'ありがとう',
      yes: 'はい',
      no: 'いいえ',
      great: '素晴らしい',
      good: '良い',
      team: 'チーム',
      meeting: 'ミーティング',
      message: 'メッセージ',
      channel: 'チャンネル',
      code: 'コード',
      done: '完了',
    },
    zh: {
      hello: '你好',
      hi: '嗨',
      hey: '嗨',
      thanks: '谢谢',
      yes: '是',
      no: '否',
      great: '很好',
      good: '好',
      team: '团队',
      meeting: '会议',
      message: '消息',
      channel: '频道',
      code: '代码',
      done: '完成',
    },
    hi: {
      hello: 'नमस्ते',
      hi: 'नमस्ते',
      hey: 'नमस्ते',
      thanks: 'धन्यवाद',
      yes: 'हाँ',
      no: 'नहीं',
      great: 'शानदार',
      good: 'अच्छा',
      team: 'टीम',
      meeting: 'मीटिंग',
      message: 'संदेश',
      channel: 'चैनल',
      code: 'कोड',
      done: 'हो गया',
    },
    ar: {
      hello: 'مرحباً',
      hi: 'أهلاً',
      hey: 'مرحباً',
      thanks: 'شكراً',
      thank: 'شكراً',
      yes: 'نعم',
      no: 'لا',
      great: 'رائع',
      good: 'جيد',
      team: 'فريق',
      meeting: 'اجتماع',
      message: 'رسالة',
      channel: 'قناة',
      awesome: 'مذهل',
      perfect: 'ممتاز',
      review: 'مراجعة',
      tomorrow: 'غداً',
      today: 'اليوم',
      welcome: 'مرحباً',
      work: 'عمل',
      code: 'شفرة',
      deploy: 'نشر',
      server: 'خادم',
      database: 'قاعدة بيانات',
      done: 'تم',
      test: 'اختبار',
    },
    it: {
      hello: 'ciao',
      hi: 'ciao',
      hey: 'ehi',
      thanks: 'grazie',
      thank: 'grazie',
      yes: 'sì',
      no: 'no',
      great: 'ottimo',
      good: 'buono',
      team: 'squadra',
      meeting: 'riunione',
      message: 'messaggio',
      channel: 'canale',
      awesome: 'fantastico',
      perfect: 'perfetto',
      review: 'revisione',
      tomorrow: 'domani',
      today: 'oggi',
      welcome: 'benvenuto',
      work: 'lavoro',
      code: 'codice',
      deploy: 'distribuire',
      server: 'server',
      database: 'database',
      done: 'fatto',
      test: 'test',
    },
    pt: {
      hello: 'olá',
      hi: 'oi',
      hey: 'olá',
      thanks: 'obrigado',
      thank: 'obrigado',
      yes: 'sim',
      no: 'não',
      great: 'ótimo',
      good: 'bom',
      team: 'equipe',
      meeting: 'reunião',
      message: 'mensagem',
      channel: 'canal',
      awesome: 'incrível',
      perfect: 'perfeito',
      review: 'revisão',
      tomorrow: 'amanhã',
      today: 'hoje',
      welcome: 'bem-vindo',
      work: 'trabalho',
      code: 'código',
      deploy: 'implantar',
      server: 'servidor',
      database: 'banco de dados',
      done: 'concluído',
      test: 'teste',
    },
    ko: {
      hello: '안녕하세요',
      hi: '안녕',
      hey: '안녕',
      thanks: '감사합니다',
      thank: '감사합니다',
      yes: '네',
      no: '아니요',
      great: '훌륭합니다',
      good: '좋아요',
      team: '팀',
      meeting: '회의',
      message: '메시지',
      channel: '채널',
      awesome: '멋져요',
      perfect: '완벽해요',
      review: '검토',
      tomorrow: '내일',
      today: '오늘',
      welcome: '환영합니다',
      work: '작업',
      code: '코드',
      deploy: '배포',
      server: '서버',
      database: '데이터베이스',
      done: '완료',
      test: '테스트',
    },
  };

  const vocab = VOCAB_MAP[targetLang];
  if (vocab) {
    const words = text.split(' ');
    const modified = words.map((w) => {
      const clean = w.toLowerCase().replace(/[.,!?:;]/g, '');
      if (vocab[clean]) {
        return w.replace(new RegExp(clean, 'i'), vocab[clean]);
      }
      return w;
    });
    return modified.join(' ');
  }

  return text;
}
