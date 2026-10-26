/* Verlangen: Erfassen, Welle ausreiten (Timer und Atmung), Ausrutscher, Auswertung */
"use strict";

// rf:cravings: [{ ts, level (1–5 oder null), triggers:[id], slip:bool }]
// rf:sos: { count } aus der alten Version, zählt weiter als „überstanden“ mit
let cravings = [], legacySos = 0;
const WAVE_SECONDS = 180;
const TRIGGERS = [
  ["kaffee","Kaffee"], ["stress","Stress"], ["essen","Nach dem Essen"], ["langeweile","Langeweile"],
  ["leute","Unter Leuten"], ["pause","Pause"], ["unterwegs","Unterwegs"], ["feierabend","Feierabend"],
  ["aufstehen","Nach dem Aufstehen"], ["sonst","Sonstiges"],
];
const LEVELS = ["Leicht","Spürbar","Stark","Sehr stark","Heftig"];
const TIME_SLOTS = [["Morgens","5 bis 11 Uhr",5,11],["Mittags","11 bis 14 Uhr",11,14],["Nachmittags","14 bis 18 Uhr",14,18],
  ["Abends","18 bis 23 Uhr",18,23],["Nachts","23 bis 5 Uhr",23,5]];
const DISTRACTIONS = ["Trink ein großes Glas kaltes Wasser, in kleinen Schlucken.", "Geh ein paar Minuten an die frische Luft.",
  "Kau einen Kaugummi oder iss etwas Knackiges.", "Schreib jemandem eine Nachricht.", "Mach zehn Kniebeugen oder geh eine Runde durch die Wohnung.",
  "Putz dir die Zähne. Danach schmeckt Dampf ohnehin nicht.", "Wechsle den Raum oder die Tätigkeit.", "Wasch dir das Gesicht mit kaltem Wasser."];

function loadCravings(){
  cravings = (store.get("rf:cravings") || []).filter(c=>c && c.ts).sort((a,b)=>a.ts-b.ts);
  const s = store.get("rf:sos"); legacySos = s ? (s.count||0) : 0;
}
function saveCravings(){ store.set("rf:cravings", cravings); }
function survivedCount(){ return legacySos + cravings.filter(c=>!c.slip).length; }
function triggerName(id){ const t = TRIGGERS.find(x=>x[0]===id); return t ? t[1] : id; }
function cravingDay(c){ return dateKey(new Date(c.ts)); }

/* ---------- Ablauf im Overlay ---------- */
const sosStage = $("sosStage");
let draft = null, waveTimer = null;
function stopWave(){ if (waveTimer){ clearInterval(waveTimer); waveTimer = null; } }
function closeSos(){ closeSheet("sosOverlay"); stopWave(); draft = null; }
function openCraving(slip){
  stopWave();
  draft = { ts:Date.now(), level:null, triggers:[], slip:!!slip };
  openSheet("sosOverlay"); showForm();
}
$("sosBtn").addEventListener("click", ()=>openCraving(false));
$("craveBtn").addEventListener("click", ()=>openCraving(false));
$("slipBtn").addEventListener("click", ()=>openCraving(true));
$("sosClose").addEventListener("click", closeSos);
$("sosOverlay").addEventListener("click", e=>{ if (e.target.id==="sosOverlay") closeSos(); });

function showForm(){
  const chips = TRIGGERS.map(([id,name])=>`<button class="chip ${draft.triggers.includes(id)?"on":""}" data-tr="${id}">${name}</button>`).join("");
  if (draft.slip){
    sosStage.innerHTML = `<div class="sos-h">Ausrutscher eintragen</div>
      <div class="sos-p">Passiert. Ein Zug macht dich nicht wieder zum Vaper. Dein Zähler läuft weiter. Was war der Auslöser?</div>
      <div class="chips tr-chips">${chips}</div>
      <div class="sos-actions"><button class="btn btn-primary" id="slipSave">Eintragen</button></div>`;
    $("slipSave").onclick = ()=>finish(true);
  } else {
    sosStage.innerHTML = `<div class="sos-h">Das Verlangen geht vorbei.</div>
      <div class="sos-p">Eine Welle dauert meist nur 3 bis 5 Minuten. Du musst sie nicht bekämpfen, nur überstehen.</div>
      <div class="sos-q">Wie stark ist es?</div>
      <div class="lvl-pick">${LEVELS.map((l,i)=>`<button data-lv="${i+1}" class="${draft.level===i+1?"on":""}"><b>${i+1}</b><small>${l}</small></button>`).join("")}</div>
      <div class="sos-q">Was hat es ausgelöst?</div>
      <div class="chips tr-chips">${chips}</div>
      <div class="sos-actions">
        <button class="btn btn-primary" id="goWave">${icon("wind")}Welle ausreiten</button>
        <button class="btn btn-ghost" id="goOutcome">Nur eintragen</button>
      </div>`;
    sosStage.querySelectorAll("[data-lv]").forEach(b=>b.onclick = ()=>{
      draft.level = +b.dataset.lv;
      sosStage.querySelectorAll("[data-lv]").forEach(x=>x.classList.toggle("on", x===b));
    });
    $("goWave").onclick = startWave; $("goOutcome").onclick = showOutcome;
  }
  sosStage.querySelectorAll("[data-tr]").forEach(b=>b.onclick = ()=>{
    const id = b.dataset.tr, i = draft.triggers.indexOf(id);
    if (i<0) draft.triggers.push(id); else draft.triggers.splice(i,1);
    b.classList.toggle("on", i<0);
  });
}

// Welle: 3-Minuten-Ring, Atemkreis (4 ein, 4 halten, 6 aus) und wechselnde Gedanken
function waveThoughts(){
  const list = [], why = (whyEl.value||"").trim();
  if (why) list.push(["Dein Grund", "„" + escapeHtml(why) + "”"]);
  if (state.totalSaved > 0) list.push(["Schon gespart", fmtEuro(liveSaved()) + ". Eine neue Vape würde dich " + fmtEuro(vapePrice()) + " kosten."]);
  if (state.days > 0) list.push(["Deine Strecke", state.days + " " + plural(state.days,"Tag","Tage") + " rauchfrei. Die willst du nicht für ein paar Züge hergeben."]);
  const n = survivedCount();
  if (n > 0) list.push(["Du kannst das", "Du hast schon " + n + " " + plural(n,"Welle","Wellen") + " überstanden. Diese schaffst du auch."]);
  DISTRACTIONS.forEach(d=>list.push(["Ablenkung", d]));
  return list;
}
function startWave(){
  stopWave();
  const C = 2*Math.PI*54, thoughts = waveThoughts();
  let left = WAVE_SECONDS, phase = 0, pleft = 4, ti = 0;
  const phases = [["Einatmen",4,"scale(1.18)"],["Halten",4,null],["Ausatmen",6,"scale(.82)"]];
  sosStage.innerHTML = `
    <div class="wave">
      <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="wave-track"/><circle cx="60" cy="60" r="54" class="wave-arc" id="waveArc" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"/></svg>
      <div class="breath" id="bCircle"><span id="bText">Einatmen</span></div>
    </div>
    <div class="breath-count" id="waveLeft">3:00</div>
    <div class="thought" id="thought"></div>
    <div class="sos-actions"><button class="btn btn-primary" id="waveDone">Welle ist vorbei</button></div>`;
  const circle = $("bCircle"), txt = $("bText");
  const applyPhase = ()=>{ const p = phases[phase]; txt.textContent = p[0]; if (p[2]) circle.style.transform = p[2]; };
  const showThought = ()=>{ const t = thoughts[ti % thoughts.length]; $("thought").innerHTML = `<small>${t[0]}</small><p>${t[1]}</p>`; ti++; };
  setTimeout(applyPhase, 50); showThought();
  waveTimer = setInterval(()=>{
    left--; pleft--;
    $("waveLeft").textContent = Math.floor(Math.max(0,left)/60) + ":" + String(Math.max(0,left)%60).padStart(2,"0");
    $("waveArc").style.strokeDashoffset = (C*(1-left/WAVE_SECONDS)).toFixed(1);
    if (pleft <= 0){ phase = (phase+1)%phases.length; pleft = phases[phase][1]; applyPhase(); }
    if ((WAVE_SECONDS-left) % 15 === 0) showThought();
    if (left <= 0){ stopWave(); showOutcome(); }
  }, 1000);
  $("waveDone").onclick = ()=>{ stopWave(); showOutcome(); };
}
function showOutcome(){
  stopWave();
  sosStage.innerHTML = `<div class="sos-h">Wie ist es ausgegangen?</div>
    <div class="sos-p">Sei ehrlich zu dir, das macht die Auswertung wertvoll.</div>
    <div class="sos-actions">
      <button class="btn btn-primary" id="outOk">${icon("shield-check")}Überstanden</button>
      <button class="btn btn-ghost" id="outSlip">Ich habe gezogen</button>
    </div>`;
  $("outOk").onclick = ()=>finish(false); $("outSlip").onclick = ()=>finish(true);
}
function finish(slip){
  cravings.push({ ts:draft.ts, level:draft.level, triggers:draft.triggers.slice(), slip });
  cravings.sort((a,b)=>a.ts-b.ts); saveCravings();
  if (slip){
    sosStage.innerHTML = `<div class="sos-done-ic slip">${icon("sprout")}</div><div class="sos-h">Eingetragen</div>
      <div class="sos-p">Ein Ausrutscher ist kein Rückfall. Dein Zähler läuft weiter. Schau dir an, was der Auslöser war, und plan für das nächste Mal eine Alternative.</div>
      <div class="sos-actions"><button class="btn btn-primary" id="finClose">Weiter</button>
      <button class="btn btn-ghost" id="finRestart">Ich habe wieder richtig angefangen</button></div>`;
    $("finRestart").onclick = ()=>{ closeSos(); openRestart(); };
  } else {
    const n = survivedCount();
    sosStage.innerHTML = `<div class="sos-done-ic">${icon("shield-check")}</div><div class="sos-h">Geschafft</div>
      <div class="sos-p">Du hast die Welle überstanden, ohne zu vapen. Genau so wird Aufhören zur Gewohnheit.</div>
      <div class="sos-stat">Insgesamt ${n}× überstanden</div>
      <div class="sos-actions"><button class="btn btn-primary" id="finClose">Weiter</button></div>`;
  }
  $("finClose").onclick = closeSos;
  draft = null;
  onDataChanged();
}

/* ---------- Auswertung ---------- */
function cravingsInDays(n, endOff=0){
  const from = dateKeyOffset(n-1+endOff), to = dateKeyOffset(endOff);
  return cravings.filter(c=>{ const k = cravingDay(c); return k>=from && k<=to; });
}
function avgLevel(list){ const l = list.filter(c=>c.level); return l.length ? l.reduce((a,c)=>a+c.level,0)/l.length : null; }
function slotOf(ts){ const h = new Date(ts).getHours(); return TIME_SLOTS.findIndex(s=> s[2]<s[3] ? h>=s[2] && h<s[3] : h>=s[2] || h<s[3]); }
function hbar(label, sub, n, max, cls=""){
  return `<div class="hbar"><div class="hb-lab"><b>${label}</b>${sub?`<small>${sub}</small>`:""}</div>
    <div class="hb-bar ${cls}"><span style="width:${max?Math.max(4,n/max*100):0}%"></span></div><div class="hb-n">${n}</div></div>`;
}
function renderCravingStats(){
  const today = cravings.filter(c=>cravingDay(c)===todayKey());
  const w7 = cravingsInDays(7), wPrev = cravingsInDays(7,7);
  const total = cravings.length, ok = cravings.filter(c=>!c.slip).length;
  const quote = total ? Math.round(ok/total*100) : null;
  $("craveSummary").innerHTML = `
    <div class="stat"><b>${today.length}</b><small>heute</small></div>
    <div class="stat"><b>${w7.length}</b><small>letzte 7 Tage</small></div>
    <div class="stat"><b>${quote!=null ? quote+" %" : "–"}</b><small>überstanden</small></div>`;

  // Balken der letzten 14 Tage
  const days = []; for (let i=13;i>=0;i--) days.push(dateKeyOffset(i));
  const per = days.map(k=>{ const l = cravings.filter(c=>cravingDay(c)===k); return { k, ok:l.filter(c=>!c.slip).length, slip:l.filter(c=>c.slip).length }; });
  const max = Math.max(3, ...per.map(d=>d.ok+d.slip));
  const W=360, H=170, padB=24, padT=16, bw=W/14, iH=H-padB-padT;
  let s = "";
  per.forEach((d,i)=>{
    const x = i*bw + bw*0.2, w = bw*0.6, hOk = d.ok/max*iH, hSl = d.slip/max*iH;
    if (d.ok) s += `<rect x="${x.toFixed(1)}" y="${(padT+iH-hOk).toFixed(1)}" width="${w.toFixed(1)}" height="${hOk.toFixed(1)}" rx="3" fill="#2de2c2"/>`;
    if (d.slip) s += `<rect x="${x.toFixed(1)}" y="${(padT+iH-hOk-hSl).toFixed(1)}" width="${w.toFixed(1)}" height="${hSl.toFixed(1)}" rx="3" fill="#ffb547"/>`;
    if (!d.ok && !d.slip) s += `<rect x="${x.toFixed(1)}" y="${padT+iH-3}" width="${w.toFixed(1)}" height="3" rx="1.5" fill="#2b2839"/>`;
    const n = d.ok+d.slip;
    if (n) s += `<text x="${(x+w/2).toFixed(1)}" y="${(padT+iH-hOk-hSl-6).toFixed(1)}" fill="#9893ac" font-size="11" text-anchor="middle">${n}</text>`;
    if (i%2===1 || i===13) s += `<text x="${(x+w/2).toFixed(1)}" y="${H-8}" fill="${i===13?"#f4f2f9":"#6c6880"}" font-size="9.5" text-anchor="middle">${i===13?"heute":fmtShortDate(d.k)}</text>`;
  });
  $("craveChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlangen pro Tag">${s}</svg>`;

  // Erkenntnisse
  const items = [];
  if (total < 3){
    items.push(anItem("hourglass", "Nach ein paar Einträgen zeige ich dir hier, wann und wodurch dein Verlangen kommt und ob es nachlässt."));
  } else {
    if (wPrev.length){
      const d = w7.length - wPrev.length;
      items.push(d < 0 ? anItem("trending-down", `Diese Woche <b>${-d} ${plural(-d,"Welle","Wellen")} weniger</b> als in der Woche davor (${w7.length} statt ${wPrev.length}).`, "good")
        : d > 0 ? anItem("trending-up", `Diese Woche ${d} mehr als in der Woche davor (${w7.length} statt ${wPrev.length}). Stressige Tage treiben das Verlangen hoch, das ist normal.`, "warn")
        : anItem("minus", `Gleich viele Wellen wie in der Woche davor (${w7.length}).`));
    }
    const l7 = avgLevel(w7), lPrev = avgLevel(wPrev);
    if (l7 != null && lPrev != null){
      items.push(l7 < lPrev - 0.2 ? anItem("trending-down", `Die Stärke lässt nach: im Schnitt <b>${fmtN(l7,1)}</b> statt ${fmtN(lPrev,1)} von 5.`, "good")
        : anItem("activity", `Durchschnittliche Stärke diese Woche: <b>${fmtN(l7,1)}</b> von 5.`));
    }
    const trCount = {}; cravings.forEach(c=>(c.triggers||[]).forEach(t=>{ trCount[t] = (trCount[t]||0)+1; }));
    const topTr = Object.entries(trCount).sort((a,b)=>b[1]-a[1])[0];
    const slotCount = TIME_SLOTS.map((_,i)=>cravings.filter(c=>slotOf(c.ts)===i).length);
    const topSlot = slotCount.indexOf(Math.max(...slotCount));
    if (topTr) items.push(anItem("target", `Dein häufigster Auslöser: <b>${triggerName(topTr[0])}</b>. Am meisten kommt es <b>${TIME_SLOTS[topSlot][0].toLowerCase()}</b>. Leg dir für genau diesen Moment etwas anderes zurecht.`));
    const slipTr = {}; cravings.filter(c=>c.slip).forEach(c=>(c.triggers||[]).forEach(t=>{ slipTr[t] = (slipTr[t]||0)+1; }));
    const topSlip = Object.entries(slipTr).sort((a,b)=>b[1]-a[1])[0];
    if (topSlip) items.push(anItem("triangle-alert", `Ausrutscher passieren bei dir am ehesten bei <b>${triggerName(topSlip[0])}</b>. Dort lohnt sich ein Plan B am meisten.`, "warn"));
  }
  $("craveInsights").innerHTML = `<h2>Was die Einträge zeigen</h2>` + items.join("");

  // Tageszeiten
  const slotCount = TIME_SLOTS.map((_,i)=>cravings.filter(c=>slotOf(c.ts)===i).length), sMax = Math.max(...slotCount);
  $("craveTimes").innerHTML = total ? TIME_SLOTS.map((t,i)=>hbar(t[0], t[1], slotCount[i], sMax, "violet")).join("")
    : '<p class="empty">Noch keine Einträge.</p>';

  // Auslöser
  const tr = TRIGGERS.map(([id,name])=>{ const l = cravings.filter(c=>(c.triggers||[]).includes(id)); return { name, n:l.length, lv:avgLevel(l) }; })
    .filter(x=>x.n).sort((a,b)=>b.n-a.n);
  const tMax = tr.length ? tr[0].n : 0;
  $("craveTriggers").innerHTML = tr.length ? tr.map(x=>hbar(x.name, x.lv!=null ? "Stärke im Schnitt "+fmtN(x.lv,1) : "", x.n, tMax, "rose")).join("")
    : '<p class="empty">Wähl beim Erfassen aus, was das Verlangen ausgelöst hat.</p>';

  // Liste
  $("craveCount").textContent = total ? total + " " + plural(total,"Eintrag","Einträge") + (legacySos ? `, dazu ${legacySos} aus der alten Version` : "") : "";
  $("craveList").innerHTML = total ? cravings.slice().reverse().slice(0,50).map(c=>{
    const idx = cravings.indexOf(c), d = new Date(c.ts);
    const when = d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"}) + ", " + d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) + " Uhr";
    const tr = (c.triggers||[]).map(triggerName).join(", ");
    return `<div class="row"><span class="r-ic ${c.slip?"amber":"teal"}">${icon(c.slip?"triangle-alert":"shield-check")}</span>
      <span class="r-main"><b>${c.slip?"Ausrutscher":"Überstanden"}${tr?" · "+escapeHtml(tr):""}</b><small>${when}</small></span>
      <span class="r-val">${c.level ? c.level+"<small>von 5</small>" : ""}</span>
      <button class="del" data-ci="${idx}" aria-label="Eintrag löschen">${icon("trash")}</button></div>`;
  }).join("") : '<p class="empty">Noch keine Einträge. Tipp auf „Verlangen erfassen“, wenn die nächste Welle kommt.</p>';
  $("craveList").querySelectorAll("[data-ci]").forEach(b=>b.addEventListener("click", ()=>{
    if (!confirm("Diesen Eintrag löschen?")) return;
    cravings.splice(+b.dataset.ci,1); saveCravings(); onDataChanged();
  }));
  $("undoRestart").hidden = !attempts.length;
}

/* ---------- Startseite ---------- */
function renderTodayCraving(){
  const today = cravings.filter(c=>cravingDay(c)===todayKey());
  const ok = today.filter(c=>!c.slip).length, slip = today.length - ok;
  let txt;
  if (!today.length) txt = "Heute noch keine Welle eingetragen. Wenn eine kommt, tipp unten rechts auf „Verlangen“.";
  else if (!slip) txt = `Heute ${ok} ${plural(ok,"Welle","Wellen")}, ${ok===1?"überstanden":"alle überstanden"}.`;
  else txt = `Heute ${today.length} ${plural(today.length,"Welle","Wellen")}, davon ${slip} ${plural(slip,"Ausrutscher","Ausrutscher")}. Morgen ist ein neuer Tag.`;
  $("todayCraving").innerHTML = `<p class="muted small">${txt}</p>`;
}
