/* Vitalwerte, Bewertung, Tagesanalyse, Tiefenanalyse, Körperdaten */
"use strict";

let vitals = [], activeSlot = "morgens";
const VITAL_XP = 15, VITAL_XP_PER_DAY = 2; // XP nur für die ersten 2 Messungen pro Tag
const sysEl=$("sys"), diaEl=$("dia"), pulseEl=$("pulse"), dateEl=$("measureDate");

function loadVitals(){ vitals = store.get("rf:vitals") || []; }
function saveVitals(){ store.set("rf:vitals", vitals); }
segBind("timeSeg", b=>{ activeSlot = b.dataset.slot; });

$("saveVital").addEventListener("click", ()=>{
  const sys=parseInt(sysEl.value), dia=parseInt(diaEl.value), pulse=parseInt(pulseEl.value), date=dateEl.value;
  if (!date) return flashMsg("viMsg","Wähl ein Datum.", true);
  if (!sys && !dia && !pulse) return flashMsg("viMsg","Trag mindestens einen Wert ein.", true);
  const sameDay = vitals.filter(v=>v.date===date).length;
  vitals.push({ date, slot:activeSlot, sys:sys||null, dia:dia||null, pulse:pulse||null, ts:Date.now() });
  vitals.sort((a,b)=>(a.date+(a.slot==="morgens"?"0":"1")).localeCompare(b.date+(b.slot==="morgens"?"0":"1"))||a.ts-b.ts);
  saveVitals();
  showRateLine(sys||null, dia||null, pulse||null);
  sysEl.value=diaEl.value=pulseEl.value="";
  if (sameDay < VITAL_XP_PER_DAY){ addXp(VITAL_XP, "Messung"); flashMsg("viMsg","Gespeichert, +" + VITAL_XP + " XP"); }
  else flashMsg("viMsg","Gespeichert");
  renderVitals(); onDataChanged();
});
function showRateLine(sys, dia, pulse){
  const parts = [bpRating(sys, dia), pulseRating(pulse)].filter(Boolean).map(rateBadge);
  $("rateLine").innerHTML = parts.join("");
  clearTimeout(showRateLine._t);
  showRateLine._t = setTimeout(()=>{ $("rateLine").innerHTML=""; }, 9000);
}
function renderVitals(){ renderSummary(); renderChart(); renderLog(); }

function renderSummary(){
  const box=$("viSummary");
  if (!vitals.length){ box.innerHTML=""; return; }
  const metrics=[{key:"sys",label:"Systolisch",unit:""},{key:"dia",label:"Diastolisch",unit:""},{key:"pulse",label:"Puls",unit:" bpm"}];
  box.innerHTML = metrics.map(mt=>{
    const wv = vitals.filter(x=>x[mt.key]!=null);
    if (!wv.length) return "";
    const n=Math.min(3,wv.length);
    const early=avgKey(wv.slice(0,n),mt.key), recent=avgKey(wv.slice(-n),mt.key), latest=wv[wv.length-1][mt.key];
    let delta="", cls="flat";
    if (wv.length>=2){
      const dd=recent-early;
      if (dd<-0.5){ cls="good"; delta="−"+Math.abs(dd).toFixed(0)+" seit Beginn"; }
      else if (dd>0.5){ cls="up"; delta="+"+dd.toFixed(0)+" seit Beginn"; }
      else delta="stabil";
    }
    return `<div class="vi-sum"><div class="lab">${mt.label}, zuletzt</div><div class="val">${latest}${mt.unit}</div><div class="delta ${cls}">${delta}</div></div>`;
  }).join("");
}
function renderLog(){
  const box=$("logList");
  if (!vitals.length){ box.innerHTML=""; return; }
  box.innerHTML = [...vitals].reverse().slice(0,30).map((v,ri)=>{
    const idx=vitals.length-1-ri;
    const dl=parseKey(v.date).toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
    return `<div class="row"><span class="r-ic">${icon(v.slot==="morgens"?"sun":"moon")}</span>
      <span class="r-main"><b>${v.sys||"–"}/${v.dia||"–"}</b><small>${dl}</small></span>
      <span class="r-val">${v.pulse||"–"}<small>bpm</small></span>
      <button class="del" data-idx="${idx}" aria-label="Messung löschen">${icon("trash")}</button></div>`;
  }).join("");
  box.querySelectorAll(".del").forEach(b=>b.addEventListener("click",()=>{
    if (!confirm("Diese Messung löschen?")) return;
    vitals.splice(+b.dataset.idx,1); saveVitals(); renderVitals(); onDataChanged();
  }));
}
function renderChart(){
  const box=$("chartBox");
  const pts=vitals.filter(v=>v.sys||v.dia||v.pulse).slice(-40);
  if (!pts.length){ box.innerHTML='<div class="chart-empty">Noch keine Messungen. Deine erste trägst du oben ein.</div>'; return; }
  const W=720,H=300,padL=36,padR=10,padT=14,padB=30, iW=W-padL-padR, iH=H-padT-padB, n=pts.length;
  const xFor=i=>padL+(n===1?iW/2:(i/(n-1))*iW);
  const all=[]; pts.forEach(p=>{ ["sys","dia","pulse"].forEach(k=>{ if(p[k]) all.push(p[k]); }); });
  const yMin=Math.max(30,Math.floor((Math.min(...all)-8)/10)*10), yMax=Math.ceil((Math.max(...all)+8)/10)*10;
  const yFor=v=>padT+iH-((v-yMin)/(yMax-yMin))*iH;
  const series=[{key:"sys",color:"#ff4f7b"},{key:"dia",color:"#ffb547"},{key:"pulse",color:"#58a6ff"}];
  let s="";
  for(let i=0;i<=4;i++){ const val=yMin+(yMax-yMin)*(i/4), y=yFor(val);
    s+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="rgba(255,255,255,.06)"/><text x="${padL-8}" y="${y+4}" fill="#6c6880" font-size="11" text-anchor="end">${Math.round(val)}</text>`; }
  // Zielbereich 120/80 als Orientierung
  s+=`<line x1="${padL}" y1="${yFor(120)}" x2="${W-padR}" y2="${yFor(120)}" stroke="rgba(255,79,123,.3)" stroke-dasharray="3 5"/>`;
  const everyN=Math.ceil(n/7);
  pts.forEach((p,i)=>{ if(i%everyN!==0 && i!==n-1) return;
    s+=`<text x="${xFor(i)}" y="${H-8}" fill="#6c6880" font-size="11" text-anchor="middle">${fmtShortDate(p.date)}</text>`; });
  series.forEach(se=>{
    const seg=[]; pts.forEach((p,i)=>{ if(p[se.key]!=null) seg.push([xFor(i),yFor(p[se.key]),p[se.key]]); });
    if (!seg.length) return;
    s+=`<path d="${seg.map((pt,k)=>(k?"L":"M")+pt[0].toFixed(1)+","+pt[1].toFixed(1)).join(" ")}" fill="none" stroke="${se.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    seg.forEach(pt=>{ s+=`<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="3" fill="#181622" stroke="${se.color}" stroke-width="2"/>`; });
    if (seg.length>=3){
      const r=linReg(seg.map(p=>p[2]));
      const idx=seg.map(p=>p[0]);
      s+=`<line x1="${idx[0].toFixed(1)}" y1="${yFor(r.inter).toFixed(1)}" x2="${idx[idx.length-1].toFixed(1)}" y2="${yFor(r.slope*(seg.length-1)+r.inter).toFixed(1)}" stroke="${se.color}" stroke-width="1.5" stroke-dasharray="5 5" opacity=".45"/>`;
    }
  });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf von Blutdruck und Puls">${s}</svg>`;
}

/* ---------- Bewertung ---------- */
function bpRating(sys, dia){
  if (sys==null && dia==null) return null;
  const catSys = s => s==null?-1 : s<90?0 : s<120?1 : s<130?2 : s<140?3 : s<160?4 : s<180?5 : 6;
  const catDia = d => d==null?-1 : d<60?0 : d<80?1 : d<85?2 : d<90?3 : d<100?4 : d<110?5 : 6;
  const map = { 0:["Niedrig","warn"], 1:["Optimal","good"], 2:["Normal","good"], 3:["Hoch normal","mid"],
    4:["Bluthochdruck Grad 1","bad"], 5:["Bluthochdruck Grad 2","bad"], 6:["Bluthochdruck Grad 3","bad"] };
  const m = map[Math.max(catSys(sys), catDia(dia))];
  return { kind:"Blutdruck", label:m[0], tone:m[1] };
}
function pulseRating(p){
  if (p==null) return null;
  const m = p<50?["Sehr niedrig","warn"] : p<60?["Niedrig oder sportlich","mid"] : p<=80?["Optimal","good"] : p<=100?["Normal","good"] : p<=110?["Leicht erhöht","mid"] : ["Hoch","bad"];
  return { kind:"Puls", label:m[0], tone:m[1] };
}
function rateBadge(r){ return `<span class="rate-badge rate-${r.tone}"><span class="dot"></span>${r.kind}: ${r.label}</span>`; }

/* ---------- Alle Messungen ---------- */
bindSheet("histOverlay","histClose");
$("histBtn").addEventListener("click", ()=>{ renderHistory(); openSheet("histOverlay"); });
function renderHistory(){
  const box=$("histScroll");
  if (!vitals.length){ box.innerHTML='<p class="empty">Noch keine Messungen gespeichert.</p>'; return; }
  box.innerHTML = [...vitals].reverse().map(v=>{
    const dstr = parseKey(v.date).toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
    const tstr = new Date(v.ts || parseKey(v.date)).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
    const badges = [bpRating(v.sys,v.dia), pulseRating(v.pulse)].filter(Boolean).map(rateBadge).join("");
    return `<div class="row" style="grid-template-columns:auto 1fr auto"><span class="r-ic">${icon(v.slot==="morgens"?"sun":"moon")}</span>
      <span class="r-main"><b>${v.sys||"–"}/${v.dia||"–"} mmHg</b><small>${dstr}, ${tstr} Uhr</small><span class="rate-line">${badges}</span></span>
      <span class="r-val">${v.pulse||"–"}<small>bpm</small></span></div>`;
  }).join("");
}

/* ---------- Körperdaten ---------- */
function bmiValue(){
  const w = parseFloat(weightEl.value), h = parseFloat(heightEl.value)/100;
  return (w && h) ? w/(h*h) : null;
}
function bmiCat(b){
  if (b==null) return null;
  if (b<18.5) return {label:"Untergewicht", tone:"mid"};
  if (b<25) return {label:"Normalgewicht", tone:"good"};
  if (b<30) return {label:"Übergewicht", tone:"mid"};
  return {label:"Adipositas", tone:"warn"};
}
function maxHrEstimate(){ const a = parseFloat(ageEl.value); return a ? Math.round(208 - 0.7*a) : null; }
function renderBodyStats(){
  const b = bmiValue(), cat = bmiCat(b), hr = maxHrEstimate(), items = [];
  if (b!=null) items.push(bsCell("BMI", fmtN(b,1), `<span class="rate-badge rate-${cat.tone}"><span class="dot"></span>${cat.label}</span>`));
  if (hr) items.push(bsCell("Maximalpuls (geschätzt)", hr+" bpm"));
  if (hr) items.push(bsCell("Ausdauerzone", Math.round(hr*0.6)+"–"+Math.round(hr*0.75)+" bpm"));
  $("bodyStats").innerHTML = items.join("");
}
function initSexSeg(){
  segSet("sexSeg","sex",userSex);
  segBind("sexSeg", b=>{ userSex = b.dataset.sex; saveConfig(); renderBodyStats(); onDataChanged(); });
}
[weightEl, heightEl, ageEl, stepGoalEl].forEach(el => el.addEventListener("input", ()=>{ saveConfig(); renderBodyStats(); renderSteps(); onDataChanged(); }));

/* ---------- Energiebedarf ---------- */
function computeBMR(){
  const w = parseFloat(weightEl.value), h = parseFloat(heightEl.value), a = parseFloat(ageEl.value);
  if (!w || !h || !a || !userSex) return null;
  const base = 10*w + 6.25*h - 5*a;
  return userSex==="m" ? base+5 : userSex==="w" ? base-161 : base-78;
}
function computeTDEE(){
  const bmr = computeBMR(); if (bmr==null) return null;
  const st7 = stepsLastDays(7), se7 = sessionsLastDays(7);
  const stepKcal = (st7.daysWith ? st7.sum/st7.daysWith : 0) * 0.04;
  return Math.round(bmr*1.2 + stepKcal + se7.kcal/7);
}

/* ---------- Tagesanalyse (Startseite) ---------- */
function renderAnalysis(){
  const today = todayKey();
  const todaySteps = steps[today] || 0, goal = stepGoal();
  const todaySessions = sessions.filter(s=>s.date===today);
  const sessMins = todaySessions.reduce((a,s)=>a+s.mins,0);
  const sessKcal = todaySessions.reduce((a,s)=>a+(s.kcal||0),0);
  const todayVitals = vitals.filter(v=>v.date===today);
  const lastVital = todayVitals[todayVitals.length-1] || null;

  let score = 0;
  score += Math.min(30, (todaySteps/goal)*30);
  score += Math.min(25, (sessMins/30)*25);
  if (lastVital){ const r = bpRating(lastVital.sys, lastVital.dia); if (r) score += r.tone==="good"?25 : r.tone==="mid"?15 : 8; }
  score += state.future ? 0 : Math.min(20, 8 + state.days*0.4);
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const [lab, tone] = pct>=80 ? ["Starker Tag","#2de2c2"] : pct>=60 ? ["Guter Tag","#8c6bff"] : pct>=40 ? ["Solider Tag","#ffb547"] : ["Da geht noch was","#ff4f7b"];

  const items = [];
  if (todaySteps>0) items.push(todaySteps>=goal
      ? anItem("circle-check", `Schrittziel erreicht: <b>${todaySteps.toLocaleString("de-DE")}</b> Schritte.`, "good")
      : anItem("footprints", `<b>${todaySteps.toLocaleString("de-DE")}</b> Schritte, noch ${(goal-todaySteps).toLocaleString("de-DE")} bis zum Ziel.`));
  else items.push(anItem("footprints", "Noch keine Schritte für heute eingetragen."));
  if (sessMins>0){
    const names = todaySessions.map(s=>(sportTypes.find(x=>x.id===s.type)||{}).name).join(", ");
    items.push(anItem("flame", `<b>${sessMins} Min</b> Training (${names})${sessKcal?`, etwa <b>${sessKcal} kcal</b>`:""}.`, "good"));
  } else items.push(anItem("dumbbell", "Noch kein Training heute. Schon 20 Minuten Bewegung senken Blutdruck und Stress."));
  if (lastVital){
    const r = bpRating(lastVital.sys, lastVital.dia), pr = pulseRating(lastVital.pulse);
    if (r) items.push(anItem("heart-pulse", `Blutdruck heute <b>${lastVital.sys||"–"}/${lastVital.dia||"–"}</b>: ${r.label}.`, r.tone==="good"?"good":"warn"));
    if (pr) items.push(anItem("activity", `Puls <b>${lastVital.pulse}</b> bpm: ${pr.label}.`, pr.tone==="good"?"good":""));
  } else items.push(anItem("stethoscope", "Heute noch nicht gemessen."));
  const nb = kcalBudget(), eaten = todayMealList().reduce((a,m)=>a+(m.kcal||0),0);
  if (nb && eaten>0){
    const rem = nb-eaten;
    items.push(rem>=0 ? anItem("utensils", `<b>${Math.round(eaten).toLocaleString("de-DE")}</b> von ${nb.toLocaleString("de-DE")} kcal gegessen, <b>${Math.round(rem).toLocaleString("de-DE")}</b> übrig.`, "good")
      : anItem("utensils", `<b>${Math.round(-rem).toLocaleString("de-DE")} kcal</b> über dem Tagesbudget.`, "warn"));
  }

  const R = 34, C = 2*Math.PI*R;
  $("analysisBox").innerHTML = `
    <div class="an-score">
      <div class="an-ring">
        <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${R}" fill="none" stroke="#2b2839" stroke-width="7"/>
          <circle cx="40" cy="40" r="${R}" fill="none" stroke="${tone}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-pct/100)).toFixed(1)}"/></svg>
        <div class="arc">${pct}</div>
      </div>
      <div><div class="an-score-lab">${lab}</div><div class="muted small">Tageswert aus Schritten, Training, Blutdruck und rauchfreier Zeit</div></div>
    </div>
    ${items.join("")}`;
}

/* ---------- Tiefenanalyse ---------- */
function vitalsLastDays(n, endOff=0){
  const from = dateKeyOffset(n-1+endOff), to = dateKeyOffset(endOff);
  return vitals.filter(v=>v.date>=from && v.date<=to);
}
function renderDeepAnalysis(){
  const cards = [];
  if (vitals.length){
    const w7 = vitalsLastDays(7), w30 = vitalsLastDays(30);
    const s7=avgKey(w7,"sys"), d7=avgKey(w7,"dia"), sAll=avgKey(vitals,"sys"), dAll=avgKey(vitals,"dia"), s30=avgKey(w30,"sys"), d30=avgKey(w30,"dia");
    const morg = vitals.filter(v=>v.slot==="morgens"), ab = vitals.filter(v=>v.slot==="abends");
    const sM=avgKey(morg,"sys"), dM=avgKey(morg,"dia"), sA=avgKey(ab,"sys"), dA=avgKey(ab,"dia");
    const sd = stdKey(vitals,"sys");
    const withBP = vitals.filter(v=>v.sys!=null||v.dia!=null);
    const goodShare = withBP.length ? Math.round(withBP.filter(v=>{ const r=bpRating(v.sys,v.dia); return r && r.tone==="good"; }).length/withBP.length*100) : null;
    const best = withBP.filter(v=>v.sys!=null).sort((a,b)=>a.sys-b.sys)[0];
    const fmtBP = (s,d) => (s?Math.round(s):"–")+"/"+(d?Math.round(d):"–");
    let inner = `<div class="mini-grid">
      ${bsCell("Schnitt 7 Tage", fmtBP(s7,d7), s7&&sAll?deltaTag(s7-sAll, true):"")}
      ${bsCell("Schnitt 30 Tage", fmtBP(s30,d30))}
      ${bsCell("Schnitt gesamt", fmtBP(sAll,dAll))}
      ${bsCell("Im grünen Bereich", goodShare!=null ? goodShare+" %" : "–")}
    </div>`;
    if (sM!=null && sA!=null && morg.length>=2 && ab.length>=2)
      inner += anItem("sunrise", `Morgens misst du im Schnitt <b>${fmtBP(sM,dM)}</b>, abends <b>${fmtBP(sA,dA)}</b>.` + (sM-sA>=8 ? " Höhere Morgenwerte sind häufig. Liegen sie dauerhaft über 135/85, sprich das ärztlich an." : ""));
    if (sd!=null) inner += anItem("activity", `Schwankung systolisch: <b>±${fmtN(sd,1)}</b>. ` + (sd>12 ? "Recht hoch. Miss möglichst zur gleichen Zeit, im Sitzen, nach 5 Minuten Ruhe und vor dem Kaffee." : "Deine Messbedingungen wirken konstant."));
    if (best) inner += anItem("medal", `Bester Wert bisher: <b>${best.sys}/${best.dia||"–"}</b> am ${fmtShortDate(best.date)}.`, "good");
    if (s7!=null && sAll!=null && vitals.length>=6){
      const d = s7-sAll;
      inner += d<-1.5 ? anItem("trending-down", `Dein 7-Tage-Schnitt liegt <b>${fmtN(-d,1)} Punkte unter</b> deinem Gesamtschnitt.`, "good")
        : d>1.5 ? anItem("trending-up", `Dein 7-Tage-Schnitt liegt <b>${fmtN(d,1)} Punkte über</b> dem Gesamtschnitt. Schlaf, Salz, Alkohol und Stress sind die üblichen Stellschrauben.`, "warn")
        : anItem("minus", "Dein 7-Tage-Schnitt liegt auf Höhe deines Gesamtschnitts.");
    }
    cards.push(deepCard("heart-pulse","rose","Blutdruck im Detail", inner));
  }

  const withP = vitals.filter(v=>v.pulse!=null);
  if (withP.length >= 6){
    const k = Math.min(7, Math.floor(withP.length/2));
    const first = avgKey(withP.slice(0,k),"pulse"), last = avgKey(withP.slice(-k),"pulse"), d = last-first;
    let inner = `<div class="mini-grid">${bsCell("Anfangs", Math.round(first)+" bpm")}${bsCell("Zuletzt", Math.round(last)+" bpm", deltaTag(d, true, " bpm"))}</div>`;
    inner += d<-1 ? anItem("heart", `Dein Ruhepuls ist um <b>${fmtN(-d,1)} bpm gesunken</b>, ein typisches Zeichen, dass sich Herz und Kreislauf erholen.`, "good")
      : d>2 ? anItem("heart", "Dein Ruhepuls liegt zuletzt etwas höher. Stressige Phasen oder wenig Schlaf sind normal, behalte den Trend im Blick.", "warn")
      : anItem("heart", "Dein Ruhepuls ist stabil. Mit mehr Ausdauertraining sinkt er häufig weiter.");
    cards.push(deepCard("activity","blue","Ruhepuls", inner));
  }

  if (Object.keys(steps).length || sessions.length){
    const st7 = stepsLastDays(7), stPrev = stepsLastDays(7,7), se7 = sessionsLastDays(7), sePrev = sessionsLastDays(7,7);
    const whoPct = Math.min(100, Math.round(se7.mins/150*100));
    let inner = `<div class="mini-grid">
      ${bsCell("Schritte, 7 Tage", fmtN(st7.sum), stPrev.sum ? deltaTag((st7.sum-stPrev.sum)/stPrev.sum*100, false, "%") : "")}
      ${bsCell("Tage mit Schrittziel", st7.goalDays+" von 7")}
      ${bsCell("Training, 7 Tage", se7.mins+" Min", sePrev.mins ? deltaTag(se7.mins-sePrev.mins, false, " Min") : "")}
      ${bsCell("Verbrannt", se7.kcal ? "~"+fmtN(se7.kcal)+" kcal" : "–")}
    </div>
    <div class="an-item"><span class="ai-ico">${icon("target")}</span><span style="flex:1">WHO-Empfehlung, 150 Minuten Bewegung pro Woche: <b>${whoPct} %</b>
      <div class="bar bar-teal" style="margin-top:8px"><span style="width:${whoPct}%"></span></div></span></div>`;
    if (st7.daysWith < 4) inner += anItem("pencil", `Nur an ${st7.daysWith} von 7 Tagen Schritte eingetragen. Je vollständiger, desto genauer der Bericht.`);
    cards.push(deepCard("footprints","green","Aktivität dieser Woche", inner));
  }

  if (vitals.length >= 6){
    const goal = stepGoal(), activeDates = new Set();
    sessions.forEach(s=>activeDates.add(s.date));
    Object.entries(steps).forEach(([d,n])=>{ if (n>=goal*0.7) activeDates.add(d); });
    const act = vitals.filter(v=>activeDates.has(v.date)), rest = vitals.filter(v=>!activeDates.has(v.date));
    if (act.length>=3 && rest.length>=3){
      const pA=avgKey(act,"pulse"), pR=avgKey(rest,"pulse"), sA2=avgKey(act,"sys"), sR2=avgKey(rest,"sys");
      let inner = `<div class="mini-grid">
        ${bsCell("Puls, aktive Tage", pA?Math.round(pA)+" bpm":"–")}${bsCell("Puls, ruhige Tage", pR?Math.round(pR)+" bpm":"–")}
        ${bsCell("Systolisch, aktiv", sA2?Math.round(sA2):"–")}${bsCell("Systolisch, ruhig", sR2?Math.round(sR2):"–")}</div>`;
      if (pA!=null && pR!=null) inner += pA<pR-1 ? anItem("chart-line", `An Tagen mit Bewegung liegt dein Puls im Schnitt <b>${fmtN(pR-pA,1)} bpm niedriger</b>.`, "good")
        : anItem("chart-line", "Zwischen Bewegung und Puls zeigt sich noch kein klarer Unterschied.");
      if (sA2!=null && sR2!=null && sA2<sR2-2) inner += anItem("dumbbell", `Dein systolischer Druck ist an aktiven Tagen <b>${fmtN(sR2-sA2,1)} Punkte niedriger</b>.`, "good");
      cards.push(deepCard("chart-line","violet","Zusammenhänge", inner));
    } else {
      cards.push(deepCard("chart-line","violet","Zusammenhänge", anItem("hourglass", "Ab etwa 3 aktiven und 3 ruhigen Tagen mit Messwerten vergleiche ich hier, wie Bewegung auf Puls und Blutdruck wirkt.")));
    }
  }

  const bmr = computeBMR();
  if (bmr != null){
    const st7 = stepsLastDays(7), se7 = sessionsLastDays(7);
    const stepKcal = Math.round((st7.daysWith ? st7.sum/st7.daysWith : 0) * 0.04), sportKcal = Math.round(se7.kcal/7);
    cards.push(deepCard("zap","amber","Energiebedarf", `<div class="mini-grid">
      ${bsCell("Grundumsatz", fmtN(Math.round(bmr))+" kcal")}${bsCell("Schritte pro Tag", "~"+fmtN(stepKcal)+" kcal")}
      ${bsCell("Training pro Tag", "~"+fmtN(sportKcal)+" kcal")}${bsCell("Tagesbedarf", "~"+fmtN(computeTDEE())+" kcal")}</div>`
      + anItem("info", "Grobe Schätzung nach Mifflin-St-Jeor plus Aktivität. Nach dem Rauchstopp sinkt der Umsatz leicht und der Appetit kommt zurück. Bewegung gleicht das aus.")));
  } else {
    cards.push(deepCard("zap","amber","Energiebedarf", anItem("user", "Trag in den Einstellungen Gewicht, Größe, Alter und Geschlecht ein, dann berechne ich hier deinen Tagesbedarf.")));
  }
  $("deepAnalysis").innerHTML = cards.join("") + `<p class="footnote">Automatisch berechnete Orientierung aus deinen Eingaben, keine medizinische Beurteilung.</p>`;
}
