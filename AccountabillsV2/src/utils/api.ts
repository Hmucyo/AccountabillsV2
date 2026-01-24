import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from '@supabase/supabase-js';

// Backend API URL - Express server
const API_BASE_URL = 'http://localhost:3002/api';

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

// Helper function to make authenticated requests to Express backend
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

  const data = await response.json().catch(() => ({ error: 'Request failed' }));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
};

// ===== AUTH API (Supabase) =====

export const signUp = async (email: string, password: string, name: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // User created but needs to confirm email
      return {
        user: data.user,
        session: null,
        requiresEmailConfirmation: true
      };
    }

    const token = data.session?.access_token;
    if (token) {
      setAccessToken(token);
      // Initialize user with Marqeta after signup
      try {
        await initializeUser(name.split(' ')[0], name.split(' ').slice(1).join(' ') || '');
      } catch (initError) {
        console.error('Failed to initialize Marqeta user:', initError);
      }
    }

    return { user: data.user, session: data.session, requiresEmailConfirmation: false };
  } catch (error) {
    console.error('Sign up error:', error);
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
      // Initialize user with Marqeta if not already done
      try {
        await initializeUser();
      } catch (initError) {
        console.error('Failed to initialize Marqeta user:', initError);
      }
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

// ===== USER API (Express + Marqeta) =====

export const initializeUser = async (firstName?: string, lastName?: string) => {
  const response = await fetchWithAuth('/users/initialize', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName }),
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await fetchWithAuth('/users/me');
  return response.data;
};

// ===== WALLET API (Express + Marqeta) =====

export const getWalletBalance = async () => {
  const response = await fetchWithAuth('/users/balance');
  return response.data;
};

export const addMoney = async (amount: number, memo?: string) => {
  const response = await fetchWithAuth('/users/wallet/add', {
    method: 'POST',
    body: JSON.stringify({ amount, memo }),
  });
  return response.data;
};

export const withdrawMoney = async (amount: number, instant: boolean = false) => {
  // Note: Withdrawal to bank not implemented yet
  throw new Error('Withdrawal to bank not yet implemented');
};

export const getTransactions = async () => {
  const response = await fetchWithAuth('/users/transactions');
  return response.data;
};

// ===== CARD API (Express + Marqeta) =====

export interface CardData {
  token: string;
  pan: string;
  lastFour: string;
  expiration: string;
  expirationTime: string;
  cvv: string;
  state: string;
  cardProductToken: string;
  createdTime: string;
}

export const getCard = async (): Promise<{ hasCard: boolean; card: CardData | null }> => {
  const response = await fetchWithAuth('/users/card');
  // Response is { success: true, data: { hasCard, card } }
  return response?.data || { hasCard: false, card: null };
};

export const createCard = async (): Promise<{ alreadyExists: boolean; card: CardData }> => {
  const response = await fetchWithAuth('/users/card', {
    method: 'POST',
  });
  // Response is { success: true, data: { alreadyExists, card } }
  if (!response?.data?.card) {
    throw new Error('Failed to create card - no card data in response');
  }
  return response.data;
};

// ===== FUNDING STATUS API =====

export interface FundingStatus {
  mode: 'SANDBOX' | 'PRODUCTION';
  isSandbox: boolean;
  unlimitedFunds: boolean;
  fundingSource: string;
  baseUrl: string;
  fundingInfo: any;
  message: string;
}

export const getFundingStatus = async (): Promise<FundingStatus> => {
  const response = await fetchWithAuth('/users/funding-status');
  return response?.data || { mode: 'UNKNOWN', isSandbox: false, unlimitedFunds: false };
};

// ===== REQUESTS API (Express + Marqeta) =====

export interface CreateRequestData {
  amount: number;
  description: string;
  category: string;
  imageUrl?: string;
  approvers: Array<{ userId: string; name: string; email: string }>;
}

export const createRequest = async (requestData: CreateRequestData) => {
  const response = await fetchWithAuth('/marqeta/payment-requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
  return response.data;
};

export const getMyRequests = async () => {
  const response = await fetchWithAuth('/marqeta/payment-requests?filter=mine');
  return response.data;
};

export const getRequestsToApprove = async () => {
  const response = await fetchWithAuth('/marqeta/payment-requests?filter=to-approve');
  return response.data;
};

export const getRequest = async (requestId: string) => {
  const response = await fetchWithAuth(`/marqeta/payment-requests/${requestId}`);
  return response.data;
};

export const approveRequest = async (requestId: string, notes?: string) => {
  const response = await fetchWithAuth(`/marqeta/payment-requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
  return response.data;
};

export const rejectRequest = async (requestId: string, notes?: string) => {
  const response = await fetchWithAuth(`/marqeta/payment-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
  return response.data;
};

// Legacy function for compatibility with existing UI
export const updateRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected',
  notes?: string
) => {
  if (status === 'approved') {
    return approveRequest(requestId, notes);
  } else {
    return rejectRequest(requestId, notes);
  }
};

// ===== PARTNERS API (Not yet implemented - uses local state) =====

export const getPartners = async () => {
  // TODO: Implement when partners backend is ready
  return [];
};

export const addPartner = async (partnerData: any) => {
  // TODO: Implement when partners backend is ready
  throw new Error('Partners API not yet implemented');
};

export const removePartner = async (partnerId: string) => {
  // TODO: Implement when partners backend is ready
  throw new Error('Partners API not yet implemented');
};

export const checkContactUsers = async (contacts: any[]) => {
  // TODO: Implement when partners backend is ready
  return [];
};

export const sendInvitation = async (email: string, phone: string, name: string) => {
  // TODO: Implement when partners backend is ready
  throw new Error('Partners API not yet implemented');
};

// ===== MESSAGES API (Not yet implemented - uses local state) =====

export const getConversations = async () => {
  // TODO: Implement when messages backend is ready
  return [];
};

export const getMessages = async (conversationId: string) => {
  // TODO: Implement when messages backend is ready
  return [];
};

export const sendMessage = async (
  conversationId: string,
  recipientId: string,
  text: string
) => {
  // TODO: Implement when messages backend is ready
  throw new Error('Messages API not yet implemented');
};

export const markMessagesAsRead = async (conversationId: string) => {
  // TODO: Implement when messages backend is ready
};

// ===== NOTIFICATIONS API (Not yet implemented - uses local state) =====

export const getNotifications = async () => {
  // TODO: Implement when notifications backend is ready
  return [];
};

export const markNotificationAsRead = async (notificationId: string) => {
  // TODO: Implement when notifications backend is ready
};

export const markAllNotificationsAsRead = async () => {
  // TODO: Implement when notifications backend is ready
};

// ===== FEED API (Not yet implemented - uses local state) =====

export const getFeed = async () => {
  // TODO: Implement when feed backend is ready
  return [];
};

// ===== HEALTH CHECK =====

export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return { ok: response.ok, ...data };
  } catch (error) {
    return { ok: false, error: 'Cannot connect to backend' };
  }
};
