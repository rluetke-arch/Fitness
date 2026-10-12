/* Gamification: XP, Level, Serie, Tagesquests, Truhen, Tagesbonus, Trophäen, Notfall-Knopf */
"use strict";

let game = {};
const CHEST_INTERVAL = 1800*1000, CHEST_CAP = 8;
const QUEST_XP = 30, QUEST_BONUS_XP = 75, QUEST_BONUS_BP = 100, LEVEL_BP = 100, BADGE_XP = 25;
const SOS_XP = 25, SOS_COOLDOWN = 15*60*1000;
const levelTitles = ["Einsteiger","Entschlossen","Standhaft","Fokussiert","Stark","Eisern","Klarer Kopf","Unbeirrbar",
  "Meisterlich","Unaufhaltsam","Vorbild","Legendär","Grenzenlos"];
const chestLines = ["Jede Stunde ohne Vape zählt.","Dein Atem wird ruhiger.","Dein Geld arbeitet jetzt für dich.",
  "Der Drang wird jeden Tag schwächer.","Du beweist dir gerade selbst etwas.","Deine Lunge merkt den Unterschied.",
  "Bleib dran, es wird leichter.","Dein zukünftiges Ich ist dir dankbar.","Ein Schritt näher an die Freiheit."];

function loadGame(){
  const g = store.get("rf:game") || {};
  game = Object.assign({ xp:0, lastCollect:Date.now(), dailyDay:"", quests:null, questsDone:0, questDays:[],
    bonusBP:0, bestStreak:0, lastSosXp:0, chestDay:"" }, g);
  if (!game.lastCollect) game.lastCollect = Date.now();
  // Umstieg vom alten 24-Stunden-Bonus auf Kalendertage
  if (!game.dailyDay && g.lastDaily && Date.now()-g.lastDaily < 86400000) game.dailyDay = dateKey(new Date(g.lastDaily));
}
function saveGame(){ store.set("rf:game", game); }

/* ---------- Level ---------- */
function xpForLevel(l){ return 100 + (l-1)*50; }
function levelInfo(xp){
  let lvl=1, rem=xp;
  while (rem >= xpForLevel(lvl)) { rem -= xpForLevel(lvl); lvl++; if (lvl>999) break; }
  return { lvl, inLevel: rem, need: xpForLevel(lvl) };
}
function levelTitle(l){ return levelTitles[Math.min(l-1, levelTitles.length-1)]; }
function addXp(n){
  const before = levelInfo(game.xp).lvl;
  game.xp += n; saveGame();
  const after = levelInfo(game.xp).lvl;
  if (after > before) triggerLevelUp(after);
  renderPlayer(); renderLevel();
}
function triggerLevelUp(lvl){
  const ov = $("lvupOverlay");
  $("lvupNum").textContent = lvl;
  $("lvupTitle").textContent = levelTitle(lvl);
  $("lvupReward").innerHTML = icon("hammer") + "+" + LEVEL_BP + " Baupunkte für deine Welt";
  const colors = ["#8c6bff","#2de2c2","#ff4f7b","#ffb547","#58a6ff"];
  ov.querySelectorAll(".confetti").forEach(el=>el.remove());
  let conf = "";
  for (let i=0;i<30;i++) conf += `<span class="confetti" style="left:${Math.random()*100}%;background:${colors[i%5]};animation-duration:${1.4+Math.random()*1.4}s;animation-delay:${Math.random()*.5}s"></span>`;
  ov.insertAdjacentHTML("beforeend", conf);
  ov.classList.add("show");
  ov.querySelectorAll(".lvup-card,.lvup-ring").forEach(el=>{ el.style.animation="none"; void el.offsetWidth; el.style.animation=""; });
  try { if (navigator.vibrate) navigator.vibrate([40,60,40]); } catch(e){}
  clearTimeout(triggerLevelUp._t);
  triggerLevelUp._t = setTimeout(closeLevelUp, 3200);
}
function closeLevelUp(){ const ov=$("lvupOverlay"); ov.classList.remove("show"); ov.querySelectorAll(".confetti").forEach(el=>el.remove()); }
$("lvupOverlay").addEventListener("click", ()=>{ clearTimeout(triggerLevelUp._t); closeLevelUp(); });

function renderLevel(){
  const info = levelInfo(game.xp);
  $("lvBadge").textContent = info.lvl;
  $("lvTitle").textContent = levelTitle(info.lvl) + ", Level " + info.lvl;
  $("lvSub").textContent = game.xp.toLocaleString("de-DE") + " XP gesammelt";
  $("lvFill").style.width = (info.inLevel/info.need*100) + "%";
  $("lvNext").textContent = `Noch ${info.need-info.inLevel} XP bis Level ${info.lvl+1} (${levelTitle(info.lvl+1)}). Jedes Level bringt ${LEVEL_BP} Baupunkte.`;
}

/* ---------- Serie ---------- */
function activeDates(){
  const s = new Set();
  vitals.forEach(v=>s.add(v.date));
  Object.keys(steps).forEach(k=>s.add(k));
  sessions.forEach(x=>s.add(x.date));
  Object.entries(meals).forEach(([k,l])=>{ if (l.length) s.add(k); });
  Object.keys(weights).forEach(k=>s.add(k));
  (game.questDays||[]).forEach(k=>s.add(k));
  return s;
}
function streakInfo(){
  const s = activeDates(), today = todayKey();
  const activeToday = s.has(today);
  let cur = 0, off = activeToday ? 0 : 1;
  while (s.has(dateKeyOffset(off))) { cur++; off++; }
  // längste Serie über alle Tage
  let best = 0, run = 0, prev = null;
  [...s].sort().forEach(k=>{
    if (prev && (parseKey(k) - parseKey(prev)) === 86400000) run++; else run = 1;
    best = Math.max(best, run); prev = k;
  });
  best = Math.max(best, game.bestStreak||0, cur);
  if (best > (game.bestStreak||0)){ game.bestStreak = best; saveGame(); }
  return { cur, best, activeToday, set:s };
}
function renderStreakCard(si){
  const card = $("streakCard");
  card.classList.toggle("cold", si.cur===0);
  const week = [];
  for (let i=6;i>=0;i--){
    const k = dateKeyOffset(i), lab = parseKey(k).toLocaleDateString("de-DE",{weekday:"narrow"});
    week.push(`<span class="${si.set.has(k)?"on":""} ${i===0?"today":""}">${lab}</span>`);
  }
  const hint = si.activeToday ? "Heute erledigt. Morgen geht es weiter."
    : si.cur>0 ? "Heute noch offen: trag eine Messung, Schritte oder eine Mahlzeit ein."
    : "Trag heute etwas ein, um eine neue Serie zu starten.";
  card.innerHTML = `<div class="streak-flame">${icon("flame")}</div>
    <div style="flex:1;min-width:0"><div class="chest-h">${si.cur} ${plural(si.cur,"Tag","Tage")} in Folge aktiv</div>
    <div class="muted small">Rekord: ${si.best} ${plural(si.best,"Tag","Tage")}. ${hint}</div>
    <div class="streak-week">${week.join("")}</div></div>`;
}

/* ---------- Tagesquests ---------- */
const questPool = [
  { id:"measure",  title:"Blutdruck messen",          target:()=>1,    cur:()=>vitals.filter(v=>v.date===todayKey()).length },
  { id:"measure2", title:"Morgens und abends messen", target:()=>2,    cur:()=>new Set(vitals.filter(v=>v.date===todayKey()).map(v=>v.slot)).size },
  { id:"steps5k",  title:"5.000 Schritte gehen",      target:()=>5000, cur:()=>steps[todayKey()]||0, unit:"Schritte" },
  { id:"stepgoal", title:"Schrittziel erreichen",     target:()=>stepGoal(), cur:()=>steps[todayKey()]||0, unit:"Schritte" },
  { id:"train20",  title:"20 Minuten trainieren",     target:()=>20,   cur:()=>sessions.filter(s=>s.date===todayKey()).reduce((a,s)=>a+s.mins,0), unit:"Min" },
  { id:"meals3",   title:"3 Mahlzeiten erfassen",     target:()=>3,    cur:()=>todayMealList().length },
  { id:"budget",   title:"Im Kalorienbudget bleiben", target:()=>1,    cur:()=>{ const l=todayMealList(), b=kcalBudget(); return (l.length>=2 && b && l.reduce((a,m)=>a+(m.kcal||0),0)<=b) ? 1 : 0; },
    note:"zählt ab 2 erfassten Mahlzeiten", when:()=>!!kcalBudget() },
  { id:"weigh",    title:"Wiegen",                    target:()=>1,    cur:()=>weights[todayKey()]!=null ? 1 : 0 },
  { id:"chest",    title:"Eine Truhe öffnen",         target:()=>1,    cur:()=>game.chestDay===todayKey() ? 1 : 0 },
  { id:"build",    title:"Etwas in deiner Welt bauen",target:()=>1,    cur:()=>city.buildings.some(b=>b.ts && dateKey(new Date(b.ts))===todayKey()) ? 1 : 0,
    when:()=>availableBP()>=100 && hasFreeLot() },
];
function hashStr(s){ let h=2166136261; for (const c of s){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h>>>0; }
function todaysQuests(){
  const today = todayKey();
  if (!game.quests || game.quests.date !== today){
    const pool = questPool.filter(q=>!q.when || q.when());
    let seed = hashStr(today);
    const picked = [];
    while (picked.length < 3 && pool.length){
      seed = Math.imul(seed ^ (seed>>>15), 2246822507)>>>0;
      const q = pool.splice(seed % pool.length, 1)[0];
      if (q.id==="measure2" && picked.includes("measure")) continue;
      if (q.id==="measure" && picked.includes("measure2")) continue;
      if (q.id==="stepgoal" && picked.includes("steps5k")) continue;
      if (q.id==="steps5k" && picked.includes("stepgoal")) continue;
      picked.push(q.id);
    }
    game.quests = { date: today, ids: picked, claimed: [], bonus: false };
    saveGame();
  }
  return game.quests;
}
function renderQuests(){
  const qs = todaysQuests();
  const rows = qs.ids.map(id=>{
    const q = questPool.find(x=>x.id===id); if (!q) return "";
    const target = q.target(), cur = Math.min(q.cur(), target), done = cur >= target, claimed = qs.claimed.includes(id);
    const prog = q.unit ? `${cur.toLocaleString("de-DE")} von ${target.toLocaleString("de-DE")} ${q.unit}` : target>1 ? `${cur} von ${target}` : (q.note || (done ? "erledigt" : "offen"));
    const right = claimed ? `<span class="q-reward">+${QUEST_XP} XP</span>`
      : done ? `<button class="btn btn-primary btn-sm" data-claim="${id}">Abholen</button>`
      : `<span class="q-reward">+${QUEST_XP} XP</span>`;
    return `<div class="quest ${claimed?"claimed":done?"ready":""}"><span class="q-check">${icon("check")}</span>
      <div class="q-body"><div class="q-title">${q.title}</div><div class="q-prog">${prog}</div></div>${right}</div>`;
  });
  $("questList").innerHTML = rows.join("");
  const nClaimed = qs.claimed.length;
  $("questProgress").textContent = nClaimed + " von " + qs.ids.length;
  const all = nClaimed >= qs.ids.length && qs.ids.length > 0;
  $("questBonus").innerHTML = qs.bonus
    ? `<div class="bonus-row done"><span class="chip-ic amber">${icon("gift")}</span><span class="bt">Bonus abgeholt. Morgen gibt es neue Quests.</span></div>`
    : `<div class="bonus-row"><span class="chip-ic amber">${icon("gift")}</span><span class="bt"><b>Alle drei geschafft?</b><br><span class="muted small">Bonus: +${QUEST_BONUS_XP} XP und +${QUEST_BONUS_BP} Baupunkte</span></span>
       ${all ? `<button class="btn btn-amber btn-sm" id="questBonusBtn">Öffnen</button>` : `<span class="muted small">${nClaimed}/3</span>`}</div>`;
  $("questList").querySelectorAll("[data-claim]").forEach(b=>b.addEventListener("click", ()=>claimQuest(b.dataset.claim)));
  const bb = $("questBonusBtn"); if (bb) bb.addEventListener("click", claimQuestBonus);
}
function claimQuest(id){
  const qs = todaysQuests(), q = questPool.find(x=>x.id===id);
  if (!q || qs.claimed.includes(id) || q.cur() < q.target()) return;
  qs.claimed.push(id); game.questsDone = (game.questsDone||0) + 1;
  if (!game.questDays.includes(qs.date)) game.questDays.push(qs.date);
  game.questDays = game.questDays.slice(-400);
  saveGame(); addXp(QUEST_XP); toast("Quest geschafft: " + q.title, "circle-check");
  refreshGame();
}
function claimQuestBonus(){
  const qs = todaysQuests();
  if (qs.bonus || qs.claimed.length < qs.ids.length) return;
  qs.bonus = true; game.bonusBP = (game.bonusBP||0) + QUEST_BONUS_BP; saveGame();
  addXp(QUEST_BONUS_XP); toast("Quest-Bonus: +" + QUEST_BONUS_BP + " Baupunkte", "gift");
  refreshGame(); renderCity();
}

/* ---------- Truhen ---------- */
function availableChests(){ return Math.max(0, Math.min(CHEST_CAP, Math.floor((Date.now() - game.lastCollect) / CHEST_INTERVAL))); }
function renderChest(){
  const n = availableChests(), box = $("chestBox"), badge = $("chestBadge"), btn = $("chestBtn");
  box.classList.toggle("ready", n>0);
  badge.hidden = n<=0; badge.textContent = n;
  if (n > 0){
    $("chestH").textContent = n===CHEST_CAP ? "Truhen voll" : n>1 ? n+" Truhen bereit" : "Truhe bereit";
    $("chestSub").textContent = "Jede Truhe bringt 8 bis 15 XP";
    btn.disabled = false; btn.textContent = "Öffnen";
  } else {
    const rem = CHEST_INTERVAL - ((Date.now() - game.lastCollect) % CHEST_INTERVAL);
    $("chestH").textContent = "Belohnungstruhe";
    $("chestSub").textContent = "Nächste in " + Math.floor(rem/60000) + ":" + String(Math.floor((rem%60000)/1000)).padStart(2,"0");
    btn.disabled = true; btn.textContent = "Warten";
  }
}
$("chestBtn").addEventListener("click", ()=>{
  const n = availableChests(); if (n <= 0) return;
  let gained = 0; for (let i=0;i<n;i++) gained += 8 + Math.floor(Math.random()*8);
  game.lastCollect = n >= CHEST_CAP ? Date.now() : game.lastCollect + n*CHEST_INTERVAL;
  game.chestDay = todayKey(); saveGame(); addXp(gained);
  showReward("chestReward", "+" + gained + " XP", chestLines[Math.floor(Math.random()*chestLines.length)]);
  renderChest(); refreshGame();
});
function showReward(boxId, big, line){
  $(boxId).innerHTML = `<div class="reward"><b>${big}</b><p>${line}</p></div>`;
  clearTimeout(showReward["_"+boxId]); showReward["_"+boxId] = setTimeout(()=>{ $(boxId).innerHTML=""; }, 6000);
}

/* ---------- Tagesbonus (Kalendertag, wächst mit der Serie) ---------- */
function dailyXp(){ return 50 + Math.min(streakInfo().cur, 30)*5; }
function dailyReady(){ return game.dailyDay !== todayKey(); }
function renderDaily(){
  const ready = dailyReady(), btn = $("dailyBtn");
  $("dailyBox").classList.toggle("ready", ready);
  if (ready){
    $("dailyH").textContent = "Tagesbonus bereit";
    $("dailySub").textContent = "+" + dailyXp() + " XP, je länger deine Serie, desto mehr";
    btn.disabled = false; btn.textContent = "Abholen";
  } else {
    const mid = new Date(); mid.setHours(24,0,0,0);
    const rem = mid - Date.now();
    $("dailyH").textContent = "Tagesbonus";
    $("dailySub").textContent = "Nächster Bonus in " + Math.floor(rem/3600000) + " Std " + Math.floor((rem%3600000)/60000) + " Min";
    btn.disabled = true; btn.textContent = "Abgeholt";
  }
}
$("dailyBtn").addEventListener("click", ()=>{
  if (!dailyReady()) return;
  const xp = dailyXp(); game.dailyDay = todayKey(); saveGame(); addXp(xp);
  showReward("dailyReward", "+" + xp + " XP", "Tagesbonus. " + chestLines[Math.floor(Math.random()*chestLines.length)]);
  renderDaily(); refreshGame();
});

/* ---------- Trophäen ---------- */
let sosCount = 0;
function loadSos(){ const d=store.get("rf:sos"); sosCount = d ? (d.count||0) : 0; }
function saveSos(){ store.set("rf:sos", {count:sosCount}); }
const sumSteps = ()=>Object.values(steps).reduce((a,b)=>a+b,0);
const sumMins = ()=>sessions.reduce((a,s)=>a+s.mins,0);
const badgeCats = [
  { cat:"Rauchfrei", color:"#2de2c2", val:()=>state.days, items:[
    { ico:"sprout", name:"Erster Tag", t:1 }, { ico:"flame", name:"Der Gipfel", t:3 }, { ico:"star", name:"Eine Woche", t:7 },
    { ico:"shield", name:"Zwei Wochen", t:14 }, { ico:"medal", name:"Ein Monat", t:30 }, { ico:"award", name:"Ein Quartal", t:90 },
    { ico:"crown", name:"Ein Halbjahr", t:180 }, { ico:"trophy", name:"Ein Jahr", t:365 } ], unit:"Tage" },
  { cat:"Alkoholfrei", color:"#58a6ff", val:()=>state.alcDays, items:[
    { ico:"glass-water", name:"Erster Tag", t:1 }, { ico:"droplet", name:"Eine Woche", t:7 }, { ico:"leaf", name:"Zwei Wochen", t:14 },
    { ico:"mountain-snow", name:"Ein Monat", t:30 }, { ico:"sailboat", name:"Ein Quartal", t:90 }, { ico:"crown", name:"Ein Jahr", t:365 } ], unit:"Tage" },
  { cat:"Serie", color:"#ff7a6b", val:()=>streakInfo().best, items:[
    { ico:"flame", name:"Warmgelaufen", t:3 }, { ico:"flame", name:"Wochenserie", t:7 }, { ico:"flame", name:"Zwei Wochen dran", t:14 },
    { ico:"flame", name:"Monatsserie", t:30 }, { ico:"flame", name:"Unaufhaltsam", t:60 }, { ico:"flame", name:"Hundert Tage", t:100 } ], unit:"Tage in Folge" },
  { cat:"Ersparnis", color:"#ffb547", val:()=>state.totalSaved, items:[
    { ico:"coins", name:"25 €", t:25 }, { ico:"banknote", name:"100 €", t:100 }, { ico:"wallet", name:"250 €", t:250 },
    { ico:"piggy-bank", name:"500 €", t:500 }, { ico:"hand-coins", name:"1.000 €", t:1000 }, { ico:"gem", name:"2.500 €", t:2500 } ], unit:"€" },
  { cat:"Willenskraft", color:"#ff4f7b", val:()=>sosCount, items:[
    { ico:"shield", name:"Standhaft", t:1 }, { ico:"swords", name:"Kämpfer", t:5 }, { ico:"shield-check", name:"Held", t:15 },
    { ico:"sword", name:"Meister", t:30 }, { ico:"castle", name:"Unbesiegbar", t:50 } ], unit:"Verlangen überstanden" },
  { cat:"Tagesquests", color:"#8c6bff", val:()=>game.questsDone||0, items:[
    { ico:"list-checks", name:"Erste Quest", t:1 }, { ico:"list-checks", name:"Zehn Quests", t:10 }, { ico:"target", name:"Fünfzig Quests", t:50 },
    { ico:"badge-check", name:"Hundert Quests", t:100 } ], unit:"Quests" },
  { cat:"Vitalwerte", color:"#ff7a9b", val:()=>vitals.length, items:[
    { ico:"stethoscope", name:"Erste Messung", t:1 }, { ico:"chart-line", name:"Dranbleiben", t:10 }, { ico:"heart-pulse", name:"Datenprofi", t:30 },
    { ico:"activity", name:"Hundert Messungen", t:100 } ], unit:"Messungen" },
  { cat:"Bewegung", color:"#3ddc84", val:()=>sumMins(), items:[
    { ico:"dumbbell", name:"Erste Stunde", t:60 }, { ico:"flame", name:"Fünf Stunden", t:300 }, { ico:"bike", name:"Zwanzig Stunden", t:1200 } ], unit:"Trainingsminuten" },
  { cat:"Schritte", color:"#2de2c2", val:()=>sumSteps(), items:[
    { ico:"footprints", name:"100.000 Schritte", t:100000 }, { ico:"mountain", name:"Halbe Million", t:500000 }, { ico:"map-pin", name:"Eine Million", t:1000000 } ], unit:"Schritte" },
  { cat:"Zielgewicht", color:"#3ddc84", val:()=>{ const w=weightGoalInfo(); return w.pct!=null && w.entries.length>=2 ? w.pct : 0; }, items:[
    { ico:"scale", name:"Ein Viertel", t:25 }, { ico:"target", name:"Halbzeit", t:50 }, { ico:"flag", name:"Fast da", t:75 },
    { ico:"party-popper", name:"Ziel erreicht", t:100 } ], unit:"% des Wegs" },
  { cat:"Welt", color:"#ffb547", val:()=>city.buildings.length, items:[
    { ico:"house", name:"Grundstein", t:1 }, { ico:"building", name:"Halbe Innenstadt", t:6 }, { ico:"landmark", name:"Erster Bezirk", t:12 },
    { ico:"anchor", name:"Zwei Bezirke", t:24 }, { ico:"ferris-wheel", name:"Ganze Welt", t:36 } ], unit:"Gebäude" },
];
function allBadges(){
  return badgeCats.flatMap(c=>{ const v = c.val()||0; return c.items.map((b,i)=>({ ...b, id:c.cat+"#"+i, cat:c.cat, color:c.color, unit:c.unit, v, earned: v>=b.t })); });
}
function fmtBadgeVal(v, unit){ return unit==="€" ? fmtEuro0(v) : Math.floor(v).toLocaleString("de-DE"); }
function badgeHtml(b){
  const pct = Math.min(100, b.v/b.t*100);
  const sub = b.earned ? "freigeschaltet" : (b.unit==="€" ? fmtEuro0(b.t) : b.t.toLocaleString("de-DE") + " " + b.unit);
  return `<div class="badge ${b.earned?"earned":""}" style="--bc:${b.color}"><div class="b-ico">${icon(b.earned?b.ico:"lock")}</div>
    <div class="b-name">${b.name}</div><div class="b-sub">${sub}</div>${b.earned?"":`<div class="b-prog"><span style="width:${pct}%"></span></div>`}</div>`;
}
function renderBadges(list){
  list = list || allBadges();
  const earned = list.filter(b=>b.earned).length;
  $("bpFill").style.width = (earned/list.length*100)+"%";
  $("bpText").textContent = earned + " von " + list.length;
  $("plTrophies").textContent = earned;
  const next = list.filter(b=>!b.earned && b.v>0).sort((a,b)=>(b.v/b.t)-(a.v/a.t)).slice(0,3);
  $("nextBadges").innerHTML = next.length ? `<div class="next-badges">${next.map(b=>`<div class="nb" style="--bc:${b.color}"><div class="b-ico">${icon(b.ico)}</div>
    <div class="nb-body"><b>${b.name}</b><small>${b.cat}: ${fmtBadgeVal(b.v,b.unit)} von ${fmtBadgeVal(b.t,b.unit)}${b.unit==="€"?"":" "+b.unit}</small>
    <div class="bar"><span style="width:${Math.min(100,b.v/b.t*100)}%"></span></div></div></div>`).join("")}</div>` : "";
  $("badgeSections").innerHTML = badgeCats.map(c=>`<div class="badge-cat">${c.cat}</div>
    <div class="badges">${list.filter(b=>b.cat===c.cat).map(badgeHtml).join("")}</div>`).join("");
}
// Neue Trophäen erkennen, belohnen und melden
function checkNewBadges(list){
  const seen = store.get("rf:badgeseen");
  const earnedIds = list.filter(b=>b.earned).map(b=>b.id);
  if (!seen){ store.set("rf:badgeseen", earnedIds); return; } // erster Start: still übernehmen
  const fresh = list.filter(b=>b.earned && !seen.includes(b.id));
  if (!fresh.length) return;
  store.set("rf:badgeseen", [...seen, ...fresh.map(b=>b.id)]);
  addXp(BADGE_XP * fresh.length);
  toast((fresh.length>1 ? fresh.length + " Trophäen" : "Trophäe „" + fresh[0].name + "”") + " freigeschaltet, +" + BADGE_XP*fresh.length + " XP", "trophy");
}

/* ---------- Spielerkarte ---------- */
function renderPlayer(){
  const info = levelInfo(game.xp), frac = info.inLevel/info.need;
  $("plLvl").textContent = info.lvl; $("lpLvl").textContent = info.lvl;
  $("plTitle").textContent = levelTitle(info.lvl);
  $("plXp").textContent = `${info.inLevel} von ${info.need} XP bis Level ${info.lvl+1}`;
  $("plArc").style.strokeDashoffset = 326.7 * (1 - frac);
  $("lpArc").style.strokeDashoffset = 94.25 * (1 - frac);
  $("plBp").textContent = availableBP().toLocaleString("de-DE");
}
function renderStreakBits(si){
  $("plStreak").textContent = si.cur; $("lpStreak").textContent = si.cur;
  $("plStreakLab").textContent = si.cur===1 ? "Tag Serie" : "Tage Serie";
}
function attentionCount(){
  const qs = game.quests && game.quests.date===todayKey() ? game.quests : null;
  let n = availableChests()>0 ? 1 : 0;
  if (dailyReady()) n++;
  if (qs){ qs.ids.forEach(id=>{ const q=questPool.find(x=>x.id===id); if (q && !qs.claimed.includes(id) && q.cur()>=q.target()) n++; });
    if (!qs.bonus && qs.claimed.length>=qs.ids.length && qs.ids.length) n++; }
  return n;
}
// Langsamer Takt: alles, was sich nicht jede Sekunde ändert
function refreshGame(){
  const si = streakInfo();
  renderStreakBits(si); renderStreakCard(si);
  renderQuests();
  const list = allBadges(); renderBadges(list); checkNewBadges(list);
  renderPlayer(); renderLevel(); renderDaily(); renderChest();
  $("tabDot").hidden = attentionCount()===0;
}
function renderXpTable(){
  const rows = [["Tagesquest", "+"+QUEST_XP], ["Alle 3 Quests", "+"+QUEST_BONUS_XP+" und "+QUEST_BONUS_BP+" BP"], ["Tagesbonus", "50 bis 200"],
    ["Truhe (alle 30 Min)", "8 bis 15"], ["Trophäe", "+"+BADGE_XP], ["Verlangen überstanden", "+"+SOS_XP], ["Training (bis 3 pro Tag)", "+"+SESSION_XP],
    ["Messung (bis 2 pro Tag)", "+"+VITAL_XP], ["Wiegen", "+"+WEIGH_XP], ["Schritte eintragen", "+"+STEPS_XP], ["Mahlzeit (bis 6 pro Tag)", "+"+MEAL_XP]];
  $("xpTable").innerHTML = rows.map(r=>`<span>${r[0]}</span><span>${r[1]}</span>`).join("");
}

/* ---------- Notfall-Knopf ---------- */
const sosStage = $("sosStage");
let breathTimer = null;
$("sosBtn").addEventListener("click", ()=>{ openSheet("sosOverlay"); showSosMenu(); });
$("sosClose").addEventListener("click", closeSos);
$("sosOverlay").addEventListener("click", e=>{ if (e.target.id==="sosOverlay") closeSos(); });
function stopBreath(){ if (breathTimer){ clearInterval(breathTimer); breathTimer=null; } }
function closeSos(){ closeSheet("sosOverlay"); stopBreath(); }
function showSosMenu(){
  stopBreath();
  sosStage.innerHTML = `
    <div class="sos-h">Das Verlangen geht vorbei.</div>
    <div class="sos-p">Eine Welle dauert meist nur 3 bis 5 Minuten. Du musst sie nicht bekämpfen, nur überstehen.</div>
    <div class="sos-actions">
      <button class="btn btn-primary" id="goBreath">${icon("wind")}60 Sekunden atmen</button>
      <button class="btn btn-ghost" id="goWhy">Warum ich aufhöre</button>
      <button class="btn btn-ghost" id="goMoney">Was ich schon gespart habe</button>
    </div>
    <div class="sos-stat">Schon ${sosCount}× überstanden</div>`;
  $("goBreath").onclick = startBreathing; $("goWhy").onclick = showWhy; $("goMoney").onclick = showMoney;
}
function startBreathing(){
  let total = 60; const phases = [["Einatmen",4],["Halten",4],["Ausatmen",6]]; let pi = 0, pleft = phases[0][1];
  sosStage.innerHTML = `<div class="breath" id="bCircle"><span id="bText">Einatmen</span></div>
    <div class="breath-count" id="bCount">60</div><div class="sos-p">Folge dem Kreis.</div>
    <div class="sos-actions"><button class="btn btn-ghost" id="bDone">Geschafft</button></div>`;
  const circle=$("bCircle"), txt=$("bText"), cnt=$("bCount");
  const apply = ()=>{ const name = phases[pi][0]; txt.textContent = name; circle.style.transform = name==="Einatmen" ? "scale(1.25)" : name==="Ausatmen" ? "scale(.8)" : circle.style.transform; };
  setTimeout(apply, 50);
  breathTimer = setInterval(()=>{
    total--; pleft--; cnt.textContent = total;
    if (pleft<=0){ pi=(pi+1)%phases.length; pleft=phases[pi][1]; apply(); }
    if (total<=0){ stopBreath(); finishSos(); }
  }, 1000);
  $("bDone").onclick = ()=>{ stopBreath(); finishSos(); };
}
function showWhy(){
  const why = (whyEl.value||"").trim();
  sosStage.innerHTML = `<div class="sos-h">Dein Grund</div>
    <div class="sos-why">${why ? "„"+escapeHtml(why)+"”" : "Du hast noch keinen Grund eingetragen. Deine eigenen Worte helfen in diesem Moment am meisten. Du findest das Feld unter Mehr, Einstellungen."}</div>
    <div class="sos-actions"><button class="btn btn-primary" id="goBreath2">Jetzt durchatmen</button><button class="btn btn-ghost" id="back1">Zurück</button></div>`;
  $("goBreath2").onclick = startBreathing; $("back1").onclick = showSosMenu;
}
function showMoney(){
  sosStage.innerHTML = `<div class="sos-h">Schon gespart</div><div class="sos-money">${fmtEuro(state.totalSaved)}</div>
    <div class="sos-p">Eine neue Vape würde dich jetzt ${fmtEuro(parseFloat(priceEl.value)||0)} kosten.</div>
    <div class="sos-actions"><button class="btn btn-primary" id="goBreath3">Jetzt durchatmen</button><button class="btn btn-ghost" id="back2">Zurück</button></div>`;
  $("goBreath3").onclick = startBreathing; $("back2").onclick = showSosMenu;
}
function finishSos(){
  const rewarded = Date.now() - (game.lastSosXp||0) > SOS_COOLDOWN;
  if (rewarded){ sosCount++; saveSos(); game.lastSosXp = Date.now(); saveGame(); addXp(SOS_XP); }
  sosStage.innerHTML = `<div class="sos-done-ic">${icon("shield-check")}</div><div class="sos-h">Geschafft</div>
    <div class="sos-p">Du hast die Welle überstanden, ohne zu vapen. Genau so wird Aufhören zur Gewohnheit.</div>
    <div class="sos-stat">${rewarded ? `Insgesamt ${sosCount}× überstanden, +${SOS_XP} XP` : "Gleiche Welle wie eben, deshalb diesmal ohne XP. Gut gemacht trotzdem."}</div>
    <div class="sos-actions"><button class="btn btn-primary" id="finClose">Weiter</button></div>`;
  $("finClose").onclick = closeSos;
  refreshGame(); renderCity();
}
