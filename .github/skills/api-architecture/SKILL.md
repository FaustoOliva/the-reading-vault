---
name: api-architecture
description: Rules for creating files, folders and wiring components according to the API architecture.
---

## Scope
This skill applies when:
- Creating new folders or files
- Wiring routes, controllers and services
- Adding repositories or infrastructure dependencies
- Bootstrapping new features

---

## Source of Truth
Architecture rules are defined in:
1. ARCHITECTURE.md
2. AGENTS.md

If a conflict exists, do NOT guess.
Stop and report the inconsistency.

---

## Folder Structure Rules

The API uses a **layer-based, non-modular structure**.

Allowed root folders:
- config
- controllers
- errors
- infrastructure
- middlewares
- models
- routes
- services
- test

❌ Do NOT create module-based folders  
❌ Do NOT nest domain features under new roots  

---

## File Placement Rules

- Routes → `/routes`
- Controllers → `/controllers`
- Services (use cases) → `/services`
- Domain entities → `/models`
- Repositories → `/infrastructure/repositories`
- DB logic → `/infrastructure/database`
- Cross-cutting config → `/config`

Each file must have **one responsibility only**.

---

## Dependency Rules

Allowed dependency flow:
routes → controllers → services → models
↘ infrastructure/repositories


Forbidden:
- Controllers importing repositories
- Models importing infrastructure
- Routes calling services directly
- Any cross-layer shortcut

---

## Dependency Injection

- Manual DI only
- Dependencies are passed via constructors or function parameters
- No global singletons
- No hidden imports

Services:
- Receive repositories explicitly

Repositories:
- Receive DB/session explicitly

---

## Naming Conventions

- Files and folders: camelCase
- Classes: PascalCase
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

Violations must be corrected immediately.

---

## Prohibited Practices

❌ Creating new architectural patterns  
❌ Introducing framework magic  
❌ Mixing responsibilities in the same file  
❌ Writing logic before structure is correct  

---

## Expected Outcome

- Predictable folder structure
- Consistent dependency wiring
- Easy reasoning for humans and agents
- No architectural drift
