# 🎚️ JMA Cards

Set de cartes Lovelace **flat / iOS**, vanilla JS (**zéro build, zéro dépendance**, un seul fichier),
avec un **slider horizontal** (barre à glisser distincte, façon app Maison iOS).

> Palette par défaut : rose `#f8a5c2` · beige `#DEC198` · fond `#0a0a0b` · texte blanc.

## 🧩 Cartes du set
| Type | Pour | Contrôles |
|------|------|-----------|
| `custom:jma-card` | tout (auto) | slider horizontal + pop-up |
| `custom:jma-light-card` | lumière | slider luminosité, tap = on/off |
| `custom:jma-switch-card` | interrupteur | pastille on/off iOS |
| `custom:jma-cover-card` | volet | Ouvrir / Stop / Fermer + position |
| `custom:jma-thermostat-card` | climat | consigne ± + modes |
| `custom:jma-media-card` | média | transport + volume |
| `custom:jma-vacuum-card` | aspirateur | Start / Pause / Dock |
| `custom:jma-scene-card` | scène / script | bouton d'activation |
| `custom:jma-alarm-card` | alarme | Désarmer / Maison / Absent |

> Commun à toutes : `name` · `icon` · `color` · `accent` · `hold_action` (`popup` \| `more-info` \| `none`).
> Appui long = pop-up de contrôle détaillé.

## ✨ Fonctions
- **Clic simple = pop-up** de contrôle (bottom-sheet iOS : sliders, couleurs, modes, transport…). **Appui long = fiche HA**.
- **Contrôles inline** : slider horizontal, boutons (volet/média/aspirateur/alarme), pastille on/off (switch) — agissent directement sans ouvrir le pop-up.
- **Éditeur visuel** : en mode édition du dashboard, clic sur la carte → formulaire natif (entité, nom, icône, couleurs, options).
- **Toasts de notification** (`custom:jma-notify-card` + `window.jmaToast(...)`) : pop-ups iOS en haut de l'écran, et surfaçage des notifications persistantes HA.
- **Compact** : tuiles basses, jamais trop grosses ; **responsive** (320px → desktop).
- **États dynamiques** : teinte de la couleur réelle des lampes, pochette média en fond, « indisponible » estompé.

> `tap_action: popup` (défaut) · `more-info` · `none`

## 📦 Entités supportées
`light` (luminosité) · `media_player` (volume) · `cover` (position) · `climate` (consigne) ·
`switch` / `input_boolean` / `fan` (toggle) · `scene` / `script` (activation).

## ⚙️ Configuration
| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `entity` | string | **requis** | l'entité à piloter |
| `name` | string | nom de l'entité | titre affiché |
| `icon` | string | auto | icône mdi |
| `slider` | string | `auto` | `auto` \| `brightness` \| `temperature` \| `volume` \| `position` \| `none` |
| `color` | string | `#f8a5c2` | couleur d'accent (remplissage) |
| `accent` | string | `#DEC198` | couleur secondaire (haut du dégradé) |

## 🧩 Exemples
```yaml
type: custom:jma-card
entity: light.chambre

# Slider de volume forcé
type: custom:jma-card
entity: media_player.sejour
slider: volume

# Volet (glisser = position)
type: custom:jma-card
entity: cover.volet_chambre_1

# Sans slider (toggle pur), couleur custom
type: custom:jma-card
entity: switch.ok_salon
slider: none
color: "#DEC198"
```

## 🚀 Installation
### Via HACS (dépôt custom)
1. HACS → ⋮ → *Dépôts personnalisés* → ajouter l'URL du dépôt, catégorie **Lovelace**.
2. Installer **JMA Card**.
3. La ressource est ajoutée automatiquement.

### Manuelle
1. Copier `jma-card.js` dans `config/www/`.
2. Réglages → Tableaux de bord → ⋮ → *Ressources* → ajouter
   `/local/jma-card.js` en **module**.

## 🗺️ Roadmap (base v0.1.0)
- [ ] Éditeur visuel (`getConfigElement`)
- [ ] Slider horizontal optionnel
- [ ] Double-tap / hold configurables
- [ ] Mode « groupe » (plusieurs entités)
