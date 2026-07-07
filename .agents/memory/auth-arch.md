---
name: Auth architecture
description: How JWT authentication works across the Bridge Manager apps
---

# Auth Architecture

## Restaurant dashboard JWT flow
- Login: `POST /api/auth/login` with phone number → returns JWT signed with SESSION_SECRET
- Token stored in localStorage as `bridge_jwt`
- `setAuthTokenGetter(() => localStorage.getItem("bridge_jwt"))` called in main.tsx — injects Bearer header into every API call from generated client
- `getAuthToken()` exported from AuthContext for manual fetch calls

## Protected routes (requireRestaurantAuth middleware)
- `POST /orders/:id/accept`
- `POST /orders/:id/reject`
- `POST /trips/:id/cancel`
- `GET /orders/events` — NOTE: EventSource API does NOT support Authorization headers; this was removed. SSE stays unauthenticated (read-only risk accepted for MVP).

## Unprotected but admin-level routes
- `PATCH /orders/:id` — used by delivery-manager (admin tool); not restaurant-facing; acceptable gap
- `GET /orders`, `GET /orders/stats`, `GET /orders/recent` — read-only; acceptable

## SESSION_SECRET
- Required at startup; routes/auth.ts throws if missing (no fallback)
- Set in Replit secrets

**Why:** Restaurants authenticate by phone-only (no passwords in DB for MVP). Admin controls who is registered. Phone-only is acceptable for internal tool with admin-controlled onboarding.
