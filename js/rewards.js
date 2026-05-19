// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §06 — XP / LEVEL SYSTEM                                                ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Gestiona la ganancia/pérdida de XP, subida de nivel y      ║
// ║  cálculo del rango actual del jugador.                                  ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · gainXP(amt)                                                          ║
// ║       Suma amt a totalXP, todayXP y curXP.                             ║
// ║       amt negativo: nunca baja totalXP por debajo de 0.                 ║
// ║       Loop de nivel: mientras curXP >= nextXP → lvl++,                 ║
// ║         curXP -= nextXP, nextXP = floor(nextXP * 1.42), doFlash().     ║
// ║       Si curXP queda negativo tras restar, se fuerza a 0.              ║
// ║                                                                          ║
// ║   · doFlash()                                                            ║
// ║       Añade clase 'show' a #lvlf (overlay de subida de nivel) 700ms.  ║
// ║       Llama notif() con el nuevo nivel alcanzado.                       ║
// ║                                                                          ║
// ║   · getRank() → string                                                  ║
// ║       Itera PRANK (§01) y devuelve el rango más alto que S.lvl supera. ║
// ║       Ej: lvl 12 → 'RANGO C', lvl 50 → 'RANGO S'.                    ║
// ║                                                                          ║
// ║  Fórmula de escalado: nextXP crece x1.42 por nivel (≈ exponencial).   ║
// ║  HTML relacionado: #lvlf (flash overlay), #plvlnum (número de nivel)   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
// XP / NIVEL
// ═══════════════════════════════════════════════════════
function gainXP(amt){
  // Guard: don't let totals go below zero
  if(amt < 0){
    amt = -Math.min(-amt, S.totalXP); // can't lose more than what we have
  }
  S.totalXP = Math.max(0, S.totalXP + amt);
  S.todayXP = Math.max(0, S.todayXP + amt);
  S.curXP  += amt;
  // shopXP espeja totalXP: crece con misiones, baja si se desmarca una misión,
  // pero NUNCA baja de 0 y NO se toca al comprar en tienda.
  S.shopXP = Math.max(0, (S.shopXP || 0) + amt);
  // Level up loop — usa totalXP/curXP, no shopXP
  while(S.curXP >= S.nextXP && S.nextXP > 0){
    S.curXP -= S.nextXP; S.lvl++;
    S.nextXP = Math.floor(S.nextXP * 1.42);
    doFlash();
  }
  if(S.curXP < 0) S.curXP = 0;
}
function doFlash(){
  const f=document.getElementById('lvlf');
  if(f){ f.classList.add('show'); setTimeout(()=>f.classList.remove('show'),700); }
  notif('▸ ¡NIVEL ALCANZADO! — LV.'+S.lvl+' ◂');
  if(typeof FX !== 'undefined') FX.levelUp(S.lvl);
}
function getRank(){
  let r=PRANK[0];
  for(const p of PRANK){if(S.lvl>=p.lvl)r=p;}
  return r.r;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §07 — CLASS DETECTION                                                  ║
// ║  Propósito: Determina la clase activa del jugador según la categoría    ║
// ║  con más misiones completadas en los últimos 7 días.                    ║
// ║  Funciones: getWeeklyCatCounts(), detectClass(), updateClassUI()        ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function getWeeklyCatCounts(){
  if(!S.dailyLog || !S.dailyLog.length) return {};
  const now = new Date();
  const cutoff = new Date(now); cutoff.setDate(now.getDate() - 7);
  const cutoffStr = localISO(cutoff);
  const totals = {};
  S.dailyLog
    .filter(e => e.date >= cutoffStr)
    .forEach(e => {
      if(!e.cats) return;
      Object.entries(e.cats).forEach(([cat, n]) => {
        totals[cat] = (totals[cat] || 0) + (n || 0);
      });
    });
  return totals;
}

function detectClass(){
  const counts = getWeeklyCatCounts();
  if(!Object.keys(counts).length) return null;

  let top = null, topN = 0;
  for(const [cat, n] of Object.entries(counts)){
    if(n > topN){ topN = n; top = cat; }
  }

  if(!top || topN < 1) return null;
  return CLASSES[top] ? { ...CLASSES[top], cat: top, weeklyCount: topN } : null;
}

let _lastAvatarCat = null; // Para detectar cambio de categoría dominante
let _avatarCatInitialized = false; // FIX-BUG-AVATARCAT: evita notif espuria en el primer render tras recarga


let _achievExpanded = false;

function _buildAchievCard(a){
  const done = evalAchievement(a);
  const prog = getAchievProgress(a);
  const pct  = a.type==='custom' ? (done?100:0) : Math.min(100,Math.round((prog.cur/prog.max)*100));
  const clickAttr = a.type==='custom'
    ? `onclick="toggleCustomAchiev('${escH(a.id)}')" style="cursor:pointer;"`
    : '';
  return `<div class="achiev-card${done?' done':''}" ${clickAttr}>
    <div class="achiev-card-ico">${done?(a.ico||'⭐'):'🔒'}</div>
    <div class="achiev-card-name">${escH(a.name)}</div>
    <div class="achiev-card-desc">${escH(a.desc)}</div>
    <div class="achiev-card-pbar"><div class="achiev-card-pfill" style="width:${pct}%"></div></div>
    <div class="achiev-card-prog">${a.type==='custom'?(done?'✓ LOGRADO':'● MARCAR'):(prog.cur+'/'+prog.max)}</div>
  </div>`;
}

function renderAchievements(){
  const el = document.getElementById('achievList'); if(!el) return;
  if(!S.achievements||!S.achievements.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);padding:16px;font-size:11px;">Sin logros configurados. Añade en CONFIGURAR.</div>';
    return;
  }
  const all      = S.achievements;
  const total    = all.length;
  const unlocked = all.filter(a=>evalAchievement(a)).length;
  const doneList = all.filter(a=>evalAchievement(a));
  let show3;
  if(doneList.length>0){
    show3 = doneList.slice(-3);
  } else {
    show3 = [...all].sort((a,b)=>{
      const pa=getAchievProgress(a), pb=getAchievProgress(b);
      return (pb.cur/pb.max)-(pa.cur/pa.max);
    }).slice(0,3);
  }
  const visibleList = _achievExpanded ? all : show3;
  const hidden = total - show3.length;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:calc(10px * var(--fs-scale));color:var(--muted);">${unlocked} / ${total} desbloqueados</span>
      ${hidden>0||_achievExpanded?`<button class="achiev-expand-btn" onclick="_achievExpanded=!_achievExpanded;renderAchievements()">${_achievExpanded?'− Ocultar':'+ Ver todos ('+total+')'}</button>`:''}
    </div>
    <div class="achiev-card-grid">${visibleList.map(_buildAchievCard).join('')}</div>
    ${!_achievExpanded&&doneList.length===0?'<div style="text-align:center;color:var(--muted);font-size:calc(9px * var(--fs-scale));padding:4px 0 8px;">Estos son tus próximos logros por desbloquear 🎯</div>':''}
  `;
}

// FIX-BUG-CUSTOM: toggle manual para logros de tipo 'custom'.
// Invierte a.customDone y guarda. evalAchievement() lo lee con !!a.customDone.
function toggleCustomAchiev(id){
  if(!S.achievements) return;
  const a = S.achievements.find(x=>x.id===id);
  if(!a || a.type!=='custom') return;
  a.customDone = !a.customDone;
  save();
  renderAchievements();
  notif(a.customDone ? '✓ LOGRO MARCADO: '+a.name : '○ LOGRO DESMARCADO: '+a.name);
}

// ─── EDITOR DE LOGROS EN CONFIGURACIÓN ───
function renderAchievEditor(){
  const el = document.getElementById('achievEditor'); if(!el) return;
  if(!S) return;
  if(!S.achievements) S.achievements=defaultAchievements();
  el.innerHTML = S.achievements.map((a,i)=>`
    <div class="achiev-edit-row">
      <div class="ep-wrap" style="position:relative;">
        <div style="display:flex;gap:4px;align-items:center;">
          <input id="achiev-ico-${i}" value="${escH(a.ico||'')}" style="background:rgba(0,10,30,0.9);border:1px solid rgba(0,100,200,0.25);color:var(--bright);padding:4px;font-size:calc(18px * var(--fs-scale));text-align:center;width:100%;outline:none;cursor:text;" oninput="updateAchiev(${i},'ico',this.value)" maxlength="4" placeholder="🏆">
          <button type="button" onclick="epBind('ep-achiev-${i}','achiev-ico-${i}');epToggle('ep-achiev-${i}');" style="background:none;border:1px solid rgba(0,170,255,0.3);color:var(--blue);font-size:12px;padding:3px 6px;cursor:pointer;white-space:nowrap;flex-shrink:0;" title="Elegir emoji">😀</button>
        </div>
        <div class="ep-panel" id="ep-achiev-${i}">
          <input class="ep-search" placeholder="🔍 Buscar..." oninput="epSearch(this,'ep-achiev-${i}')" autocomplete="off">
          <div class="ep-cats" id="ep-achiev-${i}-cats"></div>
          <div class="ep-grid" id="ep-achiev-${i}-grid"></div>
        </div>
      </div>
      <input value="${escH(a.name)}" style="background:rgba(0,10,30,0.9);border:1px solid rgba(0,100,200,0.25);color:var(--bright);padding:6px 8px;font-size:calc(12px * var(--fs-scale));width:100%;font-family:'Rajdhani',sans-serif;outline:none;" oninput="updateAchiev(${i},'name',this.value)" placeholder="Nombre del logro">
      <input value="${escH(a.desc)}" data-field="desc" style="background:rgba(0,10,30,0.9);border:1px solid rgba(0,100,200,0.25);color:var(--bright);padding:6px 8px;font-size:calc(11px * var(--fs-scale));width:100%;font-family:'Rajdhani',sans-serif;outline:none;" oninput="updateAchiev(${i},'desc',this.value)" placeholder="Descripción">
      <select style="background:rgba(0,10,30,0.9);border:1px solid rgba(0,100,200,0.25);color:var(--bright);padding:5px 6px;font-size:calc(11px * var(--fs-scale));width:100%;outline:none;font-family:'Rajdhani',sans-serif;" onchange="updateAchievType(${i},this.value)">
        <option value="totalComp" ${a.type==='totalComp'?'selected':''}>Total misiones</option>
        <option value="streak"    ${a.type==='streak'?'selected':''}>Racha días</option>
        <option value="level"     ${a.type==='level'?'selected':''}>Nivel</option>
        <option value="totalXP"   ${a.type==='totalXP'?'selected':''}>XP total</option>
        <option value="catMax"    ${a.type==='catMax'?'selected':''}>Cat. dominante</option>
        <option value="redeem"    ${a.type==='redeem'?'selected':''}>Canjes</option>
        <option value="custom"    ${a.type==='custom'?'selected':''}>Manual</option>
      </select>
      <button onclick="delAchiev(${i})" style="background:none;border:1px solid rgba(255,70,102,.3);color:rgba(255,70,102,.6);cursor:pointer;font-size:calc(12px * var(--fs-scale));padding:4px;font-family:'Rajdhani',sans-serif;width:100%;">✕</button>
    </div>
    ${a.type!=='custom'&&a.type!=='redeem'?`<div class="achiev-target-row">
      <span>META:</span>
      <input type="number" value="${a.target||1}" min="1" oninput="updateAchiev(${i},'target',parseInt(this.value)||1)">
    </div>`:''}
  `).join('');
}

function updateAchiev(i,field,val){
  if(!S.achievements[i]) return;
  S.achievements[i][field]=val;
  save();
}

function updateAchievType(i,val){
  if(!S.achievements[i]) return;
  S.achievements[i].type=val;
  if(val==='redeem'||val==='custom') S.achievements[i].target=1;
  save(); renderAchievEditor();
}

function delAchiev(i){
  S.achievements.splice(i,1);
  save(); renderAchievEditor();
}

function addAchiev(){
  const n=document.getElementById('aNameInp').value.trim();
  if(!n){notif('▸ INGRESA UN NOMBRE PARA EL LOGRO');return;}
  const type=document.getElementById('aTypeInp').value;
  const needsTarget=type!=='redeem'&&type!=='custom';
  const target=needsTarget?(parseInt(document.getElementById('aTargetInp').value)||10):1;
  if(!S.achievements) S.achievements=[];
  S.achievements.push({
    id:'a'+Date.now(),
    ico:document.getElementById('aIcoInp').value.trim()||'⭐',
    name:n,
    desc:document.getElementById('aDescInp').value.trim(),
    type, target
  });
  document.getElementById('aNameInp').value='';
  document.getElementById('aDescInp').value='';
  document.getElementById('aIcoInp').value='⭐';
  document.getElementById('aTargetInp').value='1';
  save();
  renderAchievEditor();
  notif('▸ LOGRO AÑADIDO: '+n);
}

function aTypeChange(val){
  const row=document.getElementById('aTargetRow');
  if(row) row.style.display=(val==='redeem'||val==='custom')?'none':'block';
}

