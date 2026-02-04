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

  // Only get friends where current user is the one who added them
  // This prevents showing reverse relationships where someone else added you
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', user.id)
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

  // Check if this friend already exists (by email) to prevent duplicates
  const { data: existingFriend } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', user.id)
    .eq('friend_email', friendData.friendEmail)
    .single();

  if (existingFriend) {
    // Friend already exists - update their role instead of creating duplicate
    const { data, error } = await supabase
      .from('friends')
      .update({
        role: friendData.role,
        friend_name: friendData.friendName,
        friend_avatar: friendData.friendAvatar || existingFriend.friend_avatar,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingFriend.id)
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
  }

  // No existing friend - create new entry
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

    // Get sender's email from the original friend request notification if no profile
    // The sender's info should come from the notification, not the friend_name field
    // (friend_name in friendData is the recipient's name, not sender's)
    const { data: notificationData } = await supabase
      .from('notifications')
      .select('message')
      .eq('user_id', user.id)
      .eq('approver_id', senderId)
      .eq('type', 'friend_request')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // Extract sender name from notification message (format: "X wants to add you as...")
    let senderNameFromNotification: string | null = null;
    if (notificationData?.message) {
      const match = notificationData.message.match(/^(.+?) wants to add you/);
      if (match) senderNameFromNotification = match[1];
    }

    // Use sender profile if available, otherwise use name from notification, otherwise use a fallback
    const senderName = senderProfile?.name || senderNameFromNotification || 'User';
    const senderEmail = senderProfile?.email || `user-${senderId.slice(0, 8)}@unknown.com`;
    const senderAvatar = senderProfile?.avatar || '👤';

    // Create reverse friend relationship (so both users can see each other)
    await supabase
      .from('friends')
      .upsert({
        user_id: user.id,
        friend_id: senderId,
        friend_name: senderName,
        friend_email: senderEmail,
        friend_avatar: senderAvatar,
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

      // Get friend info (only from current user's friends due to RLS)
      const { data: friendData } = await supabase
        .from('friends')
        .select('friend_name, friend_avatar')
        .eq('user_id', user.id)
        .eq('friend_id', otherParticipantId)
        .single();
      
      // If no friend data found, try to get name from profiles table
      let participantName = friendData?.friend_name;
      let participantAvatar = friendData?.friend_avatar || '👤';
      
      if (!participantName) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, avatar')
          .eq('id', otherParticipantId)
          .single();
        participantName = profileData?.name || 'Unknown';
        participantAvatar = profileData?.avatar || '👤';
      }

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
        participantName: participantName,
        participantAvatar: participantAvatar,
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
        // Try to get name from friends table first
        const { data: friendData } = await supabase
          .from('friends')
          .select('friend_name')
          .eq('user_id', user.id)
          .eq('friend_id', msg.sender_id)
          .single();
        
        if (friendData?.friend_name) {
          senderName = friendData.friend_name;
        } else {
          // Fallback to profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', msg.sender_id)
            .single();
          senderName = profileData?.name || 'Unknown';
        }
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

// ===== GROUPS API =====

export interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  // Joined data from profiles
  profile?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  // Joined data from profiles
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
  lastMessage?: GroupMessage;
  unreadCount?: number;
}

// Get all groups the current user is a member of
export const getGroups = async (): Promise<GroupWithMembers[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get groups with members
  const { data: groups, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_members (
        id,
        user_id,
        role,
        joined_at
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Get member profiles and last messages for each group
  const groupsWithDetails = await Promise.all((groups || []).map(async (group) => {
    // Get member profiles
    const memberIds = group.group_members.map((m: GroupMember) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar')
      .in('id', memberIds);

    const membersWithProfiles = group.group_members.map((member: GroupMember) => ({
      ...member,
      profile: profiles?.find(p => p.id === member.user_id)
    }));

    // Get last message
    const { data: lastMessages } = await supabase
      .from('group_messages')
      .select('*, sender:profiles!sender_id(id, name, avatar)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      ...group,
      members: membersWithProfiles,
      lastMessage: lastMessages?.[0] || undefined
    };
  }));

  return groupsWithDetails;
};

// Create a new group
export const createGroup = async (
  name: string,
  avatarUrl: string | null,
  memberIds: string[]
): Promise<Group> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  console.log('createGroup: Creating group', { name, avatarUrl, memberIds, userId: user.id });

  // Create the group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      avatar_url: avatarUrl,
      created_by: user.id
    })
    .select()
    .single();

  if (groupError) {
    console.error('createGroup: Failed to create group', groupError);
    throw new Error(`Failed to create group: ${groupError.message}`);
  }

  console.log('createGroup: Group created', group);

  // Add creator as admin
  const { error: creatorError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: 'admin'
    });

  if (creatorError) {
    console.error('createGroup: Failed to add creator as admin', creatorError);
    throw new Error(`Failed to add creator as admin: ${creatorError.message}`);
  }

  console.log('createGroup: Creator added as admin');

  // Add other members
  if (memberIds.length > 0) {
    const memberInserts = memberIds
      .filter(id => id !== user.id) // Don't add creator twice
      .map(userId => ({
        group_id: group.id,
        user_id: userId,
        role: 'member' as const
      }));

    console.log('createGroup: Adding members', memberInserts);

    if (memberInserts.length > 0) {
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('createGroup: Failed to add members', membersError);
        throw new Error(`Failed to add members: ${membersError.message}`);
      }
    }
  }

  console.log('createGroup: Group created successfully');
  return group;
};

// Update a group
export const updateGroup = async (
  groupId: string,
  updates: { name?: string; avatar_url?: string | null }
): Promise<Group> => {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a group
export const deleteGroup = async (groupId: string): Promise<void> => {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
};

// Add a member to a group
export const addGroupMember = async (
  groupId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<GroupMember> => {
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Remove a member from a group
export const removeGroupMember = async (
  groupId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Get messages for a group
export const getGroupMessages = async (
  groupId: string,
  limit: number = 50
): Promise<GroupMessage[]> => {
  const { data, error } = await supabase
    .from('group_messages')
    .select(`
      *,
      sender:profiles!sender_id(id, name, avatar)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// Send a message to a group
export const sendGroupMessage = async (
  groupId: string,
  content: string
): Promise<GroupMessage> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('group_messages')
    .insert({
      group_id: groupId,
      sender_id: user.id,
      content
    })
    .select(`
      *,
      sender:profiles!sender_id(id, name, avatar)
    `)
    .single();

  if (error) throw error;

  // Update group's updated_at timestamp
  await supabase
    .from('groups')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', groupId);

  return data;
};

// Subscribe to real-time direct messages
export const subscribeToMessages = (
  userId: string,
  onMessage: (message: MessageData) => void,
  onConversationUpdate: () => void
) => {
  // #region agent log
  fetch('http://127.0.0.1:7249/ingest/0ba0888f-1760-4d0a-9980-75ce9a4c3963',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:subscribeToMessages',message:'Setting up subscription',data:{userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const channel = supabase
    .channel(`messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/0ba0888f-1760-4d0a-9980-75ce9a4c3963',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:subscribeToMessages:callback',message:'Received postgres_changes event',data:{payload:payload.new,userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const msg = payload.new as any;
        // Only process messages where we're the sender or recipient
        if (msg.sender_id !== userId && msg.recipient_id !== userId) {
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/0ba0888f-1760-4d0a-9980-75ce9a4c3963',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:subscribeToMessages:filter',message:'Message filtered out - not for this user',data:{msgSenderId:msg.sender_id,msgRecipientId:msg.recipient_id,userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          return;
        }
        
        // Get sender name
        let senderName = 'You';
        if (msg.sender_id !== userId) {
          // Try friends table first
          const { data: friendData } = await supabase
            .from('friends')
            .select('friend_name')
            .eq('user_id', userId)
            .eq('friend_id', msg.sender_id)
            .single();
          
          if (friendData?.friend_name) {
            senderName = friendData.friend_name;
          } else {
            // Fallback to profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', msg.sender_id)
              .single();
            senderName = profileData?.name || 'Unknown';
          }
        }
        
        const messageData: MessageData = {
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
        
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/0ba0888f-1760-4d0a-9980-75ce9a4c3963',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:subscribeToMessages:onMessage',message:'Calling onMessage callback',data:{messageData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        onMessage(messageData);
        onConversationUpdate();
      }
    )
    .subscribe((status) => {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/0ba0888f-1760-4d0a-9980-75ce9a4c3963',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:subscribeToMessages:subscribeStatus',message:'Subscription status changed',data:{status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    });
  
  return () => {
    supabase.removeChannel(channel);
  };
};

// Subscribe to real-time group messages
export const subscribeToGroupMessages = (
  groupId: string,
  onMessage: (message: GroupMessage) => void
) => {
  const channel = supabase
    .channel(`group_messages:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      },
      async (payload) => {
        // Fetch the message with sender info
        const { data } = await supabase
          .from('group_messages')
          .select(`
            *,
            sender:profiles!sender_id(id, name, avatar)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onMessage(data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Subscribe to all group updates (for the groups list)
export const subscribeToGroups = (
  onUpdate: () => void
) => {
  const channel = supabase
    .channel('groups_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'groups'
      },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_members'
      },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
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
