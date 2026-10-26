/* Rauchfrei-Zähler, Anläufe und Neustart, Ersparnis, Lebenszeit, Wunschliste */
"use strict";

const PUFFS_PER_VAPE = 600;
const MIN_PER_UNIT_PER_DAY = 60; // Modellannahme: Minuten Lebenserwartung je Vape/Tag und rauchfreiem Tag
const DAY_MS = 86400000;

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

const startEl = $("startDate"), perEl = $("perDay"), priceEl = $("price"), whyEl = $("whyText");
const state = { hasStart:false, future:true, curMs:0, days:0, pastMs:0, freeMs:0, dayRate:0, totalSaved:0, vapes:0 };

/* ---------- Konfiguration ---------- */
function saveConfig(){
  // Zusammenführen, damit andere Felder (z. B. reportName) erhalten bleiben
  const c = store.get("rf:config") || {};
  Object.assign(c, { start:startEl.value, perDay:perEl.value, price:priceEl.value, why:whyEl.value });
  store.set("rf:config", c);
}
function loadConfig(){
  const d = store.get("rf:config"); if (!d) return;
  if (d.start) startEl.value = d.start;
  if (d.perDay) perEl.value = d.perDay;
  if (d.price) priceEl.value = d.price;
  if (d.why) whyEl.value = d.why;
}
function perDay(){ return parseFloat(perEl.value)||0; }
function vapePrice(){ return parseFloat(priceEl.value)||0; }
function currentStart(){
  if (!startEl.value) return null;
  const t = new Date(startEl.value).getTime();
  return isNaN(t) ? null : t;
}
// "2026-10-26T14:05" für datetime-local in Ortszeit
function toLocalInput(ms){ const d = new Date(ms); return dateKey(d) + "T" + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0"); }

/* ---------- Frühere Anläufe ---------- */
// Jeder Neustart legt den beendeten Anlauf ab: { start, end } in Millisekunden
let attempts = [];
function loadAttempts(){ attempts = (store.get("rf:attempts") || []).filter(a=>a && a.end > a.start); }
function saveAttempts(){ store.set("rf:attempts", attempts); }
// Alle rauchfreien Zeiträume inklusive des laufenden
function freeIntervals(){
  const list = attempts.map(a=>({ start:a.start, end:a.end }));
  const s = currentStart(); if (s != null) list.push({ start:s, end:Infinity });
  return list;
}
function longestStreakMs(){ return Math.max(state.curMs, ...attempts.map(a=>a.end-a.start), 0); }
function liveFreeMs(now=Date.now()){ const s = currentStart(); return state.pastMs + (s!=null && now>s ? now-s : 0); }
function liveSaved(now=Date.now()){ return liveFreeMs(now)/DAY_MS * perDay() * vapePrice(); }

function openRestart(){
  const cur = currentStart();
  $("infoSheetTitle").textContent = "Neuer Anlauf";
  $("infoSheetBody").innerHTML = `
    <p class="muted small">Das passiert jedem, der aufhört. Wichtig ist nur, dass du weitermachst. Dein Zähler startet neu, aber nichts geht verloren:
    Die bisher gesparten ${fmtEuro(liveSaved())}, deine Abzeichen und deine längste Strecke bleiben.</p>
    <label class="field" style="margin-top:14px"><span>Neuer Start</span><input type="datetime-local" id="restartAt" value="${toLocalInput(Date.now())}"></label>
    <div class="msg" id="restartMsg"></div>
    <div class="sos-actions">
      <button class="btn btn-primary" id="restartGo">Neuen Anlauf starten</button>
      <button class="btn btn-ghost" id="restartCancel">Abbrechen</button>
    </div>`;
  openSheet("infoOverlay");
  $("restartCancel").onclick = ()=>closeSheet("infoOverlay");
  $("restartGo").onclick = ()=>{
    const at = new Date($("restartAt").value).getTime();
    if (isNaN(at)) return flashMsg("restartMsg", "Wähl einen Zeitpunkt.", true);
    if (at > Date.now() + 60000) return flashMsg("restartMsg", "Der Neustart kann nicht in der Zukunft liegen.", true);
    if (cur != null && at <= cur) return flashMsg("restartMsg", "Der Neustart muss nach deinem bisherigen Start liegen.", true);
    if (cur != null) { attempts.push({ start:cur, end:at }); saveAttempts(); }
    startEl.value = toLocalInput(at); saveConfig();
    closeSheet("infoOverlay");
    tick(); onDataChanged();
    toast("Neuer Anlauf gestartet", "sprout");
  };
}
function undoRestart(){
  const last = attempts[attempts.length-1]; if (!last) return;
  if (!confirm(`Den Neustart vom ${new Date(last.end).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})} Uhr zurücknehmen? Dein Zähler läuft dann wieder ab ${new Date(last.start).toLocaleDateString("de-DE")}.`)) return;
  attempts.pop(); saveAttempts();
  startEl.value = toLocalInput(last.start); saveConfig();
  tick(); onDataChanged();
  toast("Neustart zurückgenommen", "circle-check");
}
$("restartBtn").addEventListener("click", openRestart);
$("undoRestart").addEventListener("click", undoRestart);

/* ---------- Zeitleiste ---------- */
function buildMilestoneList(){
  $("timeline").innerHTML = milestones.map((m,i)=>`
    <div class="milestone" data-mi="${i}">
      <div class="ms-rail"><div class="ms-dot"></div><div class="ms-line"></div></div>
      <div class="ms-body">
        <div class="ms-when">${labelFor(m.mins)}</div>
        <div class="ms-title">${m.title}</div>
        <div class="ms-desc">${m.desc}</div>
        <div class="ms-eta"></div>
      </div>
    </div>`).join("");
}
function updateMilestones(minsElapsed, future){
  let nextMarked = false;
  document.querySelectorAll("#timeline .milestone").forEach(el=>{
    const mi = milestones[+el.dataset.mi], eta = el.querySelector(".ms-eta");
    const done = !future && minsElapsed >= mi.mins;
    el.classList.toggle("done", done);
    const isNext = !done && !nextMarked && !future;
    el.classList.toggle("next", isNext);
    if (isNext) nextMarked = true;
    const t = done ? "Erreicht" : future ? "" : "Noch " + remaining(mi.mins - minsElapsed);
    if (eta.textContent !== t) eta.textContent = t;
  });
}
function renderNextMilestone(minsElapsed){
  const box = $("nextMs");
  if (!state.hasStart || state.future){ box.hidden = true; return; }
  box.hidden = false;
  const idx = milestones.findIndex(m=>m.mins > minsElapsed);
  let html;
  if (idx < 0){
    html = `<div class="nm-top"><span class="chip-ic teal">${icon("trophy")}</span><div class="nm-txt"><small>Alle Meilensteine erreicht</small><b>Über ein Jahr rauchfrei</b></div></div>`;
  } else {
    const m = milestones[idx], prev = idx ? milestones[idx-1].mins : 0;
    const pct = Math.max(0, Math.min(100, (minsElapsed-prev)/(m.mins-prev)*100));
    html = `<div class="nm-top"><span class="chip-ic violet">${icon("sprout")}</span>
      <div class="nm-txt"><small>Nächster Meilenstein, noch ${remaining(m.mins - minsElapsed)}</small><b>${m.title}</b></div>${icon("chevron-right")}</div>
      <div class="bar bar-brand"><span style="width:${pct.toFixed(1)}%"></span></div>`;
  }
  if (box._html !== html){ box.innerHTML = html; box._html = html; }
}

/* ---------- Sekundentakt ---------- */
function splitDur(absMs){
  const totalSec = Math.floor(absMs/1000);
  return { totalSec, d:Math.floor(totalSec/86400), h:Math.floor((totalSec%86400)/3600), m:Math.floor((totalSec%3600)/60), s:totalSec%60 };
}
function tick(){
  const now = Date.now(), start = currentStart(), hasStart = start != null;
  $("notStarted").hidden = hasStart;
  $("sosBtn").hidden = !hasStart;
  const ms = hasStart ? now - start : 0, future = ms < 0, absMs = Math.abs(ms);
  const t = splitDur(absMs);
  state.pastMs = attempts.reduce((a,x)=>a + (x.end - x.start), 0);
  Object.assign(state, { hasStart, future, curMs: future ? 0 : absMs, days: future ? 0 : t.d, dayRate: perDay()*vapePrice() });
  state.freeMs = state.pastMs + state.curMs;
  state.vapes = state.freeMs/DAY_MS * perDay();
  state.totalSaved = state.vapes * vapePrice();

  $("cD").textContent=t.d; $("cH").textContent=t.h; $("cM").textContent=t.m; $("cS").textContent=t.s;
  $("dayBig").textContent = hasStart ? t.d : 0;
  $("dayBigLabel").textContent = !hasStart ? "noch nicht gestartet" : future ? "Tage bis zum Start" : plural(t.d,"Tag rauchfrei","Tage rauchfrei");
  $("ring").style.strokeDashoffset = 276.5 * (1 - (future || !hasStart ? 0 : (t.totalSec%86400)/86400));
  $("vapesAvoided").textContent = fmtN(state.vapes,1);
  $("puffsAvoided").textContent = Math.round(state.vapes*PUFFS_PER_VAPE).toLocaleString("de-DE");
  const mins = state.curMs/60000;
  updateMilestones(mins, future || !hasStart);
  renderNextMilestone(mins);
  renderLife();
}

/* ---------- Lebenszeit ---------- */
function renderLife(){
  const minsRegained = state.freeMs/DAY_MS * perDay() * MIN_PER_UNIT_PER_DAY;
  let sec = Math.floor(minsRegained*60);
  const y = Math.floor(sec/(365.25*86400)); sec -= Math.floor(y*365.25*86400);
  const d = Math.floor(sec/86400); sec -= d*86400;
  const h = Math.floor(sec/3600); sec -= h*3600;
  const m = Math.floor(sec/60), s = sec%60;
  $("lifeY").textContent=y; $("lifeD").textContent=d; $("lifeH").textContent=h; $("lifeM").textContent=m; $("lifeS").textContent=s;
  const lifeDays = minsRegained/1440;
  $("ovLife").textContent = lifeDays >= 1 ? fmtN(lifeDays,1) + " Tage" : minsRegained >= 60 ? fmtN(minsRegained/60,1) + " Std" : Math.round(minsRegained) + " Min";
  const perYear = Math.round(perDay()*MIN_PER_UNIT_PER_DAY*365.25/1440*10)/10;
  const note = state.freeMs <= 0 ? "Startet mit deinem ersten rauchfreien Tag."
    : `Grobe Modellrechnung über deine gesamte rauchfreie Zeit: etwa ${fmtN(perYear,1)} Tage pro rauchfreiem Jahr bei deinem früheren Konsum. Eine Schätzung, keine individuelle Prognose.`;
  if ($("lifeNote").textContent !== note) $("lifeNote").textContent = note;
}

/* ---------- Ersparnis live ---------- */
function renderMoneyLive(){
  const saved = liveSaved(), rate = state.dayRate;
  const big = fmtEuro(saved);
  const fine = rate <= 0 ? "Trag Konsum und Preis in den Einstellungen ein"
    : !state.hasStart || state.future ? "Startet mit deinem ersten rauchfreien Moment"
    : saved.toLocaleString("de-DE",{minimumFractionDigits:5,maximumFractionDigits:5}) + " €, zählt live mit";
  document.querySelectorAll(".panel.active .live-money").forEach(el=>{ if (el.textContent !== big) el.textContent = big; });
  document.querySelectorAll(".panel.active .live-money-fine").forEach(el=>{ if (el.textContent !== fine) el.textContent = fine; });
}
function renderFinTable(){
  const r = state.dayRate, per = perDay();
  $("rateDay").textContent = fmtEuro(r);
  $("rateMonth").textContent = fmtEuro0(r*365.25/12);
  const rows = [["In einer Woche",7],["In einem Monat",365.25/12],["In einem Jahr",365.25],["In 5 Jahren",365.25*5],["In 10 Jahren",365.25*10]];
  $("finTable").innerHTML = `<tr><th>Zeitraum</th><th>Ersparnis</th><th>Vapes</th></tr>` +
    rows.map(([lab,days],i)=>`<tr class="${i===4?"total":""}"><td>${lab}</td><td>${days<40?fmtEuro(r*days):fmtEuro0(r*days)}</td><td>${fmtN(per*days,0)}</td></tr>`).join("");
}

/* ---------- Wunschliste ---------- */
// rf:goals: [{ name, cost, done?, doneTs? }] – ältere Einträge ohne done gelten als offen
let goals = [];
function loadGoals(){ goals = (store.get("rf:goals") || []).map(g=>({ name:g.name, cost:+g.cost||0, done:!!g.done, doneTs:g.doneTs||null })); }
function saveGoals(){ store.set("rf:goals", goals); }
function spentOnWishes(){ return goals.filter(g=>g.done).reduce((a,g)=>a+g.cost,0); }
function availableMoney(){ return Math.max(0, liveSaved() - spentOnWishes()); }
$("addGoal").addEventListener("click", ()=>{
  const name=$("goalName").value.trim(), cost=parseFloat($("goalCost").value);
  if (!name || !cost || cost<=0) return;
  goals.push({ name, cost, done:false, doneTs:null }); saveGoals();
  $("goalName").value=""; $("goalCost").value=""; renderGoals(); renderTodayWish();
});
function wishMeta(g, avail){
  const daily = state.dayRate, missing = g.cost - avail;
  if (missing <= 0) return `<span class="reached">Du kannst es dir gönnen</span><span>${fmtEuro(g.cost)}</span>`;
  const dl = daily>0 ? Math.ceil(missing/daily) : null;
  return `<span>${fmtEuro(avail)} von ${fmtEuro(g.cost)}</span><span>${dl!=null ? "noch etwa "+dl+" "+plural(dl,"Tag","Tage") : ""}</span>`;
}
function renderGoals(){
  const avail = availableMoney(), spent = spentOnWishes();
  $("wishAvail").textContent = spent > 0
    ? `Verfügbar: ${fmtEuro(avail)}. Für erfüllte Wünsche hast du schon ${fmtEuro(spent)} ausgegeben.`
    : "Gib deinem gesparten Geld ein Ziel. Wenn der Balken voll ist, gönn es dir und hak es ab.";
  const open = goals.map((g,i)=>({g,i})).filter(x=>!x.g.done).sort((a,b)=>a.g.cost-b.g.cost);
  $("wishList").innerHTML = open.length ? open.map(({g,i})=>{
    const pct = Math.min(100, avail/g.cost*100), ready = avail >= g.cost;
    return `<div class="goal"><div class="goal-top"><span class="goal-name">${escapeHtml(g.name)}</span>
      <span class="muted small">${Math.floor(pct)} %<button class="del" data-del="${i}" aria-label="Wunsch löschen">${icon("trash")}</button></span></div>
      <div class="bar ${ready?"bar-teal":"bar-amber"}"><span style="width:${pct}%"></span></div><div class="goal-meta">${wishMeta(g, avail)}</div>
      ${ready ? `<button class="btn btn-primary btn-sm wish-go" data-done="${i}">${icon("gift")}Ich gönn es mir</button>` : ""}</div>`;
  }).join("") : "";
  const done = goals.map((g,i)=>({g,i})).filter(x=>x.g.done).sort((a,b)=>(b.g.doneTs||0)-(a.g.doneTs||0));
  $("wishDone").innerHTML = done.length ? `<div class="badge-cat">Gegönnt</div>` + done.map(({g,i})=>`<div class="row">
      <span class="r-ic">${icon("circle-check")}</span>
      <span class="r-main"><b>${escapeHtml(g.name)}</b><small>${g.doneTs ? new Date(g.doneTs).toLocaleDateString("de-DE") : ""}</small></span>
      <span class="r-val">${fmtEuro(g.cost)}</span>
      <button class="del" data-undo="${i}" aria-label="Wieder offen">${icon("x")}</button></div>`).join("") : "";
  document.querySelectorAll("#wishList [data-del]").forEach(b=>b.addEventListener("click",()=>{
    if (!confirm("Diesen Wunsch löschen?")) return;
    goals.splice(+b.dataset.del,1); saveGoals(); renderGoals(); renderTodayWish();
  }));
  document.querySelectorAll("#wishList [data-done]").forEach(b=>b.addEventListener("click",()=>{
    const g = goals[+b.dataset.done]; g.done = true; g.doneTs = Date.now(); saveGoals();
    toast("Gönn es dir, du hast es dir verdient", "gift"); renderGoals(); renderTodayWish(); onDataChanged();
  }));
  document.querySelectorAll("#wishDone [data-undo]").forEach(b=>b.addEventListener("click",()=>{
    const g = goals[+b.dataset.undo]; g.done = false; g.doneTs = null; saveGoals(); renderGoals(); renderTodayWish(); onDataChanged();
  }));
}
function renderTodayWish(){
  const avail = availableMoney();
  const open = goals.filter(g=>!g.done).sort((a,b)=>a.cost-b.cost)[0];
  if (!open){ $("todayWish").innerHTML = ""; return; }
  const pct = Math.min(100, avail/open.cost*100);
  $("todayWish").innerHTML = `<button class="card next-ms" data-goto="geld"><div class="nm-top"><span class="chip-ic amber">${icon("gift")}</span>
    <div class="nm-txt"><small>Nächster Wunsch, ${Math.floor(pct)} %</small><b>${escapeHtml(open.name)}</b></div>${icon("chevron-right")}</div>
    <div class="bar ${pct>=100?"bar-teal":"bar-amber"}"><span style="width:${pct}%"></span></div><div class="goal-meta">${wishMeta(open, avail)}</div></button>`;
  $("todayWish").querySelector("[data-goto]").addEventListener("click", ()=>showPanel("geld"));
}

/* ---------- Eingaben ---------- */
[startEl, perEl, priceEl].forEach(el => el.addEventListener("input", ()=>{
  saveConfig(); tick(); renderFinTable(); renderGoals(); renderTodayWish(); onDataChanged();
}));
whyEl.addEventListener("input", saveConfig);
