import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-1b96e1b7`;

// Create Supabase client for auth operations
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// Store access token
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Helper function to make authenticated requests
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Always try to get the latest session if no token is set
  if (!accessToken) {
    console.log('⚠️ No access token in memory, checking for active session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log('✅ Found active session, setting token:', session.access_token.substring(0, 20) + '...');
      accessToken = session.access_token;
    } else {
      console.error('❌ No access token available and no active session found');
      if (error) {
        console.error('Session error:', error);
      }
    }
  } else {
    console.log('✅ Using token from memory:', accessToken.substring(0, 20) + '...');
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    console.error('⚠️ No access token available for request to:', endpoint);
    throw new Error('No authentication token available');
  }

  console.log(`🌐 Making request to ${endpoint} with auth header`);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    console.error(`❌ Request failed to ${endpoint}:`, response.status, error);
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// ===== AUTH API =====

// Check if username is available
export const checkUsernameAvailable = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/check-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
    body: JSON.stringify({ username }),
  });
  if (!response.ok) {
    throw new Error('Failed to check username');
  }
  return response.json();
};

export const signUp = async (email: string, password: string, name: string, username: string) => {
  console.log('📝 Starting signup for user:', email, 'username:', username);
  
  try {
    // First, create the user via our backend (which uses admin API to auto-confirm email)
    console.log('🔵 Creating user via backend admin API...');
    const signupResponse = await fetch(`${API_BASE_URL}/auth/create-user`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ email, password, name, username }),
    });

    if (!signupResponse.ok) {
      const errorData = await signupResponse.json();
      console.error('❌ Backend signup error:', errorData);
      throw new Error(errorData.error || 'Failed to create user');
    }

    const backendResult = await signupResponse.json();
    console.log('✅ User created via backend:', backendResult);

    // Now sign in to get the session
    console.log('🔵 Signing in to get session...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Sign in after signup error:', error);
      throw error;
    }

    console.log('✅ Signin successful after user creation');
    
    // Store the token
    if (data.session?.access_token) {
      accessToken = data.session.access_token;
      console.log('✅ Access token set:', accessToken.substring(0, 20) + '...');
      
      return { 
        user: data.user, 
        session: data.session,
        accessToken: data.session.access_token,
        requiresSignIn: false 
      };
    }

    throw new Error('No session token received');
  } catch (error: any) {
    console.error('❌ Signup process error:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    console.log('🔵 Signing in with Supabase auth...', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Supabase auth error:', error);
      throw error;
    }

    const token = data.session?.access_token;
    if (!token) {
      console.error('⚠️ No access token in session!', data);
      throw new Error('No access token received from Supabase');
    }

    console.log('✅ Access token received:', token.substring(0, 20) + '...');
    setAccessToken(token);
    
    // Verify token was set
    const verifyToken = getAccessToken();
    if (verifyToken !== token) {
      console.error('❌ Token verification failed!');
      throw new Error('Failed to set access token');
    }
    
    console.log('✅ Access token stored and verified successfully');

    return { user: data.user, session: data.session, accessToken: token };
  } catch (error) {
    console.error('❌ Sign in error:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAccessToken(null);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (session?.access_token) {
      setAccessToken(session.access_token);
    }
    
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};

// ===== PROFILE API =====

export const getProfile = async () => {
  console.log('🔵 Fetching profile, access token available:', !!accessToken);
  if (accessToken) {
    console.log('🔑 Token preview:', accessToken.substring(0, 20) + '...');
  }
  return fetchWithAuth('/profile');
};

export const updateProfile = async (updates: any) => {
  return fetchWithAuth('/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

// ===== WALLET API =====

export const getWalletBalance = async () => {
  return fetchWithAuth('/wallet/balance');
};

export const addMoney = async (amount: number) => {
  return fetchWithAuth('/wallet/add', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
};

export const withdrawMoney = async (amount: number, instant: boolean = false) => {
  return fetchWithAuth('/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amount, instant }),
  });
};

export const getTransactions = async () => {
  return fetchWithAuth('/wallet/transactions');
};

// ===== REQUESTS API =====

export const createRequest = async (requestData: any) => {
  return fetchWithAuth('/requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
};

export const getMyRequests = async () => {
  return fetchWithAuth('/requests/mine');
};

export const getRequestsToApprove = async () => {
  return fetchWithAuth('/requests/to-approve');
};

export const updateRequestStatus = async (
  requestId: string, 
  status: 'approved' | 'rejected', 
  notes?: string
) => {
  return fetchWithAuth(`/requests/${requestId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  });
};

// ===== PARTNERS API =====

export const getPartners = async () => {
  return fetchWithAuth('/partners');
};

export const addPartner = async (partnerData: any) => {
  return fetchWithAuth('/partners', {
    method: 'POST',
    body: JSON.stringify(partnerData),
  });
};

export const removePartner = async (partnerId: string) => {
  return fetchWithAuth(`/partners/${partnerId}`, {
    method: 'DELETE'
  });
};

export const searchUsers = async (query: string) => {
  return fetchWithAuth('/users/search', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
};

// Check which contacts are ACCOUNTABILLS users
export const checkContactUsers = async (contacts: any[]) => {
  return fetchWithAuth('/partners/check-users', {
    method: 'POST',
    body: JSON.stringify({ contacts }),
  });
};

// Send invitation to non-user
export const sendInvitation = async (email: string, phone: string, name: string) => {
  return fetchWithAuth('/partners/send-invitation', {
    method: 'POST',
    body: JSON.stringify({ email, phone, name }),
  });
};

// ===== MESSAGES API =====

export const getConversations = async () => {
  return fetchWithAuth('/messages/conversations');
};

export const getMessages = async (conversationId: string) => {
  return fetchWithAuth(`/messages/${conversationId}`);
};

export const sendMessage = async (
  conversationId: string, 
  recipientId: string, 
  text: string
) => {
  return fetchWithAuth('/messages', {
    method: 'POST',
    body: JSON.stringify({ conversationId, recipientId, text }),
  });
};

export const markMessagesAsRead = async (conversationId: string) => {
  return fetchWithAuth(`/messages/${conversationId}/read`, {
    method: 'PUT',
  });
};

// ===== NOTIFICATIONS API =====

export const getNotifications = async () => {
  return fetchWithAuth('/notifications');
};

export const markNotificationAsRead = async (notificationId: string) => {
  return fetchWithAuth(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
};

export const markAllNotificationsAsRead = async () => {
  return fetchWithAuth('/notifications/read-all', {
    method: 'PUT',
  });
};

// ===== FEED API =====

export const getFeed = async () => {
  return fetchWithAuth('/feed');
};