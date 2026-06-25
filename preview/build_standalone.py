#!/usr/bin/env python3
# Génère un fichier HTML autonome (jma-card.js inliné) ouvrable d'un double-clic.
# GALERIE : tous les états empilés, à faire défiler — AUCUN bouton à toucher
# (robuste sur iPhone). Icônes via la vraie police MDI (CDN, accessible côté navigateur).
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
  body{min-height:100vh;box-sizing:border-box;padding:14px 12px 40px;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:linear-gradient(165deg,#f7f3ea 0%,#f1ebde 55%,#ece5d6 100%);}
  ha-card{display:block;}
  ha-icon{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;}
  ha-icon .mdi{font-size:var(--mdc-icon-size,24px);line-height:1;}
  .wrap{max-width:760px;margin:0 auto;}
  h2{font:800 15px/1.2 sans-serif;color:#7a6a4c;margin:22px 4px 8px;display:flex;align-items:center;gap:8px;}
  h2::before{content:"";width:18px;height:3px;border-radius:3px;background:#f8a5c2;}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
  .grid .full{grid-column:1/-1;}
  .sect{margin-bottom:6px;}
  @media(max-width:560px){ .grid{grid-template-columns:1fr;} }
</style>
</head>
<body>
<div class="wrap" id="wrap"></div>

<script>
// ===================== jma-card.js (inliné) =====================
"""

TAIL = r"""
// ===================== fin jma-card.js =====================

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
  callService:()=>Promise.resolve(),
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
const NAV_ITEMS = [
  { name:"Accueil", icon:"mdi:home", path:"/x/accueil" },
  { name:"Climat", icon:"mdi:thermometer", path:"/x/climat" },
  { name:"Agenda", icon:"mdi:calendar", path:"/x/agenda" },
  { name:"Sécurité", icon:"mdi:shield-home", path:"/x/securite" },
];
const wrap = document.getElementById("wrap");
function h2(txt){ const h=document.createElement("h2"); h.textContent=txt; wrap.appendChild(h); }
function sect(){ const d=document.createElement("div"); d.className="sect"; wrap.appendChild(d); return d; }

// bannière d'un niveau, rendue EN LIGNE (on sort le .alertbar du position:fixed)
function banner(alerts){
  const nav=document.createElement("jma-nav-card"); nav.setConfig({ ...PALETTE, items:NAV_ITEMS }); nav.hass=hass;
  const host=sect(); host.appendChild(nav);          // connectedCallback démarre un timer de re-render
  window.__jmaAlerts = JSON.parse(JSON.stringify(alerts)); nav._renderAlerts();
  clearInterval(nav._alertTimer); nav._alertTimer=null;
  nav._renderAlerts = function(){};  // FIGE : global partagé + _fetchNotifs async ne doivent plus re-rendre
  const bar=nav.shadowRoot.getElementById("alertbar");
  if(bar){ Object.assign(bar.style,{ position:"static", transform:"none", left:"auto", top:"auto",
    width:"auto", maxWidth:"none" }); }
  const dock=nav.shadowRoot.getElementById("dock"); if(dock) dock.style.display="none";
  return nav;
}

window.addEventListener("DOMContentLoaded", async () => {
  await customElements.whenDefined("jma-nav-card");

  h2("Bannière — Information");
  banner({ w:{ level:"info", title:"RAPPEL", message:"Sortir les poubelles ce soir", icon:"" } });

  h2("Bannière — Avertissement (ambre/or)");
  banner({ w:{ level:"warning", title:"FENÊTRE OUVERTE", message:"Cuisine — depuis 12 min", icon:"" } });

  h2("Bannière — Critique (rouge)");
  banner({ w:{ level:"critical", title:"FUITE D'EAU", message:"Machine à laver", icon:"mdi:water-alert" } });

  h2("Bannière — Plusieurs alertes");
  banner({ a:{ level:"critical", title:"FUMÉE", message:"Séjour", icon:"mdi:fire-alert" },
           b:{ level:"warning", title:"PORTE", message:"Garage ouvert depuis 20 min", icon:"" } });

  h2("Cartes");
  const g=document.createElement("div"); g.className="grid"; sect().appendChild(g);
  function add(tag,cfg,cls){ const el=document.createElement(tag); el.setConfig({ ...PALETTE, ...cfg }); el.hass=hass;
    const w=document.createElement("div"); if(cls)w.className=cls; w.appendChild(el); g.appendChild(w); return el; }
  add("jma-notify-card", { title:"Notifications", hide_empty:false }, "full");
  add("jma-climate-tile-card", { entity:"climate.salon" });
  add("jma-cover-tile-card", { entity:"cover.salon" });
  add("jma-climate-tile-card", { entity:"climate.chambre" });

  h2("Pop-up caméra (sonnette)");
  const pn=document.createElement("jma-nav-card"); pn.setConfig({ ...PALETTE, items:NAV_ITEMS }); pn.hass=hass;
  sect().appendChild(pn);
  pn._showPopup({ title:"👀 Quelqu'un à la porte", message:"Personne détectée à la sonnette.",
    level:"warning", image:"https://picsum.photos/640/360", dismissable:true,
    actions:[{ label:"Allumer l'entrée", icon:"mdi:lightbulb-on", primary:true, close:true },
             { label:"Ignorer", icon:"mdi:close", close:true }] });
  const jp=pn.shadowRoot.getElementById("jpop");
  if(jp){ Object.assign(jp.style,{ position:"static", display:"flex", inset:"auto",
    background:"transparent", backdropFilter:"none", padding:"0" }); }
  const d2=pn.shadowRoot.getElementById("dock"); if(d2) d2.style.display="none";
  const ab=pn.shadowRoot.getElementById("alertbar"); if(ab) ab.style.display="none";
});
</script>
</body>
</html>
"""

out = root / "preview" / "jma-preview.html"
out.write_text(HEAD + js + TAIL, encoding="utf-8")
print(f"écrit {out} ({out.stat().st_size/1024:.0f} Ko)")
