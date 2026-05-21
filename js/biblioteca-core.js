// ╔══════════════════════════════════════════════════════════════════╗
// ║  biblioteca-core.js  —  Lógica y render principal de libros     ║
// ║  Contiene: libStats, libFiltered, renderBiblioteca, libAchiev   ║
// ║             renderLibBookOfMonth, libReadingPace, libGridCard   ║
// ║  Continúa en: biblioteca-modal.js (modal edición, guardado)     ║
// ╚══════════════════════════════════════════════════════════════════╝
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §20 — BIBLIOTECA                                                        ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Tab de seguimiento de libros estilo Kindle.                  ║
// ║  Integrado con S (estado global), save(), renderWithFlash(), escH().    ║
// ║                                                                          ║
// ║  S.books[] = [{ id, title, author, ico, status, progress,               ║
// ║                 pages, notes, addedAt, finishedAt, cat }]               ║
// ║                                                                          ║
// ║  Estados: 'reading' | 'done' | 'wishlist' | 'paused'                   ║
// ║                                                                          ║
// ║  Funciones públicas:                                                     ║
// ║   · renderBiblioteca()   — renderiza tab completo                        ║
// ║   · openBookModal(id?)   — abre modal de añadir/editar                  ║
// ║   · saveBook()           — guarda desde modal                            ║
// ║   · deleteBook(id)       — elimina libro                                 ║
// ║   · updateBookProgress(id, pct) — actualiza progreso rápido             ║
// ║   · libSetFilter(f)      — cambia filtro activo                         ║
// ║   · libSetView(v)        — cambia vista (grid/list)                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Estado local del tab ──────────────────────────────────────────────────
let _libFilter   = 'all';   // 'all' | 'reading' | 'done' | 'wishlist' | 'paused'
let _libView     = 'grid';  // 'grid' | 'list'
let _libSearch   = '';
let _libEditId   = null;    // id del libro en edición (null = nuevo)

// ── Emojis de portada disponibles ─────────────────────────────────────────
const BOOK_EMOJIS = ['📚','📖','📕','📗','📘','📙','📔','📒','📓','🔮','⚔️','🧬','🎭','🗺️','🔭','🧪','🎨','🧠','⚡','🌌'];

// ── Categorías de libro ────────────────────────────────────────────────────
const BOOK_CATS_BASE = {
  ficcion:    '🗡️ Ficción',
  noFiccion:  '📊 No Ficción',
  ciencia:    '🔬 Ciencia',
  historia:   '🏛️ Historia',
  desarrollo: '🧠 Desarrollo',
  filosofia:  '☯️ Filosofía',
  arte:       '🎨 Arte',
  tecnologia: '💻 Tecnología',
  economia:   '💰 Economía',
  psicologia: '🧩 Psicología',
  politica:   '⚖️ Política',
  viajes:     '✈️ Viajes',
  salud:      '🏥 Salud',
  biografia:  '👤 Biografía',
  religion:   '🕌 Religión / Espiritualidad',
  derecho:    '📜 Derecho',
  educacion:  '🎓 Educación',
  otro:       '📂 Otro',
};
// Devuelve categorías base (con overrides del usuario) + personalizadas
function libGetCats(){
  const overrides = S.catOverrides||{};
  const base = {};
  Object.entries(BOOK_CATS_BASE).forEach(([k,v])=>{ base[k]=overrides[k]||v; });
  return Object.assign(base, S.customCats||{});
}

// ── Logros de lectura (independientes de logros de misiones) ───────────────
function libDefaultAchievements(){
  return [
    // ── CANTIDAD DE LIBROS COMPLETADOS ───────────────────────────────────
    { id:'lb1',  ico:'🌱', name:'Primer Capítulo',    desc:'Completa tu primer libro',          type:'done',    target:1   },
    { id:'lb2',  ico:'📚', name:'Biblioteca Básica',  desc:'Lee 5 libros completos',            type:'done',    target:5   },
    { id:'lb3',  ico:'🔥', name:'Lector Voraz',       desc:'Lee 10 libros completos',           type:'done',    target:10  },
    { id:'lb4',  ico:'💎', name:'Gran Lector',        desc:'Lee 25 libros completos',           type:'done',    target:25  },
    { id:'lb5',  ico:'👑', name:'Maestro de Páginas', desc:'Lee 50 libros completos',           type:'done',    target:50  },
    { id:'lb6',  ico:'🌌', name:'Leyenda Literaria',  desc:'Lee 100 libros completos',          type:'done',    target:100 },
    { id:'lb7',  ico:'⚡', name:'Centelleante',       desc:'Lee 3 libros completos',            type:'done',    target:3   },
    { id:'lb8',  ico:'🎯', name:'Constante',          desc:'Lee 15 libros completos',           type:'done',    target:15  },
    { id:'lb9',  ico:'🚀', name:'Lanzado',            desc:'Lee 20 libros completos',           type:'done',    target:20  },
    { id:'lb10', ico:'🔱', name:'Erudito',            desc:'Lee 35 libros completos',           type:'done',    target:35  },
    // ── LIBROS AÑADIDOS / COLECCIÓN ──────────────────────────────────────
    { id:'lb11', ico:'📝', name:'Coleccionista',      desc:'Añade 3 libros a tu biblioteca',   type:'added',   target:3   },
    { id:'lb12', ico:'🗂️', name:'Archivero',         desc:'Añade 10 libros a tu biblioteca',  type:'added',   target:10  },
    { id:'lb13', ico:'🏛️', name:'Bibliófilo',        desc:'Añade 25 libros a tu biblioteca',  type:'added',   target:25  },
    { id:'lb14', ico:'🌐', name:'Enciclopedista',    desc:'Añade 50 libros a tu biblioteca',  type:'added',   target:50  },
    { id:'lb15', ico:'♾️', name:'Infinito',          desc:'Añade 100 libros a tu biblioteca', type:'added',   target:100 },
    // ── DIVERSIDAD DE CATEGORÍAS ──────────────────────────────────────────
    { id:'lb16', ico:'🗺️', name:'Explorador',       desc:'Lee libros de 2 categorías',        type:'cats',    target:2   },
    { id:'lb17', ico:'🧭', name:'Viajero',           desc:'Lee libros de 3 categorías',        type:'cats',    target:3   },
    { id:'lb18', ico:'🌍', name:'Cosmopolita',       desc:'Lee libros de 4 categorías',        type:'cats',    target:4   },
    { id:'lb19', ico:'✨', name:'Polímata',          desc:'Lee libros de 5 categorías',        type:'cats',    target:5   },
    { id:'lb20', ico:'🎭', name:'Renacentista',      desc:'Lee libros de todas las categorías',type:'cats',    target:7   },
    // ── PROGRESO ─────────────────────────────────────────────────────────
    { id:'lb21', ico:'📖', name:'A Medias',          desc:'Llega al 50% en un libro',          type:'half',    target:1   },
    { id:'lb22', ico:'🔖', name:'Marcapáginas',      desc:'Llega al 50% en 3 libros',          type:'half',    target:3   },
    { id:'lb23', ico:'📏', name:'Perseverante',      desc:'Llega al 50% en 5 libros',          type:'half',    target:5   },
    { id:'lb24', ico:'🧩', name:'Casi Ahí',          desc:'Llega al 50% en 10 libros',         type:'half',    target:10  },
    // ── PÁGINAS LEÍDAS ────────────────────────────────────────────────────
    { id:'lb25', ico:'📄', name:'Primeras Hojas',    desc:'Acumula 500 páginas leídas',        type:'pages',   target:500   },
    { id:'lb26', ico:'📃', name:'Maratón de Páginas',desc:'Acumula 1 000 páginas leídas',      type:'pages',   target:1000  },
    { id:'lb27', ico:'📜', name:'Devorador',         desc:'Acumula 2 500 páginas leídas',      type:'pages',   target:2500  },
    { id:'lb28', ico:'🗞️', name:'Biblionauta',      desc:'Acumula 5 000 páginas leídas',      type:'pages',   target:5000  },
    { id:'lb29', ico:'📰', name:'Inmortal',          desc:'Acumula 10 000 páginas leídas',     type:'pages',   target:10000 },
    // ── CONSTANCIA Y HÁBITO ───────────────────────────────────────────────
    { id:'lb30', ico:'🌱', name:'Semilla Plantada',  desc:'Registra tu primer libro en proceso', type:'added',   target:1   },
    { id:'lb31', ico:'🔄', name:'Modo Hábito',       desc:'Ten 2 libros leídos en meses distintos', type:'monthStreak', target:2 },
    { id:'lb32', ico:'📆', name:'Racha de Lectura',  desc:'Lee al menos 1 libro en 3 meses consecutivos', type:'monthStreak', target:3 },
    // ── REFLEXIÓN Y PROFUNDIDAD ───────────────────────────────────────────
    { id:'lb33', ico:'💬', name:'Con Propósito',     desc:'Añade notas a 3 libros completados',  type:'noted',   target:3   },
    { id:'lb34', ico:'✍️', name:'Lector Reflexivo',  desc:'Añade notas a 10 libros completados', type:'noted',   target:10  },
    { id:'lb35', ico:'🧭', name:'Buscador de Verdad',desc:'Añade notas a 20 libros completados', type:'noted',   target:20  },
    // ── VELOCIDAD Y LOGRO ─────────────────────────────────────────────────
    { id:'lb36', ico:'⚡', name:'Arranque Rápido',   desc:'Termina un libro en menos de 7 días',  type:'fastRead', target:7  },
    { id:'lb37', ico:'🏎️', name:'Velocista',        desc:'Termina 2 libros rápidos (≤7 días)',    type:'fastRead', target:14 },
    { id:'lb38', ico:'🚄', name:'Tren Expreso',      desc:'Completa 3 libros en menos de un mes', type:'monthDone', target:3 },
    // ── DIVERSIDAD Y APERTURA ─────────────────────────────────────────────
    { id:'lb39', ico:'🗺️', name:'Mente Abierta',    desc:'Lee libros de 3 categorías distintas', type:'cats',    target:3   },
    { id:'lb40', ico:'🌍', name:'Polímata en Camino',desc:'Lee libros de 6 categorías distintas', type:'cats',    target:6   },
    // ── SUPERACIÓN PERSONAL ───────────────────────────────────────────────
    { id:'lb41', ico:'🧗', name:'Escalando',         desc:'Supera los 30 libros leídos',          type:'done',    target:30  },
    { id:'lb42', ico:'🏔️', name:'Cima Alcanzada',   desc:'Supera los 40 libros leídos',          type:'done',    target:40  },
    { id:'lb43', ico:'🌟', name:'Versión Mejorada',  desc:'Supera los 75 libros leídos',          type:'done',    target:75  },
    // ── WISHLIST Y AMBICIÓN ───────────────────────────────────────────────
    { id:'lb44', ico:'💭', name:'Gran Soñador',      desc:'Ten 5 libros en lista de deseos',      type:'wishlist', target:5  },
    { id:'lb45', ico:'🔭', name:'Visión de Futuro',  desc:'Ten 20 libros en lista de deseos',     type:'wishlist', target:20 },
    // ── LIBROS EN LISTA DE DESEOS ─────────────────────────────────────────
    { id:'lb46', ico:'🔖', name:'Soñador',           desc:'Ten 3 libros en lista de deseos',  type:'wishlist', target:3  },
    { id:'lb47', ico:'💭', name:'Ambicioso',         desc:'Ten 10 libros en lista de deseos', type:'wishlist', target:10 },
    // ── RACHAS Y VELOCIDAD ────────────────────────────────────────────────
    { id:'lb48', ico:'⚡', name:'Sprint Literario',  desc:'Completa 2 libros en un mes',       type:'monthDone', target:2 },
    { id:'lb49', ico:'🌪️', name:'Torbellino',       desc:'Completa 3 libros en un mes',       type:'monthDone', target:3 },
    { id:'lb50', ico:'🌟', name:'Imparable',         desc:'Completa 5 libros en un mes',       type:'monthDone', target:5 },
  ];
}

// ── Migración: añade books[] si no existe ─────────────────────────────────
function libEnsureState(){
  if(!S.books)              S.books              = [];
  if(!S.libAchievements || S.libAchievements.length < 50)
                            S.libAchievements    = libDefaultAchievements();
  if(!S.libAchievCompleted) S.libAchievCompleted = {};
  if(!S.nBid)               S.nBid               = 1;
  if(!S.customCats)         S.customCats         = {};
  if(!S.catOverrides)       S.catOverrides       = {};
  // bookOfMonth: id del libro marcado como objetivo del mes
}

// ── Evaluación de logro de lectura ────────────────────────────────────────
function _libMonthDone(){
  // Libros terminados en el mes natural actual
  if(!S.books) return 0;
  const now = new Date();
  const ym  = now.getFullYear()*100 + now.getMonth();
  return S.books.filter(b=>{
    if(b.status!=='done'||!b.finishedAt) return false;
    const d = new Date(b.finishedAt);
    return d.getFullYear()*100+d.getMonth()===ym;
  }).length;
}
function _libTotalPages(){
  if(!S.books) return 0;
  return S.books.filter(b=>b.status==='done').reduce((s,b)=>s+(b.pages||0),0);
}
// Cuenta libros con notas escritas (campo notes no vacío) y status done
function _libNotedCount(){ return (S.books||[]).filter(b=>b.status==='done'&&b.notes&&b.notes.trim().length>0).length; }
// Cuenta meses distintos en que se terminó al menos 1 libro (para monthStreak)
function _libMonthStreakCount(){
  const months = new Set((S.books||[]).filter(b=>b.status==='done'&&b.finishedAt).map(b=>{
    const d=new Date(b.finishedAt); return d.getFullYear()*100+d.getMonth();
  }));
  // Contar meses consecutivos hasta hoy
  const sorted = [...months].sort((a,b)=>a-b);
  let streak=0, prev=null;
  for(const ym of sorted){
    if(prev===null){ streak=1; }
    else{
      const pY=Math.floor(prev/100), pM=prev%100;
      const cY=Math.floor(ym/100),   cM=ym%100;
      const diff = (cY-pY)*12+(cM-pM);
      if(diff===1) streak++;
      else streak=1;
    }
    prev=ym;
  }
  return streak;
}
// fastRead: target = días máximos para terminar 1 libro; cuenta libros terminados en ≤target días
function _libFastReadCount(maxDays){
  return (S.books||[]).filter(b=>{
    if(b.status!=='done'||!b.finishedAt||!b.createdAt) return false;
    const days = Math.round((new Date(b.finishedAt)-new Date(b.createdAt))/(1000*60*60*24));
    return days<=maxDays && days>=0;
  }).length;
}
function evalLibAchievement(a){
  if(!S.books) return false;
  const done = S.books.filter(b=>b.status==='done');
  const all  = S.books;
  switch(a.type){
    case 'done':        return done.length >= a.target;
    case 'added':       return all.length  >= a.target;
    case 'half':        return all.filter(b=>b.progress>=50).length >= a.target;
    case 'cats':        return new Set(done.map(b=>b.cat)).size >= a.target;
    case 'catDone':     return done.filter(b=>b.cat===a.cat).length >= a.target;
    case 'pages':       return _libTotalPages() >= a.target;
    case 'wishlist':    return all.filter(b=>b.status==='wishlist').length >= a.target;
    case 'monthDone':   return _libMonthDone() >= a.target;
    case 'noted':       return _libNotedCount() >= a.target;
    case 'monthStreak': return _libMonthStreakCount() >= a.target;
    case 'fastRead':    return _libFastReadCount(a.target) >= 1;
    default:            return false;
  }
}
function getLibAchievProgress(a){
  if(!S.books) return {cur:0, max:a.target};
  const done = S.books.filter(b=>b.status==='done');
  const all  = S.books;
  switch(a.type){
    case 'done':        return {cur:done.length, max:a.target};
    case 'added':       return {cur:all.length,  max:a.target};
    case 'half':        return {cur:all.filter(b=>b.progress>=50).length, max:a.target};
    case 'cats':        return {cur:new Set(done.map(b=>b.cat)).size, max:a.target};
    case 'catDone':     return {cur:done.filter(b=>b.cat===a.cat).length, max:a.target};
    case 'pages':       return {cur:_libTotalPages(), max:a.target};
    case 'wishlist':    return {cur:all.filter(b=>b.status==='wishlist').length, max:a.target};
    case 'monthDone':   return {cur:_libMonthDone(), max:a.target};
    case 'noted':       return {cur:_libNotedCount(), max:a.target};
    case 'monthStreak': return {cur:_libMonthStreakCount(), max:a.target};
    case 'fastRead':    return {cur:_libFastReadCount(a.target), max:1};
    default:            return {cur:0, max:a.target};
  }
}

// ── Ritmo de lectura ──────────────────────────────────────────────────────
// Calcula páginas/día promedio de los últimos 30 días basándose en progreso
// guardado.
// NOTA: S.readingLog = [{date:'YYYY-MM-DD', pages:N}] está reservado para un
// futuro registro diario de páginas leídas, pero actualmente NO se puebla
// desde ningún módulo. Esta función deriva el ritmo a partir de S.books
// (finishedAt + pages de libros terminados), no de readingLog.
// No eliminar readingLog del estado: está en defaultState() para cuando
// se implemente el registro diario.
function libReadingPace(){
  if(!S.books) return null;
  // Suma páginas de libros terminados con finishedAt en últimos 30 días
  const now  = Date.now();
  const day  = 86400000;
  const d30  = now - 30*day;
  let pagesMonth = 0;
  let pagesWeek  = 0;
  S.books.forEach(b=>{
    if(b.status!=='done'||!b.finishedAt||!b.pages) return;
    const t = new Date(b.finishedAt).getTime();
    if(t>=d30)  pagesMonth += b.pages;
    if(t>=now-7*day) pagesWeek += b.pages;
  });
  // Ritmo: páginas/día últimos 30d
  const paceDay  = pagesMonth/30;
  const paceWeek = pagesWeek/7;
  // Proyección: usar el mejor de ambos (o promedio ponderado)
  const projDay  = (paceDay+paceWeek)/2 || paceDay || paceWeek;
  return {
    pDay   : Math.round(projDay*10)/10,
    projW  : Math.round(projDay*7),
    projM  : Math.round(projDay*30),
    month  : pagesMonth,
    week   : pagesWeek
  };
}

function renderLibReadingPace(){
  const p = libReadingPace();
  if(!p||(!p.month&&!p.week)) return '';
  // Libro pendiente actual
  const cur = S.books?.find(b=>b.status==='reading');
  let etaHtml = '';
  if(cur && cur.pages && p.pDay>0){
    const pct      = cur.progress||0;
    const remaining= Math.round(cur.pages*(1-pct/100));
    const days     = Math.ceil(remaining/p.pDay);
    const eta      = new Date(Date.now()+days*86400000);
    const etaStr   = eta.toLocaleDateString('es-CO',{day:'numeric',month:'short'});
    etaHtml = `<div class="lib-pace-eta">📖 "${escH(cur.title||'Libro actual')}" · ~${remaining} pág restantes · terminas ~<strong>${etaStr}</strong> (${days}d)</div>`;
  }
  return `
    <div class="lib-section-hdr">
      <div class="lib-section-line"></div>
      <span class="lib-section-title">◈ RITMO DE LECTURA</span>
      <div class="lib-section-line"></div>
    </div>
    <div class="lib-pace-box">
      <div class="lib-pace-row">
        <div class="lib-pace-stat">
          <span class="lib-pace-num">${p.pDay>0?p.pDay:'—'}</span>
          <span class="lib-pace-lbl">páginas por día</span>
          <span class="lib-pace-sub">ritmo promedio</span>
        </div>
        <div class="lib-pace-stat">
          <span class="lib-pace-num">${p.projW||'—'}</span>
          <span class="lib-pace-lbl">páginas en 7 días</span>
          <span class="lib-pace-sub">si mantienes el ritmo</span>
        </div>
        <div class="lib-pace-stat">
          <span class="lib-pace-num">${p.projM||'—'}</span>
          <span class="lib-pace-lbl">páginas en 30 días</span>
          <span class="lib-pace-sub">si mantienes el ritmo</span>
        </div>
      </div>
      ${etaHtml}
      <div class="lib-pace-note">Calculado con libros terminados en los últimos 30 días</div>
    </div>`;
}

// ── Estadísticas rápidas ──────────────────────────────────────────────────
function libStats(){
  if(!S.books) return {total:0, done:0, reading:0, pages:0};
  const done    = S.books.filter(b=>b.status==='done').length;
  const reading = S.books.filter(b=>b.status==='reading').length;
  const pages   = S.books.filter(b=>b.status==='done')
                          .reduce((sum,b)=>sum+(b.pages||0),0);
  return { total:S.books.length, done, reading, pages };
}

// ── Filtrar + buscar ──────────────────────────────────────────────────────
function libFiltered(){
  if(!S.books) return [];
  return S.books.filter(b=>{
    const status = b.status || 'reading';
    const matchFilter = _libFilter==='all' || status===_libFilter;
    const q = _libSearch.toLowerCase().trim();
    const matchSearch = !q ||
      (b.title||'').toLowerCase().includes(q) ||
      (b.author||'').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

// ── Colores por estado ─────────────────────────────────────────────────────
function libStatusColor(status){
  const map = { reading:'#f0c040', done:'#4ade80', wishlist:'#c084fc', paused:'#94a3b8' };
  return map[status] || '#00aaff';
}
function libStatusLabel(status){
  const map = { reading:'LEYENDO', done:'TERMINADO', wishlist:'LISTA DESEOS', paused:'PAUSADO' };
  return map[status] || status;
}
function libStatusIcon(status){
  const map = { reading:'📖', done:'✅', wishlist:'🔖', paused:'⏸️' };
  return map[status] || '📚';
}

// ══════════════════════════════════════════════════════
// LIBRO DEL MES
// ══════════════════════════════════════════════════════
function libSetBookOfMonth(id){
  // Toggle: si ya era el mismo, lo deselecciona
  libEnsureState();
  S.bookOfMonth = (S.bookOfMonth === id) ? null : id;
  save();
  renderBiblioteca();
  renderLibBookOfMonth();
}

// Widget para el dashboard (tab misiones)
function renderLibBookOfMonth(){
  const el = document.getElementById('bookOfMonthWidget');
  if(!el) return;
  libEnsureState();

  // ── Libros terminados este mes natural ──────────────
  const now  = new Date();
  const ym   = now.getFullYear()*100 + now.getMonth();
  const daysLeft = Math.ceil((new Date(now.getFullYear(), now.getMonth()+1, 1) - now) / 86400000);
  const doneThisMonth = (S.books||[]).filter(b=>{
    if(b.status!=='done'||!b.finishedAt) return false;
    const d = new Date(b.finishedAt);
    return d.getFullYear()*100 + d.getMonth() === ym;
  });
  const count = doneThisMonth.length;

  // ── Nivel de logro mensual ───────────────────────────
  // 1 libro = normal, 2 = bronce, 3 = plata, 5+ = oro
  const BADGES = [
    { min:5, ico:'🏆', lbl:'¡IMPARABLE!',      cls:'gold'   },
    { min:3, ico:'🌪️', lbl:'¡TORBELLINO!',     cls:'silver' },
    { min:2, ico:'⚡', lbl:'¡SPRINT LITERARIO!',cls:'bronze' },
    { min:1, ico:'📖', lbl:'EN RACHA',          cls:'base'   },
  ];
  const badge = count ? BADGES.find(b=>count>=b.min) : null;

  // ── Widget libro del mes (objetivo marcado) ──────────
  const b = S.bookOfMonth ? (S.books||[]).find(x=>x.id===S.bookOfMonth) : null;
  const pct = b ? (b.progress||0) : 0;
  const cover = b ? (b.coverUrl
    ? `<img src="${escH(b.coverUrl)}" class="bom-cover-img" alt=""
           onerror="this.style.display='none';this.nextElementSibling.style.display=''">
       <span class="bom-cover-emoji" style="display:none">${b.ico||'📚'}</span>`
    : `<span class="bom-cover-emoji">${b.ico||'📚'}</span>`) : '';

  // ── Medalla lateral del BOM ──────────────────────────
  const bomMedal = pct>=100
    ? `<div class="bom-medal bom-medal-done">
         <div class="bom-medal-ico">🏅</div>
         <div class="bom-medal-lbl">LEÍDO</div>
         ${count ? `<div class="bom-medal-sep"></div>
         <div class="bom-medal-count-ico">${badge?badge.ico:'📚'}</div>
         <div class="bom-medal-count-txt">${count} LEÍDO${count>1?'S':''}<br>ESTE MES</div>` : ''}
       </div>`
    : `<div class="bom-medal">
         <div class="bom-medal-ring">
           <svg viewBox="0 0 44 44" class="bom-medal-svg">
             <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(0,100,200,0.2)" stroke-width="3"/>
             <circle cx="22" cy="22" r="18" fill="none" stroke="#f0c040" stroke-width="3"
               stroke-dasharray="${Math.round(113*pct/100)} 113"
               stroke-linecap="round"
               transform="rotate(-90 22 22)"/>
           </svg>
           <div class="bom-medal-num">${pct}<span class="bom-medal-sym">%</span></div>
         </div>
         <div class="bom-medal-lbl">${daysLeft}d REST.</div>
         ${count ? `<div class="bom-medal-sep"></div>
         <div class="bom-medal-count-ico">${badge?badge.ico:'📚'}</div>
         <div class="bom-medal-count-txt">${count} LEÍDO${count>1?'S':''}<br>ESTE MES</div>` : ''}
       </div>`;

  const bomHtml = b ? `
    <div class="bom-widget">
      <div class="bom-label">◈ LIBRO DEL MES</div>
      <div class="bom-body">
        <div class="bom-cover">${cover}</div>
        <div class="bom-info">
          <div class="bom-title">${escH(b.title||'Sin título')}</div>
          <div class="bom-author">${escH(b.author||'')}</div>
          <div class="bom-bar-wrap"><div class="bom-bar-fill" style="width:${pct}%"></div></div>
          <div class="bom-stats">
            <span class="bom-pct">${pct}%</span>
            ${b.pages?`<span class="bom-pages">· ${b.currentPage||Math.round(b.pages*pct/100)} / ${b.pages} pág</span>`:''}
            <span class="bom-days">· ${daysLeft}d restantes</span>
          </div>
          ${pct>=100
            ? `<div class="bom-done">✓ ¡COMPLETADO ESTE MES!</div>`
            : `<button class="bom-cta" onclick="switchTab('biblioteca')">→ Actualizar progreso</button>`}
        </div>
        ${bomMedal}
      </div>
    </div>` : '';

  el.innerHTML = bomHtml;
}

// ══════════════════════════════════════════════════════
// RENDER PRINCIPAL
// ══════════════════════════════════════════════════════
function renderBiblioteca(){
  const el = document.getElementById('tab-biblioteca');
  if(!el) return;
  libEnsureState();

  const stats    = libStats();
  const books    = libFiltered();
  const reading  = S.books.filter(b=>b.status==='reading');
  // Prioriza el libro del mes si está siendo leído; si no, el primero en lectura
  const bomReading = S.bookOfMonth ? reading.find(b=>b.id===S.bookOfMonth) : null;
  const currentBook = bomReading || (reading.length ? reading[0] : null);

  el.innerHTML = `
    <!-- Estadísticas rápidas -->
    <div class="shdr"><div class="sline"></div><span class="stitle">📚 <span class="txt-short">LIBROS</span><span class="txt-full">BIBLIOTECA — REGISTRO DE LECTURA</span></span><div class="sline"></div></div>

    <div class="lib-stats-row" style="margin-bottom:14px;">
      <div class="lib-stat">
        <span class="lib-stat-num">${stats.total}</span>
        <span class="lib-stat-lbl">TOTAL</span>
      </div>
      <div class="lib-stat">
        <span class="lib-stat-num">${stats.reading}</span>
        <span class="lib-stat-lbl">LEYENDO</span>
      </div>
      <div class="lib-stat">
        <span class="lib-stat-num">${stats.done}</span>
        <span class="lib-stat-lbl">LEÍDOS</span>
      </div>
      <div class="lib-stat">
        <span class="lib-stat-num" style="font-size:calc(11px * var(--fs-scale))">${stats.pages>0?stats.pages.toLocaleString('es-CO'):'—'}</span>
        <span class="lib-stat-lbl">PÁGINAS</span>
      </div>
    </div>

    <!-- Leyendo ahora (hero card) -->
    ${currentBook && (_libFilter==='all'||_libFilter==='reading') ? renderLibCurrentHero(currentBook) : ''}

    <!-- Toolbar: buscar + filtros + vista -->
    <div class="lib-toolbar">
      <input class="lib-search" placeholder="🔍 Buscar título o autor..." value="${escH(_libSearch)}"
             oninput="_libSearch=this.value;renderBiblioteca()">
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${['all','reading','done','wishlist','paused'].map(f=>`
          <button class="lib-filter-btn${_libFilter===f?' active':''}" onclick="libSetFilter('${f}')">
            ${f==='all'?'TODO':libStatusLabel(f).split(' ')[0]}
          </button>`).join('')}
      </div>
      <div class="lib-view-toggle">
        <button class="lib-view-btn${_libView==='grid'?' active':''}" onclick="libSetView('grid')" title="Galería">▦</button>
        <button class="lib-view-btn${_libView==='list'?' active':''}" onclick="libSetView('list')" title="Lista">☰</button>
      </div>
    </div>

    <!-- Grid / lista de libros -->
    ${(()=>{
      const heroVisible = !!(currentBook && (_libFilter==='all'||_libFilter==='reading'));
      const gridBooks = heroVisible ? books.filter(b=>b.id!==currentBook.id) : books;
      if(!gridBooks.length){
        if(heroVisible) return '';
        return '<div class="lib-empty"><span class="lib-empty-icon">📚</span>'
          + (S.books.length===0 ? 'Tu biblioteca está vacía.<br>Añade tu primer libro con el botón de abajo.' : 'Sin libros con ese filtro.')
          + '</div>';
      }
      return '<div class="lib-grid'+(_libView==='list'?' list-view':'')+'">'
        + gridBooks.map(b => _libView==='list' ? renderLibListCard(b) : renderLibGridCard(b)).join('')
        + '</div>';
    })()}

    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
    <button class="lib-add-btn" onclick="openBookModal()">＋ AÑADIR LIBRO</button>
    <button onclick="libOpenCatManager()" style="padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.18);color:var(--muted);font-family:'Orbitron',monospace;font-size:calc(8px * var(--fs-scale));letter-spacing:1px;cursor:pointer;border-radius:4px;white-space:nowrap;">✏️ CATEGORÍAS</button>
    </div>

    <!-- Ritmo de lectura -->
    ${renderLibReadingPace()}

    <!-- Logros de lectura -->
    <div class="lib-section-hdr">
      <div class="lib-section-line"></div>
      <span class="lib-section-title">◈ LOGROS DE LECTURA</span>
      <div class="lib-section-line"></div>
    </div>
    ${renderLibAchievements()}

    <!-- Modal (siempre en DOM para no recrear) -->
    ${renderLibModalHTML()}
  `;

  // Sincronizar slider si hay modal abierto (no aplica en render limpio)
}

// ── Hero del libro actual ─────────────────────────────────────────────────
function renderLibCurrentHero(b){
  const pct = b.progress||0;
  return `
    <div class="lib-current-hero" onclick="openBookModal('${escH(b.id)}')">
      <div class="lib-current-hero-ico">
        ${b.coverUrl
          ? `<img src="${escH(b.coverUrl)}" alt="" loading="lazy" class="lib-hero-img"
               onerror="this.style.display='none';this.nextElementSibling.style.display=''">
             <span style="display:none">${b.ico||'📖'}</span>`
          : b.ico||'📖'}
      </div>
      <div class="lib-current-hero-body">
        <div class="lib-current-lbl">▸ LEYENDO AHORA</div>
        <div class="lib-current-title">${escH(b.title||'Sin título')}</div>
        <div class="lib-current-author">${escH(b.author||'')}</div>
        <div class="lib-current-bar-wrap">
          <div class="lib-current-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="lib-current-pct">${pct}% completado</div>
      </div>
      <div class="lib-current-actions" onclick="event.stopPropagation()">
        <button class="lib-prog-btn" onclick="libQuickProgress('${escH(b.id)}',10)">+10%</button>
        <button class="lib-prog-btn" onclick="libMarkDone('${escH(b.id)}')">✓ FIN</button>
        <button class="lib-prog-btn${S.bookOfMonth===b.id?' bom-active':''}"
                onclick="libSetBookOfMonth('${escH(b.id)}')"
                title="Libro del mes">${S.bookOfMonth===b.id?'★':'☆'} MES</button>
      </div>
    </div>`;
}

// ── Card de galería ────────────────────────────────────────────────────────
function renderLibGridCard(b){
  const pct   = b.progress||0;
  const color = libStatusColor(b.status);
  return `
    <div class="bcard ${b.status}" onclick="openBookModal('${escH(b.id)}')">
      <div class="bcard-cover">
        <div class="bcard-cover-stripe" style="background:${color}"></div>
        ${b.coverUrl
          ? `<img src="${escH(b.coverUrl)}" alt="" loading="lazy" class="bcard-cover-img"
               onerror="this.style.display='none';this.nextElementSibling.style.display=''">
             <div class="bcard-cover-emoji" style="display:none">${b.ico||'📚'}</div>`
          : `<div class="bcard-cover-emoji">${b.ico||'📚'}</div>`}
        <div class="bcard-cover-status">${libStatusIcon(b.status)}</div>
        ${b.status==='done'?`<div class="bcard-medal">✓ LEÍDO</div>`:''}
        ${b.status==='reading'?`<div class="bcard-reading-badge">${pct}%</div>`:''}
        <div class="bcard-progress-bar">
          <div class="bcard-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="bcard-info">
        <div class="bcard-title">${escH(b.title||'Sin título')}</div>
        <div class="bcard-author">${escH(b.author||'')}</div>
        <button class="bcard-bom-btn${S.bookOfMonth===b.id?' active':''}"
                onclick="event.stopPropagation();libSetBookOfMonth('${escH(b.id)}')"
                title="${S.bookOfMonth===b.id?'Quitar como libro del mes':'Marcar como libro del mes'}">
          ${S.bookOfMonth===b.id?'★ MES':'☆ MES'}
        </button>
      </div>
    </div>`;
}

// ── Card de lista ──────────────────────────────────────────────────────────
function renderLibListCard(b){
  const pct   = b.progress||0;
  const color = libStatusColor(b.status);
  return `
    <div class="bcard-list ${b.status}" onclick="openBookModal('${escH(b.id)}')">
      <div class="bcard-list-ico">
        ${b.coverUrl
          ? `<img src="${escH(b.coverUrl)}" alt="" loading="lazy" class="bcard-list-img"
               onerror="this.style.display='none';this.nextElementSibling.style.display=''">
             <span style="display:none">${b.ico||'📚'}</span>`
          : b.ico||'📚'}
      </div>
      <div class="bcard-list-body">
        <div class="bcard-list-title">${escH(b.title||'Sin título')}</div>
        <div class="bcard-list-meta">${escH(b.author||'')}${b.cat&&libGetCats()[b.cat]?' · '+libGetCats()[b.cat]:''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <div>
          <div class="bcard-list-bar">
            <div class="bcard-list-bar-fill" style="width:${pct}%;background:${b.status==='done'?'#4ade80':'linear-gradient(90deg,var(--blue),var(--gold))'}"></div>
          </div>
        </div>
        <div class="bcard-list-pct" style="color:${color}">${b.status==='done'?'✓':b.status==='wishlist'?'🔖':pct+'%'}</div>
      </div>
    </div>`;
}

// ── Logros de lectura ──────────────────────────────────────────────────────
// _libAchievExpanded: bool — controla si se muestran todos o solo los últimos 3
let _libAchievExpanded = false;

function _libAchievCard(a){
  const done = evalLibAchievement(a);
  const prog = getLibAchievProgress(a);
  const pct  = Math.min(100, Math.round((prog.cur/prog.max)*100));
  const xpR  = a.target>=50 ? 80 : a.target>=20 ? 50 : a.target>=10 ? 30 : a.target>=5 ? 20 : 10;
  return `<div class="lib-achiev-card${done?' done':''}" onclick="libShowAchievDetail('${a.id}')">
    <div class="lib-achiev-ico">${done?a.ico:'🔒'}</div>
    <div class="lib-achiev-name">${escH(a.name)}</div>
    <div class="lib-achiev-desc" style="font-size:calc(9px * var(--fs-scale));color:var(--muted);margin-bottom:4px;line-height:1.3;">${escH(a.desc)}</div>
    <div class="lib-achiev-pbar"><div class="lib-achiev-pfill" style="width:${pct}%"></div></div>
    <div class="lib-achiev-prog">${prog.cur}/${prog.max}</div>
    <div style="font-size:calc(9px * var(--fs-scale));color:${done?'#f0c040':'var(--muted)'};margin-top:2px;">${done?'✓ +'+xpR+' XP':'⭐ +'+xpR+' XP'}</div>
  </div>`;
}

function renderLibAchievements(){
  libEnsureState();
  if(!S.libAchievCompleted) S.libAchievCompleted = {};
  const all      = S.libAchievements;
  const total    = all.length;
  const unlocked = all.filter(a=>evalLibAchievement(a)).length;
  // Últimos 3 desbloqueados; si ninguno → 3 más próximos a desbloquear
  const doneList = all.filter(a=>evalLibAchievement(a));
  let show3;
  if(doneList.length>0){
    show3 = doneList.slice(-3);
  } else {
    show3 = [...all].sort((a,b)=>{
      const pa=getLibAchievProgress(a), pb=getLibAchievProgress(b);
      return (pb.cur/pb.max)-(pa.cur/pa.max);
    }).slice(0,3);
  }
  const visibleList = _libAchievExpanded ? all : show3;
  const hidden      = total - show3.length;
  const isProximos  = doneList.length===0;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:calc(11px * var(--fs-scale));color:var(--muted);">${unlocked} / ${total} desbloqueados</span>
      ${hidden>0||_libAchievExpanded?`<button class="lib-achiev-toggle" onclick="_libAchievExpanded=!_libAchievExpanded;renderBiblioteca()">${_libAchievExpanded?'− Ocultar':'+ Ver todos ('+total+')'}</button>`:''}
    </div>
    <div class="lib-achiev-grid">${visibleList.map(_libAchievCard).join('')}</div>
    ${!_libAchievExpanded&&isProximos?'<div style="text-align:center;color:var(--muted);font-size:calc(9px * var(--fs-scale));padding:4px 0 8px;">Estos son tus próximos logros por desbloquear 🎯</div>':''}`;
}

// ── Detalle de logro (overlay al click) ──────────────────────────────────
function libShowAchievDetail(id){
  libEnsureState();
  const a = S.libAchievements.find(x=>x.id===id);
  if(!a) return;
  const done = evalLibAchievement(a);
  const prog = getLibAchievProgress(a);
  const pct  = Math.min(100, Math.round((prog.cur/prog.max)*100));
  const xpR  = a.target>=50?80:a.target>=20?50:a.target>=10?30:a.target>=5?20:10;
  // Reutilizar overlay o crearlo
  let ov = document.getElementById('libAchievOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'libAchievOverlay';
    ov.onclick = e=>{ if(e.target===ov) ov.classList.remove('show'); };
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <div class="lib-achiev-detail-box">
      <div class="lib-achiev-detail-ico">${done?a.ico:'🔒'}</div>
      <div class="lib-achiev-detail-name">${escH(a.name)}</div>
      <div class="lib-achiev-detail-desc">${escH(a.desc)}</div>
      <div class="lib-achiev-detail-pbar">
        <div class="lib-achiev-detail-pfill" style="width:${pct}%"></div>
      </div>
      <div class="lib-achiev-detail-prog">${prog.cur} / ${prog.max}</div>
      <div class="lib-achiev-detail-xp" style="color:${done?'#f0c040':'var(--muted)'}">
        ${done?'✓ DESBLOQUEADO · +'+xpR+' XP ganados':'⭐ +'+xpR+' XP al desbloquear'}
      </div>
      <button class="lib-achiev-detail-close" onclick="document.getElementById('libAchievOverlay').classList.remove('show')">CERRAR</button>
    </div>`;
  ov.classList.add('show');
}

// ══════════════════════════════════════════════════════
// MODAL HTML (renderizado en el tab, no fuera)
