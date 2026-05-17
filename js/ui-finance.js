// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ui-finance.js — §18 FINANCE MODULE                                    ║
// ║  Exporta: formatCOP(), getTotalBalance(), setFinPeriod(), setFinType(),║
// ║           selectFinCat(), addTransaction(), delTransaction(),          ║
// ║           renderFinTab(), renderFinTxList(), renderFinChartBars()      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §18 — FINANCE MODULE                                                   ║
// ║  Propósito: Registra y visualiza gastos e ingresos. Calcula el balance  ║
// ║  total y lo muestra en la player card. Respeta el colchón de seguridad. ║
// ║  Funciones: formatCOP(), setFinPeriod(), setFinType(), selectFinCat(),  ║
// ║             getFinCutoff(), getFinTransactions(), addTransaction(),      ║
// ║             delTransaction(), renderFinChartBars(), renderFinCatChart(), ║
// ║             renderFinTab(), renderFinTxList()                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
let finPeriod = 'day';
let finType   = 'expense';
let finCat    = 'comida';
let finOffset = 0;   // 0 = período actual, -1 = período anterior, etc.

const FIN_CAT_LABELS = {
  comida:'Comida', transporte:'Transporte', salud:'Salud',
  ocio:'Ocio', compras:'Compras', educacion:'Educación',
  hogar:'Hogar', otro:'Otro', ingreso:'Ingreso'
};
// Emojis para usar en la gráfica "HOY" en lugar de texto recortado
const FIN_CAT_EMOJI = {
  comida:'🍔', transporte:'🚌', salud:'💊',
  ocio:'🎮', compras:'🛒', educacion:'📚',
  hogar:'🏠', otro:'📦', ingreso:'💵'
};
const FIN_CAT_COLORS = {
  comida:'#f0c040', transporte:'#60a5fa', salud:'#4ade80',
  ocio:'#c084fc', compras:'#ff6b35', educacion:'#a855f7',
  hogar:'#94a3b8', otro:'#6b7280', ingreso:'#4ade80'
};

function formatCOP(n){
  // Siempre valor exacto, sin abreviaciones K/M — requisito de precisión
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('es-CO');
}

function setFinPeriod(p){
  finPeriod = p;
  finOffset = 0;   // al cambiar de tipo de período, volver al actual
  if(S){ S.finPeriod = p; save(); }
  ['day','week','month','year'].forEach(x=>{
    const el=document.getElementById('fp-'+x);
    if(el) el.classList.toggle('active', x===p);
  });
  renderFinTab();
}

function finNavStep(delta){
  finOffset += delta;
  // No permitir navegar al futuro
  if(finOffset > 0) finOffset = 0;
  renderFinTab();
}

// Devuelve {from: Date, to: Date, label: string} para el período y offset actuales
function getFinRange(period, offset){
  const now = new Date();
  let from, to, label;

  if(period === 'day'){
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    from = new Date(d); from.setHours(0,0,0,0);
    to   = new Date(d); to.setHours(23,59,59,999);
    const isToday = offset === 0;
    label = isToday ? 'HOY · ' + d.toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'}).toUpperCase()
                    : d.toLocaleDateString('es-CO',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).toUpperCase();
  }
  else if(period === 'week'){
    // Semana lunes–domingo
    const ref = new Date(now);
    ref.setDate(now.getDate() + offset * 7);
    const dow = ref.getDay(); // 0=dom,1=lun,...
    const diffToMon = (dow === 0) ? -6 : 1 - dow;
    const mon = new Date(ref); mon.setDate(ref.getDate() + diffToMon); mon.setHours(0,0,0,0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
    from = mon; to = sun;
    // Número de semana ISO
    const jan4 = new Date(mon.getFullYear(), 0, 4);
    const weekNum = Math.floor(((mon - jan4) / 86400000 + jan4.getDay() + 6) / 7) + 1;
    const monLbl = mon.toLocaleDateString('es-CO',{day:'numeric',month:'short'}).toUpperCase();
    const sunLbl = sun.toLocaleDateString('es-CO',{day:'numeric',month:'short'}).toUpperCase();
    const isThisWeek = offset === 0;
    label = (isThisWeek ? 'SEM ACTUAL · ' : 'SEM ' + weekNum + ' · ') + monLbl + ' – ' + sunLbl;
  }
  else if(period === 'month'){
    const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    from.setHours(0,0,0,0);
    to   = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    to.setHours(23,59,59,999);
    const isThisMonth = offset === 0;
    const monthName = ref.toLocaleDateString('es-CO',{month:'long',year:'numeric'}).toUpperCase();
    label = (isThisMonth ? 'ESTE MES · ' : '') + monthName;
  }
  else { // year
    const year = now.getFullYear() + offset;
    from = new Date(year, 0, 1);  from.setHours(0,0,0,0);
    to   = new Date(year, 11, 31); to.setHours(23,59,59,999);
    label = (offset === 0 ? 'ESTE AÑO · ' : '') + year;
  }

  return { from, to, label };
}

function getFinTransactions(period, offset){
  if(!S||!S.transactions) return [];
  const { from, to } = getFinRange(period, offset);
  return S.transactions
    .filter(t => t.ts >= from.getTime() && t.ts <= to.getTime())
    .sort((a,b) => b.ts - a.ts);
}

function setFinType(t){
  finType = t;
  const eb = document.getElementById('fin-btn-expense');
  const ib = document.getElementById('fin-btn-income');
  const ab = document.getElementById('finAddBtn');
  const cg = document.getElementById('finCatGrid');
  if(eb) eb.className = 'fin-type-btn' + (t==='expense'?' active-expense':'');
  if(ib) ib.className = 'fin-type-btn' + (t==='income'?' active-income':'');
  if(cg) cg.style.opacity = t==='income'?'0.35':'1';
  if(cg) cg.style.pointerEvents = t==='income'?'none':'auto';
  if(ab){
    if(t==='income'){
      ab.textContent='+ REGISTRAR INGRESO';
      ab.style.borderColor='rgba(74,222,128,0.5)';
      ab.style.color='#4ade80';
    } else {
      ab.textContent='+ REGISTRAR GASTO';
      ab.style.borderColor='rgba(255,68,102,0.5)';
      ab.style.color='#ff6688';
    }
  }
}

function selectFinCat(el){
  document.querySelectorAll('.fin-cat-btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  finCat = el.dataset.cat;
}

function addTransaction(){
  const desc = (document.getElementById('finDesc').value||'').trim();
  const amt  = parseFloat(document.getElementById('finAmt').value);
  const ico  = (document.getElementById('finIco').value||'').trim();
  if(!desc){ notif('▸ INGRESA UNA DESCRIPCIÓN'); return; }
  if(!amt||amt<=0){ notif('▸ INGRESA UN MONTO VÁLIDO'); return; }
  if(!S.transactions) S.transactions=[];
  if(!S.nTid) S.nTid=1;
  const now2 = new Date();
  const localDate = localISO(now2);
  const tx = {
    id: 't'+S.nTid++,
    desc, amt, type: finType,
    cat: finType==='income' ? 'ingreso' : finCat,
    ico: ico || (finType==='income'?'💵':'💸'),
    ts: Date.now(),
    date: localDate
  };
  S.transactions.push(tx);
  // Keep max 500 transactions (oldest first)
  if(S.transactions.length>500) S.transactions=S.transactions.slice(-500);
  document.getElementById('finDesc').value='';
  document.getElementById('finAmt').value='';
  document.getElementById('finIco').value='';
  save();
  renderWithFlash();
  notif((finType==='income'?'▲ INGRESO: ':'▼ GASTO: ')+formatCOP(amt)+' — '+desc);
  // Efecto visual de transacción
  if(typeof FX !== 'undefined'){
    if(finType === 'income') FX.income(amt);
    else                     FX.expense(amt);
  }
}

function delTransaction(id){
  if(!S.transactions) return;
  S.transactions = S.transactions.filter(t=>t.id!==id);
  save(); renderWithFlash();
  notif('▸ MOVIMIENTO ELIMINADO');
}

// ── Charts ──
function renderFinChartBars(txs, period, offset){
  const el = document.getElementById('finChartBars'); if(!el) return;
  const { from, to } = getFinRange(period, offset);
  const buckets = [];

  if(period === 'day'){
    // Un solo día: desglose por categoría
    const catTotals = {};
    txs.filter(t=>t.type==='expense').forEach(t=>{ catTotals[t.cat]=(catTotals[t.cat]||0)+t.amt; });
    const cats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
    if(!cats.length){ el.innerHTML='<div class="fin-empty" style="padding:14px">Sin gastos este día.</div>'; return; }
    const maxC = cats[0][1];
    el.innerHTML = cats.map(([cat,amt])=>`
      <div class="fin-bar-row">
        <div class="fin-bar-lbl" title="${FIN_CAT_LABELS[cat]||cat}">${FIN_CAT_EMOJI[cat]||'📦'}</div>
        <div class="fin-bar-track"><div class="fin-bar-fill-exp" style="width:${Math.round(amt/maxC*100)}%"></div></div>
        <div class="fin-bar-val">${formatCOP(amt)}</div>
      </div>`).join('');
    return;
  }

  if(period === 'week'){
    // 7 barras día a día (lun → dom)
    for(let i=0; i<7; i++){
      const d = new Date(from); d.setDate(from.getDate()+i);
      const iso = localISO(d);
      const lbl = d.toLocaleDateString('es-CO',{weekday:'short',day:'numeric'}).toUpperCase();
      buckets.push({iso, lbl, income:0, expense:0});
    }
  }
  else if(period === 'month'){
    // Una barra por semana del mes
    let cur = new Date(from);
    while(cur <= to){
      const wStart = new Date(cur);
      const wEnd = new Date(cur); wEnd.setDate(cur.getDate()+6); if(wEnd>to) wEnd.setTime(to.getTime());
      const iso1 = localISO(wStart), iso2 = localISO(wEnd);
      const lbl = wStart.toLocaleDateString('es-CO',{day:'numeric',month:'short'}).toUpperCase();
      buckets.push({isoFrom:iso1, isoTo:iso2, lbl, income:0, expense:0});
      cur.setDate(cur.getDate()+7);
    }
    txs.forEach(t=>{
      const b = buckets.find(b=>t.date>=b.isoFrom && t.date<=b.isoTo);
      if(!b) return;
      if(t.type==='income') b.income+=t.amt; else b.expense+=t.amt;
    });
    _renderMultiBucketBars(el, buckets);
    return;
  }
  else if(period === 'year'){
    // 12 barras (una por mes)
    for(let m=0;m<12;m++){
      const d = new Date(from.getFullYear(), m, 1);
      const iso = `${from.getFullYear()}-${String(m+1).padStart(2,'0')}`;
      const lbl = d.toLocaleDateString('es-CO',{month:'short'}).toUpperCase();
      buckets.push({isoMonth: iso, lbl, income:0, expense:0});
    }
    txs.forEach(t=>{
      const b = buckets.find(b=>t.date.startsWith(b.isoMonth));
      if(!b) return;
      if(t.type==='income') b.income+=t.amt; else b.expense+=t.amt;
    });
    _renderMultiBucketBars(el, buckets);
    return;
  }

  // Week: fill day buckets
  if(period === 'week'){
    txs.forEach(t=>{
      const b = buckets.find(b=>b.iso===t.date);
      if(!b) return;
      if(t.type==='income') b.income+=t.amt; else b.expense+=t.amt;
    });
  }
  _renderMultiBucketBars(el, buckets);
}

function _renderMultiBucketBars(el, buckets){
  const maxVal = Math.max(...buckets.map(b=>Math.max(b.income,b.expense)), 1);
  el.innerHTML = buckets.map(b=>`
    <div style="margin-bottom:7px;">
      <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-bottom:3px;">${b.lbl}</div>
      ${b.income>0?`<div class="fin-bar-row" style="margin-bottom:3px;">
        <div style="font-size:8px;color:var(--green);width:22px;flex-shrink:0;">ING</div>
        <div class="fin-bar-track"><div class="fin-bar-fill-inc" style="width:${Math.round(b.income/maxVal*100)}%"></div></div>
        <div class="fin-bar-val" style="color:var(--green);">${formatCOP(b.income)}</div>
      </div>`:''}
      ${b.expense>0?`<div class="fin-bar-row">
        <div style="font-size:8px;color:var(--danger);width:22px;flex-shrink:0;">GAS</div>
        <div class="fin-bar-track"><div class="fin-bar-fill-exp" style="width:${Math.round(b.expense/maxVal*100)}%"></div></div>
        <div class="fin-bar-val" style="color:var(--danger);">${formatCOP(b.expense)}</div>
      </div>`:''}
      ${b.income===0&&b.expense===0?`<div style="font-size:9px;color:rgba(96,130,180,0.3);padding-left:26px;letter-spacing:1px;">SIN MOV.</div>`:''}
    </div>`).join('');
}

function renderFinCatChart(txs){
  const el = document.getElementById('finCatChart'); if(!el) return;
  const catTotals = {};
  txs.filter(t=>t.type==='expense').forEach(t=>{ catTotals[t.cat]=(catTotals[t.cat]||0)+t.amt; });
  const cats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  if(!cats.length){ el.innerHTML='<div class="fin-empty" style="padding:10px">Sin gastos en este período.</div>'; return; }
  const total = cats.reduce((s,[,v])=>s+v,0);
  const maxC = cats[0][1];
  el.innerHTML = cats.map(([cat,amt])=>{
    const col = FIN_CAT_COLORS[cat]||'#60a5fa';
    const pct = Math.round(amt/total*100);
    return `<div class="fin-bar-row">
      <div class="fin-bar-lbl" style="width:56px;font-size:8px;" title="${FIN_CAT_LABELS[cat]||cat}">${FIN_CAT_EMOJI[cat]||'📦'} ${(FIN_CAT_LABELS[cat]||cat).slice(0,5).toUpperCase()}</div>
      <div class="fin-bar-track"><div style="height:100%;background:${col};width:${Math.round(amt/maxC*100)}%;transition:width .7s;"></div></div>
      <div class="fin-bar-val" style="color:${col};width:68px;">${formatCOP(amt)} <span style="color:var(--muted);font-size:7px;">${pct}%</span></div>
    </div>`;
  }).join('');
}

function renderFinTab(){
  if(!S) return;
  // Restore period preference
  finPeriod = S.finPeriod || 'day';
  ['day','week','month','year'].forEach(x=>{
    const el=document.getElementById('fp-'+x);
    if(el) el.classList.toggle('active', x===finPeriod);
  });

  // Update period label and disable ▶ when at current period
  const range = getFinRange(finPeriod, finOffset);
  const lblEl = document.getElementById('finPeriodLabel');
  if(lblEl) lblEl.textContent = range.label;
  const nextBtn = document.getElementById('finNavNext');
  if(nextBtn) nextBtn.disabled = finOffset >= 0;

  const txs = getFinTransactions(finPeriod, finOffset);
  const income  = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
  const balance = income - expense;

  const incEl = document.getElementById('finIncome');
  const expEl = document.getElementById('finExpense');
  const balEl = document.getElementById('finBalance');
  if(incEl) incEl.textContent = formatCOP(income);
  if(expEl) expEl.textContent = formatCOP(expense);
  if(balEl){
    balEl.textContent = formatCOP(balance);
    balEl.style.color = balance<0?'var(--danger)':balance>0?'var(--green)':'var(--bright)';
  }

  renderFinChartBars(txs, finPeriod, finOffset);
  renderFinCatChart(txs);
  renderFinTxList(txs);
}

function renderFinTxList(txs){
  const el = document.getElementById('finTxList'); if(!el) return;
  if(!txs.length){
    el.innerHTML='<div class="fin-empty">Sin movimientos en este período.<br><span style="font-size:10px;opacity:.5">Registra tu primer movimiento arriba.</span></div>';
    return;
  }
  el.innerHTML = '<div class="fin-txlist">'+txs.map(t=>{
    const isInc = t.type==='income';
    const d = new Date(t.ts);
    const dateStr = d.toLocaleDateString('es-CO',{day:'numeric',month:'short'}).toUpperCase()
      +' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
    return `<div class="fin-tx">
      <div class="fin-tx-ico">${t.ico||'💸'}</div>
      <div class="fin-tx-info">
        <div class="fin-tx-name">${escH(t.desc)}</div>
        <div class="fin-tx-meta">${(FIN_CAT_LABELS[t.cat]||t.cat).toUpperCase()} — ${dateStr}</div>
      </div>
      <div class="fin-tx-amt ${isInc?'pos':'neg'}">${isInc?'+':'-'}${formatCOP(t.amt)}</div>
      <button class="fin-tx-del" onclick="delTransaction('${t.id}')">✕</button>
    </div>`;
  }).join('')+'</div>';
}

// ═══════════════════════════════════════════════════════
// ESTADO DE ÁNIMO (MOOD)
// ═══════════════════════════════════════════════════════
// mood 0=pésimo 1=mal 2=regular 3=bien 4=excelente
// XP otorgado por registrar el ánimo (independiente del valor)

// ── EXPORT / IMPORT XLSX ──────────────────────────────
// exportFinXLSX — Genera un .xlsx con una hoja por mes.
// Columnas: Fecha, Tipo, Categoría, Descripción, Monto.
// Requiere SheetJS (xlsx.full.min.js).
function exportFinXLSX(){
  if(!S||!S.transactions||!S.transactions.length){notif('▸ SIN MOVIMIENTOS PARA EXPORTAR');return;}
  const wb = XLSX.utils.book_new();
  // Agrupar por año-mes
  const months = {};
  S.transactions.forEach(t=>{
    const d = new Date(t.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if(!months[key]) months[key]=[];
    months[key].push(t);
  });
  // Ordenar meses cronológicamente
  Object.keys(months).sort().forEach(key=>{
    const rows = [['Fecha','Hora','Tipo','Categoría','Emoji','Descripción','Monto (COP)']];
    months[key].sort((a,b)=>a.ts-b.ts).forEach(t=>{
      const d=new Date(t.ts);
      rows.push([
        d.toLocaleDateString('es-CO'),
        d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}),
        t.type==='income'?'Ingreso':'Gasto',
        FIN_CAT_LABELS[t.cat]||t.cat,
        t.ico||'',
        t.desc,
        t.type==='income'?t.amt:-t.amt
      ]);
    });
    // Fila de totales
    const inc = months[key].filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
    const exp = months[key].filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
    rows.push([]);
    rows.push(['','','','','','INGRESOS',inc]);
    rows.push(['','','','','','GASTOS',-exp]);
    rows.push(['','','','','','BALANCE',inc-exp]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:12},{wch:8},{wch:10},{wch:14},{wch:6},{wch:32},{wch:16}];
    // Nombre de hoja: "2025-05 Mayo"
    const [y,m]=key.split('-');
    const mName=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+m];
    XLSX.utils.book_append_sheet(wb, ws, `${key} ${mName}`);
  });
  XLSX.writeFile(wb, `cazador-finanzas-${new Date().toISOString().slice(0,10)}.xlsx`);
  notif('⬇ XLSX DESCARGADO — ' + Object.keys(months).length + ' MES(ES)');
}

// importFinXLSX — Lee un .xlsx exportado y restaura transacciones.
// Combina con las existentes sin duplicar (por id).
function importFinXLSX(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const wb = XLSX.read(e.target.result,{type:'array'});
      const imported=[];
      wb.SheetNames.forEach(sName=>{
        const ws=wb.Sheets[sName];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        // Saltar cabecera y filas de totales (sin fecha válida)
        rows.slice(1).forEach((r,i)=>{
          const dateStr=r[0], timeStr=r[1], tipo=r[2], cat=r[3], ico=r[4], desc=r[5], monto=r[6];
          if(!dateStr||!desc||monto===''||isNaN(+monto)||tipo==='') return;
          if(!['Ingreso','Gasto'].includes(tipo)) return;
          const amt=Math.abs(+monto);
          if(amt<=0) return;
          // Reconstruir timestamp aproximado desde fecha local
          const parts=String(dateStr).split('/');
          let ts;
          if(parts.length===3) ts=new Date(+parts[2],+parts[1]-1,+parts[0]).getTime();
          else ts=Date.now();
          const id='imp_'+sName.replace(/\s/g,'_')+'_'+i;
          imported.push({id,desc:String(desc),amt,type:tipo==='Ingreso'?'income':'expense',
            cat:Object.keys(FIN_CAT_LABELS).find(k=>FIN_CAT_LABELS[k]===cat)||'otro',
            ico:String(ico)||'💸',ts,date:new Date(ts).toISOString().slice(0,10)});
        });
      });
      if(!imported.length){notif('▸ NO SE ENCONTRARON MOVIMIENTOS VÁLIDOS');input.value='';return;}
      if(!S.transactions) S.transactions=[];
      const existingIds=new Set(S.transactions.map(t=>t.id));
      const news=imported.filter(t=>!existingIds.has(t.id));
      S.transactions=[...S.transactions,...news];
      if(!S.nTid) S.nTid=1;
      save(); renderWithFlash();
      notif('⬆ IMPORTADOS: '+news.length+' MOVIMIENTOS NUEVOS');
    }catch(err){notif('▸ ERROR AL LEER EL ARCHIVO');}
    input.value='';
  };
  reader.readAsArrayBuffer(file);
}
