# INDEX.md — Mapa quirúrgico de funciones

## 🤖 INSTRUCCIONES PARA IA — LEER ANTES DE CUALQUIER CAMBIO

1. **Este archivo es tu punto de entrada obligatorio.** No leas ningún `.js` completo sin consultarlo primero.
2. **Flujo de edición:**
   - Busca la función aquí → anota archivo + número de línea → lee solo ese rango con `view_range`
3. **Al agregar una función nueva:** añade su entrada en la tabla correspondiente con línea, nombre y descripción.
4. **Al eliminar una función:** borra su fila de la tabla.
5. **Al mover código entre archivos:** actualiza archivo y número de línea.
6. **Los números de línea cambian al editar.** Si insertas/eliminas líneas, actualiza las entradas afectadas en este índice.

> Formato de cada fila: `línea | función | qué hace`

---

## animations.js (249 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 9 | `renderEmojiToCanvas` |  |
| 21 | `morphAvatarEmoji` |  |
| 102 | `morphProfileAvatar` |  |
| 163 | `updateClassUI` |  |

## auth.js (462 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 30 | `bootSession` | Ruta compartida de arranque de sesión (auto-login al cargar + doLogin). |
| 57 | `doLogin` |  |
| 68 | `doLogout` |  |
| 89 | `restoreSessionUI` | rutas de entrada sean idénticas. Prerequisito: currentUser y S asignados. |
| 141 | `getTodayKey` |  |
| 149 | `assignDailyMissions` |  |
| 247 | `getDailyMissions` |  |
| 255 | `getWeekKey` |  |
| 272 | `getMonthKey` |  |
| 280 | `assignWeeklyMission` |  |
| 304 | `assignMonthlyMission` |  |
| 326 | `getWeeklyMission` |  |
| 339 | `getMonthlyMission` |  |
| 385 | `checkReset` |  |
| 448 | `changeResetHour` |  |
| 454 | `updateResetUI` |  |

## biblioteca-core.js (719 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 59 | `libGetCats` | Devuelve categorías base (con overrides del usuario) + personalizadas |
| 67 | `libDefaultAchievements` | ── Logros de lectura (independientes de logros de misiones) ─────────────── |
| 136 | `libEnsureState` | ── Migración: añade books[] si no existe ───────────────────────────────── |
| 148 | `_libMonthDone` | ── Evaluación de logro de lectura ──────────────────────────────────────── |
| 159 | `_libTotalPages` |  |
| 164 | `_libNotedCount` | Cuenta libros con notas escritas (campo notes no vacío) y status done |
| 166 | `_libMonthStreakCount` | Cuenta meses distintos en que se terminó al menos 1 libro (para monthStreak) |
| 187 | `_libFastReadCount` | fastRead: target = días máximos para terminar 1 libro; cuenta libros terminados  |
| 194 | `evalLibAchievement` |  |
| 213 | `getLibAchievProgress` |  |
| 242 | `libReadingPace` | se implemente el registro diario. |
| 270 | `renderLibReadingPace` |  |
| 314 | `libStats` | ── Estadísticas rápidas ────────────────────────────────────────────────── |
| 324 | `libFiltered` | ── Filtrar + buscar ────────────────────────────────────────────────────── |
| 338 | `libStatusColor` | ── Colores por estado ───────────────────────────────────────────────────── |
| 342 | `libStatusLabel` |  |
| 346 | `libStatusIcon` |  |
| 354 | `libSetBookOfMonth` |  |
| 364 | `renderLibBookOfMonth` | Widget para el dashboard (tab misiones) |
| 453 | `renderBiblioteca` |  |
| 546 | `renderLibCurrentHero` | ── Hero del libro actual ───────────────────────────────────────────────── |
| 577 | `renderLibGridCard` | ── Card de galería ──────────────────────────────────────────────────────── |
| 609 | `renderLibListCard` | ── Card de lista ────────────────────────────────────────────────────────── |
| 640 | `_libAchievCard` |  |
| 655 | `renderLibAchievements` |  |
| 685 | `libShowAchievDetail` | ── Detalle de logro (overlay al click) ────────────────────────────────── |

## biblioteca-modal.js (585 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 9 | `renderLibModalHTML` |  |
| 104 | `libSetFilter` |  |
| 108 | `libSetView` |  |
| 112 | `libSelectEmoji` |  |
| 120 | `_libCover` | Devuelve HTML de portada: img si hay URL, emoji si no |
| 132 | `libPreviewCover` |  |
| 141 | `libSyncProgress` | Sincroniza slider ↔ página actual ↔ porcentaje |
| 168 | `libModalStatusChange` |  |
| 188 | `openBookModal` |  |
| 250 | `closeLibModal` |  |
| 257 | `libCatSelectChange` | ── Categorías personalizadas ───────────────────────────────────────────── |
| 263 | `_libSaveCustomCat` |  |
| 279 | `libOpenCatManager` | ── Renombrar / gestionar categorías ───────────────────────────────────── |
| 299 | `_libRenderCatManager` |  |
| 379 | `libSaveCatNames` |  |
| 406 | `libCatReset` |  |
| 415 | `libDeleteCustomCat` |  |
| 423 | `saveBook` |  |
| 505 | `libDeleteCurrent` |  |
| 517 | `_libCheckNewAchievements` | ── Detecta logros recién desbloqueados y da XP ─────────────────────────── |
| 533 | `libQuickProgress` | Incremento rápido de progreso (+N%) |
| 556 | `libMarkDone` | Marcar como terminado desde el hero |
| 579 | `updateBookProgress` | Delegación de updateBookProgress para uso externo |

## biblioteca.js (1291 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 53 | `libGetCats` | Devuelve categorías base (con overrides del usuario) + personalizadas |
| 61 | `libDefaultAchievements` | ── Logros de lectura (independientes de logros de misiones) ─────────────── |
| 130 | `libEnsureState` | ── Migración: añade books[] si no existe ───────────────────────────────── |
| 142 | `_libMonthDone` | ── Evaluación de logro de lectura ──────────────────────────────────────── |
| 153 | `_libTotalPages` |  |
| 158 | `_libNotedCount` | Cuenta libros con notas escritas (campo notes no vacío) y status done |
| 160 | `_libMonthStreakCount` | Cuenta meses distintos en que se terminó al menos 1 libro (para monthStreak) |
| 181 | `_libFastReadCount` | fastRead: target = días máximos para terminar 1 libro; cuenta libros terminados  |
| 188 | `evalLibAchievement` |  |
| 207 | `getLibAchievProgress` |  |
| 236 | `libReadingPace` | se implemente el registro diario. |
| 264 | `renderLibReadingPace` |  |
| 308 | `libStats` | ── Estadísticas rápidas ────────────────────────────────────────────────── |
| 318 | `libFiltered` | ── Filtrar + buscar ────────────────────────────────────────────────────── |
| 332 | `libStatusColor` | ── Colores por estado ───────────────────────────────────────────────────── |
| 336 | `libStatusLabel` |  |
| 340 | `libStatusIcon` |  |
| 348 | `libSetBookOfMonth` |  |
| 358 | `renderLibBookOfMonth` | Widget para el dashboard (tab misiones) |
| 447 | `renderBiblioteca` |  |
| 540 | `renderLibCurrentHero` | ── Hero del libro actual ───────────────────────────────────────────────── |
| 571 | `renderLibGridCard` | ── Card de galería ──────────────────────────────────────────────────────── |
| 603 | `renderLibListCard` | ── Card de lista ────────────────────────────────────────────────────────── |
| 634 | `_libAchievCard` |  |
| 649 | `renderLibAchievements` |  |
| 679 | `libShowAchievDetail` | ── Detalle de logro (overlay al click) ────────────────────────────────── |
| 715 | `renderLibModalHTML` |  |
| 810 | `libSetFilter` |  |
| 814 | `libSetView` |  |
| 818 | `libSelectEmoji` |  |
| 826 | `_libCover` | Devuelve HTML de portada: img si hay URL, emoji si no |
| 838 | `libPreviewCover` |  |
| 847 | `libSyncProgress` | Sincroniza slider ↔ página actual ↔ porcentaje |
| 874 | `libModalStatusChange` |  |
| 894 | `openBookModal` |  |
| 956 | `closeLibModal` |  |
| 963 | `libCatSelectChange` | ── Categorías personalizadas ───────────────────────────────────────────── |
| 969 | `_libSaveCustomCat` |  |
| 985 | `libOpenCatManager` | ── Renombrar / gestionar categorías ───────────────────────────────────── |
| 1005 | `_libRenderCatManager` |  |
| 1085 | `libSaveCatNames` |  |
| 1112 | `libCatReset` |  |
| 1121 | `libDeleteCustomCat` |  |
| 1129 | `saveBook` |  |
| 1211 | `libDeleteCurrent` |  |
| 1223 | `_libCheckNewAchievements` | ── Detecta logros recién desbloqueados y da XP ─────────────────────────── |
| 1239 | `libQuickProgress` | Incremento rápido de progreso (+N%) |
| 1262 | `libMarkDone` | Marcar como terminado desde el hero |
| 1285 | `updateBookProgress` | Delegación de updateBookProgress para uso externo |

## notifications.js (12 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 7 | `notif` |  |

## rewards.js (288 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 30 | `gainXP` |  |
| 49 | `doFlash` |  |
| 55 | `getRank` |  |
| 68 | `getWeeklyCatCounts` |  |
| 85 | `detectClass` |  |
| 104 | `_buildAchievCard` |  |
| 122 | `openAchievDetail` | ── Overlay de detalle de logro (igual al efecto de libros) ───────────── |
| 162 | `renderAchievements` |  |
| 195 | `toggleCustomAchiev` | Invierte a.customDone y guarda. evalAchievement() lo lee con !!a.customDone. |
| 206 | `renderAchievEditor` | ─── EDITOR DE LOGROS EN CONFIGURACIÓN ─── |
| 243 | `updateAchiev` |  |
| 249 | `updateAchievType` |  |
| 256 | `delAchiev` |  |
| 261 | `addAchiev` |  |
| 284 | `aTypeChange` |  |

## storage.js (252 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 7 | `getUserKey` |  |
| 11 | `loadState` |  |
| 102 | `defaultAchievements` |  |
| 207 | `defaultState` |  |
| 240 | `save` |  |

## ui-actions-missions.js (460 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 44 | `getTodayISODate` |  |
| 52 | `logDailyMission` |  |
| 75 | `toggle` |  |
| 105 | `startEditMission` |  |
| 106 | `cancelEditMission` |  |
| 108 | `saveEditMission` |  |
| 147 | `delMission` |  |
| 186 | `claimDaily` |  |
| 209 | `toggleWeekly` |  |
| 260 | `claimWeekly` |  |
| 297 | `toggleMonthly` |  |
| 327 | `claimMonthly` |  |
| 346 | `swapWeeklyMission` |  |
| 361 | `swapMonthlyMission` |  |
| 390 | `swapDailyMission` |  |

## ui-actions-shop.js (690 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 8 | `setShopPeriod` |  |
| 19 | `getXPForPeriod` |  |
| 37 | `getPeriodLabel` |  |
| 51 | `renderShop` |  |
| 61 | `renderInventory` |  |
| 69 | `renderItemCard` |  |
| 133 | `getTotalBalance` | Calcula el balance real acumulado (todos los movimientos, sin filtro de período) |
| 142 | `openRedeem` |  |
| 205 | `confirmRedeem` |  |
| 274 | `openEditItem` |  |
| 301 | `confirmEditItem` |  |
| 315 | `delItem` |  |
| 328 | `deleteInventoryItem` |  |
| 337 | `confirmDelInv` |  |
| 348 | `closDelInv` |  |
| 350 | `closeModal` |  |
| 363 | `addMission` |  |
| 391 | `addItem` |  |
| 417 | `toggleNameForm` |  |
| 428 | `saveName` |  |
| 437 | `saveRanks` |  |
| 448 | `saveMinBalance` |  |
| 458 | `updateMinBalStatus` |  |
| 475 | `resetAll` |  |
| 504 | `loadVisionBoardMissions` |  |
| 682 | `toggleFavorite` | ── toggleFavorite — marca/desmarca misión como favorita ── |

## ui-actions.js (1138 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 38 | `getTodayISODate` |  |
| 46 | `logDailyMission` |  |
| 69 | `toggle` |  |
| 99 | `startEditMission` |  |
| 100 | `cancelEditMission` |  |
| 102 | `saveEditMission` |  |
| 141 | `delMission` |  |
| 180 | `claimDaily` |  |
| 203 | `toggleWeekly` |  |
| 254 | `claimWeekly` |  |
| 291 | `toggleMonthly` |  |
| 321 | `claimMonthly` |  |
| 340 | `swapWeeklyMission` |  |
| 355 | `swapMonthlyMission` |  |
| 384 | `swapDailyMission` |  |
| 456 | `setShopPeriod` |  |
| 467 | `getXPForPeriod` |  |
| 485 | `getPeriodLabel` |  |
| 499 | `renderShop` |  |
| 509 | `renderInventory` |  |
| 517 | `renderItemCard` |  |
| 581 | `getTotalBalance` | Calcula el balance real acumulado (todos los movimientos, sin filtro de período) |
| 590 | `openRedeem` |  |
| 653 | `confirmRedeem` |  |
| 722 | `openEditItem` |  |
| 749 | `confirmEditItem` |  |
| 763 | `delItem` |  |
| 776 | `deleteInventoryItem` |  |
| 785 | `confirmDelInv` |  |
| 796 | `closDelInv` |  |
| 798 | `closeModal` |  |
| 811 | `addMission` |  |
| 839 | `addItem` |  |
| 865 | `toggleNameForm` |  |
| 876 | `saveName` |  |
| 885 | `saveRanks` |  |
| 896 | `saveMinBalance` |  |
| 906 | `updateMinBalStatus` |  |
| 923 | `resetAll` |  |
| 952 | `loadVisionBoardMissions` |  |
| 1130 | `toggleFavorite` | ── toggleFavorite — marca/desmarca misión como favorita ── |

## ui-backup.js (137 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 9 | `exportBackupJSON` | exportBackupJSON — descarga S completo como .json |
| 21 | `importBackupJSON` | importBackupJSON — restaura S desde un .json exportado |
| 55 | `exportBackupXLSX` | 1. Resumen    2. Misiones    3. Finanzas    4. Inventario    5. Logros |
| 135 | `renderDatosTab` | renderDatosTab — llamado por switchTab al activar el tab Datos |

## ui-finance.js (1091 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 28 | `getDeseosFundReal` | se usan en tiempo de ejecución (no en carga), el orden de declaración no importa |
| 40 | `getDeseosPct` | sobre el total de ingresos que tuvieron distribución activa. |
| 57 | `renderDeseosBanner` | Si no hay fondo de deseos configurado, oculta el contenedor. |
| 99 | `_calcWaterfall` | saldo real disponible en cada cubo (puede ser negativo si se excedió). |
| 189 | `formatCOP` |  |
| 198 | `formatFinAmtInput` | garantizando que el valor siempre sean pesos enteros. |
| 212 | `fixSplitRounding` | y los recalcula garantizando suma exacta. Se llama al cargar el módulo. |
| 249 | `setFinPeriod` |  |
| 260 | `finNavStep` |  |
| 268 | `getFinRange` | Devuelve {from: Date, to: Date, label: string} para el período y offset actuales |
| 317 | `getFinTransactions` |  |
| 325 | `setFinType` |  |
| 351 | `updateSplitBars` |  |
| 379 | `selectFinCat` |  |
| 385 | `addTransaction` |  |
| 482 | `delTransaction` |  |
| 491 | `renderFinIncCatChart` | Ingresos por categoría (reemplaza el antiguo gráfico de barras vs gastos) |
| 511 | `_renderMultiBucketBars` |  |
| 530 | `renderFinCatChart` |  |
| 549 | `renderFinTab` |  |
| 598 | `_renderTxRow` | ── Render único de una fila de transacción ────────────────────────────── |
| 621 | `renderFinTxList` |  |
| 831 | `openMonthDetail` |  |
| 887 | `closeMonthDetail` |  |
| 893 | `_renderSplitWaterfall` | ── Renderiza la sección 50/30/20 con saldo real (cascada) ────────────── |
| 957 | `_renderMonthCatBlock` | ── Bloque de categoría para vista mensual ────────────────────────────── |
| 986 | `toggleWeekDay` | ── Toggle de grupos semana/mes ────────────────────────────────────────── |
| 1005 | `exportFinXLSX` | Requiere SheetJS (xlsx.full.min.js). |
| 1051 | `importFinXLSX` | Combina con las existentes sin duplicar (por id). |

## ui-init.js (460 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 121 | `epBind` | Registra qué input recibe el emoji de un panel dado |
| 124 | `epInit` | Inicializa categorías y grilla de un panel |
| 135 | `epRenderGrid` |  |
| 151 | `epSetCat` |  |
| 159 | `epSearch` |  |
| 164 | `epSelect` |  |
| 184 | `epToggle` |  |
| 205 | `epClose` |  |
| 228 | `tplToggle` |  |
| 233 | `tplSelectAll` |  |
| 238 | `tplDeselectAll` |  |
| 243 | `tplUpdateCounter` |  |
| 251 | `openTplModal` |  |
| 261 | `switchTplTab` |  |
| 272 | `closeTplModal` |  |
| 277 | `importTemplates` |  |
| 316 | `tipToggle` |  |
| 344 | `closeTipModal` |  |

## ui-mood.js (87 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 9 | `setMood` |  |
| 53 | `getTodayMood` |  |
| 60 | `renderMoodWidget` |  |

## ui-render.js (365 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 13 | `render` |  |
| 87 | `renderWithFlash` | el usuario note inmediatamente que el estado cambió. |
| 104 | `renderDailyMissions` |  |
| 139 | `renderWeeklyMission` |  |
| 196 | `renderMonthlyMission` |  |
| 243 | `renderMissionCard` |  |
| 342 | `renderAllQuests` |  |

## ui-utils.js (570 líneas)
| Línea | Función | Qué hace |
|---|---|---|
| 24 | `changeFontSize` |  |
| 36 | `setFont` |  |
| 53 | `applyMobileTypography` | · iOS Safari: inputs ≥16px para evitar zoom automático en focus |
| 114 | `toggleCfgSection` |  |
| 138 | `switchTab` |  |
| 168 | `toggleAllQuests` |  |
| 183 | `tick` |  |
| 202 | `escH` |  |
| 204 | `localISO` | Returns YYYY-MM-DD using LOCAL time (avoids UTC offset bugs for users in Colombi |
| 211 | `setPeriod` |  |
| 221 | `getCatDataForPeriod` | Obtiene conteo REAL de misiones por categoría filtrando dailyLog por fechas |
| 244 | `getPeriodTotals` | Obtiene XP y misiones totales del período desde dailyLog |
| 259 | `renderPerfil` |  |
| 300 | `renderFreqStats` |  |
| 363 | `renderMoodHistory` |  |
| 426 | `drawRadar` |  |
| 508 | `renderCatBars` |  |
| 526 | `renderSummary` |  |
| 543 | `evalAchievement` |  |
| 557 | `getAchievProgress` |  |

