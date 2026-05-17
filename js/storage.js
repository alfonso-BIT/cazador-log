// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §02 — MULTI-USER STORAGE                                               ║
// ║  Dependencias: constants.js (XPR, S, currentUser)                      ║
// ║  Consumido por: todos los módulos (todos llaman save()/load())          ║
// ║  §02-B GitHub Gist sync (opcional — no rompe nada si no se configura)  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── §02-B GIST CONFIG ────────────────────────────────────────────────────
// Clave de localStorage donde se guarda {token, gistId}
const GIST_CFG_KEY = 'cazador_gist_cfg';

function gistGetCfg(){ try{ return JSON.parse(localStorage.getItem(GIST_CFG_KEY)||'null'); }catch(e){ return null; } }
function gistSaveCfg(cfg){ localStorage.setItem(GIST_CFG_KEY, JSON.stringify(cfg)); }
function gistClearCfg(){ localStorage.removeItem(GIST_CFG_KEY); }

// Nombre del archivo dentro del Gist para este usuario
function gistFileName(user){ return getUserKey(user) + '.json'; }

// Push: sube localStorage → Gist (silencioso, no bloquea)
async function gistPush(){
  const cfg = gistGetCfg();
  if(!cfg?.token || !cfg?.gistId || !currentUser) return;
  const content = localStorage.getItem(getUserKey(currentUser));
  if(!content) return;
  try {
    await fetch('https://api.github.com/gists/' + cfg.gistId, {
      method: 'PATCH',
      headers: { 'Authorization': 'token ' + cfg.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { [gistFileName(currentUser)]: { content } } })
    });
  } catch(e){ /* sin internet — silencioso */ }
}

// Pull: baja Gist → fusiona con localStorage usando mergeStates() y retorna true si hubo datos
// Nunca reemplaza: si local y remoto divergen, combina lo mejor de ambos.
async function gistPull(){
  const cfg = gistGetCfg();
  if(!cfg?.token || !cfg?.gistId || !currentUser) return false;
  try {
    const r = await fetch('https://api.github.com/gists/' + cfg.gistId,
      { headers: { 'Authorization': 'token ' + cfg.token } });
    if(!r.ok) return false;
    const data = await r.json();
    const file = data.files?.[gistFileName(currentUser)];
    if(file?.content){
      let localRaw = null;
      try { localRaw = JSON.parse(localStorage.getItem(getUserKey(currentUser)) || 'null'); } catch(e){}
      let remote = null;
      try { remote = JSON.parse(file.content); } catch(e){ return false; }
      // mergeStates está definida más abajo en este mismo archivo;
      // en bootSession ya está disponible porque storage.js carga completo antes de ejecutarse.
      const merged = (typeof mergeStates === 'function')
        ? mergeStates(localRaw, remote)
        : remote;  // fallback seguro
      merged.lastSyncTs = Date.now();
      localStorage.setItem(getUserKey(currentUser), JSON.stringify(merged));
      setTimeout(gistPush, 500);  // subir el merge para que el otro dispositivo lo reciba
      return true;
    }
  } catch(e){ /* sin internet */ }
  return false;
}

// Verifica token+gist y retorna {ok, error}
async function gistVerify(token, gistId){
  try {
    const r = await fetch('https://api.github.com/gists/' + gistId,
      { headers: { 'Authorization': 'token ' + token } });
    if(r.status === 401) return { ok:false, error:'Token inválido' };
    if(r.status === 404) return { ok:false, error:'Gist no encontrado' };
    if(!r.ok)           return { ok:false, error:'Error ' + r.status };
    return { ok:true };
  } catch(e){ return { ok:false, error:'Sin conexión' }; }
}
// ── FIN §02-B ─────────────────────────────────────────────────────────────

function getUserKey(user){
  return 'sl_v3_' + user.toLowerCase().replace(/\s+/g, '_');
}

function loadState(user){
  try {
    const raw = localStorage.getItem(getUserKey(user));
    if(raw){
      const d = JSON.parse(raw);
      const def = defaultState();
      const merged = Object.assign({}, def, d);
      // Garantizar campos críticos en saves antiguos
      if(!merged.achievements || !merged.achievements.length) merged.achievements = defaultAchievements();
      if(!merged.dailyLog)      merged.dailyLog      = [];
      if(!merged.missions)      merged.missions      = [];
      if(!merged.items)         merged.items         = [];
      if(!merged.catCounts)     merged.catCounts     = {};
      if(!merged.dailyAssigned) merged.dailyAssigned = null;
      if(!merged.weeklyAssigned) merged.weeklyAssigned = null;
      if(!merged.monthlyAssigned) merged.monthlyAssigned = null;
      if(merged.weeklyClaimed === undefined) merged.weeklyClaimed = false;
      if(merged.monthlyClaimed === undefined) merged.monthlyClaimed = false;
      if(!merged.transactions)  merged.transactions  = [];
      if(!merged.nTid)          merged.nTid          = 1;
      if(!merged.finPeriod)     merged.finPeriod     = 'day';
      // Garantizar campos de Biblioteca (agregados después del lanzamiento inicial)
      if(!merged.books)               merged.books               = [];
      if(!merged.nBid)                merged.nBid                = 1;
      if(merged.bookOfMonth === undefined) merged.bookOfMonth     = null;
      if(!merged.customCats)          merged.customCats          = {};
      if(!merged.readingLog)          merged.readingLog          = [];
      if(!merged.libAchievCompleted)  merged.libAchievCompleted  = {};
      // Migración: shopXP para usuarios existentes
      if(merged.shopXP === undefined || merged.shopXP === null){
        merged.shopXP = merged.totalXP || 0;
      }
      if(merged.xprConfig) XPR = merged.xprConfig;
      // Migración: IDs de misión sin prefijo 'm' (versiones anteriores al fix)
      // Garantiza que toggle(), delMission(), etc. siempre matcheen por string
      let missionsMigrated = false;
      merged.missions = merged.missions.map(m => {
        if(typeof m.id === 'number' || (typeof m.id === 'string' && !m.id.startsWith('m'))) {
          missionsMigrated = true;
          return Object.assign({}, m, { id: 'm' + m.id });
        }
        return m;
      });
      // Migrar también los IDs en dailyAssigned.ids si los hay
      if(missionsMigrated && merged.dailyAssigned && Array.isArray(merged.dailyAssigned.ids)) {
        merged.dailyAssigned.ids = merged.dailyAssigned.ids.map(id =>
          (typeof id === 'number' || (typeof id === 'string' && !String(id).startsWith('m')))
            ? 'm' + id : id
        );
        if(Array.isArray(merged.dailyAssigned.prevIds)) {
          merged.dailyAssigned.prevIds = merged.dailyAssigned.prevIds.map(id =>
            (typeof id === 'number' || (typeof id === 'string' && !String(id).startsWith('m')))
              ? 'm' + id : id
          );
        }
      }
      // Migrar también weeklyAssigned.id y monthlyAssigned.id (fix v16)
      const migrateId = id =>
        (id !== null && id !== undefined &&
         (typeof id === 'number' || (typeof id === 'string' && !String(id).startsWith('m'))))
          ? 'm' + id : id;
      if(merged.weeklyAssigned && merged.weeklyAssigned.id !== undefined){
        merged.weeklyAssigned = Object.assign({}, merged.weeklyAssigned, { id: migrateId(merged.weeklyAssigned.id) });
      }
      if(merged.monthlyAssigned && merged.monthlyAssigned.id !== undefined){
        merged.monthlyAssigned = Object.assign({}, merged.monthlyAssigned, { id: migrateId(merged.monthlyAssigned.id) });
      }
      return merged;
    }
  } catch(e){ console.warn('Error loading state:', e); }
  return defaultState();
}

function defaultAchievements(){
  return [
    { id:'a1', ico:'🌅', name:'Primer Paso',  desc:'Completa tu primera misión',           type:'totalComp', target:1   },
    { id:'a2', ico:'🔥', name:'Racha de 3',   desc:'Mantén 3 días consecutivos',           type:'streak',    target:3   },
    { id:'a3', ico:'⚡',  name:'Racha de 7',   desc:'7 días sin fallar',                    type:'streak',    target:7   },
    { id:'a4', ico:'💯', name:'Centurión',    desc:'Alcanza 100 misiones completadas',     type:'totalComp', target:100 },
    { id:'a5', ico:'🏆', name:'Elite S',      desc:'Sube al nivel 35',                     type:'level',     target:35  },
    { id:'a6', ico:'💎', name:'Veterano',     desc:'Acumula 500 XP en total',              type:'totalXP',   target:500 },
    { id:'a7', ico:'🎯', name:'Especialista', desc:'Domina una categoría con 20 misiones', type:'catMax',    target:20  },
    { id:'a8', ico:'🛒', name:'Primer Canje', desc:'Canjea tu primer objeto en la tienda', type:'redeem',    target:1   },
  ];
}

function defaultState(){
  return {
    name:'CAZADOR', lvl:1, totalXP:0, curXP:0, nextXP:100,
    streak:0, totalComp:0, todayXP:0, lastDate:'', claimed:false,
    missions:[], items:[], nMid:100, nIid:100, resetHour:0,
    catCounts:{}, dailyAssigned:null, xprConfig:{...XPR},
    dailyLog:[],
    achievements: defaultAchievements(),
    shopPeriod:    'day',
    profilePeriod: 'week',
    activeTab:     'missions',
    transactions:  [],
    nTid:          1,
    finPeriod:     'day',
    minBalance:    0,
    shopXP:        0,
    weeklyAssigned:  null,
    monthlyAssigned: null,
    weeklyClaimed:   false,
    monthlyClaimed:  false,
    // ── Biblioteca ──────────────────────────────────────────────────────
    books:            [],
    nBid:             1,
    bookOfMonth:      null,
    customCats:       {},
    readingLog:       [],
    libAchievements:  [],   // inicializado en renderBiblioteca() con libDefaultAchievements()
    libAchievCompleted: {},
  };
}

function save(){
  if(!currentUser) return;
  S.xprConfig  = {...XPR};
  S.lastSyncTs = Date.now();  // timestamp para que gistSilentPull detecte datos nuevos
  try {
    localStorage.setItem(getUserKey(currentUser), JSON.stringify(S));
    const ind = document.getElementById('saveIndicator');
    if(ind){
      ind.style.opacity = '1';
      clearTimeout(ind._t);
      ind._t = setTimeout(() => { ind.style.opacity = '0'; }, 1500);
    }
    // §02-B: push a Gist en segundo plano (no bloquea, falla silenciosamente)
    if(gistGetCfg()?.token) gistPush();
  } catch(e){ notif('⚠ ERROR AL GUARDAR — ALMACENAMIENTO LLENO'); }
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §02-C — GIST LIVE SYNC                                                 ║
// ║  Dos mecanismos complementarios para mantener PC y móvil al día         ║
// ║  sin recargar la página:                                                 ║
// ║                                                                          ║
// ║  A) Pull periódico (cada SYNC_INTERVAL ms) — corre mientras la app      ║
// ║     está abierta. Solo actúa si el Gist tiene datos más nuevos que      ║
// ║     el último pull conocido (compara S.lastSyncTs).                     ║
// ║                                                                          ║
// ║  B) Pull al volver a la pestaña (visibilitychange) — dispara cuando     ║
// ║     el usuario regresa a la app desde otra pestaña o app del cel.       ║
// ║     Respeta un cooldown (SYNC_COOLDOWN) para no saturar la API.        ║
// ║                                                                          ║
// ║  Ambos son silenciosos: no bloquean la UI, no muestran loading,         ║
// ║  solo renderizan si llegaron datos realmente distintos.                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const SYNC_INTERVAL =     20 * 1000;  // A) pull periódico cada 20 segundos (uso simultáneo PC + cel)
const SYNC_COOLDOWN =      5 * 1000;  // B) mínimo entre pulls por visibilidad

let _syncTimer      = null;   // handle del setInterval periódico
let _lastSyncAt     = 0;      // timestamp del último pull completado (ms)
let _syncRunning    = false;  // mutex — evita pulls simultáneos

// ── mergeStates ───────────────────────────────────────────────────────────
// Fusión inteligente entre estado local (A) y remoto (B).
// Reglas:
//   · Arrays con objetos que tengan .id → union por id, campo a campo
//     el más reciente (por .updatedAt o .ts) prevalece.
//     Si un id existe solo en uno de los dos, se agrega automáticamente.
//   · Números acumulativos (xp, contadores) → el mayor valor gana.
//   · Strings de fecha ISO / lastDate → el lexicográficamente mayor (más reciente).
//   · Booleanos de "ya hecho" (claimed, weeklyClaimed, etc.) → OR (true gana).
//   · Objetos planos (catCounts, customCats, libAchievCompleted) → merge campo a campo.
//   · Escalares de configuración (lvl, curXP, nextXP, streak…) → el del estado
//     con mayor lastSyncTs gana (es el más reciente en esos campos).
//   · nMid, nBid, nTid (contadores de ID) → el mayor para no reutilizar IDs.
function mergeStates(local, remote) {
  // Si uno de los dos no existe, devolver el que sí existe
  if (!local)  return remote;
  if (!remote) return local;

  const localTs  = local.lastSyncTs  || 0;
  const remoteTs = remote.lastSyncTs || 0;
  // "winner" = el estado con timestamp más alto (para escalares de contexto)
  const winner = remoteTs >= localTs ? remote : local;
  const loser  = remoteTs >= localTs ? local  : remote;

  // ── Helper: merge de array por id ─────────────────────────────────────
  function mergeById(arrA, arrB, tsKey = 'updatedAt') {
    const map = new Map();
    // Insertar todos de A
    (arrA || []).forEach(item => map.set(String(item.id), item));
    // Fusionar con B
    (arrB || []).forEach(itemB => {
      const key = String(itemB.id);
      if (!map.has(key)) {
        map.set(key, itemB);                       // nuevo en B → agregar
      } else {
        const itemA = map.get(key);
        const tsA = itemA[tsKey] || itemA.ts || 0;
        const tsB = itemB[tsKey] || itemB.ts || 0;
        // El más reciente prevalece; si no hay timestamp, ganador por lastSyncTs
        map.set(key, tsB >= tsA ? itemB : itemA);
      }
    });
    return Array.from(map.values());
  }

  // ── Helper: merge de objeto plano (suma numérica / union de strings) ──
  function mergeObj(objA, objB) {
    const result = Object.assign({}, objA || {});
    Object.entries(objB || {}).forEach(([k, v]) => {
      if (!(k in result)) {
        result[k] = v;
      } else if (typeof v === 'number' && typeof result[k] === 'number') {
        result[k] = Math.max(result[k], v);
      } else if (typeof v === 'boolean') {
        result[k] = result[k] || v;
      } else {
        // string / null: preferir el del ganador
        result[k] = (remoteTs >= localTs) ? v : result[k];
      }
    });
    return result;
  }

  // ── Helper: merge de array de logros por id ────────────────────────────
  // Los logros tienen .completed (bool) y no .updatedAt; OR en completed.
  function mergeAchievements(arrA, arrB) {
    const map = new Map();
    (arrA || []).forEach(a => map.set(a.id, { ...a }));
    (arrB || []).forEach(b => {
      if (!map.has(b.id)) {
        map.set(b.id, { ...b });
      } else {
        const a = map.get(b.id);
        map.set(b.id, {
          ...a,
          completed: a.completed || b.completed,   // una vez logrado, siempre logrado
          completedAt: a.completedAt || b.completedAt,
        });
      }
    });
    return Array.from(map.values());
  }

  // ── Construir estado fusionado ─────────────────────────────────────────
  const merged = {
    // Identidad del usuario (del ganador)
    name:          winner.name,
    xprConfig:     winner.xprConfig,

    // Niveles y XP: siempre el mayor (no se puede "desnivelarse")
    lvl:           Math.max(local.lvl      || 1,   remote.lvl      || 1),
    totalXP:       Math.max(local.totalXP  || 0,   remote.totalXP  || 0),
    shopXP:        Math.max(local.shopXP   || 0,   remote.shopXP   || 0),
    curXP:         winner.curXP,
    nextXP:        winner.nextXP,

    // Racha y fecha de reset: del ganador (depende del flujo de tiempo)
    streak:        Math.max(local.streak   || 0,   remote.streak   || 0),
    totalComp:     Math.max(local.totalComp|| 0,   remote.totalComp|| 0),
    todayXP:       Math.max(local.todayXP  || 0,   remote.todayXP  || 0),
    lastDate:      local.lastDate > remote.lastDate ? local.lastDate : remote.lastDate,
    resetHour:     winner.resetHour,

    // Flags booleanos de "ya se reclamó": OR (true gana sobre false)
    claimed:         (local.claimed        || remote.claimed        || false),
    weeklyClaimed:   (local.weeklyClaimed  || remote.weeklyClaimed  || false),
    monthlyClaimed:  (local.monthlyClaimed || remote.monthlyClaimed || false),

    // Contadores de ID: el mayor para no reutilizar IDs entre dispositivos
    nMid: Math.max(local.nMid || 100, remote.nMid || 100),
    nIid: Math.max(local.nIid || 100, remote.nIid || 100),
    nTid: Math.max(local.nTid || 1,   remote.nTid || 1),
    nBid: Math.max(local.nBid || 1,   remote.nBid || 1),

    // Arrays de entidades: merge por ID (crea los que faltan, actualiza los comunes)
    missions:     mergeById(local.missions,     remote.missions),
    items:        mergeById(local.items,        remote.items),
    transactions: mergeById(local.transactions, remote.transactions),
    books:        mergeById(local.books,        remote.books),
    dailyLog:     mergeById(local.dailyLog,     remote.dailyLog, 'date'),
    readingLog:   mergeById(local.readingLog,   remote.readingLog, 'date'),

    // Logros: OR en completed
    achievements: mergeAchievements(local.achievements, remote.achievements),

    // Objetos planos: merge campo a campo
    catCounts:          mergeObj(local.catCounts,          remote.catCounts),
    customCats:         mergeObj(local.customCats,         remote.customCats),
    libAchievCompleted: mergeObj(local.libAchievCompleted, remote.libAchievCompleted),

    // Asignaciones periódicas: del ganador
    dailyAssigned:   winner.dailyAssigned,
    weeklyAssigned:  winner.weeklyAssigned,
    monthlyAssigned: winner.monthlyAssigned,

    // Preferencias de UI: del ganador
    activeTab:     winner.activeTab,
    shopPeriod:    winner.shopPeriod,
    profilePeriod: winner.profilePeriod,
    finPeriod:     winner.finPeriod,
    minBalance:    winner.minBalance,

    // Biblioteca
    bookOfMonth:   winner.bookOfMonth,
    libAchievements: mergeAchievements(local.libAchievements || [], remote.libAchievements || []),

    // Timestamp: el mayor (para que el próximo pull sepa quién es más nuevo)
    lastSyncTs: Math.max(localTs, remoteTs),
  };

  return merged;
}

// ── gistSilentPull ────────────────────────────────────────────────────────
// Pull silencioso: descarga el Gist, fusiona con mergeStates() y solo
// renderiza si el resultado es diferente al estado actual.
// Nunca borra datos — siempre combina: si un dispositivo tiene algo que
// el otro no tiene, automáticamente se crea en ambos al sincronizar.
async function gistSilentPull(){
  if(_syncRunning)            return;  // ya hay un pull en curso
  if(!currentUser || !S)     return;  // sin sesión activa
  if(!gistGetCfg()?.token)   return;  // Gist no configurado

  _syncRunning = true;
  try {
    const cfg = gistGetCfg();
    const r = await fetch('https://api.github.com/gists/' + cfg.gistId,
      { headers: { 'Authorization': 'token ' + cfg.token } });
    if(!r.ok){ _syncRunning = false; return; }

    const data = await r.json();
    const file = data.files?.[gistFileName(currentUser)];
    if(!file?.content){ _syncRunning = false; return; }

    let remote;
    try { remote = JSON.parse(file.content); } catch(e){ _syncRunning = false; return; }

    const remoteTs = remote?.lastSyncTs || 0;
    const localTs  = S?.lastSyncTs      || 0;

    // Solo procesar si el remoto tiene algo diferente (evita trabajo innecesario)
    if(remoteTs !== localTs){
      // ── Fusión inteligente: nunca se pierde nada ──────────────────────
      const merged = mergeStates(S, remote);
      S = merged;
      XPR = S.xprConfig || {D:15,C:30,B:50,A:80,S:120};

      // Guardar el estado fusionado localmente Y subirlo al Gist
      // para que el otro dispositivo también reciba el merge completo
      S.lastSyncTs = Date.now();
      localStorage.setItem(getUserKey(currentUser), JSON.stringify(S));
      gistPush();  // sube el merge para que el otro dispositivo lo reciba

      render();
      notif('☁ SYNC — DATOS COMBINADOS');
    }
    _lastSyncAt = Date.now();
  } catch(e){ /* sin internet — silencioso */ }
  _syncRunning = false;
}

// ── syncStart / syncStop ──────────────────────────────────────────────────
// Llamados desde bootSession (start) y doLogout (stop).
function syncStart(){
  syncStop();  // limpiar intervalo previo si existía
  if(!gistGetCfg()?.token) return;  // no iniciar si Gist no está configurado

  // A) Pull periódico
  _syncTimer = setInterval(gistSilentPull, SYNC_INTERVAL);

  // B) Pull al volver a la pestaña
  document.addEventListener('visibilitychange', _onVisibility);
}

function syncStop(){
  if(_syncTimer){ clearInterval(_syncTimer); _syncTimer = null; }
  document.removeEventListener('visibilitychange', _onVisibility);
}

function _onVisibility(){
  if(document.visibilityState !== 'visible') return;
  const now = Date.now();
  if(now - _lastSyncAt < SYNC_COOLDOWN) return;  // respetar cooldown
  gistSilentPull();
}
