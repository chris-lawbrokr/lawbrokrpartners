---
name: Use db:seed for all DB changes
description: User manages the database exclusively via npm run db:seed — never suggest running raw SQL manually
type: feedback
---

Always add new tables and schema changes to scripts/seed.ts. The user runs `npm run db:seed` to apply everything — don't suggest running SQL directly against the database.

**Why:** User's workflow is to use the seed script as the single source of truth for the database schema.

**How to apply:** When adding new tables or columns, update scripts/seed.ts with the CREATE TABLE (and DROP TABLE at the top). Never tell the user to run SQL manually.
