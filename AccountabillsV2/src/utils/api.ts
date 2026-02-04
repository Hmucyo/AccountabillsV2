import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from '@supabase/supabase-js';

// Backend API URL - Express server
// Use production URL in production, localhost for development
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://accountabills-og3v.vercel.app/api'
  : 'http://localhost:3002/api';

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

// ===== FRIENDS/PARTNERS API (Supabase) =====

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendEmail: string;
  friendAvatar: string;
  role: 'approver' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export const getFriends = async (): Promise<Friend[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(f => ({
    id: f.id,
    userId: f.user_id,
    friendId: f.friend_id,
    friendName: f.friend_name,
    friendEmail: f.friend_email,
    friendAvatar: f.friend_avatar,
    role: f.role,
    status: f.status,
    createdAt: f.created_at
  }));
};

export const addFriend = async (friendData: {
  friendId: string;
  friendName: string;
  friendEmail: string;
  friendAvatar?: string;
  role: 'approver' | 'viewer';
}): Promise<Friend> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friends')
    .insert({
      user_id: user.id,
      friend_id: friendData.friendId,
      friend_name: friendData.friendName,
      friend_email: friendData.friendEmail,
      friend_avatar: friendData.friendAvatar || '👤',
      role: friendData.role,
      status: 'accepted' // Auto-accept for now, can implement request flow later
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    friendId: data.friend_id,
    friendName: data.friend_name,
    friendEmail: data.friend_email,
    friendAvatar: data.friend_avatar,
    role: data.role,
    status: data.status,
    createdAt: data.created_at
  };
};

export const updateFriendRole = async (friendId: string, role: 'approver' | 'viewer'): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('friends')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', friendId)
    .eq('user_id', user.id);

  if (error) throw error;
};

export const removeFriend = async (friendId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendId)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Send a friend request (creates pending friend + notification)
export const sendFriendRequest = async (friendData: {
  friendId: string;
  friendName: string;
  friendEmail: string;
  friendAvatar?: string;
  role: 'approver' | 'viewer';
}): Promise<Friend> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current user's profile for the notification (using profiles table)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();
  
  const senderName = profileData?.name || user.email?.split('@')[0] || 'Someone';

  // Create friend relationship with pending status
  const { data, error } = await supabase
    .from('friends')
    .insert({
      user_id: user.id,
      friend_id: friendData.friendId,
      friend_name: friendData.friendName,
      friend_email: friendData.friendEmail,
      friend_avatar: friendData.friendAvatar || '👤',
      role: friendData.role,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;

  // Create notification for the recipient
  await supabase
    .from('notifications')
    .insert({
      user_id: friendData.friendId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${senderName} wants to add you as ${friendData.role === 'approver' ? 'an approver' : 'a viewer'}`,
      approver_id: user.id // Store sender's ID so recipient can accept/reject
    });

  return {
    id: data.id,
    userId: data.user_id,
    friendId: data.friend_id,
    friendName: data.friend_name,
    friendEmail: data.friend_email,
    friendAvatar: data.friend_avatar,
    role: data.role,
    status: data.status,
    createdAt: data.created_at
  };
};

// Accept a friend request
export const acceptFriendRequest = async (senderId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Update the friend relationship to accepted
  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('user_id', senderId)
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error) throw error;

  // Get sender's profile to create reverse relationship
  const { data: friendData } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', senderId)
    .eq('friend_id', user.id)
    .single();

  if (friendData) {
    // Get current user's profile (using profiles table)
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('name, email, avatar')
      .eq('id', user.id)
      .single();
    
    const myName = myProfile?.name || user.email || 'User';

    // Get sender's profile for accurate info in reverse relationship
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('name, email, avatar')
      .eq('id', senderId)
      .single();

    // Create reverse friend relationship (so both users can see each other)
    await supabase
      .from('friends')
      .upsert({
        user_id: user.id,
        friend_id: senderId,
        friend_name: senderProfile?.name || friendData.friend_name,
        friend_email: senderProfile?.email || friendData.friend_email,
        friend_avatar: senderProfile?.avatar || friendData.friend_avatar,
        role: 'viewer', // Default to viewer for the reverse relationship
        status: 'accepted'
      }, { onConflict: 'user_id,friend_id' });

    // Notify the sender that their request was accepted
    await supabase
      .from('notifications')
      .insert({
        user_id: senderId,
        type: 'friend_request',
        title: 'Friend Request Accepted',
        message: `${myName} accepted your friend request!`,
        approver_id: user.id
      });
  }
};

// Reject a friend request
export const rejectFriendRequest = async (senderId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Update the friend relationship to rejected
  const { error } = await supabase
    .from('friends')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('user_id', senderId)
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error) throw error;
};

// Get pending friend requests received by current user
export const getPendingFriendRequests = async (): Promise<Friend[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .eq('friend_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(f => ({
    id: f.id,
    userId: f.user_id,
    friendId: f.friend_id,
    friendName: f.friend_name,
    friendEmail: f.friend_email,
    friendAvatar: f.friend_avatar,
    role: f.role,
    status: f.status,
    createdAt: f.created_at
  }));
};

export const searchUsers = async (searchTerm: string): Promise<Array<{ id: string; email: string; name: string }>> => {
  // Search in the profiles table with database-side filtering (optimized with indexes)
  const searchPattern = `%${searchTerm}%`;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, username')
    .or(`email.ilike.${searchPattern},name.ilike.${searchPattern},username.ilike.${searchPattern}`)
    .limit(20);

  if (error) throw error;

  return (data || []).map(profile => ({
    id: profile.id,
    email: profile.email,
    name: profile.name || profile.username || ''
  }));
};

// Check which contacts are already Accountabills users
export const checkContactUsers = async (contacts: Array<{ email: string; phone?: string }>): Promise<Array<{ email: string; isUser: boolean; userId?: string }>> => {
  try {
    const results = await Promise.all(
      contacts.map(async (contact) => {
        const users = await searchUsers(contact.email);
        const matchedUser = users.find(u => u.email.toLowerCase() === contact.email.toLowerCase());
        return {
          email: contact.email,
          isUser: !!matchedUser,
          userId: matchedUser?.id
        };
      })
    );
    return results;
  } catch (error) {
    console.error('Failed to check contact users:', error);
    return contacts.map(c => ({ email: c.email, isUser: false }));
  }
};

// Send invitation to join Accountabills (placeholder - would integrate with email service)
export const sendInvitation = async (email: string, phone: string, name: string): Promise<{ success: boolean }> => {
  // In a real implementation, this would send an email/SMS invitation
  // For now, just log and return success
  console.log(`Invitation would be sent to ${name} at ${email} / ${phone}`);
  return { success: true };
};

// ===== MESSAGES API (Supabase) =====

export interface ConversationData {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  read: boolean;
  requestId?: string;
  createdAt: string;
}

export const getConversations = async (): Promise<ConversationData[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get all conversations where user is a participant
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (convError) throw convError;

  // Get friend info and last messages for each conversation
  const conversationsWithDetails = await Promise.all(
    (conversations || []).map(async (conv) => {
      const otherParticipantId = conv.participant_1 === user.id 
        ? conv.participant_2 
        : conv.participant_1;

      // Get friend info
      const { data: friendData } = await supabase
        .from('friends')
        .select('friend_name, friend_avatar')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${otherParticipantId}),and(user_id.eq.${otherParticipantId},friend_id.eq.${user.id})`)
        .single();

      // Get last message
      const { data: lastMessageData } = await supabase
        .from('messages')
        .select('text, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('recipient_id', user.id)
        .eq('read', false);

      return {
        id: conv.id,
        participantId: otherParticipantId,
        participantName: friendData?.friend_name || 'Unknown',
        participantAvatar: friendData?.friend_avatar || '👤',
        lastMessage: lastMessageData?.text || '',
        lastMessageTime: lastMessageData?.created_at || conv.created_at,
        unreadCount: count || 0
      };
    })
  );

  return conversationsWithDetails;
};

export const getMessages = async (conversationId: string): Promise<MessageData[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Get sender names
  const messagesWithNames = await Promise.all(
    (data || []).map(async (msg) => {
      let senderName = 'You';
      if (msg.sender_id !== user.id) {
        const { data: friendData } = await supabase
          .from('friends')
          .select('friend_name')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${msg.sender_id}),and(user_id.eq.${msg.sender_id},friend_id.eq.${user.id})`)
          .single();
        senderName = friendData?.friend_name || 'Unknown';
      }

      return {
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        senderName,
        recipientId: msg.recipient_id,
        text: msg.text,
        read: msg.read,
        requestId: msg.request_id,
        createdAt: msg.created_at
      };
    })
  );

  return messagesWithNames;
};

export const getOrCreateConversation = async (otherUserId: string): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if conversation exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
    .single();

  if (existing) return existing.id;

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      participant_1: user.id,
      participant_2: otherUserId
    })
    .select('id')
    .single();

  if (error) throw error;
  return newConv.id;
};

export const sendMessage = async (
  conversationId: string,
  recipientId: string,
  text: string,
  requestId?: string
): Promise<MessageData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      recipient_id: recipientId,
      text,
      request_id: requestId || null
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    senderName: 'You',
    recipientId: data.recipient_id,
    text: data.text,
    read: data.read,
    requestId: data.request_id,
    createdAt: data.created_at
  };
};

export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', user.id)
    .eq('read', false);

  if (error) throw error;
};

// ===== NOTIFICATIONS API (Supabase) =====

export interface NotificationData {
  id: string;
  userId: string;
  type: 'friend_request' | 'approval_request' | 'request_reviewed';
  title: string;
  message: string;
  read: boolean;
  requestId?: string;
  approverId?: string;
  createdAt: string;
}

export const getNotifications = async (): Promise<NotificationData[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).map(n => ({
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    requestId: n.request_id,
    approverId: n.approver_id,
    createdAt: n.created_at
  }));
};

export const createNotification = async (notification: {
  userId: string;
  type: 'friend_request' | 'approval_request' | 'request_reviewed';
  title: string;
  message: string;
  requestId?: string;
  approverId?: string;
}): Promise<NotificationData> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      request_id: notification.requestId || null,
      approver_id: notification.approverId || null
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    title: data.title,
    message: data.message,
    read: data.read,
    requestId: data.request_id,
    approverId: data.approver_id,
    createdAt: data.created_at
  };
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) throw error;
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
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
