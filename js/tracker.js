/* Rauchfrei- und Alkohol-Zähler, Ersparnis, Lebenszeit, Sparziele */
"use strict";

const PUFFS_PER_VAPE = 600;
const BOTTLES_PER_CRATE = 24, BOTTLE_ML = 330;
const MIN_PER_UNIT_PER_DAY = 60; // Modellannahme: Minuten Lebenserwartung je Vape/Tag und rauchfreiem Tag

const milestones = [
  { mins: 20,        title: "Puls und Blutdruck sinken", desc: "Nach 20 Minuten bewegen sich Herzfrequenz und Blutdruck Richtung Normalwert." },
  { mins: 120,       title: "Das erste Verlangen", desc: "Nach etwa 2 Stunden meldet sich oft das erste Verlangen. Es kommt in Wellen und ebbt nach Minuten wieder ab." },
  { mins: 60*8,      title: "Kohlenmonoxid halbiert", desc: "Das CO im Blut hat sich halbiert, mehr Sauerstoff erreicht deine Organe." },
  { mins: 60*12,     title: "Sauerstoff fast normal", desc: "Der Sauerstoffgehalt im Blut ist wieder nahezu normal." },
  { mins: 60*24,     title: "Tag 1 geschafft", desc: "Das Herzinfarkt-Risiko beginnt bereits zu sinken." },
  { mins: 60*48,     title: "Geschmack und Geruch kehren zurück", desc: "Die Nervenenden erholen sich, Essen schmeckt intensiver. Das Nikotin ist aus dem Körper." },
  { mins: 60*72,     title: "Leichter atmen", desc: "Die Bronchien entspannen sich. Der Entzug ist jetzt am stärksten, ab hier wird es leichter." },
  { mins: 60*24*4,   title: "Die Reizbarkeit lässt nach", desc: "Stimmung und Schlaf stabilisieren sich." },
  { mins: 60*24*5,   title: "Klarer Kopf", desc: "Die Konzentration kommt zurück, die Gedanken kreisen seltener ums Vapen." },
  { mins: 60*24*7,   title: "Eine Woche rauchfrei", desc: "Die akute körperliche Abhängigkeit ist überstanden. Jetzt geht es um die Gewohnheit." },
  { mins: 60*24*10,  title: "Mehr Energie", desc: "Kreislauf und Sauerstoffversorgung erholen sich, du hast mehr Ausdauer." },
  { mins: 60*24*14,  title: "Die Lunge legt zu", desc: "Die Leistungsfähigkeit steigt spürbar. Den härtesten Teil hast du hinter dir." },
  { mins: 60*24*30,  title: "Weniger Husten", desc: "Husten und Kurzatmigkeit lassen deutlich nach." },
  { mins: 60*24*90,  title: "Bis zu 30 % mehr Lungenfunktion", desc: "Deine Lunge arbeitet spürbar effizienter." },
  { mins: 60*24*270, title: "Die Flimmerhärchen sind erholt", desc: "Die Lunge reinigt sich wieder selbst, du wirst seltener krank." },
  { mins: 60*24*365, title: "Ein Jahr: Herzrisiko halbiert", desc: "Dein Risiko für koronare Herzkrankheit ist etwa halb so hoch wie mit Nikotin." },
];
const alcMilestones = [
  { mins: 60*12,     title: "Restalkohol abgebaut", desc: "Blutzucker und Flüssigkeitshaushalt normalisieren sich, die Leber arbeitet den Rest ab." },
  { mins: 60*24,     title: "Tag 1: klarer Kopf", desc: "Der Körper ist alkoholfrei, der Magen beruhigt sich." },
  { mins: 60*72,     title: "Die Umstellung ist geschafft", desc: "Unruhe und schlechter Schlaf der ersten Nächte klingen bei moderatem Konsum meist ab." },
  { mins: 60*24*7,   title: "Besserer Schlaf", desc: "Die Tiefschlafphasen normalisieren sich, du wachst erholter auf. Die Haut wirkt frischer." },
  { mins: 60*24*14,  title: "Magen und Leber atmen auf", desc: "Die Magenschleimhaut erholt sich, die Leber beginnt eingelagertes Fett abzubauen." },
  { mins: 60*24*28,  title: "Messbar weniger Leberfett", desc: "Nach einem Monat zeigen Studien rund 15 % weniger Leberfett. Blutdruck und Gewicht sinken häufig mit." },
  { mins: 60*24*42,  title: "Bessere Blutwerte", desc: "Leberwerte wie die GGT verbessern sich, beim nächsten Blutbild sichtbar." },
  { mins: 60*24*90,  title: "Die Leber hat sich erholt", desc: "Ohne Vorschäden ist die Leber weitgehend regeneriert, das Immunsystem arbeitet stabiler." },
  { mins: 60*24*180, title: "Ein neues Normal", desc: "Mehr Energie, stabileres Gewicht, besseres Hautbild." },
  { mins: 60*24*365, title: "Ein Jahr alkoholfrei", desc: "Deutlich geringeres Risiko für Bluthochdruck, Herz-Kreislauf-Erkrankungen und einige Krebsarten." },
];

const startEl = $("startDate"), perEl = $("perDay"), priceEl = $("price"), whyEl = $("whyText");
const weightEl = $("weight"), heightEl = $("height"), ageEl = $("age"), stepGoalEl = $("stepGoal");
const alcStartEl = $("alcStart"), alcPerWeekEl = $("alcPerWeek"), alcCrateEl = $("alcCrate"), alcKcalEl = $("alcKcal100");
let userSex = null, nutriGoalAdj = 0;
const state = { days:0, savedNow:0, future:true, dayRate:0, hoursFrac:0, absMs:0,
  alcActive:false, alcFuture:true, alcDays:0, alcSaved:0, alcDayRate:0, alcHours:0, totalSaved:0 };

/* ---------- Konfiguration ---------- */
function saveConfig(){
  store.set("rf:config", { start:startEl.value, perDay:perEl.value, price:priceEl.value, why:whyEl.value,
    weight:weightEl.value, height:heightEl.value, age:ageEl.value, stepGoal:stepGoalEl.value, sex:userSex,
    alcStart:alcStartEl.value, alcPerWeek:alcPerWeekEl.value, alcCrate:alcCrateEl.value, alcKcal100:alcKcalEl.value,
    nutriGoal:nutriGoalAdj, nutriTarget:$("nutriTarget").value,
    reportName:$("reportName").value, wTarget:$("wTarget").value });
}
function loadConfig(){
  const d = store.get("rf:config"); if (!d) return;
  if (d.start) startEl.value = d.start;
  if (d.perDay) perEl.value = d.perDay;
  if (d.price) priceEl.value = d.price;
  if (d.why) whyEl.value = d.why;
  if (d.weight) weightEl.value = d.weight;
  if (d.height) heightEl.value = d.height;
  if (d.age) ageEl.value = d.age;
  if (d.stepGoal) stepGoalEl.value = d.stepGoal;
  if (d.sex) userSex = d.sex;
  if (d.alcStart) alcStartEl.value = d.alcStart;
  if (d.alcPerWeek) alcPerWeekEl.value = d.alcPerWeek;
  if (d.alcCrate) alcCrateEl.value = d.alcCrate;
  else if (d.alcPrice) alcCrateEl.value = (parseFloat(d.alcPrice)*BOTTLES_PER_CRATE).toFixed(2);
  if (d.alcKcal100) alcKcalEl.value = d.alcKcal100;
  if (typeof d.nutriGoal === "number") nutriGoalAdj = d.nutriGoal;
  if (d.nutriTarget) $("nutriTarget").value = d.nutriTarget;
  if (d.wTarget) $("wTarget").value = d.wTarget;
}
function stepGoal(){ return parseInt(stepGoalEl.value) || 8000; }

/* ---------- Zeitleisten ---------- */
function buildMilestoneList(boxId, list, cls){
  $(boxId).innerHTML = list.map((m,i)=>`
    <div class="milestone ${cls}" data-mi="${i}">
      <div class="ms-rail"><div class="ms-dot"></div><div class="ms-line"></div></div>
      <div class="ms-body">
        <div class="ms-when">${labelFor(m.mins)}</div>
        <div class="ms-title">${m.title}</div>
        <div class="ms-desc">${m.desc}</div>
        <div class="ms-eta"></div>
      </div>
    </div>`).join("");
}
function updateMilestones(cls, list, minsElapsed, future){
  let nextMarked = false;
  document.querySelectorAll(".milestone."+cls).forEach(el=>{
    const mi = list[+el.dataset.mi], eta = el.querySelector(".ms-eta");
    const done = !future && minsElapsed >= mi.mins;
    el.classList.toggle("done", done);
    const isNext = !done && !nextMarked && !future;
    el.classList.toggle("next", isNext);
    if (isNext) nextMarked = true;
    const t = done ? "Erreicht" : future ? "" : "Noch " + remaining(mi.mins - minsElapsed);
    if (eta.textContent !== t) eta.textContent = t;
  });
}

/* ---------- Sekundentakt ---------- */
function splitDur(absMs){
  const totalSec = Math.floor(absMs/1000);
  return { totalSec, d:Math.floor(totalSec/86400), h:Math.floor((totalSec%86400)/3600), m:Math.floor((totalSec%3600)/60), s:totalSec%60 };
}
function tick(){
  const now = new Date();
  const start = startEl.value ? new Date(startEl.value) : null;
  const perDay = parseFloat(perEl.value)||0, price = parseFloat(priceEl.value)||0;
  const hasStart = start && !isNaN(start);
  $("notStarted").hidden = !!hasStart;
  $("sosBtn").hidden = !hasStart;

  if (hasStart){
    const ms = now - start, future = ms < 0, absMs = Math.abs(ms);
    const t = splitDur(absMs);
    $("cD").textContent=t.d; $("cH").textContent=t.h; $("cM").textContent=t.m; $("cS").textContent=t.s;
    $("dayBig").textContent = t.d;
    $("dayBigLabel").textContent = future ? "Tage bis zum Start" : plural(t.d,"Tag rauchfrei","Tage rauchfrei");
    $("ring").style.strokeDashoffset = 276.5 * (1 - (future ? 0 : (t.totalSec%86400)/86400));
    $("dayBigTile").textContent = future ? "–" : t.d;
    $("clockTile").textContent = future ? "startet bald" : `${t.h} Std ${t.m} Min`;

    const daysElapsed = future ? 0 : absMs/86400000;
    const vapesAvoided = daysElapsed * perDay, saved = vapesAvoided * price;
    $("vapesAvoided").textContent = fmtN(vapesAvoided,1);
    $("puffsAvoided").textContent = Math.round(vapesAvoided*PUFFS_PER_VAPE).toLocaleString("de-DE");
    Object.assign(state, { days: future?0:t.d, savedNow:saved, future, dayRate:perDay*price,
      hoursFrac: future?0:(absMs/3600000) - t.d*24, absMs: future?0:absMs });
    updateMilestones("vape-ms", milestones, future ? 0 : absMs/60000, future);
    renderLife(absMs, future);
  } else {
    Object.assign(state, { days:0, savedNow:0, future:true, dayRate:0, hoursFrac:0, absMs:0 });
    $("dayBigTile").textContent = "–"; $("clockTile").textContent = "nicht gestartet";
  }

  updateAlcohol(now);
  state.totalSaved = state.savedNow + state.alcSaved;
  $("finVapeSaved").textContent = fmtEuro(state.savedNow);
  $("finAlcSaved").textContent = fmtEuro(state.alcSaved);
  $("ovSaved").textContent = state.totalSaved >= 1000 ? fmtEuro0(state.totalSaved) : fmtEuro(state.totalSaved);
  $("ovRate").textContent = fmtEuro(state.dayRate + state.alcDayRate) + " pro Tag";
  lastTickMs = Date.now();
}

function updateAlcohol(now){
  const active = !!alcStartEl.value && !isNaN(new Date(alcStartEl.value));
  state.alcActive = active;
  $("alcNotSet").hidden = active;
  $("alcContent").hidden = !active;
  if (!active){
    Object.assign(state, { alcFuture:true, alcDays:0, alcSaved:0, alcDayRate:0, alcHours:0 });
    $("alcDayTile").textContent = "–"; $("alcDayTileLab").textContent = ""; $("alcClockTile").textContent = "nicht gestartet";
    return;
  }
  const ms = now - new Date(alcStartEl.value), future = ms < 0, absMs = Math.abs(ms);
  const t = splitDur(absMs);
  const perWeek = parseFloat(alcPerWeekEl.value)||0;
  const bottlePrice = (parseFloat(alcCrateEl.value)||0)/BOTTLES_PER_CRATE;
  const kcalPerBottle = (parseFloat(alcKcalEl.value)||42) * BOTTLE_ML/100;
  const bottlesAvoided = (future ? 0 : absMs/86400000) * perWeek/7;
  Object.assign(state, { alcFuture:future, alcDays: future?0:t.d, alcHours: future?0:absMs/3600000,
    alcDayRate: perWeek*bottlePrice/7, alcSaved: bottlesAvoided*bottlePrice });

  $("aD").textContent=t.d; $("aH").textContent=t.h; $("aM").textContent=t.m; $("aS").textContent=t.s;
  $("alcDayBig").textContent = t.d;
  $("alcDayLabel").textContent = future ? "Tage bis zum Start" : plural(t.d,"Tag alkoholfrei","Tage alkoholfrei");
  $("alcRing").style.strokeDashoffset = 276.5 * (1 - (future ? 0 : (t.totalSec%86400)/86400));
  $("alcSavedStat").textContent = fmtEuro(state.alcSaved);
  $("alcDrinksStat").textContent = fmtN(bottlesAvoided,1);
  $("alcCratesStat").textContent = fmtN(bottlesAvoided/BOTTLES_PER_CRATE,2);
  $("alcKcalStat").textContent = Math.round(bottlesAvoided*kcalPerBottle).toLocaleString("de-DE");
  $("alcDayTile").textContent = future ? "–" : t.d;
  $("alcDayTileLab").textContent = future ? "" : plural(t.d,"Tag","Tage");
  $("alcClockTile").textContent = future ? "startet bald" : `${t.h} Std ${t.m} Min`;
  updateMilestones("alc-ms", alcMilestones, future ? 0 : absMs/60000, future);
}

/* ---------- Lebenszeit ---------- */
function lifeMinutes(){ return (state.absMs/86400000) * (parseFloat(perEl.value)||0) * MIN_PER_UNIT_PER_DAY; }
function renderLife(absMs, future){
  const perDay = parseFloat(perEl.value)||0;
  const minsRegained = future ? 0 : (absMs/86400000) * perDay * MIN_PER_UNIT_PER_DAY;
  let sec = Math.floor(minsRegained*60);
  const y = Math.floor(sec/(365.25*86400)); sec -= Math.floor(y*365.25*86400);
  const d = Math.floor(sec/86400); sec -= d*86400;
  const h = Math.floor(sec/3600); sec -= h*3600;
  const m = Math.floor(sec/60), s = sec%60;
  $("lifeY").textContent=y; $("lifeD").textContent=d; $("lifeH").textContent=h; $("lifeM").textContent=m; $("lifeS").textContent=s;
  const lifeDays = minsRegained/1440;
  $("ovLife").textContent = lifeDays >= 1 ? fmtN(lifeDays,1) + " Tage" : minsRegained >= 60 ? fmtN(minsRegained/60,1) + " Std" : Math.round(minsRegained) + " Min";
  const perYear = Math.round(perDay*MIN_PER_UNIT_PER_DAY*365.25/1440*10)/10;
  const note = future ? "Startet mit deinem ersten rauchfreien Tag."
    : `Grobe Modellrechnung: etwa ${fmtN(perYear,1)} Tage pro rauchfreiem Jahr bei deinem früheren Konsum. Keine individuelle Prognose.`;
  if ($("lifeNote").textContent !== note) $("lifeNote").textContent = note;
}

/* ---------- Finanzen ---------- */
let lastTickMs = Date.now();
function renderFinanceLive(){
  const rate = state.dayRate + state.alcDayRate;
  if (rate <= 0 || ((state.future) && (!state.alcActive || state.alcFuture))){
    $("moneySaved").textContent = fmtEuro(state.totalSaved);
    $("finLive").textContent = "Startet mit deinem ersten Tag";
    return;
  }
  const saved = state.totalSaved + (Date.now() - lastTickMs)/1000 * rate/86400;
  $("moneySaved").textContent = fmtEuro(saved);
  $("finLive").textContent = "+ " + saved.toLocaleString("de-DE",{minimumFractionDigits:5,maximumFractionDigits:5}) + " €, live";
}
function renderFinTable(){
  const vr = state.dayRate, ar = state.alcDayRate, tr = vr+ar;
  const row = (name,r,cls="") => `<tr class="${cls}"><td>${name}</td><td>${fmtEuro(r)}</td><td>${fmtEuro(r*7)}</td><td>${fmtEuro0(r*365.25/12)}</td><td>${fmtEuro0(r*365.25)}</td></tr>`;
  $("finTable").innerHTML = `<tr><th></th><th>Tag</th><th>Woche</th><th>Monat</th><th>Jahr</th></tr>`
    + row("Vape",vr) + row("Alkohol",ar) + row("Gesamt",tr,"total");
}
function renderBeerDerived(){
  const crate = parseFloat(alcCrateEl.value)||0, kcal100 = parseFloat(alcKcalEl.value)||0;
  const items = [];
  if (crate>0) items.push(bsCell("Preis pro Flasche", fmtEuro(crate/BOTTLES_PER_CRATE)));
  if (kcal100>0) items.push(bsCell("kcal pro Flasche", Math.round(kcal100*BOTTLE_ML/100)+" kcal"));
  if (kcal100>0) items.push(bsCell("kcal pro Kiste", Math.round(kcal100*BOTTLE_ML/100*BOTTLES_PER_CRATE).toLocaleString("de-DE")+" kcal"));
  $("beerDerived").innerHTML = items.join("");
}

/* ---------- Sparziele ---------- */
let goals = [];
function loadGoals(){ goals = store.get("rf:goals") || []; }
function saveGoals(){ store.set("rf:goals", goals); }
$("addGoal").addEventListener("click", ()=>{
  const name=$("goalName").value.trim(), cost=parseFloat($("goalCost").value);
  if (!name || !cost || cost<=0) return;
  goals.push({name,cost}); goals.sort((a,b)=>a.cost-b.cost); saveGoals();
  $("goalName").value=""; $("goalCost").value=""; renderGoals();
});
function renderGoals(){
  const box=$("goalList");
  if (!goals.length){ box.innerHTML='<p class="empty">Gib deinem gesparten Geld ein Ziel, zum Beispiel einen Kurztrip.</p>'; return; }
  const saved=state.totalSaved, daily=state.dayRate + state.alcDayRate;
  box.innerHTML = goals.map((g,i)=>{
    const pct=Math.min(100,(saved/g.cost)*100), done=saved>=g.cost;
    const dl = daily>0 ? Math.ceil((g.cost-saved)/daily) : null;
    const meta = done ? `<span class="reached">Erreicht, gönn es dir</span><span>${fmtEuro(g.cost)}</span>`
      : `<span>${fmtEuro(saved)} von ${fmtEuro(g.cost)}</span><span>${dl!=null?"noch etwa "+dl+" "+plural(dl,"Tag","Tage"):""}</span>`;
    return `<div class="goal"><div class="goal-top"><span class="goal-name">${escapeHtml(g.name)}</span><span class="muted small">${Math.floor(pct)} %<button class="del" data-i="${i}" aria-label="Ziel löschen">${icon("trash")}</button></span></div>
      <div class="bar ${done?"bar-teal":"bar-amber"}"><span style="width:${pct}%"></span></div><div class="goal-meta">${meta}</div></div>`;
  }).join("");
  box.querySelectorAll(".del").forEach(b=>b.addEventListener("click",()=>{ goals.splice(+b.dataset.i,1); saveGoals(); renderGoals(); }));
}

/* ---------- Eingaben ---------- */
[startEl, perEl, priceEl, alcStartEl, alcPerWeekEl, alcCrateEl, alcKcalEl].forEach(el => el.addEventListener("input", ()=>{
  saveConfig(); tick(); renderBeerDerived(); renderFinTable(); renderGoals();
}));
whyEl.addEventListener("input", saveConfig);
