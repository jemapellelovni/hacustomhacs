# 🎚️ JMA Card

Card Lovelace **universelle**, design **flat / iOS**, avec un **slider horizontal**
(barre à glisser distincte, façon app Maison iOS) — luminosité, température, volume, position de volet.

Vanilla JS, **zéro build, zéro dépendance**, un seul fichier.

> Palette par défaut : rose `#f8a5c2` · beige `#DEC198` · fond `#0a0a0b` · texte blanc.

## ✨ Fonctions
- **Slider horizontal** : une barre dédiée en bas de la carte, glisse de gauche à droite pour régler la valeur (le reste de la carte reste cliquable pour le toggle).
- **Pop-up de contrôle custom** (long-press) : bottom-sheet iOS avec grands sliders,
  nuancier de couleurs (lumières), modes (clim), transport (média), boutons volet.
- **Tap** : toggle (lumière/switch), play/pause (média), ouvre/ferme (volet), active (scène/script).
- **Auto-détection** de la dimension selon le domaine de l'entité.
- **États dynamiques** : allumé → teinté rose, éteint → gris.
- Micro-animations : hover scale, ripple au clic, vibration au long-press.
- **Responsive** (320px → desktop), s'intègre dans n'importe quelle grille.

> `hold_action: popup` (défaut) · `more-info` · `none`

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
