# Stellaris — Hularan Behemoth-class Behemoth Planetcraft

Working data for the Behemoth build. Every figure carries its source. Items marked `CARRIED` were read in an earlier session and have not been re-read against the files; re-read them before relying on them. Items marked `SCREEN` come from in-game screenshots.

**Campaign:** Stellaris 4.4.6, 171 workshop mods. Xenophobic expansionist psion purifier, late game. Perek's Armada at 611K fleet power; attack moons and a flagship already built. Save `hular6_1352922443`.

**Task state:** Behemoth is designed but not built. The titanic row and the aura are the slots with hard file evidence behind them. The XL, large, hangar, missile and utility rows have not been enumerated against the hull.

---

## 1. Paths

| What | Path |
|---|---|
| Game install | `D:\SteamLibrary\steamapps\common\Stellaris\` |
| Workshop mods (171) | `D:\SteamLibrary\steamapps\workshop\content\281990\` |
| Gigastructural Engineering (4.4) | `...\281990\1121692237\` |
| ACOT base | `...\281990\1419304439\` |
| ACOT Celestial Reactors | `...\281990\2789654058\` |
| Saves | `E:\OneDrive\Documents\Paradox Interactive\Stellaris\save games\hular6_1352922443\` |
| Mod audit CSV | `E:\OneDrive\Documents\Stellaris mods\compatibility-audit\` |

Mods are on `D:`. The workshop folder on `E:` is effectively empty.

---

## 2. Chassis

Source: `1121692237\common\section_templates\giga_planetcraft.txt` (144 lines), read 2026-07-26.

Ship size `giga_planet_behemoth`, `common\ship_sizes\giga_ships.txt`: `max_hitpoints = 2500000`, `size_multiplier = 750`, `is_designable = yes`, `prerequisites = { "giga_tech_war_planet" }`. Required component sets: `power_core`, `ftl_components`, `sensor_components`, `combat_computers`, `ship_aura_components`.

| In-game tab | Section key | Weapon slots | Large utility | Aux |
|---|---|---|---|---|
| Eraser Planetary Cannon | `behemoth_ship_bowgun_01_key` | 6 titanic + 9 missile | 10 | 0 |
| Auxiliary Weapon Battery | `behemoth_ship_bow_01_key` | 15 XL | 10 | 0 |
| Weaponized Crust | `behemoth_ship_mid_01_key` | 15 XL | 10 | 0 |
| Planetary Hangars | `behemoth_ship_stern_01_key` | 15 strike craft | 10 | 4 |
| Secondary Armament | `behemoth_ship_sternthrusters_01_key` | 15 large | 10 | 4 |

**Totals: 6 titanic, 9 missile, 30 XL, 15 hangar, 15 large, 50 large utility, 8 aux, 1 aura.**

Slot templates: titanic `invisible_titanic_fixed`, missile `invisible_missile_turret`, XL `invisible_extra_large_fixed`, hangar `large_strike_craft`, large `giga_large`.
`giga_large` is defined at `common\component_slot_templates\giga_component_slots.txt:9` as `{ size = large, component = weapon }`, a standard large weapon slot.

---

## 3. The eligibility gate

`1121692237\common\scripted_triggers\giga_scripted_triggers.txt:1107`:

```
giga_ship_uses_war_planet_components = { OR = { is_ship_size = giga_planet_behemoth } }
```

The Behemoth alone satisfies it. **Six** files in `1121692237\common\component_templates\` use the gate and all six must be checked when enumerating eligible components:

`aeternum_components.txt`, `blokkat_components.txt`, `giga_auras.txt`, `giga_computers.txt`, `giga_planetcraft_components.txt`, `giga_war_moon_components.txt`

---

## 4. Planetcraft components

`giga_planetcraft_components.txt` contains four components in total:

| Key | Size | Power |
|---|---|---|
| `REACTOR_PLANET` | small | +100,000 |
| `GIGA_SUPER_OMEGA_LANCE_1` (Eraser Beam) | titanic | -65,000 |
| `GIGA_PLANETARY_RAILGUN` | titanic | -20,000 |
| `GIGA_PLANET_MISSILE_1` | titanic | none |

No `GIGA_PLANET_MISSILE_2` and no tier 2 of the lance or railgun exists. Confirmed across `giga_planetcraft_components.txt` and `giga_systemcraft_components.txt`.

### Stat blocks — `CARRIED`, re-read before use

| | Eraser Beam | Planetary Railgun | Planetary Missile |
|---|---|---|---|
| Damage | 125,000-250,000 | 91,000-260,000 | 7,000-8,000 |
| `total_fire_time` | 75 | 60 | 40 |
| Accuracy | 0.85 | 0.75 | 1.00 |
| Tracking | 0 | 0.0 | 0.25 |
| Range | 250 | 250 | 250 |
| `min_range` | 10.0 | 10.0 | — |
| `firing_arc` | 10 | 10 | — |
| Shield damage | 0.75 | 1.50 | `shield_penetration = 1.00` |
| Armour damage | 1.50 | 0.75 | — |
| Hull damage | 1.25 | — | — |
| Collateral | 12,500 | none | 700 |
| `ship_limit` | 1 | 1 | none |

Collateral scalars: `@giga_super_omega_lance_1_fleet_damage = 12500`, `@giga_planet_missile_1_fleet_damage = 700`.
Missile also: `missile_speed = 20`, `missile_evasion = 0.40`, `missile_health = 3000`, `missile_retarget_range = 100`.

---

## 5. Other titanic components passing the gate

Source: `1121692237\common\component_templates\aeternum_components.txt`, `blokkat_components.txt`, read 2026-07-26.

| | `PLANET_LANCE_AETERNUM` | `PLANET_LANCE_BLOKKAT` |
|---|---|---|
| Size | titanic | titanic |
| Power | -75,000 | -80,000 |
| Damage | 1,200,000-1,600,000 | 1,562,500-3,125,000 |
| `total_fire_time` | 75 | 150 |
| Windup | 145-150 | 50-60 |
| Accuracy | 1.00 | 1.00 |
| Tracking | 0.20 | 0.20 |
| Range | 350 | 350 |
| `firing_arc` | 100 | 360 |
| `shield_penetration` | 1.00 | 1.00 |
| `armor_penetration` | 0.00 | 0.00 |
| Armour damage | 1.40 | 1.40 |
| Hull damage | 1.40 | 1.00 |
| Collateral | 60,000 | 78,125 |
| `ship_limit` | none in block | 3 |
| Prerequisites | none in block | `giga_tech_blokkat_obliterator` |
| Gate | war planet | war planet OR war system |

Collateral scalars at `1121692237\common\scripted_variables\`, lines 952 and 959.

`PLANET_LANCE_AETERNUM` carries no `prerequisites`, no `ship_limit` and no `valid_for_country` in its block. Whether mod load order places it in the titanic dropdown is **unconfirmed in-game**.

`PLANET_LANCE_BLOKKAT` requires `giga_tech_blokkat_obliterator`, which is not held (section 6).

---

## 6. Player techs — from the save

Source: `hular6_1352922443\autosave_2294.01.01.sav`, 2026-07-26 12:30. Gamestate 117.2 MB. Player is `country=0` per the `player=` block at line 73; first `tech_status` block at line 1479949. 802 unique `tech_*` keys, 887 including `giga_tech_*`.

**Held, relevant:** `giga_tech_war_planet`, `tech_dark_matter_power_core`, `tech_dark_matter_armor`, `tech_dark_matter_deflector`, `tech_dark_matter_plant`, `tech_dark_matter_propulsion`, `tech_mine_dark_matter`, `tech_arc_emitter_1`, `tech_arc_emitter_2`, `tech_mini_arc_emitter_1`, `tech_kinetic_artillery_1`, `tech_kinetic_artillery_2`, `tech_strike_craft_1/2/3`, `tech_missiles_1-5`, `tech_swarmer_missiles_1/2`, `tech_scourge_missile_1`, `tech_tomahawk_cruise_missile_1`, `tech_titan_hull_1/2`, `tech_titans`, `tech_archaeo_titan_beam`, `tech_archaeo_missiles`, `tech_archaeo_strike_crafts`, `tech_repeatable_weapon_type_strike_craft_fire_damage`, `tech_repeatable_weapon_type_strike_craft_fire_rate`, `giga_tech_eawaf_sirens_missile`, `giga_tech_eawaf_sirens_strike_craft`, `giga_tech_ringworld_titanic_1/2`, `giga_tech_blokkat_scrap_damage`, `giga_tech_blokkat_scrap_research`.

**Not held — zero occurrences anywhere in the save, so no empire in the galaxy holds them:** `tech_dark_matter_power_core_dm`, `_re`, `_se`, `_oe`, `tech_titan_emitter_se`, `tech_titan_emitter_oe`, `giga_tech_blokkat_obliterator`. No ACOT techs of any kind.

---

## 7. ACOT content — gated off by section 6

Recorded for if ACOT progression is ever opened.

**Titan emitters.** `1419304439\common\component_templates\acot_5_components_weapons_sigma.txt:1890` and `acot_6_components_weapons_omega.txt:1228`. Damage variables at line 58 of each; power at `acot_scripted_variables_component_cost.txt:319` and `:321`.

| | SE Titan | OE Titan |
|---|---|---|
| Damage | 14,718 flat | 88,310 flat |
| `total_fire_time` | 80 | 80 |
| Power | -3,200 | -320,000 |
| Accuracy | 1.00 | 1.00 |
| Shield / armour penetration | 1.25 / 1.25 | 1.25 / 1.25 |
| Hull damage | 2.50 | 2.50 |
| `firing_arc` | 10 | 30 |
| `min_range` | 15 | 0 |
| Range | 275 | 300 |
| `ship_limit` | none | none |
| Prerequisite | `tech_titan_emitter_se` | `tech_titan_emitter_oe` |

**Reactor ladder.** `2789654058\common\component_templates\0_acot_celestial_reactors.txt`. Every rung is `component_set = "power_core"` with `potential = { giga_ship_uses_war_planet_components = yes }`, so all are Behemoth-legal once the tech is held. `upgrades_to` chains them, meaning auto-upgrade will walk the chain.

| Key | Power | Ship modifiers | Prerequisite |
|---|---|---|---|
| `REACTOR_PLANET` | 100,000 | none | none |
| `REACTOR_PLANET_DELTA` | 150,000 | +5% hull | `tech_dark_matter_power_core_dm` |
| `REACTOR_PLANET_RUNIC` | 250,000 | +10% hull, weapon damage, fire rate | `..._re` |
| `REACTOR_PLANET_SIGMA` | 300,000 | +20% hull, weapon damage, fire rate | `..._se` |
| `REACTOR_PLANET_OMEGA` | 75,000,000 | +25% hull, +50% weapon damage, +50% fire rate | `..._oe`, `is_sbtg_activated = yes`, 100 light matter |

All rungs also carry `ship_shield_reduction` between -0.50 and -2.0; its in-play effect was not established.

---

## 8. Aura

`1121692237\common\component_templates\giga_auras.txt:3` — `SHIP_AURA_PLANET`, `size = medium`, `potential = { giga_ship_uses_war_planet_components = yes }`, **power 0**. The chassis declares `ship_aura_components` as a required set. The aura slot was empty as of 2026-07-26 (`SCREEN`).

---

## 9. Archaeotech

`D:\SteamLibrary\steamapps\common\Stellaris\common\component_templates\00_weapons_archaeotechnology.txt`.

- `ARCHAEO_TITAN` (line 563), `size = titanic`, `potential = { ship_uses_titan_components = yes }`. **Not eligible on the Behemoth.** `tech_archaeo_titan_beam` is held, so it is fittable on the NSC Titan; that design has not been checked.
- `ARCHAEO_MISSILE` (line 503), `size = small`.
- `ARCHAEO_STRIKECRAFT` (line 823), `size = LARGE`.

Eligibility of the latter two against the Behemoth's missile and hangar slot templates is unestablished.

Gigastructural Sirens components, both techs held: `GIGA_EAWAF_STRIKE_CRAFT` is `size = LARGE`, `power = -50`, `damage = { min = 5 max = 5 }`. `GIGA_EAWAF_CRYSTAL_AUTOCANNON` is `size = small`, `damage = { min = 10 max = 20 }`.

---

## 10. Ship designer state — `SCREEN`, 2026-07-26

| Stat | Value |
|---|---|
| Power | **+63,939** |
| Hull | 2,500,000 |
| Armour | 1,336,400 |
| Shields | 1,323,125 |
| Evasion | 0.0% |
| Speed | 125.54 |
| Damage | 25,682.58 |
| Ship size / naval capacity | 750 / 750 |
| Build time | 2,700 |
| Cost | 69,822.15 alloys |
| Upkeep | 103.01 energy, 22.80 |

Reactor tooltip: "Planetary Core Reactor, Power Generation: 100000, Base: 100000". Base tier, no modifiers.
**Auto-upgrade ticked.** Auto-generate designs unticked.
**Two of the six titanic slots are outlined red. Cause unestablished.**
Several aux slots and one utility slot are empty.

### Aux dropdown, as listed on screen

Regenerative Hull Tissue, Living Reactive Armor, Dark Matter Afterburners III, Enigmatic Decoder, Enigmatic Encoder, Living Hull, Integrated Fire-Control, Dark Matter Reactor Boosters IV, Shield Capacitor, Advanced Shield Hardener, Strange Matter Bomb, Enigmatic Power Relay, Singularity Matrix, Chrono-Refractive Matrix I, Singularity Boosters VI.

| Displayed name | Key | Data |
|---|---|---|
| Advanced Shield Hardener | `SHIELD_HARDENER_2` | `size = aux`, `power = -25`, no gate (`00_utilities_aux.txt:229`) |
| Regenerative Hull Tissue | `AUTO_REPAIR` | `power = -10` |
| Shield Capacitor | `SHIELD_BOOSTER` | `power = -20` |
| Integrated Fire-Control | tech `tech_auxiliary_fire_control_2` | effects unread |
| Chrono-Refractive Matrix | `GPM_TARGETTING_COMPUTER_1` | `SCREEN` tooltip: power 20, cost 19 alloys / 0.45. **+50% damage vs starbases and waystations, +50% orbital bombardment damage.** No tracking or accuracy effect despite the key name |
| Singularity Boosters | `NSC_REACTOR_BOOSTER_3` | power generation |
| Enigmatic Power Relay | `GPM_ENIGMATIC_POWER_RELAY` | `size = aux`, `power = 20` (generates) |
| Singularity Matrix | `GPM_SINGULARITY_MATRIX` | effects unread |
| Strange Matter Bomb | `DS_PR_OSIRIS_SET` | effects unread |
| Living Hull, Living Reactive Armor, Dark Matter Afterburners, Enigmatic Decoder, Enigmatic Encoder | — | unread |

Other vanilla aux keys available for reference (`00_utilities_aux.txt`): `SHIELD_HARDENER_1` -15, `ARMOR_HARDENER_1` -15, `ARMOR_HARDENER_2` -25, `AUTO_REPAIR_3` -20, `FIRE_CONTROL_1` -10, `SHIELD_BOOSTER` -20, `REACTOR_BOOSTER_1/2/3`.

---

## 11. Enumeration method

Reading the mod files individually does not reliably surface eligible components; 171 mods override one another and `PLANET_LANCE_AETERNUM` was missed that way. Use a parser instead.

Walk every `common/component_templates/*.txt` under the vanilla install and all 171 workshop mod folders. Split each file on `weapon_component_template` / `utility_component_template` / `strike_craft_component_template` boundaries, and extract per block: `key`, `size`, `prerequisites`, `potential`, `power`.

Cross-reference against the player's tech set, extracted from the save's `tech_status` block.

Exclusion rules for this hull: drop any component whose `potential` requires `ship_uses_titan_components`, `giga_ship_uses_war_system_components`, `ship_uses_mauler_components`, or `is_ship_size` of anything other than `giga_planet_behemoth`. Require every entry in `prerequisites` to be present in the player tech set.

This parsed 14,816 components.

**Known gap in that filter:** components with no `prerequisites` block pass automatically, which admits crisis-faction and event-granted weapons that a player cannot actually fit. A second pass on `valid_for_country` and country-type restrictions is needed before treating any result as available. In-game dropdown confirmation is the final check.

---

## 12. Open items, priority order

1. **The two red-outlined titanic slots.** Cause unknown. May indicate something blocking the capital guns.
2. **Confirm whether `PLANET_LANCE_AETERNUM` appears in the titanic dropdown.** Files indicate it should.
3. Enumerate the XL, large, hangar, missile and utility dropdowns against the hull. Never done.
4. `GPM_SINGULARITY_MATRIX` and `DS_PR_OSIRIS_SET` effects.
5. Re-read the section 4 stat blocks, which are `CARRIED`.
6. Whether the NSC Titan design is using its titanic slot for `ARCHAEO_TITAN`.
7. What unlocks `tech_dark_matter_power_core_dm`, the entry rung of the reactor ladder.
8. Auto-upgrade is ticked. It does not cross component lines, so it will not roll Neutronium to Dark Matter armour. Confirm that is intended.

---

## 13. Wider campaign, outstanding

- Tradition tree selection: 4+ empty slots, needs the "Select" screen.
- Transcendence perk verification (console-added via `effect add_ascension_perk = ap_transcendence`).
- Dark Matter armour retrofit across the seven saved designs. Manual; auto-upgrade will not do it.
- Dark Matter Afterburner check on existing designs.
- Juggernaut tech not researched. Gates the Mega-Class Star Dreadnought.
- Behemoth Planetcraft: construction pending.
- Stellar Systemcraft: needs 3 moons + 3 planetcraft. Far future.
- Mod audit: 116 of 171 subscribed mods audited. 55 never audited.
- Anomaly ruling on `strange_worlds.35` "Visual Anomalies" at Kaern Varn: continue external studies. 20% cloaking progress vs 10%, tier 2 vs tier 1 physics, `d_ancient_cloaking_array` vs `d_geothermal_hotspot`, no failure outcome coded on either branch. Verified against `common\Stellaris\events\strange_worlds_events.txt` lines 310-478 and `common\deposits\15_strange_worlds_deposits.txt` lines 35-64.

**The record of the seven earlier ship designs, fleet composition, perks and traditions is not in this file.** It was in `docs/HANDOFF_STELLARIS_2026-07-25.md`, which was deleted 2026-07-26 and was never committed to git. Restore it from the OneDrive online recycle bin at onedrive.live.com, where deletions are retained for 30 days. **Update, later 2026-07-26:** not in the Windows Recycle Bin (shell delete bypasses it), so the OneDrive online bin is the only copy. The fleet breakout and design inventory have been REGENERATED from the save — see sections 15-16 below.

---

# SECOND SESSION, 2026-07-26 — corrections, enumeration, and THE BUILD

Everything below was verified this session (Fable 5) from the game files, the parsed component database, or the extracted save. Working artefacts (parser, JSON, extracts) in the session scratchpad; method reproducible via `enum_components.py` + `gen_outputs.py` there.

## 14. Corrections to the data above

1. **Section 6 tech list is contaminated.** Brace-balanced extraction of country 0's `tech_status` block (gamestate lines 1479949-1481701) yields **600 unique keys**, not 802/887. The prior count used a line window that spilled into the NEXT country's tech block, so several "held" claims were actually a neighbour empire's techs. Confirmed NOT held by the player: `tech_scourge_missile_1`, `tech_archaeo_missiles`, `tech_archaeo_strike_crafts`, `giga_tech_eawaf_sirens_missile`, `giga_tech_eawaf_sirens_strike_craft`. (`tech_archaeo_refinery`, `tech_archaeoarmor`, `tech_archaeo_rampart` are in the research queue, not researched.) Full corrected list: `player_techs.txt` in the scratchpad. The "zero occurrences in the save" negatives (ACOT, blokkat obliterator, DM power core tiers) still hold.
2. **"Designed but not built" is wrong.** The save contains the Behemoth IN SERVICE: design id 67121068 (Ismir-class), ship 16779854, fleet 50337845 "Behemoth Planetcraft", fleet mp 4,704,712.
3. **Perek's Armada is 2,643,688 mp** in this save, not 611K. The 611K figure was from an earlier campaign date.
4. **`PLANET_LANCE_AETERNUM` is `hidden = yes`** (aeternum_components.txt:231). It passes the gate but can NEVER appear in the designer dropdown. Open item 2: CLOSED.
5. **The 9 "missile" slots are torpedo-size** (`invisible_missile_turret` = `size = torpedo`, vanilla 00_component_slots_turrets.txt:79-82). `size = missile` does not exist in this game version at all. Vanilla missiles (small), Whirlwinds (medium) and Archaeo missiles (small) cannot be mounted in them.
6. **`DS_PR_OSIRIS_SET`** resolves to component `DS_PR_OSIRIS_CRACKER`, `size_restriction = { ds_pr_osiris }` — cannot mount on the Behemoth. Open item 4 half-closed; `GPM_SINGULARITY_MATRIX` (mod 865040033, gpm_components.txt:49-87): aux, power -10, ship_limit 1, +20% ship XP, tech held.
7. Section 4 stat blocks (`CARRIED`) were re-read against the files: **all confirmed verbatim, zero mismatches**. Open item 5: CLOSED. One addition: `GIGA_PLANETARY_RAILGUN` and `REACTOR_PLANET` carry no `prerequisites` line at all.

## 15. Fleet breakout — regenerated from the save (autosave_2294.01.01)

Country 0 owns 1,996 fleets: 13 military, 273 starbases, 1,710 civilian (1,294 mining stations, 398 research stations, 96 transports, remainder misc). Military:

| Fleet | MP | Composition |
|---|---|---|
| Behemoth Planetcraft | 4,704,712 | 1x Behemoth (Ismir-class) |
| Perek's Armada | 2,643,688 | 9 Hular Battleship, 4 Hular Carrier, 4 Hular Dreadnought, 4 Hularen Titan, 3 Hularen Moon |
| Kierna's Warpack | 2,245,413 | 24 BB, 5 Carrier, 4 Dreadnought, 4 Titan |
| Olymac's Armada | 2,180,690 | 26 BB, 2 Hularen Moon, 1 Kaernmar (NSC Flagship) |
| Attack Moon | 2,000,049 | 7 Hularen Moon |
| Ralpakin's Armada | 1,433,400 | 5 Hularen Moon, 1 GPM precursor destroyer |
| 5 asteroid-artillery defence fleets | ~115-159K each | asteroid artillery |

17 Hularen Moons total in service. Top starbase: 3.14M mp citadel.

## 16. Design inventory — regenerated from the save

Player's custom military classes (full loadouts in scratchpad `design_inventory.txt`, 1,312 lines — copy that file somewhere permanent if wanted):

- **Hular Battleship** (id 67120599, 59 in service): 2x Focused Arc Emitter bow, 24x Whirlwind (SWARMER_MISSILE_2), DM deflectors + dragon armour, precog carrier computer, jump drive, target magnet
- **Hular Carrier** (50343365, NSC, 9): 14 hangars, heavy PD/flak, 1 kinetic artillery
- **Hular Dreadnought** (134229124, NSC, 8)
- **Hularen Moon** (12090, giga_war_moon, 17)
- **Kaernmar** (12091, NSC Flagship, 1): carries nsc_flagship_aura
- **Hularen Titan** (12092, titan, 8)
- **Behemoth / Ismir-class** (67121068, 1) — current in-save fit: T row = 1x Eraser + 1x Railgun + 4x Planetary Missile; 30x Giga Cannon; 9x Neutron Launcher; 15x Hangar III; L row = 9x Autocannon IV + 5x Tomahawk + 1x Plasma III; utilities 36x DM Armour + 12x DM Deflector + 1x Shield IV + 1x Nanite Armour; aux GPM Hangar / Afterburner / Living Metal Repair; REACTOR_PLANET, JUMP_DRIVE_1, SENSOR_5, GIGA_PLANET_COMPUTER, **aura EMPTY** (`SHIP_AURA_EMPTY`)

## 17. THE BUILD — Behemoth, everything below uses techs verified held

| Row | Slots | Fit | Basis |
|---|---|---|---|
| Titanic | 6 | 1x Eraser Beam, 1x Planetary Railgun, 4x Planetary Missile | Both capitals ship_limit 1; the only other dropdown-reachable war-planet titanics with held prereqs are Giga's `PERDITION_BEAM_ARTILLERY` / `ARCHAEO_ARTILLERY` (stats unread — section 18.2); Aeternum hidden; Blokkat tech not held |
| XL | 30 | Focused Arc Emitter | acc 1.00, shield+armour pen 1.0, no min range, avg 846 dmg/71 cd vs Giga Cannon avg 1,755/80 cd at acc 0.75 with min_range 45. Arcs win vs armour-stacked/evasive/hardened targets, GC wins vs shield-heavy — mono-arc is the reliable default; 15/15 split acceptable |
| Torpedo ("missile" row) | 9 | Neutron Launchers (ENERGY_TORPEDO_2) — keep | Best held torpedo-size at artillery range (120): 61-131 dmg, hull 1.75, armour 1.5. Devastator (169-254, size_damage_factor 1.25) has range 30 — mismatched to the platform |
| Large | 15 | Kinetic Artillery II | 195-585 dmg, range 120, shield 2.0. Replaces 9 range-30 autocannons + tomahawks. Biggest single upgrade in the refit |
| Hangar | 15 | Strike Craft III — keep | 6-17 dmg x8 craft, shield pen 1.0, armour 1.5. Swap to Archaeo strike craft (tracking 1.0, armour pen 1.0, evasion 0.8) when `tech_archaeo_strike_crafts` finishes researching |
| Utility | 50 | 36x DM Armour / 14x DM Deflector | Replace the stray Shield IV and Nanite Armour. Hull already carries +1.25M armour and +1.25M shield from the ship_size modifier |
| Aux | 8 | 4x Advanced Shield Hardener, 1x Chrono-Refractive Matrix, 1x Singularity Matrix, 1x Enigmatic Power Relay, 1x Fire-Control 2 | Hardeners protect the 1.3M shield pool from pen weapons; Chrono-Refractive (+50% vs starbases, +50% bombardment, limit 1) is the siege multiplier; relay is net +20 power and +10% shield regen/hardening; all techs verified held |
| Aura | 1 | SHIP_AURA_PLANET — CURRENTLY EMPTY, fit it | Only legal option, 0 power. Hostiles in 125 range: -15% evasion, -20% speed, -2 disengage |
| Core | — | REACTOR_PLANET / GIGA_PLANET_COMPUTER / SENSOR_5 / JUMP_DRIVE_1 | Each the only (or only-held) option. Psi Jump Drive not researched |

**Power budget (approx):** +100,000 reactor; -65,000 Eraser, -20,000 Railgun, -7,800 XL (30x260), -1,386 torpedo (9x154), -1,365 large (15x91), -885 hangar (15x59), -50 computer, ~-100 aux net, deflectors small ≈ **+2-3K margin**. If a swap sends it negative: one aux → NSC Reactor Booster 3 (+100% reactor output, tech held).

## 18. Open items — updated

1. **Red-outlined titanic slots: still unestablished, but narrowed.** All six in-save titanic assignments are legal (gates pass, Eraser prereq `giga_tech_war_planet` held, Railgun has no prereq, limits respected) — so it is NOT a tech/eligibility failure. Note the section 10 screen showed +63,939 power, which is arithmetically impossible with the -65,000 Eraser drawing power on a 100K reactor with the rest of that fit; consistent with the designer treating the red-slot component(s) as inactive. Check the slot tooltip in-game.
2. `PERDITION_BEAM_ARTILLERY` and `ARCHAEO_ARTILLERY`: CLOSED. Both carry `size_restriction = { asteroid_artillery }` (`1121692237\common\component_templates\asteroid_artillery_components.txt:47` and `:109`) — they mount only on the asteroid artillery hull, never the Behemoth. Both are 5,000-10,000 damage clones anyway (Perdition clone at total_fire_time 180). Planetary Missile remains BiS for the 4 open titanic slots. **Parser gap noted:** the enumeration does not extract `size_restriction`, so "no gate" entries in the titanic bucket may still be hull-locked — check that field before trusting any future candidate.
3. XL/large/torpedo/hangar/utility enumeration: DONE this session (16,596 components parsed; buckets in scratchpad `components_filtered.json`).
4. `GPM_SINGULARITY_MATRIX` / `DS_PR_OSIRIS_SET`: DONE (section 14.6).
5. Section 4 re-read: DONE, all confirmed (section 14.7).
6. NSC Titan / ARCHAEO_TITAN check: still open.
7. `tech_dark_matter_power_core_dm` unlock path: still open.
8. Auto-upgrade armour-line caveat: still open (unchanged).
9. NEW: copy scratchpad extracts (`player_techs.txt`, `fleet_breakout.txt`, `design_inventory.txt`, `behemoth_design.txt`) somewhere permanent before the session scratchpad is cleaned, and commit this file to git so it cannot be lost the way the 07-25 file was.
