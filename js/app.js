/* Navigation, Takt und Start */
"use strict";

const tabOf = { uebersicht:"heute", gesundheit:"koerper", fitness:"koerper", ernaehrung:"koerper", stadt:"welt", belohnung:"erfolge",
  mehr:"mehr", rauchfrei:"mehr", alkohol:"mehr", finanzen:"mehr", einstellungen:"mehr", daten:"mehr" };
const panelTitles = { uebersicht:"Heute", gesundheit:"Körper", fitness:"Körper", ernaehrung:"Körper", stadt:"Meine Welt", belohnung:"Erfolge",
  mehr:"Mehr", rauchfrei:"Rauchfrei", alkohol:"Alkohol", finanzen:"Finanzen", einstellungen:"Einstellungen", daten:"Daten sichern" };
const subPages = ["rauchfrei","alkohol","finanzen","einstellungen","daten"];
let currentPanel = "uebersicht", lastKoerper = "gesundheit";

function showPanel(p){
  if (!panelTitles[p]) p = "uebersicht";
  currentPanel = p;
  const tab = tabOf[p];
  if (tab === "koerper") lastKoerper = p;
  document.querySelectorAll(".panel").forEach(el=>el.classList.toggle("active", el.dataset.panel===p));
  document.querySelectorAll(".tab").forEach(el=>el.classList.toggle("active", el.dataset.tab===tab));
  $("catTitle").textContent = panelTitles[p];
  $("subnav").hidden = tab !== "koerper";
  segSet("koerperSeg","sub",p);
  $("backBtn").hidden = !subPages.includes(p);
  document.body.dataset.panel = p;
  $("tbDate").textContent = p==="uebersicht" ? new Date().toLocaleDateString("de-DE",{weekday:"long", day:"numeric", month:"long"}) : "";
  $("tbDate").hidden = p!=="uebersicht";
  if (p==="stadt") renderCity();
  if (p==="gesundheit") renderDeepAnalysis();
  if (p==="finanzen"){ renderFinTable(); renderGoals(); }
  if (p==="daten") renderBackupMeta();
  if (p==="belohnung") refreshGame();
  window.scrollTo(0,0);
  if (location.hash !== "#" + p){ try { history.replaceState(null, "", "#" + p); } catch(e){} }
}
window.addEventListener("hashchange", ()=>{ const p = location.hash.slice(1); if (p && p !== currentPanel) showPanel(p); });
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click", ()=>{
  const t = b.dataset.tab;
  showPanel(t==="heute"?"uebersicht" : t==="koerper"?lastKoerper : t==="welt"?"stadt" : t==="erfolge"?"belohnung" : "mehr");
}));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click", ()=>showPanel(b.dataset.goto)));
document.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click", ()=>showPanel(b.dataset.quick)));
segBind("koerperSeg", b=>showPanel(b.dataset.sub));
$("backBtn").addEventListener("click", ()=>showPanel("mehr"));
$("lvlPill").addEventListener("click", ()=>showPanel("belohnung"));
$("goSettings").addEventListener("click", ()=>showPanel("einstellungen"));
$("alcGoSettings").addEventListener("click", ()=>showPanel("einstellungen"));

// Nach jeder Eingabe: alles, was davon abhängt, neu berechnen
function onDataChanged(){
  renderAnalysis(); refreshGame(); renderCity(); renderBackupMeta();
  if (currentPanel==="gesundheit") renderDeepAnalysis();
}

$("resetBtn").addEventListener("click", ()=>{
  if (!confirm("Wirklich alle Daten auf diesem Gerät löschen? Das lässt sich ohne Backup nicht rückgängig machen.")) return;
  DATA_KEYS.forEach(k=>store.del(k)); store.del("rf:lastbackup");
  location.hash = ""; location.reload();
});

function setDefaultDates(){ ["measureDate","stepsDate","sportDate","wDate"].forEach(id=>{ $(id).value = todayKey(); }); }

/* ---------- Start ---------- */
let currentDay = todayKey();
hydrateIcons();
loadConfig(); loadVitals(); loadGoals(); loadSos(); loadGame(); loadFitness(); loadCity(); loadMeals(); loadWeights();
buildMilestoneList("timeline", milestones, "vape-ms");
buildMilestoneList("alcTimeline", alcMilestones, "alc-ms");
buildSportTypes(); initSexSeg(); initNutriGoal(); setDefaultDates();
tick();
renderVitals(); renderSteps(); renderSessions(); renderBodyStats(); renderBeerDerived(); renderNutrition(); renderWeight();
renderFinTable(); renderGoals(); renderXpTable(); renderBackupMeta();
renderAnalysis(); renderCity(); refreshGame();
showPanel((location.hash||"").slice(1) || "uebersicht");
maybeShowWeekReport();

setInterval(()=>{
  tick();
  if (currentPanel==="belohnung"){ renderChest(); renderDaily(); }
  if (todayKey() !== currentDay){ // Tageswechsel
    currentDay = todayKey(); setDefaultDates();
    renderSteps(); renderNutrition(); onDataChanged();
  }
}, 1000);
setInterval(()=>{ if (currentPanel==="finanzen") renderFinanceLive(); }, 150);
setInterval(()=>{ renderAnalysis(); refreshGame(); renderCity(); if (currentPanel==="finanzen") renderGoals(); }, 30000);

if ("serviceWorker" in navigator && location.protocol === "https:"){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
