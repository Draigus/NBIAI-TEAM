# Dawn of War: Definitive Edition — Mod Install HANDOFF

**Status as of 2026-04-26 ~12:20 local time (last refresh).** Saved as a safety net during the install.

## Mission

Install three mods on Glen's DoW:DE (Steam, D: drive):

1. **Unification 7.3.8**
2. **Titanium Wars 1.00.57** + **DE patch** + **DE HotFix patch2**
3. **3rd Generation 3.2.4** + **DE Patch v8b**

Glen explicitly opted OUT of: Advanced Campaign Mod, Dark Crusade Forever, Ultimate Apocalypse.

## Critical paths

- DoW:DE install: `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/`
- AppData mods folder: `C:/Users/gpbea/AppData/Roaming/Relic Entertainment/Dawn of War/Mods/` (currently empty — kept as fallback only)
- Download staging (default Chrome): `C:/Users/gpbea/Downloads/`
- Module backup: `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/_backup_modules_2026-04-26/` — 5 stock .modules (DoWDE, DXP2, DXP3, W40k, WXP)
- Plan: `docs/superpowers/plans/2026-04-26-dow-de-mod-install.md`
- Glen's Nexus username: Draigus (was logged in via Chrome at handoff time)

## Hard rules

1. **Never run any installer .exe without re-confirming filename + size + source with Glen.** Saved as `~/.claude/.../memory/feedback_installer_check.md`.
2. Never enter passwords on Glen's behalf.
3. Verify each mod by launching via `ModAssistant.exe` and running a 1v1 vs Easy AI skirmish — not by file presence alone.

## Download status snapshot

| File | Source | Size | MD5 expected | Status |
|---|---|---|---|---|
| Unification-v7.3.8.exe | ModDB | 60.26mb / 63,183,960 B | 81be42537f85a5b8738c4652464cf2cf | ✅ DONE + verified |
| Unification.7z | ModDB | 20.14gb / 21,626,206,176 B | 967a4e7a72b2e16af0bbe143b13d75e2 | 🔄 ~6.3 GB done at 12:20 (~31%) |
| TitaniumWars_1.00.57.rar | ModDB | 820.21mb / 860,050,160 B | f8cb04eb8790cde93196891c90b38bad | ✅ DONE + verified |
| TWM-DC-DE-patch_1.00.57.rar | ModDB | 127.57mb / 133,762,253 B | 2f69f0da88828926f1752bab1b92643f | ✅ DONE + verified |
| DE_HotFix_TWM_DC_1.00.57.1.rar | ModDB | 5.17mb / 5,425,286 B | 893699e2c9e0c117455379031abcae9e | ✅ DONE + verified |
| Dawn of War - 3rd Generation 3.2.4 (.zip) | Nexus mod 303, file_id 591 | 4.6 GB | UNKNOWN (capture from Nexus page when complete) | 🔄 Glen clicked Slow download manually. ~45 MB done at 12:20. ~26 min total at 3 MB/s free-tier. |
| DoW 3rd Generation Definitive Edition Patch (v8b) | Nexus mod 303, Optional files | 176.2mb | UNKNOWN | NOT YET TRIGGERED — Glen needs to click Manual download → Slow download on the Optional files row when ready. Cannot run concurrently with main file on free-tier (Nexus may queue). |

Background watcher waits for `Unification.7z`: Bash bg ID `bgnj9a8gn`. Output file at `C:/Users/gpbea/AppData/Local/Temp/claude/.../tasks/bgnj9a8gn.output`.

## Install procedure (when all downloads done)

### Unification 7.3.8 (FIRST — most invasive)

Both files (`Unification-v7.3.8.exe` and `Unification.7z`) MUST be in the same folder.

1. **Re-confirm with Glen** before running the installer (hard rule).
2. Run `Unification-v7.3.8.exe`.
3. When the installer asks for path, point at: `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/`
   - Authority: official ModDB description (Nov 2025) — "For Definitive Edition, please install in your DE folder. Then launch 'Unification' from the Mod Launcher." Overrides the older Steam community thread that said AppData.
4. Verify: launch `ModAssistant.exe` from the install root, confirm Unification listed, launch it, confirm main menu, run 1v1 vs Easy AI skirmish, quit.

### Titanium Wars 1.00.57 (after Unification verified)

Apply in order: base → DE patch → DE hotfix.

1. Base: `TitaniumWars_1.00.57.rar` — extract to `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/`. (Or run installer if archive contains one — re-confirm with Glen first.)
2. DE patch: `TWM-DC-DE-patch_1.00.57.rar` — extract over install, allow overwrites.
3. DE HotFix: `DE_HotFix_TWM_DC_1.00.57.1.rar` — extract over install, allow overwrites. MUST be after the DE patch.
4. Verify: ModAssistant → Titanium Wars → launch → menu → skirmish → quit.

### 3rd Generation (after Titanium Wars verified)

1. Main file: extract/copy contents to a folder within the DE Mods folder. Per Nexus description: "delete any older versions if you have them as they will cause issues" — clean install (folder is empty so no problem).
2. DE Patch v8b: extract over the main mod files. In ModAssistant choose **"DoW:3G - Definitive Edition Patch"**.
3. Verify: ModAssistant → DoW:3G - Definitive Edition Patch → launch → menu → skirmish.

## After all installs

1. ModAssistant must show all three mods (Unification, Titanium Wars, DoW:3G - Definitive Edition Patch).
2. Cycle each: launch → main menu → quit.
3. Update `projects/nbi_dashboard/session_logs/` with today's session log.
4. Write a chat summary to Glen.

## Rollback

1. Close DoW:DE.
2. Restore stock modules: `cp "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/_backup_modules_2026-04-26/"*.module "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/"`
3. Delete the offending mod's data folder (sibling to `.module` files).
4. Worst case: Steam → DoW:DE → Properties → Verify integrity of game files.

## Outstanding actions

- [ ] Resolve 3rd Gen main download (4.6 GB) — likely needs to interact with the wait-timer page on Nexus.
- [ ] Trigger 3rd Gen DE Patch v8b download (176 MB).
- [ ] Wait for Unification.7z to finish (~12 min remaining at observed throughput).
- [ ] Verify all download MD5s once complete.
- [ ] Run the three install sequences in order, confirming each .exe with Glen first.
- [ ] Smoke-test each mod via ModAssistant + skirmish.
- [ ] Final report + session log update.

## Useful commands

```bash
# Check download status
ls -la "/c/Users/gpbea/Downloads/" | grep -iE "unification|titanium|hotfix|TWM|generation"

# Verify Unification.7z when done
md5sum "/c/Users/gpbea/Downloads/Unification.7z"
# expected: 967a4e7a72b2e16af0bbe143b13d75e2

# Confirm DoW:DE not running before install
tasklist | grep -iE "DoWDE|relicdow|relic"

# Diff against baseline after each install
diff /tmp/dowde_baseline.txt <(ls "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/" | sort)
```
