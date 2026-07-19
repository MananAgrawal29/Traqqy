---
name: Non-TTY Drizzle column rename
description: How to rename a Drizzle column when drizzle-kit push cannot prompt in a non-interactive shell.
---

- `drizzle-kit push` (even with `--force`) may prompt for column-conflict resolution and fail with "Interactive prompts require a TTY terminal" when run in a non-interactive shell.
- For a straightforward rename (e.g., `logo_url` → `icon`), create a small Node script that connects with the `pg` driver and runs `ALTER TABLE ... RENAME COLUMN ... TO ...` directly.
- Run the script from the `@workspace/db` package directory so `pg` resolves from its own dependencies.

**Why:** The DB column rename blocked the normal `pnpm --filter @workspace/db run push` workflow; a direct SQL script avoids the interactive prompt and completes the migration.

**How to apply:** For future column renames in non-TTY environments, prefer a short SQL migration script over `drizzle-kit push` when the operation is unambiguous.
