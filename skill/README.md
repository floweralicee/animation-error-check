# Animation Error Check — Skill

This is the OpenClaw skill definition for the Animation Error Check tool.

## Contents

- `SKILL.md` — Main skill definition (triggers, usage, capabilities)
- `rules/animation_rules.yaml` — Heuristic critique rules
- `schemas/metrics.schema.json` — Schema for internal analysis metrics
- `schemas/output.schema.json` — Schema for the final output JSON
- `prompts/critique_prompt.md` — Template for future LLM-based critique
- `examples/sample_output.json` — Example analysis output
- `docs/system_architecture.md` — System architecture overview

## How to install

Copy the `skill/` folder into your OpenClaw skills directory, or symlink it:

```bash
ln -s /path/to/animation-error-check/skill ~/.openclaw/skills/animation-error-check
```

## Integration

The skill references the web app's API endpoint. Make sure the app is running locally (`npm run dev`) before using the skill.
