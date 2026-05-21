# STRUCTURE.md — Guía de navegación para edición con IA
> Última actualización: optimización v1
> Carga este archivo primero en cualquier sesión de IA para ubicarte sin leer el proyecto completo.

## 📁 Archivos JS — qué editar para cada cambio

| Si quieres cambiar... | Archivo |
|---|---|
| Toggle/claim de misión diaria, semanal, mensual | `ui-actions-missions.js` |
| Swap de misiones, edición inline de misión | `ui-actions-missions.js` |
| Tienda, inventario, canje de ítems | `ui-actions-shop.js` |
| Agregar/editar ítems de tienda | `ui-actions-shop.js` |
| Config (rangos, nombre, reset) | `ui-actions-shop.js` |
| Render del tab de misiones | `ui-render.js` |
| Render del libro del mes, stats, filtros | `biblioteca-core.js` |
| Modal de edición de libro, guardar libro | `biblioteca-modal.js` |
| Asignación semanal/mensual, reset de periodo | `auth.js` |
| XP, niveles, streaks, logros | `rewards.js` |
| Categorías, rangos, labels | `constants.js` |
| Estado global S, defaultState | `storage.js` |
| Inicialización al cargar | `ui-init.js` |
| Finanzas, gráficas de dinero | `ui-finance.js` |
| Animaciones de XP y efectos | `animations.js`, `effects.js` |

## 🗂 index.html — marcadores de sección (§)
Busca estos comentarios para ubicarte rápido:
- `§TAB:missions` — Tab de misiones (activo al inicio)
- `§SEC:missions-daily` — Misión diaria
- `§SEC:missions-weekly` — Misión semanal
- `§SEC:missions-monthly` — Misión mensual
- `§SEC:missions-bank` — Banco de misiones
- `§TAB:shop` — Tienda
- `§TAB:inventory` — Inventario
- `§TAB:profile` — Perfil y logros
- `§TAB:finance` — Finanzas
- `§TAB:library` — Biblioteca
- `§TAB:config` — Configuración
- `§MODAL:redeem` — Modal canje
- `§MODAL:edit-item` — Modal editar ítem

## 🔑 Estado global S — campos clave

# CAZADOR QUEST LOG — MAPA DE ESTRUCTURA

> Guía de navegación para modificaciones asistidas por IA.
> Leer este archivo antes de editar cualquier otro. Indica exactamente qué archivo tocar para cada tipo de cambio.

---

## STACK

HTML monopágina · CSS vanilla · JS vanilla · localStorage (sin frameworks, sin build)

**Carga de scripts** (orden estricto — dependencias en cascada):
```
constants.js → storage.js → auth.js → rewards.js → animations.js
→ notifications.js → effects.js
→ ui-finance.js → ui-utils.js → ui-mood.js → ui-actions.js → ui-render.js → ui-init.js
```

---

## ARCHIVOS JS — QUÉ HACE CADA UNO

| Archivo | §§ | Responsabilidad |
|---|---|---|
| `constants.js` | §01 | Constantes globales: CLASSES, CAT_LABELS, DAILY_CATS, PRANK, XPR. Variables mutables globales: S, currentUser, pendingId, editingMissionId, shopPeriod, currentPeriod |
| `storage.js` | §02 | getUserKey(), loadState(), defaultState(), defaultAchievements(), save() |
| `auth.js` | §03–05 | doLogin(), doLogout(), assignDailyMissions(), getDailyMissions(), checkReset(), updateResetUI(), changeResetHour() |
| `rewards.js` | §06–07 | gainXP(), getRank(), detectClass(), renderAchievements(), renderAchievEditor(), addAchiev(), delAchiev() |
| `animations.js` | §08 | morphAvatarEmoji(), morphProfileAvatar(), updateClassUI() |
| `notifications.js` | §09 | notif(msg) — toast superior |
| `effects.js` | — | FX.levelUp(), FX.purchase(), FX.income(), FX.expense(), FX.questComplete(), FX.itemRemoved() |
| **`ui-finance.js`** | §18 | formatCOP(), getTotalBalance(), setFinPeriod/Type/Cat(), addTransaction(), delTransaction(), renderFinTab(), renderFinTxList(), renderFinChartBars(), renderFinCatChart() |
| **`ui-utils.js`** | §17 | changeFontSize(), setFont(), applyMobileTypography(), switchTab(), toggleAllQuests(), tick(), escH(), localISO(), setPeriod(), getCatDataForPeriod(), renderPerfil(), drawRadar(), renderCatBars(), renderSummary(), evalAchievement(), getAchievProgress() |
| **`ui-mood.js`** | §19 | MOOD_XP, MOOD_LABELS, setMood(), getTodayMood(), renderMoodWidget() |
| **`ui-actions.js`** | §13–16 | toggle(), startEditMission(), saveEditMission(), delMission(), claimDaily(), swapDailyMission(), setShopPeriod(), getXPForPeriod(), renderShop(), renderInventory(), renderItemCard(), openRedeem(), confirmRedeem(), openEditItem(), confirmEditItem(), delItem(), deleteInventoryItem(), closeModal(), addMission(), addItem(), saveName(), saveRanks(), saveMinBalance(), resetAll() |
| **`ui-render.js`** | §10–12 | render(), renderWithFlash(), renderDailyMissions(), renderMissionCard(), getRankStyle(), renderAllQuests() |
| **`ui-init.js`** | — | Arranque de sesión · Emoji picker (EP_CATS, EP_DATA, epBind, epToggle, epInit, epRenderGrid) · Templates (openTplModal, importTemplates) · Detección de dispositivo (initDeviceDetection) · tipToggle() |

---

## CSS — QUÉ HACE CADA ARCHIVO

| Archivo | Responsabilidad |
|---|---|
| `css/base.css` | Variables CSS (--blue, --gold, --green, --danger, --muted, --fs-scale, --mob-*), reset, header, player card, XP bar, tabs, modales, notif, emoji picker, animaciones globales |
| `css/dashboard.css` | Misiones (mcard, mchk, mname, mdesc, mxp, mrnk), daily, inline-edit, mood, config section, finance inputs |
| `css/cards.css` | Shop/inventory cards (icard, iname, icost), perfil, logros, barras de stats, transacciones finanzas |
| `css/modals.css` | Modal genérico (.modal), botones (.mbtn), template overlay (.tplOverlay) |
| `css/responsive.css` | --fs-scale overrides por clase · @media breakpoints (480px, 360px) · touch targets · landscape · variables --mob-* |

---

## ESTADO GLOBAL (objeto `S`)

Campos clave del objeto de usuario guardado en localStorage:

```
S = {
  name, lvl, totalXP, curXP, nextXP,    // progresión
  streak, totalComp, todayXP, lastDate,  // estadísticas
  claimed,                               // recompensa diaria reclamada hoy
  missions[],                            // banco completo de misiones
  items[],                               // tienda + inventario
  dailyAssigned: { ids[], date, prevIds[] }, // misiones del día
  catCounts{},                           // conteos por categoría
  dailyLog[],                            // historial XP por día
  achievements[],                        // logros
  transactions[],                        // finanzas
  shopXP,                                // XP de tienda (separado de totalXP)
  minBalance,                            // colchón de seguridad COP
  activeTab,                             // tab activo al cerrar
  shopPeriod, profilePeriod, finPeriod,  // períodos seleccionados
  xprConfig{},                           // tabla XPR editable
  nMid, nIid, nTid,                      // contadores de IDs
  resetHour,                             // hora de reset diario (0-23)
}
```

---

## DÓNDE TOCAR PARA CAMBIOS FRECUENTES

| Cambio | Archivo(s) |
|---|---|
| Añadir/quitar campo a la misión | `ui-render.js` → renderMissionCard() + renderAllQuests() |
| Cambiar lógica de completar misión | `ui-actions.js` → toggle() |
| Cambiar lógica de XP / niveles | `rewards.js` → gainXP() |
| Cambiar rotación diaria | `auth.js` → assignDailyMissions() |
| Añadir tab nuevo | `index.html` (HTML del tab) + `ui-render.js` → render() + `ui-utils.js` → switchTab() |
| Nuevo objeto en tienda / inventario | `ui-actions.js` → renderItemCard(), confirmRedeem() |
| Nueva transacción de finanzas | `ui-finance.js` → addTransaction(), renderFinTab() |
| Nuevo logro | `storage.js` → defaultAchievements() + `rewards.js` → evalAchievement() |
| Cambiar tamaños de fuente móvil | `css/responsive.css` (variables --mob-*) + `ui-utils.js` → applyMobileTypography() |
| Añadir emoji al picker | `ui-init.js` → EP_DATA array |
| Nueva categoría de misión | `constants.js` → CAT_LABELS + `ui-init.js` → EP_CATS + `auth.js` → DAILY_CATS si aplica |
| Cambiar animación de flash al guardar | `css/base.css` → @keyframes actionFlash + `ui-render.js` → renderWithFlash() |
| Nuevo efecto visual (compra, nivel) | `effects.js` → FX object (también: FX.questComplete para misiones, FX.itemRemoved para inventario) |

---

## CONVENCIONES

- **`renderWithFlash()`** — llamar desde CUALQUIER botón que modifique datos. Nunca llamar `render()` directo desde una acción.
- **`save()`** — llamar antes de `renderWithFlash()` en toda acción que mute `S`.
- **IDs de misión**: siempre string con prefijo `'m'` (ej: `'m101'`). IDs de item: `'i'`. IDs de transacción: `'t'`.
- **Fechas**: usar `localISO()` (YYYY-MM-DD en hora local Colombia). Nunca `new Date().toISOString()` (da UTC).
- **Escape HTML**: usar `escH()` en todo texto dinámico que se inserta en innerHTML.
- **Font scale**: todos los `font-size` en CSS deben usar `calc(Npx * var(--fs-scale))` para respetar el zoom del usuario.


---

## 🎨 Mapa de clases CSS por archivo

### base.css — Variables globales y reset
| Variable / Clase | Qué controla |
|---|---|
| `--gold`, `--bright`, `--accent` | Colores principales del tema |
| `--fs-scale` | Escala global de fuentes |
| `.tabcontent`, `.tabcontent.active` | Visibilidad de tabs |
| `.shdr`, `.stitle`, `.sline` | Cabeceras de sección |
| `.tip-block`, `.tip-detail` | Bloques de ayuda colapsables |
| `.claimbtn` | Botón de reclamar recompensa |

### cards.css — Tarjetas de misión
| Clase | Qué controla |
|---|---|
| `.mcard` | Contenedor de misión |
| `.mcard.done` | Estado completado (fondo verde) |
| `.mchk`, `.mchk.yes` | Checkbox de misión |
| `.mname`, `.mdesc`, `.mfoot` | Contenido de la tarjeta |
| `.mxp`, `.mrnk`, `.mbonus` | Badges de XP, rango y bonus |
| `.act-btn.swap` | Botón 🔀 cambiar misión |

### dashboard.css — Tabs y layout general
| Clase | Qué controla |
|---|---|
| `.tab`, `.tab.active` | Botones de navegación superior |
| `.hud-bar`, `.hud-xp-fill` | Barra de XP del HUD |
| `.hud-avatar` | Icono de perfil en HUD |
| `.allquests-toggle-btn` | Botón +/- del banco de misiones |

### modals.css — Modales y overlays
| Clase | Qué controla |
|---|---|
| `#modal.show` | Modal de confirmación |
| `#delInvModal.show` | Modal de borrar ítem |
| `.modal-overlay` | Fondo oscuro de modales |
| `.modal-box` | Caja blanca del modal |

### biblioteca.css — Tab de libros
| Clase | Qué controla |
|---|---|
| `.lib-grid`, `.lib-list` | Vista galería vs lista |
| `.lib-card`, `.lib-card.reading` | Tarjeta de libro y estado leyendo |
| `.bom-bar-fill` | Barra de progreso libro del mes |
| `.bom-stats`, `.bom-pct` | Stats del libro del mes |
| `.lib-modal-btns`, `.lib-mbtn` | Botones del modal de libro |
| `.lib-achiev-grid` | Grid de logros de lectura |

### responsive.css — Breakpoints
| Media query | Aplica a |
|---|---|
| `max-width: 768px` | Tablets y móviles grandes |
| `max-width: 480px` | Móviles pequeños |
| `.txt-short`, `.txt-full` | Texto corto/largo según pantalla |
