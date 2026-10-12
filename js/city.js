/* Meine Welt: Stadtaufbau mit Baupunkten */
"use strict";

const cityTiers = [
  { p:0, name:"Siedlung", pop:40 }, { p:250, name:"Dorf", pop:320 }, { p:800, name:"Kleinstadt", pop:2400 },
  { p:2000, name:"Stadt", pop:12000 }, { p:4500, name:"Großstadt", pop:68000 }, { p:9000, name:"Metropole", pop:340000 },
  { p:18000, name:"Megacity", pop:1600000 }, { p:34000, name:"Region", pop:6200000 }, { p:60000, name:"Kontinent", pop:24000000 },
  { p:100000, name:"Welt", pop:90000000 },
];
const buildCatalog = [
  { id:"haus",     name:"Wohnhaus",  ico:"house",           color:"amber",  cost:100,  tier:0, pop:12,  joy:1,  d:"Ein Zuhause für die ersten Bewohner." },
  { id:"park",     name:"Park",      ico:"trees",           color:"green",  cost:150,  tier:0, pop:0,   joy:3,  d:"Bäume, Bänke und eine Laterne. Hebt die Stimmung." },
  { id:"block",    name:"Wohnblock", ico:"building-complex",color:"blue",   cost:300,  tier:1, pop:60,  joy:0,  d:"Platz für viele neue Einwohner." },
  { id:"schule",   name:"Schule",    ico:"school",          color:"violet", cost:500,  tier:2, pop:10,  joy:2,  d:"Bildung für deine wachsende Stadt." },
  { id:"fabrik",   name:"Fabrik",    ico:"factory",         color:"grey",   cost:800,  tier:3, pop:40,  joy:-2, d:"Arbeitsplätze, aber auch etwas Qualm." },
  { id:"turm",     name:"Hochhaus",  ico:"building",        color:"blue",   cost:1200, tier:4, pop:200, joy:0,  d:"Ein Turm mit blinkendem Licht auf dem Dach." },
  { id:"stadion",  name:"Stadion",   ico:"trophy",          color:"green",  cost:2500, tier:5, pop:0,   joy:5,  d:"Eine Arena unter Flutlicht, die alle begeistert." },
  { id:"rathaus",  name:"Rathaus",   ico:"landmark",        color:"amber",  cost:4000, tier:5, pop:30,  joy:3,  d:"Mit Uhrturm, das Herz der Verwaltung." },
  { id:"monument", name:"Monument",  ico:"tower-control",   color:"violet", cost:6000, tier:6, pop:0,   joy:6,  d:"Ein Wahrzeichen mit Leuchtfeuer." },
  { id:"markt",    name:"Markthalle",ico:"store",           color:"amber",  cost:3000, tier:5, pop:20,  joy:4,  d:"Frisches Essen unter einem gläsernen Dach." },
  { id:"leucht",   name:"Leuchtturm",ico:"lighthouse",      color:"rose",   cost:5000, tier:6, pop:0,   joy:4,  d:"Sein Lichtstrahl führt die Schiffe in den Hafen.", only:1 },
  { id:"rad",      name:"Riesenrad", ico:"ferris-wheel",    color:"violet", cost:7000, tier:6, pop:0,   joy:7,  d:"Dreht sich langsam über den Dächern." },
];
const districts = [
  { name:"Innenstadt",  ico:"building" },
  { name:"Hafen",       ico:"anchor" },
  { name:"Grünviertel", ico:"trees" },
];
const LOTS = 12, LOT_W = 33, LOT_X0 = 12;
let city = { name:"Neustadt", spent:0, buildings:[] };
let pendingLot = null, citySig = "", activeDistrict = 0;

function loadCity(){
  const c2 = store.get("rf:city2");
  if (c2) city = c2;
  else { const c = store.get("rf:city"); if (c && c.name) city.name = c.name; }
  if (!Array.isArray(city.buildings)) city.buildings = [];
  if (typeof city.spent !== "number") city.spent = 0;
  if (!city.name) city.name = "Neustadt";
  city.buildings.forEach(b=>{ if (b.d == null) b.d = 0; });
  if (typeof city.unlocked !== "number") city.unlocked = 0;
  updateUnlocks(false);
  activeDistrict = Math.min(city.view || 0, city.unlocked);
}
function districtCount(d){ return city.buildings.filter(b=>b.d===d).length; }
// Ein Bezirk wird frei, sobald der vorherige komplett bebaut ist. Einmal frei, bleibt er frei.
function updateUnlocks(announce){
  let changed = false;
  while (city.unlocked < districts.length-1 && districtCount(city.unlocked) >= LOTS){
    city.unlocked++; changed = true;
    if (announce) toast("Neuer Bezirk freigeschaltet: " + districts[city.unlocked].name, districts[city.unlocked].ico);
  }
  if (changed) saveCityData();
  return changed;
}
function hasFreeLot(){ for (let d=0; d<=city.unlocked; d++) if (districtCount(d) < LOTS) return true; return false; }
function renderDistrictSeg(){
  $("districtSeg").innerHTML = districts.map((d,i)=>{
    const locked = i > city.unlocked;
    return `<button data-d="${i}" class="${i===activeDistrict?"active":""} ${locked?"locked":""}">${icon(locked?"lock":d.ico)}${d.name}</button>`;
  }).join("");
  $("districtSeg").querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{
    const i = +b.dataset.d;
    if (i > city.unlocked){ toast(districts[i].name + " wird frei, wenn " + districts[i-1].name + " komplett bebaut ist", "lock"); return; }
    activeDistrict = i; city.view = i; saveCityData(); renderCity();
  }));
}
function saveCityData(){ store.set("rf:city2", city); }

// Baupunkte: rauchfreie und alkoholfreie Stunden, Aktivität, XP, Level-Belohnungen und Quest-Boni
function earnedBP(){
  let p = 0;
  if (!state.future) p += (state.days*24 + (state.hoursFrac||0)) * 10;
  if (state.alcActive && !state.alcFuture) p += state.alcHours * 5;
  p += vitals.length * 25;
  p += sessions.reduce((a,s)=>a+s.mins,0) * 2;
  p += Object.values(steps).reduce((a,b)=>a+b,0) / 200;
  p += sosCount * 40;
  p += game.xp * 0.5;
  p += (levelInfo(game.xp).lvl - 1) * LEVEL_BP;
  p += game.bonusBP || 0;
  return Math.floor(p);
}
function availableBP(){ return Math.max(0, earnedBP() - city.spent); }
function tierFor(p){ let i=0; cityTiers.forEach((t,k)=>{ if (p>=t.p) i=k; }); return i; }
function basePopulation(p){
  const i = tierFor(p), cur = cityTiers[i], next = cityTiers[i+1];
  if (!next) return Math.round(cur.pop * (1 + (p-cur.p)/cur.p*0.5));
  return Math.round(cur.pop + (next.pop-cur.pop)*((p-cur.p)/(next.p-cur.p)));
}
function buildingAt(lot, d=activeDistrict){ return city.buildings.find(b=>b.lot===lot && b.d===d) || null; }
function joyScore(){
  const j = city.buildings.reduce((a,b)=>{ const t=buildCatalog.find(x=>x.id===b.type); return a+(t?t.joy:0); },0);
  return Math.max(5, Math.min(100, 50 + j*4));
}
function rnd(seed){ const x = Math.sin(seed*9301+49297)*233280; return x - Math.floor(x); }

/* Gebäude-Zeichnungen (x = linke Kante des Grundstücks, g = Bodenlinie) */
const drawB = {
  haus(x,g,i){ return `
    <rect x="${x+5}" y="${g-19}" width="23" height="19" fill="#2b3766" stroke="#41529b" stroke-width=".6"/>
    <polygon points="${x+3},${g-19} ${x+16.5},${g-30} ${x+30},${g-19}" fill="#4a3358" stroke="#6b4a7e" stroke-width=".6"/>
    <rect x="${x+9}" y="${g-13}" width="5" height="5.5" fill="#ffd98a"/>
    <rect x="${x+19}" y="${g-13}" width="5" height="5.5" fill="#ffd98a" opacity=".8"/>
    <rect x="${x+14.5}" y="${g-8}" width="5" height="8" fill="#161f3d"/>
    <rect x="${x+23}" y="${g-27.5}" width="3" height="6.5" fill="#39477f"/>`; },
  park(x,g,i){ let t="";
    for (let k=0;k<3;k++){ const tx=x+8+k*9, th=8+rnd(i*7+k)*6;
      t += `<rect x="${(tx-.8).toFixed(1)}" y="${g-th}" width="1.6" height="${th}" fill="#3d3023"/>
        <circle cx="${tx}" cy="${(g-th-4).toFixed(1)}" r="${(4.2+rnd(i+k)*2).toFixed(1)}" fill="#1f7a4f"/>
        <circle cx="${tx-2.2}" cy="${(g-th-2).toFixed(1)}" r="3" fill="#2fa06b" opacity=".8"/>`; }
    t += `<rect x="${x+27.4}" y="${g-11}" width="1.2" height="11" fill="#44507f"/>
      <circle cx="${x+28}" cy="${g-11.6}" r="2.2" fill="#ffe9b0" opacity=".95"><animate attributeName="opacity" values=".95;.6;.95" dur="3.4s" repeatCount="indefinite"/></circle>`;
    return t; },
  block(x,g,i){ let w=""; 
    for (let c=0;c<4;c++) for (let r=0;r<5;r++){ if (rnd(i*13+c*5+r)>.35)
      w += `<rect x="${x+7+c*5.4}" y="${g-38+r*7}" width="3" height="3.8" fill="#ffd98a" opacity="${(.5+rnd(c+r+i)*.5).toFixed(2)}"/>`; }
    return `<rect x="${x+4}" y="${g-42}" width="25" height="42" fill="#243059" stroke="#3c4d90" stroke-width=".6"/>
      <rect x="${x+4}" y="${g-44.5}" width="25" height="2.5" fill="#33427c"/>${w}
      <rect x="${x+2}" y="${g-25}" width="2.2" height="1.4" fill="#33427c"/><rect x="${x+2}" y="${g-14}" width="2.2" height="1.4" fill="#33427c"/>`; },
  schule(x,g,i){ return `
    <rect x="${x+2}" y="${g-21}" width="29" height="21" fill="#2c3a6e" stroke="#45589f" stroke-width=".6"/>
    <rect x="${x+2}" y="${g-24}" width="29" height="3" fill="#3d4f8f"/>
    <rect x="${x+6}" y="${g-15}" width="4.4" height="5" fill="#ffe9b0"/><rect x="${x+13}" y="${g-15}" width="4.4" height="5" fill="#ffe9b0" opacity=".85"/><rect x="${x+20}" y="${g-15}" width="4.4" height="5" fill="#ffe9b0" opacity=".7"/>
    <rect x="${x+13.6}" y="${g-7}" width="6" height="7" fill="#161f3d"/>
    <rect x="${x+27.5}" y="${g-36}" width="1.2" height="12" fill="#5b6aa8"/>
    <polygon points="${x+28.7},${g-36} ${x+34},${g-34} ${x+28.7},${g-32}" fill="#8c6bff"><animate attributeName="opacity" values="1;.6;1" dur="2.6s" repeatCount="indefinite"/></polygon>`; },
  fabrik(x,g,i){ return `
    <rect x="${x+3}" y="${g-22}" width="27" height="22" fill="#1e2a52" stroke="#35468a" stroke-width=".6"/>
    <polygon points="${x+3},${g-22} ${x+10},${g-28} ${x+10},${g-22}" fill="#2a3a72"/><polygon points="${x+12},${g-22} ${x+19},${g-28} ${x+19},${g-22}" fill="#2a3a72"/><polygon points="${x+21},${g-22} ${x+28},${g-28} ${x+28},${g-22}" fill="#2a3a72"/>
    <rect x="${x+7}" y="${g-14}" width="7" height="5" fill="#ffb35c" opacity=".8"/>
    <rect x="${x+24}" y="${g-40}" width="5" height="18" fill="#2b3a74"/>
    <circle cx="${x+26.5}" cy="${g-44}" r="4" fill="#7d8ab8" opacity=".35"><animate attributeName="cy" values="${g-44};${g-62}" dur="3.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;0" dur="3.6s" repeatCount="indefinite"/></circle>
    <circle cx="${x+26.5}" cy="${g-44}" r="3" fill="#7d8ab8" opacity=".3"><animate attributeName="cy" values="${g-44};${g-58}" dur="3.6s" begin="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".3;0" dur="3.6s" begin="1.4s" repeatCount="indefinite"/></circle>`; },
  turm(x,g,i){ let w="";
    for (let c=0;c<3;c++) for (let r=0;r<11;r++){ if (rnd(i*17+c*3+r)>.3)
      w += `<rect x="${x+9+c*5.4}" y="${g-74+r*6.4}" width="3" height="3.4" fill="${rnd(c*r+i)>.85?"#8c6bff":"#ffd98a"}" opacity="${(.5+rnd(c+r)*(0.5)).toFixed(2)}"/>`; }
    return `<rect x="${x+6}" y="${g-78}" width="21" height="78" fill="url(#bldG)" stroke="#3c4d90" stroke-width=".6"/>
      <rect x="${x+6}" y="${g-78}" width="2" height="78" fill="#8c6bff" opacity=".45"/>${w}
      <rect x="${x+15.6}" y="${g-88}" width="1.4" height="10" fill="#5b6aa8"/>
      <circle cx="${x+16.3}" cy="${g-89}" r="1.7" fill="#ff4f7b"><animate attributeName="opacity" values="1;.15;1" dur="1.8s" repeatCount="indefinite"/></circle>`; },
  stadion(x,g,i){ return `
    <path d="M ${x+3} ${g} L ${x+5} ${g-14} Q ${x+16.5} ${g-24} ${x+28} ${g-14} L ${x+30} ${g} Z" fill="#28345f" stroke="#41529b" stroke-width=".6"/>
    <ellipse cx="${x+16.5}" cy="${g-13.5}" rx="10" ry="3.4" fill="#173a2c"/>
    <rect x="${x+4}" y="${g-30}" width="1.2" height="17" fill="#5b6aa8"/><rect x="${x+27.8}" y="${g-30}" width="1.2" height="17" fill="#5b6aa8"/>
    <circle cx="${x+4.6}" cy="${g-31}" r="2.2" fill="#f4f9ff" opacity=".95"><animate attributeName="opacity" values=".95;.55;.95" dur="2.2s" repeatCount="indefinite"/></circle>
    <circle cx="${x+28.4}" cy="${g-31}" r="2.2" fill="#f4f9ff" opacity=".95"><animate attributeName="opacity" values=".95;.55;.95" dur="2.2s" begin="1.1s" repeatCount="indefinite"/></circle>`; },
  rathaus(x,g,i){ return `
    <rect x="${x+3}" y="${g-24}" width="27" height="24" fill="#2e3c72" stroke="#4a5ca6" stroke-width=".6"/>
    <rect x="${x+1.5}" y="${g-26.5}" width="30" height="2.5" fill="#3f5194"/>
    <rect x="${x+12.6}" y="${g-46}" width="8" height="20" fill="#33427c" stroke="#4a5ca6" stroke-width=".5"/>
    <polygon points="${x+11.6},${g-46} ${x+16.6},${g-53} ${x+21.6},${g-46}" fill="#e6b450"/>
    <circle cx="${x+16.6}" cy="${g-41}" r="2.8" fill="#0c0f22" stroke="#ffd98a" stroke-width=".7"/>
    <line x1="${x+16.6}" y1="${g-41}" x2="${x+16.6}" y2="${g-43}" stroke="#ffd98a" stroke-width=".6"/>
    <line x1="${x+16.6}" y1="${g-41}" x2="${x+18}" y2="${g-40.6}" stroke="#ffd98a" stroke-width=".6"/>
    <rect x="${x+7}" y="${g-17}" width="4" height="5" fill="#ffe9b0" opacity=".85"/><rect x="${x+22}" y="${g-17}" width="4" height="5" fill="#ffe9b0" opacity=".85"/>
    <rect x="${x+14}" y="${g-9}" width="5.4" height="9" fill="#161f3d"/>`; },
  monument(x,g,i){ return `
    <polygon points="${x+16.5},${g-64} ${x+7},${g} ${x+12},${g} ${x+16.5},${g-40} ${x+21},${g} ${x+26},${g}" fill="#3a4a86" stroke="#5b6aa8" stroke-width=".5"/>
    <line x1="${x+10.5}" y1="${g-22}" x2="${x+22.5}" y2="${g-22}" stroke="#5b6aa8" stroke-width="1"/>
    <line x1="${x+13}" y1="${g-40}" x2="${x+20}" y2="${g-40}" stroke="#5b6aa8" stroke-width="1"/>
    <circle cx="${x+16.5}" cy="${g-66}" r="2" fill="#8c6bff"><animate attributeName="opacity" values="1;.25;1" dur="1.5s" repeatCount="indefinite"/></circle>
    <circle cx="${x+16.5}" cy="${g-66}" r="5" fill="none" stroke="#8c6bff" stroke-width=".5" opacity=".4"><animate attributeName="r" values="3;9" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;0" dur="2.4s" repeatCount="indefinite"/></circle>`; },
};

function renderCity(){
  const earned = earnedBP(), avail = availableBP(), ti = tierFor(earned), tier = cityTiers[ti], next = cityTiers[ti+1];
  $("cityName").textContent = city.name;
  $("cityTier").textContent = `Stufe ${ti+1}, ${tier.name}`;
  $("cityAvail").textContent = avail.toLocaleString("de-DE");
  $("cityEarnedLab").textContent = "Baupunkte frei, " + earned.toLocaleString("de-DE") + " verdient";
  if (next){
    const frac = (earned - tier.p)/(next.p - tier.p);
    $("cityNextName").textContent = next.name;
    $("cityNextPct").textContent = Math.floor(frac*100) + " %";
    $("cityFill").style.width = Math.min(100, frac*100) + "%";
  } else { $("cityNextName").textContent = "alles erreicht"; $("cityNextPct").textContent = "100 %"; $("cityFill").style.width = "100%"; }

  const builtPop = city.buildings.reduce((a,b)=>{ const t=buildCatalog.find(x=>x.id===b.type); return a+(t?t.pop:0); },0);
  const pop = Math.round(basePopulation(earned)*0.5 + builtPop*10), joy = joyScore();
  const joyIc = joy>=80?"face-grinning":joy>=60?"face-slightly-smiling":joy>=40?"face-neutral":"face-slightly-frowning";
  $("cityStats").innerHTML = [
    ["users","blue", pop.toLocaleString("de-DE"), "Einwohner"],
    ["hammer","amber", districtCount(activeDistrict) + " von " + LOTS, "bebaut in " + districts[activeDistrict].name],
    [joyIc,"green", joy + " %", "Zufriedenheit"],
    ["coins","violet", city.spent.toLocaleString("de-DE"), "Baupunkte verbaut"],
  ].map(([i,c,v,l])=>`<div class="cstat"><span class="chip-ic ${c}">${icon(i)}</span><div><b>${v}</b><small>${l}</small></div></div>`).join("");

  const sig = [ti, Math.min(22,3+Math.floor(earned/500)), Math.min(16,2+Math.floor(earned/900)), Math.min(9,1+Math.floor(earned/1200)),
    earned>=2800, earned>=13000, earned>=26000, activeDistrict, JSON.stringify(city.buildings.filter(b=>b.d===activeDistrict).map(b=>b.lot+b.type))].join("|");
  renderDistrictSeg();
  if (sig !== citySig){ citySig = sig; drawCity(earned, ti, activeDistrict); }
  checkCityMilestone(ti);
}

function drawCity(earned, ti, dist){
  const W=420, H=260, g=212;
  const skyTop = ["#0a0820","#0c0a26","#0f0c2c","#120e33","#16113b","#1a1443","#1e164b","#221953","#261b5b","#2a1e63"][Math.min(ti,9)];
  let s = `<defs>
    <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${skyTop}"/><stop offset="70%" stop-color="#131a3a"/><stop offset="100%" stop-color="#1b1f45"/></linearGradient>
    <linearGradient id="bldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a2f63"/><stop offset="100%" stop-color="#1a1d42"/></linearGradient>
    <linearGradient id="farG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1d1f47"/><stop offset="100%" stop-color="#171936"/></linearGradient>
    <radialGradient id="moonG"><stop offset="0%" stop-color="#f4f2ff"/><stop offset="70%" stop-color="#d6ccff"/><stop offset="100%" stop-color="#d6ccff00"/></radialGradient>
    <radialGradient id="glowG" cx="50%" cy="100%" r="70%"><stop offset="0%" stop-color="#8c6bff" stop-opacity=".35"/><stop offset="100%" stop-color="#8c6bff" stop-opacity="0"/></radialGradient>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#skyG)"/><rect y="90" width="${W}" height="130" fill="url(#glowG)"/>`;
  for (let i=0;i<30;i++){ const x=rnd(i*3+1)*W, y=rnd(i*7+2)*110, o=(.2+rnd(i*11)*.5).toFixed(2);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rnd(i*5)*.9+.4).toFixed(1)}" fill="#e6e0ff" opacity="${o}"><animate attributeName="opacity" values="${o};.08;${o}" dur="${(2.5+rnd(i)*4).toFixed(1)}s" repeatCount="indefinite"/></circle>`; }
  s += `<circle cx="352" cy="44" r="22" fill="url(#moonG)" opacity=".5"/><circle cx="352" cy="44" r="12" fill="#efeaff" opacity=".9"/><circle cx="348" cy="41" r="2.4" fill="#cfc4f2" opacity=".5"/><circle cx="356" cy="48" r="1.7" fill="#cfc4f2" opacity=".45"/>`;
  for (let i=0;i<3;i++){ const cy=30+i*26;
    s += `<g opacity=".12"><ellipse cx="0" cy="${cy}" rx="34" ry="8" fill="#e6e0ff"/><ellipse cx="24" cy="${cy+4}" rx="24" ry="6.5" fill="#e6e0ff"/>
      <animateTransform attributeName="transform" type="translate" from="-70 0" to="${W+80} 0" dur="${70+i*35}s" begin="${-(i*30)}s" repeatCount="indefinite"/></g>`; }
  const far = Math.min(22, 3+Math.floor(earned/500));
  for (let i=0;i<far;i++){ const bw=16+rnd(i*13)*16, x=(i/far)*W+rnd(i*17)*10, bh=16+rnd(i*19)*Math.min(70, 14+earned/300);
    s += `<rect x="${x.toFixed(1)}" y="${(g-26-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="url(#farG)" opacity=".85"/>`; }
  const mid = dist===2 ? 0 : Math.min(16, 2+Math.floor(earned/900));
  if (dist===1){ // Containerkräne am Horizont
    for (let i=0;i<4;i++){ const cx=40+i*105+rnd(i*5)*20, top=g-90-rnd(i*3)*25;
      s += `<path d="M${cx} ${g-12} V${top} M${cx-4} ${g-12} V${top+6} M${cx-30} ${top+4} H${cx+45} M${cx} ${top} L${cx-30} ${top+4} M${cx} ${top} L${cx+45} ${top+4} M${cx+30} ${top+4} v14" stroke="#2b3066" stroke-width="2.4" fill="none"/>
        <rect x="${cx+26}" y="${top+18}" width="8" height="5" fill="#2b3066"/><circle cx="${cx}" cy="${top-2}" r="1.6" fill="#ff4f7b"><animate attributeName="opacity" values="1;.2;1" dur="${2+i*.4}s" repeatCount="indefinite"/></circle>`; }
  }
  if (dist===2){ // Hügel und Bäume
    s += `<path d="M0 ${g-40} Q60 ${g-95} 140 ${g-55} T290 ${g-70} T420 ${g-48} V${g} H0 Z" fill="#17263a"/>
      <path d="M0 ${g-20} Q90 ${g-60} 200 ${g-28} T420 ${g-35} V${g} H0 Z" fill="#183128"/>`;
    for (let i=0;i<26;i++){ const tx=rnd(i*13)*W, ty=g-22-rnd(i*7)*28, r=3+rnd(i*3)*4;
      s += `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="${r.toFixed(1)}" fill="${rnd(i)>.5?"#1f4a36":"#24573f"}"/>`; }
  }
  for (let i=0;i<mid;i++){ const bw=20+rnd(i*23)*18, x=(i/mid)*W+rnd(i*29)*12, bh=22+rnd(i*31)*Math.min(95, 20+earned/220);
    s += `<rect x="${x.toFixed(1)}" y="${(g-12-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="#20244f" opacity=".95"/>`;
    if (rnd(i*7)>.5) s += `<rect x="${(x+bw*.3).toFixed(1)}" y="${(g-12-bh-5).toFixed(1)}" width="2" height="5" fill="#2b3066"/>`; }
  s += `<rect x="0" y="${g}" width="${W}" height="${H-g}" fill="#12142e"/><line x1="0" y1="${g}" x2="${W}" y2="${g}" stroke="#3a3f80" stroke-width="1.5"/>`;

  for (let i=0;i<LOTS;i++){
    const x = LOT_X0 + i*LOT_W + 1, b = buildingAt(i);
    if (b && drawB[b.type]) s += drawB[b.type](x, g, i+1);
    else s += `<g opacity=".6"><animate attributeName="opacity" values=".6;.25;.6" dur="2.6s" begin="${(i*.2).toFixed(1)}s" repeatCount="indefinite"/>
        <rect x="${x+4}" y="${g-15}" width="25" height="13" rx="3" fill="none" stroke="#8c6bff" stroke-width="1" stroke-dasharray="3.5 3"/>
        <path d="M${x+16.5} ${g-12} v7 M${x+13} ${g-8.5} h7" stroke="#8c6bff" stroke-width="1.4" stroke-linecap="round"/></g>`;
  }
  if (dist===1){ // Kai und Wasser mit Booten
    s += `<rect x="0" y="${g+4}" width="${W}" height="${H-g-4}" fill="#0f2a3d"/>`;
    for (let i=0;i<3;i++) s += `<path d="M0 ${g+12+i*12} q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#2de2c2" stroke-opacity="${.18-i*.04}" fill="none"><animateTransform attributeName="transform" type="translate" values="0 0;-20 0" dur="${3+i}s" repeatCount="indefinite"/></path>`;
    const boats = Math.min(5, 1+Math.floor(earned/4000));
    for (let i=0;i<boats;i++){ const y=g+18+(i%3)*10, col=["#e6e0ff","#ffb547","#58a6ff"][i%3];
      s += `<g><path d="M0 ${y} h16 l-3 4 h-10 Z" fill="${col}"/><path d="M8 ${y-1} V${y-12} L15 ${y-2} Z" fill="#e6e0ff" opacity=".85"/>
        <animateTransform attributeName="transform" type="translate" from="${i%2?W+20:-20} 0" to="${i%2?-20:W+20} 0" dur="${(22+rnd(i*7)*14).toFixed(1)}s" begin="-${(rnd(i*9)*20).toFixed(1)}s" repeatCount="indefinite"/></g>`; }
  } else {
  s += `<rect x="0" y="${g+8}" width="${W}" height="11" fill="${dist===2?"#1d2a24":"#1a1c3d"}"/>`;
  if (dist===0) for (let i=0;i<14;i++) s += `<rect x="${i*32+6}" y="${g+13}" width="15" height="1.4" fill="#454a8c" opacity=".8"/>`;
  const cars = dist===2 ? Math.min(5, 1+Math.floor(earned/3000)) : Math.min(9, 1+Math.floor(earned/1200));
  if (dist===2) for (let i=0;i<cars;i++){ // Radfahrer
    s += `<g><circle cx="2" cy="${g+15}" r="2.2" fill="none" stroke="#2de2c2" stroke-width=".9"/><circle cx="9" cy="${g+15}" r="2.2" fill="none" stroke="#2de2c2" stroke-width=".9"/><path d="M2 ${g+15} L5 ${g+11} L9 ${g+15} M5 ${g+11} L6 ${g+8}" stroke="#e6e0ff" stroke-width=".9" fill="none"/><circle cx="6" cy="${g+7}" r="1.2" fill="#e6e0ff"/>
      <animateTransform attributeName="transform" type="translate" from="-14 0" to="${W+10} 0" dur="${(14+rnd(i*23)*8).toFixed(1)}s" begin="-${(rnd(i*29)*12).toFixed(1)}s" repeatCount="indefinite"/></g>`; }
  else for (let i=0;i<cars;i++){ const col=["#58a6ff","#ffb547","#ff4f7b","#2de2c2"][i%4];
    s += `<g><rect x="0" y="${g+9.5}" width="9.5" height="4.6" rx="1.6" fill="${col}"/><circle cx="2.4" cy="${g+14.4}" r="1.2" fill="#0d0b14"/><circle cx="7.2" cy="${g+14.4}" r="1.2" fill="#0d0b14"/>
      <animateTransform attributeName="transform" type="translate" from="-14 0" to="${W+10} 0" dur="${(6+rnd(i*23)*6).toFixed(1)}s" begin="-${(rnd(i*29)*6).toFixed(1)}s" repeatCount="indefinite"/></g>`; }
  }
  if (earned>=2800 && dist===0) s += `<g><rect x="0" y="${g-1}" width="32" height="9" rx="2" fill="#8c6bff"/><rect x="3" y="${g+1}" width="5" height="3.4" fill="#fff3d6" opacity=".9"/><rect x="10" y="${g+1}" width="5" height="3.4" fill="#fff3d6" opacity=".9"/><rect x="17" y="${g+1}" width="5" height="3.4" fill="#fff3d6" opacity=".9"/>
    <animateTransform attributeName="transform" type="translate" from="-34 0" to="${W+12} 0" dur="12s" repeatCount="indefinite"/></g>`;
  if (earned>=13000) s += `<g><path d="M0 0 L14 0 L18 -2 L14 2 L0 2 Z M6 0 L3 -5 L8 0 M6 2 L3 6 L8 2" fill="#e6e0ff"/><circle cx="17" cy="0" r="1" fill="#ff4f7b"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></circle>
    <animateMotion path="M -24 60 Q ${W/2} 34 ${W+24} 52" dur="15s" repeatCount="indefinite"/></g>`;
  if (earned>=26000) s += `<g><rect x="-3" y="-2" width="6" height="4" fill="#cfc4f2"/><rect x="-11" y="-1.5" width="7" height="3" fill="#58a6ff"/><rect x="4" y="-1.5" width="7" height="3" fill="#58a6ff"/>
    <animateMotion path="M ${W+20} 22 L -20 30" dur="20s" repeatCount="indefinite"/></g>`;
  for (let i=0;i<LOTS;i++){ const x = LOT_X0 + i*LOT_W + 1;
    s += `<rect data-lotidx="${i}" x="${x}" y="${g-100}" width="${LOT_W-2}" height="112" fill="transparent" style="cursor:pointer"/>`; }
  const box = $("cityCanvas");
  box.innerHTML = s;
  box.querySelectorAll("[data-lotidx]").forEach(el=>el.addEventListener("click", ()=>{
    const lot = +el.dataset.lotidx, b = buildingAt(lot);
    if (b) openInfoSheet(lot, b); else openBuildSheet(lot);
  }));
}
/* Zusatzgebäude */
Object.assign(drawB, {
  markt(x,g){ let w="";
    for (let c=0;c<5;c++) w += `<rect x="${x+4+c*5.2}" y="${g-14}" width="3.6" height="7" fill="#fff3d6" opacity="${(.55+rnd(c+x)*.4).toFixed(2)}"/>`;
    let st=""; for (let c=0;c<7;c++) st += `<rect x="${x+2+c*4.2}" y="${g-20}" width="4.2" height="3" fill="${c%2?"#ff4f7b":"#f4f2f9"}"/>`;
    return `<rect x="${x+1}" y="${g-20}" width="31" height="20" fill="#2a2f63" stroke="#3f4590" stroke-width=".6"/>
      <path d="M${x} ${g-20} Q${x+16.5} ${g-38} ${x+33} ${g-20} Z" fill="#363c7a" stroke="#4a51a0" stroke-width=".6"/>
      <path d="M${x+8} ${g-22} Q${x+16.5} ${g-32} ${x+25} ${g-22}" stroke="#58a6ff" stroke-opacity=".6" fill="none"/>${st}${w}
      <rect x="${x+14}" y="${g-6}" width="5" height="6" fill="#14162e"/>`; },
  leucht(x,g){ return `
    <polygon points="${x+12},${g} ${x+21},${g} ${x+19},${g-50} ${x+14},${g-50}" fill="#f4f2f9"/>
    <polygon points="${x+12.6},${g-12} ${x+20.4},${g-12} ${x+20},${g-22} ${x+13},${g-22}" fill="#ff4f7b"/>
    <polygon points="${x+13.4},${g-32} ${x+19.6},${g-32} ${x+19.3},${g-41} ${x+13.7},${g-41}" fill="#ff4f7b"/>
    <rect x="${x+13}" y="${g-56}" width="7" height="6" fill="#ffe9a8"/><path d="M${x+12} ${g-56} L${x+16.5} ${g-61} L${x+21} ${g-56} Z" fill="#ff4f7b"/>
    <g transform="translate(${x+16.5} ${g-53})"><path d="M0 0 L70 -9 L70 9 Z" fill="#ffe9a8" opacity=".22"><animateTransform attributeName="transform" type="rotate" values="-40;40;-40" dur="7s" repeatCount="indefinite"/></path></g>
    <circle cx="${x+16.5}" cy="${g-53}" r="2.4" fill="#fff8d6"><animate attributeName="opacity" values="1;.5;1" dur="1.6s" repeatCount="indefinite"/></circle>`; },
  rad(x,g){ const cx=x+16.5, cy=g-33, r=15; let sp="", gd="";
    for (let k=0;k<8;k++){ const a=k*Math.PI/4, ex=(cx+r*Math.cos(a)).toFixed(1), ey=(cy+r*Math.sin(a)).toFixed(1);
      sp += `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="#8c6bff" stroke-width=".7"/>`;
      gd += `<rect x="${(ex-2).toFixed(1)}" y="${(+ey).toFixed(1)}" width="4" height="3.4" rx="1" fill="${["#ffb547","#2de2c2","#ff4f7b","#58a6ff"][k%4]}"/>`; }
    return `<path d="M${cx} ${cy} L${x+7} ${g} M${cx} ${cy} L${x+26} ${g}" stroke="#3f4590" stroke-width="2"/>
      <g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#b3a0ff" stroke-width="1.2"/><circle cx="${cx}" cy="${cy}" r="${r-4}" fill="none" stroke="#8c6bff" stroke-width=".5" opacity=".6"/>${sp}${gd}
        <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="40s" repeatCount="indefinite"/></g>
      <circle cx="${cx}" cy="${cy}" r="2" fill="#f4f2f9"/>`; },
});

/* ---------- Bauen ---------- */
bindSheet("cityOverlay","citySheetClose");
function openBuildSheet(lot){
  pendingLot = lot;
  const earned = earnedBP(), avail = availableBP(), ti = tierFor(earned);
  $("citySheetTitle").textContent = districts[activeDistrict].name + ", Grundstück " + (lot+1);
  $("citySheetBody").innerHTML = `<p class="muted small">Du hast <b style="color:var(--amber)">${avail.toLocaleString("de-DE")} Baupunkte</b>. Deine Stufe: ${cityTiers[ti].name}.</p>
    <div class="build-grid">${buildCatalog.filter(t=>t.only==null || t.only===activeDistrict).map(t=>{
      const lockedTier = ti < t.tier, lockedCost = avail < t.cost;
      const lockLab = lockedTier ? "ab Stufe " + cityTiers[t.tier].name : lockedCost ? "noch " + (t.cost-avail).toLocaleString("de-DE") + " BP" : "";
      const eff = [t.pop?`+${t.pop} Einwohner`:"", t.joy?`${t.joy>0?"+":"−"}${Math.abs(t.joy)} Stimmung`:""].filter(Boolean).join(", ");
      return `<button class="bitem ${(lockedTier||lockedCost)?"locked":""}" data-build="${t.id}">
        <span class="chip-ic ${t.color}">${icon(lockedTier?"lock":t.ico)}</span><span class="bn">${t.name}</span>
        <span class="bc">${t.cost.toLocaleString("de-DE")} BP</span><span class="be">${lockLab || eff}</span></button>`; }).join("")}</div>`;
  $("citySheetBody").querySelectorAll("[data-build]").forEach(el=>el.addEventListener("click", ()=>buildOnLot(el.dataset.build)));
  openSheet("cityOverlay");
}
function buildOnLot(typeId){
  const t = buildCatalog.find(x=>x.id===typeId);
  if (!t || pendingLot==null || availableBP() < t.cost || buildingAt(pendingLot)) return;
  city.spent += t.cost;
  city.buildings.push({ lot: pendingLot, d: activeDistrict, type: t.id, ts: Date.now() });
  saveCityData(); closeSheet("cityOverlay"); pendingLot = null;
  toast(t.name + " gebaut", t.ico);
  if (updateUnlocks(false)) setTimeout(()=>toast("Neuer Bezirk freigeschaltet: " + districts[city.unlocked].name, districts[city.unlocked].ico), 3300);
  renderCity(); refreshGame();
}
function openInfoSheet(lot, b){
  const t = buildCatalog.find(x=>x.id===b.type); if (!t) return;
  const refund = Math.floor(t.cost/2);
  $("citySheetTitle").textContent = "Grundstück " + (lot+1);
  $("citySheetBody").innerHTML = `<div class="sheet-info"><span class="chip-ic ${t.color}">${icon(t.ico)}</span><h3>${t.name}</h3>
      <p>${t.d}</p><p>${[t.pop?`+${t.pop} Einwohner`:"", t.joy?`${t.joy>0?"+":"−"}${Math.abs(t.joy)} Stimmung`:""].filter(Boolean).join(", ")}</p></div>
    <div class="sheet-actions"><button class="btn btn-danger" id="demolishBtn">Abreißen, ${refund.toLocaleString("de-DE")} BP zurück</button>
      <button class="btn btn-ghost" id="infoCloseBtn">Schließen</button></div>`;
  $("demolishBtn").addEventListener("click", ()=>{
    city.buildings = city.buildings.filter(x=>!(x.lot===lot && x.d===activeDistrict));
    city.spent = Math.max(0, city.spent - refund);
    saveCityData(); closeSheet("cityOverlay");
    toast("Abgerissen, " + refund.toLocaleString("de-DE") + " Baupunkte zurück", "hammer");
    renderCity(); refreshGame();
  });
  $("infoCloseBtn").addEventListener("click", ()=>closeSheet("cityOverlay"));
  openSheet("cityOverlay");
}
function checkCityMilestone(ti){
  const seen = store.get("rf:cityseen") || { tier:-1 };
  if (ti > seen.tier){
    store.set("rf:cityseen", { tier: ti });
    if (seen.tier >= 0) toast("Neue Stufe: " + cityTiers[ti].name, "building");
  }
}
$("cityRename").addEventListener("click", ()=>{
  const n = prompt("Wie soll deine Stadt heißen?", city.name);
  if (n && n.trim()){ city.name = n.trim().slice(0,28); saveCityData(); renderCity(); }
});
