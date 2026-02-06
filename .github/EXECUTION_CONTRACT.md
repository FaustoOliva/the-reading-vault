# Execution Contract - The Reading Vault

**Version:** 1.0 | **Last Updated:** February 6, 2026

---

## Purpose

Minimal shared assumptions for how agents execute tasks.

**Authority Hierarchy:**
1. DOMAIN.md (business rules)
2. AGENTS.md (agent behavior)
3. EXECUTION_CONTRACT.md (this doc)
4. Skills (`.github/skills/*.md`)
5. Existing code

If unclear, STOP and ask.

---

## Core Execution Rules

### Transactions
- **Services** control transactions
- **Repositories** accept session/transaction as parameter
- Mutations affecting 2+ tables MUST be transactional
- Always rollback on error, then re-throw

### Error Handling
- Always **throw**, never return error objects
- Services translate DB errors → Domain errors
- Controllers never create domain errors
- Enrich errors with context before re-throwing

### Async/Await
- All service methods MUST be async
- Never mix `.then()` and `async/await`
- Use `Promise.all` for independent operations

### Dependency Injection
- Manual DI only
- Pass dependencies explicitly
- Wire in container/bootstrap file
- No global imports of repositories or services

### Testing
- AAA pattern mandatory (Arrange, Act, Assert)
- Mock only at layer boundaries
- Tests mirror source structure (`service.js` → `service.test.js`)
- Minimum 70% overall coverage

### File Organization
- Prefer creating new files over modifying existing
- camelCase: files/folders
- PascalCase: classes
- Test files: `<name>.test.js`

### Git
- Commit after each logical unit (test, feature, fix)
- Conventional Commits: `type(scope): description`

---

## Prohibited Practices

❌ String literals for domain states  
❌ Magic numbers  
❌ Global state/singletons  
❌ Mixing `.then()` and `async/await`  
❌ Returning error objects  
❌ Business logic in controllers/repositories  
❌ Transactions in repositories  
❌ Silent error catching  
❌ Modifying .md files without approval  
❌ Code below coverage threshold  

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| By ID query | < 10ms |
| List query (< 100 records) | < 50ms |
| List query (100-1000 records) | < 200ms |
| GET endpoints | < 200ms |
| POST/PUT endpoints | < 500ms |
| KPI aggregations | < 500ms |

---

**For detailed rules, see:**
- Transaction patterns → `.github/skills/api-transactions` (when created)
- Error handling → `.github/skills/api-errors`
- Testing → `.github/skills/api-testing`
- Architecture → `packages/api/ARCHITECTURE.MD`
