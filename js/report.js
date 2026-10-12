/* Wochenrückblick (Montag bis Sonntag) */
"use strict";

function weekDates(offsetWeeks){
  const mon = new Date(); mon.setHours(12,0,0,0);
  mon.setDate(mon.getDate() - (mon.getDay()+6)%7 - 7*offsetWeeks);
  const arr = []; for (let i=0;i<7;i++){ const d = new Date(mon); d.setDate(mon.getDate()+i); arr.push(dateKey(d)); }
  return arr;
}
function buildWeekReport(off){
  const days = weekDates(off), prevDays = weekDates(off+1), inW = (arr,d)=>arr.includes(d);
  const goal = stepGoal(), stepSum = a=>a.reduce((s,k)=>s+(steps[k]||0),0);
  const wkS = sessions.filter(s=>inW(days,s.date)), pvS = sessions.filter(s=>inW(prevDays,s.date));
  const wkV = vitals.filter(v=>inW(days,v.date)), pvV = vitals.filter(v=>inW(prevDays,v.date));
  const budget = kcalBudget();
  const mealDays = days.filter(k=>(meals[k]||[]).length>0);
  const we = sortedWeights(), wIn = we.filter(e=>inW(days,e.date)), wBefore = we.filter(e=>e.date<days[0]).slice(-1)[0] || null;
  const dayCount = v=>{ if (!v) return 0; const sd = dateKey(new Date(v)); return days.filter(k=>k>=sd && k<=todayKey()).length; };
  const rfDays = dayCount(startEl.value), afDays = dayCount(alcStartEl.value);
  const sa = streakInfo().set;
  const r = {
    days, rfDays, afDays,
    stSum: stepSum(days), stPrev: stepSum(prevDays), stDays: days.filter(k=>steps[k]!=null).length, stGoalDays: days.filter(k=>(steps[k]||0)>=goal).length,
    spMins: wkS.reduce((a,s)=>a+s.mins,0), spPrev: pvS.reduce((a,s)=>a+s.mins,0), spKcal: wkS.reduce((a,s)=>a+(s.kcal||0),0),
    sysW: avgKey(wkV,"sys"), sysP: avgKey(pvV,"sys"), pulseW: avgKey(wkV,"pulse"),
    mealDays: mealDays.length, underDays: budget ? mealDays.filter(k=>meals[k].reduce((a,m)=>a+(m.kcal||0),0)<=budget).length : null,
    wDelta: (wIn.length && wBefore) ? wIn[wIn.length-1].kg - wBefore.kg : (wIn.length>=2 ? wIn[wIn.length-1].kg - wIn[0].kg : null),
    moneyWeek: state.dayRate*rfDays + state.alcDayRate*afDays,
    activeDays: days.filter(k=>sa.has(k)).length,
  };
  r.hasAny = r.stDays || wkS.length || wkV.length || r.mealDays || wIn.length || rfDays || afDays;
  return r;
}
bindSheet("weekOverlay","weekSheetClose");
$("weekBtn").addEventListener("click", ()=>openWeekReport(1));
function openWeekReport(off){
  const r = buildWeekReport(off);
  $("weekSheetTitle").textContent = "Woche vom " + fmtShortDate(r.days[0]) + " bis " + fmtShortDate(r.days[6]);
  let rows = "";
  if (!r.hasAny) rows = anItem("info", "Für diese Woche gibt es noch keine Einträge.");
  else {
    if (r.rfDays) rows += anItem("cigarette-off", `<b>${r.rfDays} von 7 Tagen rauchfrei</b>${r.rfDays===7?", eine volle Woche":""}`, r.rfDays===7?"good":"");
    if (r.afDays) rows += anItem("wine-off", `<b>${r.afDays} von 7 Tagen alkoholfrei</b>`, r.afDays===7?"good":"");
    if (r.moneyWeek>0) rows += anItem("piggy-bank", `Etwa <b>${fmtEuro(r.moneyWeek)}</b> nicht ausgegeben`, "good");
    rows += anItem("flame", `An <b>${r.activeDays} von 7 Tagen</b> aktiv gewesen`, r.activeDays>=5?"good":"");
    if (r.stDays) rows += anItem("footprints", `<b>${r.stSum.toLocaleString("de-DE")}</b> Schritte, Ziel an <b>${r.stGoalDays}</b> Tagen erreicht`
      + (r.stPrev>0 ? `, ${r.stSum>=r.stPrev?"+":"−"}${Math.abs(Math.round((r.stSum-r.stPrev)/r.stPrev*100))} % zur Vorwoche` : ""), r.stGoalDays>=4?"good":"");
    if (r.spMins) rows += anItem("dumbbell", `<b>${r.spMins} Minuten Training</b>${r.spKcal?`, etwa ${Math.round(r.spKcal).toLocaleString("de-DE")} kcal`:""}${r.spMins>=150?". Die WHO-Empfehlung ist erfüllt.":""}`, r.spMins>=150?"good":"");
    if (r.sysW!=null) rows += anItem("heart-pulse", `Blutdruck im Schnitt <b>${Math.round(r.sysW)}</b> systolisch${r.pulseW?`, Puls <b>${Math.round(r.pulseW)}</b>`:""}${r.sysP!=null?`, ${r.sysW<=r.sysP?"besser":"höher"} als in der Vorwoche`:""}`, r.sysP!=null && r.sysW<r.sysP?"good":"");
    if (r.mealDays && r.underDays!=null) rows += anItem("utensils", `Ernährung an <b>${r.mealDays}</b> Tagen erfasst, davon <b>${r.underDays}</b> im Budget`, r.underDays>=r.mealDays*0.7?"good":"");
    if (r.wDelta!=null) rows += anItem("scale", `Gewicht <b>${(r.wDelta>0?"+":r.wDelta<0?"−":"")+fmtN(Math.abs(r.wDelta),1)} kg</b> in dieser Woche`, r.wDelta<0?"good":"");
  }
  $("weekSheetBody").innerHTML = rows + `<p class="footnote">Geldbeträge rechnen mit deiner aktuellen Sparrate.</p>`;
  openSheet("weekOverlay");
}
function maybeShowWeekReport(){
  const prevKey = weekDates(1)[0];
  if (store.get("rf:weekseen") === prevKey) return;
  if (!buildWeekReport(1).hasAny) return;
  store.set("rf:weekseen", prevKey);
  setTimeout(()=>openWeekReport(1), 1200);
}
