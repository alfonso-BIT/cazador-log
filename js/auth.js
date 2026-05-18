// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §03 — LOGIN / LOGOUT                                                   ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Controla acceso multi-usuario. El nombre de usuario ES      ║
// ║  la clave de datos (sin contraseña real).                               ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · bootSession(u, fromLogin?)       ← RUTA ÚNICA DE ARRANQUE           ║
// ║       Llamada por doLogin() y por ui-init.js al arrancar.              ║
// ║       1. Asigna currentUser, carga S desde localStorage.               ║
// ║       2. Llama restoreSessionUI() → checkReset() → render().           ║
// ║       3. Si fromLogin: oculta #loginOver, muestra notif bienvenida.    ║
// ║                                                                          ║
// ║   · doLogin()                                                            ║
// ║       Lee #loginUser.value y delega en bootSession(u, true).           ║
// ║                                                                          ║
// ║   · doLogout()                                                           ║
// ║       Borra currentUser, S y 'sl_current_user'. Muestra #loginOver.   ║
// ║                                                                          ║
// ║  HTML relacionado:                                                       ║
// ║   · #loginOver  — overlay full-screen de login                          ║
// ║   · #loginUser  — input de nombre de usuario                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
// LOGIN / LOGOUT
// ═══════════════════════════════════════════════════════
// ── bootSession ───────────────────────────────────────────────────────────
// Ruta compartida de arranque de sesión (auto-login al cargar + doLogin).
function bootSession(u, fromLogin = false){
  currentUser = u;
  localStorage.setItem('sl_current_user', u);
  S   = loadState(u);
  XPR = S.xprConfig || {D:15,C:30,B:50,A:80,S:120};
  finOffset = 0;

  // ── Inicializar nombre si es usuario nuevo ────────────────────────────
  if(!S.name || S.name === 'CAZADOR'){
    S.name = u.toUpperCase();
    save();
  }

  if(fromLogin){
    document.getElementById('loginOver').classList.remove('show');
  }
  restoreSessionUI();
  checkReset();
  render();
  if(S.activeTab && S.activeTab !== 'missions') switchTab(S.activeTab);

  if(fromLogin){
    notif('▸ BIENVENIDO, ' + u.toUpperCase() + ' ◂');
    if(!S.missions || S.missions.length === 0) setTimeout(openTplModal, 400);
  }
}

function doLogin(){
  const raw = document.getElementById('loginUser').value.trim();
  if(!raw){ notif('▸ INGRESA UN NOMBRE DE USUARIO'); return; }
  // FIX-QA-05: sanitizar para evitar claves de localStorage inesperadas.
  // Solo letras, números, guión y guión bajo. Máximo 32 caracteres.
  const u = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  if(!u){ notif('▸ NOMBRE INVÁLIDO — USA LETRAS, NÚMEROS, - O _'); return; }
  if(u !== raw) notif('▸ NOMBRE AJUSTADO A: ' + u.toUpperCase());
  bootSession(u, true);
}

function doLogout(){
  currentUser = null;
  S = null;
  localStorage.removeItem('sl_current_user');
  // FIX-BUG-AVATARCAT: resetear flags de avatar para que el próximo login
  // inicialice la clase silenciosamente en el primer render.
  if(typeof _avatarCatInitialized !== 'undefined') _avatarCatInitialized = false;
  if(typeof _lastAvatarCat       !== 'undefined') _lastAvatarCat = null;
  const loginOver = document.getElementById('loginOver');
  if(loginOver) loginOver.classList.add('show');
  const inp = document.getElementById('loginUser');
  const pass = document.getElementById('loginPass');
  if(inp) inp.value = '';
  if(pass) pass.value = '';
  setTimeout(()=>{ if(inp) inp.focus(); }, 100);
}

// ── restoreSessionUI ──────────────────────────────────────────────────────
// Sincroniza variables globales de UI y selectores de período con S.
// Llamada tanto al arranque (ui-init.js) como en doLogin() para que ambas
// rutas de entrada sean idénticas. Prerequisito: currentUser y S asignados.
function restoreSessionUI(){
  shopPeriod    = S.shopPeriod    || 'day';
  currentPeriod = S.profilePeriod || 'week';
  finPeriod     = S.finPeriod     || 'day';
  const savedFont = parseInt(localStorage.getItem(getUserKey(currentUser)+'_font'));
  if(savedFont){ currentFontSize = savedFont; setFont(savedFont); }
  applyMobileTypography(!!savedFont);
  ['day','week','month'].forEach(x=>{
    const el = document.getElementById('sp-'+x);
    if(el) el.classList.toggle('active', x===shopPeriod);
  });
  const ptW = document.getElementById('pt-week');
  const ptM = document.getElementById('pt-month');
  if(ptW) ptW.classList.toggle('active', currentPeriod==='week');
  if(ptM) ptM.classList.toggle('active', currentPeriod==='month');
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §04 — DAILY ROTATION                                                   ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Selecciona automáticamente 4 misiones diarias del banco     ║
// ║  completo, garantizando variedad de categorías y rotación equitativa.   ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · getTodayKey() → string                                              ║
// ║       Genera clave única del día considerando S.resetHour.              ║
// ║       Si hora actual < resetHour, se considera "ayer todavía".          ║
// ║       Formato: 'Thu May 01 2025_h6' (fecha + hora de reset).           ║
// ║                                                                          ║
// ║   · assignDailyMissions()                                               ║
// ║       Solo ejecuta si la clave del día cambió (evita re-asignar).      ║
// ║       Algoritmo de prioridad (TARGET = 4):                              ║
// ║         1. Misiones fixed → siempre incluidas primero                   ║
// ║         2. Una misión por cada DAILY_CAT (la menos-recientemente hecha) ║
// ║         3. Resto sin categoría (least-recently-done) hasta llegar a 4  ║
// ║         4. Si aún faltan, recicla misiones ya usadas                    ║
// ║       Helper interno pickBest(pool): ordena por lastDoneDate ascendente ║
// ║       para priorizar las que llevan más tiempo sin hacerse.             ║
// ║       Guarda resultado en S.dailyAssigned = {key, ids[]}.              ║
// ║                                                                          ║
// ║   · getDailyMissions() → array de misiones                             ║
// ║       Mapea S.dailyAssigned.ids a objetos misión reales.                ║
// ║       Filtra nulls (misiones eliminadas después de asignar).            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
// DAILY ROTATION — 4 misiones mínimas (1 por categoría principal)
// ═══════════════════════════════════════════════════════
function getTodayKey(){
  const now = new Date();
  const rh = S.resetHour||0;
  const d = new Date(now);
  if(now.getHours()<rh) d.setDate(d.getDate()-1);
  return d.toDateString()+'_h'+rh;
}

function assignDailyMissions(){
  const todayKey = getTodayKey();
  if(S.dailyAssigned && S.dailyAssigned.key === todayKey) return;

  // ── Fecha de ayer en ISO local (para excluir misiones ya usadas ayer) ──
  const todayISO = getTodayISODate();
  const yesterdayDate = new Date();
  const rh = S.resetHour || 0;
  if(new Date().getHours() < rh) yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayISO = localISO(yesterdayDate);

  // ── Utilidades ──────────────────────────────────────────────────────────

  // Shuffle Fisher-Yates para aleatoriedad real
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  // ¿Fue esta misión asignada ayer? (evitar repetición inmediata)
  function usedYesterday(m){
    return S.dailyAssigned && S.dailyAssigned.prevKey &&
           Array.isArray(S.dailyAssigned.prevIds) &&
           S.dailyAssigned.prevIds.includes(m.id);
  }

  // Selecciona una misión aleatoria del pool:
  // Prioridad 1: misiones que NO se hicieron ayer
  // Prioridad 2: misiones que no se completaron hoy (lastDoneDate !== todayISO)
  // Prioridad 3: cualquier disponible (si el pool es muy pequeño)
  function pickRandom(pool, used){
    const avail = pool.filter(m => !used.has(m.id));
    if(!avail.length) return null;
    // Excluir las de ayer si hay alternativas
    const notYesterday = avail.filter(m => !usedYesterday(m));
    const candidates = notYesterday.length ? notYesterday : avail;
    // Excluir las ya completadas hoy si hay alternativas
    const notDoneToday = candidates.filter(m => m.lastDoneDate !== todayISO);
    const final = notDoneToday.length ? notDoneToday : candidates;
    // Elegir aleatoriamente del set final
    return shuffle(final)[0];
  }

  const assigned = { key: todayKey, ids: [], prevKey: S.dailyAssigned?.key||null, prevIds: S.dailyAssigned?.ids||[] };
  const used = new Set();

  // ── Paso 1: Misiones fijas DIARIAS (siempre aparecen, hasta llenar TARGET) ──
  const TARGET = 4;
  // Solo misiones freq='daily' (o sin freq) pueden entrar al slot diario
  const isDaily = m => !m.freq || m.freq === 'daily';
  S.missions.filter(m=>m.fixed && isDaily(m)).forEach(m=>{
    if(assigned.ids.length < TARGET && !used.has(m.id)){
      assigned.ids.push(m.id);
      used.add(m.id);
    }
  });

  // ── Paso 2: Una misión aleatoria por cada DAILY_CAT ──────────────────────
  // Orden aleatorio de categorías para que no siempre aparezca en el mismo orden
  const catOrder = shuffle(DAILY_CATS.slice());
  catOrder.forEach(cat=>{
    if(assigned.ids.length >= TARGET) return;
    // No duplicar si una misión fija ya cubre esta categoría
    if(S.missions.some(m=>m.fixed && isDaily(m) && m.cat===cat && used.has(m.id))) return;
    const pool = S.missions.filter(m=>m.cat===cat && !m.fixed && isDaily(m));
    const pick = pickRandom(pool, used);
    if(pick){ assigned.ids.push(pick.id); used.add(pick.id); }
  });

  // ── Paso 3: Si faltan slots, rellenar de cualquier categoría (aleatoriamente) ──
  if(assigned.ids.length < TARGET){
    const remaining = shuffle(S.missions.filter(m=>!m.fixed && !used.has(m.id) && isDaily(m)));
    // Preferir las que no se hicieron ayer
    const notYest = remaining.filter(m=>!usedYesterday(m));
    const pool3 = notYest.length ? notYest : remaining;
    for(const m of pool3){
      if(assigned.ids.length >= TARGET) break;
      assigned.ids.push(m.id); used.add(m.id);
    }
  }

  // ── Paso 4: Último recurso — solo diarias restantes ──────────────────────
  if(assigned.ids.length < TARGET){
    for(const m of S.missions.filter(m=>!used.has(m.id) && isDaily(m))){
      if(assigned.ids.length >= TARGET) break;
      assigned.ids.push(m.id); used.add(m.id);
    }
  }

  S.dailyAssigned = assigned;
  save();
}

function getDailyMissions(){
  if(!S.dailyAssigned || !S.dailyAssigned.ids) return [];
  return S.dailyAssigned.ids.map(id=>S.missions.find(m=>m.id===id)).filter(Boolean);
}

// ═══════════════════════════════════════════════════════
// WEEKLY / MONTHLY KEYS
// ═══════════════════════════════════════════════════════
function getWeekKey(){
  const now = new Date();
  const rh = S.resetHour||0;
  const d = new Date(now);
  if(now.getHours()<rh) d.setDate(d.getDate()-1);
  // FIX-BUG-WEEKKEY: fórmula ISO correcta (nearest-Thursday method).
  // La anterior producía W00 en los primeros días de enero de algunos años
  // y no alineaba el inicio de semana con el lunes de forma consistente.
  // Esta implementación es el estándar ISO 8601 y nunca genera W00.
  const tmp = new Date(d);
  tmp.setHours(0,0,0,0);
  tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7); // shift to Thursday
  const jan4 = new Date(tmp.getFullYear(), 0, 4);
  const week = 1 + Math.round(((tmp - jan4) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7);
  return tmp.getFullYear() + '_W' + String(week).padStart(2,'0');
}

function getMonthKey(){
  const now = new Date();
  const rh = S.resetHour||0;
  const d = new Date(now);
  if(now.getHours()<rh) d.setDate(d.getDate()-1);
  return d.getFullYear() + '_M' + String(d.getMonth()+1).padStart(2,'0');
}

function assignWeeklyMission(){
  const weekKey = getWeekKey();
  const pool = S.missions.filter(m => m.freq === 'weekly');
  if(S.weeklyAssigned && S.weeklyAssigned.key === weekKey){
    // La clave ya coincide, pero verificar que el id aún existe
    const exists = pool.find(m => m.id === S.weeklyAssigned.id);
    if(exists) return; // todo bien
    S.weeklyAssigned = null; // forzar reasignación aunque la key coincida
  }
  if(!pool.length){
    console.warn('[CAZADOR] assignWeeklyMission — SIN misiones con freq=weekly');
    S.weeklyAssigned = { key: weekKey, id: null }; save(); return;
  }
  const lastId = S.weeklyAssigned?.id;
  const fresh = pool.filter(m => m.id !== lastId);
  const candidates = fresh.length ? fresh : pool;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  pool.forEach(m => { m.weeklyDone = false; });
  S.weeklyClaimed = false;
  S.weeklyAssigned = { key: weekKey, id: pick.id };
  save();
}

function assignMonthlyMission(){
  const monthKey = getMonthKey();
  const pool = S.missions.filter(m => m.freq === 'monthly');
  if(S.monthlyAssigned && S.monthlyAssigned.key === monthKey){
    const exists = pool.find(m => m.id === S.monthlyAssigned.id);
    if(exists) return;
    S.monthlyAssigned = null;
  }
  if(!pool.length){
    console.warn('[CAZADOR] assignMonthlyMission — SIN misiones con freq=monthly');
    S.monthlyAssigned = { key: monthKey, id: null }; save(); return;
  }
  const lastId = S.monthlyAssigned?.id;
  const fresh = pool.filter(m => m.id !== lastId);
  const candidates = fresh.length ? fresh : pool;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  pool.forEach(m => { m.monthlyDone = false; });
  S.monthlyClaimed = false;
  S.monthlyAssigned = { key: monthKey, id: pick.id };
  save();
}

function getWeeklyMission(){
  if(!S.weeklyAssigned || !S.weeklyAssigned.id) return null;
  const wm = S.missions.find(m => m.id === S.weeklyAssigned.id);
  if(!wm){
    // ID guardado ya no existe (migración o borrado) — forzar reasignación (fix v16)
    S.weeklyAssigned = null;
    assignWeeklyMission();
    return S.weeklyAssigned && S.weeklyAssigned.id
      ? S.missions.find(m => m.id === S.weeklyAssigned.id) || null : null;
  }
  return wm;
}

function getMonthlyMission(){
  if(!S.monthlyAssigned || !S.monthlyAssigned.id) return null;
  const mm = S.missions.find(m => m.id === S.monthlyAssigned.id);
  if(!mm){
    // ID guardado ya no existe (migración o borrado) — forzar reasignación (fix v16)
    S.monthlyAssigned = null;
    assignMonthlyMission();
    return S.monthlyAssigned && S.monthlyAssigned.id
      ? S.missions.find(m => m.id === S.monthlyAssigned.id) || null : null;
  }
  return mm;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §05 — RESET                                                            ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Maneja el ciclo diario: detecta cambio de día, actualiza   ║
// ║  racha, aplica penalización, reinicia misiones y asigna las del día.   ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · checkReset()                                                         ║
// ║       Compara S.lastDate con getTodayKey().                             ║
// ║       Si cambió (nuevo día):                                             ║
// ║         — Verifica si el día anterior fue consecutivo → streak++        ║
// ║         — Si no hubo XP ese día → streak = 0                           ║
// ║         — Si misiones incompletas y hubo actividad → muestra #penbar   ║
// ║           (auto-oculta en 10s)                                          ║
// ║         — Resetea: m.done=false en todas, todayXP=0, claimed=false     ║
// ║         — Llama assignDailyMissions() para el nuevo día                 ║
// ║       Si NO cambió: solo llama assignDailyMissions() (idempotente).    ║
// ║                                                                          ║
// ║   · changeResetHour(delta)                                              ║
// ║       Mueve S.resetHour ±1 hora (circular 0-23). Guarda y actualiza UI.║
// ║                                                                          ║
// ║   · updateResetUI()                                                      ║
// ║       Sincroniza #resetHourLbl y #rhVal con S.resetHour actual.        ║
// ║                                                                          ║
// ║  HTML relacionado:                                                       ║
// ║   · #penbar    — barra roja de penalización por misiones incompletas    ║
// ║   · #resetHourLbl — label "RESET A LAS HH:00"                          ║
// ║   · #rhVal     — valor numérico de la hora de reset                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════
function checkReset(){
  const key = getTodayKey();
  // Always hide penalty bar on page load — it will re-show if needed
  const penbar = document.getElementById('penbar');
  if(penbar) penbar.style.display='none';

  if(S.lastDate !== key){
    if(S.lastDate){
      // streak check — build yesterday's key using same resetHour offset as getTodayKey
      const rh = S.resetHour||0;
      const now2 = new Date();
      const base = new Date(now2);
      if(now2.getHours()<rh) base.setDate(base.getDate()-1); // same offset as getTodayKey
      base.setDate(base.getDate()-1); // go one day back from the "today" anchor
      const prevKey = base.toDateString()+'_h'+rh;
      if(S.lastDate===prevKey) S.streak++;
      // FIX-BUG-STREAK: si el último día guardado NO es ayer (día no consecutivo),
      // la racha se rompe siempre — independientemente de si había XP o no.
      // La condición anterior (else if todayXP===0) era incorrecta: todayXP pertenece
      // a la sesión anterior, no a ayer, por lo que saltar 2+ días con XP previo
      // dejaba la racha congelada en lugar de resetearla a 0.
      else S.streak=0;
      // penalty — only show if yesterday had activity but not all missions done
      const daily = getDailyMissions();
      const doneMin = daily.filter(m=>m.done).length;
      if(doneMin < Math.min(4,daily.length) && S.todayXP>0){
        if(penbar){
          penbar.style.display='block';
          // Auto-hide after 10 seconds
          setTimeout(()=>{ penbar.style.display='none'; }, 10000);
        }
      }
    }
    // BUG-01 FIX: usar un timestamp estable derivado de la clave del día (medianoche del día
    // de reset) en lugar de Date.now(). Así las misiones completadas en el otro navegador
    // —que tienen updatedAt = momento real de la acción— siempre ganan sobre este reset,
    // porque su timestamp es posterior a la medianoche del día que se está reseteando.
    const resetDayBase = new Date(key.split('_h')[0]);
    const resetTs = resetDayBase.getTime() || Date.now();
    S.missions.forEach(m => {
      // Solo resetear si la misión no fue completada HOY en el otro dispositivo.
      // Si updatedAt > resetTs significa que se completó después de la medianoche
      // del día de reset → respetar ese done=true y no pisarlo.
      if(m.updatedAt <= resetTs){ m.done = false; m.updatedAt = resetTs; }
    });
    S.todayXP=0; S.claimed=false; S.claimedDate=''; S.lastDate=key;
    // Assign new daily missions
    S.dailyAssigned = null;
    assignDailyMissions();
    assignWeeklyMission();
    assignMonthlyMission();
    save();
  } else {
    // FIX-BUG-CLAIM: si claimedDate coincide con el día actual, asegurar claimed=true.
    // Esto repara el caso donde un import de backup puso claimed=false
    // incorrectamente mientras la fecha de reclamo sigue siendo hoy.
    if(S.claimedDate && S.claimedDate === key) S.claimed = true;
    assignDailyMissions();
    assignWeeklyMission();
    assignMonthlyMission();
  }
}

function changeResetHour(delta){
  S.resetHour = ((S.resetHour||0)+delta+24)%24;
  save(); updateResetUI();
  notif('⚙ RESET A LAS ' + String(S.resetHour).padStart(2,'0') + ':00');
}

function updateResetUI(){
  const rh = S.resetHour||0;
  const s = String(rh).padStart(2,'0')+':00';
  const lbl=document.getElementById('resetHourLbl');
  if(lbl)lbl.textContent='RESET A LAS '+s;
  const rv=document.getElementById('rhVal');
  if(rv)rv.textContent=s;
}

