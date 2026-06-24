# 🎚️ JMA Cards

Un **set de cartes Lovelace** pour Home Assistant, design **flat / iOS**, en **vanilla JS**
(zéro build, zéro dépendance, un seul fichier). Clic = pop-up de contrôle riche · appui long = fiche HA.

> Palette par défaut : rose `#f8a5c2` · beige `#DEC198` · fond `#0a0a0b` · texte blanc.

## 🧩 Les cartes

| Type | Pour | Aperçu |
|------|------|--------|
| `custom:jma-card` | tout (auto) | slider horizontal + pop-up |
| `custom:jma-light-card` | lumière | slider luminosité, teinte couleur réelle |
| `custom:jma-switch-card` | interrupteur | pastille on/off iOS |
| `custom:jma-cover-card` | volet | Ouvrir/Stop/Fermer compacts + position |
| `custom:jma-thermostat-card` | climat | consigne ± (modes & graphe dans le pop-up) |
| `custom:jma-media-card` | média | transport + volume + pochette |
| `custom:jma-vacuum-card` | aspirateur | Start/Pause/Dock + batterie |
| `custom:jma-scene-card` | scène/script | activation + toast |
| `custom:jma-alarm-card` | alarme | Désarmer/Maison/Absent/Nuit (adaptatif) |
| `custom:jma-ev-card` | voiture élec. | batterie, autonomie, charge, **clim en cours** |
| `custom:jma-energy-card` | énergie | conso/prod — **bleu EDF / rose solaire** |
| `custom:jma-camera-card` | caméra | flux + présence/REC |
| `custom:jma-presence-card` | présence | avatars présents/absents + batterie tél |
| `custom:jma-bin-card` | poubelle | rappel par jour de la semaine |
| `custom:jma-agenda-card` | agenda | événements calendrier (jours configurables) |
| `custom:jma-notify-card` | notifications | persistantes + **toasts** par importance |

## ✨ Fonctions transverses

- **Éditeur visuel** sur **toutes** les cartes (mode édition du dashboard → clic sur la carte) :
  chaque entité utilisée est modifiable via les sélecteurs natifs HA.
- **Pop-ups** par type (sliders, couleurs, modes FR, transport, boutons, raccourcis…),
  **scrollables** (hauteur max 88 vh), fermables au **clic hors-cadre** ou **Échap**.
- **Graphes intégrés** dans les pop-ups : tracés depuis l'API `history`, **interactifs**
  (survol/toucher = valeur + heure), avec sélecteur de période **24h / 48h / 7j**.
- **Toasts** (`window.jmaToast({title, message, level})`) avec niveaux d'importance :
  `info` · `success` · `warning` · `danger` · `critical` (reste affiché + pulse).
- **Compact & responsive** (320px → desktop), gestion des entités indisponibles.

> Communs à toutes : `name` · `icon` · `color` · `accent` · `tap_action` (`popup` | `more-info` | `none`).

## ⚙️ Exemples

```yaml
type: custom:jma-light-card
entity: light.salon

type: custom:jma-cover-card
entity: cover.volet_salon          # pop-up : slider + raccourcis 0→100 %

type: custom:jma-thermostat-card
entity: climate.salon

type: custom:jma-presence-card
persons: [person.louis, person.alice]   # batterie/adresse auto-détectées

type: custom:jma-energy-card
title: Énergie
production_entity: sensor.solaire        # W
grid_entity: sensor.lixee_papp           # W soutirés (EDF)

type: custom:jma-agenda-card
title: Agenda
entities: [calendar.famille]
days: 7
max: 6

type: custom:jma-ev-card
name: Zoé
battery_entity: sensor.zoe_batterie
range_entity: sensor.zoe_autonomie_de_la_batterie
charging_entity: binary_sensor.zoe_en_charge
climate_active_entity: binary_sensor.zoe_cvc
```

## 🚀 Installation

### Via HACS (dépôt personnalisé)
1. HACS → ⋮ → **Dépôts personnalisés** → ajouter l'URL du dépôt, catégorie **Lovelace**.
2. Installer **JMA Cards** → la ressource est ajoutée automatiquement.

### Manuelle / jsDelivr
Réglages → Tableaux de bord → ⋮ → **Ressources** → ajouter en **module** :
`https://cdn.jsdelivr.net/gh/jemapellelovni/hacustomhacs@main/jma-card.js`

## 🎨 Personnalisation
`color` (accent principal) et `accent` (couleur secondaire) acceptent n'importe quelle
valeur CSS. La carte énergie ajoute `grid_color` (couleur du réseau EDF).

---
Vanilla JS · MIT · made with 🩷
