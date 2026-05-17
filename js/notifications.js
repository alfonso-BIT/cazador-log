// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §09 — NOTIFICATIONS                                                    ║
// ║  Propósito: Toast de notificación que aparece en la parte superior de   ║
// ║  la pantalla con un mensaje temporal.                                   ║
// ║  Funciones: notif(msg)                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function notif(msg){
  const n=document.getElementById('notif');
  n.textContent=msg; n.classList.add('show');
  clearTimeout(n._t); n._t=setTimeout(()=>n.classList.remove('show'),2800);
}

