# Dawn of War: Definitive Edition — Mod Install Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan step-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Unification Mod (DoW:DE), Titanium Wars Mod (DoW:DE) and 3rd Generation Mod into Glen's Dawn of War: Definitive Edition install at `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/`, with each mod independently launchable and confirmed working.

**Architecture:** Mods on DoW:DE plug in via `.module` files at the game root. Each mod is a standalone `.module` + data folder. Mods coexist (no stacking) — they're launched individually via Steam launch option `-modname <name>` or via the bundled `ModAssistant.exe`. Community-recommended order: Unification first (most invasive, touches shared race assets), then standalone mods (Titanium Wars, 3rd Generation) as separate modules.

**Tech Stack:** Dawn of War: Definitive Edition (Steam, D: drive), Nexus Mods + ModDB downloads via Claude in Chrome, Glen's existing Nexus session.

**Versions targeted (as of 2026-04-26):**
- Unification: 7.3.8 (latest with DE support)
- Titanium Wars: 1.00.57 (25 Nov 2025) + DE compatibility patch + DE HotFix (refreshed 1 Dec 2025)
- 3rd Generation: latest Nexus release (version to be confirmed during Step 0)

**Hard rules (carry across all tasks):**
- Before invoking ANY `.exe` installer, re-state to Glen: filename, source URL, file size, expected destination. Wait for explicit go-ahead per `feedback_installer_check.md`.
- Back up any `.module` file before editing.
- Verify each mod by launching it through `ModAssistant.exe` or via Steam `-modname` switch. Don't claim "done" on file presence alone.

---

## Pre-flight: Snapshot current game state

### Task 0: Capture baseline + back up modules

**Files:**
- Inventory: `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/` (list all `.module` files and their sizes)
- Backup: `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/_backup_modules_2026-04-26/`

- [ ] **Step 0.1: List existing `.module` files and their sizes**

Run: `ls -la "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/"*.module`
Expected: at minimum `DoWDE.module`, `DXP2.module`, `DXP3.module`. Record sizes for diff verification later.

- [ ] **Step 0.2: Snapshot the data folders that exist today**

Run: `ls "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/" | sort > /tmp/dowde_baseline.txt`
Purpose: any post-install diff against this baseline shows exactly what each mod added.

- [ ] **Step 0.3: Create backup folder for all stock `.module` files**

Run: `mkdir -p "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/_backup_modules_2026-04-26"`
Then: `cp "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/"*.module "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/_backup_modules_2026-04-26/"`
Expected: backup folder contains DoWDE.module, DXP2.module, DXP3.module, plus any other .module files present.

- [ ] **Step 0.4: Confirm Steam isn't running DoW:DE**

Run: `tasklist | grep -i "DoWDE\|relicdow" || echo "clean"`
Expected: "clean". If anything is running, stop and ask Glen to close the game first.

---

## Mod 1: Unification 7.3.8

### Task 1: Locate canonical install instructions on Steam

**Files:** none modified yet — research only.

- [ ] **Step 1.1: Open the canonical DE install thread for Unification**

URL: `https://steamcommunity.com/app/3556750/discussions/0/592906052488691226/`
Action: navigate via Claude in Chrome, read the latest pinned step list. Confirm the version number listed (7.3.8 as of last search; may be 7.3.9+ by today). Capture: required download files, post-install steps, any prerequisite mods.

- [ ] **Step 1.2: Cross-check against the WORKING MODS LIST**

URL: `https://steamcommunity.com/app/3556750/discussions/0/592906052488540821/`
Action: confirm Unification is listed as working on DE in the latest community-tested list. Note any flagged caveats.

### Task 2: Download Unification from Nexus

**Files:**
- Destination: `D:/Downloads/dow-de-mods/unification-7.3.8/` (create this folder)

- [ ] **Step 2.1: Create download staging folder**

Run: `mkdir -p "D:/Downloads/dow-de-mods/unification-7.3.8"`

- [ ] **Step 2.2: Open Unification Mod for DoW:DE on Nexus**

URL: `https://www.nexusmods.com/warhammer40000dawnofwar/mods/340`
Action: navigate via Claude in Chrome (Glen is already logged in). Click "Files" tab. Identify the latest main file (Unification 7.3.8 or higher).

- [ ] **Step 2.3: Trigger download**

Click "Manual Download" → "Slow download". Confirm the file lands in Glen's default Downloads folder. Note exact filename and size.

- [ ] **Step 2.4: Move the file to the staging folder**

Move from default Downloads location to `D:/Downloads/dow-de-mods/unification-7.3.8/`.

### Task 3: Install Unification

**Files:**
- Read: the README inside the downloaded archive/installer
- Modify: `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/` (mod adds files here)

- [ ] **Step 3.1: Inspect the download**

If `.exe`: report filename + size + source to Glen, wait for explicit go-ahead. If `.zip`/`.7z`/`.rar`: extract to staging folder first, read README.

- [ ] **Step 3.2: Install per the canonical Steam thread instructions**

Follow the steps captured in Step 1.1 verbatim. Most likely: run installer pointed at the DoW:DE install root, OR drop extracted contents into the install root. Do NOT skip any step in the official guide.

- [ ] **Step 3.3: Verify file additions**

Run: `ls "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/" | sort > /tmp/dowde_after_unification.txt && diff /tmp/dowde_baseline.txt /tmp/dowde_after_unification.txt`
Expected: a `Unification.module` (or similar) plus a Unification data folder.

- [ ] **Step 3.4: Launch Unification via ModAssistant**

Run: `"D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/ModAssistant.exe"` — confirm Unification appears in the mod list. Launch it. Confirm main menu loads under the Unification UI.

- [ ] **Step 3.5: Quick smoke test**

Start a 1v1 skirmish vs. an Easy AI on any small map with any race. Confirm the match loads without crashing. Quit out — no need to play it through.

- [ ] **Step 3.6: Mark Unification done**

Update plan checkbox. Note any issues observed for the post-install report.

---

## Mod 2: Titanium Wars 1.00.57 + DE patches

### Task 4: Download Titanium Wars (3 files)

**Files:**
- Destination: `D:/Downloads/dow-de-mods/titanium-wars-1.00.57/`

The mod requires THREE downloads in this order: base 1.00.57, DE patch, DE HotFix.

- [ ] **Step 4.1: Create staging folder**

Run: `mkdir -p "D:/Downloads/dow-de-mods/titanium-wars-1.00.57"`

- [ ] **Step 4.2: Download base v1.00.57**

URL: `https://www.moddb.com/mods/titanium-wars-mod/news/version-10057-25-november-2025`
Action: follow the download link in the news post to the ModDB file page. Click the green Download button → mirror selection page → first available mirror. Save to staging folder.

- [ ] **Step 4.3: Download TWM-DC-DE-patch for v1.00.57**

URL: `https://www.moddb.com/mods/titanium-wars-mod` (Files tab, filter by "DE patch" or follow the link from the v1.00.57 news post)
Action: find the file labelled "TWM-DC-DE-patch for v1.00.57" or similar wording. Download via mirror. Save to staging folder.

- [ ] **Step 4.4: Download DE HotFix (refreshed 1 Dec 2025)**

URL: same Files tab. Look for "DE HotFix for TWM-DC 1.00.57 with DE-patch". The file timestamp must be **on or after 1 Dec 2025**. If the date is earlier, stop and ask Glen — the linked page may be cached.

- [ ] **Step 4.5: Confirm all three files staged**

Run: `ls -la "D:/Downloads/dow-de-mods/titanium-wars-1.00.57/"`
Expected: 3 files. Note their sizes. Flag any that look unexpectedly small (< 1MB suggests an interrupted download).

### Task 5: Install Titanium Wars

**Files:**
- Read: README inside each archive
- Modify: `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/`

- [ ] **Step 5.1: Inspect base installer**

If `.exe`: report filename + size + source to Glen, wait for explicit go-ahead before running. The official ModDB install instruction is to extract or run the installer pointed at the DE directory.

- [ ] **Step 5.2: Install base v1.00.57**

Per ModDB instructions: extract / run installer, target DE root.

- [ ] **Step 5.3: Apply DE patch — extract over install**

Extract patch archive directly into `D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/`, allowing it to overwrite files.

- [ ] **Step 5.4: Apply DE HotFix — extract over install**

Extract HotFix archive directly into the DE root, allowing overwrite. This step MUST come after the DE patch.

- [ ] **Step 5.5: Verify file additions**

Run: `diff /tmp/dowde_after_unification.txt <(ls "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/" | sort)`
Expected: a Titanium Wars `.module` plus its data folder.

- [ ] **Step 5.6: Launch via ModAssistant + smoke test**

Same drill as Step 3.4 / 3.5: launch Titanium Wars module, confirm menu loads, run a quick skirmish, quit.

- [ ] **Step 5.7: Mark Titanium Wars done**

---

## Mod 3: 3rd Generation

### Task 6: Download 3rd Generation

**Files:**
- Destination: `D:/Downloads/dow-de-mods/3rd-generation/`

- [ ] **Step 6.1: Create staging folder**

Run: `mkdir -p "D:/Downloads/dow-de-mods/3rd-generation"`

- [ ] **Step 6.2: Open 3rd Generation on Nexus**

URL: `https://www.nexusmods.com/warhammer40000dawnofwar/mods/303?tab=files`
Action: confirm the Files tab shows a file marked compatible with DoW:DE (description should mention "Dark Crusade & Definitive Edition"). Note version.

- [ ] **Step 6.3: Trigger download → move to staging**

Same flow as Task 2.

### Task 7: Install 3rd Generation

- [ ] **Step 7.1: Inspect download**

Run installer-vs-archive check. If `.exe`: confirm with Glen first.

- [ ] **Step 7.2: Install per Nexus description**

Follow the description tab instructions on the Nexus mod page exactly.

- [ ] **Step 7.3: Verify file additions**

Diff against post-Titanium-Wars baseline. Expected: 3rd Generation `.module` + data folder.

- [ ] **Step 7.4: Launch via ModAssistant + smoke test**

- [ ] **Step 7.5: Mark 3rd Generation done**

---

## Final verification + handoff

### Task 8: All-mods sanity check

- [ ] **Step 8.1: Open ModAssistant — confirm all three mods listed**

All of: Unification, Titanium Wars, 3rd Generation should be selectable.

- [ ] **Step 8.2: Each mod launches independently**

Cycle through each — launch, confirm main menu, quit. (Already done per-mod, but a final clean cycle catches inter-mod corruption.)

- [ ] **Step 8.3: Update Glen — write the post-install report**

Post in chat: which versions were installed, where they are on disk, how to launch each (ModAssistant or `-modname` Steam launch option), known issues observed during smoke tests, and the location of `_backup_modules_2026-04-26` for rollback.

- [ ] **Step 8.4: Update session log**

Append to `projects/nbi_dashboard/session_logs/` (today's session log) with: mods installed, versions, time taken, issues.

---

## Rollback plan

If anything goes wrong:
1. Close the game.
2. Restore: `cp "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/_backup_modules_2026-04-26/"*.module "D:/SteamLibrary/steamapps/common/Dawn of War Definitive Edition/"`
3. Delete the offending mod's data folder (named after the mod, sibling to `.module` files).
4. If file corruption is suspected, "Verify integrity of game files" via Steam — this restores any DE files Unification or another mod overwrote.

## Self-review notes

- Spec coverage: covers Unification, Titanium Wars, 3rd Generation per Glen's confirmed list. Advanced Campaign Mod and Dark Crusade Forever explicitly excluded per his instruction.
- Order respected: Unification first (most invasive), then standalone modules, per community guidance.
- Installer hard rule baked into Steps 3.1, 5.1, 7.1.
- Backup taken in Task 0 — rollback feasible.
- Verification not just file presence — each mod must launch via ModAssistant + load a skirmish.
