---
name: Status mapping
description: Order status values in Bridge Manager vs original restaurateurs codebase
---

# Order Status Mapping

## Bridge Manager (current system)
`pending` → `assigned` → `in_delivery` → `delivered` (or `cancelled`)

## Original restaurateurs codebase (agent-repos)
`pending` → `accepted` → `ready` → (driver picks up) → `delivered`

## Alignment done
- dashboard.tsx: `accepted` filter → `assigned`, `ready` filter → `in_delivery`
- `useMarkOrderReady` local hook: maps "ready" action to `PATCH /orders/:id` with `status: "in_delivery"`
- `newOrders` filter: `pending || assigned` (was `pending || accepted`)

**Why:** The Manager's DB schema only has: pending, assigned, in_delivery, delivered, cancelled. The restaurateurs codebase statuses don't exist in the DB and would silently filter empty results.
