/* Navigation, Takt und Start */
"use strict";

const tabOf = { uebersicht:"heute", verlangen:"verlangen", geld:"geld", erfolge:"erfolge",
  mehr:"mehr", erholung:"mehr", blutdruck:"mehr", einstellungen:"mehr", daten:"mehr" };
const panelTitles = { uebersicht:"Heute", verlangen:"Verlangen", geld:"Geld", erfolge:"Erfolge",
  mehr:"Mehr", erholung:"Erholung", blutdruck:"Blutdruck", einstellungen:"Einstellungen", daten:"Daten sichern" };
const tabPanels = { heute:"uebersicht", verlangen:"verlangen", geld:"geld", erfolge:"erfolge", mehr:"mehr" };
const subPages = ["erholung","blutdruck","einstellungen","daten"];
let currentPanel = "uebersicht";

function showPanel(p){
  if (!panelTitles[p]) p = "uebersicht";
  currentPanel = p;
  document.querySelectorAll(".panel").forEach(el=>el.classList.toggle("active", el.dataset.panel===p));
  document.querySelectorAll(".tab").forEach(el=>el.classList.toggle("active", el.dataset.tab===tabOf[p]));
  $("catTitle").textContent = panelTitles[p];
  $("backBtn").hidden = !subPages.includes(p);
  document.body.dataset.panel = p;
  $("tbDate").textContent = p==="uebersicht" ? new Date().toLocaleDateString("de-DE",{weekday:"long", day:"numeric", month:"long"}) : "";
  $("tbDate").hidden = p!=="uebersicht";
  if (p==="blutdruck") renderDeepAnalysis();
  if (p==="geld"){ renderFinTable(); renderGoals(); }
  if (p==="verlangen") renderCravingStats();
  if (p==="erfolge") refreshProgress();
  if (p==="daten") renderBackupMeta();
  renderMoneyLive();
  window.scrollTo(0,0);
  if (location.hash !== "#" + p){ try { history.replaceState(null, "", "#" + p); } catch(e){} }
}
window.addEventListener("hashchange", ()=>{ const p = location.hash.slice(1); if (p && p !== currentPanel) showPanel(p); });
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click", ()=>showPanel(tabPanels[b.dataset.tab])));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click", ()=>showPanel(b.dataset.goto)));
$("backBtn").addEventListener("click", ()=>showPanel("mehr"));
$("goSettings").addEventListener("click", ()=>showPanel("einstellungen"));
bindSheet("infoOverlay","infoSheetClose");

// Nach jeder Eingabe: alles, was davon abhängt, neu berechnen
function onDataChanged(){
  renderTodayCraving(); refreshProgress(); renderBackupMeta(); renderTodayWish();
  if (currentPanel==="verlangen") renderCravingStats();
  if (currentPanel==="geld") renderGoals();
  if (currentPanel==="blutdruck") renderDeepAnalysis();
}

$("resetBtn").addEventListener("click", ()=>{
  if (!confirm("Wirklich alle Daten auf diesem Gerät löschen? Das lässt sich ohne Backup nicht rückgängig machen.")) return;
  DATA_KEYS.concat(LEGACY_KEYS).forEach(k=>store.del(k)); store.del("rf:lastbackup");
  location.hash = ""; location.reload();
});

/* ---------- Start ---------- */
let currentDay = todayKey();
hydrateIcons();
loadConfig(); loadAttempts(); loadVitals(); loadGoals(); loadCravings();
$("measureDate").value = todayKey();
buildMilestoneList();
tick();
renderVitals(); renderFinTable(); renderGoals(); renderTodayWish(); renderTodayCraving();
refreshProgress(); renderBackupMeta();
showPanel((location.hash||"").slice(1) || "uebersicht");

setInterval(()=>{
  tick();
  if (todayKey() !== currentDay){ // Tageswechsel
    currentDay = todayKey(); $("measureDate").value = todayKey(); onDataChanged();
  }
}, 1000);
setInterval(renderMoneyLive, 120);
setInterval(()=>{ refreshProgress(); renderTodayWish(); if (currentPanel==="geld") renderGoals(); }, 30000);

if ("serviceWorker" in navigator && location.protocol === "https:"){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
