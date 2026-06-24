/*! JMA Card — flat/iOS universal Lovelace card with full-tile drag slider
 *  + pop-up de contrôle custom (long-press).
 *  Palette: rose #f8a5c2 · beige #DEC198 · dark #0a0a0b · texte #fff
 *  Vanilla JS, zéro build, zéro dépendance.
 *
 *  type: custom:jma-card
 *  entity: light.chambre
 *  name / icon / color / accent : optionnels
 *  slider: auto|brightness|temperature|volume|position|none
 *  hold_action: popup|more-info|none   (def: popup)
 */

const VERSION = "0.2.0";
const ROSE = "#f8a5c2";
const BEIGE = "#DEC198";
const DARK = "#0a0a0b";

// =============================================================================
//  CARD
// =============================================================================
class JmaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._dragging = false;
    this._built = false;
  }

  setConfig(config) {
    if (!config.entity) throw new Error("jma-card : 'entity' est requis");
    this._config = {
      slider: "auto",
      hold_action: "popup",
      color: ROSE,
      accent: BEIGE,
      dark: DARK,
      ...config,
    };
    this._built = false;
  }

  getCardSize() {
    return 2;
  }
  static getStubConfig() {
    return { entity: "light.living_room", slider: "auto" };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._update();
    if (this._popup) this._popup.hass = hass; // pop-up live
  }

  get _stateObj() {
    return this._hass && this._config ? this._hass.states[this._config.entity] : undefined;
  }
  _domain() {
    return this._config.entity.split(".")[0];
  }
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
      const min = a.min_temp ?? 7,
        max = a.max_temp ?? 35;
      const t = a.temperature ?? min;
      return {
        kind: "temperature",
        value: Math.round(((t - min) / (max - min)) * 100),
        raw: t,
        min,
        max,
        step: a.target_temp_step || 0.5,
        unit: "°",
      };
    }
    return null;
  }

  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host{--jma-rose:${c.color};--jma-beige:${c.accent};--jma-dark:${c.dark};}
        .tile{position:relative;overflow:hidden;border-radius:22px;min-height:104px;height:100%;
          padding:14px;box-sizing:border-box;background:rgba(255,255,255,.06);
          backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);
          color:#fff;cursor:pointer;user-select:none;display:flex;flex-direction:column;
          justify-content:space-between;touch-action:pan-y;
          transition:transform .22s cubic-bezier(.2,.7,.3,1),background .3s ease;}
        .tile:hover{transform:scale(1.02);}
        .tile.active{transform:scale(.97);}
        .fill{position:absolute;left:0;right:0;bottom:0;height:0%;
          background:linear-gradient(0deg,var(--jma-rose) 0%,var(--jma-beige) 140%);
          opacity:.92;z-index:0;transition:height .28s cubic-bezier(.2,.7,.3,1);pointer-events:none;}
        .tile.dragging .fill{transition:none;}
        .content{position:relative;z-index:1;display:flex;flex-direction:column;
          justify-content:space-between;height:100%;pointer-events:none;}
        .badge{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.12);
          display:flex;align-items:center;justify-content:center;transition:background .3s ease;}
        .badge ha-icon{--mdc-icon-size:24px;color:rgba(255,255,255,.75);transition:color .3s;}
        .meta{margin-top:8px;}
        .name{font-weight:600;font-size:clamp(.85rem,2.4vw,1.02rem);letter-spacing:-.2px;line-height:1.15;}
        .sub{font-size:clamp(.68rem,1.8vw,.8rem);opacity:.6;margin-top:2px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .pct{position:absolute;top:14px;right:16px;z-index:1;font-weight:700;font-size:1rem;opacity:.85;pointer-events:none;}
        .tile.on .badge{background:rgba(10,10,11,.14);}
        .tile.on .badge ha-icon{color:var(--jma-dark);}
        .tile.on.solid{background:var(--jma-rose);color:var(--jma-dark);}
        .tile::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
          background:radial-gradient(circle at var(--rx,50%) var(--ry,50%),rgba(255,255,255,.35) 0%,transparent 55%);
          opacity:0;transform:scale(.3);}
        .tile.ripple::after{animation:jma-ripple .55s ease-out;}
        @keyframes jma-ripple{0%{opacity:.6;transform:scale(.3);}100%{opacity:0;transform:scale(1.6);}}
      </style>
      <ha-card style="background:none;border:none;box-shadow:none;">
        <div class="tile" id="tile">
          <div class="fill" id="fill"></div>
          <div class="pct" id="pct"></div>
          <div class="content">
            <div class="badge"><ha-icon id="icon"></ha-icon></div>
            <div class="meta"><div class="name" id="name"></div><div class="sub" id="sub"></div></div>
          </div>
        </div>
      </ha-card>`;
    const tile = this.shadowRoot.getElementById("tile");
    tile.addEventListener("pointerdown", (e) => this._onDown(e));
    tile.addEventListener("pointermove", (e) => this._onMove(e));
    tile.addEventListener("pointerup", (e) => this._onUp(e));
    tile.addEventListener("pointercancel", () => this._cancel());
    this._built = true;
  }

  _update() {
    const s = this._stateObj;
    const tile = this.shadowRoot.getElementById("tile");
    if (!tile) return;
    if (!s) {
      this.shadowRoot.getElementById("name").textContent = this._config.entity + " (indispo)";
      return;
    }
    const on = this._isOn();
    const spec = this._sliderSpec();
    const fn = this._config.name || s.attributes.friendly_name || this._config.entity;
    const icon = this._config.icon || s.attributes.icon || this._defaultIcon(this._domain(), on);
    this.shadowRoot.getElementById("icon").setAttribute("icon", icon);
    this.shadowRoot.getElementById("name").textContent = fn;
    this.shadowRoot.getElementById("sub").textContent = this._subText(s, on, spec);
    tile.classList.toggle("on", on);
    tile.classList.toggle("solid", on && !spec);
    const fill = this.shadowRoot.getElementById("fill");
    const pct = this.shadowRoot.getElementById("pct");
    if (spec && !this._dragging) {
      const show = on || spec.kind !== "brightness";
      fill.style.height = (show ? spec.value : 0) + "%";
      pct.textContent = show ? spec.value + (spec.unit || "") : "";
    } else if (!spec) {
      fill.style.height = "0%";
      pct.textContent = "";
    }
  }

  _subText(s, on, spec) {
    const d = this._domain();
    if (d === "climate") {
      const a = s.attributes;
      return (
        (a.current_temperature != null ? a.current_temperature + "°" : "") +
          (a.temperature != null ? " → " + a.temperature + "°" : "") || s.state
      );
    }
    if (d === "media_player") return s.attributes.media_title || s.attributes.source || s.state;
    if (spec && spec.kind === "brightness") return on ? spec.value + " %" : "Éteint";
    return on ? "Allumé" : "Éteint";
  }
  _defaultIcon(d, on) {
    return (
      {
        light: "mdi:lightbulb",
        switch: "mdi:power-socket-eu",
        fan: "mdi:fan",
        climate: "mdi:thermostat",
        media_player: "mdi:speaker",
        cover: on ? "mdi:window-shutter-open" : "mdi:window-shutter",
        scene: "mdi:palette",
        script: "mdi:play",
        input_boolean: "mdi:toggle-switch",
      }[d] || "mdi:circle"
    );
  }

  // ----- interactions : tap / drag (slider) / hold (popup) -----------------
  _onDown(e) {
    const tile = this.shadowRoot.getElementById("tile");
    tile.setPointerCapture(e.pointerId);
    this._startY = e.clientY;
    this._spec = this._sliderSpec();
    this._holdFired = false;
    tile.classList.add("active");
    const r = tile.getBoundingClientRect();
    tile.style.setProperty("--rx", ((e.clientX - r.left) / r.width) * 100 + "%");
    tile.style.setProperty("--ry", ((e.clientY - r.top) / r.height) * 100 + "%");
    if (this._config.hold_action !== "none") {
      this._holdTimer = setTimeout(() => {
        this._holdFired = true;
        if (navigator.vibrate) navigator.vibrate(12);
        this._hold();
      }, 480);
    }
  }
  _onMove(e) {
    if (this._startY == null) return;
    const dy = this._startY - e.clientY;
    if (Math.abs(dy) > 6) clearTimeout(this._holdTimer); // c'est un drag, pas un hold
    if (!this._spec) return;
    if (!this._dragging && Math.abs(dy) < 6) return;
    const tile = this.shadowRoot.getElementById("tile");
    this._dragging = true;
    tile.classList.add("dragging");
    const r = tile.getBoundingClientRect();
    let v = Math.max(0, Math.min(100, Math.round(((r.bottom - e.clientY) / r.height) * 100)));
    this._pendingValue = v;
    this.shadowRoot.getElementById("fill").style.height = v + "%";
    this.shadowRoot.getElementById("pct").textContent =
      this._spec.kind === "temperature" ? this._tempFromPct(v) + "°" : v + "%";
  }
  _onUp() {
    clearTimeout(this._holdTimer);
    const tile = this.shadowRoot.getElementById("tile");
    tile.classList.remove("active");
    if (this._holdFired) return this._cancel();
    if (this._dragging && this._pendingValue != null) {
      this._applySlider(this._spec, this._pendingValue);
      return this._cancel();
    }
    this._cancel();
    tile.classList.remove("ripple");
    void tile.offsetWidth;
    tile.classList.add("ripple");
    this._tap();
  }
  _cancel() {
    clearTimeout(this._holdTimer);
    const tile = this.shadowRoot.getElementById("tile");
    this._dragging = false;
    this._pendingValue = null;
    this._startY = null;
    if (tile) tile.classList.remove("dragging");
    setTimeout(() => this._update(), 120);
  }

  _hold() {
    if (this._config.hold_action === "more-info") {
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          bubbles: true,
          composed: true,
          detail: { entityId: this._config.entity },
        })
      );
      return;
    }
    this._openPopup();
  }
  _openPopup() {
    if (this._popup) return;
    const p = document.createElement("jma-card-popup");
    p.config = this._config;
    p.hass = this._hass;
    p.addEventListener("jma-close", () => {
      this._popup = null;
    });
    document.body.appendChild(p);
    this._popup = p;
  }

  _tempFromPct(v) {
    const s = this._spec;
    return Math.round((s.min + (v / 100) * (s.max - s.min)) / s.step) * s.step;
  }
  _tap() {
    const d = this._domain(),
      id = this._config.entity;
    if (d === "scene") return this._call("scene", "turn_on", { entity_id: id });
    if (d === "script") return this._call("script", "turn_on", { entity_id: id });
    if (d === "media_player") return this._call("media_player", "media_play_pause", { entity_id: id });
    if (d === "cover")
      return this._call("cover", this._isOn() ? "close_cover" : "open_cover", { entity_id: id });
    this._call("homeassistant", "toggle", { entity_id: id });
  }
  _applySlider(spec, v) {
    const id = this._config.entity;
    if (spec.kind === "brightness") this._call("light", "turn_on", { entity_id: id, brightness_pct: v });
    else if (spec.kind === "volume")
      this._call("media_player", "volume_set", { entity_id: id, volume_level: v / 100 });
    else if (spec.kind === "position") this._call("cover", "set_cover_position", { entity_id: id, position: v });
    else if (spec.kind === "temperature")
      this._call("climate", "set_temperature", { entity_id: id, temperature: this._tempFromPct(v) });
  }
  _call(domain, service, data) {
    if (this._hass) this._hass.callService(domain, service, data);
  }
}
customElements.define("jma-card", JmaCard);

// =============================================================================
//  POP-UP CUSTOM (bottom-sheet iOS)
// =============================================================================
class JmaPopup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
  }
  set config(c) {
    this._config = c;
  }
  set hass(h) {
    this._hass = h;
    if (this._built) this._refresh();
  }
  connectedCallback() {
    this._build();
    requestAnimationFrame(() => this.shadowRoot.getElementById("wrap").classList.add("show"));
  }

  get _s() {
    return this._hass.states[this._config.entity];
  }
  _domain() {
    return this._config.entity.split(".")[0];
  }
  _close() {
    const w = this.shadowRoot.getElementById("wrap");
    w.classList.remove("show");
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent("jma-close"));
      this.remove();
    }, 260);
  }

  _build() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host{--jma-rose:${c.color || ROSE};--jma-beige:${c.accent || BEIGE};--jma-dark:${c.dark || DARK};}
        .back{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);
          backdrop-filter:blur(6px);opacity:0;transition:opacity .26s ease;
          display:flex;align-items:flex-end;justify-content:center;}
        .back.show{opacity:1;}
        .sheet{width:100%;max-width:460px;margin:0 12px 12px;box-sizing:border-box;
          background:rgba(20,20,22,.86);backdrop-filter:blur(28px) saturate(160%);
          -webkit-backdrop-filter:blur(28px) saturate(160%);
          border:1px solid rgba(255,255,255,.08);border-radius:28px;color:#fff;
          padding:18px 18px 22px;transform:translateY(40px);opacity:0;
          transition:transform .3s cubic-bezier(.2,.8,.25,1),opacity .3s ease;}
        @media(min-width:768px){.back{align-items:center;} .sheet{margin:0;}}
        .back.show .sheet{transform:translateY(0);opacity:1;}
        .grab{width:38px;height:4px;border-radius:999px;background:rgba(255,255,255,.25);
          margin:0 auto 14px;}
        .head{display:flex;align-items:center;gap:12px;margin-bottom:18px;}
        .hicon{width:48px;height:48px;border-radius:50%;background:rgba(248,165,194,.18);
          display:flex;align-items:center;justify-content:center;}
        .hicon ha-icon{--mdc-icon-size:26px;color:var(--jma-rose);}
        .htxt{flex:1;min-width:0;}
        .htitle{font-weight:700;font-size:1.1rem;letter-spacing:-.3px;}
        .hsub{font-size:.82rem;opacity:.6;margin-top:2px;}
        .x{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;
          background:rgba(255,255,255,.1);color:#fff;font-size:1rem;}
        .row{margin:16px 0;}
        .lbl{display:flex;justify-content:space-between;font-size:.82rem;opacity:.7;margin-bottom:8px;}
        .lbl b{color:var(--jma-rose);font-weight:700;}
        input[type=range]{width:100%;height:34px;-webkit-appearance:none;appearance:none;
          background:transparent;accent-color:var(--jma-rose);margin:0;}
        input[type=range]::-webkit-slider-runnable-track{height:34px;border-radius:14px;
          background:rgba(255,255,255,.12);}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;
          margin-top:2px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.4);}
        input[type=range]::-moz-range-track{height:34px;border-radius:14px;background:rgba(255,255,255,.12);}
        input[type=range]::-moz-range-thumb{width:30px;height:30px;border:none;border-radius:50%;background:#fff;}
        .swatches{display:flex;gap:10px;flex-wrap:wrap;}
        .sw{width:36px;height:36px;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,.15);
          transition:transform .2s;}
        .sw:hover{transform:scale(1.12);}
        .btns{display:flex;gap:8px;flex-wrap:wrap;}
        .btn{flex:1;min-width:84px;padding:13px;border:none;border-radius:16px;cursor:pointer;
          background:rgba(255,255,255,.08);color:#fff;font-weight:600;font-size:.9rem;
          transition:all .2s;}
        .btn:hover{background:rgba(248,165,194,.18);}
        .btn.primary{background:var(--jma-rose);color:var(--jma-dark);}
        .btn.on{background:var(--jma-rose);color:var(--jma-dark);}
        .transport{display:flex;justify-content:center;gap:18px;align-items:center;}
        .tbtn{width:54px;height:54px;border-radius:50%;border:none;cursor:pointer;
          background:rgba(255,255,255,.08);color:#fff;display:flex;align-items:center;justify-content:center;}
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
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) this._close();
    });
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
    const card = new JmaCard();
    card._config = this._config;
    card._hass = this._hass;
    this.shadowRoot.getElementById("hi").setAttribute(
      "icon",
      this._config.icon || s.attributes.icon || card._defaultIcon(this._domain(), card._isOn())
    );
    // maj des valeurs live des sliders (si présents et pas en cours de drag)
    const b = this.shadowRoot.getElementById("brightness");
    if (b && document.activeElement !== this && !this._editing)
      b.value = s.attributes.brightness ? Math.round((s.attributes.brightness / 255) * 100) : 0;
    const v = this.shadowRoot.getElementById("volume");
    if (v && !this._editing) v.value = Math.round((s.attributes.volume_level || 0) * 100);
  }
  _headSub(s) {
    const d = this._domain();
    if (d === "climate")
      return (
        (s.attributes.current_temperature != null ? "Actuel " + s.attributes.current_temperature + "° · " : "") +
        s.state
      );
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
    inp.addEventListener("change", () => {
      this._editing = false;
      onchange(Number(inp.value));
    });
    return row;
  }

  _lightBody(body) {
    const s = this._s;
    const bri = s.attributes.brightness ? Math.round((s.attributes.brightness / 255) * 100) : 0;
    body.appendChild(
      this._slider("brightness", "Luminosité", bri, (x) => x + " %", (x) =>
        this._call("light", "turn_on", { entity_id: this._config.entity, brightness_pct: x })
      )
    );
    if ((s.attributes.supported_color_modes || []).some((m) => ["color_temp"].includes(m))) {
      const min = s.attributes.min_color_temp_kelvin || 2000;
      const max = s.attributes.max_color_temp_kelvin || 6500;
      const cur = s.attributes.color_temp_kelvin || min;
      body.appendChild(
        this._slider(
          "ct",
          "Température",
          cur,
          (x) => x + " K",
          (x) => this._call("light", "turn_on", { entity_id: this._config.entity, color_temp_kelvin: x }),
          min,
          max,
          50
        )
      );
    }
    if ((s.attributes.supported_color_modes || []).some((m) => ["xy", "rgb", "hs", "rgbw", "rgbww"].includes(m))) {
      const colors = ["#f8a5c2", "#DEC198", "#ff5252", "#ff9800", "#ffd54f", "#69f0ae", "#40c4ff", "#b388ff", "#ffffff"];
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<div class="lbl"><span>Couleur</span></div><div class="swatches"></div>`;
      const sw = row.querySelector(".swatches");
      colors.forEach((hex) => {
        const d = document.createElement("div");
        d.className = "sw";
        d.style.background = hex;
        d.addEventListener("click", () => {
          if (hex === "#ffffff")
            this._call("light", "turn_on", { entity_id: this._config.entity, color_temp_kelvin: 4000 });
          else this._call("light", "turn_on", { entity_id: this._config.entity, rgb_color: this._hex2rgb(hex) });
        });
        sw.appendChild(d);
      });
      body.appendChild(row);
    }
    body.appendChild(this._toggleRow());
  }

  _climateBody(body) {
    const s = this._s;
    const a = s.attributes;
    body.appendChild(
      this._slider(
        "temp",
        "Consigne",
        a.temperature ?? a.min_temp ?? 20,
        (x) => x + "°",
        (x) => this._call("climate", "set_temperature", { entity_id: this._config.entity, temperature: x }),
        a.min_temp ?? 7,
        a.max_temp ?? 35,
        a.target_temp_step || 0.5
      )
    );
    const modes = a.hvac_modes || [];
    if (modes.length) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<div class="lbl"><span>Mode</span></div><div class="btns"></div>`;
      const wrap = row.querySelector(".btns");
      modes.forEach((m) => {
        const b = document.createElement("button");
        b.className = "btn" + (s.state === m ? " on" : "");
        b.textContent = m;
        b.addEventListener("click", () =>
          this._call("climate", "set_hvac_mode", { entity_id: this._config.entity, hvac_mode: m })
        );
        wrap.appendChild(b);
      });
      body.appendChild(row);
    }
  }

  _mediaBody(body) {
    const s = this._s;
    body.appendChild(
      this._slider(
        "volume",
        "Volume",
        Math.round((s.attributes.volume_level || 0) * 100),
        (x) => x + " %",
        (x) => this._call("media_player", "volume_set", { entity_id: this._config.entity, volume_level: x / 100 })
      )
    );
    const row = document.createElement("div");
    row.className = "row transport";
    row.innerHTML = `
      <button class="tbtn" data-s="media_previous_track"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
      <button class="tbtn big" data-s="media_play_pause"><ha-icon icon="mdi:play-pause"></ha-icon></button>
      <button class="tbtn" data-s="media_next_track"><ha-icon icon="mdi:skip-next"></ha-icon></button>`;
    row.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () =>
        this._call("media_player", b.dataset.s, { entity_id: this._config.entity })
      )
    );
    body.appendChild(row);
  }

  _coverBody(body) {
    const s = this._s;
    body.appendChild(
      this._slider("pos", "Position", s.attributes.current_position ?? 0, (x) => x + " %", (x) =>
        this._call("cover", "set_cover_position", { entity_id: this._config.entity, position: x })
      )
    );
    const row = document.createElement("div");
    row.className = "row btns";
    row.innerHTML = `
      <button class="btn" data-s="open_cover">Ouvrir</button>
      <button class="btn" data-s="stop_cover">Stop</button>
      <button class="btn" data-s="close_cover">Fermer</button>`;
    row.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => this._call("cover", b.dataset.s, { entity_id: this._config.entity }))
    );
    body.appendChild(row);
  }

  _toggleBody(body) {
    body.appendChild(this._toggleRow());
  }
  _toggleRow() {
    const row = document.createElement("div");
    row.className = "row btns";
    const b = document.createElement("button");
    const on = this._hass.states[this._config.entity].state === "on";
    b.className = "btn primary";
    b.textContent = on ? "Éteindre" : "Allumer";
    b.addEventListener("click", () => {
      this._call("homeassistant", "toggle", { entity_id: this._config.entity });
      setTimeout(() => this._renderBody(), 300);
    });
    row.appendChild(b);
    return row;
  }

  _hex2rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  _call(domain, service, data) {
    if (this._hass) this._hass.callService(domain, service, data);
  }
}
customElements.define("jma-card-popup", JmaPopup);

// =============================================================================
window.customCards = window.customCards || [];
window.customCards.push({
  type: "jma-card",
  name: "JMA Card",
  description: "Card flat/iOS : slider plein-tuile + pop-up de contrôle custom (long-press).",
  preview: true,
});
console.info(
  `%c JMA-CARD %c v${VERSION} `,
  "background:#f8a5c2;color:#0a0a0b;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#0a0a0b;color:#f8a5c2;border-radius:0 4px 4px 0;padding:2px 6px"
);
