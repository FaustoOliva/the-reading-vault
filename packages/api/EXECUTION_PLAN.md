## Database Migration - Execution Plan

**Status:** Ready to Execute  
**Created:** March 3, 2026  
**Effort:** ~2-3 days

---

## What Was Created

I've created the foundation for PostgreSQL migration:

### ✅ Files Created
1. **`packages/api/infraestructure/database/init-postgres.sql`**
   - Complete PostgreSQL schema (converted from SQL Server)
   - Ready to execute in Heroku PostgreSQL database
   - Includes all tables, indexes, and initial data

2. **`packages/api/infraestructure/config/postgresqlClient.js`**
   - PostgreSQL connection client (equivalent to MSSQLClient)
   - Handles connection pooling and transactions
   - Ready to integrate

3. **`packages/api/DATABASE_MIGRATION.md`**
   - Complete migration guide
   - Lists all code changes needed
   - Includes rollback plan and risk mitigation

---

## Recommended Execution Order

### Quick Path (for this session)
If you want to **start immediately**:

**1. Install PostgreSQL locally (for testing)**
```bash
# Option A: Using Docker (easiest)
docker run --name reading-vault-db \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=reading_vault \
  -p 5432:5432 \
  postgres:16

# Option B: Install PostgreSQL desktop
# macOS: brew install postgresql
# Windows: https://www.postgresql.org/download/windows/
# Linux: apt-get install postgresql
```

**2. Create local `.env` file in `packages/api/`**
```
DB_USER=testuser
DB_PASSWORD=testpass
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reading_vault
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
```

**3. Initialize database schema**
```bash
# Using psql (if you have PostgreSQL installed locally)
psql -U testuser -h localhost -d reading_vault -f packages/api/infraestructure/database/init-postgres.sql
```

**4. Update dependencies**
```bash
cd packages/api
npm uninstall mssql
npm install pg
```

**5. Begin code migration** (See DATABASE_MIGRATION.md, Phase 5-6)

---

### Staged Path (recommended for safety)

**Phase 1: Prep (Today)**
- [ ] Read DATABASE_MIGRATION.md completely
- [ ] Set up local PostgreSQL (Docker easiest)
- [ ] Create `.env` file
- [ ] Update package.json (`npm install/uninstall`)

**Phase 2: Code Changes (Next 2-3 days)**
- [ ] Update repositories (one at a time)
- [ ] Update services (especially transaction handling)
- [ ] Update container.js
- [ ] Test each change locally

**Phase 3: Final Testing (Last day)**
- [ ] Run full test suite
- [ ] Test all endpoints manually
- [ ] Verify pre-commit checks

**Phase 4: Heroku Deployment (Final step)**
- [ ] Set up Heroku account + app
- [ ] Provision PostgreSQL add-on
- [ ] Set environment variables
- [ ] Deploy and verify

---

## Critical Files to Update (In Order)

### Phase 5: Repository Layer (~6-8 hours)

These files currently import and use MSSQL:

```
1. packages/api/infraestructure/repositories/bookRepository.js
2. packages/api/infraestructure/repositories/authorRepository.js
3. packages/api/infraestructure/repositories/countryRepository.js
4. packages/api/infraestructure/repositories/readingSessionRepository.js
5. packages/api/infraestructure/repositories/bookStatusHistoryRepository.js
6. packages/api/infraestructure/repositories/aiContextRepository.js
7. packages/api/infraestructure/database/DatabaseRepository.js
```

**Example of what needs to change:**

```javascript
// ❌ SQL Server (BEFORE)
import sql from "mssql";

async executeQuery(query, inputs) {
  const request = this.mssqlClient.request();
  
  Object.entries(inputs).forEach(([key, value]) => {
    request.input(key, value);
  });
  
  const result = await request.query(query);
  return result.recordset;
}

// ✅ PostgreSQL (AFTER)
async executeQuery(query, params) {
  const pool = this.pgClient.getPool();
  const result = await pool.query(query, params);
  return result.rows; // PostgreSQL returns .rows instead of .recordset
}
```

### Phase 6: Service Layer (~2-3 hours)

These files use transactions (need updating):

```
1. packages/api/services/logReadingSessionService.js
2. packages/api/services/createBookService.js
3. packages/api/services/updateBookService.js
4. packages/api/services/reviewBookService.js
5. packages/api/services/reopenBookService.js
6. packages/api/services/requestReviewService.js
```

**Example of transaction refactoring:**

```javascript
// ❌ SQL Server (BEFORE)
const pool = await this.mssqlClient.getConnection();
const transaction = new sql.Transaction(pool);
await transaction.begin();
try {
  const request = transaction.request();
  request.input('id', sql.Int, id);
  await request.query("UPDATE Books SET status_id = @status_id ...");
  await transaction.commit();
}

// ✅ PostgreSQL (AFTER)
const client = await this.pgClient.beginTransaction();
try {
  await client.query("UPDATE books SET status_id = $1 WHERE id = $2", [statusId, id]);
  await client.query("COMMIT");
} finally {
  client.release();
}
```

### Phase 7: Container (~30 minutes)

**File:** `packages/api/config/container.js`

Replace all occurrences:
```javascript
// ❌ OLD
import { MSSQLClient } from "../infraestructure/config/database.js";
const mssqlClient = new MSSQLClient(config.database);

// ✅ NEW
import { PostgreSQLClient } from "../infraestructure/config/postgresqlClient.js";
const pgClient = new PostgreSQLClient(config.database);
```

---

## Testing Strategy

### 1. Unit Tests
```bash
npm test:coverage
# Should show ~70-80% coverage maintained
```

### 2. Manual E2E Testing
```bash
npm start
# Test endpoints manually (Postman/curl)

# Examples:
curl http://localhost:3000/health
curl http://localhost:3000/books
curl -X POST http://localhost:3000/books -H "Content-Type: application/json" -d '...'
```

### 3. Verify Pre-Commit Checklist
```bash
npm run build      # If using TypeScript
npm run lint
npm run format
npm test:coverage
```

---

## Local Testing Setup (Docker)

**Start PostgreSQL:**
```bash
docker run --rm --name reading-vault-db \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=reading_vault \
  -p 5432:5432 \
  postgres:16
```

**In another terminal, initialize schema:**
```bash
# Wait for DB to be ready (30 seconds)
cd packages/api

# Create inline .env
cat > .env << EOF
DB_USER=testuser
DB_PASSWORD=testpass
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reading_vault
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
OPENAI_API_KEY=sk-test-xxx
EOF

# Initialize schema
psql -U testuser -h localhost -d reading_vault -f infraestructure/database/init-postgres.sql

# Start API
npm start
```

**Test connection:**
```bash
curl http://localhost:3000/health
# Should return: { "status": "ok" }
```

---

## Heroku Deployment (Final Phase)

Once code is working locally with PostgreSQL:

**1. Create Heroku App**
```bash
heroku create your-reading-vault-app
heroku addons:create heroku-postgresql:hobby-dev
```

**2. Set Environment Variables**
```bash
heroku config:set \
  ALLOWED_ORIGINS=https://your-mobile-app.com \
  NODE_ENV=production \
  OPENAI_API_KEY=sk-prod-xxx
# DB vars are auto-set by Heroku PostgreSQL addon
```

**3. Deploy Code**
```bash
git add -A
git commit -m "feat(db): migrate to PostgreSQL"
git push heroku main
```

**4. Initialize Database on Heroku**
```bash
heroku run "psql \$DATABASE_URL" < packages/api/infraestructure/database/init-postgres.sql
```

**5. Verify**
```bash
heroku logs --tail
curl https://your-reading-vault-app.herokuapp.com/health
```

---

## Next Steps

**Choose one:**

### Option A: I Guide You Step-by-Step
Tell me: *"Let's start with repositories. Help me update bookRepository.js first."*

Then I'll show exact code changes for each file.

### Option B: I Update All Code at Once
Tell me: *"Update all the code. I'll review and test."*

Then I'll:
1. Update all repositories
2. Update all services  
3. Update container
4. Provide updated package.json
5. Create comprehensive test suite

### Option C: You Review Plan First
Tell me: *"I need to understand this better before starting."*

Then I'll explain:
- SQL Server vs PostgreSQL differences
- Parameter binding (`:param` → `$1`)
- Transaction patterns
- Any specific concerns

---

## Success Checklist

Once migration is complete:

- [ ] All tests pass: `npm test:coverage`
- [ ] Pre-commit checks pass: `npm run build && npm run lint && npm run format`
- [ ] API starts locally: `npm start`
- [ ] All endpoints work: test with curl/Postman
- [ ] Database migrations run cleanly
- [ ] Heroku deployment successful
- [ ] Mobile app connects to production API
- [ ] Data is persisted and readable

---

**Status: READY FOR NEXT STEP**

Choose your path (A, B, or C above) and we'll proceed.
