---
name: Imported monorepo setup
description: Setup constraint for imported pnpm workspaces in this project
---

Imported workspace apps do not include installed dependencies by default, so workflow startup and package scripts can fail with missing binaries even when the lockfile is valid.

**Why:** The initial API and manager workflows failed before application code ran because `node_modules` was absent; a frozen-lockfile install restored both services without changing the project structure.

**How to apply:** For a fresh import, run the repository's frozen pnpm install before diagnosing workflow or TypeScript failures. Separate missing generated library declarations from application regressions.