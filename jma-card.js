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

const VERSION = "0.30.0";
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
    background:var(--jma-track);touch-action:none;cursor:pointer;transition:box-shadow .15s;}
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
  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    el.dragging = true;
    el.classList.add("dragging");
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    startY = e.clientY; anchorX = e.clientX;
    pending = valFromX(e); anchorV = pending;   // saut absolu à l'endroit touché
    paint(pending);
    if (onInput) onInput(Math.round(pending));
  });
  el.addEventListener("pointermove", (e) => {
    if (!el.dragging) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - anchorX;
    pending = Math.max(0, Math.min(100, anchorV + (dx / r.width) * 100 * sens(e)));
    el.classList.toggle("precise", Math.abs(e.clientY - startY) >= 24);
    paint(pending);
    if (onInput) onInput(Math.round(pending));
  });
  const end = (e) => {
    if (e) e.stopPropagation();
    if (!el.dragging) return;
    el.dragging = false;
    el.classList.remove("dragging", "precise");
    if (pending != null) onCommit(Math.round(pending));
    pending = null;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
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
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile flat" id="tile"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div>
           <div class="bigbat" hidden><ha-icon class="bic"></ha-icon><span class="bpc"></span></div></div>
         <div class="btnrow">
           <button class="cbtn accent" data-a="start" title="Démarrer"><ha-icon icon="mdi:play"></ha-icon></button>
           <button class="cbtn" data-a="pause" title="Pause"><ha-icon icon="mdi:pause"></ha-icon></button>
           <button class="cbtn" data-a="return_to_base" title="Base"><ha-icon icon="mdi:home-import-outline"></ha-icon></button>
           <button class="cbtn" data-a="locate" title="Localiser"><ha-icon icon="mdi:map-marker"></ha-icon></button>
         </div>
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

customElements.define("jma-light-card", JmaLightCard);
customElements.define("jma-switch-card", JmaSwitchCard);
customElements.define("jma-cover-card", JmaCoverCard);
customElements.define("jma-thermostat-card", JmaThermostatCard);

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
customElements.define("jma-climate-dial-card", JmaClimateDialCard);
customElements.define("jma-media-card", JmaMediaCard);
customElements.define("jma-vacuum-card", JmaVacuumCard);
customElements.define("jma-scene-card", JmaSceneCard);
customElements.define("jma-alarm-card", JmaAlarmCard);

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
customElements.define("jma-card", JmaCard);

// =============================================================================
//  POP-UP CUSTOM (bottom-sheet iOS) — partagé par toutes les cartes
// =============================================================================
class JmaPopup extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  set config(c) { this._config = c; }
  set hass(h) { this._hass = h; if (this._built) { jmaApplyTheme(this, h, this._config); this._refresh(); } }
  connectedCallback() {
    this._build();
    requestAnimationFrame(() => this.shadowRoot.getElementById("wrap").classList.add("show"));
    this._onKey = (e) => { if (e.key === "Escape") this._close(); };
    document.addEventListener("keydown", this._onKey);
  }
  disconnectedCallback() { if (this._onKey) document.removeEventListener("keydown", this._onKey); clearInterval(this._camTimer); }
  get _s() { return this._hass && this._config.entity ? this._hass.states[this._config.entity] : undefined; }
  _domain() { return (this._config.entity || "x.x").split(".")[0]; }
  _kind() { return this._config.kind || this._domain(); }
  _close() {
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
        .slider{position:relative;height:30px;border-radius:11px;overflow:hidden;flex:1;background:var(--p-track);touch-action:none;cursor:pointer;}
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
    if (this._kind() === "ev" || this._kind() === "energy") {
      const ev = this._kind() === "ev";
      this.shadowRoot.getElementById("ht").textContent = ev ? (this._config.name || "Voiture") : (this._config.title || "Énergie");
      this.shadowRoot.getElementById("hs").textContent = ev ? this._evState() : "Conso & production";
      this.shadowRoot.getElementById("hi").setAttribute("icon", ev ? "mdi:car-electric" : "mdi:flash");
      (this._graphs || []).forEach((g) => (g.hass = this._hass));
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
    body.innerHTML = ""; this._graphs = [];
    if (this._kind() === "ev") return this._evBody(body);
    if (this._kind() === "energy") return this._energyBody(body);
    if (this._kind() === "agenda") return this._agendaBody(body);
    if (this._kind() === "sonos") return this._sonosBody(body);
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
    body.appendChild(this._slider("temp", "Consigne", a.temperature ?? a.min_temp ?? 20, (x) => x + "°",
      (x) => this._call("climate", "set_temperature", { entity_id: this._config.entity, temperature: x }),
      a.min_temp ?? 7, a.max_temp ?? 35, a.target_temp_step || 0.5));
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
      h.innerHTML = `<div class="cell"><div class="k">Température</div><div class="v">${a.current_temperature ?? "—"} °</div></div>` +
        `<div class="cell"><div class="k">Humidité</div><div class="v">${a.current_humidity} %</div></div>`;
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
    if (fans.length) {
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
    this._sSliders = {}; this._sAudioNums = null; this._sAudioSws = null;
    body.innerHTML = "";
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
customElements.define("jma-card-popup", JmaPopup);

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
customElements.define("jma-ev-card", JmaEvCard);

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
customElements.define("jma-bin-card", JmaBinCard);

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
customElements.define("jma-camera-card", JmaCameraCard);

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
customElements.define("jma-cameras-card", JmaCamerasCard);

// =============================================================================
//  🔊 SONOS MULTI-ROOM — lecture du groupe + grouper/dégrouper + volume/pièce
// =============================================================================
class JmaSonosCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, name: "Sonos", favorites: true, ...c }; this._spk = c.entities || []; }
  getCardSize() { return 2; }
  static getStubConfig() { return { name: "Sonos", entities: ["media_player.salon"] }; }
  static getConfigElement() { return document.createElement("jma-card-editor"); }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } jmaApplyTheme(this, h, this._config); this._update(); if (this._popup) this._popup.hass = h; }
  _call(s, data) { this._hass.callService("media_player", s, data); }
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
customElements.define("jma-sonos-card", JmaSonosCard);

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
customElements.define("jma-saint-card", JmaSaintCard);

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
customElements.define("jma-presence-card", JmaPresenceCard);

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
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .content{gap:6px;}
        #list{display:flex;flex-direction:column;gap:0;}
        .day{font-weight:800;font-size:.64rem;opacity:.5;margin-top:7px;margin-bottom:1px;text-transform:uppercase;letter-spacing:.4px;}
        .ev{display:flex;gap:8px;align-items:center;padding:3px 2px;}
        .dot{width:6px;height:6px;border-radius:50%;background:var(--jma-rose);flex:none;}
        .t{font-size:.69rem;opacity:.65;min-width:36px;font-weight:700;font-variant-numeric:tabular-nums;}
        .ti{font-size:.77rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
        .more,.empty{font-size:.7rem;opacity:.5;padding:3px 2px;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="top"><div class="badge"><ha-icon icon="mdi:calendar-month"></ha-icon></div>
          <div class="meta"><div class="name">${c.title}</div><div class="sub" id="sub"></div></div></div>
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
      for (const cal of this._cals) {
        const r = await this._hass.callApi("GET", `calendars/${cal}?start=${encodeURIComponent(iso(start))}&end=${encodeURIComponent(iso(end))}`);
        (r || []).forEach((e) => evs.push(e));
      }
    } catch (e) {}
    this._loading = false; this._render(evs);
  }
  _render(evs) {
    const list = this.shadowRoot.getElementById("list"); const sub = this.shadowRoot.getElementById("sub");
    list.innerHTML = "";
    evs = evs.map((e) => { const s = e.start && (e.start.dateTime || e.start.date); return { d: new Date(s), allday: !(e.start && e.start.dateTime), e }; })
      .filter((x) => !isNaN(x.d)).sort((a, b) => a.d - b.d);
    sub.textContent = `${this._config.days} j • ${evs.length} évén.`;
    if (!evs.length) { const x = document.createElement("div"); x.className = "empty"; x.textContent = "Rien de prévu 🎉"; list.appendChild(x); return; }
    const dn = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
    const max = this._config.max || 6;
    const shown = evs.slice(0, max);
    let last = "";
    shown.forEach(({ d, allday, e }) => {
      const dk = d.toDateString();
      if (dk !== last) { last = dk; const h = document.createElement("div"); h.className = "day"; h.textContent = dn[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1); list.appendChild(h); }
      const row = document.createElement("div"); row.className = "ev";
      const tt = allday ? "jour" : ("" + d.getHours()).padStart(2, "0") + ":" + ("" + d.getMinutes()).padStart(2, "0");
      row.innerHTML = `<span class="dot"></span><span class="t">${tt}</span><span class="ti">${e.summary || e.message || "(sans titre)"}</span>`;
      list.appendChild(row);
    });
    if (evs.length > max) { const m = document.createElement("div"); m.className = "more"; m.textContent = "+ " + (evs.length - max) + " autres…"; list.appendChild(m); }
  }
}
customElements.define("jma-agenda-card", JmaAgendaCard);

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
        <div class="ecap"><span>Puissance</span><span id="ewin"></span></div>
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
    this.shadowRoot.getElementById("pc").textContent = Math.round(cons) + " W";
    this.shadowRoot.getElementById("sol").textContent = Math.round(prod) + " W";
    this.shadowRoot.getElementById("grd").textContent = Math.round(grid) + " W";
    this.shadowRoot.getElementById("sub").textContent = (solarDom ? "Solaire dominant" : "Réseau EDF dominant") + " · " + sShare + "% autoconso.";
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
  }
}
customElements.define("jma-energy-card", JmaEnergyCard);

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
customElements.define("jma-weather-card", JmaWeatherCard);

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
customElements.define("jma-sensor-card", JmaSensorCard);

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
  _build() {
    const c = this._config;
    let body = `<div class="rhead"><div class="badge rbig" id="rbadge"><ha-icon icon="${c.icon}"></ha-icon></div>
      <div class="meta"><div class="name">${c.name}</div><div class="sub" id="sum"></div></div></div>
      <div class="ramb" id="amb"></div>`;
    if (this._lights.length) body += `<div class="qsec" id="lsec">
      <button class="lightbtn" id="lbtn"><span class="lic"><ha-icon icon="mdi:lightbulb-group"></ha-icon></span>
        <span class="ltxt"><b id="ltitle">Lumières</b><small id="lsub"></small></span>
        <span class="ltog" id="ltog"><ha-icon icon="mdi:power"></ha-icon></span></button>
      <div id="lwrap"></div></div>`;
    if (this._climate) body += `<div class="qsec climrow"><button class="qicon" id="climicon"><ha-icon icon="mdi:thermostat"></ha-icon></button>
      <div class="qmeta"><b id="climname">Climat</b><small id="climsub"></small></div>
      <div class="therm"><button class="step" id="cdn"><ha-icon icon="mdi:minus"></ha-icon></button>
        <div class="set" id="cset">—</div><button class="step" id="cup"><ha-icon icon="mdi:plus"></ha-icon></button></div></div>`;
    if (this._cover) body += `<div class="qsec coverrow"><button class="qicon" id="covicon"><ha-icon icon="mdi:window-shutter"></ha-icon></button>
      <div class="qmeta"><b>Volet</b><small id="covsub"></small></div>
      <div class="btnrow cv"><button class="cbtn covb" id="covup"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
        <button class="cbtn covb" id="covstop"><ha-icon icon="mdi:stop"></ha-icon></button>
        <button class="cbtn covb" id="covdn"><ha-icon icon="mdi:arrow-down"></ha-icon></button></div></div>`;
    if (this._media) body += `<div class="qsec mediarow" id="msec"><button class="qicon" id="micon"><ha-icon icon="mdi:music"></ha-icon></button>
      <div class="qmeta mclick" id="mclick"><b id="mtitle">—</b><small id="msub"></small></div>
      <div class="btnrow mc"><button class="cbtn covb" id="mprev"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
        <button class="cbtn covb accent" id="mpp"><ha-icon icon="mdi:play"></ha-icon></button>
        <button class="cbtn covb" id="mnext"><ha-icon icon="mdi:skip-next"></ha-icon></button></div></div>`;
    if (this._scenes.length) body += `<div class="chips" id="scenes"></div>`;
    if (this._extra.length) body += `<div class="grid" id="grid"></div>`;

    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .tile.room{flex-direction:column;align-items:stretch;gap:11px;padding:14px;}
        .rhead{display:flex;align-items:center;gap:11px;}
        .badge.rbig{width:42px;height:42px;}.badge.rbig ha-icon{--mdc-icon-size:24px;}
        .tile.alive .badge.rbig{background:var(--jma-grad);}.tile.alive .badge.rbig ha-icon{color:var(--jma-dark);}
        .name{font-size:1.02rem;}
        .ramb{display:flex;gap:6px;flex-wrap:wrap;}
        .pill2{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:11px;background:var(--jma-surf3);font-size:.74rem;font-weight:700;}
        .pill2 ha-icon{--mdc-icon-size:15px;color:var(--jma-icon);}
        .pill2.warn{color:#e9871f;}.pill2.cold ha-icon{color:var(--jma-blue);}
        .qsec{display:flex;align-items:center;gap:10px;}
        .lightbtn{flex:1;display:flex;align-items:center;gap:11px;padding:11px 12px;border:none;border-radius:15px;cursor:pointer;
          background:var(--jma-surf3);color:var(--jma-text);transition:background .25s,transform .08s;text-align:left;width:100%;}
        .lightbtn:active{transform:scale(.985);}
        .lightbtn.on{background:var(--jma-grad);color:var(--jma-dark);}
        .lic{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.06);flex:none;}
        .lightbtn.on .lic{background:rgba(255,255,255,.25);}
        .lic ha-icon{--mdc-icon-size:19px;}
        .lightbtn.on .lic ha-icon{animation:jma-glow 2.6s ease-in-out infinite;}
        @keyframes jma-glow{0%,100%{opacity:.8;}50%{opacity:1;filter:drop-shadow(0 0 6px rgba(255,255,255,.9));}}
        .ltxt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15;}
        .ltxt b{font-weight:700;font-size:.9rem;}.ltxt small{font-size:.72rem;opacity:.7;}
        .ltog{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;background:rgba(0,0,0,.06);}
        .lightbtn.on .ltog{background:rgba(255,255,255,.28);}.ltog ha-icon{--mdc-icon-size:17px;}
        #lwrap{flex:1.2;}#lwrap .slider{height:34px;}
        .qicon{width:38px;height:38px;border-radius:12px;border:none;cursor:pointer;flex:none;background:var(--jma-surf3);color:var(--jma-icon);display:flex;align-items:center;justify-content:center;}
        .qicon ha-icon{--mdc-icon-size:20px;}.qicon.on{background:var(--jma-grad);color:var(--jma-dark);}
        .qmeta{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15;}
        .qmeta b{font-weight:700;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .qmeta small{font-size:.72rem;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mclick{cursor:pointer;}
        .therm{gap:6px;flex:none;}.set{font-size:1.05rem;min-width:46px;}
        .btnrow.cv,.btnrow.mc{flex:none;gap:5px;}.btnrow.cv .cbtn,.btnrow.mc .cbtn{min-width:38px;flex:none;}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px;}
        .e{background:var(--jma-surf3);border:none;border-radius:12px;padding:8px 4px;cursor:pointer;display:flex;
          flex-direction:column;align-items:center;gap:3px;color:var(--jma-text);transition:background .2s,transform .08s;}
        .e:active{transform:scale(.92);}.e.on{background:var(--jma-grad);color:var(--jma-dark);}
        .e ha-icon{--mdc-icon-size:21px;}
        .e span{font-size:.6rem;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile room" id="tile"><div class="content" style="gap:11px;">
        ${body}
      </div></div></ha-card>`;
    this._wire();
  }
  _wire() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    $("rbadge") && $("rbadge").addEventListener("click", () => this._openPopup(this._climate || this._lights[0]));
    if (this._lights.length) {
      $("lbtn").addEventListener("click", () => {
        const anyOn = this._lights.some((e) => { const s = this._st(e); return s && s.state === "on"; });
        this._call("homeassistant", anyOn ? "turn_off" : "turn_on", { entity_id: this._lights });
      });
      this._lslider = jmaSlider({ icon: "mdi:brightness-6", fmt: (v) => v + "%", label: "Luminosité " + this._config.name,
        onCommit: (v) => { const br = this._lights.filter((e) => this._briCap(this._st(e))); if (br.length) this._call("light", "turn_on", { entity_id: br, brightness_pct: v }); } });
      this._lslider.hidden = true; $("lwrap").appendChild(this._lslider);
    }
    if (this._climate) {
      const stepT = (d) => { const s = this._st(this._climate); if (!s) return; const cur = s.attributes.temperature; if (cur == null) return; const st = s.attributes.target_temp_step || .5; this._call("climate", "set_temperature", { entity_id: this._climate, temperature: Math.round((cur + d * st) * 10) / 10 }); };
      $("cup").addEventListener("click", () => stepT(1)); $("cdn").addEventListener("click", () => stepT(-1));
      $("climicon").addEventListener("click", () => this._openPopup(this._climate));
    }
    if (this._cover) {
      $("covup").addEventListener("click", () => this._call("cover", "open_cover", { entity_id: this._cover }));
      $("covstop").addEventListener("click", () => this._call("cover", "stop_cover", { entity_id: this._cover }));
      $("covdn").addEventListener("click", () => this._call("cover", "close_cover", { entity_id: this._cover }));
      $("covicon").addEventListener("click", () => this._openPopup(this._cover));
    }
    if (this._media) {
      $("mpp").addEventListener("click", () => this._call("media_player", "media_play_pause", { entity_id: this._media }));
      $("mprev").addEventListener("click", () => this._call("media_player", "media_previous_track", { entity_id: this._media }));
      $("mnext").addEventListener("click", () => this._call("media_player", "media_next_track", { entity_id: this._media }));
      $("mclick").addEventListener("click", () => this._openPopup(this._media));
      $("micon").addEventListener("click", () => this._openPopup(this._media));
    }
    if (this._scenes.length) {
      const sc = $("scenes");
      this._scenes.forEach((eid) => {
        const b = document.createElement("button"); b.className = "chip"; b.tabIndex = 0;
        b.textContent = this._short(eid);
        b.addEventListener("click", () => { const d = eid.split(".")[0]; this._call(d, d === "script" ? "turn_on" : "turn_on", { entity_id: eid }); if (window.jmaToast) jmaToast({ title: this._config.name, message: "▶ " + this._short(eid), icon: "mdi:palette", color: this._config.color }); });
        sc.appendChild(b);
      });
    }
    if (this._extra.length) {
      const grid = $("grid");
      this._extra.forEach((eid) => {
        const b = document.createElement("button"); b.className = "e"; b.dataset.e = eid; b.tabIndex = 0;
        const s = this._st(eid), a = s ? s.attributes : {};
        const icon = (a && a.icon) || DC_ICON[a && a.device_class] || { light: "mdi:lightbulb", switch: "mdi:power-socket-eu", sensor: "mdi:eye", binary_sensor: "mdi:checkbox-blank-circle", lock: "mdi:lock", fan: "mdi:fan" }[eid.split(".")[0]] || "mdi:circle";
        b.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span>${this._short(eid)}</span>`;
        b.addEventListener("click", () => this._openPopup(eid));
        grid.appendChild(b);
      });
    }
  }
  _briCap(s) { if (!s) return false; const m = s.attributes.supported_color_modes; return m ? m.some((x) => x !== "onoff") : s.attributes.brightness != null; }
  _badgeEl(icon, txt, cls) { return `<div class="pill2 ${cls || ""}"><ha-icon icon="${icon}"></ha-icon>${txt}</div>`; }
  _update() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    // badges ambiance
    const amb = [];
    const tS = this._st(this._config.temperature_entity);
    if (tS && !isNaN(parseFloat(tS.state))) { const t = parseFloat(tS.state); amb.push(this._badgeEl("mdi:thermometer", Math.round(t * 10) / 10 + "°", t <= 18 ? "cold" : t >= 25 ? "warn" : "")); }
    const hS = this._st(this._config.humidity_entity);
    if (hS && !isNaN(parseFloat(hS.state))) amb.push(this._badgeEl("mdi:water-percent", Math.round(parseFloat(hS.state)) + "%"));
    const pS = this._st(this._config.presence_entity);
    if (pS) { const n = parseFloat(pS.state); const present = isNaN(n) ? pS.state === "on" : n > 0; amb.push(this._badgeEl(present ? "mdi:account" : "mdi:account-outline", isNaN(n) ? (present ? "Présent" : "Vide") : n + " pers.")); }
    this._badges.forEach((eid) => { const s = this._st(eid); if (s) amb.push(this._badgeEl(s.attributes.icon || "mdi:information-outline", s.state + (s.attributes.unit_of_measurement || ""))); });
    if ($("amb")) $("amb").innerHTML = amb.join("");

    let onCount = 0;
    // lumières
    if (this._lights.length) {
      const onL = this._lights.filter((e) => { const s = this._st(e); return s && s.state === "on"; });
      onCount = onL.length;
      const lbtn = $("lbtn"); lbtn.classList.toggle("on", onCount > 0);
      $("lsub").textContent = onCount ? onCount + "/" + this._lights.length + " allumée" + (onCount > 1 ? "s" : "") : "Éteintes";
      const briLights = onL.filter((e) => this._briCap(this._st(e)));
      if (briLights.length) {
        const avg = Math.round(briLights.reduce((a, e) => a + (this._st(e).attributes.brightness || 0) / 255 * 100, 0) / briLights.length);
        this._lslider.hidden = false; this._lslider.setValue(avg);
      } else if (this._lights.some((e) => this._briCap(this._st(e)))) {
        this._lslider.hidden = false; this._lslider.setValue(0);
      } else this._lslider.hidden = true;
    }
    // climat
    if (this._climate) {
      const s = this._st(this._climate);
      if (s) {
        $("cset").textContent = s.attributes.temperature != null ? s.attributes.temperature + "°" : "—";
        const act = HVAC_ACTION_FR[s.attributes.hvac_action] || HVAC_FR[s.state] || s.state;
        const cur = s.attributes.current_temperature != null ? "Actuel " + s.attributes.current_temperature + "° · " : "";
        $("climsub").textContent = cur + act;
        $("climicon").classList.toggle("on", s.state !== "off" && s.state !== "unavailable");
      }
    }
    // volet
    if (this._cover) {
      const s = this._st(this._cover);
      if (s) { const p = s.attributes.current_position; $("covsub").textContent = p != null ? p + "% ouvert" : (s.state === "open" ? "Ouvert" : s.state === "closed" ? "Fermé" : s.state); $("covicon").classList.toggle("on", s.state === "open" || (p != null && p > 0)); }
    }
    // média
    if (this._media) {
      const s = this._st(this._media);
      if (s) {
        const playing = s.state === "playing";
        $("mtitle").textContent = s.attributes.media_title || (s.state === "off" ? "Éteint" : "À l'arrêt");
        $("msub").textContent = s.attributes.media_artist || (this._st(this._media).attributes.friendly_name || "");
        $("mpp").querySelector("ha-icon").setAttribute("icon", playing ? "mdi:pause" : "mdi:play");
        $("micon").classList.toggle("on", ["playing", "paused", "on"].includes(s.state));
      }
    }
    // extra grid états
    if (this._extra.length) this._extra.forEach((eid) => {
      const b = this.shadowRoot.querySelector(`.e[data-e="${eid}"]`); if (!b) return;
      const s = this._st(eid); const d = eid.split(".")[0];
      const on = s && (d === "cover" ? s.state === "open" : d === "media_player" ? ["playing", "paused", "on"].includes(s.state) : d === "climate" ? (s.state !== "off" && s.state !== "unavailable") : s.state === "on");
      b.classList.toggle("on", !!on);
      if (on && ["light", "switch", "fan", "input_boolean"].includes(d)) onCount++;
    });
    // résumé + vie de la pièce
    const tile = $("tile");
    const alive = onCount > 0 || (this._media && ["playing"].includes((this._st(this._media) || {}).state)) ||
      (this._climate && (() => { const s = this._st(this._climate); return s && s.state !== "off" && s.state !== "unavailable"; })());
    if (tile) tile.classList.toggle("alive", !!alive);
    const parts = [];
    if (tS && !isNaN(parseFloat(tS.state))) parts.push(Math.round(parseFloat(tS.state)) + "°");
    parts.push(onCount ? onCount + " allumé" + (onCount > 1 ? "s" : "") : "Tout calme");
    if ($("sum")) $("sum").textContent = parts.join(" · ");
  }
}
customElements.define("jma-room-card", JmaRoomCard);

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
  if (t === "custom:jma-room-card") return [
    txt("name"), { name: "icon", selector: { icon: {} } }, ent("entities", null, true, true), txt("color"), txt("accent"), themeSel];
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
    txt("grid_color"), txt("color"), txt("accent")];
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
  if (t === "custom:jma-vacuum-card") { schema.push(ent("battery_entity", "sensor"), ent("area_entity", "sensor"), ent("status_entity", "sensor")); }
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
customElements.define("jma-card-editor", JmaCardEditor);

// =============================================================================
//  TOASTS (notifications popup iOS)
// =============================================================================
// niveaux d'importance : info < success < warning < danger < critical (danger++)
const TOAST_LEVELS = {
  info:     { color: "#40c4ff", icon: "mdi:information",     duration: 4000 },
  success:  { color: "#69f0ae", icon: "mdi:check-circle",   duration: 3500 },
  warning:  { color: "#ffb300", icon: "mdi:alert",          duration: 6000 },
  danger:   { color: "#ff5252", icon: "mdi:alert-octagon",  duration: 9000 },
  critical: { color: "#ff1744", icon: "mdi:alert-octagon",  duration: 0 },   // danger++ : reste affiché
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
  if (/(danger|critique|urgent|fuite|incendie|fumée|intrusion|alarme|gaz|🚨|⚠)/.test(s)) return "critical";
  if (/(alerte|batterie faible|ouvert|échec|erreur|attention|warning)/.test(s)) return "danger";
  if (/(rappel|pense|bientôt|pluie|fenêtre)/.test(s)) return "warning";
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
      `<style>${BASE_CSS}:host{--jma-rose:${ROSE};--jma-beige:${BEIGE};--jma-dark:${DARK};}
        .cnt{min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--jma-rose);color:var(--jma-dark);
          font-weight:800;font-size:.74rem;display:none;align-items:center;justify-content:center;flex:none;}
        .cnt.show{display:flex;}
        .test{border:none;background:rgba(255,255,255,.12);color:#fff;border-radius:9px;cursor:pointer;
          width:30px;height:30px;flex:none;display:flex;align-items:center;justify-content:center;}
        .test:active{transform:scale(.9);} .test ha-icon{--mdc-icon-size:18px;}
        #list{display:flex;flex-direction:column;gap:6px;}
        .ntf{display:flex;gap:8px;align-items:flex-start;background:rgba(255,255,255,.06);border-radius:11px;padding:8px 10px;}
        .nt{font-weight:700;font-size:.78rem;}
        .nm{font-size:.72rem;opacity:.72;white-space:normal;overflow:hidden;}
        .nx{margin-left:auto;border:none;background:rgba(255,255,255,.12);color:#fff;border-radius:8px;cursor:pointer;
          width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;}
        .empty{font-size:.74rem;opacity:.55;padding:2px;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="top"><div class="badge"><ha-icon id="bic" icon="mdi:bell-outline"></ha-icon></div>
          <div class="meta"><div class="name">${this._config.title || "Notifications"}</div><div class="sub" id="sub">—</div></div>
          <button class="test" id="test" title="Tester une notif"><ha-icon icon="mdi:bell-ring"></ha-icon></button>
          <div class="cnt" id="cnt"></div></div>
        <div id="list"></div>
      </div></div></ha-card>`;
    this.shadowRoot.getElementById("test").addEventListener("click", () =>
      jmaToast({ title: "Test", message: "Notification de test JMA 🔔", icon: "mdi:bell-ring", color: ROSE }));
    this._built = true;
  }
  async _subscribe() {
    if (!this._hass || !this._hass.connection) return;
    this._subbed = true;
    try {
      await this._fetch();
      this._hass.connection.subscribeEvents(() => this._fetch(), "persistent_notifications_updated");
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
    list.innerHTML = "";
    cnt.classList.toggle("show", arr.length > 0);
    cnt.textContent = arr.length;
    sub.textContent = arr.length ? arr.length + " active" + (arr.length > 1 ? "s" : "") : "Aucune notification";
    this.shadowRoot.getElementById("bic").setAttribute("icon", arr.length ? "mdi:bell-badge" : "mdi:bell-outline");
    if (!arr.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = "Tout est lu 🎉"; list.appendChild(e); }
    arr.forEach((n) => {
      const id = n.notification_id || n.id;
      const lvl = jmaGuessLevel((n.title || "") + " " + (n.message || ""));
      const col = (TOAST_LEVELS[lvl] || {}).color || ROSE;
      const row = document.createElement("div"); row.className = "ntf";
      row.style.borderLeft = "3px solid " + col;
      row.innerHTML = `<div style="min-width:0;flex:1;"><div class="nt">${n.title || "Notification"}</div>` +
        `<div class="nm">${(n.message || "").toString().slice(0, 180)}</div></div>` +
        `<button class="nx" title="Rejeter"><ha-icon icon="mdi:close" style="--mdc-icon-size:16px;"></ha-icon></button>`;
      row.querySelector(".nx").addEventListener("click", () =>
        this._hass.callService("persistent_notification", "dismiss", { notification_id: id }));
      list.appendChild(row);
      if (id && !this._seen.has(id)) {
        this._seen.add(id);
        if (this._ever) jmaToast({ title: n.title || "Notification", message: (n.message || "").toString().slice(0, 120), level: lvl });
      }
    });
    this._ever = true;
  }
}
customElements.define("jma-notify-card", JmaNotifyCard);

// =============================================================================
window.customCards = window.customCards || [];
const REG = (type, name, description) => window.customCards.push({ type, name, description, preview: true });
REG("jma-card", "JMA Card (auto)", "Carte universelle flat/iOS : slider horizontal + pop-up.");
REG("jma-light-card", "JMA Lumière", "Lumière : slider de luminosité, tap = on/off.");
REG("jma-switch-card", "JMA Interrupteur", "Interrupteur : pastille on/off iOS.");
REG("jma-cover-card", "JMA Volet", "Volet : Ouvrir / Stop / Fermer + position.");
REG("jma-thermostat-card", "JMA Thermostat", "Climat : consigne ± + modes.");
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
REG("jma-energy-card", "JMA Énergie", "Conso/production : bleu EDF, rose solaire dominant.");
REG("jma-weather-card", "JMA Météo", "Conditions actuelles + prévisions du jour.");
REG("jma-sensor-card", "JMA Capteur", "Valeur + mini-graphe sur la tuile.");
REG("jma-room-card", "JMA Pièce", "Regroupe les entités d'une pièce.");
REG("jma-cameras-card", "JMA Multi-caméras", "Mosaïque de caméras.");
REG("jma-sonos-card", "JMA Sonos", "Multi-room : groupes + volume par pièce.");
REG("jma-saint-card", "JMA Saint du jour", "Saint du jour (calendrier français).");

console.info(
  `%c JMA-CARDS %c v${VERSION} `,
  "background:#f8a5c2;color:#0a0a0b;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#0a0a0b;color:#f8a5c2;border-radius:0 4px 4px 0;padding:2px 6px"
);
