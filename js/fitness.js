/* Schritte und Trainingseinheiten */
"use strict";

let steps = {};      // { "YYYY-MM-DD": Anzahl }
let sessions = [];   // [{date, type, mins, intensity, kcal, ts}]
const STEPS_XP = 10, SESSION_XP = 20, SESSION_XP_PER_DAY = 3;

function loadFitness(){ steps = store.get("rf:steps") || {}; sessions = store.get("rf:sessions") || []; }
function saveSteps(){ store.set("rf:steps", steps); }
function saveSessions(){ store.set("rf:sessions", sessions); }

$("saveSteps").addEventListener("click", ()=>{
  const n = parseInt($("stepsInput").value), date = $("stepsDate").value;
  if (!date) return flashMsg("stepsMsg","Wähl ein Datum.",true);
  if (isNaN(n) || n < 0) return flashMsg("stepsMsg","Trag eine Schrittzahl ein.",true);
  const isNew = steps[date] === undefined;
  steps[date] = n; saveSteps();
  $("stepsInput").value = "";
  if (isNew){ addXp(STEPS_XP, "Schritte"); flashMsg("stepsMsg","Gespeichert, +"+STEPS_XP+" XP"); }
  else flashMsg("stepsMsg","Aktualisiert");
  renderSteps(); onDataChanged();
});
function renderSteps(){
  const today = steps[todayKey()] || 0, goal = stepGoal(), pct = Math.min(1, today/goal);
  $("stepsToday").textContent = today.toLocaleString("de-DE");
  $("stepsGoalLab").textContent = "Ziel " + goal.toLocaleString("de-DE");
  $("stepsRing").style.strokeDashoffset = 276.5 * (1 - pct);
  $("ovSteps").textContent = today.toLocaleString("de-DE");
  $("ovStepsBar").style.width = (pct*100) + "%";
}

// MET-Werte: grobe Durchschnitte bei moderater Ausführung
const sportTypes = [
  { id:"joggen",    name:"Joggen",        ico:"footprints",      met:9.0 },
  { id:"radfahren", name:"Radfahren",     ico:"bike",            met:7.5 },
  { id:"gehen",     name:"Spazieren",     ico:"person-standing", met:3.5 },
  { id:"schwimmen", name:"Schwimmen",     ico:"waves-horizontal",met:7.0 },
  { id:"tennis",    name:"Tennis",        ico:"circle-dot",      met:7.3 },
  { id:"padel",     name:"Padel",         ico:"circle-dot",      met:6.5 },
  { id:"fussball",  name:"Fußball",       ico:"goal",            met:8.0 },
  { id:"kraft",     name:"Krafttraining", ico:"dumbbell",        met:5.0 },
  { id:"yoga",      name:"Yoga",          ico:"flower-2",        met:3.0 },
  { id:"wandern",   name:"Wandern",       ico:"mountain",        met:6.0 },
  { id:"rudern",    name:"Rudern",        ico:"sailboat",        met:7.0 },
  { id:"sonstiges", name:"Sonstiges",     ico:"activity",        met:5.0 },
];
let activeSport = "joggen", activeIntensity = 1;

function buildSportTypes(){
  $("sportType").innerHTML = sportTypes.map(s=>`<button data-id="${s.id}" class="${s.id===activeSport?"active":""}">${icon(s.ico)}${s.name}</button>`).join("");
  $("sportType").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    activeSport = b.dataset.id;
    $("sportType").querySelectorAll("button").forEach(x=>x.classList.toggle("active", x===b));
  }));
}
segBind("intenseSeg", b=>{ activeIntensity = parseFloat(b.dataset.int); });

$("saveSession").addEventListener("click", ()=>{
  const mins = parseInt($("sportMin").value), date = $("sportDate").value;
  if (!date) return flashMsg("sportMsg","Wähl ein Datum.",true);
  if (!mins || mins <= 0) return flashMsg("sportMsg","Trag die Dauer in Minuten ein.",true);
  const t = sportTypes.find(s=>s.id===activeSport);
  const sameDay = sessions.filter(s=>s.date===date).length;
  sessions.push({ date, type:activeSport, mins, intensity:activeIntensity, kcal:estimateKcal(t.met*activeIntensity, mins), ts:Date.now() });
  sessions.sort((a,b)=>a.date.localeCompare(b.date)||a.ts-b.ts);
  saveSessions();
  $("sportMin").value = "";
  if (sameDay < SESSION_XP_PER_DAY){ addXp(SESSION_XP, "Training"); flashMsg("sportMsg","Gespeichert, +"+SESSION_XP+" XP"); }
  else flashMsg("sportMsg","Gespeichert");
  renderSessions(); onDataChanged();
});
function estimateKcal(met, mins){
  const w = parseFloat(weightEl.value) || 80; // ohne Gewicht mit 80 kg schätzen
  return Math.round(met * 3.5 * w / 200 * mins);
}
function renderSessions(){
  const box = $("sessionList");
  if (!sessions.length){ box.innerHTML='<p class="empty">Noch keine Einheit eingetragen.</p>'; return; }
  box.innerHTML = [...sessions].reverse().slice(0,20).map(s=>{
    const idx = sessions.indexOf(s);
    const t = sportTypes.find(x=>x.id===s.type) || sportTypes[sportTypes.length-1];
    const dl = parseKey(s.date).toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
    const intLab = s.intensity>1?"intensiv":s.intensity<1?"locker":"normal";
    return `<div class="row"><span class="chip-ic violet">${icon(t.ico)}</span>
      <span class="r-main"><b>${t.name}</b><small>${dl}, ${intLab}</small></span>
      <span class="r-val">${s.mins} Min${s.kcal?`<small>~${s.kcal} kcal</small>`:""}</span>
      <button class="del" data-i="${idx}" aria-label="Einheit löschen">${icon("trash")}</button></div>`;
  }).join("");
  box.querySelectorAll(".del").forEach(b=>b.addEventListener("click",()=>{
    if (!confirm("Diese Einheit löschen?")) return;
    sessions.splice(+b.dataset.i,1); saveSessions(); renderSessions(); onDataChanged();
  }));
}

function stepsLastDays(n, endOff=0){
  let sum=0, daysWith=0, goalDays=0; const goal=stepGoal();
  for (let i=endOff;i<n+endOff;i++){ const s=steps[dateKeyOffset(i)];
    if (s!=null){ sum+=s; daysWith++; if (s>=goal) goalDays++; } }
  return { sum, daysWith, goalDays };
}
function sessionsLastDays(n, endOff=0){
  const from = dateKeyOffset(n-1+endOff), to = dateKeyOffset(endOff);
  const list = sessions.filter(s=>s.date>=from && s.date<=to);
  return { mins: list.reduce((a,s)=>a+s.mins,0), kcal: list.reduce((a,s)=>a+(s.kcal||0),0), count: list.length };
}
