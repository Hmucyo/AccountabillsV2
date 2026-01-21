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

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// ===== AUTH API =====

export const signUp = async (email: string, password: string, name: string) => {
  try {
    console.log('🔵 Attempting signup to:', `${API_BASE_URL}/auth/signup`);
    console.log('📧 Email:', email, 'Name:', name);
    
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ email, password, name })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    let responseData;
    try {
      responseData = await response.json();
      console.log('📦 Response data:', responseData);
    } catch (e) {
      console.error('❌ Failed to parse response JSON:', e);
      throw new Error('Backend server is not responding correctly. It may not be deployed yet.');
    }

    if (!response.ok) {
      console.error('❌ Signup failed with status:', response.status, 'Error:', responseData);
      throw new Error(responseData.error || 'Signup failed');
    }

    // If signup returned a session, store the access token
    if (responseData.session?.access_token) {
      console.log('✅ Session received, storing access token');
      setAccessToken(responseData.session.access_token);
    }

    console.log('✅ Signup successful!');
    return responseData;
  } catch (error: any) {
    console.error('❌ Signup error details:', error);
    // If it's a network error, provide more helpful message
    if (error.message?.includes('fetch') || error.name === 'TypeError') {
      throw new Error('Cannot connect to backend server. The Edge Function may not be deployed. Please check Supabase deployment.');
    }
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const token = data.session?.access_token;
    if (token) {
      setAccessToken(token);
    }

    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign in error:', error);
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
    method: 'DELETE',
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