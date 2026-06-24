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

const VERSION = "0.9.0";
const ROSE = "#f8a5c2";
const BEIGE = "#DEC198";
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

// =============================================================================
//  STYLE & HELPERS PARTAGÉS
// =============================================================================
const BASE_CSS = `
  .tile{position:relative;overflow:hidden;border-radius:18px;min-height:60px;height:100%;
    padding:11px;box-sizing:border-box;background:rgba(255,255,255,.06);
    backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);
    color:#fff;user-select:none;display:flex;touch-action:pan-y;
    transition:transform .22s cubic-bezier(.2,.7,.3,1),background .3s ease;}
  .tile:not(.flat){cursor:pointer;}
  .tile:not(.flat):hover{transform:scale(1.02);}
  .tile.active{transform:scale(.985);}
  .content{position:relative;z-index:1;display:flex;flex-direction:column;
    justify-content:space-between;gap:9px;width:100%;}
  .top{display:flex;align-items:center;gap:9px;}
  .badge{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.12);flex:none;
    display:flex;align-items:center;justify-content:center;transition:background .3s ease;}
  .badge ha-icon{--mdc-icon-size:20px;color:rgba(255,255,255,.78);transition:color .3s;}
  .meta{min-width:0;flex:1;}
  .name{font-weight:600;font-size:clamp(.8rem,2.2vw,.94rem);letter-spacing:-.2px;line-height:1.12;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sub{font-size:clamp(.66rem,1.7vw,.76rem);opacity:.62;margin-top:1px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .tile.on .badge{background:rgba(10,10,11,.16);}
  .tile.on .badge ha-icon{color:var(--jma-dark);}

  /* slider horizontal */
  .slider{position:relative;height:30px;border-radius:11px;overflow:hidden;flex:none;
    background:rgba(255,255,255,.14);touch-action:none;cursor:pointer;}
  .slider[hidden]{display:none;}
  .sfill{position:absolute;left:0;top:0;bottom:0;width:0%;pointer-events:none;
    background:linear-gradient(90deg,var(--jma-beige) 0%,var(--jma-rose) 100%);
    transition:width .28s cubic-bezier(.2,.7,.3,1);}
  .slider.dragging .sfill{transition:none;}
  .sval{position:absolute;left:10px;top:50%;transform:translateY(-50%);z-index:2;pointer-events:none;
    font-weight:700;font-size:.78rem;text-shadow:0 1px 2px rgba(0,0,0,.28);}
  .sicon{position:absolute;right:9px;top:50%;transform:translateY(-50%);z-index:2;pointer-events:none;
    --mdc-icon-size:16px;color:rgba(255,255,255,.85);}

  /* pastille on/off (switch) */
  .pill{width:50px;height:30px;border-radius:999px;background:rgba(255,255,255,.2);flex:none;
    position:relative;transition:background .3s ease;cursor:pointer;}
  .pill .knob{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;
    box-shadow:0 2px 6px rgba(0,0,0,.35);transition:left .26s cubic-bezier(.2,.8,.2,1);}
  .tile.on .pill{background:var(--jma-rose);}
  .tile.on .pill .knob{left:23px;}

  /* boutons de contrôle */
  .btnrow{display:flex;gap:6px;flex-wrap:wrap;}
  .cbtn{flex:1 1 auto;min-width:46px;height:34px;border:none;border-radius:11px;cursor:pointer;
    background:rgba(255,255,255,.1);color:#fff;display:flex;align-items:center;justify-content:center;gap:5px;
    font-weight:600;font-size:.76rem;transition:background .2s,transform .08s;}
  .cbtn:hover{background:rgba(248,165,194,.2);}
  .cbtn:active{transform:scale(.93);}
  .cbtn ha-icon{--mdc-icon-size:18px;}
  .cbtn.accent{background:var(--jma-rose);color:var(--jma-dark);}

  /* stepper thermostat */
  .therm{display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .set{font-weight:800;font-size:1.35rem;letter-spacing:-1px;text-align:center;flex:1;}
  .step{width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,.12);
    color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .08s;}
  .step ha-icon{--mdc-icon-size:20px;}
  .step:active{transform:scale(.9);}

  /* chips (modes) */
  .chips{display:flex;gap:5px;flex-wrap:wrap;}
  .chip{padding:4px 8px;border-radius:9px;background:rgba(255,255,255,.1);font-size:.68rem;cursor:pointer;
    border:none;color:#fff;text-transform:capitalize;transition:background .2s;}
  .chip.on{background:var(--jma-rose);color:var(--jma-dark);font-weight:700;}

  /* ripple */
  .tile::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
    background:radial-gradient(circle at var(--rx,50%) var(--ry,50%),rgba(255,255,255,.35) 0%,transparent 55%);
    opacity:0;transform:scale(.3);}
  .tile.ripple::after{animation:jma-ripple .55s ease-out;}
  @keyframes jma-ripple{0%{opacity:.6;transform:scale(.3);}100%{opacity:0;transform:scale(1.6);}}

  /* divers */
  .tile.dim{opacity:.45;}
  .art{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;
    opacity:.22;filter:blur(8px) saturate(1.25);transition:opacity .4s,background-image .4s;}
  .bigbat{display:flex;align-items:center;gap:2px;font-size:.8rem;font-weight:700;opacity:.85;flex:none;}
  .bigbat ha-icon{--mdc-icon-size:18px;}
`;

const CARD_WRAP_OPEN = '<ha-card style="background:none;border:none;box-shadow:none;">';

// slider horizontal réutilisable -> renvoie un élément .slider avec .setValue(v) et .dragging
function jmaSlider({ fmt, onCommit, onInput, icon }) {
  const el = document.createElement("div");
  el.className = "slider";
  el.innerHTML =
    `<div class="sfill"></div><span class="sval"></span>` +
    (icon ? `<ha-icon class="sicon" icon="${icon}"></ha-icon>` : "");
  const fill = el.querySelector(".sfill");
  const val = el.querySelector(".sval");
  let pending = null;
  el.dragging = false;
  const valFromX = (e) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100)));
  };
  const paint = (v) => {
    fill.style.width = v + "%";
    val.textContent = fmt ? fmt(v) : v + "%";
  };
  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    el.dragging = true;
    el.classList.add("dragging");
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    pending = valFromX(e);
    paint(pending);
    if (onInput) onInput(pending);
  });
  el.addEventListener("pointermove", (e) => {
    if (!el.dragging) return;
    pending = valFromX(e);
    paint(pending);
    if (onInput) onInput(pending);
  });
  const end = (e) => {
    if (e) e.stopPropagation();
    if (!el.dragging) return;
    el.dragging = false;
    el.classList.remove("dragging");
    if (pending != null) onCommit(pending);
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
    return `<style>:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}${BASE_CSS}${extra || ""}</style>`;
  }
  _icon(s, fallback) {
    return this._config.icon || (s && s.attributes.icon) || fallback;
  }
  // clic simple -> onTap (pop-up par défaut) ; appui long -> fiche HA.
  // Les gestes démarrés sur un contrôle inline (slider/boutons/pastille) sont ignorés.
  _wireHold(el, onTap) {
    const CTRL = ["slider", "cbtn", "pill", "step", "chip"];
    let holdTimer, holdFired, skip, sx, sy;
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
    this.shadowRoot.querySelector(".name").textContent = (this._config.name || this._config.entity) + " (indispo)";
    const sub = this.shadowRoot.querySelector(".sub");
    if (sub) sub.textContent = "";
    const tile = this.shadowRoot.querySelector(".tile");
    if (tile) tile.classList.add("dim");
  }
  _dim(tile, s) {
    if (tile) tile.classList.toggle("dim", !s || ["unavailable", "unknown"].includes(s.state));
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
  }
}

// =============================================================================
//  🪟 VOLET
// =============================================================================
class JmaCoverCard extends JmaBase {
  static getStubConfig() { return { entity: "cover.example" }; }
  _build() {
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile flat"><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div></div>
         <div class="btnrow">
           <button class="cbtn" data-a="open_cover"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
           <button class="cbtn" data-a="stop_cover"><ha-icon icon="mdi:stop"></ha-icon></button>
           <button class="cbtn" data-a="close_cover"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
         </div>
       </div></div></ha-card>`;
    this._wireHold(this.shadowRoot.querySelector(".tile"), () => this._tapAction());
    this.shadowRoot.querySelectorAll(".cbtn").forEach((b) =>
      b.addEventListener("click", () => this._call("cover", b.dataset.a, { entity_id: this._config.entity }))
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
    this._dim(this.shadowRoot.querySelector(".tile"), s);
  }
}

// =============================================================================
//  🔊 MÉDIA
// =============================================================================
class JmaMediaCard extends JmaBase {
  static getStubConfig() { return { entity: "media_player.example" }; }
  _build() {
    this.shadowRoot.innerHTML = this._styleBlock() + CARD_WRAP_OPEN +
      `<div class="tile flat" id="tile"><div class="art"></div><div class="content">
         <div class="top"><div class="badge"><ha-icon class="ic"></ha-icon></div>
           <div class="meta"><div class="name"></div><div class="sub"></div></div></div>
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
    // pochette en fond
    const art = this.shadowRoot.querySelector(".art");
    const pic = a.entity_picture;
    if (pic && ["playing", "paused"].includes(s.state)) art.style.backgroundImage = `url("${pic}")`;
    else art.style.backgroundImage = "";
  }
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
        b.addEventListener("click", () => {
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
  set hass(h) { this._hass = h; if (this._built) this._refresh(); }
  connectedCallback() {
    this._build();
    requestAnimationFrame(() => this.shadowRoot.getElementById("wrap").classList.add("show"));
  }
  get _s() { return this._hass && this._config.entity ? this._hass.states[this._config.entity] : undefined; }
  _domain() { return (this._config.entity || "x.x").split(".")[0]; }
  _kind() { return this._config.kind || this._domain(); }
  _close() {
    clearInterval(this._camTimer);
    const w = this.shadowRoot.getElementById("wrap");
    w.classList.remove("show");
    setTimeout(() => { this.dispatchEvent(new CustomEvent("jma-close")); this.remove(); }, 260);
  }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host{--jma-rose:${c.color || ROSE};--jma-beige:${c.accent || BEIGE};--jma-dark:${c.dark || DARK};}
        .back{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);
          backdrop-filter:blur(6px);opacity:0;transition:opacity .26s ease;display:flex;align-items:flex-end;justify-content:center;}
        .back.show{opacity:1;}
        .sheet{width:100%;max-width:460px;margin:0 12px 12px;box-sizing:border-box;
          background:rgba(20,20,22,.86);backdrop-filter:blur(28px) saturate(160%);
          -webkit-backdrop-filter:blur(28px) saturate(160%);border:1px solid rgba(255,255,255,.08);
          border-radius:28px;color:#fff;padding:18px 18px 22px;transform:translateY(40px);opacity:0;
          transition:transform .3s cubic-bezier(.2,.8,.25,1),opacity .3s ease;}
        @media(min-width:768px){.back{align-items:center;} .sheet{margin:0;}}
        .back.show .sheet{transform:translateY(0);opacity:1;}
        .grab{width:38px;height:4px;border-radius:999px;background:rgba(255,255,255,.25);margin:0 auto 14px;}
        .head{display:flex;align-items:center;gap:12px;margin-bottom:18px;}
        .hicon{width:48px;height:48px;border-radius:50%;background:rgba(248,165,194,.18);display:flex;align-items:center;justify-content:center;}
        .hicon ha-icon{--mdc-icon-size:26px;color:var(--jma-rose);}
        .htxt{flex:1;min-width:0;}
        .htitle{font-weight:700;font-size:1.1rem;letter-spacing:-.3px;}
        .hsub{font-size:.82rem;opacity:.6;margin-top:2px;}
        .x{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,.1);color:#fff;font-size:1rem;}
        .row{margin:16px 0;}
        .lbl{display:flex;justify-content:space-between;font-size:.82rem;opacity:.7;margin-bottom:8px;}
        .lbl b{color:var(--jma-rose);font-weight:700;}
        input[type=range]{width:100%;height:34px;-webkit-appearance:none;appearance:none;background:transparent;accent-color:var(--jma-rose);margin:0;}
        input[type=range]::-webkit-slider-runnable-track{height:34px;border-radius:14px;background:rgba(255,255,255,.12);}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;margin-top:2px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.4);}
        input[type=range]::-moz-range-track{height:34px;border-radius:14px;background:rgba(255,255,255,.12);}
        input[type=range]::-moz-range-thumb{width:30px;height:30px;border:none;border-radius:50%;background:#fff;}
        .swatches{display:flex;gap:10px;flex-wrap:wrap;}
        .sw{width:36px;height:36px;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,.15);transition:transform .2s;}
        .sw:hover{transform:scale(1.12);}
        .btns{display:flex;gap:8px;flex-wrap:wrap;}
        .btn{flex:1;min-width:84px;padding:13px;border:none;border-radius:16px;cursor:pointer;background:rgba(255,255,255,.08);color:#fff;font-weight:600;font-size:.9rem;transition:all .2s;}
        .btn:hover{background:rgba(248,165,194,.18);}
        .btn.primary{background:var(--jma-rose);color:var(--jma-dark);}
        .btn.on{background:var(--jma-rose);color:var(--jma-dark);}
        .transport{display:flex;justify-content:center;gap:18px;align-items:center;}
        .tbtn{width:54px;height:54px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,.08);color:#fff;display:flex;align-items:center;justify-content:center;}
        .tbtn ha-icon{--mdc-icon-size:26px;}
        .tbtn.big{width:64px;height:64px;background:var(--jma-rose);}
        .tbtn.big ha-icon{color:var(--jma-dark);}
        .gaugewrap{height:10px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:8px;}
        .gaugefill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--jma-beige),var(--jma-rose));transition:width .4s;}
        .kv{display:flex;flex-wrap:wrap;gap:8px;}
        .kv .cell{flex:1 1 40%;min-width:120px;background:rgba(255,255,255,.06);border-radius:12px;padding:9px 11px;box-sizing:border-box;}
        .kv .k{font-size:.7rem;opacity:.6;} .kv .v{font-weight:700;font-size:.95rem;margin-top:2px;}
        .bignum{font-weight:800;font-size:2rem;letter-spacing:-1px;}
        .statebig{font-weight:800;font-size:1.3rem;margin:2px 0;}
        .chiprow{display:flex;gap:6px;flex-wrap:wrap;}
        .pchip{padding:7px 11px;border-radius:11px;background:rgba(255,255,255,.1);border:none;color:#fff;cursor:pointer;font-size:.8rem;text-transform:capitalize;}
        .pchip.on{background:var(--jma-rose);color:var(--jma-dark);font-weight:700;}
        .camimg{width:100%;border-radius:16px;display:block;background:#000;aspect-ratio:16/9;object-fit:cover;}
        .graph{--ha-card-background:transparent;--card-background-color:transparent;background:transparent;display:block;}
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
    wrap.addEventListener("click", (e) => { if (e.target === wrap) this._close(); });
    this.shadowRoot.getElementById("x").addEventListener("click", () => this._close());
    this._built = true;
    this._renderBody();
    this._refresh();
  }
  _refresh() {
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
    (this._graphs || []).forEach((g) => (g.hass = this._hass));
  }
  _popupIcon() {
    return { light: "mdi:lightbulb", climate: "mdi:thermostat", media_player: "mdi:speaker", cover: "mdi:window-shutter",
      alarm_control_panel: "mdi:shield-home", vacuum: "mdi:robot-vacuum", camera: "mdi:cctv" }[this._domain()] || "mdi:tune";
  }
  _headSub(s) {
    const d = this._domain();
    if (d === "climate") return (s.attributes.current_temperature != null ? "Actuel " + s.attributes.current_temperature + "° · " : "") + (HVAC_FR[s.state] || s.state);
    if (d === "media_player") return s.attributes.media_title || s.state;
    if (d === "alarm_control_panel") return ALARM_FR[s.state] || s.state;
    if (d === "vacuum") return VACUUM_FR[s.state] || s.state;
    if (d === "camera") return s.state === "recording" ? "Enregistre" : s.state;
    return s.state === "on" ? "Allumé" : s.state === "off" ? "Éteint" : s.state;
  }
  _renderBody() {
    const body = this.shadowRoot.getElementById("body");
    body.innerHTML = ""; this._graphs = [];
    if (this._kind() === "ev") return this._evBody(body);
    if (this._kind() === "energy") return this._energyBody(body);
    const d = this._domain();
    if (d === "light") return this._lightBody(body);
    if (d === "climate") return this._climateBody(body);
    if (d === "media_player") return this._mediaBody(body);
    if (d === "cover") return this._coverBody(body);
    if (d === "alarm_control_panel") return this._alarmBody(body);
    if (d === "vacuum") return this._vacuumBody(body);
    if (d === "camera") return this._cameraBody(body);
    return this._toggleBody(body);
  }
  async _graph(host, entities, hours) {
    try {
      entities = (entities || []).filter(Boolean);
      if (!window.loadCardHelpers || !entities.length) return;
      const helpers = await window.loadCardHelpers();
      const el = helpers.createCardElement({ type: "history-graph", entities, hours_to_show: hours || 24, show_names: entities.length > 1 });
      el.hass = this._hass; el.classList.add("graph");
      host.appendChild(el);
      (this._graphs = this._graphs || []).push(el);
    } catch (e) {}
  }
  _evState() {
    const ch = this._config.charging_entity && this._hass.states[this._config.charging_entity];
    const pl = this._config.plug_entity && this._hass.states[this._config.plug_entity];
    if (ch && ch.state === "on") return "En charge";
    if (pl && pl.state === "on") return "Branchée";
    return "Débranchée";
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
      b.addEventListener("click", () => {
        const data = { entity_id: this._config.entity };
        if (this._config.code != null) data.code = String(this._config.code);
        this._call("alarm_control_panel", svc, data);
      });
      row.appendChild(b);
    });
    body.appendChild(row);
    const gh = document.createElement("div"); gh.className = "row"; body.appendChild(gh);
    this._graph(gh, [this._config.entity], 48);
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
    const bt = num("battery_temp_entity"); if (bt != null) cells.push(["Temp. batterie", bt + " °C"]);
    const et = num("ext_temp_entity"); if (et != null) cells.push(["Temp. ext.", et + " °C"]);
    const mil = num("mileage_entity"); if (mil != null) cells.push(["Kilométrage", Math.round(mil) + " km"]);
    [["tire_fl", "Pneu AV G"], ["tire_fr", "Pneu AV D"], ["tire_rl", "Pneu AR G"], ["tire_rr", "Pneu AR D"]].forEach(([k, lbl]) => {
      const v = num(k); if (v != null) cells.push([lbl, Math.round(v) + " mbar"]);
    });
    const kv = document.createElement("div"); kv.className = "row kv";
    kv.innerHTML = cells.map(([k, v]) => `<div class="cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    body.appendChild(kv);
    const row = document.createElement("div"); row.className = "row btns";
    const addB = (k, label, prim) => { if (!this._config[k]) return; const b = document.createElement("button"); b.className = "btn" + (prim ? " primary" : ""); b.textContent = label; b.addEventListener("click", () => this._press(this._config[k])); row.appendChild(b); };
    addB("charge_start", "Charger", true); addB("charge_stop", "Stopper"); addB("climate_button", "Climatisation");
    if (row.childElementCount) body.appendChild(row);
    const gh = document.createElement("div"); gh.className = "row"; body.appendChild(gh);
    this._graph(gh, [this._config.battery_entity, this._config.range_entity], 48);
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
  _cameraBody(body) {
    const s = this._s;
    const row = document.createElement("div"); row.className = "row";
    row.innerHTML = `<img class="camimg" id="cam" src="${s.attributes.entity_picture || ""}">`;
    body.appendChild(row);
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
    clearInterval(this._camTimer);
    this._camTimer = setInterval(() => {
      const img = this.shadowRoot.getElementById("cam"); const st = this._s;
      if (img && st && st.attributes.entity_picture) {
        const p = st.attributes.entity_picture;
        img.src = p + (p.includes("?") ? "&" : "?") + "_=" + Date.now();
      }
    }, 2500);
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
  }
  _coverBody(body) {
    const s = this._s;
    body.appendChild(this._slider("pos", "Position", s.attributes.current_position ?? 0, (x) => x + " %",
      (x) => this._call("cover", "set_cover_position", { entity_id: this._config.entity, position: x })));
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
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } this._update(); if (this._popup) this._popup.hass = h; }
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
    const isCharging = charging && charging.state === "on";
    const isPlugged = plug && plug.state === "on";
    this.shadowRoot.getElementById("pc").textContent = bat != null ? bat + "%" : "—";
    this.shadowRoot.getElementById("g").style.width = (bat != null ? Math.max(0, Math.min(100, bat)) : 0) + "%";
    this.shadowRoot.getElementById("rng").textContent = rng != null ? "⚡ " + Math.round(rng) + " km" : "";
    this.shadowRoot.getElementById("eta").textContent = isCharging && rem != null ? "⏱ " + Math.round(rem) + " min" : "";
    this.shadowRoot.getElementById("ic").setAttribute("icon", isCharging ? "mdi:battery-charging-high" : isPlugged ? "mdi:power-plug" : "mdi:car-electric");
    this.shadowRoot.getElementById("sub").textContent = isCharging ? "En charge" : isPlugged ? "Branchée" : "Débranchée";
    this.shadowRoot.getElementById("tile").classList.toggle("on", isCharging);
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
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } this._update(); }
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
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } this._update(); if (this._popup) this._popup.hass = h; }
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
//  🧑‍🤝‍🧑 PRÉSENCE (avatars)
// =============================================================================
class JmaPresenceCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, ...c }; this._persons = c.persons || c.entities || (c.entity ? [c.entity] : []); }
  getCardSize() { return 1; }
  static getStubConfig() { return { persons: ["person.example"] }; }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } this._update(); }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .ppl{display:flex;gap:12px;flex-wrap:wrap;justify-content:space-around;width:100%;}
        .p{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;}
        .av{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.12);background-size:cover;background-position:center;
          position:relative;border:2px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:1.1rem;color:#fff;}
        .p.home .av{border-color:#69f0ae;}
        .p.away .av{filter:grayscale(.7) brightness(.85);opacity:.65;}
        .b2{position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;border:2px solid var(--jma-dark);
          display:flex;align-items:center;justify-content:center;}
        .p.home .b2{background:#69f0ae;} .p.away .b2{background:#8a8a8e;}
        .b2 ha-icon{--mdc-icon-size:11px;color:#0a0a0b;}
        .pn{font-weight:600;font-size:.78rem;} .ps{font-size:.66rem;opacity:.6;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="ppl" id="ppl"></div>
      </div></div></ha-card>`;
  }
  _update() {
    const ppl = this.shadowRoot.getElementById("ppl"); ppl.innerHTML = "";
    this._persons.forEach((eid) => {
      const s = this._hass.states[eid]; if (!s) return;
      const home = s.state === "home";
      const name = (this._config.names && this._config.names[eid]) || s.attributes.friendly_name || eid.split(".")[1];
      const pic = s.attributes.entity_picture;
      const zone = home ? "Présent" : (s.state === "not_home" ? "Absent" : s.state);
      const el = document.createElement("div"); el.className = "p " + (home ? "home" : "away");
      el.innerHTML = `<div class="av" style="${pic ? `background-image:url('${pic}')` : ""}">${pic ? "" : name.slice(0, 1).toUpperCase()}` +
        `<span class="b2"><ha-icon icon="${home ? "mdi:check" : "mdi:home-export-outline"}"></ha-icon></span></div>` +
        `<div class="pn">${name}</div><div class="ps">${zone}</div>`;
      el.addEventListener("click", () => this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: eid } })));
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
  setConfig(c) { this._config = { color: ROSE, accent: BEIGE, dark: DARK, days: 7, title: "Agenda", ...c }; this._cals = c.entities || (c.entity ? [c.entity] : []); }
  getCardSize() { return 3; }
  static getStubConfig() { return { title: "Agenda", days: 7, entities: ["calendar.example"] }; }
  set hass(h) { const first = !this._hass; this._hass = h; if (!this._built) { this._build(); this._built = true; } if (first || this._stale()) this._fetch(); }
  _stale() { return !this._last || Date.now() - this._last > 180000; }
  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}:host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        #list{display:flex;flex-direction:column;gap:4px;}
        .day{font-weight:800;font-size:.72rem;opacity:.55;margin-top:8px;text-transform:capitalize;}
        .ev{display:flex;gap:9px;align-items:center;background:rgba(255,255,255,.06);border-radius:11px;padding:7px 10px;}
        .seg{width:3px;align-self:stretch;border-radius:3px;background:var(--jma-rose);}
        .t{font-size:.7rem;opacity:.7;min-width:40px;font-weight:700;}
        .ti{font-size:.79rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .empty{font-size:.76rem;opacity:.55;padding:6px 2px;}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;"><div class="tile flat"><div class="content">
        <div class="top"><div class="badge"><ha-icon icon="mdi:calendar-month"></ha-icon></div>
          <div class="meta"><div class="name">${c.title}</div><div class="sub" id="sub"></div></div></div>
        <div id="list"></div>
      </div></div></ha-card>`;
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
    let last = "";
    evs.forEach(({ d, allday, e }) => {
      const dk = d.toDateString();
      if (dk !== last) { last = dk; const h = document.createElement("div"); h.className = "day"; h.textContent = dn[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1); list.appendChild(h); }
      const row = document.createElement("div"); row.className = "ev";
      const tt = allday ? "journée" : ("" + d.getHours()).padStart(2, "0") + ":" + ("" + d.getMinutes()).padStart(2, "0");
      row.innerHTML = `<div class="seg"></div><div class="t">${tt}</div><div class="ti">${e.summary || e.message || "(sans titre)"}</div>`;
      list.appendChild(row);
    });
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
    this._config = { color: ROSE, accent: BEIGE, dark: DARK, grid_color: "#3b9bff", title: "Énergie", ...c };
  }
  getCardSize() { return 2; }
  static getStubConfig() { return { title: "Énergie", production_entity: "sensor.solar_power", grid_entity: "sensor.grid_power" }; }
  set hass(h) { this._hass = h; if (!this._built) { this._build(); this._built = true; } this._update(); if (this._popup) this._popup.hass = h; }
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
  }
}
customElements.define("jma-energy-card", JmaEnergyCard);

// =============================================================================
//  ÉDITEUR VISUEL (clic sur la carte en mode édition du dashboard)
// =============================================================================
const ED_LABELS = {
  entity: "Entité", name: "Nom", icon: "Icône", color: "Couleur d'accent",
  accent: "Couleur secondaire", tap_action: "Clic simple", slider: "Type de slider",
  battery_entity: "Capteur batterie", area_entity: "Capteur pièce en cours",
  status_entity: "Capteur d'état", code: "Code (optionnel)", title: "Titre",
};
function jmaEditorSchema(type) {
  const t = type || "custom:jma-card";
  const dom = {
    "custom:jma-light-card": "light",
    "custom:jma-switch-card": ["switch", "input_boolean", "fan"],
    "custom:jma-cover-card": "cover",
    "custom:jma-thermostat-card": "climate",
    "custom:jma-media-card": "media_player",
    "custom:jma-vacuum-card": "vacuum",
    "custom:jma-scene-card": ["scene", "script"],
    "custom:jma-alarm-card": "alarm_control_panel",
  }[t];
  const schema = [
    { name: "entity", required: true, selector: { entity: dom ? { domain: dom } : {} } },
    { name: "name", selector: { text: {} } },
    { name: "icon", selector: { icon: {} } },
  ];
  if (t === "custom:jma-card")
    schema.push({ name: "slider", selector: { select: { mode: "dropdown", options:
      ["auto", "brightness", "temperature", "volume", "position", "none"].map((v) => ({ value: v, label: v })) } } });
  if (t === "custom:jma-vacuum-card") {
    schema.push({ name: "battery_entity", selector: { entity: { domain: "sensor" } } });
    schema.push({ name: "area_entity", selector: { entity: { domain: "sensor" } } });
  }
  if (t === "custom:jma-alarm-card") schema.push({ name: "code", selector: { text: {} } });
  schema.push({ name: "color", selector: { text: {} } });
  schema.push({ name: "accent", selector: { text: {} } });
  schema.push({ name: "tap_action", selector: { select: { mode: "dropdown", options: [
    { value: "popup", label: "Pop-up JMA" }, { value: "more-info", label: "Fiche HA" }, { value: "none", label: "Aucun" }] } } });
  return schema;
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
  set hass(h) { this._hass = h; if (!this._built) this._build(); if (!this._subbed) this._subscribe(); }
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

console.info(
  `%c JMA-CARDS %c v${VERSION} `,
  "background:#f8a5c2;color:#0a0a0b;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#0a0a0b;color:#f8a5c2;border-radius:0 4px 4px 0;padding:2px 6px"
);
