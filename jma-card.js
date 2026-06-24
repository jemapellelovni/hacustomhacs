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

const VERSION = "0.5.0";
const ROSE = "#f8a5c2";
const BEIGE = "#DEC198";
const DARK = "#0a0a0b";

// =============================================================================
//  STYLE & HELPERS PARTAGÉS
// =============================================================================
const BASE_CSS = `
  .tile{position:relative;overflow:hidden;border-radius:22px;min-height:118px;height:100%;
    padding:14px;box-sizing:border-box;background:rgba(255,255,255,.06);
    backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);
    color:#fff;user-select:none;display:flex;touch-action:pan-y;
    transition:transform .22s cubic-bezier(.2,.7,.3,1),background .3s ease;}
  .tile:not(.flat){cursor:pointer;}
  .tile:not(.flat):hover{transform:scale(1.02);}
  .tile.active{transform:scale(.985);}
  .content{position:relative;z-index:1;display:flex;flex-direction:column;
    justify-content:space-between;gap:12px;width:100%;}
  .top{display:flex;align-items:center;gap:10px;}
  .badge{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.12);flex:none;
    display:flex;align-items:center;justify-content:center;transition:background .3s ease;cursor:pointer;}
  .badge ha-icon{--mdc-icon-size:24px;color:rgba(255,255,255,.78);transition:color .3s;}
  .meta{min-width:0;flex:1;}
  .name{font-weight:600;font-size:clamp(.85rem,2.4vw,1.02rem);letter-spacing:-.2px;line-height:1.15;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sub{font-size:clamp(.68rem,1.8vw,.8rem);opacity:.62;margin-top:2px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .tile.on .badge{background:rgba(10,10,11,.16);}
  .tile.on .badge ha-icon{color:var(--jma-dark);}

  /* slider horizontal */
  .slider{position:relative;height:36px;border-radius:13px;overflow:hidden;flex:none;
    background:rgba(255,255,255,.14);touch-action:none;cursor:pointer;}
  .slider[hidden]{display:none;}
  .sfill{position:absolute;left:0;top:0;bottom:0;width:0%;pointer-events:none;
    background:linear-gradient(90deg,var(--jma-beige) 0%,var(--jma-rose) 100%);
    transition:width .28s cubic-bezier(.2,.7,.3,1);}
  .slider.dragging .sfill{transition:none;}
  .sval{position:absolute;left:12px;top:50%;transform:translateY(-50%);z-index:2;pointer-events:none;
    font-weight:700;font-size:.82rem;text-shadow:0 1px 2px rgba(0,0,0,.28);}
  .sicon{position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:2;pointer-events:none;
    --mdc-icon-size:18px;color:rgba(255,255,255,.85);}

  /* pastille on/off (switch) */
  .pill{width:56px;height:32px;border-radius:999px;background:rgba(255,255,255,.2);flex:none;
    position:relative;transition:background .3s ease;}
  .pill .knob{position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;
    box-shadow:0 2px 6px rgba(0,0,0,.35);transition:left .26s cubic-bezier(.2,.8,.2,1);}
  .tile.on .pill{background:var(--jma-rose);}
  .tile.on .pill .knob{left:27px;}

  /* boutons de contrôle */
  .btnrow{display:flex;gap:8px;flex-wrap:wrap;}
  .cbtn{flex:1 1 auto;min-width:52px;height:42px;border:none;border-radius:13px;cursor:pointer;
    background:rgba(255,255,255,.1);color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;
    font-weight:600;font-size:.8rem;transition:background .2s,transform .08s;}
  .cbtn:hover{background:rgba(248,165,194,.2);}
  .cbtn:active{transform:scale(.93);}
  .cbtn ha-icon{--mdc-icon-size:20px;}
  .cbtn.accent{background:var(--jma-rose);color:var(--jma-dark);}

  /* stepper thermostat */
  .therm{display:flex;align-items:center;justify-content:space-between;gap:10px;}
  .set{font-weight:800;font-size:1.7rem;letter-spacing:-1px;text-align:center;flex:1;}
  .step{width:42px;height:42px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,.12);
    color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .08s;}
  .step ha-icon{--mdc-icon-size:24px;}
  .step:active{transform:scale(.9);}

  /* chips (modes) */
  .chips{display:flex;gap:6px;flex-wrap:wrap;}
  .chip{padding:6px 9px;border-radius:10px;background:rgba(255,255,255,.1);font-size:.72rem;cursor:pointer;
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
  setConfig(config) {
    if (!config.entity) throw new Error("jma : 'entity' est requis");
    this._config = { hold_action: "popup", color: ROSE, accent: BEIGE, dark: DARK, ...config };
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
  // long-press -> pop-up ; tap -> onTap (optionnel)
  _wireHold(el, onTap) {
    let holdTimer, holdFired, sx, sy;
    el.addEventListener("pointerdown", (e) => {
      holdFired = false; sx = e.clientX; sy = e.clientY;
      el.classList.add("active");
      const r = el.getBoundingClientRect();
      el.style.setProperty("--rx", ((e.clientX - r.left) / r.width) * 100 + "%");
      el.style.setProperty("--ry", ((e.clientY - r.top) / r.height) * 100 + "%");
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      if (this._config.hold_action !== "none") {
        holdTimer = setTimeout(() => {
          holdFired = true;
          if (navigator.vibrate) navigator.vibrate(12);
          this._hold();
        }, 480);
      }
    });
    el.addEventListener("pointermove", (e) => {
      if (sx == null) return;
      if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) clearTimeout(holdTimer);
    });
    el.addEventListener("pointerup", () => {
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
  _hold() {
    if (this._config.hold_action === "more-info") {
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true, composed: true, detail: { entityId: this._config.entity },
      }));
      return;
    }
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
    this._wireHold(tile, () => this._call("homeassistant", "toggle", { entity_id: this._config.entity }));
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
    this._wireHold(tile, () => this._call("homeassistant", "toggle", { entity_id: this._config.entity }));
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
    this._wireHold(this.shadowRoot.querySelector(".badge"), null);
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
         <div class="chips"></div>
       </div></div></ha-card>`;
    this._wireHold(this.shadowRoot.querySelector(".badge"), null);
    this.shadowRoot.querySelectorAll(".step").forEach((b) =>
      b.addEventListener("click", () => this._bump(Number(b.dataset.d)))
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
    const cur = a.current_temperature != null ? "Actuel " + a.current_temperature + "°" : "";
    const act = a.hvac_action ? " · " + a.hvac_action : "";
    this.shadowRoot.querySelector(".sub").textContent = (cur + act) || s.state;
    this.shadowRoot.querySelector(".tile").classList.toggle("on", on);
    const wrap = this.shadowRoot.querySelector(".chips");
    if (wrap.childElementCount !== (a.hvac_modes || []).length) {
      wrap.innerHTML = "";
      (a.hvac_modes || []).forEach((m) => {
        const c = document.createElement("button");
        c.className = "chip"; c.dataset.m = m; c.textContent = m;
        c.addEventListener("click", () => this._call("climate", "set_hvac_mode", { entity_id: this._config.entity, hvac_mode: m }));
        wrap.appendChild(c);
      });
    }
    wrap.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.dataset.m === s.state));
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
    this._wireHold(this.shadowRoot.querySelector(".badge"), null);
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
    this._wireHold(this.shadowRoot.querySelector(".badge"), null);
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
    this._wireHold(this.shadowRoot.querySelector(".badge"), null);
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
    this._tap();
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
    if (this._config.hold_action === "more-info") {
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: this._config.entity } }));
      return;
    }
    this._openPopup();
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
  get _s() { return this._hass.states[this._config.entity]; }
  _domain() { return this._config.entity.split(".")[0]; }
  _close() {
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
  }
  _popupIcon() {
    const d = this._domain();
    return { light: "mdi:lightbulb", climate: "mdi:thermostat", media_player: "mdi:speaker", cover: "mdi:window-shutter" }[d] || "mdi:tune";
  }
  _headSub(s) {
    const d = this._domain();
    if (d === "climate") return (s.attributes.current_temperature != null ? "Actuel " + s.attributes.current_temperature + "° · " : "") + s.state;
    if (d === "media_player") return s.attributes.media_title || s.state;
    return s.state === "on" ? "Allumé" : s.state === "off" ? "Éteint" : s.state;
  }
  _renderBody() {
    const d = this._domain();
    const body = this.shadowRoot.getElementById("body");
    body.innerHTML = "";
    if (d === "light") return this._lightBody(body);
    if (d === "climate") return this._climateBody(body);
    if (d === "media_player") return this._mediaBody(body);
    if (d === "cover") return this._coverBody(body);
    return this._toggleBody(body);
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
        b.className = "btn" + (s.state === m ? " on" : ""); b.textContent = m;
        b.addEventListener("click", () => this._call("climate", "set_hvac_mode", { entity_id: this._config.entity, hvac_mode: m }));
        wrap.appendChild(b);
      });
      body.appendChild(row);
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

console.info(
  `%c JMA-CARDS %c v${VERSION} `,
  "background:#f8a5c2;color:#0a0a0b;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#0a0a0b;color:#f8a5c2;border-radius:0 4px 4px 0;padding:2px 6px"
);
