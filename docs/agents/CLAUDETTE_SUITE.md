# Claudette Suite — Validation, Refinements & Roadmap

**Purpose:** Validate the GPT‑5 chat’s Claudette suite proposal, cross‑reference and justify decisions, propose refinements, and surface adjacent chatmodes. This is a concise, actionable report for implementation.

---

## TL;DR
- The suite idea is sound. Core gaps (security/auditability, CI artifacts, provenance, token‑constrained variants) are high‑value and correctly prioritized.  
- Implement the suite as *composable preamble modules* (identity, memoryPolicy, toolPolicy, verification, outputFormat) to avoid combinatorial explosion.  
- Quick wins: `security-auditor`, `ci-runner`, `provenance`, `architecture-strategist`, `lite-mini`.

---

## 1) Validation of the original chat (what's correct)
- Recurring motifs the chat identified are accurate and consistent with good agent design:
  - Autonomy-first behavioral anchor (agents continue until done) — necessary for agentic workflows.  
  - Role + tone binding ensures predictable style and reasoning approach.  
  - Tool-usage protocols and announce-and-call patterns reduce expensive or unsafe network calls.  
  - Mandatory memory protocol (check/create memory) aligns with reproducibility and long‑term state.  
  - Specialization tiers (Compact, Research, Debug, Ecko) are needed for production/edge tradeoffs.

Why these are correct: they map directly to operational concerns (latency, safety, auditability, cost). Enforcing them in preambles reduces variance between agent runs and makes orchestration deterministic.

---

## 2) Cross-reference & justification for the chat’s prioritization
- Security auditor first: justified. Security/PII leaks in agentic systems are high‑impact, high‑cost. Adding default safe behavior mitigates broad risk.  
- CI runner second: practical ROI — integrates easily into CI pipelines producing machine‑readable artifacts (JUnit/JSON) and reduces human overhead.  
- Provenance third: enterprise customers and legal contexts require claim provenance — adding structured provenance increases trust and auditability.  

Concrete mapping to repository needs:
- Preambles should align with the repository’s existing agent flavors (Auto, Debug, Ecko). Where `claudette-auto` exists, add a `security` module that can be composed into it.  
- The `ci-runner` maps to existing Debug/Test tooling (extend `Debug` + `CI-output` module).  

Justification summary: the prioritized items address risk (security), operational automation (CI), and compliance (provenance) — the classic risk/benefit trifecta that accelerates adoption.

---

## 3) Refinements & design decisions (my recommendations)
1. Preamble composability (Preamble Factory)
   - Split preambles into modules: `identity`, `memory_policy`, `tool_policy`, `verification`, `output_format`, `autonomy_level`, `telemetry`.  
   - Implement a small composer (script or simple CLI) that concatenates chosen modules into a final preamble file and emits a metadata manifest.

2. Agent manifest & metadata header (canonical)
   - Each agent run MUST end with a JSON metadata header (machine‑parsable). Example:

```json
{"agent":"claudette-security-auditor","version":"v1.0","run_id":"<uuid>","start":"<iso>","end":"<iso>","memory_policy":"no_persist","tools":["fs","lint"],"verification_level":"strict","autonomy":"semi-autonomous"}
```

   - Use this manifest for orchestration, search, audits, and routing.

3. Provenance HMAC header
   - For high‑trust outputs include a provenance header HMACed with a signing key held by the orchestration layer. This enables tamper evidence for legal/audit uses.

4. Emergency-stop & telemetry clamps
   - Every higher‑autonomy preamble should include: `ESCALATE:STOP` rule; numeric network_call limits; max tool_calls threshold; and a telemetry report (toolCalls, netCalls, diskWrites).

5. Memory tagging & encryption
   - Any memory writes that may contain sensitive data must be labelled (e.g., `SEC:REDACTED`) and encrypted at rest. The Security Auditor preamble should require this by default.

6. Output formalism options
   - Provide three output formats as modules: `free_text`, `structured_json`, `junit_xml`. Orchestration can require structured formats for CI/automation.

---

## 4) Adjacent chatmodes (ideas to add) — concise list
These expand practical uses and are simple to implement as modules or small preambles.
- On‑call Responder: triage runbooks, escalate, produce playbook steps, require explicit human approval before write actions.  
- Experiment Runner: manage A/B tests, track metrics, produce reproducible experiment manifests.  
- Compliance Lawyer: focus on legal phrasing, retention policy checks, GDPR/CCPA flags, and produce redaction suggestions.  
- Whiteboard Brainstorm: iterative idea generation with constraints (no tooling, purely ideation).  
- Customer Persona Roleplayer: simulate stakeholder feedback (product/design validation).  
- Data‑Engineer Orchestrator: ETL-focused, enforces schema checks and sample data outputs.  
- Summarizer Aggregator: long-context chunking + provenance + stitched summary for legal/archival usage.

Each of these is a small module away from the recommended suite and can be composed with memory/verification modules.

---

## 5) Example preambles worth shipping first (ordered)
1. `claudette-security-auditor` — high value for safety and adoption.  
2. `claudette-ci-runner` — practical automation; produce JUnit/JSON artifacts.  
3. `claudette-provenance` — for legal/compliance outputs and research.  
4. `claudette-architecture-strategist` — product/technical decision documents.  
5. `claudette-lite-mini` — cost-sensitive, low‑token footprint variant.

Implementation note: prefer composing `security` + `auto` for the first, `debug` + `junit` for CI runner, and `research` + `provenance` for provenance agent.

---

## 6) Minimal manifest & metadata spec (proposal)
- `preamble.yaml` (human) / `preamble.json` (machine) fields: 
  - `name`, `version`, `modules`: [identity,memory_policy,tool_policy,verification,output_format], `autonomy_level`, `verification_level`, `signed` (bool).

Example JSON manifest (small):

```json
{
  "name":"claudette-ci-runner",
  "version":"v1.0",
  "modules":["identity:ci-runner","memory:ephemeral","tool:runCommands","output:junit_xml"],
  "autonomy":"semi-autonomous",
  "verification":"basic",
  "signed":false
}
```

---

## 7) Implementation roadmap (practical steps & quick wins — 2 week sprint)
1. Week 0 — scaffolding
   - Create `docs/agents/modules/` and short README describing module format.  
   - Add `compose.js` (or node script) to assemble preambles and emit manifest.
2. Week 1 — ship quick wins
   - Implement `security-auditor.md` (module + full preamble).  
   - Implement `ci-runner.md` (preamble + JUnit example).  
   - Add metadata header enforcement in orchestration layer (small change in `task-executor`/`task-executor.ts` to capture metadata if present).  
3. Week 2 — provenance + tests
   - Implement `provenance` module (HMAC header pattern) and add to `research` preamble.  
   - Add test harness using existing `Debug` preamble to validate each new preamble and produce sample artifacts.

Deliverables: 5 MD preambles, composer script, manifest JSON schema, small test harness that runs each preamble once and validates output metadata.

---

## 8) Small technical caveats & choices to make
- Where to store signing keys for provenance? Recommendation: orchestration host keystore (not persistent agent memory). Use short‑lived signing keys and rotate.  
- Encryption for memory: use repository key management (KMS) or local disk encryption; start with `AES-256` with keys in orchestration layer.  
- Telemetry: aggregate tool call counts and net calls in metadata; be conservative about PII in telemetry payloads.

---

## 9) Example short templates (one-line examples)
- Metadata header (agent end-of-run JSON):

```json
{"agent":"claudette-ci-runner","run_id":"uuid","start":"iso","end":"iso","memory":"ephemeral","tools":["runCommands"],"verification":"basic"}
```

- Emergency-stop rule (preamble sentence):

> If you output the token `ESCALATE:STOP` or exceed `network_calls > 10` or `tool_calls > 200`, immediately stop and emit full telemetry and a human escalation record.

---

## 10) Conclusion & next step I will take (if you want me to continue)
- The ideas in the GPT‑5 chat are validated and well‑prioritized. Composability, a small manifest scheme, and an emergency-stop/telemetry policy are the highest‑leverage refinements.  

Next step I can do for you (pick one):
- Generate full MD files for the top 5 preambles (production-ready preambles you can paste into your gist), or
- Produce a small `compose.js` script (Node) and example module files so you can build preambles programmatically.

---

*File created:* `docs/agents/CLAUDETTE_SUITE.md` — implement and iterate as needed.
