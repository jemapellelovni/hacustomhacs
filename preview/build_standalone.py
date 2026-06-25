#!/usr/bin/env python3
# Génère un fichier HTML autonome (jma-card.js inliné) ouvrable d'un double-clic.
# Icônes via la vraie police MDI chargée depuis un CDN (le navigateur de l'utilisateur y accède).
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
js = (root / "jma-card.js").read_text(encoding="utf-8")

HEAD = r"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>JMA Cards — aperçu</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css">
<style>
  html,body{margin:0;padding:0;}
  body{min-height:100vh;box-sizing:border-box;padding:90px 12px 120px;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:linear-gradient(165deg,#f7f3ea 0%,#f1ebde 55%,#ece5d6 100%);}
  ha-card{display:block;}
  ha-icon{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;}
  ha-icon .mdi{font-size:var(--mdc-icon-size,24px);line-height:1;}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:780px;margin:0 auto;}
  .grid .full{grid-column:1/-1;}
  /* barre de contrôle */
  #ctl{position:fixed;top:0;left:0;right:0;z-index:2147483600;display:flex;flex-wrap:wrap;gap:8px;
    align-items:center;padding:10px 14px;background:rgba(20,20,22,.92);backdrop-filter:blur(12px);color:#fff;}
  #ctl b{font-size:13px;margin-right:6px;opacity:.85;}
  #ctl button{border:0;border-radius:999px;padding:7px 13px;font-size:13px;font-weight:700;cursor:pointer;
    background:#3a3a3e;color:#fff;}
  #ctl button.on{background:#f8a5c2;color:#1a1a1a;}
  #ctl .sep{width:1px;height:20px;background:rgba(255,255,255,.18);margin:0 4px;}
</style>
</head>
<body>
<div id="ctl">
  <b>Alerte&nbsp;:</b>
  <button data-lvl="none" class="on">Aucune</button>
  <button data-lvl="info">Info</button>
  <button data-lvl="warning">Avertissement</button>
  <button data-lvl="critical">Critique</button>
  <button data-lvl="multi">2 alertes</button>
  <span class="sep"></span>
  <button id="popbtn">Pop-up caméra</button>
</div>
<div class="grid" id="grid"></div>

<script>
// ===================== jma-card.js (inliné) =====================
"""

TAIL = r"""
// ===================== fin jma-card.js =====================

// ---- stub ha-icon : utilise la vraie police MDI (CDN) ----
customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes(){ return ["icon"]; }
  connectedCallback(){ this._r(); }
  attributeChangedCallback(){ this._r(); }
  _r(){ const ic=(this.getAttribute("icon")||"").replace(/^mdi:/,"");
    this.innerHTML = ic ? '<span class="mdi mdi-'+ic+'"></span>' : ""; }
});

const PALETTE = { color:"#f8a5c2", accent:"#DEC198", dark:"#0a0a0b" };
const states = {
  "climate.salon":{ entity_id:"climate.salon", state:"heat",
    attributes:{ friendly_name:"Salon", current_temperature:20.5, temperature:21.5,
      hvac_action:"heating", min_temp:7, max_temp:30, target_temp_step:0.5,
      hvac_modes:["off","heat"], supported_features:1 } },
  "climate.chambre":{ entity_id:"climate.chambre", state:"off",
    attributes:{ friendly_name:"Chambre", current_temperature:18.0, temperature:17.0,
      hvac_action:"off", min_temp:7, max_temp:30, target_temp_step:0.5,
      hvac_modes:["off","heat"], supported_features:1 } },
  "cover.salon":{ entity_id:"cover.salon", state:"open",
    attributes:{ friendly_name:"Volet salon", current_position:60, supported_features:15 } },
};
const hass = {
  states, language:"fr", themes:{ darkMode:false },
  callService:(d,s,sd)=>{ console.log("callService",d,s,sd); return Promise.resolve(); },
  callWS:(msg)=>{
    if(msg && msg.type==="persistent_notification/get")
      return Promise.resolve([{ notification_id:"fenetre_cuisine", title:"Fenêtre ouverte",
        message:"📍 Cuisine — 14:03", created_at:new Date().toISOString() }]);
    return Promise.resolve([]);
  },
  connection:{ subscribeEvents:()=>Promise.resolve(()=>{}),
    subscribeMessage:()=>Promise.resolve(()=>{}), sendMessagePromise:()=>Promise.resolve({}) },
  formatEntityState:(s)=>s.state, localize:()=>"",
};
function mk(tag, config, cls){
  const el=document.createElement(tag); el.setConfig({ ...PALETTE, ...config }); el.hass=hass;
  const w=document.createElement("div"); if(cls) w.className=cls; w.appendChild(el);
  document.getElementById("grid").appendChild(w); return el;
}

window.addEventListener("DOMContentLoaded", async () => {
  await customElements.whenDefined("jma-nav-card");
  const nav = mk("jma-nav-card", { items:[
    { name:"Accueil", icon:"mdi:home", path:"/x/accueil" },
    { name:"Climat", icon:"mdi:thermometer", path:"/x/climat" },
    { name:"Agenda", icon:"mdi:calendar", path:"/x/agenda" },
    { name:"Sécurité", icon:"mdi:shield-home", path:"/x/securite" },
  ] }, "full");
  mk("jma-notify-card", { title:"Notifications", hide_empty:false }, "full");
  mk("jma-climate-tile-card", { entity:"climate.salon" });
  mk("jma-cover-tile-card", { entity:"cover.salon" });
  mk("jma-climate-tile-card", { entity:"climate.chambre" });

  const SETS = {
    none: {},
    info:    { w:{ level:"info",     title:"RAPPEL",          message:"Sortir les poubelles", icon:"" } },
    warning: { w:{ level:"warning",  title:"FENÊTRE OUVERTE", message:"Cuisine — depuis 12 min", icon:"" } },
    critical:{ w:{ level:"critical", title:"FUITE D'EAU",     message:"Machine à laver", icon:"mdi:water-alert" } },
    multi:   { a:{ level:"critical", title:"FUMÉE",  message:"Séjour", icon:"mdi:fire-alert" },
               b:{ level:"warning",  title:"PORTE",  message:"Garage ouvert depuis 20 min", icon:"" } },
  };
  function setLvl(lvl){
    window.__jmaAlerts = JSON.parse(JSON.stringify(SETS[lvl] || {}));
    nav._renderAlerts();
    document.querySelectorAll("#ctl [data-lvl]").forEach(b=>b.classList.toggle("on", b.dataset.lvl===lvl));
  }
  document.querySelectorAll("#ctl [data-lvl]").forEach(b=> b.addEventListener("click", ()=>setLvl(b.dataset.lvl)));
  document.getElementById("popbtn").addEventListener("click", ()=> nav._showPopup({
    title:"👀 Quelqu'un à la porte", message:"Personne détectée à la sonnette.", level:"warning",
    image:"https://picsum.photos/640/360", dismissable:true,
    actions:[{ label:"Allumer l'entrée", icon:"mdi:lightbulb-on", primary:true, close:true },
             { label:"Ignorer", icon:"mdi:close", close:true }] }));
  setLvl("none");
});
</script>
</body>
</html>
"""

out = root / "preview" / "jma-preview.html"
out.write_text(HEAD + js + TAIL, encoding="utf-8")
kb = out.stat().st_size / 1024
print(f"écrit {out} ({kb:.0f} Ko)")
