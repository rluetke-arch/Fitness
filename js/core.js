/* Grundlagen: Speicher, Datum, Formatierung, kleine UI-Helfer */
"use strict";

const $ = id => document.getElementById(id);
const store = {
  get(k){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
// Alle Schlüssel, die zur App gehören (für Reset und Backup)
const DATA_KEYS = ["rf:config","rf:vitals","rf:goals","rf:sos","rf:cravings","rf:attempts","rf:badgeseen"];
// Schlüssel entfernter Bereiche (Alkohol, Welt, XP, Training, Ernährung): werden nur beim Zurücksetzen gelöscht
const LEGACY_KEYS = ["rf:game","rf:steps","rf:sessions","rf:city","rf:city2","rf:cityseen","rf:meals","rf:weights","rf:weekseen","rf:apikey"];

/* ---------- Datum (immer lokale Zeit, nicht UTC) ---------- */
function dateKey(d){
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function todayKey(){ return dateKey(new Date()); }
function dateKeyOffset(off){ const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-off); return dateKey(d); }
function parseKey(k){ return new Date(k + "T12:00:00"); }
function fmtShortDate(k){ return parseKey(k).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}); }

/* ---------- Formatierung ---------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function fmtEuro(n){ return (n||0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €"; }
function fmtEuro0(n){ return Math.round(n||0).toLocaleString("de-DE") + " €"; }
function fmtN(n, digits=0){ return n==null ? "–" : n.toLocaleString("de-DE",{minimumFractionDigits:digits,maximumFractionDigits:digits}); }
function remaining(mins){
  if (mins < 60) return Math.ceil(mins) + " Min";
  if (mins < 1440) return Math.ceil(mins/60) + " Std";
  const d = Math.ceil(mins/1440); return d + (d===1 ? " Tag" : " Tage");
}
function labelFor(mins){
  if (mins < 60) return mins + " Minuten";
  if (mins < 60*24) { const h = mins/60; return h + (h===1 ? " Stunde" : " Stunden"); }
  const days = mins/60/24;
  if (days < 14) return days + (days===1 ? " Tag" : " Tage");
  if (days < 30) return Math.round(days/7) + " Wochen";
  if (days < 365) { const m = Math.round(days/30); return m + (m===1 ? " Monat" : " Monate"); }
  return "1 Jahr";
}
function plural(n, one, many){ return n===1 ? one : many; }

/* ---------- Statistik ---------- */
function avgKey(arr, key){ const v=arr.map(x=>x[key]).filter(n=>n!=null); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }
function stdKey(arr, key){
  const v=arr.map(x=>x[key]).filter(n=>n!=null); if (v.length<3) return null;
  const m=v.reduce((a,b)=>a+b,0)/v.length; return Math.sqrt(v.reduce((a,b)=>a+(b-m)*(b-m),0)/v.length);
}
function linReg(ys){
  const n=ys.length, xs=ys.map((_,i)=>i);
  const sx=xs.reduce((a,b)=>a+b,0), sy=ys.reduce((a,b)=>a+b,0), sxy=xs.reduce((a,b,i)=>a+b*ys[i],0), sxx=xs.reduce((a,b)=>a+b*b,0);
  const slope=(n*sxy-sx*sy)/(n*sxx-sx*sx||1); return { slope, inter:(sy-slope*sx)/n };
}

/* ---------- UI-Helfer ---------- */
function hydrateIcons(root=document){
  root.querySelectorAll("i[data-ic]").forEach(el=>{ if (!el.firstChild) el.innerHTML = icon(el.dataset.ic); });
}
function anItem(ico, txt, tone){ return `<div class="an-item ${tone||""}"><span class="ai-ico">${icon(ico)}</span><span>${txt}</span></div>`; }
function deltaTag(d, invert=false, unit=""){
  if (d==null) return "";
  const good = invert ? d<0 : d>0;
  if (Math.abs(d)<0.5) return `<span class="rate-badge rate-mid"><span class="dot"></span>stabil</span>`;
  return `<span class="rate-badge ${good?"rate-good":"rate-warn"}"><span class="dot"></span>${d>0?"+":"−"}${fmtN(Math.abs(d), unit==="%"?0:1)}${unit}</span>`;
}
function bsCell(label, value, extra=""){ return `<div class="bs"><div class="bsl">${label}</div><div class="bsv">${value}</div>${extra}</div>`; }
function deepCard(ico, color, title, inner){
  return `<div class="card"><div class="card-head"><h2>${title}</h2><span class="chip-ic ${color}">${icon(ico)}</span></div>${inner}</div>`;
}
function flashMsg(id, text, err){
  const el = $(id); if (!el) return;
  el.textContent = text; el.classList.toggle("err", !!err);
  clearTimeout(el._t); el._t = setTimeout(()=>{ if (el.textContent===text) el.textContent=""; }, err ? 5000 : 3500);
}
function toast(text, ic="sparkles"){
  const el = $("toast"); el.innerHTML = icon(ic) + "<span>" + escapeHtml(text) + "</span>"; el.classList.add("show");
  try { if (navigator.vibrate) navigator.vibrate(25); } catch(e){}
  clearTimeout(toast._t); toast._t = setTimeout(()=>el.classList.remove("show"), 3200);
}
function openSheet(id){ $(id).classList.add("show"); }
function closeSheet(id){ $(id).classList.remove("show"); }
function bindSheet(id, closeId){
  $(closeId).addEventListener("click", ()=>closeSheet(id));
  $(id).addEventListener("click", e=>{ if (e.target.id===id) closeSheet(id); });
}
function segBind(segId, onPick){
  document.querySelectorAll("#"+segId+" button").forEach(b=>b.addEventListener("click", ()=>{
    document.querySelectorAll("#"+segId+" button").forEach(x=>x.classList.toggle("active", x===b));
    onPick(b);
  }));
}
function segSet(segId, attr, val){
  document.querySelectorAll("#"+segId+" button").forEach(x=>x.classList.toggle("active", x.dataset[attr]===String(val)));
}
