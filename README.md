[README.md](https://github.com/user-attachments/files/27909699/README.md)
# ⚔️ Sistema de Cazador — Daily Quest Log

Una app de productividad estilo **Solo Leveling** con integración a Notion. Gestiona tus tareas diarias como misiones RPG, acumula XP y canjea recompensas.

![Preview](https://img.shields.io/badge/Solo%20Leveling-Daily%20Quest%20Log-00aaff?style=for-the-badge)

## 🌐 Demo en vivo

Despliega en **GitHub Pages** y accede desde cualquier dispositivo sin instalar nada.

---

## 🚀 Cómo subir a GitHub Pages (paso a paso)

### 1. Crear el repositorio

1. Ve a [github.com](https://github.com) e inicia sesión
2. Clic en **"New repository"**
3. Ponle de nombre: `cazador-quest-log`
4. Déjalo en **Public**
5. Clic en **"Create repository"**

### 2. Subir los archivos

Una vez creado el repositorio, en la página verás la opción **"uploading an existing file"**. Haz clic ahí y sube:
- `index.html`
- `README.md`

Clic en **"Commit changes"**.

### 3. Activar GitHub Pages

1. Ve a **Settings** del repositorio
2. En el menú izquierdo busca **"Pages"**
3. En "Source" selecciona **"Deploy from a branch"**
4. Branch: **main**, carpeta: **/ (root)**
5. Clic en **Save**

En unos minutos tu app estará disponible en:
```
https://TU_USUARIO.github.io/cazador-quest-log/
```

---

## ⚙️ Configuración de Notion

### El token ya está incluido en el código

El token de integración de Notion ya está embebido en `index.html`. Al abrir la app desde GitHub Pages se conectará automáticamente.

### IDs de las bases de datos

Los IDs de las bases de datos también están configurados en el código. Si necesitas cambiarlos:
1. Abre la app → tab **CONFIGURAR** → sección **NOTION**
2. Pega los nuevos IDs
3. Clic en **GUARDAR IDS DE DATABASES**

---

## ✨ Funcionalidades

### Misiones diarias
- ✅ Marcar/desmarcar misiones como completadas
- ✏️ **Editar misiones directamente** desde la tarjeta (nombre, descripción, categoría, rango)
- ✕ Eliminar misiones
- ➕ Añadir nuevas misiones desde el tab CONFIGURAR
- 🔄 Reset automático diario a medianoche

### Inventario / Recompensas
- ✏️ **Editar objetos** (nombre, emoji, costo XP, precio real, rareza)
- ★ Canjear objetos cuando tengas suficiente XP
- ✕ Eliminar objetos
- ➕ Añadir nuevos objetos desde CONFIGURAR

### Sistema RPG
- 📈 Sistema de XP y niveles (E → S Rank)
- 🔥 Racha de días consecutivos
- 🏆 Recompensa diaria bonus (sube con la racha)

### Sincronización con Notion
- ↻ Sync bidireccional con bases de datos de Notion
- Cambios en la app se reflejan en Notion automáticamente
- Importa misiones e inventario desde Notion

---

## 🗂️ Estructura de bases de datos en Notion

### DB Misiones
| Campo | Tipo |
|-------|------|
| Nombre | Title |
| Descripción | Rich Text |
| Categoría | Select |
| Rango | Select |
| XP | Number |
| Completada | Checkbox |

### DB Inventario
| Campo | Tipo |
|-------|------|
| Nombre | Title |
| Emoji | Rich Text |
| Costo_XP | Number |
| Precio_Real | Rich Text |
| Rareza | Select |
| Canjeado | Checkbox |

### DB Ganancias XP
| Campo | Tipo |
|-------|------|
| Fecha | Title |
| XP_Ganado | Number |
| Nivel | Number |
| Racha | Number |
| Misiones_Completadas | Number |
| XP_Total_Acumulado | Number |
| Bonus_Diario | Number |

---

## 🛠️ Desarrollo local

Si quieres correrlo localmente sin problemas de CORS:

```bash
# Con Python
python3 -m http.server 8080
# Abre: http://localhost:8080

# Con Node.js
npx serve .
```

---

## 📝 Notas

- Los datos se guardan en `localStorage` del navegador
- El token de Notion está en el código — no compartas el repositorio en público si quieres mantenerlo privado
- Para hacerlo privado: en GitHub Settings del repo → cambia a **Private** (GitHub Pages sigue funcionando en cuentas gratuitas para repos privados con algunas limitaciones)
