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
  if(shopTotalEl) shopTotalEl.textContent = (S.totalXP >= 1e9 || !isFinite(S.totalXP)) ? '∞' : (S.totalXP || 0);
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
  if(activeTab === 'missions' && typeof renderLibBookOfMonth === 'function') renderLibBookOfMonth();
  if(activeTab === 'shop')       renderShop();
  if(activeTab === 'inventory')  renderInventory();
  if(activeTab === 'perfil')     renderPerfil();
  if(activeTab === 'dinero')     renderFinTab();
  if(activeTab === 'config')     renderAchievEditor();
  if(activeTab === 'biblioteca') renderBiblioteca();
  if(activeTab === 'datos')      renderDatosTab();
  // ── Banner de Fondo de Deseos — solo Tienda ──
  if(typeof renderDeseosBanner === 'function'){
    if(activeTab === 'shop'){
      // Corregir splits con error de redondeo antes de mostrar el banner
      if(typeof fixSplitRounding === 'function') fixSplitRounding();
      renderDeseosBanner('deseosBanner-shop');
    }
  }
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
    el.innerHTML=`
<div style="text-align:center;padding:28px 16px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;">
  <div style="color:var(--muted);font-size:calc(11px * var(--fs-scale));letter-spacing:2px;margin-bottom:4px;">◈ SIN MISIONES EN EL BANCO ◈</div>
  <div style="color:var(--accent);font-size:calc(12px * var(--fs-scale));letter-spacing:1px;opacity:0.8;">Crea misiones para empezar a ganar XP</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:4px;">
    <button onclick="switchTab('config')" style="padding:10px 18px;background:linear-gradient(135deg,rgba(0,255,140,0.12),rgba(0,120,60,0.10));border:1px solid rgba(0,255,140,0.35);color:var(--bright);font-family:'Orbitron',monospace;font-size:calc(10px * var(--fs-scale));letter-spacing:2px;cursor:pointer;border-radius:4px;">✚ CREAR MISIÓN</button>
  </div>
</div>`;
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
  const days = (S.weeklyDaysChecked||[]).length;
  const todayKey = getTodayISODate ? getTodayISODate() : new Date().toISOString().slice(0,10);
  const checkedToday = (S.weeklyDaysChecked||[]).includes(todayKey);
  // Build 7 day bubbles
  const dayBubbles = Array.from({length:7},(_,i)=>{
    const filled = i < days;
    return `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;margin:0 2px;background:${filled?'#fbbf24':'rgba(255,255,255,0.1)'};border:1px solid ${filled?'#fbbf24':'rgba(255,255,255,0.2)'};vertical-align:middle;font-size:10px;line-height:18px;text-align:center;">${filled?'✓':''}</span>`;
  }).join('');

  el.innerHTML = `
<div class="mcard ${done?'done':''}" id="mc-weekly-${m.id}">
  <div class="mtop">
    <div class="mchk ${checkedToday?'yes':''}" onclick="toggleWeekly()">${checkedToday?'✓':''}</div>
    <div class="mcontent">
      <div class="mname">${escH(m.name)}</div>
      ${m.desc?`<div class="mdesc">${escH(m.desc)}</div>`:''}
      <div style="margin:6px 0 4px;">${dayBubbles} <span style="font-size:calc(9px * var(--fs-scale));color:#fbbf24;font-family:'Orbitron',monospace;vertical-align:middle;">${days}/7 DÍAS</span></div>
      <div class="mfoot">
        <span class="mxp" data-short="+${xp}">+${xp} XP</span>
        <span class="mrnk r${m.rank.toLowerCase()}" data-short="${m.rank}">${m.rank}-RANK</span>
        <span class="mtype">${ico}</span>
        <span class="mfreq" data-short="📆S" style="font-size:calc(11px * var(--fs-scale));">📆</span>
        <span class="mbonus" data-short="B" style="font-size:calc(9px * var(--fs-scale));padding:2px 6px;border-radius:3px;background:rgba(30,30,60,0.7);color:${S.streak>0?'#fbbf24':'#94a3b8'};letter-spacing:1px;font-family:'Orbitron',monospace;" title="Bonus al reclamar">BONUS ${multLbl}</span>
        <div class="mactions">
          ${done ? '' : '<button class="act-btn swap" onclick="swapWeeklyMission(event)" title=\"🔀 Cambiar misión semanal\">🔀</button>'}
        </div>
      </div>
    </div>
  </div>
</div>`;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §12b — QUINCENAL GRID RENDER (v31)                                     ║
// ║  Reemplaza renderMonthlyMission() con un grid de 12 meses estilo        ║
// ║  finanzas. Cada celda muestra un SVG donut verde/rojo con el avance     ║
// ║  de la quincena. Click en mes activo → overlay con las 11 misiones.     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Nombres cortos de meses para las celdas del grid
const QNC_MONTH_NAMES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function renderMonthlyMission(){
  const grid  = document.getElementById('quincenal-grid');
  const badge = document.getElementById('quincenal-period-badge');
  const sec   = document.getElementById('monthly-section');
  if(!grid) return;
  if(sec) sec.style.display = '';

  // Garantizar asignación de la quincena actual antes de renderizar
  if(typeof assignQuincenalMissions === 'function') assignQuincenalMissions();

  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();   // 0-based
  const currentDay   = now.getDate();
  const currentQ     = currentDay <= 15 ? 'Q1' : 'Q2';

  // Actualizar badge de periodo activo
  if(badge){
    badge.textContent = QNC_MONTH_NAMES[currentMonth] + ' ' + currentYear + ' · ' + currentQ;
  }

  // Helper: genera el path SVG de un arco de tarta
  function arc(cx, cy, r, pct, startAngle){
    if(pct <= 0) return '';
    if(pct >= 1) pct = 0.9999;
    const endAngle = startAngle + pct * 2 * Math.PI;
    const x1 = cx + r * Math.sin(startAngle);
    const y1 = cy - r * Math.cos(startAngle);
    const x2 = cx + r * Math.sin(endAngle);
    const y2 = cy - r * Math.cos(endAngle);
    const lg = pct > 0.5 ? 1 : 0;
    return `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${lg},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z"`;
  }

  let cards = '';

  for(let mo = 0; mo < 12; mo++){
    const isCurrent = (mo === currentMonth);
    const isFuture  = (mo > currentMonth);

    const keyQ1 = getQuincenalMonthKey(currentYear, mo, 'Q1');
    const keyQ2 = getQuincenalMonthKey(currentYear, mo, 'Q2');
    const histQ1 = (S.quincenalHistory && S.quincenalHistory[keyQ1]) || { ids:[], completed:[] };
    const histQ2 = (S.quincenalHistory && S.quincenalHistory[keyQ2]) || { ids:[], completed:[] };

    let totalMissions, doneMissions;

    if(isCurrent){
      // Mes activo: mostrar solo la quincena en curso
      const activeHist = currentQ === 'Q1' ? histQ1 : histQ2;
      totalMissions = activeHist.ids.length || 11;
      doneMissions  = (activeHist.completed || []).length;
    } else if(isFuture){
      // Futuro: vacío
      totalMissions = 0;
      doneMissions  = 0;
    } else {
      // Pasado: suma de ambas quincenas
      totalMissions = (histQ1.ids.length || 0) + (histQ2.ids.length || 0);
      if(totalMissions === 0) totalMissions = 22; // estimado si no hay historial
      doneMissions  = (histQ1.completed || []).length + (histQ2.completed || []).length;
    }

    const pctDone    = totalMissions > 0 ? doneMissions / totalMissions : 0;
    const pctPending = 1 - pctDone;
    const cx = 24, cy = 24, r = 18;

    // Construir SVG donut
    let pieInner = '';
    if(!isFuture && totalMissions > 0){
      const doneArc = arc(cx, cy, r, pctDone, 0);
      const pendArc = arc(cx, cy, r, pctPending, pctDone * 2 * Math.PI);
      if(doneArc) pieInner += `${doneArc} fill="#4ade80" opacity="0.9"/>`;
      if(pendArc) pieInner += `${pendArc} fill="#ff6644" opacity="0.85"/>`;
      // Agujero central del donut
      pieInner += `<circle cx="${cx}" cy="${cy}" r="11" fill="rgba(0,10,30,0.95)"/>`;
      // Porcentaje en el centro
      const pct100 = Math.round(pctDone * 100);
      const centroColor = pctDone >= 1 ? '#4ade80' : '#ffffff';
      pieInner += `<text x="${cx}" y="${cy+3}" text-anchor="middle"
        font-family="Orbitron,monospace" font-size="7" fill="${centroColor}">${pct100}%</text>`;
    } else {
      // Sin datos o futuro: círculo vacío
      pieInner = `<circle cx="${cx}" cy="${cy}" r="${r}"
        fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>`;
    }

    // Estilos de la celda según estado
    const borderColor = isCurrent
      ? 'var(--green)'
      : (doneMissions > 0 ? 'rgba(0,100,200,0.4)' : 'rgba(255,255,255,0.07)');
    const glowStyle    = isCurrent ? 'box-shadow:0 0 12px rgba(74,222,128,0.25);' : '';
    const opacityStyle = isFuture  ? 'opacity:0.35;' : '';
    const cursorStyle  = !isFuture  ? 'cursor:pointer;' : 'cursor:default;';
    const monthColor   = isCurrent
      ? 'var(--green)'
      : (doneMissions > 0 ? 'rgba(74,222,128,0.55)' : 'var(--muted)');

    // Click solo en meses no futuros
    const clickFn = !isFuture
      ? `openQuincenalDetail(${currentYear},${mo})`
      : '';

    // Texto de conteo (solo meses con datos)
    const countLabel = (!isFuture && totalMissions > 0)
      ? `<div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;
                     color:${doneMissions >= totalMissions ? '#4ade80' : 'var(--muted)'};">
           ${doneMissions}/${totalMissions}
         </div>`
      : `<div style="font-size:7px;color:rgba(255,255,255,0.12);">—</div>`;

    // Badge Q1/Q2 en mes activo
    const qBadge = isCurrent
      ? `<div style="position:absolute;top:3px;right:4px;font-family:'Orbitron',monospace;
                     font-size:6px;color:var(--green);letter-spacing:1px;">${currentQ}</div>`
      : '';

    cards += `
      <div onclick="${clickFn}"
           style="background:rgba(0,15,40,0.8);border:1px solid ${borderColor};
                  ${glowStyle}${opacityStyle}padding:10px 8px;${cursorStyle}
                  user-select:none;display:flex;flex-direction:column;
                  align-items:center;gap:5px;transition:border-color .2s,box-shadow .2s;
                  position:relative;"
           onmouseenter="if(!${isFuture}) this.style.borderColor='rgba(0,150,255,0.6)'"
           onmouseleave="this.style.borderColor='${borderColor}'">
        ${qBadge}
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:2px;
                    color:${monthColor};">${QNC_MONTH_NAMES[mo]}</div>
        <svg width="48" height="48" viewBox="0 0 48 48">${pieInner}</svg>
        ${countLabel}
      </div>`;
  }

  grid.innerHTML = cards;
}

function renderMissionCard(m, fromDaily){
  const xp=m.xp||XPR[m.rank]||50;
  const icoFull=CAT_LABELS[m.cat]||'⚡';
  // Solo mostrar el emoji (primer segmento antes del espacio) para no sobrecargar la tarjeta
  const ico=icoFull.split(' ')[0]||icoFull;
  const isEditing=editingMissionId===m.id;
  const freqLbl = {daily:'🌅', weekly:'📆', monthly:'🗓️'}[m.freq||'daily'] || '🌅';
  const freqShort = {daily:'🌅D', weekly:'📆S', monthly:'🗓️M'}[m.freq||'daily'] || '🌅D';
  const freqCol = {daily:'rgba(96,165,250,0.6)', weekly:'rgba(251,191,36,0.6)', monthly:'rgba(167,139,250,0.6)'}[m.freq||'daily'] || 'rgba(96,165,250,0.6)';
  // Determine done state and toggle fn based on frequency (for banco view)
  const mFreq = m.freq || 'daily';
  const isDone = mFreq === 'weekly' ? !!m.weeklyDone : mFreq === 'monthly' ? !!m.monthlyDone : !!m.done;
  const toggleFn = mFreq === 'weekly' ? `toggleWeekly('${m.id}')` : mFreq === 'monthly' ? `toggleMonthly('${m.id}')` : `toggle('${m.id}')`;
  return `
<div class="mcard ${isDone?'done':''} ${isEditing?'editing':''} ${m.fixed?'fixed-mission':''}" id="mc-${m.id}">
  <div class="mtop">
    <div class="mchk ${isDone?'yes':''}" onclick="${toggleFn}">${isDone?'✓':''}</div>
    <div class="mcontent">
      <div class="mname">${escH(m.name)}</div>
      ${m.desc?`<div class="mdesc">${escH(m.desc)}</div>`:''}
      <div class="mfoot">
        <span class="mxp" data-short="+${xp}">+${xp} XP</span>
        <span class="mrnk r${m.rank.toLowerCase()}" data-short="${m.rank}">${m.rank}-RANK</span>
        <span class="mtype">${ico}</span>
        <span class="mfreq" data-short="${freqShort}" style="font-size:calc(11px * var(--fs-scale));">${freqLbl}</span>
        ${m.fixed?'<span class="fixed-badge" data-short="F">FIJA</span>':''}
        <div class="mactions">
          <button class="act-btn fav${m.favorite?' fav-on':''}" onclick="toggleFavorite('${m.id}',event)" title="${m.favorite?'Quitar de favoritas':'Marcar como favorita'}">${m.favorite?'★':'☆'}</button>
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
        <select class="ie-sel" id="ie-cat-${m.id}">
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
  const fav=(document.getElementById('questFavFilter')||{}).value||'';
  const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const qn=norm(q);
  let list=S.missions.filter(m=>{
    const matchQ=!q||norm(m.name).includes(qn)||norm(m.desc||'').includes(qn)||norm(m.cat||'').includes(qn);
    const matchC=!cat||m.cat===cat;
    const matchF=!freq||(m.freq||'daily')===freq;
    const matchFav=!fav||!!m.favorite;
    return matchQ&&matchC&&matchF&&matchFav;
  });
  if(!list.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);padding:28px;font-size:calc(12px * var(--fs-scale));letter-spacing:2px;">SIN RESULTADOS</div>';
    return;
  }
  el.innerHTML=list.map(m=>renderMissionCard(m,false)).join('');
}

// ╔══════════════════════════════════════════════════════════════════════════╗
