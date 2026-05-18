// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ui-init.js — SESSION BOOT · EMOJI PICKER · TEMPLATES · DEVICE DETECT ║
// ║  Ejecuta: arranque de sesión (login check, loadState, render)          ║
// ║  Exporta: epBind(), epToggle(), epClose(), openTplModal(),             ║
// ║           closeTplModal(), importTemplates(), tipToggle()              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// INICIO
// ═══════════════════════════════════════════════════════
// ── Arranque: auto-login si ya había sesión guardada ──────────────────────
const savedUser = localStorage.getItem('sl_current_user');
if(savedUser){
  bootSession(savedUser);          // arranca sesión desde localStorage
} else {
  document.getElementById('loginOver').classList.add('show');
}

// Tick siempre activo — muestra el reloj aunque no haya sesión
tick();
setInterval(tick,1000);

// ═══════════════════════════════════════════════════════
// EMOJI PICKER — sistema global reutilizable
// Uso: epToggle('panel-id') para abrir/cerrar
//      epBind('panel-id', inputId) para enlazar panel con campo
// ═══════════════════════════════════════════════════════

const EP_CATS = [
  { key:'todo',     label:'Todos' },
  { key:'actividad',label:'💪 Actividad' },
  { key:'estudio',  label:'📚 Estudio' },
  { key:'salud',    label:'❤️ Salud' },
  { key:'comida',   label:'🍔 Comida' },
  { key:'objetos',  label:'🎁 Objetos' },
  { key:'dinero',   label:'💰 Dinero' },
  { key:'viajes',   label:'✈️ Viajes' },
  { key:'hogar',    label:'🏠 Hogar' },
  { key:'naturaleza',label:'🌿 Natura' },
  { key:'simbolos', label:'⭐ Símbolos' },
  { key:'caras',    label:'😀 Caras' },
];

const EP_DATA = [
  // actividad
  {e:'💪',k:'actividad'},{e:'🏃',k:'actividad'},{e:'🧘',k:'actividad'},{e:'🚴',k:'actividad'},
  {e:'🏋️',k:'actividad'},{e:'⚽',k:'actividad'},{e:'🏊',k:'actividad'},{e:'🎯',k:'actividad'},
  {e:'🥊',k:'actividad'},{e:'🧗',k:'actividad'},{e:'🤸',k:'actividad'},{e:'⚔️',k:'actividad'},
  {e:'🗡️',k:'actividad'},{e:'🏹',k:'actividad'},{e:'🎮',k:'actividad'},{e:'🕹️',k:'actividad'},
  {e:'🎲',k:'actividad'},{e:'🎭',k:'actividad'},{e:'🎨',k:'actividad'},{e:'🎵',k:'actividad'},
  {e:'🎸',k:'actividad'},{e:'🎤',k:'actividad'},{e:'🏆',k:'actividad'},{e:'🥇',k:'actividad'},
  {e:'🥈',k:'actividad'},{e:'🥉',k:'actividad'},{e:'🎖️',k:'actividad'},{e:'🏅',k:'actividad'},
  // estudio
  {e:'📚',k:'estudio'},{e:'📖',k:'estudio'},{e:'📝',k:'estudio'},{e:'✏️',k:'estudio'},
  {e:'🖊️',k:'estudio'},{e:'📐',k:'estudio'},{e:'📏',k:'estudio'},{e:'🔬',k:'estudio'},
  {e:'🔭',k:'estudio'},{e:'💡',k:'estudio'},{e:'🧠',k:'estudio'},{e:'🎓',k:'estudio'},
  {e:'🏫',k:'estudio'},{e:'💻',k:'estudio'},{e:'🖥️',k:'estudio'},{e:'📊',k:'estudio'},
  {e:'📈',k:'estudio'},{e:'📉',k:'estudio'},{e:'🔮',k:'estudio'},{e:'⚗️',k:'estudio'},
  {e:'🧪',k:'estudio'},{e:'🧫',k:'estudio'},{e:'📡',k:'estudio'},{e:'⚙️',k:'estudio'},
  // salud
  {e:'❤️',k:'salud'},{e:'💚',k:'salud'},{e:'💙',k:'salud'},{e:'💛',k:'salud'},
  {e:'🩺',k:'salud'},{e:'💊',k:'salud'},{e:'🩹',k:'salud'},{e:'🧬',k:'salud'},
  {e:'🏥',k:'salud'},{e:'😴',k:'salud'},{e:'🛏️',k:'salud'},{e:'🧠',k:'salud'},
  {e:'🫀',k:'salud'},{e:'🫁',k:'salud'},{e:'🦷',k:'salud'},{e:'👁️',k:'salud'},
  {e:'💉',k:'salud'},{e:'🔬',k:'salud'},{e:'☯️',k:'salud'},{e:'🧘',k:'salud'},
  // comida
  {e:'🍔',k:'comida'},{e:'🍕',k:'comida'},{e:'🌮',k:'comida'},{e:'🍜',k:'comida'},
  {e:'🍣',k:'comida'},{e:'🥗',k:'comida'},{e:'🍎',k:'comida'},{e:'🍌',k:'comida'},
  {e:'🍓',k:'comida'},{e:'☕',k:'comida'},{e:'🧃',k:'comida'},{e:'🍺',k:'comida'},
  {e:'🎂',k:'comida'},{e:'🍦',k:'comida'},{e:'🍫',k:'comida'},{e:'🥐',k:'comida'},
  {e:'🥤',k:'comida'},{e:'🍷',k:'comida'},{e:'🥩',k:'comida'},{e:'🥑',k:'comida'},
  // objetos
  {e:'🎁',k:'objetos'},{e:'🎀',k:'objetos'},{e:'🎊',k:'objetos'},{e:'🎉',k:'objetos'},
  {e:'👑',k:'objetos'},{e:'💎',k:'objetos'},{e:'💍',k:'objetos'},{e:'👜',k:'objetos'},
  {e:'👟',k:'objetos'},{e:'🕶️',k:'objetos'},{e:'🎧',k:'objetos'},{e:'📱',k:'objetos'},
  {e:'⌚',k:'objetos'},{e:'🚗',k:'objetos'},{e:'✈️',k:'objetos'},{e:'🛒',k:'objetos'},
  {e:'🧸',k:'objetos'},{e:'🪄',k:'objetos'},{e:'🗝️',k:'objetos'},{e:'🔑',k:'objetos'},
  {e:'🪙',k:'objetos'},{e:'🏠',k:'objetos'},{e:'🛋️',k:'objetos'},{e:'🖼️',k:'objetos'},
  // dinero
  {e:'💰',k:'dinero'},{e:'💵',k:'dinero'},{e:'💸',k:'dinero'},{e:'💳',k:'dinero'},
  {e:'🏦',k:'dinero'},{e:'💹',k:'dinero'},{e:'📊',k:'dinero'},{e:'💲',k:'dinero'},
  {e:'🤑',k:'dinero'},{e:'💱',k:'dinero'},{e:'🪙',k:'dinero'},{e:'🏧',k:'dinero'},
  // viajes
  {e:'✈️',k:'viajes'},{e:'🚂',k:'viajes'},{e:'🚀',k:'viajes'},{e:'🏖️',k:'viajes'},
  {e:'🏔️',k:'viajes'},{e:'🗺️',k:'viajes'},{e:'🧳',k:'viajes'},{e:'🌍',k:'viajes'},
  {e:'🗼',k:'viajes'},{e:'🗽',k:'viajes'},{e:'🏰',k:'viajes'},{e:'⛩️',k:'viajes'},
  {e:'🌅',k:'viajes'},{e:'🌉',k:'viajes'},{e:'🎡',k:'viajes'},{e:'🚢',k:'viajes'},
  // hogar
  {e:'🏠',k:'hogar'},{e:'🛋️',k:'hogar'},{e:'🛏️',k:'hogar'},{e:'🚿',k:'hogar'},
  {e:'🛁',k:'hogar'},{e:'🍽️',k:'hogar'},{e:'🔧',k:'hogar'},{e:'🔨',k:'hogar'},
  {e:'🧹',k:'hogar'},{e:'🧺',k:'hogar'},{e:'🧻',k:'hogar'},{e:'💡',k:'hogar'},
  {e:'📦',k:'hogar'},{e:'🪴',k:'hogar'},{e:'🖼️',k:'hogar'},{e:'🕯️',k:'hogar'},
  {e:'🪞',k:'hogar'},{e:'🚪',k:'hogar'},{e:'🪟',k:'hogar'},{e:'🧴',k:'hogar'},
  // naturaleza
  {e:'🌿',k:'naturaleza'},{e:'🌱',k:'naturaleza'},{e:'🌸',k:'naturaleza'},{e:'🌺',k:'naturaleza'},
  {e:'🌻',k:'naturaleza'},{e:'🍀',k:'naturaleza'},{e:'🌳',k:'naturaleza'},{e:'🌲',k:'naturaleza'},
  {e:'🦁',k:'naturaleza'},{e:'🐺',k:'naturaleza'},{e:'🦅',k:'naturaleza'},{e:'🐉',k:'naturaleza'},
  {e:'🌙',k:'naturaleza'},{e:'⭐',k:'naturaleza'},{e:'☀️',k:'naturaleza'},{e:'🌈',k:'naturaleza'},
  {e:'⚡',k:'naturaleza'},{e:'🔥',k:'naturaleza'},{e:'💧',k:'naturaleza'},{e:'❄️',k:'naturaleza'},
  {e:'🌊',k:'naturaleza'},{e:'🌪️',k:'naturaleza'},{e:'🦋',k:'naturaleza'},{e:'🐾',k:'naturaleza'},
  // simbolos
  {e:'⭐',k:'simbolos'},{e:'🌟',k:'simbolos'},{e:'✨',k:'simbolos'},{e:'💫',k:'simbolos'},
  {e:'🔥',k:'simbolos'},{e:'⚡',k:'simbolos'},{e:'❤️',k:'simbolos'},{e:'💯',k:'simbolos'},
  {e:'✅',k:'simbolos'},{e:'❌',k:'simbolos'},{e:'⚠️',k:'simbolos'},{e:'🔔',k:'simbolos'},
  {e:'🔒',k:'simbolos'},{e:'🔓',k:'simbolos'},{e:'📌',k:'simbolos'},{e:'🗺️',k:'simbolos'},
  {e:'⚔️',k:'simbolos'},{e:'🛡️',k:'simbolos'},{e:'⚙️',k:'simbolos'},{e:'🎯',k:'simbolos'},
  {e:'♾️',k:'simbolos'},{e:'☯️',k:'simbolos'},{e:'🔮',k:'simbolos'},{e:'💠',k:'simbolos'},
  {e:'🔱',k:'simbolos'},{e:'⚜️',k:'simbolos'},{e:'🌀',k:'simbolos'},{e:'🔴',k:'simbolos'},
  {e:'🟡',k:'simbolos'},{e:'🟢',k:'simbolos'},{e:'🔵',k:'simbolos'},{e:'⬛',k:'simbolos'},
  // caras
  {e:'😀',k:'caras'},{e:'😎',k:'caras'},{e:'🤩',k:'caras'},{e:'😤',k:'caras'},
  {e:'😠',k:'caras'},{e:'😤',k:'caras'},{e:'🤯',k:'caras'},{e:'😴',k:'caras'},
  {e:'🤔',k:'caras'},{e:'😈',k:'caras'},{e:'👿',k:'caras'},{e:'💀',k:'caras'},
  {e:'👾',k:'caras'},{e:'🤖',k:'caras'},{e:'👻',k:'caras'},{e:'🦸',k:'caras'},
  {e:'🦹',k:'caras'},{e:'🧙',k:'caras'},{e:'🧝',k:'caras'},{e:'🧜',k:'caras'},
  {e:'🥷',k:'caras'},{e:'💂',k:'caras'},{e:'🧟',k:'caras'},{e:'🧛',k:'caras'},
];

// Estado del picker
const _ep = { open: null, bindings: {} };

// Registra qué input recibe el emoji de un panel dado
function epBind(panelId, inputId){ _ep.bindings[panelId] = inputId; }

// Inicializa categorías y grilla de un panel
function epInit(panelId){
  const catsEl = document.getElementById(panelId+'-cats');
  const gridEl = document.getElementById(panelId+'-grid');
  if(!catsEl || !gridEl) return;
  // Render cat buttons
  catsEl.innerHTML = EP_CATS.map(c=>
    `<button class="ep-cat-btn${c.key==='todo'?' active':''}" onclick="epSetCat('${panelId}','${c.key}',this)">${c.label}</button>`
  ).join('');
  epRenderGrid(panelId, 'todo', '');
}

function epRenderGrid(panelId, cat, query){
  const gridEl = document.getElementById(panelId+'-grid');
  if(!gridEl) return;
  const q = (query||'').toLowerCase();
  let items = EP_DATA;
  if(cat && cat !== 'todo') items = items.filter(x=>x.k===cat);
  if(q) items = items.filter(x=>x.e.includes(q)||x.k.includes(q));
  if(!items.length){
    gridEl.innerHTML = '<div class="ep-empty">Sin resultados</div>';
    return;
  }
  gridEl.innerHTML = items.map(x=>
    `<button class="ep-emoji-btn" onclick="epSelect('${panelId}','${x.e}')">${x.e}</button>`
  ).join('');
}

function epSetCat(panelId, cat, btn){
  document.querySelectorAll('#'+panelId+'-cats .ep-cat-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const searchEl = document.getElementById(panelId)?.querySelector('.ep-search');
  epRenderGrid(panelId, cat, searchEl?searchEl.value:'');
  if(searchEl) searchEl.dataset.cat = cat;
}

function epSearch(inp, panelId){
  const cat = inp.dataset.cat || 'todo';
  epRenderGrid(panelId, cat, inp.value);
}

function epSelect(panelId, emoji){
  // Intentar binding registrado primero
  const inputId = _ep.bindings[panelId];
  if(inputId){
    const el = document.getElementById(inputId);
    if(el){ el.value = emoji; el.dispatchEvent(new Event('input')); }
  } else {
    // Fallback: buscar el input hermano dentro del mismo ep-wrap
    const panel = document.getElementById(panelId);
    if(panel){
      const wrap = panel.closest('.ep-wrap');
      if(wrap){
        const inp = wrap.querySelector('input[type="text"], input:not([type]), input[id]');
        if(inp){ inp.value = emoji; inp.dispatchEvent(new Event('input')); }
      }
    }
  }
  epClose();
}

function epToggle(panelId){
  const panel = document.getElementById(panelId);
  if(!panel) return;
  const isOpen = panel.classList.contains('open');
  // Cerrar todos
  document.querySelectorAll('.ep-panel.open').forEach(p=>p.classList.remove('open'));
  _ep.open = null;
  if(!isOpen){
    // Inicializar si es la primera vez
    if(!panel.dataset.epInited){
      panel.dataset.epInited = '1';
      epInit(panelId);
    }
    panel.classList.add('open');
    _ep.open = panelId;
    // Focus en search
    const s = panel.querySelector('.ep-search');
    if(s) setTimeout(()=>s.focus(),80);
  }
}

function epClose(){
  document.querySelectorAll('.ep-panel.open').forEach(p=>p.classList.remove('open'));
  _ep.open = null;
}

// Cerrar picker al hacer click fuera
document.addEventListener('click', function(e){
  if(_ep.open && !e.target.closest('.ep-wrap') && !e.target.classList.contains('ep-open-btn')){
    epClose();
  }
}, true);

// ═══════════════════════════════════════════════════════
// PLANTILLA DE MISIONES — MODAL
// ═══════════════════════════════════════════════════════
// tplToggle(card)      — selecciona/deselecciona una tarjeta
// tplSelectAll()       — selecciona todas
// tplDeselectAll()     — deselecciona todas
// tplUpdateCounter()   — actualiza el contador y estado del botón
// openTplModal()       — abre el modal (resetea selección)
// closeTplModal()      — cierra sin importar
// importTemplates()    — añade al banco S.missions las seleccionadas

function tplToggle(card){
  card.classList.toggle('selected');
  tplUpdateCounter();
}

function tplSelectAll(){
  document.querySelectorAll('.tpl-card').forEach(c=>c.classList.add('selected'));
  tplUpdateCounter();
}

function tplDeselectAll(){
  document.querySelectorAll('.tpl-card').forEach(c=>c.classList.remove('selected'));
  tplUpdateCounter();
}

function tplUpdateCounter(){
  const n = document.querySelectorAll('.tpl-card.selected').length;
  const counter = document.getElementById('tplCounter');
  const btn = document.getElementById('tplImportBtn');
  if(counter) counter.textContent = n + (n===1?' seleccionada':' seleccionadas');
  if(btn) btn.disabled = n === 0;
}

function openTplModal(tab){
  // Al abrir: seleccionar todas las cards por defecto
  document.querySelectorAll('.tpl-card').forEach(c=>c.classList.add('selected'));
  tplUpdateCounter();
  const overlay = document.getElementById('tplOverlay');
  if(overlay){ overlay.classList.add('show'); overlay.scrollTop=0; }
  // Ir a la tab indicada (por defecto: tutorial para nuevos, import desde config)
  switchTplTab(tab || 'tutorial');
}

function switchTplTab(tab){
  // Actualizar botones
  document.querySelectorAll('.tpl-modal-tab').forEach(btn=>{
    btn.classList.toggle('active', btn.id === 'tplTab-'+tab);
  });
  // Actualizar paneles
  document.querySelectorAll('.tpl-modal-panel').forEach(panel=>{
    panel.classList.toggle('active', panel.id === 'tplPanel-'+tab);
  });
}

function closeTplModal(){
  const overlay = document.getElementById('tplOverlay');
  if(overlay) overlay.classList.remove('show');
}

function importTemplates(){
  const selected = document.querySelectorAll('.tpl-card.selected');
  if(!selected.length){ notif('⚠ SELECCIONA AL MENOS UNA MISIÓN'); return; }
  let added = 0;
  selected.forEach(card=>{
    const name = card.querySelector('.tpl-name').textContent.trim();
    const desc = card.querySelector('.tpl-desc').textContent.trim();
    const cat  = card.dataset.cat;
    const rank = card.dataset.rank;
    const fixed= card.dataset.fixed === '1';
    // Evitar duplicados por nombre exacto
    const exists = S.missions.some(m=>m.name===name);
    if(!exists){
      S.missions.push({
        id: 'm'+S.nMid++,
        name, desc, cat, rank,
        xp: XPR[rank] || 30,
        fixed,
        done: false,
        updatedAt: Date.now(),
        createdDate: new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'}),
        lastDoneDate: null
      });
      added++;
    }
  });
  S.dailyAssigned = null;
  assignDailyMissions();
  save();
  closeTplModal();
  switchTab('missions');
  toggleAllQuests(true);
  render();
  notif('◈ ' + added + ' MISIONES AÑADIDAS AL BANCO ◈');
}

// ═══════════════════════════════════════════════════════
// TOOLTIP MODAL — abre modal flotante en lugar de expandir inline
// ═══════════════════════════════════════════════════════
function tipToggle(btn){
  const detail = btn.nextElementSibling;
  if(!detail || !detail.classList.contains('tip-detail')) return;

  // Obtener título desde tip-base hermano anterior, o desde el botón
  let title = '';
  const block = btn.closest('.tip-block') || btn.parentElement;
  if(block){
    const base = block.querySelector('.tip-base');
    if(base) title = base.textContent.trim();
  }
  if(!title){
    if(!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
    title = btn.dataset.label;
  }

  // Abrir modal global con el contenido del tip-detail
  const modal = document.getElementById('tipModal');
  const titleEl = document.getElementById('tipModalTitle');
  const bodyEl = document.getElementById('tipModalBody');
  if(!modal || !bodyEl) return;

  titleEl.textContent = title.toUpperCase();
  bodyEl.innerHTML = detail.innerHTML;
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeTipModal(e){
  const modal = document.getElementById('tipModal');
  if(!modal) return;
  // e puede venir del overlay (click en fondo) o undefined (botón X)
  // Si vino del overlay, solo cerrar si el clic fue directo sobre él
  if(e && e.target && e.target !== modal) return;
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

// Cerrar modal con Escape
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    const modal = document.getElementById('tipModal');
    if(modal && modal.classList.contains('show')){
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }
});

// ═══════════════════════════════════════════════════════
// DEVICE DETECTION — Responsive Adaptive UI
// ═══════════════════════════════════════════════════════
(function initDeviceDetection() {
  const banner  = document.getElementById('deviceBanner');
  const label   = document.getElementById('deviceLabel');

  const BREAKPOINTS = { mobile: 480, tablet: 768, desktop: Infinity };

  function getDeviceType() {
    const w = window.innerWidth;
    const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (w < BREAKPOINTS.mobile)  return 'mobile';
    if (w < BREAKPOINTS.tablet)  return 'tablet';
    return 'desktop';
  }

  function getDeviceIcon(type) {
    return { mobile: '📱', tablet: '💻', desktop: '🖥️' }[type];
  }

  function getDeviceText(type) {
    const w = window.innerWidth;
    const texts = {
      mobile:  `MÓVIL — ${w}px`,
      tablet:  `TABLET — ${w}px`,
      desktop: `ESCRITORIO — ${w}px`,
    };
    return texts[type];
  }

  let lastType = null;

  function updateDevice() {
    const type = getDeviceType();
    if (type === lastType) return;
    lastType = type;

    // Update banner class
    banner.className = `device-banner ${type}`;
    label.textContent = `${getDeviceIcon(type)} ${getDeviceText(type)}`;

    // Apply body data-attribute for JS-driven responsive logic
    document.body.setAttribute('data-device', type);

    // Adaptive: hide tabs scroll hint after first interaction on desktop
    if (type === 'desktop') {
      const tabsWrapper = document.querySelector('.tabs-wrapper');
      if (tabsWrapper) tabsWrapper.style.setProperty('--hint', 'none');
    }

    // Auto-adjust font size for tiny screens (< 360px)
    if (window.innerWidth < 360 && typeof setFont === 'function') {
      if (!document.body.getAttribute('data-font-adjusted')) {
        document.body.setAttribute('data-font-adjusted', '1');
        setFont(13);
      }
    }
    // Re-aplicar tipografía adaptativa (respeta preferencia manual)
    if(!document.body.getAttribute('data-font-manual')){
      applyMobileTypography(false);
    }
  }

  // Update on load and resize (debounced)
  updateDevice();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateDevice();
      // Update label text dynamically on resize
      if (lastType) label.textContent = `${getDeviceIcon(lastType)} ${getDeviceText(lastType)}`;
    }, 120);
  });

  // Orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(updateDevice, 300);
  });

  // Fade out banner after 4 seconds
  setTimeout(() => {
    banner.style.transition = 'opacity 1s ease';
    banner.style.opacity = '0.3';
  }, 4000);

  // Show banner again on resize
  window.addEventListener('resize', () => {
    banner.style.opacity = '0.75';
    clearTimeout(banner._fadeTimer);
    banner._fadeTimer = setTimeout(() => {
      banner.style.opacity = '0.3';
    }, 2500);
  });
})();
