"""Fix the Dispatcher agent adapter config."""
import requests, os

DISPATCHER_ID = "5bda49b0-b695-4db3-8e99-035624b1f516"
BASE_PATH = os.path.join(
    r"C:\Users\gpbea\.paperclip\instances\default\companies",
    "359ab370-c36f-4558-a252-637255ad1a7b",
    "agents",
    DISPATCHER_ID,
    "instructions"
)

resp = requests.patch(
    f"http://localhost:3100/api/agents/{DISPATCHER_ID}",
    json={
        "adapterType": "claude_local",
        "adapterConfig": {
            "maxTurnsPerRun": 5,
            "timeoutSec": 60,
            "graceSec": 10,
            "workingDirectory": r"D:\OneDrive\Claude_code\NBIAI_TEAM",
            "instructionsBundleMode": "managed",
            "instructionsEntryFile": "AGENTS.md",
            "instructionsRootPath": BASE_PATH,
            "instructionsFilePath": os.path.join(BASE_PATH, "AGENTS.md"),
            "dangerouslySkipPermissions": True,
        },
        "replaceAdapterConfig": True,
    },
    timeout=10,
)

if resp.ok:
    d = resp.json()
    print(f"Fixed. adapterType: {d.get('adapterType')}")
    ac = d.get("adapterConfig", {})
    print(f"instructionsFilePath: {ac.get('instructionsFilePath', '?')}")
else:
    print(f"Error: {resp.status_code} {resp.text[:200]}")
