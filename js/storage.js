// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §02 — MULTI-USER STORAGE                                               ║
// ║  Dependencias: constants.js (XPR, S, currentUser)                      ║
// ║  Consumido por: todos los módulos (todos llaman save()/load())          ║
// ╚══════════════════════════════════════════════════════════════════════════╝

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
      if(!merged.weeklyDaysChecked) merged.weeklyDaysChecked = [];
      if(!merged.monthlyAssigned) merged.monthlyAssigned = null;
      if(merged.weeklyClaimed === undefined) merged.weeklyClaimed = false;
      if(merged.monthlyClaimed === undefined) merged.monthlyClaimed = false;
      // Migración: campos del sistema quincenal (v31)
      if(!merged.quincenalAssigned) merged.quincenalAssigned = null;
      if(!merged.quincenalHistory)  merged.quincenalHistory  = {};
      if(!merged.quincenalClaimed)  merged.quincenalClaimed  = {};
      if(!merged.transactions)  merged.transactions  = [];
      if(!merged.nTid)          merged.nTid          = 1;
      if(!merged.finPeriod)     merged.finPeriod     = 'day';
      // Garantizar contadores de ID para misiones e ítems (saves muy antiguos)
      if(!merged.nMid || merged.nMid < 100) merged.nMid = Math.max(100,
        merged.missions.reduce((mx,m)=>{ const n=parseInt((m.id||'').slice(1)); return n>mx?n:mx; }, 99) + 1);
      if(!merged.nIid || merged.nIid < 100) merged.nIid = Math.max(100,
        merged.items.reduce((mx,it)=>{ const n=parseInt((it.id||'').slice(1)); return n>mx?n:mx; }, 99) + 1);
      // Garantizar campos de Biblioteca (agregados después del lanzamiento inicial)
      if(!merged.books)               merged.books               = [];
      if(!merged.nBid)                merged.nBid                = 1;
      if(merged.bookOfMonth === undefined) merged.bookOfMonth     = null;
      if(!merged.customCats)          merged.customCats          = {};
      if(!merged.catOverrides)        merged.catOverrides        = {};
      if(!merged.readingLog)          merged.readingLog          = [];
      if(!merged.libAchievCompleted)  merged.libAchievCompleted  = {};
      // FIX-BUG-CLAIM: migración — garantizar campo claimedDate en saves antiguos.
      // Si el save tenía claimed=true pero no claimedDate, asumir que fue hoy
      // para no mostrar el botón de reclamar falsamente disponible.
      if(merged.claimedDate === undefined || merged.claimedDate === null){
        merged.claimedDate = merged.claimed ? (merged.lastDate || '') : '';
      }
      // Migración: shopXP para usuarios existentes
      if(merged.shopXP === undefined || merged.shopXP === null){
        merged.shopXP = merged.totalXP || 0;
      }
      if(merged.xprConfig) XPR = merged.xprConfig;
      // Migración: asignar updatedAt=0 a misiones e items que no lo tengan
      // (creados con versiones antiguas o importados desde plantillas).
      // Con updatedAt=0, checkReset() los trata como anteriores al día de reset
      // y aplica done=false correctamente sin protegerlos del ciclo diario.
      merged.missions.forEach(m => { if(m.updatedAt === undefined) m.updatedAt = 0; });
      merged.items.forEach(it => { if(it.updatedAt === undefined) it.updatedAt = 0; });
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
    { id:'l01', ico:'🌅', name:'Primer Amanecer', desc:'Completa tu primer día de misiones', type:'streak', target:1 },
    { id:'l02', ico:'🔥', name:'Llama Encendida', desc:'3 días consecutivos sin rendirte', type:'streak', target:3 },
    { id:'l03', ico:'⚡', name:'Semana Activa', desc:'7 días seguidos completando tus misiones', type:'streak', target:7 },
    { id:'l04', ico:'🌊', name:'Flujo Continuo', desc:'14 días de racha — dos semanas perfectas', type:'streak', target:14 },
    { id:'l05', ico:'🌙', name:'Mes de Hierro', desc:'30 días consecutivos. La disciplina es un arte', type:'streak', target:30 },
    { id:'l06', ico:'💫', name:'Cazador Constante', desc:'45 días sin fallar. Eres imparable', type:'streak', target:45 },
    { id:'l07', ico:'🌟', name:'Dos Meses de Fuego', desc:'60 días seguidos. El hábito ya es parte de ti', type:'streak', target:60 },
    { id:'l08', ico:'🦅', name:'Velocidad de Crucero', desc:'75 días de racha. Vuelas a tu propio ritmo', type:'streak', target:75 },
    { id:'l09', ico:'💎', name:'Centinela', desc:'90 días sin parar. Tres meses de leyenda', type:'streak', target:90 },
    { id:'l10', ico:'🔱', name:'120 Días de Gloria', desc:'Cuatro meses de racha pura', type:'streak', target:120 },
    { id:'l11', ico:'👑', name:'Medio Año de Élite', desc:'180 días. Eres una fuerza de la naturaleza', type:'streak', target:180 },
    { id:'l12', ico:'🌌', name:'Eterno', desc:'365 días seguidos. Un año entero de constancia', type:'streak', target:365 },
    { id:'l13', ico:'🏹', name:'21 Días', desc:'21 días — dicen que el hábito ya está formado', type:'streak', target:21 },
    { id:'l14', ico:'🗡️', name:'Dos Semanas Brutas', desc:'14 días de puro trabajo sin excusas', type:'streak', target:14 },
    { id:'l15', ico:'🧱', name:'Muro de Piedra', desc:'50 días de racha. No hay nada que te detenga', type:'streak', target:50 },
    { id:'l16', ico:'⚔️', name:'Guerrero Sempiterno', desc:'150 días de racha. Tu voluntad es acero', type:'streak', target:150 },
    { id:'l17', ico:'🔮', name:'Tercer Trimestre', desc:'270 días sin fallar. La cima está cerca', type:'streak', target:270 },
    { id:'l18', ico:'🌱', name:'Primer Paso', desc:'Completa tu primera misión', type:'totalComp', target:1 },
    { id:'l19', ico:'🌿', name:'Primeros 10', desc:'10 misiones completadas. El viaje comienza', type:'totalComp', target:10 },
    { id:'l20', ico:'🌾', name:'Primeros 25', desc:'25 misiones. Ya tienes ritmo', type:'totalComp', target:25 },
    { id:'l21', ico:'🏅', name:'50 Logros', desc:'50 misiones completadas. La mitad del camino', type:'totalComp', target:50 },
    { id:'l22', ico:'💯', name:'Centurión', desc:'100 misiones. Cien victorias sobre ti mismo', type:'totalComp', target:100 },
    { id:'l23', ico:'🎯', name:'150 Misiones', desc:'150 completadas. Tu determinación es real', type:'totalComp', target:150 },
    { id:'l24', ico:'🏆', name:'200 Misiones', desc:'200 completadas. Doscientas veces que dijiste sí', type:'totalComp', target:200 },
    { id:'l25', ico:'🌠', name:'300 Misiones', desc:'Trescientas victorias acumuladas', type:'totalComp', target:300 },
    { id:'l26', ico:'💥', name:'500 Misiones', desc:'Quinientas misiones. Eres una máquina', type:'totalComp', target:500 },
    { id:'l27', ico:'🌀', name:'750 Misiones', desc:'750 completadas. Tu trabajo habla solo', type:'totalComp', target:750 },
    { id:'l28', ico:'🔥', name:'Mil Batallas', desc:'1000 misiones. Mil veces que no te rendiste', type:'totalComp', target:1000 },
    { id:'l29', ico:'⚡', name:'1500 Misiones', desc:'1500 completadas. Eres pura constancia', type:'totalComp', target:1500 },
    { id:'l30', ico:'🌊', name:'2000 Misiones', desc:'2000 misiones. Una historia de esfuerzo', type:'totalComp', target:2000 },
    { id:'l31', ico:'🦁', name:'75 Misiones', desc:'75 misiones completadas sin rendirte', type:'totalComp', target:75 },
    { id:'l32', ico:'🐉', name:'250 Misiones', desc:'250 completadas. La media de los grandes', type:'totalComp', target:250 },
    { id:'l33', ico:'🌋', name:'400 Misiones', desc:'400 victorias. Tu energía no tiene techo', type:'totalComp', target:400 },
    { id:'l34', ico:'🏔️', name:'600 Misiones', desc:'600 misiones. Cada una cuenta', type:'totalComp', target:600 },
    { id:'l35', ico:'🗻', name:'850 Misiones', desc:'850 completadas. Muy cerca del millar', type:'totalComp', target:850 },
    { id:'l36', ico:'🌍', name:'1200 Misiones', desc:'1200 misiones. Un mundo entero de esfuerzo', type:'totalComp', target:1200 },
    { id:'l37', ico:'🌏', name:'1750 Misiones', desc:'1750 completadas. Eres leyenda viva', type:'totalComp', target:1750 },
    { id:'l38', ico:'⭐', name:'35 Misiones', desc:'35 misiones. El impulso inicial está ganado', type:'totalComp', target:35 },
    { id:'l39', ico:'🎖️', name:'125 Misiones', desc:'125 completadas — más de un centenar', type:'totalComp', target:125 },
    { id:'l40', ico:'🌱', name:'Rango D', desc:'Alcanza el nivel 5', type:'level', target:5 },
    { id:'l41', ico:'🌿', name:'Aprendiz', desc:'Nivel 10 alcanzado. El camino empieza a verse', type:'level', target:10 },
    { id:'l42', ico:'⚔️', name:'Rango C', desc:'Nivel 15. Estás dejando de ser novato', type:'level', target:15 },
    { id:'l43', ico:'🛡️', name:'Soldado', desc:'Nivel 20. Respeto ganado en el campo', type:'level', target:20 },
    { id:'l44', ico:'🏹', name:'Rango B', desc:'Nivel 25. Mitad del camino al élite', type:'level', target:25 },
    { id:'l45', ico:'💠', name:'Veterano', desc:'Nivel 30. Tu experiencia ya no se cuestiona', type:'level', target:30 },
    { id:'l46', ico:'🏆', name:'Rango A — Elite', desc:'Nivel 35. Pocos llegan aquí', type:'level', target:35 },
    { id:'l47', ico:'⚡', name:'Maestro', desc:'Nivel 40. La élite te reconoce', type:'level', target:40 },
    { id:'l48', ico:'🔥', name:'Rango S', desc:'Nivel 50. La cima del sistema', type:'level', target:50 },
    { id:'l49', ico:'💎', name:'Legendario', desc:'Nivel 60. Más allá del rango S', type:'level', target:60 },
    { id:'l50', ico:'👑', name:'Supremo', desc:'Nivel 75. Los dioses te miran', type:'level', target:75 },
    { id:'l51', ico:'🌌', name:'Inmortal', desc:'Nivel 100. La centuria del poder', type:'level', target:100 },
    { id:'l52', ico:'🌠', name:'Semidiós', desc:'Nivel 120. Tu legado está escrito', type:'level', target:120 },
    { id:'l53', ico:'🔱', name:'Ascendido', desc:'Nivel 150. La trascendencia es tuya', type:'level', target:150 },
    { id:'l54', ico:'🌀', name:'Nivel 8', desc:'Nivel 8 alcanzado. Ya tienes ritmo de juego', type:'level', target:8 },
    { id:'l55', ico:'🗡️', name:'Nivel 12', desc:'Nivel 12. Sabés lo que hacés', type:'level', target:12 },
    { id:'l56', ico:'🌊', name:'Nivel 18', desc:'Nivel 18. Un paso antes del rango B', type:'level', target:18 },
    { id:'l57', ico:'🦅', name:'Nivel 45', desc:'Nivel 45. Casi en la cima del sistema', type:'level', target:45 },
    { id:'l58', ico:'🐉', name:'Nivel 80', desc:'Nivel 80. Tu historia ya inspira a otros', type:'level', target:80 },
    { id:'l59', ico:'🌋', name:'Nivel 200', desc:'Nivel 200. Una cifra que pocos soñarían', type:'level', target:200 },
    { id:'l60', ico:'✨', name:'Primeros 100 XP', desc:'100 XP acumulados. El motor arrancó', type:'totalXP', target:100 },
    { id:'l61', ico:'💫', name:'500 XP', desc:'500 XP en total. Ya tienes masa crítica', type:'totalXP', target:500 },
    { id:'l62', ico:'⚡', name:'1000 XP', desc:'1000 XP. El primer millar es el más difícil', type:'totalXP', target:1000 },
    { id:'l63', ico:'🔥', name:'2000 XP', desc:'2000 XP acumulados. Tu progreso es sólido', type:'totalXP', target:2000 },
    { id:'l64', ico:'💎', name:'3500 XP', desc:'3500 XP. Cada misión sumó su grano de arena', type:'totalXP', target:3500 },
    { id:'l65', ico:'🏆', name:'5000 XP', desc:'5000 XP. Cinco mil razones para seguir', type:'totalXP', target:5000 },
    { id:'l66', ico:'🌟', name:'7500 XP', desc:'7500 XP acumulados. La constancia da frutos', type:'totalXP', target:7500 },
    { id:'l67', ico:'👑', name:'10.000 XP', desc:'Diez mil XP. Un hito que pocos alcanzan', type:'totalXP', target:10000 },
    { id:'l68', ico:'🌌', name:'15.000 XP', desc:'15k XP. Tu disciplina tiene nombre propio', type:'totalXP', target:15000 },
    { id:'l69', ico:'🔮', name:'20.000 XP', desc:'20k XP. Veinte mil victorias invisibles', type:'totalXP', target:20000 },
    { id:'l70', ico:'🌊', name:'30.000 XP', desc:'30k XP. Un océano de esfuerzo acumulado', type:'totalXP', target:30000 },
    { id:'l71', ico:'🌋', name:'50.000 XP', desc:'50k XP. La montaña más alta conquistada', type:'totalXP', target:50000 },
    { id:'l72', ico:'🌍', name:'75.000 XP', desc:'75k XP. Tu trabajo ya cambió tu mundo', type:'totalXP', target:75000 },
    { id:'l73', ico:'🌏', name:'100.000 XP', desc:'100k XP. Cien mil razones para ser orgulloso', type:'totalXP', target:100000 },
    { id:'l74', ico:'✨', name:'250 XP', desc:'250 XP acumulados. El ritmo está tomado', type:'totalXP', target:250 },
    { id:'l75', ico:'💠', name:'750 XP', desc:'750 XP. Ya eres más que un principiante', type:'totalXP', target:750 },
    { id:'l76', ico:'🎯', name:'1500 XP', desc:'1500 XP acumulados. El impulso no para', type:'totalXP', target:1500 },
    { id:'l77', ico:'🏅', name:'4000 XP', desc:'4000 XP. Cuatro mil unidades de disciplina', type:'totalXP', target:4000 },
    { id:'l78', ico:'🦁', name:'6000 XP', desc:'6000 XP. Tu progreso asusta al promedio', type:'totalXP', target:6000 },
    { id:'l79', ico:'🐉', name:'25.000 XP', desc:'25k XP. Un cuarto de siglo en experiencia', type:'totalXP', target:25000 },
    { id:'l80', ico:'💪', name:'Especialista Nv.1', desc:'10 misiones en una sola categoría', type:'catMax', target:10 },
    { id:'l81', ico:'🎯', name:'Especialista Nv.2', desc:'25 misiones dominando una categoría', type:'catMax', target:25 },
    { id:'l82', ico:'🏹', name:'Maestro de Categoría', desc:'50 misiones en tu categoría fuerte', type:'catMax', target:50 },
    { id:'l83', ico:'⚔️', name:'Gran Maestro', desc:'100 misiones en una categoría. Eres el mejor', type:'catMax', target:100 },
    { id:'l84', ico:'🔱', name:'Campeón de Área', desc:'150 misiones en una sola categoría', type:'catMax', target:150 },
    { id:'l85', ico:'👑', name:'Leyenda de Área', desc:'200 misiones en tu especialidad', type:'catMax', target:200 },
    { id:'l86', ico:'🌟', name:'Inigualable', desc:'300 misiones en una categoría. Sin rival', type:'catMax', target:300 },
    { id:'l87', ico:'🔥', name:'5 en Categoría', desc:'Primeras 5 misiones de una categoría', type:'catMax', target:5 },
    { id:'l88', ico:'💎', name:'15 en Categoría', desc:'15 misiones en tu área favorita', type:'catMax', target:15 },
    { id:'l89', ico:'🌊', name:'35 en Categoría', desc:'35 misiones. La categoría es tu terreno', type:'catMax', target:35 },
    { id:'l90', ico:'🌌', name:'75 en Categoría', desc:'75 misiones en una área. Profundidad real', type:'catMax', target:75 },
    { id:'l91', ico:'🌋', name:'500 en Categoría', desc:'500 misiones en una categoría. Incomparable', type:'catMax', target:500 },
    { id:'l92', ico:'🌍', name:'250 en Categoría', desc:'250 misiones en tu especialidad', type:'catMax', target:250 },
    { id:'l93', ico:'🛒', name:'Primer Canje', desc:'Tu primera recompensa canjeada en la tienda', type:'redeem', target:1 },
    { id:'l94', ico:'🛍️', name:'Comprador Frecuente', desc:'5 objetos canjeados. Te lo mereces', type:'redeem', target:5 },
    { id:'l95', ico:'💳', name:'Cliente VIP', desc:'10 canjes. La tienda ya te conoce', type:'redeem', target:10 },
    { id:'l96', ico:'🏪', name:'Coleccionista', desc:'25 objetos canjeados en total', type:'redeem', target:25 },
    { id:'l97', ico:'📖', name:'Primer Libro Leído', desc:'Terminaste tu primer libro registrado', type:'custom', target:1 },
    { id:'l98', ico:'🗓️', name:'Mes Perfecto', desc:'Completaste todas las misiones fijas en un mes', type:'custom', target:1 },
    { id:'l99', ico:'🏋️', name:'Cuerpo Transformado', desc:'Notaste un cambio físico real por tus hábitos', type:'custom', target:1 },
    { id:'l100', ico:'🧘', name:'Mente en Paz', desc:'Mantuviste tus hábitos mentales una semana entera', type:'custom', target:1 },
  ];
}

function defaultState(){
  return {
    name:'CAZADOR', lvl:1, totalXP:0, curXP:0, nextXP:100,
    streak:0, totalComp:0, todayXP:0, lastDate:'', claimed:false, claimedDate:'',
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
    weeklyDaysChecked: [],  // array de fechas ISO completadas (7 = misión rotada)
    monthlyAssigned: null,
    weeklyClaimed:   false,
    monthlyClaimed:  false,
    // ── Biblioteca ──────────────────────────────────────────────────────
    books:            [],
    nBid:             1,
    bookOfMonth:      null,
    customCats:       {},
    catOverrides:     {},
    readingLog:       [],
    libAchievements:  [],   // inicializado en renderBiblioteca() con libDefaultAchievements()
    libAchievCompleted: {},
    // ── Sistema Quincenal (v31) ─────────────────────────────────────────────
    // Reemplaza el sistema de 1 misión mensual por 22 misiones divididas en
    // 2 quincenas (Q1: días 1-15, Q2: días 16-fin). Cada quincena asigna 11.
    quincenalAssigned: null,   // { key: '2026_M05_Q1', ids: ['m1',...] }
    quincenalHistory:  {},     // { '2026_M05_Q1': { ids, completed, xpEarned } }
    quincenalClaimed:  {},     // { '2026_M05_Q1': true }
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
  } catch(e){ notif('⚠ ERROR AL GUARDAR — ALMACENAMIENTO LLENO'); }
}
