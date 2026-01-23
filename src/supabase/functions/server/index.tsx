import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Create Supabase client for auth and service operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Create a separate Supabase client for validating user JWTs
const supabaseAuth = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

// Initialize demo user (John Doe) on server startup
const initializeDemoUser = async () => {
  try {
    console.log('🚀 Starting demo user initialization...');
    const demoUsers = [
      {
        email: 'john.doe@email.com',
        password: 'test1',
        name: 'John Doe',
        walletBalance: 1250.50,
        approvalThreshold: 50
      },
      {
        email: 'sarah.johnson@email.com',
        password: 'test2',
        name: 'Sarah Johnson',
        walletBalance: 500.00,
        approvalThreshold: 100
      }
    ];
    
    for (const demoUser of demoUsers) {
      console.log(`🔍 Checking if demo user ${demoUser.name} exists...`);
      
      // Check if user already exists
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error(`⚠️ Error listing users:`, listError.message);
        continue;
      }
      
      const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email);
      
      if (existingUser) {
        console.log(`✅ Demo user ${demoUser.name} already exists with ID:`, existingUser.id);
        
        // Ensure profile exists in KV store
        const existingProfile = await kv.get(`user:${existingUser.id}:profile`);
        if (!existingProfile) {
          console.log(`🔧 Creating missing profile for ${demoUser.name}`);
          await kv.set(`user:${existingUser.id}:profile`, {
            name: demoUser.name,
            email: demoUser.email,
            createdAt: new Date().toISOString(),
            walletBalance: demoUser.walletBalance,
            approvalThreshold: demoUser.approvalThreshold
          });
          console.log(`✅ Profile created for ${demoUser.name}`);
        }
        continue;
      }
      
      // Try to create the user
      console.log(`🔧 Creating new user ${demoUser.name}...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: demoUser.email,
        password: demoUser.password,
        user_metadata: { name: demoUser.name },
        email_confirm: true
      });
      
      if (error) {
        // For any errors, log but don't crash the server
        console.error(`⚠️ Could not create demo user ${demoUser.name} (non-critical):`, error.message);
        continue;
      }
      
      console.log(`✅ Demo user ${demoUser.name} created successfully with ID:`, data.user.id);
      
      // Initialize demo user profile
      try {
        await kv.set(`user:${data.user.id}:profile`, {
          name: demoUser.name,
          email: demoUser.email,
          createdAt: new Date().toISOString(),
          walletBalance: demoUser.walletBalance,
          approvalThreshold: demoUser.approvalThreshold
        });
        console.log(`✅ Demo user ${demoUser.name} profile initialized`);
      } catch (kvError: any) {
        console.error(`⚠️ Could not initialize demo user ${demoUser.name} profile:`, kvError.message);
      }
    }
    
    console.log('✅ Demo user initialization complete!');
  } catch (error: any) {
    console.error('⚠️ Error in demo user initialization (non-critical):', error.message);
  }
};

// Initialize demo user on startup (non-blocking)
initializeDemoUser().catch(err => {
  console.error('⚠️ Demo user initialization failed (non-critical):', err);
});

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Middleware to verify authentication
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  console.log('🔍 Auth header:', authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : 'missing');
  
  const accessToken = authHeader?.split(' ')[1];
  if (!accessToken) {
    console.log('❌ Missing authorization header');
    return c.json({ code: 401, message: 'Missing authorization header' }, 401);
  }

  console.log('🔍 Validating JWT token...');
  // Use service role client to verify the JWT
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) {
    console.log('❌ JWT validation error:', error.message, error);
    return c.json({ code: 401, message: 'Invalid JWT', details: error.message }, 401);
  }
  
  if (!user?.id) {
    console.log('❌ No user found in JWT');
    return c.json({ code: 401, message: 'Invalid JWT' }, 401);
  }

  console.log('✅ User authenticated:', user.email, 'userId:', user.id);
  c.set('userId', user.id);
  c.set('userEmail', user.email);
  await next();
};

// Health check endpoint
app.get("/make-server-1b96e1b7/health", (c) => {
  return c.json({ status: "ok" });
});

// Manual initialization endpoint for demo users
app.post("/make-server-1b96e1b7/init-demo-users", async (c) => {
  console.log('🔧 Manual demo user initialization triggered...');
  await initializeDemoUser();
  return c.json({ status: "Demo users initialized", message: "You can now sign in with john.doe@email.com/test1 or sarah.johnson@email.com/test2" });
});

// ===== AUTH ENDPOINTS =====

// Create user endpoint (admin API with auto-confirmed email)
app.post("/make-server-1b96e1b7/auth/create-user", async (c) => {
  try {
    const { email, password, name, username } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    console.log('🔵 Creating new user:', email, 'username:', username);

    // Check if username is already taken (if provided)
    if (username) {
      const allProfiles = await kv.getByPrefix('user:');
      const usernameTaken = allProfiles.some((profile: any) => 
        profile.username?.toLowerCase() === username.toLowerCase()
      );

      if (usernameTaken) {
        return c.json({ error: 'Username is already taken' }, 400);
      }
    }

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('⚠️ Error listing users:', listError.message);
      return c.json({ error: 'Failed to check existing users' }, 500);
    }
    
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      return c.json({ error: 'User with this email already exists' }, 400);
    }

    // Create user with admin API (auto-confirms email)
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { name: name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('❌ Error creating user:', error.message);
      return c.json({ error: error.message || 'Failed to create user' }, 500);
    }

    console.log('✅ User created successfully:', data.user.id);

    // Create user profile in KV store
    const profile = {
      name: name,
      email: email,
      username: username,
      createdAt: new Date().toISOString(),
      walletBalance: 0,
      approvalThreshold: 50
    };

    await kv.set(`user:${data.user.id}:profile`, profile);
    
    // Create username lookup index for faster searches
    if (username) {
      await kv.set(`username:${username.toLowerCase()}`, data.user.id);
    }
    
    console.log('✅ Profile created for user:', data.user.id, 'with username:', username);

    return c.json({
      message: 'User created successfully',
      userId: data.user.id,
      profile
    });
  } catch (error: any) {
    console.error('❌ Create user error:', error);
    return c.json({ error: error.message || 'Failed to create user' }, 500);
  }
});

// Check if username is available
app.post("/make-server-1b96e1b7/auth/check-username", async (c) => {
  try {
    const { username } = await c.req.json();
    
    if (!username) {
      return c.json({ error: 'Username is required' }, 400);
    }

    console.log('🔍 Checking if username is available:', username);

    // Get all profiles and check if username exists
    const allProfiles = await kv.getByPrefix('user:');
    const usernameTaken = allProfiles.some((profile: any) => 
      profile.username?.toLowerCase() === username.toLowerCase()
    );

    console.log('✅ Username check result:', !usernameTaken);

    return c.json({ available: !usernameTaken });
  } catch (error: any) {
    console.error('❌ Check username error:', error);
    return c.json({ error: error.message || 'Failed to check username' }, 500);
  }
});

// Sign up endpoint - creates user profile when they sign up via frontend
app.post("/make-server-1b96e1b7/auth/signup", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const { email, name, username } = await c.req.json();

    console.log('📝 Creating profile for authenticated user:', userId, email || userEmail, name, username);

    // Check if profile already exists
    const existingProfile = await kv.get(`user:${userId}:profile`);
    if (existingProfile) {
      console.log('✅ Profile already exists');
      return c.json({ 
        message: 'Profile already exists',
        profile: existingProfile
      });
    }

    // Check if username is already taken
    if (username) {
      const allProfiles = await kv.getByPrefix('user:');
      const usernameTaken = allProfiles.some((profile: any) => 
        profile.username?.toLowerCase() === username.toLowerCase()
      );

      if (usernameTaken) {
        return c.json({ error: 'Username is already taken' }, 400);
      }
    }

    // Create user profile in KV store
    const profile = {
      name: name,
      email: email || userEmail,
      username: username,
      createdAt: new Date().toISOString(),
      walletBalance: 0,
      approvalThreshold: 50
    };

    await kv.set(`user:${userId}:profile`, profile);
    
    // Also create a username lookup index for faster searches
    if (username) {
      await kv.set(`username:${username.toLowerCase()}`, userId);
    }
    
    console.log('✅ Profile created for user:', userId, 'with username:', username);

    return c.json({
      message: 'User profile created successfully',
      profile
    });
  } catch (error: any) {
    console.error('❌ Signup error:', error);
    return c.json({ error: error.message || 'Failed to create profile' }, 500);
  }
});

// ===== USER PROFILE ENDPOINTS =====

// Get user profile
app.get("/make-server-1b96e1b7/profile", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    console.log('📋 Fetching profile for user:', userId, userEmail);
    
    let profile = await kv.get(`user:${userId}:profile`);
    
    // If profile doesn't exist, create a default one
    if (!profile) {
      console.log('⚠️ Profile not found, creating default profile...');
      
      // Try to get name from Supabase Auth metadata
      const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
      const userName = user?.user_metadata?.name || userEmail?.split('@')[0] || 'User';
      
      profile = {
        name: userName,
        email: userEmail,
        createdAt: new Date().toISOString(),
        walletBalance: 0,
        approvalThreshold: 50
      };
      
      await kv.set(`user:${userId}:profile`, profile);
      console.log('✅ Default profile created:', userName);
    }

    return c.json({ profile });
  } catch (error: any) {
    console.error('❌ Get profile error:', error);
    return c.json({ error: 'Failed to fetch profile', details: error.message }, 500);
  }
});

// Update user profile
app.put("/make-server-1b96e1b7/profile", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const updates = await c.req.json();
    
    const currentProfile = await kv.get(`user:${userId}:profile`);
    if (!currentProfile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const updatedProfile = { ...currentProfile, ...updates };
    await kv.set(`user:${userId}:profile`, updatedProfile);

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// ===== WALLET ENDPOINTS =====

// Get wallet balance
app.get("/make-server-1b96e1b7/wallet/balance", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const profile = await kv.get(`user:${userId}:profile`);
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ balance: profile.walletBalance || 0 });
  } catch (error) {
    console.log('Get wallet balance error:', error);
    return c.json({ error: 'Failed to fetch wallet balance' }, 500);
  }
});

// Add money to wallet
app.post("/make-server-1b96e1b7/wallet/add", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { amount } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    const profile = await kv.get(`user:${userId}:profile`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const newBalance = (profile.walletBalance || 0) + amount;
    await kv.set(`user:${userId}:profile`, { ...profile, walletBalance: newBalance });

    // Create transaction record
    const transaction = {
      id: Date.now().toString(),
      type: 'deposit',
      amount,
      description: 'Added from bank',
      date: new Date().toISOString(),
      status: 'completed'
    };
    await kv.set(`user:${userId}:transaction:${transaction.id}`, transaction);

    return c.json({ balance: newBalance, transaction });
  } catch (error) {
    console.log('Add money error:', error);
    return c.json({ error: 'Failed to add money' }, 500);
  }
});

// Withdraw from wallet
app.post("/make-server-1b96e1b7/wallet/withdraw", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { amount, instant } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    const profile = await kv.get(`user:${userId}:profile`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const fee = instant ? amount * 0.0195 : 0;
    const totalDeduction = amount + fee;

    if ((profile.walletBalance || 0) < totalDeduction) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }

    const newBalance = profile.walletBalance - totalDeduction;
    await kv.set(`user:${userId}:profile`, { ...profile, walletBalance: newBalance });

    // Create transaction record
    const transaction = {
      id: Date.now().toString(),
      type: 'withdraw',
      amount: -amount,
      fee,
      description: instant ? 'Instant withdrawal' : 'Standard withdrawal',
      date: new Date().toISOString(),
      status: 'completed'
    };
    await kv.set(`user:${userId}:transaction:${transaction.id}`, transaction);

    return c.json({ balance: newBalance, transaction });
  } catch (error) {
    console.log('Withdraw error:', error);
    return c.json({ error: 'Failed to withdraw' }, 500);
  }
});

// Get transactions
app.get("/make-server-1b96e1b7/wallet/transactions", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const transactions = await kv.getByPrefix(`user:${userId}:transaction:`);
    
    // Sort by date descending
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return c.json({ transactions: sortedTransactions });
  } catch (error) {
    console.log('Get transactions error:', error);
    return c.json({ error: 'Failed to fetch transactions' }, 500);
  }
});

// ===== MONEY REQUEST ENDPOINTS =====

// Create money request
app.post("/make-server-1b96e1b7/requests", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const requestData = await c.req.json();

    const request = {
      id: Date.now().toString(),
      ...requestData,
      submittedBy: userId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await kv.set(`request:${request.id}`, request);
    await kv.set(`user:${userId}:request:${request.id}`, request.id);

    // Create notifications for approvers
    if (request.approverIds && request.approverIds.length > 0) {
      for (const approverId of request.approverIds) {
        const notification = {
          id: `${Date.now()}-${approverId}`,
          type: 'approval_request',
          title: 'New Approval Request',
          message: `New $${request.amount.toFixed(2)} request for ${request.description}`,
          timestamp: new Date().toISOString(),
          read: false,
          requestId: request.id,
          userId
        };
        await kv.set(`user:${approverId}:notification:${notification.id}`, notification);
      }
    }

    return c.json({ request });
  } catch (error) {
    console.log('Create request error:', error);
    return c.json({ error: 'Failed to create request' }, 500);
  }
});

// Get user's requests
app.get("/make-server-1b96e1b7/requests/mine", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const requestIds = await kv.getByPrefix(`user:${userId}:request:`);
    
    const requests = await Promise.all(
      requestIds.map(id => kv.get(`request:${id}`))
    );

    const validRequests = requests.filter(r => r !== null);
    
    return c.json({ requests: validRequests });
  } catch (error) {
    console.log('Get requests error:', error);
    return c.json({ error: 'Failed to fetch requests' }, 500);
  }
});

// Get requests to approve
app.get("/make-server-1b96e1b7/requests/to-approve", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const allRequests = await kv.getByPrefix(`request:`);
    
    // Filter requests where this user is an approver
    const requestsToApprove = allRequests.filter(req => 
      req.approverIds && req.approverIds.includes(userId)
    );

    return c.json({ requests: requestsToApprove });
  } catch (error) {
    console.log('Get requests to approve error:', error);
    return c.json({ error: 'Failed to fetch requests' }, 500);
  }
});

// Update request status (approve/reject)
app.put("/make-server-1b96e1b7/requests/:id/status", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const requestId = c.req.param('id');
    const { status, notes } = await c.req.json();

    if (!['approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const request = await kv.get(`request:${requestId}`);
    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    // Verify user is an approver
    if (!request.approverIds || !request.approverIds.includes(userId)) {
      return c.json({ error: 'Not authorized to approve this request' }, 403);
    }

    const updatedRequest = {
      ...request,
      status,
      notes,
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
      approvedBy: status === 'approved' ? [...(request.approvedBy || []), userId] : request.approvedBy,
      rejectedBy: status === 'rejected' ? userId : request.rejectedBy
    };

    await kv.set(`request:${requestId}`, updatedRequest);

    // Notify request submitter
    const notification = {
      id: `${Date.now()}-review`,
      type: 'request_reviewed',
      title: status === 'approved' ? 'Request Approved' : 'Request Rejected',
      message: `Your $${request.amount.toFixed(2)} request for ${request.description} was ${status}`,
      timestamp: new Date().toISOString(),
      read: false,
      requestId
    };
    await kv.set(`user:${request.submittedBy}:notification:${notification.id}`, notification);

    return c.json({ request: updatedRequest });
  } catch (error) {
    console.log('Update request status error:', error);
    return c.json({ error: 'Failed to update request status' }, 500);
  }
});

// ===== ACCOUNTABILITY PARTNERS ENDPOINTS =====

// Get accountability partners
app.get("/make-server-1b96e1b7/partners", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const partners = await kv.getByPrefix(`user:${userId}:partner:`);
    
    return c.json({ partners });
  } catch (error) {
    console.log('Get partners error:', error);
    return c.json({ error: 'Failed to fetch partners' }, 500);
  }
});

// Add accountability partner
app.post("/make-server-1b96e1b7/partners", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const partnerData = await c.req.json();

    const partner = {
      id: Date.now().toString(),
      ...partnerData,
      addedAt: new Date().toISOString()
    };

    await kv.set(`user:${userId}:partner:${partner.id}`, partner);

    return c.json({ partner });
  } catch (error) {
    console.log('Add partner error:', error);
    return c.json({ error: 'Failed to add partner' }, 500);
  }
});

// Remove accountability partner
app.delete("/make-server-1b96e1b7/partners/:id", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const partnerId = c.req.param('id');

    await kv.del(`user:${userId}:partner:${partnerId}`);

    return c.json({ message: 'Partner removed successfully' });
  } catch (error) {
    console.log('Remove partner error:', error);
    return c.json({ error: 'Failed to remove partner' }, 500);
  }
});

// Search for users by name or email
app.post("/make-server-1b96e1b7/users/search", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { query } = await c.req.json();
    
    if (!query || query.trim().length < 2) {
      return c.json({ error: 'Search query must be at least 2 characters' }, 400);
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Get all user profiles from the database
    const allProfiles = await kv.getByPrefix('user:');
    
    // Filter profiles that match the search query (by name, email, or username)
    // and exclude the current user
    const matchedUsers = allProfiles
      .filter((profile: any) => {
        // Only include actual profile objects (not partners, requests, etc.)
        if (!profile.name || !profile.email) return false;
        
        // Exclude current user from results
        if (profile.email === c.get('userEmail')) return false;
        
        const name = profile.name.toLowerCase();
        const email = profile.email.toLowerCase();
        const username = (profile.username || '').toLowerCase();
        
        return name.includes(searchTerm) || email.includes(searchTerm) || username.includes(searchTerm);
      })
      .map((profile: any) => ({
        id: profile.email, // Use email as unique identifier
        name: profile.name,
        email: profile.email,
        username: profile.username,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=9E89FF&color=fff`
      }))
      .slice(0, 10); // Limit to 10 results

    return c.json({ users: matchedUsers });
  } catch (error) {
    console.log('Search users error:', error);
    return c.json({ error: 'Failed to search users' }, 500);
  }
});

// Check if users exist by email/phone (for contact matching)
app.post("/make-server-1b96e1b7/partners/check-users", requireAuth, async (c) => {
  try {
    const { contacts } = await c.req.json();
    
    if (!contacts || !Array.isArray(contacts)) {
      return c.json({ error: 'Contacts array is required' }, 400);
    }

    console.log(`Checking ${contacts.length} contacts for ACCOUNTABILLS users`);
    
    const results = [];
    
    for (const contact of contacts) {
      const { email, phone } = contact;
      let isUser = false;
      let userId = null;
      
      // Check by email first
      if (email) {
        const { data: userData, error } = await supabase.auth.admin.listUsers();
        if (!error && userData?.users) {
          const foundUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (foundUser) {
            isUser = true;
            userId = foundUser.id;
          }
        }
      }
      
      results.push({
        ...contact,
        isAccountabillsUser: isUser,
        userId: userId
      });
    }
    
    console.log(`Found ${results.filter(r => r.isAccountabillsUser).length} ACCOUNTABILLS users`);
    
    return c.json({ contacts: results });
  } catch (error) {
    console.log('Check users error:', error);
    return c.json({ error: 'Failed to check users' }, 500);
  }
});

// Send invitation to non-user
app.post("/make-server-1b96e1b7/partners/send-invitation", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const { email, phone, name } = await c.req.json();
    
    // Get sender's name
    const senderProfile = await kv.get(`user:${userId}:profile`);
    const senderName = senderProfile?.name || 'A friend';
    
    console.log(`Sending invitation from ${senderName} to ${name} (${email || phone})`);
    
    // In a real app, this would send an actual email/SMS
    // For now, we'll just log it and return success
    const invitation = {
      id: Date.now().toString(),
      from: senderName,
      fromEmail: userEmail,
      to: name,
      toEmail: email,
      toPhone: phone,
      sentAt: new Date().toISOString(),
      message: `${senderName} has invited you to join ACCOUNTABILLS!`
    };
    
    // Store invitation for tracking
    await kv.set(`invitation:${invitation.id}`, invitation);
    
    console.log('✅ Invitation sent successfully');
    
    return c.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      invitation 
    });
  } catch (error) {
    console.log('Send invitation error:', error);
    return c.json({ error: 'Failed to send invitation' }, 500);
  }
});

// ===== MESSAGES ENDPOINTS =====

// Get conversations
app.get("/make-server-1b96e1b7/messages/conversations", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const conversations = await kv.getByPrefix(`user:${userId}:conversation:`);
    
    return c.json({ conversations });
  } catch (error) {
    console.log('Get conversations error:', error);
    return c.json({ error: 'Failed to fetch conversations' }, 500);
  }
});

// Get messages for a conversation
app.get("/make-server-1b96e1b7/messages/:conversationId", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const conversationId = c.req.param('conversationId');
    
    const messages = await kv.getByPrefix(`conversation:${conversationId}:message:`);
    
    // Sort by timestamp
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.log('Get messages error:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// Send message
app.post("/make-server-1b96e1b7/messages", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { conversationId, recipientId, text } = await c.req.json();

    if (!conversationId || !recipientId || !text) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const message = {
      id: Date.now().toString(),
      conversationId,
      senderId: userId,
      recipientId,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };

    await kv.set(`conversation:${conversationId}:message:${message.id}`, message);

    // Update conversation for both users
    const conversation = {
      id: conversationId,
      lastMessage: text,
      timestamp: message.timestamp,
      participantId: recipientId
    };
    await kv.set(`user:${userId}:conversation:${conversationId}`, conversation);
    await kv.set(`user:${recipientId}:conversation:${conversationId}`, {
      ...conversation,
      participantId: userId,
      unreadCount: 1
    });

    return c.json({ message });
  } catch (error) {
    console.log('Send message error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Mark messages as read
app.put("/make-server-1b96e1b7/messages/:conversationId/read", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const conversationId = c.req.param('conversationId');
    
    const messages = await kv.getByPrefix(`conversation:${conversationId}:message:`);
    
    // Update all unread messages where recipient is current user
    for (const message of messages) {
      if (message.recipientId === userId && !message.read) {
        await kv.set(`conversation:${conversationId}:message:${message.id}`, {
          ...message,
          read: true
        });
      }
    }

    // Update conversation unread count
    const conversation = await kv.get(`user:${userId}:conversation:${conversationId}`);
    if (conversation) {
      await kv.set(`user:${userId}:conversation:${conversationId}`, {
        ...conversation,
        unreadCount: 0
      });
    }

    return c.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.log('Mark messages as read error:', error);
    return c.json({ error: 'Failed to mark messages as read' }, 500);
  }
});

// ===== NOTIFICATIONS ENDPOINTS =====

// Get notifications
app.get("/make-server-1b96e1b7/notifications", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const notifications = await kv.getByPrefix(`user:${userId}:notification:`);
    
    // Sort by timestamp descending
    const sortedNotifications = notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ notifications: sortedNotifications });
  } catch (error) {
    console.log('Get notifications error:', error);
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

// Mark notification as read
app.put("/make-server-1b96e1b7/notifications/:id/read", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const notificationId = c.req.param('id');
    
    const notification = await kv.get(`user:${userId}:notification:${notificationId}`);
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    await kv.set(`user:${userId}:notification:${notificationId}`, {
      ...notification,
      read: true
    });

    return c.json({ notification: { ...notification, read: true } });
  } catch (error) {
    console.log('Mark notification as read error:', error);
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

// Mark all notifications as read
app.put("/make-server-1b96e1b7/notifications/read-all", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const notifications = await kv.getByPrefix(`user:${userId}:notification:`);
    
    for (const notification of notifications) {
      if (!notification.read) {
        await kv.set(`user:${userId}:notification:${notification.id}`, {
          ...notification,
          read: true
        });
      }
    }

    return c.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.log('Mark all notifications as read error:', error);
    return c.json({ error: 'Failed to mark notifications as read' }, 500);
  }
});

// ===== FEED ENDPOINTS =====

// Get activity feed
app.get("/make-server-1b96e1b7/feed", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const feedItems = await kv.getByPrefix(`user:${userId}:feed:`);
    
    // Sort by timestamp descending
    const sortedFeed = feedItems.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ feed: sortedFeed });
  } catch (error) {
    console.log('Get feed error:', error);
    return c.json({ error: 'Failed to fetch feed' }, 500);
  }
});

Deno.serve(app.fetch);