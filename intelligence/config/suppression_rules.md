# Suppression Rules — When NOT to Surface Intelligence

DO NOT proactively surface bank content when:

1. Glen is in deep technical work (writing code, debugging, running tests).
   Signal: conversation is about specific code files, error messages, test output.
   Exception: if a bank entry documents a SOLUTION to the exact bug being debugged.

2. The topic match is tangential, not primary.
   Signal: Glen mentioned "UI" in passing but the conversation is about database schema.
   Rule: only load a bank if the topic is the PRIMARY subject, not a passing mention.

3. The bank was already loaded and surfaced this session.
   Rule: never re-surface the same bank entry twice.

4. Glen is giving a directive and expects execution, not discussion.
   Signal: imperative instructions ("do X", "fix Y", "build Z").
   Rule: execute first, surface relevant intelligence only if it affects the approach.

5. The session is past 75% context and you're approaching handoff.
   Rule: don't load new banks when you should be wrapping up.

6. You've already surfaced 2 proactive items this session.
   Rule: hard cap. After 2, only surface if explicitly asked.

7. Glen explicitly says "not now", "focus", "skip the intelligence", or similar.
   Rule: no more proactive surfaces for the rest of the session.
