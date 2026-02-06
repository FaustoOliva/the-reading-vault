---
name: documentation
description: Rules for creating, updating and auditing documentation as a minimal, enforceable contract for agents.
---

## Purpose

Documentation exists to provide:
- Clear contracts for agents
- Explicit responsibilities
- Minimal but sufficient context for correct execution

Documentation must NOT:
- Replace prompts with excessive verbosity
- Duplicate rules across files
- Grow without strict justification

---

## Scope

This skill applies when:
- Creating or updating markdown documents
- Auditing existing documentation
- Proposing structural or responsibility changes
- Translating documentation

---

## Core Principles

- Documentation must be **minimal, refined, and intentional**
- Each markdown file must have a **single, explicit responsibility**
- More lines do NOT mean better guidance
- If a rule can be inferred from another document, it should not be repeated

---

## Responsibility Boundaries

Each document has a fixed role:

- DOMAIN.md → Business rules (WHAT the system does)
- USE_CASES.md → Allowed system behaviors (WHAT can happen)
- ARCHITECTURE.md → Structural decisions (HOW the system is organized)
- AGENTS.md → Execution rules for agents (HOW agents build it)
- EXECUTION_CONTRACT.md → Global, minimal execution assumptions
- Skills → Operational constraints for specific activities

Overlaps between these documents are forbidden.

---

## Audit Rules (Mandatory)

When auditing documentation, the agent MUST:

### 1. Responsibility Audit
- Verify that each document has a single responsibility
- Detect responsibility leaks between documents
- Report overlaps explicitly

---

### 2. Size & Density Audit
- Flag documents that grow excessively without added clarity
- Question documents that exceed reasonable size for their role
- Recommend simplification or splitting when needed

---

### 3. Reference Audit
- Validate all relative paths and references
- Detect broken, ambiguous, or circular references
- Ensure references point to the correct source of truth

---

### 4. Consistency Audit
- Cross-check documents for contradictions
- Ensure terminology is consistent (names, enums, concepts)
- Detect duplicated rules expressed differently

---

### 5. Prompt Readiness Audit
- Evaluate whether the current documentation allows:
  - Short, declarative prompts
  - Minimal repetition of rules
- If long prompts are required, documentation is considered insufficient

---

### 6. Agent Usability Audit
- Verify that rules are enforceable, not aspirational
- Ensure prohibitions are explicit
- Detect vague or interpretative language

---

## Change Rules

When proposing documentation changes:

- Changes must be justified by a concrete failure or ambiguity
- Adding lines requires stronger justification than removing lines
- Prefer refining existing rules over adding new ones
- Large additions must explain why minimal alternatives are insufficient

---

## Translation Rules

- AGENTS.md must be written in Spanish
- All other technical documentation must remain in English
- Meaning and authority must be preserved during translation
- No new rules may be introduced during translation

---

## Prohibited Practices

❌ Turning documentation into tutorials  
❌ Repeating the same rule across multiple files  
❌ Adding defensive verbosity instead of fixing structure  
❌ Encoding prompts inside markdown documents  

---

## Expected Outcome

- Documentation acts as a lightweight but strict contract
- Agents require minimal prompt context
- Responsibilities are unambiguous
- Documentation remains stable as the system grows
