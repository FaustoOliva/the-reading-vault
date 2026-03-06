## Database Migration: SQL Server → PostgreSQL

**Status:** Planning  
**Date:** March 3, 2026  
**Timeline:** 2-3 days  
**Complexity:** Medium (Code + Schema changes)

---

## Overview

This migration converts the backend from **SQL Server (MSSQL)** to **PostgreSQL** for cloud deployment on Heroku.

### Why PostgreSQL?
- **Free tier availability** on Heroku/Render
- **SQL Server on cloud** (Azure) is expensive ($$$)  
- **Full schema compatibility** - minimal code changes needed
- **Adequate for MVP** - single-user, moderate data volume

---

## Scope of Changes

### Phase 1: Dependency Updates
**File:** `packages/api/package.json`

| Action | Current | New |
|--------|---------|-----|
| Remove | `"mssql": "^11.0.0"` | - |
| Add | - | `"pg": "^8.11.0"` |

### Phase 2: Database Client

**File:** `packages/api/infraestructure/config/database.js`
- ✅ Keep existing file (for reference)
- 📝 Replace with PostgreSQL import in container.js

**New File:** `packages/api/infraestructure/config/postgresqlClient.js`  
- ✅ Created (ready to use)
- Provides connection pool management similar to MSSQLClient
- Supports transactions and parameterized queries

### Phase 3: Configuration

**File:** `packages/api/config/env.js`
- ✅ No changes needed
- Database config already accepts: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
- Heroku will provide these as environment variables

### Phase 4: Database Schema

**File:** `packages/api/infraestructure/database/init.sql`
- ✅ Keep for reference (SQL Server version)

**New File:** `packages/api/infraestructure/database/init-postgres.sql`
- ✅ Created (ready to use)
- Converted all SQL Server syntax to PostgreSQL
- Key changes:
  - `IDENTITY(1,1)` → `SERIAL`
  - `NVARCHAR(n)` → `VARCHAR(n)`
  - `NVARCHAR(MAX)` → `TEXT`
  - `GETDATE()` → `NOW()`
  - `DATETIME` / `DATETIME2` → `TIMESTAMP`
  - `GO` → (removed, not needed in PostgreSQL)
  - `IF NOT EXISTS ... CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`

### Phase 5: Repository Layer (CRITICAL)

**Files to Update:**
```
packages/api/infraestructure/repositories/
├── AbstractRepository.js      (if exists)
├── bookRepository.js
├── authorRepository.js
├── countryRepository.js
├── readingSessionRepository.js
├── bookStatusHistoryRepository.js
├── aiContextRepository.js
└── (all others that query DB)
```

**Changes Required:**
Each repository currently uses MSSQL query syntax. Examples:

```javascript
// ❌ SQL Server syntax
const result = await request.input('id', sql.Int, id).query(sqlQuery);

// ✅ PostgreSQL syntax  
const result = await pool.query(sqlQuery, [id]);
```

**Key Patterns to Replace:**

| Pattern | SQL Server | PostgreSQL |
|---------|-----------|-----------|
| **Connection** | `const request = pool.request()` | `const client = await pool.connect()` |
| **Parameters** | `.input('id', sql.Int, value)` | Pass as array: `[value]` |
| **Query** | `request.query(sql)` | `client.query(sql, params)` |
| **Release** | Auto-released | `client.release()` |
| **Transactions** | `new sql.Transaction(pool)` | `BEGIN / COMMIT / ROLLBACK` |
| **Stored Procedures** | `request.execute()` | Not used (use functions) |

### Phase 6: Service Layer

**Files that use transactions:**
```
packages/api/services/
├── logReadingSessionService.js
├── createBookService.js
├── updateBookService.js
├── reviewBookService.js
├── reopenBookService.js
└── (check all that use mssqlClient)
```

**Changes Required:**

SQL Server transactions:
```javascript
const pool = await this.mssqlClient.getConnection();
const transaction = new sql.Transaction(pool);
await transaction.begin();
try {
  await transaction.query(sql1);
  await transaction.query(sql2);
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}
```

PostgreSQL transactions:
```javascript
const client = await this.pgClient.beginTransaction();
try {
  await client.query(sql1, params1);
  await client.query(sql2, params2);
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
} finally {
  client.release();
}
```

### Phase 7: Container Configuration

**File:** `packages/api/config/container.js`

**Changes:**
```javascript
// ❌ OLD
import { MSSQLClient } from "../infraestructure/config/database.js";
const mssqlClient = new MSSQLClient(config.database);
this.instances.set("mssqlClient", mssqlClient);

// ✅ NEW
import { PostgreSQLClient } from "../infraestructure/config/postgresqlClient.js";
const pgClient = new PostgreSQLClient(config.database);
this.instances.set("pgClient", pgClient);
```

Then update all `mssqlClient` references to `pgClient` when instantiating services/repositories.

### Phase 8: DatabaseRepository Adapter

**File:** `packages/api/infraestructure/database/DatabaseRepository.js`

**Changes:**
Update the `executeQuery()` method to use PostgreSQL connection pool:

```javascript
async executeQuery(query, inputs = {}) {
  const client = await this.pgClient.getConnection().connect();
  try {
    // Convert input object to array for PostgreSQL
    const values = Object.values(inputs);
    const result = await client.query(query, values);
    return result;
  } finally {
    client.release();
  }
}
```

**Note:** Parameter names change from `:paramName` (SQL Server) to `$1, $2, $3...` (PostgreSQL)

---

## Migration Checklist

### Pre-Migration
- [ ] Read entire DOMAIN.md to understand business rules
- [ ] Backup current SQL Server data (if any important data exists)
- [ ] Create a feature branch: `feat(db): migrate-to-postgres`

### Step 1: Update Dependencies
```bash
cd packages/api
npm uninstall mssql
npm install pg
```

### Step 2: Create PostgreSQL Schema
- Schema file created: `init-postgres.sql`
- Will execute this in Heroku PostgreSQL database

### Step 3: Update Code (Repository Layer)
- [ ] Update all repositories to use PostgreSQL syntax
- [ ] Test each repository with local PostgreSQL database
- [ ] Run `npm test` to verify business logic unchanged

### Step 4: Update Service Layer
- [ ] Verify all transaction handling works with PostgreSQL
- [ ] Test with `npm test:coverage`

### Step 5: Update Container
- [ ] Replace MSSQLClient with PostgreSQLClient
- [ ] Verify dependency injection wiring

### Step 6: Local Testing
```bash
# Start PostgreSQL locally (Docker recommended)
docker run --name reading-vault-db \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=reading_vault \
  -p 5432:5432 \
  postgres:16

# Create .env with:
DB_USER=testuser
DB_PASSWORD=testpass
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reading_vault

# Run migrations
psql -U testuser -h localhost -d reading_vault -f packages/api/infraestructure/database/init-postgres.sql

# Start API
npm start

# Run tests
npm test:coverage
```

### Step 7: Heroku Deployment
```bash
# Create Heroku app with PostgreSQL
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev --app your-app-name

# Get database credentials from Heroku
heroku config --app your-app-name

# Set environment variables
heroku config:set \
  DB_USER=<from-heroku> \
  DB_PASSWORD=<from-heroku> \
  DB_HOST=<from-heroku> \
  DB_PORT=5432 \
  DB_NAME=<from-heroku> \
  --app your-app-name

# Push code to Heroku
git push heroku main

# Run migrations on Heroku
heroku run "psql $DATABASE_URL < packages/api/infraestructure/database/init-postgres.sql"

# Verify connection
heroku logs --tail --app your-app-name
```

---

## Risk Mitigation

### Testing Strategy
1. **Unit Tests:** Repositories tested in isolation with mock db
2. **Integration Tests:** Full service → repository flow with real PostgreSQL
3. **E2E Tests:** API endpoints tested against live database

### Rollback Plan
If migration fails:
1. Revert to SQL Server branch
2. Maintain SQL Server version in codebase for 1 release
3. Provide clear instructions for users running on their own infra

### Data Safety
- Heroku PostgreSQL has automatic backups
- Before production, test migration with sample data
- Document any data transformations needed

---

## Effort Estimate

| Task | Hours | Notes |
|------|-------|-------|
| Dependencies | 0.5 | Simple npm uninstall/install |
| Repository updates | 6-8 | Most time spent here (7 files) |
| Service layer | 2-3 | Transaction syntax updates |
| Container + testing | 2 | Dependency wiring + quick tests |
| Local E2E testing | 1-2 | With local PostgreSQL |
| Heroku setup | 1-2 | Account + addon + env vars |
| **TOTAL** | **13-16 hours** | ~2 days of focused work |

---

## Success Criteria

✅ All tests pass (`npm test:coverage ≥ 70%`)  
✅ API starts with `npm start` (local PostgreSQL)  
✅ All endpoints return correct responses  
✅ Database migrations execute without errors  
✅ Heroku deployment successful  
✅ Mobile app connects to Heroku API and reads data  
✅ No SQL Server dependencies remain in code  

---

## Next Steps

**READY:** Schema conversion (init-postgres.sql) ✅  
**NEXT:** Update repositories + services (see Phase 5-6 above)  
**THEN:** Test locally, deploy to Heroku

Choose your approach:
- **Quick & iterative:** Update one repository at a time, test after each
- **Batch:** Update all repositories, then comprehensive testing
- **Recommended:** Start with bookRepository + createBookService as proof-of-concept

---

## References

- [PostgreSQL DISTINCT syntax](https://www.postgresql.org/docs/current/sql-select.html)
- [PostgreSQL Node.js client (pg)](https://node-postgres.com/)
- [Heroku PostgreSQL docs](https://devcenter.heroku.com/articles/heroku-postgresql)
- [SQL Server to PostgreSQL conversion](https://wiki.postgresql.org/wiki/Things_to_find_in_the_PostgreSQL_documentation)
