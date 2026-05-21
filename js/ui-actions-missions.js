// ╔══════════════════════════════════════════════════════════════════╗
// ║  ui-actions-missions.js  —  Lógica de misiones                  ║
// ║  Contiene: toggle, claim, swap (daily/weekly/monthly), edit      ║
// ║  Depende de: storage.js, rewards.js, constants.js, ui-utils.js  ║
// ║  Continúa en: ui-actions-shop.js (shop, items, modals, config)  ║
// ╚══════════════════════════════════════════════════════════════════╝
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ui-actions.js — §13 MISSION ACTIONS · §14 SHOP PERIOD                ║
// ║                  §15 SHOP & INVENTORY · §16 CONFIGURATION              ║
// ║  Exporta: toggle(), startEditMission(), saveEditMission(), delMission(),║
// ║           claimDaily(), swapDailyMission(), setShopPeriod(),           ║
// ║           renderShop(), renderInventory(), renderItemCard(),           ║
// ║           getTotalBalance(), openRedeem(), confirmRedeem(),            ║
// ║           confirmEditItem(), delItem(), deleteInventoryItem(),         ║
// ║           addMission(), addItem(), saveName(), saveRanks(), resetAll() ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// ║  §13 — MISSION ACTIONS                                                  ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Contiene toda la lógica de interacción sobre misiones:      ║
// ║  marcar/desmarcar, editar inline, eliminar y reclamar recompensa.       ║
// ║                                                                          ║
// ║  ⚠ COMPORTAMIENTO DEL BOTÓN ✕:                                          ║
// ║    · En "MISIONES FIJAS HOY" (fromDaily=true):                          ║
// ║        ✕ llama swapDailyMission() — cambia esa misión por otra          ║
// ║        aleatoria de la misma categoría, sin borrarla del banco.         ║
// ║    · En "BANCO DE MISIONES" (fromDaily=false):                          ║
// ║        ✕ abre el editor inline igual que ✏.                            ║
// ║        El botón 🗑 ELIMINAR aparece dentro del editor.                  ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · getTodayISODate()       → fecha local YYYY-MM-DD con resetHour     ║
// ║   · logDailyMission(cat,xp,add) → actualiza S.dailyLog                 ║
// ║   · toggle(id)              → marca/desmarca, ajusta XP y catCounts     ║
// ║   · startEditMission(id,e)  → activa modo edición inline                ║
// ║   · cancelEditMission()     → cierra editor sin guardar                 ║
// ║   · saveEditMission(id)     → guarda cambios del editor inline          ║
// ║   · delMission(id,e)        → elimina con confirm() — desde editor      ║
// ║   · claimDaily()            → bonus diario si todo completado           ║
// ║   · swapDailyMission(id,e)  → sustituye la misión del día por otra     ║
// ║                               aleatoria de la misma categoría           ║
// ║                                                                          ║
// ║  HTML relacionado: .mcard, .inline-edit, .mchk, #claimbtn              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function getTodayISODate(){
  const now = new Date();
  const rh = S.resetHour||0;
  const d = new Date(now);
  if(now.getHours()<rh) d.setDate(d.getDate()-1);
  return localISO(d);
}

function logDailyMission(cat, xp, add){
  if(!S.dailyLog) S.dailyLog=[];
  const today = getTodayISODate();
  let entry = S.dailyLog.find(e=>e.date===today);
  if(!entry){ entry={date:today,cats:{},xp:0,missions:0}; S.dailyLog.push(entry); }
  if(!entry.cats) entry.cats={};
  if(add){
    entry.cats[cat]=(entry.cats[cat]||0)+1;
    entry.xp=(entry.xp||0)+xp;
    entry.missions=(entry.missions||0)+1;
  } else {
    entry.cats[cat]=Math.max(0,(entry.cats[cat]||0)-1);
    entry.xp=Math.max(0,(entry.xp||0)-xp);
    entry.missions=Math.max(0,(entry.missions||0)-1);
  }
  // Limit log to last 35 days to save space
  const _now35 = new Date();
  S.dailyLog = S.dailyLog.filter(e=>{
    const d=new Date(e.date);
    return (_now35-d)/(1000*60*60*24)<=35;
  });
}

function toggle(id){
  const m=S.missions.find(x=>x.id===id);if(!m)return;
  // Route weekly/monthly bank missions to their specialized toggle functions
  if((m.freq||'daily')==='weekly'){ toggleWeekly(m.id); return; }
  if((m.freq||'daily')==='monthly'){ toggleMonthly(m.id); return; }
  const mxp = m.xp||XPR[m.rank]||50;
  if(m.done){
    m.done=false;
    m.updatedAt=Date.now();
    gainXP(-mxp);
    S.totalComp=Math.max(0,S.totalComp-1);
    if(S.catCounts&&S.catCounts[m.cat]) S.catCounts[m.cat]=Math.max(0,(S.catCounts[m.cat]||1)-1);
    logDailyMission(m.cat, mxp, false);
  } else {
    m.done=true;
    m.updatedAt=Date.now();
    m.lastDoneDate=getTodayISODate(); // ISO YYYY-MM-DD para comparación exacta
    gainXP(mxp);
    S.totalComp++;
    if(!S.catCounts) S.catCounts={};
    S.catCounts[m.cat]=(S.catCounts[m.cat]||0)+1;
    logDailyMission(m.cat, mxp, true);
    notif('+'+mxp+' XP ◈ '+m.name);
    save(); renderWithFlash();
    if(typeof FX!=='undefined') FX.questComplete(id, mxp);
    return;
  }
  save(); renderWithFlash();
}

function startEditMission(id,e){ e.stopPropagation(); editingMissionId=id; renderWithFlash(); }
function cancelEditMission(){ editingMissionId=null; renderWithFlash(); }

function saveEditMission(id){
  const m=S.missions.find(x=>x.id===id); if(!m)return;
  const name=document.getElementById('ie-name-'+id).value.trim();
  if(!name){notif('⚠ EL NOMBRE NO PUEDE ESTAR VACÍO');return;}
  m.name=name;
  m.desc=document.getElementById('ie-desc-'+id).value.trim();
  m.cat=document.getElementById('ie-cat-'+id).value;
  m.rank=document.getElementById('ie-rank-'+id).value;
  m.xp=XPR[m.rank];
  m.fixed=document.getElementById('ie-fixed-'+id).value==='1';
  const freqEl=document.getElementById('ie-freq-'+id);
  if(freqEl) m.freq=freqEl.value;
  m.updatedAt=Date.now();
  editingMissionId=null;
  // FIX-DAILY-RESET: Solo tocar dailyAssigned si la misión editada
  // deja de ser elegible para el slot diario (cambió freq a weekly/monthly).
  // Antes se hacía S.dailyAssigned=null siempre, borrando el progreso del día.
  const newFreq = m.freq || 'daily';
  const isInDailySlot = S.dailyAssigned && Array.isArray(S.dailyAssigned.ids) && S.dailyAssigned.ids.includes(id);
  if(isInDailySlot && newFreq !== 'daily'){
    // Sacar la misión del slot y rellenar el hueco sin tocar las demás
    S.dailyAssigned.ids = S.dailyAssigned.ids.filter(x => x !== id);
    // Buscar una sustituta (daily, no asignada ya)
    const used = new Set(S.dailyAssigned.ids);
    const isDaily = mm => !mm.freq || mm.freq === 'daily';
    const todayISO = getTodayISODate();
    const candidates = S.missions.filter(mm => isDaily(mm) && !used.has(mm.id) && mm.id !== id);
    const notDoneToday = candidates.filter(mm => mm.lastDoneDate !== todayISO);
    const pool = notDoneToday.length ? notDoneToday : candidates;
    if(pool.length){
      const pick = pool[Math.floor(Math.random() * pool.length)];
      S.dailyAssigned.ids.push(pick.id);
    }
  }
  // Si la misión no estaba en el slot, o cambió sólo nombre/cat/rank/desc,
  // no tocamos dailyAssigned para no perder el progreso del día.
  save(); renderWithFlash(); notif('◈ MISIÓN ACTUALIZADA ◈');
}

function delMission(id,e){
  e.stopPropagation();
  if(confirm('¿Eliminar esta misión?')){
    const m=S.missions.find(x=>x.id===id);
    if(m&&m.done){gainXP(-(m.xp||XPR[m.rank]||50));S.totalComp=Math.max(0,S.totalComp-1);}
    // FIX-DAILY-RESET: si la misión estaba en el slot diario, sacarla y
    // buscar sustituta sin borrar el progreso de las otras misiones del día.
    const isInDailySlot = S.dailyAssigned && Array.isArray(S.dailyAssigned.ids) && S.dailyAssigned.ids.includes(id);
    S.missions=S.missions.filter(x=>x.id!==id);
    if(editingMissionId===id) editingMissionId=null;
    if(isInDailySlot){
      S.dailyAssigned.ids = S.dailyAssigned.ids.filter(x => x !== id);
      const used = new Set(S.dailyAssigned.ids);
      const isDaily = mm => !mm.freq || mm.freq === 'daily';
      const todayISO = getTodayISODate();
      const candidates = S.missions.filter(mm => isDaily(mm) && !used.has(mm.id));
      const notDoneToday = candidates.filter(mm => mm.lastDoneDate !== todayISO);
      const pool = notDoneToday.length ? notDoneToday : candidates;
      if(pool.length){
        const pick = pool[Math.floor(Math.random() * pool.length)];
        S.dailyAssigned.ids.push(pick.id);
      }
    } else {
      // No estaba en el slot, solo reasignar si dailyAssigned queda inconsistente
      if(S.dailyAssigned && Array.isArray(S.dailyAssigned.ids)){
        S.dailyAssigned.ids = S.dailyAssigned.ids.filter(x => S.missions.find(mm=>mm.id===x));
      }
    }
    save(); renderWithFlash();
  }
}

// FIX-QA-01: mutex de reclamación diaria.
// Problema: en dos pestañas del mismo navegador (localStorage compartido)
// ambas podían leer claimed=false antes de que la primera escribiera,
// otorgando el bonus dos veces.
// Solución: re-leer claimed desde localStorage justo antes de actuar;
// si ya fue reclamado en otra pestaña, abortar silenciosamente.
let _claimingDaily = false;
function claimDaily(){
  if(_claimingDaily) return;           // re-entrada: botón pulsado dos veces rápido
  const daily=getDailyMissions();
  if(S.claimed||!daily.every(m=>m.done)) return;
  // Re-leer desde localStorage para detectar reclamo en otra pestaña del mismo navegador
  try{
    const fresh=JSON.parse(localStorage.getItem(getUserKey(currentUser))||'null');
    if(fresh&&fresh.claimed){
      S.claimed=true;
      if(fresh.claimedDate) S.claimedDate=fresh.claimedDate;
      renderWithFlash(); return;
    }
  }catch(e){}
  _claimingDaily=true;
  const bonus=Math.floor(60*(1+S.streak*0.12));
  // FIX-BUG-CLAIM: guardar también la clave del día en que se reclamó.
  // Así checkReset() puede distinguir si claimed=true pertenece al día actual
  // o a un día anterior, evitando que un reload o merge borre el estado.
  gainXP(bonus); S.claimed=true; S.claimedDate=getTodayKey(); save(); renderWithFlash();
  notif('◈ RECOMPENSA DIARIA: +'+bonus+' XP BONUS ◈');
  _claimingDaily=false;
}

function toggleWeekly(missionId){
  const m = missionId ? S.missions.find(x=>x.id===missionId) : getWeeklyMission();
  if(!m) return;
  const mxp = m.xp || XPR[m.rank] || 10;
  const today = getTodayISODate();

  // Asegurar que el array existe
  if(!S.weeklyDaysChecked) S.weeklyDaysChecked = [];

  const alreadyToday = S.weeklyDaysChecked.includes(today);

  if(alreadyToday){
    // Desmarcar hoy
    S.weeklyDaysChecked = S.weeklyDaysChecked.filter(d => d !== today);
    m.weeklyDone = false;
    m.updatedAt = Date.now();
    gainXP(-mxp);
    S.totalComp = Math.max(0, S.totalComp-1);
    if(S.catCounts&&S.catCounts[m.cat]) S.catCounts[m.cat]=Math.max(0,(S.catCounts[m.cat]||1)-1);
    logDailyMission(m.cat, mxp, false);
    save(); renderWithFlash();
    return;
  }

  // Marcar hoy
  S.weeklyDaysChecked.push(today);
  m.updatedAt = Date.now();
  m.lastDoneDate = today;
  gainXP(mxp);
  S.totalComp++;
  if(!S.catCounts) S.catCounts={};
  S.catCounts[m.cat]=(S.catCounts[m.cat]||0)+1;
  logDailyMission(m.cat, mxp, true);

  const daysCompleted = S.weeklyDaysChecked.length;

  // ¿Completó los 7 días?
  if(daysCompleted >= 7){
    m.weeklyDone = true;
    notif('🏆 ¡7 DÍAS COMPLETOS! MISIÓN SEMANAL TERMINADA — RECLAMA TU RECOMPENSA');
    if(typeof FX!=='undefined') FX.questComplete(m.id, mxp);
  } else {
    const remaining = 7 - daysCompleted;
    notif('📆 +'+mxp+' XP ◈ DÍA '+daysCompleted+'/7 — faltan '+remaining+' día'+(remaining>1?'s':''));
    if(typeof FX!=='undefined') FX.questComplete(m.id, mxp);
  }

  save(); renderWithFlash();
}

let _claimingWeekly = false;
function claimWeekly(){
  if(_claimingWeekly) return;
  const m = getWeeklyMission();
  if(S.weeklyClaimed || !m || !m.weeklyDone) return;
  // Re-leer localStorage para detectar reclamo en otra pestaña
  try{
    const fresh=JSON.parse(localStorage.getItem(getUserKey(currentUser))||'null');
    if(fresh&&fresh.weeklyClaimed){ S.weeklyClaimed=true; renderWithFlash(); return; }
  }catch(e){}
  _claimingWeekly = true;
  const mxp = m.xp || XPR[m.rank] || 10;
  const multiplier = S.streak > 0 ? 1.0 : 0.5;
  const bonus = Math.floor(mxp * multiplier);
  gainXP(bonus);
  S.weeklyClaimed = true;
  const tag = S.streak > 0 ? '🔥 RACHA x1.0' : 'x0.5';
  notif('◈ RECOMPENSA SEMANAL: +'+bonus+' XP BONUS ['+tag+'] ◈');

  // ── Rotación automática a la siguiente misión ──────────────────────────
  const pool = S.missions.filter(x => x.freq === 'weekly');
  const currentId = S.weeklyAssigned?.id;
  const fresh2 = pool.filter(x => x.id !== currentId);
  const candidates = fresh2.length ? fresh2 : pool;
  if(candidates.length){
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    pool.forEach(x => { x.weeklyDone = false; });
    S.weeklyDaysChecked = [];
    S.weeklyAssigned = { key: getWeekKey(), id: pick.id };
    S.weeklyClaimed = false;
    notif('🔄 NUEVA MISIÓN SEMANAL ASIGNADA: '+pick.name);
  }
  // ───────────────────────────────────────────────────────────────────────

  save(); renderWithFlash();
  _claimingWeekly = false;
}

function toggleMonthly(missionId){
  // If called from bank with a specific id, find that mission; else use assigned monthly
  const m = missionId ? S.missions.find(x=>x.id===missionId) : getMonthlyMission();
  if(!m) return;
  const mxp = m.xp || XPR[m.rank] || 10;
  if(m.monthlyDone){
    m.monthlyDone = false;
    m.updatedAt = Date.now();
    gainXP(-mxp);
    S.totalComp = Math.max(0, S.totalComp-1);
    if(S.catCounts&&S.catCounts[m.cat]) S.catCounts[m.cat]=Math.max(0,(S.catCounts[m.cat]||1)-1);
    logDailyMission(m.cat, mxp, false);
  } else {
    m.monthlyDone = true;
    m.updatedAt = Date.now();
    m.lastDoneDate = getTodayISODate();
    gainXP(mxp);
    S.totalComp++;
    if(!S.catCounts) S.catCounts={};
    S.catCounts[m.cat]=(S.catCounts[m.cat]||0)+1;
    logDailyMission(m.cat, mxp, true);
    notif('🗓️ +'+mxp+' XP ◈ MISIÓN MENSUAL: '+m.name);
    save(); renderWithFlash();
    if(typeof FX!=='undefined') FX.questComplete(m.id, mxp);
    return;
  }
  save(); renderWithFlash();
}

let _claimingMonthly = false;
function claimMonthly(){
  if(_claimingMonthly) return;
  const m = getMonthlyMission();
  if(S.monthlyClaimed || !m || !m.monthlyDone) return;
  // Re-leer localStorage para detectar reclamo en otra pestaña
  try{
    const fresh=JSON.parse(localStorage.getItem(getUserKey(currentUser))||'null');
    if(fresh&&fresh.monthlyClaimed){ S.monthlyClaimed=true; renderWithFlash(); return; }
  }catch(e){}
  _claimingMonthly = true;
  const mxp = m.xp || XPR[m.rank] || 10;
  const multiplier = S.streak > 0 ? 1.0 : 0.5;
  const bonus = Math.floor(mxp * multiplier);
  gainXP(bonus); S.monthlyClaimed = true; save(); renderWithFlash();
  const tag = S.streak > 0 ? '🔥 RACHA x1.0' : 'x0.5';
  notif('◈ RECOMPENSA MENSUAL: +'+bonus+' XP BONUS ['+tag+'] ◈');
  _claimingMonthly = false;
}

function swapWeeklyMission(e){
  e&&e.stopPropagation();
  const current = getWeeklyMission();
  if(current && current.weeklyDone){ notif('⚠ NO PUEDES CAMBIAR UNA MISIÓN YA COMPLETADA'); return; }
  const currentId = S.weeklyAssigned?.id;
  const pool = S.missions.filter(m => m.freq === 'weekly' && m.id !== currentId);
  if(!pool.length){ notif('⚠ NO HAY OTRAS MISIONES SEMANALES EN EL BANCO'); return; }
  const shuffledW = pool.slice();
  for(let i=shuffledW.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffledW[i],shuffledW[j]]=[shuffledW[j],shuffledW[i]]; }
  const pick = shuffledW[0];
  S.weeklyAssigned = { key: getWeekKey(), id: pick.id };
  save(); renderWithFlash();
  notif('🔀 MISIÓN SEMANAL CAMBIADA: '+pick.name);
}

function swapMonthlyMission(e){
  e&&e.stopPropagation();
  const current = getMonthlyMission();
  if(current && current.monthlyDone){ notif('⚠ NO PUEDES CAMBIAR UNA MISIÓN YA COMPLETADA'); return; }
  const currentId = S.monthlyAssigned?.id;
  const pool = S.missions.filter(m => m.freq === 'monthly' && m.id !== currentId);
  if(!pool.length){ notif('⚠ NO HAY OTRAS MISIONES MENSUALES EN EL BANCO'); return; }
  const shuffledM = pool.slice();
  for(let i=shuffledM.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffledM[i],shuffledM[j]]=[shuffledM[j],shuffledM[i]]; }
  const pick = shuffledM[0];
  S.monthlyAssigned = { key: getMonthKey(), id: pick.id };
  save(); renderWithFlash();
  notif('🔀 MISIÓN MENSUAL CAMBIADA: '+pick.name);
}

// ═══════════════════════════════════════════════════════════════════
// §13b — SWAP DAILY MISSION
// ─────────────────────────────────────────────────────────────────
// Reemplaza una misión del día de hoy por otra aleatoria del banco
// completo. No filtra por categoría — cualquier misión disponible
// (incluidas las recién creadas) puede ser elegida.
//
// Reglas:
//   · La misión actual NO debe estar completada.
//   · Prioridad 1: misiones no asignadas hoy y no completadas hoy.
//   · Prioridad 2: misiones no asignadas hoy (completadas antes, no hoy).
//   · Prioridad 3: cualquier misión del banco no asignada actualmente.
//   · Prioridad 4: sin candidatos → aviso al usuario.
// ═══════════════════════════════════════════════════════════════════
function swapDailyMission(id, e){
  e.stopPropagation();
  if(!S.dailyAssigned || !S.dailyAssigned.ids) return;

  const current = S.missions.find(m => m.id === id);
  if(!current) return;

  // No permitir cambiar una misión ya completada hoy
  if(current.done){
    notif('⚠ NO PUEDES CAMBIAR UNA MISIÓN YA COMPLETADA');
    return;
  }

  // IDs ya asignados hoy (incluyendo la actual que se va a reemplazar)
  const assignedIds = new Set(S.dailyAssigned.ids);
  const todayISO = getTodayISODate();

  // Prioridad 1: no asignada hoy y no completada hoy (incluye misiones recién creadas)
  let candidates = S.missions.filter(m =>
    (m.freq || 'daily') === 'daily' &&
    m.id !== id &&
    !assignedIds.has(m.id) &&
    m.lastDoneDate !== todayISO
  );

  // Prioridad 2: no asignada hoy aunque haya sido completada antes (no hoy)
  if(!candidates.length){
    candidates = S.missions.filter(m =>
      (m.freq || 'daily') === 'daily' &&
      m.id !== id &&
      !assignedIds.has(m.id)
    );
  }

  // Prioridad 3: cualquier misión diaria del banco no asignada en este momento
  if(!candidates.length){
    candidates = S.missions.filter(m =>
      (m.freq || 'daily') === 'daily' &&
      m.id !== id
    );
  }

  if(!candidates.length){
    notif('⚠ NO HAY OTRAS MISIONES EN EL BANCO');
    return;
  }

  // Elección aleatoria (shuffle para mayor aleatoriedad)
  // Fisher-Yates shuffle (sin sesgo de V8)
  const shuffled = candidates.slice();
  for(let i=shuffled.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
  }
  const pick = shuffled[0];

  // Sustituir en el slot del día
  const idx = S.dailyAssigned.ids.indexOf(id);
  if(idx !== -1) S.dailyAssigned.ids[idx] = pick.id;

  save();
  renderWithFlash();
  notif('🔀 NUEVA MISIÓN → ' + pick.name);
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §14 — SHOP PERIOD                                                      ║
// ║  Propósito: Gestiona el selector de período de la tienda (día/semana/   ║
// ║  mes) y calcula el XP acumulado para habilitar compras.                 ║
// ║  Funciones: setShopPeriod(), getXPForPeriod(), getPeriodLabel()         ║

// ══════════════════════════════════════════════════════════════
// §QNC-ACTIONS — Acciones del sistema quincenal
// ══════════════════════════════════════════════════════════════

function openQuincenalDetail(year, monthIdx){
  const overlay = document.getElementById('quincenalOverlay');
  const inner   = document.getElementById('quincenalOverlayInner');
  if(!overlay || !inner) return;

  const now = new Date();
  const isCurrentMonth = (year===now.getFullYear() && monthIdx===now.getMonth());
  const currentDay = now.getDate();
  const activeQ    = currentDay<=15 ? 'Q1' : 'Q2';

  const keyQ1 = getQuincenalMonthKey(year, monthIdx, 'Q1');
  const keyQ2 = getQuincenalMonthKey(year, monthIdx, 'Q2');
  const key   = isCurrentMonth ? (activeQ==='Q1'?keyQ1:keyQ2) : keyQ1;

  _renderQuincenalOverlay(year, monthIdx, key, isCurrentMonth);

  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function _renderQuincenalOverlay(year, monthIdx, key, isCurrentMonth){
  const inner = document.getElementById('quincenalOverlayInner');
  if(!inner) return;

  const MONTH_FULL=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const hist = (S.quincenalHistory && S.quincenalHistory[key]) || { ids:[], completed:[] };
  const missions = hist.ids.map(id=>S.missions.find(m=>m.id===id)).filter(Boolean);
  const completed = hist.completed || [];
  const total = missions.length || 11;
  const done  = completed.length;
  const isClaimed = S.quincenalClaimed && S.quincenalClaimed[key];
  const q = key.endsWith('Q1') ? 'Q1' : 'Q2';

  const cx=40,cy=40,r=34;
  const pctD=total>0?done/total:0, pctP=1-pctD;
  function arc2(pct,sa){
    if(pct<=0) return ''; if(pct>=1)pct=0.9999;
    const ea=sa+pct*2*Math.PI;
    const x1=cx+r*Math.sin(sa),y1=cy-r*Math.cos(sa);
    const x2=cx+r*Math.sin(ea),y2=cy-r*Math.cos(ea);
    return `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${pct>0.5?1:0},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z"`;
  }
  let bigPie='';
  if(done>0){bigPie+=`${arc2(pctD,0)} fill="#4ade80" opacity="0.9"/>`;} else {bigPie+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,68,102,0.15)" stroke="rgba(255,68,102,0.3)" stroke-width="1"/>`;}
  if(pctP>0&&done>0){bigPie+=`${arc2(pctP,pctD*2*Math.PI)} fill="#ff6644" opacity="0.85"/>`;}
  bigPie+=`<circle cx="${cx}" cy="${cy}" r="22" fill="rgba(0,10,30,0.95)"/>`;
  bigPie+=`<text x="${cx}" y="${cy-4}" text-anchor="middle" font-family="Orbitron,monospace" font-size="11" fill="${done>=total&&total>0?'#4ade80':'#fff'}">${done}/${total}</text>`;
  bigPie+=`<text x="${cx}" y="${cy+10}" text-anchor="middle" font-family="Orbitron,monospace" font-size="7" fill="var(--muted)">MISIONES</text>`;

  let mList='';
  if(missions.length===0){
    mList=`<div style="text-align:center;color:var(--muted);padding:20px;font-family:'Orbitron',monospace;font-size:10px;">SIN MISIONES ASIGNADAS</div>`;
  } else {
    missions.forEach(m=>{
      const isDone = completed.includes(m.id);
      const xp = m.xp || XPR[m.rank] || 10;
      const ico = (CAT_LABELS[m.cat]||'⚡').split(' ')[0];
      const isCurrentKey = key===(typeof getQuincenalKey==='function'?getQuincenalKey():'');
      mList+=`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 4px;
                    border-bottom:1px solid rgba(255,255,255,0.05);
                    opacity:${isDone?'0.7':'1'};
                    cursor:${isCurrentKey?'pointer':'default'};"
             onclick="${isCurrentKey?`toggleQuincenalMission('${m.id}','${key}')`:''}" >
          <div style="width:22px;height:22px;border:1px solid ${isDone?'var(--green)':'rgba(255,255,255,0.25)'};
                      background:${isDone?'rgba(74,222,128,0.2)':'transparent'};
                      display:flex;align-items:center;justify-content:center;
                      font-size:11px;color:var(--green);flex-shrink:0;
                      cursor:${isCurrentKey?'pointer':'default'};">
            ${isDone?'✓':''}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-family:'Orbitron',monospace;font-size:17px;letter-spacing:1px;
                        color:${isDone?'rgba(255,255,255,0.5)':'#fff'};
                        text-decoration:${isDone?'line-through':'none'};
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escH(m.name)}
            </div>
            ${m.desc?`<div style="font-size:16px;color:var(--muted);margin-top:2px;">${escH(m.desc)}</div>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <span style="font-size:10px;">${ico}</span>
            <span style="font-family:'Orbitron',monospace;font-size:8px;color:#60a5fa;">+${xp}XP</span>
          </div>
        </div>`;
    });
  }

  const allDone = total>0 && done>=total;
  const xpTotal = missions.reduce((s,m)=>s+(m.xp||XPR[m.rank]||10),0);
  const mult    = S.streak>0?1.0:0.5;
  const bonus   = Math.floor(xpTotal*mult);

  inner.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;
                margin-bottom:14px;border-bottom:1px solid rgba(0,100,200,0.3);padding-bottom:12px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:15px;letter-spacing:3px;color:var(--green);">
          ${MONTH_FULL[monthIdx].toUpperCase()}
        </div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--muted);">
          ${year} · ${q} (${q==='Q1'?'1–15':'16–fin'})
        </div>
      </div>
      <div onclick="closeQuincenalDetail()" style="cursor:pointer;font-family:'Orbitron',monospace;
           font-size:9px;color:var(--danger);letter-spacing:2px;padding:6px 12px;
           border:1px solid rgba(255,68,102,0.4);">✕ CERRAR</div>
    </div>
    <div style="display:flex;justify-content:center;margin-bottom:14px;">
      <svg width="80" height="80" viewBox="0 0 80 80">${bigPie}</svg>
    </div>
    <div style="margin-bottom:12px;">${mList}</div>
    <button onclick="claimQuincenalBonus('${key}')"
            ${(!allDone||isClaimed)?'disabled':''}
            style="width:100%;padding:10px;font-family:'Orbitron',monospace;font-size:9px;
                   letter-spacing:2px;border:1px solid rgba(167,139,250,${(!allDone||isClaimed)?'0.2':'0.5'});
                   background:rgba(167,139,250,${(!allDone||isClaimed)?'0.05':'0.12'});
                   color:${(!allDone||isClaimed)?'var(--muted)':'rgba(167,139,250,0.9)'};cursor:${(!allDone||isClaimed)?'not-allowed':'pointer'};">
      ${isClaimed ? '◈ BONUS YA RECLAMADO ◈' : `◈ RECLAMAR +${bonus} XP BONUS ◈`}
    </button>`;
}

function closeQuincenalDetail(){
  const ov = document.getElementById('quincenalOverlay');
  if(ov) ov.style.display='none';
  document.body.style.overflow='';
}

function toggleQuincenalMission(missionId, key){
  if(!S.quincenalHistory || !S.quincenalHistory[key]) return;
  const hist = S.quincenalHistory[key];
  const m    = S.missions.find(x=>x.id===missionId);
  if(!m) return;
  const xp   = m.xp || XPR[m.rank] || 10;
  const idx  = hist.completed.indexOf(missionId);
  if(idx>=0){
    hist.completed.splice(idx,1);
    hist.xpEarned=Math.max(0,(hist.xpEarned||0)-xp);
    gainXP(-xp);
    S.totalComp=Math.max(0,S.totalComp-1);
  } else {
    hist.completed.push(missionId);
    hist.xpEarned=(hist.xpEarned||0)+xp;
    gainXP(xp);
    S.totalComp++;
    notif('🗓️ +'+xp+' XP ◈ '+m.name);
    if(typeof FX!=='undefined') FX.questComplete(missionId, xp);
  }
  save();
  _renderQuincenalOverlay(new Date().getFullYear(), new Date().getMonth(), key, true);
  renderWithFlash();
}

function claimQuincenalBonus(key){
  if(!S.quincenalHistory || !S.quincenalHistory[key]) return;
  if(S.quincenalClaimed && S.quincenalClaimed[key]) return;
  const hist     = S.quincenalHistory[key];
  const total    = hist.ids.length;
  const done     = (hist.completed||[]).length;
  if(done < total){ notif('⚠ COMPLETA TODAS LAS MISIONES PRIMERO'); return; }
  const missions = hist.ids.map(id=>S.missions.find(m=>m.id===id)).filter(Boolean);
  const xpTotal  = missions.reduce((s,m)=>s+(m.xp||XPR[m.rank]||10),0);
  const mult     = S.streak>0?1.0:0.5;
  const bonus    = Math.floor(xpTotal*mult);
  gainXP(bonus);
  if(!S.quincenalClaimed) S.quincenalClaimed={};
  S.quincenalClaimed[key]=true;
  save();
  const tag=S.streak>0?'🔥 RACHA x1.0':'x0.5';
  notif('◈ QUINCENA COMPLETADA: +'+bonus+' XP ['+tag+'] ◈');
  _renderQuincenalOverlay(new Date().getFullYear(), new Date().getMonth(), key, true);
  renderWithFlash();
}

// ── toggleQuincenalSection — colapsa/expande el grid quincenal ──
function toggleQuincenalSection(){
  const body = document.getElementById('quincenal-body');
  const btn  = document.getElementById('quincenal-toggle-btn');
  if(!body || !btn) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  btn.textContent   = collapsed ? '−' : '+';
}
