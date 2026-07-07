---
name: SSE event names
description: Which SSE event names are emitted and listened to by which client
---

# SSE Event Names

## Server emits (event-bus.ts SSEEventType)
- `order:created` — new order via POST or webhook (delivery-manager listens)
- `order:updated` — status/driver changed (delivery-manager listens)
- `new_order` — new order via webhook (restaurant-dashboard SSE hook listens)
- `driver:updated` — driver status changed

## Restaurant dashboard listens for (`useOrdersSSE` hook)
- `new_order` — triggers cache invalidation

## Contract rule
When a webhook creates an order, emit BOTH `order:created` AND `new_order` so both the delivery-manager and restaurant-dashboard receive real-time updates.

**Why:** The original restaurateurs codebase used `new_order`; the Manager uses `order:created`. Both must be emitted to serve both clients.
