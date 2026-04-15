# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Hosts the GradoEats Manager — a delivery dispatch dashboard for managing food delivery operations.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (artifacts/delivery-manager)

## Artifacts

- **delivery-manager** (`/`) — GradoEats Manager dashboard (React + Vite)
- **api-server** (`/api`) — Backend Express API

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Features

- Dashboard with live KPIs (revenue, orders, active drivers, pending alerts)
- Order management: list, filter, assign driver, update status
- Driver management: 4 drivers, status tracking, rating, revenue, deliveries
- Analytics: revenue chart (7 days), per-driver stats, order breakdown
- Surveillance page: Leaflet map (Morocco), live GPS markers, activity feed, alerts panel
- Driver activity monitoring with per-driver timeline and today's stats
- Reset requests: password/PIN reset codes, notification bell with pending badge
- **Refusal tracking**: count order refusals per driver, warn/block accounts automatically
- **5-star review system**: add positive/negative/neutral reviews with comments, auto-updates average rating
- Real-time polling every 5 seconds; UI: dark/futuristic, orange/amber palette, French, MAD

## DB Schema

- `drivers` — name, phone, email, vehicleType, status, rating, totalDeliveries, totalRevenue, totalRefusals, isBlocked, warnedAt, lat, lng
- `orders` — orderNumber, customerName, customerPhone, deliveryAddress, items, totalAmount, status, driverId, sourceUrl, notes
- `driver_activities` — driverId, orderId, action, details, createdAt
- `reset_requests` — driverId, type, status, resetCode, resetLink, requestedAt, sentAt
- `reviews` — driverId, orderId, rating (1-5), comment, sentiment, createdAt

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
