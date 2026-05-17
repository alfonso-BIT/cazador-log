/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  EFFECTS.JS — Sistema de efectos visuales                               ║
   ║  Módulo independiente, sin dependencias externas excepto DOM             ║
   ║                                                                          ║
   ║  API pública:                                                            ║
   ║    FX.levelUp(lvl)           — subida de nivel                          ║
   ║    FX.purchase(icoEl, name)  — compra en tienda                         ║
   ║    FX.income(amt)            — ingreso de dinero                        ║
   ║    FX.expense(amt)           — gasto de dinero                          ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const FX = (() => {

  /* ── UTILIDADES ─────────────────────────────────────────────────────── */

  function el(tag, cls, css){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(css) Object.assign(e.style, css);
    return e;
  }

  function randBetween(a, b){ return a + Math.random() * (b - a); }
  function randInt(a, b)    { return Math.floor(randBetween(a, b)); }
  function randSign()       { return Math.random() < .5 ? 1 : -1; }

  /* Crea un contenedor temporal que se auto-destruye */
  function tempContainer(id, zIndex){
    const existing = document.getElementById(id);
    if(existing) existing.remove();
    const c = el('div', '', {
      position:'fixed', inset:'0',
      pointerEvents:'none',
      zIndex: String(zIndex),
      overflow:'hidden'
    });
    c.id = id;
    document.body.appendChild(c);
    return c;
  }

  /* ── PARTÍCULAS GENÉRICAS ───────────────────────────────────────────── */

  /**
   * Lanza N partículas desde un punto de origen (cx, cy en %).
   * @param {object} opts
   */
  function burst(opts){
    const {
      container, count, cx, cy,
      colors, chars, size = 8,
      speedX = 6, speedY = 10,
      gravity = 0.4, duration = 900,
      fade = true, spin = false
    } = opts;

    for(let i = 0; i < count; i++){
      const p = el('div', 'fx-particle');
      const color = colors[randInt(0, colors.length)];
      const char  = chars  ? chars[randInt(0, chars.length)] : null;

      Object.assign(p.style, {
        position:  'absolute',
        left:      cx + '%',
        top:       cy + '%',
        fontSize:  (char ? size * 1.8 : size) + 'px',
        color:     color,
        background: char ? 'none' : color,
        width:     char ? 'auto' : size + 'px',
        height:    char ? 'auto' : size + 'px',
        borderRadius: char ? '0' : '50%',
        boxShadow: char ? 'none' : `0 0 ${size*2}px ${color}`,
        pointerEvents: 'none',
        userSelect: 'none',
        fontWeight: '700',
        fontFamily: "'Orbitron', monospace",
        willChange: 'transform, opacity',
        zIndex: '1'
      });

      if(char) p.textContent = char;

      container.appendChild(p);

      const vx = randBetween(-speedX, speedX);
      const vy = randBetween(-speedY, -speedY * 0.3);
      let   gy = gravity;
      let   x  = 0, y = 0, op = 1, rot = 0;
      const rotSpeed = spin ? randBetween(-8, 8) : 0;
      const startTime = performance.now();

      function tick(now){
        const dt = (now - startTime) / 16; // normalize to ~60fps
        if(dt > duration / 16){ p.remove(); return; }

        x  += vx * 0.6;
        y  += vy * 0.6 + gy * dt * 0.2;
        rot+= rotSpeed;
        if(fade) op = Math.max(0, 1 - dt / (duration / 16));

        p.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
        p.style.opacity   = op;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }

  /* ── OVERLAY DE PANTALLA COMPLETA ───────────────────────────────────── */

  function flashScreen(color, duration = 400){
    const f = el('div', '', {
      position: 'fixed', inset: '0',
      background: color,
      pointerEvents: 'none',
      zIndex: '7000',
      opacity: '0',
      transition: `opacity ${duration * 0.25}ms ease-out`
    });
    document.body.appendChild(f);
    requestAnimationFrame(() => {
      f.style.opacity = '1';
      setTimeout(() => {
        f.style.opacity = '0';
        setTimeout(() => f.remove(), duration);
      }, duration * 0.25);
    });
  }

  /* ── TEXTO FLOTANTE ─────────────────────────────────────────────────── */

  function floatingText(text, cx, cy, color, fontSize = 18){
    const t = el('div', '', {
      position: 'fixed',
      left:     cx + 'px',
      top:      cy + 'px',
      transform: 'translate(-50%, -50%)',
      fontFamily: "'Orbitron', monospace",
      fontSize:   fontSize + 'px',
      fontWeight: '900',
      color:      color,
      textShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
      pointerEvents: 'none',
      zIndex: '8500',
      letterSpacing: '3px',
      whiteSpace: 'nowrap',
      willChange: 'transform, opacity'
    });
    t.textContent = text;
    document.body.appendChild(t);

    let y = 0, op = 1;
    const start = performance.now();
    const dur = 1400;

    function tick(now){
      const p = (now - start) / dur;
      if(p >= 1){ t.remove(); return; }
      y  = -p * 70;
      op = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      t.style.transform = `translate(-50%, calc(-50% + ${y}px))`;
      t.style.opacity   = op;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ── SHOCKWAVE (onda expansiva) ─────────────────────────────────────── */

  function shockwave(cx, cy, color){
    const r = el('div', '', {
      position: 'fixed',
      left:   cx + 'px',
      top:    cy + 'px',
      width:  '0px',
      height: '0px',
      border: `2px solid ${color}`,
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: '7500',
      opacity: '1',
      boxShadow: `0 0 12px ${color}`,
      willChange: 'width, height, opacity'
    });
    document.body.appendChild(r);

    let size = 0, op = 1;
    const start = performance.now();
    const maxSize = 120;
    const dur = 600;

    function tick(now){
      const p = (now - start) / dur;
      if(p >= 1){ r.remove(); return; }
      size = p * maxSize;
      op   = 1 - p;
      r.style.width   = size + 'px';
      r.style.height  = size + 'px';
      r.style.opacity = op;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ── EFECTO: COMPRA EN TIENDA ───────────────────────────────────────── */

  function purchase(anchorEl, itemName){
    // Buscar posición del elemento de trigger (icono del ítem)
    let cx = window.innerWidth  * 0.5;
    let cy = window.innerHeight * 0.4;
    if(anchorEl){
      const r = anchorEl.getBoundingClientRect();
      cx = r.left + r.width  / 2;
      cy = r.top  + r.height / 2;
    }

    // 1. Flash verde suave
    flashScreen('rgba(74,222,128,0.07)', 300);

    // 2. Shockwave dorada
    shockwave(cx, cy, '#f0c040');

    // 3. Partículas de estrellas y monedas
    const c = tempContainer('fx-purchase', 7200);
    const pctX = (cx / window.innerWidth)  * 100;
    const pctY = (cy / window.innerHeight) * 100;

    burst({
      container: c, count: 18,
      cx: pctX, cy: pctY,
      chars: ['★','◈','✦','$','◆'],
      colors: ['#f0c040','#ffd700','#ffe066','#ffffff'],
      size: 10, speedX: 7, speedY: 11,
      gravity: 0.35, duration: 900, spin: true
    });

    // 4. Texto flotante
    floatingText('★ OBTENIDO ★', cx, cy - 30, '#f0c040', 14);

    // Auto-destruir contenedor
    setTimeout(() => { const e = document.getElementById('fx-purchase'); if(e) e.remove(); }, 1200);
  }

  /* ── EFECTO: SUBIDA DE NIVEL ────────────────────────────────────────── */

  function levelUp(lvl){
    const cx = window.innerWidth  * 0.5;
    const cy = window.innerHeight * 0.45;

    // 1. Flash azul neon
    flashScreen('rgba(0,170,255,0.12)', 500);

    // 2. Doble shockwave
    shockwave(cx, cy, '#00aaff');
    setTimeout(() => shockwave(cx, cy, '#bf5fff'), 180);
    setTimeout(() => shockwave(cx, cy, '#00aaff'), 360);

    // 3. Lluvia de partículas desde arriba
    const c = tempContainer('fx-levelup', 7300);

    // Partículas desde el centro
    burst({
      container: c, count: 28,
      cx: 50, cy: 45,
      chars: ['▸','◈','✦','★','◆','▲'],
      colors: ['#00aaff','#bf5fff','#ffffff','#33ddff','#c084fc'],
      size: 9, speedX: 9, speedY: 13,
      gravity: 0.3, duration: 1100, spin: true
    });

    // Partículas punteadas desde bordes
    burst({
      container: c, count: 16,
      cx: 20, cy: 50,
      chars: null,
      colors: ['#00aaff','#bf5fff','#33ddff'],
      size: 5, speedX: 5, speedY: 9,
      gravity: 0.25, duration: 900
    });
    burst({
      container: c, count: 16,
      cx: 80, cy: 50,
      chars: null,
      colors: ['#00aaff','#bf5fff','#33ddff'],
      size: 5, speedX: 5, speedY: 9,
      gravity: 0.25, duration: 900
    });

    // 4. Textos flotantes escalonados
    floatingText('▸ NIVEL ' + lvl + ' ◂', cx, cy, '#00aaff', 16);
    setTimeout(() => floatingText('¡SUBIDA DE NIVEL!', cx, cy + 28, '#bf5fff', 11), 150);

    // 5. Efecto en el avatar
    const avatar = document.getElementById('avatarEl');
    if(avatar){
      const ring = avatar.querySelector('.avatar-morph-ring');
      if(ring){
        ring.classList.add('active');
        setTimeout(() => ring.classList.remove('active'), 1800);
      }
      avatar.style.transition = 'box-shadow .15s ease-out';
      avatar.style.boxShadow  = '0 0 0 2px #00aaff, 0 0 28px #00aaff, 0 0 60px rgba(0,170,255,0.4)';
      setTimeout(() => {
        avatar.style.boxShadow = '';
        avatar.style.transition = '';
      }, 1800);
    }

    // 6. Pulso en player card
    const pcard = document.querySelector('.pcard');
    if(pcard){
      pcard.classList.add('fx-lvlup-pulse');
      setTimeout(() => pcard.classList.remove('fx-lvlup-pulse'), 1000);
    }

    setTimeout(() => { const e = document.getElementById('fx-levelup'); if(e) e.remove(); }, 1500);
  }

  /* ── EFECTO: INGRESO DE DINERO ──────────────────────────────────────── */

  function income(amt){
    const cx = window.innerWidth  * 0.5;
    const cy = window.innerHeight * 0.55;

    flashScreen('rgba(74,222,128,0.06)', 350);
    shockwave(cx, cy, '#4ade80');

    const c = tempContainer('fx-income', 7100);

    burst({
      container: c, count: 14,
      cx: 50, cy: 55,
      chars: ['$','▲','◈','✦'],
      colors: ['#4ade80','#22c55e','#86efac','#ffffff'],
      size: 9, speedX: 6, speedY: 10,
      gravity: 0.3, duration: 900, spin: false
    });

    const formatted = typeof formatCOP === 'function' ? formatCOP(amt) : '+$' + amt;
    floatingText('▲ ' + formatted, cx, cy - 20, '#4ade80', 15);

    setTimeout(() => { const e = document.getElementById('fx-income'); if(e) e.remove(); }, 1200);
  }

  /* ── EFECTO: GASTO DE DINERO ────────────────────────────────────────── */

  function expense(amt){
    const cx = window.innerWidth  * 0.5;
    const cy = window.innerHeight * 0.55;

    flashScreen('rgba(255,68,102,0.06)', 350);
    shockwave(cx, cy, '#ff4466');

    const c = tempContainer('fx-expense', 7100);

    burst({
      container: c, count: 12,
      cx: 50, cy: 55,
      chars: ['$','▼','◈','✦'],
      colors: ['#ff4466','#ff6688','#ffaaaa','#ffffff'],
      size: 8, speedX: 5, speedY: 8,
      gravity: 0.28, duration: 800, spin: false
    });

    const formatted = typeof formatCOP === 'function' ? formatCOP(amt) : '-$' + amt;
    floatingText('▼ ' + formatted, cx, cy - 20, '#ff4466', 15);

    setTimeout(() => { const e = document.getElementById('fx-expense'); if(e) e.remove(); }, 1100);
  }

  /* ── EFECTO: MISIÓN COMPLETADA ──────────────────────────────────────── */

  function questComplete(cardId, xp){
    // Pulso verde en la card
    const card = document.getElementById('mc-' + cardId);
    if(card){
      card.classList.add('fx-quest-done');
      card.addEventListener('animationend', () => card.classList.remove('fx-quest-done'), { once: true });
    }

    // Origen: centro de la card o fallback al centro de pantalla
    let cx = window.innerWidth * 0.5;
    let cy = window.innerHeight * 0.45;
    if(card){
      const r = card.getBoundingClientRect();
      cx = r.left + r.width  * 0.5;
      cy = r.top  + r.height * 0.5;
    }

    flashScreen('rgba(74,222,128,0.08)', 300);
    shockwave(cx, cy, '#4ade80');

    const c = tempContainer('fx-quest', 7200);
    const pctX = (cx / window.innerWidth)  * 100;
    const pctY = (cy / window.innerHeight) * 100;

    burst({
      container: c, count: 16,
      cx: pctX, cy: pctY,
      chars: ['✓','◈','★','▸','✦'],
      colors: ['#4ade80','#22c55e','#86efac','#ffffff'],
      size: 9, speedX: 7, speedY: 11,
      gravity: 0.32, duration: 900, spin: true
    });

    floatingText('✓ +' + xp + ' XP', cx, cy - 24, '#4ade80', 14);

    setTimeout(() => { const e = document.getElementById('fx-quest'); if(e) e.remove(); }, 1200);
  }

  /* ── EFECTO: OBJETO ELIMINADO DEL INVENTARIO ────────────────────────── */

  function itemRemoved(anchorEl, itemName){
    let cx = window.innerWidth  * 0.5;
    let cy = window.innerHeight * 0.45;
    if(anchorEl){
      const r = anchorEl.getBoundingClientRect();
      cx = r.left + r.width  * 0.5;
      cy = r.top  + r.height * 0.5;
      // Animación de salida en la card
      anchorEl.classList.add('fx-item-removed');
    }

    flashScreen('rgba(255,68,102,0.07)', 300);
    shockwave(cx, cy, '#ff4466');

    const c = tempContainer('fx-itemdel', 7200);
    const pctX = (cx / window.innerWidth)  * 100;
    const pctY = (cy / window.innerHeight) * 100;

    burst({
      container: c, count: 13,
      cx: pctX, cy: pctY,
      chars: ['✕','◈','▼','✦'],
      colors: ['#ff4466','#ff6688','#ffaaaa','#ffffff'],
      size: 8, speedX: 6, speedY: 9,
      gravity: 0.3, duration: 800, spin: false
    });

    const label = itemName ? itemName.slice(0, 18) : 'OBJETO';
    floatingText('✕ ' + label, cx, cy - 20, '#ff4466', 13);

    setTimeout(() => { const e = document.getElementById('fx-itemdel'); if(e) e.remove(); }, 1100);
  }

  /* ── API PÚBLICA ─────────────────────────────────────────────────────── */
  return { levelUp, purchase, income, expense, questComplete, itemRemoved };

})();
