// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §08 — MORPH ANIMATION                                                  ║
// ║  Propósito: Animación de cross-dissolve entre emojis de avatar al       ║
// ║  cambiar de clase dominante. Renderiza emoji en canvas off-screen y     ║
// ║  hace blend píxel a píxel entre el emoji anterior y el nuevo.           ║
// ║  Funciones: renderEmojiToCanvas(), morphAvatarEmoji(),                  ║
// ║             morphProfileAvatar(), updateClassUI()                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function renderEmojiToCanvas(emoji, size, fontSize){
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size/2, size/2);
  return ctx.getImageData(0, 0, size, size);
}

function morphAvatarEmoji(el, fromEmoji, toEmoji, toColor, durationMs){
  const SIZE    = el.offsetWidth  || 62;
  const FONT    = Math.round(SIZE * 0.52);
  const canvas  = el.querySelector('.avatar-morph-canvas');
  const ring    = el.querySelector('.avatar-morph-ring');
  if(!canvas) return;

  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Renderizar frames fuente y destino
  const imgA = renderEmojiToCanvas(fromEmoji, SIZE, FONT);
  const imgB = renderEmojiToCanvas(toEmoji,   SIZE, FONT);

  const dataA = imgA.data; // Uint8ClampedArray [r,g,b,a, ...]
  const dataB = imgB.data;

  // Mostrar canvas encima del emoji
  canvas.style.opacity = '1';
  // Ocultar el texto del nodo principal durante la transición
  el.style.color = 'transparent';

  // Anillo de glow
  if(ring && toColor){
    ring.style.setProperty('--morph-color', toColor);
    el.style.setProperty('--morph-color', toColor);
    el.classList.remove('avatar-morphing');
    void el.offsetWidth; // reflow
    el.classList.add('avatar-morphing');
  }

  const startTime = performance.now();
  let rafId;

  function frame(now){
    const t = Math.min(1, (now - startTime) / durationMs);
    // Easing: smootherstep (quintic)
    const ease = t * t * t * (t * (t * 6 - 15) + 10);

    const out = ctx.createImageData(SIZE, SIZE);
    const od  = out.data;

    for(let i = 0; i < dataA.length; i += 4){
      // Cross-dissolve con leve desplazamiento radial para efecto "liquify"
      const px = (i/4) % SIZE;
      const py = Math.floor((i/4) / SIZE);
      const dx = px - SIZE/2;
      const dy = py - SIZE/2;
      const dist = Math.sqrt(dx*dx + dy*dy) / (SIZE/2); // 0 centro → 1 borde

      // El morph avanza desde el centro hacia afuera (wave radial)
      const localT = Math.max(0, Math.min(1, (ease - dist * 0.3) / 0.7));
      const localEase = localT * localT * (3 - 2 * localT); // smoothstep local

      od[i]   = dataA[i]   + (dataB[i]   - dataA[i])   * localEase;
      od[i+1] = dataA[i+1] + (dataB[i+1] - dataA[i+1]) * localEase;
      od[i+2] = dataA[i+2] + (dataB[i+2] - dataA[i+2]) * localEase;
      od[i+3] = dataA[i+3] + (dataB[i+3] - dataA[i+3]) * localEase;
    }

    ctx.putImageData(out, 0, 0);

    if(t < 1){
      rafId = requestAnimationFrame(frame);
    } else {
      // Transición completa — mostrar emoji real y ocultar canvas
      el.textContent = toEmoji;
      // Re-agregar los elementos hijos que se perdieron con textContent
      el.appendChild(canvas);
      if(ring) el.appendChild(ring);
      canvas.style.opacity = '0';
      el.style.color = '';
      el.classList.remove('avatar-morphing');
    }
  }

  cancelAnimationFrame(el._morphRaf);
  el._morphRaf = requestAnimationFrame(frame);
}

function morphProfileAvatar(el, fromEmoji, toEmoji, toColor, durationMs){
  if(!el) return;
  const SIZE  = el.offsetWidth || 72;
  const FONT  = Math.round(SIZE * 0.52);

  // Crear o reutilizar canvas overlay en el perfil
  let canvas = el.querySelector('.avatar-morph-canvas');
  if(!canvas){
    canvas = document.createElement('canvas');
    canvas.className = 'avatar-morph-canvas';
    Object.assign(canvas.style, {position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',opacity:'0',borderRadius:'2px'});
    el.appendChild(canvas);
  }
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  const imgA = renderEmojiToCanvas(fromEmoji, SIZE, FONT);
  const imgB = renderEmojiToCanvas(toEmoji,   SIZE, FONT);
  const dataA = imgA.data, dataB = imgB.data;

  canvas.style.opacity = '1';
  el.style.color = 'transparent';
  el.style.borderColor = toColor || '';
  el.style.boxShadow = toColor ? `0 0 24px ${toColor}66` : '';

  const startTime = performance.now();

  function frame(now){
    const t = Math.min(1, (now - startTime) / durationMs);
    const ease = t * t * t * (t * (t * 6 - 15) + 10);

    const out = ctx.createImageData(SIZE, SIZE);
    const od  = out.data;

    for(let i = 0; i < dataA.length; i += 4){
      const px = (i/4) % SIZE;
      const py = Math.floor((i/4) / SIZE);
      const dist = Math.sqrt((px-SIZE/2)**2+(py-SIZE/2)**2)/(SIZE/2);
      const localT = Math.max(0,Math.min(1,(ease-dist*0.3)/0.7));
      const le = localT*localT*(3-2*localT);

      od[i]   = dataA[i]   + (dataB[i]   - dataA[i])   * le;
      od[i+1] = dataA[i+1] + (dataB[i+1] - dataA[i+1]) * le;
      od[i+2] = dataA[i+2] + (dataB[i+2] - dataA[i+2]) * le;
      od[i+3] = dataA[i+3] + (dataB[i+3] - dataA[i+3]) * le;
    }
    ctx.putImageData(out, 0, 0);

    if(t < 1){
      requestAnimationFrame(frame);
    } else {
      el.textContent = toEmoji;
      el.appendChild(canvas);
      canvas.style.opacity = '0';
      el.style.color = '';
    }
  }
  requestAnimationFrame(frame);
}

function updateClassUI(){
  const cls    = detectClass();
  const banner = document.getElementById('classBanner');
  const pc     = document.getElementById('pclass');
  const av     = document.getElementById('avatarEl');
  const profileAv = document.getElementById('profileAvatar');

  if(cls){
    const catChanged = cls.cat !== _lastAvatarCat;

    banner.classList.add('show');
    document.getElementById('classNameEl').textContent = cls.emoji + ' ' + cls.name;
    document.getElementById('classDescEl').textContent = cls.desc;
    pc.textContent = '▸ ' + cls.name + ' — CAZADOR INDEPENDIENTE';

    if(catChanged){
      const fromEmoji = av.textContent.trim() || '⚔️';
      _lastAvatarCat  = cls.cat;

      // — Morph del avatar principal —
      av.style.borderColor = cls.color;
      av.style.boxShadow   = `0 0 18px ${cls.color}66`;
      morphAvatarEmoji(av, fromEmoji, cls.avatar, cls.color, 900);

      // — Color del nombre sincronizado con el marco —
      const pname = document.getElementById('pname');
      if(pname){
        pname.style.color      = cls.color;
        pname.style.textShadow = `0 0 12px ${cls.color}88`;
      }

      // — Morph del avatar de perfil —
      if(profileAv){
        const fromP = profileAv.textContent.trim() || '⚔️';
        morphProfileAvatar(profileAv, fromP, cls.avatar, cls.color, 900);
      }

      notif(cls.emoji + ' CLASE DOMINANTE: ' + cls.name + ' — ' + cls.weeklyCount + ' MISIONES ESTA SEMANA');

    } else {
      // Sin cambio — solo mantener valores
      av.style.borderColor = cls.color;
      av.style.boxShadow   = `0 0 14px ${cls.color}55`;
      const pname = document.getElementById('pname');
      if(pname){
        pname.style.color      = cls.color;
        pname.style.textShadow = `0 0 12px ${cls.color}88`;
      }
      if(profileAv){
        profileAv.style.borderColor = cls.color;
      }
    }

    const ratesEl = document.getElementById('catRatesBar');
    if(ratesEl) ratesEl.innerHTML = '';

  } else {
    banner.classList.remove('show');
    pc.textContent = '▸ CAZADOR INDEPENDIENTE';

    if(_lastAvatarCat !== null){
      const fromEmoji = av.textContent.trim() || _lastAvatarCat;
      _lastAvatarCat  = null;
      av.style.borderColor = 'var(--blue)';
      av.style.boxShadow   = '0 0 14px rgba(0,170,255,0.28)';
      morphAvatarEmoji(av, fromEmoji, '⚔️', '#00aaff', 900);
      if(profileAv) morphProfileAvatar(profileAv, profileAv.textContent.trim()||'⚔️', '⚔️', null, 900);
      const pname = document.getElementById('pname');
      if(pname){ pname.style.color = ''; pname.style.textShadow = ''; }
    } else {
      av.textContent       = '⚔️';
      av.style.borderColor = '';
      av.style.boxShadow   = '';
      const pname = document.getElementById('pname');
      if(pname){ pname.style.color = ''; pname.style.textShadow = ''; }
      if(profileAv){ profileAv.textContent='⚔️'; profileAv.style.borderColor=''; }
    }
  }
}

