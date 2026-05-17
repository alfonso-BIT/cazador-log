// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §01 — CONSTANTS                                                         ║
// ║  Sin dependencias externas. Solo lectura en runtime.                     ║
// ║  XPR es la única excepción: puede ser sobreescrita por saveRanks() §16. ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Clases (categoría dominante → clase de personaje) ──────────────────────
const CLASSES = {
  salud:      { name:'SANADOR',   emoji:'💚', avatar:'🧬', desc:'Tu dedicación a la salud te convierte en fuente de vida para quienes te rodean.', color:'#4ade80' },
  guerrero:   { name:'GUERRERO',  emoji:'⚔️', avatar:'⚔️', desc:'La forja del cuerpo es tu templo. La fuerza física es tu legado.',              color:'#ff6b35' },
  estudio:    { name:'MAGO',      emoji:'📚', avatar:'🔮', desc:'El conocimiento es poder absoluto. Tu mente trasciende los límites mundanos.',   color:'#22d3ee' },
  lectura:    { name:'ARCHIMAGO', emoji:'📖', avatar:'✨', desc:'La sabiduría ancestral fluye por tus venas. Eres el receptor del conocimiento eterno.', color:'#fb923c' },
  habitos:    { name:'ASESINO',   emoji:'🌟', avatar:'🗡️', desc:'Preciso. Constante. Letal en tus rutinas. Nadie ve venir tu disciplina.',        color:'#94a3b8' },
  creatividad:{ name:'BARDO',     emoji:'🎨', avatar:'🎭', desc:'Tu creatividad es magia pura. Transformas el mundo con cada obra que produces.',  color:'#f0c040' },
  mental:     { name:'MONJE',     emoji:'🧘', avatar:'☯️', desc:'El equilibrio interior es tu arma suprema. La mente en calma todo lo puede.',    color:'#60a5fa' },
  familia:    { name:'GUARDIÁN',  emoji:'👨‍👩‍👧', avatar:'🏠', desc:'Tu familia es tu fortaleza. La proteger y nutrir es tu misión más sagrada.',    color:'#f472b6' },
  trabajo:    { name:'MAESTRO',   emoji:'💼', avatar:'🎯', desc:'La excelencia profesional es tu camino. Cada logro refuerza tu legado.',          color:'#34d399' },
  viajes:     { name:'EXPLORADOR',emoji:'🏍️', avatar:'🗺️', desc:'El mundo es tu terreno de juego. Cada destino amplía tu horizonte.',              color:'#fbbf24' },
  logros:     { name:'CAMPEÓN',   emoji:'🏆', avatar:'⭐', desc:'Tus metas son el mapa de tu vida. Cada logro conquistado te define.',              color:'#f59e0b' },
  visionboard:{ name:'VISIONARIO',emoji:'🖼️', avatar:'✨', desc:'Tu visión crea tu realidad. El tablero de sueños es tu brújula al futuro.',       color:'#a78bfa' },
};

// ── Etiquetas legibles por humano para cada categoría ──────────────────────
const CAT_LABELS = {
  salud:'💪 Salud', guerrero:'⚔️ Guerrero', estudio:'📚 Estudio',
  lectura:'📖 Lectura', habitos:'🌟 Hábitos', creatividad:'🎨 Creatividad', mental:'🧘 Mental',
  familia:'👨‍👩‍👧 Familia', trabajo:'💼 Trabajo', viajes:'🏍️ Viajes', logros:'🏆 Logros', visionboard:'🖼️ Vision Board'
};

// ── Categorías cubiertas por la rotación diaria (§04) ──────────────────────
const DAILY_CATS = ['salud', 'guerrero', 'estudio', 'habitos'];

// ── Etiquetas de rareza ────────────────────────────────────────────────────
const RARLBL = { common:'Común', rare:'Raro', epic:'Épico', legendary:'Legendario' };

// ── Tabla de rangos: nivel mínimo → etiqueta (usada en getRank() §06) ─────
const PRANK = [
  { lvl:1,  r:'RANGO E' },
  { lvl:5,  r:'RANGO D' },
  { lvl:10, r:'RANGO C' },
  { lvl:20, r:'RANGO B' },
  { lvl:35, r:'RANGO A' },
  { lvl:50, r:'RANGO S' },
];

// ── XP base por rareza (editable por el usuario en §16 / saveRanks) ─────────
// No usar `const` — saveRanks() (§16) sobreescribe este objeto en runtime.
let XPR = { D:15, C:30, B:50, A:80, S:120 };

// ── Estado mutable global (inicializado en §02 loadState / §03 doLogin) ────
// Declarados aquí para que todos los módulos posteriores los vean.
let S             = null;   // estado del usuario activo
let pendingId     = null;   // misión esperando confirmación de canje
let editingMissionId = null;// misión en modo edición inline
let currentUser   = null;   // username activo

// ── Períodos activos (módulos de tienda y perfil los leen/escriben) ─────────
let shopPeriod    = 'day';  // 'day' | 'week' | 'month'
let currentPeriod = 'week'; // 'week' | 'month'
