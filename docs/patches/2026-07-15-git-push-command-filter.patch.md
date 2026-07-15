# Patch: git-push.js command filter

**Sub-project:** Harness efficiency overhaul SP2 (hook trigger tightening)
**Apply to:** `C:\Users\gpbea\.claude\harness\lib\git-push.js` (runtime) and `.claude\harness\lib\git-push.js` (source)
**Regression test:** `.claude\harness\tests\test-hook-misfire-regression.js` (57 tests, all passing)

## Problem

`git-push.js` is a PostToolUse async hook on `Bash|PowerShell`. It fires after EVERY Bash/PowerShell command and runs its full snapshot-check + push logic every time. This causes:
- "PUSH BLOCKED: branch contains snapshot: commits" messages after innocent commands (`ls`, `grep`, `cat`)
- Unnecessary `git log origin/HEAD..HEAD` + `git diff` executions on every single tool call
- Cry-wolf effect: the model learns to ignore PUSH BLOCKED messages because they appear constantly

## Fix

Add command filtering at the top of `git-push.js`. The hook reads stdin (hookData), extracts the command, and exits immediately if it is not a `git commit`. Uses `maskQuoted()` from command-detector.js to prevent false matches on quoted strings like `grep "git commit" file.md`.

### Insert after line 14 (`const R = require('./resolve');`):

```javascript
// Early exit: only run after git commit commands
const commandDetector = require('./command-detector');
var stdinData = '';
try { stdinData = fs.readFileSync(0, 'utf8'); } catch (_) { process.exit(0); }
var hookPayload = {};
try { hookPayload = JSON.parse(stdinData); } catch (_) { process.exit(0); }
var triggerCommand = (hookPayload.tool_input || {}).command || '';
if (!triggerCommand) process.exit(0);
var maskedCommand = commandDetector._maskQuoted(triggerCommand);
if (!/\bgit\s+(?:-[cC]\s+\S+\s+)*commit\b/.test(maskedCommand)) process.exit(0);
```

## Optional: settings.json `if` condition (belt-and-suspenders)

Add `"if": "Bash(git commit *)"` to the git-push.js hook entry in `~/.claude/settings.json`. This prevents the hook from even running for non-matching commands, reducing overhead further. The script-level filter above is defence-in-depth.

## Verification

After applying:
1. Run: `node .claude/harness/tests/test-hook-misfire-regression.js` (57 tests)
2. Run: `ls` in Bash -- should produce NO "PUSH BLOCKED" message
3. Run: `git commit -m "test"` -- should produce the normal push behaviour
4. Deploy: `node .claude/harness/deploy.js`
