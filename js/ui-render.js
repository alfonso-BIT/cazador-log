// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ui-render.js — §10 MAIN RENDER · §11 DAILY MISSIONS · §12 ALL QUESTS ║
// ║  Exporta: render(), renderWithFlash(), renderDailyMissions(),           ║
// ║           renderMissionCard(), renderAllQuests()                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §10 — MAIN RENDER                                                      ║
// ║  Propósito: Orquesta el re-dibujado completo del estado de la UI.       ║
// ║  Actualiza player card, XP, stats, tabs activos y todos los módulos.    ║
// ║  Funciones: render(), switchTab(), tick(), toggleAllQuests(),           ║
// ║             escH(), localISO()                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function render(){
  if(!S) return;
  // ── Player card ──
  document.getElementById('pname').textContent = currentUser ? currentUser.toUpperCase() : (S.name || 'CAZADOR');
  document.getElementById('plvl').textContent='LV.'+S.lvl;
  document.getElementById('prank').textContent=getRank();
  // ── Balance en player card ──
  const pcardBal = document.getElementById('pcardBalance');
  if(pcardBal){
    const bal = getTotalBalance();
    if(S.transactions && S.transactions.length > 0){
      pcardBal.style.display = 'block';
      pcardBal.textContent = (bal >= 0 ? '▲ ' : '▼ ') + formatCOP(Math.abs(bal));
      pcardBal.style.color = bal >= 0 ? 'var(--green)' : 'var(--danger)';
    } else {
      pcardBal.style.display = 'none';
    }
  }
  const pct=Math.min(100,Math.round((S.curXP/S.nextXP)*100));
  document.getElementById('xpbar').style.width=pct+'%';
  document.getElementById('xpdisp').textContent=S.curXP+' / '+S.nextXP+' XP';
  document.getElementById('stTotal').textContent=S.totalXP;
  document.getElementById('stStreak').textContent=S.streak;
  document.getElementById('stComp').textContent=S.totalComp;
  document.getElementById('todayxp').textContent='+'+S.todayXP;
  // ── ShopXP display en pestaña tienda ──
  const shopXPEl = document.getElementById('shopXPDisplay');
  if(shopXPEl) shopXPEl.textContent = S.shopXP || 0;
  const shopTotalEl = document.getElementById('shopTotalXPDisplay');
  if(shopTotalEl) shopTotalEl.textContent = S.totalXP;
  // ── Config inputs ──
  ['D','C','B','A','S'].forEach(r=>{
    const el=document.getElementById('xp-'+r);
    if(el) el.value=XPR[r];
  });
  const mbInp = document.getElementById('minBalInp');
  if(mbInp) mbInp.value = S.minBalance||0;
  updateMinBalStatus();
  updateResetUI();
  updateClassUI();
  // ── Misiones: solo cuando el tab activo las muestra ──────────────────────
  // renderDailyMissions/Weekly/Monthly escriben en elementos del tab missions.
  // Llamarlos en cada renderWithFlash() desde shop/dinero/biblioteca es trabajo
  // innecesario. Los elementos existen en el DOM, pero no están visibles.
  const activeTab = S.activeTab || 'missions';
  if(activeTab === 'missions' || activeTab === 'allquests'){
    renderDailyMissions();
    renderWeeklyMission();
    renderMonthlyMission();
  }
  // ── Renders condicionales por tab activo ──
  if(activeTab === 'missions')   renderAllQuests();
  if(activeTab === 'shop')       renderShop();
  if(activeTab === 'inventory')  renderInventory();
  if(activeTab === 'perfil')     renderPerfil();
  if(activeTab === 'dinero')     renderFinTab();
  if(activeTab === 'config')     renderAchievEditor();
  if(activeTab === 'biblioteca') renderBiblioteca();
  if(activeTab === 'datos')      renderDatosTab();
  // ── Mood siempre visible en el tab de misiones ──
  renderMoodWidget();
}

// ── renderWithFlash: igual que render() pero añade destello visual ──────────
// Llámalo desde botones de acción (toggle, save, del, add, confirm…) para que
// el usuario note inmediatamente que el estado cambió.
function renderWithFlash(){
  render();
  const wrap = document.querySelector('.wrap');
  if(!wrap) return;
  wrap.classList.remove('action-flash');
  // Forzar reflow para reiniciar la animación si se llama varias veces seguidas
  void wrap.offsetWidth;
  wrap.classList.add('action-flash');
  wrap.addEventListener('animationend', () => wrap.classList.remove('action-flash'), { once: true });
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §11 — DAILY MISSIONS RENDER                                            ║
// ║  Propósito: Renderiza las 4 misiones diarias y sus tarjetas.            ║
// ║  El botón 🔀 llama swapDailyMission() para rotar sin borrar del banco.  ║
// ║  Funciones: renderDailyMissions(), renderMissionCard()                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function renderDailyMissions(){
  const el=document.getElementById('mlist');
  if(!el) return;
  const daily=getDailyMissions();
  const progtxt=document.getElementById('progtxt');
  const cb=document.getElementById('claimbtn');
  const dailySection=document.getElementById('daily-section');

  // Si todas completadas Y recompensa ya reclamada → ocultar sección de misiones diarias
  const allDone=daily.length>0&&daily.every(m=>m.done);
  const completed=allDone&&S.claimed;
  if(dailySection) dailySection.style.display=completed?'none':'';

  if(!daily.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);padding:28px;font-size:calc(12px * var(--fs-scale));letter-spacing:2px;">SIN MISIONES — AÑADE EN CONFIGURAR</div>';
    if(progtxt) progtxt.textContent='0 / 0 misiones mínimas completadas';
    if(cb) cb.disabled=true;
    return;
  }
  el.innerHTML=daily.map(m=>renderMissionCard(m,true)).join('');
  const done=daily.filter(m=>m.done).length;
  if(progtxt) progtxt.textContent=done+' / '+daily.length+' misiones mínimas completadas';
  if(cb){
    cb.disabled=!allDone||S.claimed;
    cb.textContent=S.claimed?'◈ RECOMPENSA YA RECLAMADA HOY ◈':'◈ RECLAMAR RECOMPENSA DIARIA ◈';
  }
}

function renderWeeklyMission(){
  const el = document.getElementById('weekly-mlist');
  const sec = document.getElementById('weekly-section');
  if(!el || !sec) return;
  const m = getWeeklyMission();
  const done = !!m?.weeklyDone;
  const claimed = !!S.weeklyClaimed;
  // Ocultar sección si no hay misión O si ya fue completada Y el bonus ya fue reclamado
  if(!m || (done && claimed)){
    sec.style.display = 'none';
    return;
  }
  sec.style.display = '';
  const xp = XPR[m.rank] || 10;
  const ico = CAT_LABELS[m.cat]||'⚡';
  const mult = S.streak > 0 ? 1.0 : 0.5;
  const bonus = Math.floor(xp * mult);
  const multLbl = S.streak > 0 ? '🔥 x1.0 racha' : 'x0.5 sin racha';
  const btn = document.getElementById('weekly-claimbtn');
  if(btn){
    btn.disabled = !done || claimed;
    btn.textContent = claimed
      ? '◈ RECOMPENSA YA RECLAMADA ◈'
      : `◈ RECLAMAR +${bonus} XP BONUS [${multLbl}] ◈`;
  }
  el.innerHTML = `
<div class="mcard ${done?'done':''}" id="mc-weekly-${m.id}">
  <div class="mtop">
    <div class="mchk ${done?'yes':''}" onclick="toggleWeekly()">${done?'✓':''}</div>
    <div class="mcontent">
      <div class="mname">${escH(m.name)}</div>
      ${m.desc?`<div class="mdesc">${escH(m.desc)}</div>`:''}
      <div class="mfoot">
        <span class="mxp">+${xp} XP</span>
        <span class="mrnk r${m.rank.toLowerCase()}">${m.rank}-RANK</span>
        <span class="mtype">${ico}</span>
        <span style="font-size:calc(9px * var(--fs-scale));padding:2px 6px;border-radius:3px;background:rgba(251,191,36,0.6);color:#fff;letter-spacing:1px;font-family:'Orbitron',monospace;">📆 Semanal</span>
        <span style="font-size:calc(9px * var(--fs-scale));padding:2px 6px;border-radius:3px;background:rgba(30,30,60,0.7);color:${S.streak>0?'#fbbf24':'#94a3b8'};letter-spacing:1px;font-family:'Orbitron',monospace;" title="Bonus al reclamar">BONUS ${multLbl}</span>
        <div class="mactions">
          ${done ? '' : '<button class="act-btn swap" onclick="swapWeeklyMission(event)" title=\"🔀 Cambiar misión semanal\">🔀</button>'}
        </div>
      </div>
    </div>
  </div>
</div>`;
}

function renderMonthlyMission(){
  const el = document.getElementById('monthly-mlist');
  const sec = document.getElementById('monthly-section');
  if(!el || !sec) return;
  const m = getMonthlyMission();
  const done = !!m?.monthlyDone;
  const claimed = !!S.monthlyClaimed;
  // Ocultar sección si no hay misión O si ya fue completada Y el bonus ya fue reclamado
  if(!m || (done && claimed)){
    sec.style.display = 'none';
    return;
  }
  sec.style.display = '';
  const xp = XPR[m.rank] || 10;
  const ico = CAT_LABELS[m.cat]||'⚡';
  const mult = S.streak > 0 ? 1.0 : 0.5;
  const bonus = Math.floor(xp * mult);
  const multLbl = S.streak > 0 ? '🔥 x1.0 racha' : 'x0.5 sin racha';
  const btn = document.getElementById('monthly-claimbtn');
  if(btn){
    btn.disabled = !done || claimed;
    btn.textContent = claimed
      ? '◈ RECOMPENSA YA RECLAMADA ◈'
      : `◈ RECLAMAR +${bonus} XP BONUS [${multLbl}] ◈`;
  }
  el.innerHTML = `
<div class="mcard ${done?'done':''}" id="mc-monthly-${m.id}">
  <div class="mtop">
    <div class="mchk ${done?'yes':''}" onclick="toggleMonthly()">${done?'✓':''}</div>
    <div class="mcontent">
      <div class="mname">${escH(m.name)}</div>
      ${m.desc?`<div class="mdesc">${escH(m.desc)}</div>`:''}
      <div class="mfoot">
        <span class="mxp">+${xp} XP</span>
        <span class="mrnk r${m.rank.toLowerCase()}">${m.rank}-RANK</span>
        <span class="mtype">${ico}</span>
        <span style="font-size:calc(9px * var(--fs-scale));padding:2px 6px;border-radius:3px;background:rgba(167,139,250,0.6);color:#fff;letter-spacing:1px;font-family:'Orbitron',monospace;">🗓️ Mensual</span>
        <span style="font-size:calc(9px * var(--fs-scale));padding:2px 6px;border-radius:3px;background:rgba(30,30,60,0.7);color:${S.streak>0?'#fbbf24':'#94a3b8'};letter-spacing:1px;font-family:'Orbitron',monospace;" title="Bonus al reclamar">BONUS ${multLbl}</span>
        <div class="mactions">
          ${done ? '' : '<button class="act-btn swap" onclick="swapMonthlyMission(event)" title=\"🔀 Cambiar misión mensual\">🔀</button>'}
        </div>
      </div>
    </div>
  </div>
</div>`;
}

function renderMissionCard(m, fromDaily){
  const xp=m.xp||XPR[m.rank]||50;
  const ico=CAT_LABELS[m.cat]||'⚡';
  const isEditing=editingMissionId===m.id;
  const freqLbl = {daily:'🌅 Diaria', weekly:'📆 Semanal', monthly:'🗓️ Mensual'}[m.freq||'daily'] || '🌅 Diaria';
  const freqCol = {daily:'rgba(96,165,250,0.6)', weekly:'rgba(251,191,36,0.6)', monthly:'rgba(167,139,250,0.6)'}[m.freq||'daily'] || 'rgba(96,165,250,0.6)';
  // Determine done state and toggle fn based on frequency (for banco view)
  const mFreq = m.freq || 'daily';
  const isDone = mFreq === 'weekly' ? !!m.weeklyDone : mFreq === 'monthly' ? !!m.monthlyDone : !!m.done;
  const toggleFn = mFreq === 'weekly' ? `toggleWeekly('${m.id}')` : mFreq === 'monthly' ? `toggleMonthly('${m.id}')` : `toggle('${m.id}')`;
  const visionBoardOptions = `
    <option value="" ${!m.visionImg?'selected':''}>— Sin imagen —</option>
    <option value="familia.png" ${m.visionImg==='familia.png'?'selected':''}>👨‍👩‍👧 familia.png</option>
    <option value="trabajo.png" ${m.visionImg==='trabajo.png'?'selected':''}>💼 trabajo.png</option>
    <option value="viajes_.png" ${m.visionImg==='viajes_.png'?'selected':''}>🏍️ viajes_.png</option>
    <option value="Salud.png" ${m.visionImg==='Salud.png'?'selected':''}>💪 Salud.png</option>
    <option value="hobbies.png" ${m.visionImg==='hobbies.png'?'selected':''}>🎨 hobbies.png</option>
    <option value="Logros.png" ${m.visionImg==='Logros.png'?'selected':''}>🏆 Logros.png</option>
  `;
  return `
<div class="mcard ${isDone?'done':''} ${isEditing?'editing':''} ${m.fixed?'fixed-mission':''}" id="mc-${m.id}">
  <div class="mtop">
    <div class="mchk ${isDone?'yes':''}" onclick="${toggleFn}">${isDone?'✓':''}</div>
    <div class="mcontent">
      <div class="mname">${escH(m.name)}</div>
      ${m.desc?`<div class="mdesc">${escH(m.desc)}</div>`:''}
      <div class="mfoot">
        <span class="mxp">+${xp} XP</span>
        <span class="mrnk r${m.rank.toLowerCase()}">${m.rank}-RANK</span>
        <span class="mtype">${ico}</span>
        <span style="font-size:calc(9px * var(--fs-scale));padding:2px 6px;border-radius:3px;background:${freqCol};color:#fff;letter-spacing:1px;font-family:'Orbitron',monospace;">${freqLbl}</span>
        ${m.fixed?'<span class="fixed-badge">FIJA</span>':''}
        ${m.visionImg?`<span style="font-size:calc(9px * var(--fs-scale));padding:2px 5px;border-radius:3px;background:rgba(167,139,250,0.2);color:#c4b5fd;letter-spacing:1px;">🖼️ ${escH(m.visionImg)}</span>`:''}
        <div class="mactions">
          <button class="act-btn edit" onclick="startEditMission('${m.id}',event)">✏</button>
          ${fromDaily
            ? `<button class="act-btn swap" onclick="swapDailyMission('${m.id}',event)" title="🔀 Cambiar por otra misión del banco (aleatoria)">🔀</button>`
            : `<button class="act-btn del" onclick="delMission('${m.id}',event)" title="Eliminar misión">✕</button>`
          }
        </div>
      </div>
    </div>
  </div>
  <div class="inline-edit ${isEditing?'show':''}" id="ie-${m.id}">
    <div class="ie-row"><label class="ie-lbl">Nombre</label><input class="ie-inp" id="ie-name-${m.id}" value="${escH(m.name)}"></div>
    <div class="ie-row"><label class="ie-lbl">Descripción</label><input class="ie-inp" id="ie-desc-${m.id}" value="${escH(m.desc||'')}"></div>
    <div class="ie-grid">
      <div class="ie-row">
        <label class="ie-lbl">Categoría</label>
        <select class="ie-sel" id="ie-cat-${m.id}" onchange="document.getElementById('ie-vision-row-${m.id}').style.display=this.value==='visionboard'?'flex':'none'">
          <option value="salud" ${m.cat==='salud'?'selected':''}>💪 Salud/Sanador</option>
          <option value="guerrero" ${m.cat==='guerrero'?'selected':''}>⚔️ Guerrero</option>
          <option value="estudio" ${m.cat==='estudio'?'selected':''}>📚 Mago</option>
          <option value="lectura" ${m.cat==='lectura'?'selected':''}>📖 Archimago</option>
          <option value="habitos" ${m.cat==='habitos'?'selected':''}>🌟 Asesino</option>
          <option value="creatividad" ${m.cat==='creatividad'?'selected':''}>🎨 Bardo</option>
          <option value="mental" ${m.cat==='mental'?'selected':''}>🧘 Monje</option>
          <option value="familia" ${m.cat==='familia'?'selected':''}>👨‍👩‍👧 Familia/Guardián</option>
          <option value="trabajo" ${m.cat==='trabajo'?'selected':''}>💼 Trabajo/Maestro</option>
          <option value="viajes" ${m.cat==='viajes'?'selected':''}>🏍️ Viajes/Explorador</option>
          <option value="logros" ${m.cat==='logros'?'selected':''}>🏆 Logros/Campeón</option>
          <option value="visionboard" ${m.cat==='visionboard'?'selected':''}>🖼️ Vision Board</option>
        </select>
      </div>
      <div class="ie-row">
        <label class="ie-lbl">Rango</label>
        <select class="ie-sel" id="ie-rank-${m.id}">
          <option value="D" ${m.rank==='D'?'selected':''}>D — ${XPR.D} XP</option>
          <option value="C" ${m.rank==='C'?'selected':''}>C — ${XPR.C} XP</option>
          <option value="B" ${m.rank==='B'?'selected':''}>B — ${XPR.B} XP</option>
          <option value="A" ${m.rank==='A'?'selected':''}>A — ${XPR.A} XP</option>
          <option value="S" ${m.rank==='S'?'selected':''}>S — ${XPR.S} XP</option>
        </select>
      </div>
    </div>
    <div class="ie-row">
      <label class="ie-lbl">¿Misión fija?</label>
      <select class="ie-sel" id="ie-fixed-${m.id}">
        <option value="0" ${!m.fixed?'selected':''}>No — rotar</option>
        <option value="1" ${m.fixed?'selected':''}>Sí — siempre</option>
      </select>
    </div>
    <div class="ie-row">
      <label class="ie-lbl">📅 Frecuencia</label>
      <select class="ie-sel" id="ie-freq-${m.id}">
        <option value="daily" ${(m.freq||'daily')==='daily'?'selected':''}>🌅 Diaria</option>
        <option value="weekly" ${m.freq==='weekly'?'selected':''}>📆 Semanal</option>
        <option value="monthly" ${m.freq==='monthly'?'selected':''}>🗓️ Mensual</option>
      </select>
    </div>
    <div class="ie-row" id="ie-vision-row-${m.id}" style="display:${m.cat==='visionboard'?'flex':'none'}">
      <label class="ie-lbl">🖼️ Imagen Vision Board</label>
      <select class="ie-sel" id="ie-vision-${m.id}">${visionBoardOptions}</select>
    </div>
    <div class="ie-btns">
      <button class="ie-btn ok" onclick="saveEditMission('${m.id}')">✓ GUARDAR</button>
      <button class="ie-btn ko" onclick="cancelEditMission()">✕ CANCELAR</button>
      <button class="ie-btn" style="border-color:rgba(255,70,102,.4);color:var(--danger);flex:0.7;" onclick="delMission('${m.id}',event)">🗑 ELIMINAR</button>
    </div>
  </div>
</div>`;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §12 — ALL QUESTS                                                       ║
// ║  Propósito: Lista completa del banco de misiones con búsqueda y filtro  ║
// ║  por categoría. Se muestra expandible bajo las misiones del día.        ║
// ║  Funciones: renderAllQuests(), getTodayISODate(), logDailyMission()     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function renderAllQuests(){
  const el=document.getElementById('allQuestList');
  if(!el) return;
  const q=(document.getElementById('questSearch')||{}).value||'';
  const cat=(document.getElementById('questCatFilter')||{}).value||'';
  const freq=(document.getElementById('questFreqFilter')||{}).value||'';
  let list=S.missions.filter(m=>{
    const matchQ=!q||m.name.toLowerCase().includes(q.toLowerCase())||((m.desc||'').toLowerCase().includes(q.toLowerCase()));
    const matchC=!cat||m.cat===cat;
    const matchF=!freq||(m.freq||'daily')===freq;
    return matchQ&&matchC&&matchF;
  });
  if(!list.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);padding:28px;font-size:calc(12px * var(--fs-scale));letter-spacing:2px;">SIN RESULTADOS</div>';
    return;
  }
  el.innerHTML=list.map(m=>renderMissionCard(m,false)).join('');
}

// ╔══════════════════════════════════════════════════════════════════════════╗
