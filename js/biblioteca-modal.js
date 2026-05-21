// ╔══════════════════════════════════════════════════════════════════╗
// ║  biblioteca-modal.js  —  Modal de libro y acciones              ║
// ║  Contiene: renderLibModalHTML, openBookModal, saveBook          ║
// ║             libSyncProgress, libDeleteCurrent, libCatManager   ║
// ║             libQuickProgress, libMarkDone, updateBookProgress  ║
// ║  Depende de: biblioteca-core.js                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// ══════════════════════════════════════════════════════
function renderLibModalHTML(){
  return `
  <div id="libModal">
    <div class="lib-modal-box">
      <div class="lib-modal-title" id="libModalTitle">◈ AÑADIR LIBRO</div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Portada</span>
        <div class="lib-modal-emoji-row" id="libEmojiRow">
          ${BOOK_EMOJIS.map(e=>`<span class="lib-emoji-opt" onclick="libSelectEmoji('${e}')">${e}</span>`).join('')}
        </div>
        <input type="hidden" id="libIco" value="📚">
        <input class="lib-modal-inp" id="libCoverUrl" type="url"
               placeholder="URL de portada (opcional) — pegar link de imagen"
               style="margin-top:6px;font-size:calc(9px * var(--fs-scale));"
               oninput="libPreviewCover(this.value)">
        <div id="libCoverPreview" style="display:none;margin-top:6px;text-align:center;">
          <img id="libCoverImg" src="" alt="portada"
               style="max-height:90px;max-width:70px;object-fit:cover;border:1px solid rgba(0,170,255,0.3);">
        </div>
      </div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Título</span>
        <input class="lib-modal-inp" id="libTitle" placeholder="Nombre del libro" maxlength="80">
      </div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Autor</span>
        <input class="lib-modal-inp" id="libAuthor" placeholder="Nombre del autor" maxlength="60">
      </div>

      <div style="display:flex;gap:8px;">
        <div class="lib-modal-row" style="flex:1">
          <span class="lib-modal-lbl">Estado</span>
          <select class="lib-modal-sel" id="libStatus" onchange="libModalStatusChange()">
            <option value="reading">📖 Leyendo</option>
            <option value="done">✅ Terminado</option>
            <option value="wishlist">🔖 Lista deseos</option>
            <option value="paused">⏸️ Pausado</option>
          </select>
        </div>
        <div class="lib-modal-row" style="flex:1">
          <span class="lib-modal-lbl">Categoría</span>
          <select class="lib-modal-sel" id="libCat" onchange="libCatSelectChange()">
            ${Object.entries(libGetCats()).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
            <option value="__new__">＋ Nueva categoría…</option>
          </select>
          <div id="libNewCatRow" style="display:none;margin-top:6px;gap:6px;display:none;flex-direction:row;">
            <input class="lib-modal-inp" id="libNewCatEmoji" placeholder="emoji" maxlength="4" style="width:48px;text-align:center;">
            <input class="lib-modal-inp" id="libNewCatName" placeholder="Nombre categoría" style="flex:1;">
          </div>
        </div>
      </div>

      <div class="lib-modal-row" id="libProgressRow">
        <span class="lib-modal-lbl">Progreso</span>
        <div class="lib-modal-progress-wrap">
          <input type="range" class="lib-modal-progress-inp" id="libProgress" min="0" max="100" value="0"
                 oninput="libSyncProgress('slider')">
          <span class="lib-modal-pct-display" id="libPctDisplay">0%</span>
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <div class="lib-modal-row" style="flex:1">
          <span class="lib-modal-lbl">Páginas totales</span>
          <input class="lib-modal-inp" id="libPages" type="number" min="0" placeholder="ej: 320"
                 oninput="libSyncProgress('pages')">
        </div>
        <div class="lib-modal-row" style="flex:1">
          <span class="lib-modal-lbl">Página actual</span>
          <input class="lib-modal-inp" id="libCurrentPage" type="number" min="0" placeholder="ej: 80"
                 oninput="libSyncProgress('currentPage')">
        </div>
      </div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Notas</span>
        <textarea class="lib-modal-textarea" id="libNotes" placeholder="Apuntes, citas favoritas..."></textarea>
      </div>

      <div class="lib-modal-btns">
        <button class="lib-mbtn" onclick="closeLibModal()">CANCELAR</button>
        <button class="lib-mbtn danger" id="libDeleteBtn" onclick="libDeleteCurrent()" style="display:none">ELIMINAR</button>
        <button class="lib-mbtn primary" onclick="saveBook()">GUARDAR</button>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
// ACCIONES
// ══════════════════════════════════════════════════════

function libSetFilter(f){
  _libFilter = f;
  renderBiblioteca();
}
function libSetView(v){
  _libView = v;
  renderBiblioteca();
}
function libSelectEmoji(e){
  document.getElementById('libIco').value = e;
  document.querySelectorAll('.lib-emoji-opt').forEach(el=>{
    el.classList.toggle('selected', el.textContent===e);
  });
}
// ── Portada: helper render y preview ─────────────────────────────────────
// Devuelve HTML de portada: img si hay URL, emoji si no
function _libCover(b, size){
  // size: 'hero' | 'grid' | 'list'
  if(b.coverUrl){
    const s = size==='hero'?'70px':size==='grid'?'100%':'40px';
    const h = size==='hero'?'90px':size==='grid'?'100%':'52px';
    return `<img src="${escH(b.coverUrl)}" alt="" loading="lazy"
             style="width:${s};height:${h};object-fit:cover;display:block;"
             onerror="this.style.display='none';this.nextElementSibling.style.display=''">
            <span style="display:none">${b.ico||'📚'}</span>`;
  }
  return b.ico||'📚';
}
function libPreviewCover(url){
  const prev = document.getElementById('libCoverPreview');
  const img  = document.getElementById('libCoverImg');
  if(!prev||!img) return;
  if(url){ img.src=url; prev.style.display='block'; }
  else   { prev.style.display='none'; img.src=''; }
}

// Sincroniza slider ↔ página actual ↔ porcentaje
function libSyncProgress(src){
  const sliderEl  = document.getElementById('libProgress');
  const pctEl     = document.getElementById('libPctDisplay');
  const pagesEl   = document.getElementById('libPages');
  const curPageEl = document.getElementById('libCurrentPage');
  if(!sliderEl||!pctEl) return;
  const totalPages = parseInt(pagesEl?.value)||0;
  if(src==='slider'){
    // Slider mueve el %, calcula página aproximada pero NO sobreescribe si ya hay una
    const pct = parseInt(sliderEl.value)||0;
    pctEl.textContent = pct+'%';
    if(totalPages>0 && curPageEl)
      curPageEl.value = Math.round(totalPages*pct/100);
  } else if(src==='currentPage'||src==='pages'){
    // Páginas tienen prioridad: el % se calcula desde la página, se redondea a entero
    const cur = parseInt(curPageEl?.value)||0;
    if(totalPages>0 && cur>0){
      const pct = Math.min(100, Math.round(cur/totalPages*100));
      sliderEl.value = pct;
      pctEl.textContent = pct+'%';
    } else if(totalPages>0 && cur===0){
      sliderEl.value = 0;
      pctEl.textContent = '0%';
    }
  }
}

function libModalStatusChange(){
  const status = document.getElementById('libStatus').value;
  const row    = document.getElementById('libProgressRow');
  if(!row) return;
  if(status==='wishlist'){
    row.style.opacity='.4';
    row.style.pointerEvents='none';
  } else if(status==='done'){
    const inp = document.getElementById('libProgress');
    const disp= document.getElementById('libPctDisplay');
    if(inp){ inp.value=100; }
    if(disp){ disp.textContent='100%'; }
    row.style.opacity='1';
    row.style.pointerEvents='auto';
  } else {
    row.style.opacity='1';
    row.style.pointerEvents='auto';
  }
}

function openBookModal(id){
  libEnsureState();
  _libEditId = id||null;

  // Asegurar que el modal existe en DOM
  if(!document.getElementById('libModal')) renderBiblioteca();

  const modal = document.getElementById('libModal');
  if(!modal) return;

  const titleEl = document.getElementById('libModalTitle');
  const delBtn  = document.getElementById('libDeleteBtn');

  if(id){
    const b = S.books.find(x=>x.id===id);
    if(!b) return;
    titleEl.textContent = '◈ EDITAR LIBRO';
    delBtn.style.display='';
    // Rellenar campos
    document.getElementById('libTitle').value  = b.title||'';
    document.getElementById('libAuthor').value = b.author||'';
    document.getElementById('libStatus').value = b.status||'reading';
    document.getElementById('libCat').value    = b.cat||'otro';
    document.getElementById('libPages').value  = b.pages||'';
    document.getElementById('libNotes').value  = b.notes||'';
    const pct = b.progress||0;
    document.getElementById('libProgress').value   = pct;
    document.getElementById('libPctDisplay').textContent = pct+'%';
    // Página actual: usar la guardada directamente, no recalcular desde %
    const cpEl = document.getElementById('libCurrentPage');
    if(cpEl) cpEl.value = b.currentPage || ((b.pages&&pct) ? Math.round(b.pages*pct/100) : '');
    // Emoji
    const ico = b.ico||'📚';
    document.getElementById('libIco').value = ico;
    document.querySelectorAll('.lib-emoji-opt').forEach(el=>
      el.classList.toggle('selected', el.textContent===ico)
    );
    const urlEl = document.getElementById('libCoverUrl');
    if(urlEl){ urlEl.value = b.coverUrl||''; libPreviewCover(b.coverUrl||''); }
  } else {
    titleEl.textContent = '◈ AÑADIR LIBRO';
    delBtn.style.display='none';
    document.getElementById('libTitle').value  = '';
    document.getElementById('libAuthor').value = '';
    document.getElementById('libStatus').value = 'reading';
    document.getElementById('libCat').value    = 'otro';
    document.getElementById('libPages').value  = '';
    document.getElementById('libNotes').value  = '';
    document.getElementById('libProgress').value   = 0;
    document.getElementById('libPctDisplay').textContent = '0%';
    const cpEl2 = document.getElementById('libCurrentPage');
    if(cpEl2) cpEl2.value = '';
    document.getElementById('libIco').value = '📚';
    document.querySelectorAll('.lib-emoji-opt').forEach(el=>el.classList.remove('selected'));
    document.querySelector('.lib-emoji-opt')?.classList.add('selected');
    const urlEl2 = document.getElementById('libCoverUrl');
    if(urlEl2){ urlEl2.value=''; libPreviewCover(''); }
  }
  libModalStatusChange();
  modal.classList.add('show');
}

function closeLibModal(){
  const modal = document.getElementById('libModal');
  if(modal) modal.classList.remove('show');
  _libEditId = null;
}

// ── Categorías personalizadas ─────────────────────────────────────────────
function libCatSelectChange(){
  const sel = document.getElementById('libCat');
  const row = document.getElementById('libNewCatRow');
  if(!sel||!row) return;
  row.style.display = sel.value==='__new__' ? 'flex' : 'none';
}
function _libSaveCustomCat(){
  // Guarda nueva cat si el select está en __new__, devuelve key guardada o null
  libEnsureState();
  const sel  = document.getElementById('libCat');
  if(!sel||sel.value!=='__new__') return null;
  const emoji= (document.getElementById('libNewCatEmoji')?.value||'📂').trim();
  const name = (document.getElementById('libNewCatName')?.value||'').trim();
  if(!name){ notif('⚠ Escribe un nombre para la categoría'); return null; }
  const key  = 'c_'+name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,16)||('c'+Date.now());
  if(!S.customCats) S.customCats = {};
  S.customCats[key] = emoji+' '+name;
  save();
  return key;
}

// ── Renombrar / gestionar categorías ─────────────────────────────────────
function libOpenCatManager(){
  libEnsureState();
  let ov = document.getElementById('libCatManagerOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'libCatManagerOverlay';
    // Estilos de overlay idénticos a #libAchievOverlay
    Object.assign(ov.style, {
      display:'none', position:'fixed', inset:'0',
      background:'rgba(0,5,15,0.88)', zIndex:'9100',
      alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(4px)'
    });
    ov.onclick = e => { if(e.target===ov) ov.style.display='none'; };
    document.body.appendChild(ov);
  }
  ov.style.display = 'flex';
  _libRenderCatManager();
}

function _libRenderCatManager(){
  const ov = document.getElementById('libCatManagerOverlay');
  if(!ov) return;
  libEnsureState();
  const baseCats  = BOOK_CATS_BASE;
  const custom    = S.customCats||{};
  const overrides = S.catOverrides||{};

  const rowStyle = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  const emojiInp = (key,val) => `<input id="cme_${key}" value="${escH(val)}" maxlength="4"
    style="width:42px;text-align:center;background:rgba(0,15,40,0.8);border:1px solid rgba(0,170,255,0.25);
    color:var(--bright);border-radius:3px;padding:6px 4px;font-size:20px;flex-shrink:0;">`;
  const nameInp  = (key,val) => `<input id="cmn_${key}" value="${escH(val)}"
    style="flex:1;background:rgba(0,15,40,0.8);border:1px solid rgba(0,170,255,0.25);
    color:var(--bright);border-radius:3px;padding:7px 10px;font-size:calc(11px * var(--fs-scale));
    font-family:'Orbitron',monospace;letter-spacing:1px;">`;
  const resetBtn = key => `<button onclick="libCatReset('${key}')" title="Restaurar original"
    style="background:none;border:1px solid rgba(0,170,255,0.2);color:rgba(0,170,255,0.5);
    border-radius:3px;padding:5px 9px;cursor:pointer;font-size:11px;transition:all .15s;flex-shrink:0;"
    onmouseover="this.style.color='var(--blue)'" onmouseout="this.style.color='rgba(0,170,255,0.5)'">✕</button>`;
  const delBtn   = key => `<button onclick="libDeleteCustomCat('${key}')" title="Eliminar"
    style="background:none;border:1px solid rgba(255,68,102,0.25);color:rgba(255,68,102,0.5);
    border-radius:3px;padding:5px 9px;cursor:pointer;font-size:11px;transition:all .15s;flex-shrink:0;"
    onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='rgba(255,68,102,0.5)'">✕</button>`;

  const baseRows = Object.entries(baseCats).map(([key,defVal])=>{
    const cur   = overrides[key]||defVal;
    const parts = cur.split(' ');
    const emoji = parts[0]||'📂';
    const label = parts.slice(1).join(' ')||defVal.split(' ').slice(1).join(' ');
    return `<div style="${rowStyle}">${emojiInp(key,emoji)}${nameInp(key,label)}${resetBtn(key)}</div>`;
  }).join('');

  const customSection = Object.keys(custom).length ? `
    <div style="margin:14px 0 8px;font-size:calc(9px * var(--fs-scale));color:var(--blue);
      letter-spacing:2px;font-family:'Orbitron',monospace;border-top:1px solid rgba(0,170,255,0.1);
      padding-top:12px;">— CATEGORÍAS PROPIAS —</div>
    ${Object.entries(custom).map(([key,val])=>{
      const parts=val.split(' '); const emoji=parts[0]||'📂'; const label=parts.slice(1).join(' ');
      return `<div style="${rowStyle}">${emojiInp(key,emoji)}${nameInp(key,label)}${delBtn(key)}</div>`;
    }).join('')}` : '';

  ov.innerHTML = `
    <div style="background:rgba(0,10,28,0.98);border:1px solid rgba(0,170,255,0.35);
      padding:28px 24px 20px;width:min(480px,92vw);max-height:88vh;
      display:flex;flex-direction:column;gap:0;animation:fadeInUp .18s ease;">

      <!-- Título igual al detalle de logro -->
      <div style="font-family:'Orbitron',monospace;font-size:calc(13px * var(--fs-scale));
        font-weight:700;color:var(--bright);letter-spacing:3px;text-align:center;margin-bottom:6px;">
        ✏️ CATEGORÍAS
      </div>
      <div style="font-size:calc(9px * var(--fs-scale));color:var(--muted);text-align:center;
        margin-bottom:18px;line-height:1.5;letter-spacing:.5px;">
        Cambia emoji y nombre. Los libros se actualizan solos.
      </div>

      <!-- Lista scrollable -->
      <div style="overflow-y:auto;flex:1;padding-right:6px;max-height:calc(88vh - 180px);">
        ${baseRows}${customSection}
      </div>

      <!-- Botones igual a lib-achiev-detail-close -->
      <div style="display:flex;gap:8px;margin-top:18px;">
        <button onclick="libSaveCatNames()"
          style="flex:1;padding:9px;background:rgba(0,200,100,0.1);
          border:1px solid rgba(0,200,100,0.35);color:var(--green);
          font-family:'Orbitron',monospace;font-size:calc(9px * var(--fs-scale));
          letter-spacing:2px;cursor:pointer;transition:all .15s;"
          onmouseover="this.style.background='rgba(0,200,100,0.2)'"
          onmouseout="this.style.background='rgba(0,200,100,0.1)'">✓ GUARDAR</button>
        <button onclick="document.getElementById('libCatManagerOverlay').style.display='none'"
          style="padding:9px 18px;background:none;border:1px solid rgba(0,170,255,0.3);
          color:var(--blue);font-family:'Orbitron',monospace;font-size:calc(9px * var(--fs-scale));
          letter-spacing:2px;cursor:pointer;transition:all .15s;"
          onmouseover="this.style.color='var(--bright)'"
          onmouseout="this.style.color='var(--blue)'">CERRAR</button>
      </div>
    </div>`;
}
function libSaveCatNames(){
  libEnsureState();
  if(!S.catOverrides) S.catOverrides={};
  const allKeys = [...Object.keys(BOOK_CATS_BASE), ...Object.keys(S.customCats||{})];
  allKeys.forEach(key=>{
    const eEl=document.getElementById('cme_'+key);
    const nEl=document.getElementById('cmn_'+key);
    if(!eEl||!nEl) return;
    const emoji=(eEl.value||'📂').trim();
    const name=(nEl.value||'').trim();
    if(!name) return;
    const newVal=emoji+' '+name;
    if(BOOK_CATS_BASE[key]){
      // Es categoría base: guardar override si difiere del default
      if(newVal!==BOOK_CATS_BASE[key]) S.catOverrides[key]=newVal;
      else delete S.catOverrides[key];
    } else {
      // Es categoría custom: actualizar directamente
      if(!S.customCats) S.customCats={};
      S.customCats[key]=newVal;
    }
  });
  save();
  notif('✓ Categorías actualizadas');
  document.getElementById('libCatManagerOverlay').style.display='none';
  renderBiblioteca();
}
function libCatReset(key){
  const eEl=document.getElementById('cme_'+key);
  const nEl=document.getElementById('cmn_'+key);
  if(!eEl||!nEl) return;
  const def=BOOK_CATS_BASE[key]||'';
  const parts=def.split(' ');
  eEl.value=parts[0]||'📂';
  nEl.value=parts.slice(1).join(' ');
}
function libDeleteCustomCat(key){
  libEnsureState();
  if(S.customCats&&S.customCats[key]) delete S.customCats[key];
  save();
  _libRenderCatManager();
  renderBiblioteca();
}

function saveBook(){
  libEnsureState();
  const title  = (document.getElementById('libTitle').value||'').trim();
  if(!title){ notif('⚠ El título es obligatorio'); return; }

  const author = (document.getElementById('libAuthor').value||'').trim();
  const status = document.getElementById('libStatus').value;
  const _catRaw = document.getElementById('libCat').value;
  const cat    = _catRaw==='__new__' ? (_libSaveCustomCat()||'otro') : _catRaw;
  if(_catRaw==='__new__' && cat==='otro') return; // validación falló
  const pages  = parseInt(document.getElementById('libPages').value)||0;
  const notes  = (document.getElementById('libNotes').value||'').trim();
  const curPageRaw = parseInt(document.getElementById('libCurrentPage')?.value)||0;
  const currentPage = Math.min(curPageRaw, pages);
  const progress= pages>0 && currentPage>0 ? Math.round(currentPage/pages*100) : parseInt(document.getElementById('libProgress').value)||0;
  const ico      = document.getElementById('libIco').value||'📚';
  const coverUrl = (document.getElementById('libCoverUrl')?.value||'').trim();

  if(_libEditId){
    const idx = S.books.findIndex(b=>b.id===_libEditId);
    if(idx<0) return;
    const prev = S.books[idx];
    const prevProg = prev.progress||0;
    S.books[idx] = {...prev, title, author, status, cat, pages, notes, progress, currentPage, ico, coverUrl,
      finishedAt: status==='done'&&prev.status!=='done' ? localISO() : (prev.finishedAt||null),
      updatedAt: Date.now()
    };
    // XP: libro recién terminado
    if(status==='done' && prev.status!=='done'){
      const xpBook = pages>=400 ? 250 : pages>=200 ? 175 : 100;
      gainXP(xpBook);
      notif(`📚 ¡LIBRO COMPLETADO! +${xpBook} XP`);
      if(typeof FX!=='undefined') FX.questComplete();
      // XP bonus páginas
      if(pages>=1000){ gainXP(500); notif('📜 ¡Libro épico (+1000 pág)! +500 XP'); }
      else if(pages>=500){ gainXP(250); notif('📃 ¡Libro largo (+500 pág)! +250 XP'); }
    }
    // XP: hito de progreso (cruzó 25%, 50%, 75%)
    if(prev.status!=='done'){
      [[25,50],[50,100],[75,150]].forEach(([milestone, xp])=>{
        if(prevProg < milestone && progress >= milestone){
          gainXP(xp);
          notif(`📖 ${milestone}% completado +${xp} XP`);
        }
      });
    }
    // XP: se agregaron notas por primera vez
    if(!prev.notes && notes){ gainXP(20); notif('📝 Notas agregadas +20 XP'); }
  } else {
    const id = 'b'+S.nBid;
    S.nBid++;
    S.books.push({ id, title, author, status, cat, pages, notes, progress, currentPage, ico, coverUrl,
      addedAt: localISO(), finishedAt: status==='done'?localISO():null, updatedAt: Date.now() });
    // XP: añadir libro
    gainXP(40);
    notif('📚 Libro añadido +40 XP');
    if(status==='done'){
      const xpBook = pages>=400 ? 250 : pages>=200 ? 175 : 100;
      gainXP(xpBook);
      notif(`📚 ¡Añadido como leído! +${xpBook} XP`);
      if(pages>=1000){ gainXP(500); notif('📜 ¡Libro épico (+1000 pág)! +500 XP'); }
      else if(pages>=500){ gainXP(250); notif('📃 ¡Libro largo (+500 pág)! +250 XP'); }
    }
    // XP: primera categoría diversa
    if(status==='done'){
      const doneBycat = S.books.filter(b=>b.status==='done');
      const uniqueCats = new Set(doneBycat.map(b=>b.cat)).size;
      if(uniqueCats===3){ gainXP(20); notif('🌍 ¡3 categorías distintas! +20 XP'); }
      else if(uniqueCats===5){ gainXP(35); notif('✨ ¡Polímata! 5 categorías +35 XP'); }
      else if(uniqueCats===7){ gainXP(60); notif('🎭 ¡Renacentista! 7 categorías +60 XP'); }
    }
  }

  // Evaluar logros y notificar nuevos
  _libCheckNewAchievements();

  save();
  closeLibModal();
  renderWithFlash();
  switchTab('biblioteca');
}

function libDeleteCurrent(){
  if(!_libEditId) return;
  if(!confirm('¿Eliminar este libro de la biblioteca?')) return;
  libEnsureState();
  S.books = S.books.filter(b=>b.id!==_libEditId);
  save();
  closeLibModal();
  renderWithFlash();
  switchTab('biblioteca');
}

// ── Detecta logros recién desbloqueados y da XP ───────────────────────────
function _libCheckNewAchievements(){
  libEnsureState();
  if(!S.libAchievCompleted) S.libAchievCompleted = {};
  S.libAchievements.forEach(a=>{
    if(!S.libAchievCompleted[a.id] && evalLibAchievement(a)){
      S.libAchievCompleted[a.id] = true;
      // XP por logro desbloqueado según dificultad (target)
      const xp = a.target>=50 ? 80 : a.target>=20 ? 50 : a.target>=10 ? 30 : a.target>=5 ? 20 : 10;
      gainXP(xp);
      notif(`${a.ico} ¡LOGRO! ${a.name} +${xp} XP`);
      if(typeof FX!=='undefined') FX.questComplete();
    }
  });
}

// Incremento rápido de progreso (+N%)
function libQuickProgress(id, delta){
  libEnsureState();
  const b = S.books.find(x=>x.id===id);
  if(!b) return;
  const prevProg = b.progress||0;
  b.progress = Math.min(100, prevProg+delta);
  // Sincronizar currentPage con el nuevo progreso
  if(b.pages) b.currentPage = Math.round(b.pages * b.progress / 100);
  // XP por hitos de progreso
  [[25,50],[50,100],[75,150]].forEach(([milestone, xp])=>{
    if(prevProg < milestone && b.progress >= milestone){
      gainXP(xp);
      notif(`📖 ${milestone}% completado +${xp} XP`);
    }
  });
  if(b.progress>=100){ b.progress=100; }
  save();
  renderWithFlash();
  switchTab('biblioteca');
  notif(`📖 Progreso: ${b.progress}%`);
}

// Marcar como terminado desde el hero
function libMarkDone(id){
  libEnsureState();
  const b = S.books.find(x=>x.id===id);
  if(!b) return;
  const wasDone = b.status==='done';
  b.status   = 'done';
  b.progress = 100;
  b.finishedAt = localISO();
  if(!wasDone){
    const xpBook = (b.pages||0)>=400 ? 250 : (b.pages||0)>=200 ? 175 : 100;
    gainXP(xpBook);
    notif(`📚 ¡LIBRO COMPLETADO! +${xpBook} XP`);
    if((b.pages||0)>=1000){ gainXP(500); notif('📜 ¡Libro épico (+1000 pág)! +500 XP'); }
    else if((b.pages||0)>=500){ gainXP(250); notif('📃 ¡Libro largo (+500 pág)! +250 XP'); }
    if(typeof FX!=='undefined') FX.questComplete();
    _libCheckNewAchievements();
  }
  save();
  renderWithFlash();
  switchTab('biblioteca');
}

// Delegación de updateBookProgress para uso externo
function updateBookProgress(id, pct){
  libEnsureState();
  const b = S.books.find(x=>x.id===id);
  if(!b) return;
  b.progress = Math.max(0, Math.min(100, pct));
  save();
}
