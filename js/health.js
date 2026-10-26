/* Blutdruck: Messungen, Bewertung, Verlauf, Auswertung */
"use strict";

let vitals = [], activeSlot = "morgens";
const sysEl=$("sys"), diaEl=$("dia"), pulseEl=$("pulse"), dateEl=$("measureDate");

function loadVitals(){ vitals = store.get("rf:vitals") || []; }
function saveVitals(){ store.set("rf:vitals", vitals); }
segBind("timeSeg", b=>{ activeSlot = b.dataset.slot; });

$("saveVital").addEventListener("click", ()=>{
  const sys=parseInt(sysEl.value), dia=parseInt(diaEl.value), pulse=parseInt(pulseEl.value), date=dateEl.value;
  if (!date) return flashMsg("viMsg","Wähl ein Datum.", true);
  if (!sys && !dia && !pulse) return flashMsg("viMsg","Trag mindestens einen Wert ein.", true);
  vitals.push({ date, slot:activeSlot, sys:sys||null, dia:dia||null, pulse:pulse||null, ts:Date.now() });
  vitals.sort((a,b)=>(a.date+(a.slot==="morgens"?"0":"1")).localeCompare(b.date+(b.slot==="morgens"?"0":"1"))||a.ts-b.ts);
  saveVitals();
  showRateLine(sys||null, dia||null, pulse||null);
  sysEl.value=diaEl.value=pulseEl.value="";
  flashMsg("viMsg","Gespeichert");
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
    if (best) inner += anItem("medal", `Bester Wert bisher: <b>${best.sys}/${best.dia||"–"}</b> am ${fmtShortDate(best.date)}`, "good");
    if (s7!=null && sAll!=null && vitals.length>=6){
      const d = s7-sAll;
      inner += d<-1.5 ? anItem("trending-down", `Dein 7-Tage-Schnitt liegt <b>${fmtN(-d,1)} Punkte unter</b> deinem Gesamtschnitt.`, "good")
        : d>1.5 ? anItem("trending-up", `Dein 7-Tage-Schnitt liegt <b>${fmtN(d,1)} Punkte über</b> dem Gesamtschnitt. Schlaf, Salz, Bewegung und Stress sind die üblichen Stellschrauben.`, "warn")
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

  // Vergleich vor und nach dem Rauchstopp (erster Anlauf)
  const firstStart = Math.min(...freeIntervals().map(iv=>iv.start));
  if (isFinite(firstStart)){
    const startKey = dateKey(new Date(firstStart));
    const before = vitals.filter(v=>v.date < startKey), after = vitals.filter(v=>v.date >= startKey);
    if (before.length >= 3 && after.length >= 3){
      const sB=avgKey(before,"sys"), dB=avgKey(before,"dia"), sA=avgKey(after,"sys"), dA=avgKey(after,"dia"), pB=avgKey(before,"pulse"), pA=avgKey(after,"pulse");
      const fmtBP = (s,d) => (s?Math.round(s):"–")+"/"+(d?Math.round(d):"–");
      let inner = `<div class="mini-grid">${bsCell("Vorher", fmtBP(sB,dB), pB?`<div class="muted small">Puls ${Math.round(pB)}</div>`:"")}
        ${bsCell("Rauchfrei", fmtBP(sA,dA), pA?`<div class="muted small">Puls ${Math.round(pA)}</div>`:"")}</div>`;
      if (sB!=null && sA!=null) inner += sA < sB-1 ? anItem("trending-down", `Seit dem Rauchstopp liegt dein systolischer Wert im Schnitt <b>${fmtN(sB-sA,1)} Punkte niedriger</b>.`, "good")
        : anItem("minus", "Zwischen vorher und nachher zeigt sich beim Blutdruck noch kein klarer Unterschied. Das braucht oft einige Wochen.");
      cards.push(deepCard("cigarette-off","teal","Vor und nach dem Rauchstopp", inner));
    }
  }
  $("deepAnalysis").innerHTML = cards.join("") + `<p class="footnote">Automatisch berechnete Orientierung aus deinen Eingaben, keine medizinische Beurteilung.</p>`;
}
