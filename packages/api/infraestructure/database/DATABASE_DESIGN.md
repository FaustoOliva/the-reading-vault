# 🗄️ Database Design - The Reading Vault

## Entity Relationship Diagram (ERD) Concepts

- **Authors** (1) ---- (N) **Books**
- **Countries** (1) ---- (N) **Authors**
- **BookTypes** (1) ---- (0..N) **Books**
- **Books** (1) ---- (N) **ReadingSessions**
- **Books** (1) ---- (N) **BookStatusHistory**
- **Books** (N) ---- (N) **Genres** via **BookGenres**
- **ReaderProfiles** (singleton) — aggregates data from Books/Authors/Countries

## Table Definitions

### 1. Authors

| Column           | Type          | Constraints                      |
| :--------------- | :------------ | :------------------------------- |
| `id`             | INT           | Primary Key, Identity(1,1)       |
| `name`           | NVARCHAR(255) | NOT NULL, UNIQUE                 |
| `nationality_id` | INT           | Foreign Key (Countries.id), NULL |

### 2. Countries

| Column     | Type         | Constraints                                  |
| :--------- | :----------- | :------------------------------------------- |
| `id`       | INT          | Primary Key, Identity(1,1)                   |
| `name`     | NVARCHAR(40) | NOT NULL, UNIQUE                             |
| `iso_code` | NVARCHAR(2)  | NOT NULL, UNIQUE (ISO 3166-1 alpha-2 format) |

### 3. BookTypes

| Column       | Type          | Constraints                 |
| :----------- | :------------ | :-------------------------- |
| `id`         | INT           | Primary Key, Identity(1,1)  |
| `name`       | NVARCHAR(100) | NOT NULL, UNIQUE            |
| `created_at` | DATETIME2     | NOT NULL, DEFAULT GETDATE() |

**Predefined Values:** Novel, Memoir, Anthology, Short-Story Collection, Poetry, Non-Fiction, Biography, Essay Collection, Self-Help, History

### 4. Books

| Column                  | Type           | Constraints                                                      |
| :---------------------- | :------------- | :--------------------------------------------------------------- |
| `id`                    | INT            | Primary Key, Identity(1,1)                                       |
| `author_id`             | INT            | Foreign Key (Authors.id)                                         |
| `title`                 | NVARCHAR(255)  | NOT NULL                                                         |
| `isbn`                  | NVARCHAR(20)   | NULL                                                             |
| `book_type_id`          | INT            | Foreign Key (BookTypes.id), NULL, ON DELETE SET NULL             |
| `total_pages`           | INT            | NULL                                                             |
| `synopsis`              | NVARCHAR(4000) | NULL                                                             |
| `publication_year`      | INT            | NULL, CHECK (`publication_year` between 1000 and 9999)           |
| `current_reading_cycle` | INT            | NOT NULL, DEFAULT 1                                              |
| `status_id`             | INT            | Foreign Key (BookStatuses.id) — replaces textual `status` column |
| `score`                 | DECIMAL(3,1)   | NULL (0.0 to 10.0)                                               |
| `comment`               | NVARCHAR(MAX)  | NULL                                                             |

### 5. Genres

| Column | Type          | Constraints                |
| :----- | :------------ | :------------------------- |
| `id`   | INT           | Primary Key, Identity(1,1) |
| `name` | NVARCHAR(100) | NOT NULL, UNIQUE           |

### 6. BookGenres

| Column     | Type | Constraints                                |
| :--------- | :--- | :----------------------------------------- |
| `book_id`  | INT  | Foreign Key (Books.id), ON DELETE CASCADE  |
| `genre_id` | INT  | Foreign Key (Genres.id), ON DELETE CASCADE |

Primary key: (`book_id`, `genre_id`)

### 7. ReadingSessions (KPI Engine)

| Column          | Type     | Constraints                 |
| :-------------- | :------- | :-------------------------- |
| `id`            | INT      | Primary Key, Identity(1,1)  |
| `book_id`       | INT      | Foreign Key (Books.id)      |
| `created_at`    | DATETIME | NOT NULL, DEFAULT GETDATE() |
| `occurred_at`   | DATETIME | NOT NULL, DEFAULT GETDATE() |
| `reading_cycle` | INT      | NOT NULL, DEFAULT 1         |
| `pages_read`    | INT      | NOT NULL                    |
| `duration`      | INT      | NULL                        |

### 8. BookStatusHistory

| Column          | Type     | Constraints                                       |
| :-------------- | :------- | :------------------------------------------------ |
| `id`            | INT      | Primary Key, Identity(1,1)                        |
| `book_id`       | INT      | Foreign Key (Books.id)                            |
| `old_status_id` | INT      | Foreign Key (BookStatuses.id), NULL for new books |
| `new_status_id` | INT      | Foreign Key (BookStatuses.id), NOT NULL           |
| `reading_cycle` | INT      | NOT NULL, DEFAULT 1                               |
| `created_at`    | DATETIME | NOT NULL, DEFAULT GETDATE()                       |

### 9. BookStatuses (reference table)

| Column          | Type          | Constraints                                    |
| :-------------- | :------------ | :--------------------------------------------- |
| `id`            | INT           | Primary Key, Identity(1,1)                     |
| `internal_code` | NVARCHAR(50)  | NOT NULL, UNIQUE (e.g. 'WISH_LIST', 'READING') |
| `display_name`  | NVARCHAR(100) | NOT NULL                                       |
| `ui_color`      | NVARCHAR(7)   | NULL — HEX color for UI                        |

### 10. ReaderProfiles (AI Context - Phase 4 MVP)

| Column                    | Type          | Constraints                                                          |
| :------------------------ | :------------ | :------------------------------------------------------------------- |
| `id`                      | INT           | Primary Key, DEFAULT 1 (singleton)                                   |
| `version`                 | INT           | NOT NULL, DEFAULT 1 (increments on each refresh)                     |
| `schema_version`          | INT           | NOT NULL, DEFAULT 1 (1=MVP, 2=Complete for Phase 2)                  |
| `profile_data`            | NVARCHAR(MAX) | NOT NULL (JSON with statistics, top authors, countries, favorites)   |
| `semantic_summary`        | NVARCHAR(MAX) | NULL (OpenAI-generated narrative, null if API unavailable)           |
| `last_updated`            | DATETIME2     | NOT NULL, DEFAULT GETDATE()                                          |
| `last_refresh_reason`     | NVARCHAR(100) | NULL ('initial_profile', 'recommendations_sync', manual reasons)     |
| `tokens_used`             | INT           | NULL (tracks OpenAI API token consumption per refresh)               |
| `important_event_pending` | BIT           | NOT NULL, DEFAULT 0 (set to 1 on complete/abandon, reset on refresh) |

**Notes:**

- Singleton table (only one profile, enforced by `CHK_ReaderProfiles_Singleton`)
- `schema_version` enables evolutionary upgrade from MVP (1) to Complete (2) without breaking changes
- `profile_data` stores structured JSON for programmatic access
- `semantic_summary` provides LLM-generated narrative description
- Graceful degradation: `semantic_summary` can be `NULL` if OpenAI is unavailable or rate-limited

### Indexes

- `IX_ReadingSessions_BookDate` on `ReadingSessions(book_id, occurred_at)` INCLUDE `(pages_read, reading_cycle)` — optimizes KPI/time-series queries
- `IX_StatusHistory_BookDate` on `BookStatusHistory(book_id, created_at)` — optimizes status history queries
- `IX_ReaderProfiles_Version` on `ReaderProfiles(version DESC)` — optimizes version tracking for audit trail
- `IX_Books_Title` on `Books(title)` — optimizes title search with LIKE queries
- `IX_Books_Score` on `Books(score)` WHERE `score IS NOT NULL` — optimizes rating/score filtering
- `IX_Books_TotalPages` on `Books(total_pages)` WHERE `total_pages IS NOT NULL` — optimizes page count filtering
- `IX_Books_PublicationYear` on `Books(publication_year)` WHERE `publication_year IS NOT NULL` — optimizes publication year filtering
- `IX_BookGenres_GenreId` on `BookGenres(genre_id)` — optimizes genre-based lookups

### Initial Status Rows

- `('WISH_LIST', 'Wish List', '#FFA500')`
- `('READING', 'Reading', '#007BFF')`
- `('PENDING_SCORE', 'Review Pending', '#F59E0B')`
- `('COMPLETED', 'Completed', '#28A745')`
- `('ABANDONED', 'Abandoned', '#DC3545')`
