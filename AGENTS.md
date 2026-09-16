# AGENTS.md — AegisAI

## Purpose

AegisAI is an academic/open-source AI Security project for learning, research and portfolio/CV development. Security testing is limited to controlled, project-owned or explicitly authorized environments.

## Primary rule

Use the **minimum context, minimum code change and minimum testing** needed to complete the requested task.

Do not do unrelated work.

## Before editing

1. Run `git status --short`.
2. Read only files directly relevant to the task.
3. Search briefly for reusable code before creating anything.
4. Preserve pre-existing local changes.

Do NOT recursively inspect the whole repository.

Ignore unless directly relevant:
`.git/`, `.venv/`, `__pycache__/`, `.pytest_cache/`, `aegisai.egg-info/`, generated files, caches, unrelated reports/tests/setup files.

Do not browse the web unless explicitly requested or required to resolve a blocking API/version fact.

## Architecture

Preserve these responsibilities:

- `aegis/attacks/` — attack definitions/loaders.
- `aegis/engine/` — attack execution.
- `aegis/targets/` — target contracts/adapters.
- `aegis/lab/` — controlled vulnerable scenarios/runtime.
- `attack-library/` — YAML attack catalogue.
- `ai/` — Ollama client, agent, tools, sandbox.
- `scripts/` — thin entry points.
- `tests/` — tests.
- `reports/` — ADRs/reports.
- `setup/` — environment lifecycle.

Core flow:

`AttackDefinition -> AttackRunner -> TargetAdapter -> TargetResponse -> AttackExecution`

Keep evaluation separate from execution unless explicitly requested.

## Reuse first

Before adding a new class, adapter, script, helper, fake, model or CLI:

1. reuse existing code;
2. adapt an existing abstraction;
3. add a small local helper;
4. create a new abstraction only if genuinely necessary.

Avoid parallel implementations and unnecessary refactors.

## Ownership boundaries

Person A mainly works on attacks, Attack Engine, mutations, AegisLab and AI Security logic.

Person B implemented substantial parts of `ai/`, Ollama/config/health, agent/tools/sandbox and `setup/`.

Do not modify Person B's areas unless the task requires it. If necessary, make the smallest change and explain why.

## Editing rules

- Smallest correct diff.
- Preserve existing behavior unless the task changes it.
- No repo-wide formatting.
- No style-only rewrites.
- No file moves/renames without need.
- No new dependencies if existing dependencies/stdlib suffice.
- Keep scripts thin.
- Never use real secrets or personal data in lab scenarios.
- Do not expose private system prompts/canaries in normal output unless explicitly required.

## Testing budget

Default: run only the narrowest relevant test.

Examples:

`pytest tests/unit/test_lab_runtime.py -q`

`pytest tests/unit/test_lab_runtime.py::test_name -q`

Run the full suite only if:
- explicitly requested;
- a shared/core abstraction changed;
- config/packaging changed;
- multiple modules are affected;
- final broad validation is genuinely needed.

Do NOT:
- repeatedly rerun passing tests;
- run the full suite after every small edit;
- run unrelated tests;
- launch Ollama for unit tests;
- run setup scripts, benchmarks or repeated model calls unless requested.

Use existing fakes/mocks for unit work.

## Real LLM calls

Only call Ollama/real models when explicitly requested or required by an end-to-end task.

One successful manual execution is normally enough.

Do not repeatedly query a model just to gain confidence.

## Security scope

Controlled academic work may cover prompt injection, indirect prompt injection, system prompt leakage, sensitive information disclosure, RAG poisoning, tool abuse, excessive agency, OWASP GenAI and MITRE ATLAS.

Keep attack execution scoped to project-owned lab targets, mocks, fixtures, sandboxes or explicitly authorized systems.

## Git

- Preserve existing user changes.
- Use `git diff --check` after edits.
- Inspect only the relevant diff.
- Do not commit, push, reset, stash, checkout or discard changes unless explicitly asked.
- Distinguish pre-existing changes from current-task changes.

## Response style

Do not narrate every command or produce long plans for straightforward tasks.

At completion report only:
- files changed;
- concise change summary;
- tests run + result;
- important blocker/limitation, if any.

Stop when the requested task is complete. Do not continue into the next milestone unless asked.

## codex_report.txt

Create `codex_report.txt` only when explicitly requested.

When requested, begin clearly with:

> This work is part of an academic Cybersecurity and Artificial Intelligence project conducted in controlled/authorized environments for learning, academic research, and portfolio/CV development. It is not intended for unauthorized attacks against real third-party systems.

Keep it compact and include:
- objective;
- files changed;
- implementation summary;
- tests actually run/results;
- manual execution only if requested/performed;
- relevant git diff;
- pre-existing changes separated clearly.

Do not include unrelated diffs, generated files, repeated logs or caches.

## Final decision rule

When multiple solutions work, choose the one with:

**more reuse -> fewer files -> smaller diff -> fewer tests -> fewer tokens -> less behavioral change.**
