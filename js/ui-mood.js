// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ui-mood.js — §19 MOOD TRACKER                                         ║
// ║  Exporta: setMood(), getTodayMood(), renderMoodWidget()                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const MOOD_XP = [20, 20, 20, 20, 20];
const MOOD_LABELS = ['PÉSIMO','MAL','REGULAR','BIEN','EXCELENTE'];


function setMood(val){
  // Ensure the day is current before logging mood
  checkReset();
  const today = getTodayISODate();
  if(!S.dailyLog) S.dailyLog=[];
  let entry = S.dailyLog.find(e=>e.date===today);
  if(!entry){ entry={date:today,cats:{},xp:0,missions:0}; S.dailyLog.push(entry); }

  const prevMood = entry.mood;
  const hadMood = (prevMood !== undefined && prevMood !== null);

  // Revert previous mood XP if already set today
  if(hadMood){
    const prevXp = MOOD_XP[prevMood]||0;
    gainXP(-prevXp);
    S.totalComp = Math.max(0, S.totalComp-1);
    if(S.catCounts&&S.catCounts['mental']) S.catCounts['mental']=Math.max(0,(S.catCounts['mental']||1)-1);
    entry.cats['mental']=Math.max(0,(entry.cats['mental']||0)-1);
    entry.xp=Math.max(0,(entry.xp||0)-prevXp);
  }

  // Save new mood
  entry.mood = val;
  const xp = MOOD_XP[val];
  gainXP(xp);
  if(!entry.cats) entry.cats={};
  entry.cats['mental']=(entry.cats['mental']||0)+1;
  entry.xp=(entry.xp||0)+xp;
  if(!hadMood){
    S.totalComp++;
    if(!S.catCounts) S.catCounts={};
    S.catCounts['mental']=(S.catCounts['mental']||0)+1;
  }

  // Limit log to 35 days
  S.dailyLog = S.dailyLog.filter(e=>{
    return (new Date()-new Date(e.date))/(1000*60*60*24)<=35;
  });

  save();
  render(); // render() already calls renderMoodWidget() internally
  notif('▸ ESTADO MENTAL: ' + MOOD_LABELS[val] + ' +' + xp + ' XP MENTAL');
}

function getTodayMood(){
  if(!S.dailyLog) return null;
  const today = getTodayISODate();
  const entry = S.dailyLog.find(e=>e.date===today);
  return (entry && entry.mood !== undefined) ? entry.mood : null;
}

function renderMoodWidget(){
  const todayMood = getTodayMood();
  // Reset all buttons
  for(let i=0;i<5;i++){
    const btn = document.getElementById('mood-'+i);
    if(!btn) continue;
    btn.className = 'mood-btn';
    if(todayMood===i) btn.classList.add('selected', 'sel-'+i);
  }
  // Show saved indicator
  const saved = document.getElementById('moodSaved');
  const badge = document.getElementById('moodXpBadge');
  if(saved){
    saved.classList.toggle('show', todayMood!==null);
    if(todayMood!==null) saved.textContent = '▸ HOY TE SENTISTE: ' + MOOD_LABELS[todayMood] + ' — REGISTRADO';
  }
  if(badge && todayMood!==null){
    badge.textContent = '+'+MOOD_XP[todayMood]+' XP';
    badge.classList.add('show');
  } else if(badge){
    badge.classList.remove('show');
  }
}

// Hook renderMoodWidget into render — called directly at end of render()
// (no wrapper needed; renderMoodWidget is called explicitly in render)

// ═══════════════════════════════════════════════════════
