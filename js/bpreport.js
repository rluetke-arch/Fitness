/* Blutdruck-Bericht für die Arztpraxis: Druckansicht und Datei zum Teilen */
"use strict";

let reportDays = 30;
const HOME_SYS = 135, HOME_DIA = 85; // Grenzwert für Selbstmessung zu Hause (ESC/ESH)

segBind("reportRangeSeg", b=>{ reportDays = parseInt(b.dataset.days, 10); });
$("reportName").value = (store.get("rf:config")||{}).reportName || "";
$("reportName").addEventListener("input", ()=>{
  const c = store.get("rf:config") || {}; c.reportName = $("reportName").value; store.set("rf:config", c);
});

function reportData(){
  const list = (reportDays ? vitals.filter(v=>v.date >= dateKeyOffset(reportDays-1)) : vitals.slice())
    .filter(v=>v.sys!=null || v.dia!=null || v.pulse!=null);
  const byDay = {};
  list.forEach(v=>{ (byDay[v.date] = byDay[v.date] || { morgens:[], abends:[] })[v.slot==="abends"?"abends":"morgens"].push(v); });
  const bp = list.filter(v=>v.sys!=null && v.dia!=null);
  const over = bp.filter(v=>v.sys>=HOME_SYS || v.dia>=HOME_DIA).length;
  const avg = arr => ({ sys:avgKey(arr,"sys"), dia:avgKey(arr,"dia"), pulse:avgKey(arr,"pulse"), n:arr.length });
  const sortedSys = bp.slice().sort((a,b)=>a.sys-b.sys);
  return {
    list, days: Object.keys(byDay).sort(), byDay,
    all: avg(list), morning: avg(list.filter(v=>v.slot!=="abends")), evening: avg(list.filter(v=>v.slot==="abends")),
    overShare: bp.length ? Math.round(over/bp.length*100) : null,
    low: sortedSys[0] || null, high: sortedSys[sortedSys.length-1] || null,
    from: list.length ? list[0].date : null, to: list.length ? list[list.length-1].date : null,
  };
}
const fmtLong = k => parseKey(k).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
const r0 = v => v==null ? "–" : Math.round(v);

function reportHtml(d){
  const name = escapeHtml(($("reportName").value||"").trim());
  const cell = arr => arr.length ? arr.map(v=>{
    const flag = (v.sys>=HOME_SYS || v.dia>=HOME_DIA) ? ' class="hi"' : "";
    return `<span${flag}>${r0(v.sys)}/${r0(v.dia)}</span> <small>${r0(v.pulse)}</small>`; }).join("<br>") : "–";
  const rows = d.days.map(k=>{
    const day = d.byDay[k];
    return `<tr><td>${parseKey(k).toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"2-digit"})}</td><td>${cell(day.morgens)}</td><td>${cell(day.abends)}</td></tr>`;
  }).join("");
  const sumRow = (lab,a) => `<tr><td>${lab}</td><td>${r0(a.sys)}/${r0(a.dia)} mmHg</td><td>${r0(a.pulse)} /min</td><td>${a.n}</td></tr>`;
  const rating = bpRating(d.all.sys, d.all.dia);
  return `
  <div class="rp">
    <header class="rp-head">
      <div><h1>Blutdruck-Protokoll</h1>${name?`<p class="rp-name">${name}</p>`:""}</div>
      <p>Zeitraum ${d.from?fmtLong(d.from):"–"} bis ${d.to?fmtLong(d.to):"–"}<br>Erstellt am ${new Date().toLocaleDateString("de-DE")}</p>
    </header>
    <h2>Zusammenfassung</h2>
    <table class="rp-sum"><thead><tr><th></th><th>Blutdruck (Mittelwert)</th><th>Puls</th><th>Messungen</th></tr></thead>
      <tbody>${sumRow("Gesamt", d.all)}${sumRow("Morgens", d.morning)}${sumRow("Abends", d.evening)}</tbody></table>
    <ul class="rp-facts">
      ${rating ? `<li>Einstufung des Mittelwerts: <b>${rating.label}</b> (Praxis-Richtwerte ESC/ESH)</li>` : ""}
      ${d.overShare!=null ? `<li>Messungen ab ${HOME_SYS}/${HOME_DIA} mmHg (Grenzwert für die Selbstmessung zu Hause): <b>${d.overShare} %</b></li>` : ""}
      ${d.high ? `<li>Höchster systolischer Wert: <b>${r0(d.high.sys)}/${r0(d.high.dia)}</b> am ${fmtLong(d.high.date)}; niedrigster: <b>${r0(d.low.sys)}/${r0(d.low.dia)}</b> am ${fmtLong(d.low.date)}</li>` : ""}
      ${state.days>0 ? `<li>Rauchfrei seit ${state.days} Tagen</li>` : ""}
    </ul>
    <h2>Einzelmessungen</h2>
    <table class="rp-list"><thead><tr><th>Datum</th><th>Morgens <small>(Puls)</small></th><th>Abends <small>(Puls)</small></th></tr></thead><tbody>${rows}</tbody></table>
    <p class="rp-foot">Werte in mmHg, Puls in Schlägen pro Minute. Fett markiert: ab ${HOME_SYS}/${HOME_DIA} mmHg. Selbst gemessen und in der App „Rauchfrei“ erfasst, keine ärztliche Diagnose.</p>
  </div>`;
}
const REPORT_CSS = `
  .rp { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.4; max-width: 720px; margin: 0 auto; }
  .rp h1 { font-size: 18pt; margin: 0; } .rp h2 { font-size: 12pt; margin: 18px 0 6px; }
  .rp-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; border-bottom: 2px solid #111; padding-bottom: 8px; }
  .rp-head p { margin: 0; text-align: right; font-size: 9.5pt; color: #444; } .rp-name { text-align: left !important; font-size: 11pt !important; color: #111 !important; margin-top: 2px !important; }
  .rp table { width: 100%; border-collapse: collapse; } .rp th, .rp td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
  .rp th { font-size: 9.5pt; color: #444; border-bottom: 1.5px solid #111; } .rp small { color: #666; font-size: 8.5pt; }
  .rp .hi { font-weight: 700; } .rp-facts { margin: 8px 0 0 18px; padding: 0; } .rp-facts li { margin: 3px 0; }
  .rp-list tr { break-inside: avoid; } .rp-foot { font-size: 8.5pt; color: #555; margin-top: 14px; }`;

$("reportPrint").addEventListener("click", ()=>{
  const d = reportData();
  if (!d.list.length) return flashMsg("reportMsg", "Im gewählten Zeitraum gibt es keine Messungen.", true);
  $("printArea").innerHTML = `<style>${REPORT_CSS}</style>` + reportHtml(d);
  document.body.classList.add("printing");
  setTimeout(()=>{ window.print(); setTimeout(()=>document.body.classList.remove("printing"), 500); }, 50);
});
window.addEventListener("afterprint", ()=>document.body.classList.remove("printing"));

$("reportShare").addEventListener("click", async ()=>{
  const d = reportData();
  if (!d.list.length) return flashMsg("reportMsg", "Im gewählten Zeitraum gibt es keine Messungen.", true);
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blutdruck-Protokoll</title><style>body{margin:24px;background:#fff}${REPORT_CSS}</style></head><body>${reportHtml(d)}</body></html>`;
  const name = "blutdruck-protokoll-" + todayKey() + ".html";
  const file = new File([html], name, { type:"text/html" });
  try {
    if (navigator.canShare && navigator.canShare({ files:[file] })) await navigator.share({ files:[file], title:"Blutdruck-Protokoll" });
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    flashMsg("reportMsg", "Bericht erstellt");
  } catch(e){ if (!e || e.name !== "AbortError") flashMsg("reportMsg", "Teilen hat nicht geklappt.", true); }
});
