# AccountaBills API Documentation

## Overview

This document describes the API endpoints used by the AccountaBills frontend, with a focus on optimizing initial app load performance.

---

## Boot Endpoint (Optimized)

### `GET /api/users/boot`

**Purpose:** Single endpoint to fetch all data needed for app initialization. Replaces multiple sequential calls with one batched request.

**Consolidates these endpoints:**
- `GET /api/users/balance` - Wallet balance from Marqeta
- `GET /api/users/transactions` - Transaction history from Marqeta  
- `GET /api/users/card` - Virtual card details from Marqeta
- `GET /api/marqeta/payment-requests?filter=mine` - User's submitted requests
- `GET /api/marqeta/payment-requests?filter=to-approve` - Requests awaiting user's approval

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 150.00,
    "transactions": [...],
    "card": { "hasCard": true, "card": {...} },
    "myRequests": [...],
    "requestsToApprove": [...]
  }
}
```

**Performance:** Reduces 5 sequential HTTP requests to 1, with parallel database queries on the backend.

---

## Authentication Endpoints

### `POST /api/users/initialize`
Initialize/sync user with Marqeta after Supabase auth.

### `GET /api/users/me`
Get current user profile and Marqeta token status.

---

## Wallet Endpoints

### `GET /api/users/balance`
Get user's GPA (General Purpose Account) balance from Marqeta.

### `POST /api/users/wallet/add`
Add funds to user's wallet.

**Body:** `{ "amount": number, "memo": string }`

### `GET /api/users/transactions`
Get user's transaction history from Marqeta.

### `GET /api/users/card`
Get user's virtual card details.

### `POST /api/users/card`
Create a new virtual card for the user.

### `GET /api/users/funding-status`
Get Marqeta funding configuration (sandbox vs production).

---

## Payment Request Endpoints

### `POST /api/marqeta/payment-requests`
Create a new payment request.

**Body:**
```json
{
  "amount": 50.00,
  "description": "Lunch with client",
  "category": "Food",
  "imageUrl": "https://...",
  "approvers": [{ "userId": "...", "name": "...", "email": "..." }]
}
```

### `GET /api/marqeta/payment-requests`
Get payment requests with filtering.

**Query params:**
- `filter=mine` - Requests submitted by current user
- `filter=to-approve` - Requests where user is an approver
- No filter - All requests (admin only)

### `GET /api/marqeta/payment-requests/:id`
Get a single payment request by ID.

### `POST /api/marqeta/payment-requests/:id/approve`
Approve a payment request.

**Body:** `{ "notes": "optional notes" }`

### `POST /api/marqeta/payment-requests/:id/reject`
Reject a payment request.

**Body:** `{ "notes": "optional notes" }`

---

## Direct Supabase Calls (Frontend)

These endpoints are called directly from the frontend to Supabase:

| Endpoint | Table | Description |
|----------|-------|-------------|
| Friends | `friends` | Accountability partners |
| Groups | `groups`, `group_members` | Group management |
| Notifications | `notifications` | User notifications |
| Conversations | `conversations`, `messages` | Direct messaging |
| Group Messages | `group_messages` | Group chat |

**Optimization Note:** These are fetched in parallel after the boot endpoint returns.

---

## Performance Optimizations

### Before (Sequential)
```
1. getWalletBalance()     → 200ms
2. getTransactions()      → 300ms
3. getCard()              → 150ms
4. getMyRequests()        → 500ms  (fetches ALL, filters in JS)
5. getRequestsToApprove() → 500ms  (fetches ALL, filters in JS)
6. getFriends()           → 100ms
7. getGroups()            → 200ms
8. getNotifications()     → 100ms
9. getConversations()     → 300ms
─────────────────────────────────
Total: ~2350ms sequential
```

### After (Batched + Parallel)
```
/api/users/boot (parallel internally):
  - balance, transactions, card, myRequests, requestsToApprove
  → 500ms total

Parallel Supabase calls:
  - friends, groups, notifications, conversations
  → 300ms total (slowest wins)
─────────────────────────────────
Total: ~800ms (66% faster)
```

---

## Security: SQL Injection Prevention

All database queries use parameterized methods to prevent SQL injection attacks.

### Backend (storageService.js)
- All Supabase queries use `.eq()`, `.insert()`, `.update()` with parameterized values
- `getUserPaymentRequests()` validates UUID format before querying
- No string interpolation in query filters

### Frontend (api.ts)
- `isValidUUID()` helper validates all user IDs before use in queries
- `searchUsers()` sanitizes input:
  - Removes special characters: `(),.'"\``
  - Escapes SQL wildcards: `%_\`
  - Limits input to 100 characters
  - Uses separate `.ilike()` queries instead of `.or()` interpolation
- `getConversations()` and `getOrCreateConversation()` use separate `.eq()` queries

### Safe Patterns Used
```typescript
// SAFE - Parameterized
.eq('user_id', userId)
.insert({ column: value })
.ilike('name', searchPattern)

// UNSAFE - Avoided
.or(`column.eq.${userInput}`)  // String interpolation - DO NOT USE
```

---

## Database Indexes Recommended

```sql
-- Payment requests optimization
CREATE INDEX IF NOT EXISTS idx_payment_requests_sender_id 
  ON payment_requests(sender_id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_status 
  ON payment_requests(status);

CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at 
  ON payment_requests(created_at DESC);

-- For JSONB approvers array searches (if needed)
CREATE INDEX IF NOT EXISTS idx_payment_requests_approvers 
  ON payment_requests USING GIN (approvers);
```
