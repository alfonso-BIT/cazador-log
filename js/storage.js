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

// Pull: baja Gist → localStorage y retorna true si encontró datos
async function gistPull(){
  const cfg = gistGetCfg();
  if(!cfg?.token || !cfg?.gistId || !currentUser) return false;
  try {
    const r = await fetch('https://api.github.com/gists/' + cfg.gistId,
      { headers: { 'Authorization': 'token ' + cfg.token } });
    if(!r.ok) return false;
    const data = await r.json();
    const file = data.files?.[gistFileName(currentUser)];
    if(file?.content){ localStorage.setItem(getUserKey(currentUser), file.content); return true; }
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
  S.xprConfig = {...XPR};
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
