/* Backup: Daten als Datei sichern und wiederherstellen */
"use strict";

function collectBackup(){
  const data = {};
  DATA_KEYS.forEach(k=>{ const v = store.get(k); if (v !== null) data[k] = v; });
  return { app:"rauchfrei", version:1, created:new Date().toISOString(), data };
}
function renderBackupMeta(){
  const last = store.get("rf:lastbackup");
  const n = vitals.length + Object.keys(steps).length + sessions.length + Object.values(meals).reduce((a,l)=>a+l.length,0) + Object.keys(weights).length;
  const ago = last ? Math.floor((Date.now()-new Date(last))/86400000) : null;
  $("backupMeta").textContent = `${n.toLocaleString("de-DE")} Einträge auf diesem Gerät. ` +
    (last ? `Letztes Backup: ${new Date(last).toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"})}.` : "Noch kein Backup erstellt.");
  $("backupHint").textContent = last ? (ago===0 ? "Letztes Backup heute" : `Letztes Backup vor ${ago} ${plural(ago,"Tag","Tagen")}`) : "Noch kein Backup erstellt";
}
$("exportBtn").addEventListener("click", async ()=>{
  const payload = JSON.stringify(collectBackup());
  const name = "rauchfrei-backup-" + todayKey() + ".json";
  const file = new File([payload], name, { type:"application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title:"Rauchfrei-Backup" });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
    }
    store.set("rf:lastbackup", new Date().toISOString());
    renderBackupMeta(); toast("Backup erstellt", "circle-check");
  } catch(e){
    if (e && e.name === "AbortError") return; // Teilen abgebrochen
    toast("Backup fehlgeschlagen", "triangle-alert");
  }
});
$("importBtn").addEventListener("click", ()=>{ $("importInput").value = ""; $("importInput").click(); });
$("importInput").addEventListener("change", async e=>{
  const f = e.target.files && e.target.files[0]; if (!f) return;
  try {
    const obj = JSON.parse(await f.text());
    if (!obj || obj.app !== "rauchfrei" || typeof obj.data !== "object") throw new Error("Das ist keine Rauchfrei-Backup-Datei.");
    const created = obj.created ? new Date(obj.created).toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"}) : "unbekannt";
    if (!confirm(`Backup vom ${created} wiederherstellen? Die aktuellen Daten auf diesem Gerät werden dabei ersetzt.`)) return;
    DATA_KEYS.forEach(k=>store.del(k));
    Object.entries(obj.data).forEach(([k,v])=>{ if (DATA_KEYS.includes(k)) store.set(k, v); });
    store.set("rf:lastbackup", new Date().toISOString());
    flashMsg("importMsg", "Wiederhergestellt. Die App lädt neu.");
    setTimeout(()=>location.reload(), 900);
  } catch(err){
    flashMsg("importMsg", err.message || "Die Datei konnte nicht gelesen werden.", true);
  }
});
