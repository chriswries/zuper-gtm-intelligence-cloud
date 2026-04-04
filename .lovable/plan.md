

## P2: Data Model — Revised Plan

### Changes from previous schema

1. **`activity_log.bot_id`**: `UUID` → nullable, FK changed from `ON DELETE CASCADE` to `ON DELETE SET NULL`
2. **`jobs.bot_id`**: `UUID` → nullable, FK changed from `ON DELETE CASCADE` to `ON DELETE SET NULL`
3. **`activity_log.bot_name`**: New column `VARCHAR(200)` nullable — denormalized bot name snapshot for post-deletion display

### Implementation

Single migration file creating all 8 tables, enums, indexes, triggers, and enabling RLS. Then a separate insert for the 2 seed bots.

The SQL is identical to the previously approved schema except for these three lines in `activity_log` and `jobs`:

```sql
-- activity_log (changed lines only)
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  bot_name VARCHAR(200),

-- jobs (changed line only)
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
```

Everything else (enums, other tables, indexes, triggers, RLS enable, seed data) remains exactly as previously approved.

