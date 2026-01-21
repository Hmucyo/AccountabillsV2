# ACCOUNTABILLS Backend Setup

## Overview
Your ACCOUNTABILLS app now has a complete Supabase backend with authentication, data persistence, and secure API endpoints.

## Architecture

### 1. **Backend Server** (`/supabase/functions/server/index.tsx`)
A Hono-based API server with the following endpoints:

#### Authentication
- `POST /auth/signup` - Create new user account
- Supabase handles sign-in, sign-out, and session management

#### User Profile
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile settings

#### Wallet Management
- `GET /wallet/balance` - Get current wallet balance
- `POST /wallet/add` - Add money to wallet
- `POST /wallet/withdraw` - Withdraw money (instant or standard)
- `GET /wallet/transactions` - Get transaction history

#### Money Requests
- `POST /requests` - Create new money request
- `GET /requests/mine` - Get user's submitted requests
- `GET /requests/to-approve` - Get requests awaiting approval
- `PUT /requests/:id/status` - Approve or reject a request

#### Accountability Partners
- `GET /partners` - Get accountability partners list
- `POST /partners` - Add new partner
- `DELETE /partners/:id` - Remove partner

#### Messages
- `GET /messages/conversations` - Get all conversations
- `GET /messages/:conversationId` - Get messages in conversation
- `POST /messages` - Send new message
- `PUT /messages/:conversationId/read` - Mark messages as read

#### Notifications
- `GET /notifications` - Get all notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `PUT /notifications/read-all` - Mark all notifications as read

#### Activity Feed
- `GET /feed` - Get activity feed items

### 2. **Frontend API Client** (`/utils/api.ts`)
Provides clean functions to interact with the backend:
- Handles authentication tokens automatically
- Manages Supabase auth client
- Exports easy-to-use functions for all endpoints

### 3. **Data Storage**
Uses Supabase's key-value store for flexible data management:
- User profiles: `user:{userId}:profile`
- Requests: `request:{requestId}`
- Partners: `user:{userId}:partner:{partnerId}`
- Messages: `conversation:{conversationId}:message:{messageId}`
- Notifications: `user:{userId}:notification:{notificationId}`
- Transactions: `user:{userId}:transaction:{transactionId}`

### 4. **Authentication Flow**
1. User signs up via `/auth/signup`
2. Backend creates user with Supabase Auth
3. Initializes user profile in KV store
4. Auto-signs in after signup
5. Access token stored and used for authenticated requests

## How to Use

### Sign Up New User
```typescript
import { signUp, signIn } from './utils/api';

// Create account
await signUp('email@example.com', 'password123', 'John Doe');

// Sign in (happens automatically after signup)
await signIn('email@example.com', 'password123');
```

### Make Authenticated Requests
All API functions automatically include the auth token:

```typescript
import { addMoney, getWalletBalance, createRequest } from './utils/api';

// Add money to wallet
await addMoney(100.00);

// Get balance
const { balance } = await getWalletBalance();

// Create money request
await createRequest({
  amount: 50.00,
  description: 'Coffee supplies',
  category: 'Office',
  approverIds: ['partner-id-123']
});
```

### Session Management
The app automatically checks for existing sessions on load:
```typescript
// In App.tsx
useEffect(() => {
  const checkSession = async () => {
    const session = await getSession();
    if (session) {
      setIsLoggedIn(true);
    }
  };
  checkSession();
}, []);
```

## Security Features

1. **Protected Routes** - All sensitive endpoints require authentication
2. **Service Role Key** - Only used server-side, never exposed to frontend
3. **Access Tokens** - JWT tokens for user authentication
4. **Email Confirmation** - Auto-confirmed for demo (configure email server for production)

## Next Steps for Production

1. **Set up email server** in Supabase for password resets
2. **Configure social login** (Google, Facebook, etc.) if needed
3. **Add rate limiting** for API endpoints
4. **Implement real-time subscriptions** for live updates
5. **Add input validation** and sanitization
6. **Set up proper error logging** and monitoring
7. **Implement file upload** for request images/videos
8. **Add transaction webhooks** for real payment processing

## Current Limitations

⚠️ **Important**: This is a prototype backend suitable for development and testing. For production:
- Don't store real financial data
- Add proper PII protection
- Implement compliance measures (PCI-DSS, etc.)
- Use real payment processors
- Add comprehensive security audits

## Testing

Try creating an account:
1. Click "Get Started" on landing page
2. Fill in name, email, phone, password
3. Submit - you'll be automatically signed in
4. All your data persists in Supabase

The backend is fully functional and ready for testing!
