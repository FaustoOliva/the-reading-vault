# 🗄️ Database Design - The Reading Vault

## Entity Relationship Diagram (ERD) Concepts

- **Authors** (1) ---- (N) **Books**
- **Countries** (1) ---- (N) **Authors**
- **Books** (1) ---- (N) **ReadingSessions**
- **Books** (1) ---- (N) **BookStatusHistory**

## Table Definitions

### 1. Authors

| Column           | Type          | Constraints                      |
| :--------------- | :------------ | :------------------------------- |
| `id`             | INT           | Primary Key, Identity(1,1)       |
| `name`           | NVARCHAR(255) | NOT NULL, UNIQUE                 |
| `nationality_id` | INT           | Foreign Key (Countries.id), NULL |

### 2. Countries

| Column | Type         | Constraints                |
| :----- | :----------- | :------------------------- |
| `id`   | INT          | Primary Key, Identity(1,1) |
| `name` | NVARCHAR(40) | NOT NULL, UNIQUE           |

### 2. Books

| Column                  | Type          | Constraints                                                      |
| :---------------------- | :------------ | :--------------------------------------------------------------- |
| `id`                    | INT           | Primary Key, Identity(1,1)                                       |
| `author_id`             | INT           | Foreign Key (Authors.id)                                         |
| `title`                 | NVARCHAR(255) | NOT NULL                                                         |
| `isbn`                  | NVARCHAR(20)  | NULL                                                             |
| `total_pages`           | INT           | NULL                                                             |
| `current_reading_cycle` | INT           | NOT NULL, DEFAULT 1                                              |
| `status_id`             | INT           | Foreign Key (BookStatuses.id) — replaces textual `status` column |
| `score`                 | DECIMAL(3,1)  | NULL (0.0 to 10.0)                                               |
| `comment`               | NVARCHAR(MAX) | NULL                                                             |

### 3. ReadingSessions (KPI Engine)

| Column          | Type     | Constraints                 |
| :-------------- | :------- | :-------------------------- |
| `id`            | INT      | Primary Key, Identity(1,1)  |
| `book_id`       | INT      | Foreign Key (Books.id)      |
| `created_at`    | DATETIME | NOT NULL, DEFAULT GETDATE() |
| `occurred_at`   | DATETIME | NOT NULL, DEFAULT GETDATE() |
| `reading_cycle` | INT      | NOT NULL, DEFAULT 1         |
| `pages_read`    | INT      | NOT NULL                    |
| `duration`      | INT      | NULL                        |

### 4. BookStatusHistory

| Column          | Type     | Constraints                                       |
| :-------------- | :------- | :------------------------------------------------ |
| `id`            | INT      | Primary Key, Identity(1,1)                        |
| `book_id`       | INT      | Foreign Key (Books.id)                            |
| `old_status_id` | INT      | Foreign Key (BookStatuses.id), NULL for new books |
| `new_status_id` | INT      | Foreign Key (BookStatuses.id), NOT NULL           |
| `reading_cycle` | INT      | NOT NULL, DEFAULT 1                               |
| `created_at`    | DATETIME | NOT NULL, DEFAULT GETDATE()                       |

### 5. BookStatuses (reference table)

| Column          | Type          | Constraints                                    |
| :-------------- | :------------ | :--------------------------------------------- |
| `id`            | INT           | Primary Key, Identity(1,1)                     |
| `internal_code` | NVARCHAR(50)  | NOT NULL, UNIQUE (e.g. 'WISH_LIST', 'READING') |
| `display_name`  | NVARCHAR(100) | NOT NULL                                       |
| `ui_color`      | NVARCHAR(7)   | NULL — HEX color for UI                        |

### Indexes

- `IX_ReadingSessions_BookDate` on `ReadingSessions(book_id, occurred_at)` INCLUDE `(pages_read, reading_cycle)` — optimizes KPI/time-series queries
- `IX_StatusHistory_BookDate` on `BookStatusHistory(book_id, created_at)` — optimizes status history queries
- `IX_Books_Title` on `Books(title)` — optimizes title search with LIKE queries
- `IX_Books_Score` on `Books(score)` WHERE `score IS NOT NULL` — optimizes rating/score filtering
- `IX_Books_TotalPages` on `Books(total_pages)` WHERE `total_pages IS NOT NULL` — optimizes page count filtering

### Initial Status Rows

- `('WISH_LIST', 'Wish List', '#FFA500')`
- `('READING', 'Reading', '#007BFF')`
- `('PENDING_SCORE', 'Review Pending', '#F59E0B')`
- `('COMPLETED', 'Completed', '#28A745')`
- `('ABANDONED', 'Abandoned', '#DC3545')`
