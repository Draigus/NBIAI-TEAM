# Project Template

Use this template when setting up a new project. Copy the entire `_template/` directory to `projects/{project_name}/` and populate each file.

---

## Directory Structure

```
projects/{project_name}/
├── project_brief.md        # Project definition: scope, success criteria, deliverables, risks, timeline
├── knowledge/              # Tier 3 knowledge -- project-specific context loaded by agents assigned to this project
│   └── project_context.md  # Living summary: what the project is, current state, key decisions, known issues
├── deliverables/           # Completed or in-progress deliverables produced by agents on this project
├── backlog/                # Feature briefs, bug reports, and work items not yet scheduled
├── session_handoffs/       # End-of-session summaries written before context compaction or session end
└── README.md               # This file -- remove or replace with project-specific notes after copying
```

## How to Use

1. **Copy the directory:** `cp -r projects/_template/ projects/{project_name}/`
2. **Write the project brief:** Fill in `project_brief.md` following the example in this template (a completed Playsage example is provided as reference).
3. **Add Tier 3 knowledge:** Create `knowledge/project_context.md` with a summary of the project that agents need when working on it. Update this file as the project evolves.
4. **Assign agents:** Update agent assignments in the project brief and ensure the org chart reflects who is working on what.
5. **Track deliverables:** As agents produce outputs, store them in `deliverables/`.
6. **Manage the backlog:** Feature briefs and upcoming work items go in `backlog/`. Each item gets its own file.
7. **Write handoffs:** At the end of every session (or before context would be compacted), write a handoff summary to `session_handoffs/` with the date in the filename.

## Knowledge Loading

When instantiating an agent for this project, load:
- **Core:** `NBI_Brain.md` (company-wide context)
- **Tier 2:** `roles/{role_name}/knowledge/*.md` (role-specific domain knowledge)
- **Tier 3:** `projects/{project_name}/knowledge/*.md` (this project's context)

## Notes

- British English only, no em dashes (use -- instead).
- The `project_brief.md` included here is a completed example (Playsage Homepage Redesign). Replace it entirely with your project's brief.
- Session handoff filenames should follow the pattern `handoff_YYYY-MM-DD.md`.
- Keep `knowledge/project_context.md` lean and current -- it is loaded into every agent's context window for this project.
