/*! JMA Cards — set de cartes Lovelace flat/iOS, vanilla JS (zéro build).
 *  Palette: rose #f8a5c2 · beige #DEC198 · dark #0a0a0b · texte #fff
 *
 *  Cartes disponibles (type: custom:...) :
 *    jma-card           universelle (auto)            slider horizontal + pop-up
 *    jma-light-card     lumière                       slider luminosité, tap=toggle
 *    jma-switch-card    interrupteur                  pastille on/off
 *    jma-cover-card     volet                         Ouvrir/Stop/Fermer + position
 *    jma-thermostat-card climat                       consigne ± + modes
 *    jma-media-card     média                         transport + volume
 *    jma-vacuum-card    aspirateur                    Start/Pause/Dock + batterie
 *    jma-scene-card     scène/script                  bouton d'activation
 *    jma-alarm-card     alarme                        Désarmer/Maison/Absent
 *
 *  Commun: name / icon / color / accent / hold_action(popup|more-info|none)
 */

const VERSION = "0.89.0";
// enregistrement idempotent : évite qu'un double-chargement de la ressource
// (HACS + manuel, ou ressource listée 2×) ne fasse planter tout le module.
const _def = customElements.define.bind(customElements);
const jmaDef = (n, c) => { try { if (!customElements.get(n)) _def(n, c); } catch (e) {} };
// Abonnement aux notifications persistantes. HA récent n'émet plus l'event de bus
// "persistent_notifications_updated" ; il faut la collection WS persistent_notification/subscribe.
// cb reçoit l'objet {type:"added"|"removed"|"current", notifications:{...}}. Repli sur
// l'ancien event de bus pour les vieilles versions. Renvoie une promesse de fonction unsub.
function jmaSubPN(conn, cb) {
  if (!conn) return Promise.resolve(null);
  try {
    return conn.subscribeMessage((msg) => { try { cb(msg); } catch (e) {} },
      { type: "persistent_notification/subscribe" });
  } catch (e) {}
  try {
    return conn.subscribeEvents(() => { try { cb({ type: "legacy" }); } catch (e) {} },
      "persistent_notifications_updated");
  } catch (e) {}
  return Promise.resolve(null);
}
const ROSE = "#f8a5c2";
const BEIGE = "#DEC198";
const BLUE = "#5b9bff";
const DARK = "#0a0a0b";

// Traductions FR
const HVAC_FR = { off: "Éteint", heat: "Chauffage", cool: "Refroidir", auto: "Auto",
  heat_cool: "Auto", dry: "Déshumidif.", fan_only: "Ventilation" };
const HVAC_ACTION_FR = { off: "Éteint", idle: "Inactif", heating: "Chauffe", cooling: "Refroidit",
  drying: "Déshumidifie", fan: "Ventile", preheating: "Préchauffe" };
const ALARM_FR = { disarmed: "Désarmé", armed_away: "Absent", armed_home: "Maison", armed_night: "Nuit",
  armed_vacation: "Vacances", arming: "Armement…", pending: "Délai…", triggered: "⚠ Déclenchée" };
const VACUUM_FR = { cleaning: "Nettoyage", docked: "À la base", idle: "Inactif", paused: "En pause",
  returning: "Retour base", error: "Erreur" };

function jmaSince(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms) || ms < 0) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " h" + (m % 60 ? " " + (m % 60) : "");
  const d = Math.floor(h / 24);
  return d + " j" + (h % 24 ? " " + (h % 24) + " h" : "");
}
function jmaFmtDist(m) { return m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m"; }
function jmaBatIcon(p, charging) {
  if (p == null) return "mdi:battery-unknown";
  if (charging) return "mdi:battery-charging";
  const r = Math.round(p / 10) * 10;
  return r >= 100 ? "mdi:battery" : r <= 5 ? "mdi:battery-alert" : "mdi:battery-" + r;
}

// =============================================================================
//  STYLE & HELPERS PARTAGÉS
// =============================================================================
const BASE_CSS = `
  :host{--jma-blue:#6a9bea;
    --jma-text:#42382a;--jma-icon:rgba(66,56,42,.55);
    --jma-surf:rgba(255,253,249,.74);--jma-surf2:rgba(66,56,42,.06);--jma-surf3:rgba(66,56,42,.05);
    --jma-track:rgba(66,56,42,.1);--jma-ripple:rgba(66,56,42,.08);
    --jma-line:rgba(66,56,42,.07);--jma-shadow:0 1px 2px rgba(66,56,42,.04),0 6px 18px rgba(66,56,42,.06);
    --jma-grad:linear-gradient(135deg,var(--jma-blue),var(--jma-rose));}
  :host(.dark){--jma-text:#fff;--jma-icon:rgba(255,255,255,.8);--jma-surf:rgba(255,255,255,.06);
    --jma-surf2:rgba(255,255,255,.12);--jma-surf3:rgba(255,255,255,.1);--jma-track:rgba(255,255,255,.16);--jma-ripple:rgba(255,255,255,.35);
    --jma-line:rgba(255,255,255,.08);--jma-shadow:0 2px 8px rgba(0,0,0,.28);}
  .tile{position:relative;overflow:hidden;border-radius:18px;min-height:60px;height:100%;
    padding:11px;box-sizing:border-box;background:var(--jma-surf);
    border:1px solid var(--jma-line);box-shadow:var(--jma-shadow);
    backdrop-filter:blur(18px) saturate(118%);-webkit-backdrop-filter:blur(18px) saturate(118%);
    color:var(--jma-text);user-select:none;display:flex;touch-action:pan-y;
    transition:transform .22s cubic-bezier(.2,.7,.3,1),background .3s ease,box-shadow .3s ease;}
  .tile:not(.flat){cursor:pointer;}
  .tile:not(.flat):hover{transform:scale(1.02);}
  .tile.active{transform:scale(.985);}
  .content{position:relative;z-index:1;display:flex;flex-direction:column;
    justify-content:space-between;gap:9px;width:100%;}
  .top{display:flex;align-items:center;gap:9px;}
  .badge{width:34px;height:34px;border-radius:50%;background:var(--jma-surf2);flex:none;
    display:flex;align-items:center;justify-content:center;transition:background .3s ease;}
  .badge ha-icon{--mdc-icon-size:20px;color:var(--jma-icon);transition:color .3s;}
  .meta{min-width:0;flex:1;}
  .name{font-weight:600;font-size:clamp(.8rem,2.2vw,.94rem);letter-spacing:-.2px;line-height:1.12;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sub{font-size:clamp(.66rem,1.7vw,.76rem);opacity:.62;margin-top:1px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .tile.on .badge{background:var(--jma-grad);}
  .tile.on .badge ha-icon{color:var(--jma-dark);}

  /* slider horizontal */
  .slider{position:relative;height:30px;border-radius:11px;overflow:hidden;flex:none;
    background:var(--jma-track);touch-action:pan-y;cursor:pointer;transition:box-shadow .15s;}
  .slider[hidden]{display:none;}
  .slider.precise{box-shadow:inset 0 0 0 2px var(--jma-blue);}
  .sfill{position:absolute;left:0;top:0;bottom:0;width:0%;pointer-events:none;
    background:linear-gradient(90deg,var(--jma-blue) 0%,var(--jma-rose) 100%);
    transition:width .28s cubic-bezier(.2,.7,.3,1);}
  .slider.dragging .sfill{transition:none;}
  .sval{position:absolute;left:10px;top:50%;transform:translateY(-50%);z-index:2;pointer-events:none;
    font-weight:700;font-size:.78rem;color:var(--jma-text);text-shadow:0 1px 2px rgba(0,0,0,.18);}
  .sicon{position:absolute;right:9px;top:50%;transform:translateY(-50%);z-index:2;pointer-events:none;
    --mdc-icon-size:16px;color:var(--jma-icon);}

  /* pastille on/off (switch) */
  .pill{width:50px;height:30px;border-radius:999px;background:var(--jma-track);flex:none;
    position:relative;transition:background .3s ease;cursor:pointer;}
  .pill .knob{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;
    box-shadow:0 2px 6px rgba(0,0,0,.35);transition:left .26s cubic-bezier(.2,.8,.2,1);}
  .tile.on .pill{background:var(--jma-grad);}
  .tile.on .pill .knob{left:23px;}

  /* boutons de contrôle */
  .btnrow{display:flex;gap:6px;flex-wrap:wrap;}
  .cbtn{flex:1 1 auto;min-width:46px;height:34px;border:none;border-radius:11px;cursor:pointer;
    background:var(--jma-surf3);color:var(--jma-text);display:flex;align-items:center;justify-content:center;gap:5px;
    font-weight:600;font-size:.76rem;transition:background .2s,transform .08s;}
  .cbtn:hover{background:rgba(248,165,194,.18);}
  .cbtn:active{transform:scale(.93);}
  .cbtn ha-icon{--mdc-icon-size:18px;}
  .cbtn.accent{background:var(--jma-grad);color:var(--jma-dark);}

  /* stepper thermostat */
  .therm{display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .set{font-weight:800;font-size:1.35rem;letter-spacing:-1px;text-align:center;flex:1;}
  .step{width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;background:var(--jma-surf2);
    color:var(--jma-text);display:flex;align-items:center;justify-content:center;transition:transform .08s;}
  .step ha-icon{--mdc-icon-size:20px;}
  .step:active{transform:scale(.9);}

  /* chips (modes) */
  .chips{display:flex;gap:5px;flex-wrap:wrap;}
  .chip{padding:4px 8px;border-radius:9px;background:var(--jma-surf3);font-size:.68rem;cursor:pointer;
    border:none;color:var(--jma-text);text-transform:capitalize;transition:background .2s;}
  .chip.on{background:var(--jma-grad);color:var(--jma-dark);font-weight:700;}

  /* ripple */
  .tile::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
    background:radial-gradient(circle at var(--rx,50%) var(--ry,50%),var(--jma-ripple) 0%,transparent 55%);
    opacity:0;transform:scale(.3);}
  .tile.ripple::after{animation:jma-ripple .55s ease-out;}
  @keyframes jma-ripple{0%{opacity:.6;transform:scale(.3);}100%{opacity:0;transform:scale(1.6);}}

  /* divers */
  .tile.dim{opacity:.45;}
  .tile.unavail{filter:grayscale(.5);}
  .tile.unavail .sub{opacity:.85;font-style:italic;}
  .tile:focus-visible,.slider:focus-visible,.chip:focus-visible,.cbtn:focus-visible{outline:2px solid var(--jma-blue);outline-offset:2px;}
  .tile:focus{outline:none;}
  .art{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;
    opacity:.22;filter:blur(8px) saturate(1.25);transition:opacity .4s,background-image .4s;}
  .bigbat{display:flex;align-items:center;gap:2px;font-size:.8rem;font-weight:700;opacity:.85;flex:none;}
  .bigbat ha-icon{--mdc-icon-size:18px;}
  /* sparkline sur tuile */
  .spark{position:relative;height:34px;width:100%;}
  .spark svg{width:100%;height:100%;display:block;}
  /* icônes animées */
  @keyframes jma-spin{to{transform:rotate(360deg);}}
  @keyframes jma-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  @keyframes jma-bob{0%,100%{transform:translateY(0);}50%{transform:translateY(-2px);}}
  .spin ha-icon{animation:jma-spin 2.6s linear infinite;transform-origin:center;}
  .pulse ha-icon{animation:jma-pulse 1.5s ease-in-out infinite;}
  .bob ha-icon{animation:jma-bob 1.8s ease-in-out infinite;}
`;

// thème : applique la classe .light sur l'hôte selon la config et le thème HA
// thème : par défaut BEIGE clair ; classe .dark seulement si demandé
function jmaApplyTheme(host, hass, config) {
  const mode = (config && config.theme) || "beige";
  let dark = mode === "dark";
  if (mode === "auto") dark = !!(hass && hass.themes && hass.themes.darkMode === true);
  host.classList.toggle("dark", dark);
}

// entité indisponible / inconnue ?
function jmaUnavail(s) { return !s || ["unavailable", "unknown", "none", null, undefined].includes(s.state); }

// cache court & déduplication des appels history (évite N requêtes simultanées identiques)
const _jmaHistCache = new Map();
function jmaHistory(hass, entities, hours) {
  const ents = (Array.isArray(entities) ? entities : [entities]).filter(Boolean);
  if (!ents.length || !hass) return Promise.resolve([]);
  hours = hours || 24;
  const key = ents.slice().sort().join(",") + "|" + hours;
  const now = Date.now(), hit = _jmaHistCache.get(key);
  if (hit && now - hit.t < 60000) return hit.p;
  const end = new Date(), start = new Date(now - hours * 3600000);
  const path = `history/period/${start.toISOString()}?end_time=${encodeURIComponent(end.toISOString())}` +
    `&filter_entity_id=${ents.join(",")}&minimal_response&significant_changes_only`;
  const p = hass.callApi("GET", path).catch((e) => { _jmaHistCache.delete(key); throw e; });
  _jmaHistCache.set(key, { t: now, p });
  if (_jmaHistCache.size > 60) { const k0 = _jmaHistCache.keys().next().value; _jmaHistCache.delete(k0); }
  return p;
}

// mini sparkline NON interactive pour les tuiles -> remplit host avec un SVG
async function jmaSparkline(host, hass, entity, hours, color) {
  if (!host || !hass || !entity) return;
  try {
    const res = await jmaHistory(hass, entity, hours || 24);
    const arr = (res && res[0]) || [];
    const pts = arr.map((p) => parseFloat(p.state)).filter((v) => !isNaN(v));
    if (pts.length < 2) { host.innerHTML = ""; return; }
    let mn = Math.min(...pts), mx = Math.max(...pts); if (mn === mx) { mn -= 1; mx += 1; }
    const W = 200, H = 34, pad = 3;
    const sx = (i) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
    const sy = (v) => H - pad - ((v - mn) / (mx - mn)) * (H - 2 * pad);
    const d = pts.map((v, i) => (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(v).toFixed(1)).join(" ");
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
      `<path d="${d} L ${sx(pts.length - 1).toFixed(1)} ${H - pad} L ${sx(0).toFixed(1)} ${H - pad} Z" fill="${color || ROSE}" opacity=".14"/>` +
      `<path d="${d}" fill="none" stroke="${color || ROSE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  } catch (e) { host.innerHTML = ""; }
}

// sparkline multi-séries (échelle de valeur partagée) -> [{entity,color,fill?}]
async function jmaSparklineMulti(host, hass, series, hours) {
  if (!host || !hass || !series || !series.length) return;
  try {
    const ents = series.map((s) => s.entity).filter(Boolean);
    if (!ents.length) { host.innerHTML = ""; return; }
    const res = await jmaHistory(hass, ents, hours || 24);
    const byEnt = {};
    (res || []).forEach((arr) => { if (arr && arr.length) byEnt[arr[0].entity_id] = arr; });
    const lines = series.map((s) => {
      const arr = byEnt[s.entity] || [];
      const pts = arr.map((p) => ({ t: new Date(p.last_changed || p.lc || p.lu).getTime(), v: parseFloat(p.state) }))
        .filter((p) => !isNaN(p.v) && !isNaN(p.t));
      return { ...s, pts };
    }).filter((l) => l.pts.length > 1);
    if (!lines.length) { host.innerHTML = ""; return; }
    let tMin = Infinity, tMax = -Infinity;
    lines.forEach((l) => l.pts.forEach((p) => { tMin = Math.min(tMin, p.t); tMax = Math.max(tMax, p.t); }));
    // lissage : moyenne par tranche de temps (sinon courbes de puissance illisibles)
    const N = 64, span = (tMax - tMin) || 1;
    lines.forEach((l) => {
      const buckets = Array.from({ length: N }, () => ({ s: 0, n: 0 }));
      l.pts.forEach((p) => { const b = Math.min(N - 1, Math.floor(((p.t - tMin) / span) * N)); buckets[b].s += p.v; buckets[b].n++; });
      const out = []; let last = l.pts[0].v;
      for (let i = 0; i < N; i++) { if (buckets[i].n) last = buckets[i].s / buckets[i].n; out.push({ t: tMin + ((i + 0.5) / N) * span, v: last }); }
      l.spts = out;
    });
    let vMin = Infinity, vMax = -Infinity;
    lines.forEach((l) => l.spts.forEach((p) => { vMin = Math.min(vMin, p.v); vMax = Math.max(vMax, p.v); }));
    vMin = Math.min(vMin, 0); if (vMin === vMax) { vMin -= 1; vMax += 1; }
    const W = 320, H = 48, pad = 3;
    const sx = (t) => pad + ((t - tMin) / span) * (W - 2 * pad);
    const sy = (v) => H - pad - ((v - vMin) / (vMax - vMin || 1)) * (H - 2 * pad);
    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
    lines.forEach((l) => {
      const d = l.spts.map((p, i) => (i ? "L" : "M") + sx(p.t).toFixed(1) + " " + sy(p.v).toFixed(1)).join(" ");
      if (l.fill) svg += `<path d="${d} L ${sx(l.spts[l.spts.length - 1].t).toFixed(1)} ${H - pad} L ${sx(l.spts[0].t).toFixed(1)} ${H - pad} Z" fill="${l.color}" opacity=".16"/>`;
      svg += `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="${l.fill ? 2 : 1.6}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    });
    svg += `</svg>`;
    host.innerHTML = svg;
  } catch (e) { host.innerHTML = ""; }
}

const CARD_WRAP_OPEN = '<ha-card style="background:none;border:none;box-shadow:none;">';

// slider horizontal réutilisable -> renvoie un élément .slider avec .setValue(v) et .dragging
function jmaSlider({ fmt, onCommit, onInput, icon, label }) {
  const el = document.createElement("div");
  el.className = "slider";
  el.tabIndex = 0;
  el.setAttribute("role", "slider");
  el.setAttribute("aria-valuemin", "0"); el.setAttribute("aria-valuemax", "100");
  if (label) el.setAttribute("aria-label", label);
  el.innerHTML =
    `<div class="sfill"></div><span class="sval"></span>` +
    (icon ? `<ha-icon class="sicon" icon="${icon}"></ha-icon>` : "");
  const fill = el.querySelector(".sfill");
  const val = el.querySelector(".sval");
  let pending = null, anchorX = 0, anchorV = 0, startY = 0, cur = 0;
  el.dragging = false;
  const valFromX = (e) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
  };
  const paint = (v) => {
    cur = Math.round(v);
    fill.style.width = v + "%";
    val.textContent = fmt ? fmt(cur) : cur + "%";
    el.setAttribute("aria-valuenow", "" + cur);
  };
  // navigation clavier (flèches / Page / Début / Fin)
  el.addEventListener("keydown", (e) => {
    let nv = cur, step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") nv = cur + step;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") nv = cur - step;
    else if (e.key === "PageUp") nv = cur + 10;
    else if (e.key === "PageDown") nv = cur - 10;
    else if (e.key === "Home") nv = 0;
    else if (e.key === "End") nv = 100;
    else return;
    e.preventDefault(); e.stopPropagation();
    nv = Math.max(0, Math.min(100, nv));
    paint(nv); if (onInput) onInput(nv); onCommit(nv);
  });
  // sensibilité réduite quand le doigt s'éloigne verticalement (mode précision iOS)
  const sens = (e) => {
    const vd = Math.abs(e.clientY - startY);
    return vd < 24 ? 1 : Math.max(0.06, 1 - (vd - 24) / 200);
  };
  // engagement uniquement sur geste horizontal -> le scroll vertical passe sans rien changer
  let engaged = false, aborted = false, downId = null, startX = 0;
  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    startX = e.clientX; startY = e.clientY; anchorX = e.clientX; anchorV = cur;
    pending = null; engaged = false; aborted = false; downId = e.pointerId;
  });
  el.addEventListener("pointermove", (e) => {
    if (downId == null || aborted) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!engaged) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) + 4) { aborted = true; return; } // défilement vertical
      if (Math.abs(dx) < 6) return;                                                          // pas encore assez horizontal
      engaged = true; el.dragging = true; el.classList.add("dragging");
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      anchorX = e.clientX; anchorV = cur;
    }
    const r = el.getBoundingClientRect();
    pending = Math.max(0, Math.min(100, anchorV + ((e.clientX - anchorX) / r.width) * 100 * sens(e)));
    el.classList.toggle("precise", Math.abs(e.clientY - startY) >= 24);
    paint(pending);
    if (onInput) onInput(Math.round(pending));
  });
  const finish = (e, isCancel) => {
    if (e) e.stopPropagation();
    if (downId == null) return;
    const wasEngaged = engaged, wasAborted = aborted;
    downId = null; engaged = false; aborted = false; el.dragging = false;
    el.classList.remove("dragging", "precise");
    if (wasEngaged) { if (pending != null) onCommit(Math.round(pending)); }
    else if (!wasAborted && !isCancel && e) { const v = valFromX(e); paint(v); onCommit(Math.round(v)); } // tap volontaire
    pending = null;
  };
  el.addEventListener("pointerup", (e) => finish(e, false));
  el.addEventListener("pointercancel", (e) => finish(e, true));
  el.setValue = (v) => { if (!el.dragging) paint(v); };
  return el;
}

// =============================================================================
//  CLASSE DE BASE
// =============================================================================
class JmaBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
  }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  setConfig(config) {
    if (!config.entity) throw new Error("jma : 'entity' est requis");
    this._config = { tap_action: "popup", color: ROSE, accent: BEIGE, dark: DARK, ...config };
    this._built = false;
  }
  set hass(h) {
    this._hass = h;
    if (!this._built) { this._build(); this._built = true; }
    jmaApplyTheme(this, h, this._config);
    this._update();
    if (this._popup) this._popup.hass = h;
  }
  getCardSize() { return 2; }

  get _s() { return this._hass && this._config ? this._hass.states[this._config.entity] : undefined; }
  _domain() { return this._config.entity.split(".")[0]; }
  _name(s) { return this._config.name || (s && s.attributes.friendly_name) || this._config.entity; }
  _call(d, s, data) { if (this._hass) this._hass.callService(d, s, data); }
  _styleBlock(extra) {
    const c = this._config;
    return `<style>:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-blue:${c.blue || BLUE};--jma-dark:${c.dark};}${BASE_CSS}${extra || ""}</style>`;
  }
  _icon(s, fallback) {
    return this._config.icon || (s && s.attributes.icon) || fallback;
  }
  // clic simple -> onTap (pop-up par défaut) ; appui long -> fiche HA.
  // Les gestes démarrés sur un contrôle inline (slider/boutons/pastille) sont ignorés.
  _wireHold(el, onTap) {
    const CTRL = ["slider", "cbtn", "pill", "step", "chip", "mprog", "covb"];
    let holdTimer, holdFired, skip, sx, sy;
    // accessibilité : tuile activable au clavier (Entrée/Espace = détails)
    if ((this._config.tap_action || "popup") !== "none") {
      el.setAttribute("role", "button"); el.tabIndex = 0;
      el.setAttribute("aria-label", (this._config.name || this._config.entity) + " — détails");
      el.addEventListener("keydown", (e) => {
        if (e.target !== el) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (onTap) onTap(); }
      });
    }
    el.addEventListener("pointerdown", (e) => {
      skip = e.composedPath().some((n) => n.classList && CTRL.some((c) => n.classList.contains(c)));
      if (skip) return;
      holdFired = false; sx = e.clientX; sy = e.clientY;
      el.classList.add("active");
      const r = el.getBoundingClientRect();
      el.style.setProperty("--rx", ((e.clientX - r.left) / r.width) * 100 + "%");
      el.style.setProperty("--ry", ((e.clientY - r.top) / r.height) * 100 + "%");
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      holdTimer = setTimeout(() => {
        holdFired = true;
        if (navigator.vibrate) navigator.vibrate(12);
        this._moreInfo();
      }, 480);
    });
    el.addEventListener("pointermove", (e) => {
      if (sx == null) return;
      if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) clearTimeout(holdTimer);
    });
    el.addEventListener("pointerup", () => {
      if (skip) return;
      clearTimeout(holdTimer);
      el.classList.remove("active");
      sx = sy = null;
      if (holdFired) return;
      el.classList.remove("ripple"); void el.offsetWidth; el.classList.add("ripple");
      if (onTap) onTap();
    });
    el.addEventListener("pointercancel", () => {
      clearTimeout(holdTimer); el.classList.remove("active"); sx = sy = null;
    });
  }
  _moreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId: this._config.entity },
    }));
  }
  _tapAction() {
    const a = this._config.tap_action || "popup";
    if (a === "none") return;
    if (a === "more-info") return this._moreInfo();
    this._openPopup();
  }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = this._config;
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p);
    this._popup = p;
  }
  _unavail(name) {
    const nm = this.shadowRoot.querySelector(".name");
    if (nm) nm.textContent = this._config.name || this._config.entity;
    const sub = this.shadowRoot.querySelector(".sub");
    if (sub) sub.textContent = "Indisponible";
    const tile = this.shadowRoot.querySelector(".tile");
    if (tile) { tile.classList.add("dim", "unavail"); tile.classList.remove("on"); }
  }
  _dim(tile, s) {
    const off = jmaUnavail(s);
    if (tile) { tile.classList.toggle("dim", off); tile.classList.toggle("unavail", off); }
    if (off) { const sub = this.shadowRoot.querySelector(".sub"); if (sub) sub.textContent = "Indisponible"; }
  }
}

// =============================================================================
//  💡 LUMIÈRE
// =============================================================================
class JmaLightCard extends JmaBase {
  static getStubConfig() { return { entity: "light.living_room" }; }
  _build() {
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile" id="tile"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div></div>
       </div></div></ha-card>`;
    const tile = this.shadowRoot.getElementById("tile");
    this._wireHold(tile, () => this._tapAction());
    this._sl = jmaSlider({
      icon: "mdi:brightness-6", fmt: (v) => v + "%",
      onCommit: (v) => this._call("light", "turn_on", { entity_id: this._config.entity, brightness_pct: v }),
    });
    this.shadowRoot.querySelector(".content").appendChild(this._sl);
  }
  _update() {
    const s = this._s;
    if (!s) return this._unavail();
    const on = s.state === "on";
    const tile = this.shadowRoot.getElementById("tile");
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, "mdi:lightbulb"));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    tile.classList.toggle("on", on);
    this._dim(tile, s);
    const modes = s.attributes.supported_color_modes || [];
    const hasBri = modes.length ? modes.some((m) => m !== "onoff") : s.attributes.brightness != null;
    const bri = s.attributes.brightness ? Math.round((s.attributes.brightness / 255) * 100) : 0;
    this._sl.hidden = !hasBri;
    if (hasBri) this._sl.setValue(on ? bri : 0);
    this.shadowRoot.querySelector(".sub").textContent = on ? (hasBri ? bri + " %" : "Allumé") : "Éteint";
    // teinte avec la couleur réelle de la lampe (si allumée et colorée)
    const rgb = on && Array.isArray(s.attributes.rgb_color) ? s.attributes.rgb_color : null;
    const col = rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : "";
    this.shadowRoot.querySelector(".badge").style.background = col;
    this.shadowRoot.querySelector(".ic").style.color = col ? "#0a0a0b" : "";
    this._sl.querySelector(".sfill").style.background = col || "";
  }
}

// =============================================================================
//  🔌 INTERRUPTEUR
// =============================================================================
class JmaSwitchCard extends JmaBase {
  static getStubConfig() { return { entity: "switch.example" }; }
  _build() {
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile" id="tile"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div>
           <div class="pill"><div class="knob"></div></div></div>
       </div></div></ha-card>`;
    const tile = this.shadowRoot.getElementById("tile");
    this._wireHold(tile, () => this._tapAction());
    this.shadowRoot.querySelector(".pill").addEventListener("click", (e) => {
      e.stopPropagation();
      this._call("homeassistant", "toggle", { entity_id: this._config.entity });
    });
  }
  _update() {
    const s = this._s;
    if (!s) return this._unavail();
    const on = s.state === "on";
    const d = this._domain();
    const fb = d === "fan" ? "mdi:fan" : d === "input_boolean" ? "mdi:toggle-switch" : "mdi:power-socket-eu";
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, fb));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    this.shadowRoot.querySelector(".sub").textContent = on ? "Allumé" : "Éteint";
    this.shadowRoot.getElementById("tile").classList.toggle("on", on);
    this.shadowRoot.querySelector(".badge").classList.toggle("spin", d === "fan" && on);
  }
}

// =============================================================================
//  🪟 VOLET
// =============================================================================
class JmaCoverCard extends JmaBase {
  static getStubConfig() { return { entity: "cover.example" }; }
  _build() {
    const extra = `.covb{display:flex;gap:5px;flex:none;}
      .covb .cbtn{width:30px;height:30px;min-width:0;border-radius:9px;}
      .covb .cbtn ha-icon{--mdc-icon-size:18px;}`;
    this.shadowRoot.innerHTML = this._styleBlock(extra) + CARD_WRAP_OPEN +
      `<div class="tile flat"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div>
           <div class="covb">
             <button class="cbtn" data-a="open_cover"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
             <button class="cbtn" data-a="stop_cover"><ha-icon icon="mdi:stop"></ha-icon></button>
             <button class="cbtn" data-a="close_cover"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
           </div></div>
       </div></div></ha-card>`;
    this._wireHold(this.shadowRoot.querySelector(".tile"), () => this._tapAction());
    const openP = (e) => { e.stopPropagation(); this._openPopup(); };
    this.shadowRoot.querySelector(".badge").addEventListener("click", openP);
    this.shadowRoot.querySelector(".meta").addEventListener("click", openP);
    this.shadowRoot.querySelectorAll(".cbtn").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); this._call("cover", b.dataset.a, { entity_id: this._config.entity }); })
    );
    const feat = (this._s && this._s.attributes.supported_features) || 0;
    if (feat & 4) { // SET_POSITION
      this._sl = jmaSlider({
        icon: "mdi:arrow-up-down", fmt: (v) => v + "%",
        onCommit: (v) => this._call("cover", "set_cover_position", { entity_id: this._config.entity, position: v }),
      });
      this.shadowRoot.querySelector(".content").appendChild(this._sl);
    }
  }
  _update() {
    const s = this._s;
    if (!s) return this._unavail();
    const open = s.state === "open" || (s.attributes.current_position || 0) > 0;
    const pos = s.attributes.current_position;
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, open ? "mdi:window-shutter-open" : "mdi:window-shutter"));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    const stateFR = { open: "Ouvert", closed: "Fermé", opening: "Ouverture…", closing: "Fermeture…" }[s.state] || s.state;
    this.shadowRoot.querySelector(".sub").textContent = pos != null ? stateFR + " · " + pos + " %" : stateFR;
    this.shadowRoot.querySelector(".tile").classList.toggle("on", open);
    if (this._sl && pos != null) this._sl.setValue(pos);
  }
}

// =============================================================================
//  🌡️ THERMOSTAT
// =============================================================================
class JmaThermostatCard extends JmaBase {
  static getStubConfig() { return { entity: "climate.example" }; }
  _build() {
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile flat"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div></div>
         <div class="therm">
           <button class="step" data-d="-1"><ha-icon icon="mdi:minus"></ha-icon></button>
           <div class="set">—</div>
           <button class="step" data-d="1"><ha-icon icon="mdi:plus"></ha-icon></button>
         </div>
       </div></div></ha-card>`;
    this._wireHold(this.shadowRoot.querySelector(".tile"), () => this._tapAction());
    this.shadowRoot.querySelectorAll(".step").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); this._bump(Number(b.dataset.d)); })
    );
  }
  _bump(dir) {
    const a = this._s.attributes;
    const step = a.target_temp_step || 0.5;
    const min = a.min_temp ?? 7, max = a.max_temp ?? 35;
    let t = (a.temperature ?? min) + dir * step;
    t = Math.max(min, Math.min(max, Math.round(t / step) * step));
    this.shadowRoot.querySelector(".set").textContent = t + "°";
    this._call("climate", "set_temperature", { entity_id: this._config.entity, temperature: t });
  }
  _update() {
    const s = this._s;
    if (!s) return this._unavail();
    const a = s.attributes;
    const on = s.state !== "off" && s.state !== "unavailable";
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, "mdi:thermostat"));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    this.shadowRoot.querySelector(".set").textContent = a.temperature != null ? a.temperature + "°" : "—";
    const cur = a.current_temperature != null ? "Actuel " + a.current_temperature + "°" : (HVAC_FR[s.state] || s.state);
    const act = a.hvac_action ? " · " + (HVAC_ACTION_FR[a.hvac_action] || a.hvac_action) : "";
    this.shadowRoot.querySelector(".sub").textContent = cur + act;
    this.shadowRoot.querySelector(".tile").classList.toggle("on", on);
    this.shadowRoot.querySelector(".badge").classList.toggle("pulse", ["heating", "cooling", "drying"].includes(a.hvac_action));
    this._dim(this.shadowRoot.querySelector(".tile"), s);
  }
}

// =============================================================================
//  🔊 MÉDIA
// =============================================================================
class JmaMediaCard extends JmaBase {
  static getStubConfig() { return { entity: "media_player.example" }; }
  _build() {
    const extra = `.mprog{height:4px;border-radius:99px;background:rgba(255,255,255,.16);cursor:pointer;flex:none;position:relative;}
      .mprog[hidden]{display:none;}
      .mfill{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--jma-rose);width:0%;}`;
    this.shadowRoot.innerHTML = this._styleBlock(extra) + CARD_WRAP_OPEN +
      `<div class="tile flat" id="tile"><div class="art"></div><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div></div>
         <div class="mprog" id="mprog" hidden><div class="mfill" id="mfill"></div></div>
         <div class="btnrow">
           <button class="cbtn" data-a="media_previous_track"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
           <button class="cbtn accent" data-a="media_play_pause"><ha-icon class="pp" icon="mdi:play-pause"></ha-icon></button>
           <button class="cbtn" data-a="media_next_track"><ha-icon icon="mdi:skip-next"></ha-icon></button>
         </div>
       </div></div></ha-card>`;
    this._wireHold(this.shadowRoot.querySelector(".tile"), () => this._tapAction());
    this.shadowRoot.querySelectorAll(".cbtn").forEach((b) =>
      b.addEventListener("click", () => this._call("media_player", b.dataset.a, { entity_id: this._config.entity }))
    );
    this.shadowRoot.getElementById("mprog").addEventListener("click", (e) => {
      e.stopPropagation();
      const a = this._s && this._s.attributes; if (!a || !a.media_duration) return;
      const r = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      this._call("media_player", "media_seek", { entity_id: this._config.entity, seek_position: Math.round(ratio * a.media_duration) });
    });
    this._sl = jmaSlider({
      icon: "mdi:volume-high", fmt: (v) => v + "%",
      onCommit: (v) => this._call("media_player", "volume_set", { entity_id: this._config.entity, volume_level: v / 100 }),
    });
    this.shadowRoot.querySelector(".content").appendChild(this._sl);
  }
  _update() {
    const s = this._s;
    const tile = this.shadowRoot.getElementById("tile");
    if (!s) return this._unavail();
    const a = s.attributes;
    const playing = s.state === "playing";
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, "mdi:speaker"));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    this.shadowRoot.querySelector(".sub").textContent =
      a.media_title ? a.media_title + (a.media_artist ? " — " + a.media_artist : "") : a.source || s.state;
    this.shadowRoot.querySelector(".pp").setAttribute("icon", playing ? "mdi:pause" : "mdi:play");
    tile.classList.toggle("on", ["playing", "paused", "on"].includes(s.state));
    this._dim(tile, s);
    if (a.volume_level != null) { this._sl.hidden = false; this._sl.setValue(Math.round(a.volume_level * 100)); }
    else this._sl.hidden = true;
    // barre de progression
    const mprog = this.shadowRoot.getElementById("mprog");
    clearInterval(this._pt);
    if (a.media_duration) {
      mprog.hidden = false;
      this._paintProg(a, playing);
      if (playing) this._pt = setInterval(() => { const st = this._s; if (st) this._paintProg(st.attributes, true); }, 1000);
    } else mprog.hidden = true;
    // pochette en fond
    const art = this.shadowRoot.querySelector(".art");
    const pic = a.entity_picture;
    if (pic && ["playing", "paused"].includes(s.state)) art.style.backgroundImage = `url("${pic}")`;
    else art.style.backgroundImage = "";
  }
  _paintProg(a, playing) {
    if (!a.media_duration) return;
    let pos = a.media_position || 0;
    if (playing && a.media_position_updated_at) pos += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000;
    pos = Math.max(0, Math.min(a.media_duration, pos));
    const f = this.shadowRoot.getElementById("mfill");
    if (f) f.style.width = (pos / a.media_duration) * 100 + "%";
  }
  disconnectedCallback() { clearInterval(this._pt); }
}

// =============================================================================
//  🤖 ASPIRATEUR
// =============================================================================
class JmaVacuumCard extends JmaBase {
  static getStubConfig() { return { entity: "vacuum.example" }; }
  _build() {
    const extra = `.vmap{width:100%;border-radius:14px;display:block;background:rgba(0,0,0,.12);aspect-ratio:1/1;object-fit:contain;}
      .vmap[hidden]{display:none;}
      .fans{margin-top:2px;} .chip.covb{}`;
    this.shadowRoot.innerHTML = this._styleBlock(extra) + CARD_WRAP_OPEN +
      `<div class="tile flat" id="tile"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div>
           <div class="bigbat" hidden><ha-icon class="bic"></ha-icon><span class="bpc"></span></div></div>
         <img class="vmap" id="vmap" hidden>
         <div class="btnrow">
           <button class="cbtn accent" data-a="start" title="Démarrer"><ha-icon icon="mdi:play"></ha-icon></button>
           <button class="cbtn" data-a="pause" title="Pause"><ha-icon icon="mdi:pause"></ha-icon></button>
           <button class="cbtn" data-a="return_to_base" title="Base"><ha-icon icon="mdi:home-import-outline"></ha-icon></button>
           <button class="cbtn" data-a="locate" title="Localiser"><ha-icon icon="mdi:map-marker"></ha-icon></button>
         </div>
         <div class="chips fans" id="fans"></div>
       </div></div></ha-card>`;
    this._wireHold(this.shadowRoot.querySelector(".tile"), () => this._tapAction());
    this.shadowRoot.querySelectorAll(".cbtn").forEach((b) =>
      b.addEventListener("click", () => this._call("vacuum", b.dataset.a, { entity_id: this._config.entity }))
    );
  }
  _battery() {
    const c = this._config;
    if (c.battery_entity && this._hass.states[c.battery_entity]) {
      const v = parseFloat(this._hass.states[c.battery_entity].state);
      return isNaN(v) ? null : Math.round(v);
    }
    const a = this._s.attributes;
    return a.battery_level != null ? a.battery_level : null;
  }
  _batIcon(p, charging) {
    if (p == null) return "mdi:battery-unknown";
    if (charging) return p >= 95 ? "mdi:battery-charging-100" : "mdi:battery-charging";
    const r = Math.round(p / 10) * 10;
    return r >= 100 ? "mdi:battery" : r <= 5 ? "mdi:battery-alert" : "mdi:battery-" + r;
  }
  _update() {
    const s = this._s;
    const tile = this.shadowRoot.getElementById("tile");
    if (!s) return this._unavail();
    const a = s.attributes;
    const active = ["cleaning", "returning"].includes(s.state);
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, "mdi:robot-vacuum"));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    const stateFR = {
      cleaning: "Nettoyage", docked: "À la base", idle: "Inactif", paused: "En pause",
      returning: "Retour base", error: "Erreur",
    }[s.state] || s.state;
    const fan = a.fan_speed && a.fan_speed !== "off" ? " · " + a.fan_speed : "";
    const areaSt = this._config.area_entity && this._hass.states[this._config.area_entity];
    const area = active && areaSt && !["unknown", "unavailable"].includes(areaSt.state) ? " · " + areaSt.state : "";
    this.shadowRoot.querySelector(".sub").textContent = stateFR + fan + area;
    // batterie (capteur dédié ou attribut)
    const bat = this._battery();
    const bb = this.shadowRoot.querySelector(".bigbat");
    if (bat != null) {
      bb.hidden = false;
      this.shadowRoot.querySelector(".bic").setAttribute("icon", this._batIcon(bat, s.state === "docked"));
      this.shadowRoot.querySelector(".bpc").textContent = bat + "%";
    } else bb.hidden = true;
    tile.classList.toggle("on", active);
    this.shadowRoot.querySelector(".badge").classList.toggle("spin", active);
    this._dim(tile, s);
    this.shadowRoot.querySelector('[data-a="start"]').classList.toggle("accent", !active);
    this.shadowRoot.querySelector('[data-a="pause"]').classList.toggle("accent", active);
    // carte (map_entity = caméra de la carte Roborock)
    const mapE = this._config.map_entity && this._hass.states[this._config.map_entity];
    const vmap = this.shadowRoot.getElementById("vmap");
    if (mapE && mapE.attributes.entity_picture) {
      const p = mapE.attributes.entity_picture;
      if (!this._mapAt || Date.now() - this._mapAt > (active ? 6000 : 60000)) {
        this._mapAt = Date.now();
        vmap.src = p + (p.includes("?") ? "&" : "?") + "_=" + Math.floor(this._mapAt / (active ? 6000 : 60000));
      }
      vmap.hidden = false;
    } else vmap.hidden = true;
    // vitesses d'aspiration
    const fans = this.shadowRoot.getElementById("fans");
    const list = a.fan_speed_list || [];
    if (this._config.show_fan !== false && list.length && list.length <= 6) {
      if (this._fanSig !== list.join(",")) {
        this._fanSig = list.join(","); fans.innerHTML = "";
        list.forEach((f) => {
          const b = document.createElement("button"); b.className = "chip"; b.dataset.f = f; b.tabIndex = 0;
          b.textContent = f; b.addEventListener("click", () => this._call("vacuum", "set_fan_speed", { entity_id: this._config.entity, fan_speed: f }));
          fans.appendChild(b);
        });
      }
      fans.querySelectorAll(".chip").forEach((b) => b.classList.toggle("on", b.dataset.f === a.fan_speed));
      fans.hidden = false;
    } else { fans.hidden = true; }
  }
}

// =============================================================================
//  🎬 SCÈNE / SCRIPT
// =============================================================================
class JmaSceneCard extends JmaBase {
  static getStubConfig() { return { entity: "scene.example" }; }
  _build() {
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile" id="tile"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div></div>
       </div></div></ha-card>`;
    this._wireHold(this.shadowRoot.getElementById("tile"), () => this._activate());
  }
  _activate() {
    const d = this._domain();
    this._call(d === "script" ? "script" : "scene", "turn_on", { entity_id: this._config.entity });
    if (navigator.vibrate) navigator.vibrate(10);
    jmaToast({ title: this._name(this._s), message: "Activé", icon: "mdi:check-circle", color: this._config.accent || BEIGE, duration: 2200 });
    const sub = this.shadowRoot.querySelector(".sub");
    sub.textContent = "✓ Activé";
    clearTimeout(this._t);
    this._t = setTimeout(() => this._update(), 1500);
  }
  _update() {
    const s = this._s;
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, this._domain() === "script" ? "mdi:play" : "mdi:palette"));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    this.shadowRoot.querySelector(".sub").textContent = "Activer";
  }
}

// =============================================================================
//  🛡️ ALARME
// =============================================================================
class JmaAlarmCard extends JmaBase {
  static getStubConfig() { return { entity: "alarm_control_panel.example" }; }
  _build() {
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile flat" id="tile"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div></div>
         <div class="btnrow" id="row"></div>
       </div></div></ha-card>`;
    this._wireHold(this.shadowRoot.querySelector(".tile"), () => this._tapAction());
    this._sig = null;
  }
  _modes() {
    const feat = (this._s && this._s.attributes.supported_features) || 0;
    const m = [["alarm_disarm", "Désarmer", "mdi:lock-open-variant", "disarmed"]];
    if (feat & 1) m.push(["alarm_arm_home", "Maison", "mdi:home", "armed_home"]);
    if (feat & 2) m.push(["alarm_arm_away", "Absent", "mdi:shield-lock", "armed_away"]);
    if (feat & 4) m.push(["alarm_arm_night", "Nuit", "mdi:weather-night", "armed_night"]);
    if (feat & 32) m.push(["alarm_arm_vacation", "Vacances", "mdi:bag-suitcase", "armed_vacation"]);
    return m;
  }
  _update() {
    const s = this._s;
    const tile = this.shadowRoot.getElementById("tile");
    if (!s) return this._unavail();
    const modes = this._modes();
    const sig = modes.map((x) => x[0]).join(",");
    const row = this.shadowRoot.getElementById("row");
    if (sig !== this._sig) {
      this._sig = sig;
      row.innerHTML = "";
      modes.forEach(([svc, label, icon, state]) => {
        const b = document.createElement("button");
        b.className = "cbtn"; b.dataset.s = state; b.title = label;
        b.innerHTML = `<ha-icon icon="${icon}"></ha-icon>`;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          const s = this._s;
          if (s && s.attributes.code_format != null && this._config.code == null) { this._openPopup(); return; }
          const data = { entity_id: this._config.entity };
          if (this._config.code != null) data.code = String(this._config.code);
          this._call("alarm_control_panel", svc, data);
        });
        row.appendChild(b);
      });
    }
    const armed = s.state && s.state.startsWith("armed");
    const triggered = s.state === "triggered";
    const icon = triggered ? "mdi:alarm-light" : armed ? "mdi:shield-lock" : "mdi:shield-off-outline";
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, icon));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    const stateFR = {
      disarmed: "Désarmé", armed_away: "Absent", armed_home: "Maison", armed_night: "Nuit",
      armed_vacation: "Vacances", arming: "Armement…", pending: "Délai…", triggered: "⚠ Déclenchée",
    }[s.state] || s.state;
    this.shadowRoot.querySelector(".sub").textContent = stateFR;
    tile.classList.toggle("on", armed || triggered);
    this.shadowRoot.querySelector(".badge").style.background = triggered ? "#ff5252" : "";
    this._dim(tile, s);
    row.querySelectorAll(".cbtn").forEach((b) => b.classList.toggle("accent", b.dataset.s === s.state));
  }
}

jmaDef("jma-light-card", JmaLightCard);
jmaDef("jma-switch-card", JmaSwitchCard);
jmaDef("jma-cover-card", JmaCoverCard);
jmaDef("jma-thermostat-card", JmaThermostatCard);
// Thermostat INLINE (sans pop-up) : consigne XL + modes + temp réelle, réglage fluide
const JMA_CMODE_ICON = { off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", auto: "mdi:autorenew", heat_cool: "mdi:sun-snowflake-variant", dry: "mdi:water-percent", fan_only: "mdi:fan" };
class JmaClimateTileCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; this._R = { pend: null, timer: null, hold: null }; this._drag = false; }
  setConfig(c) { if (!c.entity) throw new Error("climat : 'entity' requis"); this._config = { color: ROSE, accent: BEIGE, dark: DARK, ...c }; }
  getCardSize() { return 2; }
  static getStubConfig() { return { entity: "climate.example" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); }
  get _s() { return this._hass.states[this._config.entity]; }
  _bounds() { const a = this._s.attributes; return { min: a.min_temp ?? 7, max: a.max_temp ?? 35, step: a.target_temp_step || 0.5 }; }
  _pct(v) { const { min, max } = this._bounds(); return Math.max(0, Math.min(100, ((v - min) / (max - min || 1)) * 100)); }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      .ct{display:flex;flex-direction:column;gap:11px;position:relative;overflow:hidden;}
      .ct::before{content:"";position:absolute;left:-13px;top:-13px;bottom:-13px;width:4px;background:transparent;transition:background .3s;}
      .ct.warn::before{background:linear-gradient(180deg,#ffb24d,#ff7e42);}
      .ct.cool::before{background:linear-gradient(180deg,#7fb0ff,#5b9bff);}
      .cthead{display:flex;align-items:center;gap:9px;}
      .cticon{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--jma-surf3);flex:none;transition:background .3s;}
      .cticon ha-icon{--mdc-icon-size:20px;color:var(--jma-icon);transition:color .3s;}
      .ct.on .cticon{background:var(--jma-grad);}.ct.on .cticon ha-icon{color:var(--jma-dark);}
      .ct.warn .cticon{background:linear-gradient(135deg,#ffb24d,#ff7e42);}.ct.warn .cticon ha-icon{color:#3a1d00;}
      .ct.cool .cticon{background:linear-gradient(135deg,#7fb0ff,#5b9bff);}.ct.cool .cticon ha-icon{color:#04204a;}
      .ctname{font-weight:700;font-size:.96rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ctact{font-size:.62rem;font-weight:800;letter-spacing:.3px;text-transform:uppercase;padding:3px 9px;border-radius:999px;background:var(--jma-surf3);color:var(--jma-icon);white-space:nowrap;}
      .ct.warn .ctact{background:rgba(255,140,66,.2);color:#ff9248;}
      .ct.cool .ctact{background:rgba(110,160,255,.2);color:#6aa3ff;}
      .ctstep{display:flex;align-items:center;justify-content:center;gap:22px;}
      .ctbtn{width:42px;height:42px;border-radius:50%;border:none;cursor:pointer;background:var(--jma-surf3);color:var(--jma-text);display:flex;align-items:center;justify-content:center;transition:transform .08s;}
      .ctbtn:active{transform:scale(.86);}.ctbtn ha-icon{--mdc-icon-size:24px;}
      .ctval{font-weight:800;font-size:2.4rem;min-width:104px;text-align:center;letter-spacing:-1.5px;line-height:1;transition:color .2s;font-variant-numeric:tabular-nums;}
      .ct.warn .ctval{color:#ff9248;}.ct.cool .ctval{color:#6aa3ff;}.ct.editing .ctval{color:var(--jma-rose);}
      .cttrack{position:relative;height:18px;border-radius:11px;background:var(--jma-surf3);cursor:pointer;margin:0 3px;touch-action:none;}
      .ctfill{position:absolute;left:0;top:0;bottom:0;border-radius:11px;background:var(--jma-rose);transition:width .12s,background .3s;}
      .ct.warn .ctfill{background:linear-gradient(90deg,#ffc06b,#ff7e42);}
      .ct.cool .ctfill{background:linear-gradient(90deg,#9cc4ff,#5b9bff);}
      .ctthumb{position:absolute;top:50%;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 2px 9px rgba(0,0,0,.32);transform:translate(-50%,-50%);pointer-events:none;transition:left .12s;border:3px solid var(--jma-rose);}
      .ct.warn .ctthumb{border-color:#ff7e42;}.ct.cool .ctthumb{border-color:#5b9bff;}
      .ctreal{position:absolute;top:-5px;bottom:-5px;width:3px;border-radius:3px;background:var(--jma-text);transform:translateX(-50%);pointer-events:none;opacity:.85;transition:left .3s;}
      .ctscale{display:flex;justify-content:space-between;align-items:center;font-size:.66rem;font-weight:800;opacity:.55;margin-top:-2px;padding:0 2px;}
      .ctscale .mid{opacity:1;display:inline-flex;align-items:center;gap:5px;color:var(--jma-text);}
      .ctscale .mid ha-icon{--mdc-icon-size:15px;opacity:.7;}
      .ctscale .mid .hum{opacity:.55;font-weight:700;}
      .ctmodes{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;}
      .ctmode{width:36px;height:36px;border-radius:11px;border:1px solid var(--jma-surf3);background:transparent;color:var(--jma-icon);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .08s,background .15s,color .15s;}
      .ctmode:active{transform:scale(.9);}.ctmode ha-icon{--mdc-icon-size:20px;}
      .ctmode.on{background:var(--jma-grad);border-color:transparent;color:var(--jma-dark);}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="ct" id="ct">
          <div class="cthead"><div class="cticon"><ha-icon class="cti" icon="mdi:thermostat"></ha-icon></div>
            <div class="ctname"></div><div class="ctact">—</div></div>
          <div class="ctstep"><button class="ctbtn" data-d="-1" aria-label="Baisser"><ha-icon icon="mdi:minus"></ha-icon></button>
            <div class="ctval">—</div>
            <button class="ctbtn" data-d="1" aria-label="Monter"><ha-icon icon="mdi:plus"></ha-icon></button></div>
          <div class="cttrack" id="track"><div class="ctfill" id="fill"></div><div class="ctreal" id="real"></div><div class="ctthumb" id="thumb"></div></div>
          <div class="ctscale"><span id="smin">—</span><span class="mid"><ha-icon icon="mdi:thermometer"></ha-icon><b id="curv">—</b><span class="hum" id="hum"></span></span><span id="smax">—</span></div>
          <div class="ctmodes"></div>
        </div>
      </div></div></ha-card>`;
    this.shadowRoot.querySelectorAll(".ctbtn").forEach((b) => b.addEventListener("click", () => this._bump(Number(b.dataset.d))));
    const track = this.shadowRoot.getElementById("track");
    const tFromX = (e) => { const { min, max, step } = this._bounds(); const r = track.getBoundingClientRect(); const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); return Math.round(Math.max(min, Math.min(max, Math.round((min + p * (max - min)) / step) * step)) * 10) / 10; };
    track.addEventListener("pointerdown", (e) => { e.stopPropagation(); this._drag = true; try { track.setPointerCapture(e.pointerId); } catch (_) {} this._set(tFromX(e), false); });
    track.addEventListener("pointermove", (e) => { if (this._drag) this._set(tFromX(e), false); });
    const end = (e) => { if (!this._drag) return; this._drag = false; this._set(tFromX(e), true); };
    track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
  }
  _paint(v) {
    this.shadowRoot.querySelector(".ctval").textContent = v + "°";
    this.shadowRoot.getElementById("fill").style.width = this._pct(v) + "%";
    this.shadowRoot.getElementById("thumb").style.left = this._pct(v) + "%";
  }
  _set(v, commit) {
    const R = this._R; R.pend = v; const ct = this.shadowRoot.getElementById("ct");
    ct.classList.add("editing"); this._paint(v);
    clearTimeout(R.timer);
    R.timer = setTimeout(() => { this._hass.callService("climate", "set_temperature", { entity_id: this._config.entity, temperature: R.pend });
      clearTimeout(R.hold); R.hold = setTimeout(() => { R.pend = null; ct.classList.remove("editing"); }, 3000); }, commit ? 0 : 450);
  }
  _bump(dir) {
    const st = this._s; if (!st) return; const { min, max, step } = this._bounds();
    const base = this._R.pend != null ? this._R.pend : (st.attributes.temperature ?? min);
    this._set(Math.round(Math.max(min, Math.min(max, Math.round((base + dir * step) / step) * step)) * 10) / 10, true);
  }
  _update() {
    const s = this._s; if (!s) return; const a = s.attributes; const ct = this.shadowRoot.getElementById("ct");
    if (!this._modesBuilt && a.hvac_modes) {
      this._modesBuilt = true; const mc = this.shadowRoot.querySelector(".ctmodes");
      (a.hvac_modes || []).forEach((m) => { const b = document.createElement("button"); b.className = "ctmode"; b.dataset.m = m; b.title = HVAC_FR[m] || m;
        b.innerHTML = `<ha-icon icon="${JMA_CMODE_ICON[m] || "mdi:thermostat"}"></ha-icon>`;
        b.addEventListener("click", () => this._hass.callService("climate", "set_hvac_mode", { entity_id: this._config.entity, hvac_mode: m })); mc.appendChild(b); });
    }
    this.shadowRoot.querySelector(".ctname").textContent = this._config.name || a.friendly_name || this._config.entity;
    const { min, max } = this._bounds();
    this.shadowRoot.getElementById("smin").textContent = Math.round(min) + "°";
    this.shadowRoot.getElementById("smax").textContent = Math.round(max) + "°";
    if (this._R.pend == null && !this._drag && a.temperature != null) this._paint(a.temperature);
    const real = this.shadowRoot.getElementById("real");
    if (a.current_temperature != null) { real.style.display = "block"; real.style.left = this._pct(a.current_temperature) + "%"; } else real.style.display = "none";
    this.shadowRoot.getElementById("curv").textContent = a.current_temperature != null ? a.current_temperature + "°" : "—";
    this.shadowRoot.getElementById("hum").textContent = a.current_humidity != null ? "· 💧 " + a.current_humidity + "%" : "";
    const heating = ["heating", "preheating"].includes(a.hvac_action), cooling = a.hvac_action === "cooling";
    const off = s.state === "off" || s.state === "unavailable";
    this.shadowRoot.querySelector(".ctact").textContent = off ? "Éteint" : (HVAC_ACTION_FR[a.hvac_action] || HVAC_FR[s.state] || s.state);
    ct.classList.toggle("on", !off && !heating && !cooling); ct.classList.toggle("warn", heating); ct.classList.toggle("cool", cooling);
    this.shadowRoot.querySelector(".cti").setAttribute("icon", cooling ? "mdi:snowflake" : heating ? "mdi:fire" : "mdi:thermostat");
    this.shadowRoot.querySelectorAll(".ctmode").forEach((b) => b.classList.toggle("on", b.dataset.m === s.state));
  }
}
jmaDef("jma-climate-tile-card", JmaClimateTileCard);
// Volet INLINE (style thermostat) : position XL + slider + ▲■▼ + raccourcis %
class JmaCoverTileCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; this._R = { pend: null, timer: null, hold: null }; this._drag = false; }
  setConfig(c) { if (!c.entity) throw new Error("volet : 'entity' requis"); this._config = { color: ROSE, accent: BEIGE, dark: DARK, presets: [10, 20, 50, 75], ...c }; }
  getCardSize() { return 2; }
  static getStubConfig() { return { entity: "cover.example" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); }
  get _s() { return this._hass.states[this._config.entity]; }
  _supportsPos() { const s = this._s; return s && (s.attributes.current_position != null || ((s.attributes.supported_features || 0) & 4)); }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      .vt{display:flex;flex-direction:column;gap:11px;position:relative;overflow:hidden;}
      .vt::before{content:"";position:absolute;left:-13px;top:-13px;bottom:-13px;width:4px;background:transparent;transition:background .3s;}
      .vt.on::before{background:var(--jma-grad);}
      .vthead{display:flex;align-items:center;gap:9px;}
      .vticon{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--jma-surf3);flex:none;transition:background .3s;}
      .vticon ha-icon{--mdc-icon-size:20px;color:var(--jma-icon);transition:color .3s;}
      .vt.on .vticon{background:var(--jma-grad);}.vt.on .vticon ha-icon{color:var(--jma-dark);}
      .vtname{font-weight:700;font-size:.96rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .vtact{font-size:.62rem;font-weight:800;letter-spacing:.3px;text-transform:uppercase;padding:3px 9px;border-radius:999px;background:var(--jma-surf3);color:var(--jma-icon);white-space:nowrap;}
      .vt.on .vtact{background:rgba(248,165,194,.22);color:var(--jma-rose);}
      .vtval{font-weight:800;font-size:2.4rem;text-align:center;letter-spacing:-1.5px;line-height:1;transition:color .2s;font-variant-numeric:tabular-nums;}
      .vt.editing .vtval{color:var(--jma-rose);}
      .vttrack{position:relative;height:18px;border-radius:11px;background:var(--jma-surf3);cursor:pointer;margin:0 3px;touch-action:none;}
      .vtfill{position:absolute;left:0;top:0;bottom:0;border-radius:11px;background:var(--jma-grad);transition:width .12s;}
      .vtthumb{position:absolute;top:50%;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 2px 9px rgba(0,0,0,.32);transform:translate(-50%,-50%);pointer-events:none;transition:left .12s;border:3px solid var(--jma-rose);}
      .vtbtns{display:flex;gap:8px;}
      .vtbtn{flex:1;height:42px;border-radius:13px;border:none;cursor:pointer;background:var(--jma-surf3);color:var(--jma-text);display:flex;align-items:center;justify-content:center;transition:transform .08s;}
      .vtbtn:active{transform:scale(.92);}.vtbtn ha-icon{--mdc-icon-size:23px;}
      .vtpre{display:flex;gap:6px;}
      .vtpc{flex:1;height:28px;border-radius:9px;border:none;cursor:pointer;background:var(--jma-surf2);color:var(--jma-text);font-size:.72rem;font-weight:800;transition:transform .08s,background .15s;font-variant-numeric:tabular-nums;}
      .vtpc:active{transform:scale(.92);background:var(--jma-grad);color:var(--jma-dark);}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="vt" id="vt">
          <div class="vthead"><div class="vticon"><ha-icon class="vti" icon="mdi:window-shutter"></ha-icon></div>
            <div class="vtname"></div><div class="vtact">—</div></div>
          <div class="vtval" id="val">—</div>
          <div class="vttrack" id="track"><div class="vtfill" id="fill"></div><div class="vtthumb" id="thumb"></div></div>
          <div class="vtpre" id="pre"></div>
          <div class="vtbtns">
            <button class="vtbtn" data-a="open_cover" aria-label="Ouvrir"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
            <button class="vtbtn" data-a="stop_cover" aria-label="Stop"><ha-icon icon="mdi:stop"></ha-icon></button>
            <button class="vtbtn" data-a="close_cover" aria-label="Fermer"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
          </div>
        </div>
      </div></div></ha-card>`;
    this.shadowRoot.querySelectorAll(".vtbtn").forEach((b) => b.addEventListener("click", () => this._hass.callService("cover", b.dataset.a, { entity_id: this._config.entity })));
    const pre = this.shadowRoot.getElementById("pre");
    (this._config.presets || []).forEach((p) => { const b = document.createElement("button"); b.className = "vtpc"; b.textContent = p + "%";
      b.addEventListener("click", () => this._setPos(p, true)); pre.appendChild(b); });
    const track = this.shadowRoot.getElementById("track");
    const fromX = (e) => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100))); };
    track.addEventListener("pointerdown", (e) => { if (!this._supportsPos()) return; e.stopPropagation(); this._drag = true; try { track.setPointerCapture(e.pointerId); } catch (_) {} this._setPos(fromX(e), false); });
    track.addEventListener("pointermove", (e) => { if (this._drag) this._setPos(fromX(e), false); });
    const end = (e) => { if (!this._drag) return; this._drag = false; this._setPos(fromX(e), true); };
    track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
  }
  _paint(p) { this.shadowRoot.getElementById("val").textContent = p + "%"; this.shadowRoot.getElementById("fill").style.width = p + "%"; this.shadowRoot.getElementById("thumb").style.left = p + "%"; }
  _setPos(p, commit) {
    const R = this._R; R.pend = p; const vt = this.shadowRoot.getElementById("vt"); vt.classList.add("editing"); this._paint(p);
    clearTimeout(R.timer);
    R.timer = setTimeout(() => { this._hass.callService("cover", "set_cover_position", { entity_id: this._config.entity, position: R.pend });
      clearTimeout(R.hold); R.hold = setTimeout(() => { R.pend = null; vt.classList.remove("editing"); }, 3000); }, commit ? 0 : 350);
  }
  _update() {
    const s = this._s; if (!s) return; const a = s.attributes; const vt = this.shadowRoot.getElementById("vt");
    this.shadowRoot.querySelector(".vtname").textContent = this._config.name || a.friendly_name || this._config.entity;
    const pos = a.current_position;
    const open = s.state === "open" || (pos || 0) > 0;
    const hasPos = this._supportsPos();
    this.shadowRoot.getElementById("track").style.display = hasPos ? "block" : "none";
    this.shadowRoot.getElementById("pre").style.display = hasPos ? "flex" : "none";
    this.shadowRoot.getElementById("val").style.display = hasPos ? "block" : "none";
    if (hasPos && this._R.pend == null && !this._drag && pos != null) this._paint(pos);
    this.shadowRoot.querySelector(".vtact").textContent = pos != null ? (pos === 0 ? "Fermé" : pos === 100 ? "Ouvert" : pos + "% ouvert") : (open ? "Ouvert" : s.state === "closed" ? "Fermé" : s.state);
    vt.classList.toggle("on", open);
    this.shadowRoot.querySelector(".vti").setAttribute("icon", open ? "mdi:window-shutter-open" : "mdi:window-shutter");
  }
}
jmaDef("jma-cover-tile-card", JmaCoverTileCard);

// =============================================================================
//  🎯 THERMOSTAT CADRAN (façon Nest) — anneau circulaire, glisser pour régler
// =============================================================================
class JmaClimateDialCard extends JmaBase {
  static getStubConfig() { return { entity: "climate.example" }; }
  _pt(deg) { const r = (deg) * Math.PI / 180; return { x: 100 + 82 * Math.cos(r), y: 100 + 82 * Math.sin(r) }; }
  _arc(fa, fb) {
    const a0 = 135 + fa * 270, a1 = 135 + fb * 270;
    const p0 = this._pt(a0), p1 = this._pt(a1);
    return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A 82 82 0 ${(a1 - a0) > 180 ? 1 : 0} 1 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  _build() {
    const extra = `.dial{position:relative;width:100%;max-width:230px;margin:0 auto;aspect-ratio:1;}
      .dial svg{width:100%;height:100%;display:block;touch-action:none;cursor:pointer;}
      .track{fill:none;stroke:var(--jma-track);stroke-width:13;stroke-linecap:round;}
      .fillarc{fill:none;stroke-width:13;stroke-linecap:round;transition:stroke .3s;}
      .knob{fill:#fff;stroke:rgba(0,0,0,.25);stroke-width:1;}
      .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;}
      .dset{font-weight:800;font-size:2.4rem;letter-spacing:-2px;line-height:1;}
      .dcur{font-size:.72rem;opacity:.6;margin-top:4px;} .dmode{font-size:.7rem;opacity:.8;margin-top:2px;font-weight:700;}`;
    this.shadowRoot.innerHTML = this._styleBlock(extra) + CARD_WRAP_OPEN +
      `<div class="tile flat"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic" icon="mdi:thermostat"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div></div>
         <div class="dial" id="dial">
           <svg viewBox="0 0 200 200">
             <path class="track" d="${this._arc(0, 1)}"></path>
             <path class="fillarc" id="fill" d=""></path>
             <circle class="knob" id="knob" cx="100" cy="18" r="7"></circle>
           </svg>
           <div class="center"><div class="dset" id="set">—</div><div class="dcur" id="cur"></div><div class="dmode" id="dm"></div></div>
         </div>
         <div class="chips" id="modes"></div>
       </div></div></ha-card>`;
    const dial = this.shadowRoot.getElementById("dial");
    const onMove = (e) => {
      const a = this._s && this._s.attributes; if (!a) return;
      const r = dial.getBoundingClientRect();
      let ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
      if (ang < 0) ang += 360;
      let rel = ang - 135; if (rel < 0) rel += 360;
      let frac = rel / 270; if (frac > 1) frac = (rel - 270) < (360 - rel) ? 1 : 0;
      frac = Math.max(0, Math.min(1, frac));
      const min = a.min_temp ?? 7, max = a.max_temp ?? 35, step = a.target_temp_step || 0.5;
      this._pending = Math.round((min + frac * (max - min)) / step) * step;
      this._paint(this._pending, a);
    };
    let dragging = false;
    dial.addEventListener("pointerdown", (e) => { dragging = true; try { dial.setPointerCapture(e.pointerId); } catch (_) {} onMove(e); });
    dial.addEventListener("pointermove", (e) => { if (dragging) onMove(e); });
    const end = () => { if (!dragging) return; dragging = false; if (this._pending != null) { this._call("climate", "set_temperature", { entity_id: this._config.entity, temperature: this._pending }); this._pending = null; } };
    dial.addEventListener("pointerup", end);
    dial.addEventListener("pointercancel", end);
    this._wireHold(this.shadowRoot.querySelector(".badge"), null);
  }
  _color(s) { return s.state === "heat" ? "#ff7043" : s.state === "cool" ? "#40c4ff" : s.state === "dry" ? "#ffca28" : s.state === "off" ? "var(--jma-track)" : this._config.color; }
  _paint(temp, a) {
    const min = a.min_temp ?? 7, max = a.max_temp ?? 35;
    const frac = Math.max(0, Math.min(1, (temp - min) / (max - min)));
    this.shadowRoot.getElementById("fill").setAttribute("d", this._arc(0, Math.max(0.001, frac)));
    const k = this._pt(135 + frac * 270);
    const knob = this.shadowRoot.getElementById("knob"); knob.setAttribute("cx", k.x.toFixed(1)); knob.setAttribute("cy", k.y.toFixed(1));
    this.shadowRoot.getElementById("set").textContent = temp + "°";
  }
  _update() {
    const s = this._s; if (!s) return this._unavail();
    const a = s.attributes;
    const on = s.state !== "off" && s.state !== "unavailable";
    this.shadowRoot.querySelector(".ic").setAttribute("icon", this._icon(s, "mdi:thermostat"));
    this.shadowRoot.querySelector(".name").textContent = this._name(s);
    this.shadowRoot.querySelector(".sub").textContent = a.hvac_action ? (HVAC_ACTION_FR[a.hvac_action] || a.hvac_action) : (HVAC_FR[s.state] || s.state);
    this.shadowRoot.getElementById("fill").style.stroke = this._color(s);
    if (a.temperature != null && this._pending == null) this._paint(a.temperature, a);
    this.shadowRoot.getElementById("cur").textContent = a.current_temperature != null ? "Actuel " + a.current_temperature + "°" : "";
    this.shadowRoot.getElementById("dm").textContent = HVAC_FR[s.state] || s.state;
    this._dim(this.shadowRoot.querySelector(".tile"), s);
    const wrap = this.shadowRoot.getElementById("modes");
    if (wrap.childElementCount !== (a.hvac_modes || []).length) {
      wrap.innerHTML = "";
      (a.hvac_modes || []).forEach((m) => {
        const b = document.createElement("button"); b.className = "chip"; b.dataset.m = m; b.textContent = HVAC_FR[m] || m;
        b.addEventListener("click", () => this._call("climate", "set_hvac_mode", { entity_id: this._config.entity, hvac_mode: m }));
        wrap.appendChild(b);
      });
    }
    wrap.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.dataset.m === s.state));
  }
}
jmaDef("jma-climate-dial-card", JmaClimateDialCard);
jmaDef("jma-media-card", JmaMediaCard);
jmaDef("jma-vacuum-card", JmaVacuumCard);
jmaDef("jma-scene-card", JmaSceneCard);
jmaDef("jma-alarm-card", JmaAlarmCard);

// =============================================================================
//  🎚️ CARTE UNIVERSELLE (auto) — slider horizontal + pop-up
// =============================================================================
class JmaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._dragging = false;
    this._onSlider = false;
    this._built = false;
  }
  setConfig(config) {
    if (!config.entity) throw new Error("jma-card : 'entity' est requis");
    this._config = { slider: "auto", hold_action: "popup", color: ROSE, accent: BEIGE, dark: DARK, ...config };
    this._built = false;
  }
  getCardSize() { return 2; }
  static getStubConfig() { return { entity: "light.living_room", slider: "auto" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    jmaApplyTheme(this, hass, this._config);
    this._update();
    if (this._popup) this._popup.hass = hass;
  }
  get _stateObj() { return this._hass && this._config ? this._hass.states[this._config.entity] : undefined; }
  _domain() { return this._config.entity.split(".")[0]; }
  _isOn() {
    const s = this._stateObj;
    if (!s) return false;
    const d = this._domain();
    if (d === "climate") return s.state !== "off" && s.state !== "unavailable";
    if (d === "media_player") return ["playing", "paused", "on"].includes(s.state);
    if (d === "cover") return s.state === "open";
    return s.state === "on";
  }
  _sliderSpec() {
    const cfg = this._config.slider;
    if (cfg === "none") return null;
    const d = this._domain();
    const s = this._stateObj;
    if (!s) return null;
    const pick = (t) => cfg === "auto" || cfg === t;
    if (d === "light" && pick("brightness")) {
      const on = s.state === "on";
      const bri = on && s.attributes.brightness ? s.attributes.brightness : 0;
      return { kind: "brightness", value: Math.round((bri / 255) * 100), unit: "%" };
    }
    if (d === "media_player" && pick("volume")) {
      const v = s.attributes.volume_level;
      if (v == null) return null;
      return { kind: "volume", value: Math.round(v * 100), unit: "%" };
    }
    if (d === "cover" && pick("position")) {
      const p = s.attributes.current_position;
      if (p == null) return null;
      return { kind: "position", value: Math.round(p), unit: "%" };
    }
    if (d === "climate" && pick("temperature")) {
      const a = s.attributes;
      const min = a.min_temp ?? 7, max = a.max_temp ?? 35;
      const t = a.temperature ?? min;
      return { kind: "temperature", value: Math.round(((t - min) / (max - min)) * 100), raw: t, min, max, step: a.target_temp_step || 0.5, unit: "°" };
    }
    return null;
  }
  _build() {
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile" id="tile"><div class="content">
         <div class="top"><div class="badge"><ha-icon id="icon"></ha-icon></div>
           <div class="meta"><div class="name" id="name"></div><div class="sub" id="sub"></div></div></div>
         <div class="slider" id="slider" hidden>
           <div class="sfill" id="sfill"></div><span class="sval" id="sval"></span>
           <ha-icon class="sicon" id="sicon"></ha-icon></div>
       </div></div></ha-card>`;
    const tile = this.shadowRoot.getElementById("tile");
    tile.addEventListener("pointerdown", (e) => this._onDown(e));
    tile.addEventListener("pointermove", (e) => this._onMove(e));
    tile.addEventListener("pointerup", (e) => this._onUp(e));
    tile.addEventListener("pointercancel", () => this._cancel());
    this._built = true;
  }
  _styleBlock() {
    const c = this._config;
    return `<style>:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}${BASE_CSS}</style>`;
  }
  _update() {
    const s = this._stateObj;
    const tile = this.shadowRoot.getElementById("tile");
    if (!tile) return;
    if (!s) { this.shadowRoot.getElementById("name").textContent = this._config.entity + " (indispo)"; return; }
    const on = this._isOn();
    const spec = this._sliderSpec();
    const fn = this._config.name || s.attributes.friendly_name || this._config.entity;
    const icon = this._config.icon || s.attributes.icon || this._defaultIcon(this._domain(), on);
    this.shadowRoot.getElementById("icon").setAttribute("icon", icon);
    this.shadowRoot.getElementById("name").textContent = fn;
    this.shadowRoot.getElementById("sub").textContent = this._subText(s, on, spec);
    tile.classList.toggle("on", on);
    const slider = this.shadowRoot.getElementById("slider");
    if (spec) {
      slider.hidden = false;
      if (!this._dragging) {
        const show = on || spec.kind !== "brightness";
        const v = show ? spec.value : 0;
        this.shadowRoot.getElementById("sfill").style.width = v + "%";
        this.shadowRoot.getElementById("sval").textContent = spec.kind === "temperature" ? (show ? spec.raw + "°" : "") : v + "%";
        this.shadowRoot.getElementById("sicon").setAttribute("icon", this._sliderIcon(spec.kind));
      }
    } else slider.hidden = true;
  }
  _subText(s, on, spec) {
    const d = this._domain();
    if (d === "climate") {
      const a = s.attributes;
      return ((a.current_temperature != null ? a.current_temperature + "°" : "") + (a.temperature != null ? " → " + a.temperature + "°" : "")) || s.state;
    }
    if (d === "media_player") return s.attributes.media_title || s.attributes.source || s.state;
    return on ? "Allumé" : "Éteint";
  }
  _sliderIcon(kind) {
    return { brightness: "mdi:brightness-6", volume: "mdi:volume-high", position: "mdi:arrow-up-down", temperature: "mdi:thermometer" }[kind] || "mdi:tune-variant";
  }
  _defaultIcon(d, on) {
    return ({
      light: "mdi:lightbulb", switch: "mdi:power-socket-eu", fan: "mdi:fan", climate: "mdi:thermostat",
      media_player: "mdi:speaker", cover: on ? "mdi:window-shutter-open" : "mdi:window-shutter",
      scene: "mdi:palette", script: "mdi:play", input_boolean: "mdi:toggle-switch",
      vacuum: "mdi:robot-vacuum", alarm_control_panel: "mdi:shield-home",
    }[d] || "mdi:circle");
  }
  _valFromX(e) {
    const slider = this.shadowRoot.getElementById("slider");
    const r = slider.getBoundingClientRect();
    return Math.max(0, Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100)));
  }
  _setSliderVisual(v) {
    this.shadowRoot.getElementById("sfill").style.width = v + "%";
    this.shadowRoot.getElementById("sval").textContent = this._spec.kind === "temperature" ? this._tempFromPct(v) + "°" : v + "%";
  }
  _onDown(e) {
    const tile = this.shadowRoot.getElementById("tile");
    const slider = this.shadowRoot.getElementById("slider");
    this._spec = this._sliderSpec();
    this._holdFired = false;
    this._onSlider = !!(this._spec && !slider.hidden && e.composedPath().includes(slider));
    tile.setPointerCapture(e.pointerId);
    if (this._onSlider) {
      this._dragging = true; slider.classList.add("dragging");
      const v = this._valFromX(e); this._pendingValue = v; this._setSliderVisual(v);
      return;
    }
    this._startX = e.clientX; this._startY = e.clientY;
    tile.classList.add("active");
    const r = tile.getBoundingClientRect();
    tile.style.setProperty("--rx", ((e.clientX - r.left) / r.width) * 100 + "%");
    tile.style.setProperty("--ry", ((e.clientY - r.top) / r.height) * 100 + "%");
    if (this._config.hold_action !== "none") {
      this._holdTimer = setTimeout(() => {
        this._holdFired = true; if (navigator.vibrate) navigator.vibrate(12); this._hold();
      }, 480);
    }
  }
  _onMove(e) {
    if (this._onSlider) {
      const v = this._valFromX(e); this._pendingValue = v; this._setSliderVisual(v); return;
    }
    if (this._startX == null) return;
    if (Math.abs(e.clientX - this._startX) > 6 || Math.abs(e.clientY - this._startY) > 6) clearTimeout(this._holdTimer);
  }
  _onUp() {
    clearTimeout(this._holdTimer);
    const tile = this.shadowRoot.getElementById("tile");
    tile.classList.remove("active");
    if (this._onSlider) {
      if (this._pendingValue != null) this._applySlider(this._spec, this._pendingValue);
      return this._cancel();
    }
    if (this._holdFired) return this._cancel();
    this._cancel();
    tile.classList.remove("ripple"); void tile.offsetWidth; tile.classList.add("ripple");
    this._openPopup();
  }
  _cancel() {
    clearTimeout(this._holdTimer);
    const slider = this.shadowRoot.getElementById("slider");
    this._dragging = false; this._onSlider = false; this._pendingValue = null;
    this._startX = null; this._startY = null;
    if (slider) slider.classList.remove("dragging");
    setTimeout(() => this._update(), 120);
  }
  _hold() {
    this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: this._config.entity } }));
  }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = this._config; p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _tempFromPct(v) { const s = this._spec; return Math.round((s.min + (v / 100) * (s.max - s.min)) / s.step) * s.step; }
  _tap() {
    const d = this._domain(), id = this._config.entity;
    if (d === "scene") return this._call("scene", "turn_on", { entity_id: id });
    if (d === "script") return this._call("script", "turn_on", { entity_id: id });
    if (d === "media_player") return this._call("media_player", "media_play_pause", { entity_id: id });
    if (d === "cover") return this._call("cover", this._isOn() ? "close_cover" : "open_cover", { entity_id: id });
    this._call("homeassistant", "toggle", { entity_id: id });
  }
  _applySlider(spec, v) {
    const id = this._config.entity;
    if (spec.kind === "brightness") this._call("light", "turn_on", { entity_id: id, brightness_pct: v });
    else if (spec.kind === "volume") this._call("media_player", "volume_set", { entity_id: id, volume_level: v / 100 });
    else if (spec.kind === "position") this._call("cover", "set_cover_position", { entity_id: id, position: v });
    else if (spec.kind === "temperature") this._call("climate", "set_temperature", { entity_id: id, temperature: this._tempFromPct(v) });
  }
  _call(domain, service, data) { if (this._hass) this._hass.callService(domain, service, data); }
}
jmaDef("jma-card", JmaCard);

// =============================================================================
//  POP-UP CUSTOM (bottom-sheet iOS) — partagé par toutes les cartes
// =============================================================================
class JmaPopup extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  set config(c) { this._config = c; }
  set hass(h) { this._hass = h; if (this._built) { jmaApplyTheme(this, h, this._config); this._refresh(); } }
  connectedCallback() {
    this._build();
    if (this._config && this._config.inline) return;
    requestAnimationFrame(() => this.shadowRoot.getElementById("wrap").classList.add("show"));
    this._onKey = (e) => { if (e.key === "Escape") this._close(); };
    document.addEventListener("keydown", this._onKey);
  }
  disconnectedCallback() { if (this._onKey) document.removeEventListener("keydown", this._onKey); clearInterval(this._camTimer); }
  get _s() { return this._hass && this._config.entity ? this._hass.states[this._config.entity] : undefined; }
  _domain() { return (this._config.entity || "x.x").split(".")[0]; }
  _kind() { return this._config.kind || this._domain(); }
  _close() {
    if (this._config && this._config.inline) return;
    if (this._closing) return;
    this._closing = true;
    clearInterval(this._camTimer);
    if (this._onKey) document.removeEventListener("keydown", this._onKey);
    const w = this.shadowRoot.getElementById("wrap");
    w.classList.remove("show");
    setTimeout(() => { this.dispatchEvent(new CustomEvent("jma-close")); this.remove(); }, 260);
  }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host{--jma-rose:${c.color || ROSE};--jma-beige:${c.accent || BEIGE};--jma-blue:${c.blue || BLUE};--jma-dark:${c.dark || DARK};
          --jma-grad:linear-gradient(135deg,var(--jma-blue),var(--jma-rose));
          --p-bg:rgba(250,247,240,.93);--p-text:#42382a;--p-surf:rgba(66,56,42,.06);--p-surf2:rgba(66,56,42,.045);
          --p-track:rgba(66,56,42,.1);--p-line:rgba(66,56,42,.09);--p-grab:rgba(66,56,42,.2);--p-mut:rgba(66,56,42,.55);
          --p-knob:#fff;--p-tip:rgba(255,251,243,.97);--p-dim:rgba(0,0,0,.45);}
        :host(.dark){--p-bg:rgba(20,20,22,.86);--p-text:#fff;--p-surf:rgba(255,255,255,.08);--p-surf2:rgba(255,255,255,.06);
          --p-track:rgba(255,255,255,.13);--p-line:rgba(255,255,255,.1);--p-grab:rgba(255,255,255,.25);--p-mut:rgba(255,255,255,.55);
          --p-knob:#fff;--p-tip:rgba(10,10,11,.96);--p-dim:rgba(0,0,0,.55);}
        .back{position:fixed;inset:0;z-index:9999;background:var(--p-dim);
          backdrop-filter:blur(6px);opacity:0;transition:opacity .26s ease;display:flex;align-items:flex-end;justify-content:center;}
        .back.show{opacity:1;}
        .sheet{width:100%;max-width:460px;margin:0 12px 12px;box-sizing:border-box;max-height:88vh;
          display:flex;flex-direction:column;overflow:hidden;
          background:var(--p-bg);backdrop-filter:blur(28px) saturate(150%);
          -webkit-backdrop-filter:blur(28px) saturate(150%);border:1px solid var(--p-line);
          border-radius:28px;color:var(--p-text);padding:18px 18px 20px;transform:translateY(40px);opacity:0;
          box-shadow:0 12px 40px rgba(0,0,0,.18);
          transition:transform .3s cubic-bezier(.2,.8,.25,1),opacity .3s ease;}
        @media(min-width:768px){.back{align-items:center;} .sheet{margin:0;max-height:90vh;}}
        .back.wide .sheet{max-width:640px;}
        .back.xwide .sheet{max-width:860px;}
        .back.inline{position:static;inset:auto;z-index:auto;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;opacity:1;display:block;padding:0;}
        .back.inline .sheet{max-width:none;width:100%;margin:0;max-height:none;box-shadow:none;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;border:none;border-radius:0;padding:2px;transform:none;opacity:1;overflow:visible;}
        .back.inline .grab,.back.inline .x{display:none;}
        .back.inline #body{overflow:visible;margin:0;padding:0;}
        .slrow{display:flex;align-items:center;gap:11px;background:var(--p-surf);border:1px solid var(--p-line);border-radius:15px;padding:12px 14px;margin:8px 0;transition:border-color .3s,background .3s;}
        .slrow .si{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--p-track);flex:none;}
        .slrow .si ha-icon{--mdc-icon-size:19px;color:var(--p-text);}
        .slrow.ok .si ha-icon{color:#34c759;}
        .slrow .sn{flex:1;min-width:0;font-weight:700;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .slrow .slm{flex:1;min-width:0;}
        .slrow .slm .sn{font-weight:700;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .slrow .slm .slsub{font-size:.68rem;opacity:.55;font-weight:600;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .slrow .sv{font-size:.7rem;font-weight:800;padding:4px 11px;border-radius:999px;background:var(--p-track);color:var(--p-mut);white-space:nowrap;}
        .slrow.ok .sv{color:#2ba24a;}
        .slrow.alert{border-color:#ff3b30;background:rgba(255,59,48,.12);}
        .slrow.alert .si{background:#ff3b30;}.slrow.alert .si ha-icon{color:#fff;}.slrow.alert .sv{background:#ff3b30;color:#fff;}
        .slrow.live{border-color:#6aa3ff;background:rgba(106,163,255,.12);}
        .slrow.live .si{background:#6aa3ff;}.slrow.live .si ha-icon{color:#fff;}.slrow.live .sv{background:#6aa3ff;color:#fff;}
        .slrow.warn{border-color:#ff9f0a;background:rgba(255,159,10,.12);}
        .slrow.warn .si{background:#ff9f0a;}.slrow.warn .si ha-icon{color:#3a2400;}.slrow.warn .sv{background:#ff9f0a;color:#3a2400;}
        .slempty{opacity:.5;text-align:center;padding:20px;font-size:.85rem;}
        .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}
        @media(max-width:680px){.grid2{grid-template-columns:1fr;}}
        .grid2 .grow{margin:0;}
        .back.show .sheet{transform:translateY(0);opacity:1;}
        .grab{width:38px;height:4px;border-radius:999px;background:var(--p-grab);margin:0 auto 14px;flex:none;}
        .head{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex:none;}
        #body{overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;flex:1 1 auto;min-height:0;
          margin:0 -4px;padding:0 4px;}
        .hicon{width:48px;height:48px;border-radius:50%;background:rgba(248,165,194,.2);display:flex;align-items:center;justify-content:center;}
        .hicon ha-icon{--mdc-icon-size:26px;color:var(--jma-rose);}
        .htxt{flex:1;min-width:0;}
        .htitle{font-weight:700;font-size:1.1rem;letter-spacing:-.3px;}
        .hsub{font-size:.82rem;opacity:.6;margin-top:2px;}
        .x{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;background:var(--p-surf);color:var(--p-text);font-size:1rem;}
        .row{margin:16px 0;}
        .lbl{display:flex;justify-content:space-between;font-size:.82rem;opacity:.7;margin-bottom:8px;}
        .lbl b{color:var(--jma-rose);font-weight:700;}
        input[type=range]{width:100%;height:34px;-webkit-appearance:none;appearance:none;background:transparent;accent-color:var(--jma-rose);margin:0;}
        input[type=range]::-webkit-slider-runnable-track{height:34px;border-radius:14px;background:var(--p-track);}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;margin-top:2px;border-radius:50%;background:var(--p-knob);box-shadow:0 2px 8px rgba(0,0,0,.4);}
        input[type=range]::-moz-range-track{height:34px;border-radius:14px;background:var(--p-track);}
        input[type=range]::-moz-range-thumb{width:30px;height:30px;border:none;border-radius:50%;background:var(--p-knob);}
        .climctl{margin:14px 0 8px;}
        .climhead{display:flex;align-items:center;justify-content:center;gap:20px;}
        .climset{text-align:center;min-width:104px;}
        .climset .cbig{font-weight:800;font-size:2.5rem;letter-spacing:-1.5px;line-height:1;}
        .climset .clbl{font-size:.68rem;opacity:.6;font-weight:800;text-transform:uppercase;letter-spacing:.6px;margin-top:4px;}
        .climstep{width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;background:var(--p-surf);color:var(--p-text);display:flex;align-items:center;justify-content:center;flex:none;transition:transform .08s;}
        .climstep:active{transform:scale(.9);}.climstep ha-icon{--mdc-icon-size:24px;}
        .climreal{display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0 16px;font-size:.86rem;font-weight:700;}
        .climreal ha-icon{--mdc-icon-size:17px;color:var(--jma-rose);}
        .climreal .cact{padding:2px 10px;border-radius:8px;background:var(--p-surf);font-size:.74rem;font-weight:700;}
        .ctrack{position:relative;height:42px;border-radius:14px;background:var(--p-track);cursor:pointer;touch-action:none;}
        .cfill{position:absolute;left:0;top:0;bottom:0;border-radius:14px;background:linear-gradient(90deg,var(--jma-blue),var(--jma-rose));width:0%;pointer-events:none;transition:width .15s;}
        .cthumb{position:absolute;top:50%;width:28px;height:28px;border-radius:50%;background:var(--p-knob);box-shadow:0 2px 9px rgba(0,0,0,.4);transform:translate(-50%,-50%);pointer-events:none;transition:left .15s;z-index:2;}
        .creal{position:absolute;top:-6px;bottom:-6px;width:3px;border-radius:3px;background:var(--p-text);transform:translateX(-50%);pointer-events:none;z-index:3;}
        .creal::after{content:attr(data-t);position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:.62rem;font-weight:800;white-space:nowrap;}
        .cscale{display:flex;justify-content:space-between;font-size:.64rem;opacity:.5;font-weight:700;margin-top:8px;}
        .grow{display:flex;align-items:center;gap:11px;flex-wrap:wrap;background:var(--p-surf);border:1px solid var(--p-line);border-radius:16px;padding:9px 11px;margin:8px 0;}
        .gicon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--p-track);flex:none;transition:background .3s;}
        .gicon ha-icon{--mdc-icon-size:22px;color:var(--p-text);transition:color .3s;}
        .grow.on .gicon{background:var(--jma-grad);}.grow.on .gicon ha-icon{color:var(--jma-dark);}
        .grow.warn .gicon{background:linear-gradient(135deg,#ffb24d,#ff7e42);}.grow.warn .gicon ha-icon{color:#3a1d00;}
        .grow.cool .gicon{background:linear-gradient(135deg,#7fb0ff,#5b9bff);}.grow.cool .gicon ha-icon{color:#04204a;}
        .gmeta{flex:1;min-width:90px;}
        .gn{font-weight:700;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .gs{font-size:.75rem;opacity:.62;margin-top:1px;}
        .gbtns{display:flex;gap:5px;flex:none;}
        .gbtns .cbtn{min-width:40px;}
        .gctl{display:flex;align-items:center;gap:8px;flex:none;}
        .gstep{width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;background:var(--p-track);color:var(--p-text);display:flex;align-items:center;justify-content:center;transition:transform .08s;}
        .gstep:active{transform:scale(.9);}.gstep ha-icon{--mdc-icon-size:20px;}
        .gset{font-weight:800;font-size:1.3rem;min-width:46px;text-align:center;letter-spacing:-.5px;transition:color .2s;}
        .grow.editing .gset{color:var(--jma-rose);}
        /* tuiles thermostat */
        .tcard{display:flex;flex-direction:column;gap:9px;background:var(--p-surf);border:1px solid var(--p-line);border-radius:18px;padding:11px 13px 12px;position:relative;overflow:hidden;transition:border-color .3s,box-shadow .3s;}
        .tcard::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:transparent;transition:background .3s;}
        .tcard.warn::before{background:linear-gradient(180deg,#ffb24d,#ff7e42);}
        .tcard.cool::before{background:linear-gradient(180deg,#7fb0ff,#5b9bff);}
        .tcard.warn{border-color:rgba(255,140,66,.42);box-shadow:0 4px 18px rgba(255,126,66,.12);}
        .tcard.cool{border-color:rgba(110,160,255,.42);box-shadow:0 4px 18px rgba(91,155,255,.12);}
        .tcard.on{border-color:rgba(150,170,120,.4);box-shadow:0 4px 16px rgba(0,0,0,.05);}
        .tcard.off{opacity:.46;filter:saturate(.55);}
        .tcard.off:active{opacity:.7;}
        .thead{display:flex;align-items:center;gap:9px;}
        .ticon{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--p-track);flex:none;transition:background .3s;}
        .ticon ha-icon{--mdc-icon-size:20px;color:var(--p-text);transition:color .3s;}
        .tcard.on .ticon{background:var(--jma-grad);}.tcard.on .ticon ha-icon{color:var(--jma-dark);}
        .tcard.warn .ticon{background:linear-gradient(135deg,#ffb24d,#ff7e42);}.tcard.warn .ticon ha-icon{color:#3a1d00;}
        .tcard.cool .ticon{background:linear-gradient(135deg,#7fb0ff,#5b9bff);}.tcard.cool .ticon ha-icon{color:#04204a;}
        .tname{font-weight:700;font-size:.95rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .tact{font-size:.64rem;font-weight:800;letter-spacing:.3px;text-transform:uppercase;padding:3px 9px;border-radius:999px;background:var(--p-track);color:var(--p-mut);white-space:nowrap;}
        .tcard.warn .tact{background:rgba(255,140,66,.18);color:#ff9248;}
        .tcard.cool .tact{background:rgba(110,160,255,.18);color:#6aa3ff;}
        .tstep{display:flex;align-items:center;justify-content:center;gap:20px;padding:2px 0 0;}
        .tbtn{width:42px;height:42px;border-radius:50%;border:none;cursor:pointer;background:var(--p-track);color:var(--p-text);display:flex;align-items:center;justify-content:center;transition:transform .08s,background .2s;}
        .tbtn:active{transform:scale(.86);}.tbtn ha-icon{--mdc-icon-size:24px;}
        .tval{font-weight:800;font-size:2.15rem;min-width:96px;text-align:center;letter-spacing:-1px;line-height:1;transition:color .2s;font-variant-numeric:tabular-nums;}
        .tcard.warn .tval{color:#ff9248;}.tcard.cool .tval{color:#6aa3ff;}
        .tcard.editing .tval{color:var(--jma-rose);}
        .tsub{display:flex;align-items:center;justify-content:center;gap:9px;margin-top:-2px;}
        .tcur{display:inline-flex;align-items:center;gap:3px;font-weight:800;font-size:.96rem;opacity:.92;font-variant-numeric:tabular-nums;}
        .tcur ha-icon{--mdc-icon-size:17px;opacity:.7;}
        .thum{font-size:.78rem;opacity:.55;font-weight:600;}
        .tmodes{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin-top:1px;}
        .tmode{width:34px;height:34px;border-radius:11px;border:1px solid var(--p-line);background:transparent;color:var(--p-mut);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .08s,background .15s,color .15s,border-color .15s;}
        .tmode:active{transform:scale(.9);}.tmode ha-icon{--mdc-icon-size:19px;}
        .tmode.on{background:var(--jma-grad);border-color:transparent;color:var(--jma-dark);}
        /* tuiles volet (grille) */
        .crow{display:flex;gap:9px;margin:9px 0;}
        .crow .ctile{flex:1 1 0;min-width:0;}
        @media(max-width:620px){.crow{flex-direction:column;}}
        .ctile{display:flex;flex-direction:column;gap:9px;background:var(--p-surf);border:1px solid var(--p-line);border-radius:16px;padding:10px 11px 11px;transition:border-color .3s;}
        .ctile.on{border-color:rgba(150,170,120,.42);}
        .chead{display:flex;align-items:center;gap:8px;}
        .cicon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--p-track);flex:none;transition:background .3s;}
        .cicon ha-icon{--mdc-icon-size:18px;color:var(--p-text);transition:color .3s;}
        .ctile.on .cicon{background:var(--jma-grad);}.ctile.on .cicon ha-icon{color:var(--jma-dark);}
        .cname{font-weight:700;font-size:.86rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .cpos{font-size:.74rem;font-weight:800;opacity:.62;white-space:nowrap;font-variant-numeric:tabular-nums;}
        .cbtns{display:flex;gap:6px;}
        .ccb{flex:1;height:34px;border-radius:10px;border:none;cursor:pointer;background:var(--p-track);color:var(--p-text);display:flex;align-items:center;justify-content:center;transition:transform .08s,background .15s;}
        .ccb:active{transform:scale(.9);}.ccb ha-icon{--mdc-icon-size:20px;}
        .cpre{display:flex;gap:5px;}
        .cpc{flex:1;height:27px;border-radius:8px;border:none;cursor:pointer;background:var(--p-surf2);color:var(--p-text);font-size:.7rem;font-weight:700;transition:transform .08s,background .15s;font-variant-numeric:tabular-nums;}
        .cpc:active{transform:scale(.92);background:var(--jma-grad);color:var(--jma-dark);}
        .cslider .slider{height:30px;}
        .ltgl{width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;background:var(--p-track);color:var(--p-text);display:flex;align-items:center;justify-content:center;flex:none;transition:background .2s,transform .08s;}
        .ltgl:active{transform:scale(.9);}.ltgl ha-icon{--mdc-icon-size:19px;}
        .ctile.on .ltgl{background:var(--jma-grad);color:var(--jma-dark);}
        /* sonos : barre transport persistante */
        .stp{position:sticky;top:0;z-index:6;background:linear-gradient(var(--p-bg) 72%,transparent);padding:1px 0 14px;margin-bottom:-4px;display:flex;flex-direction:column;gap:9px;}
        .stpbtns{display:flex;align-items:center;justify-content:center;gap:16px;}
        .stpb{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;background:var(--p-surf);color:var(--p-text);display:flex;align-items:center;justify-content:center;transition:transform .08s;}
        .stpb:active{transform:scale(.86);}.stpb ha-icon{--mdc-icon-size:24px;}
        .stpb.big{width:54px;height:54px;background:var(--jma-grad);color:var(--jma-dark);}.stpb.big ha-icon{--mdc-icon-size:28px;}
        .stpvol{padding:0 2px;}
        /* centre de sécurité */
        .seclbl{display:flex;align-items:center;gap:6px;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.5px;opacity:.5;margin:13px 2px 7px;}
        .secbig{font-weight:800;font-size:1.5rem;}
        .secarm{display:flex;gap:7px;flex-wrap:wrap;}
        .secarmb{flex:1;min-width:74px;padding:11px 8px;border:none;border-radius:14px;cursor:pointer;background:var(--p-surf);color:var(--p-text);font-weight:700;font-size:.8rem;display:flex;flex-direction:column;align-items:center;gap:4px;transition:transform .08s,background .2s;}
        .secarmb:active{transform:scale(.95);}.secarmb ha-icon{--mdc-icon-size:22px;}
        .secarmb.on{background:var(--jma-grad);color:var(--jma-dark);}
        .seczones{display:flex;gap:6px;flex-wrap:wrap;}
        .seczone{padding:7px 11px;border-radius:11px;border:1px solid var(--p-line);background:var(--p-surf);color:var(--p-text);font-size:.78rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;}
        .seczone.armed{background:var(--jma-grad);border-color:transparent;color:var(--jma-dark);}
        .secgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
        @media(max-width:680px){.secgrid{grid-template-columns:1fr;}}
        .secitem{display:flex;align-items:center;gap:9px;background:var(--p-surf);border:1px solid var(--p-line);border-radius:14px;padding:9px 11px;transition:border-color .3s,background .3s;}
        .secitem .si{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--p-track);flex:none;}
        .secitem .si ha-icon{--mdc-icon-size:18px;color:var(--p-text);}
        .secitem.ok .si ha-icon{color:#34c759;}
        .secitem.alert{border-color:rgba(255,59,48,.5);background:rgba(255,59,48,.1);}
        .secitem.alert .si{background:#ff3b30;}.secitem.alert .si ha-icon{color:#fff;}
        .secitem .sn{flex:1;min-width:0;font-weight:700;font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .secitem .sv{font-size:.7rem;font-weight:800;opacity:.65;white-space:nowrap;text-align:right;}
        .secitem.alert .sv{color:#ff5a4d;opacity:1;}
        .secbat{color:#ff9f0a;font-weight:800;}
        .seccams{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:7px;}
        .seccam{position:relative;border-radius:13px;overflow:hidden;background:#000;aspect-ratio:16/10;cursor:pointer;}
        .seccam img{width:100%;height:100%;object-fit:cover;display:block;}
        .seccam span{position:absolute;left:7px;bottom:6px;font-size:.66rem;font-weight:800;color:#fff;text-shadow:0 1px 3px #000;}
        .seccam .pb{position:absolute;top:6px;right:6px;background:rgba(255,59,48,.92);color:#fff;font-size:.58rem;font-weight:800;padding:2px 7px;border-radius:7px;display:none;}
        .seccam .pb.on{display:block;}
        .gslider{flex-basis:100%;}.gslider .slider{height:30px;}
        .swatches{display:flex;gap:10px;flex-wrap:wrap;}
        .sw{width:36px;height:36px;border-radius:50%;cursor:pointer;border:2px solid var(--p-line);transition:transform .2s;}
        .sw:hover{transform:scale(1.12);}
        .btns{display:flex;gap:8px;flex-wrap:wrap;}
        .btn{flex:1;min-width:84px;padding:13px;border:none;border-radius:16px;cursor:pointer;background:var(--p-surf);color:var(--p-text);font-weight:600;font-size:.9rem;transition:all .2s;}
        .btn:hover{background:rgba(248,165,194,.2);}
        .btn.primary{background:var(--jma-grad);color:var(--jma-dark);}
        .btn.on{background:var(--jma-grad);color:var(--jma-dark);}
        .stabs{display:flex;gap:4px;background:var(--p-surf2);padding:4px;border-radius:14px;margin-bottom:4px;}
        .stab{flex:1;border:none;background:none;color:var(--p-mut);font-weight:600;font-size:.84rem;padding:9px 6px;border-radius:11px;cursor:pointer;transition:all .18s;}
        .stab:hover{color:var(--p-text);}
        .stab.on{background:var(--jma-grad);color:var(--jma-dark);}
        .spane[hidden]{display:none;}
        .transport{display:flex;justify-content:center;gap:18px;align-items:center;}
        .tbtn{width:54px;height:54px;border-radius:50%;border:none;cursor:pointer;background:var(--p-surf);color:var(--p-text);display:flex;align-items:center;justify-content:center;}
        .tbtn ha-icon{--mdc-icon-size:26px;}
        .tbtn.big{width:64px;height:64px;background:var(--jma-grad);}
        .tbtn.big ha-icon{color:var(--jma-dark);}
        .gaugewrap{height:10px;border-radius:99px;background:var(--p-track);overflow:hidden;margin-top:8px;}
        .gaugefill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--jma-blue),var(--jma-rose));transition:width .4s;}
        .kv{display:flex;flex-wrap:wrap;gap:8px;}
        .kv .cell{flex:1 1 40%;min-width:120px;background:var(--p-surf);border-radius:12px;padding:9px 11px;box-sizing:border-box;}
        .kv .k{font-size:.7rem;opacity:.6;} .kv .v{font-weight:700;font-size:.95rem;margin-top:2px;}
        .bignum{font-weight:800;font-size:2rem;letter-spacing:-1px;}
        .statebig{font-weight:800;font-size:1.3rem;margin:2px 0;}
        .codedisp{text-align:center;font-size:1.5rem;font-weight:800;letter-spacing:8px;padding:4px 0 8px;min-height:1.6rem;}
        .kp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
        .kpk{height:52px;border:none;border-radius:14px;background:var(--p-surf);color:var(--p-text);font-size:1.3rem;
          font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .08s,background .2s;}
        .kpk:active{transform:scale(.93);background:rgba(248,165,194,.24);} .kpk ha-icon{--mdc-icon-size:24px;}
        .slider{position:relative;height:30px;border-radius:11px;overflow:hidden;flex:1;background:var(--p-track);touch-action:pan-y;cursor:pointer;}
        .slider[hidden]{display:none;}
        .slider:focus-visible{outline:2px solid var(--jma-blue);outline-offset:2px;}
        .sfill{position:absolute;left:0;top:0;bottom:0;width:0%;pointer-events:none;background:linear-gradient(90deg,var(--jma-blue),var(--jma-rose));transition:width .28s;}
        .slider.dragging .sfill{transition:none;}
        .sval{position:absolute;left:10px;top:50%;transform:translateY(-50%);z-index:2;pointer-events:none;font-weight:700;font-size:.76rem;}
        .sicon{position:absolute;right:9px;top:50%;transform:translateY(-50%);z-index:2;pointer-events:none;--mdc-icon-size:16px;color:var(--p-mut);}
        .favs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;}
        .fav{flex:none;display:flex;align-items:center;gap:5px;padding:7px 11px;border-radius:11px;border:none;cursor:pointer;background:var(--p-surf);color:var(--p-text);font-size:.78rem;font-weight:600;white-space:nowrap;max-width:160px;}
        .fav ha-icon{--mdc-icon-size:16px;color:var(--jma-rose);flex:none;} .fav span{overflow:hidden;text-overflow:ellipsis;}
        .ga{display:flex;gap:8px;}
        .gab{flex:1;height:36px;border:none;border-radius:12px;cursor:pointer;background:var(--p-surf);color:var(--p-text);font-size:.8rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:5px;}
        .gab ha-icon{--mdc-icon-size:17px;}
        .shrep{display:flex;justify-content:center;gap:28px;margin:2px 0;}
        .shb{background:none;border:none;cursor:pointer;color:var(--p-mut);} .shb.on{color:var(--jma-rose);} .shb ha-icon{--mdc-icon-size:22px;}
        .sroom{display:flex;align-items:center;gap:8px;margin:7px 0;}
        .slk,.smute{width:32px;height:32px;border-radius:9px;border:none;cursor:pointer;flex:none;background:var(--p-surf);color:var(--p-text);display:flex;align-items:center;justify-content:center;}
        .slk.on{background:var(--jma-rose);color:var(--jma-dark);} .slk.master{background:var(--jma-beige);color:var(--jma-dark);}
        .smute.on{color:#ff5252;} .slk ha-icon,.smute ha-icon{--mdc-icon-size:18px;}
        .srn{font-size:.8rem;font-weight:600;width:80px;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .chiprow{display:flex;gap:6px;flex-wrap:wrap;}
        .pchip{padding:7px 11px;border-radius:11px;background:var(--p-surf);border:none;color:var(--p-text);cursor:pointer;font-size:.8rem;text-transform:capitalize;}
        .pchip.on{background:var(--jma-grad);color:var(--jma-dark);font-weight:700;}
        .camimg{width:100%;border-radius:16px;display:block;background:#000;aspect-ratio:16/9;object-fit:cover;}
        .camlive{position:relative;border-radius:16px;overflow:hidden;background:#000;}
        .camtag{position:absolute;top:8px;left:8px;z-index:3;font-size:.6rem;font-weight:800;letter-spacing:.5px;
          padding:3px 8px;border-radius:7px;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;gap:5px;}
        .camtag.live::before{content:"";width:6px;height:6px;border-radius:50%;background:#ff3b30;animation:jma-pulse 1.4s infinite;}
        @keyframes jma-pulse{0%,100%{opacity:1;}50%{opacity:.2;}}
        .livecard{display:block;width:100%;--ha-card-border-radius:16px;--ha-card-box-shadow:none;--ha-card-border-width:0;}
        .livecard video,.livecard img{display:block;width:100%;border-radius:16px;}
        .graph{--ha-card-background:transparent;--card-background-color:transparent;background:transparent;display:block;}
        .gw{position:relative;height:90px;touch-action:none;cursor:crosshair;}
        .gw svg{width:100%;height:100%;display:block;}
        .gline{position:absolute;top:0;bottom:0;width:1px;background:var(--p-track);pointer-events:none;display:none;}
        .gmark{position:absolute;width:9px;height:9px;border-radius:50%;background:var(--p-knob);transform:translate(-50%,-50%);
          box-shadow:0 0 0 3px var(--p-track);pointer-events:none;display:none;}
        .gtip{position:absolute;transform:translate(-50%,calc(-100% - 10px));background:var(--p-tip);color:var(--p-text);
          border:1px solid var(--p-line);border-radius:8px;padding:4px 8px;font-size:.68rem;font-weight:700;
          white-space:nowrap;pointer-events:none;display:none;z-index:4;}
        .gmsg{opacity:.45;font-size:.74rem;padding-top:34px;text-align:center;}
        .granges{display:flex;gap:5px;}
        .gr{font-size:.62rem;font-weight:700;padding:2px 7px;border-radius:7px;border:none;cursor:pointer;background:var(--p-surf);color:var(--p-text);}
        .gr.on{background:var(--jma-rose);color:var(--jma-dark);}
      </style>
      <div class="back" id="wrap">
        <div class="sheet" id="sheet">
          <div class="grab"></div>
          <div class="head">
            <div class="hicon"><ha-icon id="hi"></ha-icon></div>
            <div class="htxt"><div class="htitle" id="ht"></div><div class="hsub" id="hs"></div></div>
            <button class="x" id="x">✕</button>
          </div>
          <div id="body"></div>
        </div>
      </div>`;
    const wrap = this.shadowRoot.getElementById("wrap");
    // fermeture sur le fond UNIQUEMENT si le geste a démarré sur le fond et après un délai
    // de garde (évite la fermeture immédiate par le "click" de synthèse tactile à l'ouverture)
    this._openedAt = Date.now();
    let downOnBack = false;
    wrap.addEventListener("pointerdown", (e) => { downOnBack = e.target === wrap; });
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap && downOnBack && Date.now() - this._openedAt > 350) this._close();
      downOnBack = false;
    });
    this.shadowRoot.getElementById("x").addEventListener("click", (e) => { e.stopPropagation(); this._close(); });
    this._built = true;
    jmaApplyTheme(this, this._hass, this._config);
    if (this._config.inline) wrap.classList.add("inline");
    else if (this._kind() === "sonos" || this._kind() === "lights") this.shadowRoot.getElementById("wrap").classList.add("wide");
    else if (this._kind() === "climates" || this._kind() === "covers" || this._kind() === "security") this.shadowRoot.getElementById("wrap").classList.add("xwide");
    this._renderBody();
    this._refresh();
  }
  _refresh() {
    if (this._kind() === "agenda") {
      this.shadowRoot.getElementById("ht").textContent = this._config.title || "Agenda";
      this.shadowRoot.getElementById("hs").textContent = (this._config.days || 7) + " prochains jours";
      this.shadowRoot.getElementById("hi").setAttribute("icon", "mdi:calendar-month");
      return;
    }
    if (this._kind() === "sonos") {
      const m = this._sonosMaster(), ms = m && this._hass.states[m];
      const a = ms ? ms.attributes : {};
      this.shadowRoot.getElementById("ht").textContent = this._config.name || "Sonos";
      this.shadowRoot.getElementById("hs").textContent = a.media_title ? a.media_title + (a.media_artist ? " — " + a.media_artist : "") : (ms && ["playing", "paused"].includes(ms.state) ? ms.state : "À l'arrêt");
      this.shadowRoot.getElementById("hi").setAttribute("icon", "mdi:speaker-multiple");
      this._sonosTick();
      return;
    }
    if (this._kind() === "scenes") {
      const n = (this._config.scenes || []).length;
      this.shadowRoot.getElementById("ht").textContent = this._config.name ? this._config.name + " — Ambiances" : "Ambiances";
      this.shadowRoot.getElementById("hs").textContent = n + " scène" + (n > 1 ? "s" : "");
      this.shadowRoot.getElementById("hi").setAttribute("icon", "mdi:palette");
      return;
    }
    if (this._kind() === "ev" || this._kind() === "energy") {
      const ev = this._kind() === "ev";
      this.shadowRoot.getElementById("ht").textContent = ev ? (this._config.name || "Voiture") : (this._config.title || "Énergie");
      this.shadowRoot.getElementById("hs").textContent = ev ? this._evState() : "Conso & production";
      this.shadowRoot.getElementById("hi").setAttribute("icon", ev ? "mdi:car-electric" : "mdi:flash");
      (this._graphs || []).forEach((g) => (g.hass = this._hass));
      return;
    }
    if (this._kind() === "seclist") {
      const n = (this._config.entities || []).length;
      this.shadowRoot.getElementById("ht").textContent = this._config.title || "Capteurs";
      this.shadowRoot.getElementById("hs").textContent = n + " capteur" + (n > 1 ? "s" : "");
      this.shadowRoot.getElementById("hi").setAttribute("icon", this._config.icon || "mdi:shield-home");
      if (this._seclistTick) this._seclistTick();
      return;
    }
    if (this._kind() === "security") {
      const al = this._config.alarm_entity && this._hass.states[this._config.alarm_entity];
      this.shadowRoot.getElementById("ht").textContent = this._config.name || "Sécurité";
      this.shadowRoot.getElementById("hs").textContent = al ? (ALARM_FR[al.state] || al.state) : "Centre de sécurité";
      this.shadowRoot.getElementById("hi").setAttribute("icon", al && ("" + al.state).startsWith("armed") ? "mdi:shield-lock" : "mdi:shield-home");
      if (this._securityTick) this._securityTick();
      return;
    }
    if (this._kind() === "covers" || this._kind() === "climates") {
      const cov = this._kind() === "covers", list = this._config.entities || [];
      this.shadowRoot.getElementById("ht").textContent = this._config.name || (cov ? "Volets" : "Thermostats");
      this.shadowRoot.getElementById("hs").textContent = list.length + (cov ? " volet" : " thermostat") + (list.length > 1 ? "s" : "");
      this.shadowRoot.getElementById("hi").setAttribute("icon", cov ? "mdi:window-shutter" : "mdi:thermostat");
      if (cov && this._coversTick) this._coversTick();
      if (!cov && this._climatesTick) this._climatesTick();
      return;
    }
    if (this._kind() === "lights") {
      const list = this._config.entities || []; let on = 0;
      list.forEach((e) => { const s = this._hass.states[e]; if (s && s.state === "on") on++; });
      this.shadowRoot.getElementById("ht").textContent = this._config.name || "Lumières";
      this.shadowRoot.getElementById("hs").textContent = on ? on + " allumée" + (on > 1 ? "s" : "") : "toutes éteintes";
      this.shadowRoot.getElementById("hi").setAttribute("icon", "mdi:lightbulb-group");
      if (this._lightsTick) this._lightsTick();
      return;
    }
    const s = this._s;
    if (!s) return this._close();
    const fn = this._config.name || s.attributes.friendly_name || this._config.entity;
    this.shadowRoot.getElementById("ht").textContent = fn;
    this.shadowRoot.getElementById("hs").textContent = this._headSub(s);
    this.shadowRoot.getElementById("hi").setAttribute("icon",
      this._config.icon || s.attributes.icon || this._popupIcon());
    const b = this.shadowRoot.getElementById("brightness");
    if (b && document.activeElement !== this && !this._editing)
      b.value = s.attributes.brightness ? Math.round((s.attributes.brightness / 255) * 100) : 0;
    const v = this.shadowRoot.getElementById("volume");
    if (v && !this._editing) v.value = Math.round((s.attributes.volume_level || 0) * 100);
    const cam = this.shadowRoot.getElementById("cam");
    if (cam && s.attributes.entity_picture) cam.src = s.attributes.entity_picture;
    if (this._camStream) { this._camStream.hass = this._hass; this._camStream.stateObj = s; }
    if (this._climTick) this._climTick();
    (this._graphs || []).forEach((g) => (g.hass = this._hass));
  }
  _popupIcon() {
    return { light: "mdi:lightbulb", climate: "mdi:thermostat", media_player: "mdi:speaker", cover: "mdi:window-shutter",
      alarm_control_panel: "mdi:shield-home", vacuum: "mdi:robot-vacuum", camera: "mdi:cctv", person: "mdi:account" }[this._domain()] || "mdi:tune";
  }
  _headSub(s) {
    const d = this._domain();
    if (d === "climate") return (s.attributes.current_temperature != null ? "Actuel " + s.attributes.current_temperature + "° · " : "") + (HVAC_FR[s.state] || s.state);
    if (d === "media_player") return s.attributes.media_title || s.state;
    if (d === "alarm_control_panel") return ALARM_FR[s.state] || s.state;
    if (d === "vacuum") return VACUUM_FR[s.state] || s.state;
    if (d === "camera") return s.state === "recording" ? "Enregistre" : s.state;
    if (d === "person" || d === "device_tracker") return (s.state === "home" ? "Présent" : s.state === "not_home" ? "Absent" : s.state) + " · " + jmaSince(s.last_changed);
    return s.state === "on" ? "Allumé" : s.state === "off" ? "Éteint" : s.state;
  }
  _renderBody() {
    const body = this.shadowRoot.getElementById("body");
    body.innerHTML = ""; this._graphs = []; this._climTick = null; this._coversTick = null; this._climatesTick = null; this._securityTick = null; this._lightsTick = null; this._seclistTick = null;
    if (this._kind() === "ev") return this._evBody(body);
    if (this._kind() === "energy") return this._energyBody(body);
    if (this._kind() === "agenda") return this._agendaBody(body);
    if (this._kind() === "sonos") return this._sonosBody(body);
    if (this._kind() === "scenes") return this._scenesBody(body);
    if (this._kind() === "covers") return this._coversBody(body);
    if (this._kind() === "climates") return this._climatesBody(body);
    if (this._kind() === "lights") return this._lightsBody(body);
    if (this._kind() === "security") return this._securityBody(body);
    if (this._kind() === "seclist") return this._secListBody(body);
    const d = this._domain();
    if (d === "light") return this._lightBody(body);
    if (d === "climate") return this._climateBody(body);
    if (d === "media_player") return this._mediaBody(body);
    if (d === "cover") return this._coverBody(body);
    if (d === "alarm_control_panel") return this._alarmBody(body);
    if (d === "vacuum") return this._vacuumBody(body);
    if (d === "camera") return this._cameraBody(body);
    if (d === "person" || d === "device_tracker") return this._personBody(body);
    return this._toggleBody(body);
  }
  async _graph(host, entities, hours) {
    entities = (entities || []).filter(Boolean);
    if (!entities.length || !this._hass) return;
    hours = hours || 24;
    host.innerHTML = `<div class="lbl"><span class="granges"></span><b id="gv"></b></div>` +
      `<div class="gw" id="gw"><div class="gmsg">chargement…</div><div class="gline"></div><div class="gmark"></div><div class="gtip"></div></div>`;
    const gr = host.querySelector(".granges");
    [[24, "24h"], [48, "48h"], [168, "7j"]].forEach(([h, lbl]) => {
      const b = document.createElement("button");
      b.className = "gr" + (h === hours ? " on" : ""); b.textContent = lbl;
      b.addEventListener("click", () => this._graph(host, entities, h));
      gr.appendChild(b);
    });
    const gw = host.querySelector("#gw");
    const setMsg = (m) => { const e = gw.querySelector(".gmsg"); if (e) e.textContent = m; };
    try {
      const res = await jmaHistory(this._hass, entities, hours);
      const series = {};
      (res || []).forEach((arr) => { if (arr && arr.length) series[arr[0].entity_id] = arr; });
      const colors = [this._config.color || ROSE, this._config.grid_color || "#3b9bff", "#69f0ae"];
      const lines = entities.map((eid, i) => {
        const arr = series[eid] || [];
        const pts = arr.map((p) => ({ t: new Date(p.last_changed || p.lc || p.lu).getTime(), v: parseFloat(p.state) }))
          .filter((p) => !isNaN(p.v) && !isNaN(p.t));
        return { eid, pts, color: colors[i % colors.length] };
      }).filter((l) => l.pts.length > 1);
      if (!lines.length) { setMsg("Pas d'historique numérique"); return; }
      let tMin = Infinity, tMax = -Infinity, vMin = Infinity, vMax = -Infinity;
      lines.forEach((l) => l.pts.forEach((p) => { tMin = Math.min(tMin, p.t); tMax = Math.max(tMax, p.t); vMin = Math.min(vMin, p.v); vMax = Math.max(vMax, p.v); }));
      if (vMin === vMax) { vMin -= 1; vMax += 1; }
      const W = 320, H = 90, pad = 5;
      const sx = (t) => pad + ((t - tMin) / (tMax - tMin || 1)) * (W - 2 * pad);
      const sy = (v) => H - pad - ((v - vMin) / (vMax - vMin || 1)) * (H - 2 * pad);
      let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
      lines.forEach((l, idx) => {
        const d = l.pts.map((p, i) => (i ? "L" : "M") + sx(p.t).toFixed(1) + " " + sy(p.v).toFixed(1)).join(" ");
        if (idx === 0) svg += `<path d="${d} L ${sx(l.pts[l.pts.length - 1].t).toFixed(1)} ${H - pad} L ${sx(l.pts[0].t).toFixed(1)} ${H - pad} Z" fill="${l.color}" opacity=".12"/>`;
        svg += `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      });
      svg += `</svg>`;
      gw.querySelector(".gmsg").remove();
      gw.insertAdjacentHTML("afterbegin", svg);
      const last = lines[0].pts[lines[0].pts.length - 1].v;
      const gv = host.querySelector("#gv"); if (gv) gv.textContent = (Math.round(last * 10) / 10) + "";
      const lab = document.createElement("div");
      lab.style.cssText = "display:flex;justify-content:space-between;font-size:.64rem;opacity:.5;margin-top:2px;";
      lab.innerHTML = `<span>min ${Math.round(vMin)}</span><span>max ${Math.round(vMax)}</span>`;
      host.appendChild(lab);
      // ---- interactif : survol / toucher = valeur + heure ----
      const prim = lines[0];
      const unit = (this._hass.states[prim.eid] && this._hass.states[prim.eid].attributes.unit_of_measurement) || "";
      const norm = prim.pts.map((p) => ({ x: sx(p.t) / W, y: sy(p.v) / H, v: p.v, t: p.t }));
      const line = gw.querySelector(".gline"), mark = gw.querySelector(".gmark"), tip = gw.querySelector(".gtip");
      const move = (e) => {
        const r = gw.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        let best = norm[0], bd = 2;
        for (const p of norm) { const dd = Math.abs(p.x - ratio); if (dd < bd) { bd = dd; best = p; } }
        const px = best.x * r.width, py = best.y * r.height;
        line.style.display = mark.style.display = tip.style.display = "block";
        line.style.left = px + "px"; mark.style.left = px + "px"; mark.style.top = py + "px"; mark.style.background = prim.color;
        tip.style.left = Math.max(30, Math.min(r.width - 30, px)) + "px"; tip.style.top = py + "px";
        const dt = new Date(best.t), hh = ("" + dt.getHours()).padStart(2, "0") + ":" + ("" + dt.getMinutes()).padStart(2, "0");
        tip.textContent = (Math.round(best.v * 10) / 10) + (unit ? " " + unit : "") + " · " + hh;
      };
      const hide = () => { line.style.display = mark.style.display = tip.style.display = "none"; };
      gw.addEventListener("pointermove", move);
      gw.addEventListener("pointerdown", move);
      gw.addEventListener("pointerleave", hide);
      gw.addEventListener("pointercancel", hide);
    } catch (e) {
      setMsg("Historique indisponible");
    }
  }
  _evState() {
    const g = (k) => this._config[k] && this._hass.states[this._config[k]];
    const ch = g("charging_entity"), pl = g("plug_entity"), cl = g("climate_active_entity"), mv = g("moving_entity");
    let base = (mv && (mv.state === "on" || mv.state === "moving")) ? "En route"
      : (ch && ch.state === "on") ? "En charge" : (pl && pl.state === "on") ? "Branchée" : "Débranchée";
    if (cl && cl.state === "on") base += " · ❄️ Clim en cours";
    return base;
  }
  _press(ent) {
    const d = ent.split(".")[0];
    if (d === "button") this._call("button", "press", { entity_id: ent });
    else if (d === "switch") this._call("switch", "toggle", { entity_id: ent });
    else if (d === "script") this._call("script", "turn_on", { entity_id: ent });
  }
  _slider(id, label, val, oninput, onchange, min = 0, max = 100, step = 1) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div class="lbl"><span>${label}</span><b id="${id}_v"></b></div>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">`;
    const inp = row.querySelector("input");
    const out = row.querySelector("b");
    const fmt = (x) => oninput(x);
    out.textContent = fmt(val);
    inp.addEventListener("pointerdown", () => (this._editing = true));
    inp.addEventListener("input", () => (out.textContent = fmt(inp.value)));
    inp.addEventListener("change", () => { this._editing = false; onchange(Number(inp.value)); });
    return row;
  }
  _lightBody(body) {
    const s = this._s;
    const bri = s.attributes.brightness ? Math.round((s.attributes.brightness / 255) * 100) : 0;
    body.appendChild(this._slider("brightness", "Luminosité", bri, (x) => x + " %",
      (x) => this._call("light", "turn_on", { entity_id: this._config.entity, brightness_pct: x })));
    if ((s.attributes.supported_color_modes || []).some((m) => ["color_temp"].includes(m))) {
      const min = s.attributes.min_color_temp_kelvin || 2000;
      const max = s.attributes.max_color_temp_kelvin || 6500;
      const cur = s.attributes.color_temp_kelvin || min;
      body.appendChild(this._slider("ct", "Température", cur, (x) => x + " K",
        (x) => this._call("light", "turn_on", { entity_id: this._config.entity, color_temp_kelvin: x }), min, max, 50));
    }
    if ((s.attributes.supported_color_modes || []).some((m) => ["xy", "rgb", "hs", "rgbw", "rgbww"].includes(m))) {
      const colors = ["#f8a5c2", "#DEC198", "#ff5252", "#ff9800", "#ffd54f", "#69f0ae", "#40c4ff", "#b388ff", "#ffffff"];
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<div class="lbl"><span>Couleur</span></div><div class="swatches"></div>`;
      const sw = row.querySelector(".swatches");
      colors.forEach((hex) => {
        const d = document.createElement("div");
        d.className = "sw"; d.style.background = hex;
        d.addEventListener("click", () => {
          if (hex === "#ffffff") this._call("light", "turn_on", { entity_id: this._config.entity, color_temp_kelvin: 4000 });
          else this._call("light", "turn_on", { entity_id: this._config.entity, rgb_color: this._hex2rgb(hex) });
        });
        sw.appendChild(d);
      });
      body.appendChild(row);
    }
    body.appendChild(this._toggleRow());
  }
  _climateBody(body) {
    const s = this._s, a = s.attributes;
    const min = a.min_temp ?? 7, max = a.max_temp ?? 35, step = a.target_temp_step || 0.5;
    const ctl = document.createElement("div"); ctl.className = "row climctl";
    ctl.innerHTML = `
      <div class="climhead">
        <button class="climstep" id="tdn"><ha-icon icon="mdi:minus"></ha-icon></button>
        <div class="climset"><div class="cbig" id="tval">—</div><div class="clbl">Consigne</div></div>
        <button class="climstep" id="tup"><ha-icon icon="mdi:plus"></ha-icon></button>
      </div>
      <div class="climreal"><ha-icon icon="mdi:thermometer"></ha-icon><span id="treal">—</span><span class="cact" id="tact"></span></div>
      <div class="ctrack" id="ctrack"><div class="cfill" id="cfill"></div><div class="creal" id="creal"></div><div class="cthumb" id="cthumb"></div></div>
      <div class="cscale"><span>${min}°</span><span>${max}°</span></div>`;
    body.appendChild(ctl);
    const $ = (id) => this.shadowRoot.getElementById(id);
    const fmt = (v) => (step < 1 ? v.toFixed(1) : "" + Math.round(v)) + "°";
    const pct = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
    const track = $("ctrack");
    let dragging = false, pending = a.temperature ?? a.current_temperature ?? min;
    const paintSet = (v) => { $("cfill").style.width = pct(v) + "%"; $("cthumb").style.left = pct(v) + "%"; $("tval").textContent = fmt(v); };
    const snap = (v) => Math.round(Math.max(min, Math.min(max, Math.round(v / step) * step)) * 10) / 10;
    const commit = (v) => this._call("climate", "set_temperature", { entity_id: this._config.entity, temperature: snap(v) });
    const tFromX = (e) => { const r = track.getBoundingClientRect(); const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); return snap(min + p * (max - min)); };
    track.addEventListener("pointerdown", (e) => { e.stopPropagation(); dragging = true; try { track.setPointerCapture(e.pointerId); } catch (_) {} pending = tFromX(e); paintSet(pending); });
    track.addEventListener("pointermove", (e) => { if (!dragging) return; pending = tFromX(e); paintSet(pending); });
    const end = () => { if (!dragging) return; dragging = false; commit(pending); };
    track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
    $("tup").addEventListener("click", () => { pending = snap((this._s.attributes.temperature ?? min) + step); paintSet(pending); commit(pending); });
    $("tdn").addEventListener("click", () => { pending = snap((this._s.attributes.temperature ?? min) - step); paintSet(pending); commit(pending); });
    this._climTick = () => {
      const s2 = this._s; if (!s2) return; const a2 = s2.attributes;
      if (!dragging && a2.temperature != null) paintSet(a2.temperature);
      const cr = $("creal");
      if (cr && a2.current_temperature != null) { cr.style.display = "block"; cr.style.left = pct(a2.current_temperature) + "%"; cr.setAttribute("data-t", fmt(a2.current_temperature)); }
      else if (cr) cr.style.display = "none";
      if ($("treal")) $("treal").textContent = a2.current_temperature != null ? "Réel " + fmt(a2.current_temperature) : "—";
      if ($("tact")) $("tact").textContent = HVAC_ACTION_FR[a2.hvac_action] || HVAC_FR[s2.state] || s2.state;
    };
    this._climTick();
    const modes = a.hvac_modes || [];
    if (modes.length) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<div class="lbl"><span>Mode</span></div><div class="btns"></div>`;
      const wrap = row.querySelector(".btns");
      modes.forEach((m) => {
        const b = document.createElement("button");
        b.className = "btn" + (s.state === m ? " on" : ""); b.textContent = HVAC_FR[m] || m;
        b.addEventListener("click", () => this._call("climate", "set_hvac_mode", { entity_id: this._config.entity, hvac_mode: m }));
        wrap.appendChild(b);
      });
      body.appendChild(row);
    }
    if (a.current_humidity != null) {
      const h = document.createElement("div"); h.className = "row kv";
      h.innerHTML = `<div class="cell"><div class="k">Humidité</div><div class="v">${a.current_humidity} %</div></div>`;
      body.appendChild(h);
    }
    const gh = document.createElement("div"); gh.className = "row"; body.appendChild(gh);
    this._graph(gh, [this._config.entity], 24);
  }
  _alarmBody(body) {
    const s = this._s, feat = s.attributes.supported_features || 0;
    const sb = document.createElement("div"); sb.className = "row";
    sb.innerHTML = `<div class="statebig">${ALARM_FR[s.state] || s.state}</div>` +
      (s.attributes.changed_by ? `<div class="hsub">Dernier : ${s.attributes.changed_by}</div>` : "");
    body.appendChild(sb);
    const modes = [["alarm_disarm", "Désarmer", "disarmed"]];
    if (feat & 1) modes.push(["alarm_arm_home", "Maison", "armed_home"]);
    if (feat & 2) modes.push(["alarm_arm_away", "Absent", "armed_away"]);
    if (feat & 4) modes.push(["alarm_arm_night", "Nuit", "armed_night"]);
    if (feat & 32) modes.push(["alarm_arm_vacation", "Vacances", "armed_vacation"]);
    const row = document.createElement("div"); row.className = "row btns";
    modes.forEach(([svc, label, st]) => {
      const b = document.createElement("button");
      b.className = "btn" + (s.state === st ? " on" : ""); b.textContent = label;
      b.addEventListener("click", () => this._alarmAction(svc));
      row.appendChild(b);
    });
    body.appendChild(row);
    // pavé numérique si le panneau attend un code
    if (s.attributes.code_format != null && this._config.code == null) {
      this._code = "";
      const disp = document.createElement("div"); disp.className = "row";
      disp.innerHTML = `<div class="codedisp" id="cd">----</div>`; body.appendChild(disp);
      const kp = document.createElement("div"); kp.className = "row kp";
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "del"].forEach((k) => {
        const b = document.createElement("button"); b.className = "kpk";
        b.innerHTML = k === "del" ? `<ha-icon icon="mdi:backspace-outline"></ha-icon>` : k === "clear" ? `<ha-icon icon="mdi:close"></ha-icon>` : k;
        b.addEventListener("click", () => this._kp(k));
        kp.appendChild(b);
      });
      body.appendChild(kp);
    }
    const gh = document.createElement("div"); gh.className = "row"; body.appendChild(gh);
    this._graph(gh, [this._config.entity], 48);
  }
  _kp(k) {
    if (k === "clear") this._code = "";
    else if (k === "del") this._code = (this._code || "").slice(0, -1);
    else this._code = ((this._code || "") + k).slice(0, 10);
    const cd = this.shadowRoot.getElementById("cd");
    if (cd) cd.textContent = this._code.length ? "•".repeat(this._code.length) : "----";
  }
  _alarmAction(svc) {
    const a = this._s.attributes;
    const data = { entity_id: this._config.entity };
    const code = this._config.code != null ? String(this._config.code) : (this._code || "");
    if (a.code_format != null && code === "") { jmaToast({ title: "Code requis", message: "Saisis le code d'abord", level: "warning" }); return; }
    if (code) data.code = code;
    this._call("alarm_control_panel", svc, data);
    this._code = ""; const cd = this.shadowRoot.getElementById("cd"); if (cd) cd.textContent = "----";
  }
  _battOf(e) {
    const base = e.split(".")[1].replace(/_(water_leak|smoke|porte|mouvement|contact_externe_ouvert|alerte_contact_externe|occupancy|person_occupancy|all_occupancy|motion)$/, "");
    for (const id of ["sensor." + base + "_battery", "sensor." + base + "_batterie"]) {
      const s = this._hass.states[id]; if (s && !isNaN(parseFloat(s.state))) return "🔋 " + Math.round(parseFloat(s.state)) + "%";
    }
    const low = this._hass.states["binary_sensor." + base + "_battery_low"] || this._hass.states["binary_sensor." + base + "_batterie_faible"];
    if (low && low.state === "on") return "🪫 batt. faible";
    return null;
  }
  _secListBody(body) {
    const list = this._config.entities || []; const mode = this._config.mode || "alert"; const icon = this._config.icon || "mdi:shield-home";
    this._slRows = [];
    if (!list.length) { const e = document.createElement("div"); e.className = "slempty"; e.textContent = "Aucun capteur"; body.appendChild(e); return; }
    list.forEach((e) => { const s = this._hass.states[e]; if (!s) return;
      const row = document.createElement("div"); row.className = "slrow";
      row.innerHTML = `<div class="si"><ha-icon icon="${icon}"></ha-icon></div><div class="slm"><div class="sn">${this._secNm(e)}</div><div class="slsub"></div></div><div class="sv"></div>`;
      body.appendChild(row); this._slRows.push({ e, row }); });
    const onTxt = { alert: "ALERTE", warn: "Ouvert", live: "Détecté" }[mode] || "Actif";
    const offTxt = { alert: "OK", warn: "Fermé", live: "Calme" }[mode] || "OK";
    this._seclistTick = () => { this._slRows.forEach(({ e, row }) => { const s = this._hass.states[e]; if (!s) return; const on = s.state === "on";
      row.classList.remove("ok", "alert", "live", "warn"); row.classList.add(on ? mode : "ok");
      row.querySelector(".sv").textContent = on ? onTxt : offTxt;
      const parts = []; const bat = this._battOf(e); if (bat) parts.push(bat);
      const since = (typeof jmaSince === "function") ? jmaSince(s.last_changed) : null; if (since) parts.push("maj " + since);
      row.querySelector(".slsub").textContent = parts.join("  ·  ");
    }); };
    this._seclistTick();
  }
  _secNm(e) {
    let n = (this._config.names && this._config.names[e]) || (this._hass.states[e] && this._hass.states[e].attributes.friendly_name) || e;
    return n.replace(/\s+(Fumée|Humidité|Porte|Mouvement|Contact externe.*|Alerte contact.*|Water leak|Smoke|Occupancy)$/i, "").trim();
  }
  _securityBody(body) {
    const c = this._config, H = this._hass.states;
    const refs = { leak: [], smoke: [], door: [], motion: [], cams: [] };
    const codeArg = c.code != null ? { code: String(c.code) } : {};
    const alE = c.alarm_entity, al = alE && H[alE];
    if (al) {
      const feat = al.attributes.supported_features || 0;
      const sb = document.createElement("div"); sb.className = "row";
      sb.innerHTML = `<div class="secbig" id="secbig">${ALARM_FR[al.state] || al.state}</div>`;
      body.appendChild(sb);
      const arm = document.createElement("div"); arm.className = "row secarm";
      const modes = [["alarm_disarm", "Désarmer", "disarmed", "mdi:shield-off-outline"]];
      if (feat & 2) modes.push(["alarm_arm_away", "Absent", "armed_away", "mdi:shield-lock"]);
      if (feat & 1) modes.push(["alarm_arm_home", "Maison", "armed_home", "mdi:shield-home"]);
      if (feat & 4) modes.push(["alarm_arm_night", "Nuit", "armed_night", "mdi:weather-night"]);
      modes.forEach(([svc, label, stt, icon]) => { const b = document.createElement("button"); b.className = "secarmb"; b.dataset.st = stt; b.innerHTML = `<ha-icon icon="${icon}"></ha-icon>${label}`; b.addEventListener("click", () => this._call("alarm_control_panel", svc, { entity_id: alE, ...codeArg })); arm.appendChild(b); });
      body.appendChild(arm);
    }
    const zones = (c.subzones || []).filter((e) => H[e]);
    if (zones.length) {
      const lbl = document.createElement("div"); lbl.className = "seclbl"; lbl.innerHTML = `<ha-icon icon="mdi:home-group" style="--mdc-icon-size:15px"></ha-icon>Zones`; body.appendChild(lbl);
      const zr = document.createElement("div"); zr.className = "row seczones";
      zones.forEach((e) => { const b = document.createElement("button"); b.className = "seczone"; b.dataset.e = e; b.innerHTML = `<ha-icon icon="mdi:shield" style="--mdc-icon-size:15px"></ha-icon><span class="zn"></span>`;
        b.addEventListener("click", () => { const s = H[e]; const armed = ("" + s.state).startsWith("armed"); this._call("alarm_control_panel", armed ? "alarm_disarm" : "alarm_arm_away", { entity_id: e, ...codeArg }); }); zr.appendChild(b); });
      body.appendChild(zr);
    }
    const section = (title, icon, list, okIcon, alertIcon, okWord) => {
      if (!list.length) return [];
      const lbl = document.createElement("div"); lbl.className = "seclbl"; lbl.innerHTML = `<ha-icon icon="${icon}" style="--mdc-icon-size:15px"></ha-icon>${title}`; body.appendChild(lbl);
      const grid = document.createElement("div"); grid.className = "secgrid"; body.appendChild(grid);
      const arr = [];
      list.forEach((e) => { if (!H[e]) return; const it = document.createElement("div"); it.className = "secitem";
        it.innerHTML = `<div class="si"><ha-icon class="sic"></ha-icon></div><div class="sn">${this._secNm(e)}</div><div class="sv"></div>`;
        grid.appendChild(it); arr.push({ e, it, okIcon, alertIcon, okWord }); });
      return arr;
    };
    refs.leak = section("Fuites d'eau", "mdi:water", c.leak_sensors || [], "mdi:water-check", "mdi:water-alert", "Sec");
    refs.smoke = section("Fumée / Incendie", "mdi:smoke-detector-variant", c.smoke_sensors || [], "mdi:smoke-detector-variant", "mdi:smoke-detector-variant-alert", "RAS");
    refs.door = section("Ouvertures", "mdi:door", c.door_sensors || [], "mdi:door-closed", "mdi:door-open", "Fermé");
    refs.motion = section("Mouvement", "mdi:motion-sensor", c.motion_sensors || [], "mdi:motion-sensor-off", "mdi:motion-sensor", "Calme");
    if ((c.cameras || []).length) {
      const lbl = document.createElement("div"); lbl.className = "seclbl"; lbl.innerHTML = `<ha-icon icon="mdi:cctv" style="--mdc-icon-size:15px"></ha-icon>Caméras`; body.appendChild(lbl);
      const cg = document.createElement("div"); cg.className = "seccams"; body.appendChild(cg);
      c.cameras.forEach((e) => { const d = document.createElement("div"); d.className = "seccam"; d.dataset.e = e; d.innerHTML = `<img><div class="pb"><ha-icon icon="mdi:account" style="--mdc-icon-size:11px;vertical-align:-1px"></ha-icon> Présence</div><span></span>`;
        d.addEventListener("click", () => { const p = document.createElement("jma-card-popup"); p.config = { entity: e, color: c.color, accent: c.accent, dark: c.dark, theme: c.theme }; p.hass = this._hass; document.body.appendChild(p); });
        cg.appendChild(d); refs.cams.push({ e, d }); });
    }
    this._securityTick = () => {
      if (al) { const s = this._hass.states[alE]; const big = this.shadowRoot.getElementById("secbig"); if (big && s) big.textContent = ALARM_FR[s.state] || s.state;
        this.shadowRoot.querySelectorAll(".secarmb").forEach((b) => b.classList.toggle("on", s && s.state === b.dataset.st)); }
      this.shadowRoot.querySelectorAll(".seczone").forEach((b) => { const s = this._hass.states[b.dataset.e]; if (!s) return; b.classList.toggle("armed", ("" + s.state).startsWith("armed")); b.querySelector(".zn").textContent = (s.attributes.friendly_name || b.dataset.e).replace(/^maison\s*/i, "") || "Maison"; });
      ["leak", "smoke", "door", "motion"].forEach((k) => refs[k].forEach(({ e, it, okIcon, alertIcon, okWord }) => {
        const s = this._hass.states[e]; if (!s) return; const on = s.state === "on";
        it.classList.toggle("alert", on); it.classList.toggle("ok", !on);
        it.querySelector(".sic").setAttribute("icon", on ? alertIcon : okIcon);
        const base = e.split(".")[1].replace(/_(water_leak|smoke|porte|mouvement|contact_externe_ouvert|alerte_contact_externe)$/, "");
        const batt = this._hass.states["binary_sensor." + base + "_battery_low"] || this._hass.states["binary_sensor." + base + "_batterie_faible"];
        const low = batt && batt.state === "on";
        it.querySelector(".sv").innerHTML = on ? "⚠ ALERTE" : (low ? `<span class="secbat">batt. faible</span>` : okWord);
      }));
      refs.cams.forEach(({ e, d }) => { const s = this._hass.states[e]; if (!s) return; const img = d.querySelector("img"), lab = d.querySelector("span");
        lab.textContent = s.attributes.friendly_name || e; const p = s.attributes.entity_picture;
        if (p) { const bust = Math.floor(Date.now() / 8000); if (img.dataset.b != bust) { img.dataset.b = bust; img.src = p + (p.includes("?") ? "&" : "?") + "_=" + bust; } }
        const oid = e.split(".")[1], pers = this._hass.states["binary_sensor." + oid + "_person_occupancy"]; d.querySelector(".pb").classList.toggle("on", !!(pers && pers.state === "on")); });
    };
    this._securityTick();
  }
  _vacuumBody(body) {
    const s = this._s, a = s.attributes;
    const batE = this._config.battery_entity && this._hass.states[this._config.battery_entity];
    const bat = batE ? Math.round(parseFloat(batE.state)) : (a.battery_level != null ? a.battery_level : null);
    const cells = [["État", VACUUM_FR[s.state] || s.state]];
    if (bat != null) cells.push(["Batterie", bat + " %"]);
    const areaE = this._config.area_entity && this._hass.states[this._config.area_entity];
    if (areaE && !["unknown", "unavailable"].includes(areaE.state)) cells.push(["Pièce", areaE.state]);
    const head = document.createElement("div"); head.className = "row kv";
    head.innerHTML = cells.map(([k, v]) => `<div class="cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    body.appendChild(head);
    const fans = (a.fan_speed_list || []).filter((f) => f !== "off" && f !== "custom");
    if (this._config.show_fan !== false && fans.length) {
      const r = document.createElement("div"); r.className = "row";
      r.innerHTML = `<div class="lbl"><span>Aspiration</span></div><div class="chiprow"></div>`;
      const wrap = r.querySelector(".chiprow");
      fans.forEach((f) => {
        const b = document.createElement("button");
        b.className = "pchip" + (a.fan_speed === f ? " on" : ""); b.textContent = f;
        b.addEventListener("click", () => this._call("vacuum", "set_fan_speed", { entity_id: this._config.entity, fan_speed: f }));
        wrap.appendChild(b);
      });
      body.appendChild(r);
    }
    const row = document.createElement("div"); row.className = "row btns";
    [["start", "Démarrer"], ["pause", "Pause"], ["stop", "Stop"], ["return_to_base", "Base"], ["locate", "Localiser"]].forEach(([svc, label]) => {
      const b = document.createElement("button");
      b.className = "btn" + (svc === "start" ? " primary" : ""); b.textContent = label;
      b.addEventListener("click", () => this._call("vacuum", svc, { entity_id: this._config.entity }));
      row.appendChild(b);
    });
    body.appendChild(row);
    if (this._config.battery_entity) { const gh = document.createElement("div"); gh.className = "row"; body.appendChild(gh); this._graph(gh, [this._config.battery_entity], 24); }
  }
  _evBody(body) {
    const g = (k) => { const e = this._config[k]; return e && this._hass.states[e]; };
    const num = (k) => { const s = g(k); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; };
    const bat = num("battery_entity");
    const top = document.createElement("div"); top.className = "row";
    top.innerHTML = `<div class="bignum">${bat != null ? bat + " %" : "—"}</div>` +
      `<div class="gaugewrap"><div class="gaugefill" style="width:${bat != null ? Math.max(0, Math.min(100, bat)) : 0}%"></div></div>`;
    body.appendChild(top);
    const cells = [];
    const range = num("range_entity"); if (range != null) cells.push(["Autonomie", Math.round(range) + " km"]);
    const rem = num("remaining_entity"); if (rem != null && rem > 0) cells.push(["Charge restante", Math.round(rem) + " min"]);
    cells.push(["État", this._evState()]);
    const txt = (k) => { const s = g(k); return s && !["unknown", "unavailable", ""].includes(s.state) ? s.state : null; };
    const clim = g("climate_active_entity"); if (clim) cells.push(["Climatisation", clim.state === "on" ? "En cours ❄️" : "Arrêtée"]);
    const moveE = g("moving_entity"); if (moveE) cells.push(["Mouvement", (moveE.state === "on" || moveE.state === "moving") ? "En route 🚗" : "À l'arrêt"]);
    const branch = txt("plug_state_entity"); if (branch) cells.push(["Branchement", branch]);
    const mode = txt("charging_mode_entity"); if (mode) cells.push(["Mode de charge", mode]);
    const cs = txt("charge_state_entity"); if (cs) cells.push(["État de charge", cs]);
    const bt = num("battery_temp_entity"); if (bt != null) cells.push(["Temp. batterie", bt + " °C"]);
    const et = num("ext_temp_entity"); if (et != null) cells.push(["Temp. ext.", et + " °C"]);
    const mil = num("mileage_entity"); if (mil != null) cells.push(["Kilométrage", Math.round(mil) + " km"]);
    [["tire_fl", "Pneu AV G"], ["tire_fr", "Pneu AV D"], ["tire_rl", "Pneu AR G"], ["tire_rr", "Pneu AR D"]].forEach(([k, lbl]) => {
      const v = num(k); if (v != null) cells.push([lbl, Math.round(v) + " mbar"]);
    });
    const kv = document.createElement("div"); kv.className = "row kv";
    kv.innerHTML = cells.map(([k, v]) => `<div class="cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    body.appendChild(kv);
    const loc = this._config.location_entity && this._hass.states[this._config.location_entity];
    if (loc) {
      if (loc.attributes.latitude != null) { const mh = document.createElement("div"); mh.className = "row"; body.appendChild(mh); this._map(mh, [this._config.location_entity]); }
      else { const x = document.createElement("div"); x.className = "row"; x.innerHTML = `<div class="lbl"><span>Localisation</span></div><div style="opacity:.6;font-size:.85rem;">Indisponible (non remontée par la voiture)</div>`; body.appendChild(x); }
    }
    const row = document.createElement("div"); row.className = "row btns";
    const addB = (k, label, prim) => { if (!this._config[k]) return; const b = document.createElement("button"); b.className = "btn" + (prim ? " primary" : ""); b.textContent = label; b.addEventListener("click", () => this._press(this._config[k])); row.appendChild(b); };
    addB("charge_start", "Charger", true); addB("charge_stop", "Stopper"); addB("climate_button", "Climatisation");
    if (row.childElementCount) body.appendChild(row);
    const gh = document.createElement("div"); gh.className = "row"; body.appendChild(gh);
    this._graph(gh, [this._config.battery_entity, this._config.range_entity], 48);
  }
  async _agendaBody(body) {
    const cals = this._config.entities || (this._config.entity ? [this._config.entity] : []);
    const days = this._config.days || 7;
    body.innerHTML = `<div id="alist" style="font-size:.85rem;opacity:.6;">chargement…</div>`;
    const list = body.querySelector("#alist");
    try {
      const start = new Date(), end = new Date(Date.now() + days * 86400000);
      let evs = [];
      for (const cal of cals) {
        const r = await this._hass.callApi("GET", `calendars/${cal}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
        (r || []).forEach((e) => evs.push(e));
      }
      evs = evs.map((e) => { const s = e.start && (e.start.dateTime || e.start.date); return { d: new Date(s), allday: !(e.start && e.start.dateTime), e }; })
        .filter((x) => !isNaN(x.d)).sort((a, b) => a.d - b.d);
      if (!evs.length) { list.innerHTML = `<div style="opacity:.55;">Rien de prévu 🎉</div>`; return; }
      const dn = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
      let html = "", last = "";
      evs.forEach(({ d, allday, e }) => {
        const dk = d.toDateString();
        if (dk !== last) { last = dk; html += `<div style="font-weight:800;font-size:.72rem;opacity:.55;margin:11px 0 4px;text-transform:capitalize;">${dn[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}</div>`; }
        const tt = allday ? "journée" : ("" + d.getHours()).padStart(2, "0") + ":" + ("" + d.getMinutes()).padStart(2, "0");
        html += `<div style="display:flex;gap:10px;align-items:baseline;padding:7px 9px;background:rgba(255,255,255,.06);border-radius:10px;margin-bottom:4px;"><b style="color:var(--jma-rose);min-width:50px;font-size:.78rem;">${tt}</b><span style="font-size:.85rem;font-weight:600;">${e.summary || e.message || "(sans titre)"}</span></div>`;
      });
      list.innerHTML = html;
    } catch (err) { list.innerHTML = `<div style="opacity:.55;">Agenda indisponible</div>`; }
  }
  // ---- Sonos (pop-up complet) ----
  _spkList() { return this._config.speakers || this._config.entities || []; }
  _mp(s, d) { this._call("media_player", s, d); }
  _sonosMaster() {
    if (this._config.master && this._hass.states[this._config.master]) return this._config.master;
    let best = null, score = -1;
    this._spkList().forEach((eid) => {
      const s = this._hass.states[eid]; if (!s) return;
      const n = (s.attributes.group_members || [eid]).length;
      const sc = n * 10 + (s.state === "playing" ? 5 : s.state === "paused" ? 2 : 0);
      if (sc > score) { score = sc; best = eid; }
    });
    return best || this._spkList()[0];
  }
  _browse(ent, type, id) { return this._hass.callWS({ type: "media_player/browse_media", entity_id: ent, media_content_type: type, media_content_id: id }); }
  _sonosBody(body) {
    this._sSliders = {}; this._sAudioNums = null; this._sAudioSws = null; this._sMasterVol = null;
    body.innerHTML = "";
    // barre transport + volume — toujours visible (collée en haut)
    const tp = document.createElement("div"); tp.className = "stp";
    tp.innerHTML = `<div class="stpbtns">
        <button class="stpb" data-a="media_previous_track" aria-label="Précédent"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
        <button class="stpb big" data-a="media_play_pause" aria-label="Lecture / Pause"><ha-icon class="spp" icon="mdi:play"></ha-icon></button>
        <button class="stpb" data-a="media_next_track" aria-label="Suivant"><ha-icon icon="mdi:skip-next"></ha-icon></button>
      </div>`;
    tp.querySelectorAll(".stpb").forEach((b) => b.addEventListener("click", () => this._mp(b.dataset.a, { entity_id: this._sonosMaster() })));
    const gv = jmaSlider({ icon: "mdi:volume-high", fmt: (v) => v + "%", onCommit: (v) => {
      const mm = this._sonosMaster(); const grp = (this._hass.states[mm] && this._hass.states[mm].attributes.group_members) || [mm];
      grp.forEach((eid) => { if (this._hass.states[eid] && this._hass.states[eid].attributes.volume_level != null) this._mp("volume_set", { entity_id: eid, volume_level: v / 100 }); });
    } });
    this._sMasterVol = gv;
    const vr = document.createElement("div"); vr.className = "stpvol"; vr.appendChild(gv);
    tp.appendChild(vr); body.appendChild(tp);
    // barre d'onglets
    const tabs = document.createElement("div"); tabs.className = "stabs";
    tabs.innerHTML = `<button class="stab on" data-t="play">Lecture</button>
      <button class="stab" data-t="rooms">Pièces</button>
      <button class="stab" data-t="audio" id="staudio">Audio</button>`;
    body.appendChild(tabs);
    const mk = (t) => { const p = document.createElement("div"); p.className = "spane"; p.dataset.p = t; if (t !== "play") p.hidden = true; body.appendChild(p); return p; };
    const pPlay = mk("play"), pRooms = mk("rooms"), pAudio = mk("audio");
    tabs.querySelectorAll(".stab").forEach((b) => b.addEventListener("click", () => {
      tabs.querySelectorAll(".stab").forEach((x) => x.classList.toggle("on", x === b));
      [pPlay, pRooms, pAudio].forEach((p) => { p.hidden = p.dataset.p !== b.dataset.t; });
    }));
    // --- Onglet Lecture : favoris + lecture aléatoire/répétition
    const favRow = document.createElement("div"); favRow.className = "row";
    favRow.innerHTML = `<div class="lbl"><span>Favoris</span></div><div class="favs" id="favs"><span style="opacity:.5;font-size:.78rem;">chargement…</span></div>`;
    pPlay.appendChild(favRow);
    const sr = document.createElement("div"); sr.className = "row shrep";
    sr.innerHTML = `<button class="shb" id="shuffle"><ha-icon icon="mdi:shuffle"></ha-icon></button>
      <button class="shb" id="repeat"><ha-icon class="ri" icon="mdi:repeat"></ha-icon></button>`;
    sr.querySelector("#shuffle").addEventListener("click", () => { const m = this._sonosMaster(); this._mp("shuffle_set", { entity_id: m, shuffle: !this._hass.states[m].attributes.shuffle }); });
    sr.querySelector("#repeat").addEventListener("click", () => { const m = this._sonosMaster(); const cur = this._hass.states[m].attributes.repeat || "off"; this._mp("repeat_set", { entity_id: m, repeat: { off: "all", all: "one", one: "off" }[cur] }); });
    pPlay.appendChild(sr);
    if (this._config.favorites !== false) this._loadFavoritesPopup();
    else this.shadowRoot.getElementById("favs").innerHTML = "";
    // --- Onglet Pièces : grouper + volumes
    const ga = document.createElement("div"); ga.className = "row ga";
    ga.innerHTML = `<button class="gab" id="ga"><ha-icon icon="mdi:link-variant"></ha-icon>Tout grouper</button>
      <button class="gab" id="ua"><ha-icon icon="mdi:link-variant-off"></ha-icon>Séparer</button>`;
    ga.querySelector("#ga").addEventListener("click", () => { const m = this._sonosMaster(); const o = this._spkList().filter((e) => e !== m && this._hass.states[e]); if (o.length) this._mp("join", { entity_id: m, group_members: o }); });
    ga.querySelector("#ua").addEventListener("click", () => { this._spkList().forEach((e) => { if (this._hass.states[e]) this._mp("unjoin", { entity_id: e }); }); });
    pRooms.appendChild(ga);
    this._spkList().forEach((eid) => {
      const row = document.createElement("div"); row.className = "sroom"; row.dataset.e = eid;
      const lk = document.createElement("button"); lk.className = "slk"; lk.innerHTML = `<ha-icon icon="mdi:link-variant"></ha-icon>`;
      lk.addEventListener("click", () => { const m = this._sonosMaster(); if (eid === m) return; const grp = this._hass.states[m].attributes.group_members || [m]; grp.includes(eid) ? this._mp("unjoin", { entity_id: eid }) : this._mp("join", { entity_id: m, group_members: [eid] }); });
      const nm = document.createElement("div"); nm.className = "srn";
      const mute = document.createElement("button"); mute.className = "smute"; mute.innerHTML = `<ha-icon icon="mdi:volume-high"></ha-icon>`;
      mute.addEventListener("click", () => { const s = this._hass.states[eid]; this._mp("volume_mute", { entity_id: eid, is_volume_muted: !(s && s.attributes.is_volume_muted) }); });
      const sl = jmaSlider({ icon: "mdi:volume-high", fmt: (v) => v + "%", onCommit: (v) => this._mp("volume_set", { entity_id: eid, volume_level: v / 100 }) });
      this._sSliders[eid] = sl;
      row.append(lk, nm, mute, sl); pRooms.appendChild(row);
    });
    // --- Onglet Audio (masqué s'il n'y a aucun réglage)
    const hasAudio = this._sonosAudio(pAudio);
    if (!hasAudio) { const t = tabs.querySelector("#staudio"); if (t) t.remove(); }
    this._sonosTick();
  }
  _audioLabel(fn) {
    const f = (fn || "").toLowerCase();
    const map = [["basses", "Basses"], ["aigu", "Aigus"], ["gain", "Gain caisson"], ["caisson", "Caisson de basses"],
      ["loudness", "Loudness"], ["crossfade", "Crossfade"], ["nuit", "Mode nuit"], ["dialogue", "Dialogues"],
      ["surround", "Surround"], ["balance", "Balance"]];
    for (const [k, l] of map) if (f.includes(k)) return l;
    return fn || "";
  }
  _fmtNum(v) { const n = parseFloat(v); return isNaN(n) ? v : (Math.round(n * 10) / 10).toString(); }
  _sonosAudio(body) {
    const master = this._sonosMaster(); if (!master) return false;
    const prefix = (master.split(".")[1] || "") + "_";
    const KW = /(basses|aigu|caisson|gain|loudness|crossfade|nuit|dialogue|surround|balance)/i;
    const st = this._hass.states, nums = [], sws = [];
    Object.keys(st).forEach((id) => {
      const oid = id.split(".")[1] || "";
      if (!oid.startsWith(prefix) || !KW.test(oid)) return;
      if (id.startsWith("number.")) nums.push(id);
      else if (id.startsWith("switch.")) sws.push(id);
    });
    if (!nums.length && !sws.length) return false;
    this._sAudioNums = {};
    nums.sort().forEach((id) => {
      const s = st[id], a = s.attributes;
      const min = a.min != null ? a.min : 0, max = a.max != null ? a.max : 100, step = a.step || 1;
      const row = document.createElement("div"); row.className = "row";
      const lr = document.createElement("div"); lr.className = "lbl";
      const sp = document.createElement("span"); sp.textContent = this._audioLabel(a.friendly_name);
      const bv = document.createElement("b"); bv.textContent = this._fmtNum(s.state);
      lr.append(sp, bv);
      const r = document.createElement("input"); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = s.state;
      r.addEventListener("input", () => { bv.textContent = this._fmtNum(r.value); });
      r.addEventListener("change", () => this._call("number", "set_value", { entity_id: id, value: parseFloat(r.value) }));
      row.append(lr, r); body.appendChild(row);
      this._sAudioNums[id] = { r, bv };
    });
    if (sws.length) {
      const lbl = document.createElement("div"); lbl.className = "lbl"; lbl.style.marginTop = "4px"; lbl.innerHTML = `<span>Options</span>`;
      body.appendChild(lbl);
      const cr = document.createElement("div"); cr.className = "row chiprow"; cr.style.marginTop = "0"; this._sAudioSws = sws;
      sws.sort().forEach((id) => {
        const s = st[id], b = document.createElement("button"); b.className = "pchip"; b.dataset.sw = id;
        b.textContent = this._audioLabel(s.attributes.friendly_name); b.classList.toggle("on", s.state === "on");
        b.addEventListener("click", () => this._call("switch", "toggle", { entity_id: id }));
        cr.appendChild(b);
      });
      body.appendChild(cr);
    }
    return true;
  }
  async _loadFavoritesPopup() {
    const ent = this._spkList().find((e) => this._hass.states[e]); if (!ent) return;
    try {
      const root = await this._browse(ent, "favorites", "");
      const out = [];
      for (const node of (root.children || [])) {
        if (node.can_play) out.push(node);
        else if (node.can_expand) { try { const sub = await this._browse(ent, node.media_content_type, node.media_content_id); (sub.children || []).forEach((it) => { if (it.can_play) out.push(it); }); } catch (e) {} }
        if (out.length >= 30) break;
      }
      const host = this.shadowRoot.getElementById("favs"); if (!host) return;
      host.innerHTML = out.length ? "" : `<span style="opacity:.5;font-size:.78rem;">Aucun favori</span>`;
      out.forEach((it) => {
        const b = document.createElement("button"); b.className = "fav";
        b.innerHTML = `<ha-icon icon="mdi:playlist-play"></ha-icon><span>${it.title}</span>`;
        b.addEventListener("click", () => { this._mp("play_media", { entity_id: this._sonosMaster(), media_content_type: it.media_content_type, media_content_id: it.media_content_id }); jmaToast({ title: "Sonos", message: "▶ " + it.title, icon: "mdi:playlist-music", color: this._config.accent }); });
        host.appendChild(b);
      });
    } catch (e) { const host = this.shadowRoot.getElementById("favs"); if (host) host.innerHTML = `<span style="opacity:.5;font-size:.78rem;">Favoris indisponibles</span>`; }
  }
  _sonosTick() {
    if (!this._sSliders) return;
    const master = this._sonosMaster(); const ms = this._hass.states[master]; if (!ms) return;
    const a = ms.attributes, grp = a.group_members || [master];
    const pp = this.shadowRoot.querySelector(".spp"); if (pp) pp.setAttribute("icon", ms.state === "playing" ? "mdi:pause" : "mdi:play");
    if (this._sMasterVol) {
      const mv = grp.map((e) => this._hass.states[e]).filter((x) => x && x.attributes.volume_level != null).map((x) => x.attributes.volume_level);
      if (mv.length) { this._sMasterVol.hidden = false; this._sMasterVol.setValue(Math.round((mv.reduce((p, v) => p + v, 0) / mv.length) * 100)); } else this._sMasterVol.hidden = true;
    }
    const sh = this.shadowRoot.getElementById("shuffle"); if (sh) sh.classList.toggle("on", !!a.shuffle);
    const rp = this.shadowRoot.getElementById("repeat"); const rep = a.repeat || "off";
    if (rp) { rp.classList.toggle("on", rep !== "off"); rp.querySelector(".ri").setAttribute("icon", rep === "one" ? "mdi:repeat-once" : "mdi:repeat"); }
    this._spkList().forEach((eid) => {
      const row = this.shadowRoot.querySelector(`.sroom[data-e="${eid}"]`); if (!row) return;
      const s = this._hass.states[eid], sa = s ? s.attributes : {};
      row.querySelector(".srn").textContent = (this._config.names && this._config.names[eid]) || (sa.friendly_name || eid);
      const lk = row.querySelector(".slk"), isM = eid === master, grouped = grp.includes(eid);
      lk.classList.toggle("master", isM); lk.classList.toggle("on", grouped && !isM);
      lk.querySelector("ha-icon").setAttribute("icon", isM ? "mdi:crown" : grouped ? "mdi:link-variant" : "mdi:link-variant-off");
      const muted = !!sa.is_volume_muted, mute = row.querySelector(".smute");
      mute.classList.toggle("on", muted); mute.querySelector("ha-icon").setAttribute("icon", muted ? "mdi:volume-off" : "mdi:volume-high");
      const sl = this._sSliders[eid];
      if (sa.volume_level != null) { sl.hidden = false; sl.setValue(Math.round(sa.volume_level * 100)); } else sl.hidden = true;
    });
    if (this._sAudioNums) Object.keys(this._sAudioNums).forEach((id) => {
      const s = this._hass.states[id]; if (!s) return; const { r, bv } = this._sAudioNums[id];
      if (this.shadowRoot.activeElement !== r) { r.value = s.state; bv.textContent = this._fmtNum(s.state); }
    });
    if (this._sAudioSws) this._sAudioSws.forEach((id) => {
      const s = this._hass.states[id], b = this.shadowRoot.querySelector(`.pchip[data-sw="${id}"]`);
      if (b && s) b.classList.toggle("on", s.state === "on");
    });
  }
  _scenesBody(body) {
    const list = this._config.scenes || [];
    const row = document.createElement("div"); row.className = "row btns";
    if (!list.length) row.innerHTML = `<div class="hsub">Aucune ambiance</div>`;
    list.forEach((eid) => {
      const s = this._hass.states[eid];
      const nm = (this._config.names && this._config.names[eid]) || ((s && s.attributes.friendly_name) || eid);
      const b = document.createElement("button"); b.className = "btn"; b.textContent = nm;
      const icon = (s && s.attributes.icon) || "mdi:palette";
      b.innerHTML = `<ha-icon icon="${icon}" style="--mdc-icon-size:18px;vertical-align:-4px;margin-right:5px;"></ha-icon>${nm}`;
      b.addEventListener("click", () => {
        this._call(eid.split(".")[0], "turn_on", { entity_id: eid });
        if (window.jmaToast) jmaToast({ title: this._config.name || "Ambiances", message: "▶ " + nm, icon: "mdi:palette", color: this._config.color });
        this._close();
      });
      row.appendChild(b);
    });
    body.appendChild(row);
  }
  _coversBody(body) {
    const rows = (this._config.rows && this._config.rows.length) ? this._config.rows : (this._config.entities || []).map((e) => [e]);
    const list = rows.flat();
    const m = document.createElement("div"); m.className = "row btns";
    m.innerHTML = `<button class="btn" id="cvo"><ha-icon icon="mdi:chevron-up" style="--mdc-icon-size:20px;vertical-align:-5px"></ha-icon> Tout ouvrir</button>` +
      `<button class="btn" id="cvs">Stop</button>` +
      `<button class="btn" id="cvc"><ha-icon icon="mdi:chevron-down" style="--mdc-icon-size:20px;vertical-align:-5px"></ha-icon> Tout fermer</button>`;
    m.querySelector("#cvo").addEventListener("click", () => this._call("cover", "open_cover", { entity_id: list }));
    m.querySelector("#cvs").addEventListener("click", () => this._call("cover", "stop_cover", { entity_id: list }));
    m.querySelector("#cvc").addEventListener("click", () => this._call("cover", "close_cover", { entity_id: list }));
    body.appendChild(m);
    this._covRows = {};
    rows.forEach((rowEnts) => {
      const rwrap = document.createElement("div"); rwrap.className = "crow";
      rowEnts.forEach((eid) => {
        const s = this._hass.states[eid]; const nm = (this._config.names && this._config.names[eid]) || ((s && s.attributes.friendly_name) || eid);
        const supportsPos = s && (s.attributes.current_position != null || ((s.attributes.supported_features || 0) & 4));
        const tile = document.createElement("div"); tile.className = "ctile cover";
        tile.innerHTML = `<div class="chead"><div class="cicon"><ha-icon class="ci" icon="mdi:window-shutter"></ha-icon></div>` +
          `<div class="cname">${nm}</div><div class="cpos cvp">—</div></div>` +
          `<div class="cbtns"><button class="ccb" data-a="open_cover" aria-label="Ouvrir"><ha-icon icon="mdi:chevron-up"></ha-icon></button>` +
          `<button class="ccb" data-a="stop_cover" aria-label="Stop"><ha-icon icon="mdi:stop"></ha-icon></button>` +
          `<button class="ccb" data-a="close_cover" aria-label="Fermer"><ha-icon icon="mdi:chevron-down"></ha-icon></button></div>`;
        tile.querySelectorAll(".ccb").forEach((b) => b.addEventListener("click", () => this._call("cover", b.dataset.a, { entity_id: eid })));
        let sl = null;
        if (supportsPos) {
          const pr = document.createElement("div"); pr.className = "cpre";
          [10, 20, 50, 75].forEach((pct) => { const b = document.createElement("button"); b.className = "cpc"; b.textContent = pct + "%";
            b.addEventListener("click", () => this._call("cover", "set_cover_position", { entity_id: eid, position: pct })); pr.appendChild(b); });
          tile.appendChild(pr);
          sl = jmaSlider({ icon: "mdi:window-shutter", fmt: (v) => v + "%", label: nm, onCommit: (v) => this._call("cover", "set_cover_position", { entity_id: eid, position: v }) }); const sw = document.createElement("div"); sw.className = "cslider"; sw.appendChild(sl); tile.appendChild(sw);
        }
        rwrap.appendChild(tile);
        this._covRows[eid] = { row: tile, sl };
      });
      body.appendChild(rwrap);
    });
    this._coversTick = () => {
      list.forEach((eid) => {
        const s = this._hass.states[eid], r = this._covRows[eid]; if (!s || !r) return;
        const p = s.attributes.current_position, open = s.state === "open" || (p || 0) > 0;
        r.row.classList.toggle("on", open);
        r.row.querySelector(".ci").setAttribute("icon", open ? "mdi:window-shutter-open" : "mdi:window-shutter");
        r.row.querySelector(".cvp").textContent = p != null ? p + "%" : (open ? "Ouvert" : s.state === "closed" ? "Fermé" : s.state);
        if (r.sl && p != null) r.sl.setValue(p);
      });
    };
    this._coversTick();
  }
  _lightsBody(body) {
    const list = this._config.entities || [];
    const m = document.createElement("div"); m.className = "row btns";
    m.innerHTML = `<button class="btn" id="lon"><ha-icon icon="mdi:lightbulb-on" style="--mdc-icon-size:18px;vertical-align:-4px;margin-right:4px"></ha-icon>Tout allumer</button>` +
      `<button class="btn" id="loff"><ha-icon icon="mdi:lightbulb-off" style="--mdc-icon-size:18px;vertical-align:-4px;margin-right:4px"></ha-icon>Tout éteindre</button>`;
    m.querySelector("#lon").addEventListener("click", () => this._call("homeassistant", "turn_on", { entity_id: list }));
    m.querySelector("#loff").addEventListener("click", () => this._call("homeassistant", "turn_off", { entity_id: list }));
    body.appendChild(m);
    this._lightRows = {};
    const grid = document.createElement("div"); grid.className = "grid2"; body.appendChild(grid);
    list.forEach((eid) => {
      const s = this._hass.states[eid]; if (!s) return; const dom = eid.split(".")[0];
      const nm = (this._config.names && this._config.names[eid]) || (s.attributes.friendly_name || eid);
      const tile = document.createElement("div"); tile.className = "ctile light";
      tile.innerHTML = `<div class="chead"><div class="cicon"><ha-icon class="ci" icon="mdi:lightbulb"></ha-icon></div>` +
        `<div class="cname">${nm}</div><button class="ltgl" aria-label="Allumer/Éteindre"><ha-icon icon="mdi:power"></ha-icon></button></div>`;
      tile.querySelector(".ltgl").addEventListener("click", () => this._call("homeassistant", "toggle", { entity_id: eid }));
      let sl = null;
      const dimmable = dom === "light" && (s.attributes.brightness != null || (s.attributes.supported_color_modes || []).some((m) => !["onoff"].includes(m)));
      if (dimmable) { sl = jmaSlider({ icon: "mdi:brightness-6", fmt: (v) => v + "%", label: nm, onCommit: (v) => v <= 0 ? this._call("light", "turn_off", { entity_id: eid }) : this._call("light", "turn_on", { entity_id: eid, brightness_pct: v }) }); const sw = document.createElement("div"); sw.className = "cslider"; sw.appendChild(sl); tile.appendChild(sw); }
      grid.appendChild(tile); this._lightRows[eid] = { tile, sl };
    });
    this._lightsTick = () => {
      list.forEach((eid) => {
        const s = this._hass.states[eid], r = this._lightRows[eid]; if (!s || !r) return; const on = s.state === "on";
        r.tile.classList.toggle("on", on);
        r.tile.querySelector(".ci").setAttribute("icon", on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline");
        if (r.sl) { const b = s.attributes.brightness; r.sl.setValue(b != null ? Math.round(b / 255 * 100) : (on ? 100 : 0)); }
      });
    };
    this._lightsTick();
  }
  _climatesBody(body) {
    const list = this._config.entities || [];
    this._climRows = {};
    const MODE_ICON = { off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", auto: "mdi:autorenew", heat_cool: "mdi:sun-snowflake-variant", dry: "mdi:water-percent", fan_only: "mdi:fan" };
    const grid = document.createElement("div"); grid.className = "grid2"; body.appendChild(grid);
    list.forEach((eid) => {
      const s = this._hass.states[eid]; if (!s) return; const a0 = s.attributes;
      const nm = (this._config.names && this._config.names[eid]) || (a0.friendly_name || eid);
      const card = document.createElement("div"); card.className = "tcard climate";
      card.innerHTML =
        `<div class="thead"><div class="ticon"><ha-icon class="ti" icon="mdi:thermostat"></ha-icon></div>` +
        `<div class="tname">${nm}</div><div class="tact">—</div></div>` +
        `<div class="tstep"><button class="tbtn" data-d="-1" aria-label="Baisser"><ha-icon icon="mdi:minus"></ha-icon></button>` +
        `<div class="tval">—</div>` +
        `<button class="tbtn" data-d="1" aria-label="Monter"><ha-icon icon="mdi:plus"></ha-icon></button></div>` +
        `<div class="tsub"><span class="tcur"><ha-icon icon="mdi:thermometer"></ha-icon><span class="tcurv">—</span></span><span class="thum"></span></div>` +
        `<div class="tmodes"></div>`;
      const R = { row: card, pend: null, timer: null, hold: null };
      const valEl = card.querySelector(".tval");
      // pas à pas FLUIDE : maj immédiate locale + commit groupé (anti-lag de l'intégration)
      const bump = (dir) => {
        const st = this._hass.states[eid]; if (!st) return; const a = st.attributes; const step = a.target_temp_step || 0.5;
        const min = a.min_temp ?? 7, max = a.max_temp ?? 35;
        const base = R.pend != null ? R.pend : (a.temperature ?? min);
        R.pend = Math.round(Math.max(min, Math.min(max, Math.round((base + dir * step) / step) * step)) * 10) / 10;
        valEl.textContent = R.pend + "°"; card.classList.add("editing");
        clearTimeout(R.timer);
        R.timer = setTimeout(() => {
          this._call("climate", "set_temperature", { entity_id: eid, temperature: R.pend });
          clearTimeout(R.hold); R.hold = setTimeout(() => { R.pend = null; card.classList.remove("editing"); }, 3000);
        }, 500);
      };
      card.querySelectorAll(".tbtn").forEach((b) => b.addEventListener("click", () => bump(Number(b.dataset.d))));
      const mc = card.querySelector(".tmodes");
      (a0.hvac_modes || []).forEach((m) => {
        const b = document.createElement("button"); b.className = "tmode"; b.dataset.m = m;
        b.title = HVAC_FR[m] || m;
        b.innerHTML = `<ha-icon icon="${MODE_ICON[m] || "mdi:thermostat"}"></ha-icon>`;
        b.addEventListener("click", () => this._call("climate", "set_hvac_mode", { entity_id: eid, hvac_mode: m }));
        mc.appendChild(b);
      });
      grid.appendChild(card); this._climRows[eid] = R;
    });
    this._climatesTick = () => {
      list.forEach((eid) => {
        const s = this._hass.states[eid], R = this._climRows[eid]; if (!s || !R) return; const a = s.attributes, card = R.row;
        if (R.pend == null) card.querySelector(".tval").textContent = a.temperature != null ? a.temperature + "°" : "—";
        card.querySelector(".tcurv").textContent = a.current_temperature != null ? a.current_temperature + "°" : "—";
        const humEl = card.querySelector(".thum");
        humEl.textContent = a.current_humidity != null ? "💧 " + a.current_humidity + "%" : "";
        const heating = ["heating", "preheating"].includes(a.hvac_action), cooling = a.hvac_action === "cooling";
        const off = s.state === "off" || s.state === "unavailable";
        card.querySelector(".tact").textContent = off ? "Éteint" : (HVAC_ACTION_FR[a.hvac_action] || HVAC_FR[s.state] || s.state);
        card.classList.toggle("off", off);
        card.classList.toggle("on", !off && !heating && !cooling);
        card.classList.toggle("warn", heating);
        card.classList.toggle("cool", cooling);
        card.querySelector(".ti").setAttribute("icon", cooling ? "mdi:snowflake" : heating ? "mdi:fire" : "mdi:thermostat");
        card.querySelectorAll(".tmode").forEach((b) => b.classList.toggle("on", b.dataset.m === s.state));
      });
    };
    this._climatesTick();
  }
  _energyBody(body) {
    const num = (k) => { const e = this._config[k]; const s = e && this._hass.states[e]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; };
    const prod = Math.max(0, num("production_entity") || 0);
    const grid = Math.max(0, num("grid_entity") || 0);
    let cons = num("consumption_entity"); if (cons == null) cons = grid + prod; cons = Math.max(cons, 1);
    const auto = Math.round((Math.max(0, cons - grid) / cons) * 100);
    const cells = [["Consommation", Math.round(cons) + " W"], ["Solaire", Math.round(prod) + " W"],
      ["Réseau EDF", Math.round(grid) + " W"], ["Autoconso.", auto + " %"]];
    const kv = document.createElement("div"); kv.className = "row kv";
    kv.innerHTML = cells.map(([k, v]) => `<div class="cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    body.appendChild(kv);
    const gh = document.createElement("div"); gh.className = "row"; body.appendChild(gh);
    this._graph(gh, [this._config.production_entity, this._config.grid_entity, this._config.consumption_entity], 12);
  }
  _personBody(body) {
    const s = this._s, a = s.attributes;
    const cells = [["État", s.state === "home" ? "Présent" : s.state === "not_home" ? "Absent" : s.state],
      ["Depuis", jmaSince(s.last_changed)]];
    const batE = this._config.battery_entity && this._hass.states[this._config.battery_entity];
    if (batE && !isNaN(parseFloat(batE.state))) {
      const chg = this._config.battery_state_entity && this._hass.states[this._config.battery_state_entity];
      const charging = chg && /charg/i.test(chg.state) && !/not/i.test(chg.state);
      cells.push(["Batterie", Math.round(parseFloat(batE.state)) + " %" + (charging ? " ⚡" : "")]);
    }
    const distE = this._config.distance_entity && this._hass.states[this._config.distance_entity];
    if (distE && !isNaN(parseFloat(distE.state))) cells.push(["Distance", jmaFmtDist(parseFloat(distE.state))]);
    const kv = document.createElement("div"); kv.className = "row kv";
    kv.innerHTML = cells.map(([k, v]) => `<div class="cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    body.appendChild(kv);
    const geo = this._config.geocode_entity && this._hass.states[this._config.geocode_entity];
    const addr = geo && geo.state && !["unknown", "unavailable", ""].includes(geo.state) ? geo.state : null;
    if (addr) {
      const ar = document.createElement("div"); ar.className = "row";
      ar.innerHTML = `<div class="lbl"><span>Adresse</span></div><div style="font-size:.9rem;font-weight:600;white-space:pre-line;">${addr}</div>`;
      body.appendChild(ar);
    }
    if (a.latitude != null) { const mh = document.createElement("div"); mh.className = "row"; body.appendChild(mh); this._map(mh, [this._config.entity]); }
  }
  async _map(host, entities) {
    try {
      if (!window.loadCardHelpers) return;
      const h = await window.loadCardHelpers();
      const el = h.createCardElement({ type: "map", entities, aspect_ratio: "16:9" });
      el.hass = this._hass; el.classList.add("graph");
      host.appendChild(el); (this._graphs = this._graphs || []).push(el);
    } catch (e) {}
  }
  async _cameraBody(body) {
    const s = this._s; this._camStream = null;
    const row = document.createElement("div"); row.className = "row camlive";
    body.appendChild(row);
    let live = false;
    const tag = document.createElement("div"); tag.className = "camtag"; tag.textContent = "…"; row.appendChild(tag);
    const setTag = (txt, isLive) => { tag.textContent = txt; tag.classList.toggle("live", !!isLive); };
    // 1) élément natif HA de streaming = vrai direct (HLS/WebRTC)
    try {
      if (customElements.get("ha-camera-stream")) {
        const el = document.createElement("ha-camera-stream");
        el.hass = this._hass; el.stateObj = s; el.muted = true; el.allowExoPlayer = true;
        el.classList.add("livecard");
        row.appendChild(el); this._camStream = el; live = true; setTag("EN DIRECT", true);
      }
    } catch (e) { live = false; }
    // 2) repli : carte picture-entity en mode live
    if (!live) {
      try {
        if (window.loadCardHelpers) {
          const h = await window.loadCardHelpers();
          const el = h.createCardElement({ type: "picture-entity", entity: this._config.entity,
            camera_image: this._config.entity, camera_view: "live", show_name: false, show_state: false });
          el.hass = this._hass; el.classList.add("livecard");
          row.appendChild(el); (this._graphs = this._graphs || []).push(el); live = true; setTag("EN DIRECT", true);
        }
      } catch (e) {}
    }
    // 3) repli ultime : snapshot rafraîchi
    if (!live) {
      setTag("SNAPSHOT", false);
      const img = document.createElement("img"); img.className = "camimg"; img.id = "cam";
      img.src = s.attributes.entity_picture || ""; row.appendChild(img);
      clearInterval(this._camTimer);
      this._camTimer = setInterval(() => {
        const im = this.shadowRoot.getElementById("cam"); const st = this._s;
        if (im && st && st.attributes.entity_picture) {
          const p = st.attributes.entity_picture;
          im.src = p + (p.includes("?") ? "&" : "?") + "_=" + Date.now();
        }
      }, 2500);
    }
    const cells = [];
    const pc = this._config.person_count_entity && this._hass.states[this._config.person_count_entity];
    if (pc) cells.push(["Personnes", pc.state]);
    const occ = this._config.occupancy_entity && this._hass.states[this._config.occupancy_entity];
    if (occ) cells.push(["Présence", occ.state === "on" ? "Oui" : "Non"]);
    if (cells.length) {
      const kv = document.createElement("div"); kv.className = "row kv";
      kv.innerHTML = cells.map(([k, v]) => `<div class="cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
      body.appendChild(kv);
    }
  }
  _mediaBody(body) {
    const s = this._s;
    body.appendChild(this._slider("volume", "Volume", Math.round((s.attributes.volume_level || 0) * 100), (x) => x + " %",
      (x) => this._call("media_player", "volume_set", { entity_id: this._config.entity, volume_level: x / 100 })));
    const row = document.createElement("div");
    row.className = "row transport";
    row.innerHTML = `
      <button class="tbtn" data-s="media_previous_track"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
      <button class="tbtn big" data-s="media_play_pause"><ha-icon icon="mdi:play-pause"></ha-icon></button>
      <button class="tbtn" data-s="media_next_track"><ha-icon icon="mdi:skip-next"></ha-icon></button>`;
    row.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => this._call("media_player", b.dataset.s, { entity_id: this._config.entity })));
    body.appendChild(row);
    const sources = s.attributes.source_list || [];
    if (sources.length) {
      const sr = document.createElement("div"); sr.className = "row";
      sr.innerHTML = `<div class="lbl"><span>Source</span></div><div class="chiprow"></div>`;
      const wrap = sr.querySelector(".chiprow");
      sources.slice(0, 12).forEach((src) => {
        const b = document.createElement("button");
        b.className = "pchip" + (s.attributes.source === src ? " on" : ""); b.textContent = src;
        b.addEventListener("click", () => this._call("media_player", "select_source", { entity_id: this._config.entity, source: src }));
        wrap.appendChild(b);
      });
      body.appendChild(sr);
    }
  }
  _coverBody(body) {
    const s = this._s, a = s.attributes, feat = a.supported_features || 0;
    const stateFR = { open: "Ouvert", closed: "Fermé", opening: "Ouverture…", closing: "Fermeture…" }[s.state] || s.state;
    const cells = [["État", stateFR]];
    if (a.current_position != null) cells.push(["Position", a.current_position + " %"]);
    if (a.current_tilt_position != null) cells.push(["Inclinaison", a.current_tilt_position + " %"]);
    const head = document.createElement("div"); head.className = "row kv";
    head.innerHTML = cells.map(([k, v]) => `<div class="cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    body.appendChild(head);
    if (feat & 4) body.appendChild(this._slider("pos", "Position", a.current_position ?? 0, (x) => x + " %",
      (x) => this._call("cover", "set_cover_position", { entity_id: this._config.entity, position: x })));
    if (feat & 4) {
      const r = document.createElement("div"); r.className = "row";
      r.innerHTML = `<div class="lbl"><span>Raccourcis</span></div><div class="chiprow"></div>`;
      const wrap = r.querySelector(".chiprow");
      const cur = a.current_position;
      for (let p = 0; p <= 100; p += 10) {
        const b = document.createElement("button");
        b.className = "pchip" + (cur != null && Math.round(cur / 10) * 10 === p ? " on" : "");
        b.textContent = p + "%";
        b.addEventListener("click", () => this._call("cover", "set_cover_position", { entity_id: this._config.entity, position: p }));
        wrap.appendChild(b);
      }
      body.appendChild(r);
    }
    if (feat & 128) body.appendChild(this._slider("tilt", "Inclinaison", a.current_tilt_position ?? 0, (x) => x + " %",
      (x) => this._call("cover", "set_cover_tilt_position", { entity_id: this._config.entity, tilt_position: x })));
    const row = document.createElement("div");
    row.className = "row btns";
    row.innerHTML = `
      <button class="btn" data-s="open_cover">Ouvrir</button>
      <button class="btn" data-s="stop_cover">Stop</button>
      <button class="btn" data-s="close_cover">Fermer</button>`;
    row.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => this._call("cover", b.dataset.s, { entity_id: this._config.entity })));
    body.appendChild(row);
  }
  _toggleBody(body) { body.appendChild(this._toggleRow()); }
  _toggleRow() {
    const row = document.createElement("div");
    row.className = "row btns";
    const b = document.createElement("button");
    const on = this._hass.states[this._config.entity].state === "on";
    b.className = "btn primary"; b.textContent = on ? "Éteindre" : "Allumer";
    b.addEventListener("click", () => {
      this._call("homeassistant", "toggle", { entity_id: this._config.entity });
      setTimeout(() => this._renderBody(), 300);
    });
    row.appendChild(b);
    return row;
  }
  _hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  _call(domain, service, data) { if (this._hass) this._hass.callService(domain, service, data); }
}
jmaDef("jma-card-popup", JmaPopup);

// =============================================================================
//  🚗 VOITURE ÉLECTRIQUE (Zoé) — batterie, autonomie, charge
// =============================================================================
class JmaEvCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Voiture", ...c }; }
  getCardSize() { return 2; }
  static getStubConfig() {
    return { name: "Zoé", battery_entity: "sensor.zoe_batterie", range_entity: "sensor.zoe_autonomie_de_la_batterie",
      plug_entity: "binary_sensor.zoe_prise", charging_entity: "binary_sensor.zoe_en_charge" };
  }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._popup) this._popup.hass = h; }
  _g(key) { const e = this._config[key]; return e && this._hass.states[e]; }
  _num(key) { const s = this._g(key); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = { ...this._config, kind: "ev", entity: this._config.battery_entity };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .gauge{height:8px;border-radius:99px;background:rgba(255,255,255,.15);overflow:hidden;}
        .gfill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--jma-beige),var(--jma-rose));transition:width .4s;}
        .big{font-weight:800;font-size:1.15rem;letter-spacing:-.5px;flex:none;}
        .stat{display:flex;justify-content:space-between;font-size:.72rem;opacity:.8;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat" id="tile"><div class="content">
        <div class="top"><div class="badge"><ha-icon id="ic" icon="mdi:car-electric"></ha-icon></div>
          <div class="meta"><div class="name">${c.name}</div><div class="sub" id="sub"></div></div>
          <div class="big" id="pc">—</div></div>
        <div class="gauge"><div class="gfill" id="g"></div></div>
        <div class="stat"><span id="rng"></span><span id="eta"></span></div>
        <div class="btnrow" id="row"></div>
      </div></div></ha-card>`;
    const row = this.shadowRoot.getElementById("row");
    const addBtn = (key, icon, label, accent) => {
      if (!this._config[key]) return;
      const b = document.createElement("button");
      b.className = "cbtn" + (accent ? " accent" : ""); b.title = label;
      b.innerHTML = `<ha-icon icon="${icon}"></ha-icon>`;
      b.addEventListener("click", (e) => { e.stopPropagation(); this._press(this._config[key]); jmaToast({ title: this._config.name, message: label, icon, color: this._config.accent }); });
      row.appendChild(b);
    };
    addBtn("charge_start", "mdi:flash", "Charger", true);
    addBtn("charge_stop", "mdi:flash-off", "Stopper la charge");
    addBtn("climate_button", "mdi:air-conditioner", "Climatisation");
    this.shadowRoot.getElementById("tile").addEventListener("click", (e) => {
      if (e.target.closest(".cbtn")) return;
      this._openPopup();
    });
  }
  _press(ent) {
    const d = ent.split(".")[0];
    if (d === "button") this._hass.callService("button", "press", { entity_id: ent });
    else if (d === "switch") this._hass.callService("switch", "toggle", { entity_id: ent });
    else if (d === "script") this._hass.callService("script", "turn_on", { entity_id: ent });
  }
  _update() {
    if (!this._built) return;
    const bat = this._num("battery_entity");
    const rng = this._num("range_entity");
    const plug = this._g("plug_entity"), charging = this._g("charging_entity");
    const rem = this._num("remaining_entity");
    const climA = this._g("climate_active_entity");
    const climOn = climA && climA.state === "on";
    const moveE = this._g("moving_entity");
    const moving = moveE && (moveE.state === "on" || moveE.state === "moving" || (!isNaN(parseFloat(moveE.state)) && parseFloat(moveE.state) > 2));
    const isCharging = charging && charging.state === "on";
    const isPlugged = plug && plug.state === "on";
    this.shadowRoot.getElementById("pc").textContent = bat != null ? bat + "%" : "—";
    this.shadowRoot.getElementById("g").style.width = (bat != null ? Math.max(0, Math.min(100, bat)) : 0) + "%";
    this.shadowRoot.getElementById("rng").textContent = rng != null ? "⚡ " + Math.round(rng) + " km" : "";
    this.shadowRoot.getElementById("eta").textContent = climOn ? "❄️ Clim en cours" : (isCharging && rem != null ? "⏱ " + Math.round(rem) + " min" : "");
    const icon = moving ? "mdi:car-arrow-right" : climOn ? "mdi:air-conditioner" : isCharging ? "mdi:battery-charging-high" : isPlugged ? "mdi:power-plug" : "mdi:car-electric";
    this.shadowRoot.getElementById("ic").setAttribute("icon", icon);
    this.shadowRoot.getElementById("sub").textContent = moving ? "En route" : isCharging ? "En charge" : isPlugged ? "Branchée" : "Débranchée";
    this.shadowRoot.getElementById("tile").classList.toggle("on", isCharging || climOn || moving);
    this.shadowRoot.querySelector(".badge").classList.toggle("pulse", isCharging || climOn);
    this.shadowRoot.querySelector(".badge").style.background = climOn ? "#40c4ff33" : "";
    this.shadowRoot.getElementById("ic").style.color = climOn ? "#40c4ff" : "";
  }
}
jmaDef("jma-ev-card", JmaEvCard);

// =============================================================================
//  🗑️ POUBELLE — rappel par jour de la semaine (0=dim … 3=mer)
// =============================================================================
class JmaBinCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) {
    this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Poubelle", icon: "mdi:trash-can", days: [3], ...c };
    if (c && c.weekday != null) this._config.days = [c.weekday];
  }
  getCardSize() { return 1; }
  static getStubConfig() { return { name: "Poubelle", days: [3] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .tile.due{background:var(--jma-rose);color:var(--jma-dark);}
        .tile.due .badge{background:rgba(10,10,11,.18);} .tile.due .badge ha-icon{color:var(--jma-dark);}
        .done{border:none;border-radius:11px;background:rgba(255,255,255,.2);color:inherit;cursor:pointer;
          font-weight:700;font-size:.74rem;padding:7px 11px;flex:none;}
        .done:active{transform:scale(.93);}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile" id="tile"><div class="content">
        <div class="top"><div class="badge"><ha-icon id="ic" icon="${c.icon}"></ha-icon></div>
          <div class="meta"><div class="name">${c.name}</div><div class="sub" id="sub"></div></div>
          <button class="done" id="done" hidden>C'est fait</button></div>
      </div></div></ha-card>`;
    this.shadowRoot.getElementById("done").addEventListener("click", (e) => { e.stopPropagation(); this._toggleAck(); });
  }
  _key() { return "jma-bin-" + (this._config.name || "x"); }
  _today() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  _acked() { try { return localStorage.getItem(this._key()) === this._today(); } catch (_) { return false; } }
  _toggleAck() {
    const wasAcked = this._acked();
    try { wasAcked ? localStorage.removeItem(this._key()) : localStorage.setItem(this._key(), this._today()); } catch (_) {}
    jmaToast(wasAcked
      ? { title: this._config.name, message: "Annulé — à ressortir", icon: "mdi:undo", color: this._config.color, level: "warning" }
      : { title: this._config.name, message: "Marquée comme sortie ✓", icon: "mdi:check-circle", level: "success" });
    this._update();
  }
  _update() {
    if (!this._built) return;
    const days = this._config.days || [3];
    const dow = new Date().getDay();
    const names = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    let delta = 7;
    for (let i = 1; i <= 7; i++) if (days.includes((dow + i) % 7)) { delta = i; break; }
    const dueToday = days.includes(dow);
    const acked = this._acked();
    const at = this._config.time ? " • " + this._config.time : "";
    const tile = this.shadowRoot.getElementById("tile");
    const sub = this.shadowRoot.getElementById("sub");
    const done = this.shadowRoot.getElementById("done");
    const nextName = names[(dow + delta) % 7];
    if (dueToday && !acked) {
      tile.classList.add("due"); done.hidden = false; done.textContent = "C'est fait";
      sub.textContent = "À sortir aujourd'hui !" + at;
      this.shadowRoot.getElementById("ic").setAttribute("icon", "mdi:trash-can-outline");
    } else {
      tile.classList.remove("due");
      this.shadowRoot.getElementById("ic").setAttribute("icon", this._config.icon || "mdi:trash-can");
      if (dueToday && acked) {
        // sortie aujourd'hui : permettre d'annuler
        done.hidden = false; done.textContent = "Annuler";
        sub.textContent = "Sortie ✓ aujourd'hui" + at;
      } else {
        done.hidden = true;
        sub.textContent = (delta === 1 ? "Demain (" + nextName + ")" : "Dans " + delta + " jours (" + nextName + ")") + at;
      }
    }
  }
}
jmaDef("jma-bin-card", JmaBinCard);

// =============================================================================
//  📷 CAMÉRA
// =============================================================================
class JmaCameraCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { if (!c.entity) throw new Error("camera : 'entity' requis"); this._config = { color: ROSE, accent: BEIGE, dark: DARK, ...c }; }
  getCardSize() { return 2; }
  static getStubConfig() { return { entity: "camera.example" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._popup) this._popup.hass = h; }
  get _s() { return this._hass.states[this._config.entity]; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .cam{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:16/9;background:#000;cursor:pointer;}
        .cam img{width:100%;height:100%;object-fit:cover;display:block;}
        .ov{position:absolute;left:0;right:0;bottom:0;padding:9px 11px;display:flex;align-items:center;gap:8px;
          background:linear-gradient(0deg,rgba(0,0,0,.65),transparent);color:#fff;}
        .nm{font-weight:700;font-size:.84rem;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .rec{display:flex;align-items:center;gap:5px;font-size:.68rem;font-weight:700;}
        .recdot{width:8px;height:8px;border-radius:50%;background:#ff3b30;animation:jmablink 1.4s infinite;}
        @keyframes jmablink{50%{opacity:.2;}}
        .pers{position:absolute;top:9px;left:9px;background:var(--jma-rose);color:var(--jma-dark);font-weight:700;
          font-size:.68rem;padding:4px 8px;border-radius:9px;display:none;align-items:center;gap:4px;}
        .pers.show{display:flex;} .pers ha-icon{--mdc-icon-size:13px;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="cam" id="cam">
        <img id="img" alt="">
        <div class="pers" id="pers"><ha-icon icon="mdi:account"></ha-icon><span id="pc"></span></div>
        <div class="ov"><span class="nm" id="nm"></span><span class="rec" id="rec" hidden><span class="recdot"></span>REC</span></div>
      </div></ha-card>`;
    this.shadowRoot.getElementById("cam").addEventListener("click", () => this._openPopup());
  }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = this._config; p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _update() {
    const s = this._s; if (!s) return;
    const img = this.shadowRoot.getElementById("img");
    if (s.attributes.entity_picture) img.src = s.attributes.entity_picture;
    this.shadowRoot.getElementById("nm").textContent = this._config.name || s.attributes.friendly_name || this._config.entity;
    this.shadowRoot.getElementById("rec").hidden = s.state !== "recording";
    const occ = this._config.occupancy_entity && this._hass.states[this._config.occupancy_entity];
    const pcE = this._config.person_count_entity && this._hass.states[this._config.person_count_entity];
    const present = (occ && occ.state === "on") || (pcE && parseInt(pcE.state) > 0);
    this.shadowRoot.getElementById("pers").classList.toggle("show", !!present);
    this.shadowRoot.getElementById("pc").textContent = pcE ? pcE.state : "•";
  }
}
jmaDef("jma-camera-card", JmaCameraCard);

// =============================================================================
//  📹 MULTI-CAMÉRAS (mosaïque)
// =============================================================================
class JmaCamerasCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, columns: 2, ...c }; this._cams = c.entities || (c.entity ? [c.entity] : []); }
  getCardSize() { return Math.max(2, this._cams.length); }
  static getStubConfig() { return { entities: ["camera.example"] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._popup) this._popup.hass = h; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .grid{display:grid;grid-template-columns:repeat(${Math.max(1, c.columns)},1fr);gap:6px;}
        .cam{position:relative;border-radius:14px;overflow:hidden;aspect-ratio:16/9;background:#000;cursor:pointer;}
        .cam img{width:100%;height:100%;object-fit:cover;display:block;}
        .ov{position:absolute;left:0;right:0;bottom:0;padding:6px 8px;display:flex;align-items:center;gap:6px;
          background:linear-gradient(0deg,rgba(0,0,0,.6),transparent);color:#fff;}
        .nm{font-weight:700;font-size:.72rem;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .rec{display:flex;align-items:center;gap:4px;font-size:.6rem;font-weight:700;}
        .rd{width:7px;height:7px;border-radius:50%;background:#ff3b30;animation:jmablink 1.4s infinite;}
        @keyframes jmablink{50%{opacity:.2;}}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="grid" id="grid"></div></ha-card>`;
    const grid = this.shadowRoot.getElementById("grid");
    this._cams.forEach((eid) => {
      const cam = document.createElement("div"); cam.className = "cam"; cam.dataset.e = eid;
      cam.innerHTML = `<img alt=""><div class="ov"><span class="nm"></span><span class="rec" hidden><span class="rd"></span>REC</span></div>`;
      cam.addEventListener("click", () => this._openPopup(eid));
      grid.appendChild(cam);
    });
  }
  _openPopup(entity) {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = { entity, color: this._config.color, accent: this._config.accent, dark: this._config.dark };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _update() {
    this._cams.forEach((eid) => {
      const s = this._hass.states[eid]; const cam = this.shadowRoot.querySelector(`.cam[data-e="${eid}"]`);
      if (!cam) return;
      if (!s) { cam.style.opacity = ".4"; return; }
      cam.style.opacity = "";
      if (s.attributes.entity_picture) cam.querySelector("img").src = s.attributes.entity_picture;
      cam.querySelector(".nm").textContent = (this._config.names && this._config.names[eid]) || s.attributes.friendly_name || eid;
      cam.querySelector(".rec").hidden = s.state !== "recording";
    });
  }
}
jmaDef("jma-cameras-card", JmaCamerasCard);

// =============================================================================
//  🔊 SONOS MULTI-ROOM — lecture du groupe + grouper/dégrouper + volume/pièce
// =============================================================================
class JmaSonosCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Sonos", favorites: true, ...c }; this._spk = c.entities || []; }
  getCardSize() { return 2; }
  static getStubConfig() { return { name: "Sonos", entities: ["media_player.salon"] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config);
    if (this._config.expanded) { if (this._inline) this._inline.hass = h; return; }
    this._update(); if (this._popup) this._popup.hass = h; }
  _call(s, data) { this._hass.callService("media_player", s, data); }
  _buildInline() {
    this.shadowRoot.innerHTML = `<style>:host{display:block;}</style><div id="host"></div>`;
    const p = document.createElement("jma-card-popup");
    p.config = { kind: "sonos", inline: true, speakers: this._spk, master: this._config.master,
      names: this._config.names, name: this._config.name, favorites: this._config.favorites,
      color: this._config.color, accent: this._config.accent, dark: this._config.dark, theme: this._config.theme };
    p.hass = this._hass;
    this.shadowRoot.getElementById("host").appendChild(p); this._inline = p;
  }
  _master() {
    if (this._config.master && this._hass.states[this._config.master]) return this._config.master;
    let best = null, score = -1;
    this._spk.forEach((eid) => {
      const s = this._hass.states[eid]; if (!s) return;
      const n = (s.attributes.group_members || [eid]).length;
      const sc = n * 10 + (s.state === "playing" ? 5 : s.state === "paused" ? 2 : 0);
      if (sc > score) { score = sc; best = eid; }
    });
    return best || this._spk[0];
  }
  _build() {
    const c = this._config;
    if (c.expanded) return this._buildInline();
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .transport{display:flex;gap:8px;align-items:center;flex:none;}
        .tbtn{width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;background:var(--jma-surf3);
          color:var(--jma-text);display:flex;align-items:center;justify-content:center;}
        .tbtn.big{background:var(--jma-rose);color:var(--jma-dark);} .tbtn ha-icon{--mdc-icon-size:18px;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat" id="tile"><div class="art"></div><div class="content">
        <div class="top"><div class="badge"><ha-icon class="ic" icon="mdi:speaker-multiple"></ha-icon></div>
          <div class="meta"><div class="name" id="nm">${c.name}</div><div class="sub" id="sub"></div></div>
          <div class="transport">
            <button class="tbtn" data-a="media_previous_track"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
            <button class="tbtn big" data-a="media_play_pause"><ha-icon class="pp" icon="mdi:play"></ha-icon></button>
            <button class="tbtn" data-a="media_next_track"><ha-icon icon="mdi:skip-next"></ha-icon></button>
          </div></div>
      </div></div></ha-card>`;
    this.shadowRoot.querySelectorAll(".tbtn").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); this._call(b.dataset.a, { entity_id: this._master() }); }));
    this._gsl = jmaSlider({ icon: "mdi:volume-high", fmt: (v) => v + "%", onCommit: (v) => {
      const m = this._master(); const grp = (this._hass.states[m] && this._hass.states[m].attributes.group_members) || [m];
      grp.forEach((eid) => { if (this._hass.states[eid] && this._hass.states[eid].attributes.volume_level != null) this._call("volume_set", { entity_id: eid, volume_level: v / 100 }); });
    } });
    this.shadowRoot.querySelector(".content").appendChild(this._gsl);
    this.shadowRoot.getElementById("tile").addEventListener("click", (e) => { if (e.target.closest(".tbtn") || e.target.closest(".slider")) return; this._openPopup(); });
  }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = { ...this._config, kind: "sonos", speakers: this._spk, entity: this._master() };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _update() {
    const master = this._master();
    const ms = this._hass.states[master]; if (!ms) return;
    const a = ms.attributes;
    const playing = ms.state === "playing";
    const grpN = (a.group_members || [master]).length;
    const np = a.media_title ? a.media_title + (a.media_artist ? " — " + a.media_artist : "") : (["playing", "paused"].includes(ms.state) ? ms.state : "À l'arrêt");
    this.shadowRoot.getElementById("sub").textContent = grpN > 1 ? "👥 " + grpN + " · " + np : np;
    this.shadowRoot.querySelector(".pp").setAttribute("icon", playing ? "mdi:pause" : "mdi:play");
    this.shadowRoot.getElementById("tile").classList.toggle("on", ["playing", "paused"].includes(ms.state));
    const art = this.shadowRoot.querySelector(".art");
    art.style.backgroundImage = a.entity_picture && ["playing", "paused"].includes(ms.state) ? `url("${a.entity_picture}")` : "";
    // volume global = moyenne du groupe
    const grp = a.group_members || [master];
    const vols = grp.map((e) => this._hass.states[e]).filter((x) => x && x.attributes.volume_level != null).map((x) => x.attributes.volume_level);
    if (vols.length) { this._gsl.hidden = false; this._gsl.setValue(Math.round((vols.reduce((p, v) => p + v, 0) / vols.length) * 100)); }
    else this._gsl.hidden = true;
  }
}
jmaDef("jma-sonos-card", JmaSonosCard);

// =============================================================================
//  ✝️ SAINT DU JOUR (calendrier français intégré)
// =============================================================================
const SAINTS = [
  ["Marie", "Basile", "Geneviève", "Odilon", "Édouard", "Mélaine", "Raymond", "Lucien", "Alix", "Guillaume", "Pauline", "Tatiana", "Yvette", "Nina", "Rémi", "Marcel", "Roseline", "Prisca", "Marius", "Sébastien", "Agnès", "Vincent", "Barnard", "François de Sales", "Conversion de St Paul", "Paule", "Angèle", "Thomas d'Aquin", "Gildas", "Martine", "Marcelle"],
  ["Ella", "Présentation", "Blaise", "Véronique", "Agathe", "Gaston", "Eugénie", "Jacqueline", "Apolline", "Arnaud", "N.-D. de Lourdes", "Félix", "Béatrice", "Valentin", "Claude", "Julienne", "Alexis", "Bernadette", "Gabin", "Aimée", "Pierre Damien", "Isabelle", "Lazare", "Modeste", "Roméo", "Nestor", "Honorine", "Romain", "Auguste"],
  ["Aubin", "Charles le Bon", "Guénolé", "Casimir", "Olive", "Colette", "Félicité", "Jean de Dieu", "Françoise", "Vivien", "Rosine", "Justine", "Rodrigue", "Mathilde", "Louise", "Bénédicte", "Patrice", "Cyrille", "Joseph", "Herbert", "Clémence", "Léa", "Victorien", "Cath. de Suède", "Annonciation", "Larissa", "Habib", "Gontran", "Gwladys", "Amédée", "Benjamin"],
  ["Hugues", "Sandrine", "Richard", "Isidore", "Irène", "Marcellin", "J.-B. de la Salle", "Julie", "Gautier", "Fulbert", "Stanislas", "Jules", "Ida", "Maxime", "Paterne", "Benoît-Joseph", "Anicet", "Parfait", "Emma", "Odette", "Anselme", "Alexandre", "Georges", "Fidèle", "Marc", "Alida", "Zita", "Valérie", "Cath. de Sienne", "Robert"],
  ["Jérémie", "Boris", "Phil. & Jacques", "Sylvain", "Judith", "Prudence", "Gisèle", "Désiré", "Pacôme", "Solange", "Estelle", "Achille", "Rolande", "Matthias", "Denise", "Honoré", "Pascal", "Éric", "Yves", "Bernardin", "Constantin", "Émile", "Didier", "Donatien", "Sophie", "Bérenger", "Augustin", "Germain", "Aymar", "Ferdinand", "Pétronille"],
  ["Justin", "Blandine", "Kévin", "Clotilde", "Igor", "Norbert", "Gilbert", "Médard", "Diane", "Landry", "Barnabé", "Guy", "Antoine de Padoue", "Élisée", "Germaine", "J.-F. Régis", "Hervé", "Léonce", "Romuald", "Silvère", "Rodolphe", "Alban", "Audrey", "Jean-Baptiste", "Prosper", "Anthelme", "Fernand", "Irénée", "Pierre & Paul", "Martial"],
  ["Thierry", "Martinien", "Thomas", "Florent", "Antoine", "Mariette", "Raoul", "Thibault", "Amandine", "Ulrich", "Benoît", "Olivier", "Henri & Joël", "Camille", "Donald", "N.-D. Mont-Carmel", "Charlotte", "Frédéric", "Arsène", "Marina", "Victor", "Marie-Madeleine", "Brigitte", "Christine", "Jacques", "Anne & Joachim", "Nathalie", "Samson", "Marthe", "Juliette", "Ignace de Loyola"],
  ["Alphonse", "Julien Eymard", "Lydie", "J.-M. Vianney", "Abel", "Transfiguration", "Gaétan", "Dominique", "Amour", "Laurent", "Claire", "Clarisse", "Hippolyte", "Évrard", "Assomption", "Armel", "Hyacinthe", "Hélène", "Jean Eudes", "Bernard", "Christophe", "Fabrice", "Rose de Lima", "Barthélemy", "Louis", "Natacha", "Monique", "Augustin", "Sabine", "Fiacre", "Aristide"],
  ["Gilles", "Ingrid", "Grégoire", "Rosalie", "Raïssa", "Bertrand", "Reine", "Nativité de Marie", "Alain", "Inès", "Adelphe", "Apollinaire", "Aimé", "La Sainte Croix", "Roland", "Édith", "Renaud", "Nadège", "Émilie", "Davy", "Matthieu", "Maurice", "Constant", "Thècle", "Hermann", "Côme & Damien", "Vincent de Paul", "Venceslas", "Michel & Gabriel", "Jérôme"],
  ["Thérèse E.-J.", "Léger", "Gérard", "François d'Assise", "Fleur", "Bruno", "Serge", "Pélagie", "Denis", "Ghislain", "Firmin", "Wilfried", "Géraud", "Juste", "Thérèse d'Avila", "Edwige", "Baudouin", "Luc", "René", "Adeline", "Céline", "Élodie", "Jean de Capistran", "Florentin", "Crépin", "Dimitri", "Émeline", "Simon & Jude", "Narcisse", "Bienvenue", "Quentin"],
  ["Toussaint", "Défunts", "Hubert", "Charles", "Sylvie", "Bertille", "Carine", "Geoffroy", "Théodore", "Léon", "Martin", "Christian", "Brice", "Sidoine", "Albert", "Marguerite", "Élisabeth", "Aude", "Tanguy", "Edmond", "Présentation de Marie", "Cécile", "Clément", "Flora", "Catherine", "Delphine", "Séverin", "Jacques de la Marche", "Saturnin", "André"],
  ["Florence", "Viviane", "Xavier", "Barbara", "Gérald", "Nicolas", "Ambroise", "Imm. Conception", "Pierre Fourier", "Romaric", "Daniel", "Jeanne-Françoise", "Lucie", "Odile", "Ninon", "Alice", "Gaël", "Gatien", "Urbain", "Théophile", "Pierre Canisius", "Fr.-Xavière", "Armand", "Adèle", "Noël", "Étienne", "Jean", "Innocents", "David", "Roger", "Sylvestre"],
];
class JmaSaintCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, ...c }; }
  getCardSize() { return 1; }
  static getStubConfig() { return {}; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .badge{background:var(--jma-rose);} .badge ha-icon{color:var(--jma-dark);}
        .sd{font-weight:800;font-size:1.02rem;letter-spacing:-.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="top"><div class="badge"><ha-icon icon="mdi:cross-outline"></ha-icon></div>
          <div class="meta"><div class="sd" id="saint">—</div><div class="sub" id="date"></div></div></div>
      </div></div></ha-card>`;
  }
  _update() {
    const d = new Date();
    let saint;
    if (this._config.entity && this._hass.states[this._config.entity]) saint = this._hass.states[this._config.entity].state;
    else { const arr = SAINTS[d.getMonth()]; saint = (arr && arr[d.getDate() - 1]) || "—"; }
    const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const special = /^(N\.-D\.|Toussaint|Défunts|Assomption|Annonciation|Présentation|Transfiguration|Nativité|La Sainte|Imm\.|Noël|Conversion|Marie$)/.test(saint);
    this.shadowRoot.getElementById("saint").textContent = special ? saint : "St" + (/^[AÉEIOUYH]/i.test(saint) ? "e " : " ") + saint;
    this.shadowRoot.getElementById("date").textContent = days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()];
  }
}
jmaDef("jma-saint-card", JmaSaintCard);

// =============================================================================
//  🧑‍🤝‍🧑 PRÉSENCE (avatars)
// =============================================================================
class JmaPresenceCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, ...c }; this._persons = c.persons || c.entities || (c.entity ? [c.entity] : []); }
  getCardSize() { return 1; }
  static getStubConfig() { return { persons: ["person.example"] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._popup) this._popup.hass = h; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .ppl{display:flex;gap:14px;flex-wrap:wrap;justify-content:space-around;width:100%;}
        .p{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;width:96px;}
        .av{width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,.12);background-size:cover;background-position:center;
          position:relative;border:2px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:1.15rem;color:#fff;}
        .p.home .av{border-color:#69f0ae;}
        .p.away .av{filter:grayscale(.7) brightness(.85);opacity:.7;}
        .b2{position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;border:2px solid var(--jma-dark);
          display:flex;align-items:center;justify-content:center;}
        .p.home .b2{background:#69f0ae;} .p.away .b2{background:#8a8a8e;}
        .b2 ha-icon{--mdc-icon-size:11px;color:#0a0a0b;}
        .pn{font-weight:600;font-size:.8rem;} .ps{font-size:.66rem;opacity:.62;text-align:center;line-height:1.2;}
        .bb{position:absolute;top:-3px;right:-9px;height:18px;padding:0 5px;border-radius:9px;background:rgba(10,10,11,.92);
          border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;gap:2px;font-size:.6rem;font-weight:800;color:#fff;}
        .bb ha-icon{--mdc-icon-size:12px;}
        .bb.low{color:#ff5252;border-color:#ff5252;} .bb.chg{color:#69f0ae;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="ppl" id="ppl"></div>
      </div></div></ha-card>`;
  }
  _derive(s, i) {
    const src = (s.attributes.source || (s.attributes.device_trackers || [])[0] || "").split(".")[1];
    const ov = (this._config.sensors && this._config.sensors[s.entity_id]) || {};
    const at = (arr) => (Array.isArray(arr) ? arr[i] : null);
    return {
      entity: s.entity_id,
      battery_entity: ov.battery || at(this._config.battery_entities) || (src ? "sensor." + src + "_battery_level" : null),
      battery_state_entity: ov.battery_state || at(this._config.battery_state_entities) || (src ? "sensor." + src + "_battery_state" : null),
      geocode_entity: ov.geocode || at(this._config.geocode_entities) || (src ? "sensor." + src + "_geocoded_location" : null),
      distance_entity: ov.distance || at(this._config.distance_entities) || (src ? "sensor." + src + "_distance" : null),
    };
  }
  _openPopup(cfg) {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = { color: this._config.color, accent: this._config.accent, dark: this._config.dark, name: cfg.name, ...cfg };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _update() {
    const ppl = this.shadowRoot.getElementById("ppl"); ppl.innerHTML = "";
    this._persons.forEach((eid, i) => {
      const s = this._hass.states[eid]; if (!s) return;
      const home = s.state === "home";
      const name = (this._config.names && this._config.names[eid]) || s.attributes.friendly_name || eid.split(".")[1];
      const pic = s.attributes.entity_picture;
      const zone = home ? "Présent" : (s.state === "not_home" ? "Absent" : s.state);
      const dur = jmaSince(s.last_changed);
      const der = this._derive(s, i);
      const batS = der.battery_entity && this._hass.states[der.battery_entity];
      const bat = batS && !isNaN(parseFloat(batS.state)) ? Math.round(parseFloat(batS.state)) : null;
      const chgS = der.battery_state_entity && this._hass.states[der.battery_state_entity];
      const charging = chgS && /charg/i.test(chgS.state) && !/not/i.test(chgS.state);
      const batBadge = bat != null
        ? `<span class="bb${charging ? " chg" : bat <= 20 ? " low" : ""}"><ha-icon icon="${jmaBatIcon(bat, charging)}"></ha-icon>${bat}</span>`
        : "";
      const el = document.createElement("div"); el.className = "p " + (home ? "home" : "away");
      el.title = name + " · " + zone + " · " + dur;
      el.innerHTML = `<div class="av" style="${pic ? `background-image:url('${pic}')` : ""}">${pic ? "" : name.slice(0, 1).toUpperCase()}` +
        batBadge +
        `<span class="b2"><ha-icon icon="${home ? "mdi:check" : "mdi:home-export-outline"}"></ha-icon></span></div>`;
      el.addEventListener("click", () => this._openPopup({ ...der, name }));
      ppl.appendChild(el);
    });
  }
}
jmaDef("jma-presence-card", JmaPresenceCard);

// =============================================================================
//  📅 AGENDA (calendriers, nb de jours configurable)
// =============================================================================
class JmaAgendaCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; this._loading = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, days: 7, max: 6, title: "Agenda", ...c }; this._cals = c.entities || (c.entity ? [c.entity] : []); }
  getCardSize() { return 2; }
  static getStubConfig() { return { title: "Agenda", days: 7, max: 6, entities: ["calendar.example"] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { const first = !this._hass; this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); if (first || this._stale()) this._fetch(); if (this._popup) this._popup.hass = h; }
  _stale() { return !this._last || Date.now() - this._last > 180000; }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = { ...this._config, kind: "agenda", entities: this._cals };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _palette(i) { return ["#e98aa8", "#6aa3ff", "#4cc38a", "#f5b461", "#b794f6", "#4fd1c5"][i % 6]; }
  _calName(i) { const e = this._cals[i]; const s = e && this._hass.states[e]; return (this._config.names && this._config.names[e]) || (s && s.attributes.friendly_name) || (e || "").split(".")[1] || ""; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .content{gap:9px;}
        .aleg{display:flex;gap:12px;flex-wrap:wrap;margin:1px 0 -2px;}
        .lg{display:flex;align-items:center;gap:5px;font-size:.63rem;font-weight:700;opacity:.7;}
        .lg .d{width:9px;height:9px;border-radius:3px;flex:none;}
        #list{display:flex;flex-direction:column;}
        .aday{display:flex;align-items:center;gap:11px;margin:13px 0 4px;}
        .aday:first-child{margin-top:2px;}
        .adn{width:40px;height:46px;border-radius:13px;background:var(--jma-surf3);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;line-height:1;}
        .adn .dnum{font-weight:800;font-size:1.15rem;}
        .adn .dwd{font-size:.54rem;font-weight:800;text-transform:uppercase;opacity:.55;letter-spacing:.5px;margin-top:2px;}
        .aday.today .adn{background:var(--jma-grad);color:var(--jma-dark);}.aday.today .adn .dwd{opacity:.85;}
        .adlbl{font-weight:800;font-size:.92rem;text-transform:capitalize;}
        .aday.today .adlbl{color:var(--jma-rose);}
        .adsaint{font-size:.64rem;color:var(--jma-rose);opacity:.85;font-weight:700;margin-left:auto;text-align:right;}
        .aev{display:flex;align-items:stretch;gap:10px;padding:5px 0 5px 51px;}
        .aevbar{width:3.5px;border-radius:3px;flex:none;background:var(--jma-rose);}
        .aevt{font-size:.72rem;font-weight:800;opacity:.65;min-width:40px;font-variant-numeric:tabular-nums;padding-top:1px;}
        .aevti{font-size:.84rem;font-weight:600;flex:1;line-height:1.25;}
        .aevd{font-size:.66rem;opacity:.45;font-weight:600;}
        .more,.empty{font-size:.74rem;opacity:.5;padding:6px 2px;}
        /* mode blocs */
        .ablock{background:var(--jma-surf2);border:1px solid var(--jma-surf3);border-radius:17px;padding:12px 14px 10px;margin-bottom:9px;}
        .ablock.today{border-color:var(--jma-rose);background:linear-gradient(180deg,rgba(248,165,194,.1),var(--jma-surf2) 60%);}
        .abh{display:flex;align-items:center;gap:11px;margin-bottom:9px;}
        .ablock.today .adlbl{color:var(--jma-rose);}
        .ablock.today .adn{background:var(--jma-grad);color:var(--jma-dark);}
        .abct{margin-left:auto;font-size:.62rem;font-weight:800;opacity:.45;background:var(--jma-surf3);padding:3px 8px;border-radius:999px;}
        .abev{display:flex;align-items:stretch;gap:10px;padding:6px 0;}
        .abev + .abev{border-top:1px solid var(--jma-surf3);}
        .abevbar{width:3.5px;border-radius:3px;flex:none;}
        .abevt{font-size:.74rem;font-weight:800;opacity:.7;min-width:42px;font-variant-numeric:tabular-nums;padding-top:1px;}
        .abevti{font-size:.86rem;font-weight:600;flex:1;line-height:1.25;}
        .ablock.empty-day{opacity:.5;}.ablock.empty-day .abh{margin-bottom:0;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="top"><div class="badge"><ha-icon icon="mdi:calendar-month"></ha-icon></div>
          <div class="meta"><div class="name">${c.title}</div><div class="sub" id="sub"></div></div></div>
        <div class="aleg" id="leg"></div>
        <div id="list"></div>
      </div></div></ha-card>`;
    this.shadowRoot.querySelector(".tile").style.cursor = "pointer";
    this.shadowRoot.querySelector(".tile").addEventListener("click", () => this._openPopup());
  }
  async _fetch() {
    if (this._loading || !this._cals.length) return;
    this._loading = true; this._last = Date.now();
    const start = new Date(); const end = new Date(); end.setDate(end.getDate() + (this._config.days || 7));
    const iso = (d) => d.toISOString();
    const evs = [];
    try {
      for (let i = 0; i < this._cals.length; i++) {
        const r = await this._hass.callApi("GET", `calendars/${this._cals[i]}?start=${encodeURIComponent(iso(start))}&end=${encodeURIComponent(iso(end))}`);
        (r || []).forEach((e) => { e._ci = i; evs.push(e); });
      }
    } catch (e) {}
    this._loading = false; this._render(evs);
  }
  _render(evs) {
    const leg = this.shadowRoot.getElementById("leg");
    if (this._cals.length > 1) leg.innerHTML = this._cals.map((e, i) => `<div class="lg"><span class="d" style="background:${this._palette(i)}"></span>${this._calName(i)}</div>`).join("");
    else leg.innerHTML = "";
    const list = this.shadowRoot.getElementById("list"); const sub = this.shadowRoot.getElementById("sub");
    list.innerHTML = "";
    evs = evs.map((e) => { const s = e.start && (e.start.dateTime || e.start.date); return { d: new Date(s), allday: !(e.start && e.start.dateTime), ci: e._ci || 0, e }; })
      .filter((x) => !isNaN(x.d)).sort((a, b) => a.d - b.d);
    sub.textContent = `${this._config.days} jours · ${evs.length} événement${evs.length > 1 ? "s" : ""}`;
    if (!evs.length) { const x = document.createElement("div"); x.className = "empty"; x.textContent = "Rien de prévu 🎉"; list.appendChild(x); return; }
    const dn = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tom = new Date(today); tom.setDate(tom.getDate() + 1);
    const dk = (d) => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    const max = this._config.max || 12;
    const shown = evs.slice(0, max);
    // groupage par jour
    const days = []; const idx = {};
    shown.forEach((ev) => { const key = dk(ev.d); if (idx[key] == null) { idx[key] = days.length; days.push({ key, d: ev.d, items: [] }); } days[idx[key]].items.push(ev); });
    const saintOf = (d) => { const saint = (typeof SAINTS !== "undefined" && (SAINTS[d.getMonth()] || [])[d.getDate() - 1]) || "";
      const special = /^(N\.-D\.|Toussaint|Défunts|Assomption|Annonciation|Présentation|Transfiguration|Nativité|La Sainte|Imm\.|Noël|Conversion|Marie$)/.test(saint);
      return saint ? (special ? saint : "St" + (/^[AÉEIOUYH]/i.test(saint) ? "e " : " ") + saint) : ""; };
    const labelOf = (d, key) => key === dk(today) ? "Aujourd'hui" : key === dk(tom) ? "Demain" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
    const evRow = (ev, cls) => { const tt = ev.allday ? "Jour" : ("" + ev.d.getHours()).padStart(2, "0") + ":" + ("" + ev.d.getMinutes()).padStart(2, "0");
      return `<div class="${cls}" style="display:flex;align-items:stretch;gap:10px;"><div class="${cls}bar" style="background:${this._palette(ev.ci)}"></div><div class="${cls}t">${tt}</div><div class="${cls}ti">${ev.e.summary || ev.e.message || "(sans titre)"}</div></div>`; };
    if (this._config.blocks) {
      days.forEach(({ key, d, items }) => {
        const b = document.createElement("div"); b.className = "ablock" + (key === dk(today) ? " today" : "");
        const sl = saintOf(d);
        b.innerHTML = `<div class="abh"><div class="adn"><span class="dnum">${d.getDate()}</span><span class="dwd">${dn[d.getDay()]}</span></div>` +
          `<div class="adlbl">${labelOf(d, key)}</div><div class="abct">${items.length} évén.</div></div>` +
          (sl ? `<div class="adsaint" style="margin:-4px 0 7px 51px;">✦ ${sl}</div>` : "") +
          items.map((ev) => evRow(ev, "abev")).join("");
        list.appendChild(b);
      });
    } else {
      days.forEach(({ key, d, items }) => {
        const h = document.createElement("div"); h.className = "aday"; if (key === dk(today)) h.classList.add("today");
        const sl = saintOf(d);
        h.innerHTML = `<div class="adn"><span class="dnum">${d.getDate()}</span><span class="dwd">${dn[d.getDay()]}</span></div>` +
          `<div class="adlbl">${labelOf(d, key)}</div>` + (sl ? `<div class="adsaint">✦ ${sl}</div>` : "");
        list.appendChild(h);
        items.forEach((ev) => { const r = document.createElement("div"); r.innerHTML = evRow(ev, "aev"); list.appendChild(r.firstChild); });
      });
    }
    if (evs.length > max) { const m = document.createElement("div"); m.className = "more"; m.textContent = "+ " + (evs.length - max) + " autres…"; list.appendChild(m); }
  }
}
jmaDef("jma-agenda-card", JmaAgendaCard);
// =============================================================================
//  📅 CALENDRIER — vue mois complète (grille 7×6, météo du jour, détail au tap)
// =============================================================================
const JMA_WICON = { "sunny": "mdi:weather-sunny", "clear-night": "mdi:weather-night", "partlycloudy": "mdi:weather-partly-cloudy",
  "cloudy": "mdi:weather-cloudy", "rainy": "mdi:weather-rainy", "pouring": "mdi:weather-pouring", "snowy": "mdi:weather-snowy",
  "fog": "mdi:weather-fog", "windy": "mdi:weather-windy", "windy-variant": "mdi:weather-windy", "lightning": "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy", "hail": "mdi:weather-hail", "snowy-rainy": "mdi:weather-snowy-rainy", "exceptional": "mdi:alert" };
class JmaCalendarCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; this._loading = false; this._wx = {}; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, title: "Agenda", ...c }; this._cals = c.entities || (c.entity ? [c.entity] : []); this._weather = c.weather_entity || null; }
  getCardSize() { return 14; }
  static getStubConfig() { return { title: "Agenda", entities: ["calendar.example"] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { const first = !this._hass; this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); if (first) { this._cur = new Date(); this._cur.setDate(1); this._fetch(); this._fetchWeather(); } }
  _dkey(d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  _palette(i) { return ["#e98aa8", "#6aa3ff", "#4cc38a", "#f5b461", "#b794f6", "#4fd1c5"][i % 6]; }
  _calName(eid) { const s = this._hass && this._hass.states[eid]; return (this._config.names && this._config.names[eid]) || (s && s.attributes.friendly_name) || eid.split(".")[1]; }
  _gridRange() {
    const f = new Date(this._cur.getFullYear(), this._cur.getMonth(), 1);
    const off = (f.getDay() + 6) % 7; const start = new Date(f); start.setDate(f.getDate() - off); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 42); return { start, end };
  }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};--cal-sheet:#fbf8f1;--cal-line:rgba(60,48,30,.1);}
      :host(.dark){--cal-sheet:#1d1d20;--cal-line:rgba(255,255,255,.1);}
      .cal{display:flex;flex-direction:column;height:100%;min-height:80vh;gap:9px;padding:4px 2px;}
      .calhead{display:flex;align-items:center;gap:9px;}
      .mtitle{font-weight:800;font-size:1.2rem;text-transform:capitalize;flex:1;letter-spacing:-.2px;}
      .cbtn{height:34px;min-width:34px;border-radius:11px;border:none;cursor:pointer;background:var(--jma-surf3);color:var(--jma-text);display:flex;align-items:center;justify-content:center;transition:transform .08s;}
      .cbtn:active{transform:scale(.92);}.cbtn ha-icon{--mdc-icon-size:21px;}
      .cbtn.today{padding:0 13px;font-weight:800;font-size:.76rem;}
      .callegend{display:flex;gap:12px;flex-wrap:wrap;}
      .lg{display:flex;align-items:center;gap:5px;font-size:.66rem;font-weight:700;opacity:.7;}
      .lg .dot{width:9px;height:9px;border-radius:3px;}
      .cweekdays{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
      .cwd{text-align:center;font-size:.62rem;font-weight:800;opacity:.45;text-transform:uppercase;letter-spacing:.6px;}
      .cgrid{display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:1fr;gap:5px;flex:1;min-height:0;}
      .cell{background:var(--jma-surf2);border-radius:11px;padding:5px 6px;display:flex;flex-direction:column;gap:2px;cursor:pointer;overflow:hidden;border:1.5px solid transparent;transition:border-color .2s,background .2s;min-height:0;}
      .cell:hover{border-color:var(--jma-surf4,rgba(0,0,0,.08));}
      .cell.out{opacity:.38;}
      .cell.today{border-color:var(--jma-rose);background:var(--jma-surf3);}
      .cell.we .cdnum{opacity:.55;}
      .cellhd{display:flex;align-items:center;justify-content:space-between;gap:3px;}
      .cdnum{font-weight:800;font-size:.84rem;line-height:1.1;}
      .cell.today .cdnum{color:var(--jma-rose);}
      .cwx{display:flex;align-items:center;gap:1px;font-size:.6rem;opacity:.75;font-weight:800;flex:none;}
      .cwx ha-icon{--mdc-icon-size:15px;}
      .cev{font-size:.61rem;font-weight:700;border-radius:5px;padding:1px 5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.45;}
      .cmore{font-size:.57rem;opacity:.55;font-weight:800;padding-left:2px;}
      .calpop{position:fixed;inset:0;z-index:1100;background:rgba(20,16,10,.42);display:none;align-items:center;justify-content:center;backdrop-filter:blur(3px);}
      .calpop.on{display:flex;}
      .calsheet{background:var(--cal-sheet);border:1px solid var(--cal-line);border-radius:22px;max-width:420px;width:calc(100% - 34px);max-height:72vh;overflow:auto;padding:18px;box-shadow:0 24px 70px rgba(0,0,0,.45);}
      .cph{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
      .cph .d{font-weight:800;font-size:1.05rem;text-transform:capitalize;}
      .cpx{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;background:var(--jma-surf3);color:var(--jma-text);font-size:1rem;}
      .cpev{display:flex;gap:9px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--cal-line);}
      .cpev:first-of-type{border-top:none;}
      .cpbar{width:4px;align-self:stretch;border-radius:3px;flex:none;min-height:30px;}
      .cpt{font-size:.72rem;font-weight:800;opacity:.7;min-width:42px;font-variant-numeric:tabular-nums;}
      .cps{font-size:.86rem;font-weight:600;flex:1;}
      .cpcal{font-size:.62rem;opacity:.5;font-weight:700;}
      .cpempty{opacity:.5;font-size:.82rem;text-align:center;padding:20px 0;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;height:100%;"><div class="tile flat" style="height:100%;"><div class="content" style="height:100%;">
        <div class="cal">
          <div class="calhead">
            <button class="cbtn" id="prev" aria-label="Mois précédent"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
            <div class="mtitle" id="mtitle">—</div>
            <button class="cbtn today" id="today">Aujourd'hui</button>
            <button class="cbtn" id="next" aria-label="Mois suivant"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
          </div>
          <div class="callegend" id="legend"></div>
          <div class="cweekdays">${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => `<div class="cwd">${d}</div>`).join("")}</div>
          <div class="cgrid" id="cgrid"></div>
        </div>
      </div></div>
      <div class="calpop" id="calpop"><div class="calsheet" id="calsheet"></div></div></ha-card>`;
    this.shadowRoot.getElementById("prev").addEventListener("click", () => this._shift(-1));
    this.shadowRoot.getElementById("next").addEventListener("click", () => this._shift(1));
    this.shadowRoot.getElementById("today").addEventListener("click", () => { this._cur = new Date(); this._cur.setDate(1); this._fetch(); });
    const pop = this.shadowRoot.getElementById("calpop");
    pop.addEventListener("click", (e) => { if (e.target === pop) pop.classList.remove("on"); });
  }
  _shift(n) { this._cur = new Date(this._cur.getFullYear(), this._cur.getMonth() + n, 1); this._fetch(); }
  async _fetch() {
    if (!this._cals.length) { this._render(); return; }
    this._loading = true; const { start, end } = this._gridRange(); const iso = (d) => d.toISOString();
    const evs = [];
    try {
      for (let i = 0; i < this._cals.length; i++) {
        const cal = this._cals[i];
        const r = await this._hass.callApi("GET", `calendars/${cal}?start=${encodeURIComponent(iso(start))}&end=${encodeURIComponent(iso(end))}`);
        (r || []).forEach((e) => { const s = e.start && (e.start.dateTime || e.start.date); const d = new Date(s); if (!isNaN(d)) evs.push({ d, allday: !(e.start && e.start.dateTime), summary: e.summary || e.message || "(sans titre)", ci: i }); });
      }
    } catch (e) {}
    this._loading = false; this._events = evs; this._render();
  }
  async _fetchWeather() {
    if (!this._weather) return;
    try {
      const r = await this._hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "daily" }, target: { entity_id: this._weather }, return_response: true });
      const fc = (r && r.response && r.response[this._weather] && r.response[this._weather].forecast) || [];
      this._wx = {}; fc.forEach((f) => { const d = new Date(f.datetime); this._wx[this._dkey(d)] = { hi: Math.round(f.temperature), cond: f.condition }; });
      this._render();
    } catch (e) {}
  }
  _render() {
    if (!this._built) return;
    this.shadowRoot.getElementById("mtitle").textContent = this._cur.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const lg = this.shadowRoot.getElementById("legend");
    lg.innerHTML = this._cals.map((e, i) => `<div class="lg"><span class="dot" style="background:${this._palette(i)}"></span>${this._calName(e)}</div>`).join("");
    const grid = this.shadowRoot.getElementById("cgrid"); grid.innerHTML = "";
    const { start } = this._gridRange(); const curM = this._cur.getMonth();
    const tk = this._dkey(new Date());
    const byDay = {}; (this._events || []).forEach((ev) => { const k = this._dkey(ev.d); (byDay[k] = byDay[k] || []).push(ev); });
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const k = this._dkey(d);
      const we = d.getDay() === 0 || d.getDay() === 6;
      const cell = document.createElement("div");
      cell.className = "cell" + (d.getMonth() !== curM ? " out" : "") + (k === tk ? " today" : "") + (we ? " we" : "");
      const evs = (byDay[k] || []).sort((a, b) => a.d - b.d);
      const wx = this._wx && this._wx[k];
      let html = `<div class="cellhd"><span class="cdnum">${d.getDate()}</span>` + (wx ? `<span class="cwx"><ha-icon icon="${JMA_WICON[wx.cond] || "mdi:weather-cloudy"}"></ha-icon>${wx.hi}°</span>` : "") + `</div>`;
      evs.slice(0, 3).forEach((ev) => { const t = ev.allday ? "" : ("" + ev.d.getHours()).padStart(2, "0") + ":" + ("" + ev.d.getMinutes()).padStart(2, "0") + " "; html += `<div class="cev" style="background:${this._palette(ev.ci)}">${t}${ev.summary}</div>`; });
      if (evs.length > 3) html += `<div class="cmore">+${evs.length - 3}</div>`;
      cell.innerHTML = html;
      cell.addEventListener("click", () => this._openDay(d, evs));
      grid.appendChild(cell);
    }
  }
  _openDay(d, evs) {
    const sheet = this.shadowRoot.getElementById("calsheet");
    const dn = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    let h = `<div class="cph"><div class="d">${dn}</div><button class="cpx" id="cpx">✕</button></div>`;
    if (!evs.length) h += `<div class="cpempty">Rien de prévu 🎉</div>`;
    else evs.forEach((ev) => {
      const t = ev.allday ? "Journée" : ("" + ev.d.getHours()).padStart(2, "0") + ":" + ("" + ev.d.getMinutes()).padStart(2, "0");
      h += `<div class="cpev"><div class="cpbar" style="background:${this._palette(ev.ci)}"></div><div class="cpt">${t}</div><div class="cps">${ev.summary}<div class="cpcal">${this._calName(this._cals[ev.ci])}</div></div></div>`;
    });
    sheet.innerHTML = h;
    sheet.querySelector("#cpx").addEventListener("click", () => this.shadowRoot.getElementById("calpop").classList.remove("on"));
    this.shadowRoot.getElementById("calpop").classList.add("on");
  }
}
jmaDef("jma-calendar-card", JmaCalendarCard);
// =============================================================================
//  🌤️ MÉTÉO HERO — header météo large (actuel + prévisions, dégradé selon le temps)
// =============================================================================
const JMA_WFR = { "sunny": "Ensoleillé", "clear-night": "Nuit claire", "partlycloudy": "Partiellement nuageux", "cloudy": "Nuageux",
  "rainy": "Pluie", "pouring": "Fortes pluies", "snowy": "Neige", "snowy-rainy": "Pluie & neige", "fog": "Brouillard",
  "windy": "Venteux", "windy-variant": "Venteux", "lightning": "Orage", "lightning-rainy": "Orage & pluie", "hail": "Grêle", "exceptional": "Exceptionnel" };
const JMA_WGRAD = { "sunny": "linear-gradient(135deg,#f7b955,#ef8a4c)", "clear-night": "linear-gradient(135deg,#33406b,#1a2138)",
  "partlycloudy": "linear-gradient(135deg,#7ba6d8,#5777aa)", "cloudy": "linear-gradient(135deg,#94a1b2,#6a7682)",
  "fog": "linear-gradient(135deg,#9aa3ad,#6f7882)", "rainy": "linear-gradient(135deg,#5e83b8,#37527a)",
  "pouring": "linear-gradient(135deg,#4f6f9e,#2c3f5e)", "snowy": "linear-gradient(135deg,#bcccdc,#8fa6bd)",
  "snowy-rainy": "linear-gradient(135deg,#8aa0bb,#5d7390)", "lightning": "linear-gradient(135deg,#4c4368,#272140)",
  "lightning-rainy": "linear-gradient(135deg,#4a4566,#2a2a44)", "hail": "linear-gradient(135deg,#9fb3c8,#6b8299)", "exceptional": "linear-gradient(135deg,#b06a6a,#7d3a3a)" };
class JmaWeatherHeroCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; this._fc = []; }
  setConfig(c) { if (!c.entity) throw new Error("météo : 'entity' requis"); this._config = { color: ROSE, accent: BEIGE, dark: DARK, days: 6, ...c }; }
  getCardSize() { return 4; }
  static getStubConfig() { return { entity: "weather.home" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { const first = !this._hass; this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (first || this._stale()) this._fetch(); }
  _stale() { return !this._last || Date.now() - this._last > 600000; }
  get _s() { return this._hass.states[this._config.entity]; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      .hero{position:relative;border-radius:24px;overflow:hidden;color:#fff;padding:22px 24px;display:flex;flex-direction:column;gap:18px;
        box-shadow:0 14px 38px rgba(40,40,60,.18);transition:background .6s;min-height:0;}
      .hero::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 80% 0%,rgba(255,255,255,.18),transparent 60%);pointer-events:none;}
      .htop{display:flex;align-items:center;gap:20px;position:relative;z-index:1;}
      .hicon{--mdc-icon-size:78px;filter:drop-shadow(0 5px 12px rgba(0,0,0,.28));flex:none;}
      .htemp{font-size:3.6rem;font-weight:300;line-height:.85;letter-spacing:-2px;font-variant-numeric:tabular-nums;}
      .hinfo{flex:1;min-width:0;}
      .hcond{font-size:1.1rem;font-weight:800;}
      .hloc{font-size:.82rem;opacity:.88;font-weight:600;margin-top:1px;}
      .hmeta{display:flex;gap:15px;flex-wrap:wrap;font-size:.78rem;font-weight:700;opacity:.95;margin-top:8px;}
      .hmeta span{display:flex;align-items:center;gap:4px;}.hmeta ha-icon{--mdc-icon-size:16px;opacity:.85;}
      .hfc{display:flex;gap:8px;position:relative;z-index:1;}
      .fcd{flex:1;background:rgba(255,255,255,.17);border:1px solid rgba(255,255,255,.12);border-radius:15px;padding:10px 5px;display:flex;flex-direction:column;align-items:center;gap:5px;}
      .fcd .d{font-size:.65rem;font-weight:800;text-transform:uppercase;opacity:.92;letter-spacing:.3px;}
      .fcd ha-icon{--mdc-icon-size:26px;}
      .fcd .hi{font-size:.84rem;font-weight:800;}.fcd .lo{font-size:.74rem;opacity:.72;font-weight:700;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="hero" id="hero">
        <div class="htop">
          <ha-icon class="hicon" id="hic" icon="mdi:weather-partly-cloudy"></ha-icon>
          <div class="htemp" id="htemp">—</div>
          <div class="hinfo"><div class="hcond" id="hcond">—</div><div class="hloc" id="hloc"></div>
            <div class="hmeta" id="hmeta"></div></div>
        </div>
        <div class="hfc" id="hfc"></div>
      </div></ha-card>`;
  }
  async _fetch() {
    if (!this._hass) return; this._last = Date.now();
    try {
      const e = this._config.entity;
      const r = await this._hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "daily" }, target: { entity_id: e }, return_response: true });
      this._fc = (r && r.response && r.response[e] && r.response[e].forecast) || [];
      this._renderFc();
    } catch (e) {}
  }
  _update() {
    const s = this._s; if (!s) return; const a = s.attributes;
    const $ = (id) => this.shadowRoot.getElementById(id);
    $("hic").setAttribute("icon", JMA_WICON[s.state] || "mdi:weather-cloudy");
    $("htemp").textContent = a.temperature != null ? Math.round(a.temperature) + "°" : "—";
    $("hcond").textContent = JMA_WFR[s.state] || s.state;
    $("hloc").textContent = this._config.name || a.friendly_name || "";
    const meta = [];
    if (a.humidity != null) meta.push(`<span><ha-icon icon="mdi:water-percent"></ha-icon>${a.humidity}%</span>`);
    if (a.wind_speed != null) meta.push(`<span><ha-icon icon="mdi:weather-windy"></ha-icon>${Math.round(a.wind_speed)} ${a.wind_speed_unit || "km/h"}</span>`);
    if (a.uv_index != null) meta.push(`<span><ha-icon icon="mdi:weather-sunny-alert"></ha-icon>UV ${Math.round(a.uv_index)}</span>`);
    if (a.pressure != null) meta.push(`<span><ha-icon icon="mdi:gauge"></ha-icon>${Math.round(a.pressure)} ${a.pressure_unit || ""}</span>`);
    $("hmeta").innerHTML = meta.join("");
    const grad = JMA_WGRAD[s.state] || JMA_WGRAD.partlycloudy;
    $("hero").style.background = grad;
  }
  _renderFc() {
    const host = this.shadowRoot.getElementById("hfc"); if (!host) return;
    const dn = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const days = this._fc.slice(0, this._config.days || 6);
    host.innerHTML = days.map((f) => {
      const d = new Date(f.datetime);
      const hi = f.temperature != null ? Math.round(f.temperature) + "°" : "";
      const lo = f.templow != null ? Math.round(f.templow) + "°" : "";
      return `<div class="fcd"><div class="d">${dn[d.getDay()]}</div><ha-icon icon="${JMA_WICON[f.condition] || "mdi:weather-cloudy"}"></ha-icon><div class="hi">${hi}</div><div class="lo">${lo}</div></div>`;
    }).join("");
  }
}
jmaDef("jma-weather-hero-card", JmaWeatherHeroCard);

// =============================================================================
//  ⚡ ÉNERGIE — conso & production (bleu EDF / rose solaire dominant)
// =============================================================================
class JmaEnergyCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) {
    if (!c.production_entity && !c.grid_entity) throw new Error("énergie : production_entity et/ou grid_entity requis");
    this._config = { color: ROSE, accent: BEIGE, dark: DARK, grid_color: "#3b9bff", title: "Énergie", spark_hours: 12, ...c };
  }
  getCardSize() { return 2; }
  static getStubConfig() { return { title: "Énergie", production_entity: "sensor.solar_power", grid_entity: "sensor.grid_power" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._popup) this._popup.hass = h; }
  _num(key) { const e = this._config[key]; const s = e && this._hass.states[e]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};--edf:${c.grid_color};}
        .big{font-weight:800;font-size:1.15rem;letter-spacing:-.5px;flex:none;}
        .ebar{display:flex;height:14px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.12);}
        .ebar .s{background:var(--jma-rose);transition:width .4s;} .ebar .g{background:var(--edf);transition:width .4s;}
        .leg{display:flex;justify-content:space-between;font-size:.72rem;opacity:.9;}
        .leg b{font-weight:800;}
        .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle;}
        .ecap{display:flex;justify-content:space-between;font-size:.64rem;font-weight:600;opacity:.55;margin-top:2px;}
        .eday{margin-top:9px;display:flex;flex-direction:column;gap:6px;}
        .eday[hidden]{display:none;}
        .edhead{display:flex;justify-content:space-between;font-size:.72rem;font-weight:800;opacity:.78;}
        .daybar{height:16px;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat" id="tile"><div class="content">
        <div class="top"><div class="badge"><ha-icon id="ic" icon="mdi:flash"></ha-icon></div>
          <div class="meta"><div class="name">${c.title}</div><div class="sub" id="sub"></div></div>
          <div class="big" id="pc">—</div></div>
        <div class="ebar"><div class="s" id="bs"></div><div class="g" id="bg"></div></div>
        <div class="leg">
          <span><span class="dot" style="background:var(--jma-rose)"></span>Solaire <b id="sol">—</b></span>
          <span><span class="dot" style="background:var(--edf)"></span>EDF <b id="grd">—</b></span>
        </div>
        <div class="eday" id="eday" hidden>
          <div class="edhead"><span>📅 Aujourd'hui</span><span id="edtot">—</span></div>
          <div class="ebar daybar"><div class="s" id="dbs"></div><div class="g" id="dbg"></div></div>
          <div class="leg">
            <span><span class="dot" style="background:var(--jma-rose)"></span>Solaire <b id="dsol">—</b></span>
            <span><span class="dot" style="background:var(--edf)"></span>Réseau EDF <b id="dgrd">—</b></span>
          </div>
        </div>
        <div class="ecap"><span>Puissance instantanée</span><span id="ewin"></span></div>
        <div class="spark" id="espk" style="height:48px;"></div>
      </div></div></ha-card>`;
    this.shadowRoot.getElementById("tile").addEventListener("click", () => this._openPopup());
  }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = { ...this._config, kind: "energy", entity: this._config.production_entity || this._config.grid_entity };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _fmtW(w) { w = Math.round(w); return w.toLocaleString("fr-FR").replace(/ | /g, " ") + " W"; }
  _update() {
    const prod = Math.max(0, this._num("production_entity") || 0);
    const grid = Math.max(0, this._num("grid_entity") || 0);
    let cons = this._num("consumption_entity"); if (cons == null) cons = grid + prod; cons = Math.max(cons, 1);
    const solarUsed = Math.max(0, cons - grid);
    const solarDom = solarUsed >= grid;
    const accent = solarDom ? this._config.color : this._config.grid_color;
    const sShare = Math.round((solarUsed / cons) * 100);
    this.shadowRoot.getElementById("bs").style.width = sShare + "%";
    this.shadowRoot.getElementById("bg").style.width = (100 - sShare) + "%";
    this.shadowRoot.getElementById("pc").textContent = this._fmtW(cons);
    this.shadowRoot.getElementById("sol").textContent = this._fmtW(prod);
    this.shadowRoot.getElementById("grd").textContent = this._fmtW(grid);
    this.shadowRoot.getElementById("sub").textContent = "En ce moment · " + (solarDom ? "solaire dominant" : "réseau EDF dominant");
    const ic = this.shadowRoot.getElementById("ic");
    ic.setAttribute("icon", solarDom ? "mdi:solar-power" : "mdi:transmission-tower");
    ic.style.color = accent;
    this.shadowRoot.querySelector(".badge").style.background = accent + "33";
    const win = this._config.spark_hours || 12;
    const ew = this.shadowRoot.getElementById("ewin");
    if (ew) ew.textContent = win >= 24 ? "sur " + Math.round(win / 24) + " j" : "sur " + win + " h";
    if ((this._config.production_entity || this._config.grid_entity) && (!this._sparkAt || Date.now() - this._sparkAt > 300000)) {
      this._sparkAt = Date.now();
      jmaSparklineMulti(this.shadowRoot.getElementById("espk"), this._hass, [
        { entity: this._config.production_entity, color: this._config.color, fill: true },
        { entity: this._config.grid_entity, color: this._config.grid_color },
      ], win);
    }
    // totaux du jour (kWh) + barre comparative
    const eday = this.shadowRoot.getElementById("eday");
    if (eday) {
      const pT = this._num("production_today_entity"), gT = this._num("grid_today_entity");
      if (!this._config.compact && (pT != null || gT != null)) {
        eday.hidden = false;
        const sp = Math.max(0, pT || 0), gr = Math.max(0, gT || 0), tot = Math.max(sp + gr, 0.001);
        const k = (v) => (Math.round(v * 10) / 10).toString().replace(".", ",") + " kWh";
        this.shadowRoot.getElementById("dbs").style.width = (sp / tot * 100) + "%";
        this.shadowRoot.getElementById("dbg").style.width = (gr / tot * 100) + "%";
        this.shadowRoot.getElementById("dsol").textContent = pT != null ? k(sp) : "—";
        this.shadowRoot.getElementById("dgrd").textContent = gT != null ? k(gr) : "—";
        this.shadowRoot.getElementById("edtot").textContent = "Total " + k(sp + gr);
      } else eday.hidden = true;
    }
  }
}
jmaDef("jma-energy-card", JmaEnergyCard);

// =============================================================================
//  🌤️ MÉTÉO
// =============================================================================
const WEATHER_ICON = {
  "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", fog: "mdi:weather-fog",
  hail: "mdi:weather-hail", lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy",
  snowy: "mdi:weather-snowy", "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny",
  windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant", exceptional: "mdi:weather-cloudy-alert",
};
const WEATHER_FR = {
  "clear-night": "Nuit claire", cloudy: "Nuageux", fog: "Brouillard", hail: "Grêle", lightning: "Orage",
  "lightning-rainy": "Orage pluvieux", partlycloudy: "Partiellement nuageux", pouring: "Fortes averses",
  rainy: "Pluvieux", snowy: "Neige", "snowy-rainy": "Neige fondue", sunny: "Ensoleillé",
  windy: "Venteux", "windy-variant": "Venteux", exceptional: "Exceptionnel",
};
class JmaWeatherCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, show_forecast: true, days: 5, ...c }; if (!c.entity) throw new Error("météo : 'entity' requis"); }
  getCardSize() { return 2; }
  static getStubConfig() { return { entity: "weather.home" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  get _s() { return this._hass.states[this._config.entity]; }
  set hass(h) { const first = !this._hass; this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._config.show_forecast && (first || this._fcStale())) this._loadForecast(); }
  _fcStale() { return !this._fcAt || Date.now() - this._fcAt > 1800000; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .top{align-items:center;}
        .wicon{width:46px;height:46px;flex:none;display:flex;align-items:center;justify-content:center;}
        .wicon ha-icon{--mdc-icon-size:40px;color:var(--jma-beige);}
        .wtemp{font-weight:800;font-size:1.7rem;letter-spacing:-1px;flex:none;}
        .fc{display:flex;justify-content:space-between;gap:4px;margin-top:2px;}
        .fcd{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;}
        .fcd .d{font-size:.62rem;opacity:.6;text-transform:capitalize;}
        .fcd ha-icon{--mdc-icon-size:20px;color:var(--jma-beige);}
        .fcd .mx{font-size:.72rem;font-weight:700;} .fcd .mn{font-size:.66rem;opacity:.55;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat" id="tile"><div class="content">
        <div class="top"><div class="wicon"><ha-icon id="ic"></ha-icon></div>
          <div class="meta"><div class="name" id="cond"></div><div class="sub" id="sub"></div></div>
          <div class="wtemp" id="temp">—</div></div>
        <div class="fc" id="fc"></div>
      </div></div></ha-card>`;
    this.shadowRoot.getElementById("tile").addEventListener("click", () =>
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: this._config.entity } })));
  }
  _update() {
    const s = this._s; if (!s) return;
    const a = s.attributes;
    this.shadowRoot.getElementById("ic").setAttribute("icon", WEATHER_ICON[s.state] || "mdi:weather-cloudy");
    this.shadowRoot.getElementById("cond").textContent = this._config.name || WEATHER_FR[s.state] || s.state;
    this.shadowRoot.getElementById("temp").textContent = a.temperature != null ? Math.round(a.temperature) + "°" : "—";
    const bits = [];
    if (a.humidity != null) bits.push("💧 " + a.humidity + "%");
    if (a.wind_speed != null) bits.push("💨 " + Math.round(a.wind_speed) + " " + (a.wind_speed_unit || "km/h"));
    if (a.uv_index != null) bits.push("☀️ UV " + a.uv_index);
    this.shadowRoot.getElementById("sub").textContent = bits.join(" · ");
  }
  async _loadForecast() {
    this._fcAt = Date.now();
    try {
      const r = await this._hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts",
        service_data: { type: "daily" }, target: { entity_id: this._config.entity }, return_response: true });
      const resp = r && r.response && r.response[this._config.entity];
      this._renderForecast((resp && resp.forecast) || []);
    } catch (e) { this._renderForecast([]); }
  }
  _renderForecast(fc) {
    const host = this.shadowRoot.getElementById("fc"); if (!host) return;
    host.innerHTML = "";
    const dn = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
    fc.slice(0, this._config.days || 5).forEach((f) => {
      const d = new Date(f.datetime);
      const el = document.createElement("div"); el.className = "fcd";
      el.innerHTML = `<span class="d">${isNaN(d) ? "" : dn[d.getDay()]}</span>` +
        `<ha-icon icon="${WEATHER_ICON[f.condition] || "mdi:weather-cloudy"}"></ha-icon>` +
        `<span class="mx">${f.temperature != null ? Math.round(f.temperature) + "°" : ""}</span>` +
        `<span class="mn">${f.templow != null ? Math.round(f.templow) + "°" : ""}</span>`;
      host.appendChild(el);
    });
  }
}
jmaDef("jma-weather-card", JmaWeatherCard);

// =============================================================================
//  🔢 CAPTEUR — valeur + mini-graphe sur la tuile
// =============================================================================
const DC_ICON = {
  temperature: "mdi:thermometer", humidity: "mdi:water-percent", power: "mdi:flash", energy: "mdi:lightning-bolt",
  battery: "mdi:battery", pressure: "mdi:gauge", illuminance: "mdi:brightness-5", voltage: "mdi:sine-wave",
  current: "mdi:current-ac", co2: "mdi:molecule-co2", pm25: "mdi:air-filter", carbon_dioxide: "mdi:molecule-co2",
  signal_strength: "mdi:wifi", distance: "mdi:map-marker-distance", speed: "mdi:speedometer", gas: "mdi:meter-gas",
};
class JmaSensorCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { if (!c.entity) throw new Error("capteur : 'entity' requis"); this._config = { color: ROSE, accent: BEIGE, dark: DARK, hours: 24, graph: true, ...c }; }
  getCardSize() { return 1; }
  static getStubConfig() { return { entity: "sensor.example" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  get _s() { return this._hass.states[this._config.entity]; }
  set hass(h) { const first = !this._hass; this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._config.graph && (first || this._gStale())) this._spark(); }
  _gStale() { return !this._gAt || Date.now() - this._gAt > 300000; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .val{font-weight:800;font-size:1.35rem;letter-spacing:-1px;flex:none;}
        .val small{font-size:.7rem;font-weight:600;opacity:.6;margin-left:1px;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat" id="tile"><div class="content">
        <div class="top"><div class="badge"><ha-icon id="ic"></ha-icon></div>
          <div class="meta"><div class="name" id="nm"></div><div class="sub" id="sub"></div></div>
          <div class="val" id="val">—</div></div>
        <div class="spark" id="spk"></div>
      </div></div></ha-card>`;
    this.shadowRoot.getElementById("tile").addEventListener("click", () =>
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: this._config.entity } })));
  }
  _update() {
    const s = this._s; if (!s) { this.shadowRoot.getElementById("nm").textContent = this._config.entity + " (indispo)"; return; }
    const a = s.attributes;
    const v = parseFloat(s.state);
    const num = !isNaN(v);
    this.shadowRoot.getElementById("ic").setAttribute("icon", this._config.icon || a.icon || DC_ICON[a.device_class] || "mdi:gauge");
    this.shadowRoot.getElementById("nm").textContent = this._config.name || a.friendly_name || this._config.entity;
    this.shadowRoot.getElementById("val").innerHTML = (num ? Math.round(v * 10) / 10 : s.state) + (a.unit_of_measurement ? `<small>${a.unit_of_measurement}</small>` : "");
    this.shadowRoot.getElementById("sub").textContent = a.device_class ? a.device_class : (this._config.graph && num ? this._config.hours + " h" : "");
    const spk = this.shadowRoot.getElementById("spk");
    spk.style.display = (this._config.graph && num) ? "" : "none";
  }
  _spark() { this._gAt = Date.now(); jmaSparkline(this.shadowRoot.getElementById("spk"), this._hass, this._config.entity, this._config.hours, this._config.color); }
}
jmaDef("jma-sensor-card", JmaSensorCard);

// =============================================================================
//  🏠 PIÈCE — regroupe plusieurs entités, chacune ouvre son pop-up
// =============================================================================
class JmaRoomCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) {
    this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Pièce", icon: "mdi:sofa", ...c };
    const ents = c.entities || [];
    const pick = (re) => ents.filter((e) => re.test(e));
    this._lights = c.lights || pick(/^(light|switch|fan|input_boolean)\./);
    this._cover = c.cover || ents.find((e) => e.startsWith("cover."));
    this._climate = c.climate || ents.find((e) => e.startsWith("climate."));
    this._media = c.media || ents.find((e) => e.startsWith("media_player."));
    this._scenes = c.scenes || pick(/^(scene|script)\./);
    const used = new Set([...this._lights, this._cover, this._climate, this._media, ...this._scenes].filter(Boolean));
    this._extra = ents.filter((e) => !used.has(e));
    this._badges = (c.badges || []).slice();
    this._built = false;
  }
  getCardSize() { return 3; }
  static getStubConfig() { return { name: "Salon", icon: "mdi:sofa", temperature_entity: "sensor.salon_temperature", entities: ["light.salon", "cover.volet_salon", "climate.salon"] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._popup) this._popup.hass = h; }
  _st(e) { return e && this._hass ? this._hass.states[e] : null; }
  _call(d, s, data) { if (this._hass) this._hass.callService(d, s, data); }
  _short(eid) { const s = this._st(eid); return (this._config.names && this._config.names[eid]) || ((s && s.attributes.friendly_name) || eid).replace(this._config.name + " ", "").split(" ").slice(-2).join(" "); }
  _openPopup(entity, kind) {
    if (this._popup || !entity) return;
    const p = document.createElement("jma-card-popup");
    p.config = { entity, kind, color: this._config.color, accent: this._config.accent, dark: this._config.dark, theme: this._config.theme };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _openScenes() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = { kind: "scenes", scenes: this._scenes, names: this._config.names, name: this._config.name,
      color: this._config.color, accent: this._config.accent, dark: this._config.dark, theme: this._config.theme };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .tile.room{flex-direction:column;align-items:stretch;gap:9px;padding:12px;}
        .rhead{display:flex;align-items:center;gap:10px;cursor:pointer;}
        .meta{flex:0 1 auto;min-width:0;}
        .badge.rbig{width:36px;height:36px;}.badge.rbig ha-icon{--mdc-icon-size:21px;}
        .tile.alive .badge.rbig{background:var(--jma-grad);}.tile.alive .badge.rbig ha-icon{color:var(--jma-dark);}
        .name{font-size:.96rem;}
        .ramb{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto;}
        .pill2{display:flex;align-items:center;gap:4px;padding:4px 9px;border-radius:10px;background:var(--jma-surf3);font-size:.72rem;font-weight:700;}
        .pill2 ha-icon{--mdc-icon-size:14px;color:var(--jma-icon);}
        .pill2.warn ha-icon{color:#e9871f;}.pill2.cold ha-icon{color:var(--jma-blue);}
        .cgrid{display:flex;flex-wrap:wrap;gap:6px;}
        .c{flex:1 1 132px;min-width:116px;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:13px;border:none;
          cursor:pointer;background:var(--jma-surf3);color:var(--jma-text);transition:background .25s,transform .08s;}
        .c:active{transform:scale(.95);}
        .c.on{background:var(--jma-grad);color:var(--jma-dark);}
        .c>ha-icon{--mdc-icon-size:20px;flex:none;}
        .cl{display:flex;flex-direction:column;min-width:0;line-height:1.12;text-align:left;}
        .cn{font-size:.79rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .cv{font-size:.65rem;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .c.glow.on>ha-icon{animation:jma-glow 2.6s ease-in-out infinite;}
        @keyframes jma-glow{0%,100%{opacity:.85;}50%{opacity:1;filter:drop-shadow(0 0 6px rgba(255,255,255,.9));}}
        .tile.room.compact{padding:9px 11px;gap:0;}
        .tile.room.compact .content{gap:5px !important;}
        .tile.room.compact .badge.rbig{width:32px;height:32px;}.tile.room.compact .badge.rbig ha-icon{--mdc-icon-size:19px;}
        .tile.room.compact .name{font-size:.9rem;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile room${c.compact ? " compact" : ""}" id="tile"><div class="content" style="gap:9px;">
        <div class="rhead" id="rhead"><div class="badge rbig"><ha-icon icon="${c.icon}"></ha-icon></div>
          <div class="meta"><div class="name">${c.name}</div><div class="sub" id="sum"></div></div>
          <div class="ramb" id="amb"></div></div>
        <div class="cgrid" id="cgrid"></div>
      </div></div></ha-card>`;
    const grid = this.shadowRoot.getElementById("cgrid");
    this._chips = [];
    const add = (role, entity, icon, label, onTap, extra) => {
      const b = document.createElement("button"); b.className = "c" + (extra ? " " + extra : ""); b.tabIndex = 0;
      b.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span class="cl"><b class="cn">${label}</b><small class="cv"></small></span>`;
      b.addEventListener("click", onTap); grid.appendChild(b);
      this._chips.push({ el: b, role, entity, val: b.querySelector(".cv"), nm: b.querySelector(".cn"), ic: b.querySelector("ha-icon") });
    };
    this.shadowRoot.getElementById("rhead").addEventListener("click", () => this._openPopup(this._climate || this._media || this._lights[0]));
    if (this._config.compact) { const g = this.shadowRoot.getElementById("cgrid"); if (g) g.style.display = "none"; }
    else {
    if (this._lights.length) add("lights", null, "mdi:lightbulb-group", "Lumières", () => {
      const anyOn = this._lights.some((e) => { const s = this._st(e); return s && s.state === "on"; });
      this._call("homeassistant", anyOn ? "turn_off" : "turn_on", { entity_id: this._lights });
    }, "glow");
    if (this._climate) add("climate", this._climate, "mdi:thermostat", "Climat", () => this._openPopup(this._climate));
    if (this._cover) add("cover", this._cover, "mdi:window-shutter", "Volet", () => this._openPopup(this._cover));
    if (this._media) add("media", this._media, "mdi:music", "Média", () => this._openPopup(this._media));
    if (this._scenes.length) add("scenes", null, "mdi:palette", "Ambiances", () => this._openScenes());
    this._extra.forEach((eid) => {
      const s = this._st(eid), a = s ? s.attributes : {};
      const icon = (a && a.icon) || DC_ICON[a && a.device_class] || { light: "mdi:lightbulb", switch: "mdi:power-socket-eu", sensor: "mdi:eye", binary_sensor: "mdi:checkbox-blank-circle", lock: "mdi:lock", fan: "mdi:fan" }[eid.split(".")[0]] || "mdi:circle";
      add("entity", eid, icon, this._short(eid), () => this._openPopup(eid));
    });
    }
  }
  _badgeEl(icon, txt, cls) { return `<div class="pill2 ${cls || ""}"><ha-icon icon="${icon}"></ha-icon>${txt}</div>`; }
  _update() {
    // badges d'ambiance
    const amb = [];
    const tS = this._st(this._config.temperature_entity);
    if (tS && !isNaN(parseFloat(tS.state))) { const t = parseFloat(tS.state); amb.push(this._badgeEl("mdi:thermometer", Math.round(t * 10) / 10 + "°", t <= 18 ? "cold" : t >= 25 ? "warn" : "")); }
    const hS = this._st(this._config.humidity_entity);
    if (hS && !isNaN(parseFloat(hS.state))) amb.push(this._badgeEl("mdi:water-percent", Math.round(parseFloat(hS.state)) + "%"));
    const pS = this._st(this._config.presence_entity);
    if (pS) { const n = parseFloat(pS.state); const present = isNaN(n) ? pS.state === "on" : n > 0; amb.push(this._badgeEl(present ? "mdi:account" : "mdi:account-outline", isNaN(n) ? (present ? "Présent" : "Vide") : n + " pers.")); }
    this._badges.forEach((eid) => { const s = this._st(eid); if (s) amb.push(this._badgeEl(s.attributes.icon || "mdi:information-outline", s.state + (s.attributes.unit_of_measurement || ""))); });
    const ambEl = this.shadowRoot.getElementById("amb"); if (ambEl) ambEl.innerHTML = amb.join("");

    let onCount = 0;
    (this._chips || []).forEach((ch) => {
      if (ch.role === "lights") {
        const onL = this._lights.filter((e) => { const s = this._st(e); return s && s.state === "on"; });
        onCount += onL.length;
        ch.el.classList.toggle("on", onL.length > 0);
        ch.val.textContent = onL.length ? onL.length + "/" + this._lights.length + " allumée" + (onL.length > 1 ? "s" : "") : "Éteintes";
      } else if (ch.role === "climate") {
        const s = this._st(ch.entity); if (!s) return;
        const act = HVAC_ACTION_FR[s.attributes.hvac_action] || HVAC_FR[s.state] || s.state;
        ch.val.textContent = (s.attributes.temperature != null ? s.attributes.temperature + "° · " : "") + act;
        ch.el.classList.toggle("on", s.state !== "off" && s.state !== "unavailable");
      } else if (ch.role === "cover") {
        const s = this._st(ch.entity); if (!s) return;
        const p = s.attributes.current_position;
        ch.val.textContent = p != null ? p + "% ouvert" : (s.state === "open" ? "Ouvert" : s.state === "closed" ? "Fermé" : s.state);
        ch.el.classList.toggle("on", s.state === "open" || (p != null && p > 0));
      } else if (ch.role === "media") {
        const s = this._st(ch.entity); if (!s) return;
        ch.nm.textContent = s.attributes.media_title || "Média";
        ch.val.textContent = s.attributes.media_artist || (s.state === "playing" ? "Lecture" : s.state === "paused" ? "Pause" : s.state === "off" ? "Éteint" : "À l'arrêt");
        ch.ic.setAttribute("icon", s.state === "playing" ? "mdi:music-note" : "mdi:music");
        ch.el.classList.toggle("on", ["playing", "paused", "on"].includes(s.state));
      } else if (ch.role === "scenes") {
        ch.val.textContent = this._scenes.length + " ambiance" + (this._scenes.length > 1 ? "s" : "");
      } else if (ch.role === "entity") {
        const s = this._st(ch.entity); const d = ch.entity.split(".")[0];
        const on = s && (d === "cover" ? s.state === "open" : d === "media_player" ? ["playing", "paused", "on"].includes(s.state) : d === "climate" ? (s.state !== "off" && s.state !== "unavailable") : s.state === "on");
        ch.el.classList.toggle("on", !!on);
        if (s && ["sensor", "binary_sensor"].includes(d)) ch.val.textContent = s.state + (s.attributes.unit_of_measurement || "");
        if (on && ["light", "switch", "fan", "input_boolean"].includes(d)) onCount++;
      }
    });
    // vie de la pièce + résumé
    const tile = this.shadowRoot.getElementById("tile");
    const mediaPlaying = this._media && (this._st(this._media) || {}).state === "playing";
    const climOn = this._climate && (() => { const s = this._st(this._climate); return s && s.state !== "off" && s.state !== "unavailable"; })();
    if (tile) tile.classList.toggle("alive", !!(onCount > 0 || mediaPlaying || climOn));
    const parts = [];
    if (tS && !isNaN(parseFloat(tS.state))) parts.push(Math.round(parseFloat(tS.state)) + "°");
    parts.push(onCount ? onCount + " allumé" + (onCount > 1 ? "s" : "") : "Tout calme");
    const sum = this.shadowRoot.getElementById("sum"); if (sum) sum.textContent = parts.join(" · ");
  }
}
jmaDef("jma-room-card", JmaRoomCard);

// =============================================================================
//  ÉDITEUR VISUEL (clic sur la carte en mode édition du dashboard)
// =============================================================================
const ED_LABELS = {
  entity: "Entité", name: "Nom", icon: "Icône", color: "Couleur d'accent", accent: "Couleur secondaire",
  tap_action: "Clic simple", slider: "Type de slider", code: "Code (optionnel)", title: "Titre",
  battery_entity: "Capteur batterie", area_entity: "Capteur pièce", status_entity: "Capteur d'état",
  range_entity: "Autonomie (km)", plug_entity: "Capteur prise branchée", charging_entity: "Capteur en charge",
  remaining_entity: "Temps de charge restant", battery_temp_entity: "Temp. batterie", ext_temp_entity: "Temp. extérieure",
  mileage_entity: "Kilométrage", tire_fl: "Pneu avant gauche", tire_fr: "Pneu avant droit",
  tire_rl: "Pneu arrière gauche", tire_rr: "Pneu arrière droit",
  charge_start: "Bouton démarrer charge", charge_stop: "Bouton arrêter charge", climate_button: "Bouton climatisation",
  climate_active_entity: "Capteur clim en cours", moving_entity: "Capteur en mouvement", location_entity: "Localisation (device_tracker)",
  plug_state_entity: "État du branchement", charging_mode_entity: "Mode de charge", charge_state_entity: "État de charge",
  production_entity: "Production solaire (W)", grid_entity: "Réseau EDF (W)", consumption_entity: "Consommation maison (W)",
  grid_color: "Couleur EDF", occupancy_entity: "Capteur présence", person_count_entity: "Comptage personnes",
  persons: "Personnes", battery_entities: "Capteurs batterie (ordre des personnes)",
  geocode_entities: "Capteurs adresse (ordre des personnes)", distance_entities: "Capteurs distance (ordre des personnes)",
  entities: "Calendriers", days: "Jours", max: "Nb max d'événements", time: "Heure de sortie",
  show_forecast: "Afficher les prévisions", theme: "Thème", graph: "Mini-graphe", hours: "Période (h)",
  columns: "Colonnes", master: "Lecteur maître (option)",
  temperature_entity: "Capteur température", humidity_entity: "Capteur humidité", presence_entity: "Capteur présence",
  lights: "Lumières / interrupteurs", cover: "Volet", climate: "Climatisation", media: "Lecteur média",
  scenes: "Scènes / scripts", badges: "Badges d'ambiance (capteurs)",
  consumption_entity: "Conso maison du jour (kWh)", grid_import_entity: "Import EDF du jour (kWh)",
  grid_export_entity: "Revente du jour (kWh)", price: "Prix import (€/kWh)", export_price: "Prix revente (€/kWh)",
  columns: "Colonnes", alarm_entity: "Centrale d'alarme", cameras: "Caméras", sensors: "Capteurs porte/fenêtre",
  timeout: "Délai d'inactivité (min)", weather_entity: "Météo", show_date: "Afficher la date", map_entity: "Caméra carte (Roborock)",
  grid_entity: "Réseau EDF (W)", agenda_entities: "Calendriers (veille)",
  production_today_entity: "Solaire du jour (kWh)", grid_today_entity: "Réseau EDF du jour (kWh)", spark_hours: "Période graphe (h)",
};
function jmaEditorSchema(type) {
  const t = type || "custom:jma-card";
  const ent = (name, domain, multiple, req) => ({ name, ...(req ? { required: true } : {}),
    selector: { entity: { ...(domain ? { domain } : {}), ...(multiple ? { multiple: true } : {}) } } });
  const txt = (name) => ({ name, selector: { text: {} } });
  const num = (name, min, max) => ({ name, selector: { number: { mode: "box", min: min ?? 0, max: max ?? 99, step: 1 } } });
  const sel = (name, opts) => ({ name, selector: { select: { mode: "dropdown", options: opts.map((o) => typeof o === "string" ? { value: o, label: o } : o) } } });
  const themeSel = sel("theme", [{ value: "beige", label: "Beige (défaut)" }, { value: "dark", label: "Sombre" }, { value: "auto", label: "Auto (thème HA)" }]);
  const tail = [txt("color"), txt("accent"), sel("tap_action", [
    { value: "popup", label: "Pop-up JMA" }, { value: "more-info", label: "Fiche HA" }, { value: "none", label: "Aucun" }]), themeSel];
  if (t === "custom:jma-sensor-card") return [
    ent("entity", "sensor", false, true), txt("name"), { name: "icon", selector: { icon: {} } },
    { name: "graph", selector: { boolean: {} } }, num("hours", 1, 168), txt("color"), txt("accent"), themeSel];
  if (t === "custom:jma-cameras-card") return [
    ent("entities", "camera", true, true), num("columns", 1, 4), txt("color"), txt("accent"), themeSel];
  if (t === "custom:jma-sonos-card") return [
    txt("name"), ent("entities", "media_player", true, true), ent("master", "media_player"),
    { name: "favorites", selector: { boolean: {} } }, txt("color"), txt("accent"), themeSel];
  if (t === "custom:jma-saint-card") return [ent("entity", "sensor"), txt("color"), txt("accent"), themeSel];

  if (t === "custom:jma-ev-card") return [
    txt("name"), ent("battery_entity", "sensor"), ent("range_entity", "sensor"),
    ent("plug_entity", "binary_sensor"), ent("charging_entity", "binary_sensor"), ent("remaining_entity", "sensor"),
    ent("climate_active_entity", "binary_sensor"), ent("moving_entity"), ent("location_entity", "device_tracker"),
    ent("plug_state_entity", "sensor"), ent("charging_mode_entity", "sensor"), ent("charge_state_entity", "sensor"),
    ent("battery_temp_entity", "sensor"), ent("ext_temp_entity", "sensor"), ent("mileage_entity", "sensor"),
    ent("tire_fl", "sensor"), ent("tire_fr", "sensor"), ent("tire_rl", "sensor"), ent("tire_rr", "sensor"),
    ent("charge_start", "button"), ent("charge_stop", "button"), ent("climate_button", "button"),
    txt("color"), txt("accent")];
  if (t === "custom:jma-energy-card") return [
    txt("title"), ent("production_entity", "sensor"), ent("grid_entity", "sensor"), ent("consumption_entity", "sensor"),
    ent("production_today_entity", "sensor"), ent("grid_today_entity", "sensor"),
    num("spark_hours", 1, 168), txt("grid_color"), txt("color"), txt("accent")];
  if (t === "custom:jma-weather-card") return [
    ent("entity", "weather", false, true), txt("name"),
    { name: "show_forecast", selector: { boolean: {} } }, num("days", 1, 7), txt("color"), txt("accent")];
  if (t === "custom:jma-camera-card") return [
    ent("entity", "camera", false, true), txt("name"), { name: "icon", selector: { icon: {} } },
    ent("occupancy_entity", "binary_sensor"), ent("person_count_entity", "sensor"), txt("color"), txt("accent")];
  if (t === "custom:jma-presence-card") return [
    ent("persons", ["person", "device_tracker"], true, true),
    ent("battery_entities", "sensor", true), ent("geocode_entities", "sensor", true), ent("distance_entities", "sensor", true),
    txt("color"), txt("accent")];
  if (t === "custom:jma-agenda-card") return [
    txt("title"), ent("entities", "calendar", true, true), num("days", 1, 31), num("max", 1, 50), txt("color"), txt("accent")];
  if (t === "custom:jma-energy-today-card") return [
    txt("title"), ent("consumption_entity", "sensor"), ent("production_entity", "sensor"),
    ent("grid_import_entity", "sensor"), ent("grid_export_entity", "sensor"),
    num("price", 0, 5), num("export_price", 0, 5), txt("grid_color"), txt("color"), txt("accent")];
  if (t === "custom:jma-favorites-card") return [txt("title"), num("columns", 1, 8), txt("color"), txt("accent")];
  if (t === "custom:jma-covers-card") return [txt("name"), { name: "icon", selector: { icon: {} } }, ent("entities", "cover", true), txt("color"), txt("accent")];
  if (t === "custom:jma-climates-card") return [txt("name"), { name: "icon", selector: { icon: {} } }, ent("entities", "climate", true), txt("color"), txt("accent")];
  if (t === "custom:jma-security-card") return [
    txt("name"), ent("alarm_entity", "alarm_control_panel"), ent("cameras", "camera", true),
    ent("sensors", "binary_sensor", true), txt("color"), txt("accent")];
  if (t === "custom:jma-screensaver-card") return [
    num("timeout", 1, 120), ent("weather_entity", "weather"),
    ent("production_entity", "sensor"), ent("consumption_entity", "sensor"), ent("grid_entity", "sensor"), num("graph_hours", 1, 48),
    ent("agenda_entities", "calendar", true), num("days", 1, 31), ent("saint_entity", "sensor"),
    { name: "show_date", selector: { boolean: {} } }, txt("color"), txt("accent")];
  if (t === "custom:jma-room-card") return [
    txt("name"), { name: "icon", selector: { icon: {} } },
    ent("temperature_entity", "sensor"), ent("humidity_entity", "sensor"), ent("presence_entity", ["binary_sensor", "sensor"]),
    ent("lights", ["light", "switch", "fan", "input_boolean"], true), ent("cover", "cover"), ent("climate", "climate"),
    ent("media", "media_player"), ent("scenes", ["scene", "script"], true), ent("badges", undefined, true),
    ent("entities", undefined, true), txt("color"), txt("accent")];
  if (t === "custom:jma-bin-card") return [
    txt("name"), { name: "icon", selector: { icon: {} } }, txt("time"),
    { name: "days", selector: { select: { multiple: true, options: [
      { value: 1, label: "Lundi" }, { value: 2, label: "Mardi" }, { value: 3, label: "Mercredi" }, { value: 4, label: "Jeudi" },
      { value: 5, label: "Vendredi" }, { value: 6, label: "Samedi" }, { value: 0, label: "Dimanche" }] } } },
    txt("color"), txt("accent")];
  if (t === "custom:jma-notify-card") return [txt("title"), txt("color")];

  // cartes "entité unique" (light/switch/cover/thermostat/media/scene/alarm/vacuum/jma-card)
  const dom = {
    "custom:jma-light-card": "light", "custom:jma-switch-card": ["switch", "input_boolean", "fan"],
    "custom:jma-cover-card": "cover", "custom:jma-thermostat-card": "climate", "custom:jma-climate-dial-card": "climate", "custom:jma-media-card": "media_player",
    "custom:jma-vacuum-card": "vacuum", "custom:jma-scene-card": ["scene", "script"], "custom:jma-alarm-card": "alarm_control_panel",
  }[t];
  const schema = [ent("entity", dom, false, true), txt("name"), { name: "icon", selector: { icon: {} } }];
  if (t === "custom:jma-card") schema.push(sel("slider", ["auto", "brightness", "temperature", "volume", "position", "none"]));
  if (t === "custom:jma-vacuum-card") { schema.push(ent("battery_entity", "sensor"), ent("area_entity", "sensor"), ent("status_entity", "sensor"), ent("map_entity", "camera")); }
  if (t === "custom:jma-alarm-card") schema.push(txt("code"));
  return schema.concat(tail);
}
class JmaCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _render() {
    if (!this._config) return;
    if (customElements.get("ha-form")) {
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => ED_LABELS[s.name] || s.name;
        this._form.addEventListener("value-changed", (e) => {
          e.stopPropagation();
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: e.detail.value }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = jmaEditorSchema(this._config.type);
      this._form.data = this._config;
    } else {
      this._fallback();
    }
  }
  _fallback() {
    if (this._fb) return;
    this._fb = true;
    const mk = (key, label, ph) => {
      const w = document.createElement("div");
      w.style.cssText = "margin:8px 0;display:flex;flex-direction:column;gap:4px;";
      const l = document.createElement("label"); l.textContent = label;
      l.style.cssText = "font-size:.8rem;opacity:.7;";
      const i = document.createElement("input"); i.value = this._config[key] || ""; i.placeholder = ph || "";
      i.style.cssText = "padding:8px;border-radius:8px;border:1px solid var(--divider-color,#ccc);background:var(--card-background-color,#fff);color:var(--primary-text-color,#000);";
      i.addEventListener("input", () => {
        const c = { ...this._config, [key]: i.value || undefined }; this._config = c;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
      });
      w.append(l, i); return w;
    };
    this.append(mk("entity", "Entité (entity_id)", "light.salon"), mk("name", "Nom"),
      mk("icon", "Icône (mdi:…)"), mk("color", "Couleur d'accent", "#f8a5c2"), mk("accent", "Couleur secondaire", "#DEC198"));
  }
}
jmaDef("jma-card-editor", JmaCardEditor);

// =============================================================================
//  TOASTS (notifications popup iOS)
// =============================================================================
// niveaux d'importance : info < success < warning < critical
// >>> SOURCE UNIQUE DE VÉRITÉ <<< : modifier une couleur/icône ICI la change PARTOUT
// (bannière d'alerte, pop-up caméra, toast, icônes). bg = fond bannière pleine largeur,
// accent = teinte vive (toast / bord pop-up / icône), fg = couleur du texte sur bg.
const JMA_LEVELS = {
  info:     { bg: "#3d7fe0", accent: "#40c4ff", icon: "mdi:information",     fg: "#ffffff", toast: 4000 },
  success:  { bg: "#2faa52", accent: "#69f0ae", icon: "mdi:check-circle",    fg: "#ffffff", toast: 3500 },
  warning:  { bg: "#ffc23d", accent: "#ffc23d", icon: "mdi:alert",           fg: "#4a3000", toast: 6000 },
  critical: { bg: "#ff3b30", accent: "#ff1744", icon: "mdi:alert-octagon",   fg: "#ffffff", toast: 0 },
};
const JMA_LVL = (l) => JMA_LEVELS[l] || JMA_LEVELS.critical;
const TOAST_LEVELS = {
  info:     { color: JMA_LEVELS.info.accent,     icon: JMA_LEVELS.info.icon,     duration: JMA_LEVELS.info.toast },
  success:  { color: JMA_LEVELS.success.accent,  icon: JMA_LEVELS.success.icon,  duration: JMA_LEVELS.success.toast },
  warning:  { color: JMA_LEVELS.warning.accent,  icon: JMA_LEVELS.warning.icon,  duration: JMA_LEVELS.warning.toast },
  danger:   { color: "#ff5252",                  icon: "mdi:alert-octagon",      duration: 9000 },  // alias historique
  critical: { color: JMA_LEVELS.critical.accent, icon: JMA_LEVELS.critical.icon, duration: JMA_LEVELS.critical.toast },
};
function jmaToast(opts) {
  opts = typeof opts === "string" ? { message: opts } : (opts || {});
  const lvl = TOAST_LEVELS[opts.level] || null;
  const title = opts.title;
  const message = opts.message;
  const icon = opts.icon || (lvl && lvl.icon) || "mdi:bell";
  const color = opts.color || (lvl && lvl.color) || ROSE;
  const duration = opts.duration != null ? opts.duration : (lvl ? lvl.duration : 4000);
  const crit = opts.level === "critical";
  let wrap = document.getElementById("jma-toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "jma-toast-wrap";
    wrap.style.cssText = "position:fixed;top:max(12px,env(safe-area-inset-top));left:0;right:0;z-index:10000;" +
      "display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;";
    document.body.appendChild(wrap);
    const st = document.createElement("style");
    st.textContent = "@keyframes jma-toast-pulse{0%,100%{box-shadow:0 8px 30px rgba(0,0,0,.4),0 0 0 0 rgba(255,23,68,.55);}50%{box-shadow:0 8px 30px rgba(0,0,0,.4),0 0 0 10px rgba(255,23,68,0);}}";
    wrap.appendChild(st);
  }
  const t = document.createElement("div");
  t.style.cssText = "pointer-events:auto;max-width:440px;width:calc(100% - 24px);box-sizing:border-box;" +
    "display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:16px;cursor:pointer;" +
    "background:rgba(28,28,30,.92);backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);" +
    "color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.4);transform:translateY(-16px);opacity:0;" +
    "transition:transform .3s cubic-bezier(.2,.8,.25,1),opacity .3s ease;" +
    "border:1px solid " + (crit ? color : "rgba(255,255,255,.08)") + ";" +
    (crit ? "animation:jma-toast-pulse 1.4s ease-in-out infinite;" : "");
  t.innerHTML =
    `<div style="width:30px;height:30px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:${color}22;">` +
    `<ha-icon icon="${icon}" style="--mdc-icon-size:20px;color:${color};"></ha-icon></div>` +
    `<div style="min-width:0;flex:1;">` +
    (title ? `<div style="font-weight:700;font-size:.9rem;line-height:1.15;">${title}</div>` : "") +
    `<div style="font-size:.8rem;opacity:.85;line-height:1.2;">${message || ""}</div></div>` +
    (crit ? `<ha-icon icon="mdi:close" style="--mdc-icon-size:18px;opacity:.7;flex:none;"></ha-icon>` : "");
  if (navigator.vibrate && (opts.level === "danger" || crit)) navigator.vibrate(crit ? [80, 60, 80] : 40);
  wrap.appendChild(t);
  requestAnimationFrame(() => { t.style.transform = "translateY(0)"; t.style.opacity = "1"; });
  const close = () => { t.style.transform = "translateY(-16px)"; t.style.opacity = "0"; setTimeout(() => t.remove(), 320); };
  t.addEventListener("click", close);
  if (duration > 0) setTimeout(close, duration);
  return close;
}
window.jmaToast = jmaToast;
// devine le niveau d'importance d'une notif d'après son texte
function jmaGuessLevel(text) {
  const s = (text || "").toLowerCase();
  // 3 niveaux clairs : critical (rouge, grave) / warning (ambre, à surveiller) / success (vert) / info (bleu)
  if (/(danger|critique|urgent|fuite|incendie|fumée|intrusion|alarme|gaz|🚨|⚠)/.test(s)) return "critical";
  if (/(alerte|alert|batterie faible|ouvert|échec|erreur|panne|attention|warning|rappel|pense|bientôt|pluie|fenêtre)/.test(s)) return "warning";
  if (/(ok|terminé|fini|succès|réussi|allumé)/.test(s)) return "success";
  return "info";
}

// =============================================================================
//  🔔 CARTE NOTIFICATIONS (persistent_notification) + toasts auto
// =============================================================================
class JmaNotifyCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; this._seen = new Set(); this._subbed = false; this._ever = false; }
  setConfig(c) { this._config = c || {}; }
  getCardSize() { return 1; }
  static getStubConfig() { return { title: "Notifications" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) this._build(); jmaApplyTheme(this, h, this._config); if (!this._subbed) this._subscribe(); }
  _build() {
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${ROSE};--jma-beige:${BEIGE};--jma-dark:${DARK};--nh-sheet:#fbf8f1;--nh-line:rgba(60,48,30,.12);--nh-text:#2a2418;}
        :host(.dark){--nh-sheet:#1d1d20;--nh-line:rgba(255,255,255,.1);--nh-text:#fff;}
        @keyframes jma-pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
        .cnt{min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--jma-rose);color:var(--jma-dark);
          font-weight:800;font-size:.74rem;display:none;align-items:center;justify-content:center;flex:none;}
        .cnt.show{display:flex;}
        .iconbtn{border:none;background:var(--jma-surf3);color:var(--jma-text);border-radius:9px;cursor:pointer;
          width:30px;height:30px;flex:none;display:flex;align-items:center;justify-content:center;transition:transform .08s;}
        .iconbtn:active{transform:scale(.9);} .iconbtn ha-icon{--mdc-icon-size:18px;}
        #list{display:flex;flex-direction:column;gap:6px;margin-top:2px;}
        .ntf{display:flex;gap:8px;align-items:center;background:var(--jma-surf2);border-radius:11px;padding:9px 11px;cursor:pointer;transition:outline .15s,background .2s;}
        .ntf:active{background:var(--jma-surf3);}
        .ntf.confirm{outline:2px solid #ff3b30;outline-offset:-1px;}
        .nt{font-weight:700;font-size:.8rem;}
        .nm{font-size:.72rem;opacity:.7;white-space:normal;overflow:hidden;}
        .nx{margin-left:auto;border:none;background:var(--jma-surf3);color:var(--jma-text);border-radius:8px;
          width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;transition:background .2s;}
        .ntf.confirm{outline-color:#ff3b30;}
        .ntf.confirm .nx{width:auto;padding:0 11px;height:28px;gap:4px;background:#ff3b30;color:#fff;font-weight:800;font-size:.72rem;border-radius:8px;}
        .nhint{font-size:.64rem;opacity:.4;margin-top:3px;text-align:center;}
        .tile.mini{padding:7px 12px;}
        .tile.mini .badge,.tile.mini .name,.tile.mini .test,.tile.mini .cnt,.tile.mini #list,.tile.mini .nhint{display:none;}
        .tile.mini .sub{font-size:.72rem;opacity:.5;}
        /* popup historique */
        .histpop{position:fixed;inset:0;z-index:1200;background:rgba(20,16,10,.45);display:none;align-items:center;justify-content:center;backdrop-filter:blur(3px);}
        .histpop.on{display:flex;}
        .histsheet{background:var(--nh-sheet);color:var(--nh-text);border:1px solid var(--nh-line);border-radius:20px;width:calc(100% - 34px);max-width:440px;max-height:74vh;display:flex;flex-direction:column;padding:16px;box-shadow:0 22px 64px rgba(0,0,0,.45);}
        .histhead{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
        .histhead .ht{font-weight:800;font-size:1.02rem;flex:1;}
        .histx{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;background:var(--jma-surf3);color:var(--nh-text);font-size:1rem;flex:none;}
        .histlist{overflow:auto;display:flex;flex-direction:column;gap:7px;flex:1;}
        .hrow{display:flex;gap:9px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--nh-line);}
        .hrow:first-child{border-top:none;}
        .hbar{width:3px;align-self:stretch;border-radius:3px;flex:none;min-height:26px;}
        .hrow .ht2{font-weight:700;font-size:.82rem;}
        .hrow .hm{font-size:.72rem;opacity:.65;}
        .hrow .htime{font-size:.62rem;opacity:.45;font-weight:700;margin-left:auto;white-space:nowrap;}
        .histclear{margin-top:11px;border:1px solid var(--nh-line);background:transparent;color:var(--nh-text);border-radius:12px;padding:10px;cursor:pointer;font-weight:700;font-size:.82rem;}
        .histempty{opacity:.5;text-align:center;padding:24px 0;font-size:.85rem;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat" id="tile"><div class="content">
        <div class="top"><div class="badge"><ha-icon id="bic" icon="mdi:bell-outline"></ha-icon></div>
          <div class="meta"><div class="name">${this._config.title || "Notifications"}</div><div class="sub" id="sub">—</div></div>
          <button class="iconbtn" id="hist" title="Historique des notifications"><ha-icon icon="mdi:history"></ha-icon></button>
          <button class="iconbtn test" id="test" title="Tester une notif"><ha-icon icon="mdi:bell-ring"></ha-icon></button>
          <div class="cnt" id="cnt"></div></div>
        <div id="list"></div>
        <div class="nhint" id="nhint">Touche une notification pour la marquer lue</div>
      </div></div>
      <div class="histpop" id="histpop"><div class="histsheet">
        <div class="histhead"><div class="ht">🕘 Historique des notifications</div><button class="histx" id="histx">✕</button></div>
        <div class="histlist" id="histlist"></div>
        <button class="histclear" id="histclear"><ha-icon icon="mdi:refresh" style="--mdc-icon-size:17px;vertical-align:-4px;margin-right:4px;"></ha-icon>Rafraîchir (48 h)</button>
      </div></div></ha-card>`;
    this.shadowRoot.getElementById("test").addEventListener("click", () =>
      jmaToast({ title: "Test", message: "Notification de test JMA 🔔", icon: "mdi:bell-ring", color: ROSE }));
    this.shadowRoot.getElementById("hist").addEventListener("click", () => this._openHist());
    this.shadowRoot.getElementById("histx").addEventListener("click", () => this.shadowRoot.getElementById("histpop").classList.remove("on"));
    this.shadowRoot.getElementById("histclear").addEventListener("click", () => this._renderHist());
    this.shadowRoot.getElementById("histpop").addEventListener("click", (e) => { if (e.target.id === "histpop") e.currentTarget.classList.remove("on"); });
    this._built = true;
  }
  // historique côté serveur (logbook) → partagé entre tous les appareils
  _pushHist(n, lvl) {
    try { this._hass.callService("logbook", "log", { name: "📣 JMA", message: "[" + lvl + "] " + (n.title || "Notification") + ((n.message) ? " — " + (n.message || "").toString().replace(/\s+/g, " ").slice(0, 160) : "") }); } catch (e) {}
  }
  _openHist() { this.shadowRoot.getElementById("histpop").classList.add("on"); this._renderHist(); }
  async _renderHist() {
    const host = this.shadowRoot.getElementById("histlist");
    host.innerHTML = `<div class="histempty">Chargement…</div>`;
    let entries = [];
    try {
      const start = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const res = await this._hass.callWS({ type: "logbook/get_events", start_time: start });
      (Array.isArray(res) ? res : []).forEach((e) => {
        if (String(e.name || "") !== "📣 JMA") return;
        const m = e.message || ""; const mm = m.match(/^\[(\w+)\]\s*(.*)$/);
        entries.push({ lvl: mm ? mm[1] : "info", txt: mm ? mm[2] : m, ts: (e.when || 0) * 1000 });
      });
    } catch (e) {}
    entries.sort((a, b) => b.ts - a.ts);
    const seen = new Set(); entries = entries.filter((x) => { const k = x.txt + "|" + Math.round(x.ts / 60000); if (seen.has(k)) return false; seen.add(k); return true; });
    if (!entries.length) { host.innerHTML = `<div class="histempty">Aucun historique (48 h)</div>`; return; }
    host.innerHTML = entries.slice(0, 80).map((x) => {
      const col = (TOAST_LEVELS[x.lvl] || {}).color || ROSE;
      const d = new Date(x.ts);
      const when = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " " + ("" + d.getHours()).padStart(2, "0") + ":" + ("" + d.getMinutes()).padStart(2, "0");
      const parts = x.txt.split(" — "); const t = parts[0]; const m = parts.slice(1).join(" — ");
      return `<div class="hrow"><div class="hbar" style="background:${col}"></div><div style="flex:1;min-width:0;"><div class="ht2">${t}</div>${m ? `<div class="hm">${m}</div>` : ""}</div><div class="htime">${when}</div></div>`;
    }).join("");
  }
  async _subscribe() {
    if (!this._hass || !this._hass.connection) return;
    this._subbed = true;
    try {
      await this._fetch();
      jmaSubPN(this._hass.connection, () => this._fetch());
    } catch (e) { /* websocket indispo */ }
  }
  async _fetch() {
    try {
      const res = await this._hass.callWS({ type: "persistent_notification/get" });
      this._render(Array.isArray(res) ? res : Object.values(res || {}));
    } catch (e) { this._render([]); }
  }
  _render(arr) {
    if (!this._built) return;
    const list = this.shadowRoot.getElementById("list");
    const sub = this.shadowRoot.getElementById("sub");
    const cnt = this.shadowRoot.getElementById("cnt");
    const tile = this.shadowRoot.getElementById("tile");
    list.innerHTML = "";
    const empty = !arr.length;
    // carte masquée si vide, SAUF un mini-bandeau discret avec le bouton historique
    tile.classList.toggle("mini", empty && !!this._config.hide_empty);
    cnt.classList.toggle("show", !empty);
    cnt.textContent = arr.length;
    sub.textContent = empty ? "Aucune notification" : arr.length + " active" + (arr.length > 1 ? "s" : "");
    this.shadowRoot.getElementById("bic").setAttribute("icon", empty ? "mdi:bell-outline" : "mdi:bell-badge");
    this.shadowRoot.getElementById("nhint").style.display = empty ? "none" : "";
    arr.forEach((n) => {
      const id = n.notification_id || n.id;
      const lvl = jmaGuessLevel((n.title || "") + " " + (n.message || ""));
      const col = (TOAST_LEVELS[lvl] || {}).color || ROSE;
      const row = document.createElement("div"); row.className = "ntf";
      row.style.borderLeft = "3px solid " + col;
      const danger = lvl === "critical";
      row.innerHTML = `<div style="min-width:0;flex:1;"><div class="nt">${n.title || "Notification"}</div>` +
        `<div class="nm">${(n.message || "").toString().slice(0, 180)}</div></div>` +
        `<div class="nx"><ha-icon icon="mdi:close" style="--mdc-icon-size:16px;"></ha-icon></div>`;
      // tap sur la notif (corps ou croix) = marquer lue / supprimer ; 2 taps (confirmation) seulement si critique
      const resetNx = () => { row.dataset.confirm = ""; row.classList.remove("confirm"); const x = row.querySelector(".nx"); if (x) x.innerHTML = `<ha-icon icon="mdi:close" style="--mdc-icon-size:16px;"></ha-icon>`; };
      row.addEventListener("click", () => {
        if (danger && row.dataset.confirm !== "1") {
          row.dataset.confirm = "1"; row.classList.add("confirm");
          row.querySelector(".nx").innerHTML = `<ha-icon icon="mdi:check-bold" style="--mdc-icon-size:15px;"></ha-icon>Confirmer`;
          clearTimeout(row._ct); row._ct = setTimeout(resetNx, 3500);
          return;
        }
        this._hass.callService("persistent_notification", "dismiss", { notification_id: id });
      });
      list.appendChild(row);
      if (id && !this._seen.has(id)) {
        this._seen.add(id);
        this._pushHist(n, lvl);
        if (this._ever) jmaToast({ title: n.title || "Notification", message: (n.message || "").toString().slice(0, 120), level: lvl });
      }
    });
    this._ever = true;
  }
}
jmaDef("jma-notify-card", JmaNotifyCard);

// =============================================================================
//  ☀️ ÉNERGIE DU JOUR (kWh + coût € EDF)
// =============================================================================
class JmaEnergyTodayCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) {
    if (!c.consumption_entity && !c.grid_import_entity && !c.production_entity) throw new Error("énergie du jour : au moins une entité kWh requise");
    this._config = { color: ROSE, accent: BEIGE, dark: DARK, grid_color: "#3b9bff", title: "Énergie du jour", price: null, export_price: null, ...c };
  }
  getCardSize() { return 2; }
  static getStubConfig() { return { title: "Énergie du jour", consumption_entity: "sensor.maison_energie_jour", production_entity: "sensor.solaire_energie_jour", price: 0.25 }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); }
  _num(k) { const e = this._config[k]; const s = e && this._hass.states[e]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _price(k, fb) { const e = this._config[k + "_entity"]; const s = e && this._hass.states[e]; if (s) { const v = parseFloat(s.state); if (!isNaN(v)) return v; } return this._config[k] != null ? this._config[k] : fb; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};--edf:${c.grid_color};}
      .et{display:flex;flex-direction:column;gap:9px;}
      .ehead{display:flex;align-items:baseline;gap:7px;}
      .ebig{font-weight:800;font-size:1.7rem;letter-spacing:-1px;}
      .eunit{font-size:.78rem;opacity:.6;font-weight:700;}
      .ecost{margin-left:auto;font-weight:800;font-size:1.15rem;}
      .ebar{display:flex;height:13px;border-radius:99px;overflow:hidden;background:var(--jma-surf3);}
      .ebar .s{background:var(--jma-rose);transition:width .4s;}.ebar .g{background:var(--edf);transition:width .4s;}
      .ekv{display:flex;gap:6px;flex-wrap:wrap;}
      .ecell{flex:1 1 30%;min-width:78px;background:var(--jma-surf3);border-radius:11px;padding:7px 9px;box-sizing:border-box;}
      .ecell .k{font-size:.63rem;opacity:.6;font-weight:700;}.ecell .v{font-weight:800;font-size:.9rem;margin-top:1px;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="top"><div class="badge"><ha-icon icon="mdi:lightning-bolt-circle"></ha-icon></div>
          <div class="meta"><div class="name">${c.title}</div><div class="sub" id="sub">Bilan du jour</div></div></div>
        <div class="et">
          <div class="ehead"><span class="ebig" id="cons">—</span><span class="eunit">kWh conso</span><span class="ecost" id="cost"></span></div>
          <div class="ebar"><div class="s" id="bs"></div><div class="g" id="bg"></div></div>
          <div class="ekv" id="kv"></div>
        </div>
      </div></div></ha-card>`;
  }
  _update() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    const cons = this._num("consumption_entity"), prod = this._num("production_entity"), imp = this._num("grid_import_entity"), exp = this._num("grid_export_entity");
    let consVal = cons; if (consVal == null) consVal = (imp || 0) + Math.max(0, (prod || 0) - (exp || 0));
    $("cons").textContent = consVal != null ? (Math.round(consVal * 10) / 10) : "—";
    const pImp = this._price("price", null), pExp = this._price("export_price", 0);
    let cost = null;
    if (imp != null && pImp != null) cost = imp * pImp - (exp || 0) * pExp;
    else if (cons != null && pImp != null) cost = cons * pImp;
    $("cost").textContent = cost != null ? (Math.round(cost * 100) / 100).toFixed(2).replace(".", ",") + " €" : "";
    const solar = Math.max(0, prod != null ? prod - (exp || 0) : 0);
    const grid = Math.max(0, imp != null ? imp : Math.max(0, consVal - solar));
    const tot = Math.max(solar + grid, 0.001);
    $("bs").style.width = (solar / tot * 100) + "%"; $("bg").style.width = (grid / tot * 100) + "%";
    const auto = consVal > 0 ? Math.round(solar / consVal * 100) : 0;
    const cells = [];
    if (prod != null) cells.push(["Solaire", Math.round(prod * 10) / 10 + " kWh"]);
    if (imp != null) cells.push(["Réseau EDF", Math.round(imp * 10) / 10 + " kWh"]);
    if (exp != null) cells.push(["Revente", Math.round(exp * 10) / 10 + " kWh"]);
    cells.push(["Autoconso.", auto + " %"]);
    $("kv").innerHTML = cells.map(([k, v]) => `<div class="ecell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    $("sub").textContent = prod != null ? "Solaire vs EDF aujourd'hui" : "Consommation du jour";
  }
}
jmaDef("jma-energy-today-card", JmaEnergyTodayCard);

// =============================================================================
//  ⭐ FAVORIS / LANCEUR
// =============================================================================
class JmaFavoritesCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, ...c }; this._items = c.items || []; }
  getCardSize() { return 2; }
  static getStubConfig() { return { items: [{ name: "Tout éteindre", icon: "mdi:power", service: "light.turn_off" }, { name: "Cinéma", icon: "mdi:movie-open", scene: "scene.cinema" }] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); }
  _build() {
    const c = this._config;
    const tmpl = c.columns ? `repeat(${c.columns},1fr)` : "repeat(auto-fill,minmax(76px,1fr))";
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      .fav{display:grid;grid-template-columns:${tmpl};gap:7px;}
      .fb{background:var(--jma-surf3);border:none;border-radius:14px;padding:11px 6px;cursor:pointer;color:var(--jma-text);
        display:flex;flex-direction:column;align-items:center;gap:5px;transition:background .2s,transform .08s;}
      .fb:active{transform:scale(.92);}.fb.on{background:var(--jma-grad);color:var(--jma-dark);}
      .fb ha-icon{--mdc-icon-size:24px;}
      .fb span{font-size:.66rem;font-weight:700;text-align:center;line-height:1.12;max-width:100%;overflow:hidden;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        ${c.title ? `<div class="top"><div class="meta"><div class="name">${c.title}</div></div></div>` : ""}
        <div class="fav" id="fav"></div>
      </div></div></ha-card>`;
    const grid = this.shadowRoot.getElementById("fav");
    this._items.forEach((it, i) => {
      const b = document.createElement("button"); b.className = "fb"; b.dataset.i = i; b.tabIndex = 0;
      b.innerHTML = `<ha-icon icon="${it.icon || "mdi:star"}"${it.color ? ` style="color:${it.color}"` : ""}></ha-icon><span>${it.name || ""}</span>`;
      b.addEventListener("click", () => this._run(it));
      grid.appendChild(b);
    });
  }
  _run(it) {
    try {
      if (it.scene) this._hass.callService("scene", "turn_on", { entity_id: it.scene });
      else if (it.script) this._hass.callService("script", "turn_on", { entity_id: it.script });
      else if (it.service) { const p = it.service.split("."); this._hass.callService(p[0], p[1], it.service_data || it.data || {}); }
      else if (it.navigate) { history.pushState(null, "", it.navigate); window.dispatchEvent(new CustomEvent("location-changed")); }
      else if (it.entity) this._hass.callService("homeassistant", "toggle", { entity_id: it.entity });
      if (window.jmaToast && !it.navigate) jmaToast({ title: it.name || "Favori", message: "✓ Activé", icon: it.icon || "mdi:star", color: it.color || this._config.color });
    } catch (e) {}
  }
  _update() {
    this._items.forEach((it, i) => {
      const b = this.shadowRoot.querySelector(`.fb[data-i="${i}"]`); if (!b) return;
      const s = it.entity && this._hass.states[it.entity];
      const on = s && !["off", "unavailable", "unknown", "closed", "idle", "disarmed", "0"].includes(s.state);
      b.classList.toggle("on", !!on);
    });
  }
}
jmaDef("jma-favorites-card", JmaFavoritesCard);

// =============================================================================
//  🛡️ SÉCURITÉ (alarme + caméras + ouvertures)
// =============================================================================
class JmaSecurityCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Sécurité", ...c }; this._cams = c.cameras || []; this._sensors = c.sensors || []; }
  getCardSize() { return 3; }
  static getStubConfig() { return { name: "Sécurité", alarm_entity: "alarm_control_panel.maison", cameras: ["camera.entree"], sensors: ["binary_sensor.porte_entree"] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._popup) this._popup.hass = h; }
  _st(e) { return e && this._hass ? this._hass.states[e] : null; }
  // auto-détection des capteurs (override possible par config)
  _groups() {
    const c = this._config, H = this._hass.states;
    const all = Object.keys(H).filter((e) => e.startsWith("binary_sensor.") && !["unavailable", "unknown"].includes(H[e].state));
    const dc = (e) => H[e].attributes.device_class || "";
    const pick = (key, test) => (c[key] && c[key].length) ? c[key] : all.filter(test);
    return {
      leak: pick("leak_sensors", (e) => dc(e) === "moisture"),
      smoke: pick("smoke_sensors", (e) => dc(e) === "smoke" || dc(e) === "gas" || dc(e) === "carbon_monoxide"),
      door: pick("sensors", (e) => ["door", "window", "opening"].includes(dc(e))),
      motion: pick("motion_sensors", (e) => dc(e) === "motion" && !/tablette|pc_louis|_mur\b/.test(e)),
      occupancy: pick("occupancy_sensors", (e) => dc(e) === "occupancy" && /person/.test(e)),
      tamper: all.filter((e) => dc(e) === "tamper"),
      battery: all.filter((e) => dc(e) === "battery"),
    };
  }
  _popupSecurity() {
    if (this._popup) return;
    const g = this._groups(), c = this._config;
    const p = document.createElement("jma-card-popup");
    p.config = { kind: "security", name: c.name || "Sécurité", alarm_entity: c.alarm_entity, subzones: c.subzones || [],
      leak_sensors: g.leak, smoke_sensors: g.smoke, door_sensors: g.door, motion_sensors: g.motion, cameras: this._cams,
      names: c.names, color: c.color, accent: c.accent, dark: c.dark, theme: c.theme };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
  _popupFor(entity, kind) { if (this._popup || !entity) return; const p = document.createElement("jma-card-popup"); p.config = { entity, kind, color: this._config.color, accent: this._config.accent, dark: this._config.dark, theme: this._config.theme }; p.hass = this._hass; p.addEventListener("jma-close", () => { this._popup = null; }); document.body.appendChild(p); this._popup = p; }
  _build() {
    if (this._config.bar) return this._buildBar();
    if (this._config.expanded) return this._buildPanel();
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      .tile.sec{flex-direction:column;align-items:stretch;gap:10px;padding:13px;}
      .secstate{display:flex;align-items:center;gap:11px;cursor:pointer;}
      .secbadge{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--jma-surf2);flex:none;transition:background .3s;}
      .secbadge ha-icon{--mdc-icon-size:25px;color:var(--jma-icon);}
      .secbadge.armed{background:var(--jma-grad);}.secbadge.armed ha-icon{color:var(--jma-dark);}
      .secbadge.trig{background:#ff3b30;animation:jma-pulse 1s infinite;}.secbadge.trig ha-icon{color:#fff;}
      @keyframes jma-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
      .secmeta{flex:1;min-width:0;}.secmeta b{font-weight:800;font-size:1.04rem;}.secmeta small{display:block;font-size:.74rem;opacity:.65;}
      .secchev{--mdc-icon-size:20px;opacity:.4;}
      .safe{display:flex;gap:7px;}
      .safei{flex:1;display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:12px;background:var(--jma-surf3);font-size:.76rem;font-weight:800;cursor:pointer;transition:background .3s;}
      .safei ha-icon{--mdc-icon-size:18px;color:var(--jma-icon);flex:none;}
      .safei.ok ha-icon{color:#34c759;}
      .safei small{display:block;font-weight:600;font-size:.64rem;opacity:.6;}
      .safei.alert{background:rgba(255,59,48,.16);color:#ff5a4d;animation:jma-pulse 1s infinite;}.safei.alert ha-icon{color:#ff5a4d;}
      .sens{display:flex;gap:5px;flex-wrap:wrap;}
      .sp{display:flex;align-items:center;gap:5px;padding:4px 9px;border-radius:10px;background:var(--jma-surf3);font-size:.72rem;font-weight:700;}
      .sp ha-icon{--mdc-icon-size:14px;color:var(--jma-icon);}
      .sp.open{background:rgba(255,149,0,.16);color:#ff9f0a;}.sp.open ha-icon{color:#ff9f0a;}
      .sp.motion{background:rgba(110,160,255,.16);color:#6aa3ff;}.sp.motion ha-icon{color:#6aa3ff;}
      .cams{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;}
      .cam{position:relative;border-radius:12px;overflow:hidden;background:#000;aspect-ratio:16/10;cursor:pointer;}
      .cam img{width:100%;height:100%;object-fit:cover;display:block;}
      .cam span{position:absolute;left:6px;bottom:5px;font-size:.62rem;font-weight:800;color:#fff;text-shadow:0 1px 3px #000;}
      .cam .pers{position:absolute;top:5px;right:5px;background:rgba(255,59,48,.92);color:#fff;font-size:.58rem;font-weight:800;padding:2px 6px;border-radius:7px;display:none;align-items:center;gap:3px;}
      .cam .pers ha-icon{--mdc-icon-size:12px;}.cam .pers.on{display:flex;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile sec" id="tile"><div class="content" style="gap:10px;">
        <div class="secstate" id="secstate"><div class="secbadge" id="secbadge"><ha-icon id="secicon" icon="mdi:shield-home"></ha-icon></div>
          <div class="secmeta"><b id="secst">—</b><small id="secsub"></small></div>
          <ha-icon class="secchev" icon="mdi:chevron-right"></ha-icon></div>
        <div class="safe" id="safe"></div>
        <div class="sens" id="sens"></div>
        <div class="cams" id="cams"></div>
      </div></div></ha-card>`;
    this.shadowRoot.getElementById("secstate").addEventListener("click", () => this._popupSecurity());
    this.shadowRoot.getElementById("safe").addEventListener("click", () => this._popupSecurity());
    const cams = this.shadowRoot.getElementById("cams");
    this._cams.forEach((eid) => { const d = document.createElement("div"); d.className = "cam"; d.dataset.e = eid; d.innerHTML = `<img><div class="pers"><ha-icon icon="mdi:account"></ha-icon>Présence</div><span></span>`; d.addEventListener("click", (e) => { e.stopPropagation(); this._popupFor(eid); }); cams.appendChild(d); });
  }
  _update() {
    if (this._config.bar) return this._updateBar();
    if (this._config.expanded) return this._updatePanel();
    const $ = (id) => this.shadowRoot.getElementById(id);
    const al = this._st(this._config.alarm_entity), badge = $("secbadge");
    if (al) {
      const armed = ("" + al.state).startsWith("armed"), trig = al.state === "triggered";
      $("secst").textContent = ALARM_FR[al.state] || al.state;
      $("secsub").textContent = trig ? "⚠ Intrusion détectée" : armed ? "Système armé" : "Système désarmé";
      $("secicon").setAttribute("icon", trig ? "mdi:shield-alert" : armed ? "mdi:shield-lock" : "mdi:shield-home-outline");
      badge.classList.toggle("armed", armed && !trig); badge.classList.toggle("trig", trig);
    } else $("secst").textContent = "Alarme indisponible";
    // bandeau sécurité (fuites + fumée) — toujours visible
    const g = this._groups();
    const cnt = (arr) => arr.reduce((n, e) => { const s = this._st(e); return n + (s && s.state === "on" ? 1 : 0); }, 0);
    const leakN = cnt(g.leak), smokeN = cnt(g.smoke), safe = $("safe");
    const cell = (icon, label, n, total, okIcon) => {
      const alert = n > 0;
      return `<div class="safei ${alert ? "alert" : "ok"}"><ha-icon icon="${alert ? icon : okIcon}"></ha-icon>` +
        `<div>${label}${alert ? "" : ""}<small>${alert ? n + " alerte" + (n > 1 ? "s" : "") : (total ? "OK · " + total : "—")}</small></div></div>`;
    };
    let cells = "";
    if (g.leak.length) cells += cell("mdi:water-alert", "Fuite d'eau", leakN, g.leak.length, "mdi:water-check");
    if (g.smoke.length) cells += cell("mdi:smoke-detector-variant-alert", "Fumée", smokeN, g.smoke.length, "mdi:smoke-detector-variant");
    safe.innerHTML = cells; safe.hidden = !cells;
    // ouvertures + mouvement actifs
    const sens = $("sens"); const chips = [];
    g.door.forEach((e) => { const s = this._st(e); if (s && s.state === "on") chips.push(`<div class="sp open"><ha-icon icon="${/(fenetre|window)/i.test(e) ? "mdi:window-open-variant" : "mdi:door-open"}"></ha-icon>${this._nm(s, e)}</div>`); });
    const motN = cnt(g.motion);
    if (chips.length || motN || g.door.length) {
      sens.hidden = false;
      if (!chips.length && g.door.length) chips.unshift(`<div class="sp"><ha-icon icon="mdi:check-circle"></ha-icon>Tout fermé (${g.door.length})</div>`);
      if (motN) chips.push(`<div class="sp motion"><ha-icon icon="mdi:motion-sensor"></ha-icon>${motN} mouvement${motN > 1 ? "s" : ""}</div>`);
      sens.innerHTML = chips.join("");
    } else sens.hidden = true;
    // caméras + badge présence (Frigate)
    this._cams.forEach((eid) => {
      const d = this.shadowRoot.querySelector(`.cam[data-e="${eid}"]`); if (!d) return;
      const s = this._st(eid), img = d.querySelector("img"), lab = d.querySelector("span");
      if (s) { lab.textContent = s.attributes.friendly_name || eid; const p = s.attributes.entity_picture; if (p) { const bust = Math.floor(Date.now() / 10000); if (img.dataset.b != bust) { img.dataset.b = bust; img.src = p + (p.includes("?") ? "&" : "?") + "_=" + bust; } } }
      const oid = eid.split(".")[1], pers = this._st("binary_sensor." + oid + "_person_occupancy");
      d.querySelector(".pers").classList.toggle("on", !!(pers && pers.state === "on"));
    });
  }
  _nm(s, e) { let n = (this._config.names && this._config.names[e]) || (s && s.attributes.friendly_name) || e; return n.replace(/\s+(Fumée|Humidité|Porte|Mouvement|Contact externe.*|Alerte contact.*|Water leak|Smoke|Occupancy)$/i, "").trim(); }
  _alarm(svc) { const c = this._config; const data = { entity_id: c.alarm_entity }; if (c.code != null) data.code = String(c.code); this._hass.callService("alarm_control_panel", svc, data); }
  _buildBar() {
    const c = this._config; const al = this._st(c.alarm_entity); const feat = al ? (al.attributes.supported_features || 0) : 15;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      @keyframes jma-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
      @keyframes jma-flash{0%,100%{background:#ff3b30;}50%{background:#c1271f;}}
      .sbalert{display:flex;align-items:center;gap:12px;background:#ff3b30;color:#fff;border-radius:15px;padding:14px 17px;margin:8px 12px 2px;animation:jma-flash 1s infinite;box-shadow:0 6px 22px rgba(255,59,48,.4);}
      .sbalert[hidden]{display:none;}
      .sbalert ha-icon{--mdc-icon-size:30px;flex:none;animation:jma-pulse 1s infinite;}
      .sbalert .at{font-weight:900;font-size:1rem;line-height:1.2;letter-spacing:.2px;}
      .sbalert .as{font-size:.74rem;font-weight:600;opacity:.92;}
      .secbar{display:flex;align-items:center;gap:13px;flex-wrap:wrap;padding:11px 14px;}
      .sbstate{display:flex;align-items:center;gap:10px;flex:none;}
      .sbbadge{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--jma-surf3);flex:none;transition:background .3s;}
      .sbbadge ha-icon{--mdc-icon-size:25px;color:var(--jma-icon);}
      .sbbadge.armed{background:linear-gradient(135deg,#34c759,#28a04a);}.sbbadge.armed ha-icon{color:#fff;}
      .sbbadge.trig{background:#ff3b30;animation:jma-pulse 1s infinite;}.sbbadge.trig ha-icon{color:#fff;}
      .sbst{font-weight:800;font-size:1.02rem;display:block;line-height:1.12;}
      .sbsub{font-size:.7rem;opacity:.6;font-weight:600;}
      .sbarm{display:flex;gap:6px;flex-wrap:wrap;}
      .sbab{padding:9px 13px;border-radius:12px;border:1px solid var(--jma-surf3);background:transparent;color:var(--jma-text);font-weight:700;font-size:.76rem;cursor:pointer;display:flex;align-items:center;gap:5px;transition:transform .08s;}
      .sbab:active{transform:scale(.95);}.sbab ha-icon{--mdc-icon-size:17px;}
      .sbab.on{background:var(--jma-grad);border-color:transparent;color:var(--jma-dark);}
      .sbtest{display:flex;align-items:center;gap:5px;padding:8px 12px;border-radius:11px;border:1px dashed var(--jma-rose);background:transparent;color:var(--jma-rose);font-weight:800;font-size:.72rem;cursor:pointer;}
      .sbtest ha-icon{--mdc-icon-size:16px;}
      .sbpills{display:flex;gap:7px;flex-wrap:wrap;margin-left:auto;}
      .sbp{display:flex;align-items:center;gap:5px;padding:7px 11px;border-radius:999px;background:var(--jma-surf3);font-size:.74rem;font-weight:800;color:var(--jma-text);}
      .sbp ha-icon{--mdc-icon-size:16px;color:var(--jma-icon);}
      .sbp.ok{color:#2ba24a;}.sbp.ok ha-icon{color:#34c759;}
      .sbp.alert{background:#ff3b30;color:#fff;animation:jma-pulse 1.1s infinite;}.sbp.alert ha-icon{color:#fff;}
      .sbp.live{background:rgba(106,163,255,.2);color:#3d7fe0;}.sbp.live ha-icon{color:#6aa3ff;}
      .sbp.warn{background:rgba(255,159,10,.2);color:#b87200;}.sbp.warn ha-icon{color:#ff9f0a;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
      <div class="sbalert" id="sbalert" hidden></div>
      <div class="secbar">
        <div class="sbstate"><div class="sbbadge" id="sbbadge"><ha-icon id="sbic" icon="mdi:shield-home"></ha-icon></div>
          <div><b class="sbst" id="sbst">—</b><span class="sbsub" id="sbsub"></span></div></div>
        <div class="sbarm" id="sbarm"></div>
        <div class="sbpills" id="sbpills"></div>
      </div></div></div></ha-card>`;
    const arm = this.shadowRoot.getElementById("sbarm");
    const modes = [["alarm_disarm", "Désarmer", "disarmed", "mdi:shield-off-outline"]];
    if (feat & 2) modes.push(["alarm_arm_away", "Absent", "armed_away", "mdi:shield-lock"]);
    if (feat & 1) modes.push(["alarm_arm_home", "Maison", "armed_home", "mdi:shield-home"]);
    if (feat & 4) modes.push(["alarm_arm_night", "Nuit", "armed_night", "mdi:weather-night"]);
    modes.forEach(([svc, label, st, icon]) => { const b = document.createElement("button"); b.className = "sbab"; b.dataset.st = st; b.innerHTML = `<ha-icon icon="${icon}"></ha-icon>${label}`; b.addEventListener("click", () => this._alarm(svc)); arm.appendChild(b); });
    const g = this._groups();
    this._barPills = [
      { list: g.leak, ok: "mdi:water-check", al: "mdi:water-alert", mode: "alert", title: "Fuites d'eau", icon: "mdi:water" },
      { list: g.smoke, ok: "mdi:smoke-detector-variant", al: "mdi:smoke-detector-variant-alert", mode: "alert", title: "Fumée / Incendie", icon: "mdi:smoke-detector-variant" },
      { list: g.door, ok: "mdi:door-closed", al: "mdi:door-open", mode: "warn", title: "Ouvertures", icon: "mdi:door" },
      { list: g.motion, ok: "mdi:motion-sensor-off", al: "mdi:motion-sensor", mode: "live", title: "Mouvement", icon: "mdi:motion-sensor" },
      { list: g.occupancy, ok: "mdi:account-off", al: "mdi:account-alert", mode: "live", title: "Présence", icon: "mdi:account" },
    ].filter((p) => p.list.length);
    this._critical = [
      { list: g.leak, label: "FUITE D'EAU", icon: "mdi:water-alert" },
      { list: g.smoke, label: "FUMÉE / INCENDIE", icon: "mdi:smoke-detector-variant-alert" },
    ];
    const ph = this.shadowRoot.getElementById("sbpills");
    this._barPills.forEach((p) => { const el = document.createElement("div"); el.className = "sbp"; el.style.cursor = "pointer"; el.innerHTML = `<ha-icon class="i"></ha-icon><span class="v"></span>`;
      el.addEventListener("click", () => this._openSecList(p)); ph.appendChild(el); p.el = el; });
    if (c.test) { const tb = document.createElement("button"); tb.className = "sbtest"; tb.innerHTML = `<ha-icon icon="mdi:flask-outline"></ha-icon>Test alerte`;
      tb.addEventListener("click", () => this._simulateAlert()); this.shadowRoot.querySelector(".secbar").appendChild(tb); }
  }
  _simulateAlert() {
    this._simUntil = Date.now() + 12000; this._updateBar();
    try { window.dispatchEvent(new CustomEvent("jma-test-alert")); } catch (e) {}
    clearTimeout(this._simTimer); this._simTimer = setTimeout(() => { this._simUntil = 0; this._updateBar(); }, 12000);
  }
  _openSecList(p) {
    if (this._popup) return; const c = this._config;
    const pop = document.createElement("jma-card-popup");
    pop.config = { kind: "seclist", title: p.title, icon: p.icon, entities: p.list, mode: p.mode, names: c.names, color: c.color, accent: c.accent, dark: c.dark, theme: c.theme };
    pop.hass = this._hass; pop.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(pop); this._popup = pop;
  }
  _updateBar() {
    const al = this._st(this._config.alarm_entity);
    if (al) {
      const armed = ("" + al.state).startsWith("armed"), trig = al.state === "triggered";
      this.shadowRoot.getElementById("sbst").textContent = ALARM_FR[al.state] || al.state;
      this.shadowRoot.getElementById("sbsub").textContent = trig ? "⚠ Intrusion détectée" : armed ? "Système armé" : "Système désarmé";
      this.shadowRoot.getElementById("sbic").setAttribute("icon", trig ? "mdi:shield-alert" : armed ? "mdi:shield-lock" : "mdi:shield-home-outline");
      const bd = this.shadowRoot.getElementById("sbbadge"); bd.classList.toggle("armed", armed && !trig); bd.classList.toggle("trig", trig);
      this.shadowRoot.querySelectorAll(".sbab").forEach((b) => b.classList.toggle("on", al.state === b.dataset.st));
    }
    const sim = this._simUntil && Date.now() < this._simUntil;
    (this._barPills || []).forEach((p) => {
      const n = p.list.reduce((a, e) => a + (this._st(e) && this._st(e).state === "on" ? 1 : 0), 0);
      const active = n > 0;
      p.el.classList.remove("ok", "alert", "live", "warn");
      p.el.classList.add(active ? p.mode : "ok");
      p.el.querySelector(".i").setAttribute("icon", active ? p.al : p.ok);
      p.el.querySelector(".v").textContent = active ? (p.mode === "alert" ? "!" : n) : "✓";
    });
    if (sim) { const lp = (this._barPills || []).find((p) => p.mode === "alert"); if (lp) { lp.el.classList.remove("ok", "live", "warn"); lp.el.classList.add("alert"); lp.el.querySelector(".i").setAttribute("icon", lp.al); lp.el.querySelector(".v").textContent = "!"; } }
    // le bandeau d'alerte est désormais global (dock de navigation), visible sur toutes les pages
  }
  _buildPanel() {
    const c = this._config; const al = this._st(c.alarm_entity); const feat = al ? (al.attributes.supported_features || 0) : 15;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      @keyframes jma-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
      .secpanel{display:flex;flex-direction:column;gap:13px;padding:14px;box-sizing:border-box;max-width:100%;overflow:hidden;}
      .spa{display:flex;align-items:center;gap:12px;}
      .spabadge{width:50px;height:50px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:var(--jma-surf3);flex:none;transition:background .3s;}
      .spabadge ha-icon{--mdc-icon-size:28px;color:var(--jma-icon);}
      .spabadge.armed{background:linear-gradient(135deg,#34c759,#28a04a);}.spabadge.armed ha-icon{color:#fff;}
      .spabadge.trig{background:#ff3b30;animation:jma-pulse 1s infinite;}.spabadge.trig ha-icon{color:#fff;}
      .spast b{font-weight:800;font-size:1.22rem;display:block;}.spast small{font-size:.78rem;opacity:.62;font-weight:600;}
      .sparm{display:flex;gap:7px;flex-wrap:wrap;}
      .sparmb{flex:1;min-width:64px;padding:11px 6px;border:1px solid var(--jma-surf3);border-radius:13px;cursor:pointer;background:transparent;color:var(--jma-text);font-weight:700;font-size:.75rem;display:flex;flex-direction:column;align-items:center;gap:3px;transition:transform .08s;}
      .sparmb:active{transform:scale(.95);}.sparmb ha-icon{--mdc-icon-size:21px;}
      .sparmb.on{background:var(--jma-grad);border-color:transparent;color:var(--jma-dark);box-shadow:0 3px 10px rgba(0,0,0,.08);}
      .splbl{font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--jma-text);opacity:.72;margin:7px 0 -3px;display:flex;align-items:center;gap:6px;}
      .splbl::before{content:"";width:3px;height:13px;border-radius:2px;background:var(--jma-rose);}
      .spzones{display:flex;gap:6px;flex-wrap:wrap;}
      .spz{padding:8px 12px;border-radius:11px;background:transparent;border:1px solid var(--jma-surf3);color:var(--jma-text);font-size:.76rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;}
      .spz ha-icon{--mdc-icon-size:15px;}.spz.armed{background:var(--jma-grad);border-color:transparent;color:var(--jma-dark);}
      .spgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      @media(max-width:620px){.spgrid{grid-template-columns:1fr;}}
      .spi{display:flex;align-items:center;gap:9px;background:var(--jma-surf2);border-radius:13px;padding:9px 11px;border:1px solid var(--jma-surf3);min-width:0;transition:border-color .3s,background .3s;}
      .spi .si{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--jma-surf3);flex:none;}
      .spi .si ha-icon{--mdc-icon-size:17px;color:var(--jma-icon);}
      .spi.ok .si{background:rgba(52,199,89,.16);}.spi.ok .si ha-icon{color:#34c759;}
      .spi .sn{flex:1;min-width:0;font-weight:700;font-size:.8rem;color:var(--jma-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .spi .sv{font-size:.62rem;font-weight:800;white-space:nowrap;padding:3px 9px;border-radius:999px;background:var(--jma-surf3);color:var(--jma-icon);flex:none;}
      .spi.ok .sv{background:rgba(52,199,89,.16);color:#2ba24a;}
      .spi.alert{border-color:#ff3b30;background:rgba(255,59,48,.13);}
      .spi.alert .si{background:#ff3b30;}.spi.alert .si ha-icon{color:#fff;}.spi.alert .sv{background:#ff3b30;color:#fff;}
      .spi.live{border-color:#6aa3ff;background:rgba(106,163,255,.14);}
      .spi.live .si{background:#6aa3ff;}.spi.live .si ha-icon{color:#fff;}.spi.live .sv{background:#6aa3ff;color:#fff;}
      .spi.warn{border-color:#ff9f0a;background:rgba(255,159,10,.14);}
      .spi.warn .si{background:#ff9f0a;}.spi.warn .si ha-icon{color:#3a2400;}.spi.warn .sv{background:#ff9f0a;color:#3a2400;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="secpanel">
        <div class="spa"><div class="spabadge" id="badge"><ha-icon id="bic" icon="mdi:shield-home"></ha-icon></div>
          <div class="spast"><b id="st">—</b><small id="sub"></small></div></div>
        <div class="sparm" id="arm"></div>
        <div class="splbl" id="zlbl" hidden>Zones</div>
        <div class="spzones" id="zones"></div>
        <div id="sections"></div>
      </div></ha-card>`;
    const arm = this.shadowRoot.getElementById("arm");
    const modes = [["alarm_disarm", "Désarmer", "disarmed", "mdi:shield-off-outline", true]];
    if (feat & 2) modes.push(["alarm_arm_away", "Absent", "armed_away", "mdi:shield-lock", true]);
    if (feat & 1) modes.push(["alarm_arm_home", "Maison", "armed_home", "mdi:shield-home", true]);
    if (feat & 4) modes.push(["alarm_arm_night", "Nuit", "armed_night", "mdi:weather-night", true]);
    modes.forEach(([svc, label, st, icon]) => { const b = document.createElement("button"); b.className = "sparmb"; b.dataset.st = st; b.innerHTML = `<ha-icon icon="${icon}"></ha-icon>${label}`; b.addEventListener("click", () => this._alarm(svc)); arm.appendChild(b); });
  }
  _buildSections() {
    this._secsBuilt = true; const g = this._groups(); const host = this.shadowRoot.getElementById("sections"); host.innerHTML = ""; this._secItems = [];
    const sect = (title, list, okIcon, alertIcon, okWord) => {
      if (!list.length) return;
      const l = document.createElement("div"); l.className = "splbl"; l.textContent = title; host.appendChild(l);
      const grid = document.createElement("div"); grid.className = "spgrid"; host.appendChild(grid);
      list.forEach((e) => { const s = this._st(e); if (!s) return; const it = document.createElement("div"); it.className = "spi";
        it.innerHTML = `<div class="si"><ha-icon class="sic"></ha-icon></div><div class="sn">${this._nm(s, e)}</div><div class="sv"></div>`;
        grid.appendChild(it); this._secItems.push({ e, it, okIcon, alertIcon, okWord }); });
    };
    sect("💧 Fuites d'eau", g.leak, "mdi:water-check", "mdi:water-alert", "Sec");
    sect("🔥 Fumée / Incendie", g.smoke, "mdi:smoke-detector-variant", "mdi:smoke-detector-variant-alert", "RAS");
    sect("🚪 Ouvertures", g.door, "mdi:door-closed", "mdi:door-open", "Fermé");
    sect("🏃 Mouvement", g.motion, "mdi:motion-sensor-off", "mdi:motion-sensor", "Calme");
    // présence (Frigate) — bleu quand détectée (pas une alerte)
    this._occItems = [];
    if (g.occupancy.length) {
      const l = document.createElement("div"); l.className = "splbl"; l.textContent = "👁️ Présence détectée"; host.appendChild(l);
      const grid = document.createElement("div"); grid.className = "spgrid"; host.appendChild(grid);
      g.occupancy.forEach((e) => { const s = this._st(e); if (!s) return; const it = document.createElement("div"); it.className = "spi";
        it.innerHTML = `<div class="si"><ha-icon class="sic" icon="mdi:account"></ha-icon></div><div class="sn">${this._nm(s, e)}</div><div class="sv"></div>`;
        grid.appendChild(it); this._occItems.push({ e, it }); });
    }
    // système : sabotage + batteries (agrégés)
    this._sysItems = [];
    if (g.tamper.length || g.battery.length) {
      const l = document.createElement("div"); l.className = "splbl"; l.textContent = "🔧 Système"; host.appendChild(l);
      const grid = document.createElement("div"); grid.className = "spgrid"; host.appendChild(grid);
      if (g.tamper.length) { const it = document.createElement("div"); it.className = "spi";
        it.innerHTML = `<div class="si"><ha-icon class="sic" icon="mdi:shield-check"></ha-icon></div><div class="sn">Sabotage</div><div class="sv"></div>`;
        grid.appendChild(it); this._sysItems.push({ list: g.tamper, it, kind: "tamper" }); }
      if (g.battery.length) { const it = document.createElement("div"); it.className = "spi";
        it.innerHTML = `<div class="si"><ha-icon class="sic" icon="mdi:battery"></ha-icon></div><div class="sn">Batteries</div><div class="sv"></div>`;
        grid.appendChild(it); this._sysItems.push({ list: g.battery, it, kind: "battery" }); }
    }
    this._secTick = () => {
      this._secItems.forEach(({ e, it, okIcon, alertIcon, okWord }) => { const s = this._st(e); if (!s) return; const on = s.state === "on";
        it.classList.toggle("alert", on); it.classList.toggle("ok", !on); it.querySelector(".sic").setAttribute("icon", on ? alertIcon : okIcon);
        it.querySelector(".sv").textContent = on ? "⚠ ALERTE" : okWord; });
      this._occItems.forEach(({ e, it }) => { const s = this._st(e); if (!s) return; const on = s.state === "on";
        it.classList.toggle("live", on); it.classList.remove("ok");
        it.querySelector(".sic").setAttribute("icon", on ? "mdi:account-alert" : "mdi:account-off");
        it.querySelector(".sv").textContent = on ? "● Détecté" : "—"; });
      this._sysItems.forEach(({ list, it, kind }) => { const n = list.reduce((a, e) => a + (this._st(e) && this._st(e).state === "on" ? 1 : 0), 0);
        if (kind === "tamper") { it.classList.toggle("alert", n > 0); it.classList.toggle("ok", n === 0);
          it.querySelector(".sic").setAttribute("icon", n > 0 ? "mdi:shield-alert" : "mdi:shield-check");
          it.querySelector(".sv").textContent = n > 0 ? n + " ⚠" : "OK"; }
        else { it.classList.toggle("warn", n > 0); it.classList.toggle("ok", n === 0);
          it.querySelector(".sic").setAttribute("icon", n > 0 ? "mdi:battery-alert" : "mdi:battery");
          it.querySelector(".sv").textContent = n > 0 ? n + " faible" + (n > 1 ? "s" : "") : "OK"; } });
    };
  }
  _updatePanel() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    const al = this._st(this._config.alarm_entity);
    if (al) {
      const armed = ("" + al.state).startsWith("armed"), trig = al.state === "triggered";
      $("st").textContent = ALARM_FR[al.state] || al.state;
      $("sub").textContent = trig ? "⚠ Intrusion détectée" : armed ? "Système armé" : "Système désarmé";
      $("bic").setAttribute("icon", trig ? "mdi:shield-alert" : armed ? "mdi:shield-lock" : "mdi:shield-home-outline");
      const bd = $("badge"); bd.classList.toggle("armed", armed && !trig); bd.classList.toggle("trig", trig);
      this.shadowRoot.querySelectorAll(".sparmb").forEach((b) => b.classList.toggle("on", al.state === b.dataset.st));
    }
    const zones = (this._config.subzones || []).filter((e) => this._st(e));
    if (zones.length) {
      $("zlbl").hidden = false; const zwrap = $("zones");
      if (!this._zonesBuilt) { this._zonesBuilt = true; zwrap.innerHTML = "";
        zones.forEach((e) => { const b = document.createElement("button"); b.className = "spz"; b.dataset.e = e; b.innerHTML = `<ha-icon icon="mdi:shield"></ha-icon><span class="zn"></span>`;
          b.addEventListener("click", () => { const s = this._st(e); const armed = ("" + s.state).startsWith("armed"); const data = { entity_id: e }; if (this._config.code != null) data.code = String(this._config.code); this._hass.callService("alarm_control_panel", armed ? "alarm_disarm" : "alarm_arm_away", data); }); zwrap.appendChild(b); });
      }
      zones.forEach((e) => { const b = $("zones").querySelector(`.spz[data-e="${e}"]`); const s = this._st(e); if (!b || !s) return; b.classList.toggle("armed", ("" + s.state).startsWith("armed")); b.querySelector(".zn").textContent = (s.attributes.friendly_name || e).replace(/^maison\s*/i, "") || "Maison"; });
    }
    if (!this._secsBuilt) this._buildSections();
    if (this._secTick) this._secTick();
  }
}
jmaDef("jma-security-card", JmaSecurityCard);

// =============================================================================
//  🌙 MODE VEILLE (économiseur d'écran tablette)
// =============================================================================
class JmaScreensaverCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; this._idle = 0; this._shift = 0; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, timeout: 3, show_date: true, days: 7, ...c }; this._cals = c.agenda_entities || c.calendars || []; }
  getCardSize() { return this._config && this._config.hide_tile ? 0 : 1; }
  static getStubConfig() { return { timeout: 3, weather_entity: "weather.maison" }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); if (!this._wakeSub && h && h.connection) this._subscribeWake(); }
  _subscribeWake() {
    this._wakeSub = true;
    // une notification (persistante) ou l'event jma_screensaver_wake ferme la veille
    const wake = () => { if (this._shown) this._hide(); };
    try { this._hass.connection.subscribeEvents(wake, "jma_screensaver_wake"); } catch (e) {}
    // une alerte ou un pop-up JMA réveille aussi la veille
    try { this._hass.connection.subscribeEvents(wake, "jma_alert"); } catch (e) {}
    try { this._hass.connection.subscribeEvents(wake, "jma_popup"); } catch (e) {}
    if (this._config.wake_on_notify !== false) {
      // toute notification persistante AJOUTÉE réveille la veille (API WS de collection)
      jmaSubPN(this._hass.connection, (msg) => {
        if (!msg || msg.type === "removed" || msg.type === "current") return;
        wake();
      });
    }
  }
  connectedCallback() { this._arm(); }
  disconnectedCallback() { this._disarm(); this._hide(); }
  _build() {
    const c = this._config;
    // hide_tile : arme la veille SANS afficher de tuile (utile pour la mettre sur toutes les vues)
    if (c.hide_tile) { this.style.display = "none"; this.shadowRoot.innerHTML = ""; return; }
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      .ssc{display:flex;align-items:center;gap:9px;cursor:pointer;}.ssc .badge{background:var(--jma-surf2);}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="ssc" id="ssc"><div class="badge"><ha-icon icon="mdi:weather-night"></ha-icon></div>
          <div class="meta"><div class="name">Mode veille</div><div class="sub">après ${c.timeout} min · toucher l'écran pour aperçu</div></div></div>
      </div></div></ha-card>`;
    const ssc = this.shadowRoot.getElementById("ssc");
    if (ssc) ssc.addEventListener("click", () => this._show());
  }
  _arm() {
    if (this._reset) return;
    this._reset = (e) => {
      // ne pas réveiller/fermer si l'interaction vient des boutons d'action
      if (this._actWrap && e && e.target && this._actWrap.contains && this._actWrap.contains(e.target)) return;
      this._idle = 0; if (this._shown) this._hide();
    };
    this._evs = ["pointerdown", "touchstart", "keydown", "mousemove", "wheel"];
    if (window.addEventListener) this._evs.forEach((ev) => window.addEventListener(ev, this._reset, { passive: true }));
    this._timer = setInterval(() => { this._idle++; if (!this._shown && this._idle >= (this._config.timeout || 3) * 60) this._show(); }, 1000);
  }
  _disarm() { if (this._reset && window.removeEventListener) this._evs.forEach((ev) => window.removeEventListener(ev, this._reset)); this._reset = null; clearInterval(this._timer); }
  _matchPanel() {
    const me = this._config.match_entity; const s = me && this._hass && this._hass.states[me];
    if (!s || ["NOT_FOUND", "BYE", "", "unavailable", "unknown"].includes(s.state)) return null;
    const panel = document.createElement("div"); panel.className = "ss-match";
    const logo = (u) => u ? `<img src="${u}" onerror="this.style.display='none'">` : "";
    const render = () => {
      const s2 = this._hass.states[me]; if (!s2) return; const a = s2.attributes; const st = s2.state;
      const live = st === "IN", half = st === "HALF", pre = st === "PRE", post = st === "POST";
      const status = pre ? ("Coup d'envoi" + (a.kickoff_in ? " · " + a.kickoff_in : ""))
        : half ? "MI-TEMPS" : post ? "TERMINÉ"
        : live ? ("EN DIRECT" + (a.clock ? " · " + a.clock : "")) : st;
      panel.innerHTML =
        `<div class="ssm-comp">${a.league_name || a.league || "Match"}</div>` +
        `<div class="ssm-row">` +
          `<div class="ssm-team">${logo(a.team_logo)}<div class="ssm-ab">${a.team_abbr || ""}</div></div>` +
          `<div class="ssm-score">${a.team_score != null ? a.team_score : "0"}<span class="ssm-dash">–</span>${a.opponent_score != null ? a.opponent_score : "0"}</div>` +
          `<div class="ssm-team">${logo(a.opponent_logo)}<div class="ssm-ab">${a.opponent_abbr || ""}</div></div>` +
        `</div>` +
        `<div class="ssm-status ${live ? "live" : ""}">${status}</div>` +
        (a.venue ? `<div class="ssm-venue">${a.venue}</div>` : "");
    };
    render(); clearInterval(this._matchTimer); this._matchTimer = setInterval(render, 4000);
    return panel;
  }
  _show() {
    if (this._shown) return; this._shown = true;
    // fermer tout pop-up JMA ouvert pour que la veille prenne le dessus proprement
    try { document.querySelectorAll("jma-card-popup").forEach((p) => { if (p && typeof p._close === "function") p._close(); else if (p && p.remove) p.remove(); }); } catch (e) {}
    const o = document.createElement("div");
    o.style.cssText = "position:fixed;inset:0;z-index:2147483600;background:radial-gradient(125% 120% at 50% 12%,#141826 0%,#080a11 60%,#000 100%);color:#fff;opacity:0;transition:opacity .7s ease;";
    const st = document.createElement("style");
    st.textContent = `
      .ss-wrap{position:absolute;inset:0;transition:transform 2.5s ease;}
      .ss-clock{position:absolute;top:3.6vh;left:3.4vw;text-align:left;}
      .ss-time{font-weight:200;font-size:8vw;line-height:.92;letter-spacing:-.3vw;opacity:.88;}
      .ss-date{font-size:1.6vw;opacity:.32;text-transform:capitalize;letter-spacing:.14vw;margin-top:.4vh;}
      .ss-saint{font-size:1.4vw;color:#f7b6cb;opacity:.6;margin-top:.5vh;font-weight:600;}
      .ss-center{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%);width:46vw;display:flex;flex-direction:column;align-items:center;gap:1.8vh;}
      .ss-glegend{display:flex;gap:3vw;font-size:2.4vw;font-weight:700;}
      .ss-gi{display:inline-flex;align-items:center;gap:1vw;opacity:.45;transition:opacity .4s;}
      .ss-gi.dom{opacity:1;}
      .ss-gd{width:1.5vw;height:1.5vw;border-radius:50%;flex:none;}
      .ss-ebar{width:100%;height:2.6vh;border-radius:99px;overflow:hidden;display:flex;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);}
      .ss-es{background:linear-gradient(90deg,#f6c0d4,#f8a5c2);transition:width .6s ease;}
      .ss-eg{background:linear-gradient(90deg,#8fb4ff,#5b9bff);transition:width .6s ease;}
      .ss-wx2{position:absolute;bottom:3vh;right:3vw;display:flex;align-items:center;gap:1.8vw;background:rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.07);border-radius:2vw;padding:1.3vh 2vw;}
      .ss-wnow{display:flex;align-items:center;gap:1.3vw;}
      .ss-wnow ha-icon{--mdc-icon-size:5.2vw;color:#cfe0ff;}
      .ss-wnow .wt{font-size:4.4vw;font-weight:300;line-height:1;}
      .ss-wnow .wd{font-size:1.35vw;opacity:.55;text-transform:capitalize;}
      .wfc{display:flex;gap:1vw;}
      .wfc .cell{display:flex;flex-direction:column;align-items:center;gap:.2vh;background:rgba(255,255,255,.05);border-radius:1.1vw;padding:.7vh 1.05vw;min-width:4.6vw;}
      .wfc .cell .ct{font-size:1.02vw;opacity:.5;text-transform:uppercase;letter-spacing:.05vw;}
      .wfc .cell ha-icon{--mdc-icon-size:2.2vw;color:#cfe0ff;}
      .wfc .cell .cv{font-size:1.5vw;font-weight:800;}
      .wfc .cell .cl{font-size:1.02vw;opacity:.5;}
      .wfc .cell.tomorrow{background:rgba(143,180,255,.13);border:1px solid rgba(143,180,255,.28);min-width:6.6vw;padding:.7vh 1.3vw;}
      .wfc .cell.tomorrow ha-icon{--mdc-icon-size:3vw;}
      .wfc .cell.tomorrow .cv{font-size:1.7vw;}
      .wfc .cell.tomorrow .cv .lo{opacity:.45;margin-left:.4vw;font-size:1.15vw;font-weight:600;}
      .wfc .cell.tomorrow .cl{font-size:1vw;max-width:8vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ss-agenda{position:absolute;left:3vw;bottom:3vh;display:flex;flex-direction:column;gap:.6vh;width:27vw;max-width:36vw;}
      .ss-ev{display:flex;align-items:center;gap:1vw;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);border-radius:1vw;padding:.5vh 1vw;}
      .ss-ev .day{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:4.6vw;height:4.2vw;line-height:1;flex:none;
        background:rgba(248,165,194,.14);border-radius:.7vw;}
      .ss-ev .day .dn{font-size:.78vw;font-weight:700;color:#f7b6cb;text-transform:uppercase;letter-spacing:.05vw;}
      .ss-ev .day .dd{font-size:1.6vw;font-weight:800;}
      .ss-ev .info{display:flex;flex-direction:column;min-width:0;flex:1;}
      .ss-ev .info .ti{font-size:1.2vw;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ss-ev .info .hr{font-size:.92vw;opacity:.5;}
      .ss-actions{position:absolute;top:3.2vh;right:3vw;display:flex;flex-direction:column;gap:1.2vh;align-items:flex-end;z-index:4;}
      .ss-act{display:inline-flex;align-items:center;gap:1vw;padding:1.2vh 2.2vw;border-radius:99px;cursor:pointer;
        background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:1.8vw;font-weight:700;transition:transform .1s,background .3s,border-color .3s;}
      .ss-act ha-icon{--mdc-icon-size:2.4vw;color:#f7b6cb;transition:color .3s;}
      .ss-act:active{transform:scale(.94);}
      .ss-act.done{background:rgba(120,220,150,.22);border-color:rgba(120,220,150,.5);}
      .ss-act.done ha-icon{color:#7fe0a0;}
      @keyframes ssm-blink{0%,100%{opacity:1}50%{opacity:.25}}
      .ss-match{position:absolute;top:49%;left:50%;transform:translate(-50%,-50%);text-align:center;
        background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.02));
        border:1px solid rgba(255,255,255,.09);border-radius:2.4vw;padding:3vh 4.5vw;
        display:flex;flex-direction:column;align-items:center;gap:1.4vh;}
      .ssm-comp{font-size:1.45vw;letter-spacing:.25vw;text-transform:uppercase;opacity:.5;font-weight:800;}
      .ssm-row{display:flex;align-items:center;gap:3.2vw;}
      .ssm-team{display:flex;flex-direction:column;align-items:center;gap:1vh;width:13vw;}
      .ssm-team img{height:8vw;width:8vw;object-fit:contain;filter:drop-shadow(0 4px 16px rgba(0,0,0,.55));}
      .ssm-ab{font-size:2.3vw;font-weight:800;letter-spacing:.1vw;}
      .ssm-score{font-size:8.5vw;font-weight:200;line-height:.9;letter-spacing:-.3vw;display:flex;align-items:center;gap:1.6vw;}
      .ssm-dash{opacity:.3;font-size:4.5vw;}
      .ssm-status{font-size:1.9vw;font-weight:700;opacity:.65;letter-spacing:.08vw;}
      .ssm-status.live{color:#36e07f;opacity:1;}
      .ssm-status.live::before{content:"\\25CF  ";animation:ssm-blink 1s infinite;}
      .ssm-venue{font-size:1.25vw;opacity:.32;}
    `;
    const wrap = document.createElement("div"); wrap.className = "ss-wrap";
    wrap.innerHTML =
      `<div class="ss-clock"><div class="ss-time" id="jct">--:--</div>${this._config.show_date ? `<div class="ss-date" id="jcd">—</div>` : ""}<div class="ss-saint" id="jcsaint"></div></div>` +
      `<div class="ss-center"><div class="ss-glegend" id="jcgl"></div><div class="ss-ebar"><div class="ss-es" id="jbs"></div><div class="ss-eg" id="jbg"></div></div></div>` +
      `<div class="ss-wx2" id="jcw" style="display:none"><div class="ss-wnow" id="jwnow"></div><div class="wfc" id="jwfc"></div></div>` +
      `<div class="ss-agenda" id="jca"></div>`;
    o.appendChild(st); o.appendChild(wrap);
    // panneau match (si un match est configuré) : prend le centre, masque la barre énergie
    const mp = this._matchPanel();
    if (mp) { o.appendChild(mp); const ctr = wrap.querySelector(".ss-center"); if (ctr) ctr.style.display = "none"; }
    o.addEventListener("pointerdown", (e) => { e.stopPropagation(); this._hide(); });
    // boutons d'action (haut-droite) : ne ferment PAS la veille
    const actions = this._config.actions || [];
    if (actions.length) {
      const aw = document.createElement("div"); aw.className = "ss-actions";
      ["pointerdown", "touchstart", "click"].forEach((ev) => aw.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
      actions.forEach((a) => {
        const b = document.createElement("button"); b.className = "ss-act";
        b.innerHTML = `<ha-icon icon="${a.icon || "mdi:gesture-tap-button"}"></ha-icon><span>${a.name || ""}</span>`;
        b.addEventListener("click", (e) => { e.stopPropagation(); this._runAction(a, b); });
        aw.appendChild(b);
      });
      o.appendChild(aw); this._actWrap = aw;
    }
    document.body.appendChild(o); this._ovl = o; this._clkEl = wrap;
    if (window.requestAnimationFrame) requestAnimationFrame(() => { o.style.opacity = "1"; }); else o.style.opacity = "1";
    this._paint(); this._clk = setInterval(() => this._paint(), 1000);
    this._fetchAgenda(); this._agTimer = setInterval(() => this._fetchAgenda(), 300000);
    this._fetchForecast(); this._fcTimer = setInterval(() => this._fetchForecast(), 1800000);
  }
  async _paintGraph() {
    const host = this._ovl && this._ovl.querySelector("#jcg"); if (!host) return;
    const prodE = this._config.production_entity, gridE = this._config.grid_entity, consoE = this._config.consumption_entity;
    const ents = [prodE, gridE, consoE].filter(Boolean); if (!ents.length) { host.innerHTML = `<div class="ss-gmsg">Énergie non configurée</div>`; return; }
    const hours = this._config.graph_hours || 6;
    let res; try { res = await jmaHistory(this._hass, ents, hours); } catch (e) { return; }
    if (!this._ovl) return;
    const byEnt = {}; (res || []).forEach((arr) => { if (arr && arr.length) byEnt[arr[0].entity_id] = arr; });
    const toPts = (eid) => { const a = byEnt[eid] || []; return a.map((p) => ({ t: new Date(p.last_changed || p.lc || p.lu).getTime(), v: parseFloat(p.state) })).filter((p) => !isNaN(p.v) && !isNaN(p.t)); };
    const solP = prodE ? toPts(prodE) : [], gridP = gridE ? toPts(gridE) : [], consP = consoE ? toPts(consoE) : [];
    let tMin = Infinity, tMax = -Infinity;
    [solP, gridP, consP].forEach((a) => a.forEach((p) => { tMin = Math.min(tMin, p.t); tMax = Math.max(tMax, p.t); }));
    if (!isFinite(tMin) || tMin === tMax) { host.innerHTML = `<div class="ss-gmsg">Pas encore d'historique</div>`; return; }
    const N = 64, span = (tMax - tMin) || 1;
    const bucket = (pts) => { const b = Array.from({ length: N }, () => ({ s: 0, n: 0 })); pts.forEach((p) => { const i = Math.min(N - 1, Math.floor((p.t - tMin) / span * N)); b[i].s += p.v; b[i].n++; }); const out = []; let last = pts.length ? pts[0].v : 0; for (let i = 0; i < N; i++) { if (b[i].n) last = b[i].s / b[i].n; out.push(Math.max(0, last)); } return out; };
    const sol = bucket(solP);
    let conso; if (consoE && consP.length) conso = bucket(consP); else { const gb = bucket(gridP); conso = sol.map((v, i) => v + (gb[i] || 0)); }
    let vMax = 1; sol.forEach((v) => vMax = Math.max(vMax, v)); conso.forEach((v) => vMax = Math.max(vMax, v));
    const W = 1000, H = 300, pad = 8;
    const sx = (i) => pad + (i / (N - 1)) * (W - 2 * pad);
    const sy = (v) => H - pad - (v / vMax) * (H - 2 * pad);
    const line = (arr) => arr.map((v, i) => (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(v).toFixed(1)).join(" ");
    const dSol = line(sol), dCon = line(conso);
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs>` +
      `<linearGradient id="jgsol" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f8a5c2" stop-opacity=".55"/><stop offset="1" stop-color="#f8a5c2" stop-opacity="0"/></linearGradient></defs>` +
      `<path d="${dSol} L ${sx(N - 1).toFixed(1)} ${H - pad} L ${sx(0).toFixed(1)} ${H - pad} Z" fill="url(#jgsol)"/>` +
      `<path d="${dSol}" fill="none" stroke="#f8a5c2" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<path d="${dCon}" fill="none" stroke="#7fb0ff" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }
  async _fetchForecast() {
    const e = this._config.weather_entity; if (!e || !this._hass) return;
    const get = async (type) => {
      try { const r = await this._hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type }, target: { entity_id: e }, return_response: true }); return (r && r.response && r.response[e] && r.response[e].forecast) || []; } catch (_) { return null; }
    };
    let daily = await get("daily");
    if (daily == null) { const s = this._hass.states[e]; daily = (s && s.attributes.forecast) || []; }
    let hourly = await get("hourly"); if (hourly == null) hourly = [];
    this._fcDaily = daily; this._fcHourly = hourly; this._renderWeather();
  }
  _renderWeather() {
    const host = this._ovl && this._ovl.querySelector("#jwfc"); if (!host) return;
    const daily = this._fcDaily || [], hourly = this._fcHourly || [];
    const t = (v) => v != null ? Math.round(v) + "°" : "—";
    const cells = [];
    if (daily[0]) cells.push(`<div class="cell"><div class="ct">Auj.</div><div class="cv">${t(daily[0].temperature)}</div><div class="cl">${t(daily[0].templow)}</div></div>`);
    const now = Date.now();
    const fut = hourly.filter((h) => new Date(h.datetime).getTime() > now);
    [1, 3].forEach((i) => { const h = fut[i]; if (h) { const dt = new Date(h.datetime); cells.push(`<div class="cell"><div class="ct">${("0" + dt.getHours()).slice(-2)}h</div><ha-icon icon="${WEATHER_ICON[h.condition] || "mdi:weather-partly-cloudy"}"></ha-icon><div class="cv">${t(h.temperature)}</div></div>`); } });
    if (daily[1]) { const d1 = daily[1]; cells.push(`<div class="cell tomorrow"><div class="ct">Demain</div><ha-icon icon="${WEATHER_ICON[d1.condition] || "mdi:weather-partly-cloudy"}"></ha-icon><div class="cv">${t(d1.temperature)}<span class="lo">${t(d1.templow)}</span></div><div class="cl">${WEATHER_FR[d1.condition] || d1.condition || ""}</div></div>`); }
    host.innerHTML = cells.join("");
  }
  _runAction(a, b) {
    try {
      if (a.scene) this._hass.callService("scene", "turn_on", { entity_id: a.scene });
      else if (a.script && a.script.includes(".")) this._hass.callService("script", "turn_on", { entity_id: a.script });
      else if (a.script) this._hass.callService("script", a.script, {});
      else if (a.service) { const p = a.service.split("."); this._hass.callService(p[0], p[1], a.service_data || a.data || {}); }
      else if (a.entity) { const d = a.entity.split(".")[0]; if (d === "button") this._hass.callService("button", "press", { entity_id: a.entity }); else if (d === "script") this._hass.callService("script", "turn_on", { entity_id: a.entity }); else if (d === "scene") this._hass.callService("scene", "turn_on", { entity_id: a.entity }); else this._hass.callService("homeassistant", "toggle", { entity_id: a.entity }); }
      if (window.jmaToast) jmaToast({ title: a.name || "Action", message: "✓ Envoyé", icon: a.icon || "mdi:check", color: a.color || this._config.color });
      if (b) { b.classList.add("done"); setTimeout(() => b && b.classList.remove("done"), 1300); }
    } catch (e) {}
  }
  _shiftClock() { if (!this._clkEl) return; const x = ((this._shift) % 2 ? 1 : -1) * 4; const y = ((this._shift++) % 3 - 1) * 4; this._clkEl.style.transform = `translate(${x}vw,${y}vh)`; }
  _wsv(k) { const e = this._config[k]; const s = e && this._hass && this._hass.states[e]; if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  _paint() {
    if (!this._ovl) return;
    const d = new Date(), hh = ("0" + d.getHours()).slice(-2), mm = ("0" + d.getMinutes()).slice(-2);
    const ct = this._ovl.querySelector("#jct"); if (ct) ct.textContent = hh + ":" + mm;
    const cd = this._ovl.querySelector("#jcd"); if (cd) cd.textContent = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const cs = this._ovl.querySelector("#jcsaint");
    if (cs && typeof SAINTS !== "undefined") {
      let saint; const se = this._config.saint_entity;
      if (se && this._hass && this._hass.states[se]) saint = this._hass.states[se].state;
      else { const arr = SAINTS[d.getMonth()]; saint = (arr && arr[d.getDate() - 1]) || ""; }
      if (saint && !["unknown", "unavailable", ""].includes(saint)) {
        const special = /^(N\.-D\.|Toussaint|Défunts|Assomption|Annonciation|Présentation|Transfiguration|Nativité|La Sainte|Imm\.|Noël|Conversion|Marie$)/.test(saint);
        cs.textContent = "✦ " + (special ? saint : "St" + (/^[AÉEIOUYH]/i.test(saint) ? "e " : " ") + saint);
      } else cs.textContent = "";
    }
    const cw = this._ovl.querySelector("#jcw"); const nowEl = this._ovl.querySelector("#jwnow");
    const w = this._config.weather_entity && this._hass && this._hass.states[this._config.weather_entity];
    if (cw) {
      if (w && nowEl) {
        const t = w.attributes.temperature;
        nowEl.innerHTML = `<ha-icon icon="${WEATHER_ICON[w.state] || "mdi:weather-partly-cloudy"}"></ha-icon>` +
          `<div><div class="wt">${t != null ? Math.round(t) + "°" : "—"}</div><div class="wd">${WEATHER_FR[w.state] || w.state}</div></div>`;
        cw.style.display = "flex";
      } else cw.style.display = "none";
    }
    // barre solaire (rose) vs réseau EDF (bleu) + couleur de l'heure selon la dominance
    const gl = this._ovl.querySelector("#jcgl"), bs = this._ovl.querySelector("#jbs"), bg = this._ovl.querySelector("#jbg");
    const f = (v) => Math.round(v).toLocaleString("fr-FR").replace(/ | /g, " ") + " W";
    const sol = this._wsv("production_entity"), grid = this._wsv("grid_entity");
    const s = Math.max(0, sol || 0), g = Math.max(0, grid || 0), tot = Math.max(s + g, 1);
    const solarDom = s >= g;
    if (bs) bs.style.width = (s / tot * 100) + "%";
    if (bg) bg.style.width = (g / tot * 100) + "%";
    if (gl) {
      const parts = [];
      if (sol != null) parts.push(`<span class="ss-gi${solarDom ? " dom" : ""}"><span class="ss-gd" style="background:#f8a5c2"></span>Solaire ${f(s)}</span>`);
      if (grid != null) parts.push(`<span class="ss-gi${!solarDom ? " dom" : ""}"><span class="ss-gd" style="background:#5b9bff"></span>Réseau ${f(g)}</span>`);
      gl.innerHTML = parts.join("");
    }
    const ct2 = this._ovl.querySelector("#jct");
    if (ct2 && (sol != null || grid != null)) ct2.style.color = solarDom ? "#f8a5c2" : "#6aa3ff";
  }
  async _fetchAgenda() {
    if (!this._cals.length || !this._hass) return;
    const start = new Date(), end = new Date(); end.setDate(end.getDate() + (this._config.days || 7));
    const iso = (d) => d.toISOString(); const evs = [];
    try { for (const cal of this._cals) { const r = await this._hass.callApi("GET", `calendars/${cal}?start=${encodeURIComponent(iso(start))}&end=${encodeURIComponent(iso(end))}`); (r || []).forEach((e) => evs.push(e)); } } catch (e) {}
    const now = Date.now();
    this._events = evs.map((e) => { const s = e.start && (e.start.dateTime || e.start.date); return { d: new Date(s), allday: !(e.start && e.start.dateTime), t: e.summary || e.message || "(sans titre)" }; })
      .filter((x) => !isNaN(x.d) && x.d.getTime() > now - 3600000).sort((a, b) => a.d - b.d).slice(0, 4);
    this._renderAgenda();
  }
  _renderAgenda() {
    const ca = this._ovl && this._ovl.querySelector("#jca"); if (!ca) return;
    if (!this._events || !this._events.length) { ca.innerHTML = ""; return; }
    const dn = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
    const n = new Date(), today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    ca.innerHTML = this._events.map((e) => {
      const ed = new Date(e.d.getFullYear(), e.d.getMonth(), e.d.getDate());
      const diff = Math.round((ed - today) / 86400000);
      const lbl = diff === 0 ? "AUJ" : diff === 1 ? "DEM" : dn[e.d.getDay()];
      const hr = e.allday ? `<ha-icon icon="mdi:white-balance-sunny" style="--mdc-icon-size:1.3vw"></ha-icon>Journée` : `<ha-icon icon="mdi:clock-outline" style="--mdc-icon-size:1.3vw"></ha-icon>${("0" + e.d.getHours()).slice(-2)}:${("0" + e.d.getMinutes()).slice(-2)}`;
      return `<div class="ss-ev">` +
        `<div class="day"><span class="dn">${lbl}</span><span class="dd">${e.d.getDate()}</span></div>` +
        `<div class="info"><span class="ti">${e.t}</span><span class="hr">${hr}</span></div></div>`;
    }).join("");
  }
  _hide() { this._shown = false; clearInterval(this._clk); clearInterval(this._shiftTimer); clearInterval(this._agTimer); clearInterval(this._gTimer); clearInterval(this._fcTimer); clearInterval(this._matchTimer); this._idle = 0; this._actWrap = null; if (this._ovl) { const o = this._ovl; this._ovl = null; this._clkEl = null; o.style.opacity = "0"; setTimeout(() => o.remove(), 600); } }
}
jmaDef("jma-screensaver-card", JmaScreensaverCard);
// =============================================================================
//  🧭 NAV — dock flottant de navigation entre vues
// =============================================================================
class JmaNavCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, ...c }; this._items = c.items || []; }
  getCardSize() { return 0; }
  static getStubConfig() { return { items: [{ name: "Accueil", icon: "mdi:home", path: "/jma-tablette/accueil" }] }; }
  set hass(h) {
    this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._highlight();
    if (h && h.connection && !this._alertSub) {
      this._alertSub = true;
      window.__jmaAlerts = window.__jmaAlerts || {};
      try { h.connection.subscribeEvents((ev) => this._onAlertEvent((ev && ev.data) || {}), "jma_alert").then((u) => { this._alertUnsub = u; }); } catch (e) {}
      // lit aussi les notifications persistantes jma_alert_* : toute vue JMA ouverte affiche les alertes actives, même si l'event live a été raté
      this._pnAlerts = {}; this._fetchNotifs();
      try { jmaSubPN(h.connection, () => this._fetchNotifs()).then((u) => { this._pnUnsub = u; }); } catch (e) {}
      // pop-up riche (caméra + boutons d'action)
      try { h.connection.subscribeEvents((ev) => this._showPopup((ev && ev.data) || {}), "jma_popup").then((u) => { this._popupUnsub = u; }); } catch (e) {}
    }
    this._renderAlerts();
  }
  _fetchNotifs() {
    if (!this._hass) return;
    this._hass.callWS({ type: "persistent_notification/get" }).then((res) => {
      const arr = Array.isArray(res) ? res : (res && typeof res === "object" ? Object.values(res) : []);
      const map = {};
      arr.forEach((n) => { const nid = (n && n.notification_id) || ""; if (!nid.startsWith("jma_alert_")) return;
        const id = nid.slice(10);
        const msg = (n.message || "").replace(/^📍\s*/, "").replace(/\s*—\s*\d{1,2}:\d{2}\s*$/, "");
        map[id] = { level: "critical", title: n.title || "ALERTE", message: msg, icon: "" };
      });
      this._pnAlerts = map; this._renderAlerts();
    }).catch(() => {});
  }
  _onBannerClick() {
    const now = Date.now();
    const merged = Object.assign({}, this._pnAlerts || {}, window.__jmaAlerts || {});
    const alerts = Object.values(merged).filter((a) => !a.exp || a.exp > now);
    const sim = window.__jmaAlertSim && now < window.__jmaAlertSim;
    const hasCritical = sim || alerts.some((a) => a.level === "critical");
    if (hasCritical && !this._confirmDismiss) {
      // alerte DANGER : exige une 2e validation pour l'enlever (évite l'acquittement accidentel)
      this._confirmDismiss = true; this._renderAlerts();
      clearTimeout(this._confirmTimer); this._confirmTimer = setTimeout(() => { this._confirmDismiss = false; this._renderAlerts(); }, 4500);
      return;
    }
    this._confirmDismiss = false; clearTimeout(this._confirmTimer);
    this._dismissAlerts();
  }
  _dismissAlerts() {
    // acquittement : retire toutes les alertes affichées (live + persistantes) et coupe la simulation
    this._confirmDismiss = false; clearTimeout(this._confirmTimer); window.__jmaAlertSim = 0;
    const ids = new Set([...Object.keys(window.__jmaAlerts || {}), ...Object.keys(this._pnAlerts || {})]);
    window.__jmaAlerts = {}; this._pnAlerts = {};
    ids.forEach((id) => { try { this._hass.callService("persistent_notification", "dismiss", { notification_id: "jma_alert_" + id }); } catch (e) {} });
    this._renderAlerts();
  }
  _onAlertEvent(d) {
    const store = window.__jmaAlerts = window.__jmaAlerts || {};
    const id = d.id || "default";
    if (d.clear || d.action === "clear") delete store[id];
    else store[id] = { level: d.level || "critical", title: d.title || "ALERTE", message: d.message || "", icon: d.icon || "", exp: d.duration ? Date.now() + (+d.duration) * 1000 : 0 };
    this._renderAlerts();
  }
  _showPopup(d) {
    if (!d || (!d.title && !d.message && !d.camera)) return;
    const $ = (id) => this.shadowRoot.getElementById(id);
    const ACC = (JMA_LEVELS[d.level] && JMA_LEVELS[d.level].accent) || this._config.color || "#e98aa8";
    const ICN = d.icon || JMA_LVL(d.level).icon || "mdi:bell-ring";
    const sheet = this.shadowRoot.querySelector(".jpsheet"); sheet.style.setProperty("--jp-accent", ACC);
    $("jpicon").setAttribute("icon", ICN);
    $("jptitle").textContent = d.title || "Notification";
    $("jpmsg").textContent = d.message || ""; $("jpmsg").style.display = d.message ? "" : "none";
    this._popDismissable = d.dismissable !== false;
    $("jpx").style.display = this._popDismissable ? "" : "none";
    // caméra : vrai direct (HLS/WebRTC via ha-camera-stream) plutôt qu'un snapshot
    // rafraîchi toutes les 2 s (plus fluide, bien moins gourmand sur une tablette 24/7)
    const cam = $("jpcamwrap"); clearInterval(this._popCamTimer); this._popCam = d.camera || null;
    cam.innerHTML = "";
    const camSt = d.camera && this._hass.states[d.camera];
    if (camSt && customElements.get("ha-camera-stream")) {
      cam.hidden = false;
      try {
        const el = document.createElement("ha-camera-stream");
        el.hass = this._hass; el.stateObj = camSt; el.muted = true; el.allowExoPlayer = true;
        cam.appendChild(el);
      } catch (e) { this._popSnapshot(cam, d); }
    } else if (d.camera || d.image) {
      cam.hidden = false; this._popSnapshot(cam, d);
    } else cam.hidden = true;
    // boutons d'action
    const acts = $("jpacts"); acts.innerHTML = "";
    let actions = d.actions || [];
    if (typeof actions === "string") { try { actions = JSON.parse(actions); } catch (e) { actions = []; } }
    (Array.isArray(actions) ? actions : []).forEach((a) => {
      const b = document.createElement("button"); b.className = "jpb" + (a.primary ? " primary" : "");
      b.innerHTML = (a.icon ? `<ha-icon icon="${a.icon}"></ha-icon>` : "") + (a.label || "OK");
      b.addEventListener("click", () => {
        if (a.action) { const p = String(a.action).split("."); try { this._hass.callService(p[0], p.slice(1).join("."), a.data || {}); } catch (e) {} }
        if (window.jmaToast && a.label) jmaToast({ title: d.title || "Action", message: "✓ " + a.label, color: ACC });
        if (a.close !== false) this._closePopup();
      });
      acts.appendChild(b);
    });
    // bouton fermer par défaut si aucune action
    if (!acts.children.length && this._popDismissable) {
      const b = document.createElement("button"); b.className = "jpb primary"; b.textContent = "OK";
      b.addEventListener("click", () => this._closePopup()); acts.appendChild(b);
    }
    $("jpop").classList.add("on");
    clearTimeout(this._popTimer);
    if (d.timeout) this._popTimer = setTimeout(() => this._closePopup(), (+d.timeout) * 1000);
  }
  _popSnapshot(cam, d) {
    // repli : snapshot rafraîchi (caméra sans flux, ou ha-camera-stream indispo)
    const img = document.createElement("img"); cam.appendChild(img);
    const paint = () => {
      let src = d.image || null;
      if (d.camera && this._hass.states[d.camera]) { const p = this._hass.states[d.camera].attributes.entity_picture; if (p) src = p + (p.includes("?") ? "&" : "?") + "_=" + Math.floor(Date.now() / 2500); }
      if (src) img.src = src;
    };
    paint(); if (d.camera) this._popCamTimer = setInterval(paint, 2500);
  }
  _closePopup() {
    const p = this.shadowRoot && this.shadowRoot.getElementById("jpop"); if (p) p.classList.remove("on");
    clearInterval(this._popCamTimer); clearTimeout(this._popTimer);
    // coupe le flux vidéo quand le pop-up se ferme (libère la caméra)
    const cam = this.shadowRoot && this.shadowRoot.getElementById("jpcamwrap"); if (cam) cam.innerHTML = "";
  }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      @keyframes jma-flash{0%,100%{background:#ff3b30;}50%{background:#c1271f;}}
      @keyframes jma-pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
      .alertbar{position:fixed;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:2147483000;
        display:flex;align-items:center;gap:15px;width:calc(100vw - 24px);max-width:680px;box-sizing:border-box;
        background:#ff3b30;color:#fff;border-radius:18px;padding:16px 22px;cursor:pointer;
        box-shadow:0 14px 44px rgba(255,59,48,.6);}
      .alertbar.critical{background:${JMA_LEVELS.critical.bg};animation:jma-flash 1s infinite;}
      .alertbar.warning{background:${JMA_LEVELS.warning.bg};color:${JMA_LEVELS.warning.fg};box-shadow:0 14px 44px rgba(255,179,0,.42);}
      .alertbar.warning .as{opacity:.8;}
      .alertbar.info{background:${JMA_LEVELS.info.bg};box-shadow:0 14px 44px rgba(61,127,224,.5);}
      .alertbar.warning ha-icon,.alertbar.info ha-icon{animation:none;}
      .alertbar[hidden]{display:none;}
      .alertbar ha-icon{--mdc-icon-size:36px;flex:none;animation:jma-pulse .9s infinite;}
      .alertbar .at{font-weight:900;font-size:1.18rem;line-height:1.18;letter-spacing:.2px;}
      .alertbar .as{font-size:.86rem;font-weight:700;opacity:.95;margin-top:2px;}
      .alertbar .acol{display:flex;flex-direction:column;gap:5px;min-width:0;}
      .alertbar .aline{display:flex;align-items:center;gap:8px;font-size:.86rem;font-weight:700;line-height:1.2;}
      .alertbar .aline ha-icon{--mdc-icon-size:19px;animation:none;}
      .alertbar .aline b{font-weight:900;}
      .alertbar .axc{display:flex;align-items:center;opacity:.85;flex:none;}
      .alertbar .axc ha-icon{--mdc-icon-size:26px;animation:none;}
      .alertbar .axc.confirm{opacity:1;gap:6px;background:#fff;color:#1a1a1a;border-radius:13px;padding:8px 13px;font-weight:900;font-size:.84rem;}
      .alertbar .axc.confirm ha-icon{--mdc-icon-size:20px;color:#1a1a1a;}
      .navdock.alarm{background:#ff3b30;border-color:#ff3b30;box-shadow:0 12px 40px rgba(255,59,48,.6);}
      .navdock.alarm .navbtn{color:#fff;}
      .navdock.alarm .navbtn.on{background:rgba(255,255,255,.22);color:#fff;}
      .navdock.alarm .navbtn[data-sec]{background:rgba(255,255,255,.3);color:#fff;animation:jma-pulse .8s infinite;}
      .navdock{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:1000;
        display:flex;gap:3px;padding:6px;border-radius:24px;
        background:rgba(250,247,240,.86);backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);
        box-shadow:0 10px 34px rgba(60,48,30,.22);border:1px solid rgba(120,100,70,.12);}
      :host(.dark) .navdock{background:rgba(26,26,30,.82);border-color:rgba(255,255,255,.08);box-shadow:0 10px 34px rgba(0,0,0,.5);}
      .navbtn{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:62px;padding:8px 13px;border:none;border-radius:18px;
        background:transparent;color:#6a5e49;cursor:pointer;font-size:.66rem;font-weight:800;letter-spacing:.2px;transition:transform .1s,background .2s,color .2s;}
      :host(.dark) .navbtn{color:#cbb89a;}
      .navbtn ha-icon{--mdc-icon-size:24px;}
      .navbtn:active{transform:scale(.92);}
      .navbtn.on{background:linear-gradient(135deg,#f3d9b8,#e8c89a);color:#42382a;box-shadow:0 3px 10px rgba(180,140,90,.3);}
      :host(.dark) .navbtn.on{background:var(--jma-grad);color:var(--jma-dark);}
      @media(max-width:760px){
        .navdock{max-width:calc(100vw - 12px);overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:0;padding:5px;}
        .navdock::-webkit-scrollbar{display:none;}
        .navbtn{min-width:0;padding:9px 10px;gap:0;}
        .navbtn span{display:none;}
        .navbtn ha-icon{--mdc-icon-size:23px;}
      }
      :host{--jp-sheet:#fbf8f1;--jp-text:#2a2418;}
      :host(.dark){--jp-sheet:#1d1d20;--jp-text:#fff;}
      .jpop{position:fixed;inset:0;z-index:2147483200;background:rgba(15,12,8,.55);display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:14px;box-sizing:border-box;}
      .jpop.on{display:flex;}
      .jpsheet{background:var(--jp-sheet);color:var(--jp-text);border-radius:22px;width:100%;max-width:470px;max-height:90vh;overflow:auto;box-shadow:0 26px 74px rgba(0,0,0,.55);border-top:5px solid var(--jp-accent,#e98aa8);}
      .jph{display:flex;align-items:center;gap:11px;padding:16px 18px 8px;}
      .jpic{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--jp-accent,#e98aa8);flex:none;}
      .jpic ha-icon{--mdc-icon-size:25px;color:#fff;}
      .jpt{font-weight:800;font-size:1.1rem;flex:1;min-width:0;line-height:1.2;}
      .jpx{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;background:rgba(127,127,127,.18);color:inherit;font-size:1rem;flex:none;}
      .jpcam{width:calc(100% - 36px);margin:6px 18px 0;border-radius:14px;overflow:hidden;display:block;background:#000;aspect-ratio:16/9;}
      .jpcam>*{width:100%;height:100%;display:block;object-fit:cover;}
      .jpm{padding:10px 18px 2px;font-size:.92rem;line-height:1.45;opacity:.86;white-space:pre-line;}
      .jpacts{display:flex;flex-wrap:wrap;gap:8px;padding:14px 18px 18px;}
      .jpb{flex:1;min-width:130px;padding:14px;border:none;border-radius:14px;cursor:pointer;font-weight:800;font-size:.9rem;display:flex;align-items:center;justify-content:center;gap:7px;background:var(--jma-surf3);color:var(--jp-text);transition:transform .08s;}
      .jpb:active{transform:scale(.96);}.jpb ha-icon{--mdc-icon-size:20px;}
      .jpb.primary{background:var(--jp-accent,#e98aa8);color:#fff;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;">
        <div class="jpop" id="jpop"><div class="jpsheet">
          <div class="jph"><div class="jpic"><ha-icon id="jpicon" icon="mdi:bell-ring"></ha-icon></div><div class="jpt" id="jptitle"></div><button class="jpx" id="jpx">✕</button></div>
          <div class="jpcam" id="jpcamwrap" hidden></div>
          <div class="jpm" id="jpmsg"></div>
          <div class="jpacts" id="jpacts"></div>
        </div></div>
        <div class="alertbar" id="alertbar" hidden></div>
        <div class="navdock" id="dock"></div></ha-card>`;
    const dock = this.shadowRoot.getElementById("dock");
    this._items.forEach((it) => {
      const b = document.createElement("button"); b.className = "navbtn"; b.dataset.path = it.path || "";
      if (/securit/i.test(it.path || "")) b.dataset.sec = "1";
      b.innerHTML = `<ha-icon icon="${it.icon || "mdi:circle"}"></ha-icon><span>${it.name || ""}</span>`;
      b.addEventListener("click", () => this._go(it.path));
      dock.appendChild(b);
    });
    this.shadowRoot.getElementById("alertbar").addEventListener("click", () => this._onBannerClick());
    this.shadowRoot.getElementById("jpx").addEventListener("click", () => this._closePopup());
    this.shadowRoot.getElementById("jpop").addEventListener("click", (e) => { if (e.target.id === "jpop" && this._popDismissable !== false) this._closePopup(); });
    this._onLoc = () => this._highlight();
    window.addEventListener("location-changed", this._onLoc);
    window.addEventListener("popstate", this._onLoc);
    // simulation GLOBALE (persiste au changement de page)
    this._onTest = () => { window.__jmaAlertSim = Date.now() + 15000; this._renderAlerts(); };
    window.addEventListener("jma-test-alert", this._onTest);
    // rafraîchit en continu : masque à l'expiration des alertes temporisées
    this._alertTimer = setInterval(() => this._renderAlerts(), 1200);
  }
  _alIcon(a) {
    if (a.icon) return a.icon;
    if (/fum|incend|feu/i.test(a.title)) return "mdi:fire-alert";
    if (/fuite|eau/i.test(a.title)) return "mdi:water-alert";
    return JMA_LVL(a.level).icon;
  }
  _renderAlerts() {
    const bar = this.shadowRoot && this.shadowRoot.getElementById("alertbar"); if (!bar) return;
    const dock = this.shadowRoot.getElementById("dock"); const now = Date.now();
    // fusion : notifications persistantes (fallback durable) + événements live (prioritaires, données complètes)
    const merged = Object.assign({}, this._pnAlerts || {}, window.__jmaAlerts || {});
    let alerts = Object.values(merged).filter((a) => !a.exp || a.exp > now);
    if (window.__jmaAlertSim && now < window.__jmaAlertSim) alerts = alerts.concat([
      { level: "critical", title: "FUMÉE / INCENDIE", message: "🧪 Séjour (simulation)", icon: "mdi:fire-alert" },
      { level: "critical", title: "FUMÉE / INCENDIE", message: "🧪 Chambre parents (simulation)", icon: "mdi:fire-alert" },
      { level: "critical", title: "FUITE D'EAU", message: "🧪 Machine à laver (simulation)", icon: "mdi:water-alert" },
    ]);
    if (!alerts.length) { bar.hidden = true; bar.className = "alertbar"; if (dock) dock.classList.remove("alarm"); return; }
    const sev = { critical: 3, warning: 2, info: 1 };
    alerts.sort((a, b) => (sev[b.level] || 1) - (sev[a.level] || 1));
    const critical = alerts.some((a) => a.level === "critical");
    bar.hidden = false; bar.className = "alertbar " + (alerts[0].level || "critical");
    if (dock) dock.classList.toggle("alarm", critical);
    const xc = this._confirmDismiss
      ? `<div class="axc confirm"><ha-icon icon="mdi:check-bold"></ha-icon><span>Confirmer</span></div>`
      : `<div class="axc"><ha-icon icon="mdi:close-circle"></ha-icon></div>`;
    if (alerts.length === 1) {
      const a = alerts[0];
      bar.innerHTML = `<ha-icon icon="${this._alIcon(a)}"></ha-icon><div style="flex:1;min-width:0;"><div class="at">⚠️ ${a.title}</div>${a.message ? `<div class="as">📍 ${a.message}</div>` : ""}</div>${xc}`;
    } else {
      const lines = alerts.map((a) => `<div class="aline"><ha-icon icon="${this._alIcon(a)}"></ha-icon><span><b>${a.title}</b>${a.message ? " — " + a.message : ""}</span></div>`).join("");
      bar.innerHTML = `<div class="acol" style="flex:1;min-width:0;"><div class="at">⚠️ ${alerts.length} ALERTES</div>${lines}</div>${xc}`;
    }
  }
  disconnectedCallback() { if (this._onLoc) { window.removeEventListener("location-changed", this._onLoc); window.removeEventListener("popstate", this._onLoc); } if (this._onTest) window.removeEventListener("jma-test-alert", this._onTest); if (this._alertTimer) clearInterval(this._alertTimer); if (this._alertUnsub) { try { this._alertUnsub(); } catch (e) {} } if (this._pnUnsub) { try { this._pnUnsub(); } catch (e) {} } if (this._popupUnsub) { try { this._popupUnsub(); } catch (e) {} } clearInterval(this._popCamTimer); this._alertSub = false; }
  _go(path) { if (!path) return; history.pushState(null, "", path); window.dispatchEvent(new CustomEvent("location-changed")); }
  _highlight() {
    const p = (window.location && window.location.pathname) || "";
    this.shadowRoot.querySelectorAll(".navbtn").forEach((b) => {
      const seg = (b.dataset.path || "").split("/").filter(Boolean).pop() || "\0";
      b.classList.toggle("on", p === b.dataset.path || p.endsWith("/" + seg));
    });
  }
}
jmaDef("jma-nav-card", JmaNavCard);

// =============================================================================
//  🪟 TOUS LES VOLETS  /  🌡️ TOUS LES THERMOSTATS (tuile + pop-up groupé)
// =============================================================================
class JmaGroupCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  getCardSize() { return 1; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config);
    if (this._config.expanded) { if (this._inline) this._inline.hass = h; return; }
    this._update(); if (this._popup) this._popup.hass = h; }
  _buildInline() {
    this.shadowRoot.innerHTML = `<style>:host{display:block;}</style><div id="host"></div>`;
    const rows = (this._config.rows && this._config.rows.length) ? this._config.rows : null;
    const ents = rows ? rows.flat() : this._list();
    const p = document.createElement("jma-card-popup");
    p.config = { kind: this._KIND, entities: ents, rows: rows, names: this._config.names, name: this._config.name,
      color: this._config.color, accent: this._config.accent, dark: this._config.dark, theme: this._config.theme, inline: true };
    p.hass = this._hass;
    this.shadowRoot.getElementById("host").appendChild(p); this._inline = p;
  }
  _list() {
    if (this._config.entities && this._config.entities.length) return this._config.entities;
    const dom = this._DOMAIN, ex = this._EXCLUDE;
    let list = Object.keys(this._hass.states).filter((e) => {
      if (!e.startsWith(dom + ".")) return false;
      const s = this._hass.states[e]; if (["unavailable", "unknown"].includes(s.state)) return false;
      if (ex && (ex.test(e) || ex.test(s.attributes.friendly_name || ""))) return false;
      return true;
    }).sort();
    const top = this._TOP || [], bot = this._BOTTOM || [];
    if (top.length || bot.length) {
      const rank = (e) => { const t = top.indexOf(e), b = bot.indexOf(e);
        if (t >= 0) return -1000 + t; if (b >= 0) return 1000 + b; return 0; };
      list = list.slice().sort((a, b) => rank(a) - rank(b));
    }
    return list;
  }
  _build() {
    if (this._config.expanded) return this._buildInline();
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
      .chev{opacity:.4;--mdc-icon-size:22px;flex:none;}</style>` +
      CARD_WRAP_OPEN + `<div class="tile" id="tile"><div class="content"><div class="top">
        <div class="badge"><ha-icon icon="${c.icon}"></ha-icon></div>
        <div class="meta"><div class="name">${c.name}</div><div class="sub" id="sub"></div></div>
        <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
      </div></div></div></ha-card>`;
    this.shadowRoot.getElementById("tile").addEventListener("click", () => this._openPopup());
  }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    const rows = (this._config.rows && this._config.rows.length) ? this._config.rows : null;
    const ents = rows ? rows.flat() : this._list();
    p.config = { kind: this._KIND, entities: ents, rows: rows, names: this._config.names, name: this._config.name,
      color: this._config.color, accent: this._config.accent, dark: this._config.dark, theme: this._config.theme };
    p.hass = this._hass;
    p.addEventListener("jma-close", () => { this._popup = null; });
    document.body.appendChild(p); this._popup = p;
  }
}
class JmaCoversCard extends JmaGroupCard {
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Volets", icon: "mdi:window-shutter", ...c }; this._DOMAIN = "cover"; this._KIND = "covers"; this._EXCLUDE = /(low[ _]?speed|vitesse[ _]?lente|basse[ _]?vitesse|tous[ _]?les[ _]?volets|_group\b)/i; this._TOP = c.top || ["cover.volet_salon", "cover.volet_cuisine", "cover.volet_chambre_pa", "cover.volet_dressing", "cover.volet_bureau", "cover.volet_chambre_1", "cover.volet_chambre_2"]; this._config.rows = c.rows || [["cover.volet_salon", "cover.volet_cuisine"], ["cover.volet_chambre_pa", "cover.volet_dressing", "cover.volet_bureau"], ["cover.volet_chambre_1", "cover.volet_chambre_2"]]; }
  static getStubConfig() { return { name: "Volets" }; }
  _update() {
    const list = this._list(); let open = 0;
    list.forEach((e) => { const s = this._hass.states[e]; if (s && (s.state === "open" || (s.attributes.current_position || 0) > 0)) open++; });
    const tile = this.shadowRoot.getElementById("tile"); tile.classList.toggle("on", open > 0);
    this.shadowRoot.getElementById("sub").textContent = list.length + " volet" + (list.length > 1 ? "s" : "") + " · " + (open ? open + " ouvert" + (open > 1 ? "s" : "") : "tous fermés");
  }
}
jmaDef("jma-covers-card", JmaCoversCard);
class JmaClimatesCard extends JmaGroupCard {
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Thermostats", icon: "mdi:thermostat", ...c }; this._DOMAIN = "climate"; this._KIND = "climates"; this._TOP = c.top || ["climate.zona_05", "climate.salon", "climate.chambre1", "climate.chambre_2", "climate.bureau"]; this._BOTTOM = c.bottom || ["climate.kelud_1750w_blc_chauffage", "climate.group"]; }
  static getStubConfig() { return { name: "Thermostats" }; }
  _update() {
    const list = this._list(); let on = 0; const temps = [];
    list.forEach((e) => { const s = this._hass.states[e]; if (!s) return;
      if (s.state !== "off" && s.state !== "unavailable") on++;
      const t = parseFloat(s.attributes.current_temperature); if (!isNaN(t)) temps.push(t); });
    const tile = this.shadowRoot.getElementById("tile"); tile.classList.toggle("on", on > 0);
    const avg = temps.length ? Math.round((temps.reduce((p, v) => p + v, 0) / temps.length) * 10) / 10 : null;
    const actifs = on ? on + " actif" + (on > 1 ? "s" : "") : "tous éteints";
    this.shadowRoot.getElementById("sub").textContent = (avg != null ? "🌡️ " + String(avg).replace(".", ",") + "° · " : "") + actifs;
  }
}
jmaDef("jma-climates-card", JmaClimatesCard);
class JmaLightsCard extends JmaGroupCard {
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Lumières", icon: "mdi:lightbulb-group", ...c }; this._DOMAIN = "light"; this._KIND = "lights"; this._EXCLUDE = /(screen|pc_louis|tablette|_mur\b)/i; }
  static getStubConfig() { return { name: "Lumières" }; }
  _update() {
    const list = this._list(); let on = 0;
    list.forEach((e) => { const s = this._hass.states[e]; if (s && s.state === "on") on++; });
    const tile = this.shadowRoot.getElementById("tile"); tile.classList.toggle("on", on > 0);
    this.shadowRoot.getElementById("sub").textContent = list.length + " · " + (on ? on + " allumée" + (on > 1 ? "s" : "") : "toutes éteintes");
  }
}
jmaDef("jma-lights-card", JmaLightsCard);

// =============================================================================
window.customCards = window.customCards || [];
const REG = (type, name, description) => window.customCards.push({ type, name, description, preview: true });
REG("jma-card", "JMA Card (auto)", "Carte universelle flat/iOS : slider horizontal + pop-up.");
REG("jma-light-card", "JMA Lumière", "Lumière : slider de luminosité, tap = on/off.");
REG("jma-switch-card", "JMA Interrupteur", "Interrupteur : pastille on/off iOS.");
REG("jma-cover-card", "JMA Volet", "Volet : Ouvrir / Stop / Fermer + position.");
REG("jma-thermostat-card", "JMA Thermostat", "Climat : consigne ± + modes.");
REG("jma-climate-tile-card", "JMA Thermostat tuile", "Climat inline (sans pop-up) : consigne XL + modes + temp réelle.");
REG("jma-cover-tile-card", "JMA Volet tuile", "Volet inline (style thermostat) : position XL + slider + raccourcis %.");
REG("jma-climate-dial-card", "JMA Thermostat cadran", "Climat : cadran rond, glisser pour régler.");
REG("jma-media-card", "JMA Média", "Lecteur média : transport + volume.");
REG("jma-vacuum-card", "JMA Aspirateur", "Aspirateur : Start / Pause / Dock.");
REG("jma-scene-card", "JMA Scène", "Scène / script : bouton d'activation.");
REG("jma-alarm-card", "JMA Alarme", "Alarme : Désarmer / Maison / Absent.");
REG("jma-notify-card", "JMA Notifications", "Notifications persistantes + toasts popup auto.");
REG("jma-ev-card", "JMA Voiture électrique", "Batterie, autonomie, charge (Zoé…).");
REG("jma-bin-card", "JMA Poubelle", "Rappel sortie poubelle par jour de la semaine.");
REG("jma-camera-card", "JMA Caméra", "Flux caméra + présence/REC, pop-up agrandi.");
REG("jma-presence-card", "JMA Présence", "Avatars présents/absents (personnes).");
REG("jma-agenda-card", "JMA Agenda", "Événements calendrier, nb de jours configurable.");
REG("jma-calendar-card", "JMA Calendrier", "Vue mois complète : grille, météo du jour, détail au tap.");
REG("jma-energy-card", "JMA Énergie", "Conso/production : bleu EDF, rose solaire dominant.");
REG("jma-weather-card", "JMA Météo", "Conditions actuelles + prévisions du jour.");
REG("jma-weather-hero-card", "JMA Météo Hero", "Header météo large, dégradé selon le temps + prévisions.");
REG("jma-sensor-card", "JMA Capteur", "Valeur + mini-graphe sur la tuile.");
REG("jma-room-card", "JMA Pièce", "Regroupe les entités d'une pièce.");
REG("jma-cameras-card", "JMA Multi-caméras", "Mosaïque de caméras.");
REG("jma-sonos-card", "JMA Sonos", "Multi-room : groupes + volume par pièce.");
REG("jma-saint-card", "JMA Saint du jour", "Saint du jour (calendrier français).");
REG("jma-energy-today-card", "JMA Énergie du jour", "Bilan kWh du jour + coût € EDF.");
REG("jma-favorites-card", "JMA Favoris", "Grille de raccourcis (scènes, services, navigation).");
REG("jma-security-card", "JMA Sécurité", "Alarme + caméras + ouvertures, vue d'ensemble.");
REG("jma-screensaver-card", "JMA Mode veille", "Économiseur d'écran horloge pour tablette.");
REG("jma-covers-card", "JMA Tous les volets", "Tuile + pop-up de tous les volets.");
REG("jma-climates-card", "JMA Tous les thermostats", "Tuile + pop-up de tous les thermostats.");
REG("jma-lights-card", "JMA Toutes les lumières", "Tuile + pop-up groupé des lumières.");
REG("jma-nav-card", "JMA Navigation", "Dock flottant pour naviguer entre les vues.");

console.info(
  `%c JMA-CARDS %c v${VERSION} `,
  "background:#f8a5c2;color:#0a0a0b;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#0a0a0b;color:#f8a5c2;border-radius:0 4px 4px 0;padding:2px 6px"
);
