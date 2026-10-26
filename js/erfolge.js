/* Erfolge: Rekorde, Kalender der rauchfreien Tage, schlichte Meilenstein-Abzeichen */
"use strict";

/* ---------- Tagesstatus ---------- */
// free: ganzer Tag rauchfrei · start: Anlauf beginnt an dem Tag · slip: Ausrutscher · relapse: Neustart an dem Tag
function dayStatus(k, intervals, slipDays, relapseDays){
  if (k > todayKey()) return "future";
  if (relapseDays.has(k)) return "relapse";
  if (slipDays.has(k)) return "slip";
  const d0 = parseKey(k); d0.setHours(0,0,0,0);
  const from = d0.getTime(), to = Math.min(from + DAY_MS, Date.now());
  if (intervals.some(iv=>iv.start <= from && iv.end >= to)) return "free";
  if (intervals.some(iv=>iv.start > from && iv.start < from + DAY_MS && iv.start <= Date.now())) return "start";
  return "";
}
function statusContext(){
  return { intervals: freeIntervals(),
    slipDays: new Set(cravings.filter(c=>c.slip).map(cravingDay)),
    relapseDays: new Set(attempts.map(a=>dateKey(new Date(a.end)))) };
}

function renderWeekStrip(){
  const ctx = statusContext(), out = [];
  for (let i=6;i>=0;i--){
    const k = dateKeyOffset(i), st = dayStatus(k, ctx.intervals, ctx.slipDays, ctx.relapseDays);
    out.push(`<span class="ws ${st} ${i===0?"today":""}"><small>${parseKey(k).toLocaleDateString("de-DE",{weekday:"narrow"})}</small><i></i></span>`);
  }
  $("weekStrip").innerHTML = out.join("");
}

/* ---------- Kalender ---------- */
let calOffset = 0; // 0 = aktueller Monat
$("calPrev").addEventListener("click", ()=>{ calOffset--; renderCalendar(); });
$("calNext").addEventListener("click", ()=>{ if (calOffset < 0){ calOffset++; renderCalendar(); } });
function renderCalendar(){
  const base = new Date(); base.setDate(1); base.setHours(12,0,0,0); base.setMonth(base.getMonth() + calOffset);
  const year = base.getFullYear(), month = base.getMonth();
  $("calTitle").textContent = base.toLocaleDateString("de-DE",{month:"long", year:"numeric"});
  $("calNext").style.visibility = calOffset < 0 ? "visible" : "hidden";
  const ctx = statusContext();
  const lead = (base.getDay()+6)%7, daysIn = new Date(year, month+1, 0).getDate();
  let html = ["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>`<span class="cal-dow">${d}</span>`).join("");
  for (let i=0;i<lead;i++) html += `<span></span>`;
  let free = 0;
  for (let d=1; d<=daysIn; d++){
    const k = dateKey(new Date(year, month, d, 12)), st = dayStatus(k, ctx.intervals, ctx.slipDays, ctx.relapseDays);
    if (st==="free" || st==="start") free++;
    html += `<span class="cal-day ${st} ${k===todayKey()?"today":""}">${d}</span>`;
  }
  $("calGrid").innerHTML = html;
  $("calGrid").dataset.free = free;
}

/* ---------- Rekorde ---------- */
function renderRecords(){
  const longest = Math.floor(longestStreakMs()/DAY_MS), total = Math.floor(state.freeMs/DAY_MS);
  $("records").innerHTML =
    bsCell("Aktuelle Strecke", state.days + " " + plural(state.days,"Tag","Tage")) +
    bsCell("Längste Strecke", longest + " " + plural(longest,"Tag","Tage")) +
    bsCell("Rauchfrei insgesamt", total + " " + plural(total,"Tag","Tage")) +
    bsCell("Wellen überstanden", survivedCount().toLocaleString("de-DE"));
}

/* ---------- Abzeichen ---------- */
const badgeCats = [
  { cat:"Rauchfrei", color:"#2de2c2", val:()=>Math.floor(longestStreakMs()/DAY_MS), unit:"Tage am Stück", items:[
    { ico:"sprout", name:"Erster Tag", t:1 }, { ico:"flame", name:"Der Gipfel", t:3 }, { ico:"star", name:"Eine Woche", t:7 },
    { ico:"shield", name:"Zwei Wochen", t:14 }, { ico:"medal", name:"Ein Monat", t:30 }, { ico:"award", name:"Ein Quartal", t:90 },
    { ico:"crown", name:"Ein Halbjahr", t:180 }, { ico:"trophy", name:"Ein Jahr", t:365 } ] },
  { cat:"Gesamtzeit", color:"#58a6ff", val:()=>Math.floor(state.freeMs/DAY_MS), unit:"Tage insgesamt", items:[
    { ico:"calendar-check", name:"30 Tage", t:30 }, { ico:"calendar-check", name:"100 Tage", t:100 },
    { ico:"calendar-check", name:"200 Tage", t:200 }, { ico:"calendar-check", name:"500 Tage", t:500 } ] },
  { cat:"Ersparnis", color:"#ffb547", val:()=>state.totalSaved, unit:"€", items:[
    { ico:"coins", name:"25 €", t:25 }, { ico:"banknote", name:"100 €", t:100 }, { ico:"wallet", name:"250 €", t:250 },
    { ico:"piggy-bank", name:"500 €", t:500 }, { ico:"hand-coins", name:"1.000 €", t:1000 }, { ico:"gem", name:"2.500 €", t:2500 } ] },
  { cat:"Willenskraft", color:"#ff4f7b", val:()=>survivedCount(), unit:"Wellen überstanden", items:[
    { ico:"shield", name:"Standhaft", t:1 }, { ico:"swords", name:"Kämpfer", t:5 }, { ico:"shield-check", name:"Held", t:15 },
    { ico:"sword", name:"Meister", t:30 }, { ico:"castle", name:"Unbesiegbar", t:50 }, { ico:"crown", name:"Hundert Wellen", t:100 } ] },
  { cat:"Gönnen", color:"#8c6bff", val:()=>goals.filter(g=>g.done).length, unit:"Wünsche erfüllt", items:[
    { ico:"gift", name:"Erster Wunsch", t:1 }, { ico:"party-popper", name:"Drei Wünsche", t:3 }, { ico:"gem", name:"Zehn Wünsche", t:10 } ] },
];
// Freischaltung nur aus echten Daten: Längste Strecke, Gesamtzeit und Ersparnis zählen über alle Anläufe,
// deshalb bleiben Abzeichen nach einem Neustart erhalten. rf:badgeseen dient nur dazu, Neues zu melden.
function allBadges(){
  return badgeCats.flatMap(c=>{ const v = c.val()||0;
    return c.items.map((b,i)=>({ ...b, id:c.cat+"#"+i, cat:c.cat, color:c.color, unit:c.unit, v, earned: v>=b.t })); });
}
function fmtBadgeVal(v, unit){ return unit==="€" ? fmtEuro0(v) : Math.floor(v).toLocaleString("de-DE"); }
function badgeHtml(b){
  const pct = Math.min(100, b.v/b.t*100);
  const sub = b.earned ? "erreicht" : (b.unit==="€" ? fmtEuro0(b.t) : b.t.toLocaleString("de-DE") + " " + b.unit);
  return `<div class="badge ${b.earned?"earned":""}" style="--bc:${b.color}"><div class="b-ico">${icon(b.earned?b.ico:"lock")}</div>
    <div class="b-name">${b.name}</div><div class="b-sub">${sub}</div>${b.earned?"":`<div class="b-prog"><span style="width:${pct}%"></span></div>`}</div>`;
}
function renderBadges(list){
  const earned = list.filter(b=>b.earned).length;
  $("bpFill").style.width = (earned/list.length*100)+"%";
  $("bpText").textContent = earned + " von " + list.length;
  const next = list.filter(b=>!b.earned && b.v>0).sort((a,b)=>(b.v/b.t)-(a.v/a.t)).slice(0,3);
  $("nextBadges").innerHTML = next.length ? `<div class="next-badges">${next.map(b=>`<div class="nb" style="--bc:${b.color}"><div class="b-ico">${icon(b.ico)}</div>
    <div class="nb-body"><b>${b.name}</b><small>${b.cat}: ${fmtBadgeVal(b.v,b.unit)} von ${fmtBadgeVal(b.t,b.unit)}${b.unit==="€"?"":" "+b.unit}</small>
    <div class="bar"><span style="width:${Math.min(100,b.v/b.t*100)}%"></span></div></div></div>`).join("")}</div>` : "";
  $("badgeSections").innerHTML = badgeCats.map(c=>`<div class="badge-cat">${c.cat}</div>
    <div class="badges">${list.filter(b=>b.cat===c.cat).map(badgeHtml).join("")}</div>`).join("");
}
// Neue Abzeichen erkennen, merken und kurz melden
// rf:badgeseen: { v:2, ids:[…] }. Die alte Liste (Array) enthielt Trophäen der Vorversion und wird einmalig ersetzt.
function checkNewBadges(list){
  const raw = store.get("rf:badgeseen");
  const earnedIds = list.filter(b=>b.earned).map(b=>b.id);
  if (!raw || Array.isArray(raw)){ store.set("rf:badgeseen", { v:2, ids:earnedIds }); return; } // erster Start: still übernehmen
  const seen = raw.ids || [];
  const fresh = list.filter(b=>b.earned && !seen.includes(b.id));
  if (!fresh.length) return;
  store.set("rf:badgeseen", { v:2, ids:[...seen, ...fresh.map(b=>b.id)] });
  toast(fresh.length>1 ? fresh.length + " neue Abzeichen" : "Neues Abzeichen: " + fresh[0].name, "trophy");
}

function refreshProgress(){
  const list = allBadges(); checkNewBadges(list); renderBadges(list);
  renderRecords(); renderCalendar(); renderWeekStrip();
}
