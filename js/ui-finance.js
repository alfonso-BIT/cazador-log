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

// ── Fondo de Deseos — cálculo real con cascada 50/30/20 ─────────────────
// Lógica correcta: los gastos consumen primero el presupuesto de Necesidades
// (50%), luego el de Deseos (30%) y por último el de Ahorro (20%).
// Si ya se gastó todo lo de Necesidades + Deseos, el fondo de Deseos = 0.
// Usa _calcWaterfall que implementa exactamente esa cascada.
// Nota: _calcWaterfall se define más abajo en este archivo; como ambas funciones
// se usan en tiempo de ejecución (no en carga), el orden de declaración no importa.
function getDeseosFundReal(txs){
  if(!txs || !txs.length) return 0;
  // Verificar que hay splits de deseos; si no hay ingreso distribuido, devolver 0
  const hasDeseosSplit = txs.some(t => t.type === 'income_split' && t.cat === 'deseos');
  if(!hasDeseosSplit) return 0;
  const wf = _calcWaterfall(txs);
  return Math.max(0, wf.real.deseos);
}

// ── Porcentaje real de deseos sobre ingresos con distribución ────────────
// Devuelve el % que representa la suma de income_split deseos
// sobre el total de ingresos que tuvieron distribución activa.
function getDeseosPct(txs){
  if(!txs || !txs.length) return 0;
  const parentIds = new Set(
    txs.filter(t => t.type === 'income_split').map(t => t.parentId)
  );
  const totalSplit = txs
    .filter(t => t.type === 'income' && parentIds.has(t.id))
    .reduce((s, t) => s + (t.amt || 0), 0);
  const inDeseos = txs
    .filter(t => t.type === 'income_split' && t.cat === 'deseos')
    .reduce((s, t) => s + (t.amt || 0), 0);
  return totalSplit > 0 ? Math.round(inDeseos / totalSplit * 100) : 0;
}

// ── Banner reutilizable del Fondo de Deseos ──────────────────────────────
// Renderiza el banner informativo en cualquier contenedor pasado por ID.
// Si no hay fondo de deseos configurado, oculta el contenedor.
function renderDeseosBanner(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!S || !S.transactions) { el.style.display = 'none'; return; }

  const fund = getDeseosFundReal(S.transactions); // ya usa waterfall
  const pct  = getDeseosPct(S.transactions);

  if(pct === 0){ el.style.display = 'none'; return; }

  // Para la barra usamos: fondo = totalAsignado a deseos, fill = real restante
  const wf = _calcWaterfall(S.transactions);
  const totalAsignado = wf.allocated.deseos || 0;
  const barFill = totalAsignado > 0
    ? Math.max(0, Math.round(fund / totalAsignado * 100))
    : 0;
  const barCol = barFill > 50 ? '#a78bfa' : barFill > 20 ? '#7c3aed' : 'var(--danger)';

  el.style.display = 'flex';
  const fundColor   = fund <= 0 ? 'var(--danger)' : '#a78bfa';
  const fundLabel   = fund <= 0 ? '⚠ AGOTADO' : 'Disponible';
  el.innerHTML = `
    <div style="font-size:20px;flex-shrink:0;">🎮</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:#a78bfa;">DESEOS</span>
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--muted);">${pct}%</span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-bottom:4px;">
        <div style="height:100%;width:${barFill}%;background:${barCol};border-radius:2px;transition:width .4s;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:9px;color:${fundColor};letter-spacing:1px;">${fundLabel}</span>
        <span style="font-family:'Orbitron',monospace;font-size:13px;font-weight:700;color:${fundColor};">${formatCOP(fund)}</span>
      </div>
    </div>`;
}

// ── Cálculo de ahorro real usando cascada necesidades→deseos→ahorro ───────
// Los gastos "consumen" primero el presupuesto de Necesidades, luego Deseos,
// y por último el de Ahorro. Devuelve {necesidades, deseos, ahorro} con el
// saldo real disponible en cada cubo (puede ser negativo si se excedió).
function _calcWaterfall(txs){
  const allocated = {necesidades:0, deseos:0, ahorro:0};
  txs.filter(t=>t.type==='income_split').forEach(t=>{
    if(allocated[t.cat] !== undefined) allocated[t.cat] += t.amt;
  });

  // ── Paso 1: gastos directos por categoría (incluyendo autoShop en deseos) ──
  // Cada gasto se imputa primero al cubo de su propia categoría si aplica.
  const CAT_MAP = {
    // gastos de necesidades → cubo necesidades
    comida:'necesidades', transporte:'necesidades', salud:'necesidades',
    hogar:'necesidades', educacion:'necesidades',
    // gastos de deseos → cubo deseos (incluye compras de tienda autoShop)
    ocio:'deseos', compras:'deseos', deseos:'deseos',
    // ahorro no suele tener gastos, pero si los hay van a ahorro
    ahorro:'ahorro'
  };
  const spent = {necesidades:0, deseos:0, ahorro:0};
  let unassigned = 0; // gastos en categorías no mapeadas (cat:'otro', etc.)

  txs.filter(t=>t.type==='expense').forEach(t=>{
    const bucket = CAT_MAP[t.cat];
    if(bucket){
      spent[bucket] += t.amt;
    } else {
      unassigned += t.amt; // se distribuirá en cascada abajo
    }
  });

  // ── Paso 2: gastos "otro" se distribuyen en cascada necesidades→deseos→ahorro ──
  // (por si hay gastos no categorizados)
  if(unassigned > 0){
    for(const bucket of ['necesidades','deseos','ahorro']){
      if(unassigned <= 0) break;
      const headroom = Math.max(0, allocated[bucket] - spent[bucket]);
      const use = Math.min(unassigned, headroom > 0 ? headroom : unassigned);
      spent[bucket] += use;
      unassigned -= use;
    }
  }

  // ── Paso 3: si un cubo está sobre-gastado, el exceso pasa al siguiente ──
  // Ejemplo: si deseos gastó más de lo asignado, el exceso se descuenta de ahorro.
  let overflow = 0;
  const ORDER = ['necesidades','deseos','ahorro'];
  for(let i = 0; i < ORDER.length; i++){
    const bucket = ORDER[i];
    const excess = spent[bucket] - allocated[bucket];
    if(excess > 0){
      spent[bucket] = allocated[bucket]; // cap al asignado
      if(i + 1 < ORDER.length){
        spent[ORDER[i+1]] += excess; // derrama al siguiente
      } else {
        overflow += excess;
      }
    }
  }

  return {
    allocated,
    spent,
    real: {
      necesidades: allocated.necesidades - spent.necesidades,
      deseos:      allocated.deseos      - spent.deseos,
      ahorro:      allocated.ahorro      - spent.ahorro,
    },
    overflow: Math.max(0, overflow)
  };
}

const FIN_CAT_LABELS = {
  comida:'Comida', transporte:'Transporte', salud:'Salud',
  ocio:'Ocio', compras:'Compras', educacion:'Educación',
  hogar:'Hogar', otro:'Otro', ingreso:'Ingreso',
  necesidades:'Necesidades', deseos:'Deseos', ahorro:'Ahorro'
};
// Emojis para usar en la gráfica "HOY" en lugar de texto recortado
const FIN_CAT_EMOJI = {
  comida:'🍔', transporte:'🚌', salud:'💊',
  ocio:'🎮', compras:'🛒', educacion:'📚',
  hogar:'🏠', otro:'📦', ingreso:'💵',
  necesidades:'🏠', deseos:'🎮', ahorro:'💰'
};
const FIN_CAT_COLORS = {
  comida:'#f0c040', transporte:'#60a5fa', salud:'#4ade80',
  ocio:'#c084fc', compras:'#ff6b35', educacion:'#a855f7',
  hogar:'#94a3b8', otro:'#6b7280', ingreso:'#4ade80',
  necesidades:'#facc15', deseos:'#a78bfa', ahorro:'#4ade80'
};

function formatCOP(n){
  // Siempre valor exacto, sin abreviaciones K/M — requisito de precisión
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('es-CO');
}

// ── Formateador del campo de monto — muestra puntos de miles en tiempo real ──
// Convierte "400000" → "400.000" mientras el usuario escribe,
// garantizando que el valor siempre sean pesos enteros.
function formatFinAmtInput(input){
  const raw = input.value.replace(/[^\d]/g, ''); // solo dígitos
  if(!raw){ input.value = ''; return; }
  const num = parseInt(raw, 10);
  // Formatear con puntos de miles (es-CO usa punto como separador de miles)
  input.value = num.toLocaleString('es-CO');
  // Mover cursor al final
  const len = input.value.length;
  try{ input.setSelectionRange(len, len); }catch(e){}
}

// ── Corrección automática de splits con error de redondeo ───────────────
// Detecta income_split cuyos montos no suman exactamente el income parent
// y los recalcula garantizando suma exacta. Se llama al cargar el módulo.
function fixSplitRounding(){
  if(!S || !S.transactions || !S.transactions.length) return;
  const txs = S.transactions;

  // Agrupar splits por parentId
  const parents = {};
  txs.forEach(t => {
    if(t.type === 'income' && t.isSplit) parents[t.id] = { income: t, splits: [] };
  });
  txs.forEach(t => {
    if(t.type === 'income_split' && t.parentId && parents[t.parentId]) {
      parents[t.parentId].splits.push(t);
    }
  });

  let changed = false;
  Object.values(parents).forEach(({ income, splits }) => {
    if(!splits.length) return;
    const totalAmt  = income.amt;
    const splitSum  = splits.reduce((s, t) => s + (t.amt || 0), 0);
    const diff      = totalAmt - splitSum;

    // Solo corregir si hay diferencia (error de redondeo) ≤ 10 pesos
    if(diff !== 0 && Math.abs(diff) <= 10){
      // Agregar la diferencia al último split
      splits[splits.length - 1].amt += diff;
      // Sincronizar deseosFund si el split corregido es de deseos
      if(splits[splits.length - 1].cat === 'deseos'){
        S.deseosFund = (S.deseosFund || 0) + diff;
      }
      changed = true;
    }
  });

  if(changed){ save(); }
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
  const eb  = document.getElementById('fin-btn-expense');
  const ib  = document.getElementById('fin-btn-income');
  const ab  = document.getElementById('finAddBtn');
  const ecr = document.getElementById('expenseCatRow');
  const isp = document.getElementById('incomeSplitPanel');
  if(eb) eb.className = 'fin-type-btn' + (t==='expense'?' active-expense':'');
  if(ib) ib.className = 'fin-type-btn' + (t==='income'?' active-income':'');
  // Mostrar/ocultar paneles según tipo
  if(ecr) ecr.style.display = t==='income' ? 'none' : '';
  if(isp) isp.style.display = t==='income' ? 'block' : 'none';
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
  if(t==='income') updateSplitBars();
}

function updateSplitBars(){
  const amt = parseInt((document.getElementById('finAmt')?.value||'').replace(/[^\d]/g,''), 10) || 0;
  const p1  = parseInt(document.getElementById('splitPct1')?.value) || 0;
  const p2  = parseInt(document.getElementById('splitPct2')?.value) || 0;
  const p3  = parseInt(document.getElementById('splitPct3')?.value) || 0;
  const sum = p1 + p2 + p3;
  const warn = document.getElementById('splitSumWarn');
  if(warn) warn.style.display = sum !== 100 ? 'inline' : 'none';
  // Montos calculados
  const a1 = (amt * p1 / 100);
  const a2 = (amt * p2 / 100);
  const a3 = (amt * p3 / 100);
  const fmt = v => v > 0 ? formatCOP(v) : '$0';
  const el1 = document.getElementById('splitAmt1');
  const el2 = document.getElementById('splitAmt2');
  const el3 = document.getElementById('splitAmt3');
  if(el1) el1.textContent = fmt(a1);
  if(el2) el2.textContent = fmt(a2);
  if(el3) el3.textContent = fmt(a3);
  // Barras visuales
  const b1 = document.getElementById('splitBar1');
  const b2 = document.getElementById('splitBar2');
  const b3 = document.getElementById('splitBar3');
  if(b1) b1.style.width = p1 + '%';
  if(b2) b2.style.width = p2 + '%';
  if(b3) b3.style.width = p3 + '%';
}

function selectFinCat(el){
  document.querySelectorAll('.fin-cat-btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  finCat = el.dataset.cat;
}

function addTransaction(){
  const desc = (document.getElementById('finDesc').value||'').trim();
  const amt  = parseInt((document.getElementById('finAmt').value||'').replace(/[^\d]/g,''), 10);
  const ico  = (document.getElementById('finIco').value||'').trim();
  if(!desc){ notif('▸ INGRESA UNA DESCRIPCIÓN'); return; }
  if(!amt||amt<=0){ notif('▸ INGRESA UN MONTO VÁLIDO'); return; }
  if(!S.transactions) S.transactions=[];
  if(!S.nTid) S.nTid=1;
  const now2 = new Date();
  const localDate = localISO(now2);
  const ts = Date.now();

  // ── INGRESO CON DISTRIBUCIÓN 50/30/20 ──
  if(finType === 'income'){
    const splitOn = document.getElementById('splitEnabled')?.checked;
    // Siempre guardar el ingreso total primero
    const txMain = {
      id: 't'+S.nTid++,
      desc, amt, type: 'income',
      cat: 'ingreso',
      ico: ico || '💵',
      ts, date: localDate,
      isSplit: splitOn
    };
    S.transactions.push(txMain);

    if(splitOn){
      const p1  = Math.max(0, parseInt(document.getElementById('splitPct1')?.value)||0);
      const p2  = Math.max(0, parseInt(document.getElementById('splitPct2')?.value)||0);
      const p3  = Math.max(0, parseInt(document.getElementById('splitPct3')?.value)||0);
      const sum = p1 + p2 + p3;
      if(sum !== 100){ notif('⚠ LOS PORCENTAJES DEBEN SUMAR 100%'); return; }
      const lbl1 = (document.getElementById('splitLbl1')?.value||'Necesidades').trim();
      const lbl2 = (document.getElementById('splitLbl2')?.value||'Deseos').trim();
      const lbl3 = (document.getElementById('splitLbl3')?.value||'Ahorro').trim();
      const splits = [
        { lbl: lbl1, pct: p1, ico: '🏠', cat: 'necesidades', color: '#facc15' },
        { lbl: lbl2, pct: p2, ico: '🎮', cat: 'deseos',       color: '#a78bfa' },
        { lbl: lbl3, pct: p3, ico: '💰', cat: 'ahorro',       color: '#4ade80' },
      ];
      // Calcular splits garantizando que sumen exactamente el monto original
      const activeSplits = splits.filter(s => s.pct > 0);
      let sumSoFar = 0;
      activeSplits.forEach((s, si) => {
        const isLast = si === activeSplits.length - 1;
        // Último split absorbe la diferencia de redondeo para sumar exacto
        const splitAmt = isLast
          ? amt - sumSoFar
          : Math.round(amt * s.pct / 100);
        sumSoFar += splitAmt;
        S.transactions.push({
          id: 't'+S.nTid++,
          desc: `${s.lbl} (${s.pct}%) ← ${desc}`,
          amt: splitAmt,
          type: 'income_split',
          cat: s.cat,
          ico: s.ico,
          ts: ts + 1,
          date: localDate,
          parentId: txMain.id
        });
        // El bloque de cat 'deseos' alimenta el fondo de tienda
        if(s.cat === 'deseos'){
          if(!S.deseosFund) S.deseosFund = 0;
          S.deseosFund += splitAmt;
        }
      });
      notif('▲ INGRESO DISTRIBUIDO: ' + formatCOP(amt) + ' — ' + desc);
    } else {
      notif('▲ INGRESO: ' + formatCOP(amt) + ' — ' + desc);
    }
    if(typeof FX !== 'undefined') FX.income(amt);

  } else {
    // ── GASTO NORMAL ──
    const tx = {
      id: 't'+S.nTid++,
      desc, amt, type: 'expense',
      cat: finCat,
      ico: ico || '💸',
      ts, date: localDate
    };
    S.transactions.push(tx);
    notif('▼ GASTO: ' + formatCOP(amt) + ' — ' + desc);
    if(typeof FX !== 'undefined') FX.expense(amt);
  }

  // Keep max 500 transactions (oldest first)
  if(S.transactions.length>500) S.transactions=S.transactions.slice(-500);
  document.getElementById('finDesc').value='';
  document.getElementById('finAmt').value='';
  document.getElementById('finIco').value='';
  updateSplitBars();
  save();
  renderWithFlash();
}

function delTransaction(id){
  if(!S.transactions) return;
  S.transactions = S.transactions.filter(t=>t.id!==id);
  save(); renderWithFlash();
  notif('▸ MOVIMIENTO ELIMINADO');
}

// ── Charts ──
// Ingresos por categoría (reemplaza el antiguo gráfico de barras vs gastos)
function renderFinIncCatChart(txs){
  const el = document.getElementById('finIncCatChart'); if(!el) return;
  const catTotals = {};
  txs.filter(t=>t.type==='income').forEach(t=>{ catTotals[t.cat]=(catTotals[t.cat]||0)+t.amt; });
  const cats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  if(!cats.length){ el.innerHTML='<div class="fin-empty" style="padding:10px">Sin ingresos en este período.</div>'; return; }
  const total = cats.reduce((s,[,v])=>s+v,0);
  const maxC = cats[0][1];
  el.innerHTML = cats.map(([cat,amt])=>{
    const col = FIN_CAT_COLORS[cat]||'var(--green)';
    // Ingresos: usar verde si la categoría no tiene color definido
    const barCol = (cat==='income'||!FIN_CAT_COLORS[cat]) ? 'linear-gradient(90deg,#006633,#4ade80)' : col;
    const pct = Math.round(amt/total*100);
    return `<div class="fin-bar-row">
      <div class="fin-bar-lbl" style="width:56px;font-size:calc(8px * var(--fs-scale));" title="${FIN_CAT_LABELS[cat]||cat}">${FIN_CAT_EMOJI[cat]||'💰'} ${(FIN_CAT_LABELS[cat]||cat).slice(0,5).toUpperCase()}</div>
      <div class="fin-bar-track"><div style="height:100%;background:${barCol};width:${Math.round(amt/maxC*100)}%;transition:width .7s;"></div></div>
      <div class="fin-bar-val" style="color:var(--green);width:68px;">${formatCOP(amt)} <span style="color:var(--muted);font-size:calc(7px * var(--fs-scale));">${pct}%</span></div>
    </div>`;
  }).join('');
}
function _renderMultiBucketBars(el, buckets){
  const maxVal = Math.max(...buckets.map(b=>Math.max(b.income,b.expense)), 1);
  el.innerHTML = buckets.map(b=>`
    <div style="margin-bottom:10px;">
      <div style="font-size:calc(9px * var(--fs-scale));color:var(--blue);letter-spacing:2px;margin-bottom:4px;font-family:'Orbitron',monospace;">${b.lbl}</div>
      ${b.income>0?`<div class="fin-bar-row" style="margin-bottom:4px;">
        <div style="font-size:calc(8px * var(--fs-scale));color:var(--green);width:28px;flex-shrink:0;text-align:right;letter-spacing:1px;">ING</div>
        <div class="fin-bar-track"><div class="fin-bar-fill-inc" style="width:${Math.round(b.income/maxVal*100)}%"></div></div>
        <div class="fin-bar-val" style="color:var(--green);font-size:calc(9px * var(--fs-scale));width:64px;">${formatCOP(b.income)}</div>
      </div>`:''}
      ${b.expense>0?`<div class="fin-bar-row">
        <div style="font-size:calc(8px * var(--fs-scale));color:var(--danger);width:28px;flex-shrink:0;text-align:right;letter-spacing:1px;">GAS</div>
        <div class="fin-bar-track"><div class="fin-bar-fill-exp" style="width:${Math.round(b.expense/maxVal*100)}%"></div></div>
        <div class="fin-bar-val" style="color:var(--danger);font-size:calc(9px * var(--fs-scale));width:64px;">${formatCOP(b.expense)}</div>
      </div>`:''}
      ${b.income===0&&b.expense===0?`<div style="font-size:calc(8px * var(--fs-scale));color:rgba(96,130,180,0.3);padding-left:36px;letter-spacing:1px;">SIN MOV.</div>`:''}
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
  // Corregir splits con error de redondeo antes de renderizar
  fixSplitRounding();
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

  // Ocultar gráficas de barras en vista mes y año (tienen su propio layout)
  const chartWrap1 = document.getElementById('finIncCatChart')?.closest('.fin-chart-wrap');
  const chartWrap2 = document.getElementById('finCatChart')?.closest('.fin-chart-wrap');
  const hideCharts = (finPeriod === 'month' || finPeriod === 'year');
  if(chartWrap1) chartWrap1.style.display = hideCharts ? 'none' : '';
  if(chartWrap2) chartWrap2.style.display = hideCharts ? 'none' : '';
  if(!hideCharts){
    renderFinIncCatChart(txs);
    renderFinCatChart(txs);
  }
  renderFinTxList(txs);

  // Banner de Fondo de Deseos — solo en Tienda, no en Dinero
}

// ── Render único de una fila de transacción ──────────────────────────────
function _renderTxRow(t){
  const isInc   = t.type==='income';
  const isSplit = t.type==='income_split';
  const d = new Date(t.ts);
  const dateStr = d.toLocaleDateString('es-CO',{day:'numeric',month:'short'}).toUpperCase()
    +' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  const splitColors = {necesidades:'#facc15', deseos:'#a78bfa', ahorro:'#4ade80'};
  const splitC  = splitColors[t.cat] || '#60a5fa';
  const amtClass= isInc ? 'pos' : isSplit ? '' : 'neg';
  const amtColor= isSplit ? `color:${splitC};` : '';
  const amtSign = isInc ? '+' : isSplit ? '↳ ' : '-';
  const indent  = isSplit ? `margin-left:12px;opacity:0.85;border-left:2px solid ${splitC};padding-left:8px;` : '';
  return `<div class="fin-tx" style="${indent}">
    <div class="fin-tx-ico">${t.ico||'💸'}</div>
    <div class="fin-tx-info">
      <div class="fin-tx-name">${escH(t.desc)}</div>
      <div class="fin-tx-meta">${(FIN_CAT_LABELS[t.cat]||t.cat).toUpperCase()} — ${dateStr}</div>
    </div>
    <div class="fin-tx-amt ${amtClass}" style="${amtColor}">${amtSign}${formatCOP(t.amt)}</div>
    <button class="fin-tx-del" onclick="delTransaction('${t.id}')">✕</button>
  </div>`;
}

function renderFinTxList(txs){
  const el = document.getElementById('finTxList'); if(!el) return;
  if(!txs.length){
    el.innerHTML='<div class="fin-empty">Sin movimientos en este período.<br><span style="font-size:10px;opacity:.5">Registra tu primer movimiento arriba.</span></div>';
    return;
  }

  // ── VISTA DÍA: lista plana normal ────────────────────────────────────────
  if(finPeriod === 'day'){
    el.innerHTML = '<div class="fin-txlist">' + txs.map(_renderTxRow).join('') + '</div>';
    return;
  }

  // ── VISTA SEMANA: agrupado por día, colapsable ────────────────────────────
  if(finPeriod === 'week'){
    // Agrupar por día
    const days = {};
    txs.forEach(t=>{
      const d = new Date(t.ts);
      const key = d.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'}).toUpperCase();
      if(!days[key]) days[key]=[];
      days[key].push(t);
    });
    let html = '';
    Object.entries(days).forEach(([dayLbl, dayTxs], gi)=>{
      const inc = dayTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
      const exp = dayTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
      const net = inc - exp;
      const netColor = net>=0?'var(--green)':'var(--danger)';
      const gid = 'wday-'+gi;
      html += `
        <div style="margin-bottom:6px;">
          <div onclick="toggleWeekDay('${gid}')" style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,20,50,0.7);border:1px solid rgba(0,100,200,0.25);border-left:3px solid var(--blue);padding:9px 12px;cursor:pointer;user-select:none;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span id="${gid}-arrow" style="font-family:'Orbitron',monospace;font-size:10px;color:var(--blue);transition:transform .2s;">▶</span>
              <div>
                <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--bright);">${dayLbl}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:2px;">${dayTxs.filter(t=>t.type!=='income_split').length} movimientos</div>
              </div>
            </div>
            <div style="text-align:right;">
              ${inc>0?`<div style="font-family:'Orbitron',monospace;font-size:10px;color:var(--green);">+${formatCOP(inc)}</div>`:''}
              ${exp>0?`<div style="font-family:'Orbitron',monospace;font-size:10px;color:var(--danger);">-${formatCOP(exp)}</div>`:''}
              <div style="font-family:'Orbitron',monospace;font-size:11px;font-weight:700;color:${netColor};">${net>=0?'+':''}${formatCOP(net)}</div>
            </div>
          </div>
          <div id="${gid}" style="display:none;" class="fin-txlist">
            ${dayTxs.map(_renderTxRow).join('')}
          </div>
        </div>`;
    });
    el.innerHTML = html;
    return;
  }

  // ── VISTA MES: por categoría con porcentaje y barra ──────────────────────
  if(finPeriod === 'month'){
    const totalInc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
    const totalExp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);

    // Agrupar gastos por categoría
    const expCats = {};
    txs.filter(t=>t.type==='expense').forEach(t=>{
      if(!expCats[t.cat]) expCats[t.cat]={amt:0,txs:[]};
      expCats[t.cat].amt += t.amt;
      expCats[t.cat].txs.push(t);
    });
    // Agrupar ingresos
    const incCats = {};
    txs.filter(t=>t.type==='income').forEach(t=>{
      const cat = t.isSplit ? 'ingreso-dist' : 'ingreso';
      if(!incCats[cat]) incCats[cat]={amt:0,txs:[]};
      incCats[cat].amt += t.amt;
      incCats[cat].txs.push(t);
    });
    // Distribuciones 50/30/20
    const splitCats = {};
    txs.filter(t=>t.type==='income_split').forEach(t=>{
      if(!splitCats[t.cat]) splitCats[t.cat]={amt:0,txs:[]};
      splitCats[t.cat].amt += t.amt;
      splitCats[t.cat].txs.push(t);
    });

    let html = '';

    // ── Sección INGRESOS ──
    if(totalInc > 0){
      html += `<div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:3px;color:var(--green);margin:10px 0 6px;padding-left:4px;">◈ INGRESOS DEL MES</div>`;
      Object.entries(incCats).sort((a,b)=>b[1].amt-a[1].amt).forEach(([cat, data], gi)=>{
        const pct = totalInc>0 ? Math.round(data.amt/totalInc*100) : 0;
        const gid = 'mcat-inc-'+gi;
        html += _renderMonthCatBlock(gid, '💵', 'Ingresos', 'var(--green)', data.amt, pct, totalInc, data.txs, true);
      });
      // Distribuciones 50/30/20 con saldo real (cascada necesidades→deseos→ahorro)
      if(Object.keys(splitCats).length > 0){
        html += `<div style="font-size:9px;letter-spacing:2px;color:var(--muted);margin:6px 0 4px;padding-left:4px;font-family:'Orbitron',monospace;">↳ DISTRIBUCIÓN 50/30/20</div>`;
        const wf = _calcWaterfall(txs);
        html += _renderSplitWaterfall(splitCats, wf, totalInc, 'mcat-spl');
      }
    }

    // ── Sección GASTOS ──
    if(totalExp > 0){
      html += `<div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:3px;color:var(--danger);margin:14px 0 6px;padding-left:4px;">◈ GASTOS DEL MES</div>`;
      Object.entries(expCats).sort((a,b)=>b[1].amt-a[1].amt).forEach(([cat, data], gi)=>{
        const pct = totalExp>0 ? Math.round(data.amt/totalExp*100) : 0;
        const col = FIN_CAT_COLORS[cat]||'#60a5fa';
        const ico = FIN_CAT_EMOJI[cat]||'📦';
        const gid = 'mcat-exp-'+gi;
        html += _renderMonthCatBlock(gid, ico, FIN_CAT_LABELS[cat]||cat, col, data.amt, pct, totalExp, data.txs, false);
      });
    }

    if(!html) html = '<div class="fin-empty">Sin movimientos en este período.</div>';
    el.innerHTML = html;
    return;
  }

  // ── VISTA AÑO: cuadrícula de 12 meses con gráfica de pastel ──────────────
  if(finPeriod === 'year'){
    const year = (new Date()).getFullYear() + finOffset;
    const MONTH_NAMES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    const MONTH_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const now = new Date();
    const currentYear  = now.getFullYear();
    const currentMonth = now.getMonth();

    let cards = '';
    for(let m = 0; m < 12; m++){
      const from = new Date(year, m, 1);  from.setHours(0,0,0,0);
      const to   = new Date(year, m+1, 0); to.setHours(23,59,59,999);
      const mTxs = (S && S.transactions) ? S.transactions.filter(t => t.ts >= from.getTime() && t.ts <= to.getTime()) : [];
      const inc  = mTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
      const exp  = mTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
      const total = inc + exp;
      const isFuture  = (year > currentYear) || (year === currentYear && m > currentMonth);
      const isCurrent = (year === currentYear && m === currentMonth);

      // SVG pie chart
      let pieInner = '';
      if(total > 0){
        const incPct = inc / total;
        const expPct = exp / total;
        const cx = 24, cy = 24, r = 20;
        function arc(pct, startAngle){
          if(pct <= 0) return '';
          if(pct >= 1) pct = 0.9999;
          const end = startAngle + pct * 2 * Math.PI;
          const x1 = cx + r * Math.sin(startAngle);
          const y1 = cy - r * Math.cos(startAngle);
          const x2 = cx + r * Math.sin(end);
          const y2 = cy - r * Math.cos(end);
          const lg = pct > 0.5 ? 1 : 0;
          return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} Z"`;
        }
        const incArc = arc(incPct, 0);
        const expArc = arc(expPct, incPct * 2 * Math.PI);
        if(incArc) pieInner += `${incArc} fill="#4ade80" opacity="0.9"/>`;
        if(expArc) pieInner += `${expArc} fill="#ff6644" opacity="0.9"/>`;
      } else {
        pieInner = `<circle cx="24" cy="24" r="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
      }

      const borderColor = isCurrent ? 'var(--green)' : (total > 0 ? 'rgba(0,100,200,0.4)' : 'rgba(255,255,255,0.08)');
      const glowStyle   = isCurrent ? 'box-shadow:0 0 12px rgba(74,222,128,0.3);' : '';
      const opacity     = isFuture ? 'opacity:0.4;' : '';

      cards += `
        <div onclick="openMonthDetail(${year},${m})"
          style="background:rgba(0,15,40,0.8);border:1px solid ${borderColor};${glowStyle}${opacity}
                 padding:12px 10px;cursor:pointer;user-select:none;
                 display:flex;flex-direction:column;align-items:center;gap:6px;
                 transition:border-color .2s,box-shadow .2s;position:relative;"
          onmouseenter="this.style.borderColor='rgba(0,150,255,0.7)'"
          onmouseleave="this.style.borderColor='${borderColor}'">
          ${isCurrent ? `<div style="position:absolute;top:4px;right:5px;font-family:'Orbitron',monospace;font-size:6px;color:var(--green);letter-spacing:1px;">HOY</div>` : ''}
          <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${isCurrent?'var(--green)':'var(--muted)'};">${MONTH_NAMES[m]}</div>
          <svg width="48" height="48" viewBox="0 0 48 48">${pieInner}</svg>
          ${total > 0 ? `
            <div style="text-align:center;width:100%;">
              <div style="font-family:'Orbitron',monospace;font-size:8px;color:#4ade80;white-space:nowrap;">${formatCOP(inc).replace('$','+'+'$')}</div>
              <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff6644;white-space:nowrap;">${formatCOP(exp)}</div>
            </div>` :
            `<div style="font-size:9px;color:rgba(255,255,255,0.18);">Sin datos</div>`}
        </div>`;
    }

    el.innerHTML = `
      <div style="margin-bottom:10px;font-family:'Orbitron',monospace;font-size:8px;letter-spacing:2px;color:var(--muted);display:flex;gap:16px;padding-left:4px;">
        <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#4ade80;"></span>INGRESOS</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff6644;"></span>GASTOS</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">${cards}</div>`;

    // Overlay de detalle de mes
    if(!document.getElementById('monthDetailOverlay')){
      const ov = document.createElement('div');
      ov.id = 'monthDetailOverlay';
      ov.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);overflow-y:auto;';
      ov.innerHTML = `<div id="monthDetailInner" style="max-width:600px;margin:0 auto;padding:16px;"></div>`;
      ov.addEventListener('click', e => { if(e.target===ov) closeMonthDetail(); });
      document.body.appendChild(ov);
    }
    return;
  }

  // ── fallback: lista plana ─────────────────────────────────────────────────
  el.innerHTML = '<div class="fin-txlist">' + txs.map(_renderTxRow).join('') + '</div>';
}

function openMonthDetail(year, month){
  const MONTH_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const from = new Date(year, month, 1);  from.setHours(0,0,0,0);
  const to   = new Date(year, month+1, 0); to.setHours(23,59,59,999);
  const txs  = (S && S.transactions) ? S.transactions.filter(t => t.ts >= from.getTime() && t.ts <= to.getTime()).sort((a,b)=>b.ts-a.ts) : [];

  const totalInc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
  const totalExp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);

  // Categorías
  const expCats = {};
  txs.filter(t=>t.type==='expense').forEach(t=>{ if(!expCats[t.cat]) expCats[t.cat]={amt:0,txs:[]}; expCats[t.cat].amt+=t.amt; expCats[t.cat].txs.push(t); });
  const incCats = {};
  txs.filter(t=>t.type==='income').forEach(t=>{ const cat=t.isSplit?'ingreso-dist':'ingreso'; if(!incCats[cat]) incCats[cat]={amt:0,txs:[]}; incCats[cat].amt+=t.amt; incCats[cat].txs.push(t); });
  const splitCats = {};
  txs.filter(t=>t.type==='income_split').forEach(t=>{ if(!splitCats[t.cat]) splitCats[t.cat]={amt:0,txs:[]}; splitCats[t.cat].amt+=t.amt; splitCats[t.cat].txs.push(t); });

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid rgba(0,100,200,0.3);padding-bottom:12px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:14px;letter-spacing:3px;color:var(--green);">${MONTH_FULL[month].toUpperCase()}</div>
        <div style="font-family:'Orbitron',monospace;font-size:10px;color:var(--muted);">${year}</div>
      </div>
      <div onclick="closeMonthDetail()" style="cursor:pointer;font-family:'Orbitron',monospace;font-size:10px;color:var(--danger);letter-spacing:2px;padding:6px 12px;border:1px solid rgba(255,68,102,0.4);">✕ CERRAR</div>
    </div>`;

  if(!txs.length){
    html += '<div style="text-align:center;color:var(--muted);padding:40px;font-family:\'Orbitron\',monospace;font-size:11px;">Sin movimientos en este mes.</div>';
  } else {
    if(totalInc > 0){
      html += `<div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:3px;color:var(--green);margin:10px 0 6px;padding-left:4px;">◈ INGRESOS DEL MES</div>`;
      Object.entries(incCats).sort((a,b)=>b[1].amt-a[1].amt).forEach(([cat,data],gi)=>{
        const pct = totalInc>0 ? Math.round(data.amt/totalInc*100) : 0;
        html += _renderMonthCatBlock('md-inc-'+gi,'💵','Ingresos','var(--green)',data.amt,pct,totalInc,data.txs,true);
      });
      if(Object.keys(splitCats).length > 0){
        html += `<div style="font-size:9px;letter-spacing:2px;color:var(--muted);margin:6px 0 4px;padding-left:4px;font-family:'Orbitron',monospace;">↳ DISTRIBUCIÓN 50/30/20</div>`;
        const wf = _calcWaterfall(txs);
        html += _renderSplitWaterfall(splitCats, wf, totalInc, 'md-spl');
      }
    }
    if(totalExp > 0){
      html += `<div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:3px;color:var(--danger);margin:14px 0 6px;padding-left:4px;">◈ GASTOS DEL MES</div>`;
      Object.entries(expCats).sort((a,b)=>b[1].amt-a[1].amt).forEach(([cat,data],gi)=>{
        const pct = totalExp>0 ? Math.round(data.amt/totalExp*100) : 0;
        html += _renderMonthCatBlock('md-exp-'+gi,FIN_CAT_EMOJI[cat]||'📦',FIN_CAT_LABELS[cat]||cat,FIN_CAT_COLORS[cat]||'#60a5fa',data.amt,pct,totalExp,data.txs,false);
      });
    }
  }

  const inner = document.getElementById('monthDetailInner');
  if(inner) inner.innerHTML = html;
  const ov = document.getElementById('monthDetailOverlay');
  if(ov){ ov.style.display='block'; ov.scrollTop=0; }
}

function closeMonthDetail(){
  const ov = document.getElementById('monthDetailOverlay');
  if(ov) ov.style.display='none';
}

// ── Renderiza la sección 50/30/20 con saldo real (cascada) ──────────────
function _renderSplitWaterfall(splitCats, wf, totalInc, prefix){
  const splitColorMap = {necesidades:'#facc15',deseos:'#a78bfa',ahorro:'#4ade80'};
  const splitEmojiMap = {necesidades:'🏠',deseos:'🎮',ahorro:'💰'};
  let html = '';
  // Orden fijo: necesidades → deseos → ahorro
  const ORDER = ['necesidades','deseos','ahorro'];
  ORDER.forEach((cat, gi) => {
    const data = splitCats[cat];
    if(!data) return;
    const col = splitColorMap[cat] || '#60a5fa';
    const ico = splitEmojiMap[cat] || '💰';
    const gid = prefix + '-' + gi;
    const allocated = wf.allocated[cat] || 0;
    const realLeft  = wf.real[cat] || 0;
    const spent     = wf.spent[cat] || 0;
    const pctAlloc  = totalInc > 0 ? Math.round(allocated / totalInc * 100) : 0;
    const pctReal   = allocated > 0 ? Math.max(0, Math.round(realLeft / allocated * 100)) : 0;
    const isOver    = realLeft < 0;
    const isZero    = realLeft === 0 && allocated > 0;

    // Barra doble: fondo = asignado, fill = real restante
    const barFill = isOver ? 0 : Math.round((realLeft / allocated) * 100);
    const statusColor = isOver ? 'var(--danger)' : isZero ? 'var(--muted)' : col;
    const statusLabel = isOver
      ? `⚠ EXCEDIDO ${formatCOP(Math.abs(realLeft))}`
      : isZero
        ? '✓ AGOTADO'
        : `REAL: ${formatCOP(realLeft)}`;

    html += `
    <div style="margin-bottom:6px;">
      <div onclick="toggleWeekDay('${gid}')" style="display:flex;align-items:center;gap:10px;background:rgba(0,20,50,0.65);border:1px solid rgba(0,100,200,0.2);border-left:3px solid ${col};padding:10px 12px;cursor:pointer;user-select:none;">
        <div style="font-size:22px;flex-shrink:0;">${ico}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
            <span style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:1px;color:${col};">${(FIN_CAT_LABELS[cat]||cat).toUpperCase()}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--muted);">${pctAlloc}%</span>
              <span id="${gid}-arrow" style="font-family:'Orbitron',monospace;font-size:10px;color:var(--blue);">▶</span>
            </div>
          </div>
          <!-- Barra fondo = total asignado, fill = real restante -->
          <div style="height:5px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-bottom:4px;position:relative;">
            <div style="position:absolute;inset:0;background:rgba(255,255,255,0.06);border-radius:2px;"></div>
            <div style="height:100%;width:${barFill}%;background:${statusColor};border-radius:2px;transition:width .4s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;">
            <span style="font-size:10px;color:var(--muted);">${data.txs.length} movimiento${data.txs.length!==1?'s':''}</span>
            <div style="text-align:right;line-height:1.3;">
              <div style="font-family:'Orbitron',monospace;font-size:13px;font-weight:700;color:${col};">${formatCOP(allocated)}</div>
              <div style="font-family:'Orbitron',monospace;font-size:10px;color:${statusColor};letter-spacing:0.5px;">${statusLabel}</div>
            </div>
          </div>
        </div>
      </div>
      <div id="${gid}" style="display:none;" class="fin-txlist">
        ${data.txs.map(_renderTxRow).join('')}
      </div>
    </div>`;
  });
  return html;
}

// ── Bloque de categoría para vista mensual ──────────────────────────────
function _renderMonthCatBlock(gid, ico, label, color, amt, pct, total, txs, isInc){
  return `
    <div style="margin-bottom:6px;">
      <div onclick="toggleWeekDay('${gid}')" style="display:flex;align-items:center;gap:10px;background:rgba(0,20,50,0.65);border:1px solid rgba(0,100,200,0.2);border-left:3px solid ${color};padding:10px 12px;cursor:pointer;user-select:none;">
        <div style="font-size:22px;flex-shrink:0;">${ico}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:1px;color:${color};">${label.toUpperCase()}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--muted);">${pct}%</span>
              <span id="${gid}-arrow" style="font-family:'Orbitron',monospace;font-size:10px;color:var(--blue);">▶</span>
            </div>
          </div>
          <div style="height:5px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-bottom:4px;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width .4s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:10px;color:var(--muted);">${txs.length} movimiento${txs.length!==1?'s':''}</span>
            <span style="font-family:'Orbitron',monospace;font-size:12px;font-weight:700;color:${color};">${isInc?'+':''}${formatCOP(amt)}</span>
          </div>
        </div>
      </div>
      <div id="${gid}" style="display:none;" class="fin-txlist">
        ${txs.map(_renderTxRow).join('')}
      </div>
    </div>`;
}

// ── Toggle de grupos semana/mes ──────────────────────────────────────────
function toggleWeekDay(gid){
  const el = document.getElementById(gid);
  const arrow = document.getElementById(gid+'-arrow');
  if(!el) return;
  const open = el.style.display === 'none';
  el.style.display = open ? 'block' : 'none';
  if(arrow) arrow.style.transform = open ? 'rotate(90deg)' : '';
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
        t.type==='income'?'Ingreso':t.type==='income_split'?'Distribución':'Gasto',
        FIN_CAT_LABELS[t.cat]||t.cat,
        t.ico||'',
        t.desc,
        t.type==='income'?t.amt:t.type==='income_split'?t.amt:-t.amt
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
