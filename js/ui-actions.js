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
  const visionEl=document.getElementById('ie-vision-'+id);
  if(visionEl) m.visionImg=visionEl.value;
  m.updatedAt=Date.now();
  editingMissionId=null;
  // reassign daily if needed
  S.dailyAssigned=null; assignDailyMissions();
  save(); renderWithFlash(); notif('◈ MISIÓN ACTUALIZADA ◈');
}

function delMission(id,e){
  e.stopPropagation();
  if(confirm('¿Eliminar esta misión?')){
    const m=S.missions.find(x=>x.id===id);
    if(m&&m.done){gainXP(-(m.xp||XPR[m.rank]||50));S.totalComp=Math.max(0,S.totalComp-1);}
    S.missions=S.missions.filter(x=>x.id!==id);
    if(editingMissionId===id) editingMissionId=null;
    S.dailyAssigned=null; assignDailyMissions();
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
  // If called from bank with a specific id, find that mission; else use assigned weekly
  const m = missionId ? S.missions.find(x=>x.id===missionId) : getWeeklyMission();
  if(!m) return;
  const mxp = m.xp || XPR[m.rank] || 10;
  if(m.weeklyDone){
    m.weeklyDone = false;
    m.updatedAt = Date.now();
    gainXP(-mxp);
    S.totalComp = Math.max(0, S.totalComp-1);
    if(S.catCounts&&S.catCounts[m.cat]) S.catCounts[m.cat]=Math.max(0,(S.catCounts[m.cat]||1)-1);
    logDailyMission(m.cat, mxp, false);
  } else {
    m.weeklyDone = true;
    m.updatedAt = Date.now();
    m.lastDoneDate = getTodayISODate();
    gainXP(mxp);
    S.totalComp++;
    if(!S.catCounts) S.catCounts={};
    S.catCounts[m.cat]=(S.catCounts[m.cat]||0)+1;
    logDailyMission(m.cat, mxp, true);
    notif('📆 +'+mxp+' XP ◈ MISIÓN SEMANAL: '+m.name);
    save(); renderWithFlash();
    if(typeof FX!=='undefined') FX.questComplete(m.id, mxp);
    return;
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
  gainXP(bonus); S.weeklyClaimed = true; save(); renderWithFlash();
  const tag = S.streak > 0 ? '🔥 RACHA x1.0' : 'x0.5';
  notif('◈ RECOMPENSA SEMANAL: +'+bonus+' XP BONUS ['+tag+'] ◈');
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
// ╚══════════════════════════════════════════════════════════════════════════╝
function setShopPeriod(p){
  shopPeriod = p;
  S.shopPeriod = p;
  save();
  ['day','week','month'].forEach(x=>{
    const el=document.getElementById('sp-'+x);
    if(el) el.classList.toggle('active', x===p);
  });
  renderShop();
}

function getXPForPeriod(period){
  if(!S.dailyLog || !S.dailyLog.length) return 0;
  const now = new Date();
  let cutoffStr;
  if(period === 'day'){
    cutoffStr = getTodayISODate();
  } else if(period === 'week'){
    const c = new Date(now); c.setDate(now.getDate()-7);
    cutoffStr = localISO(c);
  } else {
    const c = new Date(now); c.setDate(now.getDate()-30);
    cutoffStr = localISO(c);
  }
  return S.dailyLog
    .filter(e => e.date >= cutoffStr)
    .reduce((sum,e) => sum + (e.xp||0), 0);
}

function getPeriodLabel(period){
  return {day:'HOY', week:'SEMANA', month:'MES'}[period];
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §15 — SHOP AND INVENTORY                                               ║
// ║  Propósito: Grid de objetos de tienda e inventario, lógica de compra,  ║
// ║  modal de confirmación, edición y borrado de ítems.                     ║
// ║  Al comprar con precio COP se registra gasto automático en Dinero.      ║
// ║  Funciones: renderShop(), renderInventory(), renderItemCard(),          ║
// ║             getTotalBalance(), openRedeem(), confirmRedeem(),           ║
// ║             openEditItem(), confirmEditItem(), delItem(),               ║
// ║             deleteInventoryItem(), closeModal()                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function renderShop(){
  const el=document.getElementById('shopGrid'); if(!el) return;
  const shop=S.items.filter(it=>!it.red);
  if(!shop.length){
    el.innerHTML='<div style="color:var(--muted);text-align:center;padding:28px;font-size:calc(12px * var(--fs-scale));grid-column:1/-1;">Añade objetos en CONFIGURAR → TIENDA</div>';
    return;
  }
  el.innerHTML=shop.map(it=>renderItemCard(it,true)).join('');
}

function renderInventory(){
  const el=document.getElementById('invgrid'); if(!el)return;
  const owned=S.items.filter(it=>it.red);
  document.getElementById('invEmpty').style.display=owned.length?'none':'block';
  if(!owned.length){el.innerHTML='';return;}
  el.innerHTML=owned.map(it=>renderItemCard(it,false)).join('');
}

function renderItemCard(it, isShop){
  const shopXP = S.shopXP || 0;
  const locked = shopXP < it.cost && !it.red;
  const pct = Math.min(100, Math.round((shopXP / it.cost) * 100));
  const rc = {common:'rcom', rare:'rrare', epic:'rep', legendary:'rleg'}[it.rar];

  // Period progress (solo en tienda, no en inventario de canjeados)
  let periodBlock = '';
  if(isShop && !it.red){
    const periodXP   = getXPForPeriod(shopPeriod);
    const periodPct  = Math.min(100, Math.round((periodXP / it.cost) * 100));
    const xpPerDay   = periodXP / (shopPeriod==='day'?1:shopPeriod==='week'?7:30);
    const remaining  = Math.max(0, it.cost - shopXP);
    const daysLeft   = (shopXP >= it.cost || xpPerDay <= 0) ? 0 : Math.ceil(remaining / xpPerDay);
    const lbl        = getPeriodLabel(shopPeriod);
    const col        = periodPct >= 100 ? 'var(--gold)' : periodPct >= 50 ? 'var(--blue)' : 'rgba(0,100,200,0.6)';
    const pace       = shopPeriod==='day'
      ? (periodXP > 0 ? `+${periodXP} XP hoy` : 'Sin XP hoy')
      : (xpPerDay > 0 && daysLeft > 0 ? `~${daysLeft} días restantes` : periodXP >= it.cost ? '¡Meta alcanzable!' : 'Sin datos aún');

    periodBlock = `
  <div class="item-progress-detail">
    <div class="ipd-row">
      <span class="ipd-lbl">XP ESTA ${lbl}</span>
      <span class="ipd-val" style="color:${col}">${periodXP} / ${it.cost}</span>
    </div>
    <div class="ipd-bar"><div class="ipd-barfill" style="width:${periodPct}%;background:${col}"></div></div>
    <div style="display:flex;justify-content:space-between;">
      <span style="font-size:calc(9px * var(--fs-scale));color:var(--muted);letter-spacing:1px;">${pace}</span>
      <span style="font-family:'Orbitron',monospace;font-size:calc(9px * var(--fs-scale));color:${periodPct>=100?'var(--gold)':'var(--muted)'};">${periodPct}%</span>
    </div>
  </div>`;
  }

  const totalBal  = getTotalBalance();
  const minBal    = S ? (S.minBalance||0) : 0;
  const itemPrice = it.realPrice||0;
  const balBlocked = minBal > 0 && (totalBal <= minBal || (itemPrice > 0 && (totalBal - itemPrice) < minBal));

  return `
<div class="icard ${locked && isShop ? 'locked' : ''}" id="ic-${it.id}"
  style="${it.red ? 'border-color:rgba(74,222,128,0.35);' : ((!locked && isShop) ? 'border-color:rgba(240,192,64,0.3);' : '')}">
  <div class="irarity ${rc}">${RARLBL[it.rar].toUpperCase()}</div>
  <div class="iico">${it.ico}</div>
  <div class="iname">${escH(it.name)}</div>
  ${it.price ? `<div class="iprice">${escH(it.price)}</div>` : ''}
  <div class="icost"><span class="icostval">${it.cost}</span><span class="icostlbl"> XP tienda</span></div>
  ${isShop && !it.red ? `
  <div class="ibar"><div class="ibarfill" style="width:${pct}%;background:${pct>=100?'var(--gold)':'var(--blue)'}"></div></div>
  <div class="ipct" style="font-size:var(--fs-xs);color:var(--muted);text-align:right;margin-top:2px;">TIENDA: ${shopXP} / ${it.cost} XP</div>` : ''}
  ${periodBlock}
  ${it.red ? `<div class="idate">📦 Creado: ${it.createdDate||'—'}<br>🏆 Ganado: ${it.redDate||'—'}</div>` : ''}
  ${it.red ? '<div class="iunlbdg">✓ OBTENIDO</div>' : (locked && isShop ? '<div class="ilock">🔒</div>' : (!it.red && isShop && balBlocked ? '<div class="ilock" style="color:var(--danger);font-size:10px;letter-spacing:1px;font-family:\'Orbitron\',monospace;">💰 BLOQ.</div>' : '<div class="ilock" style="color:var(--gold)">★</div>'))}
  ${isShop && !it.red && balBlocked ? `<div style="font-size:calc(8px * var(--fs-scale));color:var(--danger);letter-spacing:1px;text-align:center;margin-top:4px;opacity:.8;">Tope mín: ${formatCOP(minBal)}</div>` : ''}
  <div class="icard-actions">
    ${isShop && !it.red ? `<button class="act-btn edit" style="flex:1;text-align:center;" onclick="openEditItem('${it.id}')">✏</button>` : ''}
    ${isShop && !locked && !it.red ? `<button class="act-btn save" style="flex:1;text-align:center;${balBlocked?'opacity:.35;cursor:not-allowed;':''}\" onclick="${balBlocked?'notif(\'⚠ BALANCE EN EL TOPE MÍNIMO\')':'openRedeem(\''+it.id+'\')'}">★ COMPRAR</button>` : ''}
    ${isShop ? `<button class="act-btn del" onclick="delItem('${it.id}')">✕</button>` : ''}
    ${!isShop && it.red ? `<button class="act-btn del" style="margin-top:6px;width:100%;text-align:center;font-size:10px;letter-spacing:1px;padding:5px 8px;" onclick="deleteInventoryItem('${it.id}')" title="Eliminar del inventario permanentemente (sin recuperar XP ni dinero)">🗑 ELIMINAR OBJETO</button>` : ''}
  </div>
</div>`;
}

// Calcula el balance real acumulado (todos los movimientos, sin filtro de período)
function getTotalBalance(){
  if(!S||!S.transactions) return 0;
  return S.transactions.reduce((s,t)=> {
    if(t.type==='income') return s + t.amt;
    if(t.type==='expense') return s - t.amt;
    return s; // income_split y otros no afectan el balance real
  }, 0);
}

function openRedeem(id){
  const it=S.items.find(x=>x.id===id);
  if(!it||it.red) return;
  const shopXP = S.shopXP || 0;
  if(shopXP < it.cost) return;

  const totalBal   = getTotalBalance();
  const minBal     = S.minBalance||0;
  const itemPrice  = it.realPrice||0; // precio real en COP si está configurado como número
  const afterBuy   = totalBal - itemPrice;
  const blocked    = minBal > 0 && totalBal <= minBal;
  const blockedAfter = minBal > 0 && itemPrice > 0 && afterBuy < minBal;

  pendingId=id;
  document.getElementById('modT').textContent='◈ COMPRAR OBJETO';

  const deseosFund = S.deseosFund || 0;
  const dblocked = deseosFund > 0 && itemPrice > 0 && itemPrice > deseosFund;

  let balanceInfo = '';
  if(deseosFund > 0){
    balanceInfo += `<div style="margin-top:10px;padding:8px 10px;background:rgba(167,139,250,0.07);border:1px solid rgba(167,139,250,0.35);font-size:11px;line-height:1.8;">
      <div style="color:#a78bfa;letter-spacing:1px;font-size:9px;font-family:'Orbitron',monospace;margin-bottom:4px;">🎮 FONDO DE DESEOS (50/30/20)</div>
      <div>Disponible para compras: <span style="color:#a78bfa;font-family:'Orbitron',monospace;">${formatCOP(deseosFund)}</span></div>
      ${itemPrice>0?`<div>Precio real del objeto: <span style="color:${itemPrice<=deseosFund?'var(--green)':'var(--danger)'};font-family:'Orbitron',monospace;">${formatCOP(itemPrice)}</span></div>`:''}
      ${itemPrice>0&&itemPrice<=deseosFund?`<div style="color:var(--green);font-size:10px;">✓ Tienes suficiente en tu fondo</div>`:''}
      ${dblocked?`<div style="color:var(--danger);font-size:10px;">⚠ El precio supera tu fondo de deseos</div>`:''}
    </div>`;
  }
  if(minBal > 0){
    balanceInfo += `<div style="margin-top:10px;padding:8px 10px;background:rgba(0,10,25,0.8);border:1px solid rgba(0,100,200,0.2);font-size:11px;line-height:1.8;">
      <div style="color:var(--muted);letter-spacing:1px;font-size:9px;font-family:'Orbitron',monospace;margin-bottom:4px;">◈ COLCHÓN DE SEGURIDAD</div>
      <div>Balance actual: <span style="color:${totalBal>=0?'var(--green)':'var(--danger)'};font-family:'Orbitron',monospace;">${formatCOP(totalBal)}</span></div>
      <div>Tope mínimo: <span style="color:var(--gold);font-family:'Orbitron',monospace;">${formatCOP(minBal)}</span></div>
      ${itemPrice>0?`<div>Balance tras compra: <span style="color:${afterBuy>=minBal?'var(--green)':'var(--danger)'};font-family:'Orbitron',monospace;">${formatCOP(afterBuy)}</span></div>`:''}
    </div>`;
  }

  document.getElementById('modB').innerHTML=
    `<div style="font-size:32px;margin-bottom:8px;">${it.ico}</div>`
    +`<div style="font-size:16px;font-weight:600;color:var(--bright);margin-bottom:8px;">${escH(it.name)}</div>`
    +(it.price?`<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Precio real: ${escH(it.price)}</div>`:'')
    +`<div>Costo: <span style="color:var(--gold);font-family:'Orbitron',monospace;">${it.cost} XP tienda</span></div>`
    +`<div style="margin-top:6px;font-size:12px;color:var(--muted);">XP tienda disponible: <span style="color:var(--gold);font-family:'Orbitron',monospace;">${shopXP}</span></div>`
    +`<div style="font-size:11px;color:var(--blue);margin-top:4px;letter-spacing:1px;">▸ Tu nivel (LV.${S.lvl}) y barra de XP no cambiarán.</div>`
    +balanceInfo
    +(blocked ? `<div style="margin-top:10px;padding:8px 10px;background:rgba(255,30,60,0.07);border:1px solid rgba(255,30,60,0.35);border-left:3px solid var(--danger);color:#ff8899;font-size:11px;letter-spacing:1px;">⚠ Tu balance total (${formatCOP(totalBal)}) está en el tope mínimo o por debajo. No puedes comprar hasta superar el colchón de ${formatCOP(minBal)}.</div>` : '')
    +(blockedAfter && !blocked ? `<div style="margin-top:10px;padding:8px 10px;background:rgba(255,30,60,0.07);border:1px solid rgba(255,30,60,0.35);border-left:3px solid var(--danger);color:#ff8899;font-size:11px;letter-spacing:1px;">⚠ Esta compra dejaría tu balance por debajo del colchón de ${formatCOP(minBal)}. Necesitas más dinero disponible.</div>` : '')
    +(dblocked ? `<div style="margin-top:6px;padding:8px 10px;background:rgba(167,139,250,0.07);border:1px solid rgba(167,139,250,0.4);border-left:3px solid #a78bfa;color:#c4b5fd;font-size:11px;letter-spacing:1px;">🎮 El precio real supera tu fondo de Deseos (${formatCOP(deseosFund)}). Acumula más ingresos para habilitar esta compra.</div>` : '');

  const canBuy = !blocked && !blockedAfter && !dblocked;
  document.getElementById('modActs').innerHTML=`
<button class="mbtn ok" ${canBuy?'':'disabled style="opacity:.35;cursor:not-allowed"'} onclick="${canBuy?'confirmRedeem()':'void(0)'}">CONFIRMAR</button>
<button class="mbtn no" onclick="closeModal()">CANCELAR</button>`;
  document.getElementById('modal').classList.add('show');
}

function confirmRedeem(){
  if(!pendingId) return;
  const it=S.items.find(x=>x.id===pendingId);
  if(!it||it.red){ closeModal(); return; }

  // Verificar shopXP disponible (moneda de tienda — no afecta nivel)
  if((S.shopXP||0) < it.cost){
    notif('⚠ XP DE TIENDA INSUFICIENTE');
    closeModal(); return;
  }

  // Re-check minBalance guard
  const totalBal  = getTotalBalance();
  const minBal    = S.minBalance||0;
  const itemPrice = it.realPrice||0;
  if(minBal > 0 && totalBal <= minBal){ notif('⚠ BALANCE EN EL TOPE MÍNIMO — COMPRA BLOQUEADA'); closeModal(); return; }
  if(minBal > 0 && itemPrice > 0 && (totalBal - itemPrice) < minBal){ notif('⚠ ESTA COMPRA VIOLARÍA EL COLCHÓN DE SEGURIDAD'); closeModal(); return; }

  // FIX-QA-02a: re-leer localStorage para detectar canje ya efectuado en otra
  // pestaña o dispositivo antes de procesar. Evita doble canje del mismo ítem.
  try{
    const fresh=JSON.parse(localStorage.getItem(getUserKey(currentUser))||'null');
    const freshIt=fresh&&fresh.items&&fresh.items.find(x=>x.id===pendingId);
    if(freshIt&&freshIt.red){
      notif('⚠ ESTE OBJETO YA FUE CANJEADO EN OTRO DISPOSITIVO');
      // Sincronizar el estado local con el del storage para mostrar la tienda actualizada
      Object.assign(it, freshIt);
      save(); renderWithFlash(); closeModal(); return;
    }
  }catch(e){}

  // Descontar de shopXP ÚNICAMENTE — totalXP, lvl, curXP y nextXP no se tocan
  S.shopXP = Math.max(0, (S.shopXP||0) - it.cost);
  // Descontar del fondo de Deseos (50/30/20) si hay precio real y hay fondo
  if(it.realPrice > 0 && S.deseosFund > 0){
    S.deseosFund = Math.max(0, (S.deseosFund||0) - it.realPrice);
  }
  it.red = true;
  it.redDate = new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'});
  it.updatedAt  = Date.now();

  // ── Registrar gasto automático en módulo Dinero ──────────────────
  // Solo si el objeto tiene precio real en COP (it.realPrice > 0).
  // Se crea una transacción tipo 'expense' con categoría 'compras'
  // y se marca con la bandera autoShop:true para identificarla.
  if(itemPrice > 0){
    if(!S.transactions) S.transactions = [];
    if(!S.nTid) S.nTid = 1;
    const now = new Date();
    S.transactions.push({
      id:       't' + S.nTid++,
      desc:     it.ico + ' ' + it.name,
      amt:      itemPrice,
      type:     'expense',
      cat:      'compras',
      ico:      it.ico || '🛍️',
      ts:       Date.now(),
      date:     localISO(now),
      autoShop: true   // bandera para saber que fue generada por tienda
    });
    if(S.transactions.length > 500) S.transactions = S.transactions.slice(-500);
  }

  save(); renderWithFlash(); notif('◈ ' + it.ico + ' ' + it.name + ' — OBTENIDO ◈' + (itemPrice > 0 ? ' · ' + formatCOP(itemPrice) + ' registrados en Dinero' : ''));
  // Efecto visual de compra
  if(typeof FX !== 'undefined'){
    const icoEl = document.querySelector('.modal .modtitle');
    FX.purchase(icoEl, it.name);
  }
  closeModal();
}

function openEditItem(id){
  const it=S.items.find(x=>x.id===id); if(!it) return;
  pendingId=id;
  document.getElementById('modT').textContent='✏ EDITAR OBJETO';
  document.getElementById('modB').innerHTML=`
<div class="edit-item-form">
  <div class="ie-row"><label class="ie-lbl">Nombre</label><input class="ie-inp" id="ei-name" value="${escH(it.name)}"></div>
  <div class="ie-grid">
    <div class="ie-row"><label class="ie-lbl">Emoji</label><input class="ie-inp" id="ei-ico" value="${escH(it.ico)}" style="font-size:20px;text-align:center" maxlength="4"></div>
    <div class="ie-row"><label class="ie-lbl">Costo XP</label><input type="number" class="ie-inp" id="ei-cost" value="${it.cost}" min="1"></div>
  </div>
  <div class="ie-row"><label class="ie-lbl">Precio real</label><input class="ie-inp" id="ei-price" value="${escH(it.price||'')}"></div>
  <div class="ie-row"><label class="ie-lbl">Rareza</label>
    <select class="ie-sel" id="ei-rar">
      <option value="common" ${it.rar==='common'?'selected':''}>Común</option>
      <option value="rare" ${it.rar==='rare'?'selected':''}>Raro</option>
      <option value="epic" ${it.rar==='epic'?'selected':''}>Épico</option>
      <option value="legendary" ${it.rar==='legendary'?'selected':''}>Legendario</option>
    </select>
  </div>
</div>`;
  document.getElementById('modActs').innerHTML=`
<button class="mbtn ok" onclick="confirmEditItem()">GUARDAR</button>
<button class="mbtn no" onclick="closeModal()">CANCELAR</button>`;
  document.getElementById('modal').classList.add('show');
}

function confirmEditItem(){
  const it=S.items.find(x=>x.id===pendingId); if(!it) return;
  const name=document.getElementById('ei-name').value.trim();
  const cost=parseInt(document.getElementById('ei-cost').value);
  if(!name||!cost||cost<1){notif('⚠ COMPLETA NOMBRE Y COSTO');return;}
  it.name=name; it.ico=document.getElementById('ei-ico').value.trim()||'🎁';
  it.cost=cost;
  const priceRaw2=document.getElementById('ei-price').value.trim();
  it.price=priceRaw2;
  it.realPrice=parseInt(priceRaw2.replace(/[^\d]/g,''), 10) || 0;
  it.rar=document.getElementById('ei-rar').value;
  save(); renderWithFlash(); notif('◈ OBJETO ACTUALIZADO ◈'); closeModal();
}

function delItem(id){
  if(confirm('¿Eliminar este objeto?')){
    S.items=S.items.filter(x=>x.id!==id);
    save(); renderWithFlash(); notif('◈ OBJETO ELIMINADO ◈');
  }
}

// ─────────────────────────────────────────────────────────────────
// deleteInventoryItem — Abre modal gamer de confirmación antes de borrar.
// ⚠ No devuelve XP ni dinero. El objeto desaparece del array S.items.
// Para que vuelva a aparecer en tienda hay que recrearlo en Configurar.
// ─────────────────────────────────────────────────────────────────
let _delInvId = null;
function deleteInventoryItem(id){
  const it = S.items.find(x => x.id === id);
  if(!it || !it.red) return;
  _delInvId = id;
  document.getElementById('delInvName').textContent = it.ico ? it.ico + ' ' + it.name : it.name;
  const price = it.realPrice > 0 ? ' · ' + formatCOP(it.realPrice) + ' pagados' : '';
  document.getElementById('delInvBody').textContent = 'Costo: ' + it.cost + ' XP' + price + ' · El XP y dinero no se recuperan.';
  document.getElementById('delInvModal').classList.add('show');
}
function confirmDelInv(){
  const id = _delInvId; _delInvId = null;
  closDelInv();
  const it = S.items.find(x => x.id === id);
  if(!it) return;
  const cardEl = document.getElementById('ic-' + id);
  if(typeof FX !== 'undefined') FX.itemRemoved(cardEl, it.name);
  S.items = S.items.filter(x => x.id !== id);
  save(); renderWithFlash();
  notif('🗑 ' + it.name + ' — ELIMINADO DEL INVENTARIO');
}
function closDelInv(){ document.getElementById('delInvModal').classList.remove('show'); _delInvId = null; }

function closeModal(){ document.getElementById('modal').classList.remove('show'); pendingId=null; }


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §16 — CONFIGURATION                                                    ║
// ║  Propósito: CRUD de misiones y objetos de tienda, configuración de XP   ║
// ║  por rango, nombre de usuario, colchón de seguridad, editor de logros,  ║
// ║  y reset completo del sistema.                                           ║
// ║  Funciones: addMission(), addItem(), toggleNameForm(), saveName(),       ║
// ║             saveRanks(), saveMinBalance(), updateMinBalStatus(),         ║
// ║             renderAchievEditor(), updateAchiev(), updateAchievType(),    ║
// ║             delAchiev(), addAchiev(), resetAll()                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function addMission(){
  const n=document.getElementById('mNameInp').value.trim();
  if(!n){notif('▸ INGRESA UN NOMBRE PARA LA MISIÓN');return;}
  const rank=document.getElementById('mRankInp').value;
  const freqEl=document.getElementById('mFreqInp');
  const visionImgEl=document.getElementById('mVisionImgInp');
  const m={
    id:'m'+S.nMid++, name:n,
    desc:document.getElementById('mDescInp').value.trim(),
    cat:document.getElementById('mCatInp').value,
    rank, xp:XPR[rank], done:false, fixed:document.getElementById('mFixedInp').value==='1',
    freq: freqEl ? freqEl.value : 'daily',
    visionImg: visionImgEl ? visionImgEl.value : '',
    createdDate:new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'}),
    lastDoneDate:null,
    updatedAt: Date.now()
  };
  S.missions.push(m);
  document.getElementById('mNameInp').value='';
  document.getElementById('mDescInp').value='';
  if(freqEl) freqEl.value='daily';
  if(visionImgEl) visionImgEl.value='';
  // Hide vision board row on reset
  const vbRow=document.getElementById('visionBoardRow');
  if(vbRow) vbRow.style.display='none';
  const catInp=document.getElementById('mCatInp');
  if(catInp) catInp.value='salud';
  S.dailyAssigned=null; assignDailyMissions();
  save();
  switchTab('missions'); // primero cambia el tab
  renderWithFlash();     // luego renderiza ya con el tab activo
  notif('▸ MISIÓN AÑADIDA: '+n);
}

function addItem(){
  const n=document.getElementById('iNameInp').value.trim();
  const c=parseInt(document.getElementById('iCostInp').value);
  if(!n||!c||c<1){notif('▸ COMPLETA NOMBRE Y COSTO EN XP');return;}
  const priceRaw = document.getElementById('iPriceInp').value.trim();
  // Parse numeric value from price string (strip all non-digits → integer pesos, consistent with formatCOP)
  const priceNum = parseInt(priceRaw.replace(/[^\d]/g,''), 10) || 0;
  const it={
    id:'i'+S.nIid++, name:n,
    ico:document.getElementById('iIcoInp').value.trim()||'🎁',
    cost:c, price:priceRaw, realPrice:priceNum,
    rar:document.getElementById('iRarInp').value, red:false,
    createdDate:new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'}),
    updatedAt: Date.now()
  };
  S.items.push(it);
  document.getElementById('iNameInp').value='';
  document.getElementById('iIcoInp').value='';
  document.getElementById('iCostInp').value='';
  document.getElementById('iPriceInp').value='';
  save();
  switchTab('shop'); // primero cambia el tab
  renderWithFlash(); // luego renderiza ya con el tab activo
  notif('▸ OBJETO AÑADIDO A LA TIENDA');
}

function toggleNameForm(){
  const box = document.getElementById('nameFormBox');
  const isOpen = box.style.display !== 'none';
  box.style.display = isOpen ? 'none' : 'block';
  if(!isOpen){
    const inp = document.getElementById('nameInp');
    inp.value = S.name || '';
    setTimeout(()=>inp.focus(),80);
  }
}

function saveName(){
  const n=document.getElementById('nameInp').value.trim();
  if(!n){notif('▸ INGRESA TU NOMBRE');return;}
  S.name=n.toUpperCase();
  document.getElementById('nameInp').value='';
  document.getElementById('nameFormBox').style.display='none';
  save(); renderWithFlash(); notif('▸ PERFIL ACTUALIZADO — '+S.name);
}

function saveRanks(){
  ['D','C','B','A','S'].forEach(r=>{
    const v=parseInt(document.getElementById('xp-'+r).value);
    if(v>0) XPR[r]=v;
  });
  S.xprConfig={...XPR};
  // update existing missions xp
  S.missions.forEach(m=>{m.xp=XPR[m.rank];});
  save(); renderWithFlash(); notif('◈ RANGOS ACTUALIZADOS ◈');
}

function saveMinBalance(){
  const inp = document.getElementById('minBalInp');
  if(!inp) return;
  const val = parseFloat(inp.value);
  S.minBalance = (!isNaN(val) && val >= 0) ? val : 0;
  save();
  updateMinBalStatus();
  notif('◈ TOPE MÍNIMO GUARDADO: '+(S.minBalance>0?formatCOP(S.minBalance):'SIN LÍMITE')+' ◈');
}

function updateMinBalStatus(){
  const el = document.getElementById('minBalStatus'); if(!el) return;
  const minBal = S.minBalance||0;
  const totalBal = getTotalBalance();
  if(minBal <= 0){
    el.style.display='none';
    return;
  }
  const free = totalBal - minBal;
  el.style.display='block';
  el.innerHTML = `<span style="color:var(--muted);font-size:calc(9px * var(--fs-scale));letter-spacing:1px;">ESTADO ACTUAL — </span>`
    +`Balance total: <span style="color:${totalBal>=0?'var(--green)':'var(--danger)'};font-family:'Orbitron',monospace;">${formatCOP(totalBal)}</span> &nbsp;|&nbsp; `
    +`Tope mínimo: <span style="color:var(--gold);font-family:'Orbitron',monospace;">${formatCOP(minBal)}</span> &nbsp;|&nbsp; `
    +`Disponible para gastar: <span style="color:${free>0?'var(--blue)':'var(--danger)'};font-family:'Orbitron',monospace;">${formatCOP(Math.max(0,free))}</span>`
    +(free<=0?` <span style="color:var(--danger);margin-left:6px;font-size:calc(9px * var(--fs-scale));">⚠ BLOQUEADO</span>`:'');
}

function resetAll(){
  if(confirm('¿Reiniciar TODO el sistema? Perderás todo el progreso permanentemente.')){
    if(currentUser) localStorage.removeItem(getUserKey(currentUser));
    S = defaultState();
    // Reset module-level UI state vars
    shopPeriod = 'day';
    currentPeriod = 'week';
    finPeriod = 'day';
    finType = 'expense';
    finCat = 'comida';
    editingMissionId = null;
    pendingId = null;
    _claimingDaily   = false;
    _claimingWeekly  = false;
    _claimingMonthly = false;
    save();
    switchTab('missions');
    renderWithFlash();
    notif('▸ SISTEMA REINICIADO');
  }
}

// ╔══════════════════════════════════════════════════════════════════════════╗

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §17 — VISION BOARD MISSIONS — Carga misiones desde las imágenes        ║
// ║  Propósito: Pre-carga misiones extraídas de las listas fotogr.          ║
// ║  Funciones: loadVisionBoardMissions()                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function loadVisionBoardMissions(){
  const VISION_MISSIONS = [

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  👨‍👩‍👧  FAMILIA — Guardián del Hogar                           ║
    // ╚══════════════════════════════════════════════════════════════╝
    // — Diario: hábitos de convivencia y cuidado cotidiano —
    { name:'Asear todo lo que usé hoy',               cat:'familia', rank:'D', freq:'daily',   fixed:false, visionImg:'familia.png',  desc:'Dejar cada cosa limpia y en su lugar. El orden es respeto.' },
    { name:'Lavar mi ropa al quitármela',             cat:'familia', rank:'D', freq:'daily',   fixed:true,  visionImg:'familia.png',  desc:'Hábito de higiene inmediata. Sin acumulación, sin excusas.' },
    { name:'Limpiar la zona de las mascotas',         cat:'familia', rank:'D', freq:'daily',   fixed:false, visionImg:'familia.png',  desc:'Cuidar a los perros también es cuidar el hogar.' },
    { name:'Barrer la casa',                          cat:'familia', rank:'D', freq:'daily',   fixed:false, visionImg:'familia.png',  desc:'Pequeño acto, gran impacto en el ambiente familiar.' },
    { name:'Tener una charla real en familia',        cat:'familia', rank:'C', freq:'daily',   fixed:true,  visionImg:'familia.png',  desc:'Conexión genuina, no solo convivencia. Pregunta, escucha, comparte.' },
    { name:'Comer en compañía',                       cat:'familia', rank:'C', freq:'daily',   fixed:false, visionImg:'familia.png',  desc:'La mesa es el espacio sagrado del Guardián.' },
    { name:'Invitar a paseo con las mascotas',        cat:'familia', rank:'C', freq:'daily',   fixed:false, visionImg:'familia.png',  desc:'Ejercicio, aire libre y vínculo. Triple victoria.' },
    // — Semanal: rituales de cohesión familiar —
    { name:'Cocinarles algo especial a la familia',   cat:'familia', rank:'B', freq:'weekly',  fixed:false, visionImg:'familia.png',  desc:'Cocinar para otros es un acto de amor concreto.' },
    { name:'Ver una película en familia',             cat:'familia', rank:'B', freq:'weekly',  fixed:false, visionImg:'familia.png',  desc:'Tiempo de calidad sin pantallas individuales. Todos en el mismo canal.' },
    { name:'Salir a caminar juntos',                  cat:'familia', rank:'B', freq:'weekly',  fixed:false, visionImg:'familia.png',  desc:'El movimiento compartido crea memorias.' },
    { name:'Lavar el baño a fondo',                   cat:'familia', rank:'C', freq:'weekly',  fixed:false, visionImg:'familia.png',  desc:'El Guardián mantiene el hogar digno para todos.' },
    { name:'Jugar un juego de mesa en familia',       cat:'familia', rank:'B', freq:'weekly',  fixed:false, visionImg:'familia.png',  desc:'Competencia sana, risas reales. Sin pantallas.' },
    // — Mensual: gestos que perduran —
    { name:'Obsequiar algo a alguien de la familia',  cat:'familia', rank:'A', freq:'monthly', fixed:false, visionImg:'familia.png',  desc:'No tiene que ser grande. Solo tiene que ser pensado.' },
    { name:'Asegurar insumos del plan familiar',      cat:'familia', rank:'B', freq:'monthly', fixed:true,  visionImg:'familia.png',  desc:'El Guardián anticipa. Nunca falta lo esencial.' },

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  💼  TRABAJO — Maestro en Formación                          ║
    // ╚══════════════════════════════════════════════════════════════╝
    // — Diario personal (aprendizaje y productividad) —
    { name:'Planear las actividades del día',          cat:'trabajo', rank:'C', freq:'daily',   fixed:true,  visionImg:'trabajo.png',  desc:'El Maestro no improvisa. Empieza el día con un mapa claro.' },
    { name:'Dividir cada tarea en pasos concretos',    cat:'trabajo', rank:'C', freq:'daily',   fixed:false, visionImg:'trabajo.png',  desc:'Los grandes objetivos se comen de a poco. Divide y conquista.' },
    { name:'Tomar notas de lo aprendido hoy',          cat:'trabajo', rank:'C', freq:'daily',   fixed:false, visionImg:'trabajo.png',  desc:'¿Qué aprendí? ¿Para qué sirve? ¿Cuándo lo uso? Escríbelo.' },
    { name:'Mejorar los nombres de variables/funciones', cat:'trabajo', rank:'D', freq:'daily', fixed:false, visionImg:'trabajo.png',  desc:'El código limpio es código que respeta a quien lo lee después.' },
    { name:'Tomar pausas cortas para no quemarte',     cat:'trabajo', rank:'D', freq:'daily',   fixed:false, visionImg:'trabajo.png',  desc:'La mente descansada rinde más. Pausa activa cada 90 min.' },
    { name:'Explicar el tema del día sin fórmulas',    cat:'trabajo', rank:'B', freq:'daily',   fixed:false, visionImg:'trabajo.png',  desc:'Si no puedes explicarlo simple, no lo entiendes aún.' },
    { name:'Mini reflexión al cerrar el día',          cat:'trabajo', rank:'D', freq:'daily',   fixed:true,  visionImg:'trabajo.png',  desc:'¿Qué salió bien? ¿Qué mejorar mañana? 3 minutos, máximo.' },
    // — Diario clase (docencia) —
    { name:'Resolver ejercicios de clase de varias formas', cat:'trabajo', rank:'B', freq:'daily', fixed:false, visionImg:'trabajo.png', desc:'Un buen Maestro muestra el camino, no solo la respuesta.' },
    { name:'Dividir la clase en inicio, desarrollo y cierre', cat:'trabajo', rank:'C', freq:'daily', fixed:false, visionImg:'trabajo.png', desc:'Estructura que el estudiante siente aunque no la vea.' },
    { name:'Celebrar un avance del estudiante hoy',    cat:'trabajo', rank:'C', freq:'daily',   fixed:false, visionImg:'trabajo.png',  desc:'El refuerzo positivo es la herramienta más poderosa del Maestro.' },
    { name:'Marcar con sello el trabajo del día',      cat:'trabajo', rank:'D', freq:'daily',   fixed:false, visionImg:'trabajo.png',  desc:'El ritual de cierre formaliza el esfuerzo del estudiante.' },
    // — Semanal —
    { name:'Planeación semanal completa de trabajo',   cat:'trabajo', rank:'B', freq:'weekly',  fixed:true,  visionImg:'trabajo.png',  desc:'Sin plan semanal, la semana te controla a ti.' },
    { name:'Diligenciar planeadores (bitácora + notas de clase)', cat:'trabajo', rank:'B', freq:'weekly', fixed:false, visionImg:'trabajo.png', desc:'El registro es la memoria del Maestro. Lo que no se escribe, se olvida.' },
    { name:'Verificar y organizar material de apoyo',  cat:'trabajo', rank:'C', freq:'weekly',  fixed:false, visionImg:'trabajo.png',  desc:'Recursos listos = clases fluidas = estudiantes que avanzan.' },
    { name:'Evaluación de temas estudiados esta semana', cat:'trabajo', rank:'A', freq:'weekly', fixed:false, visionImg:'trabajo.png', desc:'¿Realmente lo aprendí o solo lo ví? Autoevaluación honesta.' },
    { name:'Planear ejercicios para reforzar la semana anterior', cat:'trabajo', rank:'B', freq:'weekly', fixed:false, visionImg:'trabajo.png', desc:'La repetición espaciada es la ciencia del aprendizaje duradero.' },
    // — Mensual —
    { name:'Verificar cumplimiento de objetivos de trabajo', cat:'trabajo', rank:'A', freq:'monthly', fixed:false, visionImg:'trabajo.png', desc:'El Maestro mide. Lo que no se mide, no se mejora.' },
    { name:'Proponer premios personales por metas cumplidas', cat:'trabajo', rank:'B', freq:'monthly', fixed:false, visionImg:'trabajo.png', desc:'Recompénsate. El juego funciona cuando hay recompensa.' },

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  🏍️  VIAJES — Explorador sobre Ruedas                        ║
    // ╚══════════════════════════════════════════════════════════════╝
    // — Diario —
    { name:'Explorar un destino nuevo en el mapa',    cat:'viajes',  rank:'C', freq:'daily',   fixed:false, visionImg:'viajes_.png', desc:'El Explorador siempre tiene el siguiente destino en mente.' },
    { name:'Revisar la moto: aceite, llantas y frenos', cat:'viajes', rank:'B', freq:'daily',  fixed:true,  visionImg:'viajes_.png', desc:'La moto te lleva lejos. Cuídala antes de partir.' },
    { name:'Tener número de grúa o mecánico guardado', cat:'viajes', rank:'C', freq:'daily',   fixed:false, visionImg:'viajes_.png', desc:'El Explorador astuto siempre tiene un plan B en la carretera.' },
    // — Semanal —
    { name:'Definir fecha tentativa del próximo viaje', cat:'viajes', rank:'B', freq:'weekly', fixed:false, visionImg:'viajes_.png', desc:'Sin fecha, el viaje es solo un sueño. Con fecha, es un plan.' },
    { name:'Investigar hospedaje para el siguiente destino', cat:'viajes', rank:'C', freq:'weekly', fixed:false, visionImg:'viajes_.png', desc:'Hostal, hotel económico o Airbnb. El que mejor se adapte al viaje.' },
    { name:'Calcular presupuesto total del viaje planeado', cat:'viajes', rank:'B', freq:'weekly', fixed:false, visionImg:'viajes_.png', desc:'Viajar bien = viajar planeado. Sin números, hay sorpresas feas.' },
    { name:'Definir 3 actividades principales del destino', cat:'viajes', rank:'C', freq:'weekly', fixed:false, visionImg:'viajes_.png', desc:'No saturar el itinerario. Espacio para lo inesperado es lo mejor.' },
    { name:'Desconexión real: sin trabajo ni preocupaciones', cat:'viajes', rank:'A', freq:'weekly', fixed:false, visionImg:'viajes_.png', desc:'Viajar para escapar, no para llevar el trabajo encima.' },
    { name:'Planear alimentación en ruta',             cat:'viajes',  rank:'C', freq:'weekly',  fixed:false, visionImg:'viajes_.png', desc:'El Explorador come bien en el camino. Planearlo es parte del viaje.' },
    // — Mensual —
    { name:'Registrar el último viaje: bitácora y fotos', cat:'viajes', rank:'A', freq:'monthly', fixed:false, visionImg:'viajes_.png', desc:'Los recuerdos no registrados se pierden. Documenta tu aventura.' },
    { name:'Definir monto fijo mensual para escapadas', cat:'viajes', rank:'B', freq:'monthly', fixed:true,  visionImg:'viajes_.png', desc:'El fondo de aventuras no se toca. Es sagrado para el Explorador.' },
    { name:'Proponer premio por objetivos de viaje logrados', cat:'viajes', rank:'B', freq:'monthly', fixed:false, visionImg:'viajes_.png', desc:'Celebrar el viaje cumplido es parte del ritual del Explorador.' },

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  💚  SALUD — Sanador de Sí Mismo                             ║
    // ╚══════════════════════════════════════════════════════════════╝
    // — Diario: pilares biológicos (rank B/C — alto impacto, fixed) —
    { name:'Dormir 8 horas completas',                 cat:'salud',   rank:'B', freq:'daily',   fixed:true,  visionImg:'Salud.png',   desc:'El sueño es el superpoder gratuito. Sin él, todo lo demás falla.' },
    { name:'Hidratarme: mínimo 2 litros de agua',     cat:'salud',   rank:'D', freq:'daily',   fixed:true,  visionImg:'Salud.png',   desc:'Simple. Poderoso. Infravalorado. Agua primero.' },
    { name:'Comer mínimo 3 veces al día',             cat:'salud',   rank:'C', freq:'daily',   fixed:true,  visionImg:'Salud.png',   desc:'El cuerpo funciona con combustible regular. No te saltes comidas.' },
    { name:'Comer una fruta hoy',                     cat:'salud',   rank:'D', freq:'daily',   fixed:false, visionImg:'Salud.png',   desc:'Una fruta. Solo una. El Sanador cuida sus micronutrientes.' },
    { name:'Higiene personal completa: piel, dientes, cuerpo', cat:'salud', rank:'D', freq:'daily', fixed:true, visionImg:'Salud.png', desc:'Bloqueador solar, cepillo de dientes, ducha. Sin negociación.' },
    { name:'Cortar pantallas 30 min antes de dormir', cat:'salud',   rank:'C', freq:'daily',   fixed:false, visionImg:'Salud.png',   desc:'La luz azul sabotea tu sueño. El Sanador protege su recuperación.' },
    // — Diario: mente y movimiento —
    { name:'Ejercicio del día',                        cat:'guerrero', rank:'B', freq:'daily',  fixed:true,  visionImg:'Salud.png',   desc:'El cuerpo es el templo. Moverlo es obligatorio, no opcional.' },
    { name:'Meditación: mínimo 10 minutos',           cat:'mental',  rank:'C', freq:'daily',   fixed:true,  visionImg:'Salud.png',   desc:'Callar el ruido interno es el entrenamiento más difícil.' },
    { name:'Llenar el diario personal',               cat:'habitos', rank:'C', freq:'daily',   fixed:false, visionImg:'Salud.png',   desc:'Escribir lo que siento me permite verlo con claridad.' },
    { name:'Leer al menos 15 minutos',                cat:'lectura', rank:'C', freq:'daily',   fixed:false, visionImg:'Salud.png',   desc:'15 minutos al día = 20 libros al año. El tiempo está ahí.' },
    { name:'Solucionar un problema de lógica',        cat:'estudio', rank:'B', freq:'daily',   fixed:false, visionImg:'Salud.png',   desc:'El cerebro también necesita ejercicio. Dáselo.' },
    { name:'Estudiar un tema definido ayer',          cat:'estudio', rank:'B', freq:'daily',   fixed:false, visionImg:'Salud.png',   desc:'Aprendizaje intencional. El tema elegido anoche, ejecutado hoy.' },
    { name:'Actuar como la persona que quiero ser',   cat:'habitos', rank:'A', freq:'daily',   fixed:true,  visionImg:'Salud.png',   desc:'La identidad se construye con acciones, no con intenciones.' },
    // — Semanal —
    { name:'Buscar info de salud mental y aplicarla a tu meditación', cat:'mental', rank:'B', freq:'weekly', fixed:false, visionImg:'Salud.png', desc:'La meditación informada es más poderosa que la intuitiva.' },
    { name:'Planeación semanal de ejercicios',        cat:'guerrero', rank:'B', freq:'weekly', fixed:false, visionImg:'Salud.png',   desc:'Sin plan de entrenamiento, el cuerpo improvisa. El Sanador no.' },
    { name:'Planeación de actividades de la semana',  cat:'habitos', rank:'B', freq:'weekly',  fixed:true,  visionImg:'Salud.png',   desc:'El Sanador organiza su semana antes de que la semana lo organice a él.' },
    { name:'Evaluación de temas aprendidos esta semana', cat:'estudio', rank:'B', freq:'weekly', fixed:false, visionImg:'Salud.png', desc:'¿Qué aprendí realmente? ¿Qué quedó pendiente?' },
    // — Mensual —
    { name:'Verificar si cumplí mis objetivos de salud', cat:'salud',  rank:'A', freq:'monthly', fixed:false, visionImg:'Salud.png',  desc:'El Sanador se audita. Lo que no se revisa, no mejora.' },
    { name:'Proponer premios por objetivos de salud cumplidos', cat:'salud', rank:'B', freq:'monthly', fixed:false, visionImg:'Salud.png', desc:'El sistema de recompensas funciona. Actívalo.' },
    { name:'Cuestionar: ¿mis propósitos reflejan quien quiero ser?', cat:'habitos', rank:'S', freq:'monthly', fixed:true, visionImg:'Salud.png', desc:'Misión de reflexión profunda. Solo una vez al mes, pero cuenta más.' },

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  🎨  HOBBIES — Bardo en Expansión                            ║
    // ╚══════════════════════════════════════════════════════════════╝
    // — Diario: micro-dosis creativas —
    { name:'Descubrir una canción nueva hoy',          cat:'creatividad', rank:'D', freq:'daily',  fixed:false, visionImg:'hobbies.png', desc:'Un Bardo siempre tiene la playlist en expansión.' },
    { name:'Hacer un origami',                         cat:'creatividad', rank:'C', freq:'daily',  fixed:false, visionImg:'hobbies.png', desc:'Las manos que crean formas entrenan la mente que resuelve problemas.' },
    { name:'Jugar una partida de ajedrez',             cat:'habitos',     rank:'C', freq:'daily',  fixed:false, visionImg:'hobbies.png', desc:'Táctica, paciencia y visión. El tablero es el mejor gimnasio mental.' },
    { name:'Paseo corto con los perros',               cat:'habitos',     rank:'C', freq:'daily',  fixed:false, visionImg:'hobbies.png', desc:'Movimiento + mascotas = descanso real de la mente.' },
    { name:'Escribir algo creativo hoy (texto libre)', cat:'creatividad', rank:'C', freq:'daily',  fixed:false, visionImg:'hobbies.png', desc:'Una idea, un párrafo, una historia corta. Sin filtros, solo flujo.' },
    { name:'Ver un capítulo de una serie',             cat:'habitos',     rank:'D', freq:'daily',  fixed:false, visionImg:'hobbies.png', desc:'Ocio consciente. El Bardo también descansa y se inspira.' },
    { name:'Leer sobre algo práctico y útil',          cat:'lectura',     rank:'C', freq:'daily',  fixed:false, visionImg:'hobbies.png', desc:'El conocimiento aplicado vale más que el teórico.' },
    // — Semanal: proyectos creativos de mayor profundidad —
    { name:'Cocinar un platillo nuevo o diferente',    cat:'creatividad', rank:'B', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'La cocina es alquimia. Experimenta, crea, disfruta.' },
    { name:'Pintar un cuadro o dibujar algo',          cat:'creatividad', rank:'B', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'El Bardo plasma su mundo interior en formas y colores.' },
    { name:'Practicar un paso de baile nuevo',         cat:'creatividad', rank:'B', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'El cuerpo también tiene su lenguaje creativo. Úsalo.' },
    { name:'Jugar un videojuego con intención',        cat:'habitos',     rank:'C', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'No es tiempo perdido si lo elegiste conscientemente.' },
    { name:'Practicar instrumento musical',            cat:'creatividad', rank:'A', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'La música es el lenguaje que el Bardo domina con el tiempo.' },
    { name:'Tallar una figura en madera',              cat:'creatividad', rank:'A', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'Arte táctil. Lento. Meditativo. Completamente tuyo.' },
    { name:'Construir, reparar o planear un invento',  cat:'creatividad', rank:'A', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'El Bardo que inventa cruza la frontera hacia el ingeniero.' },
    { name:'Ver una película elegida con criterio',    cat:'habitos',     rank:'C', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'El cine bien elegido educa, inspira y expande perspectiva.' },
    { name:'Buscar nuevos pasatiempos y crear una lista', cat:'creatividad', rank:'B', freq:'weekly', fixed:false, visionImg:'hobbies.png', desc:'El Bardo siempre está buscando la siguiente pasión.' },
    // — Mensual —
    { name:'Crear presupuesto para insumos de hobbies', cat:'creatividad', rank:'B', freq:'monthly', fixed:false, visionImg:'hobbies.png', desc:'Los hobbies cuestan. Planificarlos es respetarlos.' },
    { name:'Proponer premios por hobbies completados',  cat:'creatividad', rank:'B', freq:'monthly', fixed:false, visionImg:'hobbies.png', desc:'Celebrar la creación da energía para seguir creando.' },
    { name:'Relacionar mis intereses con amigos',       cat:'creatividad', rank:'A', freq:'monthly', fixed:false, visionImg:'hobbies.png', desc:'Los hobbies compartidos son vínculos que duran.' },

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  🏆  LOGROS — Campeón con Mapa Financiero                    ║
    // ╚══════════════════════════════════════════════════════════════╝
    // — Diario —
    { name:'Avanzar en el tecnólogo: tarea del día',   cat:'logros',  rank:'A', freq:'daily',   fixed:true,  visionImg:'Logros.png',  desc:'La graduación no es un evento, es la suma de días como hoy.' },
    // — Semanal —
    { name:'Buscar ofertas de empleo en mi área',      cat:'logros',  rank:'A', freq:'weekly',  fixed:false, visionImg:'Logros.png',  desc:'El contrato laboral soñado requiere búsqueda activa, no espera pasiva.' },
    // — Mensual: metas financieras concretas (rank según urgencia/impacto) —
    { name:'Pagar cuota de la moto este mes',          cat:'logros',  rank:'S', freq:'monthly', fixed:true,  visionImg:'Logros.png',  desc:'⭐ MISIÓN PRIORITARIA. La moto es el vehículo de tu libertad.' },
    { name:'Abonar a deuda de tarjeta',                cat:'logros',  rank:'A', freq:'monthly', fixed:true,  visionImg:'Logros.png',  desc:'Cada abono reduce el peso financiero. La deuda no descansa, el Campeón tampoco.' },
    { name:'Apartar cuota del impuesto predial',       cat:'logros',  rank:'A', freq:'monthly', fixed:false, visionImg:'Logros.png',  desc:'Pagar impuestos a tiempo evita multas. El Campeón se adelanta.' },
    { name:'Apartar cuota para el SOAT',               cat:'logros',  rank:'B', freq:'monthly', fixed:false, visionImg:'Logros.png',  desc:'El SOAT no es opcional. Separa la cuota mensual, no el dolor anual.' },
    { name:'Apartar cuota para Tecnomecánica',         cat:'logros',  rank:'B', freq:'monthly', fixed:false, visionImg:'Logros.png',  desc:'La Tecno es una vez al año pero cuesta. Cuota mensual = sin sorpresas.' },
    { name:'Aportar al ahorro colchón de seguridad',   cat:'logros',  rank:'S', freq:'monthly', fixed:false, visionImg:'Logros.png',  desc:'El colchón de ahorro te protege de las crisis. Es el escudo del Campeón.' },
    { name:'Hacer el presupuesto mensual de compras',  cat:'logros',  rank:'B', freq:'monthly', fixed:true,  visionImg:'Logros.png',  desc:'Sin presupuesto, el dinero simplemente desaparece. Con él, tú decides.' },
    { name:'Avanzar en inscripción a U virtual',       cat:'logros',  rank:'S', freq:'monthly', fixed:false, visionImg:'Logros.png',  desc:'La educación superior es la inversión con mayor retorno. Inscríbete.' },
    { name:'Revisar pago a madre (cuota mensual)',     cat:'logros',  rank:'A', freq:'monthly', fixed:true,  visionImg:'Logros.png',  desc:'Compromiso familiar y financiero. El Campeón cumple su palabra.' },
  ];

  const added = [];
  const today = new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'});
  VISION_MISSIONS.forEach(vm => {
    // Avoid duplicates by name
    if(S.missions.find(m => m.name === vm.name)) return;
    S.missions.push({
      id: 'm'+S.nMid++,
      name: vm.name,
      desc: vm.desc || '',
      cat: vm.cat,
      rank: vm.rank,
      xp: XPR[vm.rank],
      done: false,
      fixed: vm.fixed || false,
      freq: vm.freq || 'daily',
      visionImg: vm.visionImg || '',
      createdDate: today,
      lastDoneDate: null,
      updatedAt: Date.now()
    });
    added.push(vm.name);
  });

  if(!added.length){
    notif('⚠ Todas las misiones ya estaban cargadas');
    return;
  }

  S.dailyAssigned = null;
  assignDailyMissions();
  save();
  switchTab('missions');
  renderWithFlash();
  notif('🖼️ ' + added.length + ' MISIONES CARGADAS DESDE VISION BOARD ◈');
}

// ── toggleVisionBoardField — muestra/oculta campo de URL en categoría vision board ──
function toggleVisionBoardField(cat){
  const row = document.getElementById('visionBoardRow');
  if(row) row.style.display = (cat === 'visionboard') ? 'flex' : 'none';
}

// ── toggleFavorite — marca/desmarca misión como favorita ──
function toggleFavorite(id, event){
  if(event){ event.stopPropagation(); }
  const m = S.missions.find(m=>m.id===id);
  if(!m) return;
  m.favorite = !m.favorite;
  save();
  renderAllQuests();
  renderDailyMissions();
}
