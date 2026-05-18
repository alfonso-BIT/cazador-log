// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ui-backup.js — §19 BACKUP                                              ║
// ║  JSON : exportar/importar estado completo (migrar dispositivo)           ║
// ║  XLSX : resumen legible multi-hoja (SheetJS requerido)                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── JSON ──────────────────────────────────────────────
// exportBackupJSON — descarga S completo como .json
function exportBackupJSON(){
  if(!S||!currentUser){notif('▸ SIN SESIÓN ACTIVA');return;}
  const payload=JSON.stringify({v:1,user:currentUser,ts:Date.now(),state:S},null,0);
  const blob=new Blob([payload],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='cazador-backup-'+currentUser+'-'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); URL.revokeObjectURL(a.href);
  notif('⬇ BACKUP JSON DESCARGADO — '+currentUser.toUpperCase());
}

// importBackupJSON — restaura S desde un .json exportado
function importBackupJSON(input){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.state||!data.user) throw new Error('formato inválido');
      // FIX-QA-06: validar campos obligatorios antes de restaurar.
      // Un backup malformado (sin missions[], lvl, etc.) podía dejar S en estado
      // corrupto y romper el render. Ahora se exige al menos los campos críticos.
      const st = data.state;
      const requiredFields = ['lvl','totalXP','missions','items','achievements'];
      const missing = requiredFields.filter(f => st[f] === undefined || st[f] === null);
      if(missing.length){
        notif('▸ BACKUP INCOMPLETO — FALTAN: ' + missing.join(', ').toUpperCase());
        input.value=''; return;
      }
      if(!Array.isArray(st.missions)||!Array.isArray(st.items)||!Array.isArray(st.achievements)){
        notif('▸ BACKUP CORRUPTO — ARRAYS INVÁLIDOS'); input.value=''; return;
      }
      // Fusionar: campos críticos del backup sobre defaultState para evitar campos faltantes
      const merged=Object.assign({},defaultState(),st);
      S=merged;
      save(); renderWithFlash();
      notif('⬆ BACKUP RESTAURADO — '+data.user.toUpperCase());
    }catch(err){notif('▸ ARCHIVO INVÁLIDO O CORRUPTO');}
    input.value='';
  };
  reader.readAsText(file);
}

// ── XLSX COMPLETO ─────────────────────────────────────
// exportBackupXLSX — genera un .xlsx con 5 hojas:
//   1. Resumen    2. Misiones    3. Finanzas    4. Inventario    5. Logros
function exportBackupXLSX(){
  if(!S){notif('▸ SIN DATOS');return;}
  if(typeof XLSX==='undefined'){notif('▸ XLSX NO DISPONIBLE — RECARGA LA PÁGINA');return;}
  const wb=XLSX.utils.book_new();
  const now=new Date();

  // ── Hoja 1: Resumen ──────────────────────────
  const totalInc=(S.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
  const totalExp=(S.transactions||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
  const ws1=XLSX.utils.aoa_to_sheet([
    ['CAZADOR QUEST LOG — RESUMEN'],['Generado',now.toLocaleString('es-CO')],['Usuario',S.name||currentUser],[],
    ['PROGRESO'],
    ['Nivel',S.lvl||1],['XP Total Acumulado',S.totalXP||0],['XP Nivel Actual',S.curXP||0],
    ['Racha Actual (días)',S.streak||0],['Misiones Completadas',S.totalComp||0],[],
    ['FINANZAS'],
    ['Total Ingresos',totalInc],['Total Gastos',totalExp],['Balance',totalInc-totalExp],
    ['Colchón de Seguridad',S.minBalance||0],[],
    ['INVENTARIO'],
    ['Objetos en Tienda',(S.items||[]).filter(i=>!i.red).length],
    ['Objetos Canjeados',(S.items||[]).filter(i=>i.red).length],
    ['XP de Tienda Disponible',S.shopXP||0],
  ]);
  ws1['!cols']=[{wch:28},{wch:22}];
  XLSX.utils.book_append_sheet(wb,ws1,'Resumen');

  // ── Hoja 2: Misiones ─────────────────────────
  const mRows=[['ID','Nombre','Categoría','XP','Rango','Tipo','Fija','Completadas Hoy','Descripción']];
  (S.missions||[]).forEach(m=>mRows.push([
    m.id,m.name,m.cat||'',m.xp||0,m.rank||'',m.type||'',m.fixed?'Sí':'No',m.done?'Sí':'No',m.desc||''
  ]));
  const ws2=XLSX.utils.aoa_to_sheet(mRows);
  ws2['!cols']=[{wch:8},{wch:28},{wch:14},{wch:6},{wch:8},{wch:10},{wch:6},{wch:6},{wch:40}];
  XLSX.utils.book_append_sheet(wb,ws2,'Misiones');

  // ── Hoja 3: Finanzas (todas) ─────────────────
  const txRows=[['Fecha','Hora','Tipo','Categoría','Emoji','Descripción','Monto (COP)']];
  (S.transactions||[]).slice().sort((a,b)=>a.ts-b.ts).forEach(t=>{
    const d=new Date(t.ts);
    const FIN_LABELS={comida:'Comida',transporte:'Transporte',salud:'Salud',ocio:'Ocio',
      compras:'Compras',educacion:'Educación',hogar:'Hogar',otro:'Otro',ingreso:'Ingreso'};
    txRows.push([
      d.toLocaleDateString('es-CO'),
      d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}),
      t.type==='income'?'Ingreso':'Gasto',
      FIN_LABELS[t.cat]||t.cat,t.ico||'',t.desc,
      t.type==='income'?t.amt:-t.amt
    ]);
  });
  txRows.push([]); txRows.push(['','','','','','TOTAL INGRESOS',totalInc]);
  txRows.push(['','','','','','TOTAL GASTOS',-totalExp]);
  txRows.push(['','','','','','BALANCE',totalInc-totalExp]);
  const ws3=XLSX.utils.aoa_to_sheet(txRows);
  ws3['!cols']=[{wch:12},{wch:8},{wch:10},{wch:14},{wch:6},{wch:32},{wch:16}];
  XLSX.utils.book_append_sheet(wb,ws3,'Finanzas');

  // ── Hoja 4: Inventario ───────────────────────
  const invRows=[['ID','Nombre','Emoji','XP Costo','Precio Real','Estado','Fecha Ganado']];
  (S.items||[]).forEach(it=>invRows.push([
    it.id,it.name,it.ico||'',it.cost||0,it.realPrice||0,
    it.red?'Canjeado':'En Tienda',
    it.redDate?new Date(it.redDate).toLocaleDateString('es-CO'):''
  ]));
  const ws4=XLSX.utils.aoa_to_sheet(invRows);
  ws4['!cols']=[{wch:8},{wch:28},{wch:6},{wch:10},{wch:14},{wch:12},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws4,'Inventario');

  // ── Hoja 5: Logros ───────────────────────────
  const achRows=[['Emoji','Nombre','Descripción','Tipo','Meta','Desbloqueado']];
  (S.achievements||[]).forEach(a=>achRows.push([
    a.ico||'',a.name,a.desc,a.type,a.target,a.unlocked?'Sí':'No'
  ]));
  const ws5=XLSX.utils.aoa_to_sheet(achRows);
  ws5['!cols']=[{wch:6},{wch:20},{wch:40},{wch:14},{wch:8},{wch:12}];
  XLSX.utils.book_append_sheet(wb,ws5,'Logros');

  XLSX.writeFile(wb,'cazador-completo-'+now.toISOString().slice(0,10)+'.xlsx');
  notif('📊 XLSX COMPLETO DESCARGADO — 5 HOJAS');
}

// renderDatosTab — llamado por switchTab al activar el tab Datos
function renderDatosTab(){
  // Hook para actualizaciones futuras en el tab Datos
}
