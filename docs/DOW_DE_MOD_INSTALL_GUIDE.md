# Dawn of War: Definitive Edition — Mod Install Guide for Glen

**Date: 2026-04-26**

You drive the clicks. I've laid out exact paths, sequence, and verification points. Do **NOT** skip the verification step after each mod — the install is cheap to redo, but stacking three broken installs is a pain to untangle.

## Pre-flight (do once before starting)

1. **Make sure DoW:DE and ModAssistant.exe are both closed.** Close them now if they're open.
2. **Make sure Steam isn't auto-updating DoW:DE.** Steam → Library → DoW:DE → Properties → Updates → set to "Only update this game when I launch it."
3. **Backup is already taken.** Stock `.module` files are at:
   `D:\SteamLibrary\steamapps\common\Dawn of War Definitive Edition\_backup_modules_2026-04-26\`
   If anything goes sideways, copy those back into the install root and you're whole.

---

## Mod 1 — Unification 7.3.8 (do FIRST)

**Files (already in `C:\Users\gpbea\Downloads\`, both verified by MD5):**
- `Unification-v7.3.8.exe` (60 MB)
- `Unification.7z` (20 GB)

Both are in the same folder, which the installer requires.

### Steps

1. Open File Explorer to `C:\Users\gpbea\Downloads\`.
2. **Double-click** `Unification-v7.3.8.exe`.
3. Click through any "Do you trust this publisher?" / SmartScreen warning. (It's a community installer, no signature — that's normal.)
4. When the installer asks where to install, **paste this exact path**:
   ```
   D:\SteamLibrary\steamapps\common\Dawn of War Definitive Edition\
   ```
   *Don't* point at AppData. Don't point at the Mods subfolder. Point at the DE root.
5. Click through Next / Install. Let it run — it's extracting 20 GB so this will take a few minutes.
6. If it asks about installing the "DOW Mod Launcher", **say yes** — that's the modern equivalent of ModAssistant and it pairs nicely with Unification.
7. When done, click Finish.

### Verify Unification works before moving on

1. Launch `D:\SteamLibrary\steamapps\common\Dawn of War Definitive Edition\ModAssistant.exe` (OR the DOW Mod Launcher if the installer added one).
2. You should see **Unification** listed.
3. Click it → click Activate (or Launch).
4. Game switches to a Unification-skinned main menu. UI may be in 4:3 — that's a known cosmetic limitation, ignore it.
5. Start Skirmish → 1v1 vs Easy AI on any small map → pick any race → confirm match loads → quit out.
6. **Tell me "Unification verified"** before moving on.

If Unification doesn't show up: double-check that you installed to the DE root, not AppData. The installer's path picker may have defaulted to the legacy AppData path — override it.

---

## Mod 2 — Titanium Wars 1.00.57 + DE patch + DE HotFix

**Files (already in `C:\Users\gpbea\Downloads\`, all verified by MD5):**
- `TitaniumWars_1.00.57.rar` (820 MB) — base
- `TWM-DC-DE-patch_1.00.57.rar` (128 MB) — DE compat patch
- `DE_HotFix_TWM_DC_1.00.57.1.rar` (5 MB) — DE hotfix

These are RAR archives — you'll need 7-Zip File Manager (already installed on your machine).

### Steps — apply in order, no skipping

1. **Base mod** — right-click `TitaniumWars_1.00.57.rar` → 7-Zip → Extract files… → set the destination to:
   ```
   D:\SteamLibrary\steamapps\common\Dawn of War Definitive Edition\
   ```
   → click OK. If 7-Zip asks about overwriting, say **Yes to All**.
2. **DE patch** — right-click `TWM-DC-DE-patch_1.00.57.rar` → 7-Zip → Extract files… → same destination → **Yes to All** for overwrites.
3. **DE HotFix** — right-click `DE_HotFix_TWM_DC_1.00.57.1.rar` → 7-Zip → Extract files… → same destination → **Yes to All** for overwrites. The HotFix MUST come after the DE patch, not before.

### Verify Titanium Wars works

1. Launch ModAssistant.exe (or DOW Mod Launcher).
2. **Titanium Wars** should now appear alongside Unification.
3. Click it → Activate / Launch.
4. Confirm main menu loads. Edge-scrolling may be slightly buggy (known minor issue, can be ignored).
5. Quick 1v1 vs Easy AI skirmish → quit.
6. **Tell me "Titanium Wars verified."**

---

## Mod 3 — 3rd Generation 3.2.4 + DE Patch v8b

⚠️ **Main file (4.6 GB) failed to download cleanly — two stalled partials in your Downloads folder.** Step 1 below covers retrying it. The DE Patch v8b is fine.

### Step 0 — Retry the 4.6 GB main file

1. In Chrome, go to: `https://www.nexusmods.com/warhammer40000dawnofwar/mods/303?tab=files`
2. Click **"Dawn of War - 3rd Generation 3.2.4"** in the Main files section to expand.
3. Click **Manual download** → on the next page, click **Slow download**.
4. Wait. At Nexus free-tier 3 MB/s, the 4.6 GB will take ~26 minutes.
5. While that downloads, you can clean up the stalled partials by deleting these two files from `C:\Users\gpbea\Downloads\`:
   - `Unconfirmed 110506.crdownload`
   - `Unconfirmed 766921.crdownload`
6. When the download finishes, you'll see a file like `Dawn of War - 3rd Generation 3.2.4-303-3-2-4-...zip` (4.6 GB) in Downloads.

**Files (after retry):**
- `Dawn of War - 3rd Generation 3.2.4-...zip` (4.6 GB) — main mod
- `DoW 3rd Generation Definitive Edition Patch (v8)-303-3-2-4-DE-V8b-1777059522.zip` (185 MB) — DE patch ✅ already downloaded

### Step 1 — Extract main mod

The main mod's description says: "open it and copy all the contents to your Dark Crusade folder OR to a folder within your Definitive Edition Mods folder."

We're going the **DE Mods folder** route. The folder doesn't exist yet — we'll create it.

1. In File Explorer, go to:
   ```
   D:\SteamLibrary\steamapps\common\Dawn of War Definitive Edition\
   ```
2. Right-click → New → Folder → name it `Mods`.
3. Inside `Mods`, create another folder named `3rdGen`.
4. Right-click the 4.6 GB `Dawn of War - 3rd Generation 3.2.4-...zip` → 7-Zip → Extract files… → set destination to:
   ```
   D:\SteamLibrary\steamapps\common\Dawn of War Definitive Edition\Mods\3rdGen\
   ```
   → click OK.

### Step 2 — Apply DE Patch v8b

1. Right-click `DoW 3rd Generation Definitive Edition Patch (v8)-303-3-2-4-DE-V8b-1777059522.zip` → 7-Zip → Extract files… → set destination to **the same `3rdGen` folder** → **Yes to All** for overwrites.

### Verify 3rd Generation works

1. Launch DoW:DE (NOT through ModAssistant this time — launch it normally from Steam).
2. In the main menu, look for a **Mods** option.
3. **DoW:3G - Definitive Edition Patch** should appear in the list.
4. Click it → Activate / Launch.
5. Confirm main menu loads. The DE Patch description specifically says "run the Definitive Edition and choose DoW:3G - Definitive Edition Patch."
6. Quick skirmish → quit.
7. **Tell me "3rd Generation verified."**

---

## After all three are verified

Tell me and I'll:
- Update your session log with what got installed and where
- Update [docs/HANDOFF_DOW_MODS_2026-04-26.md](docs/HANDOFF_DOW_MODS_2026-04-26.md) with the final state
- Confirm the rollback path is still good

---

## If something breaks

**Mod doesn't appear in ModAssistant after install:**
- Most likely you installed to the wrong path. Check that there's a `<ModName>.module` file directly in `D:\SteamLibrary\steamapps\common\Dawn of War Definitive Edition\` (or in the case of 3rd Gen, that the `3rdGen` subfolder is populated).

**Game crashes when activating a mod:**
- Close the game. Tell me what mod and what step. I have a rollback procedure that copies stock `.module` files back from the backup folder.

**Game won't even launch:**
- Steam → DoW:DE → Properties → Installed Files → Verify integrity of game files. This re-downloads any DE files that mods overwrote. You'll lose mods but get the base game back. Then we redo from a known-good baseline.
