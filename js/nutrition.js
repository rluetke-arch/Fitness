/* Ernährung: Kalorienbudget, Mahlzeiten, Foto-Erkennung, Gewicht */
"use strict";

// Nährwerte pro 100 g: [Name, kcal, Protein, Kohlenhydrate, Fett] — Durchschnittswerte
const foodDB = [
["Apfel",52,0.3,14,0.2],["Banane",89,1.1,23,0.3],["Birne",57,0.4,15,0.1],["Orange",47,0.9,12,0.1],
["Erdbeeren",32,0.7,8,0.3],["Weintrauben",69,0.7,18,0.2],["Mischbrot",244,7.6,49,1.2],["Vollkornbrot",203,7,38,1.7],
["Brötchen",276,9,55,2],["Croissant",406,8,45,21],["Toastbrot",264,8,49,3.5],["Butter",741,0.7,0.6,83],
["Margarine",709,0.2,0.4,80],["Marmelade",250,0.4,60,0.1],["Honig",304,0.4,82,0],["Nuss-Nougat-Creme",539,6,57,31],
["Gouda",356,25,0,28],["Emmentaler",382,29,0,30],["Frischkäse",253,6,3,24],["Mozzarella",253,18,1,19],
["Salami",336,20,1,28],["Kochschinken",110,20,1,3],["Leberwurst",327,12,1,30],["Ei (1 St. ≈ 60 g)",155,13,1.1,11],
["Haferflocken",372,13,59,7],["Müsli",380,9,64,8],["Cornflakes",357,7,84,0.6],["Milch 3,5%",64,3.4,4.8,3.6],
["Milch 1,5%",47,3.4,4.9,1.5],["Joghurt natur",62,4,4.7,3.5],["Griechischer Joghurt",115,6,4,9],["Magerquark",67,12,4,0.2],
["Skyr",63,11,4,0.2],["Reis (gekocht)",130,2.7,28,0.3],["Nudeln (gekocht)",158,5.8,31,0.9],["Kartoffeln (gekocht)",70,1.9,15,0.1],
["Pommes",312,3.4,41,15],["Kartoffelpüree",92,2,14,3],["Pizza Salami",268,11,26,13],["Döner",215,12,16,11],
["Bratwurst",297,13,2,27],["Wiener Würstchen",300,12,1,28],["Schnitzel (paniert)",230,17,12,12],["Hähnchenbrust (gebraten)",165,31,0,3.6],
["Hähnchenschenkel",216,26,0,12],["Rindersteak",195,29,0,8],["Hackfleisch (gebraten)",250,26,0,16],["Lachs",208,20,0,13],
["Thunfisch (Dose, Wasser)",110,25,0,1],["Fischstäbchen",210,13,17,10],["Garnelen",92,20,0,1],["Tofu",76,8,2,4],
["Linsen (gekocht)",116,9,20,0.4],["Kichererbsen (gekocht)",139,7,22,2.6],["Erbsen",81,5,14,0.4],["Mais",86,3,19,1.2],
["Tomate",18,0.9,3.9,0.2],["Gurke",12,0.6,2.2,0.1],["Paprika",21,1,4.7,0.3],["Karotte",41,0.9,10,0.2],
["Brokkoli",34,2.8,7,0.4],["Blumenkohl",25,1.9,5,0.3],["Spinat",23,2.9,3.6,0.4],["Blattsalat",15,1.4,2.9,0.2],
["Avocado",160,2,9,15],["Zwiebel",40,1.1,9,0.1],["Champignons",22,3.1,3.3,0.3],["Olivenöl",884,0,0,100],
["Sahne",292,2.3,3.2,30],["Ketchup",112,1.2,26,0.2],["Mayonnaise",680,1,2,75],["Hummus",250,8,14,18],
["Chips",536,7,50,34],["Salzstangen",380,10,78,3],["Vollmilchschokolade",535,7,59,30],["Zartbitterschokolade",505,5,46,31],
["Gummibärchen",343,7,77,0.2],["Butterkekse",470,7,72,17],["Rührkuchen",390,5,50,19],["Apfelkuchen",240,3,35,10],
["Vanilleeis",207,3.5,24,11],["Milchreis",120,3.5,21,2.5],["Pudding",120,3,20,3],["Müsliriegel",420,7,62,15],
["Nüsse (gemischt)",620,17,10,54],["Erdnüsse",599,26,8,49],["Mandeln",589,21,6,53],["Cola",42,0,10.6,0],
["Limonade",40,0,10,0],["Apfelsaft",46,0.1,11,0.1],["Orangensaft",45,0.7,10,0.1],["Apfelschorle",25,0,6,0],
["Alkoholfreies Bier",25,0.4,5.3,0],["Cappuccino",30,1.6,2.5,1.5],["Latte Macchiato",45,2.2,3.9,2.2],["Proteinshake (Wasser)",80,16,3,1],
];

const MEAL_XP = 5, MEAL_XP_PER_DAY = 6;
const mealIcons = { "Frühstück":"sunrise", "Mittagessen":"sun", "Abendessen":"moon", "Snack":"cookie" };
let meals = {}, activeMealType = defaultMealType();

function defaultMealType(){ const h = new Date().getHours(); return h<10 ? "Frühstück" : h<15 ? "Mittagessen" : h<21 ? "Abendessen" : "Snack"; }
function loadMeals(){ meals = store.get("rf:meals") || {}; }
function saveMeals(){ store.set("rf:meals", meals); }
function todayMealList(){ return meals[todayKey()] || []; }

function kcalBudget(){
  const manual = parseFloat($("nutriTarget").value);
  if (manual > 0) return Math.round(manual);
  const tdee = computeTDEE();
  return tdee ? tdee + nutriGoalAdj : null;
}

function addMeal(entry){
  const k = todayKey();
  if (!meals[k]) meals[k] = [];
  const countBefore = meals[k].length;
  meals[k].push({ id: Date.now()+"-"+Math.floor(Math.random()*999), time: new Date().toTimeString().slice(0,5), type: activeMealType, ...entry });
  saveMeals();
  if (countBefore < MEAL_XP_PER_DAY){ addXp(MEAL_XP, "Mahlzeit"); flashMsg("nuMsg", entry.name + " hinzugefügt, +" + MEAL_XP + " XP"); }
  else flashMsg("nuMsg", entry.name + " hinzugefügt");
  renderNutrition(); onDataChanged();
}

function renderNutrition(){
  const list = todayMealList();
  const eaten = list.reduce((a,m)=>a+(m.kcal||0),0);
  const P = list.reduce((a,m)=>a+(m.p||0),0), C = list.reduce((a,m)=>a+(m.c||0),0), F = list.reduce((a,m)=>a+(m.f||0),0);
  const budget = kcalBudget();
  const ring = $("nuRing"), remainEl = $("nuRemain");
  if (budget){
    const remain = budget - eaten, pct = Math.min(1, eaten/budget);
    ring.style.strokeDashoffset = 251.3 * (1 - pct);
    ring.setAttribute("stroke", eaten>budget ? "#ff4f7b" : pct>0.85 ? "#ffb547" : "#2de2c2");
    remainEl.textContent = Math.round(Math.abs(remain)).toLocaleString("de-DE");
    $("nuHeadline").textContent = remain>=0 ? "übrig für heute" : "über dem Budget";
    const goalLab = parseFloat($("nutriTarget").value) ? "eigenes Budget" : nutriGoalAdj<0 ? "abnehmen" : nutriGoalAdj>0 ? "zunehmen" : "Gewicht halten";
    $("nuSub").textContent = `${Math.round(eaten).toLocaleString("de-DE")} von ${budget.toLocaleString("de-DE")} kcal, Ziel: ${goalLab}`;
  } else {
    ring.style.strokeDashoffset = 251.3;
    remainEl.textContent = Math.round(eaten).toLocaleString("de-DE");
    $("nuHeadline").textContent = "heute gegessen";
    $("nuSub").textContent = "Für ein Tagesbudget brauche ich Gewicht, Größe, Alter und Geschlecht in den Einstellungen.";
  }
  $("nuMacros").innerHTML = [["Protein", P, "#58a6ff", 120], ["Kohlenhydrate", C, "#ffb547", 250], ["Fett", F, "#ff4f7b", 80]]
    .map(([lab,v,col,ref])=>`<div class="nu-macro"><div class="m-lab">${lab}</div><div class="m-val">${Math.round(v)} g</div>
      <div class="m-bar"><div class="m-fill" style="width:${Math.min(100,v/ref*100)}%;background:${col}"></div></div></div>`).join("");

  const box = $("mealList");
  box.innerHTML = list.length ? [...list].reverse().map(m=>`
    <div class="row"><span class="r-ic">${icon(mealIcons[m.type]||"utensils")}</span>
      <span class="r-main"><b>${escapeHtml(m.name)}</b><small>${m.time}, ${m.type}${m.grams?`, ${Math.round(m.grams)} g`:""}${m.p!=null?`, P ${Math.round(m.p)} · K ${Math.round(m.c)} · F ${Math.round(m.f)}`:""}</small></span>
      <span class="r-val">${Math.round(m.kcal)}<small>kcal</small></span>
      <button class="del" data-id="${m.id}" aria-label="Mahlzeit löschen">${icon("trash")}</button></div>`).join("")
    : '<p class="empty">Heute noch nichts eingetragen.</p>';
  box.querySelectorAll(".del").forEach(b=>b.addEventListener("click",()=>{
    const k=todayKey(); meals[k]=(meals[k]||[]).filter(m=>m.id!==b.dataset.id); saveMeals(); renderNutrition(); onDataChanged();
  }));
  renderRecentFoods();
  renderNuWeek(budget);
}

// Zuletzt gegessen: ein Tipp trägt die Mahlzeit erneut ein
function recentFoods(){
  const seen = new Map();
  Object.keys(meals).sort().reverse().forEach(k=>{
    [...meals[k]].reverse().forEach(m=>{ const key=m.name.toLowerCase(); if (!seen.has(key)) seen.set(key, m); });
  });
  return [...seen.values()].slice(0,6);
}
function renderRecentFoods(){
  const list = recentFoods(), box = $("recentFoods");
  if (!list.length){ box.innerHTML=""; return; }
  box.innerHTML = `<div class="recent"><div class="recent-lab">Nochmal essen</div><div class="chips">${list.map((m,i)=>
    `<button class="chip" data-r="${i}">${escapeHtml(m.name)}<small>${Math.round(m.kcal)} kcal</small></button>`).join("")}</div></div>`;
  box.querySelectorAll("[data-r]").forEach(b=>b.addEventListener("click",()=>{
    const m = list[+b.dataset.r];
    addMeal({ name:m.name, grams:m.grams||null, kcal:m.kcal, p:m.p||0, c:m.c||0, f:m.f||0 });
  }));
}
function renderNuWeek(budget){
  const days = []; let maxV = budget || 2000;
  for (let i=6;i>=0;i--){
    const k = dateKeyOffset(i), sum = (meals[k]||[]).reduce((a,m)=>a+(m.kcal||0),0);
    maxV = Math.max(maxV, sum);
    days.push({ sum, lab: i===0 ? "Heute" : parseKey(k).toLocaleDateString("de-DE",{weekday:"short"}) });
  }
  $("nuWeekChart").innerHTML = `<div class="nu-week">
    ${budget?`<div class="nu-target-line" style="bottom:calc(${(budget/maxV*100).toFixed(1)}% * .8 + 22px)"></div>`:""}
    ${days.map(d=>`<div class="nu-day"><div class="nu-bar ${budget&&d.sum>budget?"over":""}" style="height:${(d.sum/maxV*80).toFixed(1)}%"></div><div class="nu-day-lab">${d.lab}</div></div>`).join("")}
  </div>`;
}

/* ---------- Erfassen ---------- */
function openNutriSheet(title, body){ $("nutriSheetTitle").textContent = title; $("nutriSheetBody").innerHTML = body; openSheet("nutriOverlay"); }
function closeNutriSheet(){ closeSheet("nutriOverlay"); }
bindSheet("nutriOverlay","nutriSheetClose");
segSet("mealTypeSeg","mt",activeMealType);
segBind("mealTypeSeg", b=>{ activeMealType = b.dataset.mt; });

$("searchBtn").addEventListener("click", ()=>{
  openNutriSheet("Lebensmittel suchen", `<input class="nu-search" id="nuQuery" placeholder="Brötchen, Reis, Banane …" autocomplete="off"><div class="nu-results" id="nuResults"></div>`);
  const q = $("nuQuery"), res = $("nuResults");
  const show = term => {
    const t = term.trim().toLowerCase();
    const hits = t ? foodDB.filter(f=>f[0].toLowerCase().includes(t)).slice(0,12) : foodDB.slice(0,12);
    res.innerHTML = hits.map(f=>`<button class="nu-res" data-n="${escapeHtml(f[0])}"><span>${f[0]}</span><span class="r-kcal">${f[1]} kcal pro 100 g</span></button>`).join("")
      || '<p class="nu-loading">Nicht in der Liste. Trag es über „Manuell" ein.</p>';
    res.querySelectorAll(".nu-res").forEach(el=>el.addEventListener("click",()=>{ const f = foodDB.find(x=>x[0]===el.dataset.n); if (f) openPortionSheet(f); }));
  };
  q.addEventListener("input", ()=>show(q.value)); show(""); setTimeout(()=>q.focus(), 50);
});
function openPortionSheet(f){
  openNutriSheet(f[0], `
    <label class="field"><span>Menge in g oder ml</span><input class="nu-search" id="nuGrams" type="number" inputmode="numeric" value="100" min="1"></label>
    <div class="chips">${[50,100,150,200,250,330].map(g=>`<button class="chip" data-g="${g}">${g} g</button>`).join("")}</div>
    <p class="muted small" id="nuPreview" style="margin-top:14px"></p>
    <div class="sheet-actions"><button class="btn btn-primary" id="nuAddConfirm">Hinzufügen</button></div>`);
  const gEl = $("nuGrams"), prev = $("nuPreview");
  const upd = ()=>{ const g=parseFloat(gEl.value)||0;
    prev.innerHTML = `<b style="color:var(--ink)">${Math.round(f[1]*g/100)} kcal</b>, Protein ${fmtN(f[2]*g/100,1)} g, Kohlenhydrate ${fmtN(f[3]*g/100,1)} g, Fett ${fmtN(f[4]*g/100,1)} g`; };
  gEl.addEventListener("input", upd); upd();
  $("nutriSheetBody").querySelectorAll(".chip").forEach(c=>c.addEventListener("click",()=>{ gEl.value=c.dataset.g; upd(); }));
  $("nuAddConfirm").addEventListener("click", ()=>{
    const g = parseFloat(gEl.value)||0; if (g<=0) return;
    addMeal({ name:f[0], grams:g, kcal:f[1]*g/100, p:f[2]*g/100, c:f[3]*g/100, f:f[4]*g/100 });
    closeNutriSheet();
  });
}
$("manualBtn").addEventListener("click", ()=>{
  openNutriSheet("Manuell eintragen", `
    <label class="field"><span>Bezeichnung</span><input class="nu-search" id="mName" placeholder="Kantinen-Lasagne"></label>
    <div class="grid2">
      <label class="field"><span>kcal</span><input class="nu-search" id="mKcal" type="number" min="0" inputmode="numeric"></label>
      <label class="field"><span>Protein in g</span><input class="nu-search" id="mP" type="number" min="0" inputmode="decimal"></label>
      <label class="field"><span>Kohlenhydrate in g</span><input class="nu-search" id="mC" type="number" min="0" inputmode="decimal"></label>
      <label class="field"><span>Fett in g</span><input class="nu-search" id="mF" type="number" min="0" inputmode="decimal"></label>
    </div>
    <div class="sheet-actions"><button class="btn btn-primary" id="mAdd">Hinzufügen</button></div>`);
  $("mAdd").addEventListener("click", ()=>{
    const name = $("mName").value.trim(), kcal = parseFloat($("mKcal").value);
    if (!name || !(kcal>=0)) return;
    addMeal({ name, kcal, p:parseFloat($("mP").value)||0, c:parseFloat($("mC").value)||0, f:parseFloat($("mF").value)||0 });
    closeNutriSheet();
  });
});

/* ---------- Foto-Erkennung ---------- */
function apiKey(){ try { return (localStorage.getItem("rf:apikey")||"").trim(); } catch(e){ return ""; } }
$("photoBtn").addEventListener("click", ()=>{
  if (!apiKey()){
    openNutriSheet("Foto-Erkennung", anItem("key", "Dafür brauchst du einen eigenen Anthropic-API-Schlüssel von console.anthropic.com. Trag ihn unter Mehr, Einstellungen, Foto-Erkennung ein.")
      + `<div class="sheet-actions"><button class="btn btn-ghost" id="nuKeyClose">Verstanden</button></div>`);
    $("nuKeyClose").onclick = closeNutriSheet; return;
  }
  $("photoInput").value = ""; $("photoInput").click();
});
$("photoInput").addEventListener("change", async e=>{
  const file = e.target.files && e.target.files[0]; if (!file) return;
  openNutriSheet("Erkenne Mahlzeit", `<div class="nu-loading"><span class="spin"></span><p style="margin-top:14px">Das Foto wird ausgewertet …</p></div>`);
  try { openPhotoConfirm(await recognizeFood(await downscaleImage(file, 1024))); }
  catch(err){
    openNutriSheet("Foto-Erkennung", anItem("triangle-alert", `Die Erkennung hat nicht geklappt: ${escapeHtml(err.message||"unbekannter Fehler")}. Prüf Schlüssel und Internetverbindung oder trag die Mahlzeit über Suchen oder Manuell ein.`, "warn")
      + `<div class="sheet-actions"><button class="btn btn-ghost" id="nuErrClose">Schließen</button></div>`);
    $("nuErrClose").onclick = closeNutriSheet;
  }
});
function downscaleImage(file, maxPx){
  return new Promise((res, rej)=>{
    const img = new Image();
    img.onload = ()=>{
      const scale = Math.min(1, maxPx/Math.max(img.width, img.height)), cv = document.createElement("canvas");
      cv.width = Math.round(img.width*scale); cv.height = Math.round(img.height*scale);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      res(cv.toDataURL("image/jpeg", 0.8).split(",")[1]);
    };
    img.onerror = ()=>rej(new Error("Bild konnte nicht gelesen werden"));
    img.src = URL.createObjectURL(file);
  });
}
async function recognizeFood(b64){
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type":"application/json", "x-api-key":apiKey(), "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 400,
      messages: [{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:b64 } },
        { type:"text", text:"Erkenne das Gericht oder Lebensmittel auf dem Foto und schätze die sichtbare Portion. Antworte NUR mit JSON, ohne Markdown: {\"name\":\"…\",\"portion_g\":Zahl,\"kcal\":Zahl,\"protein_g\":Zahl,\"kohlenhydrate_g\":Zahl,\"fett_g\":Zahl}. Schätze konservativ." }
      ]}]
    })
  });
  if (!resp.ok) throw new Error("API-Fehler " + resp.status + (resp.status===401?", Schlüssel ungültig":resp.status===429?", Limit erreicht":""));
  const data = await resp.json();
  const txt = (data.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("");
  const j = JSON.parse(txt.replace(/```json|```/g,"").trim());
  if (!j.name || j.kcal==null) throw new Error("Antwort unvollständig");
  return j;
}
function openPhotoConfirm(j){
  openNutriSheet("Erkannt, bitte prüfen", `
    <label class="field"><span>Gericht</span><input class="nu-search" id="pName" value="${escapeHtml(String(j.name))}"></label>
    <div class="grid2">
      <label class="field"><span>Portion in g</span><input class="nu-search" id="pG" type="number" value="${Math.round(j.portion_g||0)}"></label>
      <label class="field"><span>kcal</span><input class="nu-search" id="pKcal" type="number" value="${Math.round(j.kcal)}"></label>
      <label class="field"><span>Protein in g</span><input class="nu-search" id="pP" type="number" value="${Math.round(j.protein_g||0)}"></label>
      <label class="field"><span>Kohlenhydrate in g</span><input class="nu-search" id="pC" type="number" value="${Math.round(j.kohlenhydrate_g||0)}"></label>
      <label class="field"><span>Fett in g</span><input class="nu-search" id="pF" type="number" value="${Math.round(j.fett_g||0)}"></label>
    </div>
    <div class="sheet-actions"><button class="btn btn-primary" id="pAdd">Hinzufügen</button></div>`);
  $("pAdd").addEventListener("click", ()=>{
    const name = $("pName").value.trim(); if (!name) return;
    addMeal({ name, grams: parseFloat($("pG").value)||null, kcal: parseFloat($("pKcal").value)||0,
      p: parseFloat($("pP").value)||0, c: parseFloat($("pC").value)||0, f: parseFloat($("pF").value)||0, ki:true });
    closeNutriSheet();
  });
}
function initNutriGoal(){
  segSet("nutriGoalSeg","goal",nutriGoalAdj);
  segBind("nutriGoalSeg", b=>{ nutriGoalAdj = parseFloat(b.dataset.goal); saveConfig(); renderNutrition(); });
  $("nutriTarget").addEventListener("input", ()=>{ saveConfig(); renderNutrition(); });
  const keyEl = $("aiKey");
  keyEl.value = apiKey();
  keyEl.addEventListener("input", ()=>{ try { localStorage.setItem("rf:apikey", keyEl.value.trim()); } catch(e){} });
}

/* ---------- Gewicht ---------- */
let weights = {};   // { "YYYY-MM-DD": kg }
const WEIGH_XP = 10;
function loadWeights(){ weights = store.get("rf:weights") || {}; }
function saveWeights(){ store.set("rf:weights", weights); }
function sortedWeights(){ return Object.entries(weights).map(([date,kg])=>({date,kg})).sort((a,b)=>a.date.localeCompare(b.date)); }

$("wSave").addEventListener("click", ()=>{
  const kg = parseFloat(String($("wInput").value).replace(",",".")), date = $("wDate").value;
  if (!date) return flashMsg("wMsg","Wähl ein Datum.", true);
  if (!kg || kg<=0) return flashMsg("wMsg","Trag dein Gewicht ein.", true);
  const isNew = weights[date] === undefined;
  weights[date] = Math.round(kg*10)/10; saveWeights();
  const latest = sortedWeights().slice(-1)[0];
  if (latest){ weightEl.value = latest.kg; saveConfig(); renderBodyStats(); }
  $("wInput").value = "";
  if (isNew){ addXp(WEIGH_XP, "Wiegen"); flashMsg("wMsg","Gespeichert, +"+WEIGH_XP+" XP. Körperdaten aktualisiert."); }
  else flashMsg("wMsg","Aktualisiert");
  renderWeight(); renderNutrition(); onDataChanged();
});
function weightNearest(entries, targetDate){
  let best=null, bestDiff=Infinity; const t = parseKey(targetDate).getTime();
  for (const e of entries){ const diff=Math.abs(parseKey(e.date).getTime()-t); if (diff<bestDiff){ bestDiff=diff; best=e; } }
  return best;
}
function renderWeight(){
  const entries = sortedWeights(), stats = $("wStats"), chart = $("wChart");
  if (!entries.length){ stats.innerHTML=""; chart.innerHTML='<div class="chart-empty">Noch keine Wiegung eingetragen.</div>'; return; }
  const latest = entries[entries.length-1], dTotal = latest.kg - entries[0].kg;
  const near7 = entries.length>=2 ? weightNearest(entries.slice(0,-1), dateKeyOffset(7)) : null;
  const d7 = near7 ? latest.kg - near7.kg : null;
  const b = bmiValue(), cat = b!=null ? bmiCat(b) : null;
  const sign = v => (v>0?"+":v<0?"−":"") + fmtN(Math.abs(v),1);
  stats.innerHTML = [
    `<div class="vi-sum"><div class="lab">Aktuell</div><div class="val">${fmtN(latest.kg,1)} kg</div><div class="delta flat">${fmtShortDate(latest.date)}</div></div>`,
    `<div class="vi-sum"><div class="lab">Seit Beginn</div><div class="val">${sign(dTotal)} kg</div><div class="delta ${dTotal<-0.2?"good":dTotal>0.2?"up":"flat"}">${dTotal<-0.2?"abgenommen":dTotal>0.2?"zugenommen":"stabil"}</div></div>`,
    d7!=null ? `<div class="vi-sum"><div class="lab">Seit etwa 7 Tagen</div><div class="val">${sign(d7)} kg</div><div class="delta ${d7<-0.1?"good":d7>0.1?"up":"flat"}">Wochentrend</div></div>` : "",
    cat ? `<div class="vi-sum"><div class="lab">BMI</div><div class="val">${fmtN(b,1)}</div><div class="delta ${cat.tone==="good"?"good":"flat"}">${cat.label}</div></div>` : "",
  ].join("");
  renderWChart(entries);
}
function renderWChart(entries){
  const W=720,H=220,padL=40,padR=10,padT=14,padB=28, iW=W-padL-padR, iH=H-padT-padB, n=entries.length;
  const vals = entries.map(e=>e.kg);
  let yMin=Math.floor(Math.min(...vals)-1), yMax=Math.ceil(Math.max(...vals)+1);
  if (yMax-yMin<4){ yMin-=1; yMax+=1; }
  const xFor=i=>padL+(n===1?iW/2:(i/(n-1))*iW), yFor=v=>padT+iH-((v-yMin)/(yMax-yMin))*iH;
  let s="";
  for (let i=0;i<=4;i++){ const v=yMin+(yMax-yMin)*(i/4), y=yFor(v);
    s+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="rgba(255,255,255,.06)"/><text x="${padL-8}" y="${y+4}" fill="#6c6880" font-size="11" text-anchor="end">${fmtN(v,0)}</text>`; }
  const everyN=Math.ceil(n/6);
  entries.forEach((e,i)=>{ if (i%everyN!==0 && i!==n-1) return; s+=`<text x="${xFor(i)}" y="${H-6}" fill="#6c6880" font-size="11" text-anchor="middle">${fmtShortDate(e.date)}</text>`; });
  const pts = entries.map((e,i)=>[xFor(i).toFixed(1), yFor(e.kg).toFixed(1)]);
  s += `<path d="M${pts[0][0]},${padT+iH} ${pts.map(p=>"L"+p[0]+","+p[1]).join(" ")} L${pts[n-1][0]},${padT+iH} Z" fill="rgba(45,226,194,.1)"/>`;
  s += `<path d="${pts.map((p,i)=>(i?"L":"M")+p[0]+","+p[1]).join(" ")}" fill="none" stroke="#2de2c2" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  pts.forEach(p=>{ s+=`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#181622" stroke="#2de2c2" stroke-width="2"/>`; });
  if (n>=3){ const r=linReg(vals);
    s+=`<line x1="${xFor(0)}" y1="${yFor(r.inter)}" x2="${xFor(n-1)}" y2="${yFor(r.slope*(n-1)+r.inter)}" stroke="#2de2c2" stroke-width="1.5" stroke-dasharray="5 5" opacity=".5"/>`; }
  $("wChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf">${s}</svg>`;
}
